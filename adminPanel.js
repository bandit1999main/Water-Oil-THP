import {
  isCloudConnected,
  fetchUsersList,
  saveUserRole,
  deleteUserMetadata,
  checkIsAdmin,
  fetchGlobalConfigs,
  saveGlobalConfigs,
  logActivity,
  fetchActivityLogs
} from './database.js';

let appUsersList = [];

export async function renderAdminUsersTable(users) {
  const tbody = document.getElementById('adminUsersTableBody');
  if (!tbody) return;

  if (users) {
    appUsersList = users;
  } else {
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
  }

  // Auto-sort users by name
  appUsersList.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '', 'th'));

  if (appUsersList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="no-data">ยังไม่มีประวัติข้อมูลผู้ใช้งานในระบบคลาวด์</td>
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
            ? `<button class="row-action-btn reject-user-btn" data-uid="${user.uid}" title="ยกเลิกการอนุมัติ" style="color: var(--post-orange); cursor: pointer;">🚫</button>`
            : `<button class="row-action-btn approve-user-btn" data-uid="${user.uid}" title="อนุมัติผู้ใช้" style="color: var(--post-emerald); cursor: pointer;">✅</button>`
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

  window.showConfirm({
    title: '🔄 ยืนยันเปลี่ยนสิทธิ์ผู้ใช้งาน',
    message: `คุณต้องการเปลี่ยนสิทธิ์ของ "${targetUser.displayName}" เป็น ${newRole === 'admin' ? 'Admin' : 'User (Read-Only)'} ใช่หรือไม่?`,
    icon: '🔄',
    okText: 'ยืนยันเปลี่ยนสิทธิ์',
    okClass: 'btn-primary',
    onConfirm: async () => {
      window.showToast('กำลังปรับปรุงสิทธิ์...', 'info');
      const success = await saveUserRole(uid, { role: newRole });
      if (success) {
        window.showToast('อัปเดตสิทธิ์เรียบร้อยแล้ว!', 'success');
        renderAdminUsersTable();
      } else {
        window.showToast('ไม่สามารถอัปเดตสิทธิ์ได้', 'error');
      }
    }
  });
}

async function handleUserDeleteClick(e) {
  const uid = e.currentTarget.getAttribute('data-uid');
  const targetUser = appUsersList.find(u => u.uid === uid);
  if (!targetUser) return;

  window.showConfirm({
    title: '🗑️ ลบข้อมูลบัญชีผู้ใช้งาน',
    message: `คุณต้องการลบข้อมูลบัญชีของ "${targetUser.displayName}" ออกจากระบบใช่หรือไม่? (จะตัดสิทธิ์เข้าถึงชั่วคราวจนกว่าจะล็อกอินใหม่)`,
    icon: '🗑️',
    okText: 'ยืนยันการลบ',
    okClass: 'btn-danger',
    onConfirm: async () => {
      window.showToast('กำลังลบข้อมูลบัญชี...', 'info');
      const success = await deleteUserMetadata(uid);
      if (success) {
        window.showToast('ลบข้อมูลบัญชีสำเร็จ!', 'success');
        renderAdminUsersTable();
      } else {
        window.showToast('ไม่สามารถลบข้อมูลบัญชีได้', 'error');
      }
    }
  });
}

async function handleUserDutyChange(e) {
  const uid      = e.target.getAttribute('data-uid');
  const duty     = e.target.getAttribute('data-duty');
  const checked  = e.target.checked;
  const targetUser = appUsersList.find(u => u.uid === uid);
  if (!targetUser) return;

  const allCheckboxes = document.querySelectorAll(`.duty-checkbox[data-uid="${uid}"]`);
  const duties = [];
  allCheckboxes.forEach(cb => {
    if (cb.checked) duties.push(cb.getAttribute('data-duty'));
  });

  const success = await saveUserRole(uid, { duties });
  if (success) {
    const dutyLabel = duty === 'fuel' ? '⛽ ค่าน้ำมัน' : '💧 ค่าน้ำดื่ม';
    const action    = checked ? 'เพิ่ม' : 'ลบ';
    window.showToast(`${action}หน้าที่ ${dutyLabel} ให้ ${targetUser.displayName || targetUser.email} แล้ว`, 'success');
    targetUser.duties = duties;
  } else {
    window.showToast('ไม่สามารถบันทึกหน้าที่ได้', 'error');
    e.target.checked = !checked;
  }
}

