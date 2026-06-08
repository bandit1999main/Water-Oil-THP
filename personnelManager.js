import {
  savePersonnelList,
  fetchPersonnelList,
  isCloudConnected,
  saveEmployees,
  saveWaterEmployees,
  fetchAttendanceList,
  saveAttendanceRecord,
  saveAttendanceList,
  listenToAttendanceList
} from './database.js';

let tempParsedPersonnelRecords = [];
let isInitialized = false;

// Helpers to read/write global state on window
function getPersonnel() {
  return window.personnel || [];
}
function setPersonnel(val) {
  window.personnel = val;
}
function getActiveMode() {
  return window.activeMode || 'personnel';
}

export function initPersonnelManager() {
  if (isInitialized) {
    renderPersonnelTable();
    return;
  }
  isInitialized = true;

  // Bind personnel Form submit
  const personnelForm = document.getElementById('personnelForm');
  if (personnelForm) {
    personnelForm.addEventListener('submit', handlePersonnelFormSubmit);
  }

  // Bind reset button
  const resetPersonnelBtn = document.getElementById('resetPersonnelBtn');
  if (resetPersonnelBtn) {
    resetPersonnelBtn.addEventListener('click', cancelPersonnelEdit);
  }

  // Bind check duplicates
  const checkDuplicatesBtn = document.getElementById('checkDuplicatesBtn');
  if (checkDuplicatesBtn) {
    checkDuplicatesBtn.addEventListener('click', scanForDuplicateNames);
  }

  // Bind Export, Print, and Clear Report Buttons for Personnel
  const exportPersonnelCsvBtn = document.getElementById('exportPersonnelCsvBtn');
  if (exportPersonnelCsvBtn) {
    exportPersonnelCsvBtn.addEventListener('click', exportPersonnelCsv);
  }

  const printPersonnelReportBtn = document.getElementById('printPersonnelReportBtn');
  if (printPersonnelReportBtn) {
    printPersonnelReportBtn.addEventListener('click', printPersonnelReport);
  }

  const clearAllPersonnelBtn = document.getElementById('clearAllPersonnelBtn');
  if (clearAllPersonnelBtn) {
    clearAllPersonnelBtn.addEventListener('click', clearAllPersonnel);
  }

  // Bind custom department group show/hide
  const personDepartmentSelect = document.getElementById('personDepartment');
  const personDepartmentCustomGroup = document.getElementById('personDepartmentCustomGroup');
  if (personDepartmentSelect && personDepartmentCustomGroup) {
    personDepartmentSelect.addEventListener('change', () => {
      if (personDepartmentSelect.value === 'custom') {
        personDepartmentCustomGroup.classList.remove('hidden');
      } else {
        personDepartmentCustomGroup.classList.add('hidden');
      }
    });
  }

  // Personnel Import Modal Bindings
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
  if (btnTabPersonnelImportFile) {
    btnTabPersonnelImportFile.addEventListener('click', () => switchPersonnelImportTab('file'));
  }
  if (btnTabPersonnelImportText) {
    btnTabPersonnelImportText.addEventListener('click', () => switchPersonnelImportTab('text'));
  }
  if (zonePersonnelDragDrop && selPersonnelFile) {
    zonePersonnelDragDrop.addEventListener('click', () => selPersonnelFile.click());
    selPersonnelFile.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        processUploadedPersonnelFile(e.target.files[0]);
      }
    });
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

  // Wire up the registry edit modal
  wireRegistryEditModal();

  // Initial render
  renderPersonnelTable();

  // Tab Bar Switching
  const tabRegistryBtn = document.getElementById('tabRegistryBtn');
  const tabAttendanceBtn = document.getElementById('tabAttendanceBtn');
  const registryTabContent = document.getElementById('registryTabContent');
  const attendanceTabContent = document.getElementById('attendanceTabContent');

  if (tabRegistryBtn && tabAttendanceBtn && registryTabContent && attendanceTabContent) {
    tabRegistryBtn.addEventListener('click', () => {
      tabRegistryBtn.setAttribute('style', 'padding: 0.5rem 1rem; border-radius: 8px; font-weight: bold; background: var(--post-orange) !important; color: white !important; border: 1px solid var(--post-orange) !important; cursor: pointer;');
      tabAttendanceBtn.setAttribute('style', 'padding: 0.5rem 1rem; border-radius: 8px; font-weight: bold; background: var(--border-glass) !important; color: var(--text-primary) !important; border: 1px solid var(--border-glass) !important; cursor: pointer;');
      registryTabContent.style.display = 'block';
      attendanceTabContent.style.display = 'none';
      renderPersonnelTable();
    });

    tabAttendanceBtn.addEventListener('click', () => {
      tabAttendanceBtn.setAttribute('style', 'padding: 0.5rem 1rem; border-radius: 8px; font-weight: bold; background: var(--post-orange) !important; color: white !important; border: 1px solid var(--post-orange) !important; cursor: pointer;');
      tabRegistryBtn.setAttribute('style', 'padding: 0.5rem 1rem; border-radius: 8px; font-weight: bold; background: var(--border-glass) !important; color: var(--text-primary) !important; border: 1px solid var(--border-glass) !important; cursor: pointer;');
      registryTabContent.style.display = 'none';
      attendanceTabContent.style.display = 'block';
      initAttendanceGrid();
    });
  }
}

export function renderPersonnelTable() {
  const personnelTableBody = document.getElementById('personnelTableBody');
  if (!personnelTableBody) return;

  const personnel = getPersonnel();

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
  const query = (window.personnelSearchQuery || '').toLowerCase().trim();
  const filtered = [];
  personnel.forEach((person, originalIdx) => {
    const matches = !query || 
      person.name.toLowerCase().includes(query) ||
      person.position.toLowerCase().includes(query) ||
      (person.department && person.department.toLowerCase().includes(query)) ||
      (person.duty && person.duty.toLowerCase().includes(query));
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

// Expose to window so real-time updates from main.js can re-trigger render
window.renderPersonnelTable = renderPersonnelTable;

function editPersonnel(index) {
  const personnel = getPersonnel();
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
  const personnel = getPersonnel();
  const person = personnel[index];
  if (!person) return;

  window.showConfirm({
    title: '🗑️ ยืนยันลบรายชื่อบุคลากร',
    message: `คุณต้องการลบรายชื่อของ "${person.name}" ออกจากระบบทะเบียนบุคลากรหลักใช่หรือไม่?`,
    icon: '🗑️',
    okText: 'ยืนยันลบข้อมูล',
    okClass: 'btn-danger',
    onConfirm: async () => {
      personnel.splice(index, 1);
      setPersonnel(personnel);
      renderPersonnelTable();
      if (window.updateEmployeeSelectDropdown) {
        window.updateEmployeeSelectDropdown();
      }
      savePersonnelList(personnel);
      window.showToast('ลบข้อมูลบุคลากรสำเร็จ!', 'success');
    }
  });
}

function cancelPersonnelEdit() {
  const personnelForm = document.getElementById('personnelForm');
  if (personnelForm) personnelForm.reset();
  document.querySelectorAll('input[name="personRestDays"]').forEach(cb => cb.checked = false);
  document.getElementById('personnelEditIndex').value = '';
  document.getElementById('personnelFormTitle').textContent = 'ลงทะเบียนข้อมูลบุคลากร';
  document.getElementById('savePersonnelBtn').innerHTML = '📥 บันทึกบุคลากร';
  
  const resetPersonnelBtn = document.getElementById('resetPersonnelBtn');
  if (resetPersonnelBtn) resetPersonnelBtn.classList.add('hidden');
}

async function handlePersonnelFormSubmit(e) {
  e.preventDefault();
  
  const personNameInput = document.getElementById('personName');
  const personPositionSelect = document.getElementById('personPosition');
  const personDutySelect = document.getElementById('personDuty');
  const personDepartmentSelect = document.getElementById('personDepartment');
  const personDepartmentCustomInput = document.getElementById('personDepartmentCustom');
  const personSalaryInput = document.getElementById('personSalary');
  const personRouteSelect = document.getElementById('personRoute');
  const personVehicleSelect = document.getElementById('personVehicle');
  const personSignatureInput = document.getElementById('personSignature');
  const personnelEditIndexInput = document.getElementById('personnelEditIndex');
  const personDepartmentCustomGroup = document.getElementById('personDepartmentCustomGroup');
  const personnelForm = document.getElementById('personnelForm');
  const resetPersonnelBtn = document.getElementById('resetPersonnelBtn');

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

  const personnel = getPersonnel();

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
    const idx = parseInt(editIndexVal);
    const existingId = personnel[idx]?.id;
    if (existingId) item.id = existingId;
    personnel[idx] = item;
    personnelEditIndexInput.value = '';
    document.getElementById('personnelFormTitle').textContent = 'ลงทะเบียนข้อมูลบุคลากร';
    document.getElementById('savePersonnelBtn').innerHTML = '📥 บันทึกบุคลากร';
    if (resetPersonnelBtn) resetPersonnelBtn.classList.add('hidden');
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

  setPersonnel(personnel);
  if (personnelForm) personnelForm.reset();
  document.querySelectorAll('input[name="personRestDays"]').forEach(cb => cb.checked = false);
  if (personDepartmentCustomGroup) personDepartmentCustomGroup.classList.add('hidden');
  renderPersonnelTable();
  if (window.updateEmployeeSelectDropdown) {
    window.updateEmployeeSelectDropdown();
  }
  savePersonnelList(personnel);
  window.showToast(editIndexVal !== '' ? 'อัปเดตข้อมูลบุคลากรสำเร็จ!' : 'ลงทะเบียนบุคลากรสำเร็จ!', 'success');
}

function openDuplicateResolutionModal(newItem, duplicates) {
  const modal = document.getElementById('duplicateResolutionModal');
  const targetNameSpan = document.getElementById('duplicateTargetName');
  const listContainer = document.getElementById('duplicateRecordsList');
  const forceAddBtn = document.getElementById('addNewPersonnelBtn');
  const cancelBtn = document.getElementById('cancelDuplicateResolutionBtn');
  const closeBtn = document.getElementById('closeDuplicateResolutionModalBtn');
  const personnelForm = document.getElementById('personnelForm');
  const personDepartmentCustomGroup = document.getElementById('personDepartmentCustomGroup');

  targetNameSpan.textContent = newItem.name;
  listContainer.innerHTML = '';

  const personnel = getPersonnel();

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
      const existingId = personnel[dup.originalIdx]?.id;
      if (existingId) newItem.id = existingId;
      personnel[dup.originalIdx] = newItem;

      setPersonnel(personnel);
      if (personnelForm) personnelForm.reset();
      document.querySelectorAll('input[name="personRestDays"]').forEach(cb => cb.checked = false);
      if (personDepartmentCustomGroup) personDepartmentCustomGroup.classList.add('hidden');
      renderPersonnelTable();
      if (window.updateEmployeeSelectDropdown) {
        window.updateEmployeeSelectDropdown();
      }
      savePersonnelList(personnel);
      modal.classList.remove('active');
      window.showToast('บันทึกทับข้อมูลบุคลากรสำเร็จ!', 'success');
    });

    card.innerHTML = details;
    card.appendChild(btn);
    listContainer.appendChild(card);
  });

  // Re-wire force-add button
  const newForceAddBtn = forceAddBtn.cloneNode(true);
  forceAddBtn.parentNode.replaceChild(newForceAddBtn, forceAddBtn);
  newForceAddBtn.addEventListener('click', async () => {
    personnel.push(newItem);
    setPersonnel(personnel);
    if (personnelForm) personnelForm.reset();
    document.querySelectorAll('input[name="personRestDays"]').forEach(cb => cb.checked = false);
    if (personDepartmentCustomGroup) personDepartmentCustomGroup.classList.add('hidden');
    renderPersonnelTable();
    if (window.updateEmployeeSelectDropdown) {
      window.updateEmployeeSelectDropdown();
    }
    savePersonnelList(personnel);
    modal.classList.remove('active');
    window.showToast('ลงทะเบียนบุคลากรใหม่สำเร็จ!', 'success');
  });

  const closeActions = () => modal.classList.remove('active');
  cancelBtn.onclick = closeActions;
  closeBtn.onclick = closeActions;

  modal.classList.add('active');
}

