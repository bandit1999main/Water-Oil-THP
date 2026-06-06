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
let activeMode = 'fuel'; // 'fuel', 'water', or 'personnel'
let cloudSyncStarted = false;
let waterEmployees = JSON.parse(localStorage.getItem('tp_water_employees')) || [];
let personnel = JSON.parse(localStorage.getItem('tp_personnel')) || [];
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

// State Store
let employees = JSON.parse(localStorage.getItem('tp_employees')) || [];
let oilPricePeriods = [];
let tempMissions = []; // temporary missions list for current supervisor input

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

// Tabs
const tabStandard = document.getElementById('tabStandard');
const tabSupervisor = document.getElementById('tabSupervisor');
const globalConfigsCard = document.getElementById('globalConfigsCard');

// Supervisor Mission inputs
const supervisorMissionSection = document.getElementById('supervisorMissionSection');
const missionTypeSelect = document.getElementById('missionType');
const missionRouteSelect = document.getElementById('missionRoute');
const missionDaysInput = document.getElementById('missionDays');
const missionDatesInput = document.getElementById('missionDates');
const addMissionBtn = document.getElementById('addMissionBtn');
const missionTableBody = document.getElementById('missionTableBody');
const positionRouteRow = document.getElementById('positionRouteRow');
const deliveryRouteGroup = document.getElementById('deliveryRouteGroup');

// Live Route Stats Preview
const prevDistDay = document.getElementById('prevDistDay');
const prevFuelDay = document.getElementById('prevFuelDay');
const prevDistMonth = document.getElementById('prevDistMonth');
const prevFuelMonth = document.getElementById('prevFuelMonth');

// Summary Counters
const sumFuelCostSpan = document.getElementById('sumFuelCost');
const sumMaintenanceCostSpan = document.getElementById('sumMaintenanceCost');
const sumTotalCostSpan = document.getElementById('sumTotalCost');

// Weighted Avg Modal Elements
const avgCalcModal = document.getElementById('avgCalcModal');
const openAvgCalcBtn = document.getElementById('openAvgCalcBtn');
const closeAvgModalBtn = document.getElementById('closeAvgModalBtn');
const cancelAvgBtn = document.getElementById('cancelAvgBtn');
const applyAvgPriceBtn = document.getElementById('applyAvgPriceBtn');
const addPeriodBtn = document.getElementById('addPeriodBtn');
const priceInput = document.getElementById('priceInput');
const daysInput = document.getElementById('daysInput');
const periodTableBody = document.getElementById('periodTableBody');
const avgCalcTotalDays = document.getElementById('avgCalcTotalDays');
const avgCalcTotalSum = document.getElementById('avgCalcTotalSum');
const avgCalcResultPrice = document.getElementById('avgCalcResultPrice');

// Mode Switch & Water Calculator DOM Elements
const modeFuelBtn = document.getElementById('modeFuelBtn');
const modeWaterBtn = document.getElementById('modeWaterBtn');
const modePersonnelBtn = document.getElementById('modePersonnelBtn');
const salaryGroup = document.getElementById('salaryGroup');
const empSalaryInput = document.getElementById('empSalary');
const empNameSelect = document.getElementById('empNameSelect');

// Personnel Management DOM Elements
const personnelCard = document.getElementById('personnelCard');
const personnelForm = document.getElementById('personnelForm');
const personnelTableBody = document.getElementById('personnelTableBody');
const personnelTableCard = document.getElementById('personnelTableCard');
const personnelEditIndexInput = document.getElementById('personnelEditIndex');
const personNameInput = document.getElementById('personName');
const personPositionSelect = document.getElementById('personPosition');
const personDutySelect = document.getElementById('personDuty');
const personSalaryInput = document.getElementById('personSalary');
const personRouteSelect = document.getElementById('personRoute');
const personVehicleSelect = document.getElementById('personVehicle');
const personSignatureInput = document.getElementById('personSignature');
const resetPersonnelBtn = document.getElementById('resetPersonnelBtn');
const personDepartmentSelect = document.getElementById('personDepartment');
const personDepartmentCustomGroup = document.getElementById('personDepartmentCustomGroup');
const personDepartmentCustomInput = document.getElementById('personDepartmentCustom');

// Other Button Actions
const loadDemoBtn = document.getElementById('loadDemoBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const printReportBtn = document.getElementById('printReportBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const sunIcon = document.getElementById('sunIcon');
const moonIcon = document.getElementById('moonIcon');

// Excel Import Modal DOM Elements
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
let tempParsedRecords = [];

// Personnel Import Modal DOM Elements
const importPersonnelBtn = document.getElementById('importPersonnelBtn');
const personnelImportModal = document.getElementById('personnelImportModal');
const closePersonnelImportModalBtn = document.getElementById('closePersonnelImportModalBtn');
const cancelPersonnelImportBtn = document.getElementById('cancelPersonnelImportBtn');
const submitPersonnelImportBtn = document.getElementById('submitPersonnelImportBtn');
const personnelImportPastedText = document.getElementById('personnelImportPastedText');
const personnelImportPreviewTableBody = document.getElementById('personnelImportPreviewTableBody');
const downloadPersonnelTemplateBtn = document.getElementById('downloadPersonnelTemplateBtn');
const tabPersonnelImportFile = document.getElementById('tabPersonnelImportFile');
const tabPersonnelImportText = document.getElementById('tabPersonnelImportText');
const personnelImportFileContent = document.getElementById('personnelImportFileContent');
const personnelImportTextContent = document.getElementById('personnelImportTextContent');
const personnelDragDropZone = document.getElementById('personnelDragDropZone');
const personnelFileSelector = document.getElementById('personnelFileSelector');
const personnelSelectedFileInfo = document.getElementById('personnelSelectedFileInfo');
const personnelFileNameLabel = document.getElementById('personnelFileNameLabel');
const clearSelectedPersonnelFileBtn = document.getElementById('clearSelectedPersonnelFileBtn');
let tempParsedPersonnelRecords = [];

// Saved Templates Manager DOM Elements
const templateNameInput = document.getElementById('templateNameInput');
const saveTemplateBtn = document.getElementById('saveTemplateBtn');
const templateSelect = document.getElementById('templateSelect');
const loadTemplateBtn = document.getElementById('loadTemplateBtn');
const deleteTemplateBtn = document.getElementById('deleteTemplateBtn');

// Route Editor Modal DOM Elements
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

/* --- UI UTILITIES: TOAST & CONFIRM --- */

/**
 * showToast(message, type, duration)
 * type: 'success' | 'error' | 'warning' | 'info'
 */
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

/**
 * showConfirm({ title, message, icon, okText, okClass, onConfirm })
 * Returns nothing – executes onConfirm() callback asynchronously when user clicks OK
 */
function showConfirm({ title = 'ยืนยัน', message = '', icon = '⚠️', okText = 'ยืนยัน', okClass = 'btn-danger', onConfirm }) {
  const modal        = document.getElementById('confirmModal');
  const titleEl      = document.getElementById('confirmModalTitle');
  const msgEl        = document.getElementById('confirmModalMsg');
  const iconEl       = document.getElementById('confirmModalIcon');
  const okBtn        = document.getElementById('confirmModalOk');
  const cancelBtn    = document.getElementById('confirmModalCancel');

  titleEl.textContent = title;
  msgEl.textContent   = message;
  iconEl.textContent  = icon;
  okBtn.textContent   = okText;
  okBtn.className     = `btn ${okClass}`;
  modal.classList.add('active');

  const cleanup = () => modal.classList.remove('active');

  const okHandler = () => { cleanup(); onConfirm && onConfirm(); };
  const cancelHandler = () => cleanup();

  // Remove old listeners before adding new ones
  okBtn.replaceWith(okBtn.cloneNode(true));
  cancelBtn.replaceWith(cancelBtn.cloneNode(true));
  document.getElementById('confirmModalOk').addEventListener('click', okHandler, { once: true });
  document.getElementById('confirmModalCancel').addEventListener('click', cancelHandler, { once: true });
  modal.addEventListener('click', (e) => { if (e.target === modal) cleanup(); }, { once: true });
}

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
    personRouteSelect.appendChild(opt3);

    const opt4 = document.createElement('option');
    opt4.value = route;
    opt4.textContent = `ด้านจ่ายที่ ${route}${ROUTE_DATA[route].hasCar ? ' (รถยนต์)' : ''}`;
    document.getElementById('modalPersonRoute').appendChild(opt4);
  });

  // Load Saved Theme
  if (localStorage.getItem('tp_theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    sunIcon.classList.add('hidden');
    moonIcon.classList.remove('hidden');
  }

  // Bind Events
  themeToggleBtn.addEventListener('click', toggleTheme);
  modeFuelBtn.addEventListener('click', () => switchAppMode('fuel'));
  modeWaterBtn.addEventListener('click', () => switchAppMode('water'));
  modePersonnelBtn.addEventListener('click', () => switchAppMode('personnel'));
  if (document.getElementById('modeAdminBtn')) {
    document.getElementById('modeAdminBtn').addEventListener('click', () => switchAppMode('admin'));
  }
  deliveryRouteSelect.addEventListener('change', handleRouteSelect);
  empPositionSelect.addEventListener('change', handlePositionSelect);
  document.getElementById('isSubstitute').addEventListener('change', handlePositionSelect);
  claimMethodSelect.addEventListener('change', handleClaimMethodSelect);
  employeeForm.addEventListener('submit', handleFormSubmit);
  resetBtn.addEventListener('click', cancelEdit);
  
  personnelForm.addEventListener('submit', handlePersonnelFormSubmit);
  resetPersonnelBtn.addEventListener('click', cancelPersonnelEdit);

  const checkDuplicatesBtn = document.getElementById('checkDuplicatesBtn');
  if (checkDuplicatesBtn) {
    checkDuplicatesBtn.addEventListener('click', scanForDuplicateNames);
  }

  const closeScanModalBtn = document.getElementById('closeDuplicateScanModalBtn');
  const closeScanBtn = document.getElementById('closeDuplicateScanBtn');
  const scanModal = document.getElementById('duplicateScanModal');
  const closeScanActions = () => scanModal.classList.remove('active');
  if (closeScanModalBtn) closeScanModalBtn.onclick = closeScanActions;
  if (closeScanBtn) closeScanBtn.onclick = closeScanActions;
  
  personDepartmentSelect.addEventListener('change', () => {
    if (personDepartmentSelect.value === 'custom') {
      personDepartmentCustomGroup.classList.remove('hidden');
    } else {
      personDepartmentCustomGroup.classList.add('hidden');
    }
  });
  empNameSelect.addEventListener('change', handleEmpNameSelectChange);
  empNameSelect.addEventListener('input', handleEmpNameSelectChange);

  // Tab Events
  tabStandard.addEventListener('click', () => switchFormMode('standard'));
  tabSupervisor.addEventListener('click', () => switchFormMode('supervisor'));

  // Supervisor Mission Events
  addMissionBtn.addEventListener('click', addSupervisorMission);

  // Modal Events
  openAvgCalcBtn.addEventListener('click', () => {
    avgCalcModal.classList.add('active');
    renderPeriodTable();
  });
  closeAvgModalBtn.addEventListener('click', () => avgCalcModal.classList.remove('active'));
  cancelAvgBtn.addEventListener('click', () => avgCalcModal.classList.remove('active'));
  addPeriodBtn.addEventListener('click', addPricePeriod);
  applyAvgPriceBtn.addEventListener('click', applyAvgPriceToGlobal);

  // Attendance Import Modal Events
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

  // Tab switching inside import modal
  tabImportFile.addEventListener('click', () => switchImportTab('file'));
  tabImportText.addEventListener('click', () => switchImportTab('text'));

  // Drag & drop / File selection
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
  // Personnel Import Modal Events
  const btnImportPersonnel = document.getElementById('importPersonnelBtn');
  const modalPersonnelImport = document.getElementById('personnelImportModal');
  const btnClosePersonnelImportModal = document.getElementById('closePersonnelImportModalBtn');
  const btnCancelPersonnelImport = document.getElementById('cancelPersonnelImportBtn');
  const txtPersonnelImportPasted = document.getElementById('personnelImportPastedText');
  const btnSubmitPersonnelImport = document.getElementById('submitPersonnelImportBtn');
  const btnDownloadPersonnelTemplate = document.getElementById('downloadPersonnelTemplateBtn');
  const btnTabPersonnelImportFile = document.getElementById('tabPersonnelImportFile');
  const btnTabPersonnelImportText = document.getElementById('tabPersonnelImportText');
  const zonePersonnelDragDrop = document.getElementById('personnelDragDropZone');
  const selPersonnelFile = document.getElementById('personnelFileSelector');
  const btnClearSelectedPersonnelFile = document.getElementById('clearSelectedPersonnelFileBtn');

  if (btnImportPersonnel) {
    btnImportPersonnel.addEventListener('click', openPersonnelImportModal);
  }
  if (btnClosePersonnelImportModal) {
    btnClosePersonnelImportModal.addEventListener('click', () => modalPersonnelImport.classList.remove('active'));
  }
  if (btnCancelPersonnelImport) {
    btnCancelPersonnelImport.addEventListener('click', () => modalPersonnelImport.classList.remove('active'));
  }
  if (txtPersonnelImportPasted) {
    txtPersonnelImportPasted.addEventListener('input', handlePersonnelPaste);
    txtPersonnelImportPasted.addEventListener('paste', handlePersonnelPaste);
  }
  if (btnSubmitPersonnelImport) {
    btnSubmitPersonnelImport.addEventListener('click', handleConfirmPersonnelImport);
  }
  if (btnDownloadPersonnelTemplate) {
    btnDownloadPersonnelTemplate.addEventListener('click', downloadPersonnelTemplateXlsx);
  }

  // Tab switching inside personnel import modal
  if (btnTabPersonnelImportFile) {
    btnTabPersonnelImportFile.addEventListener('click', () => switchPersonnelImportTab('file'));
  }
  if (btnTabPersonnelImportText) {
    btnTabPersonnelImportText.addEventListener('click', () => switchPersonnelImportTab('text'));
  }

  // Drag & drop / File selection for personnel import
  if (zonePersonnelDragDrop) {
    zonePersonnelDragDrop.addEventListener('click', () => selPersonnelFile.click());
  }
  if (selPersonnelFile) {
    selPersonnelFile.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        processUploadedPersonnelFile(e.target.files[0]);
      }
    });
  }
  if (zonePersonnelDragDrop) {
    zonePersonnelDragDrop.addEventListener('dragover', (e) => {
      e.preventDefault();
      zonePersonnelDragDrop.style.borderColor = 'var(--post-orange)';
      zonePersonnelDragDrop.style.background = 'rgba(245, 158, 11, 0.05)';
    });
    zonePersonnelDragDrop.addEventListener('dragleave', () => {
      zonePersonnelDragDrop.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      zonePersonnelDragDrop.style.background = 'rgba(16, 185, 129, 0.02)';
    });
    zonePersonnelDragDrop.addEventListener('drop', (e) => {
      e.preventDefault();
      zonePersonnelDragDrop.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      zonePersonnelDragDrop.style.background = 'rgba(16, 185, 129, 0.02)';
      if (e.dataTransfer.files.length > 0) {
        selPersonnelFile.files = e.dataTransfer.files;
        processUploadedPersonnelFile(e.dataTransfer.files[0]);
      }
    });
  }
  if (btnClearSelectedPersonnelFile) {
    btnClearSelectedPersonnelFile.addEventListener('click', clearSelectedPersonnelImportFile);
  }

  // Table Batch Actions
  loadDemoBtn.addEventListener('click', loadDemoData);
  exportCsvBtn.addEventListener('click', exportToCsv);
  printReportBtn.addEventListener('click', printReport);
  clearAllBtn.addEventListener('click', clearAllData);

  // Saved Templates Events
  saveTemplateBtn.addEventListener('click', saveCurrentListAsTemplate);
  loadTemplateBtn.addEventListener('click', loadSelectedTemplate);
  deleteTemplateBtn.addEventListener('click', deleteSelectedTemplate);
  updateTemplateSelectDropdown();

  // Setup live changes
  globalFuelPriceInput.addEventListener('change', () => {
    recalculateTableCosts();
    if (activeMode === 'fuel') {
      saveGlobalSetting('fuelPrice', { value: parseFloat(globalFuelPriceInput.value) || 38.50 });
    }
  });

  globalMonthSelect.addEventListener('change', () => {
    if (activeMode === 'fuel') {
      saveGlobalSetting('fuelMonth', { value: parseInt(globalMonthSelect.value) || 5 });
    } else if (activeMode === 'water') {
      saveGlobalSetting('waterMonth', { value: parseInt(globalMonthSelect.value) || 5 });
    }
  });

  globalYearSelect.addEventListener('input', () => {
    const val = parseInt(globalYearSelect.value);
    if (val >= 2500 && val <= 3000) {
      if (activeMode === 'fuel') {
        saveGlobalSetting('fuelYear', { value: val });
      } else if (activeMode === 'water') {
        saveGlobalSetting('waterYear', { value: val });
      }
    }
  });

  globalYearSelect.addEventListener('change', () => {
    const val = parseInt(globalYearSelect.value) || 2569;
    if (activeMode === 'fuel') {
      saveGlobalSetting('fuelYear', { value: val });
    } else if (activeMode === 'water') {
      saveGlobalSetting('waterYear', { value: val });
    }
  });

  if (globalPostOfficeNameInput) {
    globalPostOfficeNameInput.addEventListener('change', () => {
      saveGlobalSetting('postOfficeName', { value: globalPostOfficeNameInput.value.trim() || 'มาบตาพุด' });
    });
  }

  // Populate Route Editor Dropdown
  Object.keys(ROUTE_DATA).forEach(route => {
    const opt = document.createElement('option');
    opt.value = route;
    opt.textContent = `ด้านจ่ายที่ ${route}`;
    editRouteSelect.appendChild(opt);
  });

  // Bind Route Editor Events
  openRouteEditorBtn.addEventListener('click', openRouteEditor);
  closeRouteEditorModalBtn.addEventListener('click', () => routeEditorModal.classList.remove('active'));
  closeRouteEditorBtn.addEventListener('click', () => routeEditorModal.classList.remove('active'));
  editRouteSelect.addEventListener('change', loadSelectedRouteToEditorForm);
  saveSingleRouteBtn.addEventListener('click', saveSingleRouteSettings);
  resetAllRoutesBtn.addEventListener('click', resetRouteDataDefaults);
  
  // Bind Signatory editor events
  toggleSigEditBtn.addEventListener('click', toggleSignatoryInputsLock);
  
  // Bind Signatory Profile Modal Events
  const sigProfilesModal = document.getElementById('sigProfilesModal');
  const openSigProfilesBtn = document.getElementById('openSigProfilesBtn');
  const closeSigProfilesModalBtn = document.getElementById('closeSigProfilesModalBtn');
  const closeSigProfilesBtn = document.getElementById('closeSigProfilesBtn');
  const saveSigProfileBtn = document.getElementById('saveSigProfileBtn');

  openSigProfilesBtn.addEventListener('click', openSigProfiles);
  closeSigProfilesModalBtn.addEventListener('click', () => sigProfilesModal.classList.remove('active'));
  closeSigProfilesBtn.addEventListener('click', () => sigProfilesModal.classList.remove('active'));
  saveSigProfileBtn.addEventListener('click', handleSaveSigProfile);

  const employeeSearchInput = document.getElementById('employeeSearchInput');
  const personnelSearchInput = document.getElementById('personnelSearchInput');

  if (employeeSearchInput) {
    employeeSearchInput.addEventListener('input', debounce((e) => {
      employeeSearchQuery = e.target.value.toLowerCase().trim();
      renderEmployeeTable();
    }, 150));
  }

  if (personnelSearchInput) {
    personnelSearchInput.addEventListener('input', debounce((e) => {
      personnelSearchQuery = e.target.value.toLowerCase().trim();
      renderPersonnelTable();
    }, 150));
  }

  // Firebase Auth DOM bindings and Event Listeners
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  const googleSignupBtn = document.getElementById('googleSignupBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const authOverlay = document.getElementById('authOverlay');
  const userProfileWidget = document.getElementById('userProfileWidget');
  const userAvatar = document.getElementById('userAvatar');
  const userDisplayName = document.getElementById('userDisplayName');
  const userRoleBadge = document.getElementById('userRoleBadge');
  const switchToSignupLink = document.getElementById('switchToSignupLink');
  const switchToLoginLink = document.getElementById('switchToLoginLink');
  const pendingLogoutBtn = document.getElementById('pendingLogoutBtn');
  const pendingUserEmail = document.getElementById('pendingUserEmail');

  const modeAdminBtn = document.getElementById('modeAdminBtn');
  const authLoadingState = document.getElementById('authLoadingState');
  const authLoginState = document.getElementById('authLoginState');
  const authSignupState = document.getElementById('authSignupState');
  const authPendingState = document.getElementById('authPendingState');

  if (switchToSignupLink) {
    switchToSignupLink.addEventListener('click', (e) => {
      e.preventDefault();
      sessionStorage.setItem('thp_auth_action', 'signup');
      showSignupState();
    });
  }

  if (switchToLoginLink) {
    switchToLoginLink.addEventListener('click', (e) => {
      e.preventDefault();
      sessionStorage.setItem('thp_auth_action', 'login');
      showLoginState();
    });
  }

  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
      googleLoginBtn.disabled = true;
      googleLoginBtn.textContent = '⏳ กำลังเข้าสู่ระบบ...';
      try {
        sessionStorage.setItem('thp_auth_action', 'login');
        await loginWithGoogle();
      } catch (err) {
        showToast('การล็อกอินล้มเหลว: ' + (err.message || err.code), 'error');
        googleLoginBtn.disabled = false;
        googleLoginBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
        </svg> ลงชื่อเข้าใช้ด้วย Google`;
      }
    });
  }

  if (googleSignupBtn) {
    googleSignupBtn.addEventListener('click', async () => {
      googleSignupBtn.disabled = true;
      googleSignupBtn.textContent = '⏳ กำลังขอลงทะเบียน...';
      try {
        sessionStorage.setItem('thp_auth_action', 'signup');
        await loginWithGoogle();
      } catch (err) {
        showToast('การลงทะเบียนล้มเหลว: ' + (err.message || err.code), 'error');
        googleSignupBtn.disabled = false;
        googleSignupBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
        </svg> ลงทะเบียนด้วย Google`;
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await logoutUser();
        showToast('ออกจากระบบแล้ว', 'info');
      } catch (err) {
        showToast('การออกจากระบบล้มเหลว', 'error');
      }
    });
  }

  // Pending Logout button
  if (pendingLogoutBtn) {
    pendingLogoutBtn.addEventListener('click', async () => {
      await logoutUser();
    });
  }

  // Track live user profile subscription to unsubscribe when needed
  let unsubUserProfile = null;

  function showLoadingState() {
    authOverlay.classList.add('active');
    if (authLoadingState) authLoadingState.classList.remove('hidden');
    if (authLoginState) authLoginState.classList.add('hidden');
    if (authSignupState) authSignupState.classList.add('hidden');
    if (authPendingState) authPendingState.classList.add('hidden');
    userProfileWidget.classList.add('hidden');
  }

  function showLoginState() {
    authOverlay.classList.add('active');
    if (authLoadingState) authLoadingState.classList.add('hidden');
    if (authLoginState) authLoginState.classList.remove('hidden');
    if (authSignupState) authSignupState.classList.add('hidden');
    if (authPendingState) authPendingState.classList.add('hidden');
    userProfileWidget.classList.add('hidden');
    enableWriteActions(false);
    if (modeAdminBtn) modeAdminBtn.classList.add('hidden');
    cloudSyncStarted = false; // รีเซ็ตสถานะ sync เมื่อออกจากระบบ
  }

  function showSignupState() {
    authOverlay.classList.add('active');
    if (authLoadingState) authLoadingState.classList.add('hidden');
    if (authLoginState) authLoginState.classList.add('hidden');
    if (authSignupState) authSignupState.classList.remove('hidden');
    if (authPendingState) authPendingState.classList.add('hidden');
    userProfileWidget.classList.add('hidden');
    enableWriteActions(false);
    if (modeAdminBtn) modeAdminBtn.classList.add('hidden');
  }

  function showPendingState(user) {
    authOverlay.classList.add('active');
    if (authLoadingState) authLoadingState.classList.add('hidden');
    if (authLoginState) authLoginState.classList.add('hidden');
    if (authSignupState) authSignupState.classList.add('hidden');
    if (authPendingState) authPendingState.classList.remove('hidden');
    if (pendingUserEmail) pendingUserEmail.textContent = user.email || '-';
    userProfileWidget.classList.remove('hidden');
    userAvatar.src = user.photoURL || 'https://www.gravatar.com/avatar/?d=mp';
    userDisplayName.textContent = user.displayName || user.email;
    userRoleBadge.textContent = '⏳ รอการอนุมัติ';
    userRoleBadge.style.color = 'var(--post-orange)';
    enableWriteActions(false);
    if (modeAdminBtn) modeAdminBtn.classList.add('hidden');
  }

  function showApprovedState(user, profileData) {
    authOverlay.classList.remove('active');
    if (authLoadingState) authLoadingState.classList.add('hidden');
    if (authLoginState) authLoginState.classList.remove('hidden');
    if (authSignupState) authSignupState.classList.add('hidden');
    if (authPendingState) authPendingState.classList.add('hidden');
    userProfileWidget.classList.remove('hidden');
    userAvatar.src = user.photoURL || 'https://www.gravatar.com/avatar/?d=mp';
    userDisplayName.textContent = user.displayName || user.email;

    const isAdmin = checkIsAdmin(user) || profileData?.role === 'admin';
    if (isAdmin) {
      userRoleBadge.textContent = 'Admin';
      userRoleBadge.style.color = 'var(--post-emerald)';
      enableWriteActions(true);
      if (modeAdminBtn) modeAdminBtn.classList.remove('hidden');
    } else {
      userRoleBadge.textContent = 'User (Read-Only)';
      userRoleBadge.style.color = 'var(--text-secondary)';
      enableWriteActions(false);
      if (modeAdminBtn) modeAdminBtn.classList.add('hidden');
    }

    // เริ่มการ Sync Cloud ข้อมูลเฉพาะเมื่อได้รับการอนุมัติและเข้าใช้งานระบบได้แล้วเท่านั้น
    if (!cloudSyncStarted) {
      cloudSyncStarted = true;
      initCloudSync();
    }
  }

  // Show loading state initially on page load to prevent layout shift (pre-login screen flash)
  showLoadingState();

  // Process redirect sign-in result on page load
  getGoogleRedirectResult().then(async (user) => {
    if (user) {
      console.log("✅ Redirect sign-in successful:", user.email);
    }
  }).catch((err) => {
    console.error("❌ Redirect sign-in check completed with error (safe to ignore if already logged in):", err);
  });

  // Observe Authentication status changes
  listenToAuthState(async (user) => {
    // Unsubscribe old profile listener if any
    if (unsubUserProfile) {
      unsubUserProfile();
      unsubUserProfile = null;
    }

    if (user) {
      const authActionMode = sessionStorage.getItem('thp_auth_action') || 'login';
      const isMainAdmin = checkIsAdmin(user);

      if (isMainAdmin) {
        // แอดมินหลักเข้าใช้งานได้เสมอและทำการอัปเดตข้อมูลอัตโนมัติ
        await registerUserMetadata(user);
        userProfileWidget.classList.remove('hidden');
        userAvatar.src = user.photoURL || 'https://www.gravatar.com/avatar/?d=mp';
        userDisplayName.textContent = user.displayName || user.email;
        showApprovedState(user, { role: 'admin' });
        showToast(`ยินดีต้อนรับแอดมิน ${user.displayName || ''}!`, 'success');
        return;
      }

      // ตรวจสอบความมีตัวตนของสิทธิ์ใน Firestore
      const exists = await checkUserExists(user.uid);

      if (authActionMode === 'login') {
        if (!exists) {
          // หากต้องการ LOGIN แต่ไม่มีบัญชีในระบบ ให้ logout ทันทีและปฏิเสธสิทธิ์
          console.warn(`❌ Login blocked: User ${user.email} not registered.`);
          showToast("❌ ไม่พบบัญชีผู้ใช้นี้ในระบบ กรุณาทำการลงทะเบียนก่อนเข้าสู่ระบบ", "error");
          await logoutUser();
          showLoginState();
          return;
        }
        // อัปเดตข้อมูลผู้ใช้เดิม
        await registerUserMetadata(user);
      } else if (authActionMode === 'signup') {
        if (!exists) {
          // หากต้องการ SIGNUP และเป็นเมลใหม่ ให้สร้างข้อมูลลง Firestore รออนุมัติ
          console.log(`🆕 Registering new user via signup flow: ${user.email}`);
          await registerUserMetadata(user);
          showToast("ลงทะเบียนสำเร็จ! กรุณารอผู้ดูแลระบบอนุมัติการใช้งาน", "success");
        } else {
          // หากลงทะเบียนซ้ำ ให้นำเข้าระบบเลย
          await registerUserMetadata(user);
          showToast("บัญชีนี้เคยลงทะเบียนไว้แล้ว นำเข้าสู่ระบบอัตโนมัติ", "info");
        }
      }

      userProfileWidget.classList.remove('hidden');
      userAvatar.src = user.photoURL || 'https://www.gravatar.com/avatar/?d=mp';
      userDisplayName.textContent = user.displayName || user.email;

      // ติดตามข้อมูลสิทธิ์ผู้ใช้งานแบบเรียลไทม์
      unsubUserProfile = listenToUserProfile(user.uid, (profileData) => {
        if (!profileData) {
          showPendingState(user);
          return;
        }

        if (profileData.approved === true) {
          const wasJustApproved = authOverlay.classList.contains('active') && !authLoadingState.classList.contains('hidden');
          showApprovedState(user, profileData);
          if (wasJustApproved) {
            showToast(`✅ ได้รับการอนุมัติแล้ว! ยินดีต้อนรับ ${user.displayName || ''}`, 'success');
          }
        } else {
          showPendingState(user);
        }
      });

    } else {
      // Logged Out state
      const authActionMode = sessionStorage.getItem('thp_auth_action') || 'login';
      if (authActionMode === 'signup') {
        showSignupState();
      } else {
        showLoginState();
      }
    }
  });

  // Helper to toggle admin write access in UI
  function enableWriteActions(enable) {
    const inputs = [
      document.getElementById('saveBtn'),
      document.getElementById('resetBtn'),
      document.getElementById('importExcelAttendanceBtn'),
      document.getElementById('importPersonnelBtn'),
      document.getElementById('saveTemplateBtn'),
      document.getElementById('deleteTemplateBtn'),
      document.getElementById('saveSigProfileBtn')
    ];
    inputs.forEach(btn => {
      if (btn) {
        btn.disabled = !enable;
        if (!enable) {
          btn.style.opacity = '0.5';
          btn.style.cursor = 'not-allowed';
        } else {
          btn.style.opacity = '1';
          btn.style.cursor = 'pointer';
        }
      }
    });
  }

  wireEditModal();
  wireRegistryEditModal();

  // Render Table (Initial offline load)
  renderEmployeeTable();
  updateEmployeeSelectDropdown();
  // initCloudSync will be called only after user is authenticated & approved
});

