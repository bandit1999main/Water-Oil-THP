import {
  isCloudConnected,
  fetchUsersList,
  saveUserRole,
  deleteUserMetadata,
  checkIsAdmin,
  fetchGlobalConfigs,
  saveGlobalConfigs
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
            <div class="card-header" style="margin-bottom: 1rem; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.5rem;">
              <span class="card-icon">⚙️</span>
              <h3 style="font-size: 1.1rem; font-weight: 700;">การตั้งค่าตัวแปรกลางของระบบ (System Configuration)</h3>
            </div>
            <div style="display: flex; flex-direction: column; gap: 1.2rem;">
              <div class="form-group" style="max-width: 400px; display: flex; flex-direction: column; gap: 0.4rem;">
                <label for="adminWaterAllowance" style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary);">เงินสวัสดิการค่าน้ำดื่มรายวัน (บาท / วัน):</label>
                <input type="number" id="adminWaterAllowance" class="form-input" style="width: 100%; padding: 0.6rem; border-radius: 8px; border: 1px solid var(--border-glass); background: rgba(0,0,0,0.02); color: var(--text-primary);" min="1" step="1" value="30" />
                <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0;">* อัตรานี้จะนำไปใช้คำนวณเงินค่าน้ำดื่มพนักงาน: วันทำงานจริง × อัตราค่าน้ำดื่มต่อวัน</p>
              </div>
              <button id="saveAdminConfigBtn" class="btn btn-primary" style="align-self: flex-start; padding: 0.5rem 1.5rem; font-weight: 700; border-radius: 8px; background: var(--post-orange); color: white; border: none; cursor: pointer;">💾 บันทึกการตั้งค่า</button>
            </div>
          </div>
  </div>
</div>`;
}

export async function initAdminPanel() {
  const allowanceInput = document.getElementById('adminWaterAllowance');
  const saveConfigBtn = document.getElementById('saveAdminConfigBtn');

  if (allowanceInput && saveConfigBtn) {
    const configs = await fetchGlobalConfigs();
    allowanceInput.value = configs.waterAllowancePerDay || 30;

    saveConfigBtn.addEventListener('click', async () => {
      const rate = parseInt(allowanceInput.value);
      if (isNaN(rate) || rate <= 0) {
        window.showToast('กรุณาระบุตัวเลขค่าน้ำดื่มต่อวันที่ถูกต้อง!', 'error');
        return;
      }
      window.showToast('กำลังบันทึกการตั้งค่า...', 'info');
      const success = await saveGlobalConfigs({ waterAllowancePerDay: rate });
      if (success) {
        window.showToast('บันทึกการตั้งค่าตัวแปรระบบสำเร็จ!', 'success');
      } else {
        window.showToast('บันทึกการตั้งค่าล้มเหลว!', 'error');
      }
    });
  }

  await renderAdminUsersTable();
}

