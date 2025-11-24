// Allowed domain
const ALLOWED_DOMAIN = 'https://futurense.zoom.us';

// Get the active tab and inject/remove CSS
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Check if current tab is on the allowed domain
function isAllowedDomain(url) {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    return urlObj.origin === ALLOWED_DOMAIN || urlObj.hostname === 'futurense.zoom.us';
  } catch (e) {
    return false;
  }
}

// Inject CSS for full screen mode
async function injectCSS() {
  try {
    const tab = await getCurrentTab();
    if (!tab.id) {
      showStatus('Error: No active tab found', 'error');
      return;
    }

    if (!isAllowedDomain(tab.url)) {
      showStatus('Error: This extension only works on futurense.zoom.us', 'error');
      return;
    }

    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['vid.css']
    });

    showStatus('Full screen mode activated!', 'success');
  } catch (error) {
    console.error('Error injecting CSS:', error);
    showStatus('Error: ' + error.message, 'error');
  }
}

// Remove CSS to go back to normal
async function removeCSS() {
  try {
    const tab = await getCurrentTab();
    if (!tab.id) {
      showStatus('Error: No active tab found', 'error');
      return;
    }

    if (!isAllowedDomain(tab.url)) {
      showStatus('Error: This extension only works on futurense.zoom.us', 'error');
      return;
    }

    await chrome.scripting.removeCSS({
      target: { tabId: tab.id },
      files: ['vid.css']
    });

    showStatus('Normal mode activated!', 'success');
  } catch (error) {
    console.error('Error removing CSS:', error);
    showStatus('Error: ' + error.message, 'error');
  }
}

// Show status message
function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  
  // Clear status after 2 seconds
  setTimeout(() => {
    statusEl.textContent = '';
    statusEl.className = 'status';
  }, 2000);
}

// Update UI based on current tab
async function updateUI() {
  const tab = await getCurrentTab();
  const goFullScreenBtn = document.getElementById('goFullScreen');
  const goNormalBtn = document.getElementById('goNormal');
  
  if (!isAllowedDomain(tab.url)) {
    goFullScreenBtn.disabled = true;
    goNormalBtn.disabled = true;
    showStatus('This extension only works on futurense.zoom.us', 'error');
  } else {
    goFullScreenBtn.disabled = false;
    goNormalBtn.disabled = false;
  }
}

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
  updateUI();
  document.getElementById('goFullScreen').addEventListener('click', injectCSS);
  document.getElementById('goNormal').addEventListener('click', removeCSS);
});

