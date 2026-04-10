/* ============================================
   APP.JS — Main Entry Point, Event Delegation
   ============================================ */

import { formatCurrency, formatYearsMonths, animateValue, debounce } from './utils.js';
import * as Storage from './storage.js';
import { calculateEMI, generateAmortizationSchedule } from './calculator-engine.js';
import { renderCharts, destroyCharts } from './charts.js';
import { exportPDF } from './pdf-export.js';
import {
  showToast, showPrompt, showConfirm,
  createDisbursementRow, createEmiChangeRow,
  createPartPaymentRow, createRateChangeRow,
  showNoEntries, removeNoEntries
} from './ui-components.js';

// ===== STATE =====
let currentUserId = null;
let calculatedSchedule = [];
let calculatedSummary = {};
let counters = { disbursement: 0, emiChange: 0, partPayment: 0, rateChange: 0 };

// ===== DOM REFERENCES =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadData();
  setupEventDelegation();
  setupKeyboardShortcuts();
});

// ===== THEME =====
function initTheme() {
  const theme = Storage.getSavedTheme();
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';

  if (next === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }

  Storage.saveTheme(next);
  showToast({ title: `${next === 'dark' ? '🌙' : '☀️'} ${next.charAt(0).toUpperCase() + next.slice(1)} mode activated`, type: 'info', duration: 1500 });
}

// ===== EVENT DELEGATION =====
function setupEventDelegation() {
  // Theme toggle
  const themeBtn = $('#themeToggle');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  // User actions
  $('#createUserBtn')?.addEventListener('click', createNewUser);
  $('#renameUserBtn')?.addEventListener('click', renameCurrentUser);
  $('#deleteUserBtn')?.addEventListener('click', deleteCurrentUser);
  $('#userSelect')?.addEventListener('change', switchUser);

  // Add entry buttons
  $('#addDisbursementBtn')?.addEventListener('click', () => addDisbursement());
  $('#addEmiChangeBtn')?.addEventListener('click', () => addEmiChange());
  $('#addPartPaymentBtn')?.addEventListener('click', () => addPartPayment());
  $('#addRateChangeBtn')?.addEventListener('click', () => addRateChange());

  // Calculate & Clear
  $('#calculateBtn')?.addEventListener('click', calculateLoan);
  $('#clearAllBtn')?.addEventListener('click', clearAllData);
  $('#exportPdfBtn')?.addEventListener('click', handleExportPDF);

  // Recalculate EMI button
  $('#recalcEmiBtn')?.addEventListener('click', recalculateEMIWithFeedback);

  // Auto-save on input changes (delegated)
  const card = $('.calculator-card');
  if (card) {
    card.addEventListener('input', handleInputChange);
    card.addEventListener('change', handleInputChange);
  }

  // Remove entry buttons (delegated)
  document.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('[data-remove]');
    if (removeBtn) {
      const id = removeBtn.dataset.remove;
      const type = removeBtn.dataset.type;
      removeEntry(id, type);
    }
  });

  // Export/Import data
  $('#exportDataBtn')?.addEventListener('click', handleExportData);
  $('#importDataBtn')?.addEventListener('click', handleImportData);
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Enter to calculate — only inside the calculator card, not in modals/overlays
    if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
      const inCalculatorCard = e.target.closest('.calculator-card');
      const inModal = e.target.closest('.modal-overlay');
      if (inCalculatorCard && !inModal) {
        e.preventDefault();
        calculateLoan();
      }
    }
  });
}

// ===== DEBOUNCED SAVE =====
const debouncedSave = debounce(() => {
  saveData();
}, 500);

// Debounced EMI auto-calc (longer delay to avoid mid-keystroke calculation)
const debouncedAutoEMI = debounce(() => {
  autoCalculateEMI();
}, 800);

function handleInputChange(e) {
  const target = e.target;
  const isChangeEvent = e.type === 'change';

  // Update total disbursement badge in real-time
  if (target.classList.contains('disbursement-amount')) {
    updateTotalDisbursement();
  }

  // Auto-calculate EMI — only on 'change' (blur) events for stability,
  // or debounced for disbursement amount changes
  if (isChangeEvent && (target.id === 'interestRate' || target.id === 'originalTerm')) {
    autoCalculateEMI();
  } else if (target.classList.contains('disbursement-amount')) {
    debouncedAutoEMI();
  }

  debouncedSave();
}

