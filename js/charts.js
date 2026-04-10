/* ============================================
   CHARTS — Chart.js Rendering
   ============================================ */

let pieChartInstance = null;
let lineChartInstance = null;
let stackedBarChartInstance = null;

/**
 * Render all charts and update metrics
 * @param {Object} summary - Loan summary metrics
 * @param {Array} schedule - Amortization schedule
 */
export function renderCharts(summary, schedule) {
  renderPieChart(summary.totalPrincipal, summary.totalInterest);
  renderLineChart(schedule);
  renderStackedBarChart(schedule);
  updateAnalyticsInsights(summary);
}

/**
 * Update Key Insight Metric Cards
 */
function updateAnalyticsInsights(summary) {
  const { totalAmount, totalPrincipal, totalInterest, interestSaved, savedMonths } = summary;
  
  // Cost Ratio (Interest per 100 borrowed)
  const costRatio = ((totalInterest / totalPrincipal) * 100).toFixed(1);
  const costRatioEl = document.getElementById('insightCostRatio');
  if (costRatioEl) costRatioEl.textContent = `₹${costRatio}`;

  // Effective Rate (Total interest as % of total paid)
  // Or maybe Effective Interest Rate over the lifetime
  const effectiveRate = ((totalInterest / totalAmount) * 100).toFixed(2);
  const effectiveRateEl = document.getElementById('insightEffectiveRate');
  if (effectiveRateEl) effectiveRateEl.textContent = `${effectiveRate}%`;

  // Prepayment Savings
  const savingsEl = document.getElementById('insightTotalSavings');
  const timeEl = document.getElementById('insightTimeSavings');
  
  if (savingsEl && timeEl) {
    if (interestSaved > 0) {
      savingsEl.textContent = '₹' + interestSaved.toLocaleString('en-IN', { maximumFractionDigits: 0 });
      let timeText = [];
      const years = Math.floor(savedMonths / 12);
      const months = savedMonths % 12;
      if (years > 0) timeText.push(`${years} Years`);
      if (months > 0) timeText.push(`${months} Months`);
      timeEl.textContent = 'Loan ends ' + timeText.join(' and ') + ' earlier';
    } else {
      savingsEl.textContent = '₹0';
      timeEl.textContent = 'No early payments made';
    }
  }

  // Rate Change Savings
  const { rateSavings, rateChanges, initialRate } = summary;
  const rateSavingsEl = document.getElementById('insightRateSavings');
  const rateDescEl = document.getElementById('insightRateDesc');

  if (rateSavingsEl && rateDescEl) {
    if (rateChanges && rateChanges.length > 0 && rateSavings > 0) {
      rateSavingsEl.textContent = '₹' + rateSavings.toLocaleString('en-IN', { maximumFractionDigits: 0 });
      // Show the rate journey: initial → latest
      const latestRate = rateChanges[rateChanges.length - 1].rate;
      const direction = latestRate < initialRate ? '↓' : '↑';
      rateDescEl.textContent = `${initialRate}% ${direction} ${latestRate}% — Saved vs original rate`;
    } else if (rateChanges && rateChanges.length > 0 && rateSavings === 0) {
      rateSavingsEl.textContent = '₹0';
      const latestRate = rateChanges[rateChanges.length - 1].rate;
      rateDescEl.textContent = `${initialRate}% → ${latestRate}% — Rate increased, no savings`;
    } else {
      rateSavingsEl.textContent = '₹0';
      rateDescEl.textContent = 'No rate changes applied';
    }
  }
}

function getThemeColors() {
  const isDark = !document.documentElement.hasAttribute('data-theme') ||
    document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    isDark,
    textColor: isDark ? '#868da0' : '#5c6170',
    gridColor: isDark ? 'rgba(38, 44, 60, 0.35)' : 'rgba(200, 200, 210, 0.3)',
    legendColor: isDark ? '#868da0' : '#5c6170',
    tooltipBg: isDark ? '#121829' : '#ffffff',
    titleColor: isDark ? '#eff1f3' : '#0b0e1a'
  };
}

/**
 * Render payment breakdown doughnut chart
 */
function renderPieChart(principal, interest) {
  if (pieChartInstance) pieChartInstance.destroy();

  const ctx = document.getElementById('pieChart');
  if (!ctx) return;

  const interestPercent = ((interest / (principal + interest)) * 100).toFixed(1);
  const principalPercent = ((principal / (principal + interest)) * 100).toFixed(1);
  const colors = getThemeColors();

  pieChartInstance = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: [`Principal (${principalPercent}%)`, `Interest (${interestPercent}%)`],
      datasets: [{
        data: [principal, interest],
        backgroundColor: ['#1ab394', '#d44c4a'],
        borderColor: ['#119974', '#b83c3a'],
        borderWidth: 2,
        hoverOffset: 12,
        spacing: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: colors.legendColor, font: { size: 12, family: "'Inter', sans-serif" }, padding: 16, usePointStyle: true, pointStyleWidth: 10 }
        },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.titleColor,
          bodyColor: colors.textColor,
          borderColor: colors.isDark ? 'rgba(220,220,220,0.1)' : 'rgba(0,0,0,0.1)',
          borderWidth: 1,
          cornerRadius: 10,
          padding: 12,
          callbacks: {
            label: function (context) {
              return ' ₹' + context.raw.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
            }
          }
        }
      }
    }
  });
}

/**
 * Render Stacked Bar Chart for Principal vs Interest split by year
 */
