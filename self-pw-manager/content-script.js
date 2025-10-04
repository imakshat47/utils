// ========================================
// SecureVault Content Script
// Enhanced form detection and auto-fill functionality
// ========================================

// Configuration
const SECUREVAULT_CONFIG = {
  detectDelay: 500, // ms to wait before detecting forms
  fillDelay: 100,   // ms delay between field fills
  maxRetries: 3,    // max attempts to find fields
  debug: false      // enable debug logging
};

// State tracking
let formFields = {
  username: null,
  password: null,
  email: null
};

let isInjected = false;
let mutationObserver = null;
let lastUrl = window.location.href;

// ========================================
// Initialization
// ========================================

function initializeContentScript() {
  if (isInjected) return;

  try {
    // Mark as injected
    isInjected = true;

    // Initial form detection
    detectForms();

    // Set up mutation observer for dynamic content
    setupMutationObserver();

    // Listen for URL changes
    setupUrlChangeListener();

    // Setup message listener
    setupMessageListener();

    // Add visual indicators (optional)
    addVisualIndicators();

    debugLog('SecureVault content script initialized');
  } catch (error) {
    console.error('SecureVault content script initialization failed:', error);
  }
}

// ========================================
// Form Detection
// ========================================

function detectForms() {
  try {
    // Reset form fields
    formFields = {
      username: null,
      password: null,
      email: null
    };

    // Detect password fields first (most reliable)
    const passwordFields = findPasswordFields();

    // Detect username/email fields
    const usernameFields = findUsernameFields();

    // Store the best matches
    if (passwordFields.length > 0) {
      formFields.password = passwordFields[0];
      debugLog('Password field detected:', formFields.password);
    }

    if (usernameFields.length > 0) {
      formFields.username = usernameFields[0];
      if (formFields.username.type === 'email') {
        formFields.email = formFields.username;
      }
      debugLog('Username field detected:', formFields.username);
    }

    // Mark fields as SecureVault-compatible
    markCompatibleFields();

    return {
      hasLoginForm: !!(formFields.username && formFields.password),
      hasPasswordField: !!formFields.password,
      hasUsernameField: !!formFields.username
    };

  } catch (error) {
    console.error('Form detection failed:', error);
    return { hasLoginForm: false, hasPasswordField: false, hasUsernameField: false };
  }
}

function findPasswordFields() {
  const selectors = [
    'input[type="password"]:not([disabled]):not([readonly])',
    'input[autocomplete*="current-password"]',
    'input[autocomplete*="new-password"]'
  ];

  const fields = [];

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      if (isVisibleAndInteractable(el) && !fields.includes(el)) {
        fields.push(el);
      }
    });
  }

  // Sort by relevance (closer to top, larger, more likely to be main password field)
  return fields.sort((a, b) => {
    const aRect = a.getBoundingClientRect();
    const bRect = b.getBoundingClientRect();

    // Prefer fields closer to the top
    return aRect.top - bRect.top;
  });
}

function findUsernameFields() {
  const selectors = [
    // Email fields (highest priority)
    'input[type="email"]:not([disabled]):not([readonly])',
    'input[autocomplete="email"]',
    'input[autocomplete="username"]',

    // Common name/id patterns
    'input[name*="user"]:not([type="password"]):not([disabled]):not([readonly])',
    'input[name*="email"]:not([type="password"]):not([disabled]):not([readonly])',
    'input[name*="login"]:not([type="password"]):not([disabled]):not([readonly])',
    'input[id*="user"]:not([type="password"]):not([disabled]):not([readonly])',
    'input[id*="email"]:not([type="password"]):not([disabled]):not([readonly])',
    'input[id*="login"]:not([type="password"]:not([disabled]):not([readonly])',

    // Text fields with relevant placeholders
    'input[placeholder*="user" i]:not([type="password"]):not([disabled]):not([readonly])',
    'input[placeholder*="email" i]:not([type="password"]):not([disabled]):not([readonly])',
    'input[placeholder*="login" i]:not([type="password"]):not([disabled]):not([readonly])',

    // General text fields (lowest priority)
    'input[type="text"]:not([disabled]):not([readonly])',
    'input[type="tel"]:not([disabled]):not([readonly])'
  ];

  const fields = [];
  const seenFields = new Set();

  for (const selector of selectors) {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (!seenFields.has(el) && isVisibleAndInteractable(el)) {
          // Skip fields that look like search, captcha, or other non-login fields
          if (!isLikelyUsernameField(el)) return;

          fields.push(el);
          seenFields.add(el);
        }
      });
    } catch (error) {
      debugLog('Selector failed:', selector, error);
    }
  }

  // Sort by relevance
  return fields.sort((a, b) => {
    let scoreA = calculateUsernameFieldScore(a);
    let scoreB = calculateUsernameFieldScore(b);

    return scoreB - scoreA; // Higher score first
  });
}

