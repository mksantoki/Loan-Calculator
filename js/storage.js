/* ============================================
   STORAGE — LocalStorage Abstraction
   ============================================ */

const USERS_KEY = 'loanCalculatorUsers';
const CURRENT_USER_KEY = 'loanCalculatorCurrentUser';
const THEME_KEY = 'loanCalculatorTheme';

/**
 * Get all users from localStorage
 * @returns {Object}
 */
export function getAllUsers() {
  try {
    const users = localStorage.getItem(USERS_KEY);
    return users ? JSON.parse(users) : {};
  } catch (e) {
    console.error('Error reading users from localStorage:', e);
    return {};
  }
}

/**
 * Save all users to localStorage
 * @param {Object} users
 */
export function saveAllUsers(users) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Error saving users to localStorage:', e);
  }
}

/**
 * Get the current user ID
 * @returns {string|null}
 */
export function getCurrentUserId() {
  return localStorage.getItem(CURRENT_USER_KEY) || null;
}

/**
 * Set the current user ID
 * @param {string|null} userId
 */
export function setCurrentUserId(userId) {
  if (userId) {
    localStorage.setItem(CURRENT_USER_KEY, userId);
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

/**
 * Get saved theme preference
 * @returns {string}
 */
export function getSavedTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark';
}

/**
 * Save theme preference
 * @param {string} theme - 'dark' or 'light'
 */
export function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

/**
 * Create a new user
 * @param {string} name
 * @returns {string} userId
 */
export function createUser(name) {
  const users = getAllUsers();
  const userId = 'user_' + Date.now();

  users[userId] = {
    name: name.trim(),
    data: null,
    createdAt: new Date().toISOString()
  };

  saveAllUsers(users);
  setCurrentUserId(userId);
  return userId;
}

/**
 * Delete a user
 * @param {string} userId
 * @returns {string|null} deleted user's name
 */
export function deleteUser(userId) {
  const users = getAllUsers();
  if (!users[userId]) return null;

  const name = users[userId].name;
  delete users[userId];
  saveAllUsers(users);

  if (getCurrentUserId() === userId) {
    setCurrentUserId(null);
  }
  return name;
}

/**
 * Rename a user
 * @param {string} userId
 * @param {string} newName
 * @returns {boolean}
 */
export function renameUser(userId, newName) {
  const users = getAllUsers();
  if (!users[userId]) return false;

  users[userId].name = newName.trim();
  saveAllUsers(users);
  return true;
}

/**
 * Get a user's saved data
 * @param {string} userId
 * @returns {Object|null}
 */
export function getUserData(userId) {
  const users = getAllUsers();
  if (!users[userId]) return null;
  return users[userId].data;
}

/**
 * Save a user's data
 * @param {string} userId
 * @param {Object} data
 */
export function saveUserData(userId, data) {
  const users = getAllUsers();
  if (!users[userId]) return;

  users[userId].data = data;
  users[userId].updatedAt = new Date().toISOString();
  saveAllUsers(users);
}

/**
 * Clear a user's data
 * @param {string} userId
 */
export function clearUserData(userId) {
  const users = getAllUsers();
  if (!users[userId]) return;

  users[userId].data = null;
  saveAllUsers(users);
}

/**
 * Get a user's name
 * @param {string} userId
 * @returns {string|null}
 */
export function getUserName(userId) {
  const users = getAllUsers();
  return users[userId]?.name || null;
}

/**
 * Export all data as JSON string
 * @returns {string}
 */
export function exportAllData() {
  const data = {
    users: getAllUsers(),
    currentUserId: getCurrentUserId(),
    exportedAt: new Date().toISOString(),
    version: '2.0'
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Import data from JSON string
 * @param {string} jsonString
 * @returns {boolean}
 */
export function importData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (!data.users) return false;

    saveAllUsers(data.users);
    if (data.currentUserId) {
      setCurrentUserId(data.currentUserId);
    }
    return true;
  } catch (e) {
    console.error('Error importing data:', e);
    return false;
  }
}
