"""
High-Performance SQLite-Backed Web Server for Railway Detention Management System
Zero external dependencies (Python standard library http.server + sqlite3)
Provides REST API & Static File Server
"""

import http.server
import socketserver
import os
import sys
import json
import sqlite3
import urllib.parse
from datetime import datetime

# Configure standard streams for UTF-8 compatibility on Windows
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

PORT = int(os.environ.get("PORT", 8080))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Auto-detect Persistent Storage (Cloud Run Volume, Docker Mount, or Local)
# Priority: PERSISTENT_DIR env var -> /mnt/data (standard Cloud Run volume mount) -> BASE_DIR
default_data_dir = "/mnt/data" if os.path.exists("/mnt/data") and os.path.isdir("/mnt/data") else BASE_DIR
DATA_DIR = os.environ.get("PERSISTENT_DIR", default_data_dir)
os.makedirs(DATA_DIR, exist_ok=True)

DB_PATH = os.environ.get("DB_PATH", os.path.join(DATA_DIR, "detention.db"))
LOG_DIR = os.environ.get("LOG_DIR", os.path.join(DATA_DIR, "logs"))
BACKUP_DIR = os.environ.get("BACKUP_DIR", os.path.join(DATA_DIR, "backups"))

os.makedirs(LOG_DIR, exist_ok=True)
os.makedirs(BACKUP_DIR, exist_ok=True)

# If persistent directory is mounted and DB doesn't exist yet, seed it from BASE_DIR baseline
import shutil
if os.path.abspath(DATA_DIR) != os.path.abspath(BASE_DIR):
    base_db = os.path.join(BASE_DIR, "detention.db")
    if not os.path.exists(DB_PATH) and os.path.exists(base_db):
        try:
            shutil.copy2(base_db, DB_PATH)
            print(f"[STORAGE] Copied baseline database from {base_db} to persistent storage {DB_PATH}")
        except Exception as e:
            print(f"[STORAGE WARNING] Failed copying baseline db: {e}")

    for bk_name in ("loading_backup.json", "unloading_backup.json", "terminals_backup.json"):
        src = os.path.join(BASE_DIR, "backups", bk_name)
        dst = os.path.join(BACKUP_DIR, bk_name)
        if os.path.exists(src) and not os.path.exists(dst):
            try:
                shutil.copy2(src, dst)
            except Exception:
                pass

import logging
from logging.handlers import RotatingFileHandler

