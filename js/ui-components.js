/* ============================================
   UI COMPONENTS — Modal, Toast, Entry Rows
   ============================================ */

import { sanitize, generateId } from './utils.js';

// ===== TOAST SYSTEM =====

let toastContainer = null;

function ensureToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    toastContainer.setAttribute('role', 'status');
    toastContainer.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

const TOAST_ICONS = {
  success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`,
  error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`,
  warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
};

/**
 * Show a toast notification
 * @param {Object} options
 * @param {string} options.title - Toast title
 * @param {string} [options.message] - Toast description
 * @param {string} [options.type='info'] - 'success' | 'error' | 'warning' | 'info'
 * @param {number} [options.duration=3000] - Auto-dismiss in ms (0 for manual)
 */
export function showToast({ title, message = '', type = 'info', duration = 3000 }) {
  const container = ensureToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <div class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</div>
    <div class="toast-content">
      <div class="toast-title">${sanitize(title)}</div>
      ${message ? `<div class="toast-message">${sanitize(message)}</div>` : ''}
    </div>
    <button class="toast-close" aria-label="Close notification">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
      </svg>
    </button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => dismissToast(toast));

  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => dismissToast(toast), duration);
  }

  return toast;
}

function dismissToast(toast) {
  if (!toast || !toast.parentNode) return;
  toast.classList.add('exiting');
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 200);
}


// ===== MODAL SYSTEM =====

let activeModal = null;

/**
 * Show a prompt modal (replaces window.prompt)
 * @param {Object} options
 * @param {string} options.title
 * @param {string} [options.message]
 * @param {string} [options.placeholder]
 * @param {string} [options.defaultValue]
 * @param {string} [options.confirmText='OK']
 * @param {string} [options.cancelText='Cancel']
 * @returns {Promise<string|null>}
 */
export function showPrompt({
  title,
  message = '',
  placeholder = '',
  defaultValue = '',
  confirmText = 'OK',
  cancelText = 'Cancel'
}) {
  return new Promise((resolve) => {
    const overlay = createModalOverlay();
    const modal = document.createElement('div');
    modal.className = 'modal-content';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'modal-title');

    const inputId = generateId('modal-input');

    modal.innerHTML = `
      <div class="modal-header">
        <h3 id="modal-title">${sanitize(title)}</h3>
        <button class="modal-close" aria-label="Close" data-action="cancel">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        ${message ? `<p>${sanitize(message)}</p>` : ''}
        <div class="form-group">
          <label for="${inputId}">Name</label>
          <input type="text" id="${inputId}" placeholder="${sanitize(placeholder)}" value="${sanitize(defaultValue)}" autocomplete="off">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" data-action="cancel">${sanitize(cancelText)}</button>
        <button class="btn" data-action="confirm">${sanitize(confirmText)}</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    activeModal = overlay;

    const input = modal.querySelector('input');
    input.focus();
    input.select();

    // Event handling
    const handleAction = (action) => {
      if (action === 'confirm') {
        const value = input.value.trim();
        closeModal(overlay);
        resolve(value || null);
      } else {
        closeModal(overlay);
        resolve(null);
      }
    };

    modal.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action) handleAction(action);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAction('confirm');
      if (e.key === 'Escape') handleAction('cancel');
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) handleAction('cancel');
    });
  });
}

/**
 * Show a confirmation modal (replaces window.confirm)
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.message
 * @param {string} [options.type='warning'] - 'warning' | 'danger' | 'success'
 * @param {string} [options.confirmText='Confirm']
 * @param {string} [options.cancelText='Cancel']
 * @returns {Promise<boolean>}
 */
export function showConfirm({
  title,
  message,
  type = 'warning',
  confirmText = 'Confirm',
  cancelText = 'Cancel'
}) {
  return new Promise((resolve) => {
    const overlay = createModalOverlay();
    const modal = document.createElement('div');
    modal.className = 'modal-content centered';
    modal.setAttribute('role', 'alertdialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'modal-title');
    modal.setAttribute('aria-describedby', 'modal-desc');

    const iconMap = {
      warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
      danger: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>`,
      success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`
    };

    const btnClass = type === 'danger' ? 'btn-pdf' : '';

    modal.innerHTML = `
      <div class="modal-icon ${type}">${iconMap[type] || iconMap.warning}</div>
      <div class="modal-body">
        <h3 id="modal-title" style="margin-bottom: var(--space-3); font-size: var(--text-xl);">${sanitize(title)}</h3>
        <p id="modal-desc">${sanitize(message)}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" data-action="cancel">${sanitize(cancelText)}</button>
        <button class="btn ${btnClass}" data-action="confirm">${sanitize(confirmText)}</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    activeModal = overlay;

    // Focus the confirm button
    setTimeout(() => modal.querySelector('[data-action="cancel"]').focus(), 50);

    const handleAction = (action) => {
      closeModal(overlay);
      resolve(action === 'confirm');
    };

    modal.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action) handleAction(action);
    });

    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', escHandler);
        handleAction('cancel');
      }
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) handleAction('cancel');
    });
  });
}

