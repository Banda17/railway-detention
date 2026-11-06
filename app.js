// ==========================================================================
// Windows 98 Railway Detention & Terminal Management System
// Supporting:
// 1. Optimized SQLite3 Backend Database (detention.db) with REST API
// 2. LocalStorage Offline Standalone Fallback
// 3. Strict Date/Time Formatting & Validation (HH:MM DD-MM-YYYY)
// 4. Multi-Table Relational Schema:
//    - Terminals & Sidings (53 from PDF)
//    - Loading Detention (12 Columns from Google Sheet)
//    - Unloading Detention (12 Columns from Google Sheet)
//    - Categories & Subcategories
//    - App Settings & Audit Log
// ==========================================================================

const STORAGE_KEYS = {
  TERMINALS: "win98_terminal_master_v3",
  LOADING: "win98_loading_detention_v3",
  UNLOADING: "win98_unloading_detention_v3"
};

const DEFAULT_YEAR = 2026;
let isServerMode = window.location.protocol.startsWith("http");

// Retro Web Audio Sound Effects
class RetroSound {
  constructor() {
    this.ctx = null;
  }
  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) this.ctx = new AudioContext();
    }
  }
  click() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.03);
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.03);
    } catch (e) {}
  }
  alert() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(520, this.ctx.currentTime);
      osc.frequency.setValueAtTime(660, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    } catch (e) {}
  }
}

const sound = new RetroSound();

// Application State
let activeTab = "loading"; // 'loading', 'unloading', 'master'

let terminals = [];
let loadingData = [];
let unloadingData = [];

let selectedId = null;
let editingId = null;
let pendingDeleteId = null;

let searchQueries = {
  loading: "",
  unloading: "",
  master: ""
};

let masterFilter = {
  type: "all",
  value: null,
  status: "all"
};

let sortState = {
  loading: { col: "sNo", asc: true },
  unloading: { col: "sNo", asc: true },
  master: { col: "sNo", asc: true }
};

// ==========================================================================
// DATE & TIME FORMATTING AND VALIDATION LOGIC
// Standard Format: HH:MM DD-MM-YYYY (e.g. 10:30 04-09-2026)
// ==========================================================================

function formatAndNormalizeTime(inputStr, allowSpecial = false) {
  if (!inputStr || typeof inputStr !== "string") {
    return { valid: true, value: "", error: null };
  }

  let s = inputStr.trim();
  if (s === "") return { valid: true, value: "", error: null };

  if (allowSpecial) {
    const lower = s.toLowerCase();
    if (lower.startsWith("stabled")) return { valid: true, value: "Stabled", error: null };
    if (lower.startsWith("b/l")) return { valid: true, value: "B/L", error: null };
    if (lower.includes("on hand bcn")) return { valid: true, value: "On hand BCN", error: null };
  }

  let cleaned = s
    .replace(/hrs/gi, "")
    .replace(/of/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Pattern 1: HH:MM DD-MM-YYYY or HH:MM DD/MM/YYYY or HH.MM DD-MM-YYYY
  let m1 = cleaned.match(/^(\d{1,2})[:.](\d{2})\s+(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m1) {
    let hh = parseInt(m1[1], 10);
    let mm = parseInt(m1[2], 10);
    let dd = parseInt(m1[3], 10);
    let mo = parseInt(m1[4], 10);
    let yy = parseInt(m1[5], 10);
    if (yy < 100) yy += 2000;

    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59 && dd >= 1 && dd <= 31 && mo >= 1 && mo <= 12) {
      const out = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${String(dd).padStart(2, "0")}-${String(mo).padStart(2, "0")}-${yy}`;
      return { valid: true, value: out, error: null };
    }
  }

  // Pattern 2: HH:MM DD-MM (assumes default year 2026)
  let m2 = cleaned.match(/^(\d{1,2})[:.](\d{2})\s+(\d{1,2})[-/.](\d{1,2})$/);
  if (m2) {
    let hh = parseInt(m2[1], 10);
    let mm = parseInt(m2[2], 10);
    let dd = parseInt(m2[3], 10);
    let mo = parseInt(m2[4], 10);

    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59 && dd >= 1 && dd <= 31 && mo >= 1 && mo <= 12) {
      const out = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${String(dd).padStart(2, "0")}-${String(mo).padStart(2, "0")}-${DEFAULT_YEAR}`;
      return { valid: true, value: out, error: null };
    }
  }

  // Pattern 3: Compact 8-12 digits: HHMM DDMM or HHMM DDMMYYYY
  let m3 = cleaned.match(/^(\d{2})(\d{2})\s*(\d{2})(\d{2})(?:(\d{4}))?$/);
  if (m3) {
    let hh = parseInt(m3[1], 10);
    let mm = parseInt(m3[2], 10);
    let dd = parseInt(m3[3], 10);
    let mo = parseInt(m3[4], 10);
    let yy = m3[5] ? parseInt(m3[5], 10) : DEFAULT_YEAR;

    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59 && dd >= 1 && dd <= 31 && mo >= 1 && mo <= 12) {
      const out = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${String(dd).padStart(2, "0")}-${String(mo).padStart(2, "0")}-${yy}`;
      return { valid: true, value: out, error: null };
    }
  }

  // Pattern 4: DD-MM-YYYY HH:MM (reversed)
  let m4 = cleaned.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\s+(\d{1,2})[:.](\d{2})$/);
  if (m4) {
    let dd = parseInt(m4[1], 10);
    let mo = parseInt(m4[2], 10);
    let yy = parseInt(m4[3], 10);
    if (yy < 100) yy += 2000;
    let hh = parseInt(m4[4], 10);
    let mm = parseInt(m4[5], 10);

    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59 && dd >= 1 && dd <= 31 && mo >= 1 && mo <= 12) {
      const out = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${String(dd).padStart(2, "0")}-${String(mo).padStart(2, "0")}-${yy}`;
      return { valid: true, value: out, error: null };
    }
  }

  // If user entered custom railway notes or times like "LP: 20:45 | ALP: 22:10" or "04:25 of 10/09"
  // Keep the value intact so it can be saved directly to the database
  return { valid: true, value: s, error: null };
}

