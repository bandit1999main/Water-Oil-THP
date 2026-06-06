// Helper for dynamic lazy loading of XLSX library (xlsx-js-style) to optimize bundle size
let xlsxCache = null;
async function getXLSX() {
  if (!xlsxCache) {
    xlsxCache = await import('xlsx-js-style');
  }
  return xlsxCache;
}
import { 
  isCloudConnected,
  fetchEmployees,
  saveEmployees,
  fetchWaterEmployees,
  saveWaterEmployees,
  listenToEmployees,
  listenToWaterEmployees,
  fetchRouteData,
  saveRouteData,
  resetCloudRouteData,
  fetchSavedTemplates,
  saveTemplate,
  deleteTemplate,
  fetchSignatoryProfiles,
  saveSignatoryProfile,
  deleteSignatoryProfile,
  fetchGlobalSettings,
  saveGlobalSetting,
  listenToGlobalSettings,
  fetchPersonnelList,
  savePersonnelList,
  listenToPersonnel,
  listenToAuthState,
  loginWithGoogle,
  getGoogleRedirectResult,
  checkUserExists,
  logoutUser,
  checkIsAdmin,
  fetchUsersList,
  saveUserRole,
  deleteUserMetadata,
  registerUserMetadata,
  listenToUsers,
  listenToUserProfile
} from './database.js';

// Helper Debounce Function for Performance Optimization
function debounce(func, delay = 150) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// Global Mode State
let activeMode = 'fuel'; 
let cloudSyncStarted = false;
let waterEmployees = JSON.parse(localStorage.getItem('tp_water_employees')) || [];
let personnel = JSON.parse(localStorage.getItem('tp_personnel')) || [];
let employees = JSON.parse(localStorage.getItem('tp_employees')) || [];
let employeeSearchQuery = '';
let personnelSearchQuery = '';

const OFFICIAL_ROUTE_DATA = {
  "1": { hasCar: false, staffDist: 1300.00, staffLiters: 52.00, workerDist: 50.0, workerLiters: 2.00 },
  "2": { hasCar: false, staffDist: 1497.60, staffLiters: 60.00, workerDist: 57.6, workerLiters: 2.30 },
  "3": { hasCar: false, staffDist: 1560.00, staffLiters: 63.00, workerDist: 60.0, workerLiters: 2.40 },
  "4": { hasCar: false, staffDist: 1560.00, staffLiters: 63.00, workerDist: 60.0, workerLiters: 2.40 },
  "5": { hasCar: false, staffDist: 1352.00, staffLiters: 55.00, workerDist: 52.0, workerLiters: 2.08 },
  "6": { hasCar: false, staffDist: 1560.00, staffLiters: 63.00, workerDist: 60.0, workerLiters: 2.40 },
  "7": { hasCar: false, staffDist: 1497.60, staffLiters: 60.00, workerDist: 57.6, workerLiters: 2.30 },
  "8": { hasCar: true, staffDist: 2184.00, staffLiters: 219.00, workerDist: 84.0, workerLiters: 8.40 },
  "9": { hasCar: true, staffDist: 1937.00, staffLiters: 194.00, workerDist: 74.5, workerLiters: 7.45 },
  "10": { hasCar: false, staffDist: 1341.60, staffLiters: 54.00, workerDist: 51.6, workerLiters: 2.06 },
  "11": { hasCar: false, staffDist: 1612.00, staffLiters: 65.00, workerDist: 62.0, workerLiters: 2.48 },
  "12": { hasCar: false, staffDist: 1274.00, staffLiters: 51.00, workerDist: 49.0, workerLiters: 1.96 },
  "13": { hasCar: false, staffDist: 1518.40, staffLiters: 61.00, workerDist: 58.4, workerLiters: 2.34 },
  "14": { hasCar: false, staffDist: 1560.00, staffLiters: 63.00, workerDist: 60.0, workerLiters: 2.40 },
  "15": { hasCar: false, staffDist: 1622.40, staffLiters: 65.00, workerDist: 62.4, workerLiters: 2.50 },
  "16": { hasCar: false, staffDist: 1716.00, staffLiters: 69.00, workerDist: 66.0, workerLiters: 2.64 },
  "17": { hasCar: false, staffDist: 1716.00, staffLiters: 69.00, workerDist: 66.0, workerLiters: 2.64 },
  "18": { hasCar: false, staffDist: 1653.60, staffLiters: 67.00, workerDist: 63.6, workerLiters: 2.54 },
  "19": { hasCar: false, staffDist: 1404.00, staffLiters: 57.00, workerDist: 54.0, workerLiters: 2.16 },
  "20": { hasCar: false, staffDist: 1768.00, staffLiters: 71.00, workerDist: 68.0, workerLiters: 2.72 },
  "21": { hasCar: false, staffDist: 1768.00, staffLiters: 71.00, workerDist: 68.0, workerLiters: 2.72 },
  "22": { hasCar: true, staffDist: 2028.00, staffLiters: 203.00, workerDist: 78.0, workerLiters: 7.80 },
  "23": { hasCar: false, staffDist: 1664.00, staffLiters: 67.00, workerDist: 64.0, workerLiters: 2.56 },
  "24": { hasCar: false, staffDist: 1586.00, staffLiters: 64.00, workerDist: 61.0, workerLiters: 2.44 },
  "25": { hasCar: false, staffDist: 1627.60, staffLiters: 66.00, workerDist: 62.6, workerLiters: 2.50 },
  "26": { hasCar: false, staffDist: 1560.00, staffLiters: 63.00, workerDist: 60.0, workerLiters: 2.40 },
  "27": { hasCar: false, staffDist: 1445.60, staffLiters: 58.00, workerDist: 55.6, workerLiters: 2.22 },
  "28": { hasCar: false, staffDist: 1336.40, staffLiters: 54.00, workerDist: 51.4, workerLiters: 2.06 },
  "29": { hasCar: false, staffDist: 1352.00, staffLiters: 55.00, workerDist: 52.0, workerLiters: 2.08 },
  "30": { hasCar: false, staffDist: 1580.80, staffLiters: 64.00, workerDist: 60.8, workerLiters: 2.43 },
  "31": { hasCar: false, staffDist: 1612.00, staffLiters: 65.00, workerDist: 62.0, workerLiters: 2.48 },
  "32": { hasCar: false, staffDist: 1768.00, staffLiters: 71.00, workerDist: 68.0, workerLiters: 2.72 },
  "33": { hasCar: false, staffDist: 1846.00, staffLiters: 74.00, workerDist: 71.0, workerLiters: 2.84 },
  "34": { hasCar: false, staffDist: 1690.00, staffLiters: 68.00, workerDist: 65.0, workerLiters: 2.60 },
  "35": { hasCar: false, staffDist: 1716.00, staffLiters: 69.00, workerDist: 66.0, workerLiters: 2.64 },
  "36": { hasCar: false, staffDist: 1248.00, staffLiters: 50.00, workerDist: 48.0, workerLiters: 1.92 },
  "37": { hasCar: false, staffDist: 1612.00, staffLiters: 65.00, workerDist: 62.0, workerLiters: 2.48 },
  "38": { hasCar: true, staffDist: 2054.00, staffLiters: 206.00, workerDist: 79.0, workerLiters: 7.90 },
  "39": { hasCar: true, staffDist: 2012.40, staffLiters: 202.00, workerDist: 77.4, workerLiters: 7.74 },
  "40": { hasCar: true, staffDist: 1981.20, staffLiters: 199.00, workerDist: 76.2, workerLiters: 7.62 }
};

function initRouteData() {
  return JSON.parse(JSON.stringify(OFFICIAL_ROUTE_DATA));
}

let ROUTE_DATA = JSON.parse(localStorage.getItem('tp_route_data')) || initRouteData();
let appUsersList = [];
let tempParsedRecords = [];

// DOM Elements
const globalFuelPriceInput = document.getElementById('globalFuelPrice');
const globalMonthSelect = document.getElementById('globalMonth');
const globalYearSelect = document.getElementById('globalYear');
const globalPostOfficeNameInput = document.getElementById('globalPostOfficeName');
const deliveryRouteSelect = document.getElementById('deliveryRoute');
const empPositionSelect = document.getElementById('empPosition');
const empDutySelect = document.getElementById('empDuty');
const vehicleTypeSelect = document.getElementById('vehicleType');
const claimMethodSelect = document.getElementById('claimMethod');
const claimMethodGroup = document.getElementById('claimMethodGroup');
const workDaysInput = document.getElementById('workDays');
const workDaysRow = document.getElementById('workDaysRow');
const daysNotWorkedInput = document.getElementById('daysNotWorked');
const daysNotWorkedGroup = document.getElementById('daysNotWorkedGroup');
const employeeForm = document.getElementById('employeeForm');
const employeeTableBody = document.getElementById('employeeTableBody');
const routeStatsPreview = document.getElementById('routeStatsPreview');
const formModeInput = document.getElementById('formMode');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');

const tabStandard = document.getElementById('tabStandard');
const tabSupervisor = document.getElementById('tabSupervisor');
const globalConfigsCard = document.getElementById('globalConfigsCard');

const supervisorMissionSection = document.getElementById('supervisorMissionSection');
const missionRouteSelect = document.getElementById('missionRoute');
const addMissionBtn = document.getElementById('addMissionBtn');

const sumFuelCostSpan = document.getElementById('sumFuelCost');
const sumMaintenanceCostSpan = document.getElementById('sumMaintenanceCost');
const sumTotalCostSpan = document.getElementById('sumTotalCost');

const modeFuelBtn = document.getElementById('modeFuelBtn');
const modeWaterBtn = document.getElementById('modeWaterBtn');
const modePersonnelBtn = document.getElementById('modePersonnelBtn');
const modeAdminBtn = document.getElementById('modeAdminBtn');
const salaryGroup = document.getElementById('salaryGroup');
const empSalaryInput = document.getElementById('empSalary');
const empNameSelect = document.getElementById('empNameSelect');

const personnelCard = document.getElementById('personnelCard');
const personnelTableCard = document.getElementById('personnelTableCard');
const resetPersonnelBtn = document.getElementById('resetPersonnelBtn');
const personDepartmentSelect = document.getElementById('personDepartment');
const personDepartmentCustomGroup = document.getElementById('personDepartmentCustomGroup');
const personDepartmentCustomInput = document.getElementById('personDepartmentCustom');

