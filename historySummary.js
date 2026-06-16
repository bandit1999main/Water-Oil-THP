import {
  fetchMonthlySummaries,
  fetchEmployeesFromCollection,
  isCloudConnected
} from './database.js';

export function getHistoryTemplate() {
  return `
  <style>
    /* Premium Grid Lines Background for Chart */
    .chart-grid-bg {
      position: absolute;
      top: 25px;
      left: 0;
      right: 0;
      bottom: 35px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      pointer-events: none;
      z-index: 0;
    }
    .chart-grid-line {
      width: 100%;
      height: 1px;
      border-bottom: 1px dashed var(--border-glass);
      opacity: 0.35;
    }
    
    /* Interactive Custom Tooltip */
    .chart-tooltip {
      position: absolute;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      color: #fff;
      padding: 0.6rem 0.8rem;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 600;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.15);
      pointer-events: none;
      opacity: 0;
      transform: translate(-50%, -100%) scale(0.9);
      transition: opacity 0.15s ease, transform 0.15s ease, left 0.1s ease, top 0.1s ease;
      z-index: 10;
      white-space: nowrap;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .chart-tooltip.active {
      opacity: 1;
      transform: translate(-50%, -115%) scale(1);
    }
    .chart-tooltip::after {
      content: '';
      position: absolute;
      bottom: -6px;
      left: 50%;
      transform: translateX(-50%);
      border-width: 6px 6px 0;
      border-style: solid;
      border-color: rgba(15, 23, 42, 0.95) transparent;
      display: block;
      width: 0;
    }

    /* Bar styles & Hover effects */
    .chart-bar {
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
    }
    .chart-bar:hover {
      transform: scaleY(1.05) translateY(-2px);
      box-shadow: 0 6px 15px rgba(0, 0, 0, 0.2);
      filter: brightness(1.15);
    }
    
    /* Responsive adjustment for chart labels */
    @media (max-width: 640px) {
      .chart-bar-column {
        width: 42px !important;
      }
      .chart-bar {
        width: 11px !important;
      }
      .chart-container-wrapper {
        height: 220px !important;
      }
    }
  </style>

  <div class="dashboard-grid animate-fade-in" style="grid-template-columns: 1fr;">
    <div class="panel-column" style="width: 100%;">
      
      <!-- Metrics Row -->
      <div class="metrics-grid" style="grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1rem;">
        <div class="metric-card bg-orange-glow">
          <div class="metric-info">
            <h3>ยอดค่าน้ำมันเชื้อเพลิงสะสม</h3>
            <p class="metric-value"><span id="histFuelSum">0.00</span> <span class="unit">บาท</span></p>
          </div>
          <div class="metric-icon">⛽</div>
        </div>
        <div class="metric-card bg-blue-glow">
          <div class="metric-info">
            <h3>ยอดค่าน้ำดื่มสะสม</h3>
            <p class="metric-value"><span id="histWaterSum">0.00</span> <span class="unit">บาท</span></p>
          </div>
          <div class="metric-icon">🥤</div>
        </div>
        <div class="metric-card bg-emerald-glow">
          <div class="metric-info">
            <h3>ยอดเบิกจ่ายสะสมรวมสุทธิ</h3>
            <p class="metric-value highlight"><span id="histTotalSum">0.00</span> <span class="unit">บาท</span></p>
          </div>
          <div class="metric-icon">💰</div>
        </div>
        <div class="metric-card" style="border-left: 5px solid var(--text-highlight);">
          <div class="metric-info">
            <h3>จำนวนผู้รับเงินเบิกจ่ายสะสม</h3>
            <p class="metric-value"><span id="histPeopleSum">0</span> <span class="unit">รายครั้ง</span></p>
          </div>
          <div class="metric-icon">👥</div>
        </div>
      </div>

      <!-- Financial Chart Card -->
      <div class="glass-card" id="historyChartCard" style="margin-bottom: 1.5rem; padding: 1.5rem;">
        <div class="card-header" style="margin-bottom: 1rem; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.5rem;">
          <span class="card-icon">📈</span>
          <h3 style="font-size: 1.1rem; font-weight: 700;">กราฟแสดงแนวโน้มค่าใช้จ่ายรายเดือน (ค่าน้ำมัน vs ค่าน้ำดื่ม)</h3>
        </div>
        <div class="chart-container-wrapper" style="width: 100%; height: 260px; display: flex; align-items: flex-end; justify-content: space-between; padding: 1.5rem 1rem 0.5rem 1rem; background: rgba(0,0,0,0.02); border-radius: 8px; border: 1px solid var(--border-glass); position: relative;">
          <!-- Grid lines background -->
          <div class="chart-grid-bg">
            <div class="chart-grid-line"></div>
            <div class="chart-grid-line"></div>
            <div class="chart-grid-line"></div>
            <div class="chart-grid-line"></div>
          </div>
          <!-- Dynamic Tooltip -->
          <div id="chartTooltip" class="chart-tooltip"></div>

          <!-- Left Axis labels -->
          <div style="position: absolute; left: 8px; top: 8px; font-size: 0.65rem; color: var(--text-secondary); pointer-events: none; z-index: 2;">(บาท)</div>
          
          <div id="chartBarsContainer" style="display: flex; align-items: flex-end; justify-content: space-around; width: 100%; height: 100%;">
            <div style="text-align: center; color: var(--text-secondary); font-size: 0.9rem; width: 100%; margin-bottom: 50px;">
              ไม่มีข้อมูลประวัติสำหรับนำมาวิเคราะห์เปรียบเทียบในกราฟ
            </div>
          </div>
        </div>
        
        <!-- Chart Legend -->
        <div style="display: flex; gap: 1.5rem; justify-content: center; margin-top: 1rem; font-size: 0.8rem; font-weight: 600;">
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <span style="display: inline-block; width: 12px; height: 12px; background: var(--post-orange); border-radius: 3px;"></span>
            <span>ค่าน้ำมันเชื้อเพลิง</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <span style="display: inline-block; width: 12px; height: 12px; background: var(--post-blue); border-radius: 3px;"></span>
            <span>ค่าน้ำดื่มพนักงาน</span>
          </div>
        </div>
      </div>

      <!-- History Table Timeline -->
      <div class="glass-card full-width" id="historyTimelineCard" style="padding: 1.5rem;">
        <div class="card-header table-header-flex" style="margin-bottom: 1rem;">
          <div class="header-left">
            <span class="card-icon">📊</span>
            <h3 style="font-size: 1.1rem; font-weight: 700;">ตารางบันทึกประวัติการเบิกจ่ายรายเดือน</h3>
          </div>
        </div>

        <div class="table-container" style="overflow-x: auto; border-radius: 8px; border: 1px solid var(--border-glass);">
          <table style="width: 100%; border-collapse: separate; border-spacing: 0;">
            <thead>
              <tr>
                <th style="width: 5%; text-align: center;">ที่</th>
                <th style="width: 15%; text-align: center;">รอบเดือน/ปี</th>
                <th style="width: 15%; text-align: right;">ค่าน้ำมันรวม (บาท)</th>
                <th style="width: 15%; text-align: right;">ค่าน้ำดื่มรวม (บาท)</th>
                <th style="width: 12%; text-align: right;">ภาษีค่าน้ำรวม (บาท)</th>
                <th style="width: 15%; text-align: right; font-weight: bold; color: var(--post-orange);">รวมเบิกจ่ายสุทธิ (บาท)</th>
                <th style="width: 10%; text-align: center;">จำนวนบุคลากร</th>
                <th style="width: 13%; text-align: center;">จัดการ</th>
              </tr>
            </thead>
            <tbody id="historyTableBody">
              <tr>
                <td colspan="8" class="no-data" style="text-align: center; padding: 3rem; color: var(--text-secondary); font-style: italic;">
                  ยังไม่มีประวัติการเบิกจ่ายบันทึกอยู่ในระบบคลาวด์ขณะนี้
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </div>

  <!-- Historical Details Modal -->
  <div id="historyDetailsModal" class="modal-overlay" style="z-index: 4000;">
    <div class="glass-card modal-content" style="max-width: 1100px; width: 95%; max-height: 85vh;">
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span style="font-size: 1.5rem;">📂</span>
          <h3 id="historyModalTitle" style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">รายละเอียดข้อมูลประวัติประจำเดือน</h3>
        </div>
        <button type="button" id="closeHistoryDetailsModalBtn" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1.25rem;">✕</button>
      </div>
      <div class="modal-body" style="padding-top: 0.5rem; overflow-y: auto;">
        
        <!-- Toggle Category tab inside modal -->
        <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.5rem;">
          <button type="button" id="historyTabFuel" class="btn btn-small" style="font-weight: bold; background: var(--post-orange); color: white;">⛽ รายชื่อเบิกค่าน้ำมัน</button>
          <button type="button" id="historyTabWater" class="btn btn-small btn-secondary" style="font-weight: bold;">🥤 รายชื่อเบิกค่าน้ำดื่ม</button>
          <button type="button" id="printHistoryModalBtn" class="btn btn-small btn-secondary" style="margin-left: auto; border-color: var(--post-orange); color: var(--post-orange); background: transparent;">🖨️ พิมพ์รายงานของเดือนนี้</button>
        </div>

        <div class="table-container" style="max-height: 400px; overflow-y: auto;">
          <table class="modal-table" style="font-size: 0.85rem;" id="historyModalDetailsTable">
            <thead>
              <!-- Headers swap via JS based on Category tab -->
            </thead>
            <tbody id="historyModalTableBody">
              <!-- Rendered via JS -->
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
  `;
}