function scanForDuplicateNames() {
  const personnel = getPersonnel();
  const nameGroups = {};
  personnel.forEach((p, idx) => {
    const cleanName = p.name.trim().toLowerCase();
    if (!nameGroups[cleanName]) nameGroups[cleanName] = [];
    nameGroups[cleanName].push({ ...p, originalIdx: idx });
  });

  const duplicateGroups = Object.values(nameGroups).filter(g => g.length > 1);

  if (duplicateGroups.length === 0) {
    window.showToast('ไม่พบรายชื่อซ้ำในระบบ!', 'success');
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
        window.showConfirm({
          title: 'ยืนยันการลบข้อมูลซ้ำ',
          message: `คุณต้องการลบข้อมูลพนักงาน "${person.name}" (${person.position} - ${person.department}) ใช่หรือไม่?`,
          onConfirm: async () => {
            const currentPersonnel = getPersonnel();
            currentPersonnel.splice(person.originalIdx, 1);
            setPersonnel(currentPersonnel);
            renderPersonnelTable();
            if (window.updateEmployeeSelectDropdown) {
              window.updateEmployeeSelectDropdown();
            }
            savePersonnelList(currentPersonnel);
            modal.classList.remove('active');
            window.showToast('ลบข้อมูลเรียบร้อย!', 'success');
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

function wireRegistryEditModal() {
  const modal = document.getElementById('editRegistryPersonnelModal');
  const form = document.getElementById('editRegistryPersonnelForm');
  const closeBtn = document.getElementById('closeRegistryEditModalBtn');
  const cancelBtn = document.getElementById('cancelRegistryEditModalBtn');
  const deptSelect = document.getElementById('modalPersonDepartment');
  const deptCustomGroup = document.getElementById('modalPersonDepartmentCustomGroup');
  const deptCustomInput = document.getElementById('modalPersonDepartmentCustom');

  if (!modal || !form) return;

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

    window.showConfirm({
      title: 'ยืนยันการแก้ไขข้อมูลบุคลากร',
      message: `คุณต้องการบันทึกการแก้ไขข้อมูลของ "${name}" ใช่หรือไม่?`,
      onConfirm: async () => {
        const personnel = getPersonnel();
        const existingId = personnel[idx]?.id;
        if (existingId) item.id = existingId;
        personnel[idx] = item;
        
        setPersonnel(personnel);
        renderPersonnelTable();
        if (window.updateEmployeeSelectDropdown) {
          window.updateEmployeeSelectDropdown();
        }
        savePersonnelList(personnel);
        modal.classList.remove('active');
        window.showToast('อัปเดตข้อมูลบุคลากรสำเร็จ!', 'success');
      }
    });
  });
}

function openPersonnelImportModal() {
  const pastedText = document.getElementById('personnelImportPastedText');
  const previewTableBody = document.getElementById('personnelImportPreviewTableBody');
  const submitBtn = document.getElementById('submitPersonnelImportBtn');
  const modal = document.getElementById('personnelImportModal');

  if (pastedText) pastedText.value = '';
  if (previewTableBody) previewTableBody.innerHTML = '<tr><td colspan="9" class="no-data" style="text-align: center; padding: 1.5rem;">ยังไม่มีข้อมูล รอโหลดไฟล์หรือวางข้อมูลเพื่อประมวลผล</td></tr>';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '✔️ ยืนยันนำเข้าข้อมูล';
  }
  
  tempParsedPersonnelRecords.length = 0;
  if (modal) modal.classList.add('active');
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
  if (!window.ExcelJS) {
    window.showToast('เกิดข้อผิดพลาดในการโหลดโมดูล ExcelJS', 'error');
    return;
  }
  const workbook = new window.ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('รายชื่อบุคลากร');

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
      const XLSX = await window.getXLSX();
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
      window.showToast('เกิดข้อผิดพลาดในการอ่านไฟล์ Excel กรุณาตรวจสอบรูปแบบตารางข้อมูล', 'error');
      clearSelectedPersonnelImportFile();
    }
  };
  
  reader.readAsArrayBuffer(file);
}