const exportCsvBtn = document.getElementById('exportCsvBtn');
const printReportBtn = document.getElementById('printReportBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const sunIcon = document.getElementById('sunIcon');
const moonIcon = document.getElementById('moonIcon');

const importExcelAttendanceBtn = document.getElementById('importExcelAttendanceBtn');
const attendanceImportModal = document.getElementById('attendanceImportModal');
const closeImportModalBtn = document.getElementById('closeImportModalBtn');
const cancelImportBtn = document.getElementById('cancelImportBtn');
const submitImportBtn = document.getElementById('submitImportBtn');
const importPastedText = document.getElementById('importPastedText');
const importPreviewTableBody = document.getElementById('importPreviewTableBody');
const downloadAttendanceTemplateBtn = document.getElementById('downloadAttendanceTemplateBtn');
const tabImportFile = document.getElementById('tabImportFile');
const tabImportText = document.getElementById('tabImportText');
const importFileContent = document.getElementById('importFileContent');
const importTextContent = document.getElementById('importTextContent');
const dragDropZone = document.getElementById('dragDropZone');
const attendanceFileSelector = document.getElementById('attendanceFileSelector');
const selectedFileInfo = document.getElementById('selectedFileInfo');
const fileNameLabel = document.getElementById('fileNameLabel');
const clearSelectedFileBtn = document.getElementById('clearSelectedFileBtn');

const templateNameInput = document.getElementById('templateNameInput');
const saveTemplateBtn = document.getElementById('saveTemplateBtn');
const templateSelect = document.getElementById('templateSelect');
const loadTemplateBtn = document.getElementById('loadTemplateBtn');
const deleteTemplateBtn = document.getElementById('deleteTemplateBtn');

const routeEditorModal = document.getElementById('routeEditorModal');
const openRouteEditorBtn = document.getElementById('openRouteEditorBtn');
const closeRouteEditorModalBtn = document.getElementById('closeRouteEditorModalBtn');
const closeRouteEditorBtn = document.getElementById('closeRouteEditorBtn');
const editRouteSelect = document.getElementById('editRouteSelect');
const routeDistDayInput = document.getElementById('routeDistDay');
const routeFuelDayInput = document.getElementById('routeFuelDay');
const routeDistMonthInput = document.getElementById('routeDistMonth');
const routeFuelMonthInput = document.getElementById('routeFuelMonth');
const routeHasCarSelect = document.getElementById('routeHasCar');
const saveSingleRouteBtn = document.getElementById('saveSingleRouteBtn');
const resetAllRoutesBtn = document.getElementById('resetAllRoutesBtn');
const routeEditorTableBody = document.getElementById('routeEditorTableBody');
const toggleSigEditBtn = document.getElementById('toggleSigEditBtn');

const calculationFormCard = document.getElementById('calculationFormCard');
const mainTableCard = document.getElementById('mainTableCard');
const globalPostOfficeName = document.getElementById('globalPostOfficeName');

// Setup Reactive Bindings on window for decoupled modules
Object.defineProperty(window, 'personnel', {
  get: () => personnel,
  set: (val) => { personnel = val; }
});
Object.defineProperty(window, 'employees', {
  get: () => employees,
  set: (val) => { employees = val; }
});
Object.defineProperty(window, 'waterEmployees', {
  get: () => waterEmployees,
  set: (val) => { waterEmployees = val; }
});
Object.defineProperty(window, 'ROUTE_DATA', {
  get: () => ROUTE_DATA,
  set: (val) => { ROUTE_DATA = val; }
});
Object.defineProperty(window, 'activeMode', {
  get: () => activeMode,
  set: (val) => { activeMode = val; }
});
Object.defineProperty(window, 'employeeSearchQuery', {
  get: () => employeeSearchQuery,
  set: (val) => { employeeSearchQuery = val; }
});
Object.defineProperty(window, 'personnelSearchQuery', {
  get: () => personnelSearchQuery,
  set: (val) => { personnelSearchQuery = val; }
});
window.getXLSX = getXLSX;
window.updateEmployeeSelectDropdown = updateEmployeeSelectDropdown;

/* --- UI UTILITIES: TOAST & CONFIRM --- */
function showToast(message, type = 'info', duration = 3000) {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span style="font-size:1.1rem;flex-shrink:0;">${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  const dismiss = () => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  };
  toast.addEventListener('click', dismiss);
  container.appendChild(toast);
  setTimeout(dismiss, duration);
}

function showConfirm({ title = 'ยืนยัน', message = '', icon = '⚠️', okText = 'ยืนยัน', okClass = 'btn-danger', onConfirm }) {
  const modal = document.getElementById('confirmModal');
  const titleEl = document.getElementById('confirmModalTitle');
  const msgEl = document.getElementById('confirmModalMsg');
  const iconEl = document.getElementById('confirmModalIcon');
  const okBtn = document.getElementById('confirmModalOk');
  const cancelBtn = document.getElementById('confirmModalCancel');

  titleEl.textContent = title;
  msgEl.textContent = message;
  iconEl.textContent = icon;
  okBtn.textContent = okText;
  okBtn.className = `btn ${okClass}`;
  modal.classList.add('active');

  const cleanup = () => modal.classList.remove('active');
  const okHandler = () => { cleanup(); onConfirm && onConfirm(); };
  const cancelHandler = () => cleanup();

  okBtn.replaceWith(okBtn.cloneNode(true));
  cancelBtn.replaceWith(cancelBtn.cloneNode(true));
  document.getElementById('confirmModalOk').addEventListener('click', okHandler, { once: true });
  document.getElementById('confirmModalCancel').addEventListener('click', cancelHandler, { once: true });
  modal.addEventListener('click', (e) => { if (e.target === modal) cleanup(); }, { once: true });
}

window.showToast = showToast;
window.showConfirm = showConfirm;

/* --- INITIALIZATION --- */
document.addEventListener('DOMContentLoaded', async () => {
  // Populate Route Dropdowns
  Object.keys(ROUTE_DATA).forEach(route => {
    const opt1 = document.createElement('option');
    opt1.value = route;
    opt1.textContent = `ด้านจ่ายที่ ${route}${ROUTE_DATA[route].hasCar ? ' (รถยนต์)' : ''}`;
    deliveryRouteSelect.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = route;
    opt2.textContent = `ด้านจ่ายที่ ${route}${ROUTE_DATA[route].hasCar ? ' (รถยนต์)' : ''}`;
    missionRouteSelect.appendChild(opt2);

    const opt3 = document.createElement('option');
    opt3.value = route;
    opt3.textContent = `ด้านจ่ายที่ ${route}${ROUTE_DATA[route].hasCar ? ' (รถยนต์)' : ''}`;
    const pRoute = document.getElementById('personRoute');
    if (pRoute) pRoute.appendChild(opt3);

    const opt4 = document.createElement('option');
    opt4.value = route;
    opt4.textContent = `ด้านจ่ายที่ ${route}${ROUTE_DATA[route].hasCar ? ' (รถยนต์)' : ''}`;
    const mpRoute = document.getElementById('modalPersonRoute');
    if (mpRoute) mpRoute.appendChild(opt4);
  });

  // Load Saved Theme
  if (localStorage.getItem('tp_theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    sunIcon.classList.add('hidden');
    moonIcon.classList.remove('hidden');
  }

  // Bind Core Navigation & Switch Events
  themeToggleBtn.addEventListener('click', toggleTheme);
  modeFuelBtn.addEventListener('click', () => switchAppMode('fuel'));
  modeWaterBtn.addEventListener('click', () => switchAppMode('water'));
  modePersonnelBtn.addEventListener('click', () => switchAppMode('personnel'));
  if (document.getElementById('modeAdminBtn')) {
    document.getElementById('modeAdminBtn').addEventListener('click', () => switchAppMode('admin'));
  }

  // Delegate Calculator Events
  deliveryRouteSelect.addEventListener('change', () => {
    if (activeMode === 'fuel') {
      import('./fuelCalculator.js').then(m => m.handleRouteSelect());
    }
  });
  empPositionSelect.addEventListener('change', () => {
    if (activeMode === 'fuel') {
      import('./fuelCalculator.js').then(m => m.handlePositionSelect());
    }
  });
  const isSub = document.getElementById('isSubstitute');
  if (isSub) {
    isSub.addEventListener('change', () => {
      if (activeMode === 'fuel') {
        import('./fuelCalculator.js').then(m => m.handlePositionSelect());
      }
    });
  }
  claimMethodSelect.addEventListener('change', () => {
    if (activeMode === 'fuel') {
      import('./fuelCalculator.js').then(m => m.handleClaimMethodSelect());
    }
  });
  
  employeeForm.addEventListener('submit', (e) => {
    if (activeMode === 'fuel') {
      import('./fuelCalculator.js').then(m => m.handleFuelFormSubmit(e));
    } else if (activeMode === 'water') {
      import('./waterCalculator.js').then(m => m.handleWaterFormSubmit(e));
    }
  });

  resetBtn.addEventListener('click', cancelEdit);
  
  // Real-time searches with Debounce
  const employeeSearchInput = document.getElementById('employeeSearch');
  if (employeeSearchInput) {
    employeeSearchInput.addEventListener('input', debounce((e) => {
      employeeSearchQuery = e.target.value.toLowerCase().trim();
      renderEmployeeTable();
    }, 150));
  }

  const personnelSearchInput = document.getElementById('personnelSearch');
  if (personnelSearchInput) {
    personnelSearchInput.addEventListener('input', debounce((e) => {
      personnelSearchQuery = e.target.value.toLowerCase().trim();
      if (window.renderPersonnelTable) window.renderPersonnelTable();
    }, 150));
  }

  empNameSelect.addEventListener('change', handleEmpNameSelectChange);
  empNameSelect.addEventListener('input', handleEmpNameSelectChange);

  // Tab Events
  tabStandard.addEventListener('click', () => switchFormMode('standard'));
  tabSupervisor.addEventListener('click', () => switchFormMode('supervisor'));

  // Supervisor Mission Events
  addMissionBtn.addEventListener('click', () => {
    import('./fuelCalculator.js').then(m => m.addSupervisorMission());
  });

  // Export, Print and Clear delegated handlers
  exportCsvBtn.addEventListener('click', () => {
    if (activeMode === 'fuel') {
      import('./fuelCalculator.js').then(m => m.exportFuelCsv());
    } else if (activeMode === 'water') {
      import('./waterCalculator.js').then(m => m.exportWaterCsv());
    }
  });
  printReportBtn.addEventListener('click', () => {
    if (activeMode === 'fuel') {
      import('./fuelCalculator.js').then(m => m.printFuelReport());
    } else if (activeMode === 'water') {
      import('./waterCalculator.js').then(m => m.printWaterReport());
    }
  });
  clearAllBtn.addEventListener('click', () => {
    if (activeMode === 'fuel') {
      import('./fuelCalculator.js').then(m => m.clearFuelData());
    } else if (activeMode === 'water') {
      import('./waterCalculator.js').then(m => m.clearWaterData());
    }
  });

  // Templates Manager Events
  saveTemplateBtn.addEventListener('click', saveCurrentListAsTemplate);
  loadTemplateBtn.addEventListener('click', loadSelectedTemplate);
  deleteTemplateBtn.addEventListener('click', deleteSelectedTemplate);

  // Route Editor Events
  openRouteEditorBtn.addEventListener('click', openRouteEditor);
  if (closeRouteEditorModalBtn) closeRouteEditorModalBtn.addEventListener('click', () => routeEditorModal.classList.remove('active'));
  if (closeRouteEditorBtn) closeRouteEditorBtn.addEventListener('click', () => routeEditorModal.classList.remove('active'));
  editRouteSelect.addEventListener('change', loadSelectedRouteToEditorForm);
  saveSingleRouteBtn.addEventListener('click', saveSingleRouteSettings);
  resetAllRoutesBtn.addEventListener('click', resetRouteDataDefaults);

  // Signatories & Signatory Profiles Events
  toggleSigEditBtn.addEventListener('click', toggleSignatoryInputsLock);
  const manageSigProfilesBtn = document.getElementById('manageSigProfilesBtn');
  if (manageSigProfilesBtn) manageSigProfilesBtn.addEventListener('click', openSigProfiles);
  const saveSigProfileBtn = document.getElementById('saveSigProfileBtn');
  if (saveSigProfileBtn) saveSigProfileBtn.addEventListener('click', handleSaveSigProfile);
  const closeSigProfilesModalBtn = document.getElementById('closeSigProfilesModalBtn');
  const closeSigProfilesBtn = document.getElementById('closeSigProfilesBtn');
  const sigProfilesModal = document.getElementById('sigProfilesModal');
  if (closeSigProfilesModalBtn) closeSigProfilesModalBtn.addEventListener('click', () => sigProfilesModal.classList.remove('active'));
  if (closeSigProfilesBtn) closeSigProfilesBtn.addEventListener('click', () => sigProfilesModal.classList.remove('active'));

  // Attendance Import Events
  importExcelAttendanceBtn.addEventListener('click', openAttendanceImportModal);
  closeImportModalBtn.addEventListener('click', () => attendanceImportModal.classList.remove('active'));
  cancelImportBtn.addEventListener('click', () => attendanceImportModal.classList.remove('active'));
  importPastedText.addEventListener('input', handleAttendancePaste);
  importPastedText.addEventListener('paste', handleAttendancePaste);
  submitImportBtn.addEventListener('click', handleConfirmImport);
  downloadAttendanceTemplateBtn.addEventListener('click', downloadAttendanceTemplateXlsx);
  document.querySelectorAll('input[name="importTargetMode"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (attendanceFileSelector.files.length > 0) {
        processUploadedFile(attendanceFileSelector.files[0]);
      } else {
        handleAttendancePaste();
      }
    });
  });
  tabImportFile.addEventListener('click', () => switchImportTab('file'));
  tabImportText.addEventListener('click', () => switchImportTab('text'));
  dragDropZone.addEventListener('click', () => attendanceFileSelector.click());
  attendanceFileSelector.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      processUploadedFile(e.target.files[0]);
    }
  });
  dragDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dragDropZone.style.borderColor = 'var(--post-orange)';
    dragDropZone.style.background = 'rgba(245, 158, 11, 0.05)';
  });
  dragDropZone.addEventListener('dragleave', () => {
    dragDropZone.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    dragDropZone.style.background = 'rgba(16, 185, 129, 0.02)';
  });
  dragDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDropZone.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    dragDropZone.style.background = 'rgba(16, 185, 129, 0.02)';
    if (e.dataTransfer.files.length > 0) {
      attendanceFileSelector.files = e.dataTransfer.files;
      processUploadedFile(e.dataTransfer.files[0]);
    }
  });
  if (clearSelectedFileBtn) clearSelectedFileBtn.addEventListener('click', clearSelectedImportFile);

  // Firebase Auth Flow
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const authLoadingScreen = document.getElementById('authLoadingState');
  const loginScreen = document.getElementById('authLoginState');
  const signupScreen = document.getElementById('authSignupState');
  const pendingScreen = document.getElementById('authPendingState');
  const appContainer = document.getElementById('appContainer');

  function showLoadingState() {
    authLoadingScreen.classList.remove('hidden');
    loginScreen.classList.add('hidden');
    signupScreen.classList.add('hidden');
    pendingScreen.classList.add('hidden');
    appContainer.classList.add('hidden');
  }

  function showLoginState() {
    authLoadingScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    signupScreen.classList.add('hidden');
    pendingScreen.classList.add('hidden');
    appContainer.classList.add('hidden');
  }

  function showSignupState() {
    authLoadingScreen.classList.add('hidden');
    loginScreen.classList.add('hidden');
    signupScreen.classList.remove('hidden');
    pendingScreen.classList.add('hidden');
    appContainer.classList.add('hidden');
  }

  function showPendingState(user) {
    authLoadingScreen.classList.add('hidden');
    loginScreen.classList.add('hidden');
    signupScreen.classList.add('hidden');
    pendingScreen.classList.remove('hidden');
    appContainer.classList.add('hidden');

    const pendingUserEmail = document.getElementById('pendingUserEmail');
    if (pendingUserEmail) pendingUserEmail.textContent = user.email;
  }

  function showApprovedState(user, profileData) {
    authLoadingScreen.classList.add('hidden');
    loginScreen.classList.add('hidden');
    signupScreen.classList.add('hidden');
    pendingScreen.classList.add('hidden');
    appContainer.classList.remove('hidden');

    const headerUserPhoto = document.getElementById('headerUserPhoto');
    const headerUserName = document.getElementById('headerUserName');
    const headerUserRole = document.getElementById('headerUserRole');

    if (headerUserPhoto) headerUserPhoto.src = user.photoURL || 'https://www.gravatar.com/avatar/?d=mp';
    if (headerUserName) headerUserName.textContent = user.displayName || 'พนักงานไปรษณีย์';
    
    const isMainAdmin = user.email === 'bandit1999main@gmail.com';
    const roleText = isMainAdmin ? 'Main Admin' : (profileData.role === 'admin' ? 'Admin' : 'User (Read-Only)');
    if (headerUserRole) headerUserRole.textContent = roleText;

    const isAdmin = profileData.role === 'admin' || isMainAdmin;
    const modeAdminBtn = document.getElementById('modeAdminBtn');
    if (modeAdminBtn) {
      if (isAdmin) {
        modeAdminBtn.classList.remove('hidden');
      } else {
        modeAdminBtn.classList.add('hidden');
        if (activeMode === 'admin') switchAppMode('fuel');
      }
    }

    const claimDuties = profileData.duties || [];
    const hasFuelDuty = claimDuties.includes('fuel') || isMainAdmin;
    const hasWaterDuty = claimDuties.includes('water') || isMainAdmin;

    const modeFuelBtn = document.getElementById('modeFuelBtn');
    const modeWaterBtn = document.getElementById('modeWaterBtn');

    if (modeFuelBtn) {
      if (hasFuelDuty) {
        modeFuelBtn.classList.remove('hidden');
      } else {
        modeFuelBtn.classList.add('hidden');
        if (activeMode === 'fuel') switchAppMode(hasWaterDuty ? 'water' : 'personnel');
      }
    }

    if (modeWaterBtn) {
      if (hasWaterDuty) {
        modeWaterBtn.classList.remove('hidden');
      } else {
        modeWaterBtn.classList.add('hidden');
        if (activeMode === 'water') switchAppMode(hasFuelDuty ? 'fuel' : 'personnel');
      }
    }

    const isWriteAuthorized = profileData.role === 'admin' || isMainAdmin;
    enableWriteActions(isWriteAuthorized);

    if (!cloudSyncStarted) {
      cloudSyncStarted = true;
      initCloudSync();
    }
  }

  function enableWriteActions(enable) {
    const inputs = employeeForm.querySelectorAll('input, select, textarea, button');
    inputs.forEach(el => {
      if (el.id !== 'globalFuelPrice' && el.id !== 'globalMonth' && el.id !== 'globalYear' && el.id !== 'globalPostOfficeName') {
        el.disabled = !enable;
      }
    });

    const personnelFormInputs = document.querySelectorAll('#personnelCard input, #personnelCard select, #personnelCard button');
    personnelFormInputs.forEach(el => el.disabled = !enable);

    const configInputs = document.querySelectorAll('#globalConfigsCard input, #globalConfigsCard select, #globalConfigsCard button');
    configInputs.forEach(el => el.disabled = !enable);

    const importBtns = [
      importExcelAttendanceBtn,
      document.getElementById('importPersonnelBtn'),
      saveTemplateBtn,
      deleteTemplateBtn,
      document.getElementById('openRouteEditorBtn'),
      document.getElementById('manageSigProfilesBtn'),
      toggleSigEditBtn,
      document.getElementById('saveSigProfileBtn')
    ];
    importBtns.forEach(btn => {
      if (btn) btn.disabled = !enable;
    });

    const actionCols = document.querySelectorAll('.actions-col');
    actionCols.forEach(col => {
      if (enable) col.classList.remove('hidden-action');
      else col.classList.add('hidden-action');
    });
  }

  // Handle Google Login / Redirect callbacks
  showLoadingState();
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
      showLoadingState();
      try {
        await loginWithGoogle();
      } catch (err) {
        console.error(err);
        showToast('ไม่สามารถเชื่อมต่อการล็อกอินได้ กรุณาลองใหม่อีกครั้ง', 'error');
        showLoginState();
      }
    });
  }

  const switchSignupBtn = document.getElementById('switchSignupBtn');
  if (switchSignupBtn) {
    switchSignupBtn.addEventListener('click', showSignupState);
  }

  const switchLoginBtn = document.getElementById('switchLoginBtn');
  if (switchLoginBtn) {
    switchLoginBtn.addEventListener('click', showLoginState);
  }

  const signupSubmitBtn = document.getElementById('signupSubmitBtn');
  if (signupSubmitBtn) {
    signupSubmitBtn.addEventListener('click', async () => {
      showLoadingState();
      try {
        await loginWithGoogle();
      } catch (err) {
        console.error(err);
        showToast('ไม่สามารถสมัครใช้งานด้วยบัญชี Google นี้ได้', 'error');
        showSignupState();
      }
    });
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      showLoadingState();
      try {
        await logoutUser();
        window.location.reload();
      } catch (err) {
        console.error(err);
        showToast('เกิดข้อผิดพลาดในการออกจากระบบ', 'error');
      }
    });
  }

  listenToAuthState(async (user) => {
    if (!user) {
      showLoginState();
      return;
    }

    const metadata = await checkUserExists(user.uid);
    if (!metadata) {
      const isGoogleLogin = user.providerData && user.providerData.some(p => p.providerId === 'google.com');
      if (isGoogleLogin) {
        await registerUserMetadata(user);
        showPendingState(user);
      } else {
        showToast('บัญชีนี้ยังไม่ได้รับการอนุมัติใช้งาน', 'warning');
        showLoginState();
      }
      return;
    }

    if (metadata.approved !== true && user.email !== 'bandit1999main@gmail.com') {
      showPendingState(user);
      return;
    }

    listenToUserProfile(user.uid, (profileData) => {
      if (!profileData) return;
      if (profileData.approved !== true && user.email !== 'bandit1999main@gmail.com') {
        showPendingState(user);
      } else {
        showApprovedState(user, profileData);
      }
    });
  });

  // Handle redirects on page load
  try {
    const redirectResult = await getGoogleRedirectResult();
    if (redirectResult && redirectResult.user) {
      const user = redirectResult.user;
      const metadata = await checkUserExists(user.uid);
      if (!metadata) {
        await registerUserMetadata(user);
        showPendingState(user);
      }
    }
  } catch (err) {
    console.error("Redirect login handling failed:", err);
  }

  wireEditModal();
});

