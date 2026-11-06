// ==========================================================================
// Terminal & Detention Master Data
// Extracted from:
// 1. Adobe Scan 05 Nov 2026.pdf (Master Terminals & Sidings)
// ==========================================================================

// Master Terminals Directory (53 Goods Sheds and Sidings from PDF)
const INITIAL_TERMINALS = [
  // --- GOODS SHEDS ---
  // GROUP I
  { id: "GS-01", sNo: 1, code: "KNGK", name: "KAKINADA NEW GOODS COMPLEX", category: "Goods Shed", subcategory: "GROUP I", servingStation: "KAKINADA", active: true },
  { id: "GS-02", sNo: 2, code: "TDD", name: "TADEPALLIGUDEM", category: "Goods Shed", subcategory: "GROUP I", servingStation: "TADEPALLIGUDEM", active: true },
  { id: "GS-03", sNo: 3, code: "BVM", name: "BAYYAVARAM", category: "Goods Shed", subcategory: "GROUP I", servingStation: "BAYYAVARAM", active: true },
  { id: "GS-04", sNo: 4, code: "DWP", name: "DWARAPUDI", category: "Goods Shed", subcategory: "GROUP I", servingStation: "DWARAPUDI", active: true },
  { id: "GS-05", sNo: 5, code: "PGU", name: "PADUGUPADU", category: "Goods Shed", subcategory: "GROUP I", servingStation: "PADUGUPADU", active: true },

  // GROUP II
  { id: "GS-06", sNo: 6, code: "BVL", name: "BIKKAVOLU", category: "Goods Shed", subcategory: "GROUP II", servingStation: "BIKKAVOLU", active: true },
  { id: "GS-07", sNo: 7, code: "OGL", name: "ONGOLE", category: "Goods Shed", subcategory: "GROUP II", servingStation: "ONGOLE", active: true },
  { id: "GS-08", sNo: 8, code: "SLO", name: "SAMALKOT JN", category: "Goods Shed", subcategory: "GROUP II", servingStation: "SAMALKOT JN", active: true },
  { id: "GS-09", sNo: 9, code: "KCC", name: "KRISHNA CANAL", category: "Goods Shed", subcategory: "GROUP II", servingStation: "KRISHNA CANAL", active: true },
  { id: "GS-10", sNo: 10, code: "GDV", name: "GUDIVADA", category: "Goods Shed", subcategory: "GROUP II", servingStation: "GUDIVADA", active: true },
  { id: "GS-11", sNo: 11, code: "RVD", name: "RAVIKAMPADU", category: "Goods Shed", subcategory: "GROUP II", servingStation: "RAVIKAMPADU", active: true },

  // GROUP III
  { id: "GS-12", sNo: 12, code: "EE", name: "ELURU", category: "Goods Shed", subcategory: "GROUP III", servingStation: "ELURU", active: true },
  { id: "GS-13", sNo: 13, code: "TEL", name: "TENALI", category: "Goods Shed", subcategory: "GROUP III", servingStation: "TENALI", active: true },
  { id: "GS-14", sNo: 14, code: "NDD", name: "NIDADAVOLU", category: "Goods Shed", subcategory: "GROUP III", servingStation: "NIDADAVOLU", active: true },
  { id: "GS-15", sNo: 15, code: "PKO", name: "PALAKOLLU", category: "Goods Shed", subcategory: "GROUP III", servingStation: "PALAKOLLU", active: true },
  { id: "GS-16", sNo: 16, code: "AKVD", name: "AKIVIDU", category: "Goods Shed", subcategory: "GROUP III", servingStation: "AKIVIDU", active: true },
  { id: "GS-17", sNo: 17, code: "TNKU", name: "TANUKU", category: "Goods Shed", subcategory: "GROUP III", servingStation: "TANUKU", active: true },
  { id: "GS-18", sNo: 18, code: "AKP", name: "ANAKAPALLI", category: "Goods Shed", subcategory: "GROUP III", servingStation: "ANAKAPALLI", active: true },
  { id: "GS-19", sNo: 19, code: "CLX", name: "CHIRALA", category: "Goods Shed", subcategory: "GROUP III", servingStation: "CHIRALA", active: true },
  { id: "GS-20", sNo: 20, code: "NZD", name: "NUZVID", category: "Goods Shed", subcategory: "GROUP III", servingStation: "NUZVID", active: true },
  { id: "GS-21", sNo: 21, code: "REG", name: "REGUPALEM", category: "Goods Shed", subcategory: "GROUP III", servingStation: "REGUPALEM", active: true },
  { id: "GS-22", sNo: 22, code: "MTM", name: "MACHILIPATNAM", category: "Goods Shed", subcategory: "GROUP III", servingStation: "MACHILIPATNAM", active: true },
  { id: "GS-23", sNo: 23, code: "BVRM", name: "BHIMAVARAM", category: "Goods Shed", subcategory: "GROUP III", servingStation: "BHIMAVARAM", active: true },
  { id: "GS-24", sNo: 24, code: "NDM", name: "NIDAMANURU", category: "Goods Shed", subcategory: "GROUP III", servingStation: "NIDAMANURU", active: true },
  { id: "GS-25", sNo: 25, code: "MBL", name: "MANUBOLU", category: "Goods Shed", subcategory: "GROUP III", servingStation: "MANUBOLU", active: true },
  { id: "GS-26", sNo: 26, code: "NGPM", name: "NIDUGUNTAPALEM", category: "Goods Shed", subcategory: "GROUP III", servingStation: "NIDUGUNTAPALEM", active: true },
  { id: "GS-27", sNo: 27, code: "KVR", name: "KOVVUR", category: "Goods Shed", subcategory: "GROUP III", servingStation: "KOVVUR", active: true },
  { id: "GS-28", sNo: 28, code: "SDM", name: "SURAREDDIPALEM", category: "Goods Shed", subcategory: "GROUP III", servingStation: "SURAREDDIPALEM", active: true },
  { id: "GS-29", sNo: 29, code: "BPP", name: "BAPATLA", category: "Goods Shed", subcategory: "GROUP III", servingStation: "BAPATLA", active: true },

  // --- SIDINGS ---
  // PORTS
  { id: "SD-01", sNo: 1, code: "AKPK", name: "ADANI KRISHNAPATNAM PORT LTD", category: "Sidings", subcategory: "PORTS", servingStation: "KRISHNAPATNAM", active: true },
  { id: "SD-02", sNo: 2, code: "KSLK", name: "KAKINADA SEA PORT LTD", category: "Sidings", subcategory: "PORTS", servingStation: "KAKINADA", active: true },

  // PFTs
  { id: "SD-03", sNo: 3, code: "AWCA", name: "ANAPARTHI WHAREHOUSING CORPORATION, ANAPARTHI", category: "Sidings", subcategory: "PFTs", servingStation: "ANAPARTHI", active: true },
  { id: "SD-04", sNo: 4, code: "VIPN", name: "VIMALA INFRASTRUCTURE PRIVATE LIMITED, NARASINGAPALLI", category: "Sidings", subcategory: "PFTs", servingStation: "NARASINGAPALLI", active: true },

  // GCTs
  { id: "SD-05", sNo: 5, code: "AAFN", name: "AKILESH AGRO FORMS LIMITED, NAVABPALEM", category: "Sidings", subcategory: "GCTs", servingStation: "NAVABPALEM", active: true },
  { id: "SD-06", sNo: 6, code: "BPGK", name: "BHARAT PETROLEUM CORPORATION LIMITED, KRISHNAPATNAM", category: "Sidings", subcategory: "GCTs", servingStation: "KRISHNAPATNAM", active: true },

  // THERMAL POWER HOUSE
  { id: "SD-07", sNo: 7, code: "TPAK", name: "THERMAL POWER STATION SIDING, KONDAPALLI", category: "Sidings", subcategory: "THERMAL POWER HOUSE", servingStation: "KONDAPALLI", active: true },

  // FERTILIZERS
  { id: "SD-08", sNo: 8, code: "PGFC", name: "COROMANDEL INTERNATIONAL SIDING", category: "Sidings", subcategory: "FERTILIZERS", servingStation: "KAKINADA", active: true },
  { id: "SD-09", sNo: 9, code: "NGFS", name: "NAGARJUNA FERTILIZERS", category: "Sidings", subcategory: "FERTILIZERS", servingStation: "KAKINADA", active: true },

  // FCI
  { id: "SD-10", sNo: 10, code: "FCBG", name: "FCI SIDING, NUZVID", category: "Sidings", subcategory: "FCI", servingStation: "NUZVID", active: true },
  { id: "SD-11", sNo: 11, code: "FCGS", name: "FCI SIDING, KRISHNA CANAL", category: "Sidings", subcategory: "FCI", servingStation: "KRISHNA CANAL", active: true },
  { id: "SD-12", sNo: 12, code: "FCGV", name: "FCI SIDING, GUDIVADA", category: "Sidings", subcategory: "FCI", servingStation: "GUDIVADA", active: true },
  { id: "SD-13", sNo: 13, code: "FCIR", name: "FCI SIDING, RAJAHMUNDRY", category: "Sidings", subcategory: "FCI", servingStation: "RAJAHMUNDRY", active: true },
  { id: "SD-14", sNo: 14, code: "FCIT", name: "FCI SIDING, VENKATACHALAM", category: "Sidings", subcategory: "FCI", servingStation: "VENKATACHALAM", active: true },
  { id: "SD-15", sNo: 15, code: "FCPA", name: "FCI SIDING PENNADA AGRAHARAM", category: "Sidings", subcategory: "FCI", servingStation: "PENNADA AGRAHARAM", active: true },
  { id: "SD-16", sNo: 16, code: "FCST", name: "FCI SIDING, SAMALKOT", category: "Sidings", subcategory: "FCI", servingStation: "SAMALKOT", active: true },

  // FOOD GRAINS
  { id: "SD-17", sNo: 17, code: "BSAU", name: "BHAVAN SAI ASSOCIATES SIDING", category: "Sidings", subcategory: "FOOD GRAINS", servingStation: "UPPALURU", active: true },

  // CEMENT
  { id: "SD-18", sNo: 18, code: "MMHR", name: "MY HOME INDUSTRIES LIMITED, REGUPALEM", category: "Sidings", subcategory: "CEMENT", servingStation: "REGUPALEM", active: true },
  { id: "SD-19", sNo: 19, code: "MNCK", name: "NAGARJUNA CEMENTS SIDING, KONDAPALLI", category: "Sidings", subcategory: "CEMENT", servingStation: "KONDAPALLI", active: true },
  { id: "SD-20", sNo: 20, code: "MRCN", name: "RAMCO CEMENTS PRIVATE LIMITED, NARASINGAPALLI", category: "Sidings", subcategory: "CEMENT", servingStation: "NARASINGAPALLI", active: true },

  // POL
  { id: "SD-21", sNo: 21, code: "IOCD", name: "IOC/BPCL LIMITED SIDING, SURAREDDIPALEM", category: "Sidings", subcategory: "POL", servingStation: "SURAREDDIPALEM", active: true },
  { id: "SD-22", sNo: 22, code: "HPCG", name: "HINDUSTHAN PETROLEUM CORPORATION LIMITED, GANGINENI", category: "Sidings", subcategory: "POL", servingStation: "GANGINENI", active: true },

  // IRON AND STEEL
  { id: "SD-23", sNo: 23, code: "TISM", name: "TATA IRON & STEEL SIDING, GANNAVARAM", category: "Sidings", subcategory: "IRON AND STEEL", servingStation: "GANNAVARAM", active: true },

  // INDUSTRIAL SALT
  { id: "SD-24", sNo: 24, code: "ASLS", name: "THE ANDHRA SUGARS LIMITED", category: "Sidings", subcategory: "INDUSTRIAL SALT", servingStation: "KOVVUR", active: true }
];