function isLikelyUsernameField(element) {
  const name = (element.name || '').toLowerCase();
  const id = (element.id || '').toLowerCase();
  const placeholder = (element.placeholder || '').toLowerCase();
  const className = (element.className || '').toLowerCase();

  // Skip fields that are clearly not username fields
  const skipPatterns = [
    'search', 'query', 'q', 'captcha', 'code', 'otp', 'token',
    'first', 'last', 'fname', 'lname', 'phone', 'address',
    'city', 'state', 'zip', 'postal', 'country', 'age', 'birth'
  ];

  const fieldText = `${name} ${id} ${placeholder} ${className}`;

  for (const pattern of skipPatterns) {
    if (fieldText.includes(pattern)) {
      return false;
    }
  }

  return true;
}

function calculateUsernameFieldScore(element) {
  let score = 0;

  const name = (element.name || '').toLowerCase();
  const id = (element.id || '').toLowerCase();
  const placeholder = (element.placeholder || '').toLowerCase();
  const type = (element.type || '').toLowerCase();
  const autocomplete = (element.autocomplete || '').toLowerCase();

  // Type-based scoring
  if (type === 'email') score += 10;
  if (type === 'text') score += 5;
  if (type === 'tel') score += 3;

  // Autocomplete attribute scoring
  if (autocomplete.includes('username')) score += 15;
  if (autocomplete.includes('email')) score += 12;

  // Name/ID scoring
  const highValueTerms = ['user', 'email', 'login', 'account'];
  const mediumValueTerms = ['name', 'id', 'uid'];

  const fieldIdentifiers = `${name} ${id}`;

  for (const term of highValueTerms) {
    if (fieldIdentifiers.includes(term)) {
      score += 8;
      break;
    }
  }

  for (const term of mediumValueTerms) {
    if (fieldIdentifiers.includes(term)) {
      score += 4;
      break;
    }
  }

  // Placeholder scoring
  if (placeholder.includes('email')) score += 6;
  if (placeholder.includes('user')) score += 5;
  if (placeholder.includes('login')) score += 5;

  // Position scoring (fields earlier in DOM often more important)
  const allInputs = Array.from(document.querySelectorAll('input'));
  const position = allInputs.indexOf(element);
  if (position !== -1) {
    score += Math.max(0, 20 - position); // Up to 20 points for early position
  }

  return score;
}

function isVisibleAndInteractable(element) {
  if (!element) return false;

  // Check if element is visible
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }

  // Check if element has dimensions
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return false;
  }

  // Check if element is not hidden by parent
  let parent = element.parentElement;
  while (parent) {
    const parentStyle = window.getComputedStyle(parent);
    if (parentStyle.display === 'none' || parentStyle.visibility === 'hidden') {
      return false;
    }
    parent = parent.parentElement;
  }

  return true;
}

// ========================================
// Form Filling
// ========================================

function fillFormWithEntry(entry) {
  return new Promise(async (resolve) => {
    try {
      debugLog('Filling form with entry:', entry.name);

      let filledFields = 0;

      // Fill password field
      if (formFields.password && entry.password) {
        await fillField(formFields.password, entry.password);
        filledFields++;
        debugLog('Password field filled');
      }

      // Fill username field
      if (formFields.username && entry.username) {
        await fillField(formFields.username, entry.username);
        filledFields++;
        debugLog('Username field filled');
      }

      // Add visual feedback
      if (filledFields > 0) {
        showFillFeedback(filledFields);
      }

      resolve({
        success: filledFields > 0,
        filledFields: filledFields
      });

    } catch (error) {
      console.error('Form filling failed:', error);
      resolve({ success: false, error: error.message });
    }
  });
}

async function fillField(field, value) {
  if (!field || !value) return false;

  try {
    // Focus the field
    field.focus();

    // Clear existing value
    field.value = '';

    // Set new value
    field.value = value;

    // Trigger events to ensure the website recognizes the input
    const events = [
      new Event('input', { bubbles: true }),
      new Event('change', { bubbles: true }),
      new Event('blur', { bubbles: true })
    ];

    for (const event of events) {
      await new Promise(resolve => {
        setTimeout(() => {
          field.dispatchEvent(event);
          resolve();
        }, SECUREVAULT_CONFIG.fillDelay);
      });
    }

    return true;
  } catch (error) {
    console.error('Field filling failed:', error);
    return false;
  }
}

// ========================================
// Visual Indicators
// ========================================

