// ========================================
// SecureVault Password Manager - Main Logic
// Enhanced with URL detection, session management, and PIN functionality
// ========================================

// Global state
let vault = null;
let masterKey = null;
let sessionKey = null;
let lockTimer = null;
let currentTabUrl = null;
let settings = {
  lockTimeout: 300, // 5 minutes default
  autoFillEnabled: true,
  showPasswordStrength: true
};

// Storage keys
const VAULT_KEY = 'secure_vault_v2';
const PIN_KEY = 'encrypted_pin_v2';
const SESSION_KEY = 'session_data_v2';
const SETTINGS_KEY = 'vault_settings_v2';

// DOM elements (will be cached after DOM loads)
let elements = {};

// ========================================
// Initialization and Setup
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
  await initializeExtension();
});

async function initializeExtension() {
  try {
    // Show loading screen
    showScreen('loading');

    // Cache DOM elements
    cacheElements();

    // Setup event listeners
    setupEventListeners();

    // Load settings
    await loadSettings();

    // Get current tab URL
    await getCurrentTabUrl();

    // Check for existing session
    const hasActiveSession = await checkActiveSession();

    // Determine initial screen
    if (hasActiveSession) {
      await loadVaultWithSession();
    } else {
      const hasVault = await hasExistingVault();
      const hasPinSetup = await hasPinSetup();

      if (hasVault && hasPinSetup && await hasValidSession()) {
        showPinLogin();
      } else if (hasVault) {
        showMasterPasswordLogin();
      } else {
        showCreateVault();
      }
    }

    // Hide loading screen
    setTimeout(() => {
      document.getElementById('loading').style.display = 'none';
    }, 500);

  } catch (error) {
    console.error('Initialization failed:', error);
    showToast('Failed to initialize extension', 'error');
    showMasterPasswordLogin();
  }
}

function cacheElements() {
  // Cache frequently used elements
  elements = {
    // Screens
    loading: document.getElementById('loading'),
    locked: document.getElementById('locked'),
    unlocked: document.getElementById('unlocked'),

    // Auth elements
    masterPassword: document.getElementById('masterPassword'),
    pinPassword: document.getElementById('pinPassword'),
    newMasterPassword: document.getElementById('newMasterPassword'),
    confirmMasterPassword: document.getElementById('confirmMasterPassword'),
    setupPin: document.getElementById('setupPin'),

    // Auth sections
    masterLogin: document.getElementById('masterLogin'),
    pinLogin: document.getElementById('pinLogin'),
    createVault: document.getElementById('createVault'),

    // Main UI
    currentSite: document.getElementById('currentSite'),
    currentSiteSection: document.getElementById('currentSiteSection'),
    currentSiteEntries: document.getElementById('currentSiteEntries'),
    searchEntries: document.getElementById('searchEntries'),
    entries: document.getElementById('entries'),

    // Modals
    entryModal: document.getElementById('entryModal'),
    settingsModal: document.getElementById('settingsModal'),

    // Entry form
    entryName: document.getElementById('entryName'),
    entryUrl: document.getElementById('entryUrl'),
    entryUser: document.getElementById('entryUser'),
    entryPass: document.getElementById('entryPass'),
    entryNotes: document.getElementById('entryNotes'),

    // Toast
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage')
  };
}