async function initCloudSync() {
  const badge = document.getElementById('dbStatusBadge');
  if (!badge) return;

  try {
    if (isCloudConnected()) {
      badge.className = 'db-status-badge online';
      badge.querySelector('.status-text').textContent = '⚡ เชื่อมต่อคลาวด์';

      // Load initial config setting details
      const globalSettings = await fetchGlobalSettings();
      if (globalSettings.fuelPrice) {
        globalFuelPriceInput.value = globalSettings.fuelPrice.value;
      }
      if (globalSettings.fuelMonth) {
        globalMonthSelect.value = globalSettings.fuelMonth.value;
      }
      if (globalSettings.fuelYear) {
        globalYearSelect.value = globalSettings.fuelYear.value;
      }
      if (globalSettings.postOfficeName) {
        globalPostOfficeNameInput.value = globalSettings.postOfficeName.value;
      }
      if (globalSettings.signatories) {
        const sigs = globalSettings.signatories;
        document.getElementById('sigMakerTitle').value = sigs.makerTitle || '';
        document.getElementById('sigMakerName').value = sigs.makerName || '';
        document.getElementById('sigMakerPos').value = sigs.makerPos || '';
        document.getElementById('sigCheckerTitle').value = sigs.checkerTitle || '';
        document.getElementById('sigCheckerName').value = sigs.checkerName || '';
        document.getElementById('sigCheckerPos').value = sigs.checkerPos || '';
        document.getElementById('sigApproverTitle').value = sigs.approverTitle || '';
        document.getElementById('sigApproverName').value = sigs.approverName || '';
        document.getElementById('sigApproverPos').value = sigs.approverPos || '';
      }

      await fetchSavedTemplates();
      updateAllRouteDropdownTexts();
      renderEmployeeTable();
      updateTemplateSelectDropdown();

      // ===== REAL-TIME LISTENERS (cross-device sync) =====
      listenToEmployees((updatedList) => {
        employees = updatedList;
        if (activeMode === 'fuel') renderEmployeeTable();
      });

      listenToWaterEmployees((updatedList) => {
        waterEmployees = updatedList;
        if (activeMode === 'water') renderEmployeeTable();
      });

      listenToPersonnel((updatedList) => {
        personnel = updatedList;
        if (activeMode === 'personnel') {
          if (window.renderPersonnelTable) window.renderPersonnelTable();
        } else {
          updateEmployeeSelectDropdown();
        }
      });

      listenToUsers((updatedUsers) => {
        appUsersList = updatedUsers;
        if (activeMode === 'admin') {
          import('./adminPanel.js').then(({ renderAdminUsersTable }) => {
            renderAdminUsersTable(updatedUsers);
          });
        }
      });

      listenToGlobalSettings((updatedSettings) => {
        if (activeMode === 'fuel') {
          if (updatedSettings.fuelPrice && globalFuelPriceInput.value !== String(updatedSettings.fuelPrice.value)) {
            globalFuelPriceInput.value = updatedSettings.fuelPrice.value;
            import('./fuelCalculator.js').then(m => m.renderFuelTable());
          }
          if (updatedSettings.fuelMonth && globalMonthSelect.value !== String(updatedSettings.fuelMonth.value)) {
            globalMonthSelect.value = updatedSettings.fuelMonth.value;
          }
          if (updatedSettings.fuelYear && globalYearSelect.value !== String(updatedSettings.fuelYear.value)) {
            globalYearSelect.value = updatedSettings.fuelYear.value;
          }
        } else if (activeMode === 'water') {
          if (updatedSettings.waterMonth && globalMonthSelect.value !== String(updatedSettings.waterMonth.value)) {
            globalMonthSelect.value = updatedSettings.waterMonth.value;
          }
          if (updatedSettings.waterYear && globalYearSelect.value !== String(updatedSettings.waterYear.value)) {
            globalYearSelect.value = updatedSettings.waterYear.value;
          }
        }
        if (updatedSettings.postOfficeName && globalPostOfficeNameInput.value !== String(updatedSettings.postOfficeName.value)) {
          globalPostOfficeNameInput.value = updatedSettings.postOfficeName.value;
        }
        if (updatedSettings.signatories) {
          const sigs = updatedSettings.signatories;
          document.getElementById('sigMakerTitle').value = sigs.makerTitle || '';
          document.getElementById('sigMakerName').value = sigs.makerName || '';
          document.getElementById('sigMakerPos').value = sigs.makerPos || '';
          document.getElementById('sigCheckerTitle').value = sigs.checkerTitle || '';
          document.getElementById('sigCheckerName').value = sigs.checkerName || '';
          document.getElementById('sigCheckerPos').value = sigs.checkerPos || '';
          document.getElementById('sigApproverTitle').value = sigs.approverTitle || '';
          document.getElementById('sigApproverName').value = sigs.approverName || '';
          document.getElementById('sigApproverPos').value = sigs.approverPos || '';
        }
      });
    } else {
      badge.className = 'db-status-badge offline';
      badge.querySelector('.status-text').textContent = '⚠️ โหมดออฟไลน์';
    }
  } catch (err) {
    console.error("Cloud connection failed:", err);
    badge.className = 'db-status-badge offline';
    badge.querySelector('.status-text').textContent = '⚠️ โหมดออฟไลน์';
  }
}

