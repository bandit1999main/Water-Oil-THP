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
let currentViewMonth = new Date().getMonth() + 1;
let currentViewYear = new Date().getFullYear() + 543;
let editingRequestId = null;

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

        <!-- Leave Statistics Card -->
        <div class="glass-card full-width" style="margin-top: 1.5rem; padding: 1.25rem;">
          <div class="card-header" style="margin-bottom: 1rem;">
            <span class="card-icon">📊</span>
            <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary);">สถิติการอนุมัติวันลาในปีนี้ (พ.ศ. <span id="leaveStatsYear"></span>)</h3>
          </div>
          <div id="leaveStatsContainer" style="max-height: 250px; overflow-y: auto; font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.75rem;">
            <div style="text-align: center; color: var(--text-secondary); padding: 1rem 0;">ไม่มีข้อมูลประวัติการอนุมัติวันลาในปีนี้</div>
          </div>
        </div>
      </div>

      <!-- Right Panel: Leave Request Queue & History -->
      <div class="panel-column">
        <div id="leaveTableCard" class="glass-card full-width">
          <div class="card-header table-header-flex" style="margin-bottom: 1rem;">
            <div class="header-left" style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
              <span class="card-icon">📋</span>
              <h3 style="margin: 0;">รายการขอลาทำงาน</h3>
              <!-- Toggle View Button Tabs -->
              <div class="mode-selector-tabs" style="margin-left: 0.5rem; scale: 0.85; margin-right: 0; display: inline-flex;">
                <button type="button" id="viewLeaveListBtn" class="mode-tab-btn active" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;">📋 ตาราง</button>
                <button type="button" id="viewLeaveCalendarBtn" class="mode-tab-btn" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;">📅 ปฏิทิน</button>
              </div>
            </div>
            <div class="header-actions-flex" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button type="button" id="printAllLeavesBtn" class="btn btn-secondary btn-small">
                🖨️ รายงานขอลาทั้งหมด
              </button>
              <button type="button" id="printApprovedLeavesBtn" class="btn btn-secondary btn-small" style="border: 1px solid var(--post-emerald); color: var(--post-emerald); background: rgba(16, 185, 129, 0.05);">
                🖨️ รายงานการอนุมัติลา
              </button>
              <button type="button" id="printCalendarReportBtn" class="btn btn-secondary btn-small" style="border: 1px solid var(--post-orange); color: var(--post-orange); background: rgba(245, 158, 11, 0.05);">
                🖨️ พิมพ์รายงานปฏิทิน
              </button>
            </div>
          </div>

          <!-- Tab 1: Table List View -->
          <div id="leaveListTabContent" class="table-container">
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

          <!-- Tab 2: Calendar View -->
          <div id="leaveCalendarTabContent" class="hidden" style="padding: 0.5rem 1rem 1rem 1rem;">
            <!-- Calendar Navigation Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; background: rgba(0,0,0,0.02); padding: 0.5rem; border-radius: var(--radius-small); border: 1px solid var(--border-glass);">
              <button type="button" id="calPrevMonthBtn" class="btn btn-secondary btn-small" style="padding: 0.35rem 0.75rem;">◀️ เดือนก่อนหน้า</button>
              <h4 id="calMonthTitle" style="margin: 0; font-family: var(--font-title); font-size: 1.1rem; font-weight: 800; color: var(--text-primary); text-align: center;">-</h4>
              <button type="button" id="calNextMonthBtn" class="btn btn-secondary btn-small" style="padding: 0.35rem 0.75rem;">เดือนถัดไป ▶️</button>
            </div>

            <!-- Calendar Days Header -->
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.4rem; text-align: center; font-weight: 800; margin-bottom: 0.5rem; font-size: 0.8rem; color: var(--text-secondary); border-bottom: 1px solid var(--border-glass); padding-bottom: 0.5rem;">
              <div style="color: #ef4444;">อา.</div>
              <div>จ.</div>
              <div>อ.</div>
              <div>พ.</div>
              <div>พฤ.</div>
              <div>ศ.</div>
              <div style="color: #0ea5e9;">ส.</div>
            </div>

            <!-- Calendar Days Grid -->
            <div id="calendarGridBody" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.4rem; min-height: 350px;"></div>
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

    if (editingRequestId) {
      const original = leaveList.find(r => r.id === editingRequestId);
      if (original) {
        requestData.id = editingRequestId;
        requestData.createdAt = original.createdAt;
        requestData.status = original.status;
      }
    }

    const success = await saveLeaveRequest(requestData);
    if (success) {
      window.showToast(editingRequestId ? 'ปรับปรุงข้อมูลสำเร็จ!' : 'บันทึกคำขอลาสำเร็จ! รออนุมัติ', 'success');
      resetLeaveForm();
      renderLeaveTable();
    } else {
      window.showToast('บันทึกคำขอลาล้มเหลว!', 'error');
    }
  });

  // Bind print buttons
  const printAllBtn = document.getElementById('printAllLeavesBtn');
  const printAppBtn = document.getElementById('printApprovedLeavesBtn');
  const printCalBtn = document.getElementById('printCalendarReportBtn');
  if (printAllBtn) printAllBtn.addEventListener('click', printAllLeavesReport);
  if (printAppBtn) printAppBtn.addEventListener('click', printApprovedLeavesReport);
  if (printCalBtn) printCalBtn.addEventListener('click', printCalendarReport);

  // View Toggle Tabs
  const viewListBtn = document.getElementById('viewLeaveListBtn');
  const viewCalendarBtn = document.getElementById('viewLeaveCalendarBtn');
  const listTabContent = document.getElementById('leaveListTabContent');
  const calendarTabContent = document.getElementById('leaveCalendarTabContent');

  if (viewListBtn && viewCalendarBtn) {
    viewListBtn.addEventListener('click', () => {
      viewListBtn.classList.add('active');
      viewCalendarBtn.classList.remove('active');
      listTabContent.classList.remove('hidden');
      calendarTabContent.classList.add('hidden');
    });

    viewCalendarBtn.addEventListener('click', () => {
      viewCalendarBtn.classList.add('active');
      viewListBtn.classList.remove('active');
      listTabContent.classList.add('hidden');
      calendarTabContent.classList.remove('hidden');
      renderCalendarView();
    });
  }

  // Calendar Month Navigation Buttons
  const calPrevBtn = document.getElementById('calPrevMonthBtn');
  const calNextBtn = document.getElementById('calNextMonthBtn');
  if (calPrevBtn) {
    calPrevBtn.addEventListener('click', () => {
      currentViewMonth--;
      if (currentViewMonth < 1) {
        currentViewMonth = 12;
        currentViewYear--;
      }
      renderCalendarView();
    });
  }
  if (calNextBtn) {
    calNextBtn.addEventListener('click', () => {
      currentViewMonth++;
      if (currentViewMonth > 12) {
        currentViewMonth = 1;
        currentViewYear++;
      }
      renderCalendarView();
    });
  }

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

  renderLeaveStatistics();
  
  // Re-render calendar grid if it is currently open/visible
  const viewCalendarBtn = document.getElementById('viewLeaveCalendarBtn');
  if (viewCalendarBtn && viewCalendarBtn.classList.contains('active')) {
    renderCalendarView();
  }

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
        <button class="btn btn-secondary btn-small edit-btn" data-id="${req.id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; margin-left: 0.2rem;">✏️ แก้ไข</button>
        <button class="btn btn-danger btn-small reject-btn" data-id="${req.id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; margin-left: 0.2rem;">❌ ปฏิเสธ</button>
      `;
    } else if (req.status === 'approved') {
      statusHtml = `<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #059669; font-weight: bold; border-radius: 4px; padding: 0.2rem 0.5rem;">✔️ อนุมัติแล้ว</span>`;
      actionButtonsHtml = `
        <button class="btn btn-secondary btn-small cancel-approve-btn" data-id="${req.id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; color: #dc2626; border-color: rgba(220, 38, 38, 0.3); background: rgba(220, 38, 38, 0.03);">↩️ ยกเลิกอนุมัติ</button>
        <button class="btn btn-danger btn-small delete-leave-btn" data-id="${req.id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; margin-left: 0.2rem;">🗑️ ลบ</button>
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
    const cancelApproveBtn = tr.querySelector('.cancel-approve-btn');

    if (approveBtn) {
      approveBtn.addEventListener('click', () => handleApproveLeave(req));
    }
    if (rejectBtn) {
      rejectBtn.addEventListener('click', () => handleUpdateStatus(req.id, 'rejected'));
    }
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => handleDeleteLeave(req.id));
    }
    if (cancelApproveBtn) {
      cancelApproveBtn.addEventListener('click', () => handleCancelLeaveApproval(req));
    }
    const editBtn = tr.querySelector('.edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => startEditingLeave(req));
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
  const pendingOrRejectedList = leaveList.filter(req => req.status !== 'approved');
  if (pendingOrRejectedList.length === 0) {
    window.showToast('ไม่มีข้อมูลการขอลา (ที่ยังไม่ได้อนุมัติ) ที่จะพิมพ์!', 'warning');
    return;
  }
  const sorted = [...pendingOrRejectedList].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
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

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
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
        <h2>${title}</h2>
        <p>ที่ทำการไปรษณีย์ไทย • ข้อมูลรายงาน ณ วันที่ ${printDateStr}</p>
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
            <th style="width: 10%;">${isApprovedOnly ? 'วันที่อนุมัติ' : 'สถานะ'}</th>
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

async function handleCancelLeaveApproval(req) {
  if (confirm(`คุณต้องการยกเลิกการอนุมัติการลาของ "${req.name}" ใช่หรือไม่? (ระบบจะดึงวันหยุดนี้ออกและกู้คืนวันทำงานกลับเข้าสู่ตารางลงเวลาให้)`)) {
    window.showToast('กำลังยกเลิกการอนุมัติและล้างวันลา...', 'info');
    
    // 1. Rollback attendance records
    const rollbackSuccess = await rollbackLeaveFromAttendance(req);
    if (!rollbackSuccess) {
      window.showToast('การยกเลิกการซิงค์ตารางลงเวลาล้มเหลว!', 'error');
      return;
    }

    // 2. Set status to pending
    req.status = 'pending';
    delete req.approvedAt;

    const success = await saveLeaveRequest(req);
    if (success) {
      window.showToast('ยกเลิกการอนุมัติการลาเรียบร้อยแล้ว!', 'success');
      renderLeaveTable();
    } else {
      window.showToast('บันทึกสถานะการยกเลิกอนุมัติล้มเหลว!', 'error');
    }
  }
}

async function rollbackLeaveFromAttendance(req) {
  try {
    const start = new Date(req.startDate);
    const end = new Date(req.endDate);

    const currentDate = new Date(start);
    const monthsToUpdate = {};
    
    while (currentDate <= end) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const day = currentDate.getDate();
      
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
      currentDate.setDate(currentDate.getDate() + 1);
    }

    for (const key in monthsToUpdate) {
      const target = monthsToUpdate[key];
      const attendance = await fetchAttendanceList(target.year, target.month);
      
      let empRecord = attendance.find(a => a.name === req.name);
      if (empRecord) {
        const checkedDaysSet = new Set(empRecord.checkedDays);
        if (!empRecord.dayStatuses) empRecord.dayStatuses = {};

        target.days.forEach(day => {
          // Remove from dayStatuses
          delete empRecord.dayStatuses[String(day)];
          // Add back to checkedDays
          checkedDaysSet.add(day);
        });

        empRecord.checkedDays = Array.from(checkedDaysSet).sort((a, b) => a - b);
        await saveAttendanceList(target.year, target.month, attendance);
      }
    }
    return true;
  } catch (error) {
    console.error("❌ Failed to rollbackLeaveFromAttendance:", error);
    return false;
  }
}

function renderLeaveStatistics() {
  const container = document.getElementById('leaveStatsContainer');
  const yearLabel = document.getElementById('leaveStatsYear');
  if (!container) return;

  const globalYearSelect = document.getElementById('globalYear');
  const currentYear = globalYearSelect ? parseInt(globalYearSelect.value) : (new Date().getFullYear() + 543);
  if (yearLabel) yearLabel.textContent = currentYear;

  const approvedLeaves = leaveList.filter(req => {
    if (req.status !== 'approved') return false;
    const parts = req.startDate.split('-');
    if (parts.length === 3) {
      const beYear = parseInt(parts[0]) + 543;
      return beYear === currentYear;
    }
    return false;
  });

  if (approvedLeaves.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-secondary); padding: 1rem 0;">
        ไม่มีข้อมูลประวัติการอนุมัติวันลาในปี พ.ศ. ${currentYear}
      </div>
    `;
    return;
  }

  const stats = {};
  approvedLeaves.forEach(req => {
    if (!stats[req.name]) {
      stats[req.name] = { sick: 0, personal: 0, vacation: 0 };
    }
    const start = new Date(req.startDate);
    const end = new Date(req.endDate);
    const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    if (req.leaveType === 'sick') stats[req.name].sick += days;
    else if (req.leaveType === 'personal') stats[req.name].personal += days;
    else if (req.leaveType === 'vacation') stats[req.name].vacation += days;
  });

  const sortedNames = Object.keys(stats).sort((a, b) => a.localeCompare(b, 'th'));

  container.innerHTML = '';
  sortedNames.forEach(name => {
    const item = stats[name];
    const itemDiv = document.createElement('div');
    itemDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.6rem; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-glass); border-radius: var(--radius-small);';
    itemDiv.innerHTML = `
      <div style="font-weight: 700; color: var(--text-primary);">${name}</div>
      <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
        <span class="badge status-sick" style="padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.75rem;">🤒 ป่วย: ${item.sick} วัน</span>
        <span class="badge status-personal" style="padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.75rem;">💼 กิจ: ${item.personal} วัน</span>
        <span class="badge status-vacation" style="padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.75rem;">🏖️ พักร้อน: ${item.vacation} วัน</span>
      </div>
    `;
    container.appendChild(itemDiv);
  });
}

