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

// Get current transcript state
async function getTranscriptState() {
  try {
    const tab = await getCurrentTab();
    if (!tab.id || !isAllowedDomain(tab.url)) {
      return null;
    }

    let response;
    try {
      response = await chrome.tabs.sendMessage(tab.id, { action: 'getTranscriptState' });
    } catch (error) {
      if (error.message && error.message.includes('Could not establish connection')) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          await new Promise(resolve => setTimeout(resolve, 150));
          response = await chrome.tabs.sendMessage(tab.id, { action: 'getTranscriptState' });
        } catch (retryError) {
          return null;
        }
      } else {
        return null;
      }
    }
    
    return response && response.success ? response.visible : null;
  } catch (error) {
    return null;
  }
}

// Get current pin state
async function getPinState() {
  try {
    const tab = await getCurrentTab();
    if (!tab.id || !isAllowedDomain(tab.url)) {
      return null;
    }

    let response;
    try {
      response = await chrome.tabs.sendMessage(tab.id, { action: 'getPinState' });
    } catch (error) {
      if (error.message && error.message.includes('Could not establish connection')) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          await new Promise(resolve => setTimeout(resolve, 150));
          response = await chrome.tabs.sendMessage(tab.id, { action: 'getPinState' });
        } catch (retryError) {
          return null;
        }
      } else {
        return null;
      }
    }
    
    return response && response.success ? response.pinned : null;
  } catch (error) {
    return null;
  }
}

// Update transcript button and hint based on state
function updateTranscriptUI(isVisible) {
  const toggleTranscriptBtn = document.getElementById('toggleTranscript');
  const btnText = toggleTranscriptBtn.querySelector('.btn-text');
  const transcriptHint = document.getElementById('transcriptHint');
  const pinTranscriptBtn = document.getElementById('pinTranscript');
  const pinBtnText = pinTranscriptBtn.querySelector('.btn-text');
  
  if (isVisible) {
    btnText.textContent = 'Hide Transcript';
    transcriptHint.style.display = 'block';
    pinTranscriptBtn.style.display = 'flex';
  } else {
    btnText.textContent = 'Show Transcript';
    transcriptHint.style.display = 'none';
    pinTranscriptBtn.style.display = 'none';
  }
}

// Update pin button UI
function updatePinUI(isPinned) {
  const pinTranscriptBtn = document.getElementById('pinTranscript');
  const pinBtnText = pinTranscriptBtn.querySelector('.btn-text');
  
  if (isPinned) {
    pinBtnText.textContent = 'Unpin Transcript';
    pinTranscriptBtn.classList.add('btn-pinned');
  } else {
    pinBtnText.textContent = 'Pin Transcript';
    pinTranscriptBtn.classList.remove('btn-pinned');
  }
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
      updateTranscriptUI(response.visible);
      // Update pin state if transcript is visible
      if (response.visible) {
        const pinState = await getPinState();
        if (pinState !== null) {
          updatePinUI(pinState);
        }
      }
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

// Toggle pin transcript
async function togglePinTranscript() {
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

    let response;
    try {
      response = await chrome.tabs.sendMessage(tab.id, { action: 'togglePinTranscript' });
    } catch (error) {
      if (error.message && error.message.includes('Could not establish connection')) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          await new Promise(resolve => setTimeout(resolve, 150));
          response = await chrome.tabs.sendMessage(tab.id, { action: 'togglePinTranscript' });
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
      const status = response.pinned ? 'Transcript pinned!' : 'Transcript unpinned!';
      showStatus(status, 'success');
      updatePinUI(response.pinned);
    } else if (response && response.error) {
      showStatus(response.error, 'error');
    } else {
      showStatus('Transcript wrapper not found on this page', 'error');
    }
  } catch (error) {
    console.error('Error toggling pin:', error);
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
  const pinTranscriptBtn = document.getElementById('pinTranscript');
  
  if (!isAllowedDomain(tab.url)) {
    goFullScreenBtn.disabled = true;
    goNormalBtn.disabled = true;
    toggleTranscriptBtn.disabled = true;
    pinTranscriptBtn.disabled = true;
    showStatus('This extension only works on futurense.zoom.us', 'error');
  } else {
    goFullScreenBtn.disabled = false;
    goNormalBtn.disabled = false;
    toggleTranscriptBtn.disabled = false;
    pinTranscriptBtn.disabled = false;
    // Get and update transcript state
    const transcriptState = await getTranscriptState();
    if (transcriptState !== null) {
      updateTranscriptUI(transcriptState);
      // Get and update pin state if transcript is visible
      if (transcriptState) {
        const pinState = await getPinState();
        if (pinState !== null) {
          updatePinUI(pinState);
        }
      }
    }
  }
}

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
  updateUI();
  document.getElementById('goFullScreen').addEventListener('click', injectCSS);
  document.getElementById('goNormal').addEventListener('click', removeCSS);
  document.getElementById('toggleTranscript').addEventListener('click', toggleTranscript);
  document.getElementById('pinTranscript').addEventListener('click', togglePinTranscript);
});