// ===== USER MANAGEMENT =====
async function createNewUser() {
  const name = await showPrompt({
    title: 'Create New User',
    message: 'Enter a name for the new user profile.',
    placeholder: 'e.g., Home Loan, Car Loan',
    confirmText: 'Create'
  });

  if (!name) return;

  currentUserId = Storage.createUser(name);
  clearFormData();
  populateUserDropdown();
  addDisbursement(null, null, false);

  showToast({ title: `User "${name}" created!`, type: 'success' });
}

function switchUser() {
  const select = $('#userSelect');
  const userId = select.value;

  if (!userId) {
    currentUserId = null;
    Storage.setCurrentUserId(null);
    clearFormData();
    populateUserDropdown();
    addDisbursement(null, null, false);
    return;
  }

  currentUserId = userId;
  Storage.setCurrentUserId(userId);
  loadUserData();
  populateUserDropdown();
}

async function renameCurrentUser() {
  if (!currentUserId) return;

  const currentName = Storage.getUserName(currentUserId);
  const newName = await showPrompt({
    title: 'Rename User',
    message: 'Enter the new name for this user profile.',
    defaultValue: currentName || '',
    confirmText: 'Rename'
  });

  if (!newName || newName === currentName) return;

  Storage.renameUser(currentUserId, newName);
  populateUserDropdown();
  showToast({ title: `Renamed to "${newName}"`, type: 'success' });
}

async function deleteCurrentUser() {
  if (!currentUserId) return;

  const userName = Storage.getUserName(currentUserId);
  const confirmed = await showConfirm({
    title: 'Delete User',
    message: `Are you sure you want to delete "${userName}" and all their data? This cannot be undone.`,
    type: 'danger',
    confirmText: 'Delete',
    cancelText: 'Keep'
  });

  if (!confirmed) return;

  Storage.deleteUser(currentUserId);
  currentUserId = null;
  clearFormData();
  populateUserDropdown();
  addDisbursement(null, null, false);

  showToast({ title: `User "${userName}" deleted`, type: 'warning' });
}

function populateUserDropdown() {
  const select = $('#userSelect');
  const users = Storage.getAllUsers();
  const userIds = Object.keys(users);

  select.innerHTML = '<option value="">-- Select User --</option>';
  userIds.sort((a, b) => users[a].name.localeCompare(users[b].name));

  userIds.forEach(id => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = users[id].name;
    if (id === currentUserId) option.selected = true;
    select.appendChild(option);
  });

  const hasUser = currentUserId && users[currentUserId];
  const deleteBtn = $('#deleteUserBtn');
  const renameBtn = $('#renameUserBtn');
  if (deleteBtn) deleteBtn.style.display = hasUser ? 'inline-flex' : 'none';
  if (renameBtn) renameBtn.style.display = hasUser ? 'inline-flex' : 'none';

  const badge = $('#currentUserBadge');
  const nameSpan = $('#currentUserName');
  if (badge && nameSpan) {
    if (hasUser) {
      badge.style.display = 'inline-flex';
      nameSpan.textContent = users[currentUserId].name;
    } else {
      badge.style.display = 'none';
    }
  }
}

// ===== DATA PERSISTENCE =====
function saveData() {
  if (!currentUserId) return;

  const data = {
    interestRate: $('#interestRate').value,
    emiPayment: $('#emiPayment').value,
    emiDeductionDay: $('#emiDeductionDay').value,
    originalTerm: $('#originalTerm').value,
    disbursements: [],
    emiChanges: [],
    partPayments: [],
    rateChanges: []
  };

  $$('#disbursementsContainer .entry-row').forEach(row => {
    data.disbursements.push({
      date: row.querySelector('.disbursement-date').value,
      amount: row.querySelector('.disbursement-amount').value
    });
  });

  $$('#emiChangesContainer .entry-row').forEach(row => {
    data.emiChanges.push({
      date: row.querySelector('.emi-change-date').value,
      amount: row.querySelector('.emi-change-amount').value
    });
  });

  $$('#partPaymentsContainer .entry-row').forEach(row => {
    data.partPayments.push({
      date: row.querySelector('.part-payment-date').value,
      amount: row.querySelector('.part-payment-amount').value
    });
  });

  $$('#rateChangesContainer .entry-row').forEach(row => {
    data.rateChanges.push({
      date: row.querySelector('.rate-change-date').value,
      rate: row.querySelector('.rate-change-rate').value
    });
  });

  Storage.saveUserData(currentUserId, data);
  showSaveIndicator();
}

