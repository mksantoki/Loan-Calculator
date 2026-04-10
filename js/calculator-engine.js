/* ============================================
   CALCULATOR ENGINE — Pure Calculation Logic
   ============================================ */

/**
 * Calculate NPER (Number of Periods) dynamically
 */
function calculateRemainingTerm(monthlyRate, emi, pv) {
  if (isNaN(pv) || isNaN(emi) || isNaN(monthlyRate)) return 0;
  if (pv <= 0.01) return 0;
  if (emi <= 0) return 999;
  if (monthlyRate <= 0) return Math.ceil(pv / emi);
  
  let res = 1 - (monthlyRate * pv) / emi;
  // If res evaluates to negative or zero, EMI is too low to cover interest
  if (isNaN(res) || res <= 0) return 999; 
  
  let term = Math.log(1 / res) / Math.log(1 + monthlyRate);
  if (isNaN(term)) return 999;
  
  return Math.ceil(term);
}

/**
 * Calculate EMI using standard formula
 * P × r × (1 + r)^n / ((1 + r)^n - 1)
 * @param {number} principal - Loan principal
 * @param {number} annualRate - Annual interest rate (percentage)
 * @param {number} years - Loan term in years
 * @returns {number} Monthly EMI (rounded)
 */
export function calculateEMI(principal, annualRate, years) {
  if (!principal || !annualRate || !years) return 0;

  const monthlyRate = annualRate / 12 / 100;
  const numberOfMonths = years * 12;

  if (monthlyRate === 0) {
    return Math.round(principal / numberOfMonths);
  }

  const factor = Math.pow(1 + monthlyRate, numberOfMonths);
  const emi = principal * monthlyRate * factor / (factor - 1);
  return Math.round(emi);
}

/**
 * Generate the full amortization schedule
 * @param {Object} params
 * @param {Array} params.disbursements - [{date: Date, amount: number}]
 * @param {number} params.initialRate - Annual interest rate
 * @param {number} params.initialEMI - Monthly EMI
 * @param {number} params.emiDeductionDay - Day of month
 * @param {Array} params.emiChanges - [{date: Date, amount: number}]
 * @param {Array} params.partPayments - [{date: Date, amount: number}]
 * @param {Array} params.rateChanges - [{date: Date, rate: number}]
 * @param {number} params.originalTermYears - Original bank term in years
 * @returns {Object} { schedule, summary }
 */
