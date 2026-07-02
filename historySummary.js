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

      <!-- ===== ANALYTICS DASHBOARD ===== -->
      <div class="glass-card" id="analyticsDashboardCard" style="margin-bottom: 1rem; padding: 1.5rem;">
        <!-- Dashboard Header + Year Filter -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-size: 1.6rem;">📊</span>
            <div>
              <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0;">ภาพรวมค่าใช้จ่ายประจำปี</h3>
              <p style="font-size: 0.78rem; color: var(--text-secondary); margin: 0;">สรุปยอดเบิกจ่ายค่าน้ำมันและค่าน้ำดื่มรายเดือน</p>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <label style="font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); white-space: nowrap;">เลือกปี (พ.ศ.):</label>
            <select id="analyticsYearSelect" class="form-select" style="width: auto; min-width: 110px; padding: 0.4rem 0.7rem; font-size: 0.9rem; font-weight: 700; border-radius: 10px;">
              <option value="">กำลังโหลด...</option>
            </select>
          </div>
        </div>

        <!-- KPI Cards Row -->
        <div id="analyticsKpiGrid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.85rem; margin-bottom: 1.25rem;">
          <!-- Rendered by JS -->
          <div class="skeleton-card" style="padding: 1rem; height: 80px;"><div class="skeleton-line full"></div><div class="skeleton-line medium"></div></div>
          <div class="skeleton-card" style="padding: 1rem; height: 80px;"><div class="skeleton-line full"></div><div class="skeleton-line medium"></div></div>
          <div class="skeleton-card" style="padding: 1rem; height: 80px;"><div class="skeleton-line full"></div><div class="skeleton-line medium"></div></div>
        </div>

        <!-- 12-Month Bar Chart -->
        <div style="width: 100%; height: 300px; background: rgba(0,0,0,0.02); border-radius: 12px; border: 1px solid var(--border-glass); padding: 0.75rem; position: relative;">
          <canvas id="analyticsYearlyChart" style="width: 100%; height: 100%;"></canvas>
        </div>
      </div>

      <!-- Metrics Row -->
      <div class="metrics-grid" id="historyMetricsGrid" style="grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1rem;">
        <div class="metric-card bg-orange-glow" id="histFuelSumCard">
          <div class="metric-info">
            <h3>ยอดค่าน้ำมันเชื้อเพลิงสะสม</h3>
            <p class="metric-value"><span id="histFuelSum">0.00</span> <span class="unit">บาท</span></p>
          </div>
          <div class="metric-icon">⛽</div>
        </div>
        <div class="metric-card bg-blue-glow" id="histWaterSumCard">
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
        <div class="chart-container-wrapper" style="width: 100%; height: 260px; background: rgba(0,0,0,0.02); border-radius: 8px; border: 1px solid var(--border-glass); position: relative; padding: 0.5rem;">
          <canvas id="financialChart" style="width: 100%; height: 100%;"></canvas>
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
                <th style="width: 15%; text-align: right;" class="fuel-only-col">ค่าน้ำมันรวม (บาท)</th>
                <th style="width: 15%; text-align: right;" class="water-only-col">ค่าน้ำดื่มรวม (บาท)</th>
                <th style="width: 12%; text-align: right;" class="water-only-col">ภาษีค่าน้ำรวม (บาท)</th>
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
let financialChartInstance = null;

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

  renderAnalyticsDashboard();
  renderSummariesDashboard();
  if (typeof applyDutyBasedHistoryRestrictions === 'function') {
    applyDutyBasedHistoryRestrictions();
  }
}

// ─────────────────────────────────────────────
// ANALYTICS DASHBOARD
// ─────────────────────────────────────────────
let analyticsChartInstance = null;