/* --- THEME TOGGLE --- */
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  if (currentTheme === 'dark') {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('tp_theme', 'light');
    sunIcon.classList.remove('hidden');
    moonIcon.classList.add('hidden');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('tp_theme', 'dark');
    sunIcon.classList.add('hidden');
    moonIcon.classList.remove('hidden');
  }
}

/* --- APP MODE SWITCHER (FUEL vs WATER vs PERSONNEL vs ADMIN) --- */
async function switchAppMode(mode) {
  activeMode = mode;
  document.documentElement.setAttribute('data-mode', mode);
  
  const headerBrandSubtitle = document.getElementById('headerBrandSubtitle');
  const welcomeHeadingH2 = document.querySelector('.welcome-heading h2');
  const welcomeHeadingP = document.querySelector('.welcome-heading p');
  const sumFuelCostLabel = document.querySelector('.metric-card.bg-orange-glow h3');
  const sumMaintCostLabel = document.querySelector('.metric-card.bg-blue-glow h3');
  const sumTotalCostLabel = document.querySelector('.metric-card.bg-emerald-glow h3');
  const tableTitle = document.querySelector('#mainTableCard .table-header-flex h3');
  
  // Toggle Visibility
  if (mode === 'admin') {
    calculationFormCard.classList.add('hidden');
    mainTableCard.classList.add('hidden');
    document.querySelector('.metrics-grid').classList.add('hidden');
    personnelCard.classList.add('hidden');
    personnelTableCard.classList.add('hidden');
    globalConfigsCard.classList.add('hidden');
    document.getElementById('adminTableCard').classList.remove('hidden');
    
    modeAdminBtn.style.background = 'var(--post-orange)';
    modeAdminBtn.style.color = 'white';
    modeFuelBtn.style.background = 'transparent';
    modeFuelBtn.style.color = 'var(--text-secondary)';
    modeWaterBtn.style.background = 'transparent';
    modeWaterBtn.style.color = 'var(--text-secondary)';
    modePersonnelBtn.style.background = 'transparent';
    modePersonnelBtn.style.color = 'var(--text-secondary)';
    
    if (headerBrandSubtitle) headerBrandSubtitle.textContent = 'Thailand Post Admin Control Room v1.0';
    if (welcomeHeadingH2) welcomeHeadingH2.textContent = 'ส่วนการจัดการและดูแลสิทธิ์ผู้ใช้งานระบบคลาวด์';
    if (welcomeHeadingP) welcomeHeadingP.textContent = 'กำหนดสิทธิ์ แก้ไขข้อมูลพนักงาน และควบคุมการเข้าถึงระบบจากฐานข้อมูลกลาง';
    
    import('./adminPanel.js').then(({ renderAdminUsersTable }) => {
      renderAdminUsersTable();
    });
  } else if (mode === 'personnel') {
    calculationFormCard.classList.add('hidden');
    mainTableCard.classList.add('hidden');
    document.querySelector('.metrics-grid').classList.add('hidden');
    document.getElementById('adminTableCard').classList.add('hidden');
    globalConfigsCard.classList.add('hidden');
    
    personnelCard.classList.remove('hidden');
    personnelTableCard.classList.remove('hidden');
    
    modePersonnelBtn.style.background = 'var(--post-orange)';
    modePersonnelBtn.style.color = 'white';
    modeFuelBtn.style.background = 'transparent';
    modeFuelBtn.style.color = 'var(--text-secondary)';
    modeWaterBtn.style.background = 'transparent';
    modeWaterBtn.style.color = 'var(--text-secondary)';
    modeAdminBtn.style.background = 'transparent';
    modeAdminBtn.style.color = 'var(--text-secondary)';
    
    if (headerBrandSubtitle) headerBrandSubtitle.textContent = 'Thailand Post Personnel Registry v1.0';
    if (welcomeHeadingH2) welcomeHeadingH2.textContent = 'ระบบจัดการข้อมูลบุคลากรประจำที่ทำการ / ปณ.';
    if (welcomeHeadingP) welcomeHeadingP.textContent = 'บันทึกรายชื่อ ตำแหน่ง เงินเดือน และข้อมูลหลักสำหรับใช้ในการคำนวณเบิกค่าน้ำมันและค่าน้ำดื่ม';
    
    import('./personnelManager.js').then(({ initPersonnelManager }) => {
      initPersonnelManager();
    });
  } else {
    calculationFormCard.classList.remove('hidden');
    mainTableCard.classList.remove('hidden');
    document.querySelector('.metrics-grid').classList.remove('hidden');
    globalConfigsCard.classList.remove('hidden');
    
    personnelCard.classList.add('hidden');
    personnelTableCard.classList.add('hidden');
    document.getElementById('adminTableCard').classList.add('hidden');
    
    modePersonnelBtn.style.background = 'transparent';
    modePersonnelBtn.style.color = 'var(--text-secondary)';
    modeAdminBtn.style.background = 'transparent';
    modeAdminBtn.style.color = 'var(--text-secondary)';
    
    updateEmployeeSelectDropdown();
    
    if (mode === 'fuel') {
      modeFuelBtn.style.background = 'var(--post-orange)';
      modeFuelBtn.style.color = 'white';
      modeWaterBtn.style.background = 'transparent';
      modeWaterBtn.style.color = 'var(--text-secondary)';
      
      if (headerBrandSubtitle) headerBrandSubtitle.textContent = 'Thailand Post Fuel Engine v2.5';
      if (welcomeHeadingH2) welcomeHeadingH2.textContent = 'ระบบคำนวณค่าน้ำมัน & ค่าบำรุงรักษาประจำที่ทำการ / ปณ.';
      if (welcomeHeadingP) welcomeHeadingP.textContent = 'คำนวณค่าน้ำมันพนักงาน นำจ่ายแทน และภารกิจตรวจการนำจ่ายของหัวหน้าโซน (ชนจ.) อัตโนมัติในระบบเดียว';
      
      document.querySelector('.auth-tabs').style.display = 'flex';
      document.getElementById('positionRouteRow').classList.remove('hidden');
      document.getElementById('deliveryRouteGroup').classList.remove('hidden');
      document.getElementById('claimMethodGroup').classList.remove('hidden');
      document.getElementById('workDaysRow').classList.remove('hidden');
      document.getElementById('daysNotWorkedGroup').classList.remove('hidden');
      salaryGroup.classList.add('hidden');
      deliveryRouteSelect.setAttribute('required', 'true');
      
      empPositionSelect.innerHTML = `
        <option value="หน.ปณ.">หน.ปณ.</option>
        <option value="พนักงาน">พนักงาน</option>
        <option value="ลูกจ้างประจำ">ลูกจ้างประจำ</option>
        <option value="ลูกจ้าง">ลูกจ้าง</option>
        <option value="ลูกจ้างเหมา">ลูกจ้างเหมา</option>
      `;
      
      if (sumFuelCostLabel) sumFuelCostLabel.textContent = 'ค่าน้ำมันเชื้อเพลิงรวม';
      if (sumMaintCostLabel) sumMaintCostLabel.textContent = 'ค่าบำรุงรักษารวม';
      if (sumTotalCostLabel) sumTotalCostLabel.textContent = 'ยอดเงินเบิกจ่ายรวมสุทธิ';
      
      if (tableTitle) tableTitle.textContent = 'รายการพนักงานเบิกจ่ายค่าน้ำมันค้างจ่ายประจำ ปณ.';
      document.querySelector('#employeeTable thead').innerHTML = `
        <tr>
          <th>ลำดับ</th>
          <th>ชื่อ - นามสกุล</th>
          <th>ตำแหน่ง/บทบาท</th>
          <th>รายละเอียด/ด้านจ่าย</th>
          <th>ปริมาณน้ำมัน (ลิตร)</th>
          <th>ค่าน้ำมัน (บาท)</th>
          <th>ค่าบำรุงรักษา (บาท)</th>
          <th>รวมเบิกจ่าย (บาท)</th>
          <th>ลงนามผู้รับ</th>
          <th class="actions-col">จัดการ</th>
        </tr>
      `;
      saveBtn.innerHTML = '📥 บันทึกข้อมูลพนักงาน';
    } else {
      modeWaterBtn.style.background = 'var(--post-orange)';
      modeWaterBtn.style.color = 'white';
      modeFuelBtn.style.background = 'transparent';
      modeFuelBtn.style.color = 'var(--text-secondary)';
      
      if (headerBrandSubtitle) headerBrandSubtitle.textContent = 'Thailand Post Drinking Water Engine v1.0';
      if (welcomeHeadingH2) welcomeHeadingH2.textContent = 'ระบบคำนวณค่าน้ำดื่มเจ้าหน้าที่ปฏิบัติงานภายนอกที่ทำการ';
      if (welcomeHeadingP) welcomeHeadingP.textContent = 'คำนวณค่าน้ำดื่มพร้อมหักภาษี ณ ที่จ่ายตามเกณฑ์เงินเดือน 25,833 บาท ตามระเบียบใหม่ล่าสุด';
      
      document.querySelector('.auth-tabs').style.display = 'none';
      document.getElementById('positionRouteRow').classList.remove('hidden');
      document.getElementById('deliveryRouteGroup').classList.add('hidden');
      document.getElementById('claimMethodGroup').classList.add('hidden');
      document.getElementById('workDaysRow').classList.remove('hidden');
      document.getElementById('daysNotWorkedGroup').classList.add('hidden');
      supervisorMissionSection.classList.add('hidden');
      routeStatsPreview.classList.add('hidden');
      salaryGroup.classList.remove('hidden');
      deliveryRouteSelect.removeAttribute('required');
      
      empPositionSelect.innerHTML = `
        <option value="หน.ปณ.">หน.ปณ.</option>
        <option value="พนักงาน">พนักงาน</option>
        <option value="ลูกจ้างประจำ">ลูกจ้างประจำ</option>
        <option value="ลูกจ้าง">ลูกจ้าง</option>
        <option value="ลูกจ้างเหมา">ลูกจ้างเหมา</option>
      `;
      
      if (sumFuelCostLabel) sumFuelCostLabel.textContent = 'ค่าน้ำดื่มก่อนหักภาษีรวม';
      if (sumMaintCostLabel) sumMaintCostLabel.textContent = 'ภาษีหัก ณ ที่จ่ายรวม';
      if (sumTotalCostLabel) sumTotalCostLabel.textContent = 'ยอดเงินเบิกจ่ายรวมสุทธิ';
      
      if (tableTitle) tableTitle.textContent = 'รายการพนักงานเบิกค่าน้ำดื่มประจำที่ทำการ ปณ.';
      document.querySelector('#employeeTable thead').innerHTML = `
        <tr>
          <th>ลำดับ</th>
          <th>ชื่อ - นามสกุล</th>
          <th>ปฏิบัติหน้าที่</th>
          <th>เงินเดือน (บาท)</th>
          <th>วันทำงาน (วัน)</th>
          <th>รวมค่าน้ำดื่ม (บาท)</th>
          <th>ภาษี (บาท)</th>
          <th>ยอดสุทธิคงเหลือ (บาท)</th>
          <th>ลงนามผู้รับ</th>
          <th class="actions-col">จัดการ</th>
        </tr>
      `;
      saveBtn.innerHTML = '📥 บันทึกข้อมูลค่าน้ำดื่ม';
    }
    
    cancelEdit();
    if (isCloudConnected()) {
      try {
        if (mode === 'fuel') {
          employees = await fetchEmployees();
        } else {
          waterEmployees = await fetchWaterEmployees();
        }
        const settings = await fetchGlobalSettings();
        if (mode === 'fuel') {
          if (settings.fuelMonth) globalMonthSelect.value = settings.fuelMonth.value;
          if (settings.fuelYear) globalYearSelect.value = settings.fuelYear.value;
          if (settings.fuelPrice) globalFuelPriceInput.value = settings.fuelPrice.value;
          document.querySelector('label[for="globalFuelPrice"]').classList.remove('hidden');
          globalFuelPriceInput.classList.remove('hidden');
          document.getElementById('openAvgCalcBtn').classList.remove('hidden');
        } else if (mode === 'water') {
          if (settings.waterMonth) globalMonthSelect.value = settings.waterMonth.value;
          if (settings.waterYear) globalYearSelect.value = settings.waterYear.value;
          document.querySelector('label[for="globalFuelPrice"]').classList.add('hidden');
          globalFuelPriceInput.classList.add('hidden');
          document.getElementById('openAvgCalcBtn').classList.add('hidden');
        }
      } catch (err) {
        console.error("Error loading mode data/settings:", err);
      }
    }
    renderEmployeeTable();
    updateTemplateSelectDropdown();
  }
}

function updateEmployeeSelectDropdown() {
  const datalist = document.getElementById('personnelDatalist');
  if (!datalist) return;
  datalist.innerHTML = '';
  personnel.forEach((person) => {
    const opt = document.createElement('option');
    opt.value = person.name;
    opt.textContent = `${person.name} (${person.position} / ${person.duty || '-'})`;
    datalist.appendChild(opt);
  });
}