export function generateAmortizationSchedule({
  disbursements,
  initialRate,
  initialEMI,
  emiDeductionDay,
  emiChanges = [],
  partPayments = [],
  rateChanges = [],
  originalTermYears = 0
}) {
  // Build lookup maps keyed by "year-month"
  const disbursementMap = buildMap(disbursements, 'amount', true);
  const emiChangeMap = buildMap(emiChanges, 'amount');
  const partPaymentMap = buildMap(partPayments, 'amount', true);
  const rateChangeMap = buildMap(rateChanges, 'rate');

  let totalDisbursed = disbursements.reduce((sum, d) => sum + d.amount, 0);

  let balance = 0;
  let currentRate = initialRate;
  let currentEMI = initialEMI;
  let month = 0;
  let totalInterestPaid = 0;
  let totalPrincipalPaid = 0;
  let totalPartPayments = 0;

  const schedule = [];
  let currentDate = new Date(disbursements[0].date);
  currentDate.setDate(1);

  const today = new Date();
  let completedMonths = 0;

  // Clone the disbursement map for mutation
  const disbMapClone = new Map(disbursementMap);

  const MAX_MONTHS = 600;
  
  let rollingRemainingTerm = originalTermYears * 12;

  while ((balance > 0.01 || month === 0 || disbMapClone.size > 0) && month < MAX_MONTHS) {
    month++;
    const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;

    // Disbursement
    const disbursementThisMonth = disbMapClone.get(monthKey) || 0;
    if (disbursementThisMonth > 0) {
      balance += disbursementThisMonth;
      disbMapClone.delete(monthKey);
    }

    // EMI change
    let emiChanged = false;
    if (emiChangeMap.has(monthKey)) {
      currentEMI = emiChangeMap.get(monthKey);
      emiChanged = true;
    }

    // Rate change
    let rateChanged = false;
    if (rateChangeMap.has(monthKey)) {
      currentRate = rateChangeMap.get(monthKey);
      rateChanged = true;
    }

    const monthlyRate = currentRate / 12 / 100;
    let interestForMonth = balance * monthlyRate;
    const partPaymentThisMonth = partPaymentMap.get(monthKey) || 0;

    let emiPayment = 0;
    let principalForMonth = 0;

    if (balance > 0) {
      emiPayment = currentEMI;

      // If remaining balance is less than EMI + part payment
      if (balance + interestForMonth <= emiPayment + partPaymentThisMonth) {
        emiPayment = Math.max(0, balance + interestForMonth - partPaymentThisMonth);
      }

      const totalPaymentThisMonth = emiPayment + partPaymentThisMonth;
      principalForMonth = totalPaymentThisMonth - interestForMonth;

      if (principalForMonth > balance) {
        principalForMonth = balance;
      }

      balance = Math.max(0, balance - principalForMonth);
      totalInterestPaid += interestForMonth;
      totalPrincipalPaid += principalForMonth;
      totalPartPayments += partPaymentThisMonth;
    }

    const emiDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), emiDeductionDay);
    if (emiDate <= today && balance >= 0) {
      completedMonths = month;
    }

    if (rateChanged || emiChanged || partPaymentThisMonth > 0 || disbursementThisMonth > 0) {
      rollingRemainingTerm = calculateRemainingTerm(currentRate / 12 / 100, currentEMI, balance);
    } else {
      rollingRemainingTerm = Math.max(0, rollingRemainingTerm - 1);
    }

    const projectedRemainingMonths = rollingRemainingTerm;

    schedule.push({
      month,
      date: new Date(currentDate),
      emiDay: emiDeductionDay,
      rate: currentRate,
      emi: currentEMI,
      disbursement: disbursementThisMonth,
      principal: principalForMonth,
      interest: interestForMonth,
      partPayment: partPaymentThisMonth,
      totalPayment: emiPayment + partPaymentThisMonth,
      balance,
      rateChanged,
      emiChanged,
      hasPartPayment: partPaymentThisMonth > 0,
      hasDisbursement: disbursementThisMonth > 0,
      projectedRemainingMonths
    });

    currentDate.setMonth(currentDate.getMonth() + 1);

    if (balance < 0.01 && disbMapClone.size === 0) break;
  }

  // Calculate metrics
  const totalMonths = month;
  const remainingMonths = Math.max(0, totalMonths - completedMonths);
  const originalTermMonthsValue = originalTermYears * 12;
  const savedMonths = originalTermMonthsValue > 0
    ? Math.max(0, originalTermMonthsValue - totalMonths) : 0;

  // Calculate interest saved vs. no part payments
  const interestWithoutPP = calculateInterestWithout(
    disbursements, initialRate, initialEMI, emiChanges, rateChanges
  );
  const interestSaved = Math.max(0, interestWithoutPP - totalInterestPaid);

  // Calculate interest saved from rate changes
  const hasRateChanges = rateChanges && rateChanges.length > 0;
  let rateSavings = 0;
  if (hasRateChanges) {
    const interestAtOriginalRate = calculateInterestAtOriginalRate(
      disbursements, initialRate, initialEMI, emiChanges, partPayments
    );
    rateSavings = Math.max(0, interestAtOriginalRate - totalInterestPaid);
  }

  // Calculate paid till date & remaining
  let paidTillDate = 0;
  let remainingToPay = 0;
  schedule.forEach(row => {
    const emiDate = new Date(row.date.getFullYear(), row.date.getMonth(), row.emiDay);
    if (emiDate <= today) {
      paidTillDate += row.totalPayment;
    } else {
      remainingToPay += row.totalPayment;
    }
  });

  const summary = {
    totalDisbursed,
    totalPrincipal: totalPrincipalPaid,
    totalInterest: totalInterestPaid,
    totalAmount: totalPrincipalPaid + totalInterestPaid,
    totalMonths,
    completedMonths,
    remainingMonths,
    savedMonths,
    interestSaved,
    rateSavings,
    originalTermMonths: originalTermMonthsValue,
    paidTillDate,
    remainingToPay,
    initialRate,
    initialEMI,
    emiDeductionDay,
    disbursements: [...disbursements],
    emiChanges: [...emiChanges],
    partPayments: [...partPayments],
    rateChanges: [...rateChanges]
  };

  return { schedule, summary };
}

/**
 * Calculate total interest WITHOUT part payments (for savings comparison)
 */
