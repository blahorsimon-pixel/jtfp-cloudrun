// Simple debug logger that posts to backend
function debugLog(location, message, data) {
  fetch('/api/debug-log', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({location, message, data, timestamp: Date.now()})
  }).catch(() => {});
}
window.debugLog = debugLog;