async function handleConfirmPersonnelImport() {
  if (tempParsedPersonnelRecords.length === 0) return;

  const personnel = getPersonnel();
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
    nonDuplicates.forEach(record => personnel.push(record));
    setPersonnel(personnel);
    renderPersonnelTable();
    if (window.updateEmployeeSelectDropdown) {
      window.updateEmployeeSelectDropdown();
    }
    savePersonnelList(personnel);
    
    const modal = document.getElementById('personnelImportModal');
    if (modal) modal.classList.remove('active');
    
    clearSelectedPersonnelImportFile();
    const pastedText = document.getElementById('personnelImportPastedText');
    if (pastedText) pastedText.value = '';
    
    window.showToast(`นำเข้าข้อมูลสำเร็จ ${nonDuplicates.length} รายการ`, 'success');
    return;
  }

  const dupModal = document.getElementById('personnelImportDuplicateModal');
  const countSpan = document.getElementById('importDuplicateCount');
  const listContainer = document.getElementById('importDuplicateListContainer');
  const cancelBtn = document.getElementById('cancelPersonnelImportDuplicateBtn');
  const closeBtn = document.getElementById('closePersonnelImportDuplicateModalBtn');
  const confirmBtn = document.getElementById('confirmPersonnelImportDuplicateBtn');
  const setAllNewBtn = document.getElementById('setAllImportNewBtn');
  const setAllOldBtn = document.getElementById('setAllOldBtn');

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
        <div style="background: rgba(255,255,255,0.01); padding: 0.5rem; border-radius: 6px; border-left: 3px solid #71717a;">
          <div style="font-weight: 700; color: #a1a1aa; margin-bottom: 0.25rem;">💾 ข้อมูลเดิมในระบบ</div>
          <div>ตำแหน่ง: ${dup.oldRecord.position}</div>
          <div>แผนก: ${dup.oldRecord.department || 'ทั่วไป'}</div>
          <div>หน้าที่: ${dup.oldRecord.duty || '-'}</div>
          <div>เงินเดือน: ${dup.oldRecord.salary ? dup.oldRecord.salary.toLocaleString() : '0.00'} ฿</div>
          <div>ด้านจ่าย/พาหนะ: ${dup.oldRecord.route || '-'}/${dup.oldRecord.vehicle || '-'}</div>
          <div style="font-size: 0.75rem; color: #a1a1aa;">วันหยุด: ${oldRest.length > 0 ? oldRest.map(d => ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'][d]).join(', ') : 'ไม่มี'}</div>
        </div>
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
          <input type="radio" name="choice-dup-${idx}" value="new" checked style="cursor: pointer;" /> ใช้ข้อมูลใหม่ (นำเข้า)
        </label>
      </div>
    `;

    listContainer.appendChild(card);
  });

  setAllNewBtn.onclick = () => {
    duplicates.forEach((_, idx) => {
      const radio = document.querySelector(`input[name="choice-dup-${idx}"][value="new"]`);
      if (radio) radio.checked = true;
    });
  };

  if (setAllOldBtn) {
    setAllOldBtn.onclick = () => {
      duplicates.forEach((_, idx) => {
        const radio = document.querySelector(`input[name="choice-dup-${idx}"][value="old"]`);
        if (radio) radio.checked = true;
      });
    };
  }

  const closeDupModal = () => dupModal.classList.remove('active');
  cancelBtn.onclick = closeDupModal;
  closeBtn.onclick = closeDupModal;

  confirmBtn.onclick = async () => {
    let overwritesCount = 0;
    let keepCount = 0;

    duplicates.forEach((dup, idx) => {
      const selectedRadio = document.querySelector(`input[name="choice-dup-${idx}"]:checked`);
      const val = selectedRadio ? selectedRadio.value : 'new';

      if (val === 'new') {
        const existingId = personnel[dup.originalIdx]?.id;
        if (existingId) dup.newRecord.id = existingId;
        personnel[dup.originalIdx] = dup.newRecord;
        overwritesCount++;
      } else {
        keepCount++;
      }
    });

    nonDuplicates.forEach(record => personnel.push(record));

    setPersonnel(personnel);
    renderPersonnelTable();
    if (window.updateEmployeeSelectDropdown) {
      window.updateEmployeeSelectDropdown();
    }
    savePersonnelList(personnel);

    dupModal.classList.remove('active');
    const mainModal = document.getElementById('personnelImportModal');
    if (mainModal) mainModal.classList.remove('active');

    clearSelectedPersonnelImportFile();
    const pastedText = document.getElementById('personnelImportPastedText');
    if (pastedText) pastedText.value = '';

    window.showToast(`นำเข้าสำเร็จ! (รายใหม่: ${nonDuplicates.length}, เขียนทับ: ${overwritesCount}, ใช้ของเดิม: ${keepCount})`, 'success');
  };

  dupModal.classList.add('active');
}

export function exportPersonnelCsv() {
  const personnel = getPersonnel();
  if (personnel.length === 0) {
    window.showToast('ไม่มีข้อมูลที่จะส่งออก!', 'warning');
    return;
  }
  let csvContent = "\uFEFF";
  csvContent += "ลำดับ,ชื่อ-นามสกุล,ตำแหน่ง,แผนก/กลุ่มงาน,หน้าที่,เงินเดือน (บาท),ด้านจ่ายหลัก,ประเภทพาหนะ,วันหยุดประจำสัปดาห์,ลงนามเริ่มต้น\n";
  
  personnel.forEach((item, index) => {
    const restDaysStr = item.restDays && item.restDays.length > 0 
      ? item.restDays.map(d => ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'][d]).join('-')
      : 'ไม่มี';
    csvContent += `${index + 1},"${item.name}","${item.position}","${item.department || 'ทั่วไป'}","${item.duty || '-'}",${item.salary || 0},"${item.route || '-'}","${item.vehicle || '-'}","${restDaysStr}","${item.signature || item.name}"\n`;
  });
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `ทะเบียนบุคลากร_ไปรษณีย์ไทย.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function printPersonnelReport() {
  const personnel = getPersonnel();
  if (personnel.length === 0) {
    window.showToast('ไม่มีข้อมูลที่จะพิมพ์!', 'warning');
    return;
  }

  personnel.sort((a, b) => a.name.localeCompare(b.name, 'th'));
  
  let tableRowsHtml = '';
  personnel.forEach((item, index) => {
    const restDaysStr = item.restDays && item.restDays.length > 0 
      ? item.restDays.map(d => ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'][d]).join(', ')
      : 'ไม่มี';
    tableRowsHtml += `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${item.name}</strong></td>
        <td>${item.position}</td>
        <td>${item.department || 'ทั่วไป'}</td>
        <td>${item.duty || '-'}</td>
        <td>${item.salary ? item.salary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
        <td>${item.route ? 'ด้านจ่ายที่ ' + item.route : '-'}</td>
        <td>${item.vehicle || '-'}</td>
        <td>${restDaysStr}</td>
        <td><span style="font-family: 'Sarabun', sans-serif; font-style: italic; font-size: 9pt; color: #444; font-weight: 300;">${item.signature || item.name}</span></td>
      </tr>
    `;
  });
  
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>ทำเนียบข้อมูลบุคลากร ไปรษณีย์ไทย</title>
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
          size: A4 landscape;
          margin: 0.3cm;
        }
        .print-header {
          text-align: center;
          margin-bottom: 0.4rem !important;
          padding-bottom: 0.3rem !important;
          border-bottom: 2px double #000 !important;
        }
        .print-title-container h2 {
          font-size: 14pt !important;
          font-weight: bold;
          margin: 0 0 0.25rem 0;
        }
        .print-title-container p {
          font-size: 10pt;
          margin: 0 0 0.25rem 0;
          color: #555;
        }
        .print-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1rem;
        }
        .print-table th, 
        .print-table td {
          border: 1px solid black !important;
          padding: 4px 4px !important;
          font-size: 8pt !important;
          line-height: 1.2 !important;
          color: black !important;
          background: transparent !important;
        }
        .print-table th {
          font-weight: bold !important;
          text-align: center !important;
          background: #f2f2f2 !important;
        }
        .print-table td {
          text-align: left;
          vertical-align: middle !important;
        }
        .print-table td:nth-child(1),
        .print-table td:nth-child(6),
        .print-table td:nth-child(7),
        .print-table td:nth-child(8),
        .print-table td:nth-child(9) {
          text-align: center !important;
        }
      </style>
    </head>
    <body>
      <div class="print-header">
        <div class="print-title-container">
          <h2>ทำเนียบและทะเบียนข้อมูลบุคลากรหลัก</h2>
          <p>บริษัท ไปรษณีย์ไทย จำกัด • ข้อมูล ณ วันที่ ${new Date().toLocaleDateString('th-TH')}</p>
        </div>
      </div>

      <table class="print-table">
        <thead>
          <tr>
            <th style="width: 4%">ลำดับ</th>
            <th style="width: 18%">ชื่อ - นามสกุล</th>
            <th style="width: 10%">ตำแหน่ง</th>
            <th style="width: 10%">แผนก/กลุ่มงาน</th>
            <th style="width: 20%">หน้าที่ปฏิบัติงาน</th>
            <th style="width: 10%">เงินเดือน (บาท)</th>
            <th style="width: 8%">ด้านจ่ายหลัก</th>
            <th style="width: 10%">ประเภทพาหนะ</th>
            <th style="width: 10%">วันหยุดประจำสัปดาห์</th>
            <th style="width: 10%">ลงนามเริ่มต้น</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>

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

export async function clearAllPersonnel() {
  window.showConfirm({
    title: '⚠️ ยืนยันล้างข้อมูลทะเบียนพนักงานทั้งหมด',
    message: 'คุณต้องการลบรายชื่อพนักงานทั้งหมดออกจากฐานข้อมูลบุคลากรหลักใช่หรือไม่? (การกระทำนี้จะล้างข้อมูลถาวร)',
    icon: '⚠️',
    okText: 'ล้างข้อมูลทั้งหมด',
    okClass: 'btn-danger',
    onConfirm: async () => {
      setPersonnel([]);
      renderPersonnelTable();
      if (window.updateEmployeeSelectDropdown) {
        window.updateEmployeeSelectDropdown();
      }
      savePersonnelList([]);
      window.showToast('ล้างตารางข้อมูลทะเบียนบุคลากรเรียบร้อยแล้ว!', 'success');
    }
  });
}


export function getPersonnelTemplate() {
  return `<div style="display: flex; flex-direction: column; width: 100%;">
  <!-- Tab Buttons -->
  <div class="tab-bar-container" style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.75rem;">
    <button type="button" id="tabRegistryBtn" class="btn" style="padding: 0.5rem 1rem; border-radius: 8px; font-weight: bold; background: var(--post-orange) !important; color: white !important; border: 1px solid var(--post-orange) !important; cursor: pointer;">
      👥 ทะเบียนรายชื่อพนักงาน
    </button>
    <button type="button" id="tabAttendanceBtn" class="btn" style="padding: 0.5rem 1rem; border-radius: 8px; font-weight: bold; background: var(--border-glass) !important; color: var(--text-primary) !important; border: 1px solid var(--border-glass) !important; cursor: pointer;">
      📅 บันทึกเวลาทำงานประจำเดือน
    </button>
  </div>

  <!-- Tab Contents -->
  <div id="registryTabContent" class="personnel-tab-content">
    <div class="dashboard-grid animate-fade-in">
      <div class="panel-column">
              <div id="personnelCard" class="glass-card">
                <div class="card-header">
                  <span class="card-icon">👥</span>
                  <h3 id="personnelFormTitle">ลงทะเบียนข้อมูลบุคลากร</h3>
                </div>
                
                <form id="personnelForm">
                  <input type="hidden" id="personnelEditIndex" value="" />
                  
                  <div class="form-group">
                    <label for="personName">ชื่อ - นามสกุล</label>
                    <input type="text" id="personName" class="form-input" placeholder="ตัวอย่าง: นายสมชาย รักดี" required />
                  </div>

                  <div class="form-row-2">
                    <div class="form-group">
                      <label for="personPosition">ตำแหน่ง</label>
                      <select id="personPosition" class="form-select">
                        <option value="หน.ปณ.">หน.ปณ.</option>
                        <option value="พนักงาน">พนักงาน</option>
                        <option value="ลูกจ้างประจำ">ลูกจ้างประจำ</option>
                        <option value="ลูกจ้าง">ลูกจ้าง</option>
                        <option value="ลูกจ้างเหมา">ลูกจ้างเหมา</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label for="personDuty">หน้าที่</label>
                      <select id="personDuty" class="form-select">
                        <option value="เจ้าหน้าที่นำจ่ายไปรษณีย์/EMS/ด้านจ่ายพิเศษ">เจ้าหน้าที่นำจ่ายไปรษณีย์/EMS/ด้านจ่ายพิเศษ</option>
                        <option value="เจ้าหน้าที่ไขตู้ไปรษณีย์">เจ้าหน้าที่ไขตู้ไปรษณีย์</option>
                        <option value="หัวหน้าโซนนำจ่าย">หัวหน้าโซนนำจ่าย</option>
                        <option value="เจ้าหน้าที่รับฝากนอกที่ทำการ">เจ้าหน้าที่รับฝากนอกที่ทำการ</option>
                        <option value="ปณอ.(รับ/จ่าย)/ผู้ช่วยนำจ่าย">ปณอ.(รับ/จ่าย)/ผู้ช่วยนำจ่าย</option>
                      </select>
                    </div>
                  </div>

                  <div class="form-row-2">
                    <div class="form-group">
                      <label for="personSalary">เงินเดือน (บาท - สำหรับค่าน้ำ)</label>
                      <input type="number" id="personSalary" class="form-input" value="0" />
                    </div>
                    <div class="form-group" style="margin-bottom: 1.25rem;">
                      <label for="personDepartment">แผนก/กลุ่มงาน</label>
                      <select id="personDepartment" class="form-select">
                        <option value="นำจ่าย">นำจ่าย</option>
                        <option value="ไขตู้/ขนส่ง">ไขตู้/ขนส่ง</option>
                        <option value="รับฝาก">รับฝาก</option>
                        <option value="บริหาร/ธุรการ">บริหาร/ธุรการ</option>
                        <option value="custom">อื่นๆ (ระบุเอง)...</option>
                      </select>
                    </div>
                  </div>
                  
                  <div class="form-group hidden" id="personDepartmentCustomGroup" style="margin-bottom: 1.25rem;">
                    <label for="personDepartmentCustom">ระบุแผนก/กลุ่มงานเพิ่มเติม</label>
                    <input type="text" id="personDepartmentCustom" class="form-input" placeholder="เช่น แผนกการเงิน" />
                  </div>

                  <div class="form-row-2">
                    <div class="form-group">
                      <label for="personRoute">ด้านจ่ายหลัก</label>
                      <select id="personRoute" class="form-select">
                        <option value="" selected>-- เลือกด้านจ่าย (ถ้ามี) --</option>
                        <!-- Dynamically filled in JS -->
                      </select>
                    </div>
                    <div class="form-group">
                      <label for="personVehicle">ประเภทพาหนะหลัก</label>
                      <select id="personVehicle" class="form-select">
                        <option value="รถจักรยานยนต์">รถจักรยานยนต์</option>
                        <option value="รถจักรยานยนต์ไฟฟ้า">รถจักรยานยนต์ไฟฟ้า</option>
                        <option value="เรือยนต์">เรือยนต์</option>
                        <option value="รถยนต์">รถยนต์</option>
                      </select>
                    </div>
                  </div>

                  <div class="form-group" style="margin-bottom: 1.25rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">วันหยุดประจำสัปดาห์</label>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; padding: 0.5rem 0.75rem; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-glass); border-radius: var(--radius-small);">
                      <label style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.9rem; cursor: pointer; color: var(--text-primary);">
                        <input type="checkbox" name="personRestDays" value="0" style="cursor: pointer;" /> อา.
                      </label>
                      <label style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.9rem; cursor: pointer; color: var(--text-primary);">
                        <input type="checkbox" name="personRestDays" value="1" style="cursor: pointer;" /> จ.
                      </label>
                      <label style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.9rem; cursor: pointer; color: var(--text-primary);">
                        <input type="checkbox" name="personRestDays" value="2" style="cursor: pointer;" /> อ.
                      </label>
                      <label style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.9rem; cursor: pointer; color: var(--text-primary);">
                        <input type="checkbox" name="personRestDays" value="3" style="cursor: pointer;" /> พ.
                      </label>
                      <label style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.9rem; cursor: pointer; color: var(--text-primary);">
                        <input type="checkbox" name="personRestDays" value="4" style="cursor: pointer;" /> พฤ.
                      </label>
                      <label style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.9rem; cursor: pointer; color: var(--text-primary);">
                        <input type="checkbox" name="personRestDays" value="5" style="cursor: pointer;" /> ศ.
                      </label>
                      <label style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.9rem; cursor: pointer; color: var(--text-primary);">
                        <input type="checkbox" name="personRestDays" value="6" style="cursor: pointer;" /> ส.
                      </label>
                    </div>
                  </div>

                  <div class="form-group">
                    <label for="personSignature">ลงนามรับเงินเริ่มต้น</label>
                    <input type="text" id="personSignature" class="form-input" placeholder="ว่างไว้ใช้ชื่อตนเอง" />
                  </div>

                  <div class="button-group" style="margin-top: 1rem;">
                    <button type="submit" id="savePersonnelBtn" class="btn btn-primary btn-full">
                      📥 บันทึกบุคลากร
                    </button>
                    <button type="button" id="resetPersonnelBtn" class="btn btn-secondary hidden">
                      ยกเลิก
                    </button>
                  </div>
                </form>
              </div>
      </div>
      <div class="panel-column">
              <div id="personnelTableCard" class="glass-card full-width">
                <div class="card-header table-header-flex">
                  <div class="header-left">
                    <span class="card-icon">👥</span>
                    <h3>ทำเนียบข้อมูลบุคลากรทั้งหมด</h3>
                  </div>
                  <div class="header-actions-flex" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <button type="button" id="importPersonnelBtn" class="btn btn-secondary btn-small" style="border: 1px solid var(--post-emerald); color: var(--post-emerald); background: rgba(16, 185, 129, 0.05);">
                      📥 นำเข้าบุคลากรจาก Excel / CSV
                    </button>
                    <button type="button" id="exportPersonnelCsvBtn" class="btn btn-secondary btn-small" style="border: 1px solid var(--post-orange); color: var(--post-orange); background: rgba(245, 158, 11, 0.05);">
                      📤 ส่งออกข้อมูล CSV
                    </button>
                    <button type="button" id="printPersonnelReportBtn" class="btn btn-secondary btn-small">
                      🖨️ พิมพ์ทำเนียบ
                    </button>
                    <button type="button" id="clearAllPersonnelBtn" class="btn btn-danger btn-small">
                      🗑️ ล้างทั้งหมด
                    </button>
                  </div>
                </div>

                <div style="margin: 0.75rem 0; display: flex; justify-content: flex-end; padding: 0 0.5rem;">
                  <div style="position: relative; width: 260px;">
                    <input type="text" id="personnelSearchInput" class="form-input" style="padding: 0.35rem 0.75rem 0.35rem 1.75rem; font-size: 0.85rem;" placeholder="ค้นหารายชื่อ/ตำแหน่ง/กลุ่มงาน..." />
                    <span style="position: absolute; left: 0.6rem; top: 50%; transform: translateY(-50%); font-size: 0.8rem; opacity: 0.5;">🔍</span>
                  </div>
                </div>

                <div class="table-container">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th style="width: 5%;">ที่</th>
                        <th style="width: 20%;">ชื่อ - นามสกุล</th>
                        <th style="width: 12%;">ตำแหน่ง</th>
                        <th style="width: 13%;">แผนก/กลุ่มงาน</th>
                        <th style="width: 18%;">หน้าที่</th>
                        <th style="width: 10%;">เงินเดือน</th>
                        <th style="width: 10%;">ด้านจ่ายหลัก</th>
                        <th style="width: 12%;">พาหนะหลัก</th>
                        <th style="width: 10%;">ลงนาม</th>
                        <th style="width: 8%;" class="actions-col">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody id="personnelTableBody">
                      <!-- Dynamic rows in JS -->
                    </tbody>
                  </table>
                </div>
              </div>
      </div>
    </div>
  </div>

  <div id="attendanceTabContent" class="personnel-tab-content" style="display: none;">
    <div class="glass-card full-width animate-fade-in" id="attendanceCard">
      <div class="card-header table-header-flex">
        <div class="header-left">
          <span class="card-icon">📅</span>
          <h3>ตารางลงเวลาทำงานประจำรอบเดือน</h3>
        </div>
        <div class="header-actions-flex" style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
          
          <!-- Month/Year selectors -->
          <div style="display: flex; gap: 0.4rem; align-items: center; background: rgba(255,255,255,0.05); padding: 0.25rem 0.5rem; border-radius: var(--radius-small); border: 1px solid var(--border-glass);">
            <label for="attMonth" style="font-size: 0.8rem; font-weight: bold; color: var(--text-secondary);">เดือน:</label>
            <select id="attMonth" class="form-select" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; background: transparent; border: none; color: var(--text-primary); cursor: pointer; width: auto; font-family: inherit;">
              <option value="1">มกราคม</option>
              <option value="2">กุมภาพันธ์</option>
              <option value="3">มีนาคม</option>
              <option value="4">เมษายน</option>
              <option value="5" selected>พฤษภาคม</option>
              <option value="6">มิถุนายน</option>
              <option value="7">กรกฎาคม</option>
              <option value="8">สิงหาคม</option>
              <option value="9">กันยายน</option>
              <option value="10">ตุลาคม</option>
              <option value="11">พฤศจิกายน</option>
              <option value="12">ธันวาคม</option>
            </select>
            
            <label for="attYear" style="font-size: 0.8rem; font-weight: bold; color: var(--text-secondary); margin-left: 0.4rem;">ปี พ.ศ.:</label>
            <input type="number" id="attYear" class="form-input" style="padding: 0.2rem 0.4rem; font-size: 0.8rem; background: transparent; border: none; color: var(--text-primary); width: 60px; font-weight: bold; font-family: inherit;" value="2569" min="2500" max="3000" />
          </div>

          <!-- Quick Actions -->
          <button type="button" id="attCheckAllBtn" class="btn btn-secondary btn-small" style="padding: 0.4rem 0.6rem;">✔️ ติ๊กทั้งหมด</button>
          <button type="button" id="attClearAllBtn" class="btn btn-secondary btn-small" style="padding: 0.4rem 0.6rem;">✕ ล้างทั้งหมด</button>
          <button type="button" id="importAttBtn" class="btn btn-secondary btn-small" style="padding: 0.4rem 0.6rem; border: 1px solid var(--post-emerald); color: var(--post-emerald); background: rgba(16, 185, 129, 0.05);">📥 นำเข้าลงเวลา</button>
          <button type="button" id="exportAttBtn" class="btn btn-secondary btn-small" style="padding: 0.4rem 0.6rem; border: 1px solid var(--post-orange); color: var(--post-orange); background: rgba(245, 158, 11, 0.05);">📤 ส่งออกตาราง</button>
        </div>
      </div>

      <div style="margin: 0.75rem 0; display: flex; gap: 0.75rem; align-items: center; justify-content: space-between; flex-wrap: wrap; padding: 0 0.5rem;">
        <p class="input-tip" style="margin: 0; font-size: 0.8rem; color: var(--text-secondary);">
          * ช่องวันที่ 1-31: เลือก / = ทำงานปกติ, ป = ลาป่วย, ก = ลากิจ, พ = ลาพักผ่อน, ข = ขาดงาน (คำนวณเงินสะสมเฉพาะสัญลักษณ์ / เท่านั้น) ไฮไลต์สีส้ม/เทาคือวันหยุดประจำสัปดาห์
        </p>
        <div style="position: relative; width: 250px;">
          <input type="text" id="attSearchInput" class="form-input" style="padding: 0.35rem 0.75rem 0.35rem 1.75rem; font-size: 0.85rem;" placeholder="ค้นหาชื่อพนักงาน..." />
          <span style="position: absolute; left: 0.6rem; top: 50%; transform: translateY(-50%); font-size: 0.8rem; opacity: 0.5;">🔍</span>
        </div>
      </div>

      <!-- Responsive table container with overflow and sticky name -->
      <div class="attendance-table-wrapper" style="width: 100%; overflow-x: auto; border-radius: 8px; border: 1px solid var(--border-glass);">
        <style>
          .att-sticky-col {
            position: sticky;
            left: 0;
            background: var(--bg-sticky-col, #141724) !important;
            z-index: 10;
            border-right: 2px solid var(--border-glass) !important;
          }
          .data-table th.att-day-header {
            min-width: 35px;
            padding: 0.4rem 0.2rem;
            text-align: center;
            border-right: 1px solid rgba(0, 0, 0, 0.08) !important;
          }
          .att-checkbox-cell {
            text-align: center;
            padding: 0.25rem !important;
            border-right: 1px solid rgba(0, 0, 0, 0.08) !important;
          }
          [data-theme="dark"] .data-table th.att-day-header,
          [data-theme="dark"] .att-checkbox-cell {
            border-right: 1px solid rgba(255, 255, 255, 0.12) !important;
          }
          .att-checkbox-cell input {
            cursor: pointer;
            width: 16px;
            height: 16px;
          }
          .att-rest-day-cell {
            background: rgba(244, 63, 94, 0.12) !important;
          }
        </style>
        <table class="data-table" style="width: 100%; min-width: 1300px; border-collapse: separate; border-spacing: 4px 0px;">
          <thead>
            <tr id="attTableHeaderRow">
              <!-- Dynamically generated day headers in JS -->
            </tr>
          </thead>
          <tbody id="attTableBody">
            <!-- Dynamically filled in JS -->
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Registry Import Modal (Original) -->
  <div id="personnelImportModal" class="modal-overlay" style="z-index: 4000;">
    <div class="glass-card modal-content" style="max-width: 900px; width: 95%;">
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span style="font-size: 1.5rem;">📊</span>
          <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">นำเข้าข้อมูลทะเบียนบุคลากรด้วย Excel / CSV</h3>
        </div>
        <button type="button" id="closePersonnelImportModalBtn" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1.25rem;">✕</button>
      </div>
      <div class="modal-body" style="padding-top: 0.5rem;">
        <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.5rem;">
          <button type="button" id="tabPersonnelImportFile" class="btn btn-small" style="font-weight: bold; background: var(--post-orange); color: white;">📂 นำเข้าไฟล์ Excel</button>
          <button type="button" id="tabPersonnelImportText" class="btn btn-small btn-secondary">📝 วางข้อความ</button>
          <button type="button" id="downloadPersonnelTemplateBtn" class="btn btn-small btn-secondary" style="margin-left: auto; border-color: var(--post-emerald); color: var(--post-emerald); background: transparent;">📥 ดาวน์โหลดเทมเพลต</button>
        </div>

        <!-- Tab Content 1: File Upload (Drag & Drop) -->
        <div id="personnelImportFileContent" class="tab-panel">
          <div id="personnelDragDropZone" style="border: 2px dashed rgba(16, 185, 129, 0.4); border-radius: 12px; background: rgba(16, 185, 129, 0.02); padding: 2rem 1.5rem; text-align: center; cursor: pointer; transition: all 0.25s ease; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem;">
            <span style="font-size: 2.5rem; filter: drop-shadow(0 4px 6px rgba(16, 185, 129, 0.15));">📊</span>
            <div style="font-weight: bold; color: var(--text-primary); font-size: 0.95rem;">ลากและวางไฟล์เทมเพลต Excel (.xlsx) ที่นี่</div>
            <div style="color: var(--text-secondary); font-size: 0.8rem;">หรือคลิกเพื่อเลือกไฟล์จากคอมพิวเตอร์ของคุณ</div>
            <input type="file" id="personnelFileSelector" accept=".xlsx, .xls" style="display: none;" />
          </div>
          <div id="personnelSelectedFileInfo" class="hidden" style="margin-top: 0.75rem; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; padding: 0.5rem 1rem; display: flex; align-items: center; justify-content: space-between;">
            <span id="personnelFileNameLabel" style="font-size: 0.85rem; font-weight: bold; color: var(--post-emerald);"></span>
            <button type="button" id="clearSelectedPersonnelFileBtn" style="background: none; border: none; color: var(--post-red); cursor: pointer; font-size: 0.9rem;">✕ นำออก</button>
          </div>
        </div>

        <!-- Tab Content 2: Textarea Paste -->
        <div id="personnelImportTextContent" class="tab-panel hidden">
          <div class="form-group">
            <label for="personnelImportPastedText" style="font-weight: bold; margin-bottom: 0.5rem; display: block;">วางข้อมูลตารางจาก Excel</label>
            <textarea id="personnelImportPastedText" class="form-input" style="height: 140px; font-family: monospace; font-size: 0.8rem; resize: vertical;" placeholder="วางข้อมูลที่นี่ โดยเรียงคอลัมน์ดังนี้: ชื่อ-นามสกุล, ตำแหน่ง, แผนก/กลุ่มงาน, หน้าที่, เงินเดือน, ด้านจ่ายหลัก, ประเภทพาหนะ, วันหยุดประจำ, ลงนามเริ่มต้น (คั่นด้วยแท็บหรือช่องว่าง)&#10;เช่น:&#10;นายสมชาย รักดี	พนักงาน	นำจ่าย	เจ้าหน้าที่นำจ่ายไปรษณีย์/EMS/ด้านจ่ายพิเศษ	15000	5	รถจักรยานยนต์	0	สมชาย"></textarea>
          </div>
        </div>

        <!-- Preview Area -->
        <div class="modal-table-container" style="margin-top: 1.5rem; border: 1px solid var(--border-glass); border-radius: var(--radius-small); background: rgba(0, 0, 0, 0.02); max-height: 250px; overflow-y: auto;">
          <table class="modal-table" style="width: 100%;">
            <thead>
              <tr>
                <th style="width: 16%;">ชื่อ - นามสกุล</th>
                <th style="width: 10%;">ตำแหน่ง</th>
                <th style="width: 10%;">แผนก/กลุ่มงาน</th>
                <th style="width: 16%;">หน้าที่</th>
                <th style="width: 8%;">เงินเดือน</th>
                <th style="width: 8%;">ด้านจ่ายหลัก</th>
                <th style="width: 12%;">ประเภทพาหนะ</th>
                <th style="width: 12%;">วันหยุดประจำ</th>
                <th style="width: 8%;">ลงนามเริ่มต้น</th>
              </tr>
            </thead>
            <tbody id="personnelImportPreviewTableBody">
              <tr>
                <td colspan="9" class="no-data" style="text-align: center; padding: 1.5rem;">ยังไม่มีข้อมูล รอโหลดไฟล์หรือวางข้อมูลเพื่อประมวลผล</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" id="cancelPersonnelImportBtn" class="btn btn-secondary">ยกเลิก</button>
        <button type="button" id="submitPersonnelImportBtn" class="btn btn-primary" style="background: var(--post-emerald); border-color: var(--post-emerald);" disabled>
          ✔️ ยืนยันนำเข้าข้อมูล
        </button>
      </div>
    </div>
  </div>

  <!-- Attendance Import Modal -->
  <div id="attendanceImportModal" class="modal-overlay" style="z-index: 4000;">
    <div class="glass-card modal-content" style="max-width: 800px; width: 90%;">
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span style="font-size: 1.5rem;">📅</span>
          <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">นำเข้าข้อมูลตารางเช็คชื่อการทำงานประจำเดือน</h3>
        </div>
        <button type="button" id="closeAttendanceImportModalBtn" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1.25rem;">✕</button>
      </div>
      <div class="modal-body" style="padding-top: 0.5rem;">
        <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.5rem;">
          <button type="button" id="tabAttImportFile" class="btn btn-small" style="font-weight: bold; background: var(--post-orange); color: white;">📂 นำเข้าไฟล์ Excel</button>
          <button type="button" id="tabAttImportText" class="btn btn-small btn-secondary">📝 วางข้อความ</button>
          <button type="button" id="downloadAttTemplateBtn" class="btn btn-small btn-secondary" style="margin-left: auto; border-color: var(--post-emerald); color: var(--post-emerald); background: transparent;">📥 ดาวน์โหลดเทมเพลต</button>
        </div>

        <!-- Tab Content 1: File Upload (Drag & Drop) -->
        <div id="attImportFileContent" class="tab-panel">
          <div id="attDragDropZone" style="border: 2px dashed rgba(16, 185, 129, 0.4); border-radius: 12px; background: rgba(16, 185, 129, 0.02); padding: 2rem 1.5rem; text-align: center; cursor: pointer; transition: all 0.25s ease; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem;">
            <span style="font-size: 2.5rem; filter: drop-shadow(0 4px 6px rgba(16, 185, 129, 0.15));">📊</span>
            <div style="font-weight: bold; color: var(--text-primary); font-size: 0.95rem;">ลากและวางไฟล์ตารางลงเวลา Excel (.xlsx) ที่นี่</div>
            <div style="color: var(--text-secondary); font-size: 0.8rem;">หรือคลิกเพื่อเลือกไฟล์จากคอมพิวเตอร์ของคุณ</div>
            <input type="file" id="attendanceFileSelector" accept=".xlsx, .xls" style="display: none;" />
          </div>
          <div id="attSelectedFileInfo" class="hidden" style="margin-top: 0.75rem; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; padding: 0.5rem 1rem; display: flex; align-items: center; justify-content: space-between;">
            <span id="attFileNameLabel" style="font-size: 0.85rem; font-weight: bold; color: var(--post-emerald);"></span>
            <button type="button" id="clearSelectedAttFileBtn" style="background: none; border: none; color: var(--post-red); cursor: pointer; font-size: 0.9rem;">✕ นำออก</button>
          </div>
        </div>

        <!-- Tab Content 2: Textarea Paste -->
        <div id="attImportTextContent" class="tab-panel hidden">
          <div class="form-group">
            <label for="attImportPastedText" style="font-weight: bold; margin-bottom: 0.5rem; display: block;">วางข้อมูลตารางจาก Excel (คั่นด้วยแท็บ)</label>
            <textarea id="attImportPastedText" class="form-input" style="height: 140px; font-family: monospace; font-size: 0.8rem; resize: vertical;" placeholder="วางข้อมูลแถวจาก Excel โดยคอลัมน์แรกสุดเป็นชื่อพนักงาน ตามด้วยค่าการลงเวลา (1=มาทำงาน, 0 หรือเว้นว่าง = ไม่ได้มา) ของแต่ละวัน&#10;เช่น:&#10;นายสมชาย รักดี	1	1	0	1	1..."></textarea>
          </div>
        </div>

        <!-- Preview Area -->
        <div class="modal-table-container" style="margin-top: 1.5rem; border: 1px solid var(--border-glass); border-radius: var(--radius-small); background: rgba(0, 0, 0, 0.02); max-height: 200px; overflow-y: auto; overflow-x: auto;">
          <table class="modal-table" style="width: 100%; min-width: 800px;">
            <thead id="attImportPreviewHeader">
              <!-- Dynamically filled -->
            </thead>
            <tbody id="attImportPreviewTableBody">
              <tr>
                <td class="no-data" style="text-align: center; padding: 1.5rem;">ยังไม่มีข้อมูล รอโหลดไฟล์หรือวางข้อมูลเพื่อประมวลผล</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" id="cancelAttImportBtn" class="btn btn-secondary">ยกเลิก</button>
        <button type="button" id="submitAttImportBtn" class="btn btn-primary" style="background: var(--post-emerald); border-color: var(--post-emerald);" disabled>
          ✔️ ยืนยันนำเข้าการลงเวลา
        </button>
      </div>
    </div>
  </div>
</div>`;
}

/* --- PERSONNEL DAILY ATTENDANCE MATRIX LOGIC --- */
let unsubscribeAttendance = null;
let attendanceList = [];
let xlsxCache = null;

async function getXLSX() {
  if (!xlsxCache) {
    xlsxCache = await import('xlsx-js-style');
  }
  return xlsxCache;
}

function initAttendanceGrid() {
  const attMonthSelect = document.getElementById('attMonth');
  const attYearInput = document.getElementById('attYear');
  
  const globalMonth = document.getElementById('globalMonth');
  const globalYear = document.getElementById('globalYear');
  
  if (attMonthSelect && globalMonth) attMonthSelect.value = globalMonth.value;
  if (attYearInput && globalYear) attYearInput.value = globalYear.value;
  
  setupAttendanceEventsAndListeners();
  bindAttendanceDataListeners();
}

let isAttEventsBound = false;
function setupAttendanceEventsAndListeners() {
  if (isAttEventsBound) return;
  isAttEventsBound = true;
  
  const attMonthSelect = document.getElementById('attMonth');
  const attYearInput = document.getElementById('attYear');
  const attSearchInput = document.getElementById('attSearchInput');
  const attCheckAllBtn = document.getElementById('attCheckAllBtn');
  const attClearAllBtn = document.getElementById('attClearAllBtn');
  const importAttBtn = document.getElementById('importAttBtn');
  const exportAttBtn = document.getElementById('exportAttBtn');
  
  if (attMonthSelect) attMonthSelect.addEventListener('change', bindAttendanceDataListeners);
  if (attYearInput) attYearInput.addEventListener('change', bindAttendanceDataListeners);
  if (attSearchInput) attSearchInput.addEventListener('input', () => renderAttendanceTableRows());
  
  if (attCheckAllBtn) attCheckAllBtn.addEventListener('click', () => toggleAllAttendanceDays(true));
  if (attClearAllBtn) attClearAllBtn.addEventListener('click', () => toggleAllAttendanceDays(false));
  if (exportAttBtn) exportAttBtn.addEventListener('click', exportAttendanceToExcel);
  
  // Modal bindings
  const attImportModal = document.getElementById('attendanceImportModal');
  const closeAttImportModalBtn = document.getElementById('closeAttendanceImportModalBtn');
  const cancelAttImportBtn = document.getElementById('cancelAttImportBtn');
  const submitAttImportBtn = document.getElementById('submitAttImportBtn');
  const tabAttImportFile = document.getElementById('tabAttImportFile');
  const tabAttImportText = document.getElementById('tabAttImportText');
  const attDragDropZone = document.getElementById('attDragDropZone');
  const attendanceFileSelector = document.getElementById('attendanceFileSelector');
  const clearSelectedAttFileBtn = document.getElementById('clearSelectedAttFileBtn');
  const attImportPastedText = document.getElementById('attImportPastedText');
  const downloadAttTemplateBtn = document.getElementById('downloadAttTemplateBtn');

  if (importAttBtn) importAttBtn.addEventListener('click', () => attImportModal.classList.add('active'));
  if (closeAttImportModalBtn) closeAttImportModalBtn.addEventListener('click', () => attImportModal.classList.remove('active'));
  if (cancelAttImportBtn) cancelAttImportBtn.addEventListener('click', () => attImportModal.classList.remove('active'));
  
  if (tabAttImportFile) tabAttImportFile.addEventListener('click', () => switchAttImportTab('file'));
  if (tabAttImportText) tabAttImportText.addEventListener('click', () => switchAttImportTab('text'));
  
  if (attDragDropZone && attendanceFileSelector) {
    attDragDropZone.addEventListener('click', () => attendanceFileSelector.click());
    attendanceFileSelector.addEventListener('change', (e) => {
      if (e.target.files.length > 0) processUploadedAttFile(e.target.files[0]);
    });
    attDragDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      attDragDropZone.style.borderColor = 'var(--post-orange)';
    });
    attDragDropZone.addEventListener('dragleave', () => {
      attDragDropZone.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    });
    attDragDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      attDragDropZone.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      if (e.dataTransfer.files.length > 0) {
        attendanceFileSelector.files = e.dataTransfer.files;
        processUploadedAttFile(e.dataTransfer.files[0]);
      }
    });
  }
  
  if (clearSelectedAttFileBtn) clearSelectedAttFileBtn.addEventListener('click', clearSelectedAttImportFile);
  if (attImportPastedText) {
    attImportPastedText.addEventListener('input', handleAttPaste);
    attImportPastedText.addEventListener('paste', handleAttPaste);
  }
  if (submitAttImportBtn) submitAttImportBtn.addEventListener('click', handleConfirmAttImport);
  if (downloadAttTemplateBtn) downloadAttTemplateBtn.addEventListener('click', downloadAttTemplateXlsx);
}

