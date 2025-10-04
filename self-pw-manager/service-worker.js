// ========================================
// SecureVault Service Worker
// Background script for session management and security
// ========================================

// Constants
const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours
const SECURITY_CHECK_INTERVAL = 60 * 1000; // 1 minute

// Storage keys
const SESSION_KEY = 'session_data_v2';
const LAST_ACTIVITY_KEY = 'last_activity_v2';

// Session management state
let sessionTimer = null;
let securityTimer = null;
let lastKnownTabId = null;

// ========================================
// Extension Lifecycle
// ========================================

chrome.runtime.onInstalled.addListener((details) => {
  console.log('SecureVault installed/updated:', details.reason);

  // Initialize extension
  initializeExtension();

  // Set up context menu (optional)
  createContextMenus();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('SecureVault starting up');
  initializeExtension();
});

// ========================================
// Initialization
// ========================================

async function initializeExtension() {
  try {
    // Clear any expired sessions
    await cleanupExpiredSessions();

    // Start security monitoring
    startSecurityMonitoring();

    // Setup tab listeners
    setupTabListeners();

    console.log('SecureVault service worker initialized');
  } catch (error) {
    console.error('Failed to initialize service worker:', error);
  }
}

// ========================================
// Session Management
// ========================================

async function cleanupExpiredSessions() {
  try {
    const result = await chrome.storage.session.get([SESSION_KEY, LAST_ACTIVITY_KEY]);
    const sessionData = result[SESSION_KEY];
    const lastActivity = result[LAST_ACTIVITY_KEY] || 0;

    if (sessionData && Date.now() - sessionData.timestamp > SESSION_TIMEOUT) {
      // Session expired, clear it
      await chrome.storage.session.clear();
      console.log('Expired session cleared');
    }

    // Clean up old activity data
    if (Date.now() - lastActivity > SESSION_TIMEOUT) {
      await chrome.storage.session.remove(LAST_ACTIVITY_KEY);
    }
  } catch (error) {
    console.error('Failed to cleanup sessions:', error);
  }
}

async function updateLastActivity() {
  try {
    await chrome.storage.session.set({
      [LAST_ACTIVITY_KEY]: Date.now()
    });
  } catch (error) {
    console.error('Failed to update activity:', error);
  }
}

// ========================================
// Security Monitoring
// ========================================

function startSecurityMonitoring() {
  // Run security checks periodically
  if (securityTimer) {
    clearInterval(securityTimer);
  }

  securityTimer = setInterval(async () => {
    await performSecurityCheck();
  }, SECURITY_CHECK_INTERVAL);
}

async function performSecurityCheck() {
  try {
    // Check for suspicious activity patterns
    await checkForSuspiciousActivity();

    // Cleanup expired data
    await cleanupExpiredSessions();

    // Monitor memory usage (basic check)
    await checkMemoryUsage();

  } catch (error) {
    console.error('Security check failed:', error);
  }
}

async function checkForSuspiciousActivity() {
  // Basic security checks - could be expanded
  try {
    const result = await chrome.storage.session.get([LAST_ACTIVITY_KEY]);
    const lastActivity = result[LAST_ACTIVITY_KEY] || 0;

    // If no activity for too long, clear session
    if (Date.now() - lastActivity > SESSION_TIMEOUT) {
      await chrome.storage.session.clear();
    }
  } catch (error) {
    console.error('Suspicious activity check failed:', error);
  }
}

async function checkMemoryUsage() {
  // Basic memory check - Chrome extensions have memory limits
  try {
    const info = await chrome.system.memory.getInfo();
    if (info.availableCapacity < 50 * 1024 * 1024) { // Less than 50MB available
      console.warn('Low memory detected, clearing unnecessary data');
      await cleanupExpiredSessions();
    }
  } catch (error) {
    // Memory API might not be available, ignore
  }
}

// ========================================
// Tab Management
// ========================================

function setupTabListeners() {
  // Listen for tab updates to detect URL changes
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.url) {
      // URL changed, notify popup if it's open
      try {
        await chrome.runtime.sendMessage({
          type: 'urlChanged',
          url: changeInfo.url,
          tabId: tabId
        });
      } catch (error) {
        // Popup might not be open, that's fine
      }

      // Update activity timestamp
      await updateLastActivity();
    }
  });

  // Listen for tab activation
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    lastKnownTabId = activeInfo.tabId;
    await updateLastActivity();
  });

  // Listen for window focus changes
  chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId !== chrome.windows.WINDOW_ID_NONE) {
      await updateLastActivity();
    }
  });
}

// ========================================
// Context Menus (Optional)
// ========================================

function createContextMenus() {
  // Remove existing context menus
  chrome.contextMenus.removeAll();

  // Add context menu for password fields
  chrome.contextMenus.create({
    id: 'fill-password',
    title: 'Fill with SecureVault',
    contexts: ['editable'],
    documentUrlPatterns: ['http://*/*', 'https://*/*']
  });

  // Handle context menu clicks
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'fill-password') {
      try {
        // Try to communicate with popup to fill password
        await chrome.runtime.sendMessage({
          type: 'contextMenuFill',
          frameId: info.frameId,
          tabId: tab.id
        });
      } catch (error) {
        // Show notification if popup is not open
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon-48.png',
          title: 'SecureVault',
          message: 'Please open SecureVault to fill passwords'
        });
      }
    }
  });
}