function setupEventListeners() {
  // Authentication buttons
  document.getElementById('unlockBtn').addEventListener('click', handleMasterPasswordUnlock);
  document.getElementById('pinUnlockBtn').addEventListener('click', handlePinUnlock);
  document.getElementById('createVaultBtn').addEventListener('click', handleCreateVault);
  document.getElementById('lockBtn').addEventListener('click', handleLockVault);

  // Modal buttons
  document.getElementById('addEntryBtn').addEventListener('click', () => showEntryModal());
  document.getElementById('closeModal').addEventListener('click', hideEntryModal);
  document.getElementById('saveBtn').addEventListener('click', handleSaveEntry);
  document.getElementById('cancelBtn').addEventListener('click', hideEntryModal);
  document.getElementById('deleteBtn').addEventListener('click', handleDeleteEntry);

  // Settings
  document.getElementById('settingsBtn').addEventListener('click', showSettingsModal);
  document.getElementById('closeSettings').addEventListener('click', hideSettingsModal);
  document.getElementById('saveSettings').addEventListener('click', handleSaveSettings);
  document.getElementById('changePinBtn').addEventListener('click', handleChangePin);

  // UI toggles
  document.getElementById('showCreateVault').addEventListener('click', () => showScreen('createVault'));
  document.getElementById('useMasterPassword').addEventListener('click', showMasterPasswordLogin);
  document.getElementById('cancelCreate').addEventListener('click', showMasterPasswordLogin);

  // Password utilities
  document.getElementById('generateBtn').addEventListener('click', generatePassword);
  document.getElementById('generatePasswordBtn').addEventListener('click', showPasswordGenerator);
  document.getElementById('detectUrl').addEventListener('click', detectCurrentUrl);
  document.getElementById('exportBtn').addEventListener('click', handleExportVault);

  // Password toggles
  document.getElementById('togglePassword').addEventListener('click', () => togglePasswordVisibility('masterPassword'));
  document.getElementById('toggleEntryPassword').addEventListener('click', () => togglePasswordVisibility('entryPass'));

  // Search
  elements.searchEntries.addEventListener('input', handleSearch);

  // Toast close
  document.getElementById('toastClose').addEventListener('click', hideToast);

  // Password strength
  elements.newMasterPassword.addEventListener('input', updatePasswordStrength);
  elements.entryPass.addEventListener('input', updateEntryPasswordStrength);

  // Enter key handlers
  elements.masterPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleMasterPasswordUnlock();
  });

  elements.pinPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handlePinUnlock();
  });

  // Auto-lock on window blur
  window.addEventListener('blur', () => {
    if (vault && settings.lockTimeout > 0) {
      resetLockTimer();
    }
  });

  // Reset timer on activity
  document.addEventListener('click', resetLockTimer);
  document.addEventListener('keypress', resetLockTimer);
}

// ========================================
// Screen Management
// ========================================

function showScreen(screenName) {
  const screens = ['locked', 'unlocked'];
  screens.forEach(screen => {
    document.getElementById(screen).style.display = 'none';
  });

  if (screenName === 'createVault') {
    document.getElementById('locked').style.display = 'block';
    document.getElementById('masterLogin').style.display = 'none';
    document.getElementById('pinLogin').style.display = 'none';
    document.getElementById('createVault').style.display = 'block';
  } else {
    document.getElementById(screenName).style.display = 'block';
  }
}

function showMasterPasswordLogin() {
  showScreen('locked');
  document.getElementById('masterLogin').style.display = 'block';
  document.getElementById('pinLogin').style.display = 'none';
  document.getElementById('createVault').style.display = 'none';
  elements.masterPassword.focus();
}

function showPinLogin() {
  showScreen('locked');
  document.getElementById('masterLogin').style.display = 'none';
  document.getElementById('pinLogin').style.display = 'block';
  document.getElementById('createVault').style.display = 'none';
  elements.pinPassword.focus();
}

// ========================================
// Authentication Handlers
// ========================================

async function handleMasterPasswordUnlock() {
  const password = elements.masterPassword.value.trim();
  if (!password) {
    showToast('Please enter your master password', 'error');
    return;
  }

  try {
    const unlocked = await loadVault(password);
    if (unlocked) {
      // Generate and store session key
      const hasPIN = await hasPinSetup();
      if (hasPIN) {
        sessionKey = await window.cryptoUtils.generateSessionKey(password, 'session');
        await chrome.storage.session.set({ 
          [SESSION_KEY]: {
            key: sessionKey,
            timestamp: Date.now(),
            hasPin: true
          }
        });
      }

      await showUnlockedState();
      elements.masterPassword.value = '';
      showToast('Vault unlocked successfully', 'success');
    } else {
      showToast('Incorrect master password', 'error');
      elements.masterPassword.value = '';
      elements.masterPassword.focus();
    }
  } catch (error) {
    console.error('Unlock failed:', error);
    showToast('Failed to unlock vault', 'error');
  }
}