async function bindAttendanceDataListeners() {
  const attMonthSelect = document.getElementById('attMonth');
  const attYearInput = document.getElementById('attYear');
  if (!attMonthSelect || !attYearInput) return;
  
  const month = parseInt(attMonthSelect.value);
  const year = parseInt(attYearInput.value);
  
  if (unsubscribeAttendance) {
    unsubscribeAttendance();
    unsubscribeAttendance = null;
  }
  
  attendanceList = await fetchAttendanceList(year, month);
  renderAttendanceGridHeaderAndRows(year, month);
  
  if (isCloudConnected()) {
    unsubscribeAttendance = listenToAttendanceList(year, month, (list) => {
      attendanceList = list;
      renderAttendanceTableRows();
    });
  }
}

function getDaysInMonth(year, month) {
  const ceYear = year - 543;
  return new Date(ceYear, month, 0).getDate();
}

function renderAttendanceGridHeaderAndRows(year, month) {
  const tableHeaderRow = document.getElementById('attTableHeaderRow');
  if (!tableHeaderRow) return;
  
  const daysCount = getDaysInMonth(year, month);
  
  let html = `
    <th class="att-sticky-col" style="width: 40px; text-align: center;">ที่</th>
    <th class="att-sticky-col" style="width: 180px; text-align: left; left: 40px;">ชื่อ - นามสกุล</th>
  `;
  
  const ceYear = year - 543;
  for (let d = 1; d <= daysCount; d++) {
    const dateObj = new Date(ceYear, month - 1, d);
    const dayOfWeek = dateObj.getDay();
    const dayName = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'][dayOfWeek];
    const isSun = dayOfWeek === 0;
    const isSat = dayOfWeek === 6;
    let labelColor = 'inherit';
    if (isSun) labelColor = '#f43f5e';
    else if (isSat) labelColor = '#fb923c';
    
    html += `
      <th class="att-day-header" style="color: ${labelColor}; font-size: 0.75rem;">
        <div>${d}</div>
        <div style="font-size: 0.65rem; opacity: 0.8; font-weight: normal;">${dayName}</div>
      </th>
    `;
  }
  
  html += `
    <th style="width: 80px; text-align: center; font-weight: bold; color: var(--post-orange);">รวม (วัน)</th>
  `;
  
  tableHeaderRow.innerHTML = html;
  
  renderAttendanceTableRows();
}