function renderCalendarView() {
  const titleEl = document.getElementById('calMonthTitle');
  const gridBody = document.getElementById('calendarGridBody');
  if (!gridBody || !titleEl) return;

  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  titleEl.textContent = `${thaiMonths[currentViewMonth - 1]} ${currentViewYear}`;

  // Convert currentViewYear (BE) back to CE for Date calculations
  const ceYear = currentViewYear - 543;
  const firstDayIndex = new Date(ceYear, currentViewMonth - 1, 1).getDay(); // 0 (Sun) - 6 (Sat)
  const totalDays = new Date(ceYear, currentViewMonth, 0).getDate(); // 28-31

  gridBody.innerHTML = '';

  // Render empty cells for days before the 1st of the month
  for (let i = 0; i < firstDayIndex; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.style.cssText = 'background: rgba(0,0,0,0.01); border: 1px dashed rgba(255,255,255,0.02); border-radius: var(--radius-small); min-height: 80px;';
    gridBody.appendChild(emptyCell);
  }

  // Render active days
  for (let day = 1; day <= totalDays; day++) {
    const cell = document.createElement('div');
    cell.style.cssText = 'background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-glass); border-radius: var(--radius-small); padding: 0.35rem; display: flex; flex-direction: column; gap: 0.25rem; min-height: 80px; position: relative; overflow-y: auto;';

    // Day Number
    const dayNum = document.createElement('div');
    dayNum.style.cssText = 'font-weight: 700; font-size: 0.8rem; color: var(--text-secondary); text-align: right; margin-bottom: 0.15rem;';
    dayNum.textContent = day;
    
    // Highlight weekends
    const cellIndex = (firstDayIndex + day - 1) % 7;
    if (cellIndex === 0) dayNum.style.color = '#ef4444'; // Sunday red
    else if (cellIndex === 6) dayNum.style.color = '#0ea5e9'; // Saturday blue

    cell.appendChild(dayNum);

    // Find approved leaves for this day
    const formattedTargetDate = `${ceYear}-${String(currentViewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const targetDate = new Date(formattedTargetDate);

    const activeLeaves = leaveList.filter(req => {
      if (req.status !== 'approved') return false;
      const start = new Date(req.startDate);
      const end = new Date(req.endDate);
      // Zero out time part for exact date comparisons
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      targetDate.setHours(0,0,0,0);
      return targetDate >= start && targetDate <= end;
    });

    activeLeaves.forEach(req => {
      const badge = document.createElement('div');
      
      let typeCode = 'พ';
      let typeClass = 'status-vacation';
      if (req.leaveType === 'sick') {
        typeCode = 'ป';
        typeClass = 'status-sick';
      } else if (req.leaveType === 'personal') {
        typeCode = 'ก';
        typeClass = 'status-personal';
      }

      badge.className = `badge ${typeClass}`;
      badge.style.cssText = 'font-size: 0.65rem; padding: 0.05rem 0.25rem; border-radius: 4px; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; text-align: left; font-weight: 700;';
      badge.title = `${req.name} (${req.leaveType === 'sick' ? 'ลาป่วย' : (req.leaveType === 'personal' ? 'ลากิจ' : 'ลาพักผ่อน')}): ${req.reason}`;
      badge.textContent = `${req.name.split(' ')[0]} (${typeCode})`;
      cell.appendChild(badge);
    });

    gridBody.appendChild(cell);
  }

  // Fill in empty slots to complete the grid if necessary
  const totalSlotsUsed = firstDayIndex + totalDays;
  const remainingSlots = (7 - (totalSlotsUsed % 7)) % 7;
  for (let i = 0; i < remainingSlots; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.style.cssText = 'background: rgba(0,0,0,0.01); border: 1px dashed rgba(255,255,255,0.02); border-radius: var(--radius-small); min-height: 80px;';
    gridBody.appendChild(emptyCell);
  }
}

function printCalendarReport() {
  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  const title = `รายงานปฏิทินแสดงวันลาทำงานพนักงาน ประจำเดือน ${thaiMonths[currentViewMonth - 1]} พ.ศ. ${currentViewYear}`;
  
  const ceYear = currentViewYear - 543;
  const firstDayIndex = new Date(ceYear, currentViewMonth - 1, 1).getDay(); // 0 (Sun) - 6 (Sat)
  const totalDays = new Date(ceYear, currentViewMonth, 0).getDate(); // 28-31
  
  // Load signatures from config storage
  const storedConfigs = JSON.parse(localStorage.getItem('tp_global_configs')) || {};
  const makerName = storedConfigs.attendanceMakerName || '';
  const checkerName = storedConfigs.attendanceCheckerName || '';
  const makerTitle = storedConfigs.attendanceMakerTitle || 'ผู้จัดทำ';
  const checkerTitle = storedConfigs.attendanceCheckerTitle || 'ผู้ตรวจสอบ';

  let gridHtml = '';
  
  // Empty cells at start of month
  for (let i = 0; i < firstDayIndex; i++) {
    gridHtml += `<td style="background: #f8fafc; border: 1px solid #e2e8f0;"></td>`;
  }
  
  // Date cells
  for (let day = 1; day <= totalDays; day++) {
    const formattedTargetDate = `${ceYear}-${String(currentViewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const targetDate = new Date(formattedTargetDate);
    
    // Find approved leaves for this day
    const activeLeaves = leaveList.filter(req => {
      if (req.status !== 'approved') return false;
      const start = new Date(req.startDate);
      const end = new Date(req.endDate);
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      targetDate.setHours(0,0,0,0);
      return targetDate >= start && targetDate <= end;
    });

    let leavesListHtml = '';
    activeLeaves.forEach(req => {
      let typeCode = 'พ';
      let color = '#0369a1';
      let bg = 'rgba(14, 165, 233, 0.08)';
      let border = 'rgba(14, 165, 233, 0.2)';
      let emoji = '🏖️';
      if (req.leaveType === 'sick') {
        typeCode = 'ป';
        color = '#b91c1c';
        bg = 'rgba(239, 68, 68, 0.08)';
        border = 'rgba(239, 68, 68, 0.2)';
        emoji = '🤒';
      } else if (req.leaveType === 'personal') {
        typeCode = 'ก';
        color = '#b45309';
        bg = 'rgba(245, 158, 11, 0.08)';
        border = 'rgba(245, 158, 11, 0.2)';
        emoji = '💼';
      }
      
      leavesListHtml += `
        <div style="font-size: 8pt; color: ${color}; background: ${bg}; border: 1px solid ${border}; padding: 3px 6px; border-radius: 4px; margin-bottom: 3px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.2;">
          ${emoji} ${req.name.split(' ')[0]} (${typeCode})
        </div>
      `;
    });

    // Check if weekend to apply styling
    const cellIndex = (firstDayIndex + day - 1) % 7;
    let cellBg = '#ffffff';
    let dayStyle = 'font-weight: 800; font-size: 10pt; text-align: right; margin-bottom: 6px; color: #475569;';
    if (cellIndex === 0) {
      cellBg = '#fef2f2'; // Soft Sunday red
      dayStyle += ' color: #ef4444;';
    } else if (cellIndex === 6) {
      cellBg = '#f0f9ff'; // Soft Saturday blue
      dayStyle += ' color: #0ea5e9;';
    }
    
    gridHtml += `
      <td style="height: 2.2cm; vertical-align: top; padding: 6px; border: 1px solid #cbd5e1; background: ${cellBg}; transition: background 0.2s;">
        <div style="${dayStyle}">${day}</div>
        <div style="display: flex; flex-direction: column; gap: 2px;">
          ${leavesListHtml}
        </div>
      </td>
    `;
    
    // Break into new row every Saturday
    if ((firstDayIndex + day) % 7 === 0 && day !== totalDays) {
      gridHtml += `</tr><tr>`;
    }
  }

  // Empty cells at end of month
  const totalSlotsUsed = firstDayIndex + totalDays;
  const remainingSlots = (7 - (totalSlotsUsed % 7)) % 7;
  for (let i = 0; i < remainingSlots; i++) {
    gridHtml += `<td style="background: #f8fafc; border: 1px solid #e2e8f0;"></td>`;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const today = new Date();
  const printDateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear() + 543}`;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        body {
          background: white !important;
          color: #1e293b !important;
          font-family: 'Sarabun', sans-serif !important;
          margin: 0 !important;
          padding: 0.5cm !important;
        }
        @page {
          size: A4 landscape;
          margin: 0.5cm;
        }
        .print-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.4cm;
          border-bottom: 2.5px solid #ef4444;
          padding-bottom: 0.25cm;
        }
        .print-header-left h2 {
          margin: 0 0 4px 0;
          font-size: 14pt;
          font-weight: 800;
          color: #ef4444;
        }
        .print-header-left p {
          margin: 0;
          font-size: 10pt;
          color: #475569;
          font-weight: 500;
        }
        .print-header-right {
          text-align: right;
          font-size: 9pt;
          color: #64748b;
        }
        .cal-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          margin-bottom: 0.3cm;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .cal-table th {
          border: 1px solid #cbd5e1 !important;
          padding: 8px 4px !important;
          font-size: 10pt !important;
          font-weight: 700 !important;
          text-align: center !important;
          background: #f1f5f9 !important;
          color: #334155 !important;
        }
        .legend {
          display: flex;
          gap: 1.5rem;
          font-size: 9pt;
          justify-content: center;
          margin-top: 0.4cm;
          border-top: 1px solid #e2e8f0;
          padding-top: 0.25cm;
          color: #475569;
        }
        .signature-section {
          margin-top: 0.6cm;
          display: flex;
          justify-content: space-between;
          padding: 0 2cm;
          page-break-inside: avoid;
        }
        .signature-block {
          text-align: center;
          width: 40%;
          font-size: 10pt;
        }
        .signature-line {
          margin-bottom: 10px;
          border-bottom: 1.5px dotted #94a3b8;
          width: 100%;
          height: 25px;
        }
      </style>
    </head>
    <body>
      <div class="print-header">
        <div class="print-header-left">
          <h2>${title}</h2>
          <p>ที่ทำการไปรษณีย์ไทย • แผนกจัดส่งพัสดุภัณฑ์และค่าน้ำมันน้ำดื่ม</p>
        </div>
        <div class="print-header-right">
          <div>วันที่ออกรายงาน: ${printDateStr}</div>
          <div style="margin-top: 2px; font-weight: bold; color: #ef4444;">เอกสารทางการของ ปณ.</div>
        </div>
      </div>
      
      <table class="cal-table">
        <thead>
          <tr>
            <th style="color: #ef4444; width: 14.28%;">อาทิตย์</th>
            <th style="width: 14.28%;">จันทร์</th>
            <th style="width: 14.28%;">อังคาร</th>
            <th style="width: 14.28%;">พุธ</th>
            <th style="width: 14.28%;">พฤหัสบดี</th>
            <th style="width: 14.28%;">ศุกร์</th>
            <th style="color: #0ea5e9; width: 14.28%;">เสาร์</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            ${gridHtml}
          </tr>
        </tbody>
      </table>

      <div class="legend">
        <strong>คำอธิบายประเภทวันลา:</strong>
        <span style="display: flex; align-items: center; gap: 4px;"><span style="display:inline-block; width:8px; height:8px; background:#feebeb; border: 1px solid #fca5a5; border-radius:50%;"></span> 🤒 (ป) = ลาป่วย</span>
        <span style="display: flex; align-items: center; gap: 4px;"><span style="display:inline-block; width:8px; height:8px; background:#fef3c7; border: 1px solid #fcd34d; border-radius:50%;"></span> 💼 (ก) = ลากิจ</span>
        <span style="display: flex; align-items: center; gap: 4px;"><span style="display:inline-block; width:8px; height:8px; background:#e0f2fe; border: 1px solid #7dd3fc; border-radius:50%;"></span> 🏖️ (พ) = ลาพักผ่อน</span>
      </div>

      <!-- Signature Blocks -->
      <div class="signature-section">
        <div class="signature-block">
          <div class="signature-line"></div>
          <p style="margin: 0; font-weight: bold;">( ${makerName || '..........................................................'} )</p>
          <p style="margin: 2px 0 0 0; font-size: 9pt; color: #64748b;">ตำแหน่ง: ${storedConfigs.attendanceMakerPos || makerTitle}</p>
        </div>
        <div class="signature-block">
          <div class="signature-line"></div>
          <p style="margin: 0; font-weight: bold;">( ${checkerName || '..........................................................'} )</p>
          <p style="margin: 2px 0 0 0; font-size: 9pt; color: #64748b;">ตำแหน่ง: ${storedConfigs.attendanceCheckerPos || checkerTitle}</p>
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

function startEditingLeave(req) {
  editingRequestId = req.id;
  document.getElementById('leaveEmpName').value = req.name;
  document.getElementById('leaveType').value = req.leaveType;
  document.getElementById('leaveStartDate').value = req.startDate;
  document.getElementById('leaveEndDate').value = req.endDate;
  document.getElementById('leaveReason').value = req.reason === '-' ? '' : req.reason;

  const submitBtn = document.getElementById('submitLeaveBtn');
  if (submitBtn) {
    submitBtn.textContent = '💾 บันทึกการแก้ไข';
    submitBtn.className = 'btn btn-primary btn-full';
    submitBtn.style.background = 'var(--post-emerald)';
    submitBtn.style.borderColor = 'var(--post-emerald)';
  }

  let cancelBtn = document.getElementById('cancelEditLeaveBtn');
  if (!cancelBtn) {
    cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.id = 'cancelEditLeaveBtn';
    cancelBtn.className = 'btn btn-secondary btn-full';
    cancelBtn.style.marginTop = '0.5rem';
    cancelBtn.textContent = 'ยกเลิกการแก้ไข';
    cancelBtn.addEventListener('click', resetLeaveForm);
    submitBtn.parentNode.appendChild(cancelBtn);
  }
}

function resetLeaveForm() {
  editingRequestId = null;
  const form = document.getElementById('leaveRequestForm');
  if (form) form.reset();

  const submitBtn = document.getElementById('submitLeaveBtn');
  if (submitBtn) {
    submitBtn.textContent = '➕ ส่งคำขอลาทำงาน';
    submitBtn.className = 'btn btn-primary btn-full';
    submitBtn.style.background = '';
    submitBtn.style.borderColor = '';
  }

  const cancelBtn = document.getElementById('cancelEditLeaveBtn');
  if (cancelBtn) {
    cancelBtn.remove();
  }
}