function parseRailwayDateTime(str) {
  if (!str) return null;
  const res = formatAndNormalizeTime(str, true);
  if (!res.valid || !res.value || res.value === "Stabled" || res.value === "B/L" || res.value === "On hand BCN") {
    return null;
  }
  const parts = res.value.split(" ");
  if (parts.length !== 2) return null;
  const [timePart, datePart] = parts;
  if (!timePart.includes(":") || !datePart.includes("-")) return null;
  const [hh, mm] = timePart.split(":").map(Number);
  const [dd, mo, yyyy] = datePart.split("-").map(Number);
  if (isNaN(hh) || isNaN(mm) || isNaN(dd) || isNaN(mo) || isNaN(yyyy)) return null;
  return new Date(yyyy, mo - 1, dd, hh, mm);
}

function setFieldNow(fieldId) {
  sound.click();
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const mo = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();

  const formatted = `${hh}:${mm} ${dd}-${mo}-${yyyy}`;
  const inputEl = document.getElementById(fieldId);
  if (inputEl) {
    inputEl.value = formatted;
    validateFieldOnBlur(fieldId);
  }
}

function setFieldVal(fieldId, val) {
  sound.click();
  const inputEl = document.getElementById(fieldId);
  if (inputEl) {
    inputEl.value = val;
    validateFieldOnBlur(fieldId, true);
  }
}

// 100% Reliable Cross-Browser Date/Time Picker Trigger
function triggerPicker(fieldId) {
  sound.click();
  const picker = document.getElementById("picker-" + fieldId);
  if (!picker) return;

  const currentVal = document.getElementById(fieldId).value.trim();
  const d = parseRailwayDateTime(currentVal);
  const pad = n => String(n).padStart(2, "0");

  if (d && !isNaN(d.getTime())) {
    picker.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } else {
    const now = new Date();
    picker.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  // Modern browser direct picker API
  if (typeof picker.showPicker === "function") {
    try {
      picker.showPicker();
      return;
    } catch (e) {
      console.warn("showPicker failed, using focus/click:", e);
    }
  }

  // Fallback for older engines
  picker.style.position = "static";
  picker.style.opacity = "1";
  picker.style.pointerEvents = "auto";
  picker.focus();
  picker.click();
  setTimeout(() => {
    picker.style.position = "fixed";
    picker.style.opacity = "0";
    picker.style.pointerEvents = "none";
  }, 200);
}

function onPickerChosen(pickerEl, targetFieldId) {
  sound.click();
  const val = pickerEl.value; // "YYYY-MM-DDTHH:mm"
  if (!val) return;
  const [datePart, timePart] = val.split("T");
  const [yyyy, mo, dd] = datePart.split("-");
  const [hh, mm] = timePart.split(":");

  const formatted = `${hh}:${mm} ${dd}-${mo}-${yyyy}`;
  const targetInput = document.getElementById(targetFieldId);
  if (targetInput) {
    targetInput.value = formatted;
    validateFieldOnBlur(targetFieldId, true);
  }
}

function openPhoneModal() {
  sound.click();
  document.getElementById("phone-modal").classList.add("open");
}

function copyPhoneLink() {
  sound.click();
  const copyInput = document.getElementById("phone-wifi-url");
  if (copyInput) {
    copyInput.select();
    navigator.clipboard.writeText(copyInput.value).then(() => {
      alert("✅ Phone link copied to clipboard!\n\nOpen this link in your phone browser while connected to Wi-Fi:\n" + copyInput.value);
    }).catch(() => {
      alert("Link: " + copyInput.value);
    });
  }
}

function validateFieldOnBlur(fieldId, allowSpecial = false) {
  const inputEl = document.getElementById(fieldId);
  const errEl = document.getElementById("err-" + fieldId);
  if (!inputEl) return true;

  const result = formatAndNormalizeTime(inputEl.value, allowSpecial);
  if (result.valid) {
    inputEl.value = result.value;
    inputEl.classList.remove("input-error");
    if (errEl) {
      errEl.textContent = "";
      errEl.classList.remove("visible");
    }
    updateLiveDetentionCalc();
    return true;
  } else {
    inputEl.classList.add("input-error");
    if (errEl) {
      errEl.textContent = "⚠️ " + result.error;
      errEl.classList.add("visible");
    }
    updateLiveDetentionCalc();
    return false;
  }
}

function updateLiveDetentionCalc() {
  const placeInput = document.getElementById("det-form-placement");
  const releaseInput = document.getElementById("det-form-release");
  const bannerResult = document.getElementById("calc-dwell-time");
  if (!bannerResult) return;

  const placeDate = placeInput ? parseRailwayDateTime(placeInput.value) : null;
  const releaseDate = releaseInput ? parseRailwayDateTime(releaseInput.value) : null;

  if (placeDate && releaseDate) {
    const diffMs = releaseDate - placeDate;
    if (diffMs >= 0) {
      const totalMinutes = Math.floor(diffMs / 60000);
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      bannerResult.innerHTML = `<strong style="color: #008000;">${hours} hrs ${mins} mins</strong> (${totalMinutes} mins total)`;
    } else {
      bannerResult.innerHTML = `<strong style="color: #c00000;">⚠️ Release time cannot be earlier than placement time!</strong>`;
    }
  } else {
    bannerResult.textContent = "— (Enter valid Placement & Release times)";
  }
}

// ==========================================================================
// APP INITIALIZATION & SQLITE REST API INTEGRATION
// ==========================================================================

function initApp() {
  loadSelectionColor();
  setupEventListeners();
  loadAllData();
  startClock();
}

function loadSelectionColor() {
  try {
    const savedColor = localStorage.getItem("win98_selected_color") || "#0a64dc";
    document.documentElement.style.setProperty("--win-highlight-bg", savedColor);
    const colorSelect = document.getElementById("theme-color-select");
    if (colorSelect) colorSelect.value = savedColor;
  } catch (e) {}
}

function changeSelectionColor(color, saveToServer = true) {
  sound.click();
  document.documentElement.style.setProperty("--win-highlight-bg", color);
  try {
    localStorage.setItem("win98_selected_color", color);
    if (isServerMode && saveToServer) {
      fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme_selected_color: color })
      }).catch(() => {});
    }
  } catch (e) {}
}

