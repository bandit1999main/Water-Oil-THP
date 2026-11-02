import {
  saveWaterEmployees,
  fetchWaterEmployees
} from './database.js';

// Helpers to read/write global state on window
function getWaterEmployees() {
  return window.waterEmployees || [];
}
function setWaterEmployees(val) {
  window.waterEmployees = val;
}

export function calculateWaterTax(salary, totalAllowance) {
  const brackets = window.waterTaxBrackets || [
    { minSalary: 0, maxSalary: 25833, rate: 0.00 },
    { minSalary: 25834, maxSalary: 38333, rate: 0.05 },
    { minSalary: 38334, maxSalary: 55000, rate: 0.10 },
    { minSalary: 55001, maxSalary: 75833, rate: 0.15 },
    { minSalary: 75834, maxSalary: 96666, rate: 0.20 },
    { minSalary: 96667, maxSalary: 9999999, rate: 0.25 }
  ];
  for (const b of brackets) {
    if (salary >= b.minSalary && salary <= b.maxSalary) {
      return Math.round(totalAllowance * (b.rate || 0) * 100) / 100;
    }
  }
  return 0;
}

export function renderWaterTable() {
  const employeeTableBody = document.getElementById('employeeTableBody');
  const sumFuelCostSpan = document.getElementById('sumFuelCost');
  const sumMaintenanceCostSpan = document.getElementById('sumMaintenanceCost');
  const sumTotalCostSpan = document.getElementById('sumTotalCost');
  
  if (!employeeTableBody) return;

  const waterEmployees = getWaterEmployees();

  // Sort water employees: active first, resigned last (and then by name in Thai alphabetical order)
  const registry = JSON.parse(localStorage.getItem('tp_personnel')) || [];
  waterEmployees.sort((a, b) => {
    const aPerson = registry.find(p => p.name === a.name);
    const bPerson = registry.find(p => p.name === b.name);
    const aRes = (aPerson && aPerson.status === 'resigned') ? 1 : 0;
    const bRes = (bPerson && bPerson.status === 'resigned') ? 1 : 0;
    if (aRes !== bRes) return aRes - bRes;
    return a.name.localeCompare(b.name, 'th');
  });

  if (waterEmployees.length === 0) {
    employeeTableBody.innerHTML = `
      <tr>
        <td colspan="10" class="no-data">ยังไม่มีข้อมูลในตาราง กรุณากรอกข้อมูลด้านซ้าย หรือคัดลอกรายชื่อจากเดือนก่อน</td>
      </tr>
    `;
    if (sumFuelCostSpan) sumFuelCostSpan.textContent = '0.00';
    if (sumMaintenanceCostSpan) sumMaintenanceCostSpan.textContent = '0.00';
    if (sumTotalCostSpan) sumTotalCostSpan.textContent = '0.00';
    return;
  }

  let totalAllowance = 0;
  let totalTaxVal = 0;
  let totalNetVal = 0;
  waterEmployees.forEach((item) => {
    const allowance = item.workDays * (window.waterAllowancePerDay || 30);
    const tax = calculateWaterTax(item.salary, allowance);
    const net = Math.round((allowance - tax) * 100) / 100;
    totalAllowance += allowance;
    totalTaxVal += tax;
    totalNetVal += net;
  });

  const query = (window.employeeSearchQuery || '').toLowerCase().trim();
  const filtered = [];
  waterEmployees.forEach((item, originalIdx) => {
    const matches = !query ||
      item.name.toLowerCase().includes(query) ||
      item.position.toLowerCase().includes(query) ||
      (item.duty && item.duty.toLowerCase().includes(query));
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
    if (sumFuelCostSpan) sumFuelCostSpan.textContent = '0.00';
    if (sumMaintenanceCostSpan) sumMaintenanceCostSpan.textContent = '0.00';
    if (sumTotalCostSpan) sumTotalCostSpan.textContent = '0.00';
    return;
  }

  let activeCount = 0;
  filtered.forEach(({ item, originalIdx }, index) => {
    const allowance = item.workDays * (window.waterAllowancePerDay || 30);
    const tax = calculateWaterTax(item.salary, allowance);
    const net = Math.round((allowance - tax) * 100) / 100;

    const person = registry.find(p => p.name === item.name);
    const isResigned = person && person.status === 'resigned';
    let displayNo = '';
    if (isResigned) {
      displayNo = '<span style="color: var(--text-secondary); opacity: 0.5;">-</span>';
    } else {
      activeCount++;
      displayNo = activeCount;
    }

    const esc = window.escapeHtml || ((s) => s);
    const tr = document.createElement('tr');
    if (isResigned) tr.style.opacity = '0.7';
    tr.innerHTML = `
      <td>${displayNo}</td>
      <td style="font-weight: 700; color: var(--text-primary);">${esc(item.name)}</td>
      <td><span style="background: rgba(14, 165, 233, 0.1); color: var(--post-orange); padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700;">${esc(item.position)} / ${esc(item.duty || '-')}</span></td>
      <td>${item.salary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</td>
      <td style="text-align: center;">${item.workDays} วัน</td>
      <td style="font-weight: 700;">${allowance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</td>
      <td style="color: ${tax > 0 ? 'var(--post-red)' : 'var(--text-secondary)'}; font-weight: ${tax > 0 ? '700' : '400'};">${tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</td>
      <td style="font-weight: 800; color: var(--post-emerald);">${net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</td>
      <td style="font-family: var(--font-title); font-style: italic; color: var(--text-secondary); font-weight: 500; font-size: 0.85rem;">${esc(item.signature)}</td>
      <td class="actions-col">
        <button class="row-action-btn edit-btn" title="แก้ไข">✏️</button>
        <button class="row-action-btn delete-btn" title="ลบ">🗑️</button>
        <button class="row-action-btn print-50-btn" title="พิมพ์ใบ 50 ทวิ" style="display: ${tax > 0 ? '' : 'none'}; margin-left: 0.25rem;">📄</button>
      </td>
    `;

    tr.querySelector('.edit-btn').addEventListener('click', () => editWaterEmployee(originalIdx));
    tr.querySelector('.delete-btn').addEventListener('click', () => deleteWaterEmployee(originalIdx));
    if (tax > 0) {
      tr.querySelector('.print-50-btn').addEventListener('click', () => print50Tawi(originalIdx));
    }

    employeeTableBody.appendChild(tr);
  });

  if (sumFuelCostSpan) sumFuelCostSpan.textContent = totalAllowance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (sumMaintenanceCostSpan) sumMaintenanceCostSpan.textContent = totalTaxVal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (sumTotalCostSpan) sumTotalCostSpan.textContent = totalNetVal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function editWaterEmployee(idx) {
  if (window.openEditModal) {
    window.openEditModal(true, idx);
  }
}

export function deleteWaterEmployee(idx) {
  const waterEmployees = getWaterEmployees();
  const emp = waterEmployees[idx];
  const empName = emp ? emp.name : 'รายชื่อนี้';
  window.showConfirm({
    title: 'ยืนยันการลบ',
    message: `คุณแน่ใจว่าต้องการลบรายชื่อของ "${empName}" ใช่หรือไม่? ผลลัพธ์นี้ไม่สามารถย้อนคืนได้`,
    icon: '🗑️',
    okText: 'ลบรายชื่อ',
    onConfirm: async () => {
      waterEmployees.splice(idx, 1);
      setWaterEmployees(waterEmployees);
      renderWaterTable();
      saveWaterEmployees(waterEmployees);
      window.showToast('ลบรายชื่อเรียบร้อยแล้ว!', 'success');
    }
  });
}

export async function handleWaterFormSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('empName').value.trim();
  const remarks = document.getElementById('remarks').value.trim();
  const signatureInput = document.getElementById('signature').value.trim();
  const signature = signatureInput || name;
  const editIndexVal = document.getElementById('editIndex').value;
  const saveBtn = document.getElementById('saveBtn');
  const resetBtn = document.getElementById('resetBtn');

  const position = document.getElementById('empPosition').value;
  const duty = document.getElementById('empDuty').value;
  const salary = parseFloat(document.getElementById('empSalary').value) || 0;
  const workDays = parseInt(document.getElementById('workDays').value) || 0;

  const waterEmployees = getWaterEmployees();

  const item = {
    name,
    position,
    duty,
    salary,
    workDays,
    remarks,
    signature
  };

  if (editIndexVal !== '') {
    const idx = parseInt(editIndexVal);
    const existingId = waterEmployees[idx]?.id;
    if (existingId) item.id = existingId;
    waterEmployees[idx] = item;
    document.getElementById('editIndex').value = '';
    if (saveBtn) saveBtn.innerHTML = '📥 บันทึกข้อมูลค่าน้ำดื่ม';
    if (resetBtn) resetBtn.classList.add('hidden');
    const formTitle = document.getElementById('formTitle');
    if (formTitle) formTitle.textContent = 'กรอกข้อมูลผู้รับค่าน้ำดื่ม';
  } else {
    waterEmployees.push(item);
  }

  setWaterEmployees(waterEmployees);
  document.getElementById('employeeForm').reset();
  renderWaterTable();
  saveWaterEmployees(waterEmployees);
  window.showToast(
    editIndexVal !== '' ? 'อัปเดตข้อมูลสำเร็จ!' : 'เพิ่มรายชื่อสำเร็จ!',
    'success'
  );
}

export async function exportWaterCsv() {
  const waterEmployees = getWaterEmployees();
  if (waterEmployees.length === 0) {
    window.showToast('ไม่มีข้อมูลที่จะส่งออก!', 'warning');
    return;
  }

  let XLSX;
  try {
    XLSX = await window.getXLSX();
  } catch (e) {
    console.error('Failed to load XLSX library:', e);
    window.showToast('ไม่สามารถโหลดระบบสร้างไฟล์ Excel ได้ กรุณาลองใหม่อีกครั้ง', 'error');
    return;
  }

  const globalMonthSelect = document.getElementById('globalMonth');
  const globalYearSelect = document.getElementById('globalYear');
  const monthText = globalMonthSelect.options[globalMonthSelect.selectedIndex].text;
  const yearText = globalYearSelect.value;
  const month = parseInt(globalMonthSelect.value);
  const year = parseInt(globalYearSelect.value);

  const sigMakerTitleVal = document.getElementById('sigMakerTitle')?.value.trim() || 'ผู้จัดทำ';
  const sigMakerNameVal = document.getElementById('sigMakerName')?.value.trim() || '..........................................................';
  const sigMakerPosVal = document.getElementById('sigMakerPos')?.value.trim() || '..........................................................';

  const sigCheckerTitleVal = document.getElementById('sigCheckerTitle')?.value.trim() || 'ผู้ตรวจสอบ';
  const sigCheckerNameVal = document.getElementById('sigCheckerName')?.value.trim() || '..........................................................';
  const sigCheckerPosVal = document.getElementById('sigCheckerPos')?.value.trim() || '..........................................................';

  const sigApproverTitleVal = document.getElementById('sigApproverTitle')?.value.trim() || 'ผู้อนุมัติ';
  const sigApproverNameVal = document.getElementById('sigApproverName')?.value.trim() || '..........................................................';
  const sigApproverPosVal = document.getElementById('sigApproverPos')?.value.trim() || '..........................................................';

  const personnelRegistry = JSON.parse(localStorage.getItem('tp_personnel')) || [];
  const sortedList = [...waterEmployees].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'th'));

  const classifyWaterItem = (item) => {
    const pos = (item.position || '').trim();
    const duty = (item.duty || '').trim();
    const regPerson = personnelRegistry.find(p => p.name === item.name);
    const regDuty = (regPerson?.duty || '').trim();

    if (
      duty.includes('หัวหน้าโซน') ||
      duty.includes('ชนจ') ||
      pos.includes('ชนจ') ||
      regDuty.includes('หัวหน้าโซน') ||
      regDuty.includes('ชนจ')
    ) {
      return 'supervisor';
    }
    if (pos.includes('เหมา')) {
      return 'contractor';
    }
    if (pos === 'พนักงาน' || pos === 'ลูกจ้างประจำ' || pos === 'หน.ปณ.') {
      return 'staff';
    }
    return 'worker';
  };

  const categoryDefs = [
    {
      key: 'staff',
      sheetName: '1.พนง-ลูกจ้างประจำ',
      sectionTitle: '1. พนักงาน และ ลูกจ้างประจำ',
      reportTitle: 'หลักฐานการจ่ายเงินค่าน้ำดื่ม (พนักงาน และ ลูกจ้างประจำ)',
      headerFill: '1E3A8A',
      subHeaderFill: 'DBEAFE',
      subHeaderFont: '1E3A8A'
    },
    {
      key: 'worker',
      sheetName: '2.ลูกจ้าง',
      sectionTitle: '2. ลูกจ้างรายวัน และ ลูกจ้างชั่วคราว',
      reportTitle: 'หลักฐานการจ่ายเงินค่าน้ำดื่ม (ลูกจ้าง)',
      headerFill: '0F766E',
      subHeaderFill: 'CCFBF1',
      subHeaderFont: '0F766E'
    },
    {
      key: 'contractor',
      sheetName: '3.ลูกจ้างเหมา',
      sectionTitle: '3. ลูกจ้างเหมาบริการนำจ่าย',
      reportTitle: 'หลักฐานการจ่ายเงินค่าน้ำดื่ม (ลูกจ้างเหมา)',
      headerFill: 'B45309',
      subHeaderFill: 'FEF3C7',
      subHeaderFont: '92400E'
    },
    {
      key: 'supervisor',
      sheetName: '4.ชนจ.',
      sectionTitle: '4. หัวหน้าโซนนำจ่าย (ชนจ.)',
      reportTitle: 'หลักฐานการจ่ายเงินค่าน้ำดื่ม (หัวหน้าโซนนำจ่าย / ชนจ.)',
      headerFill: '3730A3',
      subHeaderFill: 'E0E7FF',
      subHeaderFont: '312E81'
    }
  ];

  const grouped = {
    staff: [],
    worker: [],
    contractor: [],
    supervisor: []
  };

  sortedList.forEach(item => {
    const cat = classifyWaterItem(item);
    grouped[cat].push(item);
  });

  const thinBorder = {
    top: { style: 'thin', color: { rgb: 'CBD5E1' } },
    bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
    left: { style: 'thin', color: { rgb: 'CBD5E1' } },
    right: { style: 'thin', color: { rgb: 'CBD5E1' } }
  };

  const mediumTotalBorder = {
    top: { style: 'medium', color: { rgb: '334155' } },
    bottom: { style: 'double', color: { rgb: '334155' } },
    left: { style: 'thin', color: { rgb: 'CBD5E1' } },
    right: { style: 'thin', color: { rgb: 'CBD5E1' } }
  };

  const tableHeaders = [
    'ลำดับ',
    'ชื่อ-นามสกุล',
    'ตำแหน่ง',
    'ปฏิบัติหน้าที่',
    'เงินเดือน (บาท)',
    'จำนวนวันทำงาน',
    'รวมค่าน้ำดื่ม (บาท)',
    'ภาษีหัก ณ ที่จ่าย (บาท)',
    'ยอดเงินจ่ายสุทธิ (บาท)',
    'ลายมือชื่อผู้รับเงิน',
    'หมายเหตุ'
  ];

  const colWidths = [
    { wch: 7 },  // ลำดับ
    { wch: 24 }, // ชื่อ-นามสกุล
    { wch: 15 }, // ตำแหน่ง
    { wch: 28 }, // ปฏิบัติหน้าที่
    { wch: 15 }, // เงินเดือน
    { wch: 14 }, // จำนวนวันทำงาน
    { wch: 18 }, // รวมค่าน้ำดื่ม
    { wch: 18 }, // ภาษีหัก ณ ที่จ่าย
    { wch: 18 }, // ยอดเงินจ่ายสุทธิ
    { wch: 16 }, // ลายมือชื่อ
    { wch: 26 }  // หมายเหตุ
  ];

  const computeRowMetrics = (item) => {
    const allowance = Math.round((item.workDays * (window.waterAllowancePerDay || 30)) * 100) / 100;
    const tax = calculateWaterTax(item.salary, allowance);
    const net = Math.round((allowance - tax) * 100) / 100;
    const remarkText = getResignRemarkForEmployee(item.name, year, month, item.remarks) || '';
    return { allowance, tax, net, remarkText };
  };

  const makeHeaderCell = (text, bgHex = '0284C7') => ({
    v: text,
    t: 's',
    s: {
      font: { name: 'Sarabun', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: bgHex } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: thinBorder
    }
  });

  const makeDataRowCells = (item, idx) => {
    const { allowance, tax, net, remarkText } = computeRowMetrics(item);
    const baseFont = { name: 'Sarabun', sz: 11, color: { rgb: '0F172A' } };
    const boldFont = { name: 'Sarabun', sz: 11, bold: true, color: { rgb: '0F172A' } };
    const netFont = { name: 'Sarabun', sz: 11, bold: true, color: { rgb: '0369A1' } };
    const rowFill = idx % 2 === 1 ? { fgColor: { rgb: 'F8FAFC' } } : { fgColor: { rgb: 'FFFFFF' } };

    return {
      metrics: { allowance, tax, net },
      cells: [
        { v: idx + 1, t: 'n', s: { font: baseFont, fill: rowFill, alignment: { horizontal: 'center', vertical: 'center' }, border: thinBorder } },
        { v: item.name || '', t: 's', s: { font: boldFont, fill: rowFill, alignment: { horizontal: 'left', vertical: 'center' }, border: thinBorder } },
        { v: item.position || '-', t: 's', s: { font: baseFont, fill: rowFill, alignment: { horizontal: 'center', vertical: 'center' }, border: thinBorder } },
        { v: item.duty || '-', t: 's', s: { font: baseFont, fill: rowFill, alignment: { horizontal: 'left', vertical: 'center' }, border: thinBorder } },
        { v: Number(item.salary || 0), t: 'n', z: '#,##0.00', s: { font: baseFont, fill: rowFill, alignment: { horizontal: 'right', vertical: 'center' }, border: thinBorder } },
        { v: Number(item.workDays || 0), t: 'n', z: '#,##0', s: { font: baseFont, fill: rowFill, alignment: { horizontal: 'center', vertical: 'center' }, border: thinBorder } },
        { v: allowance, t: 'n', z: '#,##0.00', s: { font: baseFont, fill: rowFill, alignment: { horizontal: 'right', vertical: 'center' }, border: thinBorder } },
        { v: tax, t: 'n', z: '#,##0.00', s: { font: baseFont, fill: rowFill, alignment: { horizontal: 'right', vertical: 'center' }, border: thinBorder } },
        { v: net, t: 'n', z: '#,##0.00', s: { font: netFont, fill: rowFill, alignment: { horizontal: 'right', vertical: 'center' }, border: thinBorder } },
        { v: item.signature || '', t: 's', s: { font: { name: 'Sarabun', sz: 10, italic: true, color: { rgb: '64748B' } }, fill: rowFill, alignment: { horizontal: 'center', vertical: 'center' }, border: thinBorder } },
        { v: remarkText, t: 's', s: { font: { name: 'Sarabun', sz: 10, color: { rgb: '334155' } }, fill: rowFill, alignment: { horizontal: 'left', vertical: 'center' }, border: thinBorder } }
      ]
    };
  };

  const makeTotalRowCells = (label, totals, fillHex = 'F1F5F9', fontHex = '0F172A') => {
    const totalStyle = {
      font: { name: 'Sarabun', sz: 11, bold: true, color: { rgb: fontHex } },
      fill: { fgColor: { rgb: fillHex } },
      alignment: { horizontal: 'right', vertical: 'center' },
      border: mediumTotalBorder
    };
    const centerTotalStyle = {
      ...totalStyle,
      alignment: { horizontal: 'center', vertical: 'center' }
    };
    const netTotalStyle = {
      ...totalStyle,
      font: { name: 'Sarabun', sz: 11, bold: true, color: { rgb: '0369A1' } }
    };

    return [
      { v: label, t: 's', s: centerTotalStyle },
      { v: '', t: 's', s: centerTotalStyle },
      { v: '', t: 's', s: centerTotalStyle },
      { v: '', t: 's', s: centerTotalStyle },
      { v: '', t: 's', s: centerTotalStyle },
      { v: Math.round(totals.days), t: 'n', z: '#,##0', s: centerTotalStyle },
      { v: Math.round(totals.allowance * 100) / 100, t: 'n', z: '#,##0.00', s: totalStyle },
      { v: Math.round(totals.tax * 100) / 100, t: 'n', z: '#,##0.00', s: totalStyle },
      { v: Math.round(totals.net * 100) / 100, t: 'n', z: '#,##0.00', s: netTotalStyle },
      { v: '', t: 's', s: centerTotalStyle },
      { v: '', t: 's', s: centerTotalStyle }
    ];
  };

  const appendSignatoryFooter = (rows, merges) => {
    rows.push([]);
    const sigStartRow = rows.length;
    const sigStyle = {
      font: { name: 'Sarabun', sz: 10, color: { rgb: '1E293B' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };
    const sigBoldStyle = {
      font: { name: 'Sarabun', sz: 10, bold: true, color: { rgb: '0F172A' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };

    const emptyRow = () => Array.from({ length: 11 }, () => ({ v: '', t: 's', s: sigStyle }));

    const r1 = emptyRow();
    r1[0] = { v: `ลงชื่อ .................................................... ${sigMakerTitleVal}`, t: 's', s: sigStyle };
    r1[4] = { v: `ลงชื่อ .................................................... ${sigCheckerTitleVal}`, t: 's', s: sigStyle };
    r1[8] = { v: `ลงชื่อ .................................................... ${sigApproverTitleVal}`, t: 's', s: sigStyle };

    const r2 = emptyRow();
    r2[0] = { v: `( ${sigMakerNameVal} )`, t: 's', s: sigBoldStyle };
    r2[4] = { v: `( ${sigCheckerNameVal} )`, t: 's', s: sigBoldStyle };
    r2[8] = { v: `( ${sigApproverNameVal} )`, t: 's', s: sigBoldStyle };

    const r3 = emptyRow();
    r3[0] = { v: `ตำแหน่ง ${sigMakerPosVal}`, t: 's', s: sigStyle };
    r3[4] = { v: `ตำแหน่ง ${sigCheckerPosVal}`, t: 's', s: sigStyle };
    r3[8] = { v: `ตำแหน่ง ${sigApproverPosVal}`, t: 's', s: sigStyle };

    rows.push(r1, r2, r3);

    for (let offset = 0; offset < 3; offset++) {
      const rIdx = sigStartRow + offset;
      merges.push(
        { s: { r: rIdx, c: 0 }, e: { r: rIdx, c: 3 } },
        { s: { r: rIdx, c: 4 }, e: { r: rIdx, c: 7 } },
        { s: { r: rIdx, c: 8 }, e: { r: rIdx, c: 10 } }
      );
    }
  };

  const wb = XLSX.utils.book_new();

  // ─────────────────────────────────────────────────────────
  // SHEET 1: รวมทั้งหมด (แยกตามหมวดหมู่ในหน้าเดียว)
  // ─────────────────────────────────────────────────────────
  const combinedRows = [];
  const combinedMerges = [];
  const combinedRowHeights = [];

  combinedRows.push([
    {
      v: `สรุปหลักฐานการจ่ายเงินค่าน้ำดื่ม (แยกตามกลุ่มปฏิบัติงาน) ประจำเดือน ${monthText} พ.ศ. ${yearText}`,
      t: 's',
      s: {
        font: { name: 'Sarabun', sz: 14, bold: true, color: { rgb: '0F172A' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    },
    ...Array.from({ length: 10 }, () => ({ v: '', t: 's' }))
  ]);
  combinedMerges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } });
  combinedRowHeights.push({ hpt: 28 });

  combinedRows.push([
    {
      v: `ที่ทำการไปรษณีย์ | อัตราค่าน้ำดื่มวันละ ${(window.waterAllowancePerDay || 30).toFixed(2)} บาท | รวมผู้เบิกทั้งสิ้น ${sortedList.length} รายการ`,
      t: 's',
      s: {
        font: { name: 'Sarabun', sz: 11, color: { rgb: '475569' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    },
    ...Array.from({ length: 10 }, () => ({ v: '', t: 's' }))
  ]);
  combinedMerges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 10 } });
  combinedRowHeights.push({ hpt: 20 });

  combinedRows.push([]);
  combinedRowHeights.push({ hpt: 10 });

  const grandTotals = { days: 0, allowance: 0, tax: 0, net: 0 };

  categoryDefs.forEach(catDef => {
    const items = grouped[catDef.key] || [];
    if (items.length === 0) return;

    const bannerRowIdx = combinedRows.length;
    combinedRows.push([
      {
        v: `📌 ${catDef.sectionTitle} (จำนวน ${items.length} ราย)`,
        t: 's',
        s: {
          font: { name: 'Sarabun', sz: 12, bold: true, color: { rgb: catDef.subHeaderFont } },
          fill: { fgColor: { rgb: catDef.subHeaderFill } },
          alignment: { horizontal: 'left', vertical: 'center' },
          border: thinBorder
        }
      },
      ...Array.from({ length: 10 }, () => ({
        v: '',
        t: 's',
        s: { fill: { fgColor: { rgb: catDef.subHeaderFill } }, border: thinBorder }
      }))
    ]);
    combinedMerges.push({ s: { r: bannerRowIdx, c: 0 }, e: { r: bannerRowIdx, c: 10 } });
    combinedRowHeights.push({ hpt: 24 });

    combinedRows.push(tableHeaders.map(h => makeHeaderCell(h, catDef.headerFill)));
    combinedRowHeights.push({ hpt: 26 });

    const subTotals = { days: 0, allowance: 0, tax: 0, net: 0 };

    items.forEach((item, idx) => {
      const { cells, metrics } = makeDataRowCells(item, idx);
      combinedRows.push(cells);
      combinedRowHeights.push({ hpt: 22 });

      subTotals.days += Number(item.workDays || 0);
      subTotals.allowance += metrics.allowance;
      subTotals.tax += metrics.tax;
      subTotals.net += metrics.net;
    });

    const subTotalRowIdx = combinedRows.length;
    combinedRows.push(makeTotalRowCells(`รวมเฉพาะกลุ่ม: ${catDef.sectionTitle} (${items.length} ราย)`, subTotals, catDef.subHeaderFill, catDef.subHeaderFont));
    combinedMerges.push({ s: { r: subTotalRowIdx, c: 0 }, e: { r: subTotalRowIdx, c: 4 } });
    combinedRowHeights.push({ hpt: 24 });

    combinedRows.push([]);
    combinedRowHeights.push({ hpt: 12 });

    grandTotals.days += subTotals.days;
    grandTotals.allowance += subTotals.allowance;
    grandTotals.tax += subTotals.tax;
    grandTotals.net += subTotals.net;
  });

  const grandTotalRowIdx = combinedRows.length;
  combinedRows.push(makeTotalRowCells(`รวมทั้งสิ้นทุกกลุ่ม (${sortedList.length} รายการ)`, grandTotals, 'FEF08A', '0F172A'));
  combinedMerges.push({ s: { r: grandTotalRowIdx, c: 0 }, e: { r: grandTotalRowIdx, c: 4 } });
  combinedRowHeights.push({ hpt: 26 });

  appendSignatoryFooter(combinedRows, combinedMerges);

  const combinedWs = XLSX.utils.aoa_to_sheet(combinedRows);
  combinedWs['!cols'] = colWidths;
  combinedWs['!merges'] = combinedMerges;
  combinedWs['!rows'] = combinedRowHeights;
  XLSX.utils.book_append_sheet(wb, combinedWs, 'รวมทั้งหมด (แยกกลุ่ม)');

  // ─────────────────────────────────────────────────────────
  // SHEETS 2..5: แยกแต่ละกลุ่มเป็น Sheet ของตัวเอง
  // ─────────────────────────────────────────────────────────
  categoryDefs.forEach(catDef => {
    const items = grouped[catDef.key] || [];
    const sheetRows = [];
    const sheetMerges = [];
    const sheetRowHeights = [];

    sheetRows.push([
      {
        v: `${catDef.reportTitle} ประจำเดือน ${monthText} พ.ศ. ${yearText}`,
        t: 's',
        s: {
          font: { name: 'Sarabun', sz: 14, bold: true, color: { rgb: catDef.subHeaderFont } },
          alignment: { horizontal: 'center', vertical: 'center' }
        }
      },
      ...Array.from({ length: 10 }, () => ({ v: '', t: 's' }))
    ]);
    sheetMerges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } });
    sheetRowHeights.push({ hpt: 28 });

    sheetRows.push([
      {
        v: `หมวดหมู่: ${catDef.sectionTitle} | จำนวน ${items.length} รายการ`,
        t: 's',
        s: {
          font: { name: 'Sarabun', sz: 11, color: { rgb: '475569' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        }
      },
      ...Array.from({ length: 10 }, () => ({ v: '', t: 's' }))
    ]);
    sheetMerges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 10 } });
    sheetRowHeights.push({ hpt: 20 });

    sheetRows.push([]);
    sheetRowHeights.push({ hpt: 10 });

    sheetRows.push(tableHeaders.map(h => makeHeaderCell(h, catDef.headerFill)));
    sheetRowHeights.push({ hpt: 26 });

    const subTotals = { days: 0, allowance: 0, tax: 0, net: 0 };

    if (items.length === 0) {
      const emptyRowIdx = sheetRows.length;
      sheetRows.push([
        {
          v: `ไม่มีรายการเบิกในหมวด "${catDef.sectionTitle}" สำหรับเดือนนี้`,
          t: 's',
          s: {
            font: { name: 'Sarabun', sz: 11, italic: true, color: { rgb: '64748B' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: thinBorder
          }
        },
        ...Array.from({ length: 10 }, () => ({ v: '', t: 's', s: { border: thinBorder } }))
      ]);
      sheetMerges.push({ s: { r: emptyRowIdx, c: 0 }, e: { r: emptyRowIdx, c: 10 } });
      sheetRowHeights.push({ hpt: 26 });
    } else {
      items.forEach((item, idx) => {
        const { cells, metrics } = makeDataRowCells(item, idx);
        sheetRows.push(cells);
        sheetRowHeights.push({ hpt: 22 });

        subTotals.days += Number(item.workDays || 0);
        subTotals.allowance += metrics.allowance;
        subTotals.tax += metrics.tax;
        subTotals.net += metrics.net;
      });
    }

    const totalRowIdx = sheetRows.length;
    sheetRows.push(makeTotalRowCells(`รวมทั้งสิ้น (${items.length} รายการ)`, subTotals, catDef.subHeaderFill, catDef.subHeaderFont));
    sheetMerges.push({ s: { r: totalRowIdx, c: 0 }, e: { r: totalRowIdx, c: 4 } });
    sheetRowHeights.push({ hpt: 25 });

    appendSignatoryFooter(sheetRows, sheetMerges);

    const ws = XLSX.utils.aoa_to_sheet(sheetRows);
    ws['!cols'] = colWidths;
    ws['!merges'] = sheetMerges;
    ws['!rows'] = sheetRowHeights;
    XLSX.utils.book_append_sheet(wb, ws, catDef.sheetName);
  });

  // ─────────────────────────────────────────────────────────
  // SHEET 6: 5.สรุปหักภาษี 50 ทวิ (เฉพาะผู้ที่ถูกหักภาษี > 0)
  // ─────────────────────────────────────────────────────────
  const taxRows = [];
  const taxMerges = [];
  const taxRowHeights = [];

  taxRows.push([
    {
      v: `สรุปรายชื่อผู้ถูกหักภาษี ณ ที่จ่าย (50 ทวิ - ค่าน้ำดื่ม) ประจำเดือน ${monthText} พ.ศ. ${yearText}`,
      t: 's',
      s: {
        font: { name: 'Sarabun', sz: 14, bold: true, color: { rgb: '991B1B' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    },
    ...Array.from({ length: 8 }, () => ({ v: '', t: 's' }))
  ]);
  taxMerges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } });
  taxRowHeights.push({ hpt: 28 });

  taxRows.push([]);
  taxRowHeights.push({ hpt: 10 });

  const taxHeaders = [
    'ลำดับ',
    'ชื่อ-นามสกุล',
    'เลขประจำตัวผู้เสียภาษี (13 หลัก)',
    'ที่อยู่ตามทะเบียน',
    'ตำแหน่ง',
    'เงินเดือน (บาท)',
    'รวมค่าน้ำดื่ม (บาท)',
    'ภาษีหัก ณ ที่จ่าย (บาท)',
    'ยอดรับสุทธิ (บาท)'
  ];
  taxRows.push(taxHeaders.map(h => makeHeaderCell(h, '991B1B')));
  taxRowHeights.push({ hpt: 26 });

  const taxedItems = sortedList.filter(item => {
    const { tax } = computeRowMetrics(item);
    return tax > 0;
  });

  let totalTaxAllowance = 0;
  let totalTaxWithheld = 0;
  let totalTaxNet = 0;

  if (taxedItems.length === 0) {
    const emptyIdx = taxRows.length;
    taxRows.push([
      {
        v: 'ไม่มีผู้ถูกหักภาษี ณ ที่จ่ายในเดือนนี้',
        t: 's',
        s: {
          font: { name: 'Sarabun', sz: 11, italic: true, color: { rgb: '64748B' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: thinBorder
        }
      },
      ...Array.from({ length: 8 }, () => ({ v: '', t: 's', s: { border: thinBorder } }))
    ]);
    taxMerges.push({ s: { r: emptyIdx, c: 0 }, e: { r: emptyIdx, c: 8 } });
    taxRowHeights.push({ hpt: 26 });
  } else {
    taxedItems.forEach((item, idx) => {
      const { allowance, tax, net } = computeRowMetrics(item);
      const regPerson = personnelRegistry.find(p => p.name === item.name);
      const taxId = regPerson?.taxId || '-';
      const address = regPerson?.address || '-';
      const baseFont = { name: 'Sarabun', sz: 11, color: { rgb: '0F172A' } };
      const boldFont = { name: 'Sarabun', sz: 11, bold: true, color: { rgb: '0F172A' } };
      const redBold = { name: 'Sarabun', sz: 11, bold: true, color: { rgb: 'DC2626' } };
      const rowFill = idx % 2 === 1 ? { fgColor: { rgb: 'FEF2F2' } } : { fgColor: { rgb: 'FFFFFF' } };

      totalTaxAllowance += allowance;
      totalTaxWithheld += tax;
      totalTaxNet += net;

      taxRows.push([
        { v: idx + 1, t: 'n', s: { font: baseFont, fill: rowFill, alignment: { horizontal: 'center', vertical: 'center' }, border: thinBorder } },
        { v: item.name || '', t: 's', s: { font: boldFont, fill: rowFill, alignment: { horizontal: 'left', vertical: 'center' }, border: thinBorder } },
        { v: taxId, t: 's', s: { font: baseFont, fill: rowFill, alignment: { horizontal: 'center', vertical: 'center' }, border: thinBorder } },
        { v: address, t: 's', s: { font: baseFont, fill: rowFill, alignment: { horizontal: 'left', vertical: 'center' }, border: thinBorder } },
        { v: item.position || '-', t: 's', s: { font: baseFont, fill: rowFill, alignment: { horizontal: 'center', vertical: 'center' }, border: thinBorder } },
        { v: Number(item.salary || 0), t: 'n', z: '#,##0.00', s: { font: baseFont, fill: rowFill, alignment: { horizontal: 'right', vertical: 'center' }, border: thinBorder } },
        { v: allowance, t: 'n', z: '#,##0.00', s: { font: baseFont, fill: rowFill, alignment: { horizontal: 'right', vertical: 'center' }, border: thinBorder } },
        { v: tax, t: 'n', z: '#,##0.00', s: { font: redBold, fill: rowFill, alignment: { horizontal: 'right', vertical: 'center' }, border: thinBorder } },
        { v: net, t: 'n', z: '#,##0.00', s: { font: boldFont, fill: rowFill, alignment: { horizontal: 'right', vertical: 'center' }, border: thinBorder } }
      ]);
      taxRowHeights.push({ hpt: 22 });
    });
  }

  const taxTotalIdx = taxRows.length;
  const taxTotalStyle = {
    font: { name: 'Sarabun', sz: 11, bold: true, color: { rgb: '991B1B' } },
    fill: { fgColor: { rgb: 'FEE2E2' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: mediumTotalBorder
  };
  const taxCenterTotalStyle = { ...taxTotalStyle, alignment: { horizontal: 'center', vertical: 'center' } };

  taxRows.push([
    { v: `รวมผู้ถูกหักภาษี (${taxedItems.length} ราย)`, t: 's', s: taxCenterTotalStyle },
    { v: '', t: 's', s: taxCenterTotalStyle },
    { v: '', t: 's', s: taxCenterTotalStyle },
    { v: '', t: 's', s: taxCenterTotalStyle },
    { v: '', t: 's', s: taxCenterTotalStyle },
    { v: '', t: 's', s: taxCenterTotalStyle },
    { v: Math.round(totalTaxAllowance * 100) / 100, t: 'n', z: '#,##0.00', s: taxTotalStyle },
    { v: Math.round(totalTaxWithheld * 100) / 100, t: 'n', z: '#,##0.00', s: taxTotalStyle },
    { v: Math.round(totalTaxNet * 100) / 100, t: 'n', z: '#,##0.00', s: taxTotalStyle }
  ]);
  taxMerges.push({ s: { r: taxTotalIdx, c: 0 }, e: { r: taxTotalIdx, c: 5 } });
  taxRowHeights.push({ hpt: 25 });

  const taxWs = XLSX.utils.aoa_to_sheet(taxRows);
  taxWs['!cols'] = [
    { wch: 7 },
    { wch: 24 },
    { wch: 22 },
    { wch: 36 },
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 }
  ];
  taxWs['!merges'] = taxMerges;
  taxWs['!rows'] = taxRowHeights;
  XLSX.utils.book_append_sheet(wb, taxWs, '5.สรุปหักภาษี 50 ทวิ');

  XLSX.writeFile(wb, `เบิกค่าน้ำดื่ม_${monthText}_${yearText}.xlsx`);
  window.showToast('ส่งออกไฟล์ Excel แยกหมวดหมู่ค่าน้ำดื่มสำเร็จ!', 'success');
}

export function printWaterReport() {
  const waterEmployees = getWaterEmployees();
  if (waterEmployees.length === 0) {
    window.showToast('ไม่มีข้อมูลที่จะพิมพ์!', 'warning');
    return;
  }

  waterEmployees.sort((a, b) => a.name.localeCompare(b.name, 'th'));

  const globalMonthSelect = document.getElementById('globalMonth');
  const globalYearSelect = document.getElementById('globalYear');
  const monthText = globalMonthSelect.options[globalMonthSelect.selectedIndex].text;
  const yearText = globalYearSelect.value;
  const month = parseInt(globalMonthSelect.value);
  const year = parseInt(globalYearSelect.value);
  const postOffice = document.getElementById('globalPostOfficeName')?.value.trim() || 'ไปรษณีย์ไทย';

  const sigMakerTitleVal = document.getElementById('sigMakerTitle').value.trim() || 'ผู้จัดทำ';
  const sigMakerNameVal = document.getElementById('sigMakerName').value.trim() || '..........................................................';
  const sigMakerPosVal = document.getElementById('sigMakerPos').value.trim() || '..........................................................';

  const sigCheckerTitleVal = document.getElementById('sigCheckerTitle').value.trim() || 'ผู้ตรวจสอบ';
  const sigCheckerNameVal = document.getElementById('sigCheckerName').value.trim() || '..........................................................';
  const sigCheckerPosVal = document.getElementById('sigCheckerPos').value.trim() || '..........................................................';

  const sigApproverTitleVal = document.getElementById('sigApproverTitle').value.trim() || 'ผู้อนุมัติ';
  const sigApproverNameVal = document.getElementById('sigApproverName').value.trim() || '..........................................................';
  const sigApproverPosVal = document.getElementById('sigApproverPos').value.trim() || '..........................................................';

  const personnelRegistry = JSON.parse(localStorage.getItem('tp_personnel')) || [];

  const classifyWaterItem = (item) => {
    const pos = (item.position || '').trim();
    const duty = (item.duty || '').trim();
    const regPerson = personnelRegistry.find(p => p.name === item.name);
    const regDuty = (regPerson?.duty || '').trim();

    if (
      duty.includes('หัวหน้าโซน') ||
      duty.includes('ชนจ') ||
      pos.includes('ชนจ') ||
      regDuty.includes('หัวหน้าโซน') ||
      regDuty.includes('ชนจ')
    ) {
      return 'supervisor';
    }
    if (pos.includes('เหมา')) {
      return 'contractor';
    }
    if (pos === 'พนักงาน' || pos === 'ลูกจ้างประจำ' || pos === 'หน.ปณ.') {
      return 'staff';
    }
    return 'worker';
  };

  const grouped = { staff: [], worker: [], contractor: [], supervisor: [] };
  waterEmployees.forEach(item => {
    grouped[classifyWaterItem(item)].push(item);
  });

  const calcGroupStats = (list) => {
    let days = 0;
    let allowance = 0;
    let tax = 0;
    let net = 0;
    list.forEach(item => {
      const a = item.workDays * (window.waterAllowancePerDay || 30);
      const t = calculateWaterTax(item.salary, a);
      const n = Math.round((a - t) * 100) / 100;
      days += Number(item.workDays || 0);
      allowance += a;
      tax += t;
      net += n;
    });
    return { count: list.length, days, allowance, tax, net };
  };

  const groupSummaryList = [
    { key: 'staff', title: '1. พนักงาน และ ลูกจ้างประจำ', list: grouped.staff, stats: calcGroupStats(grouped.staff) },
    { key: 'worker', title: '2. ลูกจ้างรายวัน และ ลูกจ้างชั่วคราว', list: grouped.worker, stats: calcGroupStats(grouped.worker) },
    { key: 'contractor', title: '3. ลูกจ้างเหมาบริการนำจ่าย', list: grouped.contractor, stats: calcGroupStats(grouped.contractor) },
    { key: 'supervisor', title: '4. หัวหน้าโซนนำจ่าย (ชนจ.)', list: grouped.supervisor, stats: calcGroupStats(grouped.supervisor) }
  ];

  const buildWaterPageHtml = (groupTitle, items) => {
    if (!items || items.length === 0) return '';
    let subAllowance = 0;
    let subTax = 0;
    let subNet = 0;

    const rowsHtml = items.map((item, index) => {
      const allowance = item.workDays * (window.waterAllowancePerDay || 30);
      const tax = calculateWaterTax(item.salary, allowance);
      const net = Math.round((allowance - tax) * 100) / 100;
      subAllowance += allowance;
      subTax += tax;
      subNet += net;

      return `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${item.name}</strong></td>
          <td>${item.position} / ${item.duty || '-'}</td>
          <td>${item.workDays} วัน</td>
          <td>${allowance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td>${tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td><strong>${net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
          <td><span style="font-family: 'Sarabun', sans-serif; font-style: italic; font-size: 9pt; color: #f7f4f4; font-weight: 300;">${item.signature}</span></td>
          <td><span style="font-size: 8pt; color: #444;">${getResignRemarkForEmployee(item.name, year, month, item.remarks)}</span></td>
        </tr>
      `;
    }).join('');

    return `
      <div class="print-page">
        <div class="print-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px double #000 !important; padding-bottom: 0.15rem !important; margin-bottom: 0.25rem !important;">
          <div style="width: 80px;"></div>
          <div class="print-title-container" style="flex-grow: 1; text-align: center;">
            <h2 style="font-size: 10.5pt !important; font-weight: bold; margin: 0 0 0.15rem 0;">แบบฟอร์มการเบิกค่าน้ำดื่ม สำหรับผู้ปฏิบัติงานภายนอกที่ทำการ (${postOffice})</h2>
            <h3 style="font-size: 9pt !important; font-weight: bold; margin: 0 0 0.15rem 0;">กลุ่มงาน: ${groupTitle}</h3>
            <p style="font-size: 8pt; margin: 0 0 0.25rem 0;">ประจำเดือน ${monthText} พ.ศ. ${yearText}</p>
          </div>
          <div style="border: 1px dashed #888; width: 80px; height: 45px; display: flex; align-items: center; justify-content: center; font-size: 7.5pt; color: #555; border-radius: 4px; line-height: 1.1; text-align: center; background-color: #fafafa; font-weight: normal;">
            ตราประทับ<br>ปณ.
          </div>
        </div>
        <div class="print-meta-info" style="text-align: right; font-size: 6.8pt !important; color: #444; margin-bottom: 0.4rem;">
          <p style="margin: 0 0 0.05rem 0;">เดบิต: <strong>ค่าอาหารและเครื่องดื่ม CA POS 51-9925-01</strong></p>
          <p style="margin: 0 0 0.05rem 0;">เครดิต: <strong>เจ้าหนี้พนักงาน CA POS 21-9999-08</strong></p>
          <p style="margin: 0 0 0.05rem 0;">หักภาษี ณ ที่จ่าย: <strong>21-99-15-01</strong> (เงินเดือนเกิน 25,833 บ.)</p>
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
            ${rowsHtml}
          </tbody>
        </table>

        <div class="print-summary-section">
          <div class="summary-block">
            <p>จำนวนรายชื่อผู้เบิก (${groupTitle}): <strong>${items.length}</strong> ราย</p>
            <p>ค่าน้ำดื่มรวม: <strong>${subAllowance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> บาท</p>
            <p>ภาษีหัก ณ ที่จ่ายรวม: <strong>${subTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> บาท</p>
            <p class="final-sum">ยอดเงินจ่ายสุทธิรวม: <strong>${subNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> บาท</p>
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

  const buildWaterCoverSheetHtml = () => {
    let grandCount = 0;
    let grandDays = 0;
    let grandAllowance = 0;
    let grandTax = 0;
    let grandNet = 0;

    const rowsHtml = groupSummaryList.map((g, idx) => {
      grandCount += g.stats.count;
      grandDays += g.stats.days;
      grandAllowance += g.stats.allowance;
      grandTax += g.stats.tax;
      grandNet += g.stats.net;

      return `
        <tr>
          <td style="text-align: center !important;">${idx + 1}</td>
          <td style="text-align: left !important; padding-left: 8px !important; font-weight: bold;">${g.title.replace(/^\d+\.\s*/, '')}</td>
          <td style="text-align: center !important;">${g.stats.count} ราย</td>
          <td style="text-align: center !important;">${g.stats.days} วัน</td>
          <td style="text-align: right !important; padding-right: 6px !important;">${g.stats.allowance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right !important; padding-right: 6px !important;">${g.stats.tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right !important; padding-right: 6px !important; font-weight: bold;">${g.stats.net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="print-page">
        <div class="print-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px double #000 !important; padding-bottom: 0.25rem !important; margin-bottom: 0.5rem !important;">
          <div style="width: 80px;"></div>
          <div class="print-title-container" style="flex-grow: 1; text-align: center;">
            <h2 style="font-size: 11.5pt !important; font-weight: bold; margin: 0 0 0.15rem 0;">ใบปะหน้าสรุปยอดการเบิกจ่ายค่าน้ำดื่ม (แยกตามหมวดหมู่ปฏิบัติงาน)</h2>
            <h3 style="font-size: 9.5pt !important; font-weight: bold; margin: 0 0 0.15rem 0;">ประจำที่ทำการไปรษณีย์ ${postOffice}</h3>
            <p style="font-size: 8.5pt; margin: 0;">ประจำเดือน ${monthText} พ.ศ. ${yearText} | อัตราค่าน้ำดื่มวันละ ${(window.waterAllowancePerDay || 30).toFixed(2)} บาท</p>
          </div>
          <div style="border: 1px dashed #888; width: 80px; height: 45px; display: flex; align-items: center; justify-content: center; font-size: 7.5pt; color: #555; border-radius: 4px; line-height: 1.1; text-align: center; background-color: #fafafa; font-weight: normal;">
            ตราประทับ<br>ปณ.
          </div>
        </div>

        <table class="print-table" style="margin-top: 0.5rem; margin-bottom: 1.2rem;">
          <thead>
            <tr>
              <th style="width: 6%; padding: 6px !important;">ลำดับ</th>
              <th style="width: 30%; padding: 6px !important;">หมวดหมู่ / กลุ่มปฏิบัติงาน</th>
              <th style="width: 12%; padding: 6px !important;">จำนวนคน</th>
              <th style="width: 12%; padding: 6px !important;">รวมวันทำงาน</th>
              <th style="width: 14%; padding: 6px !important;">ค่าน้ำดื่มรวม (บาท)</th>
              <th style="width: 12%; padding: 6px !important;">ภาษีหัก ณ ที่จ่าย</th>
              <th style="width: 14%; padding: 6px !important;">จ่ายสุทธิ (บาท)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr style="background-color: #f1f5f9 !important; font-weight: bold;">
              <td colspan="2" style="text-align: center !important; padding: 6px !important;">รวมเบิกจ่ายทั้งสิ้นทุกหมวดหมู่</td>
              <td style="text-align: center !important; padding: 6px !important;">${grandCount} ราย</td>
              <td style="text-align: center !important; padding: 6px !important;">${grandDays} วัน</td>
              <td style="text-align: right !important; padding: 6px !important;">${grandAllowance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style="text-align: right !important; padding: 6px !important;">${grandTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style="text-align: right !important; padding: 6px !important; border-bottom: 3px double #000 !important;">${grandNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <div class="print-signatures" style="margin-top: 2cm !important;">
          <div class="sig-box">
            <p>ลงชื่อ..........................................................${sigMakerTitleVal}</p>
            <p style="margin-top: 0.5rem; font-weight: bold;">(${sigMakerNameVal})</p>
            <p>ตำแหน่ง ${sigMakerPosVal}</p>
          </div>
          <div class="sig-box">
            <p>ลงชื่อ..........................................................${sigCheckerTitleVal}</p>
            <p style="margin-top: 0.5rem; font-weight: bold;">(${sigCheckerNameVal})</p>
            <p>ตำแหน่ง ${sigCheckerPosVal}</p>
          </div>
          <div class="sig-box">
            <p>ลงชื่อ..........................................................${sigApproverTitleVal}</p>
            <p style="margin-top: 0.5rem; font-weight: bold;">(${sigApproverNameVal})</p>
            <p>ตำแหน่ง ${sigApproverPosVal}</p>
          </div>
        </div>
      </div>
    `;
  };

  let modal = document.getElementById('waterPrintSelectorModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'waterPrintSelectorModal';
    modal.className = 'modal-overlay';
    modal.style.zIndex = '4700';
    document.body.appendChild(modal);
  }

  const fmtBaht = (n) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  modal.innerHTML = `
    <div class="modal-content glass-modal animate-slide-in" style="max-width: 560px; width: 95%;">
      <div class="modal-header">
        <h3>🖨️ เลือกหมวดหมู่ที่ต้องการพิมพ์ (ค่าน้ำดื่ม)</h3>
        <button type="button" id="closeWaterPrintSelectorBtn" class="btn-close">&times;</button>
      </div>
      <div class="modal-body" style="padding: 1.25rem;">
        <p style="margin: 0 0 1rem 0; font-size: 0.85rem; color: var(--text-secondary);">
          เลือกรายการเอกสารค่าน้ำดื่มที่ต้องการสั่งพิมพ์สำหรับเดือน <strong>${monthText} พ.ศ. ${yearText}</strong>:
        </p>
        <div style="display: flex; flex-direction: column; gap: 0.6rem;">
          <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.7rem 0.9rem; border-radius: 10px; border: 1.5px solid #0284c7; background: rgba(2, 132, 199, 0.06); cursor: pointer;">
            <span style="display: flex; align-items: center; gap: 0.55rem; font-weight: 700; color: var(--text-primary); font-size: 0.9rem;">
              <input type="checkbox" class="water-print-opt" value="cover" checked style="width: 18px; height: 18px; cursor: pointer;" />
              📄 ใบปะหน้าสรุปยอดรวมทุกหมวดหมู่ (เสนอเซ็นอนุมัติ)
            </span>
            <span style="font-size: 0.78rem; font-weight: 700; color: #0284c7;">แนะนำ</span>
          </label>
          ${groupSummaryList.map(g => `
            <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0.9rem; border-radius: 10px; border: 1px solid var(--border-glass); background: rgba(255,255,255,0.02); cursor: ${g.stats.count > 0 ? 'pointer' : 'not-allowed'}; opacity: ${g.stats.count > 0 ? '1' : '0.5'};">
              <span style="display: flex; align-items: center; gap: 0.55rem; font-weight: 600; color: var(--text-primary); font-size: 0.88rem;">
                <input type="checkbox" class="water-print-opt" value="${g.key}" ${g.stats.count > 0 ? 'checked' : 'disabled'} style="width: 17px; height: 17px; cursor: pointer;" />
                ${g.title} (${g.stats.count} ราย)
              </span>
              <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-secondary);">${fmtBaht(g.stats.net)} ฿</span>
            </label>
          `).join('')}
          <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0.9rem; border-radius: 10px; border: 1px dashed var(--border-glass); background: rgba(0,0,0,0.01); cursor: pointer;">
            <span style="display: flex; align-items: center; gap: 0.55rem; font-weight: 600; color: var(--text-secondary); font-size: 0.85rem;">
              <input type="checkbox" class="water-print-opt" value="combined_all" style="width: 17px; height: 17px; cursor: pointer;" />
              📋 พิมพ์แบบรวมทุกคนในตารางเดียว (${waterEmployees.length} ราย)
            </span>
          </label>
        </div>
      </div>
      <div class="modal-footer" style="display: flex; justify-content: space-between; gap: 0.5rem;">
        <button type="button" id="cancelWaterPrintSelectorBtn" class="btn btn-secondary btn-small">ยกเลิก</button>
        <button type="button" id="confirmWaterPrintSelectorBtn" class="btn btn-primary btn-small" style="font-weight: 700; padding: 0.5rem 1.25rem;">
          🖨️ เปิดหน้าต่างพิมพ์รายงานที่เลือก
        </button>
      </div>
    </div>
  `;

  modal.classList.add('active');
  modal.querySelector('#closeWaterPrintSelectorBtn').onclick = () => modal.classList.remove('active');
  modal.querySelector('#cancelWaterPrintSelectorBtn').onclick = () => modal.classList.remove('active');
  modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };

  modal.querySelector('#confirmWaterPrintSelectorBtn').onclick = () => {
    const selectedKeys = new Set(
      Array.from(modal.querySelectorAll('.water-print-opt:checked')).map(cb => cb.value)
    );
    if (selectedKeys.size === 0) {
      window.showToast('กรุณาเลือกอย่างน้อย 1 รายการเพื่อพิมพ์!', 'warning');
      return;
    }
    modal.classList.remove('active');

    const pagesHtml = [];
    if (selectedKeys.has('cover')) {
      pagesHtml.push(buildWaterCoverSheetHtml());
    }
    groupSummaryList.forEach(g => {
      if (selectedKeys.has(g.key) && g.list.length > 0) {
        pagesHtml.push(buildWaterPageHtml(g.title.replace(/^\d+\.\s*/, ''), g.list));
      }
    });
    if (selectedKeys.has('combined_all')) {
      pagesHtml.push(buildWaterPageHtml('รวมเจ้าหน้าที่ปฏิบัติงานทั้งหมด', waterEmployees));
    }

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
            padding: 0 !important;
          }
          .print-page {
            padding: 0.5cm !important;
            page-break-after: always;
            box-sizing: border-box;
          }
          .print-page:last-child {
            page-break-after: avoid;
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
            border: 1px solid #000 !important;
            padding: 4px 3px !important;
            font-size: 8pt !important;
            line-height: 1.25 !important;
            color: black !important;
          }
          .print-table th {
            font-weight: bold !important;
            text-align: center !important;
            background-color: #f8f8f8 !important;
          }
          .print-table td {
            text-align: left;
            height: 14px !important;
            vertical-align: middle !important;
          }
          .print-table td:nth-child(2) {
            font-size: 8.5pt !important;
            font-weight: bold !important;
          }
          .print-table td:nth-child(8) {
            white-space: nowrap !important;
            font-size: 7.8pt !important;
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
            font-size: 7.5pt !important;
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
            font-size: 8pt !important;
          }
          .print-signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 1.5cm !important;
            page-break-inside: avoid;
          }
          .sig-box {
            text-align: center;
            width: 32%;
            font-size: 7.2pt !important;
            line-height: 1.3 !important;
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
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };
}

export async function clearWaterData() {
  window.showConfirm({
    title: 'ยืนยันล้างข้อมูลทั้งหมด',
    message: 'คุณต้องการล้างรายการพนักงานในตารางค่าน้ำดื่มปัจจุบันทั้งหมดใช่หรือไม่? (จะไม่กระทบประวัติรายชื่อในทะเบียนบุคลากรหลัก)',
    icon: '⚠️',
    okText: 'ล้างข้อมูลทั้งหมด',
    onConfirm: async () => {
      setWaterEmployees([]);
      renderWaterTable();
      saveWaterEmployees([]);
      window.showToast('ล้างตารางข้อมูลค่าน้ำดื่มเรียบร้อยแล้ว!', 'success');
    }
  });
}

function getResignRemarkForEmployee(name, year, month, existingRemark = '') {
  try {
    const registry = JSON.parse(localStorage.getItem('tp_personnel')) || [];
    const person = registry.find(p => p.name === name);
    if (person && person.status === 'resigned' && person.resignYear && person.resignMonth) {
      if (year === person.resignYear && month === person.resignMonth) {
        const resignStr = `ลาออก${person.resignDate ? 'วันที่ ' + person.resignDate : ''}`;
        const cleanExisting = (existingRemark || '').trim();
        if (cleanExisting && !cleanExisting.includes('ลาออก')) {
          return `${resignStr} | ${cleanExisting}`;
        }
        return resignStr;
      }
    }
  } catch (e) {
    console.error("Error reading resignation remark:", e);
  }
  return existingRemark || '';
}

function arabicToBahtText(number) {
  if (isNaN(number) || number === null) return "";
  const decimal = Math.round((number % 1) * 100);
  const integer = Math.floor(number);
  
  const thNumbers = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  const thPositions = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];
  
  function convertSection(num) {
    if (num === 0) return "";
    let res = "";
    const s = num.toString();
    const len = s.length;
    for (let i = 0; i < len; i++) {
      const digit = parseInt(s[i]);
      const pos = len - i - 1;
      if (digit !== 0) {
        if (pos === 1 && digit === 1) {
          res += "สิบ";
        } else if (pos === 1 && digit === 2) {
          res += "ยี่สิบ";
        } else if (pos === 0 && digit === 1 && len > 1) {
          res += "เอ็ด";
        } else {
          res += thNumbers[digit] + thPositions[pos];
        }
      }
    }
    return res;
  }

  let result = "";
  if (integer === 0) {
    result = "ศูนย์บาท";
  } else {
    const millionStr = integer.toString();
    if (millionStr.length > 6) {
      const milPart = parseInt(millionStr.substring(0, millionStr.length - 6));
      const restPart = parseInt(millionStr.substring(millionStr.length - 6));
      result += convertSection(milPart) + "ล้าน" + convertSection(restPart) + "บาท";
    } else {
      result += convertSection(integer) + "บาท";
    }
  }
  
  if (decimal === 0) {
    result += "ถ้วน";
  } else {
    result += convertSection(decimal) + "สตางค์";
  }
  return result;
}

export function print50Tawi(originalIdx) {
  window.print50Tawi = print50Tawi;
  const waterEmployees = getWaterEmployees();
  const employee = waterEmployees[originalIdx];
  if (!employee) return;

  const globalMonthSelect = document.getElementById('globalMonth');
  const globalYearSelect = document.getElementById('globalYear');
  const monthText = globalMonthSelect ? globalMonthSelect.options[globalMonthSelect.selectedIndex].text : '';
  const yearText = globalYearSelect ? globalYearSelect.value : '';

  const configs = JSON.parse(localStorage.getItem('tp_global_configs')) || {};
  const poName = configs.postOfficeName || "ไปรษณีย์ไทย";
  const poTaxId = configs.postOfficeTaxId || "";
  const poBranch = configs.postOfficeBranch || "00000";
  const poAddress = configs.postOfficeAddress || "";

  const registry = JSON.parse(localStorage.getItem('tp_personnel')) || [];
  const person = registry.find(p => p.name.trim().replace(/\s+/g, ' ') === employee.name.trim().replace(/\s+/g, ' '));
  const empTaxId = person ? (person.taxId || "") : "";
  const empBranch = person ? (person.branch || "00000") : "00000";
  const empAddress = person ? (person.address || "") : "";

  const allowance = employee.workDays * (window.waterAllowancePerDay || 30);
  const tax = calculateWaterTax(employee.salary, allowance);

  const sortedWaterEmployees = [...waterEmployees].sort((a, b) => a.name.localeCompare(b.name, 'th'));
  const taxEmployees = sortedWaterEmployees.filter(item => {
    const itemAllowance = item.workDays * (window.waterAllowancePerDay || 30);
    const itemTax = calculateWaterTax(item.salary, itemAllowance);
    return itemTax > 0;
  });
  const taxIndex = taxEmployees.findIndex(emp => emp.name === employee.name);
  const sequenceNo = taxIndex !== -1 ? (taxIndex + 1) : 1;

  const formatTaxIdBoxes = (taxIdStr) => {
    const clean = (taxIdStr || '').replace(/\D/g, '').padEnd(13, ' ');
    return clean.split('').map(char => `<span class="tax-box">${char === ' ' ? '&nbsp;' : char}</span>`).join('');
  };

  const formatBranchBoxes = (branchStr) => {
    const clean = (branchStr || '').replace(/\D/g, '').padEnd(5, '0');
    return clean.split('').map(char => `<span class="tax-box">${char === ' ' ? '0' : char}</span>`).join('');
  };

  const today = new Date();
  const thDate = `${today.getDate()} ${globalMonthSelect ? globalMonthSelect.options[today.getMonth() + 1].text : ''} ${today.getFullYear() + 543}`;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <title>หนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ) - ${employee.name}</title>
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet">
      <style>
        * {
          box-sizing: border-box;
        }
        body {
          font-family: 'Sarabun', sans-serif;
          margin: 0;
          padding: 15px;
          background: #f0f0f0;
          color: #000;
          font-size: 8pt;
          line-height: 1.25;
        }
        .page-container {
          width: 210mm;
          min-height: 297mm;
          padding: 10mm;
          margin: 0 auto;
          background: #fff;
          border: 1px solid #ddd;
          box-shadow: 0 4px 10px rgba(0,0,0,0.15);
          position: relative;
        }
        .no-print-header {
          background: #333;
          color: #fff;
          padding: 10px 20px;
          margin: -15px -15px 15px -15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-radius: 4px 4px 0 0;
        }
        .no-print-header button {
          background: var(--post-orange, #f97316);
          color: white;
          border: none;
          padding: 6px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          font-size: 10pt;
        }
        .no-print-header button:hover {
          opacity: 0.9;
        }
        
        .main-border-box {
          border: 1.5px solid #000;
          padding: 6px;
          position: relative;
        }
        
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 5px;
        }
        .header-left {
          font-size: 7.5pt;
          line-height: 1.2;
        }
        .header-center {
          text-align: center;
          flex-grow: 1;
        }
        .header-center h1 {
          font-size: 11pt;
          font-weight: bold;
          margin: 0 0 3px 0;
        }
        .header-center p {
          font-size: 8pt;
          margin: 0;
        }
        .header-right {
          font-size: 7.5pt;
          text-align: right;
        }

        .party-box {
          border: 1px solid #000;
          margin-bottom: 5px;
          padding: 4px 6px;
        }
        .party-title {
          font-weight: bold;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 0.5px dashed #000;
          padding-bottom: 3px;
          margin-bottom: 4px;
        }
        .party-detail {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .tax-id-line {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .tax-box {
          display: inline-block;
          border: 1px solid #000;
          width: 14px;
          height: 17px;
          text-align: center;
          line-height: 15px;
          font-weight: bold;
          font-size: 8.5pt;
          background: #fff;
        }

        .seq-form-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px;
          font-size: 8pt;
        }
        .seq-form-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        
        .main-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 5px;
        }
        .main-table th, .main-table td {
          border: 1px solid #000;
          padding: 4px;
          font-size: 7.8pt;
        }
        .main-table th {
          text-align: center;
          background: #f2f2f2;
          font-weight: bold;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        
        .total-words-box {
          border: 1px solid #000;
          padding: 6px;
          margin-bottom: 5px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: bold;
          background: #fafafa;
        }

        .fund-row {
          border: 1px solid #000;
          padding: 4px 6px;
          margin-bottom: 5px;
          display: flex;
          justify-content: space-between;
          font-size: 7.5pt;
        }

        .footer-signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 5px;
        }
        .footer-box-left {
          border: 1px solid #000;
          padding: 6px;
          font-size: 7.5pt;
          line-height: 1.3;
        }
        .footer-box-right {
          border: 1px solid #000;
          padding: 6px;
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 110px;
        }

        .editable-field {
          background: rgba(254, 243, 199, 0.4);
          border-bottom: 1px dashed #b45309;
          padding: 1px 3px;
          cursor: text;
          outline: none;
        }
        .editable-field:focus {
          background: rgba(254, 243, 199, 0.8);
          border-bottom: 1.5px solid #b45309;
        }

        @media print {
          body {
            background: #fff;
            padding: 0;
          }
          .page-container {
            border: none;
            box-shadow: none;
            padding: 0;
            margin: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .editable-field {
            background: transparent !important;
            border-bottom: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print-header no-print" style="display: flex; gap: 1rem; align-items: center; justify-content: space-between; flex-wrap: wrap;">
        <div style="display: flex; gap: 1.5rem; align-items: center; flex-wrap: wrap; flex-grow: 1;">
          <h2 style="margin: 0; font-size: 11pt;">📄 พิมพ์ใบ 50 ทวิ</h2>
          <div style="display: flex; gap: 0.4rem; align-items: center;">
            <label for="poTaxIdInput" style="font-size: 8.5pt; font-weight: bold; color: white;">เลขผู้เสียภาษี ปณ.:</label>
            <input type="text" id="poTaxIdInput" value="${poTaxId}" maxlength="13" style="padding: 4px 8px; font-size: 9pt; border-radius: 4px; border: 1px solid #ccc; width: 130px; text-align: center; color: black; font-family: monospace;" />
          </div>
          <div style="display: flex; gap: 0.4rem; align-items: center;">
            <label for="poBranchInput" style="font-size: 8.5pt; font-weight: bold; color: white;">สาขาที่:</label>
            <input type="text" id="poBranchInput" value="${poBranch}" maxlength="5" style="padding: 4px 8px; font-size: 9pt; border-radius: 4px; border: 1px solid #ccc; width: 70px; text-align: center; color: black; font-family: monospace;" />
          </div>
          <div style="display: flex; gap: 0.4rem; align-items: center; flex-grow: 1; max-width: 400px;">
            <label for="poAddressInput" style="font-size: 8.5pt; font-weight: bold; color: white;">ที่อยู่ ปณ.:</label>
            <input type="text" id="poAddressInput" value="${poAddress}" style="padding: 4px 8px; font-size: 9pt; border-radius: 4px; border: 1px solid #ccc; width: 100%; color: black;" />
          </div>
          <button id="savePoConfigBtn" style="background: var(--post-emerald); color: white; border: none; padding: 6px 12px; font-weight: bold; border-radius: 4px; cursor: pointer;">💾 บันทึกค่าเริ่มต้น</button>
        </div>
        <button onclick="window.print()" style="background: var(--post-orange); color: white; border: none; padding: 6px 16px; font-weight: bold; border-radius: 4px; cursor: pointer;">🖨️ สั่งพิมพ์ใบ 50 ทวิ</button>
      </div>

      <div class="page-container">
        <div class="main-border-box">
          
          <div class="header-section">
            <div class="header-left">
              <strong>ฉบับที่ 1</strong> (สำหรับผู้ถูกหักภาษี ณ ที่จ่าย ใช้แนบพร้อมกับแบบแสดงรายการภาษี)<br>
              <strong>ฉบับที่ 2</strong> (สำหรับผู้ถูกหักภาษี ณ ที่จ่าย เก็บไว้เป็นหลักฐาน)
            </div>
            <div class="header-center">
              <h1>หนังสือรับรองการหักภาษี ณ ที่จ่าย</h1>
              <p>ตามมาตรา 50 ทวิ แห่งประมวลรัษฎากร</p>
            </div>
            <div class="header-right">
              เล่มที่ <span class="editable-field" contenteditable="true">${yearText}</span><br>
              เลขที่ <span class="editable-field" contenteditable="true">${sequenceNo.toString().padStart(2, '0')}</span>
            </div>
          </div>

          <!-- Party 1: Withholder -->
          <div class="party-box">
            <div class="party-title">
              <span>ผู้มีหน้าที่หักภาษี ณ ที่จ่าย :</span>
              <div class="tax-id-line">
                <span>เลขประจำตัวผู้เสียภาษีอากร (13 หลัก)* :</span>
                <span id="poTaxIdContainer" style="display: inline-flex;">${formatTaxIdBoxes(poTaxId)}</span>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <span>สาขาที่ :</span>
                <span id="poBranchContainer" style="display: inline-flex;">${formatBranchBoxes(poBranch)}</span>
              </div>
            </div>
            <div class="party-detail">
              <div>ชื่อหน่วยงาน: <span class="editable-field" contenteditable="true">บริษัท ไปรษณีย์ไทย จำกัด</span></div>
              <div>ที่อยู่: <span id="poAddressSpan" class="editable-field" contenteditable="true">${poAddress || '.........................................................................................................'}</span></div>
            </div>
          </div>

          <!-- Party 2: Payee -->
          <div class="party-box">
            <div class="party-title">
              <span>ผู้ถูกหักภาษี ณ ที่จ่าย :</span>
              <div class="tax-id-line">
                <span>เลขประจำตัวผู้เสียภาษีอากร (13 หลัก)* :</span>
                <span id="empTaxIdContainer" style="display: inline-flex;">${formatTaxIdBoxes(empTaxId)}</span>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <span>สาขาที่ :</span>
                <span id="empBranchContainer" style="display: inline-flex;">${formatBranchBoxes(empBranch)}</span>
              </div>
            </div>
            <div class="party-detail">
              <div>ชื่อ-นามสกุล: <span class="editable-field" contenteditable="true">${employee.name}</span></div>
              <div>ที่อยู่: <span class="editable-field" contenteditable="true">${empAddress || '.........................................................................................................'}</span></div>
            </div>
          </div>

          <!-- Seq Section -->
          <div class="seq-form-row">
            <div class="seq-form-left">
              <span>ลำดับที่ <span class="editable-field" contenteditable="true">${sequenceNo}</span> ในแบบ</span>
              <span>[✓] (1) ภ.ง.ด.1ก</span>
              <span>[ ] (2) ภ.ง.ด.1ก พิเศษ</span>
              <span>[ ] (3) ภ.ง.ด.3</span>
            </div>
          </div>

          <!-- Main Table -->
          <table class="main-table">
            <thead>
              <tr>
                <th style="width: 50%">ประเภทเงินได้พึงประเมินที่จ่าย</th>
                <th style="width: 18%">วัน เดือน หรือปี ที่จ่าย</th>
                <th style="width: 16%">จำนวนเงินที่จ่าย</th>
                <th style="width: 16%">ภาษีที่หักและนำส่งไว้</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>1. เงินเดือน ค่าจ้าง เบี้ยเลี้ยง โบนัส ฯลฯ ตามมาตรา 40 (1)</strong> (สวัสดิการค่าน้ำดื่ม)</td>
                <td class="text-center"><span class="editable-field" contenteditable="true">สิ้นเดือน ${monthText} ${yearText}</span></td>
                <td class="text-right"><span class="editable-field" contenteditable="true">${allowance.toFixed(2)}</span></td>
                <td class="text-right"><strong><span class="editable-field" contenteditable="true">${tax.toFixed(2)}</span></strong></td>
              </tr>
              <tr>
                <td>2. ค่าธรรมเนียม ค่านายหน้า ฯลฯ ตามมาตรา 40 (2)</td>
                <td class="text-center"><span class="editable-field" contenteditable="true"></span></td>
                <td class="text-right"><span class="editable-field" contenteditable="true"></span></td>
                <td class="text-right"><span class="editable-field" contenteditable="true"></span></td>
              </tr>
              <tr>
                <td>3. ค่าแห่งลิขสิทธิ์ ฯลฯ ตามมาตรา 40 (3)</td>
                <td class="text-center"><span class="editable-field" contenteditable="true"></span></td>
                <td class="text-right"><span class="editable-field" contenteditable="true"></span></td>
                <td class="text-right"><span class="editable-field" contenteditable="true"></span></td>
              </tr>
              <tr>
                <td>4. ดอกเบี้ย เงินปันผล ฯลฯ ตามมาตรา 40 (4)</td>
                <td class="text-center"><span class="editable-field" contenteditable="true"></span></td>
                <td class="text-right"><span class="editable-field" contenteditable="true"></span></td>
                <td class="text-right"><span class="editable-field" contenteditable="true"></span></td>
              </tr>
              <tr>
                <td>5. การจ่ายเงินได้ที่ต้องหักภาษี ณ ที่จ่ายตามมาตรา 3 เตรส (ค่าจ้างทำของ/บริการ ฯลฯ)</td>
                <td class="text-center"><span class="editable-field" contenteditable="true"></span></td>
                <td class="text-right"><span class="editable-field" contenteditable="true"></span></td>
                <td class="text-right"><span class="editable-field" contenteditable="true"></span></td>
              </tr>
              <tr>
                <td>6. อื่นๆ (ระบุ) ........................................................................................</td>
                <td class="text-center"><span class="editable-field" contenteditable="true"></span></td>
                <td class="text-right"><span class="editable-field" contenteditable="true"></span></td>
                <td class="text-right"><span class="editable-field" contenteditable="true"></span></td>
              </tr>
              <tr style="background: #fafafa; font-weight: bold;">
                <td class="text-right">รวมเงินที่จ่ายและภาษีที่หักนำส่ง</td>
                <td></td>
                <td class="text-right"><span class="editable-field" contenteditable="true">${allowance.toFixed(2)}</span></td>
                <td class="text-right"><span class="editable-field" contenteditable="true">${tax.toFixed(2)}</span></td>
              </tr>
            </tbody>
          </table>

          <!-- Word Box -->
          <div class="total-words-box">
            <span>รวมเงินภาษีที่หักนำส่ง (ตัวอักษร) :</span>
            <span class="editable-field" contenteditable="true">${arabicToBahtText(tax)}</span>
          </div>

          <!-- Fund info -->
          <div class="fund-row">
            <span>เงินที่นำส่งเข้า: กองทุนประกันสังคม <span class="editable-field" contenteditable="true">0.00</span> บาท</span>
            <span>กองทุนสำรองเลี้ยงชีพ <span class="editable-field" contenteditable="true">0.00</span> บาท</span>
          </div>

          <!-- Bottom sections -->
          <div class="footer-signatures">
            <div class="footer-box-left">
              <strong>คำเตือน:</strong> ผู้มีหน้าที่ออกหนังสือรับรองการหักภาษี ณ ที่จ่าย ฝ่าฝืนไม่ปฏิบัติตามมาตรา 50 ทวิ แห่งประมวลรัษฎากร ต้องรับโทษทางอาญาตามมาตรา 35 แห่งประมวลรัษฎากร
              <br><br>
              <strong>ผู้จ่ายเงิน:</strong> [✓] (1) หัก ณ ที่จ่าย &nbsp;&nbsp;&nbsp;&nbsp; [ ] (2) ออกให้ตลอดไป &nbsp;&nbsp;&nbsp;&nbsp; [ ] (3) ออกให้ครั้งเดียว
            </div>
            
            <div class="footer-box-right">
              <div>ขอรับรองว่าข้อความและตัวเลขดังกล่าวข้างต้น ถูกต้องตรงกับความจริงทุกประการ</div>
              <br>
              <div>ลงชื่อ ............................................................ ผู้จ่ายเงิน</div>
              <div>( <span class="editable-field" contenteditable="true">............................................................</span> )</div>
              <div>วันที่ออกเอกสาร: <span class="editable-field" contenteditable="true">............................................................</span></div>
            </div>
          </div>

        </div>
      </div>
      <script>
        const poTaxIdInput = document.getElementById('poTaxIdInput');
        const poBranchInput = document.getElementById('poBranchInput');
        const poAddressInput = document.getElementById('poAddressInput');
        const savePoConfigBtn = document.getElementById('savePoConfigBtn');

        function updateTaxIdBoxes(taxId) {
          const clean = (taxId || '').replace(/\D/g, '').padEnd(13, ' ');
          const boxes = clean.split('').map(char => '<span class="tax-box">' + (char === ' ' ? '&nbsp;' : char) + '</span>').join('');
          const container = document.getElementById('poTaxIdContainer');
          if (container) container.innerHTML = boxes;
        }

        function updateBranchBoxes(branch) {
          const clean = (branch || '').replace(/\D/g, '').padEnd(5, '0');
          const boxes = clean.split('').map(char => '<span class="tax-box">' + char + '</span>').join('');
          const container = document.getElementById('poBranchContainer');
          if (container) container.innerHTML = boxes;
        }

        if (poTaxIdInput) {
          poTaxIdInput.addEventListener('input', (e) => {
            updateTaxIdBoxes(e.target.value);
          });
        }

        if (poBranchInput) {
          poBranchInput.addEventListener('input', (e) => {
            updateBranchBoxes(e.target.value);
          });
        }

        if (poAddressInput) {
          poAddressInput.addEventListener('input', (e) => {
            const addressSpan = document.getElementById('poAddressSpan');
            if (addressSpan) addressSpan.textContent = e.target.value || '.........................................................................................................';
          });
        }

        if (savePoConfigBtn) {
          savePoConfigBtn.addEventListener('click', () => {
            const newTaxId = poTaxIdInput.value.trim();
            const newBranch = poBranchInput.value.trim();
            const newAddress = poAddressInput.value.trim();
            try {
              const parentConfigs = JSON.parse(window.opener.localStorage.getItem('tp_global_configs')) || {};
              parentConfigs.postOfficeTaxId = newTaxId;
              parentConfigs.postOfficeBranch = newBranch;
              parentConfigs.postOfficeAddress = newAddress;
              window.opener.localStorage.setItem('tp_global_configs', JSON.stringify(parentConfigs));
              if (window.opener.appConfigs) {
                window.opener.appConfigs.postOfficeTaxId = newTaxId;
                window.opener.appConfigs.postOfficeBranch = newBranch;
                window.opener.appConfigs.postOfficeAddress = newAddress;
              }
              alert('บันทึกข้อมูลผู้มีหน้าที่หักภาษีเป็นค่าเริ่มต้นสำเร็จเรียบร้อยแล้ว!');
            } catch (err) {
              console.error(err);
              alert('ไม่สามารถบันทึกข้อมูลย้อนกลับได้ กรุณาบันทึกผ่านทางหน้าตั้งค่าแอดมิน');
            }
          });
        }
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

export function printAll50Tawi() {
  const waterEmployees = getWaterEmployees();
  const globalMonthSelect = document.getElementById('globalMonth');
  const globalYearSelect = document.getElementById('globalYear');
  const monthText = globalMonthSelect ? globalMonthSelect.options[globalMonthSelect.selectedIndex].text : '';
  const yearText = globalYearSelect ? globalYearSelect.value : '';

  const configs = JSON.parse(localStorage.getItem('tp_global_configs')) || {};
  const poTaxId = configs.postOfficeTaxId || "";
  const poBranch = configs.postOfficeBranch || "00000";
  const poAddress = configs.postOfficeAddress || "";

  const sortedWaterEmployees = [...waterEmployees].sort((a, b) => a.name.localeCompare(b.name, 'th'));
  const taxEmployees = sortedWaterEmployees.filter(item => {
    const itemAllowance = item.workDays * (window.waterAllowancePerDay || 30);
    const itemTax = calculateWaterTax(item.salary, itemAllowance);
    return itemTax > 0;
  });

  if (taxEmployees.length === 0) {
    window.showToast('ไม่มีพนักงานที่มีภาษีต้องหักนำส่ง ณ ที่จ่ายในเดือนนี้', 'warning');
    return;
  }

  const formatTaxIdBoxes = (taxIdStr) => {
    const clean = (taxIdStr || '').replace(/\D/g, '').padEnd(13, ' ');
    return clean.split('').map(char => `<span class="tax-box">${char === ' ' ? '&nbsp;' : char}</span>`).join('');
  };

  const formatBranchBoxes = (branchStr) => {
    const clean = (branchStr || '').replace(/\D/g, '').padEnd(5, '0');
    return clean.split('').map(char => `<span class="tax-box">${char === ' ' ? '0' : char}</span>`).join('');
  };

  const today = new Date();
  const monthNames = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  const thDate = `${today.getDate()} ${monthNames[today.getMonth()]} ${today.getFullYear() + 543}`;

  const printWindow = window.open('', '_blank');
  
  const registry = JSON.parse(localStorage.getItem('tp_personnel')) || [];
  
  const pagesHtml = taxEmployees.map((employee, taxIdx) => {
    const sequenceNo = taxIdx + 1;
    const person = registry.find(p => p.name.trim().replace(/\s+/g, ' ') === employee.name.trim().replace(/\s+/g, ' '));
    const empTaxId = person ? (person.taxId || "") : "";
    const empBranch = person ? (person.branch || "00000") : "00000";
    const empAddress = person ? (person.address || "") : "";

    const allowance = employee.workDays * (window.waterAllowancePerDay || 30);
    const tax = calculateWaterTax(employee.salary, allowance);

    return `
      <div class="page-container">
        <div class="main-border-box">
          
          <div class="header-section">
            <div class="header-left">
              <strong>ฉบับที่ 1</strong> (สำหรับผู้ถูกหักภาษี ณ ที่จ่าย ใช้แนบพร้อมกับแบบแสดงรายการภาษี)<br>
              <strong>ฉบับที่ 2</strong> (สำหรับผู้ถูกหักภาษี ณ ที่จ่าย เก็บไว้เป็นหลักฐาน)
            </div>
            <div class="header-center">
              <h1>หนังสือรับรองการหักภาษี ณ ที่จ่าย</h1>
              <p>ตามมาตรา 50 ทวิ แห่งประมวลรัษฎากร</p>
            </div>
            <div class="header-right">
              เล่มที่ <span class="editable-field" contenteditable="true">${yearText}</span><br>
              เลขที่ <span class="editable-field" contenteditable="true">${sequenceNo.toString().padStart(2, '0')}</span>
            </div>
          </div>

          <!-- Party 1: Withholder -->
          <div class="party-box">
            <div class="party-title">
              <span>ผู้มีหน้าที่หักภาษี ณ ที่จ่าย :</span>
              <div class="tax-id-line">
                <span>เลขประจำตัวผู้เสียภาษีอากร (13 หลัก)* :</span>
                <span class="poTaxIdContainerClass" style="display: inline-flex;">${formatTaxIdBoxes(poTaxId)}</span>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <span>สาขาที่ :</span>
                <span class="poBranchContainerClass" style="display: inline-flex;">${formatBranchBoxes(poBranch)}</span>
              </div>
            </div>
            <div class="party-detail">
              <div>ชื่อหน่วยงาน: <span class="editable-field" contenteditable="true">บริษัท ไปรษณีย์ไทย จำกัด</span></div>
              <div>ที่อยู่: <span class="poAddressSpanClass editable-field" contenteditable="true">${poAddress || '.........................................................................................................'}</span></div>
            </div>
          </div>

          <!-- Party 2: Payee -->
          <div class="party-box">
            <div class="party-title">
              <span>ผู้ถูกหักภาษี ณ ที่จ่าย :</span>
              <div class="tax-id-line">
                <span>เลขประจำตัวผู้เสียภาษีอากร (13 หลัก)* :</span>
                <span style="display: inline-flex;">${formatTaxIdBoxes(empTaxId)}</span>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <span>สาขาที่ :</span>
                <span style="display: inline-flex;">${formatBranchBoxes(empBranch)}</span>
              </div>
            </div>
            <div class="party-detail">
              <div>ชื่อ-นามสกุล: <span class="editable-field" contenteditable="true">${employee.name}</span></div>
              <div>ที่อยู่: <span class="editable-field" contenteditable="true">${empAddress || '.........................................................................................................'}</span></div>
            </div>
          </div>

          <!-- Seq Section -->
          <div class="seq-form-row">
            <div class="seq-form-left">
              <span>ลำดับที่ <span class="editable-field" contenteditable="true">${sequenceNo}</span> ในแบบ</span>
              <span>[✓] (1) ภ.ง.ด.1ก</span>
              <span>[ ] (2) ภ.ง.ด.1ก พิเศษ</span>
              <span>[ ] (3) ภ.ง.ด.3</span>
            </div>
          </div>

          <!-- Main Table -->
          <table class="main-table">
            <thead>
              <tr>
                <th style="width: 50%">ประเภทเงินได้พึงประเมินที่จ่าย</th>
                <th style="width: 18%">วัน เดือน หรือปี ที่จ่าย</th>
                <th style="width: 16%">จำนวนเงินที่จ่าย</th>
                <th style="width: 16%">ภาษีที่หักและนำส่งไว้</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="line-height: 1.3;">
                  <strong>1. เงินเดือน ค่าจ้าง เบี้ยเลี้ยง โบนัส ฯลฯ ตามมาตรา 40 (1) (สวัสดิการค่าน้ำดื่ม)</strong>
                </td>
                <td class="text-center">
                  <span class="editable-field" contenteditable="true">สิ้นเดือน ${monthText} ${yearText}</span>
                </td>
                <td class="text-right">
                  <span class="editable-field" contenteditable="true">${allowance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </td>
                <td class="text-right" style="font-weight: bold;">
                  <span class="editable-field" contenteditable="true">${tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </td>
              </tr>
              <!-- Empty rows 2-6 -->
              ${Array(5).fill(0).map((_, i) => `
                <tr>
                  <td>${i + 2}. <span class="editable-field" contenteditable="true">........................................................................................</span></td>
                  <td class="text-center"><span class="editable-field" contenteditable="true">............................</span></td>
                  <td class="text-right"><span class="editable-field" contenteditable="true">................</span></td>
                  <td class="text-right"><span class="editable-field" contenteditable="true">................</span></td>
                </tr>
              `).join('')}
              
              <!-- Total row -->
              <tr style="font-weight: bold; background: #fafafa;">
                <td class="text-right">รวมเงินที่จ่ายและภาษีที่หักนำส่ง</td>
                <td class="text-center">-</td>
                <td class="text-right">
                  <span class="editable-field" contenteditable="true">${allowance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </td>
                <td class="text-right">
                  <span class="editable-field" contenteditable="true">${tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Total in words -->
          <div class="total-words-box">
            <span>รวมเงินภาษีที่หักนำส่ง (ตัวอักษร) :</span>
            <span class="editable-field" contenteditable="true">${arabicToBahtText(tax)}</span>
          </div>

          <!-- Fund info -->
          <div class="fund-row">
            <span>เงินที่นำส่งเข้า: กองทุนประกันสังคม <span class="editable-field" contenteditable="true">0.00</span> บาท</span>
            <span>กองทุนสำรองเลี้ยงชีพ <span class="editable-field" contenteditable="true">0.00</span> บาท</span>
          </div>

          <!-- Bottom sections -->
          <div class="footer-signatures">
            <div class="footer-box-left">
              <strong>คำเตือน:</strong> ผู้มีหน้าที่ออกหนังสือรับรองการหักภาษี ณ ที่จ่าย ฝ่าฝืนไม่ปฏิบัติตามมาตรา 50 ทวิ แห่งประมวลรัษฎากร ต้องรับโทษทางอาญาตามมาตรา 35 แห่งประมวลรัษฎากร
              <br><br>
              <strong>ผู้จ่ายเงิน:</strong> [✓] (1) หัก ณ ที่จ่าย &nbsp;&nbsp;&nbsp;&nbsp; [ ] (2) ออกให้ตลอดไป &nbsp;&nbsp;&nbsp;&nbsp; [ ] (3) ออกให้ครั้งเดียว
            </div>
            
            <div class="footer-box-right">
              <div>ขอรับรองว่าข้อความและตัวเลขดังกล่าวข้างต้น ถูกต้องตรงกับความจริงทุกประการ</div>
              <br>
              <div>ลงชื่อ ............................................................ ผู้จ่ายเงิน</div>
              <div>( <span class="editable-field" contenteditable="true">............................................................</span> )</div>
              <div>วันที่ออกเอกสาร: <span class="editable-field" contenteditable="true">............................................................</span></div>
            </div>
          </div>

        </div>
      </div>
    `;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <title>หนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ) - ทั้งหมด</title>
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet">
      <style>
        * {
          box-sizing: border-box;
        }
        body {
          font-family: 'Sarabun', sans-serif;
          margin: 0;
          padding: 15px;
          background: #f0f0f0;
          color: #000;
          font-size: 8pt;
          line-height: 1.25;
        }
        .page-container {
          width: 210mm;
          min-height: 297mm;
          padding: 10mm;
          margin: 20px auto;
          background: #fff;
          border: 1px solid #ddd;
          box-shadow: 0 4px 10px rgba(0,0,0,0.15);
          position: relative;
          page-break-after: always;
        }
        .no-print-header {
          background: #333;
          color: #fff;
          padding: 10px 20px;
          margin: -15px -15px 15px -15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-radius: 4px 4px 0 0;
        }
        .no-print-header button {
          background: var(--post-orange, #f97316);
          color: white;
          border: none;
          padding: 6px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          font-size: 10pt;
        }
        .no-print-header button:hover {
          opacity: 0.9;
        }
        
        .main-border-box {
          border: 1.5px solid #000;
          padding: 6px;
          position: relative;
        }
        
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 5px;
        }
        .header-left {
          font-size: 7.5pt;
          line-height: 1.2;
        }
        .header-center {
          text-align: center;
          flex-grow: 1;
        }
        .header-center h1 {
          font-size: 11pt;
          font-weight: bold;
          margin: 0 0 3px 0;
        }
        .header-center p {
          font-size: 8pt;
          margin: 0;
        }
        .header-right {
          font-size: 7.5pt;
          text-align: right;
        }

        .party-box {
          border: 1px solid #000;
          margin-bottom: 5px;
          padding: 4px 6px;
        }
        .party-title {
          font-weight: bold;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 0.5px dashed #000;
          padding-bottom: 3px;
          margin-bottom: 4px;
        }
        .party-detail {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .tax-id-line {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .tax-box {
          display: inline-block;
          border: 1px solid #000;
          width: 14px;
          height: 17px;
          text-align: center;
          line-height: 15px;
          font-weight: bold;
          font-size: 8.5pt;
          background: #fff;
        }

        .seq-form-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px;
          font-size: 8pt;
        }
        .seq-form-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        
        .main-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 5px;
        }
        .main-table th, .main-table td {
          border: 1px solid #000;
          padding: 4px;
          font-size: 7.8pt;
        }
        .main-table th {
          text-align: center;
          background: #f2f2f2;
          font-weight: bold;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        
        .total-words-box {
          border: 1px solid #000;
          padding: 6px;
          margin-bottom: 5px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: bold;
          background: #fafafa;
        }

        .fund-row {
          border: 1px solid #000;
          padding: 4px 6px;
          margin-bottom: 5px;
          display: flex;
          justify-content: space-between;
          font-size: 7.5pt;
        }

        .footer-signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 5px;
        }
        .footer-box-left {
          border: 1px solid #000;
          padding: 6px;
          font-size: 7.5pt;
          line-height: 1.3;
        }
        .footer-box-right {
          border: 1px solid #000;
          padding: 6px;
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 110px;
        }

        .editable-field {
          background: rgba(254, 243, 199, 0.4);
          border-bottom: 1px dashed #b45309;
          padding: 1px 3px;
          cursor: text;
          outline: none;
        }
        .editable-field:focus {
          background: rgba(254, 243, 199, 0.8);
          border-bottom: 1.5px solid #b45309;
        }

        @media print {
          body {
            background: #fff;
            padding: 0;
            margin: 0;
          }
          .page-container {
            border: none;
            box-shadow: none;
            padding: 0;
            margin: 0;
            width: 100%;
            min-height: auto;
            page-break-after: always;
          }
          .page-container:last-child {
            page-break-after: avoid;
          }
          .no-print {
            display: none !important;
          }
          .editable-field {
            background: transparent !important;
            border-bottom: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print-header no-print" style="display: flex; gap: 1rem; align-items: center; justify-content: space-between; flex-wrap: wrap;">
        <div style="display: flex; gap: 1.5rem; align-items: center; flex-wrap: wrap; flex-grow: 1;">
          <h2 style="margin: 0; font-size: 11pt; color: white;">📄 พิมพ์ใบ 50 ทวิ ทั้งหมด (${taxEmployees.length} รายการ)</h2>
          <div style="display: flex; gap: 0.4rem; align-items: center;">
            <label for="poTaxIdInput" style="font-size: 8.5pt; font-weight: bold; color: white;">เลขผู้เสียภาษี ปณ.:</label>
            <input type="text" id="poTaxIdInput" value="${poTaxId}" maxlength="13" style="padding: 4px 8px; font-size: 9pt; border-radius: 4px; border: 1px solid #ccc; width: 130px; text-align: center; color: black; font-family: monospace;" />
          </div>
          <div style="display: flex; gap: 0.4rem; align-items: center;">
            <label for="poBranchInput" style="font-size: 8.5pt; font-weight: bold; color: white;">สาขาที่:</label>
            <input type="text" id="poBranchInput" value="${poBranch}" maxlength="5" style="padding: 4px 8px; font-size: 9pt; border-radius: 4px; border: 1px solid #ccc; width: 70px; text-align: center; color: black; font-family: monospace;" />
          </div>
          <div style="display: flex; gap: 0.4rem; align-items: center; flex-grow: 1; max-width: 400px;">
            <label for="poAddressInput" style="font-size: 8.5pt; font-weight: bold; color: white;">ที่อยู่ ปณ.:</label>
            <input type="text" id="poAddressInput" value="${poAddress}" style="padding: 4px 8px; font-size: 9pt; border-radius: 4px; border: 1px solid #ccc; width: 100%; color: black;" />
          </div>
          <button id="savePoConfigBtn" style="background: var(--post-emerald); color: white; border: none; padding: 6px 12px; font-weight: bold; border-radius: 4px; cursor: pointer;">💾 บันทึกค่าเริ่มต้น</button>
        </div>
        <button onclick="window.print()" style="background: var(--post-orange); color: white; border: none; padding: 6px 16px; font-weight: bold; border-radius: 4px; cursor: pointer;">🖨️ สั่งพิมพ์ทั้งหมด</button>
      </div>

      ${pagesHtml}

      <script>
        const poTaxIdInput = document.getElementById('poTaxIdInput');
        const poBranchInput = document.getElementById('poBranchInput');
        const poAddressInput = document.getElementById('poAddressInput');
        const savePoConfigBtn = document.getElementById('savePoConfigBtn');

        function updateTaxIdBoxes(taxId) {
          const clean = (taxId || '').replace(/\\D/g, '').padEnd(13, ' ');
          const boxes = clean.split('').map(char => '<span class="tax-box">' + (char === ' ' ? '&nbsp;' : char) + '</span>').join('');
          const containers = document.querySelectorAll('.poTaxIdContainerClass');
          containers.forEach(container => {
            container.innerHTML = boxes;
          });
        }

        function updateBranchBoxes(branch) {
          const clean = (branch || '').replace(/\\D/g, '').padEnd(5, '0');
          const boxes = clean.split('').map(char => '<span class="tax-box">' + char + '</span>').join('');
          const containers = document.querySelectorAll('.poBranchContainerClass');
          containers.forEach(container => {
            container.innerHTML = boxes;
          });
        }

        if (poTaxIdInput) {
          poTaxIdInput.addEventListener('input', (e) => {
            updateTaxIdBoxes(e.target.value);
          });
        }

        if (poBranchInput) {
          poBranchInput.addEventListener('input', (e) => {
            updateBranchBoxes(e.target.value);
          });
        }

        if (poAddressInput) {
          poAddressInput.addEventListener('input', (e) => {
            const spans = document.querySelectorAll('.poAddressSpanClass');
            spans.forEach(span => {
              span.textContent = e.target.value || '.........................................................................................................';
            });
          });
        }

        if (savePoConfigBtn) {
          savePoConfigBtn.addEventListener('click', () => {
            const newTaxId = poTaxIdInput.value.trim();
            const newBranch = poBranchInput.value.trim();
            const newAddress = poAddressInput.value.trim();
            try {
              const parentConfigs = JSON.parse(window.opener.localStorage.getItem('tp_global_configs')) || {};
              parentConfigs.postOfficeTaxId = newTaxId;
              parentConfigs.postOfficeBranch = newBranch;
              parentConfigs.postOfficeAddress = newAddress;
              window.opener.localStorage.setItem('tp_global_configs', JSON.stringify(parentConfigs));
              if (window.opener.appConfigs) {
                window.opener.appConfigs.postOfficeTaxId = newTaxId;
                window.opener.appConfigs.postOfficeBranch = newBranch;
                window.opener.appConfigs.postOfficeAddress = newAddress;
              }
              alert('บันทึกข้อมูลผู้มีหน้าที่หักภาษีเป็นค่าเริ่มต้นสำเร็จเรียบร้อยแล้ว!');
            } catch (err) {
              console.error(err);
              alert('ไม่สามารถบันทึกข้อมูลย้อนกลับได้ กรุณาบันทึกผ่านทางหน้าตั้งค่าแอดมิน');
            }
          });
        }
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

window.printAll50Tawi = printAll50Tawi;
