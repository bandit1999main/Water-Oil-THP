import {
  saveEmployees,
  fetchEmployees
} from './database.js';

// Helpers to read/write global state on window
function getEmployees() {
  return window.employees || [];
}
function setEmployees(val) {
  window.employees = val;
}
function getRouteData() {
  return window.ROUTE_DATA || {};
}

let tempMissions = [];
let oilPricePeriods = [];

export function calculateClaimLiters(item) {
  if (item.vehicle === 'ไม่ได้ใช้งาน') return 0;
  const ROUTE_DATA = getRouteData();
  if (item.formMode === 'supervisor') {
    let otherLiters = 0;
    let rawInspectionLiters = 0;
    
    item.missions.forEach(m => {
      const routeInfo = ROUTE_DATA[m.route];
      const dailyLiters = routeInfo ? routeInfo.workerLiters : 0;
      
      if (m.type === 'ตรวจสอบการนำจ่าย') {
        rawInspectionLiters += dailyLiters * m.days;
      } else {
        otherLiters += dailyLiters * m.days;
      }
    });
    
    const totalLiters = otherLiters + Math.ceil(rawInspectionLiters / 2);
    return Number(totalLiters.toFixed(2));
  }

  const route = ROUTE_DATA[item.route];
  if (!route) return 0;

  const isStaff = item.position === 'พนักงาน' || item.position === 'ลูกจ้างประจำ';
  
  if (item.method === 'monthly') {
    return isStaff ? route.staffLiters : (route.workerLiters * item.workDays);
  } else {
    if (isStaff) {
      return Number(((route.staffLiters / 26) * item.workDays).toFixed(2));
    } else {
      return Number((route.workerLiters * item.workDays).toFixed(2));
    }
  }
}

export function calculateSingleMissionMaint(item, m) {
  const ROUTE_DATA = getRouteData();
  const route = ROUTE_DATA[m.route];
  if (!route) return 0;

  const dailyDist = m.type === 'ตรวจสอบการนำจ่าย' ? (route.workerDist / 2) : route.workerDist;
  
  let tier = '';
  if (dailyDist <= 40) tier = '1-40';
  else if (dailyDist <= 70) tier = '41-70';
  else if (dailyDist <= 100) tier = '71-100';
  else tier = '101+';

  if (item.vehicle === 'รถยนต์') {
    return m.distance * 2.25;
  } else if (item.vehicle === 'เรือยนต์') {
    return 48 * m.days;
  } else {
    const rates = {
      'รถจักรยานยนต์': { '1-40': 51, '41-70': 53, '71-100': 55, '101+': 57 },
      'รถจักรยานยนต์ไฟฟ้า': { '1-40': 84, '41-70': 97, '71-100': 110, '101+': 123 }
    };
    const dailyRate = rates[item.vehicle] ? rates[item.vehicle][tier] : 0;
    return dailyRate * m.days;
  }
}

export function calculateMaintenanceCost(item) {
  if (item.isSubstitute) return 0;
  if (item.vehicle === 'ไม่ได้ใช้งาน') return 0;
  const isStaff = item.position === 'พนักงาน' || item.position === 'ลูกจ้างประจำ';
  const ROUTE_DATA = getRouteData();

  if (item.formMode === 'supervisor') {
    let totalMaint = 0;
    item.missions.forEach(m => {
      const route = ROUTE_DATA[m.route];
      if (!route) return;

      const dailyDist = m.type === 'ตรวจสอบการนำจ่าย' ? (route.workerDist / 2) : route.workerDist;
      
      let tier = '';
      if (dailyDist <= 40) tier = '1-40';
      else if (dailyDist <= 70) tier = '41-70';
      else if (dailyDist <= 100) tier = '71-100';
      else tier = '101+';

      if (item.vehicle === 'รถยนต์') {
        totalMaint += m.distance * 2.25;
      } else if (item.vehicle === 'เรือยนต์') {
        totalMaint += 48 * m.days;
      } else {
        const rates = {
          'รถจักรยานยนต์': { '1-40': 51, '41-70': 53, '71-100': 55, '101+': 57 },
          'รถจักรยานยนต์ไฟฟ้า': { '1-40': 84, '41-70': 97, '71-100': 110, '101+': 123 }
        };
        const dailyRate = rates[item.vehicle] ? rates[item.vehicle][tier] : 0;
        totalMaint += dailyRate * m.days;
      }
    });

    return Number(totalMaint.toFixed(2));
  }

  const route = ROUTE_DATA[item.route];
  if (!route) return 0;

  const dailyDist = route.workerDist;
  const monthlyDist = route.staffDist;

  if (item.vehicle === 'รถยนต์') {
    return isStaff ? (monthlyDist * 2.25) : (dailyDist * item.workDays * 2.25);
  }

  if (item.vehicle === 'เรือยนต์') {
    return isStaff ? Math.max(0, 1090 - (item.daysNotWorked * 36)) : (48 * item.workDays);
  }

  let tier = '';
  if (dailyDist <= 40) tier = '1-40';
  else if (dailyDist <= 70) tier = '41-70';
  else if (dailyDist <= 100) tier = '71-100';
  else tier = '101+';

  if (isStaff) {
    const rates = {
      'รถจักรยานยนต์': { '1-40': { base: 1155, dec: 38 }, '41-70': { base: 1210, dec: 40 }, '71-100': { base: 1265, dec: 42 }, '101+': { base: 1320, dec: 44 } },
      'รถจักรยานยนต์ไฟฟ้า': { '1-40': { base: 2500, dec: 84 }, '41-70': { base: 2900, dec: 97 }, '71-100': { base: 3300, dec: 110 }, '101+': { base: 3700, dec: 123 } }
    };
    const rule = rates[item.vehicle] ? rates[item.vehicle][tier] : { base: 0, dec: 0 };
    return Math.max(0, rule.base - (item.daysNotWorked * rule.dec));
  } else {
    const rates = {
      'รถจักรยานยนต์': { '1-40': 51, '41-70': 53, '71-100': 55, '101+': 57 },
      'รถจักรยานยนต์ไฟฟ้า': { '1-40': 84, '41-70': 97, '71-100': 110, '101+': 123 }
    };
    const dailyRate = rates[item.vehicle] ? rates[item.vehicle][tier] : 0;
    return dailyRate * item.workDays;
  }
}

export function renderFuelTable() {
  const globalFuelPriceInput = document.getElementById('globalFuelPrice');
  const employeeTableBody = document.getElementById('employeeTableBody');
  const sumFuelCostSpan = document.getElementById('sumFuelCost');
  const sumMaintenanceCostSpan = document.getElementById('sumMaintenanceCost');
  const sumTotalCostSpan = document.getElementById('sumTotalCost');

  const currentFuelPrice = parseFloat(globalFuelPriceInput ? globalFuelPriceInput.value : (window.defaultFuelPrice || 35.00)) || (window.defaultFuelPrice || 35.00);
  const ROUTE_DATA = getRouteData();
  const employees = getEmployees();
  const globalMonthSelect = document.getElementById('globalMonth');
  const globalYearSelect = document.getElementById('globalYear');
  const month = globalMonthSelect ? parseInt(globalMonthSelect.value) : 1;
  const year = globalYearSelect ? parseInt(globalYearSelect.value) : 2569;

  // Sort fuel employees by name (Thai alphabetical order ก-ฮ)
  employees.sort((a, b) => a.name.localeCompare(b.name, 'th'));

  if (employees.length === 0) {
    if (employeeTableBody) {
      employeeTableBody.innerHTML = `
        <tr>
          <td colspan="10" class="no-data">ยังไม่มีข้อมูลในตาราง กรุณากรอกข้อมูลด้านซ้าย หรือคัดลอกรายชื่อจากเดือนก่อน</td>
        </tr>
      `;
    }
    if (sumFuelCostSpan) sumFuelCostSpan.textContent = '0.00';
    if (sumMaintenanceCostSpan) sumMaintenanceCostSpan.textContent = '0.00';
    if (sumTotalCostSpan) sumTotalCostSpan.textContent = '0.00';
    return;
  }

  let totalFuelCost = 0;
  let totalMaintCost = 0;
  let grandTotal = 0;

  // Flatten the employees and their supervisor missions into separate rows
  let flatRows = [];
  employees.forEach((item, parentIndex) => {
    if (item.formMode !== 'supervisor') {
      const liters = calculateClaimLiters(item);
      const fuelCost = liters * currentFuelPrice;
      const maintCost = calculateMaintenanceCost(item);
      const sumTotal = fuelCost + maintCost;

      flatRows.push({
        parentIndex,
        item,
        name: item.name,
        position: item.position,
        routeDescHtml: `ด้านจ่ายที่ ${item.route}`,
        routeDescPlain: `ด้านจ่ายที่ ${item.route}`,
        workDays: item.workDays,
        liters: liters,
        fuelCost: fuelCost,
        maintCost: maintCost,
        sumTotal: sumTotal,
        signature: item.signature,
        remarks: getResignRemarkForEmployee(item.name, year, month, item.remarks)
      });
    } else {
      // 1. Group 'ตรวจสอบการนำจ่าย' into a single row
      const inspectMissions = (item.missions || []).filter(m => m.type === 'ตรวจสอบการนำจ่าย');
      if (inspectMissions.length > 0) {
        let rawInspectionLiters = 0;
        let inspectDays = 0;
        let inspectMaint = 0;

        inspectMissions.forEach(m => {
          const routeInfo = ROUTE_DATA[m.route];
          const dailyLiters = routeInfo ? routeInfo.workerLiters : 0;
          rawInspectionLiters += dailyLiters * m.days;
          inspectDays += m.days;
          inspectMaint += calculateSingleMissionMaint(item, m);
        });

        const liters = Math.ceil(rawInspectionLiters / 2);
        const fuelCost = liters * currentFuelPrice;
        const sumTotal = fuelCost + inspectMaint;

        flatRows.push({
          parentIndex,
          item,
          name: item.name,
          position: item.position,
          routeDescHtml: `ตรวจสอบการนำจ่าย`,
          routeDescPlain: `ตรวจสอบการนำจ่าย`,
          workDays: inspectDays,
          liters: liters,
          fuelCost: fuelCost,
          maintCost: inspectMaint,
          sumTotal: sumTotal,
          signature: item.signature,
          remarks: getResignRemarkForEmployee(item.name, year, month, item.remarks)
        });
      }

      // 2. Individual other missions ('นำจ่ายแทน', 'ฝึกสอนงาน') get their own rows
      const otherMissions = (item.missions || []).filter(m => m.type !== 'ตรวจสอบการนำจ่าย');
      otherMissions.forEach(m => {
        const routeInfo = ROUTE_DATA[m.route];
        const dailyLiters = routeInfo ? routeInfo.workerLiters : 0;
        const liters = dailyLiters * m.days;
        const fuelCost = liters * currentFuelPrice;
        const maint = calculateSingleMissionMaint(item, m);
        const sumTotal = fuelCost + maint;

        flatRows.push({
          parentIndex,
          item,
          name: item.name,
          position: item.position,
          routeDescHtml: `${m.type} (ด้าน ${m.route})`,
          routeDescPlain: `${m.type} (ด้าน ${m.route})`,
          workDays: m.days,
          liters: liters,
          fuelCost: fuelCost,
          maintCost: maint,
          sumTotal: sumTotal,
          signature: item.signature,
          remarks: getResignRemarkForEmployee(item.name, year, month, item.remarks)
        });
      });
    }
  });

  const employeeSubstituteTableBody = document.getElementById('employeeSubstituteTableBody');
  const substituteTableContainer = document.getElementById('substituteTableContainer');
  
  if (employeeTableBody) employeeTableBody.innerHTML = '';
  if (employeeSubstituteTableBody) employeeSubstituteTableBody.innerHTML = '';

  totalFuelCost = 0;
  totalMaintCost = 0;
  grandTotal = 0;

  flatRows.forEach((row) => {
    totalFuelCost += row.fuelCost;
    totalMaintCost += row.maintCost;
    grandTotal += row.sumTotal;
  });

  const searchQuery = (window.employeeSearchQuery || '').toLowerCase().trim();
  const filteredFlatRows = searchQuery
    ? flatRows.filter(row => 
        row.name.toLowerCase().includes(searchQuery) ||
        row.position.toLowerCase().includes(searchQuery) ||
        (row.item.duty && row.item.duty.toLowerCase().includes(searchQuery))
      )
    : flatRows;

  let regularCount = 0;
  let substituteCount = 0;

  filteredFlatRows.forEach((row) => {
    const tr = document.createElement('tr');
    const currentTableIndex = row.item.isSubstitute ? ++substituteCount : ++regularCount;

    let planBtnHtml = '';
    if (row.item.formMode === 'supervisor') {
      planBtnHtml = `<button class="btn btn-primary btn-small print-plan-btn" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; margin-left: 0.2rem; background: var(--post-orange); border-color: var(--post-orange);">🖨️ แผนตรวจ</button>`;
    }

    tr.innerHTML = `
      <td>${currentTableIndex}</td>
      <td><strong>${row.name}</strong></td>
      <td><span class="badge position-${row.position.replace(/[\s\(\)\.]/g, '')}">${row.position} / ${row.item.duty || '-'}</span></td>
      <td style="font-size: 0.85rem; max-width: 220px; white-space: normal; word-break: break-word; line-height: 1.3;" title="${row.routeDescPlain}">${row.routeDescHtml}</td>
      <td>${row.liters.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ลิตร</td>
      <td>${row.fuelCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</td>
      <td>${row.maintCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</td>
      <td><strong style="color: var(--text-primary);">${row.sumTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</strong></td>
      <td><span style="font-family: var(--font-title); font-size: 0.85rem; font-style: italic; color: #eee; font-weight: 300;">${row.signature}</span></td>
      <td class="actions-col" style="width: 280px; white-space: nowrap;">
        <button class="btn btn-secondary btn-small edit-row-btn" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">✏️ แก้ไข</button>
        ${planBtnHtml}
        <button class="btn btn-secondary btn-small clone-row-btn" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; margin-left: 0.2rem;">📋 คัดลอก</button>
        <button class="btn btn-danger btn-small delete-row-btn" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; margin-left: 0.2rem;">🗑️ ลบ</button>
      </td>
    `;

    tr.querySelector('.edit-row-btn').addEventListener('click', () => {
      if (row.item.formMode === 'supervisor') {
        editSupervisorInForm(row.parentIndex);
      } else {
        if (window.openEditModal) window.openEditModal(false, row.parentIndex);
      }
    });
    if (row.item.formMode === 'supervisor') {
      tr.querySelector('.print-plan-btn').addEventListener('click', () => printSupervisorPlan(row.parentIndex));
    }
    tr.querySelector('.clone-row-btn').addEventListener('click', () => cloneRow(row.parentIndex));
    tr.querySelector('.delete-row-btn').addEventListener('click', () => deleteRow(row.parentIndex));

    if (row.item.isSubstitute) {
      if (employeeSubstituteTableBody) employeeSubstituteTableBody.appendChild(tr);
    } else {
      if (employeeTableBody) employeeTableBody.appendChild(tr);
    }
  });

  if (regularCount === 0 && employeeTableBody) {
    employeeTableBody.innerHTML = `
      <tr>
        <td colspan="10" class="no-data">ยังไม่มีรายการเบิกค่าน้ำมันหลัก</td>
      </tr>
    `;
  }

  if (substituteCount > 0 && substituteTableContainer) {
    substituteTableContainer.classList.remove('hidden');
  } else if (substituteTableContainer) {
    substituteTableContainer.classList.add('hidden');
    if (employeeSubstituteTableBody) {
      employeeSubstituteTableBody.innerHTML = `
        <tr>
          <td colspan="10" class="no-data">ยังไม่มีรายการวิ่งแทน</td>
        </tr>
      `;
    }
  }

  if (sumFuelCostSpan) sumFuelCostSpan.textContent = totalFuelCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (sumMaintenanceCostSpan) sumMaintenanceCostSpan.textContent = totalMaintCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (sumTotalCostSpan) sumTotalCostSpan.textContent = grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Expose renderFuelTable
window.renderFuelTable = renderFuelTable;

export function cloneRow(index) {
  const employees = getEmployees();
  const target = employees[index];
  if (!target) return;
  const clone = JSON.parse(JSON.stringify(target));
  delete clone.id; // remove ID to let database autogenerate a new one
  employees.push(clone);
  setEmployees(employees);
  renderFuelTable();
  saveEmployees(employees);
  window.showToast('คัดลอกข้อมูลพนักงานเสร็จเรียบร้อย!', 'success');
}

export function deleteRow(index) {
  const employees = getEmployees();
  const emp = employees[index];
  const empName = emp ? emp.name : 'รายการนี้';
  window.showConfirm({
    title: 'ยืนยันการลบ',
    message: `คุณแน่ใจว่าต้องการลบรายการของ "${empName}" ใช่หรือไม่? ผลลัพธ์นี้ไม่สามารถย้อนคืนได้`,
    icon: '🗑️',
    okText: 'ลบข้อมูล',
    onConfirm: async () => {
      employees.splice(index, 1);
      setEmployees(employees);
      renderFuelTable();
      saveEmployees(employees);
      window.showToast('ลบรายการพนักงานเรียบร้อยแล้ว!', 'success');
    }
  });
}

export function addSupervisorMission() {
  const missionTypeSelect = document.getElementById('missionType');
  const missionRouteSelect = document.getElementById('missionRoute');
  const missionDaysInput = document.getElementById('missionDays');
  const missionDatesInput = document.getElementById('missionDates');
  const vehicleTypeSelect = document.getElementById('vehicleType');

  if (!missionTypeSelect || !missionRouteSelect || !missionDaysInput) return;

  const type = missionTypeSelect.value;
  const route = missionRouteSelect.value;
  const days = parseInt(missionDaysInput.value) || 0;
  const dates = missionDatesInput.value.trim();
  const vehicle = vehicleTypeSelect.value;

  if (days <= 0) {
    window.showToast('วันงานภารกิจต้องไม่เป็นศูนย์!', 'warning');
    return;
  }

  // Calculate distance automatically
  const ROUTE_DATA = getRouteData();
  const routeInfo = ROUTE_DATA[route];
  let distance = 0;
  if (routeInfo) {
    const dailyDist = type === 'ตรวจสอบการนำจ่าย' ? (routeInfo.workerDist / 2) : routeInfo.workerDist;
    distance = dailyDist * days;
  }

  tempMissions.push({
    type,
    route,
    days,
    dates,
    distance
  });

  missionDaysInput.value = '';
  missionDatesInput.value = '';
  renderMissionsTable();
}

export function renderMissionsTable() {
  const missionTableBody = document.getElementById('missionTableBody');
  if (!missionTableBody) return;

  if (tempMissions.length === 0) {
    missionTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="no-data" style="padding:0.5rem; font-size:0.8rem;">ยังไม่มีภารกิจ ชนจ. ในชุดนี้</td>
      </tr>
    `;
    return;
  }

  missionTableBody.innerHTML = '';
  tempMissions.forEach((m, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-size:0.8rem; padding:0.4rem;">${idx + 1}</td>
      <td style="font-size:0.8rem; padding:0.4rem;">${m.type}</td>
      <td style="font-size:0.8rem; padding:0.4rem;">ด้านที่ ${m.route}</td>
      <td style="font-size:0.8rem; padding:0.4rem;">${m.days} วัน (${m.dates || '-'})</td>
      <td style="font-size:0.8rem; padding:0.4rem;">${m.distance.toFixed(1)} กม.</td>
      <td style="font-size:0.8rem; padding:0.4rem; text-align:center;">
        <button class="row-action-btn delete-mission-btn" data-index="${idx}" style="color:var(--post-red);">🗑️</button>
      </td>
    `;
    tr.querySelector('.delete-mission-btn').addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.getAttribute('data-index'));
      tempMissions.splice(index, 1);
      renderMissionsTable();
    });
    missionTableBody.appendChild(tr);
  });
}