function renderAttendanceTableRows() {
  const tableBody = document.getElementById('attTableBody');
  const attMonthSelect = document.getElementById('attMonth');
  const attYearInput = document.getElementById('attYear');
  if (!tableBody || !attMonthSelect || !attYearInput) return;
  
  const month = parseInt(attMonthSelect.value);
  const year = parseInt(attYearInput.value);
  const daysCount = getDaysInMonth(year, month);
  const ceYear = year - 543;
  
  const personnel = getPersonnel();
  const sortedPersonnel = [...personnel].sort((a, b) => a.name.localeCompare(b.name, 'th'));
  
  const searchQuery = (document.getElementById('attSearchInput')?.value || '').toLowerCase().trim();
  const filtered = sortedPersonnel.filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery));
  
  tableBody.innerHTML = '';
  
  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="${daysCount + 3}" class="no-data" style="text-align: center; padding: 2rem;">
          ไม่พบข้อมูลรายชื่อพนักงาน
        </td>
      </tr>
    `;
    return;
  }
  
  filtered.forEach((person, idx) => {
    const tr = document.createElement('tr');
    
    const attRec = attendanceList.find(item => item.name === person.name) || { checkedDays: [] };
    const checkedDaysSet = new Set(attRec.checkedDays);
    
    let rowHtml = `
      <td class="att-sticky-col" style="text-align: center; color: var(--text-secondary);">${idx + 1}</td>
      <td class="att-sticky-col" style="text-align: left; font-weight: bold; left: 40px;">
        ${person.name}
      </td>
    `;
    
    const restDays = person.restDays || [];
    
    for (let d = 1; d <= daysCount; d++) {
      const dateObj = new Date(ceYear, month - 1, d);
      const dayOfWeek = dateObj.getDay();
      
      const isRestDay = restDays.includes(dayOfWeek);
      const dayStatus = attRec.dayStatuses ? (attRec.dayStatuses[d] || '') : (checkedDaysSet.has(d) ? '/' : '');
      const finalStatus = dayStatus === '' && checkedDaysSet.has(d) ? '/' : dayStatus;
      
      let statusBgClass = '';
      if (finalStatus) {
        if (finalStatus === '/') statusBgClass = 'status-bg-worked';
        else if (finalStatus === 'ป') statusBgClass = 'status-bg-sick';
        else if (finalStatus === 'ก') statusBgClass = 'status-bg-personal';
        else if (finalStatus === 'พ') statusBgClass = 'status-bg-vacation';
        else if (finalStatus === 'ข') statusBgClass = 'status-bg-absent';
      }
      
      rowHtml += `
        <td class="att-checkbox-cell ${isRestDay ? 'att-rest-day-cell' : ''} ${statusBgClass}">
          <select class="att-select" data-name="${person.name}" data-day="${d}">
            <option value=""></option>
            <option value="/" ${finalStatus === '/' ? 'selected' : ''}>/</option>
            <option value="ป" ${finalStatus === 'ป' ? 'selected' : ''}>ป</option>
            <option value="ก" ${finalStatus === 'ก' ? 'selected' : ''}>ก</option>
            <option value="พ" ${finalStatus === 'พ' ? 'selected' : ''}>พ</option>
            <option value="ข" ${finalStatus === 'ข' ? 'selected' : ''}>ข</option>
          </select>
        </td>
      `;
    }
    
    rowHtml += `
      <td style="text-align: center; font-weight: bold; color: var(--post-orange); font-size: 1rem;" id="att-total-${person.name}">
        ${attRec.checkedDays.length}
      </td>
    `;
    
    tr.innerHTML = rowHtml;
    tableBody.appendChild(tr);
  });
  
  tableBody.querySelectorAll('select.att-select').forEach(sel => {
    sel.addEventListener('change', async (e) => {
      const name = e.target.getAttribute('data-name');
      const day = parseInt(e.target.getAttribute('data-day'));
      const status = e.target.value;
      
      let attRec = attendanceList.find(item => item.name === name);
      if (!attRec) {
        attRec = { name, checkedDays: [], dayStatuses: {} };
        attendanceList.push(attRec);
      }
      if (!attRec.dayStatuses) {
        attRec.dayStatuses = {};
      }
      
      // Update status
      if (status) {
        attRec.dayStatuses[day] = status;
      } else {
        delete attRec.dayStatuses[day];
      }
      
      // Update checkedDays (only '/' counts as worked!)
      const daySet = new Set(attRec.checkedDays);
      if (status === '/') {
        daySet.add(day);
      } else {
        daySet.delete(day);
      }
      attRec.checkedDays = Array.from(daySet).sort((a, b) => a - b);
      
      const totalCell = document.getElementById(`att-total-${name}`);
      if (totalCell) totalCell.textContent = attRec.checkedDays.length;
      
      // Update cell styling class
      const parentCell = e.target.closest('td');
      parentCell.className = 'att-checkbox-cell'; // reset
      const person = getPersonnel().find(p => p.name === name);
      if (person && person.restDays && person.restDays.includes(new Date(ceYear, month - 1, day).getDay())) {
        parentCell.classList.add('att-rest-day-cell');
      }
      if (status) {
        let statusBgClass = '';
        if (status === '/') statusBgClass = 'status-bg-worked';
        else if (status === 'ป') statusBgClass = 'status-bg-sick';
        else if (status === 'ก') statusBgClass = 'status-bg-personal';
        else if (status === 'พ') statusBgClass = 'status-bg-vacation';
        else if (status === 'ข') statusBgClass = 'status-bg-absent';
        parentCell.classList.add(statusBgClass);
      }
      
      await saveAttendanceRecord(year, month, name, attRec.checkedDays, attRec.dayStatuses);
      syncWorkDaysToCalculators(name, attRec.checkedDays.length);
    });
  });
}

async function syncWorkDaysToCalculators(empName, totalDays) {
  let fuelChanged = false;
  const fuelList = window.employees || [];
  const fuelIdx = fuelList.findIndex(e => e.name === empName);
  if (fuelIdx !== -1) {
    if (fuelList[fuelIdx].formMode !== 'supervisor') {
      fuelList[fuelIdx].workDays = totalDays;
      fuelChanged = true;
    }
  }
  
  let waterChanged = false;
  const waterList = window.waterEmployees || [];
  const waterIdx = waterList.findIndex(e => e.name === empName);
  if (waterIdx !== -1) {
    waterList[waterIdx].workDays = totalDays;
    waterChanged = true;
  }
  
  if (fuelChanged) {
    await saveEmployees(fuelList);
    if (window.renderEmployeeTable) window.renderEmployeeTable();
  }
  if (waterChanged) {
    await saveWaterEmployees(waterList);
    if (window.renderWaterTable) window.renderWaterTable();
  }
}

async function toggleAllAttendanceDays(checkAll) {
  const attMonthSelect = document.getElementById('attMonth');
  const attYearInput = document.getElementById('attYear');
  if (!attMonthSelect || !attYearInput) return;
  
  const month = parseInt(attMonthSelect.value);
  const year = parseInt(attYearInput.value);
  const daysCount = getDaysInMonth(year, month);
  const ceYear = year - 543;
  
  const personnel = getPersonnel();
  
  window.showConfirm({
    title: checkAll ? 'เลือกวันทำงานทั้งหมด' : 'ล้างวันทำงานทั้งหมด',
    message: checkAll 
      ? `คุณต้องการติ๊กเลือกวันทำงานทั้งหมด (เว้นวันหยุดประจำสัปดาห์) ให้พนักงานทุกคนในเดือนนี้ใช่หรือไม่?`
      : `คุณต้องการล้างวันทำงานทั้งหมดให้พนักงานทุกคนในเดือนนี้ใช่หรือไม่?`,
    icon: '❓',
    okText: 'ดำเนินการ',
    okClass: checkAll ? 'btn-primary' : 'btn-danger',
    onConfirm: async () => {
      window.showToast('กำลังประมวลผล...', 'info');
      const updatedList = [];
      
      personnel.forEach(person => {
        let checkedDays = [];
        let dayStatuses = {};
        if (checkAll) {
          const restDays = person.restDays || [];
          for (let d = 1; d <= daysCount; d++) {
            const dateObj = new Date(ceYear, month - 1, d);
            const dayOfWeek = dateObj.getDay();
            if (!restDays.includes(dayOfWeek)) {
              checkedDays.push(d);
              dayStatuses[d] = '/';
            }
          }
        }
        updatedList.push({ name: person.name, checkedDays, dayStatuses });
      });
      
      attendanceList = updatedList;
      await saveAttendanceList(year, month, updatedList);
      renderAttendanceTableRows();
      
      for (const item of updatedList) {
        await syncWorkDaysToCalculators(item.name, item.checkedDays.length);
      }
      
      window.showToast('ดำเนินการสำเร็จ!', 'success');
    }
  });
}

async function exportAttendanceToExcel() {
  const attMonthSelect = document.getElementById('attMonth');
  const attYearInput = document.getElementById('attYear');
  if (!attMonthSelect || !attYearInput) return;
  
  const month = parseInt(attMonthSelect.value);
  const year = parseInt(attYearInput.value);
  const daysCount = getDaysInMonth(year, month);
  
  window.showToast('กำลังเตรียมข้อมูลส่งออก...', 'info');
  
  try {
    const XLSX = await getXLSX();
    const personnel = getPersonnel();
    const sorted = [...personnel].sort((a, b) => a.name.localeCompare(b.name, 'th'));
    
    const headers = ['ลำดับ', 'ชื่อ-นามสกุล'];
    for (let d = 1; d <= daysCount; d++) {
      headers.push(String(d));
    }
    headers.push('รวมมาทำงาน');
    
    const data = [
      ['แบบบันทึกวันมาทำงานพนักงาน (สำหรับนำเข้าข้อมูลเข้าระบบ)'],
      ['คำชี้แจง: / = มาทำงานปกติ (ระบบคำนวณนับเฉพาะเครื่องหมาย / นี้เท่านั้นเพื่อนำเข้ารับวันมาทำงาน)'],
      headers
    ];
    
    sorted.forEach((person, idx) => {
      const attRec = attendanceList.find(item => item.name === person.name) || { checkedDays: [], dayStatuses: {} };
      const row = [idx + 1, person.name];
      const statuses = attRec.dayStatuses || {};
      for (let d = 1; d <= daysCount; d++) {
        let val = '';
        if (statuses[d]) {
          val = statuses[d];
        } else if (attRec.checkedDays.includes(d)) {
          val = '/';
        }
        row.push(val);
      }
      row.push(attRec.checkedDays.length);
      data.push(row);
    });
    
    // Add 15 extra empty rows for visual alignment
    const startIdx = sorted.length;
    for (let i = 0; i < 15; i++) {
      const row = [startIdx + i + 1, ''];
      for (let d = 1; d <= daysCount; d++) {
        row.push('');
      }
      row.push('');
      data.push(row);
    }
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const colsCount = 2 + daysCount + 1;
    
    // Merge title banner and subtitle
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: colsCount - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: colsCount - 1 } }
    ];
    
    // Set column widths
    const colsW = [{ wch: 6 }, { wch: 28 }];
    for (let d = 1; d <= daysCount; d++) {
      colsW.push({ wch: 3.5 });
    }
    colsW.push({ wch: 15 });
    ws['!cols'] = colsW;
    
    // Set row heights
    const totalRows = data.length;
    const rowsH = [{ hpx: 35 }, { hpx: 24 }, { hpx: 26 }];
    for (let r = 3; r < totalRows; r++) {
      rowsH.push({ hpx: 20 });
    }
    ws['!rows'] = rowsH;
    
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_address = { c: C, r: R };
        const cell_ref = XLSX.utils.encode_cell(cell_address);
        let cell = ws[cell_ref];
        if (!cell) {
          cell = { t: 's', v: '' };
          ws[cell_ref] = cell;
        }
        
        cell.s = {
          border: {
            top: { style: 'thin', color: { rgb: 'CCCCCC' } },
            bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
            left: { style: 'thin', color: { rgb: 'CCCCCC' } },
            right: { style: 'thin', color: { rgb: 'CCCCCC' } }
          },
          font: { name: 'Sarabun', sz: 10 },
          alignment: { vertical: 'center', horizontal: 'center' }
        };
        
        if (R === 0) {
          cell.s.fill = { fgColor: { rgb: 'F04E23' } };
          cell.s.font = { name: 'Sarabun', sz: 14, bold: true, color: { rgb: 'FFFFFF' } };
          cell.s.border = {};
        } else if (R === 1) {
          cell.s.fill = { fgColor: { rgb: 'FEF8E7' } };
          cell.s.font = { name: 'Sarabun', sz: 9.5, color: { rgb: '444444' } };
          cell.s.border = {};
        } else if (R === 2) {
          cell.s.fill = { fgColor: { rgb: '2B2B2B' } };
          cell.s.font = { name: 'Sarabun', sz: 10, bold: true, color: { rgb: 'FFFFFF' } };
          cell.s.border = {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '444444' } },
            right: { style: 'thin', color: { rgb: '444444' } }
          };
        } else {
          if (C === 1) {
            cell.s.alignment.horizontal = 'left';
          }
          if (C === colsCount - 1) {
            cell.s.font = { name: 'Sarabun', sz: 10, bold: true, color: { rgb: 'C00000' } };
            cell.s.border.bottom = { style: 'double', color: { rgb: 'C00000' } };
          }
          if (C >= 2 && C < colsCount - 1) {
            const d = C - 1;
            const ceYear = year - 543;
            const dateObj = new Date(ceYear, month - 1, d);
            const dayOfWeek = dateObj.getDay();
            let isRestDay = false;
            const personIdx = R - 3;
            if (personIdx < sorted.length) {
              const person = sorted[personIdx];
              if (person && person.restDays && person.restDays.includes(dayOfWeek)) {
                isRestDay = true;
              }
            } else {
              if (dayOfWeek === 0 || dayOfWeek === 6) {
                isRestDay = true;
              }
            }
            if (isRestDay) {
              if (dayOfWeek === 0) {
                cell.s.fill = { fgColor: { rgb: 'FFE8E8' } };
              } else if (dayOfWeek === 6) {
                cell.s.fill = { fgColor: { rgb: 'FFF0E0' } };
              } else {
                cell.s.fill = { fgColor: { rgb: 'EDEDED' } };
              }
            }
          }
        }
      }
    }
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    
    const filename = `attendance_${year}_${String(month).padStart(2, '0')}.xlsx`;
    XLSX.writeFile(wb, filename);
    window.showToast('ส่งออกตารางลงเวลาสำเร็จ!', 'success');
  } catch (error) {
    console.error("Failed to export attendance:", error);
    window.showToast('เกิดข้อผิดพลาดในการส่งออกข้อมูล', 'error');
  }
}

async function downloadAttTemplateXlsx() {
  const attMonthSelect = document.getElementById('attMonth');
  const attYearInput = document.getElementById('attYear');
  if (!attMonthSelect || !attYearInput) return;
  
  const month = parseInt(attMonthSelect.value);
  const year = parseInt(attYearInput.value);
  const daysCount = getDaysInMonth(year, month);
  
  try {
    const XLSX = await getXLSX();
    const personnel = getPersonnel();
    const sorted = [...personnel].sort((a, b) => a.name.localeCompare(b.name, 'th'));
    
    const headers = ['ลำดับ', 'ชื่อ-นามสกุล'];
    for (let d = 1; d <= daysCount; d++) {
      headers.push(String(d));
    }
    headers.push('รวมมาทำงาน');
    
    const data = [
      ['แบบบันทึกวันมาทำงานพนักงาน (สำหรับนำเข้าข้อมูลเข้าระบบ)'],
      ['คำชี้แจง: / = มาทำงานปกติ (ระบบคำนวณนับเฉพาะเครื่องหมาย / นี้เท่านั้นเพื่อนำเข้ารับวันมาทำงาน)'],
      headers
    ];
    
    sorted.forEach((person, idx) => {
      const row = [idx + 1, person.name];
      for (let d = 1; d <= daysCount; d++) {
        row.push('');
      }
      row.push('');
      data.push(row);
    });
    
    // Add 25 empty template rows
    const startIdx = sorted.length;
    for (let i = 0; i < 25; i++) {
      const row = [startIdx + i + 1, ''];
      for (let d = 1; d <= daysCount; d++) {
        row.push('');
      }
      row.push('');
      data.push(row);
    }
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const colsCount = 2 + daysCount + 1;
    
    // Merge title banner and subtitle
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: colsCount - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: colsCount - 1 } }
    ];
    
    // Set column widths
    const colsW = [{ wch: 6 }, { wch: 28 }];
    for (let d = 1; d <= daysCount; d++) {
      colsW.push({ wch: 3.5 });
    }
    colsW.push({ wch: 15 });
    ws['!cols'] = colsW;
    
    // Set row heights
    const totalRows = data.length;
    const rowsH = [{ hpx: 35 }, { hpx: 24 }, { hpx: 26 }];
    for (let r = 3; r < totalRows; r++) {
      rowsH.push({ hpx: 20 });
    }
    ws['!rows'] = rowsH;
    
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_address = { c: C, r: R };
        const cell_ref = XLSX.utils.encode_cell(cell_address);
        let cell = ws[cell_ref];
        if (!cell) {
          cell = { t: 's', v: '' };
          ws[cell_ref] = cell;
        }
        
        cell.s = {
          border: {
            top: { style: 'thin', color: { rgb: 'CCCCCC' } },
            bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
            left: { style: 'thin', color: { rgb: 'CCCCCC' } },
            right: { style: 'thin', color: { rgb: 'CCCCCC' } }
          },
          font: { name: 'Sarabun', sz: 10 },
          alignment: { vertical: 'center', horizontal: 'center' }
        };
        
        if (R === 0) {
          cell.s.fill = { fgColor: { rgb: 'F04E23' } };
          cell.s.font = { name: 'Sarabun', sz: 14, bold: true, color: { rgb: 'FFFFFF' } };
          cell.s.border = {};
        } else if (R === 1) {
          cell.s.fill = { fgColor: { rgb: 'FEF8E7' } };
          cell.s.font = { name: 'Sarabun', sz: 9.5, color: { rgb: '444444' } };
          cell.s.border = {};
        } else if (R === 2) {
          cell.s.fill = { fgColor: { rgb: '2B2B2B' } };
          cell.s.font = { name: 'Sarabun', sz: 10, bold: true, color: { rgb: 'FFFFFF' } };
          cell.s.border = {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '444444' } },
            right: { style: 'thin', color: { rgb: '444444' } }
          };
        } else {
          if (C === 1) {
            cell.s.alignment.horizontal = 'left';
          }
          if (C === colsCount - 1) {
            cell.s.font = { name: 'Sarabun', sz: 10, bold: true, color: { rgb: 'C00000' } };
            cell.s.border.bottom = { style: 'double', color: { rgb: 'C00000' } };
          }
          if (C >= 2 && C < colsCount - 1) {
            const d = C - 1;
            const ceYear = year - 543;
            const dateObj = new Date(ceYear, month - 1, d);
            const dayOfWeek = dateObj.getDay();
            let isRestDay = false;
            const personIdx = R - 3;
            if (personIdx < sorted.length) {
              const person = sorted[personIdx];
              if (person && person.restDays && person.restDays.includes(dayOfWeek)) {
                isRestDay = true;
              }
            } else {
              if (dayOfWeek === 0 || dayOfWeek === 6) {
                isRestDay = true;
              }
            }
            if (isRestDay) {
              if (dayOfWeek === 0) {
                cell.s.fill = { fgColor: { rgb: 'FFE8E8' } };
              } else if (dayOfWeek === 6) {
                cell.s.fill = { fgColor: { rgb: 'FFF0E0' } };
              } else {
                cell.s.fill = { fgColor: { rgb: 'EDEDED' } };
              }
            }
          }
        }
      }
    }
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    
    XLSX.writeFile(wb, `attendance_template_${year}_${String(month).padStart(2, '0')}.xlsx`);
    window.showToast('ดาวน์โหลดเทมเพลตสำเร็จ!', 'success');
  } catch (error) {
    console.error(error);
    window.showToast('ดาวน์โหลดเทมเพลตไม่สำเร็จ', 'error');
  }
}

function switchAttImportTab(tab) {
  const tabFile = document.getElementById('tabAttImportFile');
  const tabText = document.getElementById('tabAttImportText');
  const fileContent = document.getElementById('attImportFileContent');
  const textContent = document.getElementById('attImportTextContent');
  
  if (tab === 'file') {
    if (tabFile) tabFile.setAttribute('style', 'font-weight: bold; background: var(--post-orange); color: white;');
    if (tabText) tabText.setAttribute('style', 'font-weight: bold; background: var(--border-glass) !important; color: var(--text-primary) !important; border: 1px solid var(--border-glass) !important; cursor: pointer;');
    if (fileContent) fileContent.classList.remove('hidden');
    if (textContent) textContent.classList.add('hidden');
  } else {
    if (tabText) tabText.setAttribute('style', 'font-weight: bold; background: var(--post-orange); color: white;');
    if (tabFile) tabFile.setAttribute('style', 'font-weight: bold; background: var(--border-glass) !important; color: var(--text-primary) !important; border: 1px solid var(--border-glass) !important; cursor: pointer;');
    if (textContent) textContent.classList.remove('hidden');
    if (fileContent) fileContent.classList.add('hidden');
  }
}

let tempParsedAttRecords = [];

function clearSelectedAttImportFile() {
  const attendanceFileSelector = document.getElementById('attendanceFileSelector');
  const attSelectedFileInfo = document.getElementById('attSelectedFileInfo');
  const submitAttImportBtn = document.getElementById('submitAttImportBtn');
  
  if (attendanceFileSelector) attendanceFileSelector.value = '';
  if (attSelectedFileInfo) attSelectedFileInfo.classList.add('hidden');
  if (submitAttImportBtn) {
    submitAttImportBtn.disabled = true;
    submitAttImportBtn.textContent = '✔️ ยืนยันนำเข้าการลงเวลา';
  }
  tempParsedAttRecords = [];
  document.getElementById('attImportPreviewTableBody').innerHTML = '<tr><td class="no-data" style="text-align: center; padding: 1.5rem;">ยังไม่มีข้อมูล รอโหลดไฟล์หรือวางข้อมูลเพื่อประมวลผล</td></tr>';
}

function processUploadedAttFile(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const XLSX = await getXLSX();
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      parseAttRows(rows);
      
      const fileInfo = document.getElementById('attSelectedFileInfo');
      const filenameLabel = document.getElementById('attFileNameLabel');
      if (fileInfo && filenameLabel) {
        filenameLabel.textContent = `📁 ${file.name}`;
        fileInfo.classList.remove('hidden');
      }
    } catch (error) {
      console.error(error);
      window.showToast('ไม่สามารถอ่านไฟล์ได้', 'error');
      clearSelectedAttImportFile();
    }
  };
  reader.readAsArrayBuffer(file);
}

function handleAttPaste(e) {
  let text = '';
  if (e.type === 'paste') {
    text = (e.clipboardData || window.clipboardData).getData('text');
  } else {
    text = e.target.value;
  }
  
  if (!text.trim()) return;
  
  const rows = text.split('\n').map(row => row.split('\t'));
  parseAttRows(rows);
}

function parseAttRows(rows) {
  if (rows.length < 2) return;
  
  const attMonthSelect = document.getElementById('attMonth');
  const attYearInput = document.getElementById('attYear');
  const month = parseInt(attMonthSelect.value);
  const year = parseInt(attYearInput.value);
  const daysCount = getDaysInMonth(year, month);
  
  let headerIdx = 0;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    if (rows[i].some(cell => String(cell).includes('ชื่อ') || String(cell).includes('นามสกุล'))) {
      headerIdx = i;
      break;
    }
  }
  
  const headers = rows[headerIdx];
  let nameColIdx = headers.findIndex(h => String(h).includes('ชื่อ'));
  if (nameColIdx === -1) nameColIdx = 1;
  
  const records = [];
  const personnel = getPersonnel();
  const personnelNames = new Set(personnel.map(p => p.name.trim()));
  
  let matchCount = 0;
  
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length <= nameColIdx) continue;
    
    const name = String(row[nameColIdx] || '').trim();
    if (!name || name === 'undefined' || name === 'ชื่อ-นามสกุล') continue;
    
    const checkedDays = [];
    const dayStatuses = {};
    let dayColStart = nameColIdx + 1;
    for (let d = 1; d <= daysCount; d++) {
      const cellVal = row[dayColStart + d - 1];
      if (cellVal !== undefined) {
        const valStr = String(cellVal).trim();
        const valLower = valStr.toLowerCase();
        if (valLower === '1' || valLower === 'x' || valLower === 'true' || valLower === '/' || valLower === '✓' || valLower === 't') {
          checkedDays.push(d);
          dayStatuses[d] = '/';
        } else if (valStr === 'ป' || valLower.includes('ป่วย') || valLower.includes('sick')) {
          dayStatuses[d] = 'ป';
        } else if (valStr === 'ก' || valLower.includes('กิจ') || valLower.includes('leave') || valLower.includes('personal')) {
          dayStatuses[d] = 'ก';
        } else if (valStr === 'พ' || valLower.includes('พัก') || valLower.includes('vacation') || valLower.includes('holiday')) {
          dayStatuses[d] = 'พ';
        } else if (valStr === 'ข' || valLower.includes('ขาด') || valLower.includes('absent')) {
          dayStatuses[d] = 'ข';
        }
      }
    }
    
    const exists = personnelNames.has(name);
    if (exists) matchCount++;
    
    records.push({ name, checkedDays, exists });
  }
  
  tempParsedAttRecords = records;
  renderAttImportPreview(daysCount);
}

function renderAttImportPreview(daysCount) {
  const previewHeader = document.getElementById('attImportPreviewHeader');
  const previewBody = document.getElementById('attImportPreviewTableBody');
  const submitAttImportBtn = document.getElementById('submitAttImportBtn');
  if (!previewHeader || !previewBody || !submitAttImportBtn) return;
  
  let headerHtml = `
    <th>ชื่อ-นามสกุล</th>
    <th>สถานะ</th>
    <th>วันที่ติ๊กทำงาน</th>
    <th>รวม</th>
  `;
  previewHeader.innerHTML = `<tr>${headerHtml}</tr>`;
  
  previewBody.innerHTML = '';
  
  tempParsedAttRecords.forEach(rec => {
    const tr = document.createElement('tr');
    const leaves = [];
    const statuses = rec.dayStatuses || {};
    Object.keys(statuses).forEach(d => {
      if (statuses[d] !== '/') {
        leaves.push(`${d}(${statuses[d]})`);
      }
    });
    const leavesText = leaves.length > 0 ? ` (ลา: ${leaves.join(', ')})` : '';
    tr.innerHTML = `
      <td style="text-align: left;"><strong>${rec.name}</strong></td>
      <td style="text-align: left;">
        ${rec.exists ? '<span style="color: var(--post-emerald); font-weight: bold;">✔️ พบในระบบ</span>' : '<span style="color: var(--post-red);">❌ ไม่พบพนักงาน</span>'}
      </td>
      <td style="font-size: 0.75rem; text-align: left;">
        ${rec.checkedDays.length > 0 ? rec.checkedDays.join(', ') : '-'}${leavesText}
      </td>
      <td style="font-weight: bold; color: var(--post-orange);">${rec.checkedDays.length} วัน</td>
    `;
    previewBody.appendChild(tr);
  });
  
  const matchCount = tempParsedAttRecords.filter(r => r.exists).length;
  submitAttImportBtn.disabled = matchCount === 0;
  submitAttImportBtn.innerHTML = `✔️ ยืนยันนำเข้าข้อมูล (${matchCount} รายชื่อ)`;
}

async function handleConfirmAttImport() {
  const attMonthSelect = document.getElementById('attMonth');
  const attYearInput = document.getElementById('attYear');
  if (!attMonthSelect || !attYearInput) return;
  
  const month = parseInt(attMonthSelect.value);
  const year = parseInt(attYearInput.value);
  
  window.showToast('กำลังนำเข้าข้อมูล...', 'info');
  try {
    const matchedRecords = tempParsedAttRecords.filter(r => r.exists);
    
    for (const rec of matchedRecords) {
      await saveAttendanceRecord(year, month, rec.name, rec.checkedDays, rec.dayStatuses || {});
      await syncWorkDaysToCalculators(rec.name, rec.checkedDays.length);
    }
    
    await bindAttendanceDataListeners();
    
    document.getElementById('attendanceImportModal').classList.remove('active');
    clearSelectedAttImportFile();
    window.showToast('นำเข้าตารางเวลาทำงานเสร็จสิ้น!', 'success');
  } catch (error) {
    console.error(error);
    window.showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูลนำเข้า', 'error');
  }
}
