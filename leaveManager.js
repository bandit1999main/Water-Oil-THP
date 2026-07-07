import { 
  fetchLeaveRequests, 
  saveLeaveRequest, 
  listenToLeaveRequests, 
  deleteLeaveRequest,
  fetchAttendanceList,
  saveAttendanceList
} from './database.js';

let leaveList = [];
let unsubscribeLeaveRequests = null;

export function getLeaveTemplate() {
  return `
    <div class="dashboard-grid">
      <!-- Left Panel: Leave Submission Form -->
      <div class="panel-column">
        <div class="glass-card full-width">
          <div class="card-header" style="margin-bottom: 1.25rem;">
            <span class="card-icon">📝</span>
            <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">บันทึกข้อมูลการลา</h3>
          </div>
          
          <form id="leaveRequestForm" autocomplete="off">
            <div class="form-group" style="margin-bottom: 1.25rem;">
              <label for="leaveEmpName" class="form-label">พิมพ์ค้นหาชื่อพนักงาน</label>
              <input type="text" id="leaveEmpName" class="form-input" list="leavePersonnelDatalist" placeholder="พิมพ์ชื่อพนักงานเพื่อค้นหา..." required />
              <datalist id="leavePersonnelDatalist"></datalist>
            </div>

            <div class="form-group" style="margin-bottom: 1.25rem;">
              <label for="leaveType" class="form-label">ประเภทการลา</label>
              <select id="leaveType" class="form-select" required>
                <option value="sick">🤒 ลาป่วย (ป)</option>
                <option value="personal">💼 ลากิจ (ก)</option>
                <option value="vacation">🏖️ ลาพักผ่อน (พ)</option>
              </select>
            </div>

            <div class="form-row-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
              <div class="form-group">
                <label for="leaveStartDate" class="form-label">วันที่เริ่มลา</label>
                <input type="date" id="leaveStartDate" class="form-input" required />
              </div>
              <div class="form-group">
                <label for="leaveEndDate" class="form-label">วันที่สิ้นสุด</label>
                <input type="date" id="leaveEndDate" class="form-input" required />
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 1.25rem;">
              <label for="leaveReason" class="form-label">เหตุผลการลา / หมายเหตุ</label>
              <input type="text" id="leaveReason" class="form-input" placeholder="เช่น เป็นไข้หวัด, ทำธุระต่างจังหวัด" />
            </div>

            <button type="submit" id="submitLeaveBtn" class="btn btn-primary btn-full" style="margin-top: 0.5rem;">
              ➕ ส่งคำขอลาทำงาน
            </button>
          </form>
        </div>
      </div>

      <!-- Right Panel: Leave Request Queue & History -->
      <div class="panel-column">
        <div id="leaveTableCard" class="glass-card full-width">
          <div class="card-header table-header-flex" style="margin-bottom: 1rem;">
            <div class="header-left">
              <span class="card-icon">📋</span>
              <h3>รายการขอลาและสถานะการอนุมัติ</h3>
            </div>
            <div class="header-actions-flex" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button type="button" id="printAllLeavesBtn" class="btn btn-secondary btn-small">
                🖨️ รายงานขอลาทั้งหมด
              </button>
              <button type="button" id="printApprovedLeavesBtn" class="btn btn-secondary btn-small" style="border: 1px solid var(--post-emerald); color: var(--post-emerald); background: rgba(16, 185, 129, 0.05);">
                🖨️ รายงานการอนุมัติลา
              </button>
            </div>
          </div>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 5%;">ที่</th>
                  <th style="width: 20%;">ชื่อพนักงาน</th>
                  <th style="width: 15%;">ประเภทการลา</th>
                  <th style="width: 20%;">ระยะเวลาการลา</th>
                  <th style="width: 10%; text-align: center;">จำนวนวัน</th>
                  <th style="width: 15%;">หมายเหตุ</th>
                  <th style="width: 15%;">สถานะ</th>
                  <th style="width: 10%;" class="actions-col">จัดการ</th>
                </tr>
              </thead>
              <tbody id="leaveTableBody">
                <tr>
                  <td colspan="8" class="no-data">กำลังโหลดข้อมูลรายการขอลา...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initLeaveManager() {
  const form = document.getElementById('leaveRequestForm');
  const employeeDatalist = document.getElementById('leavePersonnelDatalist');
  if (!form || !employeeDatalist) return;

  // Populate employee datalist for autocomplete
  const registry = JSON.parse(localStorage.getItem('tp_personnel')) || [];
  const activePersonnel = registry.filter(p => p.status !== 'resigned');
  activePersonnel.sort((a, b) => a.name.localeCompare(b.name, 'th'));
  
  employeeDatalist.innerHTML = '';
  activePersonnel.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.name;
    opt.textContent = p.position; // shows the position next to the name in browser autocomplete dropdown
    employeeDatalist.appendChild(opt);
  });

  // Handle Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('leaveEmpName').value.trim();
    const type = document.getElementById('leaveType').value;
    const start = document.getElementById('leaveStartDate').value;
    const end = document.getElementById('leaveEndDate').value;
    const reason = document.getElementById('leaveReason').value.trim();

    // Validate that the entered name exists in active personnel
    const exists = activePersonnel.some(p => p.name === name);
    if (!exists) {
      window.showToast('ไม่พบชื่อพนักงานคนนี้ในทะเบียนประวัติ กรุณาเลือกชื่อที่ถูกต้อง!', 'error');
      return;
    }

    if (new Date(start) > new Date(end)) {
      window.showToast('วันที่เริ่มต้นการลา ต้องไม่มากกว่าวันสิ้นสุด!', 'error');
      return;
    }

    window.showToast('กำลังส่งรายการขอลา...', 'info');
    const requestData = {
      name,
      leaveType: type,
      startDate: start,
      endDate: end,
      reason: reason || '-',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    const success = await saveLeaveRequest(requestData);
    if (success) {
      window.showToast('บันทึกคำขอลาสำเร็จ! รออนุมัติ', 'success');
      form.reset();
      renderLeaveTable();
    } else {
      window.showToast('บันทึกคำขอลาล้มเหลว!', 'error');
    }
  });

  // Bind print buttons
  const printAllBtn = document.getElementById('printAllLeavesBtn');
  const printAppBtn = document.getElementById('printApprovedLeavesBtn');
  if (printAllBtn) printAllBtn.addEventListener('click', printAllLeavesReport);
  if (printAppBtn) printAppBtn.addEventListener('click', printApprovedLeavesReport);

  // Listen to Firestore updates
  if (unsubscribeLeaveRequests) unsubscribeLeaveRequests();
  
  const callback = (updatedList) => {
    leaveList = updatedList;
    renderLeaveTable();
  };

  const unsub = listenToLeaveRequests(callback);
  if (unsub) {
    unsubscribeLeaveRequests = unsub;
  } else {
    // Offline mode: load once
    fetchLeaveRequests().then(callback);
  }
}

function renderLeaveTable() {
  const tableBody = document.getElementById('leaveTableBody');
  if (!tableBody) return;

  if (leaveList.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="no-data">ยังไม่มีประวัติหรือรายการขอลาในระบบ</td>
      </tr>
    `;
    return;
  }

  // Sort: pending first, then by createdAt desc
  const sorted = [...leaveList].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  tableBody.innerHTML = '';
  sorted.forEach((req, index) => {
    const start = new Date(req.startDate);
    const end = new Date(req.endDate);
    const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    // Formatting Dates for Display
    const formatDate = (dStr) => {
      const parts = dStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0]) + 543;
        return `${parts[2]}/${parts[1]}/${y}`;
      }
      return dStr;
    };

    let typeText = '';
    let typeClass = '';
    if (req.leaveType === 'sick') {
      typeText = '🤒 ลาป่วย (ป)';
      typeClass = 'status-sick';
    } else if (req.leaveType === 'personal') {
      typeText = '💼 ลากิจ (ก)';
      typeClass = 'status-personal';
    } else if (req.leaveType === 'vacation') {
      typeText = '🏖️ ลาพักผ่อน (พ)';
      typeClass = 'status-vacation';
    }

    let statusHtml = '';
    let actionButtonsHtml = '';

    if (req.status === 'pending') {
      statusHtml = `<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #d97706; font-weight: bold; border-radius: 4px; padding: 0.2rem 0.5rem;">⏳ รออนุมัติ</span>`;
      actionButtonsHtml = `
        <button class="btn btn-primary btn-small approve-btn" data-id="${req.id}" style="background: var(--post-emerald); border-color: var(--post-emerald); padding: 0.25rem 0.5rem; font-size: 0.75rem;">✔️ อนุมัติ</button>
        <button class="btn btn-danger btn-small reject-btn" data-id="${req.id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; margin-left: 0.2rem;">❌ ปฏิเสธ</button>
      `;
    } else if (req.status === 'approved') {
      statusHtml = `<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #059669; font-weight: bold; border-radius: 4px; padding: 0.2rem 0.5rem;">✔️ อนุมัติแล้ว</span>`;
      actionButtonsHtml = `
        <button class="btn btn-danger btn-small delete-leave-btn" data-id="${req.id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">🗑️ ลบ</button>
      `;
    } else {
      statusHtml = `<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #dc2626; font-weight: bold; border-radius: 4px; padding: 0.2rem 0.5rem;">❌ ปฏิเสธการลา</span>`;
      actionButtonsHtml = `
        <button class="btn btn-danger btn-small delete-leave-btn" data-id="${req.id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">🗑️ ลบ</button>
      `;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td><strong>${req.name}</strong></td>
      <td><span class="badge ${typeClass}" style="padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.8rem;">${typeText}</span></td>
      <td>${formatDate(req.startDate)} - ${formatDate(req.endDate)}</td>
      <td style="text-align: center; font-weight: bold;">${days} วัน</td>
      <td>${req.reason}</td>
      <td>${statusHtml}</td>
      <td class="actions-col" style="white-space: nowrap;">
        ${actionButtonsHtml}
      </td>
    `;

    // Bind event listeners to actions
    const approveBtn = tr.querySelector('.approve-btn');
    const rejectBtn = tr.querySelector('.reject-btn');
    const deleteBtn = tr.querySelector('.delete-leave-btn');

    if (approveBtn) {
      approveBtn.addEventListener('click', () => handleApproveLeave(req));
    }
    if (rejectBtn) {
      rejectBtn.addEventListener('click', () => handleUpdateStatus(req.id, 'rejected'));
    }
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => handleDeleteLeave(req.id));
    }

    tableBody.appendChild(tr);
  });
}

async function handleUpdateStatus(requestId, newStatus) {
  const req = leaveList.find(r => r.id === requestId);
  if (!req) return;
  
  window.showToast('กำลังปรับปรุงสถานะการลา...', 'info');
  req.status = newStatus;
  const success = await saveLeaveRequest(req);
  if (success) {
    window.showToast(`บันทึกการปรับปรุงเป็น: ${newStatus === 'rejected' ? 'ปฏิเสธคำขอ' : newStatus} สำเร็จ!`, 'success');
    renderLeaveTable();
  } else {
    window.showToast('ปรับปรุงสถานะล้มเหลว!', 'error');
  }
}

async function handleApproveLeave(req) {
  window.showToast('กำลังบันทึกการอนุมัติและซิงค์ข้อมูลลงตาราง...', 'info');
  
  // 1. Mark request as approved
  req.status = 'approved';
  req.approvedAt = new Date().toISOString();
  
  // 2. Synchronize date range into the attendance tables
  const syncSuccess = await syncLeaveToAttendance(req);
  if (!syncSuccess) {
    window.showToast('การซิงค์ตารางลงเวลาล้มเหลว!', 'error');
    return;
  }

  // 3. Save approved request
  const success = await saveLeaveRequest(req);
  if (success) {
    window.showToast('อนุมัติการลาและซิงค์ข้อมูลลงตารางลงเวลาเรียบร้อยแล้ว!', 'success');
    renderLeaveTable();
  } else {
    window.showToast('บันทึกสถานะการอนุมัติล้มเหลว!', 'error');
  }
}

async function handleDeleteLeave(requestId) {
  if (confirm('คุณต้องการลบประวัติการลานี้ใช่หรือไม่? (การลบจะไม่ไปแก้ไขตารางลงเวลาที่เคยบันทึกไว้แล้ว)')) {
    window.showToast('กำลังลบข้อมูลการลา...', 'info');
    const success = await deleteLeaveRequest(requestId);
    if (success) {
      window.showToast('ลบรายการสำเร็จ!', 'success');
      renderLeaveTable();
    } else {
      window.showToast('ลบรายการล้มเหลว!', 'error');
    }
  }
}

// Auto-sync function to write approved leave directly to target month's attendance list
async function syncLeaveToAttendance(req) {
  try {
    const start = new Date(req.startDate);
    const end = new Date(req.endDate);
    
    // Map leave type to code
    let leaveCode = '';
    if (req.leaveType === 'sick') leaveCode = 'ป';
    else if (req.leaveType === 'personal') leaveCode = 'ก';
    else if (req.leaveType === 'vacation') leaveCode = 'พ';

    // Loop through each day of the leave range
    const currentDate = new Date(start);
    
    // Group dates by Year-Month to perform batch operations
    const monthsToUpdate = {}; // Key: "YYYY_MM", Value: array of day numbers (1-31)
    
    while (currentDate <= end) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1; // 1-12
      const day = currentDate.getDate(); // 1-31
      
      // We convert CE year to BE year for collections e.g. 2026 -> 2569
      const beYear = year + 543;
      const key = `${beYear}_${month}`;
      
      if (!monthsToUpdate[key]) {
        monthsToUpdate[key] = {
          year: beYear,
          month: month,
          days: []
        };
      }
      monthsToUpdate[key].days.push(day);
      
      // Go to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Update attendance lists
    for (const key in monthsToUpdate) {
      const target = monthsToUpdate[key];
      const attendance = await fetchAttendanceList(target.year, target.month);
      
      // Find employee's attendance record
      let empRecord = attendance.find(a => a.name === req.name);
      
      if (!empRecord) {
        // Create initial record if it doesn't exist
        empRecord = {
          name: req.name,
          checkedDays: [],
          dayStatuses: {}
        };
        attendance.push(empRecord);
      }

      const checkedDaysSet = new Set(empRecord.checkedDays);
      if (!empRecord.dayStatuses) empRecord.dayStatuses = {};

      target.days.forEach(day => {
        // 1. Remove from checkedDays (since leave days are not worked days)
        checkedDaysSet.delete(day);
        
        // 2. Set code in dayStatuses
        empRecord.dayStatuses[String(day)] = leaveCode;
      });

      // Update checkedDays array back from Set
      empRecord.checkedDays = Array.from(checkedDaysSet).sort((a, b) => a - b);
      
      // Save updated attendance
      await saveAttendanceList(target.year, target.month, attendance);
    }
    
    return true;
  } catch (error) {
    console.error("❌ Failed to syncLeaveToAttendance:", error);
    return false;
  }
}

function printAllLeavesReport() {
  if (leaveList.length === 0) {
    window.showToast('ไม่มีข้อมูลการลาที่จะพิมพ์!', 'warning');
    return;
  }
  const sorted = [...leaveList].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  let tableRowsHtml = '';
  sorted.forEach((req, index) => {
    const start = new Date(req.startDate);
    const end = new Date(req.endDate);
    const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    const formatDate = (dStr) => {
      const parts = dStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0]) + 543;
        return `${parts[2]}/${parts[1]}/${y}`;
      }
      return dStr;
    };

    let typeText = req.leaveType === 'sick' ? 'ลาป่วย' : (req.leaveType === 'personal' ? 'ลากิจ' : 'ลาพักผ่อน');
    let statusText = req.status === 'pending' ? 'รออนุมัติ' : (req.status === 'approved' ? 'อนุมัติแล้ว' : 'ปฏิเสธ');
    
    tableRowsHtml += `
      <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td><strong>${req.name}</strong></td>
        <td style="text-align: center;">${typeText}</td>
        <td style="text-align: center;">${formatDate(req.startDate)} - ${formatDate(req.endDate)}</td>
        <td style="text-align: center; font-weight: bold;">${days} วัน</td>
        <td>${req.reason}</td>
        <td style="text-align: center; font-weight: bold;">${statusText}</td>
      </tr>
    `;
  });

  openPrintWindow("รายงานการขอลาทำงานของพนักงานทั้งหมด", tableRowsHtml, false);
}

function printApprovedLeavesReport() {
  const approvedList = leaveList.filter(r => r.status === 'approved');
  if (approvedList.length === 0) {
    window.showToast('ไม่มีข้อมูลการลาที่อนุมัติแล้วที่จะพิมพ์!', 'warning');
    return;
  }
  const sorted = [...approvedList].sort((a, b) => new Date(b.approvedAt || b.createdAt) - new Date(a.approvedAt || a.createdAt));

  let tableRowsHtml = '';
  sorted.forEach((req, index) => {
    const start = new Date(req.startDate);
    const end = new Date(req.endDate);
    const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    const formatDate = (dStr) => {
      const parts = dStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0]) + 543;
        return `${parts[2]}/${parts[1]}/${y}`;
      }
      return dStr;
    };

    let typeText = req.leaveType === 'sick' ? 'ลาป่วย' : (req.leaveType === 'personal' ? 'ลากิจ' : 'ลาพักผ่อน');
    
    let approvedDateStr = '-';
    if (req.approvedAt) {
      const d = new Date(req.approvedAt);
      const y = d.getFullYear() + 543;
      approvedDateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${y}`;
    }

    tableRowsHtml += `
      <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td><strong>${req.name}</strong></td>
        <td style="text-align: center;">${typeText}</td>
        <td style="text-align: center;">${formatDate(req.startDate)} - ${formatDate(req.endDate)}</td>
        <td style="text-align: center; font-weight: bold;">${days} วัน</td>
        <td>${req.reason}</td>
        <td style="text-align: center;">${approvedDateStr}</td>
      </tr>
    `;
  });

  openPrintWindow("รายงานการอนุมัติการลาทำงานของพนักงาน", tableRowsHtml, true);
}