async function handleUserApproveClick(e) {
  const uid = e.currentTarget.getAttribute('data-uid');
  const targetUser = appUsersList.find(u => u.uid === uid);
  if (!targetUser) return;

  window.showConfirm({
    title: '✅ อนุมัติผู้ใช้งาน',
    message: `คุณต้องการอนุมัติให้ "${targetUser.displayName || targetUser.email}" เข้าใช้งานระบบใช่หรือไม่?`,
    icon: '✅',
    okText: 'ยืนยันการอนุมัติ',
    okClass: 'btn-primary',
    onConfirm: async () => {
      window.showToast('กำลังอนุมัติ...', 'info');
      const success = await saveUserRole(uid, { approved: true });
      if (success) {
        window.showToast(`✅ อนุมัติ ${targetUser.displayName || ''} เรียบร้อยแล้ว!`, 'success');
        renderAdminUsersTable();
      } else {
        window.showToast('ไม่สามารถอนุมัติได้', 'error');
      }
    }
  });
}

async function handleUserRejectClick(e) {
  const uid = e.currentTarget.getAttribute('data-uid');
  const targetUser = appUsersList.find(u => u.uid === uid);
  if (!targetUser) return;

  window.showConfirm({
    title: '🚫 ยกเลิกการอนุมัติ',
    message: `คุณต้องการยกเลิกการอนุมัติของ "${targetUser.displayName || targetUser.email}" ใช่หรือไม่? ผู้ใช้จะไม่สามารถเข้าใช้งานได้จนกว่าจะได้รับการอนุมัติอีกครั้ง`,
    icon: '🚫',
    okText: 'ยืนยันการยกเลิก',
    okClass: 'btn-danger',
    onConfirm: async () => {
      window.showToast('กำลังยกเลิกการอนุมัติ...', 'info');
      const success = await saveUserRole(uid, { approved: false });
      if (success) {
        window.showToast(`🚫 ยกเลิกการอนุมัติ ${targetUser.displayName || ''} แล้ว`, 'success');
        renderAdminUsersTable();
      } else {
        window.showToast('ไม่สามารถยกเลิกการอนุมัติได้', 'error');
      }
    }
  });
}


