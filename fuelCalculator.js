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

  const currentFuelPrice = parseFloat(globalFuelPriceInput ? globalFuelPriceInput.value : 38.50) || 38.50;
  const ROUTE_DATA = getRouteData();
  const employees = getEmployees();

  // Sort fuel employees by name (Thai alphabetical order ก-ฮ)
  employees.sort((a, b) => a.name.localeCompare(b.name, 'th'));

  if (employees.length === 0) {
    if (employeeTableBody) {
      employeeTableBody.innerHTML = `
        <tr>
          <td colspan="10" class="no-data">ยังไม่มีข้อมูลในตาราง กรุณากรอกข้อมูลด้านซ้าย หรือคลิก "โหลดข้อมูลตัวอย่าง"</td>
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
        remarks: item.remarks
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
          remarks: item.remarks
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
          remarks: item.remarks
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
      if (window.openEditModal) window.openEditModal(false, row.parentIndex);
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
  saveEmployees(employees);
  renderFuelTable();
  window.showToast('คัดลอกข้อมูลพนักงานเสร็จเรียบร้อย!', 'success');
}

export function deleteRow(index) {
  const employees = getEmployees();
  window.showConfirm({
    title: 'ยืนยันการลบ',
    message: 'คุณแน่ใจว่าต้องการลบรายการนี้ใช่หรือไม่? ผลลัพธ์นี้ไม่สามารถย้อนคืนได้',
    icon: '🗑️',
    okText: 'ลบข้อมูล',
    onConfirm: async () => {
      employees.splice(index, 1);
      setEmployees(employees);
      await saveEmployees(employees);
      renderFuelTable();
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
  await saveEmployees(employees);
  document.getElementById('employeeForm').reset();
  const routeStatsPreview = document.getElementById('routeStatsPreview');
  if (routeStatsPreview) routeStatsPreview.classList.add('hidden');
  tempMissions = [];
  
  if (formMode === 'supervisor') {
    renderMissionsTable();
  }
  
  renderFuelTable();
  window.showToast(isEdit ? 'อัปเดตข้อมูลสำเร็จ!' : 'บันทึกข้อมูลสำเร็จ!', 'success');
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

  const sigMakerTitleVal = document.getElementById('sigMakerTitle').value.trim() || 'ผู้จัดทำ';
  const sigMakerNameVal = document.getElementById('sigMakerName').value.trim() || '..........................................................';
  const sigMakerPosVal = document.getElementById('sigMakerPos').value.trim() || '..........................................................';
  
  const sigCheckerTitleVal = document.getElementById('sigCheckerTitle').value.trim() || 'ผู้ตรวจสอบ';
  const sigCheckerNameVal = document.getElementById('sigCheckerName').value.trim() || '..........................................................';
  const sigCheckerPosVal = document.getElementById('sigCheckerPos').value.trim() || '..........................................................';
  
  const sigApproverTitleVal = document.getElementById('sigApproverTitle').value.trim() || 'ผู้อนุมัติ';
  const sigApproverNameVal = document.getElementById('sigApproverName').value.trim() || '..........................................................';
  const sigApproverPosVal = document.getElementById('sigApproverPos').value.trim() || '..........................................................';

  let missionsHtml = '';
  item.missions.forEach((mission, idx) => {
    missionsHtml += `
      <tr>
        <td>${idx + 1}</td>
        <td>${mission.type}</td>
        <td>ด้านที่ ${mission.route}</td>
        <td>${mission.days} วัน</td>
        <td>${mission.dates || '-'}</td>
        <td>${mission.distance.toFixed(1)} กม.</td>
      </tr>
    `;
  });

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>แผนภูมิภารกิจ ชนจ. - ${item.name}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Sarabun', sans-serif;
          padding: 1cm;
          font-size: 11pt;
          line-height: 1.6;
        }
        h2, h3 {
          text-align: center;
          margin: 0.2rem 0;
        }
        .meta-table {
          width: 100%;
          margin-bottom: 1rem;
          border-collapse: collapse;
        }
        .meta-table td {
          padding: 4px;
        }
        .plan-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
          margin-bottom: 2rem;
        }
        .plan-table th, .plan-table td {
          border: 1px solid black;
          padding: 8px;
          text-align: center;
        }
        .plan-table th {
          background-color: #f2f2f2;
        }
        .print-signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 3rem;
          page-break-inside: avoid;
        }
        .sig-box {
          text-align: center;
          width: 32%;
        }
      </style>
    </head>
    <body>
      <h2>แผนภูมิแสดงรายละเอียดภารกิจตรวจการนำจ่ายและเดินทางนำจ่ายแทน</h2>
      <h3>ประจำเดือน ${m} พ.ศ. ${y}</h3>
      <br>
      <table class="meta-table">
        <tr>
          <td><strong>ชื่อ-นามสกุล:</strong> ${item.name}</td>
          <td><strong>ตำแหน่ง:</strong> ${item.position}</td>
        </tr>
        <tr>
          <td><strong>หน้าที่:</strong> หัวหน้าโซนนำจ่าย (ชนจ.)</td>
          <td><strong>ที่ทำการไปรษณีย์:</strong> ปณ. ${postOffice}</td>
        </tr>
        <tr>
          <td><strong>ประเภทพาหนะ:</strong> ${item.vehicle}</td>
          <td><strong>จำนวนวันปฏิบัติภารกิจรวม:</strong> ${item.workDays} วัน</td>
        </tr>
      </table>

      <table class="plan-table">
        <thead>
          <tr>
            <th>ภารกิจที่</th>
            <th>ประเภทภารกิจ</th>
            <th>ด้านจ่าย/เป้าหมาย</th>
            <th>จำนวนวันปฏิบัติงาน</th>
            <th>วันที่ปฏิบัติงาน (วันที่ระบุ)</th>
            <th>ระยะทางเดินทางสะสม</th>
          </tr>
        </thead>
        <tbody>
          ${missionsHtml}
        </tbody>
      </table>

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
  const avgCalcResultPrice = document.getElementById('avgCalcResultPrice');
  const globalFuelPriceInput = document.getElementById('globalFuelPrice');
  const avgCalcModal = document.getElementById('avgCalcModal');

  if (!avgCalcResultPrice || !globalFuelPriceInput) return;

  const finalPrice = parseFloat(avgCalcResultPrice.textContent) || 0;
  if (finalPrice <= 0) {
    window.showToast('กรุณาคำนวณราคาน้ำมันเฉลี่ยก่อนนำไปใช้งาน!', 'warning');
    return;
  }

  globalFuelPriceInput.value = finalPrice.toFixed(4);
  
  if (avgCalcModal) avgCalcModal.classList.remove('active');
  
  // Recalculate
  renderFuelTable();
  window.showToast(`นำราคาน้ำมันเฉลี่ยถ่วงน้ำหนัก ${finalPrice.toFixed(4)} บาท ไปใช้งานเรียบร้อย!`, 'success');
}

export function exportFuelCsv() {
  const employees = getEmployees();
  if (employees.length === 0) {
    window.showToast('ไม่มีข้อมูลที่จะส่งออก!', 'warning');
    return;
  }

  const globalFuelPriceInput = document.getElementById('globalFuelPrice');
  const currentFuelPrice = parseFloat(globalFuelPriceInput ? globalFuelPriceInput.value : 38.50) || 38.50;
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
  const currentFuelPrice = parseFloat(globalFuelPriceInput ? globalFuelPriceInput.value : 38.50) || 38.50;
  
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

  let listStaffAndRegular = [];
  let listDailyAndTemp = [];
  let listContractors = [];
  let listSubstitutes = [];
  let supervisors = [];

  employees.forEach((item) => {
    if (item.formMode === 'supervisor') {
      supervisors.push(item);
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
        liters: liters,
        fuelCost: fuelCost,
        maintCost: maintCost,
        sumTotal: sumTotal,
        signature: item.signature,
        remarks: item.remarks
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
          <td>${row.workDays} วัน</td>
          <td>${row.liters.toFixed(2)}</td>
          <td>${row.fuelCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td>${row.maintCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td><strong>${row.sumTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
          <td><span style="font-family: 'Sarabun', sans-serif; font-style: italic; font-size: 9pt; color: #444; font-weight: 300;">${row.signature}</span></td>
          <td><span style="font-size: 8pt; color: #444;">${row.remarks}</span></td>
        </tr>
      `;
    }).join('');

    return `
      <div class="print-page">
        <div class="print-header">
          <div class="print-title-container">
            <h2>รายละเอียดบัญชีรายชื่อพนักงานใช้รถจักรยานยนต์ส่วนตัวปฏิบัติหน้าที่นำจ่ายไปรษณีย์ภัณฑ์ค้างจ่าย</h2>
            <h3>กลุ่มงาน: ${title}</h3>
            <p>ประจำเดือน ${monthText} พ.ศ. ${yearText}</p>
          </div>
        </div>

        <table class="print-table">
          <thead>
            <tr>
              <th style="width: 4%">ลำดับ</th>
              <th style="width: 17%">ชื่อ - นามสกุล</th>
              <th style="width: 18%">ตำแหน่ง / บทบาท</th>
              <th style="width: 18%">รายละเอียด/ด้านจ่าย</th>
              <th style="width: 6%">วันทำงาน</th>
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

  // Supervisors (ชนจ.) Pages
  const postOffice = document.getElementById('globalPostOfficeName').value.trim() || '.............................................';
  const ROUTE_DATA = getRouteData();
  supervisors.forEach((sup) => {
    let missionsRowsHtml = sup.missions.map((m, idx) => {
      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${m.type}</td>
          <td>ด้านที่ ${m.route}</td>
          <td>${m.days} วัน</td>
          <td>${m.dates || '-'}</td>
          <td>${m.distance.toFixed(1)} กม.</td>
        </tr>
      `;
    }).join('');

    const supLiters = calculateClaimLiters(sup);
    const supFuelCost = supLiters * currentFuelPrice;
    const supMaint = calculateMaintenanceCost(sup);
    const supTotal = supFuelCost + supMaint;

    const pageSup = `
      <div class="print-page">
        <div class="print-header">
          <div class="print-title-container">
            <h2>ใบสรุปผลการปฏิบัติงานของหัวหน้าโซนนำจ่าย (ชนจ.)</h2>
            <h3>ผู้รายงาน: ${sup.name} (${sup.position}) | ที่ทำการ ปณ. ${postOffice}</h3>
            <p>ประจำเดือน ${monthText} พ.ศ. ${yearText}</p>
          </div>
        </div>

        <h4 style="margin: 0.5rem 0 0.25rem 0; font-size: 8.5pt;">รายละเอียดภารกิจตรวจการนำจ่ายและเดินทางนำจ่ายแทน:</h4>
        <table class="print-table" style="margin-bottom: 0.5rem;">
          <thead>
            <tr>
              <th style="width: 5%">ที่</th>
              <th style="width: 30%">ประเภทภารกิจ</th>
              <th style="width: 15%">เป้าหมายด้านจ่าย</th>
              <th style="width: 15%">จำนวนวันงาน</th>
              <th style="width: 20%">วันที่ปฏิบัติงาน</th>
              <th style="width: 15%">ระยะทางสะสม</th>
            </tr>
          </thead>
          <tbody>
            ${missionsRowsHtml}
          </tbody>
        </table>

        <h4 style="margin: 0.5rem 0 0.25rem 0; font-size: 8.5pt;">สรุปผลการคำนวณเงินค่าพาหนะเบิกจ่ายสะสมประจำเดือน:</h4>
        <table class="print-table">
          <thead>
            <tr>
              <th>ประเภทพาหนะ</th>
              <th>จำนวนวันรวม</th>
              <th>น้ำมันเบิกเฉลี่ยสะสม</th>
              <th>ค่าน้ำมันสะสม (@ ${currentFuelPrice.toFixed(2)} บ.)</th>
              <th>ค่าบำรุงรักษาสะสม</th>
              <th>ยอดเบิกจ่ายรวมสุทธิ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${sup.vehicle}</strong></td>
              <td>${sup.workDays} วัน</td>
              <td>${supLiters.toFixed(2)} ลิตร</td>
              <td>${supFuelCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</td>
              <td>${supMaint.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</td>
              <td><strong style="font-size: 10.5pt;">${supTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</strong></td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 0.5rem; text-align: left; font-size: 7.2pt; border: 1px solid black; padding: 4px; border-radius: 4px;">
          <strong>หมายเหตุสำคัญ (ชนจ. Regulations):</strong><br>
          - ภารกิจ "ตรวจสอบการนำจ่าย" (ตรวจโซน): การเบิกจ่ายน้ำมันและระยะทางเดินทางจะคิดลดลงกึ่งหนึ่ง (50%) จากอัตราเกณฑ์มาตรฐานของผู้นำจ่ายจริง<br>
          - ภารกิจ "นำจ่ายแทน" / "ฝึกสอนงาน": การเบิกจ่ายค่าน้ำมันและค่าพาหนะจะถูกคำนวณเต็มพิกัดอัตราปกติ (100%) ตามจริงของด้านจ่ายนั้นๆ
        </div>

        <div class="print-signatures" style="margin-top: 1rem;">
          <div class="sig-box">
            <p>ลงชื่อ..........................................................ผู้จัดทำ (ชนจ.)</p>
            <p style="margin-top: 0.5rem;">(${sup.signature || sup.name})</p>
            <p>หัวหน้าโซนนำจ่าย</p>
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
    pagesHtml.push(pageSup);
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
          min-height: 297mm;
        }
        .print-page:last-child {
          page-break-after: avoid;
        }
        @page {
          size: A4 portrait;
          margin: 0.2cm;
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
          border: 1px solid black !important;
          padding: 2.2px 2px !important;
          font-size: 6.8pt !important;
          line-height: 1.15 !important;
          color: black !important;
          background: transparent !important;
        }
        .print-table th {
          font-weight: bold !important;
          text-align: center !important;
        }
        .print-table td {
          text-align: center;
          height: 14px !important;
          vertical-align: middle !important;
        }
        .print-table td:nth-child(2) {
          text-align: left !important;
          font-size: 11pt !important;
          font-weight: bold !important;
        }
        .print-table td:nth-child(3) {
          text-align: left !important;
        }
        .print-summary-section {
          display: flex;
          justify-content: flex-end;
          margin-top: 0.2rem !important;
          margin-bottom: 0.2rem !important;
        }
        .summary-block {
          width: 250px;
          font-size: 7pt !important;
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
          font-size: 7.5pt !important;
        }
        .print-signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 0.3rem !important;
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
      await saveEmployees([]);
      renderFuelTable();
      window.showToast('ล้างตารางข้อมูลค่าน้ำมันเรียบร้อยแล้ว!', 'success');
    }
  });
}