// Global scope inside this module for local state caching
let summariesList = [];
let currentViewingSnapshot = { year: null, month: null, fuelList: [], waterList: [] };
let activeModalCategory = 'fuel'; // 'fuel' or 'water'

export async function initHistoryView() {
  const tableBody = document.getElementById('historyTableBody');
  if (!tableBody) return;

  // Set up Modal listeners
  const closeDetailsBtn = document.getElementById('closeHistoryDetailsModalBtn');
  const detailsModal = document.getElementById('historyDetailsModal');
  if (closeDetailsBtn && detailsModal) {
    closeDetailsBtn.addEventListener('click', () => detailsModal.classList.remove('active'));
    detailsModal.addEventListener('click', (e) => {
      if (e.target === detailsModal) detailsModal.classList.remove('active');
    });
  }

  const tabFuel = document.getElementById('historyTabFuel');
  const tabWater = document.getElementById('historyTabWater');
  if (tabFuel && tabWater) {
    tabFuel.addEventListener('click', () => switchHistoryModalCategory('fuel'));
    tabWater.addEventListener('click', () => switchHistoryModalCategory('water'));
  }

  const printModalBtn = document.getElementById('printHistoryModalBtn');
  if (printModalBtn) {
    printModalBtn.addEventListener('click', () => {
      if (activeModalCategory === 'fuel') {
        printHistoricalFuelReport(currentViewingSnapshot.year, currentViewingSnapshot.month, currentViewingSnapshot.fuelList);
      } else {
        printHistoricalWaterReport(currentViewingSnapshot.year, currentViewingSnapshot.month, currentViewingSnapshot.waterList);
      }
    });
  }

  // Load summaries list
  window.showToast('กำลังโหลดข้อมูลประวัติ...', 'info');
  summariesList = await fetchMonthlySummaries();

  // Sort summaries chronologically by YYYY_MM
  summariesList.sort((a, b) => {
    const keyA = `${a.year}_${String(a.month).padStart(2, '0')}`;
    const keyB = `${b.year}_${String(b.month).padStart(2, '0')}`;
    return keyB.localeCompare(keyA); // Newest first for list, but oldest first for chart
  });

  renderSummariesDashboard();
}