function addVisualIndicators() {
  // Add subtle visual indicators to compatible fields
  try {
    const style = document.createElement('style');
    style.id = 'securevault-indicators';
    style.textContent = `
      .securevault-compatible {
        box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.3) !important;
        transition: box-shadow 0.2s ease !important;
      }

      .securevault-compatible:hover {
        box-shadow: inset 0 0 0 2px rgba(37, 99, 235, 0.5) !important;
      }

      .securevault-filled {
        box-shadow: inset 0 0 0 2px rgba(34, 197, 94, 0.6) !important;
        background-color: rgba(34, 197, 94, 0.05) !important;
      }

      .securevault-feedback {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #16a34a;
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: securevault-slide-in 0.3s ease-out;
      }

      @keyframes securevault-slide-in {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;

    document.head.appendChild(style);
  } catch (error) {
    debugLog('Failed to add visual indicators:', error);
  }
}

function markCompatibleFields() {
  // Add visual indicators to detected fields
  if (formFields.username) {
    formFields.username.classList.add('securevault-compatible');
  }

  if (formFields.password) {
    formFields.password.classList.add('securevault-compatible');
  }
}

function showFillFeedback(filledCount) {
  // Remove existing feedback
  const existing = document.getElementById('securevault-feedback');
  if (existing) {
    existing.remove();
  }

  // Create feedback element
  const feedback = document.createElement('div');
  feedback.id = 'securevault-feedback';
  feedback.className = 'securevault-feedback';
  feedback.textContent = `✓ ${filledCount} field${filledCount > 1 ? 's' : ''} filled`;

  document.body.appendChild(feedback);

  // Mark filled fields
  if (formFields.username && formFields.username.value) {
    formFields.username.classList.add('securevault-filled');
  }

  if (formFields.password && formFields.password.value) {
    formFields.password.classList.add('securevault-filled');
  }

  // Remove feedback after 3 seconds
  setTimeout(() => {
    if (feedback.parentNode) {
      feedback.remove();
    }
  }, 3000);
}

// ========================================
// Dynamic Content Handling
// ========================================

function setupMutationObserver() {
  // Watch for dynamically added forms
  if (mutationObserver) {
    mutationObserver.disconnect();
  }

  mutationObserver = new MutationObserver((mutations) => {
    let shouldRedetect = false;

    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if added node contains form fields
            if (node.matches && (
                node.matches('input[type="password"], input[type="email"], input[type="text"]') ||
                node.querySelector('input[type="password"], input[type="email"], input[type="text"]')
              )) {
              shouldRedetect = true;
            }
          }
        });
      }
    });

    if (shouldRedetect) {
      debugLog('Dynamic content detected, re-running form detection');
      setTimeout(detectForms, SECUREVAULT_CONFIG.detectDelay);
    }
  });

  // Start observing
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function setupUrlChangeListener() {
  // Listen for URL changes (SPA navigation)
  let currentUrl = window.location.href;

  // Override pushState and replaceState
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function(...args) {
    originalPushState.apply(this, args);
    handleUrlChange();
  };

  history.replaceState = function(...args) {
    originalReplaceState.apply(this, args);
    handleUrlChange();
  };

  // Listen for popstate events
  window.addEventListener('popstate', handleUrlChange);

  function handleUrlChange() {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      debugLog('URL changed, re-detecting forms');
      setTimeout(() => {
        detectForms();
        // Notify extension about URL change
        sendMessageToExtension({
          type: 'urlChanged',
          url: currentUrl
        });
      }, SECUREVAULT_CONFIG.detectDelay);
    }
  }
}

// ========================================
// Message Handling
// ========================================

function setupMessageListener() {
  // Listen for messages from the extension
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    debugLog('Content script received message:', message);

    switch (message.type) {
      case 'detectForms':
        const detection = detectForms();
        sendResponse(detection);
        break;

      case 'fillForm':
        fillFormWithEntry(message.entry).then(sendResponse);
        return true; // Will respond asynchronously

      case 'getPageInfo':
        sendResponse({
          url: window.location.href,
          title: document.title,
          hasLoginForm: !!(formFields.username && formFields.password)
        });
        break;

      case 'clearFeedback':
        clearVisualFeedback();
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  });
}

function sendMessageToExtension(message) {
  try {
    chrome.runtime.sendMessage(message);
  } catch (error) {
    debugLog('Failed to send message to extension:', error);
  }
}

// ========================================
// Cleanup
// ========================================

function clearVisualFeedback() {
  // Remove feedback elements
  const feedback = document.getElementById('securevault-feedback');
  if (feedback) {
    feedback.remove();
  }

  // Remove field classes
  document.querySelectorAll('.securevault-filled').forEach(el => {
    el.classList.remove('securevault-filled');
  });
}

function cleanup() {
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }

  clearVisualFeedback();

  // Remove style element
  const style = document.getElementById('securevault-indicators');
  if (style) {
    style.remove();
  }

  isInjected = false;
}

// ========================================
// Utility Functions
// ========================================

function debugLog(...args) {
  if (SECUREVAULT_CONFIG.debug) {
    console.log('[SecureVault]', ...args);
  }
}

// ========================================
// Page Unload Handling
// ========================================

window.addEventListener('beforeunload', () => {
  cleanup();
});

// ========================================
// Initialize when DOM is ready
// ========================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  // DOM is already loaded
  setTimeout(initializeContentScript, SECUREVAULT_CONFIG.detectDelay);
}

// Also initialize on window load as a fallback
window.addEventListener('load', () => {
  if (!isInjected) {
    setTimeout(initializeContentScript, SECUREVAULT_CONFIG.detectDelay);
  }
});

debugLog('SecureVault content script loaded');