export function getAdminPanelTemplate() {
  return `<div class="dashboard-grid animate-fade-in" style="grid-template-columns: 1fr; gap: 1.5rem;">
  <div class="panel-column full-width-column" style="width: 100%;">
          <div id="adminTableCard" class="glass-card full-width">
            <div class="card-header table-header-flex">
              <div class="header-left">
                <span class="card-icon">🔑</span>
                <h3>จัดการสิทธิ์ผู้ใช้งานระบบ (User Management)</h3>
              </div>
            </div>
            <div style="padding: 1rem; color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5; background: rgba(0, 0, 0, 0.02); border-bottom: 1px solid var(--border-glass); border-radius: var(--radius-small) var(--radius-small) 0 0;">
              💡 <strong>คู่มือดูแลระบบ:</strong> รายการผู้ใช้งานจะปรากฏที่นี่เมื่อพวกเขาเข้าสู่ระบบครั้งแรก บัญชีแอดมินหลัก <strong style="color: var(--post-orange);">bandit1999main@gmail.com</strong> จะไม่สามารถเปลี่ยนสิทธิ์หรือลบออกได้เพื่อความปลอดภัยสูงสุด
            </div>
            <div class="table-container">
              <table id="adminUsersTable">
                <thead>
                  <tr>
                    <th style="width: 5%;">ลำดับ</th>
                    <th style="width: 7%;">โปรไฟล์</th>
                    <th style="width: 16%;">ชื่อผู้ใช้งาน</th>
                    <th style="width: 18%;">อีเมล</th>
                    <th style="width: 10%;">สถานะ</th>
                    <th style="width: 14%;">หน้าที่จัดทำ</th>
                    <th style="width: 16%;">บทบาทหน้าที่</th>
                    <th style="width: 14%;">การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody id="adminUsersTableBody">
                  <tr>
                    <td colspan="8" class="no-data">ยังไม่มีประวัติข้อมูลผู้ใช้งานในระบบคลาวด์</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
  </div>

  <div class="panel-column full-width-column" style="width: 100%;">
          <div id="adminConfigCard" class="glass-card full-width" style="padding: 1.5rem;">
            <div class="card-header" style="margin-bottom: 1.2rem; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.5rem;">
              <span class="card-icon">⚙️</span>
              <h3 style="font-size: 1.1rem; font-weight: 700;">การตั้งค่าตัวแปรกลางของระบบ (System Configuration)</h3>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 1.5rem;">
              
              <!-- Core Global Vars -->
              <div>
                <h4 style="font-weight: 700; font-size: 0.95rem; color: var(--post-orange); margin-bottom: 0.75rem;">🏢 ข้อมูลผู้มีหน้าที่หักภาษี ณ ที่จ่าย (หน่วยงาน ปณ.)</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.2rem; margin-bottom: 1.5rem; background: rgba(0, 0, 0, 0.01); border: 1px solid var(--border-glass); padding: 1.2rem; border-radius: 8px;">
                  <div class="form-group" style="display: flex; flex-direction: column; gap: 0.4rem;">
                    <label for="adminPostOfficeName" style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary);">ชื่อหน่วยงาน / ผู้จ่ายเงิน:</label>
                    <input type="text" id="adminPostOfficeName" class="form-input" style="width: 100%; padding: 0.6rem; border-radius: 8px; border: 1px solid var(--border-glass); background: rgba(0,0,0,0.02); color: var(--text-primary);" placeholder="เช่น ไปรษณีย์ไทย มาบตาพุด" />
                  </div>
                  
                  <div class="form-group" style="display: flex; flex-direction: column; gap: 0.4rem;">
                    <label for="adminPostOfficeTaxId" style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary);">เลขประจำตัวผู้เสียภาษีอากร (13 หลัก):</label>
                    <input type="text" id="adminPostOfficeTaxId" class="form-input" style="width: 100%; padding: 0.6rem; border-radius: 8px; border: 1px solid var(--border-glass); background: rgba(0,0,0,0.02); color: var(--text-primary);" placeholder="เช่น 0105500000000" maxlength="13" />
                  </div>

                  <div class="form-group" style="display: flex; flex-direction: column; gap: 0.4rem;">
                    <label for="adminPostOfficeAddress" style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary);">ที่อยู่หน่วยงาน ปณ. (ตามที่จดทะเบียน):</label>
                    <input type="text" id="adminPostOfficeAddress" class="form-input" style="width: 100%; padding: 0.6rem; border-radius: 8px; border: 1px solid var(--border-glass); background: rgba(0,0,0,0.02); color: var(--text-primary);" placeholder="เช่น เลขที่ 1/1 ถนนสุขุมวิท..." />
                  </div>
                </div>

                <h4 style="font-weight: 700; font-size: 0.95rem; color: var(--post-orange); margin-bottom: 0.75rem;">💵 อัตราอ้างอิงและเงินช่วยเหลือกลาง</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.2rem; background: rgba(0, 0, 0, 0.01); border: 1px solid var(--border-glass); padding: 1.2rem; border-radius: 8px;">
                  <div class="form-group" style="display: flex; flex-direction: column; gap: 0.4rem;">
                    <label for="adminWaterAllowance" style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary);">เงินสวัสดิการค่าน้ำดื่มรายวัน (บาท / วัน):</label>
                    <input type="number" id="adminWaterAllowance" class="form-input" style="width: 100%; padding: 0.6rem; border-radius: 8px; border: 1px solid var(--border-glass); background: rgba(0,0,0,0.02); color: var(--text-primary);" min="1" step="1" value="30" />
                  </div>

                  <div class="form-group" style="display: flex; flex-direction: column; gap: 0.4rem;">
                    <label for="adminDefaultFuelPrice" style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary);">ราคาน้ำมันอ้างอิงเริ่มต้น (บาท / ลิตร):</label>
                    <input type="number" id="adminDefaultFuelPrice" class="form-input" style="width: 100%; padding: 0.6rem; border-radius: 8px; border: 1px solid var(--border-glass); background: rgba(0,0,0,0.02); color: var(--text-primary);" min="1" step="0.01" value="35.00" />
                  </div>
                </div>
              </div>

              <!-- Water Tax Brackets Table Editor -->
              <div style="margin-top: 0.5rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.6rem;">
                  <h4 style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin: 0;">โครงสร้างฐานภาษีหัก ณ ที่จ่ายค่าน้ำดื่ม (Water Tax Brackets)</h4>
                  <button type="button" id="adminAddBracketBtn" class="btn btn-secondary btn-small" style="padding: 0.35rem 0.8rem; font-size: 0.78rem; border-color: var(--post-orange); color: var(--post-orange);">➕ เพิ่มช่วงฐานภาษี</button>
                </div>
                
                <div class="table-container" style="max-height: 280px; overflow-y: auto; border-radius: 8px; border: 1px solid var(--border-glass);">
                  <table style="width: 100%; font-size: 0.85rem; border-collapse: separate; border-spacing: 0;">
                    <thead>
                      <tr>
                        <th style="width: 10%; text-align: center;">ลำดับ</th>
                        <th style="width: 35%; text-align: right;">เงินเดือนเริ่มต้น (บาท)</th>
                        <th style="width: 35%; text-align: right;">เงินเดือนสิ้นสุด (บาท)</th>
                        <th style="width: 12%; text-align: center;">อัตราภาษี (%)</th>
                        <th style="width: 8%; text-align: center;">ลบ</th>
                      </tr>
                    </thead>
                    <tbody id="adminBracketsTableBody">
                      <!-- Dynamically rendered via JS -->
                    </tbody>
                  </table>
                </div>
              </div>

              <button id="saveAdminConfigBtn" class="btn btn-primary" style="align-self: flex-start; padding: 0.6rem 2rem; font-weight: 700; border-radius: 8px; background: var(--post-orange); color: white; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(251,80,18,0.2);">💾 บันทึกการตั้งค่าระบบ</button>
            </div>
          </div>
  </div>

  <div class="panel-column full-width-column" style="width: 100%;">
          <div id="adminBackupCard" class="glass-card full-width" style="padding: 1.5rem;">
            <div class="card-header" style="margin-bottom: 1.2rem; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.5rem;">
              <span class="card-icon">💾</span>
              <h3 style="font-size: 1.1rem; font-weight: 700;">ระบบจัดการสำรองและกู้คืนข้อมูล (Local Backup &amp; Restore)</h3>
            </div>
            
            <div style="padding: 1rem; color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5; background: rgba(0, 0, 0, 0.02); border: 1px solid var(--border-glass); border-radius: var(--radius-small); margin-bottom: 1.2rem;">
              ⚠️ <strong>ข้อควรระวัง:</strong> การกู้คืนข้อมูลสำรอง (Restore) จะเขียนข้อมูลทับลงบนฐานข้อมูลปัจจุบันทั้งหมด กรุณาสำรองข้อมูลปัจจุบันไว้ก่อนดำเนินการนำเข้าข้อมูลใดๆ เพื่อความปลอดภัย
            </div>
            
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
              <button id="exportBackupBtn" class="btn btn-primary" style="padding: 0.6rem 1.5rem; font-weight: 700; border-radius: 8px; background: var(--post-orange); color: white; border: none; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; box-shadow: 0 4px 12px rgba(251,80,18,0.15);">
                📤 ส่งออกสำรองข้อมูล (JSON)
              </button>
              
              <button id="importBackupBtn" class="btn btn-secondary" style="padding: 0.6rem 1.5rem; font-weight: 700; border-radius: 8px; border: 1px solid var(--post-emerald); color: var(--post-emerald); background: rgba(16, 185, 129, 0.05); cursor: pointer; display: flex; align-items: center; gap: 0.4rem;">
                📥 นำเข้าข้อมูลกู้คืน (JSON)
              </button>
              <input type="file" id="backupFileSelector" accept=".json" style="display: none;" />
          </div>
  </div>

  <div class="panel-column full-width-column" style="width: 100%; margin-top: 1.5rem;">
          <div id="adminActivityLogsCard" class="glass-card full-width" style="padding: 1.5rem;">
            <div class="card-header" style="margin-bottom: 1.2rem; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span class="card-icon">📜</span>
                <h3 style="font-size: 1.1rem; font-weight: 700;">ประวัติกิจกรรมของระบบ (System Activity Logs)</h3>
              </div>
              <button id="refreshActivityLogsBtn" class="btn btn-secondary btn-small" style="padding: 0.3rem 0.75rem; font-size: 0.75rem; border-color: var(--post-orange); color: var(--post-orange); cursor: pointer;">🔄 รีเฟรชข้อมูล</button>
            </div>
            
            <div class="table-container" style="overflow-x: auto; border-radius: 8px; border: 1px solid var(--border-glass); max-height: 300px; overflow-y: auto;">
              <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.85rem;">
                <thead>
                  <tr>
                    <th style="width: 20%; text-align: left; padding: 0.5rem;">วันเวลา</th>
                    <th style="width: 20%; text-align: left; padding: 0.5rem;">ผู้ดำเนินการ</th>
                    <th style="width: 20%; text-align: center; padding: 0.5rem;">กิจกรรม</th>
                    <th style="width: 40%; text-align: left; padding: 0.5rem;">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody id="adminActivityLogsTableBody">
                  <tr>
                    <td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-secondary); font-style: italic;">
                      กำลังโหลดประวัติกิจกรรม...
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
  </div>
</div>`;
}