export function handleRouteSelect() {
  const deliveryRouteSelect = document.getElementById('deliveryRoute');
  const prevDistDay = document.getElementById('prevDistDay');
  const prevFuelDay = document.getElementById('prevFuelDay');
  const prevDistMonth = document.getElementById('prevDistMonth');
  const prevFuelMonth = document.getElementById('prevFuelMonth');
  const routeStatsPreview = document.getElementById('routeStatsPreview');

  if (!deliveryRouteSelect) return;
  const val = deliveryRouteSelect.value;
  if (!val) {
    if (routeStatsPreview) routeStatsPreview.classList.add('hidden');
    return;
  }

  const ROUTE_DATA = getRouteData();
  const route = ROUTE_DATA[val];
  if (route) {
    if (prevDistDay) prevDistDay.textContent = route.workerDist.toFixed(1);
    if (prevFuelDay) prevFuelDay.textContent = route.workerLiters.toFixed(2);
    if (prevDistMonth) prevDistMonth.textContent = route.staffDist.toFixed(1);
    if (prevFuelMonth) prevFuelMonth.textContent = route.staffLiters.toFixed(2);
    if (routeStatsPreview) routeStatsPreview.classList.remove('hidden');
  } else {
    if (routeStatsPreview) routeStatsPreview.classList.add('hidden');
  }
}

export function handlePositionSelect() {
  const empPositionSelect = document.getElementById('empPosition');
  const claimMethodSelect = document.getElementById('claimMethod');
  const daysNotWorkedGroup = document.getElementById('daysNotWorkedGroup');
  const workDaysInput = document.getElementById('workDays');
  const daysNotWorkedInput = document.getElementById('daysNotWorked');
  const isSubstitute = document.getElementById('isSubstitute');

  if (!empPositionSelect || !claimMethodSelect) return;

  const pos = empPositionSelect.value;
  const isSub = isSubstitute ? isSubstitute.checked : false;
  const isStaff = pos === 'พนักงาน' || pos === 'ลูกจ้างประจำ';

  if (isStaff && !isSub) {
    claimMethodSelect.value = 'monthly';
    claimMethodSelect.disabled = true;
    if (daysNotWorkedGroup) daysNotWorkedGroup.classList.remove('hidden');
    if (workDaysInput) {
      workDaysInput.value = 26;
      workDaysInput.disabled = true;
    }
  } else {
    claimMethodSelect.disabled = false;
    if (workDaysInput) workDaysInput.disabled = false;
    if (claimMethodSelect.value === 'monthly') {
      if (daysNotWorkedGroup) daysNotWorkedGroup.classList.remove('hidden');
    } else {
      if (daysNotWorkedGroup) daysNotWorkedGroup.classList.add('hidden');
      if (daysNotWorkedInput) daysNotWorkedInput.value = 0;
    }
  }
}

export function handleClaimMethodSelect() {
  const claimMethodSelect = document.getElementById('claimMethod');
  const daysNotWorkedGroup = document.getElementById('daysNotWorkedGroup');
  const daysNotWorkedInput = document.getElementById('daysNotWorked');

  if (!claimMethodSelect) return;
  if (claimMethodSelect.value === 'monthly') {
    if (daysNotWorkedGroup) daysNotWorkedGroup.classList.remove('hidden');
  } else {
    if (daysNotWorkedGroup) daysNotWorkedGroup.classList.add('hidden');
    if (daysNotWorkedInput) daysNotWorkedInput.value = 0;
  }
}

export async function handleFuelFormSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('empName').value.trim();
  const formMode = document.getElementById('formMode').value;
  const remarks = document.getElementById('remarks').value.trim();
  const signatureInput = document.getElementById('signature').value.trim();
  const signature = signatureInput || name;
  const editIndexVal = document.getElementById('editIndex').value;
  const saveBtn = document.getElementById('saveBtn');
  const resetBtn = document.getElementById('resetBtn');

  const vehicle = document.getElementById('vehicleType').value;
  const employees = getEmployees();
  let item = {};

  if (formMode === 'supervisor') {
    if (tempMissions.length === 0) {
      window.showToast('กรุณากรอกและบันทึกภารกิจอย่างน้อย 1 ภารกิจสำหรับ ชนจ.!', 'warning');
      return;
    }
    let totalDays = 0;
    tempMissions.forEach(m => totalDays += m.days);

    item = {
      formMode,
      name,
      position: document.getElementById('empPosition').value,
      duty: 'หัวหน้าโซนนำจ่าย',
      vehicle,
      missions: [...tempMissions],
      workDays: totalDays,
      remarks,
      signature
    };
  } else {
    const position = document.getElementById('empPosition').value;
    const duty = document.getElementById('empDuty').value;
    const route = document.getElementById('deliveryRoute').value;
    const method = document.getElementById('claimMethod').value;
    const workDays = parseInt(document.getElementById('workDays').value) || 0;
    
    const isSubstitute = document.getElementById('isSubstitute').checked;
    const isStaff = position === 'พนักงาน' || position === 'ลูกจ้างประจำ';
    const daysNotWorkedInput = document.getElementById('daysNotWorked');

    if (isStaff && !isSubstitute) {
      if (daysNotWorkedInput.value.trim() === '') {
        window.showToast('กรุณาระบุจำนวนวันที่ไม่ได้นำรถมาใช้!', 'warning');
        daysNotWorkedInput.focus();
        return;
      }
    }
    
    const daysNotWorked = parseInt(daysNotWorkedInput.value) || 0;

    item = {
      formMode,
      name,
      position,
      duty,
      route,
      vehicle,
      method,
      workDays,
      daysNotWorked,
      remarks,
      signature,
      isSubstitute
    };
    document.getElementById('isSubstitute').checked = false;
  }

  if (editIndexVal !== '') {
    const idx = parseInt(editIndexVal);
    employees[idx] = item;
    document.getElementById('editIndex').value = '';
    if (saveBtn) saveBtn.innerHTML = '📥 บันทึกข้อมูลพนักงาน';
    if (resetBtn) resetBtn.classList.add('hidden');
    const formTitle = document.getElementById('formTitle');
    if (formTitle) formTitle.textContent = 'กรอกข้อมูลผู้รับเงินค่าน้ำมัน';
  } else {
    employees.push(item);
  }

  const isEdit = editIndexVal !== '';
  setEmployees(employees);
  document.getElementById('employeeForm').reset();
  const routeStatsPreview = document.getElementById('routeStatsPreview');
  if (routeStatsPreview) routeStatsPreview.classList.add('hidden');
  tempMissions = [];
  
  if (formMode === 'supervisor') {
    renderMissionsTable();
  }
  
  renderFuelTable();
  saveEmployees(employees);
  window.showToast(isEdit ? 'อัปเดตข้อมูลสำเร็จ!' : 'บันทึกข้อมูลสำเร็จ!', 'success');
}

export function clearSupervisorMissions() {
  tempMissions = [];
  renderMissionsTable();
}

export function editSupervisorInForm(parentIndex) {
  const employees = getEmployees();
  const emp = employees[parentIndex];
  if (!emp) return;

  document.getElementById('empName').value = emp.name;
  document.getElementById('formMode').value = emp.formMode; // 'supervisor'
  document.getElementById('remarks').value = emp.remarks || '';
  document.getElementById('signature').value = emp.signature || '';
  document.getElementById('editIndex').value = parentIndex;

  tempMissions = [...(emp.missions || [])];

  if (window.switchFormMode) {
    window.switchFormMode('supervisor', true);
  }

  // Pre-fill position/duty for supervisor
  document.getElementById('empPosition').value = emp.position || 'หัวหน้าโซน';
  document.getElementById('vehicleType').value = emp.vehicle || 'จักรยานยนต์';

  renderMissionsTable();

  const formTitle = document.getElementById('formTitle');
  if (formTitle) formTitle.textContent = '✏️ แก้ไขข้อมูล ชนจ. (ในแบบฟอร์ม)';
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) saveBtn.innerHTML = '📥 อัปเดตข้อมูล ชนจ.';
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.classList.remove('hidden');
    resetBtn.textContent = '❌ ยกเลิกการแก้ไข';
  }

  const entryFormCard = document.getElementById('entryFormCard');
  if (entryFormCard) {
    entryFormCard.scrollIntoView({ behavior: 'smooth' });
  }
}

