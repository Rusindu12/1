document.addEventListener('DOMContentLoaded', () => {
  const serverInput = document.getElementById('serverUrl');
  const keyInput = document.getElementById('apiKey');
  const saveBtn = document.getElementById('saveBtn');
  const statusEl = document.getElementById('status');

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['serverUrl', 'apiKey'], (res) => {
      if (res.serverUrl) serverInput.value = res.serverUrl;
      if (res.apiKey) keyInput.value = res.apiKey;
    });
  }

  saveBtn.addEventListener('click', () => {
    const serverUrl = serverInput.value.trim();
    const apiKey = keyInput.value.trim();

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ serverUrl, apiKey }, () => {
        statusEl.innerText = '✓ Settings Saved! Connected to Brain Memory.';
        setTimeout(() => { statusEl.innerText = ''; }, 2500);
      });
    } else {
      statusEl.innerText = '✓ Settings updated locally.';
    }
  });
});