async function handlePinUnlock() {
  const pin = elements.pinPassword.value.trim();
  if (!pin) {
    showToast('Please enter your PIN', 'error');
    return;
  }

  try {
    const sessionData = await chrome.storage.session.get(SESSION_KEY);
    const pinData = await chrome.storage.local.get(PIN_KEY);

    if (!sessionData[SESSION_KEY] || !pinData[PIN_KEY]) {
      showToast('Session expired. Please use master password.', 'error');
      showMasterPasswordLogin();
      return;
    }

    // For PIN unlock, we need the master password from session
    // This is a simplified approach - in production, you'd want more secure session management
    const isValidPin = await verifyPinWithSession(pin);

    if (isValidPin) {
      await loadVaultFromSession();
      await showUnlockedState();
      elements.pinPassword.value = '';
      showToast('Quick unlock successful', 'success');
    } else {
      showToast('Incorrect PIN', 'error');
      elements.pinPassword.value = '';
      elements.pinPassword.focus();
    }
  } catch (error) {
    console.error('PIN unlock failed:', error);
    showToast('PIN unlock failed', 'error');
    showMasterPasswordLogin();
  }
}

async function handleCreateVault() {
  const password = elements.newMasterPassword.value.trim();
  const confirmPassword = elements.confirmMasterPassword.value.trim();
  const pin = elements.setupPin.value.trim();

  // Validation
  if (!password) {
    showToast('Please enter a master password', 'error');
    return;
  }

  if (password !== confirmPassword) {
    showToast('Passwords do not match', 'error');
    return;
  }

  if (password.length < 8) {
    showToast('Master password must be at least 8 characters', 'error');
    return;
  }

  if (pin && (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin))) {
    showToast('PIN must be 4-6 digits', 'error');
    return;
  }

  try {
    // Create new vault
    masterKey = password;
    vault = [];

    // Encrypt and save vault
    await saveVault();

    // Setup PIN if provided
    if (pin) {
      const encryptedPin = await window.cryptoUtils.encryptPin(pin, password);
      await chrome.storage.local.set({ [PIN_KEY]: encryptedPin });
    }

    await showUnlockedState();
    showToast('Vault created successfully!', 'success');

    // Clear form
    elements.newMasterPassword.value = '';
    elements.confirmMasterPassword.value = '';
    elements.setupPin.value = '';

  } catch (error) {
    console.error('Vault creation failed:', error);
    showToast('Failed to create vault', 'error');
  }
}

function handleLockVault() {
  lockVault();
  showToast('Vault locked', 'success');
}

// ========================================
// Vault Management
// ========================================

async function loadVault(password) {
  try {
    const result = await chrome.storage.local.get(VAULT_KEY);
    const encryptedVault = result[VAULT_KEY];

    if (!encryptedVault) {
      return false;
    }

    vault = await window.cryptoUtils.decryptVault(password, encryptedVault);
    masterKey = password;

    return true;
  } catch (error) {
    console.error('Failed to load vault:', error);
    return false;
  }
}

async function saveVault() {
  if (!masterKey || !vault) {
    throw new Error('No vault data to save');
  }

  try {
    const encrypted = await window.cryptoUtils.encryptVault(masterKey, vault);
    await chrome.storage.local.set({ [VAULT_KEY]: encrypted });
  } catch (error) {
    console.error('Failed to save vault:', error);
    throw error;
  }
}

function lockVault() {
  // Clear sensitive data
  window.cryptoUtils.secureClear(masterKey);
  window.cryptoUtils.secureClear(sessionKey);

  vault = null;
  masterKey = null;
  sessionKey = null;

  // Clear session storage
  chrome.storage.session.clear();

  // Clear lock timer
  if (lockTimer) {
    clearTimeout(lockTimer);
    lockTimer = null;
  }

  // Show locked screen
  const hasPin = hasPinSetup();
  if (hasPin) {
    showPinLogin();
  } else {
    showMasterPasswordLogin();
  }
}

// ========================================
// URL Detection and Matching
// ========================================

async function getCurrentTabUrl() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0]) {
      currentTabUrl = tabs[0].url;
      const domain = extractDomain(currentTabUrl);
      if (elements.currentSite) {
        elements.currentSite.textContent = domain || 'Unknown site';
      }
    }
  } catch (error) {
    console.error('Failed to get current tab URL:', error);
  }
}

function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return null;
  }
}