function renderAnalyticsDashboard() {
  if (!summariesList || summariesList.length === 0) return;

  // Collect unique years from summariesList (sorted descending)
  const allYears = [...new Set(summariesList.map(s => s.year))].sort((a, b) => b - a);
  const currentThaiYear = new Date().getFullYear() + 543;
  const defaultYear = allYears.includes(currentThaiYear) ? currentThaiYear : allYears[0];

  // Populate year dropdown
  const yearSelect = document.getElementById('analyticsYearSelect');
  if (yearSelect) {
    yearSelect.innerHTML = allYears
      .map(y => `<option value="${y}" ${y === defaultYear ? 'selected' : ''}>${y}</option>`)
      .join('');
    yearSelect.addEventListener('change', () => {
      renderAnalyticsForYear(parseInt(yearSelect.value));
    });
  }

  renderAnalyticsForYear(defaultYear);
}

function renderAnalyticsForYear(selectedYear) {
  const monthNames = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

  // Filter summaries to selected year
  const yearData = summariesList.filter(s => s.year === selectedYear);

  // Compute yearly KPIs
  let yearFuel = 0;
  let yearWater = 0;
  yearData.forEach(s => {
    yearFuel  += (s.fuelTotalNet  || 0);
    yearWater += (s.waterTotalNet || 0);
  });
  const yearTotal = yearFuel + yearWater;

  // Render KPI cards
  const fmt = (n) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const kpiGrid = document.getElementById('analyticsKpiGrid');
  if (kpiGrid) {
    kpiGrid.innerHTML = `
      <div class="metric-card bg-orange-glow tab-content-enter" style="padding: 1rem 1.25rem;">
        <div class="metric-info">
          <h3 style="font-size: 0.78rem;">⛽ ค่าน้ำมันรวมปี ${selectedYear}</h3>
          <p class="metric-value counting" style="font-size: 1.3rem; font-weight: 800;">${fmt(yearFuel)} <span class="unit">บาท</span></p>
        </div>
      </div>
      <div class="metric-card bg-blue-glow tab-content-enter" style="padding: 1rem 1.25rem; animation-delay: 0.07s;">
        <div class="metric-info">
          <h3 style="font-size: 0.78rem;">💧 ค่าน้ำดื่มรวมปี ${selectedYear}</h3>
          <p class="metric-value counting" style="font-size: 1.3rem; font-weight: 800;">${fmt(yearWater)} <span class="unit">บาท</span></p>
        </div>
      </div>
      <div class="metric-card bg-emerald-glow tab-content-enter" style="padding: 1rem 1.25rem; animation-delay: 0.14s;">
        <div class="metric-info">
          <h3 style="font-size: 0.78rem;">📊 รวมทั้งสิ้นปี ${selectedYear}</h3>
          <p class="metric-value highlight counting" style="font-size: 1.3rem; font-weight: 800;">${fmt(yearTotal)} <span class="unit">บาท</span></p>
        </div>
      </div>
    `;
  }

  // Build 12-month arrays
  const fuelByMonth  = Array(12).fill(0);
  const waterByMonth = Array(12).fill(0);
  yearData.forEach(s => {
    const idx = (s.month || 1) - 1;
    if (idx >= 0 && idx < 12) {
      fuelByMonth[idx]  += (s.fuelTotalNet  || 0);
      waterByMonth[idx] += (s.waterTotalNet || 0);
    }
  });

  renderYearlyChart(monthNames, fuelByMonth, waterByMonth, selectedYear);
}