function renderStackedBarChart(schedule) {
  if (stackedBarChartInstance) stackedBarChartInstance.destroy();

  const ctx = document.getElementById('stackedBarChart');
  if (!ctx) return;

  const yearlyData = {};
  schedule.forEach(s => {
    const year = s.date.getFullYear();
    if (!yearlyData[year]) {
      yearlyData[year] = { principal: 0, interest: 0 };
    }
    yearlyData[year].principal += s.principal;
    yearlyData[year].interest += s.interest;
  });

  const years = Object.keys(yearlyData);
  const principalData = years.map(y => yearlyData[y].principal);
  const interestData = years.map(y => yearlyData[y].interest);
  const colors = getThemeColors();

  stackedBarChartInstance = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: years,
      datasets: [
        {
          label: 'Interest Paid',
          data: interestData,
          backgroundColor: '#d44c4a',
          borderRadius: 4
        },
        {
          label: 'Principal Paid',
          data: principalData,
          backgroundColor: '#1ab394',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          stacked: true,
          ticks: { color: colors.textColor, font: { family: "'Inter', sans-serif" } },
          grid: { display: false }
        },
        y: {
          stacked: true,
          ticks: {
            color: colors.textColor,
            font: { family: "'Inter', sans-serif" },
            callback: value => value >= 100000 ? '₹' + (value / 100000).toFixed(1) + 'L' : (value >= 1000 ? '₹' + (value / 1000).toFixed(0) + 'K' : '₹' + value)
          },
          grid: { color: colors.gridColor }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.titleColor,
          bodyColor: colors.textColor,
          borderColor: colors.isDark ? 'rgba(220,220,220,0.1)' : 'rgba(0,0,0,0.1)',
          borderWidth: 1,
          cornerRadius: 10,
          padding: 12,
          callbacks: {
            label: context => ' ' + context.dataset.label + ': ₹' + context.raw.toLocaleString('en-IN', { maximumFractionDigits: 0 })
          }
        }
      }
    }
  });
}

/**
 * Render balance over time line chart (year-wise)
 */
function renderLineChart(schedule) {
  if (lineChartInstance) lineChartInstance.destroy();

  const canvas = document.getElementById('lineChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const yearlyData = {};
  let cumulativePrincipal = 0;

  schedule.forEach(s => {
    const year = s.date.getFullYear();
    cumulativePrincipal += s.principal;

    if (!yearlyData[year]) {
      yearlyData[year] = { balance: s.balance, principalPaid: cumulativePrincipal };
    } else {
      yearlyData[year].balance = s.balance;
      yearlyData[year].principalPaid = cumulativePrincipal;
    }
  });

  const years = Object.keys(yearlyData);
  const balanceByYear = years.map(y => yearlyData[y].balance);
  const principalPaidByYear = years.map(y => yearlyData[y].principalPaid);
  const colors = getThemeColors();

  // Create Gradients
  const balanceGradient = ctx.createLinearGradient(0, 0, 0, 400);
  balanceGradient.addColorStop(0, 'rgba(212, 76, 74, 0.4)');
  balanceGradient.addColorStop(1, 'rgba(212, 76, 74, 0.0)');

  const principalGradient = ctx.createLinearGradient(0, 0, 0, 400);
  principalGradient.addColorStop(0, 'rgba(26, 179, 148, 0.4)');
  principalGradient.addColorStop(1, 'rgba(26, 179, 148, 0.0)');

  lineChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: years,
      datasets: [
        {
          label: 'Outstanding Balance',
          data: balanceByYear,
          borderColor: '#d44c4a',
          backgroundColor: balanceGradient,
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointBackgroundColor: '#d44c4a',
          pointBorderColor: colors.isDark ? '#121829' : '#ffffff',
          pointBorderWidth: 2
        },
        {
          label: 'Cumulative Principal Paid',
          data: principalPaidByYear,
          borderColor: '#1ab394',
          backgroundColor: principalGradient,
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointBackgroundColor: '#1ab394',
          pointBorderColor: colors.isDark ? '#121829' : '#ffffff',
          pointBorderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      scales: {
        x: {
          ticks: { color: colors.textColor, font: { family: "'Inter', sans-serif" } },
          grid: { display: false }
        },
        y: {
          ticks: {
            color: colors.textColor,
            font: { family: "'Inter', sans-serif" },
            callback: value => value >= 10000000 ? '₹' + (value / 10000000).toFixed(1) + 'Cr' : (value >= 100000 ? '₹' + (value / 100000).toFixed(1) + 'L' : (value >= 1000 ? '₹' + (value / 1000).toFixed(0) + 'K' : '₹' + value))
          },
          grid: { color: colors.gridColor }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: { color: colors.legendColor, font: { size: 12, family: "'Inter', sans-serif" }, boxWidth: 12, usePointStyle: true }
        },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.titleColor,
          bodyColor: colors.textColor,
          borderColor: colors.isDark ? 'rgba(220,220,220,0.1)' : 'rgba(0,0,0,0.1)',
          borderWidth: 1,
          cornerRadius: 10,
          padding: 12,
          callbacks: {
            label: context => ' ' + context.dataset.label + ': ₹' + context.raw.toLocaleString('en-IN', { maximumFractionDigits: 0 })
          }
        }
      }
    }
  });
}

/**
 * Destroy all chart instances (for cleanup)
 */
export function destroyCharts() {
  if (pieChartInstance) { pieChartInstance.destroy(); pieChartInstance = null; }
  if (lineChartInstance) { lineChartInstance.destroy(); lineChartInstance = null; }
  if (stackedBarChartInstance) { stackedBarChartInstance.destroy(); stackedBarChartInstance = null; }
}
