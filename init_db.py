"""
Railway Detention & Terminal Database Initializer
Creates optimized multi-table SQLite database: detention.db
Seeds data from Adobe Scan PDF (53 Terminals) & Google Sheets (Loading/Unloading)
"""

import sqlite3
import os
import json

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(os.path.abspath(__file__)), "detention.db"))
LOADING_JSON_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "loading_initial.json")

# 53 Master Railway Terminals from Adobe Scan 05 Nov 2026.pdf
INITIAL_TERMINALS = [
  # GOODS SHEDS - GROUP I
  {"id": "GS-01", "sNo": 1, "code": "KNGK", "name": "KAKINADA NEW GOODS COMPLEX", "category": "Goods Shed", "subcategory": "GROUP I", "servingStation": "KAKINADA", "active": 1},
  {"id": "GS-02", "sNo": 2, "code": "TDD", "name": "TADEPALLIGUDEM", "category": "Goods Shed", "subcategory": "GROUP I", "servingStation": "TADEPALLIGUDEM", "active": 1},
  {"id": "GS-03", "sNo": 3, "code": "BVM", "name": "BAYYAVARAM", "category": "Goods Shed", "subcategory": "GROUP I", "servingStation": "BAYYAVARAM", "active": 1},
  {"id": "GS-04", "sNo": 4, "code": "DWP", "name": "DWARAPUDI", "category": "Goods Shed", "subcategory": "GROUP I", "servingStation": "DWARAPUDI", "active": 1},
  {"id": "GS-05", "sNo": 5, "code": "PGU", "name": "PADUGUPADU", "category": "Goods Shed", "subcategory": "GROUP I", "servingStation": "PADUGUPADU", "active": 1},

  # GOODS SHEDS - GROUP II
  {"id": "GS-06", "sNo": 6, "code": "BVL", "name": "BIKKAVOLU", "category": "Goods Shed", "subcategory": "GROUP II", "servingStation": "BIKKAVOLU", "active": 1},
  {"id": "GS-07", "sNo": 7, "code": "OGL", "name": "ONGOLE", "category": "Goods Shed", "subcategory": "GROUP II", "servingStation": "ONGOLE", "active": 1},
  {"id": "GS-08", "sNo": 8, "code": "SLO", "name": "SAMALKOT JN", "category": "Goods Shed", "subcategory": "GROUP II", "servingStation": "SAMALKOT JN", "active": 1},
  {"id": "GS-09", "sNo": 9, "code": "KCC", "name": "KRISHNA CANAL", "category": "Goods Shed", "subcategory": "GROUP II", "servingStation": "KRISHNA CANAL", "active": 1},
  {"id": "GS-10", "sNo": 10, "code": "GDV", "name": "GUDIVADA", "category": "Goods Shed", "subcategory": "GROUP II", "servingStation": "GUDIVADA", "active": 1},
  {"id": "GS-11", "sNo": 11, "code": "RVD", "name": "RAVIKAMPADU", "category": "Goods Shed", "subcategory": "GROUP II", "servingStation": "RAVIKAMPADU", "active": 1},

  # GOODS SHEDS - GROUP III
  {"id": "GS-12", "sNo": 12, "code": "EE", "name": "ELURU", "category": "Goods Shed", "subcategory": "GROUP III", "servingStation": "ELURU", "active": 1},
  {"id": "GS-13", "sNo": 13, "code": "TEL", "name": "TENALI", "category": "Goods Shed", "subcategory": "GROUP III", "servingStation": "TENALI", "active": 1},
  {"id": "GS-14", "sNo": 14, "code": "NDD", "name": "NIDADAVOLU", "category": "Goods Shed", "subcategory": "GROUP III", "servingStation": "NIDADAVOLU", "active": 1},
  {"id": "GS-15", "sNo": 15, "code": "PKO", "name": "PALAKOLLU", "category": "Goods Shed", "subcategory": "GROUP III", "servingStation": "PALAKOLLU", "active": 1},
  {"id": "GS-16", "sNo": 16, "code": "AKVD", "name": "AKIVIDU", "category": "Goods Shed", "subcategory": "GROUP III", "servingStation": "AKIVIDU", "active": 1},
  {"id": "GS-17", "sNo": 17, "code": "TNKU", "name": "TANUKU", "category": "Goods Shed", "subcategory": "GROUP III", "servingStation": "TANUKU", "active": 1},
  {"id": "GS-18", "sNo": 18, "code": "AKP", "name": "ANAKAPALLI", "category": "Goods Shed", "subcategory": "GROUP III", "servingStation": "ANAKAPALLI", "active": 1},
  {"id": "GS-19", "sNo": 19, "code": "CLX", "name": "CHIRALA", "category": "Goods Shed", "subcategory": "GROUP III", "servingStation": "CHIRALA", "active": 1},
  {"id": "GS-20", "sNo": 20, "code": "NZD", "name": "NUZVID", "category": "Goods Shed", "subcategory": "GROUP III", "servingStation": "NUZVID", "active": 1},
  {"id": "GS-21", "sNo": 21, "code": "REG", "name": "REGUPALEM", "category": "Goods Shed", "subcategory": "GROUP III", "servingStation": "REGUPALEM", "active": 1},
  {"id": "GS-22", "sNo": 22, "code": "MTM", "name": "MACHILIPATNAM", "category": "Goods Shed", "subcategory": "GROUP III", "servingStation": "MACHILIPATNAM", "active": 1},
  {"id": "GS-23", "sNo": 23, "code": "BVRM", "name": "BHIMAVARAM", "category": "Goods Shed", "subcategory": "GROUP III", "servingStation": "BHIMAVARAM", "active": 1},
  {"id": "GS-24", "sNo": 24, "code": "NDM", "name": "NIDAMANURU", "category": "Goods Shed", "subcategory": "GROUP III", "servingStation": "NIDAMANURU", "active": 1},
  {"id": "GS-25", "sNo": 25, "code": "MBL", "name": "MANUBOLU", "category": "Goods Shed", "subcategory": "GROUP III", "servingStation": "MANUBOLU", "active": 1},
  {"id": "GS-26", "sNo": 26, "code": "NGPM", "name": "NIDUGUNTAPALEM", "category": "Goods Shed", "subcategory": "GROUP III", "servingStation": "NIDUGUNTAPALEM", "active": 1},
  {"id": "GS-27", "sNo": 27, "code": "KVR", "name": "KOVVUR", "category": "Goods Shed", "subcategory": "GROUP III", "servingStation": "KOVVUR", "active": 1},
  {"id": "GS-28", "sNo": 28, "code": "SDM", "name": "SURAREDDIPALEM", "category": "Goods Shed", "subcategory": "GROUP III", "servingStation": "SURAREDDIPALEM", "active": 1},
  {"id": "GS-29", "sNo": 29, "code": "BPP", "name": "BAPATLA", "category": "Goods Shed", "subcategory": "GROUP III", "servingStation": "BAPATLA", "active": 1},

  # SIDINGS - PORTS
  {"id": "SD-01", "sNo": 1, "code": "AKPK", "name": "ADANI KRISHNAPATNAM PORT LTD", "category": "Sidings", "subcategory": "PORTS", "servingStation": "KRISHNAPATNAM", "active": 1},
  {"id": "SD-02", "sNo": 2, "code": "KSLK", "name": "KAKINADA SEA PORT LTD", "category": "Sidings", "subcategory": "PORTS", "servingStation": "KAKINADA", "active": 1},

  # SIDINGS - PFTs
  {"id": "SD-03", "sNo": 3, "code": "AWCA", "name": "ANAPARTHI WHAREHOUSING CORPORATION, ANAPARTHI", "category": "Sidings", "subcategory": "PFTs", "servingStation": "ANAPARTHI", "active": 1},
  {"id": "SD-04", "sNo": 4, "code": "VIPN", "name": "VIMALA INFRASTRUCTURE PRIVATE LIMITED, NARASINGAPALLI", "category": "Sidings", "subcategory": "PFTs", "servingStation": "NARASINGAPALLI", "active": 1},

  # SIDINGS - GCTs
  {"id": "SD-05", "sNo": 5, "code": "AAFN", "name": "AKILESH AGRO FORMS LIMITED, NAVABPALEM", "category": "Sidings", "subcategory": "GCTs", "servingStation": "NAVABPALEM", "active": 1},
  {"id": "SD-06", "sNo": 6, "code": "BPGK", "name": "BHARAT PETROLEUM CORPORATION LIMITED, KRISHNAPATNAM", "category": "Sidings", "subcategory": "GCTs", "servingStation": "KRISHNAPATNAM", "active": 1},

  # SIDINGS - THERMAL POWER HOUSE
  {"id": "SD-07", "sNo": 7, "code": "TPAK", "name": "THERMAL POWER STATION SIDING, KONDAPALLI", "category": "Sidings", "subcategory": "THERMAL POWER HOUSE", "servingStation": "KONDAPALLI", "active": 1},

  # SIDINGS - FERTILIZERS
  {"id": "SD-08", "sNo": 8, "code": "PGFC", "name": "COROMANDEL INTERNATIONAL SIDING", "category": "Sidings", "subcategory": "FERTILIZERS", "servingStation": "KAKINADA", "active": 1},
  {"id": "SD-09", "sNo": 9, "code": "NGFS", "name": "NAGARJUNA FERTILIZERS", "category": "Sidings", "subcategory": "FERTILIZERS", "servingStation": "KAKINADA", "active": 1},

  # SIDINGS - FCI
  {"id": "SD-10", "sNo": 10, "code": "FCBG", "name": "FCI SIDING, NUZVID", "category": "Sidings", "subcategory": "FCI", "servingStation": "NUZVID", "active": 1},
  {"id": "SD-11", "sNo": 11, "code": "FCGS", "name": "FCI SIDING, KRISHNA CANAL", "category": "Sidings", "subcategory": "FCI", "servingStation": "KRISHNA CANAL", "active": 1},
  {"id": "SD-12", "sNo": 12, "code": "FCGV", "name": "FCI SIDING, GUDIVADA", "category": "Sidings", "subcategory": "FCI", "servingStation": "GUDIVADA", "active": 1},
  {"id": "SD-13", "sNo": 13, "code": "FCIR", "name": "FCI SIDING, RAJAHMUNDRY", "category": "Sidings", "subcategory": "FCI", "servingStation": "RAJAHMUNDRY", "active": 1},
  {"id": "SD-14", "sNo": 14, "code": "FCIT", "name": "FCI SIDING, VENKATACHALAM", "category": "Sidings", "subcategory": "FCI", "servingStation": "VENKATACHALAM", "active": 1},
  {"id": "SD-15", "sNo": 15, "code": "FCPA", "name": "FCI SIDING PENNADA AGRAHARAM", "category": "Sidings", "subcategory": "FCI", "servingStation": "PENNADA AGRAHARAM", "active": 1},
  {"id": "SD-16", "sNo": 16, "code": "FCST", "name": "FCI SIDING, SAMALKOT", "category": "Sidings", "subcategory": "FCI", "servingStation": "SAMALKOT", "active": 1},

  # SIDINGS - FOOD GRAINS
  {"id": "SD-17", "sNo": 17, "code": "BSAU", "name": "BHAVAN SAI ASSOCIATES SIDING", "category": "Sidings", "subcategory": "FOOD GRAINS", "servingStation": "UPPALURU", "active": 1},

  # SIDINGS - CEMENT
  {"id": "SD-18", "sNo": 18, "code": "MMHR", "name": "MY HOME INDUSTRIES LIMITED, REGUPALEM", "category": "Sidings", "subcategory": "CEMENT", "servingStation": "REGUPALEM", "active": 1},
  {"id": "SD-19", "sNo": 19, "code": "MNCK", "name": "NAGARJUNA CEMENTS SIDING, KONDAPALLI", "category": "Sidings", "subcategory": "CEMENT", "servingStation": "KONDAPALLI", "active": 1},
  {"id": "SD-20", "sNo": 20, "code": "MRCN", "name": "RAMCO CEMENTS PRIVATE LIMITED, NARASINGAPALLI", "category": "Sidings", "subcategory": "CEMENT", "servingStation": "NARASINGAPALLI", "active": 1},

  # SIDINGS - POL
  {"id": "SD-21", "sNo": 21, "code": "IOCD", "name": "IOC/BPCL LIMITED SIDING, SURAREDDIPALEM", "category": "Sidings", "subcategory": "POL", "servingStation": "SURAREDDIPALEM", "active": 1},
  {"id": "SD-22", "sNo": 22, "code": "HPCG", "name": "HINDUSTHAN PETROLEUM CORPORATION LIMITED, GANGINENI", "category": "Sidings", "subcategory": "POL", "servingStation": "GANGINENI", "active": 1},

  # SIDINGS - IRON AND STEEL
  {"id": "SD-23", "sNo": 23, "code": "TISM", "name": "TATA IRON & STEEL SIDING, GANNAVARAM", "category": "Sidings", "subcategory": "IRON AND STEEL", "servingStation": "GANNAVARAM", "active": 1},

  # SIDINGS - INDUSTRIAL SALT
  {"id": "SD-24", "sNo": 24, "code": "ASLS", "name": "THE ANDHRA SUGARS LIMITED", "category": "Sidings", "subcategory": "INDUSTRIAL SALT", "servingStation": "KOVVUR", "active": 1}
]

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA cache_size = -64000;") # 64MB Cache
    conn.execute("PRAGMA temp_store = MEMORY;")
    conn.row_factory = sqlite3.Row
    return conn