function loadData() {
  const savedUserId = Storage.getCurrentUserId();
  const users = Storage.getAllUsers();

  if (savedUserId && users[savedUserId]) {
    currentUserId = savedUserId;
  }

  populateUserDropdown();

  if (currentUserId) {
    loadUserData();
  } else {
    addDisbursement(null, null, false);
  }
}

function loadUserData() {
  clearFormData();

  if (!currentUserId) {
    addDisbursement(null, null, false);
    return;
  }

  const data = Storage.getUserData(currentUserId);
  if (!data) {
    addDisbursement(null, null, false);
    return;
  }

  try {
    if (data.interestRate) $('#interestRate').value = data.interestRate;
    if (data.emiPayment) $('#emiPayment').value = data.emiPayment;
    if (data.emiDeductionDay) $('#emiDeductionDay').value = data.emiDeductionDay;
    if (data.originalTerm) $('#originalTerm').value = data.originalTerm;

    if (data.disbursements?.length > 0) {
      data.disbursements.forEach(d => addDisbursement(d.date, d.amount, false));
    } else {
      addDisbursement(null, null, false);
    }

    if (data.emiChanges?.length > 0) data.emiChanges.forEach(e => addEmiChange(e.date, e.amount, false));
    if (data.partPayments?.length > 0) data.partPayments.forEach(p => addPartPayment(p.date, p.amount, false));
    if (data.rateChanges?.length > 0) data.rateChanges.forEach(r => addRateChange(r.date, r.rate, false));

    updateTotalDisbursement();
  } catch (e) {
    console.error('Error loading user data:', e);
    addDisbursement(null, null, false);
  }
}

function clearFormData() {
  $('#interestRate').value = '';
  $('#emiPayment').value = '';
  $('#emiDeductionDay').value = '1';
  $('#originalTerm').value = '';
  $('#disbursementsContainer').innerHTML = '';
  $('#emiChangesContainer').innerHTML = '';
  $('#partPaymentsContainer').innerHTML = '';
  $('#rateChangesContainer').innerHTML = '';
  $('#totalDisbursement').textContent = 'Total: ₹0';

  const results = $('#resultsSection');
  if (results) results.classList.remove('visible');

  counters = { disbursement: 0, emiChange: 0, partPayment: 0, rateChange: 0 };
  calculatedSchedule = [];
  calculatedSummary = {};
  destroyCharts();
}

function showSaveIndicator() {
  const indicator = $('#saveIndicator');
  if (!indicator) return;
  indicator.classList.add('visible');
  setTimeout(() => indicator.classList.remove('visible'), 2000);
}

// ===== ENTRY MANAGEMENT =====
function addDisbursement(date = null, amount = null, save = true) {
  counters.disbursement++;
  const container = $('#disbursementsContainer');
  removeNoEntries(container);
  const id = `disbursement-${counters.disbursement}`;
  const row = createDisbursementRow(id, date, amount || '');
  container.appendChild(row);
  updateTotalDisbursement();
  if (save) debouncedSave();
}

function addEmiChange(date = null, amount = null, save = true) {
  counters.emiChange++;
  const container = $('#emiChangesContainer');
  removeNoEntries(container);
  const id = `emiChange-${counters.emiChange}`;
  const row = createEmiChangeRow(id, date, amount || '');
  container.appendChild(row);
  if (save) debouncedSave();
}

function addPartPayment(date = null, amount = null, save = true) {
  counters.partPayment++;
  const container = $('#partPaymentsContainer');
  removeNoEntries(container);
  const id = `partPayment-${counters.partPayment}`;
  const row = createPartPaymentRow(id, date, amount || '');
  container.appendChild(row);
  if (save) debouncedSave();
}

function addRateChange(date = null, rate = null, save = true) {
  counters.rateChange++;
  const container = $('#rateChangesContainer');
  removeNoEntries(container);
  const id = `rateChange-${counters.rateChange}`;
  const row = createRateChangeRow(id, date, rate || '');
  container.appendChild(row);
  if (save) debouncedSave();
}

function removeEntry(id, type) {
  const el = document.getElementById(id);
  if (!el) return;

  el.classList.add('removing');
  setTimeout(() => {
    el.remove();

    const containerMap = {
      disbursement: { el: '#disbursementsContainer', msg: 'No disbursements added. Click "Add Disbursement" to add loan amount.' },
      emiChange: { el: '#emiChangesContainer', msg: 'No EMI changes added.' },
      partPayment: { el: '#partPaymentsContainer', msg: 'No part payments added.' },
      rateChange: { el: '#rateChangesContainer', msg: 'No rate changes added.' }
    };

    const config = containerMap[type];
    if (config) {
      const container = $(config.el);
      if (container && container.children.length === 0) {
        showNoEntries(container, config.msg);
      }
    }

    if (type === 'disbursement') updateTotalDisbursement();
    debouncedSave();
  }, 250);
}