export function printSupervisorPlan(parentIndex) {
  const employees = getEmployees();
  const item = employees[parentIndex];
  if (!item) return;

  const globalMonthSelect = document.getElementById('globalMonth');
  const globalYearSelect = document.getElementById('globalYear');
  const m = globalMonthSelect.options[globalMonthSelect.selectedIndex].text;
  const y = globalYearSelect.value;
  const postOffice = document.getElementById('globalPostOfficeName').value.trim() || '.............................................';

  const sigApproverNameVal = document.getElementById('sigApproverName').value.trim() || '..........................................................';
  const sigApproverPosVal = document.getElementById('sigApproverPos').value.trim() || '..........................................................';

  let totalInspectDist = 0;
  let totalFuelUsed = 0;
  let missionsHtml = '';
  const ROUTE_DATA = getRouteData();

  item.missions.forEach((mission) => {
    const routeInfo = ROUTE_DATA[mission.route];
    const workerDist = routeInfo ? parseFloat(routeInfo.workerDist) || 0 : 0;
    const workerLiters = routeInfo ? parseFloat(routeInfo.workerLiters) || 0 : 0;

    const isInspection = mission.type === 'ตรวจสอบการนำจ่าย';
    const insDist = isInspection ? (workerDist / 2) : workerDist;
    const insLiters = isInspection ? (workerLiters / 2) : workerLiters;

    totalInspectDist += insDist;
    totalFuelUsed += insLiters;

    missionsHtml += `
      <tr>
        <td style="text-align: left; padding-left: 10px;">ด้านจ่ายที่ ${mission.route}</td>
        <td>${mission.dates || '-'}</td>
        <td>${workerDist.toFixed(2)}</td>
        <td>${insDist.toFixed(2)}</td>
        <td>${insLiters.toFixed(2)}</td>
      </tr>
    `;
  });

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>แผนการออกตรวจสอบการนำจ่าย - ${item.name}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Sarabun', sans-serif;
          padding: 0;
          font-size: 11pt;
          line-height: 1.6;
          color: black;
          background: white;
        }
        h2 {
          text-align: center;
          font-size: 14pt;
          font-weight: bold;
          margin-bottom: 1.5rem;
          text-decoration: underline;
        }
        .header-section {
          margin-bottom: 1rem;
        }
        .body-text {
          text-indent: 1.5cm;
          text-align: justify;
          margin-bottom: 1rem;
        }
        .plan-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
          margin-bottom: 1.5rem;
        }
        .plan-table th, .plan-table td {
          border: 1px solid #000;
          padding: 6px;
          text-align: center;
          font-size: 10pt;
        }
        .plan-table th {
          background-color: #f8f8f8;
          font-weight: bold;
        }
        .sig-container {
          margin-top: 1.5cm;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          font-size: 11pt;
        }
        .sig-block {
          text-align: center;
          width: 300px;
        }
        .approval-section {
          margin-top: 2rem;
          border-top: 1px dashed #777;
          padding-top: 1rem;
          page-break-inside: avoid;
        }
        .approval-title {
          font-weight: bold;
          margin-bottom: 0.5rem;
        }
        .checkbox-row {
          margin-left: 1cm;
          margin-bottom: 0.5rem;
        }
        .approval-sig-container {
          display: flex;
          justify-content: flex-end;
          margin-top: 1.5cm;
        }
        @page {
          size: A4 portrait;
          margin-left: 2.5cm;
          margin-right: 2.0cm;
          margin-top: 2.0cm;
          margin-bottom: 2.0cm;
        }
      </style>
    </head>
    <body>
      <h2>แบบขออนุมัติแผนการออกตรวจสอบการนำจ่าย</h2>
      
      <div class="header-section">
        <strong>(1) เรียน</strong> หน.ปณ.${postOffice}
      </div>

      <div class="body-text">
        ข้าพเจ้า <strong>${item.name}</strong> <strong>${item.duty || 'หัวหน้าโซนนำจ่าย'}</strong> ที่ทำการไปรษณีย์<strong>${postOffice}</strong> ขออนุมัติแผนการออกตรวจสอบการนำจ่าย ประจำเดือน <strong>${m}</strong> พ.ศ. <strong>${y}</strong> ตามบันทึก ปณท ที่ ปณท รป.(นจ.1)/951 ลว. 22 กันยายน 2568 เรื่อง วิธีปฏิบัติในการเบิกจ่ายเงินค่าบำรุง ค่าน้ำมันเชื้อเพลิงและค่าไฟฟ้ายานพาหนะส่วนตัวหรือยานพาหนะเช่าซื้อที่นำมาปฏิบัติงานของหัวหน้าโซนนำจ่าย (ชนจ.) ซึ่งข้าพเจ้า มีด้านจ่ายในความรับผิดชอบ จำนวน <strong>${item.missions.length}</strong> ด้านจ่าย มีระยะทางออกตรวจสอบการนำจ่าย รวม <strong>${totalInspectDist.toFixed(0)}</strong> กม. โดยมีรายละเอียด ดังนี้
      </div>

      <table class="plan-table">
        <thead>
          <tr>
            <th style="width: 25%">ด้านจ่ายในความรับผิดชอบ</th>
            <th style="width: 20%">ว./ด./ป. ที่ตรวจสอบ</th>
            <th style="width: 15%">ระยะทาง (กม./วัน)</th>
            <th style="width: 20%">ระยะทางที่ออกตรวจสอบการนำจ่าย<br>(ครึ่งหนึ่งของระยะทางด้านจ่าย) (กม./วัน)</th>
            <th style="width: 20%">น้ำมันเชื้อเพลิงที่ใช้ (ลิตร/วัน)</th>
          </tr>
        </thead>
        <tbody>
          ${missionsHtml}
          <tr style="font-weight: bold; background-color: #fafafa;">
            <td colspan="3" style="text-align: right; padding-right: 15px;">รวม</td>
            <td>${totalInspectDist.toFixed(2)}</td>
            <td>${totalFuelUsed.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div class="body-text" style="text-indent: 1.5cm; margin-bottom: 2rem;">
        จึงเรียน มาเพื่อโปรดพิจารณาอนุมัติต่อไปด้วย
      </div>

      <div class="sig-container">
        <div class="sig-block">
          <p>ลงชื่อ..........................................................ผู้ขออนุมัติ</p>
          <p style="margin-top: 0.5rem; font-weight: bold;">( ${item.name} )</p>
          <p>ตำแหน่ง ${item.duty || 'หัวหน้าโซนนำจ่าย'}</p>
          <p style="margin-top: 0.25rem; color: #444;">วันที่......... เดือน.......................... พ.ศ. .............</p>
        </div>
      </div>

      <div class="approval-section">
        <div class="approval-title">(2) ความเห็นของหัวหน้าที่ทำการไปรษณีย์</div>
        <div class="checkbox-row">
          ( &nbsp; &nbsp; ) อนุมัติ
        </div>
        <div class="checkbox-row">
          ( &nbsp; &nbsp; ) อื่นๆ ....................................................................................................................................................
        </div>
        
        <div class="approval-sig-container">
          <div class="sig-block">
            <p>ลงชื่อ..........................................................ผู้อนุมัติ</p>
            <p style="margin-top: 0.5rem; font-weight: bold;">( ${sigApproverNameVal} )</p>
            <p>ตำแหน่ง ${sigApproverPosVal}</p>
            <p style="margin-top: 0.25rem; color: #444;">วันที่......... เดือน.......................... พ.ศ. .............</p>
          </div>
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

export function renderPeriodTable() {
  const periodTableBody = document.getElementById('periodTableBody');
  const avgCalcTotalDays = document.getElementById('avgCalcTotalDays');
  const avgCalcTotalSum = document.getElementById('avgCalcTotalSum');
  const avgCalcResultPrice = document.getElementById('avgCalcResultPrice');

  if (!periodTableBody) return;

  if (oilPricePeriods.length === 0) {
    periodTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="no-data">ยังไม่มีรายการช่วงราคา กรุณากรอกเพิ่มด้านบน</td>
      </tr>
    `;
    if (avgCalcTotalDays) avgCalcTotalDays.textContent = '0';
    if (avgCalcTotalSum) avgCalcTotalSum.textContent = '0.00';
    if (avgCalcResultPrice) avgCalcResultPrice.textContent = '0.00';
    
    const applyAvgPriceBtn = document.getElementById('applyAvgPriceBtn');
    if (applyAvgPriceBtn) {
      applyAvgPriceBtn.disabled = true;
      applyAvgPriceBtn.textContent = '✔️ นำราคานี้ไปใช้เป็นค่าราคากลาง';
    }
    return;
  }

  periodTableBody.innerHTML = '';
  let sumDays = 0;
  let sumWeight = 0;

  oilPricePeriods.forEach((item, idx) => {
    const totalRowPrice = item.price * item.days;
    sumDays += item.days;
    sumWeight += totalRowPrice;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${item.price.toFixed(2)} บาท</td>
      <td>${item.days} วัน</td>
      <td style="text-align: center;">
        <button class="row-action-btn delete-period-btn" data-index="${idx}" style="color: var(--post-red);">🗑️</button>
      </td>
    `;
    tr.querySelector('.delete-period-btn').addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.getAttribute('data-index'));
      oilPricePeriods.splice(index, 1);
      renderPeriodTable();
    });
    periodTableBody.appendChild(tr);
  });

  const avgPrice = sumDays > 0 ? (sumWeight / sumDays) : 0;
  if (avgCalcTotalDays) avgCalcTotalDays.textContent = sumDays;
  if (avgCalcTotalSum) avgCalcTotalSum.textContent = sumWeight.toFixed(2);
  if (avgCalcResultPrice) avgCalcResultPrice.textContent = avgPrice.toFixed(4);

  // Auto-apply to global fuel price input and database
  const globalFuelPriceInput = document.getElementById('globalFuelPrice');
  const applyAvgPriceBtn = document.getElementById('applyAvgPriceBtn');
  
  if (sumDays > 0 && avgPrice > 0) {
    if (globalFuelPriceInput) {
      globalFuelPriceInput.value = avgPrice.toFixed(4);
    }
    if (typeof window.saveGlobalSetting === 'function') {
      window.saveGlobalSetting('fuelPrice', { value: parseFloat(avgPrice.toFixed(4)) });
    }
    // Re-render main table with new price
    setTimeout(() => {
      renderFuelTable();
    }, 0);
    
    if (applyAvgPriceBtn) {
      applyAvgPriceBtn.disabled = false;
      applyAvgPriceBtn.textContent = '✔️ นำราคานี้ไปใช้งานแล้ว (อัตโนมัติ)';
    }
  } else {
    if (applyAvgPriceBtn) {
      applyAvgPriceBtn.disabled = true;
      applyAvgPriceBtn.textContent = '✔️ นำราคานี้ไปใช้เป็นค่าราคากลาง';
    }
  }
}

export function addPricePeriod() {
  const priceInput = document.getElementById('priceInput');
  const daysInput = document.getElementById('daysInput');

  if (!priceInput || !daysInput) return;

  const price = parseFloat(priceInput.value) || 0;
  const days = parseInt(daysInput.value) || 0;

  if (price <= 0 || days <= 0) {
    window.showToast('ราคาน้ำมันและจำนวนวันต้องมากกว่า 0!', 'warning');
    return;
  }

  oilPricePeriods.push({ price, days });
  priceInput.value = '';
  daysInput.value = '';
  renderPeriodTable();
}

export function applyAvgPriceToGlobal() {
  const avgCalcModal = document.getElementById('avgCalcModal');
  if (avgCalcModal) avgCalcModal.classList.remove('active');
  window.showToast('บันทึกและเปิดใช้งานราคาน้ำมันเฉลี่ยเรียบร้อยแล้ว!', 'success');
}

