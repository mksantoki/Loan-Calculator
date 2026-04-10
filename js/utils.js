/* ============================================
   UTILITIES — Formatters, Date Helpers
   ============================================ */

/**
 * Format a number as Indian currency (₹)
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  return '₹' + amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Format a number as Indian currency without ₹ symbol
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrencyPlain(amount) {
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Format a date with a specific day
 * @param {Date} date
 * @param {number} day
 * @returns {string}
 */
export function formatDate(date, day) {
  return new Date(date.getFullYear(), date.getMonth(), day)
    .toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Format a date (short format)
 * @param {Date} date
 * @returns {string}
 */
export function formatDateShort(date) {
  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Format months into years and months string
 * @param {number} months
 * @returns {string}
 */
export function formatYearsMonths(months) {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y > 0) {
    return `${y} year${y > 1 ? 's' : ''} ${m} month${m !== 1 ? 's' : ''}`;
  }
  return `${m} month${m !== 1 ? 's' : ''}`;
}

/**
 * Animate a numeric value change on an element
 * @param {HTMLElement} element
 * @param {number} start
 * @param {number} end
 * @param {Function} formatter
 * @param {number} duration
 */
export function animateValue(element, start, end, formatter = formatCurrency, duration = 800) {
  const range = end - start;
  if (Math.abs(range) < 0.01) {
    element.textContent = formatter(end);
    return;
  }
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // easeOutCubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + range * eased;
    element.textContent = formatter(current);
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

/**
 * Debounce a function call
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function}
 */
export function debounce(fn, delay = 500) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Sanitize a string to prevent XSS when inserting into HTML
 * @param {string} str
 * @returns {string}
 */
export function sanitize(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Generate a unique ID
 * @param {string} prefix
 * @returns {string}
 */
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
}