function renderSummariesDashboard() {
  const fuelSumSpan = document.getElementById('histFuelSum');
  const waterSumSpan = document.getElementById('histWaterSum');
  const totalSumSpan = document.getElementById('histTotalSum');
  const peopleSumSpan = document.getElementById('histPeopleSum');
  const tableBody = document.getElementById('historyTableBody');
  const chartContainer = document.getElementById('chartBarsContainer');

  if (!tableBody) return;

  if (summariesList.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="no-data" style="text-align: center; padding: 3rem; color: var(--text-secondary); font-style: italic;">
          ยังไม่มีประวัติการเบิกจ่ายบันทึกอยู่ในระบบคลาวด์ขณะนี้
        </td>
      </tr>
    `;
    return;
  }

  // Calculate statistics
  let grandFuelCost = 0;
  let grandWaterCost = 0;
  let grandNetTotal = 0;
  let grandPeople = 0;

  summariesList.forEach(summary => {
    grandFuelCost += (summary.fuelTotalNet || 0);
    grandWaterCost += (summary.waterTotalNet || 0);
    grandNetTotal += ((summary.fuelTotalNet || 0) + (summary.waterTotalNet || 0));
    grandPeople += (summary.totalPersonnelCount || 0);
  });

  if (fuelSumSpan) fuelSumSpan.textContent = grandFuelCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (waterSumSpan) waterSumSpan.textContent = grandWaterCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (totalSumSpan) totalSumSpan.textContent = grandNetTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (peopleSumSpan) peopleSumSpan.textContent = grandPeople.toLocaleString();

  // Render Table Timeline Rows
  let tableHtml = '';
  const monthNames = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  
  summariesList.forEach((summary, index) => {
    const labelMonth = monthNames[summary.month] || '-';
    const labelPeriod = `${labelMonth} ${summary.year}`;
    const fuelVal = (summary.fuelTotalNet || 0);
    const waterVal = (summary.waterTotalCost || 0);
    const waterTaxVal = (summary.waterTotalTax || 0);
    const netSum = fuelVal + (summary.waterTotalNet || 0);
    
    tableHtml += `
      <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td style="text-align: center; font-weight: 700;">${labelPeriod}</td>
        <td style="text-align: right;">${fuelVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right;">${waterVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right; color: var(--post-red);">${waterTaxVal > 0 ? waterTaxVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
        <td style="text-align: right; font-weight: 800; color: var(--post-emerald);">${netSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: center; font-weight: bold;">${summary.totalPersonnelCount || 0} คน</td>
        <td style="text-align: center;">
          <button class="btn btn-secondary btn-small view-snap-btn" data-index="${index}" style="padding: 0.3rem 0.5rem; font-size: 0.75rem; border-color: var(--post-orange); color: var(--post-orange);">📂 ดูรายละเอียด</button>
        </td>
      </tr>
    `;
  });
  tableBody.innerHTML = tableHtml;

  // Bind table row buttons
  tableBody.querySelectorAll('.view-snap-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.getAttribute('data-index'));
      openMonthlyDetails(idx);
    });
  });

  // Render Charts (Chronological order - oldest to newest)
  if (chartContainer) {
    const chartList = [...summariesList].reverse().slice(-12); // Last 12 records oldest to newest
    let maxCost = 1000;
    chartList.forEach(s => {
      const sum = (s.fuelTotalNet || 0) + (s.waterTotalNet || 0);
      if (sum > maxCost) maxCost = sum;
    });

    let chartBarsHtml = '';
    chartList.forEach(s => {
      const fuelCost = s.fuelTotalNet || 0;
      const waterCost = s.waterTotalNet || 0;
      const fuelPercent = (fuelCost / maxCost) * 90; // scale to max 90% height
      const waterPercent = (waterCost / maxCost) * 90;
      
      const labelMonthShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][s.month - 1] || s.month;
      const labelBar = `${labelMonthShort} ${String(s.year).slice(-2)}`;

      chartBarsHtml += `
        <div class="chart-bar-column" style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; width: 50px; z-index: 2;">
          <div style="display: flex; align-items: flex-end; gap: 4px; height: 100%; width: 100%; justify-content: center;">
            <!-- Fuel Bar -->
            <div class="chart-bar" style="height: ${fuelPercent}%; width: 14px; background: linear-gradient(to top, var(--post-orange), hsl(16, 97%, 65%)); border-radius: 4px 4px 0 0; transition: height 0.5s ease; cursor: pointer;" data-tooltip="<strong>⛽ ค่าน้ำมันเชื้อเพลิง</strong><br/>ประจำเดือน ${labelBar}<br/>ยอดเงิน: ${fuelCost.toLocaleString(undefined, {minimumFractionDigits: 2})} บาท"></div>
            <!-- Water Bar -->
            <div class="chart-bar" style="height: ${waterPercent}%; width: 14px; background: linear-gradient(to top, var(--post-blue), hsl(210, 85%, 65%)); border-radius: 4px 4px 0 0; transition: height 0.5s ease; cursor: pointer;" data-tooltip="<strong>🥤 ค่าน้ำดื่มพนักงาน</strong><br/>ประจำเดือน ${labelBar}<br/>ยอดเงิน: ${waterCost.toLocaleString(undefined, {minimumFractionDigits: 2})} บาท"></div>
          </div>
          
          <!-- X Axis label -->
          <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: bold; margin-top: 8px; border-top: 1px solid var(--border-glass); width: 100%; padding-top: 4px; text-align: center;">
            ${labelBar}
          </div>
        </div>
      `;
    });
    chartContainer.innerHTML = chartBarsHtml;

    // Set up dynamic tooltip tracking
    const tooltipEl = document.getElementById('chartTooltip');
    const chartWrapper = document.querySelector('.chart-container-wrapper');
    if (tooltipEl && chartWrapper) {
      chartContainer.querySelectorAll('.chart-bar').forEach(bar => {
        bar.addEventListener('mouseenter', (e) => {
          const text = e.target.getAttribute('data-tooltip');
          tooltipEl.innerHTML = text;
          tooltipEl.classList.add('active');
        });
        
        bar.addEventListener('mousemove', (e) => {
          const rect = chartWrapper.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          tooltipEl.style.left = `${x}px`;
          tooltipEl.style.top = `${y}px`;
        });
        
        bar.addEventListener('mouseleave', () => {
          tooltipEl.classList.remove('active');
        });
      });
    }
  }
}

async function openMonthlyDetails(summaryIdx) {
  const summary = summariesList[summaryIdx];
  if (!summary) return;

  const modal = document.getElementById('historyDetailsModal');
  const modalTitle = document.getElementById('historyModalTitle');
  
  if (!modal || !modalTitle) return;

  const monthNames = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  modalTitle.textContent = `รายละเอียดและใบเสร็จประวัติ - เดือน ${monthNames[summary.month]} พ.ศ. ${summary.year}`;

  window.showToast('กำลังโหลดรายละเอียดข้อมูลของเดือน...', 'info');

  const monthStr = String(summary.month).padStart(2, '0');
  const fuelColl = `employees_${summary.year}_${monthStr}`;
  const waterColl = `water_employees_${summary.year}_${monthStr}`;

  try {
    const fuelList = await fetchEmployeesFromCollection(fuelColl);
    const waterList = await fetchEmployeesFromCollection(waterColl);

    currentViewingSnapshot = {
      year: summary.year,
      month: summary.month,
      fuelList,
      waterList
    };

    activeModalCategory = 'fuel';
    switchHistoryModalCategory('fuel');
    modal.classList.add('active');
  } catch (err) {
    console.error("Failed to load historical details:", err);
    window.showToast('โหลดข้อมูลย้อนหลังล้มเหลว!', 'error');
  }
}

function switchHistoryModalCategory(category) {
  activeModalCategory = category;
  const tabFuel = document.getElementById('historyTabFuel');
  const tabWater = document.getElementById('historyTabWater');
  
  if (category === 'fuel') {
    tabFuel.className = 'btn btn-small';
    tabFuel.setAttribute('style', 'font-weight: bold; background: var(--post-orange) !important; color: white !important;');
    tabWater.className = 'btn btn-small btn-secondary';
    tabWater.setAttribute('style', 'font-weight: bold;');
    renderHistoricalFuelTable();
  } else {
    tabWater.className = 'btn btn-small';
    tabWater.setAttribute('style', 'font-weight: bold; background: var(--post-orange) !important; color: white !important;');
    tabFuel.className = 'btn btn-small btn-secondary';
    tabFuel.setAttribute('style', 'font-weight: bold;');
    renderHistoricalWaterTable();
  }
}

function renderHistoricalFuelTable() {
  const tableHead = document.querySelector('#historyModalDetailsTable thead');
  const tableBody = document.getElementById('historyModalTableBody');

  if (!tableHead || !tableBody) return;

  tableHead.innerHTML = `
    <tr>
      <th style="width: 5%">ที่</th>
      <th style="width: 25%">ชื่อ-นามสกุล</th>
      <th style="width: 20%">ตำแหน่ง/หน้าที่</th>
      <th style="width: 15%">ด้านจ่ายประจำ</th>
      <th style="width: 10%">วันทำงาน</th>
      <th style="width: 12%">ค่าน้ำมัน (บาท)</th>
      <th style="width: 13%">ค่าบำรุงรักษา (บาท)</th>
    </tr>
  `;

  const list = currentViewingSnapshot.fuelList || [];
  if (list.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" class="no-data">ไม่มีข้อมูลบันทึกค่าน้ำมันของเดือนนี้</td></tr>`;
    return;
  }

  let html = '';
  list.forEach((item, index) => {
    html += `
      <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td><strong>${item.name}</strong></td>
        <td>${item.position} / ${item.duty || '-'}</td>
        <td style="text-align: center;">${item.routeDesc || 'ด้าน ' + (item.route || '-')}</td>
        <td style="text-align: center;">${item.workDays} วัน</td>
        <td style="text-align: right;">${(item.fuelCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right;">${(item.maintCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `;
  });
  tableBody.innerHTML = html;
}

function renderHistoricalWaterTable() {
  const tableHead = document.querySelector('#historyModalDetailsTable thead');
  const tableBody = document.getElementById('historyModalTableBody');

  if (!tableHead || !tableBody) return;

  tableHead.innerHTML = `
    <tr>
      <th style="width: 5%">ที่</th>
      <th style="width: 25%">ชื่อ-นามสกุล</th>
      <th style="width: 25%">ปฏิบัติหน้าที่</th>
      <th style="width: 15%">เงินเดือน (บาท)</th>
      <th style="width: 10%">วันทำงาน</th>
      <th style="width: 20%">ยอดค่าน้ำรวมสุทธิ (บาท)</th>
    </tr>
  `;

  const list = currentViewingSnapshot.waterList || [];
  if (list.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" class="no-data">ไม่มีข้อมูลบันทึกค่าน้ำดื่มของเดือนนี้</td></tr>`;
    return;
  }

  let html = '';
  list.forEach((item, index) => {
    const allowance = (item.workDays || 0) * (window.waterAllowancePerDay || 30);
    const tax = calculateWaterTaxInternal(item.salary || 0, allowance);
    const net = allowance - tax;
    
    html += `
      <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td><strong>${item.name}</strong></td>
        <td>${item.position} / ${item.duty || '-'}</td>
        <td style="text-align: right;">${(item.salary || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: center;">${item.workDays} วัน</td>
        <td style="text-align: right; font-weight: bold; color: var(--post-emerald);">${net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `;
  });
  tableBody.innerHTML = html;
}

// Internal water tax calculator matching rules
function calculateWaterTaxInternal(salary, totalAllowance) {
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

// Reprint historical PDFs
function printHistoricalFuelReport(year, month, list) {
  if (list.length === 0) {
    window.showToast('ไม่มีข้อมูลที่จะพิมพ์!', 'warning');
    return;
  }
  
  const monthNames = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const monthText = monthNames[month];
  
  let totalFuel = 0;
  let totalMaint = 0;
  let grandTotal = 0;

  const rows = list.map((item, idx) => {
    totalFuel += (item.fuelCost || 0);
    totalMaint += (item.maintCost || 0);
    grandTotal += (item.sumTotal || 0);

    return `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${item.name}</strong></td>
        <td>${item.position} / ${item.duty || '-'}</td>
        <td style="text-align: left !important;">${item.routeDesc || 'ด้านจ่ายที่ ' + (item.route || '-')}</td>
        <td>${item.workDays} วัน</td>
        <td>${(item.liters || 0).toFixed(2)}</td>
        <td>${(item.fuelCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        <td>${(item.maintCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        <td><strong>${(item.sumTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></td>
        <td>${item.signature || item.name}</td>
        <td>${item.remarks || ''}</td>
      </tr>
    `;
  }).join('');

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>พิมพ์รายงานประวัติค่าน้ำมัน_${monthText}_${year}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Sarabun', sans-serif;
          padding: 0.5cm;
          background: white;
          color: black;
        }
        @page {
          size: A4 landscape;
          margin: 1cm;
        }
        .print-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          margin-bottom: 15px;
        }
        .print-table th, .print-table td {
          border: 1px solid #000;
          padding: 5px 4px;
          font-size: 8.5pt;
          text-align: center;
        }
        .print-table td:nth-child(2), .print-table td:nth-child(3) {
          text-align: left;
        }
        th {
          background: #f2f2f2 !important;
          font-weight: bold;
        }
        .print-header {
          text-align: center;
          border-bottom: 2px double #000;
          padding-bottom: 5px;
          margin-bottom: 10px;
        }
        .print-signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 1.5cm;
          page-break-inside: avoid;
        }
        .sig-box {
          text-align: center;
          width: 32%;
          font-size: 8.5pt;
          line-height: 1.4;
        }
      </style>
    </head>
    <body>
      <div class="print-header">
        <h2>รายงานประวัติบัญชีรายชื่อเบิกจ่ายค่าน้ำมันค้างจ่าย (ชุดข้อมูลประวัติ)</h2>
        <h3>ประจำเดือน ${monthText} พ.ศ. ${year}</h3>
      </div>
      <table class="print-table">
        <thead>
          <tr>
            <th>ที่</th>
            <th>ชื่อ - นามสกุล</th>
            <th>ตำแหน่ง / หน้าที่</th>
            <th>รายละเอียด/ด้านจ่าย</th>
            <th>วันทำงาน</th>
            <th>ปริมาณน้ำมัน (ลิตร)</th>
            <th>ค่าน้ำมัน (บาท)</th>
            <th>ค่าบำรุงรักษา (บาท)</th>
            <th>ยอดรวมเบิกสุทธิ</th>
            <th>ลงนาม</th>
            <th>หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div style="margin-top: 15px; text-align: right; font-weight: bold; font-size: 10pt; border-bottom: 3px double #000; padding-bottom: 4px;">
        ยอดค่าน้ำมันรวม: ${totalFuel.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท | 
        ยอดค่าบำรุงรักษารวม: ${totalMaint.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท | 
        ยอดจ่ายรวมสุทธิ: ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท
      </div>
      
      <div class="print-signatures">
        <div class="sig-box">
          <p>ลงชื่อ..........................................................ผู้จัดทำ</p>
          <p style="margin-top: 6px;">(..........................................................)</p>
          <p>ตำแหน่ง..........................................................</p>
        </div>
        <div class="sig-box">
          <p>ลงชื่อ..........................................................ผู้ตรวจสอบ</p>
          <p style="margin-top: 6px;">(..........................................................)</p>
          <p>ตำแหน่ง..........................................................</p>
        </div>
        <div class="sig-box">
          <p>ลงชื่อ..........................................................ผู้อนุมัติ</p>
          <p style="margin-top: 6px;">(..........................................................)</p>
          <p>ตำแหน่ง..........................................................</p>
        </div>
      </div>

      <script>window.onload = function() { window.print(); };</script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

function printHistoricalWaterReport(year, month, list) {
  if (list.length === 0) {
    window.showToast('ไม่มีข้อมูลที่จะพิมพ์!', 'warning');
    return;
  }
  
  const monthNames = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const monthText = monthNames[month];
  
  let totalCost = 0;
  let totalTax = 0;
  let totalNet = 0;

  const rows = list.map((item, idx) => {
    const allowance = (item.workDays || 0) * (window.waterAllowancePerDay || 30);
    const tax = calculateWaterTaxInternal(item.salary || 0, allowance);
    const net = allowance - tax;

    totalCost += allowance;
    totalTax += tax;
    totalNet += net;

    return `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${item.name}</strong></td>
        <td>${item.position} / ${item.duty || '-'}</td>
        <td>${(item.salary || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        <td>${item.workDays} วัน</td>
        <td>${allowance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        <td>${tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        <td><strong>${net.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></td>
        <td>${item.signature || item.name}</td>
      </tr>
    `;
  }).join('');

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>พิมพ์รายงานประวัติค่าน้ำดื่ม_${monthText}_${year}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Sarabun', sans-serif;
          padding: 0.5cm;
          background: white;
          color: black;
        }
        @page {
          size: A4 portrait;
          margin: 1.2cm 1cm;
        }
        .print-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          margin-bottom: 15px;
        }
        .print-table th, .print-table td {
          border: 1px solid #000;
          padding: 5px 4px;
          font-size: 8.5pt;
          text-align: center;
        }
        .print-table td:nth-child(2), .print-table td:nth-child(3) {
          text-align: left;
        }
        th {
          background: #f2f2f2 !important;
          font-weight: bold;
        }
        .print-header {
          text-align: center;
          border-bottom: 2px double #000;
          padding-bottom: 5px;
          margin-bottom: 10px;
        }
        .print-signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 1.5cm;
          page-break-inside: avoid;
        }
        .sig-box {
          text-align: center;
          width: 32%;
          font-size: 8.5pt;
          line-height: 1.4;
        }
      </style>
    </head>
    <body>
      <div class="print-header">
        <h2>รายงานประวัติใบเบิกค่าน้ำดื่มพนักงาน (ชุดข้อมูลประวัติ)</h2>
        <h3>ประจำเดือน ${monthText} พ.ศ. ${year}</h3>
      </div>
      <table class="print-table">
        <thead>
          <tr>
            <th>ที่</th>
            <th>ชื่อ - นามสกุล</th>
            <th>หน้าที่ปฏิบัติงาน</th>
            <th>เงินเดือน (บาท)</th>
            <th>วันทำงาน</th>
            <th>ค่าน้ำดื่ม (บาท)</th>
            <th>ภาษีหัก ณ ที่จ่าย</th>
            <th>สุทธิคงเหลือ</th>
            <th>ลงนาม</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div style="margin-top: 15px; text-align: right; font-weight: bold; font-size: 10pt; border-bottom: 3px double #000; padding-bottom: 4px;">
        ยอดค่าน้ำดื่มรวม: ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท | 
        ยอดภาษีหักรวม: ${totalTax.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท | 
        ยอดสุทธิรวม: ${totalNet.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท
      </div>
      
      <div class="print-signatures">
        <div class="sig-box">
          <p>ลงชื่อ..........................................................ผู้จัดทำ</p>
          <p style="margin-top: 6px;">(..........................................................)</p>
          <p>ตำแหน่ง..........................................................</p>
        </div>
        <div class="sig-box">
          <p>ลงชื่อ..........................................................ผู้ตรวจสอบ</p>
          <p style="margin-top: 6px;">(..........................................................)</p>
          <p>ตำแหน่ง..........................................................</p>
        </div>
        <div class="sig-box">
          <p>ลงชื่อ..........................................................ผู้อนุมัติ</p>
          <p style="margin-top: 6px;">(..........................................................)</p>
          <p>ตำแหน่ง..........................................................</p>
        </div>
      </div>

      <script>window.onload = function() { window.print(); };</script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