// ===== EMI CALCULATION =====
function updateTotalDisbursement() {
  let total = 0;
  $$('#disbursementsContainer .disbursement-amount').forEach(input => {
    total += parseFloat(input.value) || 0;
  });
  const badge = $('#totalDisbursement');
  if (badge) badge.textContent = `Total: ${formatCurrency(total)}`;
}

function autoCalculateEMI(forceCalculate = false) {
  const interestRate = parseFloat($('#interestRate')?.value);
  const originalTerm = parseFloat($('#originalTerm')?.value);
  const emiInput = $('#emiPayment');
  const emiLabel = $('#emiAutoLabel');

  let principal = 0;
  $$('#disbursementsContainer .disbursement-amount').forEach(input => {
    const val = parseFloat(input.value);
    if (!isNaN(val) && val > 0) principal += val;
  });

  // Sanity checks — all three values must be present and reasonable
  if (!principal || principal <= 0 || !interestRate || interestRate <= 0 ||
      !originalTerm || originalTerm <= 0 || !isFinite(principal)) {
    if (emiLabel) emiLabel.style.display = 'none';
    return;
  }

  // Don't overwrite if user has manually entered an EMI (unless forced)
  if (!forceCalculate && emiInput.value && emiInput.value !== '') {
    if (emiLabel) emiLabel.style.display = 'none';
    return;
  }

  const emi = calculateEMI(principal, interestRate, originalTerm);

  if (emi > 0 && isFinite(emi) && emi < 1e10) { // sanity cap
    emiInput.value = emi;
    if (emiLabel) {
      emiLabel.style.display = 'inline';
      emiLabel.textContent = 'Auto-calculated';
      emiLabel.style.color = 'var(--success)';
    }
    debouncedSave();
  }
}

function recalculateEMIWithFeedback() {
  const btn = $('#recalcEmiBtn');
  if (btn) {
    btn.classList.add('spinning');
    setTimeout(() => btn.classList.remove('spinning'), 400);
  }

  autoCalculateEMI(true);

  const emiLabel = $('#emiAutoLabel');
  if (emiLabel) {
    emiLabel.style.display = 'inline';
    emiLabel.textContent = '✓ Recalculated!';
    emiLabel.style.color = 'var(--success)';
    setTimeout(() => {
      emiLabel.textContent = 'Auto-calculated';
    }, 1500);
  }
}

// ===== CALCULATION =====
function getDisbursements() {
  const disbursements = [];
  $$('#disbursementsContainer .entry-row').forEach(row => {
    const date = row.querySelector('.disbursement-date').value;
    const amount = parseFloat(row.querySelector('.disbursement-amount').value);
    if (date && amount > 0) disbursements.push({ date: new Date(date), amount });
  });
  return disbursements.sort((a, b) => a.date - b.date);
}

function getEmiChanges() {
  const changes = [];
  $$('#emiChangesContainer .entry-row').forEach(row => {
    const date = row.querySelector('.emi-change-date').value;
    const amount = parseFloat(row.querySelector('.emi-change-amount').value);
    if (date && amount > 0) changes.push({ date: new Date(date), amount });
  });
  return changes.sort((a, b) => a.date - b.date);
}

function getPartPayments() {
  const payments = [];
  $$('#partPaymentsContainer .entry-row').forEach(row => {
    const date = row.querySelector('.part-payment-date').value;
    const amount = parseFloat(row.querySelector('.part-payment-amount').value);
    if (date && amount > 0) payments.push({ date: new Date(date), amount });
  });
  return payments.sort((a, b) => a.date - b.date);
}

function getRateChanges() {
  const changes = [];
  $$('#rateChangesContainer .entry-row').forEach(row => {
    const date = row.querySelector('.rate-change-date').value;
    const rate = parseFloat(row.querySelector('.rate-change-rate').value);
    if (date && rate > 0) changes.push({ date: new Date(date), rate });
  });
  return changes.sort((a, b) => a.date - b.date);
}