function matchesCurrentSite(entry) {
  if (!currentTabUrl || !entry.url) return false;

  const currentDomain = extractDomain(currentTabUrl);
  const entryDomain = extractDomain(entry.url);

  if (!currentDomain || !entryDomain) return false;

  // Exact match or subdomain match
  return currentDomain === entryDomain || 
         currentDomain.endsWith('.' + entryDomain) || 
         entryDomain.endsWith('.' + currentDomain);
}

// ========================================
// Entry Management
// ========================================

async function showUnlockedState() {
  showScreen('unlocked');
  await getCurrentTabUrl();
  await renderEntries();
  resetLockTimer();
}

async function renderEntries() {
  if (!vault) return;

  // Filter entries based on search
  const searchTerm = elements.searchEntries.value.toLowerCase();
  const filteredEntries = vault.filter(entry => 
    entry.name.toLowerCase().includes(searchTerm) ||
    entry.username.toLowerCase().includes(searchTerm) ||
    entry.url.toLowerCase().includes(searchTerm)
  );

  // Separate current site matches
  const currentSiteMatches = filteredEntries.filter(matchesCurrentSite);
  const otherEntries = filteredEntries.filter(entry => !matchesCurrentSite(entry));

  // Render current site section
  if (currentSiteMatches.length > 0) {
    elements.currentSiteSection.style.display = 'block';
    renderEntriesInContainer(currentSiteMatches, elements.currentSiteEntries);
  } else {
    elements.currentSiteSection.style.display = 'none';
  }

  // Render all entries
  if (otherEntries.length > 0 || currentSiteMatches.length === 0) {
    renderEntriesInContainer(filteredEntries, elements.entries);
  } else {
    renderEntriesInContainer(otherEntries, elements.entries);
  }
}