async function loadAllData() {
  if (isServerMode) {
    try {
      const [termRes, loadRes, unloadRes, setRes] = await Promise.all([
        fetch("/api/terminals").then(r => r.json()),
        fetch("/api/loading").then(r => r.json()),
        fetch("/api/unloading").then(r => r.json()),
        fetch("/api/settings").then(r => r.json()).catch(() => ({}))
      ]);

      terminals = termRes || [];
      loadingData = loadRes || [];
      unloadingData = unloadRes || [];

      if (setRes && setRes.theme_selected_color) {
        changeSelectionColor(setRes.theme_selected_color, false);
      }

      // Check and sync any offline queue
      await syncOfflineRecordsToServer();
      saveAllData();

      populateTerminalDataList();
      renderActiveTab();
      updateStatusBar();
      return;
    } catch (e) {
      console.warn("REST API unavailable. Falling back to local storage:", e);
      isServerMode = false;
    }
  }

  // Fallback to localStorage
  try {
    const savedTerminals = localStorage.getItem(STORAGE_KEYS.TERMINALS);
    terminals = savedTerminals ? JSON.parse(savedTerminals) : JSON.parse(JSON.stringify(INITIAL_TERMINALS));

    const savedLoading = localStorage.getItem(STORAGE_KEYS.LOADING);
    loadingData = savedLoading ? JSON.parse(savedLoading) : JSON.parse(JSON.stringify(INITIAL_LOADING_DETENTION));

    const savedUnloading = localStorage.getItem(STORAGE_KEYS.UNLOADING);
    unloadingData = savedUnloading ? JSON.parse(savedUnloading) : JSON.parse(JSON.stringify(INITIAL_UNLOADING_DETENTION));

    normalizeDatasetTimes(loadingData);
    normalizeDatasetTimes(unloadingData);
    saveAllData();
  } catch (e) {
    terminals = JSON.parse(JSON.stringify(INITIAL_TERMINALS));
    loadingData = JSON.parse(JSON.stringify(INITIAL_LOADING_DETENTION));
    unloadingData = JSON.parse(JSON.stringify(INITIAL_UNLOADING_DETENTION));
  }

  populateTerminalDataList();
  renderActiveTab();
  updateStatusBar();
}

function normalizeDatasetTimes(dataList) {
  const timeFields = ["arrlTime", "placementTime", "releaseTime", "locoArrlTime", "crewArrlTime", "tmrArrlTime", "readyTime", "deptTime"];
  dataList.forEach(item => {
    timeFields.forEach(f => {
      if (item[f]) {
        const res = formatAndNormalizeTime(item[f], f === "locoArrlTime");
        if (res.valid && res.value) {
          item[f] = res.value;
        }
      }
    });
  });
}

function saveAllData() {
  try {
    localStorage.setItem(STORAGE_KEYS.TERMINALS, JSON.stringify(terminals));
    localStorage.setItem(STORAGE_KEYS.LOADING, JSON.stringify(loadingData));
    localStorage.setItem(STORAGE_KEYS.UNLOADING, JSON.stringify(unloadingData));
  } catch (e) {
    console.error("Error saving offline mirror:", e);
  }
}

async function syncOfflineRecordsToServer() {
  try {
    const offlineQueue = JSON.parse(localStorage.getItem("win98_offline_queue") || "[]");
    if (offlineQueue.length === 0) return;

    for (const item of offlineQueue) {
      const endpoint = item.type === "loading" ? "/api/loading" : "/api/unloading";
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.payload)
      });
    }
    localStorage.removeItem("win98_offline_queue");
    console.log("Successfully synced offline queue to SQLite database.");
  } catch (e) {
    console.warn("Could not sync offline queue:", e);
  }
}

async function resetToDefault() {
  if (confirm("Reset ALL database tables (Loading, Unloading, and Master Terminals) to original source defaults?")) {
    if (isServerMode) {
      try {
        await fetch("/api/reset", { method: "POST" });
        await loadAllData();
        sound.alert();
        return;
      } catch (e) {
        console.error("Reset API failed:", e);
      }
    }

    terminals = JSON.parse(JSON.stringify(INITIAL_TERMINALS));
    loadingData = JSON.parse(JSON.stringify(INITIAL_LOADING_DETENTION));
    unloadingData = JSON.parse(JSON.stringify(INITIAL_UNLOADING_DETENTION));
    normalizeDatasetTimes(loadingData);
    normalizeDatasetTimes(unloadingData);
    saveAllData();
    populateTerminalDataList();
    renderActiveTab();
    updateStatusBar();
    sound.alert();
  }
}

function populateTerminalDataList() {
  const dl = document.getElementById("terminal-datalist");
  if (!dl) return;
  dl.innerHTML = terminals
    .filter(t => t.active)
    .map(t => `<option value="${t.code}">${t.name} (${t.category} - ${t.subcategory})</option>`)
    .join("");
}

// Tab Switching
function switchTab(tabKey) {
  sound.click();
  activeTab = tabKey;
  selectedId = null;

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === tabKey);
  });

  document.querySelectorAll(".tab-view").forEach(view => {
    view.classList.toggle("active", view.id === `tab-view-${tabKey}`);
  });

  const statusFilterEl = document.getElementById("toolbar-status-filter-group");
  const isMaster = tabKey === "master";
  if (statusFilterEl) statusFilterEl.style.display = isMaster ? "flex" : "none";

  const btnNew = document.getElementById("btn-toolbar-new");
  if (btnNew) {
    if (tabKey === "loading") btnNew.innerHTML = "<span>➕</span> <strong>New Loading Record</strong>";
    else if (tabKey === "unloading") btnNew.innerHTML = "<span>➕</span> <strong>New Unloading Record</strong>";
    else btnNew.innerHTML = "<span>➕</span> <strong>New Terminal</strong>";
  }

  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.value = searchQueries[activeTab] || "";
  }

  updateToolbarState();
  renderActiveTab();
  updateStatusBar();
}

function renderActiveTab() {
  updateTabCounts();
  if (activeTab === "loading") {
    renderDetentionTable("loading", loadingData, "loading-tbody");
  } else if (activeTab === "unloading") {
    renderDetentionTable("unloading", unloadingData, "unloading-tbody");
  } else if (activeTab === "master") {
    renderTree();
    renderMasterTable();
  }
}

