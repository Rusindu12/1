/**
 * AI Brain In-Page Content Script
 * Injects floating quick-assistance badge, selection tooltip, and modal overlay on any webpage.
 */

let brainContainer = null;
let currentSelection = '';

function initFloatingUI() {
  if (document.getElementById('ai-brain-extension-root')) return;

  brainContainer = document.createElement('div');
  brainContainer.id = 'ai-brain-extension-root';
  brainContainer.innerHTML = `
    <div id="ai-brain-floating-badge" title="AI Brain (Ctrl+Shift+B)">🧠</div>
    <div id="ai-brain-modal" class="ai-brain-hidden">
      <div class="ai-brain-modal-header">
        <span class="ai-brain-modal-title">🧠 AI Brain (සිංහල + English)</span>
        <button id="ai-brain-close-btn">&times;</button>
      </div>
      <div id="ai-brain-modal-body">
        <div id="ai-brain-response-box">Select text or type your question below.</div>
        <div class="ai-brain-input-container">
          <input type="text" id="ai-brain-input" placeholder="Ask in Sinhala, Singlish, or English...">
          <button id="ai-brain-send-btn">➔</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(brainContainer);

  const badge = document.getElementById('ai-brain-floating-badge');
  const modal = document.getElementById('ai-brain-modal');
  const closeBtn = document.getElementById('ai-brain-close-btn');
  const sendBtn = document.getElementById('ai-brain-send-btn');
  const input = document.getElementById('ai-brain-input');

  badge.addEventListener('click', () => {
    modal.classList.toggle('ai-brain-hidden');
    if (!modal.classList.contains('ai-brain-hidden')) {
      input.focus();
    }
  });

  closeBtn.addEventListener('click', () => {
    modal.classList.add('ai-brain-hidden');
  });

  sendBtn.addEventListener('click', handleUserQuery);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleUserQuery();
  });
}

async function handleUserQuery() {
  const input = document.getElementById('ai-brain-input');
  const box = document.getElementById('ai-brain-response-box');
  const q = input.value.trim();
  if (!q) return;

  box.innerText = 'විශ්ලේෂණය කරමින් පවතී... (Thinking)...';
  input.value = '';

  try {
    const res = await fetch('http://localhost:3000/api/v1/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer brain_key_master_sinhala_english_universal_access'
      },
      body: JSON.stringify({
        message: q,
        clientType: 'browser_extension'
      })
    });
    const data = await res.json();
    if (data.success) {
      box.innerText = data.reply;
    } else {
      box.innerText = 'Error: ' + data.error;
    }
  } catch (err) {
    box.innerText = 'Connection error: Ensure Brain Server is running on port 3000.';
  }
}

// Listen for background worker messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  initFloatingUI();
  const modal = document.getElementById('ai-brain-modal');
  const input = document.getElementById('ai-brain-input');
  const box = document.getElementById('ai-brain-response-box');

  if (msg.action === 'SHOW_PROMPT_WITH_TEXT') {
    modal.classList.remove('ai-brain-hidden');
    input.value = `Explain or translate this: "${msg.text}"`;
    handleUserQuery();
  } else if (msg.action === 'TOGGLE_FLOATING_BUBBLE') {
    modal.classList.toggle('ai-brain-hidden');
    if (!modal.classList.contains('ai-brain-hidden')) input.focus();
  } else if (msg.action === 'SHOW_NOTIFICATION') {
    alert(msg.message);
  }
});

// Auto-initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFloatingUI);
} else {
  initFloatingUI();
}
