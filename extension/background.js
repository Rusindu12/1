/**
 * AI Brain Extension Service Worker (Manifest V3)
 * Handles Context Menus, Keyboard Shortcuts, and Brain Server REST API communication.
 */

const DEFAULT_SERVER_URL = 'http://localhost:3000';
const DEFAULT_API_KEY = 'brain_key_master_sinhala_english_universal_access';

chrome.runtime.onInstalled.addListener(() => {
  // Create Context Menus
  chrome.contextMenus.create({
    id: 'ai-brain-ask',
    title: '🧠 Ask AI Brain (සිංහල / English)',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'ai-brain-save-memory',
    title: '💾 Save selection to Brain Memory',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'ai-brain-summarize-page',
    title: '📄 Summarize this Web Page with AI Brain',
    contexts: ['page']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.id) return;

  if (info.menuItemId === 'ai-brain-ask') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'SHOW_PROMPT_WITH_TEXT',
      text: info.selectionText
    });
  } else if (info.menuItemId === 'ai-brain-save-memory') {
    const config = await getStoredConfig();
    try {
      const res = await fetch(`${config.serverUrl}/api/v1/memories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          tier: 'knowledge',
          content: info.selectionText,
          sourceType: 'web_extension',
          sourceUrl: tab.url
        })
      });
      const data = await res.json();
      chrome.tabs.sendMessage(tab.id, {
        action: 'SHOW_NOTIFICATION',
        message: data.success ? '✓ Saved to Brain Memory!' : 'Error saving to memory'
      });
    } catch (e) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'SHOW_NOTIFICATION',
        message: 'Could not connect to AI Brain Server'
      });
    }
  } else if (info.menuItemId === 'ai-brain-summarize-page') {
    chrome.tabs.sendMessage(tab.id, { action: 'SUMMARIZE_PAGE' });
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-brain') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_FLOATING_BUBBLE' });
    }
  }
});

async function getStoredConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['serverUrl', 'apiKey'], (items) => {
      resolve({
        serverUrl: items.serverUrl || DEFAULT_SERVER_URL,
        apiKey: items.apiKey || DEFAULT_API_KEY
      });
    });
  });
}