const CATEGORY_STRUCTURE = {
  "Goods Shed": ["GROUP I", "GROUP II", "GROUP III"],
  "Sidings": [
    "PORTS",
    "PFTs",
    "GCTs",
    "THERMAL POWER HOUSE",
    "FERTILIZERS",
    "FCI",
    "FOOD GRAINS",
    "CEMENT",
    "POL",
    "IRON AND STEEL",
    "INDUSTRIAL SALT"
  ]
};

// 12 Standard Columns matching the Google Sheet
const DETENTION_COLUMNS = [
  { key: "sNo", label: "S.NO", width: "45px" },
  { key: "station", label: "STATION / SIDING", width: "150px" },
  { key: "arrlTime", label: "TRAIN ARRL TIME", width: "120px" },
  { key: "placementTime", label: "TRAIN PLACEMENT TIME", width: "140px" },
  { key: "releaseTime", label: "TRAIN RELEASE TIME", width: "140px" },
  { key: "outLocoNo", label: "OUT GOING LOCO NO", width: "130px" },
  { key: "locoArrlTime", label: "LOCO ARRL TIME", width: "120px" },
  { key: "crewArrlTime", label: "CREW ARRL TIME", width: "130px" },
  { key: "tmrArrlTime", label: "TMR ARRL TIME", width: "120px" },
  { key: "readyTime", label: "TRAIN READY TIME", width: "130px" },
  { key: "deptTime", label: "TRAIN DEPARTURE TIME", width: "140px" },
  { key: "remarks", label: "REMARKS", width: "260px" }
];

// Clean Empty Tables - Ready for Fresh Data Entry
const INITIAL_LOADING_DETENTION = [];
const INITIAL_UNLOADING_DETENTION = [];
