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
      </td>
    `;

    tr.querySelector('.edit-btn').addEventListener('click', () => editWaterEmployee(originalIdx));
    tr.querySelector('.delete-btn').addEventListener('click', () => deleteWaterEmployee(originalIdx));

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
        <td><span style="font-family: 'Sarabun', sans-serif; font-style: italic; font-size: 9pt; color: #e8e8e8; font-weight: 300;">${item.signature}</span></td>
        <td><span style="font-size: 8pt; color: #444;">${item.remarks}</span></td>
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