function handleEmpNameSelectChange(e) {
  const selectedName = e.target.value.trim();
  document.getElementById('empName').value = selectedName;
  const person = personnel.find(p => p.name === selectedName);
  if (!person) return;

  if (activeMode === 'fuel') {
    if (person.duty === 'หัวหน้าโซนนำจ่าย') {
      switchFormMode('supervisor', true);
    } else {
      switchFormMode('standard', true);
    }
    empPositionSelect.value = person.position;
    empDutySelect.value = person.duty || '';
    import('./fuelCalculator.js').then(m => m.handlePositionSelect());
    if (person.route) {
      deliveryRouteSelect.value = person.route;
      import('./fuelCalculator.js').then(m => m.handleRouteSelect());
    }
    if (person.vehicle) {
      vehicleTypeSelect.value = person.vehicle;
    }
  } else if (activeMode === 'water') {
    empPositionSelect.value = person.position;
    empDutySelect.value = person.duty || '';
    empSalaryInput.value = person.salary || 0;
  }
  document.getElementById('signature').value = person.signature || person.name;
}

function switchFormMode(mode, keepEditState = false) {
  formModeInput.value = mode;
  if (mode === 'supervisor') {
    tabSupervisor.classList.add('active');
    tabStandard.classList.remove('active');
    supervisorMissionSection.classList.remove('hidden');
    deliveryRouteGroup.classList.add('hidden');
    claimMethodGroup.classList.add('hidden');
    workDaysRow.classList.add('hidden');
    daysNotWorkedGroup.classList.add('hidden');
    routeStatsPreview.classList.add('hidden');
    deliveryRouteSelect.removeAttribute('required');
    if (!keepEditState) {
      empPositionSelect.innerHTML = `<option value="หัวหน้าโซน">หัวหน้าโซน</option>`;
      empDutySelect.innerHTML = `<option value="หัวหน้าโซนนำจ่าย">หัวหน้าโซนนำจ่าย</option>`;
    }
    import('./fuelCalculator.js').then(m => m.renderMissionsTable());
  } else {
    tabStandard.classList.add('active');
    tabSupervisor.classList.remove('active');
    supervisorMissionSection.classList.add('hidden');
    deliveryRouteGroup.classList.remove('hidden');
    claimMethodGroup.classList.remove('hidden');
    workDaysRow.classList.remove('hidden');
    if (claimMethodSelect.value === 'monthly') {
      daysNotWorkedGroup.classList.remove('hidden');
    }
    deliveryRouteSelect.setAttribute('required', 'true');
    if (!keepEditState) {
      empPositionSelect.innerHTML = `
        <option value="หน.ปณ.">หน.ปณ.</option>
        <option value="พนักงาน">พนักงาน</option>
        <option value="ลูกจ้างประจำ">ลูกจ้างประจำ</option>
        <option value="ลูกจ้าง">ลูกจ้าง</option>
        <option value="ลูกจ้างเหมา">ลูกจ้างเหมา</option>
      `;
      empDutySelect.innerHTML = `
        <option value="เจ้าหน้าที่นำจ่ายไปรษณีย์/EMS/ด้านจ่ายพิเศษ">เจ้าหน้าที่นำจ่ายไปรษณีย์/EMS/ด้านจ่ายพิเศษ</option>
        <option value="เจ้าหน้าที่ไขตู้ไปรษณีย์">เจ้าหน้าที่ไขตู้ไปรษณีย์</option>
        <option value="เจ้าหน้าที่รับฝากนอกที่ทำการ">เจ้าหน้าที่รับฝากนอกที่ทำการ</option>
        <option value="ปณอ.(รับ/จ่าย)/ผู้ช่วยนำจ่าย">ปณอ.(รับ/จ่าย)/ผู้ช่วยนำจ่าย</option>
      `;
    }
    import('./fuelCalculator.js').then(m => m.handlePositionSelect());
  }
}

function renderEmployeeTable() {
  if (activeMode === 'fuel') {
    import('./fuelCalculator.js').then(m => m.renderFuelTable());
  } else if (activeMode === 'water') {
    import('./waterCalculator.js').then(m => m.renderWaterTable());
  }
}

function cancelEdit() {
  employeeForm.reset();
  document.getElementById('editIndex').value = '';
  if (routeStatsPreview) routeStatsPreview.classList.add('hidden');
  resetBtn.classList.add('hidden');
  saveBtn.innerHTML = activeMode === 'fuel' ? '📥 บันทึกข้อมูลพนักงาน' : '📥 บันทึกข้อมูลค่าน้ำดื่ม';
  const formTitle = document.getElementById('formTitle');
  if (formTitle) formTitle.textContent = activeMode === 'fuel' ? 'กรอกข้อมูลผู้รับเงินค่าน้ำมัน' : 'กรอกข้อมูลผู้รับค่าน้ำดื่ม';
  if (activeMode === 'fuel') {
    switchFormMode('standard');
  }
}

function openEditModal(isWaterMode, idx) {
  const modal = document.getElementById('editEmployeeModal');
  const modalTitle = modal.querySelector('h3');
  const modalEmpName = document.getElementById('modalEmpName');
  const modalEmpPosition = document.getElementById('modalEmpPosition');
  const modalWorkDays = document.getElementById('modalWorkDays');
  const modalRemarks = document.getElementById('modalRemarks');
  const modalSignature = document.getElementById('modalSignature');
  const modalEditIndex = document.getElementById('modalEditIndex');
  const modalFuelFields = document.getElementById('modalFuelFields');
  const modalWaterFields = document.getElementById('modalWaterFields');
  const modalDeliveryRoute = document.getElementById('modalDeliveryRoute');
  const modalVehicleType = document.getElementById('modalVehicleType');
  const modalClaimMethod = document.getElementById('modalClaimMethod');
  const modalDaysNotWorked = document.getElementById('modalDaysNotWorked');
  const modalDaysNotWorkedGroup = document.getElementById('modalDaysNotWorkedGroup');
  const modalEmpSalary = document.getElementById('modalEmpSalary');

  modalEditIndex.value = idx;
  modal.dataset.isWater = isWaterMode ? '1' : '0';

  if (isWaterMode) {
    modalTitle.textContent = '✏️ แก้ไขข้อมูลค่าน้ำดื่ม';
    modalFuelFields.classList.add('hidden');
    modalWaterFields.classList.remove('hidden');
    const item = waterEmployees[idx];
    modalEmpName.value = item.name;
    modalEmpPosition.value = item.position;
    document.getElementById('modalEmpDuty').value = item.duty || '';
    modalEmpSalary.value = item.salary;
    modalWorkDays.value = item.workDays;
    modalRemarks.value = item.remarks || '';
    modalSignature.value = item.signature || '';
  } else {
    modalTitle.textContent = '✏️ แก้ไขข้อมูลพนักงาน';
    modalFuelFields.classList.remove('hidden');
    modalWaterFields.classList.add('hidden');

    modalDeliveryRoute.innerHTML = '<option value="" disabled>-- เลือกด้านจ่าย --</option>';
    Object.keys(ROUTE_DATA).forEach(route => {
      const opt = document.createElement('option');
      opt.value = route;
      opt.textContent = `ด้านจ่ายที่ ${route}${ROUTE_DATA[route].hasCar ? ' (รถยนต์)' : ''}`;
      modalDeliveryRoute.appendChild(opt);
    });

    const item = employees[idx];
    modalEmpName.value = item.name;
    modalEmpPosition.value = item.position;
    document.getElementById('modalEmpDuty').value = item.duty || '';
    modalDeliveryRoute.value = item.route || '';
    modalVehicleType.value = item.vehicle || 'รถจักรยานยนต์';
    modalClaimMethod.value = item.method || 'monthly';
    modalDaysNotWorked.value = item.daysNotWorked || 0;
    if (item.method === 'monthly') {
      modalDaysNotWorkedGroup.classList.remove('hidden');
    } else {
      modalDaysNotWorkedGroup.classList.add('hidden');
    }
    document.getElementById('modalIsSubstitute').checked = item.isSubstitute || false;
    modalWorkDays.value = item.workDays;
    modalRemarks.value = item.remarks || '';
    modalSignature.value = item.signature || '';
  }

  adjustModalClaimMethod();
  modal.classList.add('active');
}

function adjustModalClaimMethod() {
  const modal = document.getElementById('editEmployeeModal');
  const isWater = modal.dataset.isWater === '1';
  if (isWater) {
    document.getElementById('modalWorkDays').disabled = false;
    return;
  }

  const modalEmpPosition = document.getElementById('modalEmpPosition');
  const modalClaimMethod = document.getElementById('modalClaimMethod');
  const modalDaysNotWorkedGroup = document.getElementById('modalDaysNotWorkedGroup');
  const modalIsSubstitute = document.getElementById('modalIsSubstitute');
  const modalWorkDays = document.getElementById('modalWorkDays');
  const modalDaysNotWorked = document.getElementById('modalDaysNotWorked');

  const pos = modalEmpPosition.value;
  const isSub = modalIsSubstitute.checked;
  const isStaff = pos === 'พนักงาน' || pos === 'ลูกจ้างประจำ';

  if (isStaff && !isSub) {
    modalClaimMethod.value = 'monthly';
    modalClaimMethod.disabled = true;
    modalDaysNotWorkedGroup.classList.remove('hidden');
    modalWorkDays.value = 26;
    modalWorkDays.disabled = true;
  } else {
    modalClaimMethod.disabled = false;
    modalWorkDays.disabled = false;
    if (modalClaimMethod.value === 'monthly') {
      modalDaysNotWorkedGroup.classList.remove('hidden');
    } else {
      modalDaysNotWorkedGroup.classList.add('hidden');
      modalDaysNotWorked.value = 0;
    }
  }
}

function wireEditModal() {
  const modal = document.getElementById('editEmployeeModal');
  const form = document.getElementById('editEmployeeForm');
  const closeBtn = document.getElementById('closeEditModalBtn');
  const cancelBtn = document.getElementById('cancelEditModalBtn');
  const modalClaimMethod = document.getElementById('modalClaimMethod');

  if (!modal || !form) return;

  closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  cancelBtn.addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

  modalClaimMethod.addEventListener('change', adjustModalClaimMethod);
  document.getElementById('modalEmpPosition').addEventListener('change', adjustModalClaimMethod);
  document.getElementById('modalIsSubstitute').addEventListener('change', adjustModalClaimMethod);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const isWater = modal.dataset.isWater === '1';
    const idx = parseInt(document.getElementById('modalEditIndex').value);
    const name = document.getElementById('modalEmpName').value.trim();
    const position = document.getElementById('modalEmpPosition').value;
    const duty = document.getElementById('modalEmpDuty').value;
    const workDays = parseInt(document.getElementById('modalWorkDays').value) || 0;
    const remarks = document.getElementById('modalRemarks').value.trim();
    const signature = document.getElementById('modalSignature').value.trim() || name;

    if (isWater) {
      const salary = parseFloat(document.getElementById('modalEmpSalary').value) || 0;
      const existingId = waterEmployees[idx]?.id;
      const updatedItem = { name, position, duty, salary, workDays, remarks, signature };
      if (existingId) updatedItem.id = existingId;
      waterEmployees[idx] = updatedItem;
      await saveWaterEmployees(waterEmployees);
    } else {
      const route = document.getElementById('modalDeliveryRoute').value;
      const vehicle = document.getElementById('modalVehicleType').value;
      const method = document.getElementById('modalClaimMethod').value;
      const daysNotWorkedRaw = document.getElementById('modalDaysNotWorked').value;
      const isSubstitute = document.getElementById('modalIsSubstitute').checked;
      
      const isStaff = position === 'พนักงาน' || position === 'ลูกจ้างประจำ';
      if (isStaff && !isSubstitute) {
        if (daysNotWorkedRaw.trim() === '') {
          showToast('กรุณาระบุจำนวนวันที่ไม่ได้นำรถมาใช้!', 'warning');
          document.getElementById('modalDaysNotWorked').focus();
          return;
        }
      }
      
      const daysNotWorked = parseInt(daysNotWorkedRaw) || 0;
      const existingId = employees[idx]?.id;
      employees[idx] = { ...employees[idx], name, position, duty, route, vehicle, method, workDays, daysNotWorked, remarks, signature, isSubstitute };
      if (existingId) employees[idx].id = existingId;
      await saveEmployees(employees);
    }

    modal.classList.remove('active');
    renderEmployeeTable();
  });
}

