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
      return totalAllowance * (b.rate || 0);
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

  // Sort water employees by name (Thai alphabetical order ก-ฮ)
  waterEmployees.sort((a, b) => a.name.localeCompare(b.name, 'th'));

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
    const net = allowance - tax;
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

  filtered.forEach(({ item, originalIdx }, index) => {
    const allowance = item.workDays * (window.waterAllowancePerDay || 30);
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

export function exportWaterCsv() {
  const waterEmployees = getWaterEmployees();
  if (waterEmployees.length === 0) {
    window.showToast('ไม่มีข้อมูลที่จะส่งออก!', 'warning');
    return;
  }
  let csvContent = "\uFEFF";
  csvContent += "ลำดับ,ชื่อ-นามสกุล,ปฏิบัติหน้าที่,เงินเดือน (บาท),จำนวนวันทำงาน,รวมค่าน้ำดื่ม (บาท),ภาษีหัก ณ ที่จ่าย (บาท),ยอดเงินจ่ายสุทธิ (บาท),ลายมือชื่อผู้รับเงิน,หมายเหตุ\n";
  
  waterEmployees.forEach((item, index) => {
    const allowance = item.workDays * (window.waterAllowancePerDay || 30);
    const tax = calculateWaterTax(item.salary, allowance);
    const net = allowance - tax;
    csvContent += `${index + 1},"${item.name}","${item.position} / ${item.duty || '-'}",${item.salary},${item.workDays},${allowance.toFixed(2)},${tax.toFixed(2)},${net.toFixed(2)},"${item.signature}","${item.remarks}"\n`;
  });
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  
  const globalMonthSelect = document.getElementById('globalMonth');
  const globalYearSelect = document.getElementById('globalYear');
  const m = globalMonthSelect.options[globalMonthSelect.selectedIndex].text;
  const y = globalYearSelect.value;
  link.setAttribute("download", `เบิกค่าน้ำดื่ม_${m}_${y}.csv`);
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
  
  let totalAllowanceVal = 0;
  let totalTaxVal = 0;
  let totalNetVal = 0;
  let tableRowsHtml = '';
  
  waterEmployees.forEach((item, index) => {
    const allowance = item.workDays * (window.waterAllowancePerDay || 30);
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
        <td><span style="font-family: 'Sarabun', sans-serif; font-style: italic; font-size: 9pt; color: #f7f4f4; font-weight: 300;">${item.signature}</span></td>
        <td><span style="font-size: 8pt; color: #444;">${getResignRemarkForEmployee(item.name, year, month, item.remarks)}</span></td>
      </tr>
    `;
  });
  
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
      <div class="print-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px double #000 !important; padding-bottom: 0.15rem !important; margin-bottom: 0.25rem !important;">
        <div style="width: 80px;"></div>
        <div class="print-title-container" style="flex-grow: 1; text-align: center;">
          <h2 style="font-size: 10.5pt !important; font-weight: bold; margin: 0 0 0.15rem 0;">แบบฟอร์มการเบิกค่าน้ำดื่ม สำหรับผู้ปฏิบัติงานภายนอกที่ทำการ</h2>
          <h3 style="font-size: 9pt !important; font-weight: bold; margin: 0 0 0.15rem 0;">บริษัท ไปรษณีย์ไทย จำกัด</h3>
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
  const person = registry.find(p => p.name === employee.name);
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
    const person = registry.find(p => p.name === employee.name);
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