def create_tables(conn):
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS subcategories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_name TEXT NOT NULL,
        name TEXT NOT NULL UNIQUE,
        FOREIGN KEY (category_name) REFERENCES categories (name) ON DELETE CASCADE
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS terminals (
        id TEXT PRIMARY KEY,
        s_no INTEGER,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        subcategory TEXT NOT NULL,
        serving_station TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS loading_detention (
        id TEXT PRIMARY KEY,
        s_no TEXT,
        station TEXT NOT NULL,
        arrl_time TEXT,
        placement_time TEXT,
        release_time TEXT,
        out_loco_no TEXT,
        loco_arrl_time TEXT,
        crew_arrl_time TEXT,
        tmr_arrl_time TEXT,
        ready_time TEXT,
        dept_time TEXT,
        remarks TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS unloading_detention (
        id TEXT PRIMARY KEY,
        s_no TEXT,
        station TEXT NOT NULL,
        arrl_time TEXT,
        placement_time TEXT,
        release_time TEXT,
        out_loco_no TEXT,
        loco_arrl_time TEXT,
        crew_arrl_time TEXT,
        tmr_arrl_time TEXT,
        ready_time TEXT,
        dept_time TEXT,
        remarks TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        table_name TEXT NOT NULL,
        record_id TEXT,
        details TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_terminals_code ON terminals (code);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_terminals_category ON terminals (category);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_terminals_sub ON terminals (subcategory);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_terminals_active ON terminals (is_active);")

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_loading_station ON loading_detention (station);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_loading_loco ON loading_detention (out_loco_no);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_loading_placement ON loading_detention (placement_time);")

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_unloading_station ON unloading_detention (station);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_unloading_loco ON unloading_detention (out_loco_no);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_unloading_placement ON unloading_detention (placement_time);")

    conn.commit()

def seed_categories(conn):
    categories = [
        ("Goods Shed", "Official Indian Railways Goods Sheds"),
        ("Sidings", "Private, Port, and Public Railway Sidings")
    ]
    subcategories = [
        ("Goods Shed", "GROUP I"),
        ("Goods Shed", "GROUP II"),
        ("Goods Shed", "GROUP III"),
        ("Sidings", "PORTS"),
        ("Sidings", "PFTs"),
        ("Sidings", "GCTs"),
        ("Sidings", "THERMAL POWER HOUSE"),
        ("Sidings", "FERTILIZERS"),
        ("Sidings", "FCI"),
        ("Sidings", "FOOD GRAINS"),
        ("Sidings", "CEMENT"),
        ("Sidings", "POL"),
        ("Sidings", "IRON AND STEEL"),
        ("Sidings", "INDUSTRIAL SALT")
    ]

    cursor = conn.cursor()
    cursor.executemany("INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?);", categories)
    cursor.executemany("INSERT OR IGNORE INTO subcategories (category_name, name) VALUES (?, ?);", subcategories)
    conn.commit()

def seed_data(conn, force_reset=False, seed_demo=False, empty_terminals=False):
    cursor = conn.cursor()

    if force_reset:
        cursor.execute("DELETE FROM loading_detention;")
        cursor.execute("DELETE FROM unloading_detention;")
        cursor.execute("DELETE FROM audit_log;")
        if empty_terminals:
            cursor.execute("DELETE FROM terminals;")
            print("-> Terminals table cleared (0 records).")
        conn.commit()
        print("-> Cleaned all detention tables (0 records). Ready for clean data entry.")

    # 1. Seed Terminals (53 stations from PDF catalog so station dropdowns function)
    if not empty_terminals:
        cursor.execute("SELECT COUNT(*) FROM terminals;")
        if cursor.fetchone()[0] == 0:
            records = [
                (t["id"], t["sNo"], t["code"], t["name"], t["category"], t["subcategory"], t["servingStation"], t["active"])
                for t in INITIAL_TERMINALS
            ]
            cursor.executemany("""
            INSERT OR REPLACE INTO terminals (id, s_no, code, name, category, subcategory, serving_station, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            """, records)
            print(f"-> Seeded {len(records)} master terminals from PDF for station dropdowns.")

    # 2. Loading & Unloading tables remain 100% EMPTY by default!
    # Only populate demo rows if seed_demo=True is explicitly specified
    if seed_demo:
        cursor.execute("SELECT COUNT(*) FROM loading_detention;")
        if cursor.fetchone()[0] == 0 and os.path.exists(LOADING_JSON_PATH):
            with open(LOADING_JSON_PATH, "r", encoding="utf-8") as f:
                loading_items = json.load(f)
            load_records = [
                (
                    f"LD-{idx+1:02d}",
                    str(item.get("sNo", idx+1)),
                    item.get("station", ""),
                    item.get("arrlTime", ""),
                    item.get("placementTime", ""),
                    item.get("releaseTime", ""),
                    item.get("outLocoNo", ""),
                    item.get("locoArrlTime", ""),
                    item.get("crewArrlTime", ""),
                    item.get("tmrArrlTime", ""),
                    item.get("readyTime", ""),
                    item.get("deptTime", ""),
                    item.get("remarks", "")
                )
                for idx, item in enumerate(loading_items)
            ]
            cursor.executemany("""
            INSERT OR REPLACE INTO loading_detention (
                id, s_no, station, arrl_time, placement_time, release_time,
                out_loco_no, loco_arrl_time, crew_arrl_time, tmr_arrl_time,
                ready_time, dept_time, remarks
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, load_records)
            print(f"-> Seeded {len(load_records)} demo loading detention records.")

    # 3. Default Settings
    settings = [
        ("theme_selected_color", "#0a64dc"),
        ("default_tab", "loading"),
        ("system_version", "Windows 98 Operational Suite v4.10")
    ]
    cursor.executemany("INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?);", settings)

    conn.commit()

def verify_database(conn):
    cursor = conn.cursor()
    print("\n--- Database Verification & Status ---")
    tables = ["categories", "subcategories", "terminals", "loading_detention", "unloading_detention", "app_settings"]
    for t in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {t};")
        cnt = cursor.fetchone()[0]
        print(f"  [{t}]: {cnt} records")
    print(f"Database File: {DB_PATH}")
    print("Optimization: WAL Mode, Memory Temp, 64MB Cache active.")
    print("--------------------------------------\n")

def initialize(force=False, seed_demo=False, empty_terminals=False):
    conn = get_connection()
    create_tables(conn)
    seed_categories(conn)
    seed_data(conn, force_reset=force, seed_demo=seed_demo, empty_terminals=empty_terminals)
    verify_database(conn)
    conn.close()

if __name__ == "__main__":
    import sys
    seed_demo = "--seed-demo" in sys.argv
    empty_terminals = "--empty-terminals" in sys.argv
    force = "--force" in sys.argv or "-f" in sys.argv  # NEVER auto-force — user must pass --force explicitly
    if force:
        print("[WARNING] --force flag detected. This will DELETE all loading/unloading data!")
        confirm = input("Type 'YES' to confirm data wipe: ").strip()
        if confirm != "YES":
            print("[ABORTED] No data was deleted.")
            sys.exit(0)
    print("[INFO] Initializing database (force={}, seed_demo={}, empty_terminals={})...".format(force, seed_demo, empty_terminals))
    initialize(force=force, seed_demo=seed_demo, empty_terminals=empty_terminals)