export function exportFuelCsv() {
  const employees = getEmployees();
  if (employees.length === 0) {
    window.showToast('ไม่มีข้อมูลที่จะส่งออก!', 'warning');
    return;
  }

  const globalFuelPriceInput = document.getElementById('globalFuelPrice');
  const currentFuelPrice = parseFloat(globalFuelPriceInput ? globalFuelPriceInput.value : (window.defaultFuelPrice || 35.00)) || (window.defaultFuelPrice || 35.00);
  let csvContent = "\uFEFF";
  
  csvContent += "ลำดับ,ชื่อ-นามสกุล,ตำแหน่ง/บทบาท,รายละเอียดด้านจ่าย/ภารกิจ,วันทำงาน,ปริมาณน้ำมัน (ลิตร),ค่าน้ำมัน (บาท),ค่าบำรุงรักษา (บาท),รวมเบิกจ่าย (บาท),ลายมือชื่อผู้รับเงิน,หมายเหตุ\n";
  
  let flatRows = [];
  const ROUTE_DATA = getRouteData();
  employees.forEach((item, parentIndex) => {
    if (item.formMode !== 'supervisor') {
      const liters = calculateClaimLiters(item);
      const fuelCost = liters * currentFuelPrice;
      const maintCost = calculateMaintenanceCost(item);
      const sumTotal = fuelCost + maintCost;

      flatRows.push({
        name: item.name,
        position: item.isSubstitute ? `${item.position} / ${item.duty || '-'} (วิ่งแทน)` : `${item.position} / ${item.duty || '-'}`,
        routeDesc: `ด้านจ่ายที่ ${item.route}` + (item.isSubstitute ? ' (วิ่งแทน)' : ''),
        workDays: item.workDays,
        liters: liters,
        fuelCost: fuelCost,
        maintCost: maintCost,
        sumTotal: sumTotal,
        signature: item.signature,
        remarks: item.remarks
      });
    } else {
      const inspectMissions = (item.missions || []).filter(m => m.type === 'ตรวจสอบการนำจ่าย');
      if (inspectMissions.length > 0) {
        let rawInspectionLiters = 0;
        let inspectDays = 0;
        let inspectMaint = 0;

        inspectMissions.forEach(m => {
          const routeInfo = ROUTE_DATA[m.route];
          const dailyLiters = routeInfo ? routeInfo.workerLiters : 0;
          rawInspectionLiters += dailyLiters * m.days;
          inspectDays += m.days;
          inspectMaint += calculateSingleMissionMaint(item, m);
        });

        const liters = Math.ceil(rawInspectionLiters / 2);
        const fuelCost = liters * currentFuelPrice;
        const sumTotal = fuelCost + inspectMaint;

        flatRows.push({
          name: item.name,
          position: `${item.position} / ${item.duty || '-'}`,
          routeDesc: `ตรวจสอบการนำจ่าย`,
          workDays: inspectDays,
          liters: liters,
          fuelCost: fuelCost,
          maintCost: inspectMaint,
          sumTotal: sumTotal,
          signature: item.signature,
          remarks: item.remarks
        });
      }

      const otherMissions = (item.missions || []).filter(m => m.type !== 'ตรวจสอบการนำจ่าย');
      otherMissions.forEach(m => {
        const routeInfo = ROUTE_DATA[m.route];
        const dailyLiters = routeInfo ? routeInfo.workerLiters : 0;
        const liters = dailyLiters * m.days;
        const fuelCost = liters * currentFuelPrice;
        const maint = calculateSingleMissionMaint(item, m);
        const sumTotal = fuelCost + maint;

        flatRows.push({
          name: item.name,
          position: `${item.position} / ${item.duty || '-'}`,
          routeDesc: `${m.type} (ด้าน ${m.route})`,
          workDays: m.days,
          liters: liters,
          fuelCost: fuelCost,
          maintCost: maint,
          sumTotal: sumTotal,
          signature: item.signature,
          remarks: item.remarks
        });
      });
    }
  });

  flatRows.forEach((row, index) => {
    csvContent += `${index + 1},"${row.name}","${row.position}","${row.routeDesc}",${row.workDays},${row.liters.toFixed(2)},${row.fuelCost.toFixed(2)},${row.maintCost.toFixed(2)},${row.sumTotal.toFixed(2)},"${row.signature}","${row.remarks}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);

  const globalMonthSelect = document.getElementById('globalMonth');
  const globalYearSelect = document.getElementById('globalYear');
  const m = globalMonthSelect.options[globalMonthSelect.selectedIndex].text;
  const y = globalYearSelect.value;
  link.setAttribute("download", `เบิกค่าน้ำมัน_${m}_${y}.csv`);

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function printFuelReport() {
  const employees = getEmployees();
  if (employees.length === 0) {
    window.showToast('ไม่มีข้อมูลที่จะพิมพ์!', 'warning');
    return;
  }

  employees.sort((a, b) => a.name.localeCompare(b.name, 'th'));

  const globalFuelPriceInput = document.getElementById('globalFuelPrice');
  const currentFuelPrice = parseFloat(globalFuelPriceInput ? globalFuelPriceInput.value : (window.defaultFuelPrice || 35.00)) || (window.defaultFuelPrice || 35.00);
  
  const sigMakerTitleVal = document.getElementById('sigMakerTitle').value.trim() || 'ผู้จัดทำ';
  const sigMakerNameVal = document.getElementById('sigMakerName').value.trim() || '..........................................................';
  const sigMakerPosVal = document.getElementById('sigMakerPos').value.trim() || '..........................................................';
  
  const sigCheckerTitleVal = document.getElementById('sigCheckerTitle').value.trim() || 'ผู้ตรวจสอบ';
  const sigCheckerNameVal = document.getElementById('sigCheckerName').value.trim() || '..........................................................';
  const sigCheckerPosVal = document.getElementById('sigCheckerPos').value.trim() || '..........................................................';
  
  const sigApproverTitleVal = document.getElementById('sigApproverTitle').value.trim() || 'ผู้อนุมัติ';
  const sigApproverNameVal = document.getElementById('sigApproverName').value.trim() || '..........................................................';
  const sigApproverPosVal = document.getElementById('sigApproverPos').value.trim() || '..........................................................';

  const globalMonthSelect = document.getElementById('globalMonth');
  const globalYearSelect = document.getElementById('globalYear');
  const monthText = globalMonthSelect.options[globalMonthSelect.selectedIndex].text;
  const yearText = globalYearSelect.value;
  const month = parseInt(globalMonthSelect.value);
  const year = parseInt(globalYearSelect.value);

  let listStaffAndRegular = [];
  let listDailyAndTemp = [];
  let listContractors = [];
  let listSubstitutes = [];
  let listSupervisors = [];
  let supervisors = [];

  const ROUTE_DATA = getRouteData();
  employees.forEach((item) => {
    if (item.formMode === 'supervisor') {
      supervisors.push(item);

      // 1. Group 'ตรวจสอบการนำจ่าย' into a single row
      const inspectMissions = (item.missions || []).filter(m => m.type === 'ตรวจสอบการนำจ่าย');
      if (inspectMissions.length > 0) {
        let rawInspectionLiters = 0;
        let inspectDays = 0;
        let inspectMaint = 0;

        inspectMissions.forEach(m => {
          const routeInfo = ROUTE_DATA[m.route];
          const dailyLiters = routeInfo ? routeInfo.workerLiters : 0;
          rawInspectionLiters += dailyLiters * m.days;
          inspectDays += m.days;
          inspectMaint += calculateSingleMissionMaint(item, m);
        });

        const liters = Math.ceil(rawInspectionLiters / 2);
        const fuelCost = liters * currentFuelPrice;
        const sumTotal = fuelCost + inspectMaint;

        const routesList = inspectMissions.map(m => m.route).filter((v, i, a) => a.indexOf(v) === i).join(',');
        const rowObj = {
          name: item.name,
          position: item.position,
          duty: item.duty || '-',
          routeDesc: `ตรวจสอบการนำจ่าย ด้าน ${routesList}`,
          workDays: inspectDays,
          liters: liters,
          fuelCost: fuelCost,
          maintCost: inspectMaint,
          sumTotal: sumTotal,
          signature: item.signature,
          remarks: getResignRemarkForEmployee(item.name, year, month, item.remarks)
        };

        listSupervisors.push(rowObj);
      }

      // 2. Individual other missions ('นำจ่ายแทน', 'ฝึกสอนงาน') get their own rows
      const otherMissions = (item.missions || []).filter(m => m.type !== 'ตรวจสอบการนำจ่าย');
      otherMissions.forEach(m => {
        const routeInfo = ROUTE_DATA[m.route];
        const dailyLiters = routeInfo ? routeInfo.workerLiters : 0;
        const liters = dailyLiters * m.days;
        const fuelCost = liters * currentFuelPrice;
        const maint = calculateSingleMissionMaint(item, m);
        const sumTotal = fuelCost + maint;

        const rowObj = {
          name: item.name,
          position: item.position,
          duty: item.duty || '-',
          routeDesc: `${m.type} (ด้าน ${m.route})`,
          workDays: m.days,
          liters: liters,
          fuelCost: fuelCost,
          maintCost: maint,
          sumTotal: sumTotal,
          signature: item.signature,
          remarks: getResignRemarkForEmployee(item.name, year, month, item.remarks)
        };

        listSupervisors.push(rowObj);
      });
    } else {
      const liters = calculateClaimLiters(item);
      const fuelCost = liters * currentFuelPrice;
      const maintCost = calculateMaintenanceCost(item);
      const sumTotal = fuelCost + maintCost;

      const rowObj = {
        name: item.name,
        position: item.position,
        duty: item.duty || '-',
        routeDesc: `ด้านจ่ายที่ ${item.route}`,
        workDays: item.workDays,
        daysNotWorked: item.daysNotWorked || 0,
        liters: liters,
        fuelCost: fuelCost,
        maintCost: maintCost,
        sumTotal: sumTotal,
        signature: item.signature,
        remarks: getResignRemarkForEmployee(item.name, year, month, item.remarks)
      };

      if (item.isSubstitute) {
        listSubstitutes.push(rowObj);
      } else {
        const posLower = (item.position || '').toLowerCase();
        if (posLower.includes('พนักงาน') || posLower.includes('ลูกจ้างประจำ')) {
          listStaffAndRegular.push(rowObj);
        } else if (posLower.includes('เหมา')) {
          listContractors.push(rowObj);
        } else {
          listDailyAndTemp.push(rowObj);
        }
      }
    }
  });

  let pagesHtml = [];

  const buildStandardPageHtml = (title, list) => {
    if (list.length === 0) return '';

    let totalFuelCost = 0;
    let totalMaintCost = 0;
    let grandTotal = 0;

    let tableRowsHtml = list.map((row, idx) => {
      totalFuelCost += row.fuelCost;
      totalMaintCost += row.maintCost;
      grandTotal += row.sumTotal;

      return `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${row.name}</strong></td>
          <td>${row.position} / ${row.duty}</td>
          <td style="text-align: left !important; font-size: 7.5pt; line-height: 1.3;">${row.routeDesc}</td>
          <td>${title === 'พนักงาน และ ลูกจ้างประจำ' ? (row.daysNotWorked || 0) : row.workDays} วัน</td>
          <td>${row.liters.toFixed(2)}</td>
          <td>${row.fuelCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td>${row.maintCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td><strong>${row.sumTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
          <td><span style="font-family: 'Sarabun', sans-serif; font-style: italic; font-size: 9pt; color: #f7f4f4; font-weight: 300;">${row.signature}</span></td>
          <td><span style="font-size: 8pt; color: #444;">${row.remarks}</span></td>
        </tr>
      `;
    }).join('');

    return `
      <div class="print-page">
        <div class="print-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px double #000 !important; padding-bottom: 0.15rem !important; margin-bottom: 0.2rem !important;">
          <div style="width: 80px;"></div>
          <div class="print-title-container" style="flex-grow: 1; text-align: center;">
            <h2 style="font-size: 10pt !important; font-weight: bold; margin: 0 0 0.15rem 0;">รายละเอียดบัญชีรายชื่อพนักงานใช้รถจักรยานยนต์ส่วนตัวปฏิบัติหน้าที่นำจ่ายไปรษณีย์ภัณฑ์ค้างจ่าย</h2>
            <h3 style="font-size: 8.5pt !important; font-weight: bold; margin: 0 0 0.15rem 0;">กลุ่มงาน: ${title}</h3>
            <p style="font-size: 7.8pt; margin: 0 0 0.2rem 0;">ประจำเดือน ${monthText} พ.ศ. ${yearText} (ราคาน้ำมันอ้างอิง: ${currentFuelPrice.toFixed(2)} บาท/ลิตร)</p>
          </div>
          <div style="border: 1px dashed #888; width: 80px; height: 45px; display: flex; align-items: center; justify-content: center; font-size: 7.5pt; color: #555; border-radius: 4px; line-height: 1.1; text-align: center; background-color: #fafafa; font-weight: normal;">
            ตราประทับ<br>ปณ.
          </div>
        </div>

        <table class="print-table standard-payee-table">
          <thead>
            <tr>
              <th style="width: 4%">ลำดับ</th>
              <th style="width: 17%">ชื่อ - นามสกุล</th>
              <th style="width: 18%">ตำแหน่ง / บทบาท</th>
              <th style="width: 18%">รายละเอียด/ด้านจ่าย</th>
              <th style="width: 6%">${title === 'พนักงาน และ ลูกจ้างประจำ' ? 'วันไม่ได้นำรถมาใช้' : 'วันทำงาน'}</th>
              <th style="width: 8%">ปริมาณน้ำมัน (ลิตร)</th>
              <th style="width: 8%">ค่าน้ำมัน (บาท)</th>
              <th style="width: 8%">ค่าบำรุงรักษา (บาท)</th>
              <th style="width: 9%">รวมเบิกจ่าย (บาท)</th>
              <th style="width: 13%">ลายมือชื่อผู้รับเงิน</th>
              <th style="width: 11%">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div class="print-summary-section">
          <div class="summary-block">
            <p>ค่าน้ำมันเชื้อเพลิงรวม: <strong>${totalFuelCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> บาท</p>
            <p>ค่าบำรุงรักษารวม: <strong>${totalMaintCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> บาท</p>
            <p class="final-sum">ยอดเงินเบิกจ่ายรวมสุทธิ: <strong>${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> บาท</p>
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

  const page1 = buildStandardPageHtml('พนักงาน และ ลูกจ้างประจำ', listStaffAndRegular);
  if (page1) pagesHtml.push(page1);

  const page2 = buildStandardPageHtml('ลูกจ้างรายวัน และ ลูกจ้างชั่วคราว', listDailyAndTemp);
  if (page2) pagesHtml.push(page2);

  const page3 = buildStandardPageHtml('ลูกจ้างเหมาบริการนำจ่าย', listContractors);
  if (page3) pagesHtml.push(page3);

  const page4 = buildStandardPageHtml('เจ้าหน้าที่จ้างวิ่งแทนด้านจ่าย', listSubstitutes);
  if (page4) pagesHtml.push(page4);

  const page5 = buildStandardPageHtml('หัวหน้าโซนนำจ่าย (ชนจ.)', listSupervisors);
  if (page5) pagesHtml.push(page5);

  // Supervisors (ชนจ.) Pages
  const postOffice = document.getElementById('globalPostOfficeName').value.trim() || '.............................................';
  const splitBahtSatang = (value) => {
    const rounded = Math.round(value * 100) / 100;
    const parts = rounded.toFixed(2).split('.');
    return {
      baht: parts[0].replace(/\B(?=(\d{3})+(?!\D))/g, ","),
      satang: parts[1]
    };
  };

  supervisors.forEach((sup) => {
    if (!sup.missions || sup.missions.length === 0) return;

    const supLiters = calculateClaimLiters(sup);
    const supFuelCost = supLiters * currentFuelPrice;
    const supMaint = calculateMaintenanceCost(sup);
    const supTotal = supFuelCost + supMaint;

    const numMissions = sup.missions.length;
    const zoneNum = (sup.route || '').replace(/\D/g, '') || '-';

    const splitFuel = splitBahtSatang(supFuelCost);
    const splitMaint = splitBahtSatang(supMaint);
    const splitTotal = splitBahtSatang(supTotal);

    let supervisorRowsHtml = '';
    let supervisorIndex = 1;

    sup.missions.forEach((m, mIdx) => {
      const isFirst = mIdx === 0;
      let rowspanHtml = '';
      if (isFirst) {
        rowspanHtml = `
          <td rowspan="${numMissions + 1}" style="text-align: center; vertical-align: middle;">${supervisorIndex++}</td>
          <td rowspan="${numMissions + 1}" style="vertical-align: middle; padding-left: 8px !important;"><strong>${sup.name}</strong><br><span style="font-size: 7.2pt; color: #555;">${sup.position}</span></td>
          <td rowspan="${numMissions + 1}" style="text-align: center; vertical-align: middle;">${zoneNum}</td>
        `;
      }

      const missionDesc = m.type === 'ตรวจสอบการนำจ่าย' ? `ตรวจสอบการนำจ่าย ด้าน ${m.route}` : `${m.type} ด้าน ${m.route}`;

      supervisorRowsHtml += `
        <tr>
          ${rowspanHtml}
          <td style="text-align: left !important; padding-left: 8px !important;">${missionDesc}</td>
          <td style="text-align: center;">${m.dates || m.days || '-'}</td>
          <td style="text-align: right; padding-right: 8px !important;">${m.distance.toFixed(2)}</td>
          <td></td>
          <td></td><td></td>
          <td></td><td></td>
          <td></td>
        </tr>
      `;
    });

    // Totals row for this supervisor
    supervisorRowsHtml += `
      <tr style="background: #fafafa; font-weight: bold;">
        <td style="text-align: right; padding-right: 8px !important; font-size: 7.5pt; color: #555;">${currentFuelPrice.toFixed(2)}</td>
        <td style="text-align: center;">รวม</td>
        <td style="text-align: right; padding-right: 8px !important;">${sup.missions.reduce((acc, m) => acc + m.distance, 0).toFixed(2)}</td>
        <td style="text-align: right; padding-right: 8px !important;">${supLiters.toFixed(2)}</td>
        <td style="text-align: right; padding-right: 4px !important; border-right: none !important;">${splitFuel.baht}</td>
        <td style="text-align: center; border-left: none !important; font-size: 7.2pt; color: #444;">${splitFuel.satang}</td>
        <td style="text-align: right; padding-right: 4px !important; border-right: none !important;">${splitMaint.baht}</td>
        <td style="text-align: center; border-left: none !important; font-size: 7.2pt; color: #444;">${splitMaint.satang}</td>
        <td style="text-align: right; padding-right: 8px !important;">${supTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `;

    const postOffice = document.getElementById('globalPostOfficeName').value.trim() || '.............................................';
    const activeDaysInMonth = new Date(year - 543, month, 0).getDate();
    
    const pageSup = `
      <div class="print-page">
        <div class="print-header" style="text-align: center; border-bottom: 2px double #000; padding-bottom: 0.2rem; margin-bottom: 0.3rem;">
          <h2 style="font-size: 10.5pt !important; font-weight: bold; margin: 0 0 0.1rem 0; text-align: center;">แบบรายงานการปฏิบัติงานของหัวหน้าโซนนำจ่าย (ชนจ.)</h2>
          <h3 style="font-size: 8.5pt !important; font-weight: normal; margin: 0 0 0.2rem 0; text-align: center;">(ประกอบการเบิกจ่ายเงินค่าบำรุงและค่าน้ำมันเชื้อเพลิงของ ชนจ.)</h3>
          <p style="font-size: 7.8pt; margin: 0 0 0.1rem 0; text-align: center;">ประจำที่ทำการ ไปรษณีย์<strong>${postOffice}</strong> รหัสไปรษณีย์ <strong>21150</strong> สังกัด <strong>ปข.2</strong></p>
          <p style="font-size: 7.8pt; margin: 0 0 0.2rem 0; text-align: center;">ประจำเดือน <strong>${monthText}</strong> พ.ศ. <strong>${yearText}</strong></p>
        </div>
        
        <div style="display: flex; justify-content: space-between; font-size: 7.8pt; margin-bottom: 0.3rem; font-weight: bold; padding: 0 4px;">
          <span>ค่าน้ำมันเฉลี่ยเดือนนี้: ${currentFuelPrice.toFixed(2)} บาท/ลิตร</span>
          <span>จำนวนวันปฏิบัติงานเดือนนี้: ${activeDaysInMonth} วัน</span>
        </div>

        <table class="print-table supervisor-report-table" style="width: 100%; border-collapse: collapse; margin-bottom: 0.4rem;">
          <thead>
            <tr>
              <th rowspan="2" style="width: 4%">ลำดับ</th>
              <th rowspan="2" style="width: 15%">ชื่อ-นามสกุล</th>
              <th rowspan="2" style="width: 4%">โซน</th>
              <th rowspan="2" style="width: 17%">ภารกิจที่ปฏิบัติ</th>
              <th rowspan="2" style="width: 12%">วว/ดด/ปปปป ที่<br>ปฏิบัติงาน</th>
              <th rowspan="2" style="width: 8%">ระยะทางที่ใช้จริง<br>(กม.)</th>
              <th rowspan="2" style="width: 8%">น้ำมันเชื้อเพลิง<br>ที่ใช้จริง (ลิตร)</th>
              <th colspan="2" style="width: 12%">ค่าน้ำมัน/ค่าไฟฟ้า</th>
              <th colspan="2" style="width: 12%">ค่าบำรุง</th>
              <th rowspan="2" style="width: 10%">ลงชื่อผู้รับเงิน</th>
            </tr>
            <tr>
              <th style="border-top: 1px solid #000 !important; font-size: 7pt; width: 8%">บาท</th>
              <th style="border-top: 1px solid #000 !important; font-size: 7pt; width: 4%">สต.</th>
              <th style="border-top: 1px solid #000 !important; font-size: 7pt; width: 8%">บาท</th>
              <th style="border-top: 1px solid #000 !important; font-size: 7pt; width: 4%">สต.</th>
            </tr>
          </thead>
          <tbody>
            ${supervisorRowsHtml}
          </tbody>
        </table>

        <div style="margin-top: 0.3rem; text-align: left; font-size: 7.2pt; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px; line-height: 1.35; color: #222;">
          <strong>*** หมายเหตุ:</strong> 1. การออกตรวจตรวจสอบการนำจ่าย ให้ดำเนินการไม่เกินวันละ 1 ด้านจ่าย และให้ใช้ระยะทางไม่เกินครึ่งหนึ่งของระยะทางของด้านที่ออกตรวจสอบฯ<br>
          2. การคำนวณค่าบำรุง ค่าน้ำมันเชื้อเพลิงและค่าไฟฟ้าใช้วิธีการคำนวณตามระเบียบ ปณท ฉบับที่ 313 ว่าด้วย การเบิกจ่ายเงินค่าบำรุง ค่าน้ำมันเชื้อเพลิงและไฟฟ้า ยานพาหนะส่วนตัวหรือยานพาหนะเช่าซื้อที่นำมาใช้ปฏิบัติงานของพนักงานหรือลูกจ้างประจำ พ.ศ. 2567 และระเบียบ ปณท ฉบับที่ 314 ว่าด้วย การเบิกจ่ายเงินค่าบำรุง ค่าน้ำมันเชื้อเพลิงและค่าไฟฟ้า ยานพาหนะส่วนตัวที่นำมาใช้ปฏิบัติงานของลูกจ้าง พ.ศ. 2567 แต่ให้ใช้จำนวนลิตรของน้ำมันเชื้อเพลิงเป็นทศนิยม 2 ตำแหน่ง
        </div>

        <div class="print-signatures" style="margin-top: 0.8rem; display: flex; justify-content: space-between; font-size: 7.8pt;">
          <div class="sig-box" style="text-align: center; width: 30%;">
            <p>ลงชื่อ..........................................................ผู้จัดทำ</p>
            <p style="margin-top: 0.4rem;">(${sup.signature || sup.name})</p>
            <p>ตำแหน่ง ${sup.position || 'หัวหน้าโซนนำจ่าย'}</p>
          </div>
          <div class="sig-box" style="text-align: center; width: 30%;">
            <p>ลงชื่อ..........................................................ผู้ตรวจสอบ</p>
            <p style="margin-top: 0.4rem;">(${sigCheckerNameVal})</p>
            <p>ตำแหน่ง ${sigCheckerPosVal}</p>
          </div>
          <div class="sig-box" style="text-align: center; width: 30%;">
            <p>ลงชื่อ..........................................................ผู้อนุมัติ</p>
            <p style="margin-top: 0.4rem;">(${sigApproverNameVal})</p>
            <p>ตำแหน่ง ${sigApproverPosVal}</p>
          </div>
        </div>
      </div>
    `;
    pagesHtml.push(pageSup);

    // Also build the inspection plan page
    let totalInspectDist = 0;
    let totalFuelUsed = 0;
    let missionsHtml = '';
    
    sup.missions.forEach((mission) => {
      const routeInfo = ROUTE_DATA[mission.route];
      const workerDist = routeInfo ? parseFloat(routeInfo.workerDist) || 0 : 0;
      const workerLiters = routeInfo ? parseFloat(routeInfo.workerLiters) || 0 : 0;

      const isInspection = mission.type === 'ตรวจสอบการนำจ่าย';
      const insDist = isInspection ? (workerDist / 2) : workerDist;
      const insLiters = isInspection ? (workerLiters / 2) : workerLiters;

      totalInspectDist += insDist;
      totalFuelUsed += insLiters;

      missionsHtml += `
        <tr>
          <td style="text-align: left; padding-left: 10px; border: 1px solid #000; padding: 5px;">ด้านจ่ายที่ ${mission.route}</td>
          <td style="border: 1px solid #000; padding: 5px;">${mission.dates || '-'}</td>
          <td style="border: 1px solid #000; padding: 5px;">${workerDist.toFixed(2)}</td>
          <td style="border: 1px solid #000; padding: 5px;">${insDist.toFixed(2)}</td>
          <td style="border: 1px solid #000; padding: 5px;">${insLiters.toFixed(2)}</td>
        </tr>
      `;
    });

    const pagePlan = `
      <div class="print-page print-plan-page">
        <h2 style="text-align: center; font-size: 13pt !important; font-weight: bold; margin-bottom: 1.2rem; text-decoration: underline;">แบบขออนุมัติแผนการออกตรวจสอบการนำจ่าย</h2>
        
        <div style="margin-bottom: 0.8rem; font-size: 10pt;">
          <strong>(1) เรียน</strong> หน.ปณ.${postOffice}
        </div>

        <div style="text-indent: 1.2cm; text-align: justify; margin-bottom: 0.8rem; font-size: 10pt; line-height: 1.5; color: black;">
          ข้าพเจ้า <strong>${sup.name}</strong> <strong>${sup.duty || 'หัวหน้าโซนนำจ่าย'}</strong> ที่ทำการไปรษณีย์<strong>${postOffice}</strong> ขออนุมัติแผนการออกตรวจสอบการนำจ่าย ประจำเดือน <strong>${monthText}</strong> พ.ศ. <strong>${yearText}</strong> ตามบันทึก ปณท ที่ ปณท รป.(นจ.1)/951 ลว. 22 กันยายน 2568 เรื่อง วิธีปฏิบัติในการเบิกจ่ายเงินค่าบำรุง ค่าน้ำมันเชื้อเพลิงและค่าไฟฟ้ายานพาหนะส่วนตัวหรือยานพาหนะเช่าซื้อที่นำมาปฏิบัติงานของหัวหน้าโซนนำจ่าย (ชนจ.) ซึ่งข้าพเจ้า มีด้านจ่ายในความรับผิดชอบ จำนวน <strong>${sup.missions.length}</strong> ด้านจ่าย มีระยะทางออกตรวจสอบการนำจ่าย รวม <strong>${totalInspectDist.toFixed(0)}</strong> กม. โดยมีรายละเอียด ดังนี้
        </div>

        <table class="plan-table">
          <thead>
            <tr style="background-color: #f8f8f8; font-weight: bold;">
              <th style="width: 25%">ด้านจ่ายในความรับผิดชอบ</th>
              <th style="width: 20%">ว./ด./ป. ที่ตรวจสอบ</th>
              <th style="width: 15%">ระยะทาง (กม./วัน)</th>
              <th style="width: 20%">ระยะทางที่ออกตรวจสอบการนำจ่าย<br>(ครึ่งหนึ่งของระยะทางด้านจ่าย) (กม./วัน)</th>
              <th style="width: 20%">น้ำมันเชื้อเพลิงที่ใช้ (ลิตร/วัน)</th>
            </tr>
          </thead>
          <tbody>
            ${missionsHtml}
            <tr style="font-weight: bold; background-color: #fafafa;">
              <td colspan="3" style="text-align: right; padding-right: 15px;">รวม</td>
              <td>${totalInspectDist.toFixed(2)}</td>
              <td>${totalFuelUsed.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div style="text-indent: 1.2cm; margin-bottom: 1rem; font-size: 10pt;">
          จึงเรียน มาเพื่อโปรดพิจารณาอนุมัติต่อไปด้วย
        </div>

        <div style="display: flex; flex-direction: column; align-items: flex-end; font-size: 10pt; margin-top: 0.3cm;">
          <div style="text-align: center; width: 340px; white-space: nowrap;">
            <p>ลงชื่อ..................................................ผู้ขออนุมัติ</p>
            <p style="margin-top: 0.3rem; font-weight: bold;">( ${sup.name} )</p>
            <p>ตำแหน่ง ${sup.duty || 'หัวหน้าโซนนำจ่าย'}</p>
            <p style="margin-top: 0.25rem; color: #444;">วันที่......... เดือน.......................... พ.ศ. .............</p>
          </div>
        </div>

        <div class="approval-section" style="margin-top: 1rem; border-top: 1px dashed #777; padding-top: 0.6rem; page-break-inside: avoid; font-size: 10pt;">
          <div style="font-weight: bold; margin-bottom: 0.3rem; text-align: left;">(2) คำสั่ง หน.ปณ.${postOffice}</div>
          <div style="margin-left: 1cm; margin-bottom: 0.3rem; text-align: left;">
            [ &nbsp; ] อนุมัติแผนการออกตรวจดังกล่าว<br>
            [ &nbsp; ] ไม่อนุมัติ เนื่องจาก....................................................................................................
          </div>
          
          <div style="display: flex; justify-content: flex-end; margin-top: 0.4cm;">
            <div style="text-align: center; width: 340px; white-space: nowrap;">
              <p>ลงชื่อ..................................................ผู้อนุมัติ</p>
              <p style="margin-top: 0.3rem; font-weight: bold;">( ${sigApproverNameVal} )</p>
              <p>ตำแหน่ง ${sigApproverPosVal}</p>
              <p style="margin-top: 0.25rem; color: #444;">วันที่......... เดือน.......................... พ.ศ. .............</p>
            </div>
          </div>
        </div>
      </div>
    `;
    pagesHtml.push(pagePlan);
  });

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>พิมพ์รายงานเบิกจ่ายค่าน้ำมันและค่าบำรุงรักษา_${monthText}_${yearText}</title>
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
          size: A4 landscape;
          margin: 0.2cm;
        }
        @page portrait-layout {
          size: A4 portrait;
          margin: 1.5cm;
        }
        .print-plan-page {
          page: portrait-layout;
          page-break-before: always;
          font-size: 10.5pt !important;
        }
        .plan-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          margin-bottom: 15px;
        }
        .plan-table th, .plan-table td {
          border: 1px solid #000 !important;
          padding: 5px !important;
          text-align: center;
          font-size: 9.5pt;
          height: auto !important;
        }
        .print-header {
          text-align: center;
          margin-bottom: 0.2rem !important;
          padding-bottom: 0.15rem !important;
          border-bottom: 2px double #000 !important;
        }
        .print-title-container h2 {
          font-size: 10pt !important;
          font-weight: bold;
          margin: 0 0 0.15rem 0;
        }
        .print-title-container h3 {
          font-size: 8.5pt !important;
          font-weight: bold;
          margin: 0 0 0.15rem 0;
        }
        .print-title-container p {
          font-size: 7.8pt;
          margin: 0 0 0.2rem 0;
        }
        .print-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 0.5rem;
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
          text-align: center;
          height: 14px !important;
          vertical-align: middle !important;
        }
        .standard-payee-table td:nth-child(2) {
          text-align: left !important;
          font-size: 8.5pt !important;
          font-weight: bold !important;
        }
        .standard-payee-table td:nth-child(3) {
          text-align: left !important;
        }
        .standard-payee-table td:nth-child(10) {
          white-space: nowrap !important;
          font-size: 7.8pt !important;
          text-align: center !important;
        }
        .print-summary-section {
          display: flex;
          justify-content: flex-end;
          margin-top: 0.2rem !important;
          margin-bottom: 0.2rem !important;
        }
        .summary-block {
          width: 250px;
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
}

export async function clearFuelData() {
  window.showConfirm({
    title: 'ยืนยันล้างข้อมูลทั้งหมด',
    message: 'คุณต้องการล้างรายการพนักงานในตารางค่าน้ำมันปัจจุบันทั้งหมดใช่หรือไม่? (จะไม่กระทบประวัติรายชื่อในทะเบียนบุคลากรหลัก)',
    icon: '⚠️',
    okText: 'ล้างข้อมูลทั้งหมด',
    onConfirm: async () => {
      setEmployees([]);
      renderFuelTable();
      saveEmployees([]);
      window.showToast('ล้างตารางข้อมูลค่าน้ำมันเรียบร้อยแล้ว!', 'success');
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

export function getCalculatorsTemplate() {
  return `<div class="dashboard-grid animate-fade-in">
  <!-- LEFT: Inputs & Configurations -->
  <div class="panel-column">
          <!-- Card 1: Global Configurations & Weighted Average Fuel Price -->
          <div class="glass-card" id="globalConfigsCard">
            <div class="card-header">
              <span class="card-icon">⚡</span>
              <h3>ราคาน้ำมันและรอบการทำรายการ</h3>
            </div>
            
            <div class="form-row-2">
              <div class="form-group">
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin-bottom: 0.25rem;">
                  <label for="globalMonth" style="margin: 0;">รอบประจำเดือน</label>
                  <span id="monthLockBadge" style="font-size: 0.72rem; font-weight: bold; cursor: pointer; padding: 0.1rem 0.35rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.15rem; transition: all 0.2s ease; user-select: none;"></span>
                </div>
                <select id="globalMonth" class="form-select">
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
              </div>
              <div class="form-group">
                <label for="globalYear">ปี พ.ศ.</label>
                <input type="number" id="globalYear" class="form-input" placeholder="เช่น 2569" value="2569" min="2500" max="3000" />
              </div>
            </div>

            <div class="form-row-2" style="margin-top: 1rem;">
              <div class="form-group">
                <label for="globalPostOfficeName">ชื่อที่ทำการไปรษณีย์ / ปณ.</label>
                <input type="text" id="globalPostOfficeName" class="form-input" placeholder="เช่น มาบตาพุด" value="${window.postOfficeName || 'มาบตาพุด'}" disabled />
              </div>
              <div class="form-group">
                <label for="globalFuelPrice">ราคาน้ำมันอ้างอิง (บาท/ลิตร)</label>
                <div class="input-with-action">
                  <input type="number" id="globalFuelPrice" class="form-input text-highlight" value="${window.defaultFuelPrice !== undefined ? window.defaultFuelPrice : '35.00'}" step="0.01" />
                  <button type="button" id="openAvgCalcBtn" class="btn btn-secondary btn-small" style="white-space: nowrap; padding: 0.5rem 0.6rem;">
                    🧮 คำนวณถัวเฉลี่ย
                  </button>
                </div>
              </div>
            </div>
            <p class="input-tip" style="margin-top: 0.25rem;">สามารถระบุชื่อ ปณ. และราคาน้ำมันอ้างอิงเพื่อใช้ในการคำนวณและออกรายงาน</p>

            <!-- Quick Actions for loading data -->
            <div class="quick-actions-bar" style="margin-top: 1rem; display: flex; gap: 0.5rem; border-top: 1px dashed var(--border-glass); padding-top: 1rem;">
              <button type="button" id="copyFromPrevMonthBtn" class="btn btn-secondary btn-small" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 0.25rem; white-space: nowrap; font-size: 0.8rem; padding: 0.5rem 0.4rem;">
                📋 คัดลอกรายชื่อจากเดือนก่อน
              </button>
              <button type="button" id="loadFromRegistryBtn" class="btn btn-secondary btn-small" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 0.25rem; white-space: nowrap; font-size: 0.8rem; padding: 0.5rem 0.4rem;">
                👤 โหลดทะเบียนบุคลากร
              </button>
            </div>

            <!-- Signature Configurations for PDF Report -->
            <div style="margin-top: 1.5rem; border-top: 1px dashed var(--border-glass); padding-top: 1rem;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--text-highlight); margin: 0; display: flex; align-items: center; gap: 0.4rem;">
                  <span>✍️ ผู้ลงนามในรายงาน (PDF)</span>
                </h4>
                <div style="display: flex; gap: 0.4rem;">
                  <button type="button" id="openSigProfilesBtn" class="btn btn-secondary btn-small" style="padding: 0.2rem 0.5rem; font-size: 0.75rem; border: 1px solid var(--post-orange); color: var(--post-orange); background: transparent;">📂 เทมเพลตผู้ลงนาม</button>
                  <button type="button" id="toggleSigEditBtn" class="btn btn-secondary btn-small" style="padding: 0.2rem 0.5rem; font-size: 0.75rem; border: 1px solid var(--post-orange); color: var(--post-orange); background: transparent;">✏️ แก้ไขผู้ลงนาม</button>
                </div>
              </div>
              
              <div class="form-group">
                <label>ผู้จัดทำ (บทบาท / ชื่อ / ตำแหน่ง)</label>
                <div style="display: grid; grid-template-columns: 1.2fr 2fr 2fr; gap: 0.5rem;">
                  <input type="text" id="sigMakerTitle" class="form-input" value="ผู้จัดทำ" placeholder="บทบาท (เช่น ผู้จัดทำ)" disabled />
                  <input type="text" id="sigMakerName" class="form-input" value="นายนิพล ทรัพย์หมื่นแสน" placeholder="ชื่อ" disabled />
                  <input type="text" id="sigMakerPos" class="form-input" value="หัวหน้าทำการ" placeholder="ตำแหน่ง" disabled />
                </div>
              </div>

              <div class="form-group">
                <label>ผู้ตรวจสอบ (บทบาท / ชื่อ / ตำแหน่ง)</label>
                <div style="display: grid; grid-template-columns: 1.2fr 2fr 2fr; gap: 0.5rem;">
                  <input type="text" id="sigCheckerTitle" class="form-input" value="ผู้ตรวจสอบ" placeholder="บทบาท (เช่น ผู้ตรวจสอบ)" disabled />
                  <input type="text" id="sigCheckerName" class="form-input" value="" placeholder="ชื่อ" disabled />
                  <input type="text" id="sigCheckerPos" class="form-input" value="หน.สพ./ปจ." placeholder="ตำแหน่ง" disabled />
                </div>
              </div>

              <div class="form-group" style="margin-bottom: 0;">
                <label>ผู้อนุมัติ (บทบาท / ชื่อ / ตำแหน่ง)</label>
                <div style="display: grid; grid-template-columns: 1.2fr 2fr 2fr; gap: 0.5rem;">
                  <input type="text" id="sigApproverTitle" class="form-input" value="ผู้อนุมัติ" placeholder="บทบาท (เช่น ผู้อนุมัติ)" disabled />
                  <input type="text" id="sigApproverName" class="form-input" value="" placeholder="ชื่อ" disabled />
                  <input type="text" id="sigApproverPos" class="form-input" value="ผู้จัดการฝ่าย" placeholder="ตำแหน่ง" disabled />
                </div>
              </div>
            </div>
          </div>

          <div class="glass-card" id="calculationFormCard">
            <div class="auth-tabs" style="display: flex; position: relative; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.5rem;">
              <button class="auth-tab active" id="tabStandard" style="flex: 1; padding: 0.5rem; background: transparent; border: none; color: var(--text-primary); font-family: var(--font-main); font-weight: 700; cursor: pointer; transition: color var(--transition-fast); text-align: center;">พนักงาน / ลูกจ้างประจำ-ชั่วคราว</button>
              <button class="auth-tab" id="tabSupervisor" style="flex: 1; padding: 0.5rem; background: transparent; border: none; color: var(--text-secondary); font-family: var(--font-main); font-weight: 700; cursor: pointer; transition: color var(--transition-fast); text-align: center;">หัวหน้าโซนนำจ่าย (ชนจ.)</button>
            </div>

            <!-- Standard Employee Form -->
            <form id="employeeForm">
              <input type="hidden" id="editIndex" value="" />
              <input type="hidden" id="formMode" value="standard" /> <!-- standard or supervisor -->

              <div class="form-group" id="empNameSelectGroup">
                <label for="empNameSelect">เลือกรายชื่อบุคลากร (พิมพ์ค้นหา)</label>
                <input type="text" id="empNameSelect" class="form-input" list="personnelDatalist" placeholder="🔍 พิมพ์ชื่อเพื่อค้นหา..." required autocomplete="off" />
                <datalist id="personnelDatalist"></datalist>
              </div>

              <div class="form-group hidden" id="empNameManualGroup">
                <label for="empName">ชื่อ - นามสกุล</label>
                <input type="text" id="empName" class="form-input" placeholder="ตัวอย่าง: นายสมชาย รักดี" />
              </div>

              <!-- Salary field for water calculation (hidden by default) -->
              <div class="form-group hidden" id="salaryGroup">
                <label for="empSalary">เงินเดือน (บาท)</label>
                <input type="number" id="empSalary" class="form-input text-highlight" placeholder="ระบุเงินเดือน (เช่น 26000)" value="0" />
              </div>

              <!-- POSITION / DUTY / ROUTE SELECTION -->
              <div class="form-row-2" id="positionRouteRow">
                <div class="form-group">
                  <label for="empPosition">ตำแหน่ง</label>
                  <select id="empPosition" class="form-select">
                    <option value="หน.ปณ.">หน.ปณ.</option>
                    <option value="พนักงาน">พนักงาน</option>
                    <option value="ลูกจ้างประจำ">ลูกจ้างประจำ</option>
                    <option value="ลูกจ้าง">ลูกจ้าง</option>
                    <option value="ลูกจ้างเหมา">ลูกจ้างเหมา</option>
                  </select>
                </div>
                <div class="form-group" id="empDutyGroup">
                  <label for="empDuty">หน้าที่</label>
                  <select id="empDuty" class="form-select">
                    <option value="เจ้าหน้าที่นำจ่ายไปรษณีย์/EMS/ด้านจ่ายพิเศษ">เจ้าหน้าที่นำจ่ายไปรษณีย์/EMS/ด้านจ่ายพิเศษ</option>
                    <option value="เจ้าหน้าที่ไขตู้ไปรษณีย์">เจ้าหน้าที่ไขตู้ไปรษณีย์</option>
                    <option value="หัวหน้าโซนนำจ่าย">หัวหน้าโซนนำจ่าย</option>
                    <option value="เจ้าหน้าที่รับฝากนอกที่ทำการ">เจ้าหน้าที่รับฝากนอกที่ทำการ</option>
                    <option value="ปณอ.(รับ/จ่าย)/ผู้ช่วยนำจ่าย">ปณอ.(รับ/จ่าย)/ผู้ช่วยนำจ่าย</option>
                  </select>
                </div>
              </div>

              <div class="form-group" id="deliveryRouteGroup" style="margin-bottom: 1.25rem;">
                <label for="deliveryRoute">ด้านจ่ายประจำที่</label>
                <select id="deliveryRoute" class="form-select" required>
                  <option value="" disabled selected>-- เลือกด้านจ่าย --</option>
                  <!-- Options loaded via JS -->
                </select>
              </div>

              <!-- SUPERVISOR SPECIAL MISSION CONFIGURATOR -->
              <div id="supervisorMissionSection" class="hidden" style="background: rgba(0, 0, 0, 0.02); border: 1px solid var(--border-glass); border-radius: var(--radius-small); padding: 1rem; margin-bottom: 1.25rem;">
                <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-highlight); margin-bottom: 0.8rem; display: flex; justify-content: space-between; align-items: center;">
                  <span>📋 บันทึกภารกิจปฏิบัติงานของ ชนจ.</span>
                  <button type="button" id="addMissionBtn" class="btn btn-secondary btn-small" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">+ เพิ่มภารกิจ</button>
                </div>
                
                <div class="form-row-2">
                  <div class="form-group">
                    <label for="missionType">ภารกิจที่ปฏิบัติ</label>
                    <select id="missionType" class="form-select">
                      <option value="ตรวจสอบการนำจ่าย">ตรวจสอบการนำจ่าย (คิดระยะทาง 1/2)</option>
                      <option value="นำจ่ายแทน">นำจ่ายแทน (คิดระยะทางเต็ม)</option>
                      <option value="ฝึกสอนงานเจ้าหน้าที่">ฝึกสอนงานเจ้าหน้าที่ใหม่ (สูงสุด 5 วัน)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="missionRoute">ด้านจ่ายที่ปฏิบัติงาน</label>
                    <select id="missionRoute" class="form-select">
                      <!-- Loaded via JS -->
                    </select>
                  </div>
                </div>

                <div class="form-row-2">
                  <div class="form-group">
                    <label for="missionDays">จำนวนวันที่ปฏิบัติงาน (วัน)</label>
                    <input type="number" id="missionDays" class="form-input" value="1" min="1" max="31" />
                  </div>
                  <div class="form-group">
                    <label for="missionDates">วันที่ปฏิบัติภารกิจ (เช่น 1-5, 12)</label>
                    <input type="text" id="missionDates" class="form-input" placeholder="เช่น 2, 9, 18" />
                  </div>
                </div>

                <!-- Supervisor Mission Sub-list table -->
                <div class="modal-table-container" style="max-height: 150px; margin-top: 0.5rem; margin-bottom: 0;">
                  <table class="modal-table" style="font-size: 0.75rem;">
                    <thead>
                      <tr>
                        <th>ภารกิจ</th>
                        <th>ด้านจ่าย</th>
                        <th>วันปฏิบัติ</th>
                        <th>ระยะทางรวม</th>
                        <th>ลิตรน้ำมัน</th>
                        <th>ลบ</th>
                      </tr>
                    </thead>
                    <tbody id="missionTableBody">
                      <tr>
                        <td colspan="6" class="no-data" style="padding: 1rem;">ยังไม่มีการบันทึกภารกิจ</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Live Route Stats Preview -->
              <div id="routeStatsPreview" class="stats-preview-box hidden">
                <div class="preview-title">📊 สถิติด้านจ่ายประจำตำแหน่งที่เลือก:</div>
                <div class="preview-grid">
                  <div class="preview-item">
                    <div class="preview-label">ระยะทาง/วัน</div>
                    <div class="preview-val" id="prevDistDay">-</div>
                  </div>
                  <div class="preview-item">
                    <div class="preview-label">น้ำมัน/วัน</div>
                    <div class="preview-val" id="prevFuelDay">-</div>
                  </div>
                  <div class="preview-item">
                    <div class="preview-label">ระยะทาง/เดือน</div>
                    <div class="preview-val" id="prevDistMonth">-</div>
                  </div>
                  <div class="preview-item">
                    <div class="preview-label">น้ำมัน/เดือน</div>
                    <div class="preview-val" id="prevFuelMonth">-</div>
                  </div>
                </div>
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label for="vehicleType">ประเภทพาหนะ</label>
                  <select id="vehicleType" class="form-select">
                    <option value="รถจักรยานยนต์">รถจักรยานยนต์</option>
                    <option value="รถจักรยานยนต์ไฟฟ้า">รถจักรยานยนต์ไฟฟ้า</option>
                    <option value="เรือยนต์">เรือยนต์</option>
                    <option value="รถยนต์">รถยนต์</option>
                  </select>
                </div>
                <div class="form-group" id="claimMethodGroup">
                  <label for="claimMethod">รูปแบบการเบิก</label>
                  <select id="claimMethod" class="form-select">
                    <option value="monthly">เบิกจ่ายรายเดือน (เต็มสิทธิ์)</option>
                    <option value="daily">เบิกจ่ายตามวันทำงานจริง</option>
                  </select>
                </div>
              </div>

              <div class="form-group" style="flex-direction: row; align-items: center; gap: 0.5rem; margin-bottom: 1.25rem;">
                <input type="checkbox" id="isSubstitute" style="width: 20px; height: 20px; cursor: pointer;" />
                <label for="isSubstitute" style="font-weight: 700; color: var(--post-orange); cursor: pointer; margin: 0; user-select: none;">
                  🏃 ปฏิบัติงานวิ่งแทน (เบิกเฉพาะค่าน้ำมัน ไม่เบิกค่าบำรุงรักษา)
                </label>
              </div>

              <div class="form-row-2" id="workDaysRow">
                <div class="form-group">
                  <label for="workDays">จำนวนวันที่ทำงานจริง (วัน)</label>
                  <input type="number" id="workDays" class="form-input" value="26" min="0" max="31" />
                </div>
                <div class="form-group" id="daysNotWorkedGroup">
                  <label for="daysNotWorked">จำนวนวันที่ไม่ได้นำรถมาใช้ (วัน)</label>
                  <input type="number" id="daysNotWorked" class="form-input" value="0" min="0" max="31" />
                </div>
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label for="remarks">หมายเหตุ</label>
                  <input type="text" id="remarks" class="form-input" placeholder="ระบุเพิ่มเติม (เช่น เลขทะเบียน)" />
                </div>
                <div class="form-group">
                  <label for="signature">ลงนามรับเงิน</label>
                  <input type="text" id="signature" class="form-input" placeholder="ชื่อผู้เซ็นรับ (ว่างไว้ใช้ชื่อตนเอง)" />
                </div>
              </div>

              <div class="button-group" style="margin-top: 1rem;">
                <button type="submit" id="saveBtn" class="btn btn-primary btn-full">
                  📥 บันทึกข้อมูลพนักงาน
                </button>
                <button type="button" id="resetBtn" class="btn btn-secondary hidden">
                  ยกเลิกการแก้ไข
                </button>
              </div>
            </form>
          </div>

  </div>
  <!-- RIGHT: Live Output Table & Statistics -->
  <div class="panel-column">
          <div class="metrics-grid">
            <div class="metric-card bg-orange-glow">
              <div class="metric-info">
                <h3>ค่าน้ำมันเชื้อเพลิงรวม</h3>
                <p class="metric-value"><span id="sumFuelCost">0.00</span> <span class="unit">บาท</span></p>
              </div>
              <div class="metric-icon">⛽</div>
            </div>
            <div class="metric-card bg-blue-glow">
              <div class="metric-info">
                <h3>ค่าบำรุงรักษารวม</h3>
                <p class="metric-value"><span id="sumMaintenanceCost">0.00</span> <span class="unit">บาท</span></p>
              </div>
              <div class="metric-icon">🔧</div>
            </div>
            <div class="metric-card bg-emerald-glow">
              <div class="metric-info">
                <h3>ยอดเงินเบิกจ่ายรวมสุทธิ</h3>
                <p class="metric-value highlight"><span id="sumTotalCost">0.00</span> <span class="unit">บาท</span></p>
              </div>
              <div class="metric-icon">💰</div>
            </div>
          </div>

          <div class="glass-card full-width" id="mainTableCard">
            <div class="card-header table-header-flex">
              <div class="header-left">
                <span class="card-icon">📋</span>
                <h3>รายการพนักงานเบิกจ่ายค่าน้ำมันค้างจ่ายประจำ ปณ.</h3>
              </div>
              <div class="header-actions-flex">
                <button type="button" id="openRouteEditorBtn" class="btn btn-secondary btn-small" style="border: 1px solid var(--post-orange); color: var(--post-orange);">
                  ⚙️ ตั้งค่าระยะทาง/น้ำมัน
                </button>
                <button type="button" id="pullAttendanceDaysBtn" class="btn btn-secondary btn-small" style="border: 1px solid var(--post-orange); color: var(--post-orange); background: rgba(251, 80, 18, 0.05); font-weight: bold;">
                  ⚡ ดึงวันทำงานจากระบบลงเวลา
                </button>
                <button type="button" id="importExcelAttendanceBtn" class="btn btn-secondary btn-small" style="border: 1px solid var(--post-emerald); color: var(--post-emerald); background: rgba(16, 185, 129, 0.05);">
                  📥 นำเข้าวันทำงานจาก Excel
                </button>
                <button type="button" id="exportCsvBtn" class="btn btn-secondary btn-small">
                  📊 ส่งออก Excel (CSV)
                </button>
                <button type="button" id="printReportBtn" class="btn btn-primary btn-small">
                  🖨️ พิมพ์ใบเบิกเงิน / PDF
                </button>
                <button type="button" id="clearAllBtn" class="btn btn-danger btn-small">
                  🗑️ ล้างทั้งหมด
                </button>
              </div>
            </div>

            <!-- Saved Templates Batch Manager -->
            <div class="saved-templates-bar" style="background: rgba(0, 0, 0, 0.02); border: 1px solid var(--border-glass); border-radius: var(--radius-small); padding: 1rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 250px;">
                <span style="font-size: 1.2rem;">💾</span>
                <div style="text-align: left;">
                  <strong style="font-size: 0.85rem; display: block; color: var(--text-primary);">ระบบบันทึกและโหลดชุดรายชื่อ (Saved Templates)</strong>
                  <span style="font-size: 0.75rem; color: var(--text-secondary);">บันทึกรายชื่อเจ้าหน้าที่เก็บไว้ใช้ในรอบถัดไปได้ทันที</span>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <input type="text" id="templateNameInput" class="form-input" style="width: 200px; padding: 0.5rem;" placeholder="ชื่อบันทึก (เช่น รายชื่อโซน 1)" />
                <button type="button" id="saveTemplateBtn" class="btn btn-primary btn-small" style="padding: 0.5rem 1rem;">💾 บันทึกชุดปัจจุบัน</button>
                <div style="height: 20px; width: 1px; background: var(--border-glass); margin: 0 0.25rem;"></div>
                <select id="templateSelect" class="form-select" style="width: 200px; padding: 0.5rem;">
                  <option value="" disabled selected>-- เลือกรายชื่อที่บันทึกไว้ --</option>
                </select>
                <button type="button" id="loadTemplateBtn" class="btn btn-secondary btn-small" style="padding: 0.5rem 1rem;">📂 โหลดใช้งาน</button>
                <button type="button" id="deleteTemplateBtn" class="btn btn-danger btn-small" style="padding: 0.5rem 0.8rem; border-radius: 8px;">🗑️ ลบ</button>
              </div>
            </div>

            <!-- Search Bar for Claims -->
            <div class="search-bar-container" style="margin-bottom: 1rem; display: flex; gap: 0.5rem; max-width: 400px; padding: 0 0.5rem;">
              <input type="text" id="employeeSearchInput" class="form-input" placeholder="🔍 พิมพ์ชื่อ, ตำแหน่ง หรือหน้าที่ เพื่อค้นหา..." style="margin: 0; padding: 0.5rem 0.75rem; font-size: 0.9rem;" />
            </div>

            <!-- Scrollable Table Container -->
            <div class="table-container" id="regularTableContainer">
              <table id="employeeTable">
                <thead>
                  <tr>
                    <th>ลำดับ</th>
                    <th>ชื่อ - นามสกุล</th>
                    <th>ตำแหน่ง/บทบาท</th>
                    <th>รายละเอียด/ด้านจ่าย</th>
                    <th>ปริมาณน้ำมัน (ลิตร)</th>
                    <th>ค่าน้ำมัน (บาท)</th>
                    <th>ค่าบำรุงรักษา (บาท)</th>
                    <th>รวมเบิกจ่าย (บาท)</th>
                    <th>ลงนามผู้รับ</th>
                    <th class="actions-col">จัดการ</th>
                  </tr>
                </thead>
                <tbody id="employeeTableBody">
                  <tr>
                    <td colspan="10" class="no-data">ยังไม่มีข้อมูลในตาราง กรุณากรอกข้อมูลด้านซ้าย หรือคัดลอกรายชื่อจากเดือนก่อน</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Scrollable Table Container (Substitute) -->
            <div class="table-container hidden" id="substituteTableContainer" style="margin-top: 2rem; border-top: 1px dashed var(--border-glass); padding-top: 1.5rem;">
              <h4 style="font-weight: 700; color: var(--post-orange); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.4rem;">
                <span>🏃 รายการเบิกวิ่งแทน (วิ่งแทน)</span>
              </h4>
              <table id="employeeSubstituteTable">
                <thead>
                  <tr>
                    <th>ลำดับ</th>
                    <th>ชื่อ - นามสกุล</th>
                    <th>ตำแหน่ง/บทบาท</th>
                    <th>รายละเอียด/ด้านจ่าย</th>
                    <th>ปริมาณน้ำมัน (ลิตร)</th>
                    <th>ค่าน้ำมัน (บาท)</th>
                    <th>ค่าบำรุงรักษา (บาท)</th>
                    <th>รวมเบิกจ่าย (บาท)</th>
                    <th>ลงนามผู้รับ</th>
                    <th class="actions-col">จัดการ</th>
                  </tr>
                </thead>
                <tbody id="employeeSubstituteTableBody">
                  <tr>
                    <td colspan="10" class="no-data">ยังไม่มีรายการวิ่งแทน</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

  </div>
</div>
    <!-- Modal: Weighted Average Oil Price Calculator -->
    <div id="avgCalcModal" class="modal-overlay">
      <div class="modal-content glass-modal animate-slide-in">
        <div class="modal-header">
          <h3>เครื่องมือคำนวณราคาน้ำมันเฉลี่ยถ่วงน้ำหนัก (ถัวเฉลี่ยรายวัน)</h3>
          <button type="button" id="closeAvgModalBtn" class="btn-close">&times;</button>
        </div>
        <div class="modal-body">
          <p class="modal-instruction">
            คำนวณราคาเฉลี่ยน้ำมันเชื้อเพลิงถ่วงน้ำหนักตามจำนวนวันในเดือนนั้น ๆ ตามระเบียบไปรษณีย์ไทย ข้อ 1.5 และ 2.2
          </p>
          
          <div class="form-row-3" style="align-items: flex-end;">
            <div class="form-group">
              <label for="priceInput">ราคาน้ำมันในช่วงเวลานั้น (บาท)</label>
              <input type="number" id="priceInput" class="form-input" placeholder="เช่น 30.18" step="0.01" />
            </div>
            <div class="form-group">
              <label for="daysInput">จำนวนวันทีใช้ราคานี้ (วัน)</label>
              <input type="number" id="daysInput" class="form-input" placeholder="เช่น 9" min="1" max="31" />
            </div>
            <button type="button" id="addPeriodBtn" class="btn btn-primary" style="height: 42px; margin-bottom: 4px;">
              ➕ เพิ่มช่วงราคา
            </button>
          </div>

          <div class="modal-table-container">
            <table class="modal-table">
              <thead>
                <tr>
                  <th>ช่วงที่</th>
                  <th>ราคาน้ำมัน (บาท/ลิตร)</th>
                  <th>จำนวนวันที่ใช้ราคานี้ (วัน)</th>
                  <th>ราคารวมสะสม (บาท)</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody id="periodTableBody">
                <tr>
                  <td colspan="5" class="no-data">ยังไม่มีการเพิ่มช่วงราคา</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="modal-summary-box">
            <div class="summary-line">
              <span>จำนวนวันสะสมทั้งหมด:</span>
              <strong id="avgCalcTotalDays">0 วัน</strong>
            </div>
            <div class="summary-line">
              <span>ผลคูณราคารวมสะสม:</span>
              <strong id="avgCalcTotalSum">0.00 บาท</strong>
            </div>
            <div class="summary-line final">
              <span>ราคาน้ำมันถัวเฉลี่ยถ่วงน้ำหนักสุทธิ:</span>
              <span id="avgCalcResultPrice">0.00 บาท/ลิตร</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" id="cancelAvgBtn" class="btn btn-secondary">ยกเลิก</button>
          <button type="button" id="applyAvgPriceBtn" class="btn btn-primary" disabled>
            ✔️ นำราคานี้ไปใช้เป็นค่าราคากลาง
          </button>
        </div>
      </div>
    </div>


    <div id="routeEditorModal" class="modal-overlay">
      <div class="modal-content glass-modal animate-slide-in" style="max-width: 800px;">
        <div class="modal-header">
          <h3>⚙️ แก้ไขตารางสถิติด้านจ่ายอ้างอิง (ด้านที่ 1 - 40)</h3>
          <button type="button" id="closeRouteEditorModalBtn" class="btn-close">&times;</button>
        </div>
        <div class="modal-body">
          <p class="modal-instruction">
            แก้ไขระยะทางและปริมาณน้ำมันอ้างอิงสำหรับพนักงาน (รายเดือน) และลูกจ้าง (รายวัน) ข้อมูลนี้จะถูกบันทึกเพื่อใช้เป็นฐานข้อมูลในการคำนวณเบิกจ่ายของทุกรายชื่อ
          </p>

          <!-- Edit Form -->
          <div style="background: rgba(0, 0, 0, 0.03); border: 1px solid var(--border-glass); border-radius: var(--radius-small); padding: 1.25rem; margin-bottom: 1.25rem;">
            <div style="font-weight: 700; color: var(--text-highlight); margin-bottom: 0.75rem; font-size: 0.95rem;">✏️ ฟอร์มแก้ไขข้อมูลด้านจ่าย</div>
            
            <div class="form-row-3" style="grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 0.75rem;">
              <div class="form-group">
                <label for="editRouteSelect">เลือกด้านจ่ายที่ต้องการแก้</label>
                <select id="editRouteSelect" class="form-select">
                  <!-- Loaded via JS -->
                </select>
              </div>
              <div class="form-group">
                <label for="routeDistDay">ระยะทางต่อวัน (กิโลเมตร)</label>
                <input type="number" id="routeDistDay" class="form-input" step="0.01" value="0" />
              </div>
              <div class="form-group">
                <label for="routeFuelDay">น้ำมันต่อวัน (ลิตร)</label>
                <input type="number" id="routeFuelDay" class="form-input" step="0.01" value="0" />
              </div>
            </div>

            <div class="form-row-3" style="grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 0.75rem;">
              <div class="form-group">
                <label for="routeDistMonth">ระยะทางต่อเดือน (กิโลเมตร)</label>
                <input type="number" id="routeDistMonth" class="form-input" step="0.01" value="0" />
              </div>
              <div class="form-group">
                <label for="routeFuelMonth">น้ำมันต่อเดือน (ลิตร)</label>
                <input type="number" id="routeFuelMonth" class="form-input" step="0.01" value="0" />
              </div>
              <div class="form-group">
                <label for="routeHasCar">ประเภทพาหนะหลัก</label>
                <select id="routeHasCar" class="form-select">
                  <option value="false">รถจักรยานยนต์ / อื่นๆ</option>
                  <option value="true">รถยนต์ (บำรุง 2.25 บ./กม.)</option>
                </select>
              </div>
            </div>

            <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem;">
              <button type="button" id="saveSingleRouteBtn" class="btn btn-primary btn-small">✔️ อัปเดตด้านจ่ายนี้</button>
            </div>
          </div>

          <!-- All Routes Scrollable Table -->
          <div style="font-weight: 700; margin-bottom: 0.5rem; font-size: 0.9rem;">📋 ตารางข้อมูลด้านจ่ายปัจจุบัน (1 - 40)</div>
          <div class="modal-table-container" style="max-height: 250px;">
            <table class="modal-table">
              <thead>
                <tr>
                  <th>ด้านที่</th>
                  <th>พาหนะ</th>
                  <th>ระยะทาง/วัน</th>
                  <th>น้ำมัน/วัน</th>
                  <th>ระยะทาง/เดือน</th>
                  <th>น้ำมัน/เดือน</th>
                  <th>เลือก</th>
                </tr>
              </thead>
              <tbody id="routeEditorTableBody">
                <!-- Rendered dynamically -->
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer" style="justify-content: space-between;">
          <button type="button" id="resetAllRoutesBtn" class="btn btn-danger btn-small">🔄 รีเซ็ตเป็นค่าเริ่มต้นทั้งหมด</button>
          <button type="button" id="closeRouteEditorBtn" class="btn btn-secondary btn-small">ปิดหน้าต่าง</button>
        </div>
      </div>
    </div>


    <div id="sigProfilesModal" class="modal-overlay">
      <div class="modal-content glass-modal animate-slide-in" style="max-width: 900px;">
        <div class="modal-header">
          <h3>📂 จัดการเทมเพลตผู้ลงนาม (Signatory Templates)</h3>
          <button type="button" id="closeSigProfilesModalBtn" class="btn-close">&times;</button>
        </div>
        <div class="modal-body">
          <p class="modal-instruction">
            บันทึก แก้ไข หรือเลือกสลับชุดผู้ลงนามตามโครงสร้างสาขา/แผนก เพื่อใช้จัดพิมพ์รายงานการเบิกเงินอย่างยืดหยุ่น
          </p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
            <!-- LEFT COLUMN: Form to Save/Edit Signatories -->
            <div style="background: rgba(0, 0, 0, 0.03); border: 1px solid var(--border-glass); border-radius: var(--radius-small); padding: 1.25rem;">
              <div style="font-weight: 700; color: var(--text-highlight); margin-bottom: 0.75rem; font-size: 0.95rem;">📥 บันทึกชุดผู้ลงนามใหม่</div>
              
              <div class="form-group">
                <label for="sigProfileNameInput">ชื่อโปรไฟล์เทมเพลต</label>
                <input type="text" id="sigProfileNameInput" class="form-input" placeholder="เช่น ฝ่ายนำจ่าย แผนก 1" />
              </div>

              <!-- Maker Inputs -->
              <div class="form-group" style="margin-bottom: 0.75rem;">
                <label style="color: var(--post-orange); font-weight: 700;">✍️ ชุดที่ 1: ผู้จัดทำ</label>
                <div style="display: grid; grid-template-columns: 1fr 1.5fr 1.5fr; gap: 0.4rem; margin-top: 0.25rem;">
                  <input type="text" id="modalSigMakerTitle" class="form-input" placeholder="บทบาท" value="ผู้จัดทำ" />
                  <input type="text" id="modalSigMakerName" class="form-input" placeholder="ชื่อ-นามสกุล" />
                  <input type="text" id="modalSigMakerPos" class="form-input" placeholder="ตำแหน่ง" />
                </div>
              </div>

              <!-- Checker Inputs -->
              <div class="form-group" style="margin-bottom: 0.75rem;">
                <label style="color: var(--post-orange); font-weight: 700;">✍️ ชุดที่ 2: ผู้ตรวจสอบ</label>
                <div style="display: grid; grid-template-columns: 1fr 1.5fr 1.5fr; gap: 0.4rem; margin-top: 0.25rem;">
                  <input type="text" id="modalSigCheckerTitle" class="form-input" placeholder="บทบาท" value="ผู้ตรวจสอบ" />
                  <input type="text" id="modalSigCheckerName" class="form-input" placeholder="ชื่อ-นามสกุล" />
                  <input type="text" id="modalSigCheckerPos" class="form-input" placeholder="ตำแหน่ง" />
                </div>
              </div>

              <!-- Approver Inputs -->
              <div class="form-group" style="margin-bottom: 1.25rem;">
                <label style="color: var(--post-orange); font-weight: 700;">✍️ ภารกิจย่อยที่ 3: ผู้อนุมัติ</label>
                <div style="display: grid; grid-template-columns: 1fr 1.5fr 1.5fr; gap: 0.4rem; margin-top: 0.25rem;">
                  <input type="text" id="modalSigApproverTitle" class="form-input" placeholder="บทบาท" value="ผู้อนุมัติ" />
                  <input type="text" id="modalSigApproverName" class="form-input" placeholder="ชื่อ-นามสกุล" />
                  <input type="text" id="modalSigApproverPos" class="form-input" placeholder="ตำแหน่ง" />
                </div>
              </div>

              <button type="button" id="saveSigProfileBtn" class="btn btn-primary" style="width: 100%;">
                📥 บันทึกเป็นเทมเพลตผู้ลงนาม
              </button>
            </div>

            <!-- RIGHT COLUMN: Saved Profiles List -->
            <div>
              <div style="font-weight: 700; margin-bottom: 0.75rem; font-size: 0.95rem; color: var(--text-highlight);">📋 รายการเทมเพลตผู้ลงนามบนคลาวด์</div>
              
              <div class="modal-table-container" style="max-height: 400px; border: 1px solid var(--border-glass); border-radius: var(--radius-small);">
                <table class="modal-table">
                  <thead>
                    <tr>
                      <th>ชื่อโปรไฟล์</th>
                      <th>รายละเอียดผู้ลงนาม</th>
                      <th>การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody id="sigProfilesTableBody">
                    <!-- Rendered dynamically -->
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" id="closeSigProfilesBtn" class="btn btn-secondary btn-small">ปิดหน้าต่าง</button>
        </div>

      </div>
    </div>


    <!-- Modal: Edit Employee (Popup) -->
    <div id="editEmployeeModal" class="modal-overlay">
      <div class="modal-content glass-modal animate-slide-in" style="max-width: 500px;">
        <div class="modal-header">
          <h3>✏️ แก้ไขข้อมูลพนักงาน</h3>
          <button type="button" id="closeEditModalBtn" class="btn-close">&times;</button>
        </div>
        <form id="editEmployeeForm">
          <input type="hidden" id="modalEditIndex" value="" />
          <div class="modal-body">
            <div class="form-group">
              <label for="modalEmpName">ชื่อ - นามสกุล</label>
              <input type="text" id="modalEmpName" class="form-input" required />
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label for="modalEmpPosition">ตำแหน่ง</label>
                <select id="modalEmpPosition" class="form-select">
                  <option value="หน.ปณ.">หน.ปณ.</option>
                  <option value="พนักงาน">พนักงาน</option>
                  <option value="ลูกจ้างประจำ">ลูกจ้างประจำ</option>
                  <option value="ลูกจ้าง">ลูกจ้าง</option>
                  <option value="ลูกจ้างเหมา">ลูกจ้างเหมา</option>
                </select>
              </div>
              <div class="form-group" id="modalEmpDutyGroup">
                <label for="modalEmpDuty">หน้าที่</label>
                <select id="modalEmpDuty" class="form-select">
                  <option value="เจ้าหน้าที่นำจ่ายไปรษณีย์/EMS/ด้านจ่ายพิเศษ">เจ้าหน้าที่นำจ่ายไปรษณีย์/EMS/ด้านจ่ายพิเศษ</option>
                  <option value="เจ้าหน้าที่ไขตู้ไปรษณีย์">เจ้าหน้าที่ไขตู้ไปรษณีย์</option>
                  <option value="หัวหน้าโซนนำจ่าย">หัวหน้าโซนนำจ่าย</option>
                  <option value="เจ้าหน้าที่รับฝากนอกที่ทำการ">เจ้าหน้าที่รับฝากนอกที่ทำการ</option>
                  <option value="ปณอ.(รับ/จ่าย)/ผู้ช่วยนำจ่าย">ปณอ.(รับ/จ่าย)/ผู้ช่วยนำจ่าย</option>
                </select>
              </div>
            </div>

            <!-- Fuel Mode specific inputs -->
            <div id="modalFuelFields">
              <div class="form-group">
                <label for="modalDeliveryRoute">ด้านจ่ายประจำที่</label>
                <select id="modalDeliveryRoute" class="form-select">
                  <!-- Dynamically populated -->
                </select>
              </div>
              <div class="form-row-2">
                <div class="form-group">
                  <label for="modalVehicleType">ประเภทพาหนะ</label>
                  <select id="modalVehicleType" class="form-select">
                    <option value="รถจักรยานยนต์">รถจักรยานยนต์</option>
                    <option value="รถจักรยานยนต์ไฟฟ้า">รถจักรยานยนต์ไฟฟ้า</option>
                    <option value="เรือยนต์">เรือยนต์</option>
                    <option value="รถยนต์">รถยนต์</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="modalClaimMethod">รูปแบบการเบิก</label>
                  <select id="modalClaimMethod" class="form-select">
                    <option value="monthly">เบิกจ่ายรายเดือน (เต็มสิทธิ์)</option>
                    <option value="daily">เบิกจ่ายตามวันทำงานจริง</option>
                  </select>
                </div>
              </div>
              <div class="form-group" id="modalDaysNotWorkedGroup">
                <label for="modalDaysNotWorked">จำนวนวันที่ไม่ได้นำรถมาใช้ (วัน)</label>
                <input type="number" id="modalDaysNotWorked" class="form-input" min="0" max="31" value="0" />
              </div>
              <div class="form-group" style="flex-direction: row; align-items: center; gap: 0.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem;">
                <input type="checkbox" id="modalIsSubstitute" style="width: 20px; height: 20px; cursor: pointer;" />
                <label for="modalIsSubstitute" style="font-weight: 700; color: var(--post-orange); cursor: pointer; margin: 0; user-select: none;">
                  🏃 ปฏิบัติงานวิ่งแทน (เบิกเฉพาะค่าน้ำมัน)
                </label>
              </div>
            </div>

            <!-- Water Mode specific inputs -->
            <div id="modalWaterFields" class="hidden">
              <div class="form-group">
                <label for="modalEmpSalary">เงินเดือน (บาท)</label>
                <input type="number" id="modalEmpSalary" class="form-input text-highlight" value="0" />
              </div>
            </div>

            <!-- Common inputs -->
            <div class="form-group">
              <label for="modalWorkDays">จำนวนวันที่ปฏิบัติงานจริง (วัน)</label>
              <input type="number" id="modalWorkDays" class="form-input" min="0" max="31" value="26" required />
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label for="modalRemarks">หมายเหตุ</label>
                <input type="text" id="modalRemarks" class="form-input" />
              </div>
              <div class="form-group">
                <label for="modalSignature">ลงนามรับเงิน</label>
                <input type="text" id="modalSignature" class="form-input" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" id="cancelEditModalBtn" class="btn btn-secondary">ยกเลิก</button>
            <button type="submit" class="btn btn-primary">✔️ อัปเดตข้อมูล</button>
          </div>
        </form>
      </div>
    </div>


    <!-- Modal: Attendance Import from Excel (Popup) -->
    <div id="attendanceImportModal" class="modal-overlay">
      <div class="modal-content glass-modal animate-slide-in" style="max-width: 800px; width: 95%;">
        <div class="modal-header">
          <h3>📥 นำเข้าวันทำงานจาก Excel</h3>
          <button type="button" id="closeImportModalBtn" class="btn-close">&times;</button>
        </div>
        <div class="modal-body" style="max-height: 75vh; overflow-y: auto; padding: 1.5rem;">
          <p class="modal-instruction" style="margin-bottom: 1.25rem; color: var(--text-secondary); font-size: 0.85rem; line-height: 1.6;">
            💡 <strong>คำแนะนำ:</strong> ดาวน์โหลดเทมเพลต Excel ด้านล่างนี้เพื่อบันทึกเวลาทำงาน จากนั้นนำมาอัปโหลดเข้าสู่ระบบ หรือใช้การวางข้อมูลดิบเพื่อประมวลผลทันที
          </p>

          <div style="margin-bottom: 1.5rem; display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
            <button type="button" id="downloadAttendanceTemplateBtn" class="btn btn-secondary btn-small" style="border: 1px solid var(--post-orange); color: var(--post-orange); background: rgba(245, 158, 11, 0.05); display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.5rem 1rem;">
              🟢 ดาวน์โหลดเทมเพลต Excel บันทึกเวลา (.xlsx)
            </button>
          </div>

          <!-- Sleek Tab Controls -->
          <div class="import-tabs" style="display: flex; border-bottom: 2px solid var(--border-glass); margin-bottom: 1.25rem; gap: 1rem;">
            <button type="button" id="tabImportFile" class="import-tab-btn active" style="background: none; border: none; padding: 0.75rem 1rem; font-weight: bold; font-family: var(--font-main); color: var(--post-orange); border-bottom: 3px solid var(--post-orange); cursor: pointer; display: flex; align-items: center; gap: 0.35rem;">
              📂 นำเข้าจากไฟล์โดยตรง
            </button>
            <button type="button" id="tabImportText" class="import-tab-btn" style="background: none; border: none; padding: 0.75rem 1rem; font-weight: bold; font-family: var(--font-main); color: var(--text-secondary); border-bottom: 3px solid transparent; cursor: pointer; display: flex; align-items: center; gap: 0.35rem;">
              📋 วางข้อความแบบเดิม
            </button>
          </div>

          <!-- Tab Content 1: File Upload (Drag & Drop) -->
          <div id="importFileContent" class="tab-panel">
            <div id="dragDropZone" style="border: 2px dashed rgba(16, 185, 129, 0.4); border-radius: 12px; background: rgba(16, 185, 129, 0.02); padding: 2rem 1.5rem; text-align: center; cursor: pointer; transition: all 0.25s ease; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem;">
              <span style="font-size: 2.5rem; filter: drop-shadow(0 4px 6px rgba(16, 185, 129, 0.15));">📊</span>
              <div style="font-weight: bold; color: var(--text-primary); font-size: 0.95rem;">ลากและวางไฟล์เทมเพลต Excel (.xlsx) ที่นี่</div>
              <div style="color: var(--text-secondary); font-size: 0.8rem;">หรือคลิกเพื่อเลือกไฟล์จากคอมพิวเตอร์ของคุณ</div>
              <input type="file" id="attendanceFileSelector" accept=".xlsx, .xls" style="display: none;" />
            </div>
            <div id="selectedFileInfo" class="hidden" style="margin-top: 0.75rem; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; padding: 0.5rem 1rem; display: flex; align-items: center; justify-content: space-between;">
              <span id="fileNameLabel" style="font-size: 0.85rem; font-weight: bold; color: var(--post-emerald);"></span>
              <button type="button" id="clearSelectedFileBtn" style="background: none; border: none; color: var(--post-red); cursor: pointer; font-size: 0.9rem;">✕ นำออก</button>
            </div>
          </div>

          <!-- Tab Content 2: Textarea Paste -->
          <div id="importTextContent" class="tab-panel hidden">
            <div class="form-group">
              <label for="importPastedText" style="font-weight: bold; margin-bottom: 0.5rem; display: block;">วางข้อมูลตารางจาก Excel</label>
              <textarea id="importPastedText" class="form-input" style="height: 140px; font-family: monospace; font-size: 0.8rem; resize: vertical;" placeholder="วางข้อมูลที่นี่ (เช่น:&#10;นาย นิพล ทรัพย์หมื่นแสน   16&#10;นาย พรชัย พาราพันธกุล   0&#10;นาย ศิษฏ์ กลิ่นมาลี   23)"></textarea>
            </div>
          </div>

          <!-- Target Options -->
          <div class="form-group" style="margin: 1.5rem 0 1rem 0; background: rgba(0, 0, 0, 0.01); border: 1px solid var(--border-glass); border-radius: 8px; padding: 0.75rem 1rem;">
            <label style="display: block; margin-bottom: 0.6rem; font-weight: bold; font-size: 0.85rem;">🎯 นำเข้าวันทำงานสู่ระบบ:</label>
            <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; font-size: 0.85rem;">
              <label style="display: flex; align-items: center; gap: 0.35rem; cursor: pointer; font-weight: 600;">
                <input type="radio" name="importTargetMode" value="both" checked />
                🔄 ทั้ง 2 ระบบ (ค่าน้ำมัน & ค่าน้ำดื่ม)
              </label>
              <label style="display: flex; align-items: center; gap: 0.35rem; cursor: pointer;">
                <input type="radio" name="importTargetMode" value="fuel" />
                ⛽ เฉพาะระบบค่าน้ำมัน
              </label>
              <label style="display: flex; align-items: center; gap: 0.35rem; cursor: pointer;">
                <input type="radio" name="importTargetMode" value="water" />
                🥤 เฉพาะระบบค่าน้ำดื่ม
              </label>
            </div>
          </div>

          <!-- Preview Area -->
          <div class="modal-table-container" style="margin-top: 1rem; border: 1px solid var(--border-glass); border-radius: var(--radius-small); background: rgba(0, 0, 0, 0.02); max-height: 220px; overflow-y: auto;">
            <table class="modal-table" style="width: 100%;">
              <thead>
                <tr>
                  <th style="width: 45%;">รายชื่อที่ตรวจพบ</th>
                  <th style="width: 35%;">สถานะการจับคู่พนักงาน</th>
                  <th style="width: 20%;">วันทำงานใหม่</th>
                </tr>
              </thead>
              <tbody id="importPreviewTableBody">
                <tr>
                  <td colspan="3" class="no-data" style="text-align: center; padding: 1.5rem;">ยังไม่มีข้อมูล รอโหลดไฟล์หรือวางข้อมูลเพื่อประมวลผล</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" id="cancelImportBtn" class="btn btn-secondary">ยกเลิก</button>
          <button type="button" id="submitImportBtn" class="btn btn-primary" style="background: var(--post-emerald); border-color: var(--post-emerald);" disabled>
            ✔️ ยืนยันนำเข้าข้อมูล
          </button>
        </div>
      </div>
    </div>
    <!-- Modal: Resolve Duplicate Personnel Name -->
    <div id="duplicateResolutionModal" class="modal-overlay">
      <div class="modal-content glass-modal animate-slide-in" style="max-width: 650px; width: 95%;">
        <div class="modal-header">
          <h3>⚠️ ตรวจพบรายชื่อซ้ำในระบบ</h3>
          <button type="button" id="closeDuplicateResolutionModalBtn" class="btn-close">&times;</button>
        </div>
        <div class="modal-body" style="padding: 1.5rem; overflow-y: auto; max-height: 70vh;">
          <p style="margin-bottom: 1.25rem; color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5;">
            พบรายชื่อ <strong style="font-size: 1.05rem; color: var(--post-orange);"><span id="duplicateTargetName"></span></strong> มีข้อมูลอยู่ในระบบแล้ว กรุณาเลือกดำเนินการอย่างใดอย่างหนึ่งด้านล่าง:
          </p>
          
          <div style="font-weight: 700; margin-bottom: 0.75rem; font-size: 0.9rem; color: var(--text-primary);">📥 เลือกบันทึกทับข้อมูลรายการเดิม:</div>
          <div id="duplicateRecordsList" style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem; max-height: 250px; overflow-y: auto; padding-right: 0.25rem;">
            <!-- Dynamic list of duplicates to overwrite -->
          </div>
        </div>
        <div class="modal-footer" style="display: flex; gap: 0.75rem; justify-content: space-between; flex-wrap: wrap;">
          <button type="button" id="addNewPersonnelBtn" class="btn btn-secondary" style="background: rgba(16, 185, 129, 0.1); border-color: var(--post-emerald); color: var(--post-emerald); display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.5rem 1rem;">
            ➕ ลงทะเบียนเป็นคนใหม่
          </button>
          <button type="button" id="cancelDuplicateResolutionBtn" class="btn btn-secondary" style="padding: 0.5rem 1rem;">ยกเลิก</button>
        </div>
      </div>
    </div>

    <!-- Modal: Resolve Duplicates in Personnel Import -->
    <div id="personnelImportDuplicateModal" class="modal-overlay">
      <div class="modal-content glass-modal animate-slide-in" style="max-width: 750px; width: 95%;">
        <div class="modal-header">
          <h3>⚠️ ตรวจพบรายชื่อซ้ำในการนำเข้าข้อมูล</h3>
          <button type="button" id="closePersonnelImportDuplicateModalBtn" class="btn-close">&times;</button>
        </div>
        <div class="modal-body" style="padding: 1.5rem; max-height: 60vh; overflow-y: auto;">
          <p style="margin-bottom: 1.25rem; color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5;">
            พบรายชื่อพนักงานที่กำลังนำเข้าซ้ำกับข้อมูลเดิม in ระบบจำนวน <strong id="importDuplicateCount" style="color: var(--post-orange); font-size: 1.05rem;">0</strong> รายการ กรุณาเลือกข้อมูลที่คุณต้องการใช้งานสำหรับแต่ละบุคคล:
          </p>
          
          <div style="display: flex; gap: 0.5rem; margin-bottom: 1.25rem;">
            <button type="button" id="setAllImportNewBtn" class="btn btn-secondary btn-small" style="font-size: 0.8rem; padding: 0.35rem 0.6rem; border: 1px solid var(--post-orange); color: var(--post-orange); background: rgba(245, 158, 11, 0.05);">📥 ใช้ข้อมูลนำเข้า (ใหม่) ทั้งหมด</button>
            <button type="button" id="setAllImportOldBtn" class="btn btn-secondary btn-small" style="font-size: 0.8rem; padding: 0.35rem 0.6rem; border: 1px solid #71717a; color: #a1a1aa; background: rgba(113, 113, 122, 0.05);">💾 ใช้ข้อมูลเดิม (เก่า) ทั้งหมด</button>
          </div>

          <div id="importDuplicateListContainer" style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem;">
            <!-- Dynamic comparison items go here -->
          </div>
        </div>
        <div class="modal-footer" style="display: flex; gap: 0.5rem; justify-content: flex-end;">
          <button type="button" id="cancelPersonnelImportDuplicateBtn" class="btn btn-secondary">ยกเลิก</button>
          <button type="button" id="confirmPersonnelImportDuplicateBtn" class="btn btn-primary" style="background: var(--post-emerald); border-color: var(--post-emerald);">✔️ บันทึกและนำเข้า</button>
        </div>
      </div>
    </div>

    <!-- Modal: Database Duplicate Scan Results -->
    <div id="duplicateScanModal" class="modal-overlay">
      <div class="modal-content glass-modal animate-slide-in" style="max-width: 700px; width: 95%;">
        <div class="modal-header">
          <h3>🔍 ผลการตรวจสอบรายชื่อซ้ำในระบบ</h3>
          <button type="button" id="closeDuplicateScanModalBtn" class="btn-close">&times;</button>
        </div>
        <div class="modal-body" style="padding: 1.5rem; max-height: 60vh; overflow-y: auto;">
          <p style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem; line-height: 1.4;">
            ระบบตรวจพบกลุ่มรายชื่อซ้ำกันในทำเนียบพนักงานดังนี้ กรุณาตรวจสอบและลบหรือแก้ไขตามต้องการ:
          </p>
          <div id="duplicateScanResultsList" style="display: flex; flex-direction: column; gap: 1.25rem;">
            <!-- Duplicate name groups dynamically rendered here -->
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" id="closeDuplicateScanBtn" class="btn btn-secondary">ปิดหน้าต่าง</button>
        </div>
      </div>
    </div>`;
}