/* --- SAVED TEMPLATES / BATCH MANAGER LOGIC --- */
function updateTemplateSelectDropdown() {
  const savedTemplates = JSON.parse(localStorage.getItem('tp_saved_templates')) || {};
  templateSelect.innerHTML = '<option value="" disabled selected>-- เลือกรายชื่อที่บันทึกไว้ --</option>';
  
  Object.keys(savedTemplates).forEach(name => {
    const templateData = savedTemplates[name];
    const templateMode = (templateData && templateData.mode) ? templateData.mode : 'fuel';
    if (templateMode === activeMode) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      templateSelect.appendChild(opt);
    }
  });
}

async function saveCurrentListAsTemplate() {
  const name = templateNameInput.value.trim();
  if (!name) {
    showToast('กรุณากรอกชื่อสำหรับบันทึกชุดรายชื่อ!', 'warning');
    return;
  }
  const targetList = activeMode === 'water' ? waterEmployees : employees;
  if (targetList.length === 0) {
    showToast('ไม่มีรายชื่อพนักงานในตารางเพื่อบันทึก!', 'warning');
    return;
  }
  await saveTemplate(name, targetList, activeMode);
  templateNameInput.value = '';
  updateTemplateSelectDropdown();
  showToast(`บันทึกชุดรายชื่อ "${name}" (${activeMode === 'fuel' ? 'ค่าน้ำมัน' : 'ค่าน้ำดื่ม'}) เรียบร้อยแล้ว!`, 'success');
}

async function loadSelectedTemplate() {
  const selectedName = templateSelect.value;
  if (!selectedName) {
    showToast('กรุณาเลือกชุดรายชื่อที่ต้องการโหลด!', 'warning');
    return;
  }
  const savedTemplates = JSON.parse(localStorage.getItem('tp_saved_templates')) || {};
  const templateData = savedTemplates[selectedName];
  if (templateData) {
    const list = Array.isArray(templateData) ? templateData : (templateData.employees || []);
    const templateMode = (templateData && templateData.mode) ? templateData.mode : 'fuel';
    if (templateMode !== activeMode) {
      showToast('ชุดรายชื่อนี้ไม่ตรงกับโหมดการทำงานปัจจุบัน!', 'error');
      return;
    }
    showConfirm({
      title: 'โหลดชุดรายชื่อ',
      message: `คุณต้องการโหลดชุดรายชื่อ "${selectedName}" มาเขียนทับตาราง${activeMode === 'fuel' ? 'ค่าน้ำมัน' : 'ค่าน้ำดื่ม'}ปัจจุบันใช่หรือไม่?`,
      icon: '📂',
      okText: 'โหลดใช้งาน',
      okClass: 'btn-primary',
      onConfirm: async () => {
        if (activeMode === 'water') {
          waterEmployees = JSON.parse(JSON.stringify(list));
          await saveWaterEmployees(waterEmployees);
        } else {
          employees = JSON.parse(JSON.stringify(list));
          await saveEmployees(employees);
        }
        cancelEdit();
        renderEmployeeTable();
        showToast(`โหลดชุดรายชื่อ "${selectedName}" สำเร็จ!`, 'success');
      }
    });
  }
}

async function deleteSelectedTemplate() {
  const selectedName = templateSelect.value;
  if (!selectedName) {
    showToast('กรุณาเลือกชุดรายชื่อที่ต้องการลบ!', 'warning');
    return;
  }
  showConfirm({
    title: 'ลบชุดรายชื่อ',
    message: `คุณต้องการลบชุดรายชื่อ "${selectedName}" ใช่หรือไม่?`,
    icon: '🗑️',
    okText: 'ลบชุดนี้',
    onConfirm: async () => {
      await deleteTemplate(selectedName);
      updateTemplateSelectDropdown();
      showToast(`ลบชุดรายชื่อ "${selectedName}" เรียบร้อยแล้ว!`, 'success');
    }
  });
}

/* --- REFERENCE ROUTE DATA EDITOR MODAL FUNCTIONS --- */
function openRouteEditor() {
  routeEditorModal.classList.add('active');
  renderRouteEditorTable();
  loadSelectedRouteToEditorForm();
}

function loadSelectedRouteToEditorForm() {
  const route = editRouteSelect.value;
  if (!route) return;
  const routeInfo = ROUTE_DATA[route];
  routeDistDayInput.value = routeInfo.workerDist;
  routeFuelDayInput.value = routeInfo.workerLiters;
  routeDistMonthInput.value = routeInfo.staffDist;
  routeFuelMonthInput.value = routeInfo.staffLiters;
  routeHasCarSelect.value = routeInfo.hasCar.toString();
}

async function saveSingleRouteSettings() {
  const route = editRouteSelect.value;
  if (!route) return;
  const workerDist = parseFloat(routeDistDayInput.value) || 0;
  const workerLiters = parseFloat(routeFuelDayInput.value) || 0;
  const staffDist = parseFloat(routeDistMonthInput.value) || 0;
  const staffLiters = parseFloat(routeFuelMonthInput.value) || 0;
  const hasCar = routeHasCarSelect.value === 'true';
  ROUTE_DATA[route] = { hasCar, workerDist, workerLiters, staffDist, staffLiters };
  await saveRouteData(ROUTE_DATA);
  updateAllRouteDropdownTexts();
  renderRouteEditorTable();
  renderEmployeeTable();
  showToast(`อัปเดตข้อมูลด้านจ่ายที่ ${route} สำเร็จ!`, 'success');
}

function updateAllRouteDropdownTexts() {
  const currentVal1 = deliveryRouteSelect.value;
  const currentVal2 = missionRouteSelect.value;
  deliveryRouteSelect.innerHTML = '<option value="" disabled selected>-- เลือกด้านจ่าย --</option>';
  missionRouteSelect.innerHTML = '<option value="" disabled selected>-- เลือกด้านจ่าย --</option>';
  Object.keys(ROUTE_DATA).forEach(route => {
    const text = `ด้านจ่ายที่ ${route}${ROUTE_DATA[route].hasCar ? ' (รถยนต์)' : ''}`;
    const opt1 = document.createElement('option');
    opt1.value = route;
    opt1.textContent = text;
    deliveryRouteSelect.appendChild(opt1);
    const opt2 = document.createElement('option');
    opt2.value = route;
    opt2.textContent = text;
    missionRouteSelect.appendChild(opt2);
  });
  deliveryRouteSelect.value = currentVal1;
  missionRouteSelect.value = currentVal2;
}

function renderRouteEditorTable() {
  routeEditorTableBody.innerHTML = '';
  Object.keys(ROUTE_DATA).forEach(route => {
    const info = ROUTE_DATA[route];
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${route}</strong></td>
      <td><span class="badge ${info.hasCar ? 'position-พนักงาน' : 'position-ลูกจ้าง'}">${info.hasCar ? '🚗 รถยนต์' : '🏍️ จักรยานยนต์'}</span></td>
      <td>${info.workerDist.toFixed(1)} กม.</td>
      <td>${info.workerLiters.toFixed(2)} ลิตร</td>
      <td>${info.staffDist.toLocaleString()} กม.</td>
      <td>${info.staffLiters.toLocaleString()} ลิตร</td>
      <td><button type="button" class="btn btn-secondary btn-small select-route-btn" style="padding: 0.15rem 0.35rem; font-size: 0.75rem;">แก้ไข</button></td>
    `;
    tr.querySelector('.select-route-btn').addEventListener('click', () => {
      editRouteSelect.value = route;
      loadSelectedRouteToEditorForm();
    });
    routeEditorTableBody.appendChild(tr);
  });
}

async function resetRouteDataDefaults() {
  showConfirm({
    title: 'รีเซ็ตข้อมูลด้านจ่าย',
    message: 'คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตสถิติด้านจ่ายอ้างอิงทั้งหมดกลับไปเป็นค่าเริ่มต้นจากโรงงาน? ผลลัพธ์นี้ไม่สามารถย้อนคืนได้',
    icon: '⚠️',
    okText: 'รีเซ็ตทั้งหมด',
    onConfirm: async () => {
      await resetCloudRouteData();
      ROUTE_DATA = initRouteData();
      await saveRouteData(ROUTE_DATA);
      updateAllRouteDropdownTexts();
      renderRouteEditorTable();
      loadSelectedRouteToEditorForm();
      renderEmployeeTable();
      showToast('รีเซ็ตข้อมูลด้านจ่ายทั้งหมดเรียบร้อยแล้ว!', 'success');
    }
  });
}

/* --- SIGNATORY INPUTS LOCK/UNLOCK TOGGLE --- */
function toggleSignatoryInputsLock() {
  const inputs = [
    document.getElementById('sigMakerTitle'),
    document.getElementById('sigMakerName'),
    document.getElementById('sigMakerPos'),
    document.getElementById('sigCheckerTitle'),
    document.getElementById('sigCheckerName'),
    document.getElementById('sigCheckerPos'),
    document.getElementById('sigApproverTitle'),
    document.getElementById('sigApproverName'),
    document.getElementById('sigApproverPos')
  ];
  const isCurrentlyLocked = inputs[0].disabled;
  if (isCurrentlyLocked) {
    inputs.forEach(input => input.disabled = false);
    toggleSigEditBtn.innerHTML = '🔒 ล็อกผู้ลงนาม';
    toggleSigEditBtn.style.background = 'var(--post-orange)';
    toggleSigEditBtn.style.color = '#fff';
    inputs[1].focus();
  } else {
    inputs.forEach(input => input.disabled = true);
    toggleSigEditBtn.innerHTML = '✏️ แก้ไขผู้ลงนาม';
    toggleSigEditBtn.style.background = 'transparent';
    toggleSigEditBtn.style.color = 'var(--post-orange)';
    saveGlobalSetting('signatories', {
      makerTitle: inputs[0].value,
      makerName: inputs[1].value,
      makerPos: inputs[2].value,
      checkerTitle: inputs[3].value,
      checkerName: inputs[4].value,
      checkerPos: inputs[5].value,
      approverTitle: inputs[6].value,
      approverName: inputs[7].value,
      approverPos: inputs[8].value
    });
  }
}

/* --- SIGNATORY PROFILE MANAGER LOGIC --- */
async function openSigProfiles() {
  const sigProfilesModal = document.getElementById('sigProfilesModal');
  sigProfilesModal.classList.add('active');
  await renderSigProfilesTable();
}

async function renderSigProfilesTable() {
  const sigProfilesTableBody = document.getElementById('sigProfilesTableBody');
  sigProfilesTableBody.innerHTML = '<tr><td colspan="3" class="no-data">กำลังโหลดข้อมูล...</td></tr>';
  const profiles = await fetchSignatoryProfiles();
  sigProfilesTableBody.innerHTML = '';
  const keys = Object.keys(profiles);
  if (keys.length === 0) {
    sigProfilesTableBody.innerHTML = '<tr><td colspan="3" class="no-data">ยังไม่มีเทมเพลตผู้ลงนาม</td></tr>';
    return;
  }
  keys.forEach(name => {
    const p = profiles[name];
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${name}</strong></td>
      <td style="font-size: 0.8rem; text-align: left !important; line-height: 1.4; color: var(--text-primary);">
        <div><strong>${p.makerTitle || 'ผู้จัดทำ'}:</strong> ${p.makerName} (${p.makerPos})</div>
        <div><strong>${p.checkerTitle || 'ผู้ตรวจสอบ'}:</strong> ${p.checkerName || '-'} (${p.checkerPos || '-'})</div>
        <div><strong>${p.approverTitle || 'ผู้อนุมัติ'}:</strong> ${p.approverName || '-'} (${p.approverPos || '-'})</div>
      </td>
      <td>
        <div style="display: flex; gap: 0.25rem; justify-content: center;">
          <button type="button" class="btn btn-primary btn-small load-profile-btn" style="padding: 0.15rem 0.35rem; font-size: 0.75rem;">โหลด</button>
          <button type="button" class="btn btn-danger btn-small delete-profile-btn" style="padding: 0.15rem 0.35rem; font-size: 0.75rem;">ลบ</button>
        </div>
      </td>
    `;
    tr.querySelector('.load-profile-btn').addEventListener('click', () => {
      const activeSigs = {
        makerTitle: p.makerTitle || 'ผู้จัดทำ',
        makerName: p.makerName || '',
        makerPos: p.makerPos || '',
        checkerTitle: p.checkerTitle || 'ผู้ตรวจสอบ',
        checkerName: p.checkerName || '',
        checkerPos: p.checkerPos || '',
        approverTitle: p.approverTitle || 'ผู้อนุมัติ',
        approverName: p.approverName || '',
        approverPos: p.approverPos || ''
      };
      document.getElementById('sigMakerTitle').value = activeSigs.makerTitle;
      document.getElementById('sigMakerName').value = activeSigs.makerName;
      document.getElementById('sigMakerPos').value = activeSigs.makerPos;
      document.getElementById('sigCheckerTitle').value = activeSigs.checkerTitle;
      document.getElementById('sigCheckerName').value = activeSigs.checkerName;
      document.getElementById('sigCheckerPos').value = activeSigs.checkerPos;
      document.getElementById('sigApproverTitle').value = activeSigs.approverTitle;
      document.getElementById('sigApproverName').value = activeSigs.approverName;
      document.getElementById('sigApproverPos').value = activeSigs.approverPos;
      saveGlobalSetting('signatories', activeSigs);
      const sigProfilesModal = document.getElementById('sigProfilesModal');
      sigProfilesModal.classList.remove('active');
      showToast(`โหลดชุดผู้ลงนาม "${name}" สำเร็จ!`, 'success');
    });
    tr.querySelector('.delete-profile-btn').addEventListener('click', async () => {
      showConfirm({
        title: 'ลบเทมเพลตผู้ลงนาม',
        message: `คุณต้องการลบเทมเพลตผู้ลงนาม "${name}" ใช่หรือไม่?`,
        icon: '🗑️',
        okText: 'ลบเทมเพลตนี้',
        onConfirm: async () => {
          await deleteSignatoryProfile(name);
          await renderSigProfilesTable();
          showToast(`ลบเทมเพลต "${name}" สำเร็จ!`, 'success');
        }
      });
    });
    sigProfilesTableBody.appendChild(tr);
  });
}