// ========================================
// Message Handling
// ========================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'updateActivity':
      updateLastActivity();
      sendResponse({ success: true });
      break;

    case 'clearSession':
      clearCurrentSession();
      sendResponse({ success: true });
      break;

    case 'getTabInfo':
      getCurrentTabInfo().then(sendResponse);
      return true; // Will respond asynchronously

    case 'securityEvent':
      handleSecurityEvent(message.data);
      sendResponse({ success: true });
      break;

    default:
      console.log('Unknown message type:', message.type);
      sendResponse({ error: 'Unknown message type' });
  }
});

// ========================================
// Security Event Handling
// ========================================

async function handleSecurityEvent(eventData) {
  try {
    console.log('Security event:', eventData);

    // Log security events (in production, you might want to be more selective)
    const securityLog = {
      timestamp: Date.now(),
      event: eventData,
      tabId: lastKnownTabId
    };

    // Store recent security events (keep only last 10)
    const result = await chrome.storage.local.get('security_log');
    const logs = result.security_log || [];
    logs.push(securityLog);

    // Keep only recent logs
    const recentLogs = logs.slice(-10);
    await chrome.storage.local.set({ security_log: recentLogs });

    // Handle specific security events
    switch (eventData.type) {
      case 'failed_unlock':
        await handleFailedUnlock(eventData);
        break;

      case 'suspicious_activity':
        await handleSuspiciousActivity(eventData);
        break;

      case 'session_hijack_attempt':
        await handleSessionHijackAttempt(eventData);
        break;
    }
  } catch (error) {
    console.error('Failed to handle security event:', error);
  }
}

async function handleFailedUnlock(eventData) {
  // Count failed attempts
  const result = await chrome.storage.session.get('failed_attempts');
  const failedAttempts = (result.failed_attempts || 0) + 1;

  await chrome.storage.session.set({ failed_attempts: failedAttempts });

  // Lock out after too many failed attempts
  if (failedAttempts >= 5) {
    await chrome.storage.session.clear();

    // Show warning notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-48.png',
      title: 'SecureVault Security Warning',
      message: 'Too many failed unlock attempts. Session cleared for security.'
    });
  }
}

async function handleSuspiciousActivity(eventData) {
  // Clear session immediately
  await chrome.storage.session.clear();

  // Show security notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-48.png',
    title: 'SecureVault Security Alert',
    message: 'Suspicious activity detected. Session cleared for security.'
  });
}

async function handleSessionHijackAttempt(eventData) {
  // Immediately clear all data and lock down
  await chrome.storage.session.clear();

  // Show critical security notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-48.png',
    title: 'SecureVault Critical Security Alert',
    message: 'Potential session hijack detected. All sessions cleared.'
  });
}

// ========================================
// Utility Functions
// ========================================

async function clearCurrentSession() {
  try {
    await chrome.storage.session.clear();
    console.log('Session cleared by request');
  } catch (error) {
    console.error('Failed to clear session:', error);
  }
}

async function getCurrentTabInfo() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
  } catch (error) {
    console.error('Failed to get current tab:', error);
    return null;
  }
}

// ========================================
// Alarm Management (for periodic tasks)
// ========================================

// Create alarms for periodic tasks
chrome.alarms.onAlarm.addListener(async (alarm) => {
  switch (alarm.name) {
    case 'security_check':
      await performSecurityCheck();
      break;

    case 'session_cleanup':
      await cleanupExpiredSessions();
      break;

    case 'memory_cleanup':
      await performMemoryCleanup();
      break;
  }
});

// Set up periodic alarms
chrome.alarms.create('security_check', { periodInMinutes: 1 });
chrome.alarms.create('session_cleanup', { periodInMinutes: 15 });
chrome.alarms.create('memory_cleanup', { periodInMinutes: 30 });

async function performMemoryCleanup() {
  try {
    // Clear expired session data
    await cleanupExpiredSessions();

    // Clear old security logs
    const result = await chrome.storage.local.get('security_log');
    if (result.security_log && result.security_log.length > 20) {
      const recentLogs = result.security_log.slice(-10);
      await chrome.storage.local.set({ security_log: recentLogs });
    }

    console.log('Memory cleanup completed');
  } catch (error) {
    console.error('Memory cleanup failed:', error);
  }
}

// ========================================
// Extension Lifecycle Cleanup
// ========================================

// Cleanup when extension is disabled or unloaded
self.addEventListener('beforeunload', () => {
  if (sessionTimer) {
    clearTimeout(sessionTimer);
  }

  if (securityTimer) {
    clearInterval(securityTimer);
  }
});

// ========================================
// Error Handling
// ========================================

self.addEventListener('error', (event) => {
  console.error('Service worker error:', event.error);

  // Report error to security log
  chrome.storage.local.get('security_log').then((result) => {
    const logs = result.security_log || [];
    logs.push({
      timestamp: Date.now(),
      event: {
        type: 'service_worker_error',
        error: event.error.message,
        stack: event.error.stack
      }
    });

    // Keep only recent logs
    const recentLogs = logs.slice(-10);
    chrome.storage.local.set({ security_log: recentLogs });
  });
});

// ========================================
// Debug and Development
// ========================================

// Only in development - remove for production
if (chrome.runtime.getManifest().version.includes('dev')) {
  console.log('SecureVault service worker running in development mode');

  // Add development-specific listeners or debugging
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'debug') {
      console.log('Debug message:', message.data);
      sendResponse({ status: 'logged' });
    }
  });
}

console.log('SecureVault service worker loaded successfully');