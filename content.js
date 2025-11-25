// Content script to handle transcript-wrapper visibility via popup controls

(function() {
  'use strict';
  // No click-outside functionality - transcript is controlled only via popup toggle button
})();

// Listen for messages from popup (set up immediately, not inside init)
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'toggleTranscript') {
    const transcriptWrapper = document.querySelector('.transcript-wrapper');
    if (!transcriptWrapper) {
      sendResponse({ success: false, visible: false, error: 'Transcript wrapper not found' });
      return true;
    }
    
    const isHidden = transcriptWrapper.classList.contains('transcript-hidden');
    if (isHidden) {
      transcriptWrapper.classList.remove('transcript-hidden');
      sendResponse({ success: true, visible: true });
    } else {
      transcriptWrapper.classList.add('transcript-hidden');
      sendResponse({ success: true, visible: false });
    }
    return true;
  } else if (request.action === 'showTranscript') {
    const transcriptWrapper = document.querySelector('.transcript-wrapper');
    if (transcriptWrapper) {
      transcriptWrapper.classList.remove('transcript-hidden');
      sendResponse({ success: true, visible: true });
    } else {
      sendResponse({ success: false, visible: false, error: 'Transcript wrapper not found' });
    }
    return true;
  } else if (request.action === 'hideTranscript') {
    const transcriptWrapper = document.querySelector('.transcript-wrapper');
    if (transcriptWrapper) {
      transcriptWrapper.classList.add('transcript-hidden');
      sendResponse({ success: true, visible: false });
    } else {
      sendResponse({ success: false, visible: false, error: 'Transcript wrapper not found' });
    }
    return true;
  } else if (request.action === 'getTranscriptState') {
    const transcriptWrapper = document.querySelector('.transcript-wrapper');
    if (!transcriptWrapper) {
      sendResponse({ success: false, visible: false, error: 'Transcript wrapper not found' });
      return true;
    }
    const isHidden = transcriptWrapper.classList.contains('transcript-hidden');
    sendResponse({ success: true, visible: !isHidden });
    return true;
  } else if (request.action === 'togglePinTranscript') {
    const transcriptWrapper = document.querySelector('.transcript-wrapper');
    if (!transcriptWrapper) {
      sendResponse({ success: false, pinned: false, error: 'Transcript wrapper not found' });
      return true;
    }
    const isPinned = transcriptWrapper.classList.contains('transcript-pinned');
    if (isPinned) {
      transcriptWrapper.classList.remove('transcript-pinned');
      sendResponse({ success: true, pinned: false });
    } else {
      transcriptWrapper.classList.add('transcript-pinned');
      sendResponse({ success: true, pinned: true });
    }
    return true;
  } else if (request.action === 'getPinState') {
    const transcriptWrapper = document.querySelector('.transcript-wrapper');
    if (!transcriptWrapper) {
      sendResponse({ success: false, pinned: false, error: 'Transcript wrapper not found' });
      return true;
    }
    const isPinned = transcriptWrapper.classList.contains('transcript-pinned');
    sendResponse({ success: true, pinned: isPinned });
    return true;
  }
  return false;
});