async function handleSaveSigProfile() {
  const profileName = document.getElementById('sigProfileNameInput').value.trim();
  if (!profileName) {
    showToast('กรุณากรอกชื่อโปรไฟล์เทมเพลต!', 'warning');
    return;
  }
  const profileData = {
    makerTitle: document.getElementById('modalSigMakerTitle').value.trim() || 'ผู้จัดทำ',
    makerName: document.getElementById('modalSigMakerName').value.trim(),
    makerPos: document.getElementById('modalSigMakerPos').value.trim(),
    checkerTitle: document.getElementById('modalSigCheckerTitle').value.trim() || 'ผู้ตรวจสอบ',
    checkerName: document.getElementById('modalSigCheckerName').value.trim(),
    checkerPos: document.getElementById('modalSigCheckerPos').value.trim(),
    approverTitle: document.getElementById('modalSigApproverTitle').value.trim() || 'ผู้อนุมัติ',
    approverName: document.getElementById('modalSigApproverName').value.trim(),
    approverPos: document.getElementById('modalSigApproverPos').value.trim()
  };
  if (!profileData.makerName) {
    showToast('กรุณากรอกชื่อผู้จัดทำเป็นอย่างน้อย!', 'warning');
    return;
  }
  await saveSignatoryProfile(profileName, profileData);
  document.getElementById('sigProfileNameInput').value = '';
  document.getElementById('modalSigMakerName').value = '';
  document.getElementById('modalSigMakerPos').value = '';
  document.getElementById('modalSigCheckerName').value = '';
  document.getElementById('modalSigCheckerPos').value = '';
  document.getElementById('modalSigApproverName').value = '';
  document.getElementById('modalSigApproverPos').value = '';
  await renderSigProfilesTable();
  showToast(`บันทึกโปรไฟล์ "${profileName}" สำเร็จ!`, 'success');
}

/* --- EXCEL ATTENDANCE IMPORT LOGIC --- */
function openAttendanceImportModal() {
  importPastedText.value = '';
  importPreviewTableBody.innerHTML = '<tr><td colspan="3" class="no-data" style="text-align: center; padding: 1.5rem;">ยังไม่มีข้อมูล รอวางข้อมูลเพื่อประมวลผล</td></tr>';
  submitImportBtn.disabled = true;
  submitImportBtn.innerHTML = '✔️ ยืนยันนำเข้าข้อมูล';
  tempParsedRecords = [];
  const targetRadio = document.querySelector(`input[name="importTargetMode"][value="${activeMode}"]`);
  if (targetRadio) targetRadio.checked = true;
  attendanceImportModal.classList.add('active');
}