function renderEntriesInContainer(entries, container) {
  container.innerHTML = '';

  if (entries.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <p>No passwords found</p>
      <button class="btn btn-primary" onclick="showEntryModal()">Add Your First Password</button>
    `;
    container.appendChild(emptyState);
    return;
  }

  entries.forEach((entry, index) => {
    const entryDiv = document.createElement('div');
    entryDiv.className = 'entry';

    const actualIndex = vault.indexOf(entry);

    entryDiv.innerHTML = `
      <div class="entry-header">
        <div class="entry-info">
          <h4>${escapeHtml(entry.name)}</h4>
          <p>${escapeHtml(entry.username)}</p>
          ${entry.url ? `<a href="${escapeHtml(entry.url)}" class="entry-url" target="_blank" rel="noopener">${escapeHtml(entry.url)}</a>` : ''}
        </div>
        <div class="entry-actions">
          <button class="btn btn-secondary" onclick="copyEntry(${actualIndex})" title="Copy password">📋</button>
          <button class="btn btn-primary" onclick="fillEntry(${actualIndex})" title="Fill form">🖊️</button>
          <button class="btn btn-outline" onclick="showEntryModal(${actualIndex})" title="Edit">✏️</button>
        </div>
      </div>
    `;

    container.appendChild(entryDiv);
  });
}

// ========================================
// Entry Actions
// ========================================

async function copyEntry(index) {
  if (!vault[index]) return;

  try {
    await navigator.clipboard.writeText(vault[index].password);
    showToast('Password copied to clipboard', 'success');

    // Clear clipboard after 30 seconds
    setTimeout(async () => {
      try {
        await navigator.clipboard.writeText('');
      } catch (error) {
        // Ignore errors when clearing clipboard
      }
    }, 30000);
  } catch (error) {
    console.error('Failed to copy password:', error);
    showToast('Failed to copy password', 'error');
  }
}

async function fillEntry(index) {
  if (!vault[index] || !settings.autoFillEnabled) return;

  const entry = vault[index];

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]) {
      showToast('No active tab found', 'error');
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: fillFormFields,
      args: [entry]
    });

    showToast('Credentials filled successfully', 'success');
  } catch (error) {
    console.error('Failed to fill form:', error);
    showToast('Failed to fill form', 'error');
  }
}

// This function runs in the page context
function fillFormFields(entry) {
  // Find password field
  const passwordFields = document.querySelectorAll('input[type="password"]');

  // Find username field (email, text, or tel)
  const usernameFields = document.querySelectorAll('input[type="email"], input[type="text"], input[type="tel"]');

  // Fill password
  if (passwordFields.length > 0) {
    const passwordField = passwordFields[0];
    passwordField.value = entry.password;
    passwordField.dispatchEvent(new Event('input', { bubbles: true }));
    passwordField.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Fill username
  if (usernameFields.length > 0 && entry.username) {
    // Try to find the best username field
    let usernameField = null;

    // Look for email field first
    const emailField = document.querySelector('input[type="email"]');
    if (emailField) {
      usernameField = emailField;
    } else {
      // Look for fields with common names/ids
      const commonSelectors = [
        'input[name*="user"]', 'input[name*="email"]', 'input[name*="login"]',
        'input[id*="user"]', 'input[id*="email"]', 'input[id*="login"]',
        'input[placeholder*="user"]', 'input[placeholder*="email"]'
      ];

      for (const selector of commonSelectors) {
        usernameField = document.querySelector(selector);
        if (usernameField) break;
      }

      // Fallback to first text field
      if (!usernameField && usernameFields.length > 0) {
        usernameField = usernameFields[0];
      }
    }

    if (usernameField) {
      usernameField.value = entry.username;
      usernameField.dispatchEvent(new Event('input', { bubbles: true }));
      usernameField.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
}

// ========================================
// Entry Modal Management
// ========================================

function showEntryModal(index = null) {
  const isEdit = index !== null;
  const modalTitle = document.getElementById('modalTitle');
  const deleteBtn = document.getElementById('deleteBtn');

  modalTitle.textContent = isEdit ? 'Edit Entry' : 'Add New Entry';
  deleteBtn.style.display = isEdit ? 'inline-flex' : 'none';

  if (isEdit && vault[index]) {
    const entry = vault[index];
    elements.entryName.value = entry.name || '';
    elements.entryUrl.value = entry.url || '';
    elements.entryUser.value = entry.username || '';
    elements.entryPass.value = entry.password || '';
    elements.entryNotes.value = entry.notes || '';
  } else {
    // Clear form for new entry
    elements.entryName.value = '';
    elements.entryUrl.value = currentTabUrl || '';
    elements.entryUser.value = '';
    elements.entryPass.value = '';
    elements.entryNotes.value = '';
  }

  // Store current editing index
  elements.entryModal.dataset.editIndex = index;
  elements.entryModal.style.display = 'flex';
  elements.entryName.focus();
  updateEntryPasswordStrength();
}

function hideEntryModal() {
  elements.entryModal.style.display = 'none';
  delete elements.entryModal.dataset.editIndex;
}

async function handleSaveEntry() {
  const name = elements.entryName.value.trim();
  const url = elements.entryUrl.value.trim();
  const username = elements.entryUser.value.trim();
  const password = elements.entryPass.value.trim();
  const notes = elements.entryNotes.value.trim();

  if (!name) {
    showToast('Please enter a name for this entry', 'error');
    return;
  }

  if (!username && !password) {
    showToast('Please enter at least a username or password', 'error');
    return;
  }

  try {
    const entry = {
      name,
      url,
      username,
      password,
      notes,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const editIndex = elements.entryModal.dataset.editIndex;
    if (editIndex !== 'null' && editIndex !== undefined) {
      // Edit existing entry
      entry.createdAt = vault[parseInt(editIndex)].createdAt;
      vault[parseInt(editIndex)] = entry;
      showToast('Entry updated successfully', 'success');
    } else {
      // Add new entry
      vault.push(entry);
      showToast('Entry added successfully', 'success');
    }

    await saveVault();
    await renderEntries();
    hideEntryModal();

  } catch (error) {
    console.error('Failed to save entry:', error);
    showToast('Failed to save entry', 'error');
  }
}

async function handleDeleteEntry() {
  const editIndex = parseInt(elements.entryModal.dataset.editIndex);

  if (editIndex < 0 || editIndex >= vault.length) return;

  if (confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
    try {
      vault.splice(editIndex, 1);
      await saveVault();
      await renderEntries();
      hideEntryModal();
      showToast('Entry deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete entry:', error);
      showToast('Failed to delete entry', 'error');
    }
  }
}

// ========================================
// Utility Functions
// ========================================

function generatePassword() {
  const options = {
    includeLowercase: true,
    includeUppercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeSimilar: true,
    excludeAmbiguous: true
  };

  const password = window.cryptoUtils.generateSecurePassword(16, options);
  elements.entryPass.value = password;
  updateEntryPasswordStrength();
  showToast('Secure password generated', 'success');
}

function showPasswordGenerator() {
  // Simple password generation - could be expanded to a full modal
  const password = window.cryptoUtils.generateSecurePassword(16);
  navigator.clipboard.writeText(password);
  showToast('Random password generated and copied to clipboard', 'success');
}

async function detectCurrentUrl() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      elements.entryUrl.value = tabs[0].url;
      showToast('Current tab URL detected', 'success');
    }
  } catch (error) {
    console.error('Failed to detect URL:', error);
    showToast('Failed to detect current URL', 'error');
  }
}

function togglePasswordVisibility(fieldId) {
  const field = document.getElementById(fieldId);
  const button = document.getElementById('toggle' + fieldId.charAt(0).toUpperCase() + fieldId.slice(1));

  if (field.type === 'password') {
    field.type = 'text';
    button.textContent = '🙈';
  } else {
    field.type = 'password';
    button.textContent = '👁️';
  }
}

function updatePasswordStrength() {
  const password = elements.newMasterPassword.value;
  const strengthElement = document.getElementById('passwordStrength');

  if (!strengthElement) return;

  const strength = window.cryptoUtils.calculatePasswordStrength(password);

  strengthElement.textContent = strength.feedback;
  strengthElement.className = `password-strength ${strength.level}`;

  // Add visual strength bar
  let strengthBar = strengthElement.querySelector('.strength-bar');
  if (!strengthBar) {
    strengthBar = document.createElement('div');
    strengthBar.className = 'strength-bar';
    strengthBar.innerHTML = '<div class="strength-fill"></div>';
    strengthElement.appendChild(strengthBar);
  }

  const strengthFill = strengthBar.querySelector('.strength-fill');
  strengthFill.className = `strength-fill ${strength.level}`;
}

function updateEntryPasswordStrength() {
  if (!settings.showPasswordStrength) return;

  const password = elements.entryPass.value;
  let strengthElement = document.getElementById('entryPasswordStrength');

  if (!strengthElement) {
    strengthElement = document.createElement('div');
    strengthElement.id = 'entryPasswordStrength';
    strengthElement.className = 'password-strength';
    elements.entryPass.parentNode.appendChild(strengthElement);
  }

  if (password) {
    const strength = window.cryptoUtils.calculatePasswordStrength(password);
    strengthElement.textContent = strength.feedback;
    strengthElement.className = `password-strength ${strength.level}`;
  } else {
    strengthElement.textContent = '';
    strengthElement.className = 'password-strength';
  }
}

function handleSearch() {
  renderEntries();
}

// ========================================
// Session Management
// ========================================

async function checkActiveSession() {
  try {
    const result = await chrome.storage.session.get(SESSION_KEY);
    const sessionData = result[SESSION_KEY];

    if (!sessionData) return false;

    // Check if session is still valid (not expired)
    const maxAge = 8 * 60 * 60 * 1000; // 8 hours
    const isExpired = Date.now() - sessionData.timestamp > maxAge;

    if (isExpired) {
      await chrome.storage.session.clear();
      return false;
    }

    sessionKey = sessionData.key;
    return true;
  } catch (error) {
    console.error('Failed to check session:', error);
    return false;
  }
}

async function hasExistingVault() {
  try {
    const result = await chrome.storage.local.get(VAULT_KEY);
    return !!result[VAULT_KEY];
  } catch (error) {
    return false;
  }
}

async function hasPinSetup() {
  try {
    const result = await chrome.storage.local.get(PIN_KEY);
    return !!result[PIN_KEY];
  } catch (error) {
    return false;
  }
}

async function hasValidSession() {
  return await checkActiveSession();
}

async function loadVaultWithSession() {
  // This would load vault using session key
  // Implementation depends on your session key strategy
  try {
    // For now, redirect to appropriate login
    if (await hasPinSetup()) {
      showPinLogin();
    } else {
      showMasterPasswordLogin();
    }
  } catch (error) {
    showMasterPasswordLogin();
  }
}

async function loadVaultFromSession() {
  // Load vault using session - simplified implementation
  // In production, you'd want more secure session management
  showMasterPasswordLogin();
}

async function verifyPinWithSession(pin) {
  try {
    const pinData = await chrome.storage.local.get(PIN_KEY);
    if (!pinData[PIN_KEY] || !masterKey) return false;

    return await window.cryptoUtils.verifyPin(pin, pinData[PIN_KEY], masterKey);
  } catch (error) {
    return false;
  }
}

// ========================================
// Settings Management
// ========================================

async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    if (result[SETTINGS_KEY]) {
      settings = { ...settings, ...result[SETTINGS_KEY] };
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

async function saveSettings() {
  try {
    await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

function showSettingsModal() {
  document.getElementById('lockTimeout').value = settings.lockTimeout;
  document.getElementById('autoFillEnabled').checked = settings.autoFillEnabled;
  document.getElementById('showPasswordStrength').checked = settings.showPasswordStrength;

  elements.settingsModal.style.display = 'flex';
}

function hideSettingsModal() {
  elements.settingsModal.style.display = 'none';
}

async function handleSaveSettings() {
  settings.lockTimeout = parseInt(document.getElementById('lockTimeout').value);
  settings.autoFillEnabled = document.getElementById('autoFillEnabled').checked;
  settings.showPasswordStrength = document.getElementById('showPasswordStrength').checked;

  await saveSettings();
  resetLockTimer();
  hideSettingsModal();
  showToast('Settings saved', 'success');
}

async function handleChangePin() {
  const newPin = document.getElementById('newPin').value.trim();

  if (!newPin) {
    showToast('Please enter a new PIN', 'error');
    return;
  }

  if (newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
    showToast('PIN must be 4-6 digits', 'error');
    return;
  }

  if (!masterKey) {
    showToast('Session expired. Please unlock vault first.', 'error');
    return;
  }

  try {
    const encryptedPin = await window.cryptoUtils.encryptPin(newPin, masterKey);
    await chrome.storage.local.set({ [PIN_KEY]: encryptedPin });

    document.getElementById('newPin').value = '';
    showToast('PIN changed successfully', 'success');
  } catch (error) {
    console.error('Failed to change PIN:', error);
    showToast('Failed to change PIN', 'error');
  }
}

// ========================================
// Timer Management
// ========================================

function resetLockTimer() {
  if (!vault || settings.lockTimeout === 0) return;

  if (lockTimer) {
    clearTimeout(lockTimer);
  }

  lockTimer = setTimeout(() => {
    lockVault();
    showToast('Vault auto-locked due to inactivity', 'warning');
  }, settings.lockTimeout * 1000);
}

// ========================================
// Export/Import
// ========================================

async function handleExportVault() {
  if (!vault) return;

  try {
    const result = await chrome.storage.local.get(VAULT_KEY);
    const encryptedVault = result[VAULT_KEY];

    if (!encryptedVault) {
      showToast('No vault to export', 'error');
      return;
    }

    const exportData = {
      version: 2,
      vault: encryptedVault,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `securevault-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
    showToast('Vault exported successfully', 'success');
  } catch (error) {
    console.error('Export failed:', error);
    showToast('Failed to export vault', 'error');
  }
}

// ========================================
// Toast Notifications
// ========================================

function showToast(message, type = 'info') {
  const toast = elements.toast;
  const toastMessage = elements.toastMessage;

  toastMessage.textContent = message;
  toast.className = `toast ${type}`;
  toast.style.display = 'flex';

  // Auto-hide after 4 seconds
  setTimeout(hideToast, 4000);
}

function hideToast() {
  elements.toast.style.display = 'none';
}

// ========================================
// Utility Functions
// ========================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========================================
// Global Functions (for onclick handlers)
// ========================================

window.copyEntry = copyEntry;
window.fillEntry = fillEntry;
window.showEntryModal = showEntryModal;

// ========================================
// Service Worker Communication
// ========================================

// Listen for messages from service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'urlChanged') {
    getCurrentTabUrl();
    if (vault) {
      renderEntries();
    }
  }
});