/**
 * Show an alert modal (replaces window.alert)
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.message
 * @param {string} [options.type='info'] - 'warning' | 'danger' | 'success' | 'info'
 * @returns {Promise<void>}
 */
export function showAlert({ title, message, type = 'info' }) {
  return showConfirm({
    title,
    message,
    type: type === 'info' ? 'warning' : type,
    confirmText: 'OK',
    cancelText: ''
  }).then(() => {});
}

function createModalOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  return overlay;
}

function closeModal(overlay) {
  if (!overlay) return;
  overlay.classList.add('closing');
  setTimeout(() => {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (activeModal === overlay) activeModal = null;
  }, 150);
}


// ===== ENTRY ROW BUILDERS =====

const SVG_DELETE = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>`;

/**
 * Create a disbursement entry row
 * @param {string} id
 * @param {string} date
 * @param {string} amount
 * @returns {HTMLElement}
 */
export function createDisbursementRow(id, date, amount) {
  const today = date || new Date().toISOString().split('T')[0];
  const row = document.createElement('div');
  row.className = 'entry-row';
  row.id = id;
  row.innerHTML = `
    <div class="form-group">
      <label>Disbursement Date</label>
      <input type="date" class="disbursement-date" value="${today}" aria-label="Disbursement date">
    </div>
    <div class="form-group">
      <label>Disbursement Amount</label>
      <div class="input-wrapper has-prefix">
        <span class="input-prefix">₹</span>
        <input type="number" class="disbursement-amount" placeholder="500000" min="1" value="${amount || ''}" aria-label="Disbursement amount">
      </div>
    </div>
    <button class="btn btn-danger" data-remove="${id}" data-type="disbursement" aria-label="Remove disbursement">${SVG_DELETE} Remove</button>
  `;
  return row;
}

/**
 * Create an EMI change entry row
 * @param {string} id
 * @param {string} date
 * @param {string} amount
 * @returns {HTMLElement}
 */
export function createEmiChangeRow(id, date, amount) {
  const row = document.createElement('div');
  row.className = 'entry-row';
  row.id = id;
  row.innerHTML = `
    <div class="form-group">
      <label>Effective Date</label>
      <input type="date" class="emi-change-date" value="${date || ''}" aria-label="EMI change date">
    </div>
    <div class="form-group">
      <label>New EMI Amount</label>
      <div class="input-wrapper has-prefix">
        <span class="input-prefix">₹</span>
        <input type="number" class="emi-change-amount" placeholder="20000" min="100" value="${amount || ''}" aria-label="New EMI amount">
      </div>
    </div>
    <button class="btn btn-danger" data-remove="${id}" data-type="emiChange" aria-label="Remove EMI change">${SVG_DELETE} Remove</button>
  `;
  return row;
}

/**
 * Create a part payment entry row
 * @param {string} id
 * @param {string} date
 * @param {string} amount
 * @returns {HTMLElement}
 */
export function createPartPaymentRow(id, date, amount) {
  const row = document.createElement('div');
  row.className = 'entry-row';
  row.id = id;
  row.innerHTML = `
    <div class="form-group">
      <label>Payment Date</label>
      <input type="date" class="part-payment-date" value="${date || ''}" aria-label="Part payment date">
    </div>
    <div class="form-group">
      <label>Part Payment Amount</label>
      <div class="input-wrapper has-prefix">
        <span class="input-prefix">₹</span>
        <input type="number" class="part-payment-amount" placeholder="50000" min="1" value="${amount || ''}" aria-label="Part payment amount">
      </div>
    </div>
    <button class="btn btn-danger" data-remove="${id}" data-type="partPayment" aria-label="Remove part payment">${SVG_DELETE} Remove</button>
  `;
  return row;
}

/**
 * Create a rate change entry row
 * @param {string} id
 * @param {string} date
 * @param {string} rate
 * @returns {HTMLElement}
 */
export function createRateChangeRow(id, date, rate) {
  const row = document.createElement('div');
  row.className = 'entry-row';
  row.id = id;
  row.innerHTML = `
    <div class="form-group">
      <label>Effective Date</label>
      <input type="date" class="rate-change-date" value="${date || ''}" aria-label="Rate change date">
    </div>
    <div class="form-group">
      <label>New Interest Rate (Annual)</label>
      <div class="input-wrapper has-suffix">
        <input type="number" class="rate-change-rate" placeholder="10.5" step="0.1" min="0.1" max="50" value="${rate || ''}" aria-label="New interest rate">
        <span class="input-suffix">%</span>
      </div>
    </div>
    <button class="btn btn-danger" data-remove="${id}" data-type="rateChange" aria-label="Remove rate change">${SVG_DELETE} Remove</button>
  `;
  return row;
}

/**
 * Show the "no entries" placeholder in a container
 * @param {HTMLElement} container
 * @param {string} message
 */
export function showNoEntries(container, message) {
  container.innerHTML = `<div class="no-entries">${sanitize(message)}</div>`;
}

/**
 * Remove the "no entries" placeholder from a container
 * @param {HTMLElement} container
 */
export function removeNoEntries(container) {
  const noEntries = container.querySelector('.no-entries');
  if (noEntries) noEntries.remove();
}