function cleanThaiNameForMatching(name) {
  if (!name) return "";
  let cleaned = name.replace(/[\s\t\n\r\.\*\"\'\-]/g, "");
  cleaned = cleaned.replace(/^(นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.)/, "");
  return cleaned;
}

function handleAttendancePaste() {
  setTimeout(() => {
    const text = importPastedText.value;
    const lines = text.split('\n');
    tempParsedRecords = [];
    importPreviewTableBody.innerHTML = '';
    let matchCount = 0;
    const targetRadio = document.querySelector('input[name="importTargetMode"]:checked');
    const targetMode = targetRadio ? targetRadio.value : 'both';
    
    lines.forEach(line => {
      const cleanedLine = line.trim();
      if (!cleanedLine) return;
      
      const numbers = cleanedLine.match(/\b([0-9]{1,2})\b/g);
      let workDays = null;
      if (numbers && numbers.length > 0) {
        for (let i = numbers.length - 1; i >= 0; i--) {
          const num = parseInt(numbers[i]);
          if (num >= 0 && num <= 31) {
            workDays = num;
            break;
          }
        }
      }
      
      const tokens = cleanedLine.split(/[\t\s]+/).map(t => t.trim()).filter(Boolean);
      let nameParts = [];
      tokens.forEach(tok => {
        if (isNaN(tok) && tok !== '/' && tok !== 'ย' && tok !== 'พร' && tok !== 'ป' && tok !== 'ก' && tok.length > 1) {
          nameParts.push(tok);
        }
      });
      let parsedName = nameParts.join(' ');
      if (!parsedName) {
        parsedName = cleanedLine.replace(/[0-9\/ยพรก\t\*\-\(\)]/g, ' ').replace(/\s+/g, ' ').trim();
      }
      if (parsedName.length < 3) return;
      
      let matchStatusHtml = '';
      let matchFound = false;
      let matchingEmployeeName = '';
      let targetLists = [];
      const cleanedParsedName = cleanThaiNameForMatching(parsedName);
      
      if (targetMode === 'fuel' || targetMode === 'both') {
        const matchIdx = employees.findIndex(emp => cleanThaiNameForMatching(emp.name) === cleanedParsedName);
        if (matchIdx !== -1) {
          matchFound = true;
          matchingEmployeeName = employees[matchIdx].name;
          targetLists.push({ type: 'fuel', index: matchIdx, original: employees[matchIdx] });
        }
      }
      
      if (targetMode === 'water' || targetMode === 'both') {
        const matchIdx = waterEmployees.findIndex(emp => cleanThaiNameForMatching(emp.name) === cleanedParsedName);
        if (matchIdx !== -1) {
          matchFound = true;
          matchingEmployeeName = waterEmployees[matchIdx].name;
          targetLists.push({ type: 'water', index: matchIdx, original: waterEmployees[matchIdx] });
        }
      }
      
      const recordIndex = tempParsedRecords.length;
      tempParsedRecords.push({
        name: parsedName,
        newDays: workDays !== null ? workDays : 26,
        matched: matchFound,
        targets: targetLists
      });

      if (matchFound) {
        matchCount++;
        const typesLabel = targetLists.map(t => t.type === 'fuel' ? '⛽ ค่าน้ำมัน' : '🥤 ค่าน้ำดื่ม').join(' & ');
        matchStatusHtml = `<span style="color: var(--post-emerald); font-weight: bold;">✔️ จับคู่สำเร็จ (${matchingEmployeeName})<br><small style="color: var(--text-secondary); font-size: 0.75rem;">${typesLabel}</small></span>`;
      } else {
        const suggestions = findCloseFuzzyMatches(parsedName, targetMode);
        if (suggestions.length > 0) {
          let sugButtons = suggestions.map(s => {
            const label = s.type === 'fuel' ? '⛽ ' + s.name : '🥤 ' + s.name;
            return `<button type="button" class="btn btn-secondary btn-small" style="padding: 0.15rem 0.4rem; font-size: 0.7rem; margin: 0.15rem 0.15rem 0 0; background: rgba(245,158,11,0.08); border: 1px solid var(--post-orange); color: var(--post-orange);" onclick="window.manuallyBindImportName(${recordIndex}, '${s.type}', ${s.index}, '${s.name}')">✔️ ${label}</button>`;
          }).join('');
          matchStatusHtml = `
            <div id="import-status-cell-${recordIndex}">
              <span style="color: #f59e0b; font-weight: 500;">⚠️ สะกดไม่ตรง / ไม่พบชื่อ</span><br>
              <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.2rem;">แนะนําคลิกจับคู่:<br>${sugButtons}</div>
            </div>
          `;
        } else {
          matchStatusHtml = `
            <div id="import-status-cell-${recordIndex}">
              <span style="color: #d32f2f; font-weight: 500;">❌ ไม่พบรายชื่อนี้ในระบบ</span>
            </div>
          `;
        }
      }
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="text-align: left; padding: 0.5rem 0.75rem;"><strong>${parsedName}</strong></td>
        <td style="text-align: left; padding: 0.5rem 0.75rem; font-size: 0.8rem; line-height: 1.35;">${matchStatusHtml}</td>
        <td style="padding: 0.5rem 0.75rem; font-weight: bold; color: var(--post-orange);">${workDays !== null ? workDays + ' วัน' : '26 วัน (ค่าเริ่มต้น)'}</td>
      `;
      importPreviewTableBody.appendChild(tr);
    });
    
    if (tempParsedRecords.length === 0) {
      importPreviewTableBody.innerHTML = '<tr><td colspan="3" class="no-data" style="text-align: center; padding: 1.5rem;">ยังไม่มีข้อมูล รอวางข้อมูลเพื่อประมวลผล</td></tr>';
      submitImportBtn.disabled = true;
    } else {
      submitImportBtn.disabled = matchCount === 0;
      submitImportBtn.innerHTML = `✔️ ยืนยันนำเข้าข้อมูล (${matchCount} รายชื่อ)`;
    }
  }, 100);
}

async function handleConfirmImport() {
  let updatedFuelCount = 0;
  let updatedWaterCount = 0;
  let updatedEmployees = [...employees];
  let updatedWaterEmployees = [...waterEmployees];
  tempParsedRecords.forEach(rec => {
    if (!rec.matched) return;
    rec.targets.forEach(target => {
      if (target.type === 'fuel') {
        updatedEmployees[target.index].workDays = rec.newDays;
        updatedFuelCount++;
      } else if (target.type === 'water') {
        updatedWaterEmployees[target.index].workDays = rec.newDays;
        updatedWaterCount++;
      }
    });
  });
  if (updatedFuelCount > 0) {
    employees = updatedEmployees;
    localStorage.setItem('tp_employees', JSON.stringify(employees));
    await saveEmployees(employees);
  }
  if (updatedWaterCount > 0) {
    waterEmployees = updatedWaterEmployees;
    localStorage.setItem('tp_water_employees', JSON.stringify(waterEmployees));
    await saveWaterEmployees(waterEmployees);
  }
  attendanceImportModal.classList.remove('active');
  renderEmployeeTable();
  showToast(`นำเข้าวันทำงานสำเร็จ! (ค่าน้ำมัน: ${updatedFuelCount} ราย, ค่าน้ำดื่ม: ${updatedWaterCount} ราย)`, 'success');
}

async function downloadAttendanceTemplateXlsx() {
  const XLSX = await getXLSX();
  const nameSet = new Set();
  const uniqueEmployees = [];
  employees.forEach(emp => {
    if (!nameSet.has(emp.name)) {
      nameSet.add(emp.name);
      uniqueEmployees.push({ name: emp.name });
    }
  });
  waterEmployees.forEach(emp => {
    if (!nameSet.has(emp.name)) {
      nameSet.add(emp.name);
      uniqueEmployees.push({ name: emp.name });
    }
  });
  if (uniqueEmployees.length === 0) {
    uniqueEmployees.push({ name: "นายนิพล ทรัพย์หมื่นแสน" }, { name: "นางสาวสมหญิง สุจริต" });
  }
  const wb = XLSX.utils.book_new();
  const ws_data = [
    ["แบบบันทึกวันมาทำงานพนักงาน (สำหรับนำเข้าข้อมูลเข้าระบบ)", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["คำชี้แจง: / = มาทำงานปกติ (ระบบคำนวณนับเฉพาะเครื่องหมาย / นี้เท่านั้นเพื่อนำเข้าวันมาทำงาน)", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
  ];
  const headers = ["ลำดับ", "ชื่อ-สกุล"];
  for (let i = 1; i <= 31; i++) headers.push(String(i));
  headers.push("รวมมาทำงาน");
  ws_data.push(headers);
  const selectedYearBE = parseInt(document.getElementById('globalYear').value) || 2569;
  const selectedYearAD = selectedYearBE - 543;
  const selectedMonthJS = parseInt(globalMonthSelect.value) - 1;

  uniqueEmployees.forEach((emp, index) => {
    const rowIdx = index + 1;
    const xlRow = index + 4;
    const rowData = [rowIdx, emp.name];
    const registryPerson = personnel.find(p => p.name.trim().toLowerCase() === emp.name.trim().toLowerCase());
    const restDays = registryPerson ? (registryPerson.restDays || []) : [];
    for (let d = 1; d <= 31; d++) {
      const date = new Date(selectedYearAD, selectedMonthJS, d);
      if (date.getMonth() !== selectedMonthJS) {
        rowData.push("");
      } else {
        rowData.push(restDays.includes(date.getDay()) ? "ย" : "/");
      }
    }
    rowData.push({ f: `COUNTIF(C${xlRow}:AG${xlRow},"/")` });
    ws_data.push(rowData);
  });
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 33 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 33 } }];
  const colWidths = [{ wch: 8 }, { wch: 30 }];
  for (let d = 1; d <= 31; d++) colWidths.push({ wch: 5 });
  colWidths.push({ wch: 15 });
  ws['!cols'] = colWidths;
  
  // Style config
  const range = XLSX.utils.decode_range(ws['!ref']);
  const titleStyle = { font: { name: "Segoe UI", sz: 16, bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "F55E0B" } }, alignment: { horizontal: "center", vertical: "center" } };
  const descStyle = { font: { name: "Segoe UI", sz: 11, italic: true, color: { rgb: "555555" } }, fill: { fgColor: { rgb: "FFF3E0" } }, alignment: { horizontal: "center", vertical: "center" } };
  const headerStyle = { font: { name: "Segoe UI", sz: 11, bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "212121" } }, alignment: { horizontal: "center", vertical: "center" }, border: { top: { style: "medium", color: { rgb: "000000" } }, bottom: { style: "medium", color: { rgb: "000000" } } } };
  const dataNameStyle = { font: { name: "Segoe UI", sz: 11 }, alignment: { horizontal: "left", vertical: "center" }, border: { bottom: { style: "thin", color: { rgb: "E0E0E0" } }, left: { style: "thin", color: { rgb: "E0E0E0" } }, right: { style: "thin", color: { rgb: "E0E0E0" } } } };
  const dataCenterStyle = { font: { name: "Segoe UI", sz: 11 }, alignment: { horizontal: "center", vertical: "center" }, border: { bottom: { style: "thin", color: { rgb: "E0E0E0" } }, left: { style: "thin", color: { rgb: "E0E0E0" } }, right: { style: "thin", color: { rgb: "E0E0E0" } } } };
  const sumStyle = { font: { name: "Segoe UI", sz: 11, bold: true, color: { rgb: "D32F2F" } }, fill: { fgColor: { rgb: "FFEBEE" } }, alignment: { horizontal: "center", vertical: "center" }, border: { bottom: { style: "double", color: { rgb: "D32F2F" } }, left: { style: "thin", color: { rgb: "E0E0E0" } }, right: { style: "thin", color: { rgb: "E0E0E0" } } } };

  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (!cell) continue;
      if (r === 0) cell.s = titleStyle;
      else if (r === 1) cell.s = descStyle;
      else if (r === 2) cell.s = headerStyle;
      else {
        if (c === 0) cell.s = dataCenterStyle;
        else if (c === 1) cell.s = dataNameStyle;
        else if (c === 33) cell.s = sumStyle;
        else cell.s = dataCenterStyle;
      }
    }
  }
  ws['!rows'] = [{ hpx: 40 }, { hpx: 25 }, { hpx: 30 }];
  XLSX.utils.book_append_sheet(wb, ws, "บันทึกเวลาทำงาน");
  XLSX.writeFile(wb, "เทมเพลตบันทึกเวลาทำงาน.xlsx");
  showToast('ดาวน์โหลดเทมเพลต Excel (.xlsx) เรียบร้อย!', 'success');
}

function switchImportTab(tab) {
  if (tab === 'file') {
    tabImportFile.classList.add('active');
    tabImportFile.style.color = 'var(--post-orange)';
    tabImportFile.style.borderBottom = '3px solid var(--post-orange)';
    tabImportText.classList.remove('active');
    tabImportText.style.color = 'var(--text-secondary)';
    tabImportText.style.borderBottom = '3px solid transparent';
    importFileContent.classList.remove('hidden');
    importTextContent.classList.add('hidden');
  } else {
    tabImportText.classList.add('active');
    tabImportText.style.color = 'var(--post-orange)';
    tabImportText.style.borderBottom = '3px solid var(--post-orange)';
    tabImportFile.classList.remove('active');
    tabImportFile.style.color = 'var(--text-secondary)';
    tabImportFile.style.borderBottom = '3px solid transparent';
    importTextContent.classList.remove('hidden');
    importFileContent.classList.add('hidden');
  }
}

function clearSelectedImportFile() {
  attendanceFileSelector.value = '';
  selectedFileInfo.classList.add('hidden');
  dragDropZone.classList.remove('hidden');
  importPreviewTableBody.innerHTML = '<tr><td colspan="3" class="no-data" style="text-align: center; padding: 1.5rem;">ยังไม่มีข้อมูล รอโหลดไฟล์หรือวางข้อมูลเพื่อประมวลผล</td></tr>';
  submitImportBtn.disabled = true;
  submitImportBtn.innerHTML = '✔️ ยืนยันนำเข้าข้อมูล';
  tempParsedRecords = [];
}

function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }
  return matrix[b.length][a.length];
}

function findCloseFuzzyMatches(inputName, targetMode) {
  const cleanedInput = cleanThaiNameForMatching(inputName);
  if (cleanedInput.length < 2) return [];
  const matches = [];
  if (targetMode === 'fuel' || targetMode === 'both') {
    employees.forEach((emp, index) => {
      const cleanedEmp = cleanThaiNameForMatching(emp.name);
      const dist = levenshteinDistance(cleanedInput, cleanedEmp);
      if (dist <= 4) matches.push({ name: emp.name, type: 'fuel', index, dist });
    });
  }
  if (targetMode === 'water' || targetMode === 'both') {
    waterEmployees.forEach((emp, index) => {
      const cleanedEmp = cleanThaiNameForMatching(emp.name);
      const dist = levenshteinDistance(cleanedInput, cleanedEmp);
      if (dist <= 4 && !matches.some(m => m.name === emp.name && m.type === 'water')) {
        matches.push({ name: emp.name, type: 'water', index, dist });
      }
    });
  }
  return matches.sort((a, b) => a.dist - b.dist).slice(0, 3);
}

window.manuallyBindImportName = function(recordIndex, targetType, targetIndex, targetName) {
  const rec = tempParsedRecords[recordIndex];
  if (!rec) return;
  rec.matched = true;
  const originalEmp = targetType === 'fuel' ? employees[targetIndex] : waterEmployees[targetIndex];
  rec.targets = [{ type: targetType, index: targetIndex, original: originalEmp }];
  const statusCellId = `import-status-cell-${recordIndex}`;
  const cell = document.getElementById(statusCellId);
  if (cell) {
    cell.innerHTML = `<span style="color: var(--post-emerald); font-weight: bold;">✔️ เชื่อมต่อสำเร็จ (${targetName})<br><small style="color: var(--text-secondary); font-size: 0.75rem;">${targetType === 'fuel' ? '⛽ ค่าน้ำมัน' : '🥤 ค่าน้ำดื่ม'} (จับคู่ด้วยตนเอง)</small></span>`;
  }
  let matchedCount = tempParsedRecords.filter(r => r.matched).length;
  submitImportBtn.disabled = matchedCount === 0;
  submitImportBtn.innerHTML = `✔️ ยืนยันนำเข้าข้อมูล (${matchedCount} รายชื่อ)`;
  showToast(`จับคู่ "${rec.name}" กับ "${targetName}" เรียบร้อย!`, 'success');
};

function processUploadedFile(file) {
  if (!file) return;
  fileNameLabel.textContent = `📂 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  selectedFileInfo.classList.remove('hidden');
  dragDropZone.classList.add('hidden');
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const XLSX = await getXLSX();
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      tempParsedRecords = [];
      importPreviewTableBody.innerHTML = '';
      let matchCount = 0;
      const targetRadio = document.querySelector('input[name="importTargetMode"]:checked');
      const targetMode = targetRadio ? targetRadio.value : 'both';
      
      for (let r = 3; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length < 2) continue;
        const nameVal = String(row[1] || '').trim();
        if (nameVal.length < 3 || nameVal === 'ชื่อ-สกุล') continue;
        
        let workDays = 0;
        let dayColumnFilled = false;
        for (let c = 2; c <= 32; c++) {
          const val = String(row[c] || '').trim();
          if (val) {
            dayColumnFilled = true;
            if (val === '/') workDays++;
          }
        }
        if (!dayColumnFilled || workDays === 0) {
          const lastVal = parseInt(row[row.length - 1]);
          workDays = (!isNaN(lastVal) && lastVal >= 0 && lastVal <= 31) ? lastVal : 26;
        }
        let matchFound = false;
        let matchingEmployeeName = '';
        let targetLists = [];
        const cleanedParsedName = cleanThaiNameForMatching(nameVal);
        
        if (targetMode === 'fuel' || targetMode === 'both') {
          const matchIdx = employees.findIndex(emp => cleanThaiNameForMatching(emp.name) === cleanedParsedName);
          if (matchIdx !== -1) {
            matchFound = true;
            matchingEmployeeName = employees[matchIdx].name;
            targetLists.push({ type: 'fuel', index: matchIdx, original: employees[matchIdx] });
          }
        }
        if (targetMode === 'water' || targetMode === 'both') {
          const matchIdx = waterEmployees.findIndex(emp => cleanThaiNameForMatching(emp.name) === cleanedParsedName);
          if (matchIdx !== -1) {
            matchFound = true;
            matchingEmployeeName = waterEmployees[matchIdx].name;
            targetLists.push({ type: 'water', index: matchIdx, original: waterEmployees[matchIdx] });
          }
        }
        const recordIndex = tempParsedRecords.length;
        tempParsedRecords.push({ name: nameVal, newDays: workDays, matched: matchFound, targets: targetLists });
        
        let matchStatusHtml = '';
        if (matchFound) {
          matchCount++;
          matchStatusHtml = `<span style="color: var(--post-emerald); font-weight: bold;">✔️ จับคู่สำเร็จ (${matchingEmployeeName})<br><small style="color: var(--text-secondary); font-size: 0.75rem;">${targetLists.map(t => t.type === 'fuel' ? '⛽ ค่าน้ำมัน' : '🥤 ค่าน้ำดื่ม').join(' & ')}</small></span>`;
        } else {
          const suggestions = findCloseFuzzyMatches(nameVal, targetMode);
          if (suggestions.length > 0) {
            let sugButtons = suggestions.map(s => {
              return `<button type="button" class="btn btn-secondary btn-small" style="padding: 0.15rem 0.4rem; font-size: 0.7rem; margin: 0.15rem 0.15rem 0 0; background: rgba(245,158,11,0.08); border: 1px solid var(--post-orange); color: var(--post-orange);" onclick="window.manuallyBindImportName(${recordIndex}, '${s.type}', ${s.index}, '${s.name}')">✔️ ${s.type === 'fuel' ? '⛽ ' + s.name : '🥤 ' + s.name}</button>`;
            }).join('');
            matchStatusHtml = `
              <div id="import-status-cell-${recordIndex}">
                <span style="color: #f59e0b; font-weight: 500;">⚠️ สะกดไม่ตรง / ไม่พบชื่อ</span><br>
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.2rem;">แนะนําคลิกจับคู่:<br>${sugButtons}</div>
              </div>
            `;
          } else {
            matchStatusHtml = `<div id="import-status-cell-${recordIndex}"><span style="color: #d32f2f; font-weight: 500;">❌ ไม่พบรายชื่อนี้ในระบบ</span></div>`;
          }
        }
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="text-align: left; padding: 0.5rem 0.75rem;"><strong>${nameVal}</strong></td>
          <td style="text-align: left; padding: 0.5rem 0.75rem; font-size: 0.8rem; line-height: 1.35;">${matchStatusHtml}</td>
          <td style="padding: 0.5rem 0.75rem; font-weight: bold; color: var(--post-orange);">${workDays} วัน</td>
        `;
        importPreviewTableBody.appendChild(tr);
      }
      
      if (tempParsedRecords.length === 0) {
        importPreviewTableBody.innerHTML = '<tr><td colspan="3" class="no-data" style="text-align: center; padding: 1.5rem;">ไม่พบแถวข้อมูลพนักงานในไฟล์นี้</td></tr>';
        submitImportBtn.disabled = true;
      } else {
        submitImportBtn.disabled = matchCount === 0;
        submitImportBtn.innerHTML = `✔️ ยืนยันนำเข้าข้อมูล (${matchCount} รายชื่อ)`;
      }
    } catch(err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการอ่านไฟล์ Excel กรุณาตรวจสอบว่าเลือกเทมเพลตที่ถูกต้อง', 'error');
      clearSelectedImportFile();
    }
  };
  reader.readAsArrayBuffer(file);
}
