import {
  savePersonnelList,
  fetchPersonnelList,
  isCloudConnected
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
      await savePersonnelList(personnel);
      renderPersonnelTable();
      if (window.updateEmployeeSelectDropdown) {
        window.updateEmployeeSelectDropdown();
      }
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
  await savePersonnelList(personnel);
  if (personnelForm) personnelForm.reset();
  document.querySelectorAll('input[name="personRestDays"]').forEach(cb => cb.checked = false);
  if (personDepartmentCustomGroup) personDepartmentCustomGroup.classList.add('hidden');
  renderPersonnelTable();
  if (window.updateEmployeeSelectDropdown) {
    window.updateEmployeeSelectDropdown();
  }
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
      await savePersonnelList(personnel);
      if (personnelForm) personnelForm.reset();
      document.querySelectorAll('input[name="personRestDays"]').forEach(cb => cb.checked = false);
      if (personDepartmentCustomGroup) personDepartmentCustomGroup.classList.add('hidden');
      renderPersonnelTable();
      if (window.updateEmployeeSelectDropdown) {
        window.updateEmployeeSelectDropdown();
      }
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
    await savePersonnelList(personnel);
    if (personnelForm) personnelForm.reset();
    document.querySelectorAll('input[name="personRestDays"]').forEach(cb => cb.checked = false);
    if (personDepartmentCustomGroup) personDepartmentCustomGroup.classList.add('hidden');
    renderPersonnelTable();
    if (window.updateEmployeeSelectDropdown) {
      window.updateEmployeeSelectDropdown();
    }
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
            await savePersonnelList(currentPersonnel);
            renderPersonnelTable();
            if (window.updateEmployeeSelectDropdown) {
              window.updateEmployeeSelectDropdown();
            }
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
        await savePersonnelList(personnel);
        renderPersonnelTable();
        if (window.updateEmployeeSelectDropdown) {
          window.updateEmployeeSelectDropdown();
        }
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
    await savePersonnelList(personnel);
    renderPersonnelTable();
    if (window.updateEmployeeSelectDropdown) {
      window.updateEmployeeSelectDropdown();
    }
    
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
    await savePersonnelList(personnel);
    renderPersonnelTable();
    if (window.updateEmployeeSelectDropdown) {
      window.updateEmployeeSelectDropdown();
    }

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
      await savePersonnelList([]);
      renderPersonnelTable();
      if (window.updateEmployeeSelectDropdown) {
        window.updateEmployeeSelectDropdown();
      }
      window.showToast('ล้างตารางข้อมูลทะเบียนบุคลากรเรียบร้อยแล้ว!', 'success');
    }
  });
}