export async function initAdminPanel() {
  const officeInput = document.getElementById('adminPostOfficeName');
  const officeTaxIdInput = document.getElementById('adminPostOfficeTaxId');
  const officeAddressInput = document.getElementById('adminPostOfficeAddress');
  const allowanceInput = document.getElementById('adminWaterAllowance');
  const fuelInput = document.getElementById('adminDefaultFuelPrice');
  const addBracketBtn = document.getElementById('adminAddBracketBtn');
  const bracketsTableBody = document.getElementById('adminBracketsTableBody');
  const saveConfigBtn = document.getElementById('saveAdminConfigBtn');

  if (!saveConfigBtn) return;

  const configs = await fetchGlobalConfigs();
  
  if (officeInput) officeInput.value = configs.postOfficeName || "ไปรษณีย์ไทย";
  if (officeTaxIdInput) officeTaxIdInput.value = configs.postOfficeTaxId || "";
  if (officeAddressInput) officeAddressInput.value = configs.postOfficeAddress || "";
  if (allowanceInput) allowanceInput.value = configs.waterAllowancePerDay || 30;
  if (fuelInput) fuelInput.value = configs.defaultFuelPrice !== undefined ? configs.defaultFuelPrice : 35.00;

  let localBrackets = Array.isArray(configs.waterTaxBrackets) 
    ? [...configs.waterTaxBrackets] 
    : [
        { minSalary: 0, maxSalary: 25833, rate: 0.00 },
        { minSalary: 25834, maxSalary: 38333, rate: 0.05 },
        { minSalary: 38334, maxSalary: 55000, rate: 0.10 },
        { minSalary: 55001, maxSalary: 75833, rate: 0.15 },
        { minSalary: 75834, maxSalary: 96666, rate: 0.20 },
        { minSalary: 96667, maxSalary: 9999999, rate: 0.25 }
      ];

  function renderBracketsTable() {
    if (!bracketsTableBody) return;
    bracketsTableBody.innerHTML = '';
    localBrackets.forEach((b, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="text-align: center; font-weight: bold; vertical-align: middle;">${idx + 1}</td>
        <td>
          <input type="number" class="bracket-min-salary align-right" data-index="${idx}" style="width: 100%; border: none; background: transparent; padding: 0.35rem 0.5rem; text-align: right; color: var(--text-primary);" value="${b.minSalary}" />
        </td>
        <td>
          <input type="number" class="bracket-max-salary align-right" data-index="${idx}" style="width: 100%; border: none; background: transparent; padding: 0.35rem 0.5rem; text-align: right; color: var(--text-primary);" value="${b.maxSalary}" />
        </td>
        <td>
          <input type="number" class="bracket-rate align-center" data-index="${idx}" style="width: 100%; border: none; background: transparent; padding: 0.35rem 0.5rem; text-align: center; font-weight: bold; color: var(--text-primary);" step="0.1" value="${(b.rate * 100).toFixed(1)}" />
        </td>
        <td style="text-align: center; vertical-align: middle;">
          <button type="button" class="btn-delete-bracket" data-index="${idx}" style="background: none; border: none; color: var(--post-red); cursor: pointer; font-size: 1.1rem;" title="ลบช่วงภาษี">🗑️</button>
        </td>
      `;
      bracketsTableBody.appendChild(tr);
    });

    // Bind local inputs
    bracketsTableBody.querySelectorAll('.bracket-min-salary').forEach(input => {
      input.addEventListener('change', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        localBrackets[index].minSalary = parseInt(e.target.value) || 0;
      });
    });

    bracketsTableBody.querySelectorAll('.bracket-max-salary').forEach(input => {
      input.addEventListener('change', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        localBrackets[index].maxSalary = parseInt(e.target.value) || 0;
      });
    });

    bracketsTableBody.querySelectorAll('.bracket-rate').forEach(input => {
      input.addEventListener('change', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        localBrackets[index].rate = (parseFloat(e.target.value) || 0) / 100;
      });
    });

    bracketsTableBody.querySelectorAll('.btn-delete-bracket').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.getAttribute('data-index'));
        localBrackets.splice(index, 1);
        renderBracketsTable();
      });
    });
  }

  if (addBracketBtn) {
    addBracketBtn.onclick = () => {
      const lastBracket = localBrackets[localBrackets.length - 1];
      const nextMin = lastBracket ? lastBracket.maxSalary + 1 : 0;
      localBrackets.push({ minSalary: nextMin, maxSalary: nextMin + 10000, rate: 0.05 });
      renderBracketsTable();
    };
  }

  renderBracketsTable();

  saveConfigBtn.addEventListener('click', async () => {
    const allowance = parseInt(allowanceInput.value);
    const officeName = officeInput.value.trim();
    const officeTaxId = officeTaxIdInput ? officeTaxIdInput.value.trim() : "";
    const officeAddress = officeAddressInput ? officeAddressInput.value.trim() : "";
    const fuelPrice = parseFloat(fuelInput.value);

    if (isNaN(allowance) || allowance <= 0) {
      window.showToast('กรุณาระบุตัวเลขค่าน้ำดื่มต่อวันที่ถูกต้อง!', 'error');
      return;
    }
    if (!officeName) {
      window.showToast('กรุณาระบุชื่อที่ทำการไปรษณีย์!', 'error');
      return;
    }
    if (isNaN(fuelPrice) || fuelPrice <= 0) {
      window.showToast('กรุณาระบุราคาน้ำมันอ้างอิงเริ่มต้นที่ถูกต้อง!', 'error');
      return;
    }

    for (let i = 0; i < localBrackets.length; i++) {
      const b = localBrackets[i];
      if (b.minSalary > b.maxSalary) {
        window.showToast(`ระดับภาษีที่ ${i+1}: เงินเดือนเริ่มต้นห้ามมากกว่าสิ้นสุด!`, 'error');
        return;
      }
      if (b.rate < 0 || b.rate > 1.0) {
        window.showToast(`ระดับภาษีที่ ${i+1}: อัตราภาษี (%) ต้องอยู่ในช่วง 0% - 100%`, 'error');
        return;
      }
    }

    localBrackets.sort((a, b) => a.minSalary - b.minSalary);

    window.showToast('กำลังบันทึกการตั้งค่า...', 'info');
    const success = await saveGlobalConfigs({
      waterAllowancePerDay: allowance,
      postOfficeName: officeName,
      postOfficeTaxId: officeTaxId,
      postOfficeAddress: officeAddress,
      defaultFuelPrice: fuelPrice,
      waterTaxBrackets: localBrackets
    });

    if (success) {
      window.showToast('บันทึกการตั้งค่าระบบสำเร็จ!', 'success');
      await window.loadAppConfigs();
    } else {
      window.showToast('บันทึกการตั้งค่าล้มเหลว!', 'error');
    }
  });

  // Local Backup & Restore Logic
  const exportBackupBtn = document.getElementById('exportBackupBtn');
  const importBackupBtn = document.getElementById('importBackupBtn');
  const backupFileSelector = document.getElementById('backupFileSelector');

  if (exportBackupBtn) {
    exportBackupBtn.addEventListener('click', () => {
      window.showToast('กำลังเตรียมไฟล์สำรองข้อมูล...', 'info');
      try {
        const backupData = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key.startsWith('tp_')) {
            try {
              backupData[key] = JSON.parse(localStorage.getItem(key));
            } catch (e) {
              backupData[key] = localStorage.getItem(key);
            }
          }
        }
        
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `thp_system_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        logActivity('backup_export', 'ส่งออกไฟล์สำรองข้อมูลของระบบ');
        window.showToast('📤 ส่งออกสำรองข้อมูลสำเร็จ!', 'success');
      } catch (err) {
        console.error("Backup export failed:", err);
        window.showToast('ส่งออกสำรองข้อมูลล้มเหลว', 'error');
      }
    });
  }

  if (importBackupBtn && backupFileSelector) {
    importBackupBtn.addEventListener('click', () => backupFileSelector.click());
    
    backupFileSelector.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const backupData = JSON.parse(event.target.result);
          
          // Basic validation checking if keys are system configs
          const keys = Object.keys(backupData);
          const hasSystemKeys = keys.some(k => k.startsWith('tp_'));
          if (!hasSystemKeys) {
            window.showToast('❌ รูปแบบไฟล์สำรองข้อมูลไม่ถูกต้อง!', 'error');
            return;
          }

          window.showConfirm({
            title: '📥 ยืนยันการกู้คืนข้อมูลสำรอง',
            message: `ระบบตรวจพบข้อมูลสำรองจำนวน ${keys.length} ตาราง/การตั้งค่า คุณต้องการกู้คืนข้อมูลทั้งหมดใช่หรือไม่? (ข้อมูลปัจจุบันจะถูกเขียนทับ)`,
            icon: '⚠️',
            okText: 'กู้คืนข้อมูล',
            okClass: 'btn-danger',
            onConfirm: async () => {
              window.showToast('กำลังกู้คืนข้อมูล...', 'info');
              
              // Restore to localStorage
              keys.forEach(key => {
                const val = backupData[key];
                if (typeof val === 'object') {
                  localStorage.setItem(key, JSON.stringify(val));
                } else {
                  localStorage.setItem(key, String(val));
                }
              });

              // Write back collections to Firestore in background if online
              if (isCloudConnected()) {
                try {
                  const dbMod = await import('./database.js');
                  
                  // Restore personnel
                  if (backupData['tp_personnel']) {
                    await dbMod.savePersonnelList(backupData['tp_personnel']);
                  }
                  // Restore global configs
                  if (backupData['tp_global_configs']) {
                    await dbMod.saveGlobalConfigs(backupData['tp_global_configs']);
                  }
                  
                  // Sync current lists back to Firestore
                  const activeFuelKey = dbMod.getActiveEmployeesCollectionName();
                  if (backupData[`tp_${activeFuelKey}`]) {
                    await dbMod.saveEmployees(backupData[`tp_${activeFuelKey}`]);
                  }
                  const activeWaterKey = dbMod.getActiveWaterEmployeesCollectionName();
                  if (backupData[`tp_${activeWaterKey}`]) {
                    await dbMod.saveWaterEmployees(backupData[`tp_${activeWaterKey}`]);
                  }
                } catch (dbErr) {
                  console.error("Firestore batch restore failed:", dbErr);
                }
              }

              await logActivity('backup_import', 'กู้คืนฐานข้อมูลและตั้งค่าของระบบสำเร็จผ่านไฟล์สำรองข้อมูล');
              window.showToast('📥 กู้คืนข้อมูลสำรองสำเร็จ! ระบบจะทำการรีโหลดการตั้งค่าใหม่', 'success');
              await window.loadAppConfigs();
              backupFileSelector.value = '';
              setTimeout(() => window.location.reload(), 1500);
            }
          });
        } catch (jsonErr) {
          console.error("JSON Parse error:", jsonErr);
          window.showToast('ไฟล์ชำรุดหรือไม่สามารถถอดรหัสได้!', 'error');
        }
      };
      reader.readAsText(file);
    });
  }

  await renderAdminUsersTable();

  // Load and bind System Activity Logs
  const refreshLogsBtn = document.getElementById('refreshActivityLogsBtn');
  if (refreshLogsBtn) {
    refreshLogsBtn.addEventListener('click', renderActivityLogs);
  }
  renderActivityLogs();
}

