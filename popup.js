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

// Toggle transcript wrapper visibility
async function toggleTranscript() {
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

    // Send message to content script to toggle transcript
    let response;
    try {
      response = await chrome.tabs.sendMessage(tab.id, { action: 'toggleTranscript' });
    } catch (error) {
      // If connection fails, the content script might not be loaded
      // Try to inject it manually
      if (error.message && error.message.includes('Could not establish connection')) {
        try {
          // Inject content script if not already loaded
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          // Wait a moment for the script to initialize
          await new Promise(resolve => setTimeout(resolve, 150));
          // Try sending message again
          response = await chrome.tabs.sendMessage(tab.id, { action: 'toggleTranscript' });
        } catch (retryError) {
          console.error('Retry failed:', retryError);
          showStatus('Error: Please refresh the page and try again', 'error');
          return;
        }
      } else {
        throw error;
      }
    }
    
    if (response && response.success) {
      const status = response.visible ? 'Transcript shown!' : 'Transcript hidden!';
      showStatus(status, 'success');
    } else if (response && response.error) {
      showStatus(response.error, 'error');
    } else {
      showStatus('Transcript wrapper not found on this page', 'error');
    }
  } catch (error) {
    console.error('Error toggling transcript:', error);
    if (error.message && error.message.includes('Could not establish connection')) {
      showStatus('Error: Please refresh the page and try again', 'error');
    } else {
      showStatus('Error: ' + error.message, 'error');
    }
  }
}

// Update UI based on current tab
async function updateUI() {
  const tab = await getCurrentTab();
  const goFullScreenBtn = document.getElementById('goFullScreen');
  const goNormalBtn = document.getElementById('goNormal');
  const toggleTranscriptBtn = document.getElementById('toggleTranscript');
  
  if (!isAllowedDomain(tab.url)) {
    goFullScreenBtn.disabled = true;
    goNormalBtn.disabled = true;
    toggleTranscriptBtn.disabled = true;
    showStatus('This extension only works on futurense.zoom.us', 'error');
  } else {
    goFullScreenBtn.disabled = false;
    goNormalBtn.disabled = false;
    toggleTranscriptBtn.disabled = false;
  }
}

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
  updateUI();
  document.getElementById('goFullScreen').addEventListener('click', injectCSS);
  document.getElementById('goNormal').addEventListener('click', removeCSS);
  document.getElementById('toggleTranscript').addEventListener('click', toggleTranscript);
});