# Setup file logger (persists to logs/server.log)
log_formatter = logging.Formatter("[%(asctime)s] %(levelname)s: %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
file_handler = RotatingFileHandler(
    os.path.join(LOG_DIR, "server.log"),
    maxBytes=2*1024*1024,  # 2 MB per file
    backupCount=5,
    encoding="utf-8"
)
file_handler.setFormatter(log_formatter)

console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(log_formatter)

logger = logging.getLogger("detention")
logger.setLevel(logging.INFO)
logger.addHandler(file_handler)
logger.addHandler(console_handler)

ACTIVITY_LOG_FILE = os.path.join(LOG_DIR, "activity_log.txt")

def log_activity(action, table_name, record_id, details="", payload=None):
    """
    Dedicated human-readable activity log file: logs/activity_log.txt
    Records every single INSERT, UPDATE, DELETE, and SYSTEM action with timestamps and payload.
    """
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    payload_str = ""
    if payload and isinstance(payload, dict):
        clean_items = [f"{k}={v}" for k, v in payload.items() if v not in (None, "")]
        if clean_items:
            payload_str = f" | Fields: [{', '.join(clean_items)}]"
    
    line = f"[{ts}] [{action.upper():<6}] [{table_name}] ID={record_id}: {details}{payload_str}\n"
    try:
        with open(ACTIVITY_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line)
    except Exception as e:
        print(f"Failed to write to activity log: {e}")
    
    # Also log to structured server log
    logger.info(f"{action.upper()} on {table_name} (ID: {record_id}) - {details}")

import socket

def get_local_ip():
    # Attempt 1: connect to public DNS without sending packets
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        if ip and not ip.startswith("127."):
            return ip
    except Exception:
        pass
    # Attempt 2: hostname resolution
    try:
        hostname = socket.gethostname()
        ip = socket.gethostbyname(hostname)
        if ip and not ip.startswith("127."):
            return ip
    except Exception:
        pass
    return "127.0.0.1"

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    try:
        conn.execute("PRAGMA journal_mode = WAL;")
    except Exception:
        try:
            conn.execute("PRAGMA journal_mode = DELETE;")
        except Exception:
            pass
    try:
        conn.execute("PRAGMA synchronous = NORMAL;")
    except Exception:
        pass
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.row_factory = sqlite3.Row
    return conn

def sync_backup(conn):
    try:
        os.makedirs(BACKUP_DIR, exist_ok=True)
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM loading_detention ORDER BY CAST(s_no AS INTEGER) ASC;")
        loading_rows = [dict(r) for r in cursor.fetchall()]
        # NEVER wipe existing backup if current database table is empty!
        if len(loading_rows) > 0:
            with open(os.path.join(BACKUP_DIR, "loading_backup.json"), "w", encoding="utf-8") as f:
                json.dump(loading_rows, f, indent=2, ensure_ascii=False)
            
        cursor.execute("SELECT * FROM unloading_detention ORDER BY CAST(s_no AS INTEGER) ASC;")
        unloading_rows = [dict(r) for r in cursor.fetchall()]
        if len(unloading_rows) > 0:
            with open(os.path.join(BACKUP_DIR, "unloading_backup.json"), "w", encoding="utf-8") as f:
                json.dump(unloading_rows, f, indent=2, ensure_ascii=False)

        cursor.execute("SELECT * FROM terminals ORDER BY s_no ASC;")
        terminals_rows = [dict(r) for r in cursor.fetchall()]
        if len(terminals_rows) > 0:
            with open(os.path.join(BACKUP_DIR, "terminals_backup.json"), "w", encoding="utf-8") as f:
                json.dump(terminals_rows, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Warning: backup sync failed: {e}")

class DetentionAPIHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def log_message(self, format, *args):
        # Clean logging
        pass

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/"):
            self.handle_api_get(path, urllib.parse.parse_qs(parsed.query))
        else:
            # Fall back to serving static files
            super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        body = self.read_json_body()

        if path.startswith("/api/"):
            self.handle_api_post(path, body)
        else:
            self.send_error(404, "Not Found")

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        body = self.read_json_body()

        if path.startswith("/api/"):
            self.handle_api_put(path, body)
        else:
            self.send_error(404, "Not Found")

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/"):
            self.handle_api_delete(path)
        else:
            self.send_error(404, "Not Found")

    def read_json_body(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length > 0:
            raw = self.rfile.read(content_length).decode("utf-8")
            try:
                return json.loads(raw)
            except Exception:
                return {}
        return {}

    # -------------------------------------------------------------
    # API Router Handlers
    # -------------------------------------------------------------
    def handle_api_get(self, path, query):
        conn = get_db()
        cursor = conn.cursor()

        try:
            # Network Info for Mobile
            if path == "/api/network-info":
                ip = get_local_ip()
                host_hdr = self.headers.get("Host", f"localhost:{PORT}")
                proto = self.headers.get("X-Forwarded-Proto", "http")
                base_url = f"{proto}://{host_hdr}"
                is_cloud = not (host_hdr.startswith("localhost") or host_hdr.startswith("127.0.0.1") or host_hdr.startswith("192.168."))
                self.send_json({
                    "localIp": ip,
                    "desktopUrl": f"{base_url}/" if is_cloud else f"http://localhost:{PORT}",
                    "mobileUrl": f"{base_url}/mobile.html" if is_cloud else f"http://{ip}:{PORT}/mobile.html"
                })

            # Stats & Info
            elif path == "/api/stats":
                cursor.execute("SELECT COUNT(*) FROM terminals;")
                tot_terms = cursor.fetchone()[0]
                cursor.execute("SELECT COUNT(*) FROM terminals WHERE is_active = 1;")
                act_terms = cursor.fetchone()[0]
                cursor.execute("SELECT COUNT(*) FROM loading_detention;")
                tot_load = cursor.fetchone()[0]
                cursor.execute("SELECT COUNT(*) FROM unloading_detention;")
                tot_unload = cursor.fetchone()[0]

                db_size = os.path.getsize(DB_PATH) if os.path.exists(DB_PATH) else 0

                self.send_json({
                    "status": "online",
                    "database": "SQLite 3",
                    "walMode": True,
                    "dbSizeKb": round(db_size / 1024, 2),
                    "terminalsTotal": tot_terms,
                    "terminalsActive": act_terms,
                    "loadingRecords": tot_load,
                    "unloadingRecords": tot_unload
                })

            # Terminals List
            elif path == "/api/terminals":
                cursor.execute("SELECT id, s_no as sNo, code, name, category, subcategory, serving_station as servingStation, is_active as active FROM terminals ORDER BY s_no ASC;")
                rows = [dict(r) for r in cursor.fetchall()]
                for r in rows: r["active"] = bool(r["active"])
                self.send_json(rows)

            # Loading Detention List
            elif path == "/api/loading":
                cursor.execute("""
                SELECT id, s_no as sNo, station, arrl_time as arrlTime, placement_time as placementTime,
                       release_time as releaseTime, out_loco_no as outLocoNo, loco_arrl_time as locoArrlTime,
                       crew_arrl_time as crewArrlTime, tmr_arrl_time as tmrArrlTime, ready_time as readyTime,
                       dept_time as deptTime, remarks
                FROM loading_detention ORDER BY CAST(s_no AS INTEGER) ASC;
                """)
                self.send_json([dict(r) for r in cursor.fetchall()])

            # Unloading Detention List
            elif path == "/api/unloading":
                cursor.execute("""
                SELECT id, s_no as sNo, station, arrl_time as arrlTime, placement_time as placementTime,
                       release_time as releaseTime, out_loco_no as outLocoNo, loco_arrl_time as locoArrlTime,
                       crew_arrl_time as crewArrlTime, tmr_arrl_time as tmrArrlTime, ready_time as readyTime,
                       dept_time as deptTime, remarks
                FROM unloading_detention ORDER BY CAST(s_no AS INTEGER) ASC;
                """)
                self.send_json([dict(r) for r in cursor.fetchall()])

            # Settings
            elif path == "/api/settings":
                cursor.execute("SELECT key, value FROM app_settings;")
                settings = {r["key"]: r["value"] for r in cursor.fetchall()}
                self.send_json(settings)

            # Full System Backup / Export
            elif path == "/api/backup":
                cursor.execute("SELECT * FROM terminals ORDER BY s_no ASC;")
                term_rows = [dict(r) for r in cursor.fetchall()]
                cursor.execute("SELECT * FROM loading_detention ORDER BY CAST(s_no AS INTEGER) ASC;")
                load_rows = [dict(r) for r in cursor.fetchall()]
                cursor.execute("SELECT * FROM unloading_detention ORDER BY CAST(s_no AS INTEGER) ASC;")
                unload_rows = [dict(r) for r in cursor.fetchall()]
                cursor.execute("SELECT key, value FROM app_settings;")
                settings_rows = {r["key"]: r["value"] for r in cursor.fetchall()}
                self.send_json({
                    "version": "1.0",
                    "exportedAt": datetime.now().isoformat(),
                    "terminals": term_rows,
                    "loading": load_rows,
                    "unloading": unload_rows,
                    "settings": settings_rows
                })

            # Activity Log Viewer
            elif path == "/api/logs":
                lines = []
                if os.path.exists(ACTIVITY_LOG_FILE):
                    try:
                        with open(ACTIVITY_LOG_FILE, "r", encoding="utf-8") as f:
                            all_lines = f.readlines()
                            lines = [l for l in all_lines if l.strip()][-200:] # Last 200 activity entries
                    except Exception as e:
                        lines = [f"Error reading activity log: {e}"]
                
                # If file log has fewer than 5 entries, enrich with SQLite audit_log table
                if len(lines) < 5:
                    try:
                        cursor.execute("SELECT id, action, table_name, record_id, details, created_at FROM audit_log ORDER BY id ASC LIMIT 200;")
                        rows = [dict(r) for r in cursor.fetchall()]
                        if rows:
                            db_lines = [f"[{r['created_at']}] [{r['action']:<6}] [{r['table_name']}] ID={r['record_id']}: {r.get('details','')}\n" for r in rows]
                            existing_set = set(lines)
                            for dbl in db_lines:
                                if dbl not in existing_set:
                                    lines.append(dbl)
                    except Exception:
                        pass

                self.send_json({
                    "status": "ok",
                    "logFile": ACTIVITY_LOG_FILE,
                    "totalLines": len(lines),
                    "entries": lines
                })

            else:
                self.send_json({"error": "Unknown API endpoint"}, 404)

        finally:
            conn.close()

    def handle_api_post(self, path, body):
        conn = get_db()
        cursor = conn.cursor()

        try:
            if path == "/api/terminals":
                new_id = body.get("id") or f"TERM-{int(datetime.now().timestamp()*1000)}"
                cursor.execute("SELECT COALESCE(MAX(s_no), 0) + 1 FROM terminals;")
                s_no = body.get("sNo") or cursor.fetchone()[0]

                cursor.execute("""
                INSERT INTO terminals (id, s_no, code, name, category, subcategory, serving_station, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    new_id,
                    s_no,
                    body.get("code", "").upper().strip(),
                    body.get("name", "").upper().strip(),
                    body.get("category", "Goods Shed"),
                    body.get("subcategory", "GROUP I"),
                    body.get("servingStation", "").upper().strip(),
                    1 if body.get("active", True) else 0
                ))
                details = f"Added terminal {body.get('code')} ({body.get('name')})"
                cursor.execute("INSERT INTO audit_log (action, table_name, record_id, details) VALUES ('INSERT', 'terminals', ?, ?);",
                               (new_id, details))
                conn.commit()
                sync_backup(conn)
                log_activity("INSERT", "terminals", new_id, details, body)
                self.send_json({"success": True, "id": new_id})

            elif path == "/api/loading":
                new_id = body.get("id") or f"LD-{int(datetime.now().timestamp()*1000)}"
                cursor.execute("""
                INSERT INTO loading_detention (
                    id, s_no, station, arrl_time, placement_time, release_time,
                    out_loco_no, loco_arrl_time, crew_arrl_time, tmr_arrl_time,
                    ready_time, dept_time, remarks
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    new_id,
                    str(body.get("sNo", "")),
                    body.get("station", "").upper().strip(),
                    body.get("arrlTime", ""),
                    body.get("placementTime", ""),
                    body.get("releaseTime", ""),
                    body.get("outLocoNo", ""),
                    body.get("locoArrlTime", ""),
                    body.get("crewArrlTime", ""),
                    body.get("tmrArrlTime", ""),
                    body.get("readyTime", ""),
                    body.get("deptTime", ""),
                    body.get("remarks", "")
                ))
                details = f"Station={body.get('station')} SNo={body.get('sNo')} Loco={body.get('outLocoNo')}"
                cursor.execute("INSERT INTO audit_log (action, table_name, record_id, details) VALUES ('INSERT', 'loading_detention', ?, ?);",
                               (new_id, details))
                conn.commit()
                sync_backup(conn)
                log_activity("INSERT", "loading_detention", new_id, details, body)
                self.send_json({"success": True, "id": new_id})

            elif path == "/api/unloading":
                new_id = body.get("id") or f"UD-{int(datetime.now().timestamp()*1000)}"
                cursor.execute("""
                INSERT INTO unloading_detention (
                    id, s_no, station, arrl_time, placement_time, release_time,
                    out_loco_no, loco_arrl_time, crew_arrl_time, tmr_arrl_time,
                    ready_time, dept_time, remarks
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    new_id,
                    str(body.get("sNo", "")),
                    body.get("station", "").upper().strip(),
                    body.get("arrlTime", ""),
                    body.get("placementTime", ""),
                    body.get("releaseTime", ""),
                    body.get("outLocoNo", ""),
                    body.get("locoArrlTime", ""),
                    body.get("crewArrlTime", ""),
                    body.get("tmrArrlTime", ""),
                    body.get("readyTime", ""),
                    body.get("deptTime", ""),
                    body.get("remarks", "")
                ))
                details = f"Station={body.get('station')} SNo={body.get('sNo')} Loco={body.get('outLocoNo')}"
                cursor.execute("INSERT INTO audit_log (action, table_name, record_id, details) VALUES ('INSERT', 'unloading_detention', ?, ?);",
                               (new_id, details))
                conn.commit()
                sync_backup(conn)
                log_activity("INSERT", "unloading_detention", new_id, details, body)
                self.send_json({"success": True, "id": new_id})

            elif path == "/api/settings":
                for k, v in body.items():
                    cursor.execute("INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP);", (k, str(v)))
                conn.commit()
                log_activity("UPDATE", "app_settings", "SETTINGS", f"Updated settings: {list(body.keys())}", body)
                self.send_json({"success": True})

            elif path == "/api/reset":
                # STRICT SAFETY GUARD: Must send {"confirm": "CONFIRM RESET"}
                if body.get("confirm") != "CONFIRM RESET":
                    logger.warning("RESET API rejected: missing {'confirm': 'CONFIRM RESET'}")
                    self.send_json({"error": "Reset blocked for safety. You must send {'confirm': 'CONFIRM RESET'}"}, 403)
                    return

                logger.warning("RESET API called with confirmation! Creating safety backup first...")
                sync_backup(conn)
                
                # Count records before reset
                cursor.execute("SELECT COUNT(*) FROM loading_detention;")
                load_count = cursor.fetchone()[0]
                cursor.execute("SELECT COUNT(*) FROM unloading_detention;")
                unload_count = cursor.fetchone()[0]
                
                if load_count > 0 or unload_count > 0:
                    backup_dir = os.path.join(BASE_DIR, "backups")
                    os.makedirs(backup_dir, exist_ok=True)
                    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                    
                    cursor.execute("SELECT * FROM loading_detention ORDER BY CAST(s_no AS INTEGER) ASC;")
                    load_rows = [dict(r) for r in cursor.fetchall()]
                    with open(os.path.join(backup_dir, f"loading_BEFORE_RESET_{ts}.json"), "w", encoding="utf-8") as f:
                        json.dump(load_rows, f, indent=2, ensure_ascii=False)
                    
                    cursor.execute("SELECT * FROM unloading_detention ORDER BY CAST(s_no AS INTEGER) ASC;")
                    unload_rows = [dict(r) for r in cursor.fetchall()]
                    with open(os.path.join(backup_dir, f"unloading_BEFORE_RESET_{ts}.json"), "w", encoding="utf-8") as f:
                        json.dump(unload_rows, f, indent=2, ensure_ascii=False)
                    
                    logger.warning(f"RESET: Backed up {load_count} loading + {unload_count} unloading records to backups/*_BEFORE_RESET_{ts}.json")
                
                import init_db
                init_db.initialize(force=True)
                log_activity("RESET_WIPE", "ALL_TABLES", "SYSTEM", f"Reset executed. Wiped {load_count} loading + {unload_count} unloading records.")
                self.send_json({"success": True, "message": f"Database reset. {load_count + unload_count} records backed up to backups/ folder."})

            elif path == "/api/sync-cache":
                # Resilient Cache Sync: Allows browser or mobile client to restore records if server container restarted
                cached_loading = body.get("loading", [])
                cached_unloading = body.get("unloading", [])
                restored_loading = 0
                restored_unloading = 0

                if cached_loading and isinstance(cached_loading, list):
                    for item in cached_loading:
                        rid = item.get("id") or f"LD-{int(datetime.now().timestamp()*1000)}"
                        cursor.execute("""
                        INSERT OR IGNORE INTO loading_detention (
                            id, s_no, station, arrl_time, placement_time, release_time,
                            out_loco_no, loco_arrl_time, crew_arrl_time, tmr_arrl_time,
                            ready_time, dept_time, remarks
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                        """, (
                            rid, str(item.get("sNo", "")), str(item.get("station", "")).upper().strip(),
                            item.get("arrlTime", ""), item.get("placementTime", ""), item.get("releaseTime", ""),
                            item.get("outLocoNo", ""), item.get("locoArrlTime", ""), item.get("crewArrlTime", ""),
                            item.get("tmrArrlTime", ""), item.get("readyTime", ""), item.get("deptTime", ""),
                            item.get("remarks", "")
                        ))
                        if cursor.rowcount > 0:
                            restored_loading += 1

                if cached_unloading and isinstance(cached_unloading, list):
                    for item in cached_unloading:
                        rid = item.get("id") or f"UD-{int(datetime.now().timestamp()*1000)}"
                        cursor.execute("""
                        INSERT OR IGNORE INTO unloading_detention (
                            id, s_no, station, arrl_time, placement_time, release_time,
                            out_loco_no, loco_arrl_time, crew_arrl_time, tmr_arrl_time,
                            ready_time, dept_time, remarks
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                        """, (
                            rid, str(item.get("sNo", "")), str(item.get("station", "")).upper().strip(),
                            item.get("arrlTime", ""), item.get("placementTime", ""), item.get("releaseTime", ""),
                            item.get("outLocoNo", ""), item.get("locoArrlTime", ""), item.get("crewArrlTime", ""),
                            item.get("tmrArrlTime", ""), item.get("readyTime", ""), item.get("deptTime", ""),
                            item.get("remarks", "")
                        ))
                        if cursor.rowcount > 0:
                            restored_unloading += 1

                if restored_loading > 0 or restored_unloading > 0:
                    conn.commit()
                    sync_backup(conn)
                    log_activity("SYNC", "CACHE_RESTORE", "CLIENT", f"Restored {restored_loading} loading and {restored_unloading} unloading records from client cache.")

                self.send_json({"success": True, "restoredLoading": restored_loading, "restoredUnloading": restored_unloading})

            else:
                self.send_json({"error": "Unknown POST endpoint"}, 404)

        finally:
            conn.close()

    def handle_api_put(self, path, body):
        conn = get_db()
        cursor = conn.cursor()

        try:
            parts = path.strip("/").split("/")
            if len(parts) >= 3:
                resource = parts[1]
                rec_id = parts[2]

                if resource == "terminals":
                    cursor.execute("""
                    UPDATE terminals
                    SET code = ?, name = ?, category = ?, subcategory = ?, serving_station = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?;
                    """, (
                        body.get("code", "").upper().strip(),
                        body.get("name", "").upper().strip(),
                        body.get("category", "Goods Shed"),
                        body.get("subcategory", "GROUP I"),
                        body.get("servingStation", "").upper().strip(),
                        1 if body.get("active", True) else 0,
                        rec_id
                    ))
                    conn.commit()
                    sync_backup(conn)
                    log_activity("UPDATE", "terminals", rec_id, f"Updated terminal {body.get('code')}", body)
                    self.send_json({"success": True, "id": rec_id})

                elif resource in ("loading", "unloading"):
                    tbl = "loading_detention" if resource == "loading" else "unloading_detention"
                    cursor.execute(f"""
                    UPDATE {tbl}
                    SET s_no = ?, station = ?, arrl_time = ?, placement_time = ?, release_time = ?,
                        out_loco_no = ?, loco_arrl_time = ?, crew_arrl_time = ?, tmr_arrl_time = ?,
                        ready_time = ?, dept_time = ?, remarks = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?;
                    """, (
                        str(body.get("sNo", "")),
                        body.get("station", "").upper().strip(),
                        body.get("arrlTime", ""),
                        body.get("placementTime", ""),
                        body.get("releaseTime", ""),
                        body.get("outLocoNo", ""),
                        body.get("locoArrlTime", ""),
                        body.get("crewArrlTime", ""),
                        body.get("tmrArrlTime", ""),
                        body.get("readyTime", ""),
                        body.get("deptTime", ""),
                        body.get("remarks", ""),
                        rec_id
                    ))
                    conn.commit()
                    sync_backup(conn)
                    log_activity("UPDATE", tbl, rec_id, f"Updated record Station={body.get('station')} SNo={body.get('sNo')}", body)
                    self.send_json({"success": True, "id": rec_id})

                else:
                    self.send_json({"error": "Unknown resource"}, 404)
            else:
                self.send_json({"error": "Invalid PUT path"}, 400)

        finally:
            conn.close()

    def handle_api_delete(self, path):
        conn = get_db()
        cursor = conn.cursor()

        try:
            parts = path.strip("/").split("/")
            if len(parts) >= 3:
                resource = parts[1]
                rec_id = parts[2]

                tbl_map = {
                    "terminals": "terminals",
                    "loading": "loading_detention",
                    "unloading": "unloading_detention"
                }

                if resource in tbl_map:
                    tbl = tbl_map[resource]
                    
                    # Fetch snapshot before deleting
                    cursor.execute(f"SELECT * FROM {tbl} WHERE id = ?;", (rec_id,))
                    row = cursor.fetchone()
                    snapshot = dict(row) if row else {}

                    cursor.execute(f"DELETE FROM {tbl} WHERE id = ?;", (rec_id,))
                    details = f"Deleted record snapshot: {snapshot}"
                    cursor.execute("INSERT INTO audit_log (action, table_name, record_id, details) VALUES ('DELETE', ?, ?, ?);",
                                   (tbl, rec_id, details))
                    conn.commit()
                    sync_backup(conn)
                    log_activity("DELETE", tbl, rec_id, details, snapshot)
                    self.send_json({"success": True, "id": rec_id})
                else:
                    self.send_json({"error": "Unknown resource"}, 404)
            else:
                self.send_json({"error": "Invalid DELETE path"}, 400)

        finally:
            conn.close()

def free_port(port=8080):
    import subprocess
    try:
        # Check if port is already in use by another process
        output = subprocess.check_output(f'netstat -ano | findstr ":{port}" | findstr "LISTENING"', shell=True).decode()
        for line in output.strip().splitlines():
            parts = line.strip().split()
            if len(parts) >= 5:
                pid = parts[-1]
                if int(pid) != os.getpid():
                    print(f"Port {port} busy (PID {pid}). Reclaiming port...")
                    subprocess.call(f"taskkill /F /PID {pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    import time
                    time.sleep(1)
    except Exception:
        pass

def run_server():
    os.chdir(BASE_DIR)
    free_port(PORT)
    # Always ensure database tables exist and terminals are seeded.
    # This uses force=False so it NEVER deletes existing user data.
    # Safe to run on every startup — only creates what's missing.
    import init_db
    init_db.DB_PATH = DB_PATH
    db_existed = os.path.exists(DB_PATH)
    init_db.initialize(force=False, seed_demo=False, empty_terminals=False)
    if not db_existed:
        print("[INIT] Created fresh database with 53 terminals.")
    else:
        print("[INIT] Existing database verified. User data preserved.")

    # RESILIENT AUTO-RESTORE SAFETY CHECK:
    # If loading or unloading table is empty (e.g. fresh container startup), auto-restore from backups!
    conn = get_db()
    try:
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM loading_detention;")
        load_count = c.fetchone()[0]
        if load_count == 0:
            bk_file = os.path.join(BACKUP_DIR, "loading_backup.json")
            init_file = os.path.join(BASE_DIR, "loading_initial.json")
            source_file = None
            if os.path.exists(bk_file) and os.path.getsize(bk_file) > 10:
                source_file = bk_file
            elif os.path.exists(init_file) and os.path.getsize(init_file) > 10:
                source_file = init_file
            
            if source_file:
                print(f"[SAFETY RESTORE] loading_detention was empty. Auto-restoring from {os.path.basename(source_file)}...")
                try:
                    with open(source_file, "r", encoding="utf-8") as f:
                        items = json.load(f)
                    for idx, item in enumerate(items):
                        rid = item.get("id") or f"LD-{idx+1:02d}"
                        c.execute("""
                        INSERT OR IGNORE INTO loading_detention (
                            id, s_no, station, arrl_time, placement_time, release_time,
                            out_loco_no, loco_arrl_time, crew_arrl_time, tmr_arrl_time,
                            ready_time, dept_time, remarks
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                        """, (
                            rid, str(item.get("sNo", idx+1)), item.get("station", "").upper().strip(),
                            item.get("arrlTime", ""), item.get("placementTime", ""), item.get("releaseTime", ""),
                            item.get("outLocoNo", ""), item.get("locoArrlTime", ""), item.get("crewArrlTime", ""),
                            item.get("tmrArrlTime", ""), item.get("readyTime", ""), item.get("deptTime", ""),
                            item.get("remarks", "")
                        ))
                    conn.commit()
                    sync_backup(conn)
                    log_activity("RESTORE", "loading_detention", "SYSTEM", f"Auto-restored {len(items)} records from {os.path.basename(source_file)}")
                    print(f"[SAFETY RESTORE] Successfully restored {len(items)} loading detention records.")
                except Exception as ex:
                    print(f"[SAFETY RESTORE WARNING] Could not auto-restore: {ex}")

        # Check unloading table
        c.execute("SELECT COUNT(*) FROM unloading_detention;")
        unload_count = c.fetchone()[0]
        if unload_count == 0:
            ubk_file = os.path.join(BACKUP_DIR, "unloading_backup.json")
            if os.path.exists(ubk_file) and os.path.getsize(ubk_file) > 10:
                try:
                    with open(ubk_file, "r", encoding="utf-8") as f:
                        uitems = json.load(f)
                    if uitems:
                        for idx, item in enumerate(uitems):
                            rid = item.get("id") or f"UD-{idx+1:02d}"
                            c.execute("""
                            INSERT OR IGNORE INTO unloading_detention (
                                id, s_no, station, arrl_time, placement_time, release_time,
                                out_loco_no, loco_arrl_time, crew_arrl_time, tmr_arrl_time,
                                ready_time, dept_time, remarks
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                            """, (
                                rid, str(item.get("sNo", idx+1)), item.get("station", "").upper().strip(),
                                item.get("arrlTime", ""), item.get("placementTime", ""), item.get("releaseTime", ""),
                                item.get("outLocoNo", ""), item.get("locoArrlTime", ""), item.get("crewArrlTime", ""),
                                item.get("tmrArrlTime", ""), item.get("readyTime", ""), item.get("deptTime", ""),
                                item.get("remarks", "")
                            ))
                        conn.commit()
                        sync_backup(conn)
                        log_activity("RESTORE", "unloading_detention", "SYSTEM", f"Auto-restored {len(uitems)} records from unloading_backup.json")
                except Exception as ex:
                    print(f"[SAFETY RESTORE WARNING] Could not auto-restore unloading: {ex}")
    finally:
        conn.close()

    handler = DetentionAPIHandler
    socketserver.TCPServer.allow_reuse_address = True
    local_ip = get_local_ip()
    try:
        with socketserver.TCPServer(("", PORT), handler) as httpd:
            print("==================================================")
            print(" Railway Terminal Detention Management Server")
            print(" Status: ONLINE (Port 8080)")
            print("==================================================")
            print(f" [Desktop App] : http://localhost:{PORT}")
            print(f" [Mobile Phone]: http://{local_ip}:{PORT}/mobile.html")
            print(f" [Database]    : {DB_PATH}")
            print(" [Engine]      : SQLite3 WAL Mode Active")
            print("==================================================")
            print(" Ready for connections. Press Ctrl+C to stop.")
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\nShutting down server.")
    except OSError as e:
        print(f"\n[ERROR] Could not start server on port {PORT}: {e}")
        print("A process may already be using port 8080.")
        print("Please run 'stop.bat' or close any previous server windows, then try again.\n")
        input("Press Enter to exit...")

if __name__ == "__main__":
    run_server()