function renderYearlyChart(labels, fuelData, waterData, year) {
  const ctx = document.getElementById('analyticsYearlyChart');
  if (!ctx || !window.Chart) return;

  if (analyticsChartInstance) {
    analyticsChartInstance.destroy();
    analyticsChartInstance = null;
  }

  const styles = getComputedStyle(document.documentElement);
  const postOrange  = 'hsl(16, 97%, 53%)';
  const postBlue    = 'hsl(199, 89%, 48%)';
  const textColor   = styles.getPropertyValue('--text-primary').trim()  || '#1e293b';
  const borderColor = styles.getPropertyValue('--border-glass').trim()  || 'rgba(0,0,0,0.1)';

  // Check dark mode for slightly muted alpha
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const fuelBg   = isDark ? 'hsla(16, 97%, 53%, 0.75)'  : 'hsla(16, 97%, 53%, 0.85)';
  const waterBg  = isDark ? 'hsla(199, 89%, 48%, 0.75)' : 'hsla(199, 89%, 48%, 0.85)';

  analyticsChartInstance = new window.Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: '⛽ ค่าน้ำมัน (บาท)',
          data: fuelData,
          backgroundColor: fuelBg,
          borderColor: postOrange,
          borderWidth: 1.5,
          borderRadius: 6,
          borderSkipped: false,
          order: 2
        },
        {
          label: '💧 ค่าน้ำดื่ม (บาท)',
          data: waterData,
          backgroundColor: waterBg,
          borderColor: postBlue,
          borderWidth: 1.5,
          borderRadius: 6,
          borderSkipped: false,
          order: 2
        },
        {
          label: '📈 ยอดรวมสุทธิ',
          data: fuelData.map((f, i) => f + waterData[i]),
          type: 'line',
          borderColor: 'hsl(142, 70%, 40%)',
          backgroundColor: 'transparent',
          borderWidth: 2.5,
          pointBackgroundColor: 'hsl(142, 70%, 40%)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 7,
          tension: 0.35,
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 600,
        easing: 'easeOutQuart'
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: textColor,
            font: { family: 'Sarabun, sans-serif', size: 11, weight: 'bold' },
            padding: 16,
            usePointStyle: true
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: isDark ? 'rgba(15, 22, 42, 0.97)' : 'rgba(15, 23, 42, 0.95)',
          titleColor: '#fff',
          bodyColor: 'rgba(255,255,255,0.85)',
          borderColor: 'rgba(255,255,255,0.12)',
          borderWidth: 1,
          padding: 12,
          bodyFont: { family: 'Sarabun, sans-serif', size: 12 },
          titleFont: { family: 'Sarabun, sans-serif', size: 12, weight: 'bold' },
          callbacks: {
            title: (items) => `${items[0].label} ปี ${year}`,
            label: (context) => {
              const label = context.dataset.label || '';
              const val = context.parsed.y;
              return ` ${label}: ${val.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: textColor,
            font: { family: 'Sarabun, sans-serif', size: 11 }
          }
        },
        y: {
          grid: { color: borderColor, drawBorder: false },
          ticks: {
            color: textColor,
            font: { family: 'Sarabun, sans-serif', size: 10 },
            callback: (v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v
          }
        }
      }
    }
  });
}

// ─────────────────────────────────────────────
function renderSummariesDashboard() {
  const fuelSumSpan = document.getElementById('histFuelSum');
  const waterSumSpan = document.getElementById('histWaterSum');
  const totalSumSpan = document.getElementById('histTotalSum');
  const peopleSumSpan = document.getElementById('histPeopleSum');
  const tableBody = document.getElementById('historyTableBody');

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
        <td style="text-align: right;" class="fuel-only-col">${fuelVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right;" class="water-only-col">${waterVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right; color: var(--post-red);" class="water-only-col">${waterTaxVal > 0 ? waterTaxVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
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

  // Render Chart using Chart.js
  const ctx = document.getElementById('financialChart');
  if (financialChartInstance) {
    financialChartInstance.destroy();
    financialChartInstance = null;
  }

  if (ctx) {
    const chartList = [...summariesList].reverse().slice(-12); // Last 12 records oldest to newest
    const labels = chartList.map(s => {
      const labelMonthShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][s.month - 1] || s.month;
      return `${labelMonthShort} ${String(s.year).slice(-2)}`;
    });
    const fuelData = chartList.map(s => s.fuelTotalNet || 0);
    const waterData = chartList.map(s => s.waterTotalNet || 0);
    const totalData = chartList.map(s => (s.fuelTotalNet || 0) + (s.waterTotalNet || 0));

    const styles = getComputedStyle(document.documentElement);
    const postOrange = styles.getPropertyValue('--post-orange').trim() || 'hsl(16, 97%, 53%)';
    const postBlue = styles.getPropertyValue('--post-blue').trim() || 'hsl(210, 85%, 45%)';
    const postEmerald = styles.getPropertyValue('--post-emerald').trim() || 'hsl(142, 70%, 40%)';
    const textPrimary = styles.getPropertyValue('--text-primary').trim() || '#1e293b';
    const borderGlass = styles.getPropertyValue('--border-glass').trim() || 'rgba(0, 0, 0, 0.1)';

    if (window.Chart) {
      financialChartInstance = new window.Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: '⛽ ค่าน้ำมันเชื้อเพลิง',
              data: fuelData,
              backgroundColor: postOrange,
              borderColor: postOrange,
              borderWidth: 1,
              borderRadius: 4,
              order: 2
            },
            {
              label: '🥤 ค่าน้ำดื่มพนักงาน',
              data: waterData,
              backgroundColor: postBlue,
              borderColor: postBlue,
              borderWidth: 1,
              borderRadius: 4,
              order: 2
            },
            {
              label: '📈 ยอดรวมสุทธิ',
              data: totalData,
              type: 'line',
              borderColor: postEmerald,
              backgroundColor: 'transparent',
              borderWidth: 2,
              pointBackgroundColor: postEmerald,
              pointBorderColor: '#fff',
              pointHoverRadius: 6,
              tension: 0.3,
              order: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                color: textPrimary,
                font: {
                  family: 'Sarabun, sans-serif',
                  size: 11,
                  weight: 'bold'
                }
              }
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              titleColor: '#fff',
              bodyColor: '#fff',
              bodyFont: {
                family: 'Sarabun, sans-serif'
              },
              titleFont: {
                family: 'Sarabun, sans-serif',
                weight: 'bold'
              },
              callbacks: {
                label: function(context) {
                  let label = context.dataset.label || '';
                  if (label) {
                    label += ': ';
                  }
                  if (context.parsed.y !== null) {
                    label += new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(context.parsed.y);
                  }
                  return label;
                }
              }
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              },
              ticks: {
                color: textPrimary,
                font: {
                  family: 'Sarabun, sans-serif',
                  size: 10
                }
              }
            },
            y: {
              grid: {
                color: borderGlass
              },
              ticks: {
                color: textPrimary,
                font: {
                  family: 'Sarabun, sans-serif',
                  size: 10
                },
                callback: function(value) {
                  return value.toLocaleString();
                }
              }
            }
          }
        }
      });
    }
  }
  if (typeof applyDutyBasedHistoryRestrictions === 'function') {
    applyDutyBasedHistoryRestrictions();
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

    let enrichedFuelList = fuelList;
    if (window.enrichEmployeesWithCalculations) {
      enrichedFuelList = window.enrichEmployeesWithCalculations(fuelList);
    }

    currentViewingSnapshot = {
      year: summary.year,
      month: summary.month,
      fuelList: enrichedFuelList,
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
      <th style="width: 15%">ยอดค่าน้ำรวมสุทธิ (บาท)</th>
      <th style="width: 10%">จัดการ</th>
    </tr>
  `;

  const list = currentViewingSnapshot.waterList || [];
  if (list.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" class="no-data">ไม่มีข้อมูลบันทึกค่าน้ำดื่มของเดือนนี้</td></tr>`;
    return;
  }

  let html = '';
  list.forEach((item, index) => {
    const allowance = (item.workDays || 0) * (window.waterAllowancePerDay || 30);
    const tax = calculateWaterTaxInternal(item.salary || 0, allowance);
    const net = Math.round((allowance - tax) * 100) / 100;
    
    html += `
      <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td><strong>${item.name}</strong></td>
        <td>${item.position} / ${item.duty || '-'}</td>
        <td style="text-align: right;">${(item.salary || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: center;">${item.workDays} วัน</td>
        <td style="text-align: right; font-weight: bold; color: var(--post-emerald);">${net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: center;">
          ${tax > 0 ? `<button class="btn btn-secondary btn-small history-print-50-btn" data-index="${index}" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">📄 พิมพ์</button>` : '-'}
        </td>
      </tr>
    `;
  });
  tableBody.innerHTML = html;

  tableBody.querySelectorAll('.history-print-50-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-index'));
      printHistorical50Tawi(idx);
    });
  });
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
      return Math.round(totalAllowance * (b.rate || 0) * 100) / 100;
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
    const net = Math.round((allowance - tax) * 100) / 100;

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

export function applyDutyBasedHistoryRestrictions() {
  const claimDuties = window.currentUserDuties || ['fuel', 'water'];
  const hasFuel = claimDuties.includes('fuel');
  const hasWater = claimDuties.includes('water');

  const setElVisible = (id, visible) => {
    const el = document.getElementById(id);
    if (el) {
      el.style.setProperty('display', visible ? '' : 'none', 'important');
    }
  };

  // Hide metric cards in cumulative summary
  setElVisible('histFuelSumCard', hasFuel);
  setElVisible('histWaterSumCard', hasWater);

  // Configure history grid columns layout based on visible metrics
  const grid = document.getElementById('historyMetricsGrid');
  if (grid) {
    let count = 4;
    if (!hasFuel) count--;
    if (!hasWater) count--;
    grid.style.gridTemplateColumns = `repeat(${count}, 1fr)`;
  }

  // Hide/Show table headers and cells
  const table = document.querySelector('#historyTimelineCard table');
  if (table) {
    table.querySelectorAll('thead th.water-only-col').forEach(th => {
      th.style.setProperty('display', hasWater ? '' : 'none', 'important');
    });
    table.querySelectorAll('thead th.fuel-only-col').forEach(th => {
      th.style.setProperty('display', hasFuel ? '' : 'none', 'important');
    });
    table.querySelectorAll('tbody td.water-only-col').forEach(td => {
      td.style.setProperty('display', hasWater ? '' : 'none', 'important');
    });
    table.querySelectorAll('tbody td.fuel-only-col').forEach(td => {
      td.style.setProperty('display', hasFuel ? '' : 'none', 'important');
    });
  }
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

function printHistorical50Tawi(idx) {
  const list = currentViewingSnapshot.waterList || [];
  const employee = list[idx];
  if (!employee) return;

  const year = currentViewingSnapshot.year;
  const month = currentViewingSnapshot.month;
  const monthNames = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  const monthText = monthNames[month - 1] || '';
  const yearText = String(year);

  const configs = JSON.parse(localStorage.getItem('tp_global_configs')) || {};
  const poTaxId = configs.postOfficeTaxId || "";
  const poBranch = configs.postOfficeBranch || "00000";
  const poAddress = configs.postOfficeAddress || "";

  const registry = JSON.parse(localStorage.getItem('tp_personnel')) || [];
  const person = registry.find(p => p.name === employee.name);
  const empTaxId = person ? (person.taxId || "") : "";
  const empBranch = person ? (person.branch || "00000") : "00000";
  const empAddress = person ? (person.address || "") : "";

  const allowance = (employee.workDays || 0) * (window.waterAllowancePerDay || 30);
  const tax = calculateWaterTaxInternal(employee.salary || 0, allowance);

  const sortedList = [...list].sort((a, b) => a.name.localeCompare(b.name, 'th'));
  const taxEmployees = sortedList.filter(item => {
    const itemAllowance = (item.workDays || 0) * (window.waterAllowancePerDay || 30);
    const itemTax = calculateWaterTaxInternal(item.salary || 0, itemAllowance);
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
  const thDate = `${today.getDate()} ${monthNames[today.getMonth()]} ${today.getFullYear() + 543}`;

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
          <h2 style="margin: 0; font-size: 11pt; color: white;">📄 พิมพ์ใบ 50 ทวิ (ประวัติย้อนหลัง)</h2>
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
                  <td>\${i + 2}. <span class="editable-field" contenteditable="true">........................................................................................</span></td>
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
      <script>
        const poTaxIdInput = document.getElementById('poTaxIdInput');
        const poBranchInput = document.getElementById('poBranchInput');
        const poAddressInput = document.getElementById('poAddressInput');
        const savePoConfigBtn = document.getElementById('savePoConfigBtn');

        function updateTaxIdBoxes(taxId) {
          const clean = (taxId || '').replace(/\\D/g, '').padEnd(13, ' ');
          const boxes = clean.split('').map(char => '<span class="tax-box">' + (char === ' ' ? '&nbsp;' : char) + '</span>').join('');
          const container = document.getElementById('poTaxIdContainer');
          if (container) container.innerHTML = boxes;
        }

        function updateBranchBoxes(branch) {
          const clean = (branch || '').replace(/\\D/g, '').padEnd(5, '0');
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