function calculateInterestWithout(disbursements, initialRate, initialEMI, emiChanges, rateChanges) {
  const disbursementMap = buildMap(disbursements, 'amount', true);
  const emiChangeMap = buildMap(emiChanges, 'amount');
  const rateChangeMap = buildMap(rateChanges, 'rate');

  const disbMapClone = new Map(disbursementMap);

  let balance = 0;
  let currentRate = initialRate;
  let currentEMI = initialEMI;
  let month = 0;
  let totalInterest = 0;

  let currentDate = new Date(disbursements[0].date);
  currentDate.setDate(1);

  while ((balance > 0.01 || month === 0 || disbMapClone.size > 0) && month < 600) {
    month++;
    const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;

    const disbursementThisMonth = disbMapClone.get(monthKey) || 0;
    if (disbursementThisMonth > 0) {
      balance += disbursementThisMonth;
      disbMapClone.delete(monthKey);
    }

    if (emiChangeMap.has(monthKey)) currentEMI = emiChangeMap.get(monthKey);
    if (rateChangeMap.has(monthKey)) currentRate = rateChangeMap.get(monthKey);

    const monthlyRate = currentRate / 12 / 100;
    const interestForMonth = balance * monthlyRate;

    if (balance > 0) {
      let emiPayment = currentEMI;
      if (balance + interestForMonth <= emiPayment) {
        emiPayment = balance + interestForMonth;
      }
      const principalForMonth = emiPayment - interestForMonth;
      balance = Math.max(0, balance - principalForMonth);
      totalInterest += interestForMonth;
    }

    currentDate.setMonth(currentDate.getMonth() + 1);
    if (balance < 0.01 && disbMapClone.size === 0) break;
  }

  return totalInterest;
}

/**
 * Calculate total interest WITHOUT rate changes (for rate savings comparison)
 * Simulates the loan as if the initial rate stayed constant throughout,
 * but preserves all part payments and EMI changes.
 */
function calculateInterestAtOriginalRate(disbursements, initialRate, initialEMI, emiChanges, partPayments) {
  const disbursementMap = buildMap(disbursements, 'amount', true);
  const emiChangeMap = buildMap(emiChanges, 'amount');
  const partPaymentMap = buildMap(partPayments, 'amount', true);

  const disbMapClone = new Map(disbursementMap);

  let balance = 0;
  let currentEMI = initialEMI;
  let month = 0;
  let totalInterest = 0;

  let currentDate = new Date(disbursements[0].date);
  currentDate.setDate(1);

  while ((balance > 0.01 || month === 0 || disbMapClone.size > 0) && month < 600) {
    month++;
    const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;

    const disbursementThisMonth = disbMapClone.get(monthKey) || 0;
    if (disbursementThisMonth > 0) {
      balance += disbursementThisMonth;
      disbMapClone.delete(monthKey);
    }

    if (emiChangeMap.has(monthKey)) currentEMI = emiChangeMap.get(monthKey);
    // NOTE: intentionally NOT applying rate changes — using initialRate throughout

    const monthlyRate = initialRate / 12 / 100;
    const interestForMonth = balance * monthlyRate;
    const partPaymentThisMonth = partPaymentMap.get(monthKey) || 0;

    if (balance > 0) {
      let emiPayment = currentEMI;
      if (balance + interestForMonth <= emiPayment + partPaymentThisMonth) {
        emiPayment = Math.max(0, balance + interestForMonth - partPaymentThisMonth);
      }
      const totalPaymentThisMonth = emiPayment + partPaymentThisMonth;
      const principalForMonth = Math.min(totalPaymentThisMonth - interestForMonth, balance);
      balance = Math.max(0, balance - principalForMonth);
      totalInterest += interestForMonth;
    }

    currentDate.setMonth(currentDate.getMonth() + 1);
    if (balance < 0.01 && disbMapClone.size === 0) break;
  }

  return totalInterest;
}

/**
 * Build a Map from an array of entries, keyed by "year-month"
 * @param {Array} entries - [{date: Date, ...}]
 * @param {string} valueKey - Key to extract value ('amount' or 'rate')
 * @param {boolean} accumulate - If true, sum values for same month
 * @returns {Map}
 */
function buildMap(entries, valueKey, accumulate = false) {
  const map = new Map();
  entries.forEach(entry => {
    const key = `${entry.date.getFullYear()}-${entry.date.getMonth()}`;
    if (accumulate) {
      map.set(key, (map.get(key) || 0) + entry[valueKey]);
    } else {
      map.set(key, entry[valueKey]);
    }
  });
  return map;
}