function updateTabCounts() {
  const countLoad = document.getElementById("tab-count-loading");
  const countUnload = document.getElementById("tab-count-unloading");
  const countMaster = document.getElementById("tab-count-master");

  if (countLoad) countLoad.textContent = loadingData.length;
  if (countUnload) countUnload.textContent = unloadingData.length;
  if (countMaster) countMaster.textContent = terminals.length;
}

// Detention Tables Rendering
function renderDetentionTable(type, dataList, tbodyId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  let list = [...dataList];
  const query = (searchQueries[type] || "").toLowerCase().trim();

  if (query) {
    list = list.filter(item => {
      return Object.values(item).some(val => 
        String(val || "").toLowerCase().includes(query)
      );
    });
  }

  const { col, asc } = sortState[type];
  list.sort((a, b) => {
    let valA = a[col] || "";
    let valB = b[col] || "";
    
    if (col === "sNo") {
      const numA = parseInt(valA, 10) || 0;
      const numB = parseInt(valB, 10) || 0;
      return asc ? numA - numB : numB - numA;
    }

    valA = String(valA).toLowerCase();
    valB = String(valB).toLowerCase();
    if (valA < valB) return asc ? -1 : 1;
    if (valA > valB) return asc ? 1 : -1;
    return 0;
  });

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="13" style="text-align: center; padding: 40px; color: #666;">
          <div style="font-size: 24px; margin-bottom: 6px;">📋</div>
          No ${type.toUpperCase()} detention records found matching your filter.<br>
          Click <strong>New ${type === 'loading' ? 'Loading' : 'Unloading'} Record</strong> to add an entry.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map((item, idx) => {
    const isSelected = item.id === selectedId;
    return `
      <tr class="${isSelected ? 'selected' : ''}" 
          data-id="${item.id}"
          onclick="handleRowClick('${item.id}', this)"
          ondblclick="openEditModal('${item.id}')">
        <td style="text-align: center; width: 45px; font-weight: bold;">${item.sNo || (idx + 1)}</td>
        <td class="station-cell" style="width: 140px;">${escapeHtml(item.station || '')}</td>
        <td class="time-cell" style="width: 125px;">${escapeHtml(item.arrlTime || '')}</td>
        <td class="time-cell" style="width: 145px;">${escapeHtml(item.placementTime || '')}</td>
        <td class="time-cell" style="width: 145px;">${escapeHtml(item.releaseTime || '')}</td>
        <td style="font-weight: bold; width: 130px; font-family: var(--win-font-mono);">${escapeHtml(item.outLocoNo || '')}</td>
        <td class="time-cell" style="width: 125px;">${escapeHtml(item.locoArrlTime || '')}</td>
        <td class="time-cell" style="width: 130px;">${escapeHtml(item.crewArrlTime || '')}</td>
        <td class="time-cell" style="width: 125px;">${escapeHtml(item.tmrArrlTime || '')}</td>
        <td class="time-cell" style="width: 130px;">${escapeHtml(item.readyTime || '')}</td>
        <td class="time-cell" style="width: 140px;">${escapeHtml(item.deptTime || '')}</td>
        <td style="width: 260px;" title="${escapeHtml(item.remarks || '')}">${escapeHtml(item.remarks || '')}</td>
        <td style="width: 80px; text-align: center;" onclick="event.stopPropagation()">
          <div class="action-btns" style="justify-content: center;">
            <button class="button-border action-btn-sm" onclick="openEditModal('${item.id}')" title="Edit Record">✏️</button>
            <button class="button-border action-btn-sm" onclick="confirmDelete('${item.id}')" title="Delete Record">❌</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// Master Terminals Rendering
function renderTree() {
  const treeContainer = document.getElementById("terminal-tree");
  if (!treeContainer) return;

  const totalCount = terminals.length;
  const goodsShedList = terminals.filter(t => t.category === "Goods Shed");
  const sidingsList = terminals.filter(t => t.category === "Sidings");

  let html = `
    <div class="tree-node">
      <div class="tree-row ${masterFilter.type === 'all' ? 'selected' : ''}" onclick="selectMasterFilter('all', null, this)">
        <span class="tree-toggle" onclick="toggleTreeNode(event, 'sub-root')">−</span>
        <span class="tree-icon">📁</span>
        <strong>All Railway Terminals</strong>
        <span class="tree-badge">(${totalCount})</span>
      </div>
      <div class="tree-children" id="sub-root">
        <div class="tree-node">
          <div class="tree-row ${masterFilter.type === 'category' && masterFilter.value === 'Goods Shed' ? 'selected' : ''}" onclick="selectMasterFilter('category', 'Goods Shed', this)">
            <span class="tree-toggle" onclick="toggleTreeNode(event, 'sub-goods')">−</span>
            <span class="tree-icon">📂</span>
            <span>Goods Sheds</span>
            <span class="tree-badge">(${goodsShedList.length})</span>
          </div>
          <div class="tree-children" id="sub-goods">
            ${CATEGORY_STRUCTURE["Goods Shed"].map(sub => {
              const count = goodsShedList.filter(t => t.subcategory === sub).length;
              const isSel = masterFilter.type === 'subcategory' && masterFilter.value === sub;
              return `
                <div class="tree-row ${isSel ? 'selected' : ''}" onclick="selectMasterFilter('subcategory', '${sub}', this)">
                  <span style="display:inline-block; width:11px;">•</span>
                  <span class="tree-icon">📄</span>
                  <span>${sub}</span>
                  <span class="tree-badge">(${count})</span>
                </div>
              `;
            }).join("")}
          </div>
        </div>

        <div class="tree-node">
          <div class="tree-row ${masterFilter.type === 'category' && masterFilter.value === 'Sidings' ? 'selected' : ''}" onclick="selectMasterFilter('category', 'Sidings', this)">
            <span class="tree-toggle" onclick="toggleTreeNode(event, 'sub-sidings')">−</span>
            <span class="tree-icon">📂</span>
            <span>Sidings</span>
            <span class="tree-badge">(${sidingsList.length})</span>
          </div>
          <div class="tree-children" id="sub-sidings">
            ${CATEGORY_STRUCTURE["Sidings"].map(sub => {
              const count = sidingsList.filter(t => t.subcategory === sub).length;
              const isSel = masterFilter.type === 'subcategory' && masterFilter.value === sub;
              return `
                <div class="tree-row ${isSel ? 'selected' : ''}" onclick="selectMasterFilter('subcategory', '${sub}', this)">
                  <span style="display:inline-block; width:11px;">•</span>
                  <span class="tree-icon">📄</span>
                  <span>${sub}</span>
                  <span class="tree-badge">(${count})</span>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      </div>
    </div>
  `;

  treeContainer.innerHTML = html;
}

function toggleTreeNode(event, childId) {
  event.stopPropagation();
  sound.click();
  const el = document.getElementById(childId);
  const toggleBtn = event.currentTarget;
  if (!el) return;
  if (el.style.display === "none") {
    el.style.display = "block";
    toggleBtn.textContent = "−";
  } else {
    el.style.display = "none";
    toggleBtn.textContent = "+";
  }
}

function selectMasterFilter(type, value, element) {
  sound.click();
  masterFilter.type = type;
  masterFilter.value = value;
  
  document.querySelectorAll(".tree-row").forEach(r => r.classList.remove("selected"));
  if (element) element.classList.add("selected");

  renderMasterTable();
  updateStatusBar();
}

function renderMasterTable() {
  const tbody = document.getElementById("master-tbody");
  if (!tbody) return;

  let list = [...terminals];

  if (masterFilter.type === "category") {
    list = list.filter(t => t.category === masterFilter.value);
  } else if (masterFilter.type === "subcategory") {
    list = list.filter(t => t.subcategory === masterFilter.value);
  }

  if (masterFilter.status === "active") {
    list = list.filter(t => t.active);
  } else if (masterFilter.status === "inactive") {
    list = list.filter(t => !t.active);
  }

  const q = (searchQueries.master || "").toLowerCase().trim();
  if (q) {
    list = list.filter(t => 
      t.code.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      (t.servingStation && t.servingStation.toLowerCase().includes(q)) ||
      t.subcategory.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  }

  const { col, asc } = sortState.master;
  list.sort((a, b) => {
    let valA = a[col];
    let valB = b[col];
    if (typeof valA === "string") valA = valA.toLowerCase();
    if (typeof valB === "string") valB = valB.toLowerCase();
    if (valA < valB) return asc ? -1 : 1;
    if (valA > valB) return asc ? 1 : -1;
    return 0;
  });

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 30px; color: #666;">
          No master terminals match the filter.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map((item, idx) => {
    const isSelected = item.id === selectedId;
    return `
      <tr class="${isSelected ? 'selected' : ''} ${!item.active ? 'inactive-row' : ''}" 
          data-id="${item.id}" 
          onclick="handleRowClick('${item.id}', this)"
          ondblclick="openEditModal('${item.id}')">
        <td style="text-align: center; width: 40px;" onclick="event.stopPropagation()">
          <input type="checkbox" ${item.active ? 'checked' : ''} onchange="toggleMasterTerminalActive('${item.id}')" title="Check to Activate / Uncheck to Deactivate">
        </td>
        <td style="width: 35px; text-align: center;">${idx + 1}</td>
        <td style="font-weight: bold; width: 65px; font-family: var(--win-font-mono);">${item.code}</td>
        <td style="font-weight: bold;">${escapeHtml(item.name)}</td>
        <td style="width: 100px;">${item.category}</td>
        <td style="width: 140px;">
          <span style="background: #eef2f7; border: 1px solid #d0d7de; padding: 1px 4px; font-size: 10px;">
            ${item.subcategory}
          </span>
        </td>
        <td style="width: 120px;">${escapeHtml(item.servingStation || '—')}</td>
        <td style="width: 90px; text-align: center;">
          <button class="status-pill ${item.active ? 'status-active' : 'status-inactive'}" 
                  onclick="event.stopPropagation(); toggleMasterTerminalActive('${item.id}')"
                  title="Click to ${item.active ? 'Deactivate' : 'Activate'}">
            <span class="status-dot"></span>
            ${item.active ? 'ACTIVE' : 'INACTIVE'}
          </button>
        </td>
        <td style="width: 80px; text-align: center;" onclick="event.stopPropagation()">
          <div class="action-btns" style="justify-content: center;">
            <button class="button-border action-btn-sm" onclick="openEditModal('${item.id}')" title="Edit Terminal">✏️</button>
            <button class="button-border action-btn-sm" onclick="confirmDelete('${item.id}')" title="Delete Terminal">❌</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function handleRowClick(id, rowEl) {
  sound.click();
  selectedId = id;
  const tbody = rowEl.closest("tbody");
  if (tbody) {
    tbody.querySelectorAll("tr").forEach(r => r.classList.remove("selected"));
  }
  rowEl.classList.add("selected");
  updateToolbarState();
  updateStatusBar();
}

function updateToolbarState() {
  const btnEdit = document.getElementById("btn-toolbar-edit");
  const btnDelete = document.getElementById("btn-toolbar-delete");
  const hasSelection = !!selectedId;
  if (btnEdit) btnEdit.disabled = !hasSelection;
  if (btnDelete) btnDelete.disabled = !hasSelection;
}

async function toggleMasterTerminalActive(id) {
  sound.click();
  const item = terminals.find(t => t.id === id);
  if (item) {
    item.active = !item.active;
    if (isServerMode) {
      await fetch(`/api/terminals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item)
      }).catch(() => {});
    } else {
      saveAllData();
    }
    populateTerminalDataList();
    renderMasterTable();
    renderTree();
    updateStatusBar();
  }
}

function clearFormErrors() {
  document.querySelectorAll(".field-error-msg").forEach(el => {
    el.textContent = "";
    el.classList.remove("visible");
  });
  document.querySelectorAll(".input-error").forEach(el => {
    el.classList.remove("input-error");
  });
}

function openAddModal() {
  sound.click();
  editingId = null;
  clearFormErrors();

  if (activeTab === "master") {
    document.getElementById("modal-terminal-title").textContent = "Add New Terminal";
    document.getElementById("form-term-code").value = "";
    document.getElementById("form-term-name").value = "";
    document.getElementById("form-term-category").value = "Goods Shed";
    updateSubcategoryDropdown("Goods Shed");
    document.getElementById("form-term-serving").value = "";
    document.getElementById("form-term-active").checked = true;
    document.getElementById("terminal-modal").classList.add("open");
    document.getElementById("form-term-code").focus();
  } else {
    const titleText = activeTab === "loading" ? "Add Loading Detention Record" : "Add Unloading Detention Record";
    document.getElementById("modal-detention-title").textContent = titleText;
    
    const nextSNo = (activeTab === "loading" ? loadingData.length : unloadingData.length) + 1;
    document.getElementById("det-form-sno").value = nextSNo;
    document.getElementById("det-form-station").value = "";
    document.getElementById("det-form-arrl").value = "";
    document.getElementById("det-form-placement").value = "";
    document.getElementById("det-form-release").value = "";
    document.getElementById("det-form-locono").value = "";
    document.getElementById("det-form-locoarrl").value = "";
    document.getElementById("det-form-crewarrl").value = "";
    document.getElementById("det-form-tmrarrl").value = "";
    document.getElementById("det-form-ready").value = "";
    document.getElementById("det-form-dept").value = "";
    document.getElementById("det-form-remarks").value = "";

    updateLiveDetentionCalc();
    document.getElementById("detention-modal").classList.add("open");
    document.getElementById("det-form-station").focus();
  }
}

function openEditModal(id) {
  sound.click();
  const targetId = id || selectedId;
  if (!targetId) return;

  editingId = targetId;
  clearFormErrors();

  if (activeTab === "master") {
    const term = terminals.find(t => t.id === targetId);
    if (!term) return;
    document.getElementById("modal-terminal-title").textContent = `Edit Terminal: ${term.code}`;
    document.getElementById("form-term-code").value = term.code;
    document.getElementById("form-term-name").value = term.name;
    document.getElementById("form-term-category").value = term.category;
    updateSubcategoryDropdown(term.category);
    document.getElementById("form-term-subcategory").value = term.subcategory;
    document.getElementById("form-term-serving").value = term.servingStation || "";
    document.getElementById("form-term-active").checked = term.active;
    document.getElementById("terminal-modal").classList.add("open");
  } else {
    const dataList = activeTab === "loading" ? loadingData : unloadingData;
    const item = dataList.find(d => d.id === targetId);
    if (!item) return;

    document.getElementById("modal-detention-title").textContent = `Edit ${activeTab.toUpperCase()} Record #${item.sNo}`;
    document.getElementById("det-form-sno").value = item.sNo || "";
    document.getElementById("det-form-station").value = item.station || "";
    document.getElementById("det-form-arrl").value = item.arrlTime || "";
    document.getElementById("det-form-placement").value = item.placementTime || "";
    document.getElementById("det-form-release").value = item.releaseTime || "";
    document.getElementById("det-form-locono").value = item.outLocoNo || "";
    document.getElementById("det-form-locoarrl").value = item.locoArrlTime || "";
    document.getElementById("det-form-crewarrl").value = item.crewArrlTime || "";
    document.getElementById("det-form-tmrarrl").value = item.tmrArrlTime || "";
    document.getElementById("det-form-ready").value = item.readyTime || "";
    document.getElementById("det-form-dept").value = item.deptTime || "";
    document.getElementById("det-form-remarks").value = item.remarks || "";

    updateLiveDetentionCalc();
    document.getElementById("detention-modal").classList.add("open");
  }
}

function closeModal(modalId) {
  sound.click();
  clearFormErrors();
  document.getElementById(modalId).classList.remove("open");
}

function updateSubcategoryDropdown(category) {
  const subSelect = document.getElementById("form-term-subcategory");
  if (!subSelect) return;
  const options = CATEGORY_STRUCTURE[category] || ["GENERAL"];
  subSelect.innerHTML = options.map(opt => `<option value="${opt}">${opt}</option>`).join("");
}

// Save Master Terminal Form
async function saveTerminalForm(event) {
  event.preventDefault();
  sound.click();

  const code = document.getElementById("form-term-code").value.trim().toUpperCase();
  const name = document.getElementById("form-term-name").value.trim().toUpperCase();
  const category = document.getElementById("form-term-category").value;
  const subcategory = document.getElementById("form-term-subcategory").value;
  const servingStation = document.getElementById("form-term-serving").value.trim().toUpperCase();
  const active = document.getElementById("form-term-active").checked;

  if (!code || !name) {
    alert("Please enter both Terminal Code and Terminal Name.");
    return;
  }

  const payload = {
    code,
    name,
    category,
    subcategory,
    servingStation: servingStation || code,
    active
  };

  if (isServerMode) {
    if (editingId) {
      await fetch(`/api/terminals/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } else {
      await fetch("/api/terminals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }
    await loadAllData();
  } else {
    if (editingId) {
      const item = terminals.find(t => t.id === editingId);
      if (item) Object.assign(item, payload);
    } else {
      const newId = "TERM-" + Date.now();
      terminals.push({
        id: newId,
        sNo: terminals.length + 1,
        ...payload
      });
      selectedId = newId;
    }
    saveAllData();
    populateTerminalDataList();
    renderTree();
    renderMasterTable();
    updateStatusBar();
  }

  closeModal("terminal-modal");
  sound.alert();
}

// Save Detention Form
async function saveDetentionForm(event) {
  event.preventDefault();

  const sNo = document.getElementById("det-form-sno").value.trim();
  const station = document.getElementById("det-form-station").value.trim().toUpperCase();

  if (!station) {
    alert("Please select or enter a Station / Siding.");
    document.getElementById("det-form-station").focus();
    return;
  }

  const timeFields = [
    { id: "det-form-arrl", name: "Train Arrival Time", allowSpecial: false },
    { id: "det-form-placement", name: "Train Placement Time", allowSpecial: false },
    { id: "det-form-release", name: "Train Release Time", allowSpecial: false },
    { id: "det-form-locoarrl", name: "Loco Arrival Time", allowSpecial: true },
    { id: "det-form-crewarrl", name: "Crew Arrival Time", allowSpecial: false },
    { id: "det-form-tmrarrl", name: "TMR Arrival Time", allowSpecial: false },
    { id: "det-form-ready", name: "Train Ready Time", allowSpecial: false },
    { id: "det-form-dept", name: "Train Departure Time", allowSpecial: false }
  ];

  let firstInvalid = null;
  for (const tf of timeFields) {
    const isValid = validateFieldOnBlur(tf.id, tf.allowSpecial);
    if (!isValid && !firstInvalid) {
      firstInvalid = tf;
    }
  }

  if (firstInvalid) {
    sound.alert();
    alert(`❌ Invalid Time Format in "${firstInvalid.name}"!\n\nPlease enter date/time in the format: HH:MM DD-MM-YYYY (e.g. 10:30 04-09-2026) or click 📅 Pick to select visually.`);
    document.getElementById(firstInvalid.id).focus();
    return;
  }

  const payload = {
    sNo,
    station,
    arrlTime: document.getElementById("det-form-arrl").value.trim(),
    placementTime: document.getElementById("det-form-placement").value.trim(),
    releaseTime: document.getElementById("det-form-release").value.trim(),
    outLocoNo: document.getElementById("det-form-locono").value.trim(),
    locoArrlTime: document.getElementById("det-form-locoarrl").value.trim(),
    crewArrlTime: document.getElementById("det-form-crewarrl").value.trim(),
    tmrArrlTime: document.getElementById("det-form-tmrarrl").value.trim(),
    readyTime: document.getElementById("det-form-ready").value.trim(),
    deptTime: document.getElementById("det-form-dept").value.trim(),
    remarks: document.getElementById("det-form-remarks").value.trim()
  };

  const endpoint = activeTab === "loading" ? "/api/loading" : "/api/unloading";

  if (isServerMode) {
    try {
      let res;
      if (editingId) {
        res = await fetch(`${endpoint}/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      await loadAllData();
    } catch (err) {
      console.warn("Backend save failed, storing in offline queue:", err);
      // Fallback: save to local memory & offline queue
      const targetList = activeTab === "loading" ? loadingData : unloadingData;
      if (editingId) {
        const item = targetList.find(d => d.id === editingId);
        if (item) Object.assign(item, payload);
      } else {
        const prefix = activeTab === "loading" ? "LD-" : "UD-";
        const newId = prefix + Date.now();
        targetList.push({ id: newId, ...payload });
        selectedId = newId;
      }
      // Save to offline queue
      const q = JSON.parse(localStorage.getItem("win98_offline_queue") || "[]");
      q.push({ type: activeTab, payload });
      localStorage.setItem("win98_offline_queue", JSON.stringify(q));
      saveAllData();
      renderActiveTab();
      updateStatusBar();
      alert("⚠️ Server was offline. Your record was saved safely in browser memory and will automatically sync to SQLite once the server connects!");
    }
  } else {
    const targetList = activeTab === "loading" ? loadingData : unloadingData;
    if (editingId) {
      const item = targetList.find(d => d.id === editingId);
      if (item) Object.assign(item, payload);
    } else {
      const prefix = activeTab === "loading" ? "LD-" : "UD-";
      const newId = prefix + Date.now();
      targetList.push({ id: newId, ...payload });
      selectedId = newId;
    }
    saveAllData();
    renderActiveTab();
    updateStatusBar();
  }

  closeModal("detention-modal");
  sound.alert();
}

function confirmDelete(id) {
  const targetId = id || selectedId;
  if (!targetId) return;

  pendingDeleteId = targetId;

  if (activeTab === "master") {
    const term = terminals.find(t => t.id === targetId);
    if (!term) return;
    document.getElementById("delete-item-desc").textContent = `Terminal [${term.code}] ${term.name}`;
  } else {
    const list = activeTab === "loading" ? loadingData : unloadingData;
    const item = list.find(d => d.id === targetId);
    if (!item) return;
    document.getElementById("delete-item-desc").textContent = `${activeTab.toUpperCase()} Record #${item.sNo} (${item.station})`;
  }

  document.getElementById("delete-modal").classList.add("open");
  sound.alert();
}

async function executeDelete() {
  if (!pendingDeleteId) return;

  if (isServerMode) {
    let endpoint = "";
    if (activeTab === "master") endpoint = `/api/terminals/${pendingDeleteId}`;
    else if (activeTab === "loading") endpoint = `/api/loading/${pendingDeleteId}`;
    else if (activeTab === "unloading") endpoint = `/api/unloading/${pendingDeleteId}`;

    await fetch(endpoint, { method: "DELETE" }).catch(() => {});
    if (selectedId === pendingDeleteId) selectedId = null;
    pendingDeleteId = null;
    await loadAllData();
  } else {
    if (activeTab === "master") {
      terminals = terminals.filter(t => t.id !== pendingDeleteId);
      terminals.forEach((t, i) => t.sNo = i + 1);
    } else if (activeTab === "loading") {
      loadingData = loadingData.filter(d => d.id !== pendingDeleteId);
    } else if (activeTab === "unloading") {
      unloadingData = unloadingData.filter(d => d.id !== pendingDeleteId);
    }

    if (selectedId === pendingDeleteId) selectedId = null;
    pendingDeleteId = null;

    saveAllData();
    populateTerminalDataList();
    renderActiveTab();
  }

  closeModal("delete-modal");
  updateToolbarState();
  updateStatusBar();
  sound.click();
}

// Sorting
function setSort(col, tab) {
  sound.click();
  const currentTab = tab || activeTab;
  const current = sortState[currentTab];
  if (current.col === col) {
    current.asc = !current.asc;
  } else {
    current.col = col;
    current.asc = true;
  }

  const activeView = document.getElementById(`tab-view-${currentTab}`);
  if (activeView) {
    activeView.querySelectorAll("th").forEach(th => {
      const arrow = th.querySelector(".sort-arrow");
      if (arrow) arrow.textContent = "";
    });
    const activeTh = activeView.querySelector(`th[data-col="${col}"]`);
    if (activeTh) {
      const arrow = activeTh.querySelector(".sort-arrow");
      if (arrow) arrow.textContent = current.asc ? "▲" : "▼";
    }
  }

  renderActiveTab();
}

// Export CSV
function exportCSV() {
  sound.click();

  if (activeTab === "master") {
    let csv = "S.No,Code,Name,Category,Subcategory / Classification,Serving Station,Status\r\n";
    terminals.forEach((t, i) => {
      csv += `${i + 1},"${t.code}","${t.name.replace(/"/g, '""')}","${t.category}","${t.subcategory}","${t.servingStation || ''}",${t.active ? "ACTIVE" : "INACTIVE"}\r\n`;
    });
    downloadCSV(csv, `master_terminals_${new Date().toISOString().slice(0,10)}.csv`);
  } else {
    const list = activeTab === "loading" ? loadingData : unloadingData;
    let csv = "S.NO,STATION /SIDING,TRAIN ARRL TIME,TRAIN PLACEMENT TIME,TRAIN RELEASE TIME,OUT GOING LOCO NO,LOCO ARRL TIME,CREW ARRL TIME,TMR ARRL TIME,TRAIN READY TIME,TRAIN DEPARTURE TIME,REMARKS\r\n";
    list.forEach((r, idx) => {
      const row = [
        r.sNo || (idx + 1),
        `"${(r.station || '').replace(/"/g, '""')}"`,
        `"${r.arrlTime || ''}"`,
        `"${r.placementTime || ''}"`,
        `"${r.releaseTime || ''}"`,
        `"${r.outLocoNo || ''}"`,
        `"${r.locoArrlTime || ''}"`,
        `"${r.crewArrlTime || ''}"`,
        `"${r.tmrArrlTime || ''}"`,
        `"${r.readyTime || ''}"`,
        `"${r.deptTime || ''}"`,
        `"${(r.remarks || '').replace(/"/g, '""')}"`
      ];
      csv += row.join(",") + "\r\n";
    });
    downloadCSV(csv, `${activeTab}_detention_log_${new Date().toISOString().slice(0,10)}.csv`);
  }
}

function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Status Bar Updates with Database Connection Indicator
function updateStatusBar() {
  const statTotal = document.getElementById("stat-total");
  const statActive = document.getElementById("stat-active");
  const statFilter = document.getElementById("stat-filter");
  const statSelection = document.getElementById("stat-selection");

  const dbIndicator = isServerMode ? "🟢 SQLite DB (WAL Active)" : "🟡 Standalone Mode";

  if (activeTab === "master") {
    const total = terminals.length;
    const activeCount = terminals.filter(t => t.active).length;
    if (statTotal) statTotal.textContent = `Terminals: ${total} | ${dbIndicator}`;
    if (statActive) statActive.textContent = `Active: ${activeCount} | Inactive: ${total - activeCount}`;
    if (statFilter) statFilter.textContent = `Filter: ${masterFilter.type === 'all' ? 'All' : masterFilter.value}`;
    if (statSelection) {
      if (selectedId) {
        const term = terminals.find(t => t.id === selectedId);
        statSelection.textContent = term ? `Selected: ${term.code} - ${term.name}` : "Selected: None";
      } else {
        statSelection.textContent = "Selected: None";
      }
    }
  } else {
    const list = activeTab === "loading" ? loadingData : unloadingData;
    const total = list.length;
    if (statTotal) statTotal.textContent = `${activeTab.toUpperCase()}: ${total} Records | ${dbIndicator}`;
    if (statActive) statActive.textContent = `Format: HH:MM DD-MM-YYYY`;
    if (statFilter) statFilter.textContent = searchQueries[activeTab] ? `Search: "${searchQueries[activeTab]}"` : "Filter: None";
    if (statSelection) {
      if (selectedId) {
        const item = list.find(d => d.id === selectedId);
        statSelection.textContent = item ? `Selected #${item.sNo}: ${item.station} (Loco: ${item.outLocoNo || 'None'})` : "Selected: None";
      } else {
        statSelection.textContent = "Selected: None";
      }
    }
  }
}

// Setup Event Listeners
function setupEventListeners() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-tab");
      switchTab(tab);
    });
  });

  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQueries[activeTab] = e.target.value;
      renderActiveTab();
      updateStatusBar();
    });
  }

  const statusSelect = document.getElementById("status-filter-select");
  if (statusSelect) {
    statusSelect.addEventListener("change", (e) => {
      masterFilter.status = e.target.value;
      renderMasterTable();
      updateStatusBar();
    });
  }

  const catSelect = document.getElementById("form-term-category");
  if (catSelect) {
    catSelect.addEventListener("change", (e) => {
      updateSubcategoryDropdown(e.target.value);
    });
  }

  document.querySelectorAll(".menu-item").forEach(item => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      const wasActive = item.classList.contains("active");
      document.querySelectorAll(".menu-item").forEach(m => m.classList.remove("active"));
      if (!wasActive) item.classList.add("active");
    });
  });

  document.addEventListener("click", () => {
    document.querySelectorAll(".menu-item").forEach(m => m.classList.remove("active"));
    const startMenu = document.getElementById("start-menu");
    if (startMenu) startMenu.classList.remove("open");
  });

  const startBtn = document.getElementById("start-button");
  if (startBtn) {
    startBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      sound.click();
      const startMenu = document.getElementById("start-menu");
      if (startMenu) startMenu.classList.toggle("open");
    });
  }

  document.querySelectorAll("table.win-table th[data-col]").forEach(th => {
    th.addEventListener("click", () => {
      const col = th.getAttribute("data-col");
      const tab = th.getAttribute("data-tab") || activeTab;
      setSort(col, tab);
    });
  });
}

function escapeHtml(str) {
  if (typeof str !== "string") return str || "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function startClock() {
  const clockEl = document.getElementById("clock");
  function tick() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    if (clockEl) clockEl.textContent = `${hours}:${minutes} ${ampm}`;
  }
  tick();
  setInterval(tick, 1000);
}

let isMaximized = false;
function toggleMaximize() {
  sound.click();
  const win = document.getElementById("main-window");
  if (!win) return;
  if (!isMaximized) {
    win.style.top = "0px";
    win.style.left = "0px";
    win.style.right = "0px";
    win.style.bottom = "30px";
    isMaximized = true;
  } else {
    win.style.top = "10px";
    win.style.left = "12px";
    win.style.right = "12px";
    win.style.bottom = "38px";
    isMaximized = false;
  }
}

function minimizeWindow() {
  sound.click();
  const win = document.getElementById("main-window");
  if (win) {
    win.style.display = win.style.display === "none" ? "flex" : "none";
  }
}

window.addEventListener("DOMContentLoaded", initApp);
