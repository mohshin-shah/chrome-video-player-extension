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

    // First, remove any existing CSS to avoid duplicates
    await chrome.scripting.removeCSS({
      target: { tabId: tab.id },
      files: ['vid.css']
    });

    // Then inject the CSS
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

    // Remove CSS file
    await chrome.scripting.removeCSS({
      target: { tabId: tab.id },
      files: ['vid.css']
    });

    // Also remove any style tags that might have been injected
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Remove any style elements with vid.css content
        const styleSheets = document.styleSheets;
        for (let i = styleSheets.length - 1; i >= 0; i--) {
          try {
            const sheet = styleSheets[i];
            if (sheet.href && sheet.href.includes('vid.css')) {
              const ownerNode = sheet.ownerNode;
              if (ownerNode) {
                ownerNode.remove();
              }
            }
          } catch (e) {
            // Cross-origin stylesheets may throw errors, ignore them
          }
        }
        
        // Remove any injected style tags
        const styleTags = document.querySelectorAll('style[data-injected="vid-css"]');
        styleTags.forEach(tag => tag.remove());
      }
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

// Update transcript button and hint based on state
function updateTranscriptUI(isVisible) {
  const toggleTranscriptBtn = document.getElementById('toggleTranscript');
  const btnText = toggleTranscriptBtn.querySelector('.btn-text');
  const transcriptHint = document.getElementById('transcriptHint');
  
  if (isVisible) {
    btnText.textContent = 'Hide Transcript';
    transcriptHint.style.display = 'block';
  } else {
    btnText.textContent = 'Show Transcript';
    transcriptHint.style.display = 'none';
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
    // Get and update transcript state
    const transcriptState = await getTranscriptState();
    if (transcriptState !== null) {
      updateTranscriptUI(transcriptState);
    }
  }
}

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
  updateUI();
  document.getElementById('goFullScreen').addEventListener('click', injectCSS);
  document.getElementById('goNormal').addEventListener('click', removeCSS);
  document.getElementById('toggleTranscript').addEventListener('click', toggleTranscript);
});