export async function renderActivityLogs() {
  const tbody = document.getElementById('adminActivityLogsTableBody');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-secondary); font-style: italic;">
        กำลังโหลดประวัติกิจกรรม...
      </td>
    </tr>
  `;

  const logs = await fetchActivityLogs(50);
  if (logs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-secondary); font-style: italic;">
          ไม่พบประวัติการทำรายการในระบบคลาวด์ขณะนี้
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  logs.forEach(log => {
    // Format timestamp
    let timeText = '-';
    if (log.timestamp) {
      const date = new Date(log.timestamp);
      // Format Thai style: DD/MM/YYYY HH:MM
      const thYear = date.getFullYear() + 543;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      timeText = `${day}/${month}/${thYear} ${hours}:${minutes}`;
    }

    // Action style maps
    let typeBadge = '';
    if (log.actionType.includes('lock')) {
      typeBadge = `<span class="badge" style="background: rgba(251, 80, 18, 0.15); color: var(--post-orange); padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: bold;">🔒 ปิดยอด/ปลดล็อก</span>`;
    } else if (log.actionType.includes('backup')) {
      typeBadge = `<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: var(--post-emerald); padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: bold;">💾 สำรองข้อมูล</span>`;
    } else if (log.actionType.includes('personnel')) {
      typeBadge = `<span class="badge" style="background: rgba(139, 92, 246, 0.15); color: #8b5cf6; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: bold;">👤 จัดการบุคลากร</span>`;
    } else if (log.actionType.includes('attendance')) {
      typeBadge = `<span class="badge" style="background: rgba(59, 130, 246, 0.15); color: var(--post-blue); padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: bold;">📅 เวลาเข้างาน</span>`;
    } else {
      typeBadge = `<span class="badge" style="background: rgba(100, 116, 139, 0.15); color: #64748b; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: bold;">⚙️ อื่นๆ</span>`;
    }

    html += `
      <tr>
        <td style="padding: 0.6rem 0.5rem; border-bottom: 1px solid var(--border-glass); vertical-align: middle; color: var(--text-secondary);">${timeText}</td>
        <td style="padding: 0.6rem 0.5rem; border-bottom: 1px solid var(--border-glass); vertical-align: middle; font-weight: 600;">
          ${log.actorName}<br/>
          <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: normal;">${log.actorEmail}</span>
        </td>
        <td style="padding: 0.6rem 0.5rem; border-bottom: 1px solid var(--border-glass); text-align: center; vertical-align: middle;">${typeBadge}</td>
        <td style="padding: 0.6rem 0.5rem; border-bottom: 1px solid var(--border-glass); vertical-align: middle; font-weight: 500;">${log.description}</td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}