function calculateLoan() {
  const initialRate = parseFloat($('#interestRate')?.value);
  const initialEMI = parseFloat($('#emiPayment')?.value);
  const emiDeductionDay = parseInt($('#emiDeductionDay')?.value);
  const originalTermYears = parseInt($('#originalTerm')?.value) || 0;
  const disbursements = getDisbursements();

  if (disbursements.length === 0) {
    showToast({ title: 'Missing Data', message: 'Please add at least one loan disbursement.', type: 'warning' });
    return;
  }
  if (!initialRate || !initialEMI) {
    showToast({ title: 'Missing Data', message: 'Please fill in interest rate and initial EMI.', type: 'warning' });
    return;
  }

  const { schedule, summary } = generateAmortizationSchedule({
    disbursements,
    initialRate,
    initialEMI,
    emiDeductionDay,
    emiChanges: getEmiChanges(),
    partPayments: getPartPayments(),
    rateChanges: getRateChanges(),
    originalTermYears
  });

  calculatedSchedule = schedule;
  calculatedSummary = summary;

  // Update summary cards with animations
  updateSummaryCards(summary);
  updateTermAnalysis(summary);
  renderCharts(summary, schedule);
  renderAmortizationTable(schedule);

  const resultsSection = $('#resultsSection');
  resultsSection.classList.add('visible');
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  showToast({ title: 'Calculation Complete!', message: `${summary.totalMonths} months amortization generated.`, type: 'success', duration: 2500 });
}

function updateSummaryCards(summary) {
  const pairs = [
    ['summaryDisbursed', summary.totalDisbursed],
    ['totalPrincipal', summary.totalPrincipal],
    ['totalInterest', summary.totalInterest],
    ['totalAmount', summary.totalAmount],
    ['interestSaved', summary.interestSaved],
    ['paidTillDate', summary.paidTillDate],
    ['remainingToPay', summary.remainingToPay]
  ];

  pairs.forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) animateValue(el, 0, value, formatCurrency, 1000);
  });
}

function updateTermAnalysis(summary) {
  // Original term
  const origMonths = $('#originalTermMonths');
  const origYears = $('#originalTermYears');
  if (origMonths) origMonths.textContent = summary.originalTermMonths > 0 ? summary.originalTermMonths : '-';
  if (origYears) origYears.textContent = summary.originalTermMonths > 0
    ? `${Math.floor(summary.originalTermMonths / 12)} years` : 'Not specified';

  // Actual term
  const totalMonthsEl = $('#totalTermMonths');
  const totalYearsEl = $('#totalTermYears');
  if (totalMonthsEl) totalMonthsEl.textContent = summary.totalMonths;
  if (totalYearsEl) totalYearsEl.textContent = formatYearsMonths(summary.totalMonths);

  // Completed
  const compMonths = $('#completedTermMonths');
  const compYears = $('#completedTermYears');
  if (compMonths) compMonths.textContent = summary.completedMonths;
  if (compYears) compYears.textContent = formatYearsMonths(summary.completedMonths);

  // Remaining
  const remMonths = $('#remainingTermMonths');
  const remYears = $('#remainingTermYears');
  if (remMonths) remMonths.textContent = summary.remainingMonths;
  if (remYears) remYears.textContent = formatYearsMonths(summary.remainingMonths);

  // Saved
  const savedMonths = $('#savedTermMonths');
  const savedYears = $('#savedTermYears');
  if (savedMonths) savedMonths.textContent = summary.savedMonths;
  if (savedYears) savedYears.textContent = formatYearsMonths(summary.savedMonths);

  // Progress bar
  const progressPercent = summary.totalMonths > 0
    ? Math.round((summary.completedMonths / summary.totalMonths) * 100) : 0;
  const progressPercentEl = $('#progressPercent');
  const progressFill = $('#progressFill');
  const progressText = $('#progressText');
  if (progressPercentEl) progressPercentEl.textContent = progressPercent + '%';
  if (progressFill) progressFill.style.width = progressPercent + '%';
  if (progressText) progressText.textContent = `${summary.completedMonths} of ${summary.totalMonths} months`;
}

