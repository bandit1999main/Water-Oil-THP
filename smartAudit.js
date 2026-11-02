import {
  fetchEmployees,
  saveEmployees,
  fetchWaterEmployees,
  saveWaterEmployees,
  fetchAttendanceList,
  fetchPersonnelList,
  savePersonnelList
} from './database.js';
import { calculateClaimLiters, calculateMaintenanceCost, renderFuelTable } from './fuelCalculator.js';
import { calculateWaterTax, renderWaterTable } from './waterCalculator.js';

function getActiveMonthYear() {
  const globalMonthSelect = document.getElementById('globalMonth');
  const globalYearSelect = document.getElementById('globalYear');
  const month = globalMonthSelect ? parseInt(globalMonthSelect.value) : parseInt(window.activeMonth || '5');
  const year = globalYearSelect ? parseInt(globalYearSelect.value) : parseInt(window.activeYear || '2569');
  const monthText = globalMonthSelect && globalMonthSelect.selectedIndex >= 0
    ? globalMonthSelect.options[globalMonthSelect.selectedIndex].text
    : `เดือนที่ ${month}`;
  return { month, year, monthText };
}

export async function runMonthlyAudit() {
  const { month, year, monthText } = getActiveMonthYear();

  const fuelList = Array.isArray(window.employees) && window.employees.length > 0
    ? window.employees
    : await fetchEmployees();
  const waterList = Array.isArray(window.waterEmployees) && window.waterEmployees.length > 0
    ? window.waterEmployees
    : await fetchWaterEmployees();

  window.employees = fuelList;
  window.waterEmployees = waterList;

  let attList = [];
  try {
    attList = await fetchAttendanceList(year, month);
  } catch (e) {
    console.warn('Could not load attendance list for audit:', e);
  }

  let registry = JSON.parse(localStorage.getItem('tp_personnel')) || [];
  if (registry.length === 0) {
    try {
      registry = await fetchPersonnelList();
    } catch (e) {
      console.warn('Could not load personnel registry for audit:', e);
    }
  }

  const globalFuelPriceInput = document.getElementById('globalFuelPrice');
  const currentFuelPrice = parseFloat(globalFuelPriceInput ? globalFuelPriceInput.value : (window.defaultFuelPrice || 35.00)) || 35.00;

  const issues = [];

  // ─────────────────────────────────────────────────────────────────────────
  // 1. เช็ควันทำงานเขย่งกันข้ามระบบ (ตารางลงเวลา vs ค่าน้ำมัน vs ค่าน้ำดื่ม)
  // ─────────────────────────────────────────────────────────────────────────
  const allNames = new Set();
  fuelList.forEach(item => {
    if (!item.isSubstitute && item.formMode !== 'supervisor' && item.name) {
      allNames.add(item.name.trim());
    }
  });
  waterList.forEach(item => {
    if (item.name) allNames.add(item.name.trim());
  });

  allNames.forEach(name => {
    const fuelIdx = fuelList.findIndex(f => !f.isSubstitute && f.formMode !== 'supervisor' && (f.name || '').trim() === name);
    const waterIdx = waterList.findIndex(w => (w.name || '').trim() === name);
    const attRec = attList.find(a => (a.name || '').trim() === name);

    const fuelItem = fuelIdx !== -1 ? fuelList[fuelIdx] : null;
    const waterItem = waterIdx !== -1 ? waterList[waterIdx] : null;
    const attDays = attRec && Array.isArray(attRec.checkedDays) ? attRec.checkedDays.length : null;

    const isMonthlyStaff = fuelItem && (fuelItem.position === 'พนักงาน' || fuelItem.position === 'ลูกจ้างประจำ' || fuelItem.position === 'หน.ปณ.') && fuelItem.method === 'monthly';

    const fuelDays = fuelItem ? Number(fuelItem.workDays || 0) : null;
    const waterDays = waterItem ? Number(waterItem.workDays || 0) : null;

    let mismatchFound = false;
    const details = [];

    if (attDays !== null && attDays > 0) {
      if (waterDays !== null && waterDays !== attDays) {
        mismatchFound = true;
        details.push(`ตารางลงเวลา = ${attDays} วัน แต่ค่าน้ำดื่ม = ${waterDays} วัน`);
      }
      if (fuelDays !== null && !isMonthlyStaff && fuelDays !== attDays) {
        mismatchFound = true;
        details.push(`ตารางลงเวลา = ${attDays} วัน แต่ค่าน้ำมัน = ${fuelDays} วัน`);
      }
    }

    if (fuelDays !== null && waterDays !== null && !isMonthlyStaff && fuelDays !== waterDays) {
      mismatchFound = true;
      details.push(`ค่าน้ำมันเบิก ${fuelDays} วัน แต่ค่าน้ำดื่มเบิก ${waterDays} วัน`);
    }

    if (mismatchFound) {
      issues.push({
        id: `mismatch_${name}`,
        category: 'attendance_mismatch',
        severity: 'warning',
        title: `วันทำงานไม่ตรงกัน: ${name}`,
        description: details.join(' | '),
        meta: {
          name,
          fuelIdx,
          waterIdx,
          attDays,
          fuelDays,
          waterDays,
          isMonthlyStaff
        }
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. เช็คยอด "คนวิ่งแทน" เทียบกับ "เจ้าของด้านจ่าย"
  // ─────────────────────────────────────────────────────────────────────────
  const substitutesByRoute = {};
  fuelList.forEach((item, idx) => {
    if (item.isSubstitute && item.route) {
      const r = String(item.route).trim();
      if (!substitutesByRoute[r]) substitutesByRoute[r] = [];
      substitutesByRoute[r].push({ item, idx });
    }
  });

  Object.keys(substitutesByRoute).forEach(route => {
    const subEntries = substitutesByRoute[route];
    const totalSubDays = subEntries.reduce((acc, s) => acc + Number(s.item.workDays || 0), 0);
    const subNames = subEntries.map(s => `${s.item.name} (${s.item.workDays} วัน)`).join(', ');

    const ownerIdx = fuelList.findIndex(f => !f.isSubstitute && f.formMode !== 'supervisor' && String(f.route || '').trim() === route);
    if (ownerIdx !== -1) {
      const owner = fuelList[ownerIdx];
      const pos = (owner.position || '').trim();
      const isStaffMonthly = (pos === 'พนักงาน' || pos === 'ลูกจ้างประจำ' || pos === 'หน.ปณ.') && owner.method === 'monthly';

      if (isStaffMonthly) {
        const ownerNotWorked = Number(owner.daysNotWorked || 0);
        if (ownerNotWorked < totalSubDays) {
          issues.push({
            id: `sub_conflict_staff_${route}`,
            category: 'route_substitute_conflict',
            severity: 'danger',
            title: `ด้านจ่ายที่ ${route}: เจ้าของด้านจ่ายหักวันไม่ได้นำรถมาใช้น้อยกว่าวันวิ่งแทน`,
            description: `เจ้าของด้านจ่าย (${owner.name}) ระบุวันไม่ได้นำรถมาใช้ ${ownerNotWorked} วัน แต่มีคนวิ่งแทนในด้านจ่ายที่ ${route} รวม ${totalSubDays} วัน (${subNames})`,
            meta: {
              route,
              ownerIdx,
              ownerName: owner.name,
              ownerNotWorked,
              totalSubDays,
              conflictType: 'staff_not_worked'
            }
          });
        }
      } else {
        const ownerWorkDays = Number(owner.workDays || 0);
        if (ownerWorkDays + totalSubDays > 27) {
          issues.push({
            id: `sub_conflict_daily_${route}`,
            category: 'route_substitute_conflict',
            severity: 'warning',
            title: `ด้านจ่ายที่ ${route}: รวมวันทำงานเจ้าของด้านจ่าย + คนวิ่งแทน เกินเกณฑ์ปกติ (${ownerWorkDays + totalSubDays} วัน)`,
            description: `เจ้าของด้านจ่าย (${owner.name}) เบิก ${ownerWorkDays} วัน + วิ่งแทนรวม ${totalSubDays} วัน (${subNames}) รวมเป็น ${ownerWorkDays + totalSubDays} วัน`,
            meta: {
              route,
              ownerIdx,
              ownerName: owner.name,
              ownerWorkDays,
              totalSubDays,
              conflictType: 'daily_exceeded'
            }
          });
        }
      }
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. เช็คข้อมูล "ใบหักภาษี 50 ทวิ" (เลขประจำตัวผู้เสียภาษี 13 หลัก & ที่อยู่)
  // ─────────────────────────────────────────────────────────────────────────
  waterList.forEach((wItem, wIdx) => {
    const allowance = Number(wItem.workDays || 0) * (window.waterAllowancePerDay || 30);
    const tax = calculateWaterTax(Number(wItem.salary || 0), allowance);
    if (tax > 0) {
      const regIdx = registry.findIndex(p => (p.name || '').trim() === (wItem.name || '').trim());
      const regPerson = regIdx !== -1 ? registry[regIdx] : null;
      const cleanTaxId = (regPerson?.taxId || '').replace(/\D/g, '');
      const address = (regPerson?.address || '').trim();

      const hasValidTaxId = cleanTaxId.length === 13;
      const hasValidAddress = address.length >= 5 && address !== '-';

      if (!hasValidTaxId || !hasValidAddress) {
        const missingParts = [];
        if (!hasValidTaxId) missingParts.push('เลขประจำตัวผู้เสียภาษี 13 หลัก');
        if (!hasValidAddress) missingParts.push('ที่อยู่ตามทะเบียน');

        issues.push({
          id: `tax50_${wItem.name}`,
          category: 'missing_tax_info',
          severity: 'warning',
          title: `ข้อมูล 50 ทวิ ไม่ครบ: ${wItem.name} (ถูกหักภาษี ${tax.toFixed(2)} บาท)`,
          description: `ยังขาดข้อมูล: ${missingParts.join(' และ ')} สำหรับพิมพ์หนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ)`,
          meta: {
            name: wItem.name,
            waterIdx: wIdx,
            regIdx,
            currentTaxId: regPerson?.taxId || '',
            currentAddress: regPerson?.address || ''
          }
        });
      }
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. เช็ครายการผิดปกติอื่นๆ (ชื่อซ้ำ, ยอด 0 บาท)
  // ─────────────────────────────────────────────────────────────────────────
  const seenRegularFuel = new Map();
  fuelList.forEach((item, idx) => {
    if (!item.isSubstitute && item.formMode !== 'supervisor') {
      const key = `${(item.name || '').trim()}_${item.route || ''}`;
      if (seenRegularFuel.has(key)) {
        issues.push({
          id: `dup_fuel_${idx}`,
          category: 'other_anomalies',
          severity: 'danger',
          title: `พบชื่อซ้ำในตารางเบิกค่าน้ำมัน: ${item.name} (ด้านจ่ายที่ ${item.route || '-'})`,
          description: `ปรากฏซ้ำในแถวที่ ${seenRegularFuel.get(key) + 1} และแถวที่ ${idx + 1}`,
          meta: { anomalyType: 'dup_fuel', index: idx, name: item.name }
        });
      } else {
        seenRegularFuel.set(key, idx);
      }
    }

    const liters = calculateClaimLiters(item);
    const fuelCost = Math.round(liters * currentFuelPrice * 100) / 100;
    const maintCost = Math.round(calculateMaintenanceCost(item) * 100) / 100;
    const sumTotal = Math.round((fuelCost + maintCost) * 100) / 100;

    if (sumTotal <= 0) {
      issues.push({
        id: `zero_fuel_${idx}`,
        category: 'other_anomalies',
        severity: 'info',
        title: `มียอดเบิกค่าน้ำมัน 0.00 บาท: ${item.name}`,
        description: `รายการของ ${item.name} (${item.isSubstitute ? 'วิ่งแทน' : (item.formMode === 'supervisor' ? 'ชนจ.' : 'ปกติ')}) มียอดรวมสุทธิ 0.00 บาท`,
        meta: { anomalyType: 'zero_fuel', index: idx, name: item.name }
      });
    }
  });

  const seenWater = new Map();
  waterList.forEach((item, idx) => {
    const key = (item.name || '').trim();
    if (seenWater.has(key)) {
      issues.push({
        id: `dup_water_${idx}`,
        category: 'other_anomalies',
        severity: 'danger',
        title: `พบชื่อซ้ำในตารางเบิกค่าน้ำดื่ม: ${item.name}`,
        description: `ปรากฏซ้ำในแถวที่ ${seenWater.get(key) + 1} และแถวที่ ${idx + 1}`,
        meta: { anomalyType: 'dup_water', index: idx, name: item.name }
      });
    } else {
      seenWater.set(key, idx);
    }

    if (Number(item.workDays || 0) <= 0) {
      issues.push({
        id: `zero_water_${idx}`,
        category: 'other_anomalies',
        severity: 'info',
        title: `มียอดเบิกค่าน้ำดื่ม 0.00 บาท (0 วันทำงาน): ${item.name}`,
        description: `รายการค่าน้ำดื่มของ ${item.name} มีจำนวนวันทำงาน 0 วัน`,
        meta: { anomalyType: 'zero_water', index: idx, name: item.name }
      });
    }
  });

  return {
    month,
    year,
    monthText,
    issues,
    counts: {
      total: issues.length,
      attendance_mismatch: issues.filter(i => i.category === 'attendance_mismatch').length,
      route_substitute_conflict: issues.filter(i => i.category === 'route_substitute_conflict').length,
      missing_tax_info: issues.filter(i => i.category === 'missing_tax_info').length,
      other_anomalies: issues.filter(i => i.category === 'other_anomalies').length
    }
  };
}

function ensureSmartAuditModalExists() {
  let modal = document.getElementById('smartAuditModal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'smartAuditModal';
  modal.className = 'modal-overlay';
  modal.style.zIndex = '4800';
  modal.innerHTML = `
    <div class="modal-content glass-modal animate-slide-in" style="max-width: 880px; width: 95%; max-height: 88vh; display: flex; flex-direction: column;">
      <div class="modal-header" style="border-bottom: 1px solid var(--border-glass); padding-bottom: 0.85rem;">
        <div style="display: flex; align-items: center; gap: 0.6rem;">
          <span style="font-size: 1.5rem;">🔍</span>
          <div>
            <h3 id="smartAuditModalTitle" style="margin: 0; font-size: 1.15rem; font-weight: 800; color: var(--text-primary);">ระบบตรวจสอบความถูกต้องอัตโนมัติ (Smart Audit)</h3>
            <p id="smartAuditModalSubtitle" style="margin: 0.15rem 0 0 0; font-size: 0.8rem; color: var(--text-secondary);">ตรวจสอบความสอดคล้องของวันทำงาน คนวิ่งแทน และข้อมูลภาษี 50 ทวิ</p>
          </div>
        </div>
        <button type="button" id="closeSmartAuditModalBtn" class="btn-close">&times;</button>
      </div>
      <div id="smartAuditModalBody" class="modal-body" style="overflow-y: auto; padding: 1.25rem; flex: 1;"></div>
      <div id="smartAuditModalFooter" class="modal-footer" style="border-top: 1px solid var(--border-glass); padding-top: 0.85rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;"></div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#closeSmartAuditModalBtn').addEventListener('click', () => {
    modal.classList.remove('active');
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });

  return modal;
}

export async function openSmartAuditModal(options = {}) {
  const { onProceed = null, actionLabel = '' } = options;
  const modal = ensureSmartAuditModalExists();
  const bodyEl = modal.querySelector('#smartAuditModalBody');
  const footerEl = modal.querySelector('#smartAuditModalFooter');
  const subtitleEl = modal.querySelector('#smartAuditModalSubtitle');

  bodyEl.innerHTML = `<div style="text-align: center; padding: 2.5rem; color: var(--text-secondary);">⏳ กำลังวิเคราะห์และตรวจสอบความถูกต้องของข้อมูลประจำเดือน...</div>`;
  modal.classList.add('active');

  const auditResult = await runMonthlyAudit();
  const { monthText, year, issues, counts } = auditResult;

  subtitleEl.textContent = `ประจำเดือน ${monthText} พ.ศ. ${year} • พบจุดสังเกตทั้งหมด ${counts.total} รายการ`;

  const refreshView = async () => {
    if (window.activeMode === 'fuel') renderFuelTable();
    else if (window.activeMode === 'water') renderWaterTable();
    await openSmartAuditModal(options);
  };

  if (issues.length === 0) {
    bodyEl.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1.5rem; background: rgba(16, 185, 129, 0.06); border: 1.5px solid rgba(16, 185, 129, 0.25); border-radius: 14px;">
        <div style="font-size: 3rem; margin-bottom: 0.5rem;">✅</div>
        <h4 style="margin: 0 0 0.4rem 0; font-size: 1.15rem; font-weight: 800; color: var(--post-emerald);">ข้อมูลประจำเดือน ${monthText} ${year} ถูกต้องครบถ้วนสมบูรณ์!</h4>
        <p style="margin: 0; font-size: 0.9rem; color: var(--text-secondary);">ไม่พบวันทำงานเขย่งกัน ไม่พบยอดวิ่งแทนชนกับเจ้าของด้านจ่าย และข้อมูลภาษี 50 ทวิ ครบถ้วนทุกท่าน</p>
      </div>
    `;
  } else {
    const preflightBanner = onProceed ? `
      <div style="margin-bottom: 1rem; padding: 0.85rem 1rem; border-radius: 10px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.35); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
        <div style="font-size: 0.88rem; color: var(--text-primary);">
          <strong>💡 ระบบตรวจพบจุดสังเกต ${counts.total} รายการก่อน${actionLabel}</strong> — คุณสามารถกดปุ่ม <strong>⚡ แก้ไขอัตโนมัติ</strong> ด้านล่าง หรือกดข้ามเพื่อ${actionLabel}ต่อได้ทันที
        </div>
      </div>
    ` : '';

    const kpiBadges = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(175px, 1fr)); gap: 0.65rem; margin-bottom: 1.1rem;">
        <div style="padding: 0.65rem 0.85rem; border-radius: 10px; background: rgba(2, 132, 199, 0.08); border: 1px solid rgba(2, 132, 199, 0.25);">
          <div style="font-size: 0.75rem; color: var(--text-secondary);">📅 วันทำงานไม่ตรงกัน</div>
          <div style="font-size: 1.15rem; font-weight: 800; color: #0284c7;">${counts.attendance_mismatch} รายการ</div>
        </div>
        <div style="padding: 0.65rem 0.85rem; border-radius: 10px; background: rgba(220, 38, 38, 0.08); border: 1px solid rgba(220, 38, 38, 0.25);">
          <div style="font-size: 0.75rem; color: var(--text-secondary);">🏃 วิ่งแทน vs เจ้าของด้านจ่าย</div>
          <div style="font-size: 1.15rem; font-weight: 800; color: #dc2626;">${counts.route_substitute_conflict} รายการ</div>
        </div>
        <div style="padding: 0.65rem 0.85rem; border-radius: 10px; background: rgba(217, 119, 6, 0.08); border: 1px solid rgba(217, 119, 6, 0.25);">
          <div style="font-size: 0.75rem; color: var(--text-secondary);">🧾 ข้อมูลภาษี 50 ทวิ ไม่ครบ</div>
          <div style="font-size: 1.15rem; font-weight: 800; color: #d97706;">${counts.missing_tax_info} รายการ</div>
        </div>
        <div style="padding: 0.65rem 0.85rem; border-radius: 10px; background: rgba(100, 116, 139, 0.08); border: 1px solid rgba(100, 116, 139, 0.25);">
          <div style="font-size: 0.75rem; color: var(--text-secondary);">⚠️ ชื่อซ้ำ / ยอด 0 บาท</div>
          <div style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary);">${counts.other_anomalies} รายการ</div>
        </div>
      </div>
    `;

    const cardsHtml = issues.map((issue, idx) => {
      const borderCol = issue.severity === 'danger' ? 'rgba(239, 68, 68, 0.4)' : (issue.severity === 'warning' ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-glass)');
      const badgeIcon = issue.category === 'attendance_mismatch' ? '📅' : (issue.category === 'route_substitute_conflict' ? '🏃' : (issue.category === 'missing_tax_info' ? '🧾' : '⚠️'));

      let actionsHtml = '';
      if (issue.category === 'attendance_mismatch') {
        const m = issue.meta;
        const btns = [];
        if (m.attDays !== null && m.attDays > 0) {
          btns.push(`<button type="button" class="btn btn-primary btn-small audit-fix-att-btn" data-idx="${idx}" style="padding: 0.3rem 0.65rem; font-size: 0.78rem; background: #0284c7; border-color: #0284c7;">⚡ ยึดตามตารางลงเวลา (${m.attDays} วัน)</button>`);
        }
        if (m.fuelIdx !== -1 && m.waterIdx !== -1 && !m.isMonthlyStaff && m.fuelDays !== m.waterDays) {
          btns.push(`<button type="button" class="btn btn-secondary btn-small audit-fix-water-to-fuel-btn" data-idx="${idx}" style="padding: 0.3rem 0.65rem; font-size: 0.78rem; border-color: var(--post-orange); color: var(--post-orange);">⚡ ปรับค่าน้ำดื่ม = ค่าน้ำมัน (${m.fuelDays} วัน)</button>`);
          btns.push(`<button type="button" class="btn btn-secondary btn-small audit-fix-fuel-to-water-btn" data-idx="${idx}" style="padding: 0.3rem 0.65rem; font-size: 0.78rem;">⚡ ปรับค่าน้ำมัน = ค่าน้ำดื่ม (${m.waterDays} วัน)</button>`);
        }
        actionsHtml = `<div style="display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.5rem;">${btns.join('')}</div>`;
      } else if (issue.category === 'route_substitute_conflict') {
        const m = issue.meta;
        if (m.conflictType === 'staff_not_worked') {
          actionsHtml = `
            <div style="margin-top: 0.5rem;">
              <button type="button" class="btn btn-primary btn-small audit-fix-sub-staff-btn" data-idx="${idx}" style="padding: 0.3rem 0.75rem; font-size: 0.78rem; background: var(--post-emerald); border-color: var(--post-emerald);">
                ⚡ ปรับวันไม่ได้นำรถมาใช้ของ ${m.ownerName} เป็น ${m.totalSubDays} วัน (ตรงกับวันวิ่งแทน)
              </button>
            </div>
          `;
        } else {
          const suggestedDays = Math.max(0, 26 - m.totalSubDays);
          actionsHtml = `
            <div style="margin-top: 0.5rem;">
              <button type="button" class="btn btn-secondary btn-small audit-fix-sub-daily-btn" data-idx="${idx}" style="padding: 0.3rem 0.75rem; font-size: 0.78rem; border-color: var(--post-orange); color: var(--post-orange);">
                ⚡ ปรับวันทำงานของ ${m.ownerName} เป็น ${suggestedDays} วัน (26 - ${m.totalSubDays} วันวิ่งแทน)
              </button>
            </div>
          `;
        }
      } else if (issue.category === 'missing_tax_info') {
        const m = issue.meta;
        actionsHtml = `
          <div style="margin-top: 0.6rem; display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; background: rgba(0,0,0,0.03); padding: 0.5rem 0.65rem; border-radius: 8px;">
            <input type="text" id="auditTaxId_${idx}" class="form-input" placeholder="เลขผู้เสียภาษี 13 หลัก" maxlength="13" value="${m.currentTaxId || ''}" style="width: 175px; padding: 0.3rem 0.5rem; font-size: 0.8rem; margin: 0;" />
            <input type="text" id="auditAddress_${idx}" class="form-input" placeholder="ที่อยู่ตามทะเบียนบ้าน (สำหรับใบ 50 ทวิ)" value="${m.currentAddress || ''}" style="flex: 1; min-width: 220px; padding: 0.3rem 0.5rem; font-size: 0.8rem; margin: 0;" />
            <button type="button" class="btn btn-primary btn-small audit-save-tax-btn" data-idx="${idx}" style="padding: 0.35rem 0.75rem; font-size: 0.78rem; background: var(--post-emerald); border-color: var(--post-emerald);">
              💾 บันทึกเข้าทะเบียนประวัติ
            </button>
          </div>
        `;
      } else if (issue.category === 'other_anomalies') {
        const m = issue.meta;
        actionsHtml = `
          <div style="margin-top: 0.5rem;">
            <button type="button" class="btn btn-danger btn-small audit-delete-anomaly-btn" data-idx="${idx}" style="padding: 0.28rem 0.65rem; font-size: 0.76rem;">
              🗑️ ลบรายการนี้ออก
            </button>
          </div>
        `;
      }

      return `
        <div style="padding: 0.85rem 1rem; border-radius: 10px; border: 1px solid ${borderCol}; background: rgba(255,255,255,0.02); margin-bottom: 0.65rem;">
          <div style="font-weight: 700; font-size: 0.92rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.4rem;">
            <span>${badgeIcon}</span>
            <span>${issue.title}</span>
          </div>
          <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.2rem; line-height: 1.45;">
            ${issue.description}
          </div>
          ${actionsHtml}
        </div>
      `;
    }).join('');

    bodyEl.innerHTML = `${preflightBanner}${kpiBadges}<div>${cardsHtml}</div>`;

    const ensureUnlocked = () => {
      if (window.isCurrentMonthLocked) {
        window.showToast('🔒 รอบประจำเดือนนี้ถูกปิดยอดเรียบร้อยแล้ว ไม่สามารถแก้ไขข้อมูลได้', 'warning');
        return false;
      }
      return true;
    };

    // Wire individual Auto-Fix buttons with explicit confirmation dialogs
    bodyEl.querySelectorAll('.audit-fix-att-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!ensureUnlocked()) return;
        const issue = issues[parseInt(btn.dataset.idx)];
        const m = issue.meta;
        window.showConfirm({
          title: '⚡ ยืนยันการซิงค์ตามตารางลงเวลา',
          message: `คุณต้องการปรับจำนวนวันทำงานของ "${m.name}" ให้ตรงกับตารางลงเวลา (${m.attDays} วัน) ใช่หรือไม่?`,
          icon: '📅',
          okText: 'ยืนยันปรับข้อมูล',
          okClass: 'btn-primary',
          onConfirm: async () => {
            if (m.waterIdx !== -1 && window.waterEmployees[m.waterIdx]) {
              window.waterEmployees[m.waterIdx].workDays = m.attDays;
              await saveWaterEmployees(window.waterEmployees);
            }
            if (m.fuelIdx !== -1 && !m.isMonthlyStaff && window.employees[m.fuelIdx]) {
              window.employees[m.fuelIdx].workDays = m.attDays;
              await saveEmployees(window.employees);
            }
            window.showToast(`ซิงค์วันทำงานของ ${m.name} เป็น ${m.attDays} วัน ตามตารางลงเวลาสำเร็จ!`, 'success');
            await refreshView();
          }
        });
      });
    });

    bodyEl.querySelectorAll('.audit-fix-water-to-fuel-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!ensureUnlocked()) return;
        const issue = issues[parseInt(btn.dataset.idx)];
        const m = issue.meta;
        window.showConfirm({
          title: '⚡ ยืนยันการปรับวันทำงานค่าน้ำดื่ม',
          message: `คุณต้องการปรับวันทำงานค่าน้ำดื่มของ "${m.name}" จาก ${m.waterDays} วัน เป็น ${m.fuelDays} วัน (ให้เท่ากับค่าน้ำมัน) ใช่หรือไม่?`,
          icon: '🥤',
          okText: 'ยืนยันปรับข้อมูล',
          okClass: 'btn-primary',
          onConfirm: async () => {
            if (m.waterIdx !== -1 && window.waterEmployees[m.waterIdx]) {
              window.waterEmployees[m.waterIdx].workDays = m.fuelDays;
              await saveWaterEmployees(window.waterEmployees);
              window.showToast(`ปรับวันทำงานค่าน้ำดื่มของ ${m.name} เป็น ${m.fuelDays} วัน สำเร็จ!`, 'success');
              await refreshView();
            }
          }
        });
      });
    });

    bodyEl.querySelectorAll('.audit-fix-fuel-to-water-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!ensureUnlocked()) return;
        const issue = issues[parseInt(btn.dataset.idx)];
        const m = issue.meta;
        window.showConfirm({
          title: '⚡ ยืนยันการปรับวันทำงานค่าน้ำมัน',
          message: `คุณต้องการปรับวันทำงานค่าน้ำมันของ "${m.name}" จาก ${m.fuelDays} วัน เป็น ${m.waterDays} วัน (ให้เท่ากับค่าน้ำดื่ม) ใช่หรือไม่?`,
          icon: '⛽',
          okText: 'ยืนยันปรับข้อมูล',
          okClass: 'btn-primary',
          onConfirm: async () => {
            if (m.fuelIdx !== -1 && window.employees[m.fuelIdx]) {
              window.employees[m.fuelIdx].workDays = m.waterDays;
              await saveEmployees(window.employees);
              window.showToast(`ปรับวันทำงานค่าน้ำมันของ ${m.name} เป็น ${m.waterDays} วัน สำเร็จ!`, 'success');
              await refreshView();
            }
          }
        });
      });
    });

    bodyEl.querySelectorAll('.audit-fix-sub-staff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!ensureUnlocked()) return;
        const issue = issues[parseInt(btn.dataset.idx)];
        const m = issue.meta;
        window.showConfirm({
          title: '⚡ ยืนยันการปรับวันไม่ได้นำรถมาใช้',
          message: `คุณต้องการปรับ "วันไม่ได้นำรถมาใช้" ของเจ้าของด้านจ่ายที่ ${m.route} (${m.ownerName}) จาก ${m.ownerNotWorked} วัน เป็น ${m.totalSubDays} วัน เพื่อให้ตรงกับวันวิ่งแทนใช่หรือไม่?`,
          icon: '🏃',
          okText: 'ยืนยันปรับข้อมูล',
          okClass: 'btn-primary',
          onConfirm: async () => {
            if (window.employees[m.ownerIdx]) {
              window.employees[m.ownerIdx].daysNotWorked = m.totalSubDays;
              await saveEmployees(window.employees);
              window.showToast(`ปรับวันไม่ได้นำรถมาใช้ของ ${m.ownerName} เป็น ${m.totalSubDays} วัน สำเร็จ!`, 'success');
              await refreshView();
            }
          }
        });
      });
    });

    bodyEl.querySelectorAll('.audit-fix-sub-daily-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!ensureUnlocked()) return;
        const issue = issues[parseInt(btn.dataset.idx)];
        const m = issue.meta;
        const suggestedDays = Math.max(0, 26 - m.totalSubDays);
        window.showConfirm({
          title: '⚡ ยืนยันการปรับวันทำงานเจ้าของด้านจ่าย',
          message: `คุณต้องการปรับวันทำงานของ "${m.ownerName}" (ด้านจ่ายที่ ${m.route}) จาก ${m.ownerWorkDays} วัน เป็น ${suggestedDays} วัน (หักวันวิ่งแทน ${m.totalSubDays} วัน) ใช่หรือไม่?`,
          icon: '🏃',
          okText: 'ยืนยันปรับข้อมูล',
          okClass: 'btn-primary',
          onConfirm: async () => {
            if (window.employees[m.ownerIdx]) {
              window.employees[m.ownerIdx].workDays = suggestedDays;
              await saveEmployees(window.employees);
              window.showToast(`ปรับวันทำงานของ ${m.ownerName} เป็น ${suggestedDays} วัน สำเร็จ!`, 'success');
              await refreshView();
            }
          }
        });
      });
    });

    bodyEl.querySelectorAll('.audit-save-tax-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const issue = issues[idx];
        const m = issue.meta;
        const taxIdVal = (document.getElementById(`auditTaxId_${idx}`)?.value || '').replace(/\D/g, '');
        const addrVal = (document.getElementById(`auditAddress_${idx}`)?.value || '').trim();

        if (taxIdVal.length !== 13) {
          window.showToast('กรุณากรอกเลขประจำตัวผู้เสียภาษีให้ครบ 13 หลัก', 'warning');
          return;
        }
        if (addrVal.length < 5) {
          window.showToast('กรุณากรอกที่อยู่สำหรับออกใบ 50 ทวิ', 'warning');
          return;
        }

        window.showConfirm({
          title: '💾 ยืนยันบันทึกข้อมูล 50 ทวิ',
          message: `คุณต้องการบันทึกเลขผู้เสียภาษี (${taxIdVal}) และที่อยู่ของ "${m.name}" ลงในทะเบียนประวัติบุคลากรใช่หรือไม่?`,
          icon: '🧾',
          okText: 'บันทึกข้อมูล',
          okClass: 'btn-primary',
          onConfirm: async () => {
            let regList = JSON.parse(localStorage.getItem('tp_personnel')) || [];
            const pIdx = regList.findIndex(p => (p.name || '').trim() === m.name.trim());
            if (pIdx !== -1) {
              regList[pIdx].taxId = taxIdVal;
              regList[pIdx].address = addrVal;
            } else {
              regList.push({
                name: m.name,
                position: window.waterEmployees[m.waterIdx]?.position || 'พนักงาน',
                duty: window.waterEmployees[m.waterIdx]?.duty || 'นำจ่าย',
                salary: window.waterEmployees[m.waterIdx]?.salary || 0,
                taxId: taxIdVal,
                address: addrVal
              });
            }
            localStorage.setItem('tp_personnel', JSON.stringify(regList));
            window.personnel = regList;
            await savePersonnelList(regList);
            window.showToast(`บันทึกข้อมูล 50 ทวิ ของ ${m.name} สำเร็จ!`, 'success');
            await refreshView();
          }
        });
      });
    });

    bodyEl.querySelectorAll('.audit-delete-anomaly-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!ensureUnlocked()) return;
        const issue = issues[parseInt(btn.dataset.idx)];
        const m = issue.meta;
        window.showConfirm({
          title: '🗑️ ยืนยันการลบรายการผิดปกติ',
          message: `คุณแน่ใจหรือไม่ว่าต้องการลบรายการของ "${m.name}" (${issue.title}) ออกจากตารางเดือนนี้?`,
          icon: '🗑️',
          okText: 'ยืนยันลบรายการ',
          okClass: 'btn-danger',
          onConfirm: async () => {
            if (m.anomalyType === 'dup_fuel' || m.anomalyType === 'zero_fuel') {
              window.employees.splice(m.index, 1);
              await saveEmployees(window.employees);
            } else if (m.anomalyType === 'dup_water' || m.anomalyType === 'zero_water') {
              window.waterEmployees.splice(m.index, 1);
              await saveWaterEmployees(window.waterEmployees);
            }
            window.showToast(`ลบรายการของ ${m.name} เรียบร้อยแล้ว!`, 'success');
            await refreshView();
          }
        });
      });
    });
  }

  // Render Footer buttons
  const canBulkAutoFix = issues.some(i =>
    (i.category === 'attendance_mismatch' && ((i.meta.attDays && i.meta.attDays > 0) || (i.meta.fuelIdx !== -1 && i.meta.waterIdx !== -1))) ||
    (i.category === 'route_substitute_conflict' && i.meta.conflictType === 'staff_not_worked')
  );

  footerEl.innerHTML = `
    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
      ${canBulkAutoFix ? `
        <button type="button" id="auditBulkAutoFixBtn" class="btn btn-primary btn-small" style="background: var(--post-emerald); border-color: var(--post-emerald); font-weight: 700;">
          ⚡ แก้ไขอัตโนมัติทั้งหมดที่ซิงค์ได้
        </button>
      ` : ''}
    </div>
    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
      <button type="button" id="auditCloseFooterBtn" class="btn btn-secondary btn-small">ปิดหน้าต่าง</button>
      ${onProceed ? `
        <button type="button" id="auditProceedAnywayBtn" class="btn btn-primary btn-small" style="background: var(--post-orange); border-color: var(--post-orange); font-weight: 700;">
          ${issues.length === 0 ? `✔️ ${actionLabel}ทันที` : `⏩ ข้ามคำเตือนและ${actionLabel}ต่อทันที`}
        </button>
      ` : ''}
    </div>
  `;

  footerEl.querySelector('#auditCloseFooterBtn')?.addEventListener('click', () => {
    modal.classList.remove('active');
  });

  footerEl.querySelector('#auditProceedAnywayBtn')?.addEventListener('click', () => {
    modal.classList.remove('active');
    onProceed();
  });

  footerEl.querySelector('#auditBulkAutoFixBtn')?.addEventListener('click', () => {
    if (window.isCurrentMonthLocked) {
      window.showToast('🔒 รอบประจำเดือนนี้ถูกปิดยอดเรียบร้อยแล้ว ไม่สามารถแก้ไขข้อมูลได้', 'warning');
      return;
    }

    const fixableCount = issues.filter(i =>
      (i.category === 'attendance_mismatch' && ((i.meta.attDays && i.meta.attDays > 0) || (i.meta.fuelIdx !== -1 && i.meta.waterIdx !== -1))) ||
      (i.category === 'route_substitute_conflict' && i.meta.conflictType === 'staff_not_worked')
    ).length;

    window.showConfirm({
      title: '⚡ ยืนยันการแก้ไขอัตโนมัติทั้งหมด',
      message: `คุณต้องการให้ระบบปรับปรุงข้อมูลวันทำงานและวันไม่ได้นำรถมาใช้โดยอัตโนมัติรวม ${fixableCount} รายการใช่หรือไม่?`,
      icon: '⚡',
      okText: 'ยืนยันแก้ไขทั้งหมด',
      okClass: 'btn-primary',
      onConfirm: async () => {
        let fixedCount = 0;
        let fuelChanged = false;
        let waterChanged = false;

        issues.forEach(issue => {
          if (issue.category === 'attendance_mismatch') {
            const m = issue.meta;
            if (m.attDays !== null && m.attDays > 0) {
              if (m.waterIdx !== -1 && window.waterEmployees[m.waterIdx]) {
                window.waterEmployees[m.waterIdx].workDays = m.attDays;
                waterChanged = true;
                fixedCount++;
              }
              if (m.fuelIdx !== -1 && !m.isMonthlyStaff && window.employees[m.fuelIdx]) {
                window.employees[m.fuelIdx].workDays = m.attDays;
                fuelChanged = true;
                fixedCount++;
              }
            } else if (m.fuelIdx !== -1 && m.waterIdx !== -1 && !m.isMonthlyStaff) {
              window.waterEmployees[m.waterIdx].workDays = m.fuelDays;
              waterChanged = true;
              fixedCount++;
            }
          } else if (issue.category === 'route_substitute_conflict' && issue.meta.conflictType === 'staff_not_worked') {
            const m = issue.meta;
            if (window.employees[m.ownerIdx]) {
              window.employees[m.ownerIdx].daysNotWorked = m.totalSubDays;
              fuelChanged = true;
              fixedCount++;
            }
          }
        });

        if (fuelChanged) await saveEmployees(window.employees);
        if (waterChanged) await saveWaterEmployees(window.waterEmployees);

        window.showToast(`แก้ไขอัตโนมัติสำเร็จ ${fixedCount} จุด!`, 'success');
        await refreshView();
      }
    });
  });
}

export async function runSmartAuditBeforeAction(actionLabel, onProceed) {
  try {
    const auditResult = await runMonthlyAudit();
    if (auditResult.issues.length === 0) {
      onProceed();
    } else {
      await openSmartAuditModal({ onProceed, actionLabel });
    }
  } catch (e) {
    console.warn('Smart Audit check failed, proceeding directly:', e);
    onProceed();
  }
}

window.openSmartAuditModal = openSmartAuditModal;
window.runSmartAuditBeforeAction = runSmartAuditBeforeAction;