function openPrintWindow(title, tableRowsHtml, isApprovedOnly) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  
  const today = new Date();
  const beYear = today.getFullYear() + 543;
  const printDateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${beYear}`;

  printWindow.document.write(\`
    <!DOCTYPE html>
    <html>
    <head>
      <title>\${title}</title>
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
          margin: 0.5cm;
        }
        .print-header {
          text-align: center;
          margin-bottom: 0.6cm;
          border-bottom: 2px solid #222;
          padding-bottom: 0.3cm;
        }
        .print-header h2 {
          margin: 0 0 5px 0;
          font-size: 14pt;
          font-weight: bold;
        }
        .print-header p {
          margin: 0;
          font-size: 10pt;
          color: #333;
        }
        .print-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 0.4cm;
        }
        .print-table th, 
        .print-table td {
          border: 1px solid #444444 !important;
          padding: 6px 8px !important;
          font-size: 9.5pt !important;
          line-height: 1.3 !important;
          color: black !important;
          vertical-align: middle !important;
        }
        .print-table th {
          font-weight: bold !important;
          text-align: center !important;
          background: #f2f2f2 !important;
        }
      </style>
    </head>
    <body>
      <div class="print-header">
        <h2>\${title}</h2>
        <p>ที่ทำการไปรษณีย์ไทย • ข้อมูลรายงาน ณ วันที่ \${printDateStr}</p>
      </div>
      
      <table class="print-table">
        <thead>
          <tr>
            <th style="width: 6%;">ที่</th>
            <th style="width: 24%;">ชื่อ - นามสกุล</th>
            <th style="width: 14%;">ประเภทการลา</th>
            <th style="width: 22%;">ระยะเวลาการลา</th>
            <th style="width: 10%;">จำนวนวัน</th>
            <th style="width: 14%;">สาเหตุ/เหตุผล</th>
            <th style="width: 10%;">\${isApprovedOnly ? 'วันที่อนุมัติ' : 'สถานะ'}</th>
          </tr>
        </thead>
        <tbody>
          \${tableRowsHtml}
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
  \`);
  printWindow.document.close();
}