/* --- CLOUD SYNC INITIALIZER --- */
async function initCloudSync() {
  const badge = document.getElementById('dbStatusBadge');
  if (!badge) return;

  try {
    if (isCloudConnected()) {
      badge.className = 'db-status-badge connected';
      badge.querySelector('.status-text').textContent = '🔥 เชื่อมต่อคลาวด์แล้ว';
      
      // Fetch cloud employees (initial load)
      const cloudEmployees = await fetchEmployees();
      if (cloudEmployees && cloudEmployees.length > 0) {
        employees = cloudEmployees;
      }
      
      // Fetch cloud water employees (initial load)
      const cloudWaterEmployees = await fetchWaterEmployees();
      if (cloudWaterEmployees && cloudWaterEmployees.length > 0) {
        waterEmployees = cloudWaterEmployees;
      }

      // Fetch cloud personnel list (initial load)
      const cloudPersonnel = await fetchPersonnelList();
      if (cloudPersonnel && cloudPersonnel.length > 0) {
        personnel = cloudPersonnel;
      }
      
      // Fetch cloud route data
      const cloudRouteData = await fetchRouteData();
      if (cloudRouteData) {
        ROUTE_DATA = cloudRouteData;
      }
      
      // Fetch global settings
      const globalSettings = await fetchGlobalSettings();
      if (activeMode === 'fuel') {
        if (globalSettings.fuelPrice) globalFuelPriceInput.value = globalSettings.fuelPrice.value;
        if (globalSettings.fuelMonth) globalMonthSelect.value = globalSettings.fuelMonth.value;
        if (globalSettings.fuelYear) globalYearSelect.value = globalSettings.fuelYear.value;
      } else if (activeMode === 'water') {
        if (globalSettings.waterMonth) globalMonthSelect.value = globalSettings.waterMonth.value;
        if (globalSettings.waterYear) globalYearSelect.value = globalSettings.waterYear.value;
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

      // Populate templates
      await fetchSavedTemplates();
      
      // Re-populate dropdowns and re-render with cloud data
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
        if (activeMode === 'personnel') renderPersonnelTable();
        else updateEmployeeSelectDropdown();
      });

      listenToUsers((updatedUsers) => {
        appUsersList = updatedUsers;
        if (activeMode === 'admin') renderAdminUsersTable();
      });

      listenToGlobalSettings((updatedSettings) => {
        if (activeMode === 'fuel') {
          if (updatedSettings.fuelPrice && globalFuelPriceInput.value !== String(updatedSettings.fuelPrice.value)) {
            globalFuelPriceInput.value = updatedSettings.fuelPrice.value;
            recalculateTableCosts();
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
    console.error("Cloud connection/sync failed:", err);
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

/* --- APP MODE SWITCHER (FUEL vs WATER) --- */
async function switchAppMode(mode) {
  activeMode = mode;
  document.documentElement.setAttribute('data-mode', mode);
  
  const headerBrandTitle = document.getElementById('headerBrandTitle');
  const headerBrandSubtitle = document.getElementById('headerBrandSubtitle');
  const welcomeHeadingH2 = document.querySelector('.welcome-heading h2');
  const welcomeHeadingP = document.querySelector('.welcome-heading p');
  const sumFuelCostLabel = document.querySelector('.metric-card.bg-orange-glow h3');
  const sumMaintCostLabel = document.querySelector('.metric-card.bg-blue-glow h3');
  const sumTotalCostLabel = document.querySelector('.metric-card.bg-emerald-glow h3');
  const tableTitle = document.querySelector('#mainTableCard .table-header-flex h3');
  
  // Toggle Card/Table Visibility based on mode
  if (mode === 'admin') {
    calculationFormCard.classList.add('hidden');
    mainTableCard.classList.add('hidden');
    document.querySelector('.metrics-grid').classList.add('hidden');
    personnelCard.classList.add('hidden');
    personnelTableCard.classList.add('hidden');
    globalConfigsCard.classList.add('hidden'); // Hide for Admin
    
    document.getElementById('adminTableCard').classList.remove('hidden');
    
    // Buttons styling
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
    
    renderAdminUsersTable();
  } else if (mode === 'personnel') {
    calculationFormCard.classList.add('hidden');
    mainTableCard.classList.add('hidden');
    document.querySelector('.metrics-grid').classList.add('hidden');
    document.getElementById('adminTableCard').classList.add('hidden');
    globalConfigsCard.classList.add('hidden'); // Hide for Personnel
    
    personnelCard.classList.remove('hidden');
    personnelTableCard.classList.remove('hidden');
    
    // Buttons styling
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
    
    cancelPersonnelEdit();
    if (isCloudConnected()) {
      try {
        personnel = await fetchPersonnelList();
      } catch (err) {
        console.error("Error fetching personnel:", err);
      }
    }
    renderPersonnelTable();
  } else {
    // Show calculation panels, hide personnel panels
    calculationFormCard.classList.remove('hidden');
    mainTableCard.classList.remove('hidden');
    document.querySelector('.metrics-grid').classList.remove('hidden');
    globalConfigsCard.classList.remove('hidden'); // Show for Fuel / Water calculations
    
    personnelCard.classList.add('hidden');
    personnelTableCard.classList.add('hidden');
    document.getElementById('adminTableCard').classList.add('hidden');
    
    modePersonnelBtn.style.background = 'transparent';
    modePersonnelBtn.style.color = 'var(--text-secondary)';
    modeAdminBtn.style.background = 'transparent';
    modeAdminBtn.style.color = 'var(--text-secondary)';
    
    updateEmployeeSelectDropdown();
    
    if (mode === 'fuel') {
      // Buttons styling
      modeFuelBtn.style.background = 'var(--post-orange)';
      modeFuelBtn.style.color = 'white';
      modeWaterBtn.style.background = 'transparent';
      modeWaterBtn.style.color = 'var(--text-secondary)';
      
      // Header texts
      if (headerBrandSubtitle) headerBrandSubtitle.textContent = 'Thailand Post Fuel Engine v2.5';
      if (welcomeHeadingH2) welcomeHeadingH2.textContent = 'ระบบคำนวณค่าน้ำมัน & ค่าบำรุงรักษาประจำที่ทำการ / ปณ.';
      if (welcomeHeadingP) welcomeHeadingP.textContent = 'คำนวณค่าน้ำมันพนักงาน นำจ่ายแทน และภารกิจตรวจการนำจ่ายของหัวหน้าโซน (ชนจ.) อัตโนมัติในระบบเดียว';
      
      // Form & Tab configs
      document.querySelector('.auth-tabs').style.display = 'flex';
      document.getElementById('positionRouteRow').classList.remove('hidden');
      document.getElementById('deliveryRouteGroup').classList.remove('hidden');
      document.getElementById('claimMethodGroup').classList.remove('hidden');
      document.getElementById('workDaysRow').classList.remove('hidden');
      document.getElementById('daysNotWorkedGroup').classList.remove('hidden');
      salaryGroup.classList.add('hidden');
      deliveryRouteSelect.setAttribute('required', 'true');
      
      // Reset position dropdown to standard
      empPositionSelect.innerHTML = `
        <option value="หน.ปณ.">หน.ปณ.</option>
        <option value="พนักงาน">พนักงาน</option>
        <option value="ลูกจ้างประจำ">ลูกจ้างประจำ</option>
        <option value="ลูกจ้าง">ลูกจ้าง</option>
        <option value="ลูกจ้างเหมา">ลูกจ้างเหมา</option>
      `;
      
      // Metric Card Texts
      if (sumFuelCostLabel) sumFuelCostLabel.textContent = 'ค่าน้ำมันเชื้อเพลิงรวม';
      if (sumMaintCostLabel) sumMaintCostLabel.textContent = 'ค่าบำรุงรักษารวม';
      if (sumTotalCostLabel) sumTotalCostLabel.textContent = 'ยอดเงินเบิกจ่ายรวมสุทธิ';
      
      // Table Configs
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
      // Water Mode
      modeWaterBtn.style.background = 'var(--post-orange)';
      modeWaterBtn.style.color = 'white';
      modeFuelBtn.style.background = 'transparent';
      modeFuelBtn.style.color = 'var(--text-secondary)';
      
      // Header texts
      if (headerBrandSubtitle) headerBrandSubtitle.textContent = 'Thailand Post Drinking Water Engine v1.0';
      if (welcomeHeadingH2) welcomeHeadingH2.textContent = 'ระบบคำนวณค่าน้ำดื่มเจ้าหน้าที่ปฏิบัติงานภายนอกที่ทำการ';
      if (welcomeHeadingP) welcomeHeadingP.textContent = 'คำนวณค่าน้ำดื่มพร้อมหักภาษี ณ ที่จ่ายตามเกณฑ์เงินเดือน 25,833 บาท ตามระเบียบใหม่ล่าสุด';
      
      // Form & Tab configs - Hide standard fuel inputs & show salary input
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
      
      // Populate position select with standard choices
      empPositionSelect.innerHTML = `
        <option value="หน.ปณ.">หน.ปณ.</option>
        <option value="พนักงาน">พนักงาน</option>
        <option value="ลูกจ้างประจำ">ลูกจ้างประจำ</option>
        <option value="ลูกจ้าง">ลูกจ้าง</option>
        <option value="ลูกจ้างเหมา">ลูกจ้างเหมา</option>
      `;
      
      // Metric Card Texts
      if (sumFuelCostLabel) sumFuelCostLabel.textContent = 'ค่าน้ำดื่มก่อนหักภาษีรวม';
      if (sumMaintCostLabel) sumMaintCostLabel.textContent = 'ภาษีหัก ณ ที่จ่ายรวม';
      if (sumTotalCostLabel) sumTotalCostLabel.textContent = 'ยอดเงินเบิกจ่ายรวมสุทธิ';
      
      // Table Configs
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
    
    // Clear any active edits
    cancelEdit();
    // Fetch from DB & render
    if (isCloudConnected()) {
      try {
        if (mode === 'fuel') {
          employees = await fetchEmployees();
        } else {
          waterEmployees = await fetchWaterEmployees();
        }

        // Fetch dynamic decoupled settings for the current mode
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
          // Water mode does not use fuel price mid-calculation inputs
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

/* --- ADMIN USER MANAGEMENT CONTROLLERS --- */
let appUsersList = [];

async function renderAdminUsersTable() {
  const tbody = document.getElementById('adminUsersTableBody');
  if (!tbody) return;

  if (isCloudConnected()) {
    try {
      appUsersList = await fetchUsersList();
    } catch (err) {
      console.error("Failed to fetch app users metadata:", err);
      appUsersList = JSON.parse(localStorage.getItem('tp_users')) || [];
    }
  } else {
    appUsersList = JSON.parse(localStorage.getItem('tp_users')) || [];
  }

  // Auto-sort users by name
  appUsersList.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '', 'th'));

  if (appUsersList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="no-data">ยังไม่มีประวัติข้อมูลผู้ใช้งานในระบบคลาวด์</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = '';
  appUsersList.forEach((user, index) => {
    const isMainAdmin = user.email === 'bandit1999main@gmail.com';
    const lastLoginText = user.lastLogin ? new Date(user.lastLogin).toLocaleString('th-TH') : '-';
    const tr = document.createElement('tr');
    
    // Check role display
    const isAdminRole = user.role === 'admin' || isMainAdmin;

    const isApproved = user.approved === true || isMainAdmin;
    const approvedBadge = isMainAdmin
      ? `<span style="color: var(--post-emerald); font-weight: 600;">✅ Admin</span>`
      : isApproved
        ? `<span style="color: var(--post-emerald);">✅ อนุมัติแล้ว</span>`
        : `<span style="color: var(--post-orange);">⏳ รออนุมัติ</span>`;

    const duties = Array.isArray(user.duties) ? user.duties : [];
    const hasFuel  = duties.includes('fuel')  || isMainAdmin;
    const hasWater = duties.includes('water') || isMainAdmin;

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td style="text-align: center;">
        <img src="${user.photoURL || 'https://www.gravatar.com/avatar/?d=mp'}" alt="Photo" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--border-glass);" />
      </td>
      <td><strong>${user.displayName || 'พนักงานไปรษณีย์'}</strong></td>
      <td>${user.email || '-'}</td>
      <td>${approvedBadge}</td>
      <td>
        <div style="display:flex; flex-direction:column; gap:0.3rem; align-items:flex-start;">
          <label style="display:flex; align-items:center; gap:0.4rem; cursor:${isMainAdmin?'default':'pointer'}; font-size:0.82rem;">
            <input type="checkbox" class="duty-checkbox" data-uid="${user.uid}" data-duty="fuel"
              ${hasFuel ? 'checked' : ''} ${isMainAdmin ? 'disabled' : ''}>
            <span>⛽ ค่าน้ำมัน</span>
          </label>
          <label style="display:flex; align-items:center; gap:0.4rem; cursor:${isMainAdmin?'default':'pointer'}; font-size:0.82rem;">
            <input type="checkbox" class="duty-checkbox" data-uid="${user.uid}" data-duty="water"
              ${hasWater ? 'checked' : ''} ${isMainAdmin ? 'disabled' : ''}>
            <span>💧 ค่าน้ำดื่ม</span>
          </label>
        </div>
      </td>
      <td>
        <select class="form-select user-role-select" data-uid="${user.uid}" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;" ${isMainAdmin ? 'disabled' : ''}>
          <option value="user" ${!isAdminRole ? 'selected' : ''}>User (Read-Only)</option>
          <option value="admin" ${isAdminRole ? 'selected' : ''}>Admin (จัดการข้อมูล)</option>
        </select>
      </td>
      <td>
        <div style="display: flex; align-items: center; justify-content: center; gap: 0.4rem;">
          ${isMainAdmin ? '' : isApproved
            ? `<button class="row-action-btn reject-user-btn" data-uid="${user.uid}" title="ยกเลิกการอนุมัติ" style="color: var(--post-orange);">🚫</button>`
            : `<button class="row-action-btn approve-user-btn" data-uid="${user.uid}" title="อนุมัติผู้ใช้" style="color: var(--post-emerald);">✅</button>`
          }
          ${isMainAdmin ? '' : `<button class="row-action-btn delete-user-btn" data-uid="${user.uid}" style="color: var(--post-red); cursor: pointer;" title="ลบข้อมูลการเข้าใช้งาน">🗑️</button>`}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Bind events dynamically
  tbody.querySelectorAll('.user-role-select').forEach(select => {
    select.addEventListener('change', handleUserRoleChange);
  });

  tbody.querySelectorAll('.duty-checkbox').forEach(cb => {
    cb.addEventListener('change', handleUserDutyChange);
  });

  tbody.querySelectorAll('.approve-user-btn').forEach(btn => {
    btn.addEventListener('click', handleUserApproveClick);
  });

  tbody.querySelectorAll('.reject-user-btn').forEach(btn => {
    btn.addEventListener('click', handleUserRejectClick);
  });

  tbody.querySelectorAll('.delete-user-btn').forEach(btn => {
    btn.addEventListener('click', handleUserDeleteClick);
  });
}

async function handleUserRoleChange(e) {
  const uid = e.target.getAttribute('data-uid');
  const newRole = e.target.value;
  const targetUser = appUsersList.find(u => u.uid === uid);
  if (!targetUser) return;

  showConfirm({
    title: '🔄 ยืนยันเปลี่ยนสิทธิ์ผู้ใช้งาน',
    message: `คุณต้องการเปลี่ยนสิทธิ์ของ "${targetUser.displayName}" เป็น ${newRole === 'admin' ? 'Admin' : 'User (Read-Only)'} ใช่หรือไม่?`,
    icon: '🔄',
    okText: 'ยืนยันเปลี่ยนสิทธิ์',
    okClass: 'btn-primary',
    onConfirm: async () => {
      showToast('กำลังปรับปรุงสิทธิ์...', 'info');
      const success = await saveUserRole(uid, { role: newRole });
      if (success) {
        showToast('อัปเดตสิทธิ์เรียบร้อยแล้ว!', 'success');
        renderAdminUsersTable();
      } else {
        showToast('ไม่สามารถอัปเดตสิทธิ์ได้', 'error');
      }
    }
  });
}

async function handleUserDeleteClick(e) {
  const uid = e.currentTarget.getAttribute('data-uid');
  const targetUser = appUsersList.find(u => u.uid === uid);
  if (!targetUser) return;

  showConfirm({
    title: '🗑️ ลบข้อมูลบัญชีผู้ใช้งาน',
    message: `คุณต้องการลบข้อมูลบัญชีของ "${targetUser.displayName}" ออกจากระบบใช่หรือไม่? (จะตัดสิทธิ์เข้าถึงชั่วคราวจนกว่าจะล็อกอินใหม่)`,
    icon: '🗑️',
    okText: 'ยืนยันการลบ',
    okClass: 'btn-danger',
    onConfirm: async () => {
      showToast('กำลังลบข้อมูลบัญชี...', 'info');
      const success = await deleteUserMetadata(uid);
      if (success) {
        showToast('ลบข้อมูลบัญชีสำเร็จ!', 'success');
        renderAdminUsersTable();
      } else {
        showToast('ไม่สามารถลบข้อมูลบัญชีได้', 'error');
      }
    }
  });
}

async function handleUserDutyChange(e) {
  const uid      = e.target.getAttribute('data-uid');
  const duty     = e.target.getAttribute('data-duty');   // 'fuel' | 'water'
  const checked  = e.target.checked;
  const targetUser = appUsersList.find(u => u.uid === uid);
  if (!targetUser) return;

  // Collect current duties from all checkboxes for this user
  const allCheckboxes = document.querySelectorAll(`.duty-checkbox[data-uid="${uid}"]`);
  const duties = [];
  allCheckboxes.forEach(cb => {
    if (cb.checked) duties.push(cb.getAttribute('data-duty'));
  });

  const success = await saveUserRole(uid, { duties });
  if (success) {
    const dutyLabel = duty === 'fuel' ? '⛽ ค่าน้ำมัน' : '💧 ค่าน้ำดื่ม';
    const action    = checked ? 'เพิ่ม' : 'ลบ';
    showToast(`${action}หน้าที่ ${dutyLabel} ให้ ${targetUser.displayName || targetUser.email} แล้ว`, 'success');
    targetUser.duties = duties; // update local cache
  } else {
    showToast('ไม่สามารถบันทึกหน้าที่ได้', 'error');
    e.target.checked = !checked; // revert checkbox
  }
}

async function handleUserApproveClick(e) {

  const uid = e.currentTarget.getAttribute('data-uid');
  const targetUser = appUsersList.find(u => u.uid === uid);
  if (!targetUser) return;

  showConfirm({
    title: '✅ อนุมัติผู้ใช้งาน',
    message: `คุณต้องการอนุมัติให้ "${targetUser.displayName || targetUser.email}" เข้าใช้งานระบบใช่หรือไม่?`,
    icon: '✅',
    okText: 'ยืนยันการอนุมัติ',
    okClass: 'btn-primary',
    onConfirm: async () => {
      showToast('กำลังอนุมัติ...', 'info');
      const success = await saveUserRole(uid, { approved: true });
      if (success) {
        showToast(`✅ อนุมัติ ${targetUser.displayName || ''} เรียบร้อยแล้ว!`, 'success');
        renderAdminUsersTable();
      } else {
        showToast('ไม่สามารถอนุมัติได้', 'error');
      }
    }
  });
}

async function handleUserRejectClick(e) {
  const uid = e.currentTarget.getAttribute('data-uid');
  const targetUser = appUsersList.find(u => u.uid === uid);
  if (!targetUser) return;

  showConfirm({
    title: '🚫 ยกเลิกการอนุมัติ',
    message: `คุณต้องการยกเลิกการอนุมัติของ "${targetUser.displayName || targetUser.email}" ใช่หรือไม่? ผู้ใช้จะไม่สามารถเข้าใช้งานได้จนกว่าจะได้รับการอนุมัติอีกครั้ง`,
    icon: '🚫',
    okText: 'ยืนยันการยกเลิก',
    okClass: 'btn-danger',
    onConfirm: async () => {
      showToast('กำลังยกเลิกการอนุมัติ...', 'info');
      const success = await saveUserRole(uid, { approved: false });
      if (success) {
        showToast(`🚫 ยกเลิกการอนุมัติ ${targetUser.displayName || ''} แล้ว`, 'success');
        renderAdminUsersTable();
      } else {
        showToast('ไม่สามารถยกเลิกการอนุมัติได้', 'error');
      }
    }
  });
}

/* --- PERSONNEL REGISTRY CONTROLLERS --- */

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
  
  // Set the hidden empName input to keep compatibility with existing calculation submits
  document.getElementById('empName').value = selectedName;

  const person = personnel.find(p => p.name === selectedName);
  if (!person) return;

  // Autofill fields depending on mode
  if (activeMode === 'fuel') {
    // Determine standard vs supervisor based on duty (หน้าที่)
    if (person.duty === 'หัวหน้าโซนนำจ่าย') {
      switchFormMode('supervisor', true);
    } else {
      switchFormMode('standard', true);
    }

    empPositionSelect.value = person.position;
    empDutySelect.value = person.duty || '';
    handlePositionSelect();
    if (person.route) {
      deliveryRouteSelect.value = person.route;
      // Trigger route stats preview
      handleRouteSelect();
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

async function handlePersonnelFormSubmit(e) {
  e.preventDefault();
  
  const name = personNameInput.value.trim();
  const position = personPositionSelect.value;
  const duty = personDutySelect.value;
  let department = personDepartmentSelect.value;
  if (department === 'custom') {
    department = personDepartmentCustomInput.value.trim() || 'ทั่วไป';
  }
  const salary = parseFloat(personSalaryInput.value) || 0;
  const route = personRouteSelect.value;
  const vehicle = personVehicleSelect.value;
  const signature = personSignatureInput.value.trim() || name;
  const restDays = Array.from(document.querySelectorAll('input[name="personRestDays"]:checked')).map(cb => parseInt(cb.value));
  const editIndexVal = personnelEditIndexInput.value;

  const item = {
    name,
    position,
    department,
    duty,
    salary,
    route,
    vehicle,
    signature,
    restDays
  };

  if (editIndexVal !== '') {
    const existingId = personnel[parseInt(editIndexVal)]?.id;
    if (existingId) item.id = existingId;
    personnel[parseInt(editIndexVal)] = item;
    personnelEditIndexInput.value = '';
    document.getElementById('personnelFormTitle').textContent = 'ลงทะเบียนข้อมูลบุคลากร';
    document.getElementById('savePersonnelBtn').innerHTML = '📥 บันทึกบุคลากร';
    resetPersonnelBtn.classList.add('hidden');
  } else {
    // Check if name already exists
    const duplicates = personnel
      .map((p, idx) => ({ ...p, originalIdx: idx }))
      .filter(p => p.name.trim().toLowerCase() === name.toLowerCase());

    if (duplicates.length > 0) {
      openDuplicateResolutionModal(item, duplicates);
      return;
    }
    personnel.push(item);
  }

  await savePersonnelList(personnel);
  personnelForm.reset();
  document.querySelectorAll('input[name="personRestDays"]').forEach(cb => cb.checked = false);
  personDepartmentCustomGroup.classList.add('hidden');
  renderPersonnelTable();
  showToast(editIndexVal !== '' ? 'อัปเดตข้อมูลบุคลากรสำเร็จ!' : 'ลงทะเบียนบุคลากรสำเร็จ!', 'success');
}

function openDuplicateResolutionModal(newItem, duplicates) {
  const modal = document.getElementById('duplicateResolutionModal');
  const targetNameSpan = document.getElementById('duplicateTargetName');
  const listContainer = document.getElementById('duplicateRecordsList');
  const forceAddBtn = document.getElementById('addNewPersonnelBtn');
  const cancelBtn = document.getElementById('cancelDuplicateResolutionBtn');
  const closeBtn = document.getElementById('closeDuplicateResolutionModalBtn');

  targetNameSpan.textContent = newItem.name;
  listContainer.innerHTML = '';

  // Render all duplicate options
  duplicates.forEach(dup => {
    const card = document.createElement('div');
    card.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-glass);
      border-radius: var(--radius-small);
      gap: 1rem;
      transition: all 0.2s ease;
    `;
    
    // Details description
    const details = `
      <div style="flex: 1; min-width: 0; text-align: left;">
        <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary); margin-bottom: 0.25rem;">${dup.name}</div>
        <div style="font-size: 0.8rem; color: var(--text-secondary); display: flex; flex-wrap: wrap; gap: 0.35rem 0.5rem; line-height: 1.35;">
          <span class="badge" style="background: rgba(139, 92, 246, 0.15); color: var(--post-orange); padding: 0.15rem 0.35rem; border-radius: 4px; font-size: 0.75rem;">${dup.position}</span>
          <span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #e11d48; padding: 0.15rem 0.35rem; border-radius: 4px; font-size: 0.75rem;">${dup.department || 'ทั่วไป'}</span>
          <span style="color: #ddd;">หน้าที่: ${dup.duty || '-'}</span>
          ${dup.route ? `<span style="color: #ddd;">ด้านจ่ายที่: ${dup.route}</span>` : ''}
        </div>
      </div>
    `;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary btn-small';
    btn.style.cssText = `
      flex-shrink: 0;
      padding: 0.35rem 0.75rem;
      font-size: 0.8rem;
      background: var(--post-orange);
      border-color: var(--post-orange);
    `;
    btn.innerHTML = '📥 บันทึกทับ';
    btn.addEventListener('click', async () => {
      // Overwrite at dup.originalIdx
      const existingId = personnel[dup.originalIdx]?.id;
      if (existingId) newItem.id = existingId;
      personnel[dup.originalIdx] = newItem;

      await savePersonnelList(personnel);
      personnelForm.reset();
      document.querySelectorAll('input[name="personRestDays"]').forEach(cb => cb.checked = false);
      personDepartmentCustomGroup.classList.add('hidden');
      renderPersonnelTable();
      modal.classList.remove('active');
      showToast('บันทึกทับข้อมูลบุคลากรสำเร็จ!', 'success');
    });

    card.innerHTML = details;
    card.appendChild(btn);
    listContainer.appendChild(card);
  });

  // Re-wire force-add button using cloneNode to clear existing listeners
  const newForceAddBtn = forceAddBtn.cloneNode(true);
  forceAddBtn.parentNode.replaceChild(newForceAddBtn, forceAddBtn);
  newForceAddBtn.addEventListener('click', async () => {
    personnel.push(newItem);
    await savePersonnelList(personnel);
    personnelForm.reset();
    document.querySelectorAll('input[name="personRestDays"]').forEach(cb => cb.checked = false);
    personDepartmentCustomGroup.classList.add('hidden');
    renderPersonnelTable();
    modal.classList.remove('active');
    showToast('ลงทะเบียนบุคลากรใหม่สำเร็จ!', 'success');
  });

  // Wire close/cancel actions
  const closeActions = () => modal.classList.remove('active');
  cancelBtn.onclick = closeActions;
  closeBtn.onclick = closeActions;

  modal.classList.add('active');
}

function scanForDuplicateNames() {
  const nameGroups = {};
  personnel.forEach((p, idx) => {
    const cleanName = p.name.trim().toLowerCase();
    if (!nameGroups[cleanName]) nameGroups[cleanName] = [];
    nameGroups[cleanName].push({ ...p, originalIdx: idx });
  });

  const duplicateGroups = Object.values(nameGroups).filter(g => g.length > 1);

  if (duplicateGroups.length === 0) {
    showToast('ไม่พบรายชื่อซ้ำในระบบ!', 'success');
    return;
  }

  const modal = document.getElementById('duplicateScanModal');
  const resultsContainer = document.getElementById('duplicateScanResultsList');
  resultsContainer.innerHTML = '';

  duplicateGroups.forEach(group => {
    const groupContainer = document.createElement('div');
    groupContainer.style.cssText = `
      background: rgba(255, 255, 255, 0.01);
      border: 1px solid var(--border-glass);
      border-radius: var(--radius-small);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    `;

    const titleHtml = `
      <div style="font-weight: 700; font-size: 0.95rem; color: var(--post-orange); border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.35rem; display: flex; justify-content: space-between; align-items: center;">
        <span>👤 ${group[0].name}</span>
        <span style="font-size: 0.8rem; background: rgba(245, 158, 11, 0.15); color: var(--post-orange); padding: 0.15rem 0.5rem; border-radius: 20px;">พบซ้ำ ${group.length} รายการ</span>
      </div>
    `;

    const listContainer = document.createElement('div');
    listContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    `;

    group.forEach(person => {
      const row = document.createElement('div');
      row.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0.75rem;
        background: rgba(255, 255, 255, 0.02);
        border-radius: 6px;
        font-size: 0.85rem;
        gap: 1rem;
      `;

      const restDaysText = person.restDays && person.restDays.length > 0
        ? ` (หยุด: ${person.restDays.map(d => ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'][d]).join(', ')})`
        : '';

      row.innerHTML = `
        <div style="flex: 1; min-width: 0; text-align: left; color: #bbb;">
          <strong>${person.position}</strong> - แผนก: ${person.department || 'ทั่วไป'} | หน้าที่: ${person.duty || '-'} | เงินเดือน: ${person.salary ? person.salary.toLocaleString() : '0.00'} ฿${restDaysText}
        </div>
      `;

      const btnGroup = document.createElement('div');
      btnGroup.style.cssText = `
        display: flex;
        gap: 0.35rem;
        flex-shrink: 0;
      `;

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'row-action-btn';
      editBtn.style.padding = '0.2rem 0.4rem';
      editBtn.innerHTML = '✏️ แก้ไข';
      editBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        editPersonnel(person.originalIdx);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'row-action-btn';
      deleteBtn.style.cssText = 'padding: 0.2rem 0.4rem; color: var(--post-red);';
      deleteBtn.innerHTML = '🗑️ ลบ';
      deleteBtn.addEventListener('click', () => {
        showConfirm({
          title: 'ยืนยันการลบข้อมูลซ้ำ',
          message: `คุณต้องการลบข้อมูลพนักงาน "${person.name}" (${person.position} - ${person.department}) ใช่หรือไม่?`,
          onConfirm: async () => {
            personnel.splice(person.originalIdx, 1);
            await savePersonnelList(personnel);
            renderPersonnelTable();
            modal.classList.remove('active');
            showToast('ลบข้อมูลเรียบร้อย!', 'success');
            // Re-trigger scan to show updated state
            scanForDuplicateNames();
          }
        });
      });

      btnGroup.appendChild(editBtn);
      btnGroup.appendChild(deleteBtn);
      row.appendChild(btnGroup);
      listContainer.appendChild(row);
    });

    groupContainer.innerHTML = titleHtml;
    groupContainer.appendChild(listContainer);
    resultsContainer.appendChild(groupContainer);
  });

  modal.classList.add('active');
}

function renderPersonnelTable() {
  if (personnel.length === 0) {
    personnelTableBody.innerHTML = `
      <tr>
        <td colspan="10" class="no-data">ยังไม่มีข้อมูลบุคลากร กรุณาลงทะเบียนด้านซ้าย</td>
      </tr>
    `;
    return;
  }

  // Sort personnel by name in Thai alphabetical order (ก-ฮ)
  personnel.sort((a, b) => a.name.localeCompare(b.name, 'th'));

  // Filter based on search query
  const filtered = [];
  personnel.forEach((person, originalIdx) => {
    const matches = !personnelSearchQuery || 
      person.name.toLowerCase().includes(personnelSearchQuery) ||
      person.position.toLowerCase().includes(personnelSearchQuery) ||
      (person.department && person.department.toLowerCase().includes(personnelSearchQuery)) ||
      (person.duty && person.duty.toLowerCase().includes(personnelSearchQuery));
    if (matches) {
      filtered.push({ person, originalIdx });
    }
  });

  personnelTableBody.innerHTML = '';
  
  if (filtered.length === 0) {
    personnelTableBody.innerHTML = `
      <tr>
        <td colspan="10" class="no-data">ไม่พบข้อมูลที่ตรงกับการค้นหา</td>
      </tr>
    `;
    return;
  }

  filtered.forEach(({ person, originalIdx }, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td style="font-weight: 700;">
        ${person.name}
        ${person.restDays && person.restDays.length > 0 ? `<div style="font-size: 0.75rem; color: #f43f5e; font-weight: normal; margin-top: 0.2rem; display: flex; align-items: center; gap: 0.15rem;">🏖️ หยุด: ${person.restDays.map(d => ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'][d]).join(', ')}</div>` : ''}
      </td>
      <td><span class="badge" style="background: rgba(139, 92, 246, 0.1); color: var(--post-orange); padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.8rem;">${person.position}</span></td>
      <td><span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #e11d48; padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.8rem;">${person.department || 'ทั่วไป'}</span></td>
      <td><span class="badge" style="background: rgba(14, 165, 233, 0.1); color: var(--post-emerald); padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.8rem;">${person.duty || '-'}</span></td>
      <td>${person.salary ? person.salary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
      <td>${person.route ? 'ด้านจ่ายที่ ' + person.route : '-'}</td>
      <td>${person.vehicle || '-'}</td>
      <td><span style="font-family: var(--font-title); font-size: 0.85rem; font-style: italic; color: #ddd; font-weight: 300;">${person.signature || person.name}</span></td>
      <td class="actions-col">
        <button class="row-action-btn edit-person-btn" data-index="${originalIdx}" title="แก้ไข">✏️</button>
        <button class="row-action-btn delete-person-btn" data-index="${originalIdx}" title="ลบ" style="color: var(--post-red);">🗑️</button>
      </td>
    `;
    personnelTableBody.appendChild(tr);
  });

  // Bind row actions
  personnelTableBody.querySelectorAll('.edit-person-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.getAttribute('data-index'));
      editPersonnel(idx);
    });
  });

  personnelTableBody.querySelectorAll('.delete-person-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.getAttribute('data-index'));
      deletePersonnel(idx);
    });
  });
}

function editPersonnel(index) {
  const person = personnel[index];
  if (!person) return;

  document.getElementById('modalRegistryEditIndex').value = index;
  document.getElementById('modalPersonName').value = person.name;
  document.getElementById('modalPersonPosition').value = person.position;
  
  // Set department fields
  const deptSelect = document.getElementById('modalPersonDepartment');
  const deptCustomGroup = document.getElementById('modalPersonDepartmentCustomGroup');
  const deptCustomInput = document.getElementById('modalPersonDepartmentCustom');
  const stdDepts = ['นำจ่าย', 'ไขตู้/ขนส่ง', 'รับฝาก', 'บริหาร/ธุรการ'];
  const personDept = person.department || 'นำจ่าย';

  if (stdDepts.includes(personDept)) {
    deptSelect.value = personDept;
    deptCustomGroup.classList.add('hidden');
    deptCustomInput.value = '';
  } else {
    deptSelect.value = 'custom';
    deptCustomGroup.classList.remove('hidden');
    deptCustomInput.value = personDept;
  }

  document.getElementById('modalPersonDuty').value = person.duty || '';
  document.getElementById('modalPersonSalary').value = person.salary || 0;
  
  // Set rest days checkboxes
  const personRestDays = person.restDays || [];
  document.querySelectorAll('input[name="modalPersonRestDays"]').forEach(cb => {
    cb.checked = personRestDays.includes(parseInt(cb.value));
  });

  document.getElementById('modalPersonRoute').value = person.route || '';
  document.getElementById('modalPersonVehicle').value = person.vehicle || 'รถจักรยานยนต์';
  document.getElementById('modalPersonSignature').value = person.signature || '';

  document.getElementById('editRegistryPersonnelModal').classList.add('active');
}

function deletePersonnel(index) {
  const person = personnel[index];
  if (!person) return;

  showConfirm({
    title: 'ยืนยันการลบรายชื่อ',
    message: `คุณต้องการลบข้อมูลบุคลากร "${person.name}" ใช่หรือไม่?`,
    onConfirm: async () => {
      personnel.splice(index, 1);
      await savePersonnelList(personnel);
      renderPersonnelTable();
      showToast('ลบรายชื่อบุคลากรสำเร็จ!', 'success');
    }
  });
}

function cancelPersonnelEdit() {
  personnelEditIndexInput.value = '';
  personnelForm.reset();
  personDepartmentCustomGroup.classList.add('hidden');
  document.getElementById('personnelFormTitle').textContent = 'ลงทะเบียนข้อมูลบุคลากร';
  document.getElementById('savePersonnelBtn').innerHTML = '📥 บันทึกบุคลากร';
  resetPersonnelBtn.classList.add('hidden');
}

function wireRegistryEditModal() {
  const modal = document.getElementById('editRegistryPersonnelModal');
  const form = document.getElementById('editRegistryPersonnelForm');
  const closeBtn = document.getElementById('closeRegistryEditModalBtn');
  const cancelBtn = document.getElementById('cancelRegistryEditModalBtn');
  const deptSelect = document.getElementById('modalPersonDepartment');
  const deptCustomGroup = document.getElementById('modalPersonDepartmentCustomGroup');
  const deptCustomInput = document.getElementById('modalPersonDepartmentCustom');

  closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  cancelBtn.addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

  deptSelect.addEventListener('change', () => {
    if (deptSelect.value === 'custom') {
      deptCustomGroup.classList.remove('hidden');
    } else {
      deptCustomGroup.classList.add('hidden');
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const idx = parseInt(document.getElementById('modalRegistryEditIndex').value);
    
    const name = document.getElementById('modalPersonName').value.trim();
    const position = document.getElementById('modalPersonPosition').value;
    
    let department = deptSelect.value;
    if (department === 'custom') {
      department = deptCustomInput.value.trim() || 'ทั่วไป';
    }

    const duty = document.getElementById('modalPersonDuty').value;
    const salary = parseFloat(document.getElementById('modalPersonSalary').value) || 0;
    const route = document.getElementById('modalPersonRoute').value;
    const vehicle = document.getElementById('modalPersonVehicle').value;
    const signature = document.getElementById('modalPersonSignature').value.trim() || name;
    const restDays = Array.from(document.querySelectorAll('input[name="modalPersonRestDays"]:checked')).map(cb => parseInt(cb.value));

    const item = {
      name,
      position,
      department,
      duty,
      salary,
      route,
      vehicle,
      signature,
      restDays
    };

    showConfirm({
      title: 'ยืนยันการแก้ไขข้อมูลบุคลากร',
      message: `คุณต้องการบันทึกการแก้ไขข้อมูลของ "${name}" ใช่หรือไม่?`,
      onConfirm: async () => {
        // Read existing Firestore / ID reference if any
        const existingId = personnel[idx]?.id;
        if (existingId) item.id = existingId;
        personnel[idx] = item;
        
        await savePersonnelList(personnel);
        renderPersonnelTable();
        modal.classList.remove('active');
        showToast('อัปเดตข้อมูลบุคลากรสำเร็จ!', 'success');
      }
    });
  });
}


/* --- DRINKING WATER TAX CALC ENGINE --- */
function calculateWaterTax(salary, totalAllowance) {
  // @IFS(D5<=25833,0,AND(D5>=25834,D5<=38333),F5*0.05,AND(D5>=38334,D5<=55000),F5*0.1,AND(D5>=55001,D5<=75833),F5*0.15,AND(D5>=75834,D5<=96666),F5*0.2,D5>=96667,F5*0.25)
  if (salary <= 25833) {
    return 0;
  } else if (salary >= 25834 && salary <= 38333) {
    return totalAllowance * 0.05;
  } else if (salary >= 38334 && salary <= 55000) {
    return totalAllowance * 0.10;
  } else if (salary >= 55001 && salary <= 75833) {
    return totalAllowance * 0.15;
  } else if (salary >= 75834 && salary <= 96666) {
    return totalAllowance * 0.20;
  } else if (salary >= 96667) {
    return totalAllowance * 0.25;
  }
  return 0;
}


/* --- TAB / FORM MODE SWITCHING --- */
function switchFormMode(mode, keepEditState = false) {
  formModeInput.value = mode;
  if (!keepEditState) {
    cancelEdit(); // clear outputs
  }
  
  if (mode === 'standard') {
    tabStandard.classList.add('active');
    tabSupervisor.classList.remove('active');
    
    // Show standard employee inputs
    positionRouteRow.classList.remove('hidden');
    deliveryRouteGroup.classList.remove('hidden');
    claimMethodGroup.classList.remove('hidden');
    workDaysRow.classList.remove('hidden');
    
    // Hide supervisor mission builder
    supervisorMissionSection.classList.add('hidden');
    
    // Remove "required" from route select in supervisor mode
    deliveryRouteSelect.setAttribute('required', 'true');
  } else {
    tabStandard.classList.remove('active');
    tabSupervisor.classList.add('active');
    
    // Hide standard elements
    deliveryRouteGroup.classList.add('hidden');
    claimMethodGroup.classList.add('hidden');
    workDaysRow.classList.add('hidden');
    
    // Show supervisor mission builder
    supervisorMissionSection.classList.remove('hidden');
    
    // Adjust forms
    deliveryRouteSelect.removeAttribute('required');
    vehicleTypeSelect.value = 'รถจักรยานยนต์'; // Default for ชนจ. motorcycle checks
    tempMissions = [];
    renderMissionsTable();
  }
}

/* --- SUPERVISOR MISSION BUILDER --- */
function addSupervisorMission() {
  const type = missionTypeSelect.value;
  const route = missionRouteSelect.value;
  const days = parseInt(missionDaysInput.value) || 1;
  const dates = missionDatesInput.value.trim() || `${days} วัน`;

  if (!route) {
    showToast('กรุณาเลือกด้านจ่ายที่จะปฏิบัติภารกิจ!', 'warning');
    return;
  }

  const routeInfo = ROUTE_DATA[route];
  let distance = 0;
  let liters = 0;

  if (type === 'ตรวจสอบการนำจ่าย') {
    // 1/2 of standard daily distance
    distance = (routeInfo.workerDist / 2) * days;
    // Sum workerLiters over days and round up in all cases if there are decimals
    liters = Math.ceil(routeInfo.workerLiters * days);
  } else {
    // Substitute or Training gets full route daily rates
    distance = routeInfo.workerDist * days;
    liters = Number((routeInfo.workerLiters * days).toFixed(2));
  }

  tempMissions.push({
    type,
    route,
    days,
    dates,
    distance,
    liters
  });

  missionDatesInput.value = '';
  renderMissionsTable();
}

function renderMissionsTable() {
  if (tempMissions.length === 0) {
    missionTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="no-data" style="padding: 1rem;">ยังไม่มีการบันทึกภารกิจ</td>
      </tr>
    `;
    return;
  }

  missionTableBody.innerHTML = '';
  tempMissions.forEach((m, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${m.type}</td>
      <td>ด้าน ${m.route}</td>
      <td>${m.dates} (${m.days} วัน)</td>
      <td>${m.distance.toFixed(1)} กม.</td>
      <td>${m.liters.toFixed(2)} ลิตร</td>
      <td><button type="button" class="row-action-btn delete-mission-btn" style="padding: 0.1rem 0.3rem;">❌</button></td>
    `;
    tr.querySelector('.delete-mission-btn').addEventListener('click', () => {
      tempMissions.splice(idx, 1);
      renderMissionsTable();
    });
    missionTableBody.appendChild(tr);
  });
}

/* --- PREVIEW AND FORM CONTROLS --- */
function handleRouteSelect() {
  const routeVal = deliveryRouteSelect.value;
  if (!routeVal) return;

  const routeInfo = ROUTE_DATA[routeVal];
  
  routeStatsPreview.classList.remove('hidden');
  prevDistDay.textContent = `${routeInfo.workerDist} กม.`;
  prevFuelDay.textContent = `${routeInfo.workerLiters} ลิตร`;
  prevDistMonth.textContent = `${routeInfo.staffDist.toLocaleString()} กม.`;
  prevFuelMonth.textContent = `${routeInfo.staffLiters.toLocaleString()} ลิตร`;

  // Auto-detect vehicle
  if (routeInfo.hasCar) {
    vehicleTypeSelect.value = 'รถยนต์';
  } else {
    vehicleTypeSelect.value = 'รถจักรยานยนต์';
  }
}

function handlePositionSelect() {
  const pos = empPositionSelect.value;
  const isSub = document.getElementById('isSubstitute').checked;
  const isStaff = pos === 'พนักงาน' || pos === 'ลูกจ้างประจำ';

  if (isStaff && !isSub) {
    claimMethodSelect.value = 'monthly';
    claimMethodSelect.disabled = true;
    daysNotWorkedGroup.classList.remove('hidden');
    workDaysInput.value = 26;
    workDaysInput.disabled = true;
  } else {
    claimMethodSelect.disabled = false;
    workDaysInput.disabled = false;
    if (claimMethodSelect.value === 'monthly') {
      daysNotWorkedGroup.classList.remove('hidden');
    } else {
      daysNotWorkedGroup.classList.add('hidden');
      daysNotWorkedInput.value = 0;
    }
  }
}

function handleClaimMethodSelect() {
  const method = claimMethodSelect.value;
  if (method === 'monthly') {
    daysNotWorkedGroup.classList.remove('hidden');
  } else {
    daysNotWorkedGroup.classList.add('hidden');
    daysNotWorkedInput.value = 0;
  }
}

/* --- MAIN MATH REGULATION ENGINE --- */

/**
 * Calculates Fuel Liters claimed
 */
function calculateClaimLiters(item) {
  if (item.formMode === 'supervisor') {
    let otherLiters = 0;
    let rawInspectionLiters = 0;
    
    item.missions.forEach(m => {
      const routeInfo = ROUTE_DATA[m.route];
      const dailyLiters = routeInfo ? routeInfo.workerLiters : 0;
      
      if (m.type === 'ตรวจสอบการนำจ่าย') {
        rawInspectionLiters += dailyLiters * m.days;
      } else {
        otherLiters += dailyLiters * m.days;
      }
    });
    
    const totalLiters = otherLiters + Math.ceil(rawInspectionLiters / 2);
    return Number(totalLiters.toFixed(2));
  }

  const route = ROUTE_DATA[item.route];
  if (!route) return 0;

  const isStaff = item.position === 'พนักงาน' || item.position === 'ลูกจ้างประจำ';
  
  if (item.method === 'monthly') {
    return isStaff ? route.staffLiters : (route.workerLiters * item.workDays);
  } else {
    if (isStaff) {
      return Number(((route.staffLiters / 26) * item.workDays).toFixed(2));
    } else {
      return Number((route.workerLiters * item.workDays).toFixed(2));
    }
  }
}

/**
 * Helper to calculate maintenance cost for a single supervisor mission
 */
function calculateSingleMissionMaint(item, m) {
  const route = ROUTE_DATA[m.route];
  if (!route) return 0;

  const dailyDist = m.type === 'ตรวจสอบการนำจ่าย' ? (route.workerDist / 2) : route.workerDist;
  
  let tier = '';
  if (dailyDist <= 40) tier = '1-40';
  else if (dailyDist <= 70) tier = '41-70';
  else if (dailyDist <= 100) tier = '71-100';
  else tier = '101+';

  if (item.vehicle === 'รถยนต์') {
    return m.distance * 2.25;
  } else if (item.vehicle === 'เรือยนต์') {
    return 48 * m.days;
  } else {
    const rates = {
      'รถจักรยานยนต์': { '1-40': 51, '41-70': 53, '71-100': 55, '101+': 57 },
      'รถจักรยานยนต์ไฟฟ้า': { '1-40': 84, '41-70': 97, '71-100': 110, '101+': 123 }
    };
    const dailyRate = rates[item.vehicle] ? rates[item.vehicle][tier] : 0;
    return dailyRate * m.days;
  }
}

/**
 * Calculates Maintenance Cost based on Post regulations
 */
function calculateMaintenanceCost(item) {
  if (item.isSubstitute) return 0;
  const isStaff = item.position === 'พนักงาน' || item.position === 'ลูกจ้างประจำ';

  if (item.formMode === 'supervisor') {
    // Supervisor (ชนจ.) Maintenance Fee rules
    let totalMaint = 0;
    let accumulatedMotorcycleDays = 0;
    let maxDailyMotorcycleMaintRate = 51; // baseline standard motorcycle daily maint rate (1-40km tier)

    item.missions.forEach(m => {
      const route = ROUTE_DATA[m.route];
      if (!route) return;

      const dailyDist = m.type === 'ตรวจสอบการนำจ่าย' ? (route.workerDist / 2) : route.workerDist;
      
      // Tier classification for maintenance
      let tier = '';
      if (dailyDist <= 40) tier = '1-40';
      else if (dailyDist <= 70) tier = '41-70';
      else if (dailyDist <= 100) tier = '71-100';
      else tier = '101+';

      if (item.vehicle === 'รถยนต์') {
        // Car: 2.25 Baht/km
        totalMaint += m.distance * 2.25;
      } else if (item.vehicle === 'เรือยนต์') {
        // Boat: 48 Baht/day
        totalMaint += 48 * m.days;
      } else {
        // Motorcycle / Electric Motorcycle (daily rate base)
        const rates = {
          'รถจักรยานยนต์': { '1-40': 51, '41-70': 53, '71-100': 55, '101+': 57 },
          'รถจักรยานยนต์ไฟฟ้า': { '1-40': 84, '41-70': 97, '71-100': 110, '101+': 123 }
        };
        const dailyRate = rates[item.vehicle] ? rates[item.vehicle][tier] : 0;
        totalMaint += dailyRate * m.days;
      }
    });

    return Number(totalMaint.toFixed(2));
  }

  const route = ROUTE_DATA[item.route];
  if (!route) return 0;

  const dailyDist = route.workerDist;
  const monthlyDist = route.staffDist;

  if (item.vehicle === 'รถยนต์') {
    return isStaff ? (monthlyDist * 2.25) : (dailyDist * item.workDays * 2.25);
  }

  if (item.vehicle === 'เรือยนต์') {
    return isStaff ? Math.max(0, 1090 - (item.daysNotWorked * 36)) : (48 * item.workDays);
  }

  // Motorcycle / Electric Motorcycle
  let tier = '';
  if (dailyDist <= 40) tier = '1-40';
  else if (dailyDist <= 70) tier = '41-70';
  else if (dailyDist <= 100) tier = '71-100';
  else tier = '101+';

  if (isStaff) {
    const rates = {
      'รถจักรยานยนต์': { '1-40': { base: 1155, dec: 38 }, '41-70': { base: 1210, dec: 40 }, '71-100': { base: 1265, dec: 42 }, '101+': { base: 1320, dec: 44 } },
      'รถจักรยานยนต์ไฟฟ้า': { '1-40': { base: 2500, dec: 84 }, '41-70': { base: 2900, dec: 97 }, '71-100': { base: 3300, dec: 110 }, '101+': { base: 3700, dec: 123 } }
    };
    const rule = rates[item.vehicle] ? rates[item.vehicle][tier] : { base: 0, dec: 0 };
    return Math.max(0, rule.base - (item.daysNotWorked * rule.dec));
  } else {
    const rates = {
      'รถจักรยานยนต์': { '1-40': 51, '41-70': 53, '71-100': 55, '101+': 57 },
      'รถจักรยานยนต์ไฟฟ้า': { '1-40': 84, '41-70': 97, '71-100': 110, '101+': 123 }
    };
    const dailyRate = rates[item.vehicle] ? rates[item.vehicle][tier] : 0;
    return dailyRate * item.workDays;
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

  // Populate values
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

    // Populate route dropdown from current ROUTE_DATA
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

  // Show modal
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
  const modalDaysNotWorkedGroup = document.getElementById('modalDaysNotWorkedGroup');

  closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  cancelBtn.addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

  modalClaimMethod.addEventListener('change', adjustModalClaimMethod);
  document.getElementById('modalEmpPosition').addEventListener('change', adjustModalClaimMethod);
  document.getElementById('modalIsSubstitute').addEventListener('change', adjustModalClaimMethod);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const isWater = modal.dataset.isWater === '1';
    // Snapshot the index at submit time (guard against real-time listener race condition)
    const idx = parseInt(document.getElementById('modalEditIndex').value);

    const name = document.getElementById('modalEmpName').value.trim();
    const position = document.getElementById('modalEmpPosition').value;
    const duty = document.getElementById('modalEmpDuty').value;
    const workDays = parseInt(document.getElementById('modalWorkDays').value) || 0;
    const remarks = document.getElementById('modalRemarks').value.trim();
    const signature = document.getElementById('modalSignature').value.trim() || name;

    if (isWater) {
      const salary = parseFloat(document.getElementById('modalEmpSalary').value) || 0;
      // Preserve id: read BEFORE overwriting object
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
      // Preserve id and existing fields (e.g. missions for supervisor)
      const existingId = employees[idx]?.id;
      employees[idx] = { ...employees[idx], name, position, duty, route, vehicle, method, workDays, daysNotWorked, remarks, signature, isSubstitute };
      if (existingId) employees[idx].id = existingId;
      await saveEmployees(employees);
    }

    modal.classList.remove('active');
    renderEmployeeTable();
  });
}

/* --- FORM SUBMISSION --- */
async function handleFormSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('empName').value.trim();
  const formMode = formModeInput.value;
  const remarks = document.getElementById('remarks').value.trim();
  const signatureInput = document.getElementById('signature').value.trim();
  const signature = signatureInput || name;
  const editIndexVal = document.getElementById('editIndex').value;

  let item = {};

  if (activeMode === 'water') {
    const position = empPositionSelect.value;
    const duty = empDutySelect.value;
    const salary = parseFloat(empSalaryInput.value) || 0;
    const workDays = parseInt(workDaysInput.value) || 0;

    item = {
      name,
      position,
      duty,
      salary,
      workDays,
      remarks,
      signature
    };

    if (editIndexVal !== '') {
      // Preserve existing id before overwriting
      const existingId = waterEmployees[parseInt(editIndexVal)]?.id;
      if (existingId) item.id = existingId;
      waterEmployees[parseInt(editIndexVal)] = item;
      document.getElementById('editIndex').value = '';
      saveBtn.innerHTML = '📥 บันทึกข้อมูลค่าน้ำดื่ม';
      resetBtn.classList.add('hidden');
      const formTitle = document.getElementById('formTitle');
      if (formTitle) formTitle.textContent = 'กรอกข้อมูลผู้รับค่าน้ำดื่ม';
    } else {
      waterEmployees.push(item);
    }

    await saveWaterEmployees(waterEmployees);
    employeeForm.reset();
    renderEmployeeTable();
    showToast(
      editIndexVal !== '' ? 'อัปเดตข้อมูลสำเร็จ!' : 'เพิ่มรายชื่อสำเร็จ!',
      'success'
    );
    return;
  }

  const vehicle = vehicleTypeSelect.value;

  if (formMode === 'supervisor') {
    if (tempMissions.length === 0) {
      showToast('กรุณากรอกและบันทึกภารกิจอย่างน้อย 1 ภารกิจสำหรับ ชนจ.!', 'warning');
      return;
    }
    // Calculate total days
    let totalDays = 0;
    tempMissions.forEach(m => totalDays += m.days);

    item = {
      formMode,
      name,
      position: empPositionSelect.value,
      duty: 'หัวหน้าโซนนำจ่าย',
      vehicle,
      missions: [...tempMissions],
      workDays: totalDays,
      remarks,
      signature
    };
  } else {
    // Standard Mode
    const position = empPositionSelect.value;
    const duty = empDutySelect.value;
    const route = deliveryRouteSelect.value;
    const method = claimMethodSelect.value;
    const workDays = parseInt(workDaysInput.value) || 0;
    
    const isSubstitute = document.getElementById('isSubstitute').checked;
    const isStaff = position === 'พนักงาน' || position === 'ลูกจ้างประจำ';
    if (isStaff && !isSubstitute) {
      if (daysNotWorkedInput.value.trim() === '') {
        showToast('กรุณาระบุจำนวนวันที่ไม่ได้นำรถมาใช้!', 'warning');
        daysNotWorkedInput.focus();
        return;
      }
    }
    
    const daysNotWorked = parseInt(daysNotWorkedInput.value) || 0;

    item = {
      formMode,
      name,
      position,
      duty,
      route,
      vehicle,
      method,
      workDays,
      daysNotWorked,
      remarks,
      signature,
      isSubstitute
    };
    document.getElementById('isSubstitute').checked = false;
  }

  if (editIndexVal !== '') {
    employees[parseInt(editIndexVal)] = item;
    document.getElementById('editIndex').value = '';
    saveBtn.innerHTML = '📥 บันทึกข้อมูลพนักงาน';
    resetBtn.classList.add('hidden');
    const formTitle = document.getElementById('formTitle');
    if (formTitle) formTitle.textContent = 'กรอกข้อมูลผู้รับเงินค่าน้ำมัน';
  } else {
    employees.push(item);
  }

  // Save state
  const isEdit = editIndexVal !== '';
  saveEmployees(employees);
  employeeForm.reset();
  routeStatsPreview.classList.add('hidden');
  tempMissions = [];
  
  if (formMode === 'supervisor') {
    renderMissionsTable();
  }
  
  renderEmployeeTable();
  showToast(isEdit ? 'อัปเดตข้อมูลสำเร็จ!' : 'บันทึกข้อมูลสำเร็จ!', 'success');
}

function editWaterEmployee(idx) {
  openEditModal(true, idx);
}

function deleteWaterEmployee(idx) {
  showConfirm({
    title: 'ยืนยันการลบ',
    message: 'คุณแน่ใจว่าต้องการลบรายชื่อนี้ใช่หรือไม่? ผลลัพธ์นี้ไม่สามารถย้อนคืนได้',
    icon: '🗑️',
    okText: 'ลบรายชื่อ',
    onConfirm: () => {
      waterEmployees.splice(idx, 1);
      saveWaterEmployees(waterEmployees);
      renderEmployeeTable();
      showToast('ลบรายชื่อเรียบร้อยแล้ว!', 'success');
    }
  });
}

function renderEmployeeTable() {
  const currentFuelPrice = parseFloat(globalFuelPriceInput.value) || 38.50;

  if (activeMode === 'water') {
    // Sort water employees by name (Thai alphabetical order ก-ฮ)
    waterEmployees.sort((a, b) => a.name.localeCompare(b.name, 'th'));

    if (waterEmployees.length === 0) {
      employeeTableBody.innerHTML = `
        <tr>
          <td colspan="10" class="no-data">ยังไม่มีข้อมูลในตาราง กรุณากรอกข้อมูลด้านซ้าย หรือคลิก "โหลดข้อมูลตัวอย่าง"</td>
        </tr>
      `;
      sumFuelCostSpan.textContent = '0.00';
      sumMaintenanceCostSpan.textContent = '0.00';
      sumTotalCostSpan.textContent = '0.00';
      return;
    }

    let totalAllowance = 0;
    let totalTaxVal = 0;
    let totalNetVal = 0;
    waterEmployees.forEach((item) => {
      const allowance = item.workDays * 30;
      const tax = calculateWaterTax(item.salary, allowance);
      const net = allowance - tax;
      totalAllowance += allowance;
      totalTaxVal += tax;
      totalNetVal += net;
    });

    const filtered = [];
    waterEmployees.forEach((item, originalIdx) => {
      const matches = !employeeSearchQuery ||
        item.name.toLowerCase().includes(employeeSearchQuery) ||
        item.position.toLowerCase().includes(employeeSearchQuery) ||
        (item.duty && item.duty.toLowerCase().includes(employeeSearchQuery));
      if (matches) {
        filtered.push({ item, originalIdx });
      }
    });

    employeeTableBody.innerHTML = '';
    
    if (filtered.length === 0) {
      employeeTableBody.innerHTML = `
        <tr>
          <td colspan="10" class="no-data">ไม่พบข้อมูลที่ตรงกับการค้นหา</td>
        </tr>
      `;
      sumFuelCostSpan.textContent = '0.00';
      sumMaintenanceCostSpan.textContent = '0.00';
      sumTotalCostSpan.textContent = '0.00';
      return;
    }

    filtered.forEach(({ item, originalIdx }, index) => {
      const allowance = item.workDays * 30;
      const tax = calculateWaterTax(item.salary, allowance);
      const net = allowance - tax;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td style="font-weight: 700; color: var(--text-primary);">${item.name}</td>
        <td><span style="background: rgba(14, 165, 233, 0.1); color: var(--post-orange); padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700;">${item.position} / ${item.duty || '-'}</span></td>
        <td>${item.salary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</td>
        <td style="text-align: center;">${item.workDays} วัน</td>
        <td style="font-weight: 700;">${allowance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</td>
        <td style="color: ${tax > 0 ? 'var(--post-red)' : 'var(--text-secondary)'}; font-weight: ${tax > 0 ? '700' : '400'};">${tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</td>
        <td style="font-weight: 800; color: var(--post-emerald);">${net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</td>
        <td style="font-family: var(--font-title); font-style: italic; color: #eee; font-weight: 300; font-size: 0.85rem;">${item.signature}</td>
        <td class="actions-col">
          <button class="row-action-btn edit-btn" title="แก้ไข">✏️</button>
          <button class="row-action-btn delete-btn" title="ลบ">🗑️</button>
        </td>
      `;

      tr.querySelector('.edit-btn').addEventListener('click', () => editWaterEmployee(originalIdx));
      tr.querySelector('.delete-btn').addEventListener('click', () => deleteWaterEmployee(originalIdx));

      employeeTableBody.appendChild(tr);
    });

    sumFuelCostSpan.textContent = totalAllowance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    sumMaintenanceCostSpan.textContent = totalTaxVal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    sumTotalCostSpan.textContent = totalNetVal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return;
  }

  // Sort fuel employees by name (Thai alphabetical order ก-ฮ)
  employees.sort((a, b) => a.name.localeCompare(b.name, 'th'));

  if (employees.length === 0) {
    employeeTableBody.innerHTML = `
      <tr>
        <td colspan="10" class="no-data">ยังไม่มีข้อมูลในตาราง กรุณากรอกข้อมูลด้านซ้าย หรือคลิก "โหลดข้อมูลตัวอย่าง"</td>
      </tr>
    `;
    sumFuelCostSpan.textContent = '0.00';
    sumMaintenanceCostSpan.textContent = '0.00';
    sumTotalCostSpan.textContent = '0.00';
    return;
  }

  employeeTableBody.innerHTML = '';
  let totalFuelCost = 0;
  let totalMaintCost = 0;
  let grandTotal = 0;

  // Flatten the employees and their supervisor missions into separate rows
  let flatRows = [];
  employees.forEach((item, parentIndex) => {
    if (item.formMode !== 'supervisor') {
      const liters = calculateClaimLiters(item);
      const fuelCost = liters * currentFuelPrice;
      const maintCost = calculateMaintenanceCost(item);
      const sumTotal = fuelCost + maintCost;

      flatRows.push({
        parentIndex,
        item,
        name: item.name,
        position: item.position,
        routeDescHtml: `ด้านจ่ายที่ ${item.route}`,
        routeDescPlain: `ด้านจ่ายที่ ${item.route}`,
        workDays: item.workDays,
        liters: liters,
        fuelCost: fuelCost,
        maintCost: maintCost,
        sumTotal: sumTotal,
        signature: item.signature,
        remarks: item.remarks
      });
    } else {
      // 1. Group 'ตรวจสอบการนำจ่าย' into a single row
      const inspectMissions = item.missions.filter(m => m.type === 'ตรวจสอบการนำจ่าย');
      if (inspectMissions.length > 0) {
        let rawInspectionLiters = 0;
        let inspectDays = 0;
        let inspectMaint = 0;

        inspectMissions.forEach(m => {
          const routeInfo = ROUTE_DATA[m.route];
          const dailyLiters = routeInfo ? routeInfo.workerLiters : 0;
          rawInspectionLiters += dailyLiters * m.days;
          inspectDays += m.days;
          inspectMaint += calculateSingleMissionMaint(item, m);
        });

        const liters = Math.ceil(rawInspectionLiters / 2);
        const fuelCost = liters * currentFuelPrice;
        const sumTotal = fuelCost + inspectMaint;

        flatRows.push({
          parentIndex,
          item,
          name: item.name,
          position: item.position,
          routeDescHtml: `ตรวจสอบการนำจ่าย`,
          routeDescPlain: `ตรวจสอบการนำจ่าย`,
          workDays: inspectDays,
          liters: liters,
          fuelCost: fuelCost,
          maintCost: inspectMaint,
          sumTotal: sumTotal,
          signature: item.signature,
          remarks: item.remarks
        });
      }

      // 2. Individual other missions ('นำจ่ายแทน', 'ฝึกสอนงาน') get their own rows
      const otherMissions = item.missions.filter(m => m.type !== 'ตรวจสอบการนำจ่าย');
      otherMissions.forEach(m => {
        const routeInfo = ROUTE_DATA[m.route];
        const dailyLiters = routeInfo ? routeInfo.workerLiters : 0;
        const liters = dailyLiters * m.days;
        const fuelCost = liters * currentFuelPrice;
        const maint = calculateSingleMissionMaint(item, m);
        const sumTotal = fuelCost + maint;

        flatRows.push({
          parentIndex,
          item,
          name: item.name,
          position: item.position,
          routeDescHtml: `${m.type} (ด้าน ${m.route})`,
          routeDescPlain: `${m.type} (ด้าน ${m.route})`,
          workDays: m.days,
          liters: liters,
          fuelCost: fuelCost,
          maintCost: maint,
          sumTotal: sumTotal,
          signature: item.signature,
          remarks: item.remarks
        });
      });
    }
  });

  // Render the flattened rows
  const employeeSubstituteTableBody = document.getElementById('employeeSubstituteTableBody');
  const substituteTableContainer = document.getElementById('substituteTableContainer');
  
  employeeTableBody.innerHTML = '';
  if (employeeSubstituteTableBody) {
    employeeSubstituteTableBody.innerHTML = '';
  }

  totalFuelCost = 0;
  totalMaintCost = 0;
  grandTotal = 0;

  flatRows.forEach((row) => {
    totalFuelCost += row.fuelCost;
    totalMaintCost += row.maintCost;
    grandTotal += row.sumTotal;
  });

  const filteredFlatRows = employeeSearchQuery
    ? flatRows.filter(row => 
        row.name.toLowerCase().includes(employeeSearchQuery) ||
        row.position.toLowerCase().includes(employeeSearchQuery) ||
        (row.item.duty && row.item.duty.toLowerCase().includes(employeeSearchQuery))
      )
    : flatRows;

  let regularCount = 0;
  let substituteCount = 0;

  filteredFlatRows.forEach((row) => {

    const tr = document.createElement('tr');
    
    // index is relative to the table section
    const currentTableIndex = row.item.isSubstitute ? ++substituteCount : ++regularCount;

    let planBtnHtml = '';
    if (row.item.formMode === 'supervisor') {
      planBtnHtml = `<button class="btn btn-primary btn-small print-plan-btn" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; margin-left: 0.2rem; background: var(--post-orange); border-color: var(--post-orange);">🖨️ แผนตรวจ</button>`;
    }

    tr.innerHTML = `
      <td>${currentTableIndex}</td>
      <td><strong>${row.name}</strong></td>
      <td><span class="badge position-${row.position.replace(/[\s\(\)\.]/g, '')}">${row.position} / ${row.item.duty || '-'}</span></td>
      <td style="font-size: 0.85rem; max-width: 220px; white-space: normal; word-break: break-word; line-height: 1.3;" title="${row.routeDescPlain}">${row.routeDescHtml}</td>
      <td>${row.liters.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ลิตร</td>
      <td>${row.fuelCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</td>
      <td>${row.maintCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</td>
      <td><strong style="color: var(--text-primary);">${row.sumTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</strong></td>
      <td><span style="font-family: var(--font-title); font-size: 0.85rem; font-style: italic; color: #eee; font-weight: 300;">${row.signature}</span></td>
      <td class="actions-col" style="width: 280px; white-space: nowrap;">
        <button class="btn btn-secondary btn-small edit-row-btn" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">✏️ แก้ไข</button>
        ${planBtnHtml}
        <button class="btn btn-secondary btn-small clone-row-btn" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; margin-left: 0.2rem;">📋 คัดลอก</button>
        <button class="btn btn-danger btn-small delete-row-btn" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; margin-left: 0.2rem;">🗑️ ลบ</button>
      </td>
    `;

    tr.querySelector('.edit-row-btn').addEventListener('click', () => openEditModal(false, row.parentIndex));
    if (row.item.formMode === 'supervisor') {
      tr.querySelector('.print-plan-btn').addEventListener('click', () => printSupervisorPlan(row.parentIndex));
    }
    tr.querySelector('.clone-row-btn').addEventListener('click', () => cloneRow(row.parentIndex));
    tr.querySelector('.delete-row-btn').addEventListener('click', () => deleteRow(row.parentIndex));

    if (row.item.isSubstitute) {
      employeeSubstituteTableBody.appendChild(tr);
    } else {
      employeeTableBody.appendChild(tr);
    }
  });

  // Handle placeholders and visibility
  if (regularCount === 0) {
    employeeTableBody.innerHTML = `
      <tr>
        <td colspan="10" class="no-data">ยังไม่มีรายการเบิกค่าน้ำมันหลัก</td>
      </tr>
    `;
  }

  if (substituteCount > 0) {
    substituteTableContainer.classList.remove('hidden');
  } else {
    substituteTableContainer.classList.add('hidden');
    if (employeeSubstituteTableBody) {
      employeeSubstituteTableBody.innerHTML = `
        <tr>
          <td colspan="10" class="no-data">ยังไม่มีรายการวิ่งแทน</td>
        </tr>
      `;
    }
  }

  sumFuelCostSpan.textContent = totalFuelCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  sumMaintenanceCostSpan.textContent = totalMaintCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  sumTotalCostSpan.textContent = grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function recalculateTableCosts() {
  renderEmployeeTable();
}

function loadRowToForm(index) {
  const item = employees[index];
  
  // Switch tab depending on mode without clearing index
  switchFormMode(item.formMode || 'standard', true);

  document.getElementById('empName').value = item.name;
  if (empNameSelect) {
    empNameSelect.value = item.name;
  }
  vehicleTypeSelect.value = item.vehicle;
  document.getElementById('isSubstitute').checked = item.isSubstitute || false;
  document.getElementById('remarks').value = item.remarks;
  document.getElementById('signature').value = item.signature;
  document.getElementById('editIndex').value = index;

  saveBtn.innerHTML = '✔️ อัปเดตข้อมูลพนักงาน';
  resetBtn.classList.remove('hidden');
  const formTitle = document.getElementById('formTitle');
  if (formTitle) formTitle.textContent = 'แก้ไขข้อมูลพนักงาน ลำดับที่ ' + (index + 1);

  if (item.formMode === 'supervisor') {
    tempMissions = [...item.missions];
    renderMissionsTable();
  } else {
    empPositionSelect.value = item.position;
    deliveryRouteSelect.value = item.route;
    claimMethodSelect.value = item.method;
    workDaysInput.value = item.workDays;
    daysNotWorkedInput.value = item.daysNotWorked;
    
    handlePositionSelect();
    handleRouteSelect();
  }
}

function cloneRow(index) {
  const cloned = JSON.parse(JSON.stringify(employees[index]));
  cloned.name = cloned.name + ' (สำเนา)';
  employees.push(cloned);
  saveEmployees(employees);
  renderEmployeeTable();
}

function deleteRow(index) {
  showConfirm({
    title: 'ยืนยันการลบ',
    message: 'คุณต้องการลบรายชื่อพนักงานนี้ใช่หรือไม่? ผลลัพธ์นี้ไม่สามารถย้อนคืนได้',
    icon: '🗑️',
    okText: 'ลบพนักงาน',
    onConfirm: () => {
      employees.splice(index, 1);
      saveEmployees(employees);
      renderEmployeeTable();
      showToast('ลบรายชื่อเรียบร้อยแล้ว!', 'success');
    }
  });
}

function cancelEdit() {
  document.getElementById('editIndex').value = '';
  if (empNameSelect) empNameSelect.value = '';
  // Mode-aware button text
  if (activeMode === 'water') {
    saveBtn.innerHTML = '📥 บันทึกข้อมูลค่าน้ำดื่ม';
    const formTitle = document.getElementById('formTitle');
    if (formTitle) formTitle.textContent = 'กรอกข้อมูลผู้รับค่าน้ำดื่ม';
  } else {
    saveBtn.innerHTML = '📥 บันทึกข้อมูลพนักงาน';
    const formTitle = document.getElementById('formTitle');
    if (formTitle) formTitle.textContent = 'กรอกข้อมูลผู้รับเงินค่าน้ำมัน';
  }
  resetBtn.classList.add('hidden');
  employeeForm.reset();
  document.getElementById('isSubstitute').checked = false;
  routeStatsPreview.classList.add('hidden');
  tempMissions = [];
  if (formModeInput.value === 'supervisor') {
    renderMissionsTable();
  }
}

function clearAllData() {
  if (activeMode === 'water') {
    showConfirm({
      title: 'ล้างข้อมูลค่าน้ำดื่มทั้งหมด',
      message: 'คุณต้องการลบข้อมูลการเบิกค่าน้ำดื่มทั้งหมดใช่หรือไม่? ผลลัพธ์นี้ไม่สามารถย้อนคืนได้',
      icon: '⚠️',
      okText: 'ล้างข้อมูล',
      onConfirm: () => {
        waterEmployees = [];
        saveWaterEmployees([]);
        cancelEdit();
        renderEmployeeTable();
        showToast('ล้างข้อมูลค่าน้ำดื่มเรียบร้อยแล้ว', 'success');
      }
    });
    return;
  }
  showConfirm({
    title: 'ล้างข้อมูลค่าน้ำมันทั้งหมด',
    message: 'คุณต้องการลบข้อมูลพนักงานทั้งหมดในตารางใช่หรือไม่? ผลลัพธ์นี้ไม่สามารถย้อนคืนได้',
    icon: '⚠️',
    okText: 'ล้างข้อมูล',
    onConfirm: () => {
      employees = [];
      saveEmployees([]);
      cancelEdit();
      renderEmployeeTable();
      showToast('ล้างข้อมูลเรียบร้อยแล้ว', 'success');
    }
  });
}

/* --- WEIGHTED AVERAGE CALCULATOR (MODAL LOGIC) --- */
function renderPeriodTable() {
  if (oilPricePeriods.length === 0) {
    periodTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="no-data">ยังไม่มีการเพิ่มช่วงราคา</td>
      </tr>
    `;
    avgCalcTotalDays.textContent = '0 วัน';
    avgCalcTotalSum.textContent = '0.00 บาท';
    avgCalcResultPrice.textContent = '0.00 บาท/ลิตร';
    applyAvgPriceBtn.disabled = true;
    return;
  }

  periodTableBody.innerHTML = '';
  let sumDays = 0;
  let sumWeightedProduct = 0;

  oilPricePeriods.forEach((period, idx) => {
    const product = period.price * period.days;
    sumDays += period.days;
    sumWeightedProduct += product;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td><strong>${period.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</strong></td>
      <td>${period.days} วัน</td>
      <td>${product.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</td>
      <td><button type="button" class="row-action-btn delete-period-btn">❌</button></td>
    `;
    
    tr.querySelector('.delete-period-btn').addEventListener('click', () => {
      oilPricePeriods.splice(idx, 1);
      renderPeriodTable();
    });

    periodTableBody.appendChild(tr);
  });

  const avgPrice = sumWeightedProduct / sumDays;

  avgCalcTotalDays.textContent = `${sumDays} วัน`;
  avgCalcTotalSum.textContent = `${sumWeightedProduct.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;
  avgCalcResultPrice.textContent = `${avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท/ลิตร`;
  applyAvgPriceBtn.disabled = sumDays === 0;
}

function addPricePeriod() {
  const price = parseFloat(priceInput.value);
  const days = parseInt(daysInput.value);

  if (isNaN(price) || isNaN(days) || price <= 0 || days <= 0) {
    showToast('กรุณากรอกราคาน้ำมันและจำนวนวันให้ถูกต้อง!', 'warning');
    return;
  }

  oilPricePeriods.push({ price, days });
  priceInput.value = '';
  daysInput.value = '';
  renderPeriodTable();
}

function applyAvgPriceToGlobal() {
  let sumDays = 0;
  let sumWeightedProduct = 0;

  oilPricePeriods.forEach(p => {
    sumDays += p.days;
    sumWeightedProduct += p.price * p.days;
  });

  if (sumDays > 0) {
    const finalAvg = sumWeightedProduct / sumDays;
    globalFuelPriceInput.value = finalAvg.toFixed(2);
    recalculateTableCosts();
    
    // Synchronize the average fuel price globally
    saveGlobalSetting('fuelPrice', { value: parseFloat(globalFuelPriceInput.value) || 38.50 });
    
    avgCalcModal.classList.remove('active');
  }
}

/* --- DEMO DATA LOADER --- */
/* --- DEMO DATA LOADER --- */
function loadDemoData() {
  if (activeMode === 'water') {
    const waterDemoList = [
      { name: "นายนิพล ทรัพย์หมื่นแสน", position: "เจ้าหน้าที่นำจ่ายไปรษณีย์/EMS/ด้านจ่ายพิเศษ", salary: 24500, workDays: 26, remarks: "นำจ่ายพัสดุ", signature: "นิพล ทรัพย์หมื่นแสน" },
      { name: "นางสาวสมหญิง สุจริต", position: "เจ้าหน้าที่ไขตู้ไปรษณีย์", salary: 28500, workDays: 26, remarks: "ไขตู้นอกพื้นที่", signature: "สมหญิง สุจริต" },
      { name: "นายปรีชา คุมงาน", position: "หัวหน้าโซนนำจ่าย", salary: 42000, workDays: 26, remarks: "หัวหน้าโซน 2", signature: "ปรีชา คุมงาน" },
      { name: "นายรุ่งโรจน์ สัญจร", position: "เจ้าหน้าที่รับฝากนอกที่ทำการ", salary: 58000, workDays: 24, remarks: "ฝากเคาน์เตอร์เคลื่อนที่", signature: "รุ่งโรจน์ สัญจร" }
    ];
    waterEmployees = waterDemoList;
    saveWaterEmployees(waterEmployees);
    renderEmployeeTable();
    return;
  }

  const demoList = [
    {
      formMode: "standard",
      name: "นายนิพล ทรัพย์หมื่นแสน",
      position: "พนักงาน",
      route: "20",
      vehicle: "รถจักรยานยนต์",
      method: "monthly",
      workDays: 26,
      daysNotWorked: 0,
      remarks: "หัวหน้าทำการ",
      signature: "นิพล ทรัพย์หมื่นแสน"
    },
    {
      formMode: "standard",
      name: "นางสาวสมหญิง สุจริต",
      position: "ลูกจ้างประจำ",
      route: "21",
      vehicle: "รถจักรยานยนต์ไฟฟ้า",
      method: "monthly",
      workDays: 26,
      daysNotWorked: 2,
      remarks: "Yamaha E-moto",
      signature: "สมหญิง สุจริต"
    },
    {
      formMode: "supervisor",
      name: "นายปรีชา คุมงาน",
      position: "หัวหน้าโซนนำจ่าย (ชนจ.)",
      vehicle: "รถจักรยานยนต์",
      missions: [
        {
          type: "ตรวจสอบการนำจ่าย",
          route: "20",
          days: 5,
          dates: "1, 8, 17, 23, 29",
          distance: 170.0, // 34km * 5
          liters: 8.5 // 170 / 20
        },
        {
          type: "นำจ่ายแทน",
          route: "21",
          days: 2,
          dates: "12, 19",
          distance: 136.0, // 68km * 2
          liters: 5.44 // 2.72 * 2
        }
      ],
      workDays: 7,
      remarks: "ตรวจโซน 1",
      signature: "ปรีชา คุมงาน"
    },
    {
      formMode: "standard",
      name: "นายรุ่งโรจน์ สัญจร",
      position: "ลูกจ้างรายวัน",
      route: "22",
      vehicle: "รถยนต์",
      method: "daily",
      workDays: 24,
      remarks: "เก๋ง โตโยต้า",
      signature: "รุ่งโรจน์ สัญจร"
    }
  ];

  employees = demoList;
  saveEmployees(employees);

  oilPricePeriods = [
    { price: 30.18, days: 9 },
    { price: 30.68, days: 8 },
    { price: 31.68, days: 3 },
    { price: 32.68, days: 3 },
    { price: 34.68, days: 2 },
    { price: 40.68, days: 5 }
  ];

  applyAvgPriceToGlobal();
}

/* --- EXPORT CSV (EXCEL FRIENDLY) --- */
function exportToCsv() {
  if (activeMode === 'water') {
    if (waterEmployees.length === 0) {
      showToast('ไม่มีข้อมูลที่จะส่งออก!', 'warning');
      return;
    }
    let csvContent = "\uFEFF";
    csvContent += "ลำดับ,ชื่อ-นามสกุล,ปฏิบัติหน้าที่,เงินเดือน (บาท),จำนวนวันทำงาน,รวมค่าน้ำดื่ม (บาท),ภาษีหัก ณ ที่จ่าย (บาท),ยอดเงินจ่ายสุทธิ (บาท),ลายมือชื่อผู้รับเงิน,หมายเหตุ\n";
    
    waterEmployees.forEach((item, index) => {
      const allowance = item.workDays * 30;
      const tax = calculateWaterTax(item.salary, allowance);
      const net = allowance - tax;
      csvContent += `${index + 1},"${item.name}","${item.position} / ${item.duty || '-'}",${item.salary},${item.workDays},${allowance.toFixed(2)},${tax.toFixed(2)},${net.toFixed(2)},"${item.signature}","${item.remarks}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const m = globalMonthSelect.options[globalMonthSelect.selectedIndex].text;
    const y = globalYearSelect.value;
    link.setAttribute("download", `เบิกค่าน้ำดื่ม_${m}_${y}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  if (employees.length === 0) {
    showToast('ไม่มีข้อมูลที่จะส่งออก!', 'warning');
    return;
  }

  const currentFuelPrice = parseFloat(globalFuelPriceInput.value) || 38.50;
  let csvContent = "\uFEFF";
  
  csvContent += "ลำดับ,ชื่อ-นามสกุล,ตำแหน่ง/บทบาท,รายละเอียดด้านจ่าย/ภารกิจ,วันทำงาน,ปริมาณน้ำมัน (ลิตร),ค่าน้ำมัน (บาท),ค่าบำรุงรักษา (บาท),รวมเบิกจ่าย (บาท),ลายมือชื่อผู้รับเงิน,หมายเหตุ\n";
  
  let flatRows = [];
  employees.forEach((item, parentIndex) => {
    if (item.formMode !== 'supervisor') {
      const liters = calculateClaimLiters(item);
      const fuelCost = liters * currentFuelPrice;
      const maintCost = calculateMaintenanceCost(item);
      const sumTotal = fuelCost + maintCost;

      flatRows.push({
        name: item.name,
        position: item.isSubstitute ? `${item.position} / ${item.duty || '-'} (วิ่งแทน)` : `${item.position} / ${item.duty || '-'}`,
        routeDesc: `ด้านจ่ายที่ ${item.route}` + (item.isSubstitute ? ' (วิ่งแทน)' : ''),
        workDays: item.workDays,
        liters: liters,
        fuelCost: fuelCost,
        maintCost: maintCost,
        sumTotal: sumTotal,
        signature: item.signature,
        remarks: item.remarks
      });
    } else {
      // 1. Group 'ตรวจสอบการนำจ่าย'
      const inspectMissions = item.missions.filter(m => m.type === 'ตรวจสอบการนำจ่าย');
      if (inspectMissions.length > 0) {
        let rawInspectionLiters = 0;
        let inspectDays = 0;
        let inspectMaint = 0;

        inspectMissions.forEach(m => {
          const routeInfo = ROUTE_DATA[m.route];
          const dailyLiters = routeInfo ? routeInfo.workerLiters : 0;
          rawInspectionLiters += dailyLiters * m.days;
          inspectDays += m.days;
          inspectMaint += calculateSingleMissionMaint(item, m);
        });

        const liters = Math.ceil(rawInspectionLiters / 2);
        const fuelCost = liters * currentFuelPrice;
        const sumTotal = fuelCost + inspectMaint;

        flatRows.push({
          name: item.name,
          position: `${item.position} / ${item.duty || '-'}`,
          routeDesc: `ตรวจสอบการนำจ่าย`,
          workDays: inspectDays,
          liters: liters,
          fuelCost: fuelCost,
          maintCost: inspectMaint,
          sumTotal: sumTotal,
          signature: item.signature,
          remarks: item.remarks
        });
      }

      // 2. Individual other missions ('นำจ่ายแทน', 'ฝึกสอนงาน') get their own rows
      const otherMissions = item.missions.filter(m => m.type !== 'ตรวจสอบการนำจ่าย');
      otherMissions.forEach(m => {
        const routeInfo = ROUTE_DATA[m.route];
        const dailyLiters = routeInfo ? routeInfo.workerLiters : 0;
        const liters = dailyLiters * m.days;
        const fuelCost = liters * currentFuelPrice;
        const maint = calculateSingleMissionMaint(item, m);
        const sumTotal = fuelCost + maint;

        flatRows.push({
          name: item.name,
          position: `${item.position} / ${item.duty || '-'}`,
          routeDesc: `${m.type} (ด้าน ${m.route})`,
          workDays: m.days,
          liters: liters,
          fuelCost: fuelCost,
          maintCost: maint,
          sumTotal: sumTotal,
          signature: item.signature,
          remarks: item.remarks
        });
      });
    }
  });

  flatRows.forEach((row, index) => {
    csvContent += `${index + 1},"${row.name}","${row.position}","${row.routeDesc}",${row.workDays},${row.liters.toFixed(2)},${row.fuelCost.toFixed(2)},${row.maintCost.toFixed(2)},${row.sumTotal.toFixed(2)},"${row.signature}","${row.remarks}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  
  const m = globalMonthSelect.options[globalMonthSelect.selectedIndex].text;
  const y = globalYearSelect.value;
  link.setAttribute("download", `เบิกค่าน้ำมัน_${m}_${y}.csv`);
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* --- PRINT PDF / A4 LAYOUT REPORT --- */
function printReport() {
  if (activeMode === 'water') {
    if (waterEmployees.length === 0) {
      showToast('ไม่มีข้อมูลที่จะพิมพ์!', 'warning');
      return;
    }

    // Sort water employees by name (Thai alphabetical order ก-ฮ)
    waterEmployees.sort((a, b) => a.name.localeCompare(b.name, 'th'));
    
    const monthText = globalMonthSelect.options[globalMonthSelect.selectedIndex].text;
    const yearText = globalYearSelect.value;
    
    let totalAllowanceVal = 0;
    let totalTaxVal = 0;
    let totalNetVal = 0;
    let tableRowsHtml = '';
    
    waterEmployees.forEach((item, index) => {
      const allowance = item.workDays * 30;
      const tax = calculateWaterTax(item.salary, allowance);
      const net = allowance - tax;
      
      totalAllowanceVal += allowance;
      totalTaxVal += tax;
      totalNetVal += net;
      
      tableRowsHtml += `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${item.name}</strong></td>
          <td>${item.position} / ${item.duty || '-'}</td>
          <td>${item.workDays} วัน</td>
          <td>${allowance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td>${tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td><strong>${net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
          <td><span style="font-family: 'Sarabun', sans-serif; font-style: italic; font-size: 9pt; color: #444; font-weight: 300;">${item.signature}</span></td>
          <td><span style="font-size: 8pt; color: #444;">${item.remarks}</span></td>
        </tr>
      `;
    });
    
    // Signatures mapping for water print
    const sigMakerTitleVal = document.getElementById('sigMakerTitle').value.trim() || 'ผู้จัดทำ';
    const sigMakerNameVal = document.getElementById('sigMakerName').value.trim() || '..........................................................';
    const sigMakerPosVal = document.getElementById('sigMakerPos').value.trim() || '..........................................................';
    
    const sigCheckerTitleVal = document.getElementById('sigCheckerTitle').value.trim() || 'ผู้ตรวจสอบ';
    const sigCheckerNameVal = document.getElementById('sigCheckerName').value.trim() || '..........................................................';
    const sigCheckerPosVal = document.getElementById('sigCheckerPos').value.trim() || '..........................................................';
    
    const sigApproverTitleVal = document.getElementById('sigApproverTitle').value.trim() || 'ผู้อนุมัติ';
    const sigApproverNameVal = document.getElementById('sigApproverName').value.trim() || '..........................................................';
    const sigApproverPosVal = document.getElementById('sigApproverPos').value.trim() || '..........................................................';
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>พิมพ์รายงานค่าน้ำดื่ม_${monthText}_${yearText}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          body {
            background: white !important;
            color: black !important;
            font-family: 'Sarabun', sans-serif !important;
            margin: 0 !important;
            padding: 0.5cm !important;
          }
          @page {
            size: A4 portrait;
            margin: 0.3cm;
          }
          .print-header {
            text-align: center;
            margin-bottom: 0.2rem !important;
            padding-bottom: 0.15rem !important;
            border-bottom: 2px double #000 !important;
          }
          .print-title-container h2 {
            font-size: 10.5pt !important;
            font-weight: bold;
            margin: 0 0 0.15rem 0;
          }
          .print-title-container h3 {
            font-size: 9pt !important;
            font-weight: bold;
            margin: 0 0 0.15rem 0;
          }
          .print-title-container p {
            font-size: 8pt;
            margin: 0 0 0.25rem 0;
          }
          .print-meta-info {
            text-align: right;
            font-size: 6.8pt !important;
            color: #444;
          }
          .print-meta-info p {
            margin: 0 0 0.05rem 0;
          }
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 1rem;
          }
          .print-table th, 
          .print-table td {
            border: 1px solid black !important;
            padding: 2.2px 2px !important;
            font-size: 6.8pt !important;
            line-height: 1.15 !important;
            color: black !important;
            background: transparent !important;
          }
          .print-table th {
            font-weight: bold !important;
            text-align: center !important;
          }
          .print-table td {
            text-align: left;
            height: 14px !important;
            vertical-align: middle !important;
          }
          .print-table td:nth-child(2) {
            font-size: 11pt !important;
            font-weight: bold !important;
          }
          .print-table td:nth-child(1),
          .print-table td:nth-child(4),
          .print-table td:nth-child(5),
          .print-table td:nth-child(6),
          .print-table td:nth-child(7),
          .print-table td:nth-child(8) {
            text-align: center !important;
          }
          .print-summary-section {
            display: flex;
            justify-content: flex-end;
            margin-top: 0.2rem !important;
            margin-bottom: 0.2rem !important;
          }
          .summary-block {
            width: 280px;
            font-size: 7pt !important;
          }
          .summary-block p {
            display: flex;
            justify-content: space-between;
            margin: 0 0 0.05rem 0;
          }
          .final-sum {
            font-weight: bold;
            border-top: 1px solid black;
            border-bottom: 4px double #000;
            padding: 2px 0;
            margin-top: 2px;
            font-size: 7.8pt !important;
          }
          .print-signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 0.3rem !important;
            page-break-inside: avoid;
          }
          .sig-box {
            text-align: center;
            width: 32%;
            font-size: 7pt !important;
            line-height: 1.3 !important;
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <div class="print-title-container">
            <h2>แบบฟอร์มการเบิกค่าน้ำดื่ม สำหรับผู้ปฏิบัติงานภายนอกที่ทำการ</h2>
            <h3>บริษัท ไปรษณีย์ไทย จำกัด</h3>
            <p>ประจำเดือน ${monthText} พ.ศ. ${yearText}</p>
          </div>
          <div class="print-meta-info">
            <p>เดบิต: <strong>ค่าอาหารและเครื่องดื่ม CA POS 51-9925-01</strong></p>
            <p>เครดิต: <strong>เจ้าหนี้พนักงาน CA POS 21-9999-08</strong></p>
            <p>หักภาษี ณ ที่จ่าย: <strong>21-99-15-01</strong> (เงินเดือนเกิน 25,833 บ.)</p>
          </div>
        </div>

        <table class="print-table">
          <thead>
            <tr>
              <th style="width: 4%">ลำดับ</th>
              <th style="width: 19%">ชื่อ - นามสกุลผู้รับเงิน</th>
              <th style="width: 18%">ปฏิบัติหน้าที่</th>
              <th style="width: 7%">วันปฏิบัติงาน</th>
              <th style="width: 10%">รวมเป็นเงิน (บาท)</th>
              <th style="width: 7%">ภาษี (ถ้ามี)</th>
              <th style="width: 10%">คงเหลือสุทธิ (บาท)</th>
              <th style="width: 15%">ลายมือชื่อผู้รับเงิน</th>
              <th style="width: 10%">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div class="print-summary-section">
          <div class="summary-block">
            <p>จำนวนรายชื่อผู้เบิกทั้งสิ้น: <strong>${waterEmployees.length}</strong> ราย</p>
            <p>ค่าน้ำดื่มรวมทั้งสิ้น: <strong>${totalAllowanceVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> บาท</p>
            <p>ภาษีหัก ณ ที่จ่ายรวมทั้งสิ้น: <strong>${totalTaxVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> บาท</p>
            <p class="final-sum">ยอดเงินจ่ายสุทธิรวมทั้งสิ้น: <strong>${totalNetVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> บาท</p>
          </div>
        </div>

        <div class="print-signatures">
          <div class="sig-box">
            <p>ลงชื่อ..........................................................${sigMakerTitleVal}</p>
            <p style="margin-top: 0.5rem;">(${sigMakerNameVal})</p>
            <p>ตำแหน่ง ${sigMakerPosVal}</p>
          </div>
          <div class="sig-box">
            <p>ลงชื่อ..........................................................${sigCheckerTitleVal}</p>
            <p style="margin-top: 0.5rem;">(${sigCheckerNameVal})</p>
            <p>ตำแหน่ง ${sigCheckerPosVal}</p>
          </div>
          <div class="sig-box">
            <p>ลงชื่อ..........................................................${sigApproverTitleVal}</p>
            <p style="margin-top: 0.5rem;">(${sigApproverNameVal})</p>
            <p>ตำแหน่ง ${sigApproverPosVal}</p>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
    return;
  }

  if (employees.length === 0) {
    showToast('ไม่มีข้อมูลที่จะพิมพ์!', 'warning');
    return;
  }

  // Sort employees by name (Thai alphabetical order ก-ฮ)
  employees.sort((a, b) => a.name.localeCompare(b.name, 'th'));

  const currentFuelPrice = parseFloat(globalFuelPriceInput.value) || 38.50;
  
  // Get signatory values onto print preview
  const sigMakerTitleVal = document.getElementById('sigMakerTitle').value.trim() || 'ผู้จัดทำ';
  const sigMakerNameVal = document.getElementById('sigMakerName').value.trim() || '..........................................................';
  const sigMakerPosVal = document.getElementById('sigMakerPos').value.trim() || '..........................................................';
  
  const sigCheckerTitleVal = document.getElementById('sigCheckerTitle').value.trim() || 'ผู้ตรวจสอบ';
  const sigCheckerNameVal = document.getElementById('sigCheckerName').value.trim() || '..........................................................';
  const sigCheckerPosVal = document.getElementById('sigCheckerPos').value.trim() || '..........................................................';
  
  const sigApproverTitleVal = document.getElementById('sigApproverTitle').value.trim() || 'ผู้อนุมัติ';
  const sigApproverNameVal = document.getElementById('sigApproverName').value.trim() || '..........................................................';
  const sigApproverPosVal = document.getElementById('sigApproverPos').value.trim() || '..........................................................';

  const monthText = globalMonthSelect.options[globalMonthSelect.selectedIndex].text;
  const yearText = globalYearSelect.value;

  // Categorize standard employees and supervisors separately
  let listStaffAndRegular = []; // Page 1: พนักงาน และ ลูกจ้างประจำ
  let listDailyAndTemp = [];     // Page 2: ลูกจ้างรายวัน และ ลูกจ้าง
  let listContractors = [];     // Page 3: ลูกจ้างเหมา
  let listSubstitutes = [];     // Page 4: วิ่งแทน
  let supervisors = [];         // Page 5+: หัวหน้าโซนนำจ่าย (ชนจ.)

  employees.forEach((item) => {
    if (item.formMode === 'supervisor') {
      supervisors.push(item);
    } else {
      const liters = calculateClaimLiters(item);
      const fuelCost = liters * currentFuelPrice;
      const maintCost = calculateMaintenanceCost(item);
      const sumTotal = fuelCost + maintCost;

      const rowObj = {
        name: item.name,
        position: item.position,
        duty: item.duty || '-',
        routeDesc: `ด้านจ่ายที่ ${item.route}`,
        workDays: item.workDays,
        liters: liters,
        fuelCost: fuelCost,
        maintCost: maintCost,
        sumTotal: sumTotal,
        signature: item.signature,
        remarks: item.remarks
      };

      if (item.isSubstitute) {
        listSubstitutes.push(rowObj);
      } else {
        const posLower = (item.position || '').toLowerCase();
        if (posLower.includes('พนักงาน') || posLower.includes('ลูกจ้างประจำ')) {
          listStaffAndRegular.push(rowObj);
        } else if (posLower.includes('เหมา')) {
          listContractors.push(rowObj);
        } else {
          listDailyAndTemp.push(rowObj);
        }
      }
    }
  });

  let pagesHtml = [];

  // Function to render standard page HTML
  const buildStandardPageHtml = (title, list) => {
    if (list.length === 0) return '';

    let totalFuelCost = 0;
    let totalMaintCost = 0;
    let grandTotal = 0;

    let tableRowsHtml = list.map((row, idx) => {
      totalFuelCost += row.fuelCost;
      totalMaintCost += row.maintCost;
      grandTotal += row.sumTotal;

      return `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${row.name}</strong></td>
          <td>${row.position} / ${row.duty || '-'}</td>
          <td style="text-align: left !important; font-size: 7.5pt; line-height: 1.3;">${row.routeDesc}</td>
          <td>${row.workDays} วัน</td>
          <td>${row.liters.toFixed(2)}</td>
          <td>${row.fuelCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td>${row.maintCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td><strong>${row.sumTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
          <td><span style="font-family: 'Sarabun', sans-serif; font-style: italic; font-size: 8.5pt; color: #444; font-weight: 300;">${row.signature}</span></td>
          <td><span style="font-size: 7.5pt; color: #444;">${row.remarks}</span></td>
        </tr>
      `;
    }).join('');

    return `
      <div class="print-page-section">
        <div class="print-header">
          <div class="print-title-container">
            <h2>ใบหลักฐานการเบิกจ่ายเงินค่าน้ำมันเชื้อเพลิงและค่าบำรุงรักษายานพาหนะ</h2>
            <h3>บริษัท ไปรษณีย์ไทย จำกัด (${title})</h3>
            <p>ประจำเดือน ${monthText} พ.ศ. ${yearText}</p>
          </div>
          <div class="print-meta-info">
            <p>ราคาน้ำมันถัวเฉลี่ยอ้างอิง: <strong>${currentFuelPrice.toFixed(2)} บาท/ลิตร</strong></p>
          </div>
        </div>

        <table class="print-table">
          <thead>
            <tr>
              <th style="width: 5%">ลำดับ</th>
              <th style="width: 20%">ชื่อ - นามสกุลผู้รับเงิน</th>
              <th style="width: 12%">ตำแหน่ง / บทบาท</th>
              <th style="width: 15%">รายละเอียดภารกิจ / ด้านจ่าย</th>
              <th style="width: 8%">วันทำงาน</th>
              <th style="width: 8%">น้ำมัน (ลิตร)</th>
              <th style="width: 8%">ค่าน้ำมัน (บาท)</th>
              <th style="width: 8%">ค่าบำรุงรักษา (บาท)</th>
              <th style="width: 8%">รวมเงิน (บาท)</th>
              <th style="width: 10%">ลายมือชื่อผู้รับเงิน</th>
              <th style="width: 10%">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div class="print-summary-section">
          <div class="summary-block">
            <p>จำนวนรายชื่อผู้รับเงินกลุ่มนี้: <strong>${list.length}</strong> ราย</p>
            <p>รวมค่าน้ำมันเชื้อเพลิงกลุ่มนี้: <strong>${totalFuelCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> บาท</p>
            <p>รวมค่าบำรุงรักษากลุ่มนี้: <strong>${totalMaintCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> บาท</p>
            <p class="final-sum">ยอดเงินเบิกจ่ายรวมทั้งสิ้น (กลุ่มนี้): <strong>${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> บาท</p>
          </div>
        </div>

        <div class="print-signatures">
          <div class="sig-box">
            <p>ลงชื่อ..........................................................${sigMakerTitleVal}</p>
            <p style="margin-top: 0.5rem;">(${sigMakerNameVal})</p>
            <p>ตำแหน่ง ${sigMakerPosVal}</p>
          </div>
          <div class="sig-box">
            <p>ลงชื่อ..........................................................${sigCheckerTitleVal}</p>
            <p style="margin-top: 0.5rem;">(${sigCheckerNameVal})</p>
            <p>ตำแหน่ง ${sigCheckerPosVal}</p>
          </div>
          <div class="sig-box">
            <p>ลงชื่อ..........................................................${sigApproverTitleVal}</p>
            <p style="margin-top: 0.5rem;">(${sigApproverNameVal})</p>
            <p>ตำแหน่ง ${sigApproverPosVal}</p>
          </div>
        </div>
      </div>
    `;
  };

  if (listStaffAndRegular.length > 0) pagesHtml.push(buildStandardPageHtml('พนักงาน และ ลูกจ้างประจำ', listStaffAndRegular));
  if (listDailyAndTemp.length > 0) pagesHtml.push(buildStandardPageHtml('ลูกจ้างรายวัน และ ลูกจ้าง', listDailyAndTemp));
  if (listContractors.length > 0) pagesHtml.push(buildStandardPageHtml('ลูกจ้างเหมา', listContractors));
  if (listSubstitutes.length > 0) pagesHtml.push(buildStandardPageHtml('วิ่งแทน', listSubstitutes));

  // Render Page for individual Supervisors (ชนจ.)
  supervisors.forEach((sv) => {
    let totalLiters = 0;
    let totalMaint = 0;
    let totalFuel = 0;
    let totalDays = 0;
    let sumTotal = 0;

    let subRowsHtml = [];
    let rowIdx = 1;

    // 1. Render Grouped 'ตรวจสอบการนำจ่าย' missions
    const inspectMissions = sv.missions.filter(m => m.type === 'ตรวจสอบการนำจ่าย');
    if (inspectMissions.length > 0) {
      let rawInspectionLiters = 0;
      let inspectDays = 0;
      let inspectMaint = 0;
      let routesUsed = [];

      inspectMissions.forEach(m => {
        const routeInfo = ROUTE_DATA[m.route];
        const dailyLiters = routeInfo ? routeInfo.workerLiters : 0;
        rawInspectionLiters += dailyLiters * m.days;
        inspectDays += m.days;
        inspectMaint += calculateSingleMissionMaint(sv, m);
        routesUsed.push(m.route);
      });

      const liters = Math.ceil(rawInspectionLiters / 2);
      const fuelCost = liters * currentFuelPrice;
      const rowSum = fuelCost + inspectMaint;

      totalLiters += liters;
      totalMaint += inspectMaint;
      totalFuel += fuelCost;
      totalDays += inspectDays;
      sumTotal += rowSum;

      subRowsHtml.push(`
        <tr>
          <td>${rowIdx++}</td>
          <td><strong>${sv.name}</strong></td>
          <td>${sv.position || 'หัวหน้าโซนนำจ่าย'} / ${sv.duty || '-'}</td>
          <td style="text-align: left !important; font-size: 7.5pt;">ตรวจสอบการนำจ่าย (ด้าน ${routesUsed.join(', ')})</td>
          <td>${inspectDays} วัน</td>
          <td>${liters.toFixed(2)}</td>
          <td>${fuelCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td>${inspectMaint.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td><strong>${rowSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
          <td><span style="font-family: 'Sarabun', sans-serif; font-style: italic; font-size: 8.5pt; color: #444; font-weight: 300;">${sv.signature}</span></td>
          <td><span style="font-size: 7.5pt; color: #444;">${sv.remarks || ''}</span></td>
        </tr>
      `);
    }

    // 2. Render other individual missions ('นำจ่ายแทน', 'ฝึกสอนงาน')
    const otherMissions = sv.missions.filter(m => m.type !== 'ตรวจสอบการนำจ่าย');
    otherMissions.forEach(m => {
      const routeInfo = ROUTE_DATA[m.route];
      const dailyLiters = routeInfo ? routeInfo.workerLiters : 0;
      const liters = dailyLiters * m.days;
      const fuelCost = liters * currentFuelPrice;
      const maint = calculateSingleMissionMaint(sv, m);
      const rowSum = fuelCost + maint;

      totalLiters += liters;
      totalMaint += maint;
      totalFuel += fuelCost;
      totalDays += m.days;
      sumTotal += rowSum;

      subRowsHtml.push(`
        <tr>
          <td>${rowIdx++}</td>
          <td><strong>${sv.name}</strong></td>
          <td>${sv.position || 'หัวหน้าโซนนำจ่าย'} / ${sv.duty || '-'}</td>
          <td style="text-align: left !important; font-size: 7.5pt;">${m.type} (ด้าน ${m.route})</td>
          <td>${m.days} วัน</td>
          <td>${liters.toFixed(2)}</td>
          <td>${fuelCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td>${maint.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td><strong>${rowSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
          <td><span style="font-family: 'Sarabun', sans-serif; font-style: italic; font-size: 8.5pt; color: #444; font-weight: 300;">${sv.signature}</span></td>
          <td><span style="font-size: 7.5pt; color: #444;">${sv.remarks || ''}</span></td>
        </tr>
      `);
    });

    // Append the Total Bold Sum row
    subRowsHtml.push(`
      <tr style="background: rgba(0,0,0,0.03); font-weight: bold;">
        <td colspan="4" style="text-align: right !important;">รวมยอดทั้งหมดของ ${sv.name}:</td>
        <td>${totalDays} วัน</td>
        <td>${totalLiters.toFixed(2)}</td>
        <td>${totalFuel.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td>${totalMaint.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="border-bottom: 4px double #000 !important; font-size: 8.5pt;"><strong>${sumTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
        <td colspan="2"></td>
      </tr>
    `);

    pagesHtml.push(`
      <div class="print-page-section">
        <div class="print-header">
          <div class="print-title-container">
            <h2>ใบหลักฐานการเบิกจ่ายเงินค่าน้ำมันเชื้อเพลิงและค่าบำรุงรักษายานพาหนะ</h2>
            <h3>บริษัท ไปรษณีย์ไทย จำกัด (หัวหน้าโซนนำจ่าย - ชนจ. รายบุคคล)</h3>
            <p>ประจำเดือน ${monthText} พ.ศ. ${yearText}</p>
          </div>
          <div class="print-meta-info">
            <p>ราคาน้ำมันถัวเฉลี่ยอ้างอิง: <strong>${currentFuelPrice.toFixed(2)} บาท/ลิตร</strong></p>
          </div>
        </div>

        <table class="print-table">
          <thead>
            <tr>
              <th style="width: 5%">ลำดับ</th>
              <th style="width: 20%">ชื่อ - นามสกุลผู้รับเงิน</th>
              <th style="width: 12%">ตำแหน่ง / บทบาท</th>
              <th style="width: 15%">รายละเอียดภารกิจ / ด้านจ่าย</th>
              <th style="width: 8%">วันทำงาน</th>
              <th style="width: 8%">น้ำมัน (ลิตร)</th>
              <th style="width: 8%">ค่าน้ำมัน (บาท)</th>
              <th style="width: 8%">ค่าบำรุงรักษา (บาท)</th>
              <th style="width: 8%">รวมเงิน (บาท)</th>
              <th style="width: 10%">ลายมือชื่อผู้รับเงิน</th>
              <th style="width: 10%">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            ${subRowsHtml.join('')}
          </tbody>
        </table>

        <div class="print-summary-section">
          <div class="summary-block">
            <p>จำนวนงานภารกิจย่อย: <strong>${rowIdx - 1}</strong> รายการ</p>
            <p>รวมค่าน้ำมันของบุคคลนี้: <strong>${totalFuel.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> บาท</p>
            <p>รวมค่าบำรุงรักษาของบุคคลนี้: <strong>${totalMaint.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> บาท</p>
            <p class="final-sum">ยอดรวมสุทธิบุคคลนี้: <strong>${sumTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> บาท</p>
          </div>
        </div>

        <div class="print-signatures">
          <div class="sig-box">
            <p>ลงชื่อ..........................................................${sigMakerTitleVal}</p>
            <p style="margin-top: 0.5rem;">(${sigMakerNameVal})</p>
            <p>ตำแหน่ง ${sigMakerPosVal}</p>
          </div>
          <div class="sig-box">
            <p>ลงชื่อ..........................................................${sigCheckerTitleVal}</p>
            <p style="margin-top: 0.5rem;">(${sigCheckerNameVal})</p>
            <p>ตำแหน่ง ${sigCheckerPosVal}</p>
          </div>
          <div class="sig-box">
            <p>ลงชื่อ..........................................................${sigApproverTitleVal}</p>
            <p style="margin-top: 0.5rem;">(${sigApproverNameVal})</p>
            <p>ตำแหน่ง ${sigApproverPosVal}</p>
          </div>
        </div>
      </div>
    `);
  });

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>พิมพ์ใบเบิกค่าน้ำมัน_${monthText}_${yearText}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        body {
          background: white !important;
          color: black !important;
          font-family: 'Sarabun', sans-serif !important;
          margin: 0 !important;
          padding: 0.2cm 0.5cm !important;
        }
        @page {
          size: A4 landscape;
          margin: 0.5cm;
        }
        .print-page-section {
          page-break-after: always;
          margin-bottom: 0;
        }
        .print-page-section:last-child {
          page-break-after: avoid;
          margin-bottom: 0;
        }
        .print-header {
          text-align: center;
          margin-bottom: 0.4rem;
          border-bottom: 3px double #000;
          padding-bottom: 0.2rem;
        }
        .print-title-container h2 {
          font-size: 13pt;
          font-weight: bold;
          margin: 0 0 0.15rem 0;
        }
        .print-title-container h3 {
          font-size: 11pt;
          font-weight: bold;
          margin: 0 0 0.15rem 0;
        }
        .print-title-container p {
          font-size: 9pt;
          margin: 0 0 0.25rem 0;
        }
        .print-meta-info {
          text-align: right;
          font-size: 8pt;
          color: #444;
        }
        .print-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 0.5rem;
          table-layout: fixed;
        }
        .print-table th, 
        .print-table td {
          border: 1px solid black !important;
          padding: 3px 2px !important;
          font-size: 6.5pt !important;
          color: black !important;
          background: transparent !important;
          white-space: normal !important;
          word-break: break-word !important;
        }
        .print-table th {
          font-weight: bold !important;
          text-align: center !important;
          padding: 4px 2px !important;
        }
        .print-table td {
          text-align: left;
          height: 30px !important;
          vertical-align: middle !important;
        }
        .print-table td:nth-child(2) {
          font-size: 11pt !important;
          font-weight: bold !important;
        }
        .print-table td:nth-child(1),
        .print-table td:nth-child(4),
        .print-table td:nth-child(5),
        .print-table td:nth-child(6),
        .print-table td:nth-child(7),
        .print-table td:nth-child(8),
        .print-table td:nth-child(9),
        .print-table td:nth-child(10) {
          text-align: center !important;
        }
        .print-summary-section {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 0.5rem;
        }
        .summary-block {
          width: 280px;
          font-size: 9pt;
          line-height: 1.4;
        }
        .summary-block p {
          display: flex;
          justify-content: space-between;
          margin: 0 0 0.15rem 0;
        }
        .final-sum {
          font-weight: bold;
          border-top: 1px solid black;
          border-bottom: 4px double #000;
          padding: 2px 0;
          margin-top: 2px;
          font-size: 10pt;
        }
        .print-signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 1rem;
          page-break-inside: avoid;
        }
        .sig-box {
          text-align: center;
          width: 32%;
          font-size: 8.5pt;
          line-height: 1.5;
        }
      </style>
    </head>
    <body>
      ${pagesHtml.join('')}
      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() {
            window.close();
          };
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

function printSupervisorPlan(parentIndex) {
  const item = employees[parentIndex];
  if (!item || item.formMode !== 'supervisor') {
    showToast('ข้อมูลพนักงานไม่ถูกต้อง หรือไม่ใช่หัวหน้าโซนนำจ่าย (ชนจ.)', 'error');
    return;
  }

  // Filter for delivery inspection (ตรวจสอบการนำจ่าย) missions
  const inspectMissions = item.missions.filter(m => m.type === 'ตรวจสอบการนำจ่าย');
  if (inspectMissions.length === 0) {
    showToast('หัวหน้าโซนคนนี้ไม่มีภารกิจ "ตรวจสอบการนำจ่าย" จึงไม่มีแผนการออกตรวจสอบ', 'warning');
    return;
  }

  const postOfficeName = globalPostOfficeNameInput ? (globalPostOfficeNameInput.value.trim() || 'มาบตาพุด') : 'มาบตาพุด';
  const monthText = globalMonthSelect.options[globalMonthSelect.selectedIndex].text;
  const yearText = globalYearSelect.value;

  const postmasterName = document.getElementById('sigMakerName').value.trim() || 'นายนิพล ทรัพย์หมื่นแสน';
  const postmasterPos = document.getElementById('sigMakerPos').value.trim() || 'หัวหน้าทำการไปรษณีย์มาบตาพุด';

  let tableRowsHtml = [];
  let totalInspectDist = 0;
  let totalLiters = 0;

  inspectMissions.forEach(m => {
    const routeInfo = ROUTE_DATA[m.route];
    const dailyDist = routeInfo ? routeInfo.workerDist : 0;
    const dailyLiters = routeInfo ? routeInfo.workerLiters : 0;

    const dateArray = m.dates.split(',').map(d => d.trim()).filter(d => d.length > 0);
    
    dateArray.forEach(dt => {
      const halfDist = dailyDist / 2;
      const liters = dailyLiters / 2;
      
      totalInspectDist += halfDist;
      totalLiters += liters;

      tableRowsHtml.push(`
        <tr>
          <td>ด้านจ่ายที่ ${m.route}</td>
          <td>${dt}</td>
          <td>${dailyDist.toFixed(2)}</td>
          <td>${halfDist.toFixed(2)}</td>
          <td>${liters.toFixed(2)}</td>
        </tr>
      `);
    });
  });

  const numRoutes = inspectMissions.length;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>แผนตรวจสอบการนำจ่าย_${item.name}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        body {
          background: white !important;
          color: black !important;
          font-family: 'Sarabun', sans-serif !important;
          margin: 0 !important;
          padding: 0.8cm !important;
        }
        @page {
          size: A4 portrait;
          margin: 0.5cm;
        }
        .print-plan-attachment {
          text-align: right;
          font-size: 10pt;
          font-weight: normal;
          color: black;
        }
        .print-plan-title {
          text-align: center;
          font-size: 14pt;
          font-weight: bold;
          text-decoration: underline;
          margin: 1rem 0 1.5rem 0;
          color: black;
        }
        .print-plan-paragraph {
          text-indent: 1.5cm;
          font-size: 11pt;
          line-height: 1.6;
          text-align: justify;
          margin: 0 0 1.5rem 0;
          color: black;
        }
        .print-plan-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1.5rem;
        }
        .print-plan-table th, .print-plan-table td {
          border: 1px solid black !important;
          padding: 6px 8px !important;
          font-size: 10pt !important;
          text-align: center !important;
          color: black !important;
        }
        .print-plan-table th {
          font-weight: bold !important;
          background: #f2f2f2 !important;
        }
        .print-plan-signatures {
          margin-top: 2rem;
          font-size: 10.5pt;
          line-height: 1.8;
          color: black;
        }
        .print-plan-sig-row {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 2rem;
        }
        .print-plan-sig-box {
          text-align: center;
          width: 350px;
          color: black;
        }
        .print-plan-approval-section {
          margin-top: 3rem;
          font-size: 10.5pt;
          line-height: 1.8;
          border-top: 1px dashed black;
          padding-top: 1.5rem;
          color: black;
        }
      </style>
    </head>
    <body>
      <div class="print-plan-attachment">เอกสารแนบ 1</div>
      <div class="print-plan-title">แบบขออนุมัติแผนการออกตรวจสอบการนำจ่าย</div>
      
      <div class="print-plan-paragraph">
        <strong>(1) เรียน หน.ปณ. ${postOfficeName}</strong>
      </div>
      
      <div class="print-plan-paragraph">
        ข้าพเจ้า <strong>${item.name}</strong> ตำแหน่ง <strong>${item.position || 'หัวหน้าโซนนำจ่าย'}</strong> ที่ทำการไปรษณีย์<strong>${postOfficeName}</strong> ขออนุมัติแผนการออกตรวจสอบการนำจ่าย ประจำเดือน <strong>${monthText}</strong> พ.ศ. <strong>${yearText}</strong> ตามบันทึก ปณท ที่ ปณท รป. (นจ. 1)/951 ลว. 22 กันยายน 2560 เรื่อง วิธีปฏิบัติในการเบิกจ่ายเงินค่าบำรุง ค่าน้ำมันเชื้อเพลิงและค่าไฟฟ้าไฟฟ้ายานพาหนะส่วนตัวหรือยานพาหนะเช่าซื้อที่นำมาปฏิบัติงานของหัวหน้าโซนนำจ่าย (ชนจ.) ซึ่งข้าพเจ้า มีด้านจ่ายในความรับผิดชอบ จำนวน <strong>${numRoutes}</strong> ด้านจ่าย มีระยะทางออกตรวจสอบการนำจ่าย รวม <strong>${totalInspectDist.toFixed(2)}</strong> กม. โดยมีรายละเอียด ดังนี้
      </div>

      <table class="print-plan-table">
        <thead>
          <tr>
            <th>ด้านจ่ายในความรับผิดชอบ</th>
            <th>ว./ด./ป. ที่ออกตรวจสอบ</th>
            <th>ระยะทาง (กม./วัน)</th>
            <th>ระยะทางออกตรวจสอบการนำจ่าย<br>(ครึ่งหนึ่งของระยะทางด้านจ่าย) (กม./วัน)</th>
            <th>น้ำมันเชื้อเพลิงที่ใช้ (ลิตร/วัน)</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml.join('')}
          <tr style="font-weight: bold; background: #f2f2f2;">
            <td colspan="3" style="text-align: right !important;">รวม</td>
            <td>${totalInspectDist.toFixed(2)}</td>
            <td>${totalLiters.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div class="print-plan-paragraph" style="margin-top: 1.5rem;">
        จึงเรียน มาเพื่อโปรดพิจารณาอนุมัติต่อไปด้วย
      </div>

      <div class="print-plan-signatures">
        <div class="print-plan-sig-row">
          <div class="print-plan-sig-box">
            <p>..........................................................</p>
            <p><strong>(${item.name})</strong></p>
            <p>ตำแหน่ง ${item.position || 'หัวหน้าโซนนำจ่าย'}</p>
            <p>วันที่......... เดือน.................................. พ.ศ. ................</p>
          </div>
        </div>
      </div>

      <div class="print-plan-approval-section">
        <p><strong>(2) ความเห็นของหัวหน้าทำการไปรษณีย์</strong></p>
        <p style="margin-left: 1.5cm;">
          ( &nbsp; ) อนุมัติ<br>
          ( &nbsp; ) อื่นๆ ............................................................................................................
        </p>
        
        <div class="print-plan-sig-row" style="margin-top: 1.5rem;">
          <div class="print-plan-sig-box">
            <p>..........................................................</p>
            <p><strong>(${postmasterName})</strong></p>
            <p>ตำแหน่ง ${postmasterPos}</p>
            <p>วันที่......... เดือน.................................. พ.ศ. ................</p>
          </div>
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() {
            window.close();
          };
          setTimeout(function() { window.close(); }, 500);
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

/* --- SAVED TEMPLATES / BATCH MANAGER LOGIC --- */
function updateTemplateSelectDropdown() {
  const savedTemplates = JSON.parse(localStorage.getItem('tp_saved_templates')) || {};
  templateSelect.innerHTML = '<option value="" disabled selected>-- เลือกรายชื่อที่บันทึกไว้ --</option>';
  
  Object.keys(savedTemplates).forEach(name => {
    const templateData = savedTemplates[name];
    // Filter templates matching current active mode
    const isWaterTemplate = templateData && templateData.mode === 'water';
    const currentIsWater = activeMode === 'water';
    
    // Support legacy format where templateData is just an array of employees (defaults to fuel)
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

  // Pass activeMode to database helper
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
    // Handle both new schema { employees, mode } and legacy array schema
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

  ROUTE_DATA[route] = {
    hasCar,
    workerDist,
    workerLiters,
    staffDist,
    staffLiters
  };

  await saveRouteData(ROUTE_DATA);
  
  // Re-render table and dropdown descriptions
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
    // Unlock all inputs
    inputs.forEach(input => input.disabled = false);
    toggleSigEditBtn.innerHTML = '🔒 ล็อกผู้ลงนาม';
    toggleSigEditBtn.style.background = 'var(--post-orange)';
    toggleSigEditBtn.style.color = '#fff';
    inputs[1].focus(); // Focus on the maker's name field
  } else {
    // Lock all inputs and save to Firestore
    inputs.forEach(input => input.disabled = true);
    toggleSigEditBtn.innerHTML = '✏️ แก้ไขผู้ลงนาม';
    toggleSigEditBtn.style.background = 'transparent';
    toggleSigEditBtn.style.color = 'var(--post-orange)';

    // Save customized signatories to cloud
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

      // Synchronize active signatories to other devices
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
  
  // Pre-select import mode option matching the current active mode
  const targetRadio = document.querySelector(`input[name="importTargetMode"][value="${activeMode}"]`);
  if (targetRadio) {
    targetRadio.checked = true;
  }
  
  attendanceImportModal.classList.add('active');
}

function cleanThaiNameForMatching(name) {
  if (!name) return "";
  // Remove all spaces, tabs, dots, dashes, asterisks and quotes
  let cleaned = name.replace(/[\s\t\n\r\.\*\"\'\-]/g, "");
  // Remove common Thai prefixes
  cleaned = cleaned.replace(/^(นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.)/, "");
  return cleaned;
}

function handleAttendancePaste() {
  // Allow text to load inside textarea on next event loop tick
  setTimeout(() => {
    const text = importPastedText.value;
    const lines = text.split('\n');
    
    tempParsedRecords = [];
    importPreviewTableBody.innerHTML = '';
    
    let matchCount = 0;
    
    // Check target systems
    const targetRadio = document.querySelector('input[name="importTargetMode"]:checked');
    const targetMode = targetRadio ? targetRadio.value : 'both';
    
    lines.forEach(line => {
      const cleanedLine = line.trim();
      if (!cleanedLine) return;
      
      // 1. Extract days (the last number in range 0-31)
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
      
      // 2. Extract name components
      const tokens = cleanedLine.split(/[\t\s]+/).map(t => t.trim()).filter(Boolean);
      let nameParts = [];
      tokens.forEach(tok => {
        // Skip common symbols and status abbreviations to isolate names
        if (isNaN(tok) && tok !== '/' && tok !== 'ย' && tok !== 'พร' && tok !== 'ป' && tok !== 'ก' && tok.length > 1) {
          nameParts.push(tok);
        }
      });
      
      let parsedName = nameParts.join(' ');
      if (!parsedName) {
        // Fallback cleaner
        parsedName = cleanedLine.replace(/[0-9\/ยพรก\t\*\-\(\)]/g, ' ').replace(/\s+/g, ' ').trim();
      }
      
      if (parsedName.length < 3) return;
      
      // 3. Find matching employee in systems
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
      
      if (matchFound) {
        matchCount++;
        const typesLabel = targetLists.map(t => t.type === 'fuel' ? '⛽ ค่าน้ำมัน' : '🥤 ค่าน้ำดื่ม').join(' & ');
        matchStatusHtml = `<span style="color: var(--post-emerald); font-weight: bold;">✔️ จับคู่สำเร็จ (${matchingEmployeeName})<br><small style="color: var(--text-secondary); font-size: 0.75rem;">${typesLabel}</small></span>`;
      } else {
        matchStatusHtml = `<span style="color: #f59e0b;">⚠️ ไม่พบรายชื่อนี้ในระบบ</span>`;
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
        // Find suggestions using Levenshtein distance
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
        <td style="text-align: left; padding: 0.5rem 0.75rem;">
          <strong>${parsedName}</strong>
        </td>
        <td style="text-align: left; padding: 0.5rem 0.75rem; font-size: 0.8rem; line-height: 1.35;">
          ${matchStatusHtml}
        </td>
        <td style="padding: 0.5rem 0.75rem; font-weight: bold; color: var(--post-orange);">
          ${workDays !== null ? workDays + ' วัน' : '26 วัน (ค่าเริ่มต้น)'}
        </td>
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
    uniqueEmployees.push({ name: "นายนิพล ทรัพย์หมื่นแสน" });
    uniqueEmployees.push({ name: "นางสาวสมหญิง สุจริต" });
    uniqueEmployees.push({ name: "นายปรีชา คุมงาน" });
    uniqueEmployees.push({ name: "นายรุ่งโรจน์ สัญจร" });
  }
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Format Sheet Data with Custom Premium Styling
  const ws_data = [];
  
  // Title / Info Row
  ws_data.push(["แบบบันทึกวันมาทำงานพนักงาน (สำหรับนำเข้าข้อมูลเข้าระบบ)", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
  ws_data.push(["คำชี้แจง: / = มาทำงานปกติ (ระบบคำนวณนับเฉพาะเครื่องหมาย / นี้เท่านั้นเพื่อนำเข้าวันมาทำงาน)", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
  
  // Header row
  const headers = ["ลำดับ", "ชื่อ-สกุล"];
  for (let i = 1; i <= 31; i++) {
    headers.push(String(i));
  }
  headers.push("รวมมาทำงาน");
  ws_data.push(headers);
  
  const selectedYearBE = parseInt(document.getElementById('globalYear').value) || 2569;
  const selectedYearAD = selectedYearBE - 543;
  const selectedMonthJS = parseInt(globalMonthSelect.value) - 1; // 0-indexed month

  uniqueEmployees.forEach((emp, index) => {
    const rowIdx = index + 1;
    const xlRow = index + 4; // Headers are at row 3 (1-based index 3), data starts at row 4
    
    const rowData = [rowIdx, emp.name];
    
    // Find employee rest days in the master personnel list
    const registryPerson = personnel.find(p => p.name.trim().toLowerCase() === emp.name.trim().toLowerCase());
    const restDays = registryPerson ? (registryPerson.restDays || []) : [];

    // Pre-fill with '/' (present) or 'ย' (rest day)
    for (let d = 1; d <= 31; d++) {
      const date = new Date(selectedYearAD, selectedMonthJS, d);
      if (date.getMonth() !== selectedMonthJS) {
        rowData.push(""); // Out of bounds day for month
      } else {
        const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
        if (restDays.includes(dayOfWeek)) {
          rowData.push("ย");
        } else {
          rowData.push("/");
        }
      }
    }
    
    // Add Excel COUNTIF formula to ONLY sum '/' characters as requested
    const formula = `COUNTIF(C${xlRow}:AG${xlRow},"/")`;
    rowData.push({ f: formula });
    
    ws_data.push(rowData);
  });
  
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  
  // Merge cells for premium header titles
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 33 } }, // Merge Title
    { s: { r: 1, c: 0 }, e: { r: 1, c: 33 } }  // Merge Info
  ];
  
  // Set explicit professional column widths
  const colWidths = [
    { wch: 8 },  // ลำดับ
    { wch: 30 }  // ชื่อ-สกุล
  ];
  for (let d = 1; d <= 31; d++) {
    colWidths.push({ wch: 5 }); // 1 - 31 days
  }
  colWidths.push({ wch: 15 }); // รวมมาทำงาน
  ws['!cols'] = colWidths;
  
  // Apply Premium Styling using xlsx-js-style specifications
  const range = XLSX.utils.decode_range(ws['!ref']);
  
  // Style Definitions
  const titleStyle = {
    font: { name: "Segoe UI", sz: 16, bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "F55E0B" } }, // Thailand Post Orange Accent
    alignment: { horizontal: "center", vertical: "center" }
  };
  
  const descStyle = {
    font: { name: "Segoe UI", sz: 11, italic: true, color: { rgb: "555555" } },
    fill: { fgColor: { rgb: "FFF3E0" } }, // Soft Peach background
    alignment: { horizontal: "center", vertical: "center" }
  };
  
  const headerStyle = {
    font: { name: "Segoe UI", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "212121" } }, // Premium Dark Charcoal
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "medium", color: { rgb: "000000" } },
      bottom: { style: "medium", color: { rgb: "000000" } }
    }
  };
  
  const dataNameStyle = {
    font: { name: "Segoe UI", sz: 11 },
    alignment: { horizontal: "left", vertical: "center" },
    border: {
      bottom: { style: "thin", color: { rgb: "E0E0E0" } },
      left: { style: "thin", color: { rgb: "E0E0E0" } },
      right: { style: "thin", color: { rgb: "E0E0E0" } }
    }
  };
  
  const dataCenterStyle = {
    font: { name: "Segoe UI", sz: 11 },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      bottom: { style: "thin", color: { rgb: "E0E0E0" } },
      left: { style: "thin", color: { rgb: "E0E0E0" } },
      right: { style: "thin", color: { rgb: "E0E0E0" } }
    }
  };
  
  const sumStyle = {
    font: { name: "Segoe UI", sz: 11, bold: true, color: { rgb: "D32F2F" } }, // High contrast red for summary
    fill: { fgColor: { rgb: "FFEBEE" } }, // Soft pink highlight
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      bottom: { style: "double", color: { rgb: "D32F2F" } },
      left: { style: "thin", color: { rgb: "E0E0E0" } },
      right: { style: "thin", color: { rgb: "E0E0E0" } }
    }
  };
  
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: r, c: c });
      const cell = ws[cellRef];
      if (!cell) continue;
      
      if (r === 0) {
        cell.s = titleStyle;
      } else if (r === 1) {
        cell.s = descStyle;
      } else if (r === 2) {
        cell.s = headerStyle;
      } else {
        // Data rows
        if (c === 0) {
          cell.s = dataCenterStyle;
        } else if (c === 1) {
          cell.s = dataNameStyle;
        } else if (c === 33) {
          cell.s = sumStyle;
        } else {
          cell.s = dataCenterStyle;
        }
      }
    }
  }
  
  // Set Title row height (40px) and Subtitle height (25px)
  ws['!rows'] = [
    { hpx: 40 },
    { hpx: 25 },
    { hpx: 30 }
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, "บันทึกเวลาทำงาน");
  XLSX.writeFile(wb, "เทมเพลตบันทึกเวลาทำงาน.xlsx");
  
  showToast('ดาวน์โหลดเทมเพลต Excel (.xlsx) แบบมืออาชีพเรียบร้อย!', 'success');
}

/* --- PROFESSIONAL ATTENDANCE IMPORT FILE & TAB LOGIC --- */
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
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
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
      // If distance is small relative to name length, suggest it
      if (dist <= 4) {
        matches.push({ name: emp.name, type: 'fuel', index, dist });
      }
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
  
  // Sort by closest match (lowest edit distance)
  return matches.sort((a, b) => a.dist - b.dist).slice(0, 3);
}

// Global callback triggered when clicking a suggested match button in import previews
window.manuallyBindImportName = function(recordIndex, targetType, targetIndex, targetName) {
  const rec = tempParsedRecords[recordIndex];
  if (!rec) return;
  
  // Clean existing targets
  rec.matched = true;
  
  const originalEmp = targetType === 'fuel' ? employees[targetIndex] : waterEmployees[targetIndex];
  rec.targets = [{
    type: targetType,
    index: targetIndex,
    original: originalEmp
  }];
  
  // Update UI row status
  const statusCellId = `import-status-cell-${recordIndex}`;
  const cell = document.getElementById(statusCellId);
  if (cell) {
    const typesLabel = targetType === 'fuel' ? '⛽ ค่าน้ำมัน' : '🥤 ค่าน้ำดื่ม';
    cell.innerHTML = `<span style="color: var(--post-emerald); font-weight: bold;">✔️ เชื่อมต่อสำเร็จ (${targetName})<br><small style="color: var(--text-secondary); font-size: 0.75rem;">${typesLabel} (จับคู่ด้วยตนเอง)</small></span>`;
  }
  
  // Update submit button counter
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
            if (val === '/') {
              workDays++;
            }
          }
        }
        
        if (!dayColumnFilled || workDays === 0) {
          const lastVal = parseInt(row[row.length - 1]);
          if (!isNaN(lastVal) && lastVal >= 0 && lastVal <= 31) {
            workDays = lastVal;
          } else {
            workDays = 26;
          }
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
        tempParsedRecords.push({
          name: nameVal,
          newDays: workDays,
          matched: matchFound,
          targets: targetLists
        });
        
        let matchStatusHtml = '';
        if (matchFound) {
          matchCount++;
          const typesLabel = targetLists.map(t => t.type === 'fuel' ? '⛽ ค่าน้ำมัน' : '🥤 ค่าน้ำดื่ม').join(' & ');
          matchStatusHtml = `<span style="color: var(--post-emerald); font-weight: bold;">✔️ จับคู่สำเร็จ (${matchingEmployeeName})<br><small style="color: var(--text-secondary); font-size: 0.75rem;">${typesLabel}</small></span>`;
        } else {
          // Find suggestions using Levenshtein distance
          const suggestions = findCloseFuzzyMatches(nameVal, targetMode);
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
          <td style="text-align: left; padding: 0.5rem 0.75rem;">
            <strong>${nameVal}</strong>
          </td>
          <td style="text-align: left; padding: 0.5rem 0.75rem; font-size: 0.8rem; line-height: 1.35;">
            ${matchStatusHtml}
          </td>
          <td style="padding: 0.5rem 0.75rem; font-weight: bold; color: var(--post-orange);">
            ${workDays} วัน
          </td>
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

/* --- PERSONNEL EXCEL/CSV IMPORT LOGIC --- */
function openPersonnelImportModal() {
  console.log("openPersonnelImportModal: click detected");
  const pastedText = document.getElementById('personnelImportPastedText');
  const previewTableBody = document.getElementById('personnelImportPreviewTableBody');
  const submitBtn = document.getElementById('submitPersonnelImportBtn');
  const modal = document.getElementById('personnelImportModal');

  console.log("openPersonnelImportModal: elements fetched", { pastedText, previewTableBody, submitBtn, modal });

  if (pastedText) pastedText.value = '';
  if (previewTableBody) previewTableBody.innerHTML = '<tr><td colspan="6" class="no-data" style="text-align: center; padding: 1.5rem;">ยังไม่มีข้อมูล รอโหลดไฟล์หรือวางข้อมูลเพื่อประมวลผล</td></tr>';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '✔️ ยืนยันนำเข้าข้อมูล';
  }
  
  tempParsedPersonnelRecords.length = 0;
  console.log("openPersonnelImportModal: tempParsedPersonnelRecords cleared");
  
  if (modal) {
    modal.classList.add('active');
    console.log("openPersonnelImportModal: active class added");
  }
}

function switchPersonnelImportTab(tab) {
  const tabFile = document.getElementById('tabPersonnelImportFile');
  const tabText = document.getElementById('tabPersonnelImportText');
  const fileContent = document.getElementById('personnelImportFileContent');
  const textContent = document.getElementById('personnelImportTextContent');

  if (tab === 'file') {
    if (tabFile) {
      tabFile.classList.add('active');
      tabFile.style.color = 'var(--post-orange)';
      tabFile.style.borderBottom = '3px solid var(--post-orange)';
    }
    if (tabText) {
      tabText.classList.remove('active');
      tabText.style.color = 'var(--text-secondary)';
      tabText.style.borderBottom = '3px solid transparent';
    }
    if (fileContent) fileContent.classList.remove('hidden');
    if (textContent) textContent.classList.add('hidden');
  } else {
    if (tabText) {
      tabText.classList.add('active');
      tabText.style.color = 'var(--post-orange)';
      tabText.style.borderBottom = '3px solid var(--post-orange)';
    }
    if (tabFile) {
      tabFile.classList.remove('active');
      tabFile.style.color = 'var(--text-secondary)';
      tabFile.style.borderBottom = '3px solid transparent';
    }
    if (textContent) textContent.classList.remove('hidden');
    if (fileContent) fileContent.classList.add('hidden');
  }
}

function clearSelectedPersonnelImportFile() {
  const fileSelector = document.getElementById('personnelFileSelector');
  const selectedFileInfo = document.getElementById('personnelSelectedFileInfo');
  const dragDropZone = document.getElementById('personnelDragDropZone');
  const previewTableBody = document.getElementById('personnelImportPreviewTableBody');
  const submitBtn = document.getElementById('submitPersonnelImportBtn');

  if (fileSelector) fileSelector.value = '';
  if (selectedFileInfo) selectedFileInfo.classList.add('hidden');
  if (dragDropZone) dragDropZone.classList.remove('hidden');
  if (previewTableBody) previewTableBody.innerHTML = '<tr><td colspan="9" class="no-data" style="text-align: center; padding: 1.5rem;">ยังไม่มีข้อมูล รอโหลดไฟล์หรือวางข้อมูลเพื่อประมวลผล</td></tr>';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '✔️ ยืนยันนำเข้าข้อมูล';
  }
  tempParsedPersonnelRecords.length = 0;
}

function parseRestDaysText(text) {
  const cleanText = String(text || '').trim();
  if (cleanText === 'เสาร์-อาทิตย์' || cleanText === 'เสาร์ - อาทิตย์' || cleanText === 'ส.-อา.' || cleanText === 'ส. - อา.') {
    return [0, 6];
  } else if (cleanText === 'วันอาทิตย์' || cleanText === 'อาทิตย์' || cleanText === 'อา.') {
    return [0];
  } else if (cleanText === 'วันเสาร์' || cleanText === 'เสาร์' || cleanText === 'ส.') {
    return [6];
  } else if (cleanText === 'วันจันทร์' || cleanText === 'จันทร์' || cleanText === 'จ.') {
    return [1];
  } else if (cleanText === 'วันอังคาร' || cleanText === 'อังคาร' || cleanText === 'อ.') {
    return [2];
  } else if (cleanText === 'วันพุธ' || cleanText === 'พุธ' || cleanText === 'พ.') {
    return [3];
  } else if (cleanText === 'วันพฤหัสบดี' || cleanText === 'พฤหัสบดี' || cleanText === 'พฤหัส' || cleanText === 'พฤ.') {
    return [4];
  } else if (cleanText === 'วันศุกร์' || cleanText === 'ศุกร์' || cleanText === 'ศ.') {
    return [5];
  }
  return [];
}

async function downloadPersonnelTemplateXlsx() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('รายชื่อบุคลากร');

  // Add headers
  worksheet.columns = [
    { header: 'ลำดับ', key: 'id', width: 8 },
    { header: 'ชื่อ-นามสกุล', key: 'name', width: 25 },
    { header: 'ตำแหน่ง', key: 'position', width: 18 },
    { header: 'แผนก/กลุ่มงาน', key: 'department', width: 18 },
    { header: 'หน้าที่', key: 'duty', width: 45 },
    { header: 'เงินเดือน (บาท)', key: 'salary', width: 18 },
    { header: 'ด้านจ่ายหลัก', key: 'route', width: 15 },
    { header: 'ประเภทพาหนะ (รถจักรยานยนต์/รถยนต์)', key: 'vehicle', width: 35 },
    { header: 'วันหยุดประจำสัปดาห์', key: 'restDaysText', width: 20 },
    { header: 'ลงนามเริ่มต้น (ชื่อเรียก)', key: 'signature', width: 25 }
  ];

  // Add mock rows
  worksheet.addRow({
    id: 1,
    name: 'นายสมศักดิ์ รักดี',
    position: 'ลูกจ้างประจำ',
    department: 'นำจ่าย',
    duty: 'เจ้าหน้าที่นำจ่ายไปรษณีย์/EMS/ด้านจ่ายพิเศษ',
    salary: 15000,
    route: '5',
    vehicle: 'รถจักรยานยนต์',
    restDaysText: 'เสาร์-อาทิตย์',
    signature: 'สมศักดิ์'
  });

  worksheet.addRow({
    id: 2,
    name: 'นางสาวสมศรี ทรงดี',
    position: 'ลูกจ้างเหมา',
    department: 'ไขตู้/ขนส่ง',
    duty: 'เจ้าหน้าที่ไขตู้ไปรษณีย์',
    salary: 12000,
    route: '12',
    vehicle: 'รถยนต์',
    restDaysText: 'วันอาทิตย์',
    signature: 'สมศรี'
  });

  // Apply dropdown data validations
  // Position (ตำแหน่ง) - Column C (3)
  // Department (แผนก/กลุ่มงาน) - Column D (4)
  // Duty (หน้าที่) - Column E (5)
  // Vehicle Type (ประเภทพาหนะ) - Column H (8)
  // Rest Days (วันหยุดประจำสัปดาห์) - Column I (9)
  for (let i = 2; i <= 500; i++) {
    worksheet.getCell(`C${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"หน.ปณ.,พนักงาน,ลูกจ้างประจำ,ลูกจ้าง,ลูกจ้างเหมา"']
    };

    worksheet.getCell(`D${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"นำจ่าย,ไขตู้/ขนส่ง,รับฝาก,บริหาร/ธุรการ"']
    };

    worksheet.getCell(`E${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"เจ้าหน้าที่นำจ่ายไปรษณีย์/EMS/ด้านจ่ายพิเศษ,เจ้าหน้าที่ไขตู้ไปรษณีย์,หัวหน้าโซนนำจ่าย,เจ้าหน้าที่รับฝากนอกที่ทำการ,ปณอ.(รับ/จ่าย)/ผู้ช่วยนำจ่าย"']
    };

    worksheet.getCell(`H${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"รถจักรยานยนต์,รถจักรยานยนต์ไฟฟ้า,เรือยนต์,รถยนต์"']
    };

    worksheet.getCell(`I${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"เสาร์-อาทิตย์,วันอาทิตย์,วันเสาร์,จันทร์,อังคาร,พุธ,พฤหัสบดี,ศุกร์,ไม่มี"']
    };
  }

  // Generate buffer and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'เทมเพลตรายชื่อบุคลากร.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function handlePersonnelPaste() {
  setTimeout(() => {
    const pastedText = document.getElementById('personnelImportPastedText');
    const previewTableBody = document.getElementById('personnelImportPreviewTableBody');
    const submitBtn = document.getElementById('submitPersonnelImportBtn');

    if (!pastedText || !previewTableBody) return;
    
    const text = pastedText.value;
    const lines = text.split('\n');
    
    tempParsedPersonnelRecords.length = 0;
    previewTableBody.innerHTML = '';
    
    lines.forEach(line => {
      const cleanedLine = line.trim();
      if (!cleanedLine) return;
      
      const tokens = cleanedLine.split('\t');
      if (tokens.length < 2) return;
      
      let name = tokens[0].trim();
      let position = tokens[1] ? tokens[1].trim() : 'ลูกจ้างประจำ';
      let department = tokens[2] ? tokens[2].trim() : 'นำจ่าย';
      let duty = tokens[3] ? tokens[3].trim() : 'เจ้าหน้าที่นำจ่ายไปรษณีย์/EMS/ด้านจ่ายพิเศษ';
      let salary = tokens[4] ? parseFloat(tokens[4].replace(/,/g, '')) || 0 : 0;
      let route = tokens[5] ? tokens[5].trim() : '';
      let vehicle = tokens[6] ? tokens[6].trim() : 'รถจักรยานยนต์';
      let restDaysText = tokens[7] ? tokens[7].trim() : 'ไม่มี';
      let signature = tokens[8] ? tokens[8].trim() : name.split(' ')[0];
      
      if (name === "ชื่อ-นามสกุล" || name === "ชื่อ - นามสกุล" || name.length < 2) return;
      
      const restDays = parseRestDaysText(restDaysText);
      const record = { name, position, department, duty, salary, route, vehicle, restDays, signature };
      tempParsedPersonnelRecords.push(record);
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="text-align: left; padding: 0.5rem 0.75rem;"><strong>${name}</strong></td>
        <td style="text-align: left; padding: 0.5rem 0.75rem;">${position}</td>
        <td style="text-align: left; padding: 0.5rem 0.75rem;">${department}</td>
        <td style="text-align: left; padding: 0.5rem 0.75rem;">${duty}</td>
        <td style="padding: 0.5rem 0.75rem;">${salary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</td>
        <td style="padding: 0.5rem 0.75rem;">${route ? 'ด้านที่ ' + route : '-'}</td>
        <td style="padding: 0.5rem 0.75rem;">${vehicle}</td>
        <td style="padding: 0.5rem 0.75rem;">${restDaysText}</td>
        <td style="padding: 0.5rem 0.75rem;"><span style="font-family: var(--font-title); font-style: italic; color: #ddd; font-weight: 300; font-size: 0.85rem;">${signature}</span></td>
      `;
      previewTableBody.appendChild(tr);
    });
    
    if (tempParsedPersonnelRecords.length === 0) {
      previewTableBody.innerHTML = '<tr><td colspan="9" class="no-data" style="text-align: center; padding: 1.5rem;">ยังไม่มีข้อมูล รอโหลดไฟล์หรือวางข้อมูลเพื่อประมวลผล</td></tr>';
      if (submitBtn) submitBtn.disabled = true;
    } else {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `✔️ ยืนยันนำเข้าข้อมูล (${tempParsedPersonnelRecords.length} รายชื่อ)`;
      }
    }
  }, 50);
}

function processUploadedPersonnelFile(file) {
  if (!file) return;
  
  const fileNameLabel = document.getElementById('personnelFileNameLabel');
  const selectedFileInfo = document.getElementById('personnelSelectedFileInfo');
  const dragDropZone = document.getElementById('personnelDragDropZone');
  const previewTableBody = document.getElementById('personnelImportPreviewTableBody');
  const submitBtn = document.getElementById('submitPersonnelImportBtn');

  if (fileNameLabel) fileNameLabel.textContent = `📂 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  if (selectedFileInfo) selectedFileInfo.classList.remove('hidden');
  if (dragDropZone) dragDropZone.classList.add('hidden');
  
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const XLSX = await getXLSX();
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      tempParsedPersonnelRecords.length = 0;
      if (previewTableBody) previewTableBody.innerHTML = '';
      
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length < 2) continue;
        
        let name = String(row[1] || '').trim();
        if (name.length < 2 || name === 'ชื่อ-นามสกุล' || name === 'ชื่อ - นามสกุล') continue;
        
        let position = String(row[2] || 'ลูกจ้างประจำ').trim();
        let department = String(row[3] || 'นำจ่าย').trim();
        let duty = String(row[4] || 'เจ้าหน้าที่นำจ่ายไปรษณีย์/EMS/ด้านจ่ายพิเศษ').trim();
        let salary = parseFloat(String(row[5] || '0').replace(/,/g, '')) || 0;
        let route = String(row[6] || '').trim();
        let vehicle = String(row[7] || 'รถจักรยานยนต์').trim();
        let restDaysText = String(row[8] || 'ไม่มี').trim();
        let signature = String(row[9] || '').trim() || name.split(' ')[0];
        
        const restDays = parseRestDaysText(restDaysText);
        const record = { name, position, department, duty, salary, route, vehicle, restDays, signature };
        tempParsedPersonnelRecords.push(record);
        
        if (previewTableBody) {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td style="text-align: left; padding: 0.5rem 0.75rem;"><strong>${name}</strong></td>
            <td style="text-align: left; padding: 0.5rem 0.75rem;">${position}</td>
            <td style="text-align: left; padding: 0.5rem 0.75rem;">${department}</td>
            <td style="text-align: left; padding: 0.5rem 0.75rem;">${duty}</td>
            <td style="padding: 0.5rem 0.75rem;">${salary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</td>
            <td style="padding: 0.5rem 0.75rem;">${route ? 'ด้านที่ ' + route : '-'}</td>
            <td style="padding: 0.5rem 0.75rem;">${vehicle}</td>
            <td style="padding: 0.5rem 0.75rem;">${restDaysText}</td>
            <td style="padding: 0.5rem 0.75rem;"><span style="font-family: var(--font-title); font-style: italic; color: #ddd; font-weight: 300; font-size: 0.85rem;">${signature}</span></td>
          `;
          previewTableBody.appendChild(tr);
        }
      }
      
      if (tempParsedPersonnelRecords.length === 0) {
        if (previewTableBody) previewTableBody.innerHTML = '<tr><td colspan="9" class="no-data" style="text-align: center; padding: 1.5rem;">ไม่พบแถวข้อมูลในไฟล์นี้</td></tr>';
        if (submitBtn) submitBtn.disabled = true;
      } else {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `✔️ ยืนยันนำเข้าข้อมูล (${tempParsedPersonnelRecords.length} รายชื่อ)`;
        }
      }
      
    } catch(err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการอ่านไฟล์ Excel กรุณาตรวจสอบรูปแบบตารางข้อมูล', 'error');
      clearSelectedPersonnelImportFile();
    }
  };
  
  reader.readAsArrayBuffer(file);
}

async function handleConfirmPersonnelImport() {
  if (tempParsedPersonnelRecords.length === 0) return;

  const duplicates = [];
  const nonDuplicates = [];

  tempParsedPersonnelRecords.forEach(record => {
    const originalIdx = personnel.findIndex(p => p.name.trim().toLowerCase() === record.name.trim().toLowerCase());
    if (originalIdx !== -1) {
      duplicates.push({
        newRecord: record,
        oldRecord: personnel[originalIdx],
        originalIdx: originalIdx
      });
    } else {
      nonDuplicates.push(record);
    }
  });

  if (duplicates.length === 0) {
    // Direct import
    nonDuplicates.forEach(record => personnel.push(record));
    await savePersonnelList(personnel);
    renderPersonnelTable();
    updateEmployeeSelectDropdown();
    
    const modal = document.getElementById('personnelImportModal');
    if (modal) modal.classList.remove('active');
    
    clearSelectedPersonnelImportFile();
    const pastedText = document.getElementById('personnelImportPastedText');
    if (pastedText) pastedText.value = '';
    
    showToast(`นำเข้าข้อมูลสำเร็จ ${nonDuplicates.length} รายการ`, 'success');
    return;
  }

  // Open duplicates comparative modal
  const dupModal = document.getElementById('personnelImportDuplicateModal');
  const countSpan = document.getElementById('importDuplicateCount');
  const listContainer = document.getElementById('importDuplicateListContainer');
  const cancelBtn = document.getElementById('cancelPersonnelImportDuplicateBtn');
  const closeBtn = document.getElementById('closePersonnelImportDuplicateModalBtn');
  const confirmBtn = document.getElementById('confirmPersonnelImportDuplicateBtn');
  const setAllNewBtn = document.getElementById('setAllImportNewBtn');
  const setAllOldBtn = document.getElementById('setAllImportOldBtn');

  countSpan.textContent = duplicates.length;
  listContainer.innerHTML = '';

  duplicates.forEach((dup, idx) => {
    const card = document.createElement('div');
    card.style.cssText = `
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-glass);
      border-radius: var(--radius-small);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    `;

    const oldRest = dup.oldRecord.restDays || [];
    const newRest = dup.newRecord.restDays || [];

    card.innerHTML = `
      <div style="font-weight: 700; font-size: 0.95rem; color: var(--post-orange); border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.35rem;">
        👤 ${dup.newRecord.name}
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.85rem;">
        <!-- Left: Old Data -->
        <div style="background: rgba(255,255,255,0.01); padding: 0.5rem; border-radius: 6px; border-left: 3px solid #71717a;">
          <div style="font-weight: 700; color: #a1a1aa; margin-bottom: 0.25rem;">💾 ข้อมูลเดิมในระบบ</div>
          <div>ตำแหน่ง: ${dup.oldRecord.position}</div>
          <div>แผนก: ${dup.oldRecord.department || 'ทั่วไป'}</div>
          <div>หน้าที่: ${dup.oldRecord.duty || '-'}</div>
          <div>เงินเดือน: ${dup.oldRecord.salary ? dup.oldRecord.salary.toLocaleString() : '0.00'} ฿</div>
          <div>ด้านจ่าย/พาหนะ: ${dup.oldRecord.route || '-'}/${dup.oldRecord.vehicle || '-'}</div>
          <div style="font-size: 0.75rem; color: #a1a1aa;">วันหยุด: ${oldRest.length > 0 ? oldRest.map(d => ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'][d]).join(', ') : 'ไม่มี'}</div>
        </div>
        <!-- Right: New Data -->
        <div style="background: rgba(245, 158, 11, 0.02); padding: 0.5rem; border-radius: 6px; border-left: 3px solid var(--post-orange);">
          <div style="font-weight: 700; color: var(--post-orange); margin-bottom: 0.25rem;">📥 ข้อมูลใหม่ที่จะนำเข้า</div>
          <div>ตำแหน่ง: ${dup.newRecord.position}</div>
          <div>แผนก: ${dup.newRecord.department || 'ทั่วไป'}</div>
          <div>หน้าที่: ${dup.newRecord.duty || '-'}</div>
          <div>เงินเดือน: ${dup.newRecord.salary ? dup.newRecord.salary.toLocaleString() : '0.00'} ฿</div>
          <div>ด้านจ่าย/พาหนะ: ${dup.newRecord.route || '-'}/${dup.newRecord.vehicle || '-'}</div>
          <div style="font-size: 0.75rem; color: var(--post-orange);">วันหยุด: ${newRest.length > 0 ? newRest.map(d => ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'][d]).join(', ') : 'ไม่มี'}</div>
        </div>
      </div>
      <div style="display: flex; gap: 1.5rem; justify-content: flex-end; padding-top: 0.25rem; font-size: 0.85rem;">
        <label style="cursor: pointer; display: inline-flex; align-items: center; gap: 0.25rem;">
          <input type="radio" name="choice-dup-${idx}" value="old" style="cursor: pointer;" /> ใช้ข้อมูลเดิม (เก่า)
        </label>
        <label style="cursor: pointer; display: inline-flex; align-items: center; gap: 0.25rem;">
          <input type="radio" name="choice-dup-${idx}" value="new" value="new" checked style="cursor: pointer;" /> ใช้ข้อมูลใหม่ (นำเข้า)
        </label>
      </div>
    `;

    listContainer.appendChild(card);
  });

  // Wire Set All actions
  setAllNewBtn.onclick = () => {
    duplicates.forEach((_, idx) => {
      const radio = document.querySelector(`input[name="choice-dup-${idx}"][value="new"]`);
      if (radio) radio.checked = true;
    });
  };

  setAllOldBtn.onclick = () => {
    duplicates.forEach((_, idx) => {
      const radio = document.querySelector(`input[name="choice-dup-${idx}"][value="old"]`);
      if (radio) radio.checked = true;
    });
  };

  // Wire Close Actions
  const closeDupModal = () => dupModal.classList.remove('active');
  cancelBtn.onclick = closeDupModal;
  closeBtn.onclick = closeDupModal;

  // Final confirmation logic
  confirmBtn.onclick = async () => {
    let overwritesCount = 0;
    let keepCount = 0;

    duplicates.forEach((dup, idx) => {
      const selectedRadio = document.querySelector(`input[name="choice-dup-${idx}"]:checked`);
      const val = selectedRadio ? selectedRadio.value : 'new';

      if (val === 'new') {
        // Overwrite
        const existingId = personnel[dup.originalIdx]?.id;
        if (existingId) dup.newRecord.id = existingId;
        personnel[dup.originalIdx] = dup.newRecord;
        overwritesCount++;
      } else {
        keepCount++;
      }
    });

    // Add new ones
    nonDuplicates.forEach(record => personnel.push(record));

    await savePersonnelList(personnel);
    renderPersonnelTable();
    updateEmployeeSelectDropdown();

    dupModal.classList.remove('active');
    const mainModal = document.getElementById('personnelImportModal');
    if (mainModal) mainModal.classList.remove('active');

    clearSelectedPersonnelImportFile();
    const pastedText = document.getElementById('personnelImportPastedText');
    if (pastedText) pastedText.value = '';

    showToast(`นำเข้าสำเร็จ! (รายใหม่: ${nonDuplicates.length}, เขียนทับ: ${overwritesCount}, ใช้ของเดิม: ${keepCount})`, 'success');
  };

  dupModal.classList.add('active');
}