function renderAmortizationTable(schedule) {
  const tbody = $('#scheduleBody');
  if (!tbody) return;

  tbody.innerHTML = '';
  const today = new Date();

  const fragment = document.createDocumentFragment();

  schedule.forEach((row, index) => {
    const tr = document.createElement('tr');

    // Event row classes
    if (row.hasDisbursement) tr.classList.add('disbursement-row');
    else if (row.emiChanged) tr.classList.add('emi-change-row');
    else if (row.rateChanged) tr.classList.add('rate-change-row');
    else if (row.hasPartPayment) tr.classList.add('part-payment-row');

    // Today marker
    const emiDate = new Date(row.date.getFullYear(), row.date.getMonth(), row.emiDay);
    const nextMonth = new Date(row.date.getFullYear(), row.date.getMonth() + 1, row.emiDay);
    if (emiDate <= today && nextMonth > today && index < schedule.length - 1) {
      tr.classList.add('today-row');
    }

    // Event badges
    let eventIndicators = '';
    if (row.hasDisbursement) eventIndicators += `<span class="disbursement-badge">+${formatCurrency(row.disbursement)}</span>`;
    if (row.emiChanged) eventIndicators += `<span class="emi-badge">EMI: ${formatCurrency(row.emi)}</span>`;
    if (row.rateChanged) eventIndicators += `<span class="rate-badge">Rate: ${row.rate}%</span>`;
    if (row.hasPartPayment) eventIndicators += `<span class="part-payment-badge">Part Pay</span>`;

    const formatDateStr = new Date(row.date.getFullYear(), row.date.getMonth(), row.emiDay)
      .toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

    // Use dynamically projected remaining term from engine
    const remainingMonths = row.projectedRemainingMonths;
    const years = Math.floor(remainingMonths / 12);
    const months = remainingMonths % 12;
    let remainingTermText = '';
    
    if (remainingMonths === 0 || isNaN(remainingMonths)) {
      remainingTermText = '<span style="color: var(--success); font-size: 0.85em;">Completed</span>';
    } else {
      if (years > 0) remainingTermText += `${years}Y `;
      if (months > 0 || years === 0) remainingTermText += `${months}M`;
    }

    tr.innerHTML = `
      <td>${row.month}</td>
      <td>${formatDateStr}<div class="event-indicator">${eventIndicators}</div></td>
      <td>${row.rate}%</td>
      <td>${formatCurrency(row.emi)}</td>
      <td>${row.disbursement > 0 ? formatCurrency(row.disbursement) : '-'}</td>
      <td class="amount-principal">${formatCurrency(row.principal)}</td>
      <td>${formatCurrency(row.interest)}</td>
      <td>${row.partPayment > 0 ? formatCurrency(row.partPayment) : '-'}</td>
      <td>${formatCurrency(row.totalPayment)}</td>
      <td style="font-family: var(--font-mono); font-size: 0.9em; color: var(--text-secondary);">${remainingTermText.trim()}</td>
      <td class="${row.balance < 0.01 ? 'zero-remaining' : ''}">${formatCurrency(row.balance)}</td>
    `;

    fragment.appendChild(tr);
  });

  tbody.appendChild(fragment);
}

// ===== CLEAR ALL =====
async function clearAllData() {
  if (!currentUserId) {
    showToast({ title: 'No user selected', message: 'Please select a user first.', type: 'warning' });
    return;
  }

  const confirmed = await showConfirm({
    title: 'Clear All Data',
    message: 'Are you sure you want to clear all data for this user? This cannot be undone.',
    type: 'danger',
    confirmText: 'Clear All',
    cancelText: 'Keep Data'
  });

  if (!confirmed) return;

  Storage.clearUserData(currentUserId);
  clearFormData();
  addDisbursement(null, null, false);
  showToast({ title: 'Data cleared', type: 'info' });
}

// ===== PDF EXPORT =====
function handleExportPDF() {
  if (calculatedSchedule.length === 0) {
    showToast({ title: 'Nothing to export', message: 'Please calculate the loan first.', type: 'warning' });
    return;
  }

  const userName = currentUserId ? Storage.getUserName(currentUserId) : 'Guest';
  exportPDF(calculatedSchedule, calculatedSummary, userName || 'Guest');
  showToast({ title: 'PDF exported!', message: 'Your report has been downloaded.', type: 'success' });
}

// ===== DATA EXPORT/IMPORT =====
function handleExportData() {
  const data = Storage.exportAllData();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `loan_calculator_data_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast({ title: 'Data exported!', message: 'Your data has been saved as JSON.', type: 'success' });
}

function handleImportData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const success = Storage.importData(text);
      if (success) {
        loadData();
        showToast({ title: 'Data imported!', message: 'All user profiles loaded.', type: 'success' });
      } else {
        showToast({ title: 'Import failed', message: 'Invalid file format.', type: 'error' });
      }
    } catch (err) {
      showToast({ title: 'Import failed', message: err.message, type: 'error' });
    }
  };
  input.click();
}
