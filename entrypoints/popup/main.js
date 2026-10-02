const slider = document.getElementById('line-height');
const display = document.getElementById('lh-value');

// Load saved value
chrome.storage.local.get('lineHeight', (data) => {
  const val = data.lineHeight || '1.5';
  slider.value = val;
  display.textContent = val;
});

// Send to content script on change
slider.addEventListener('input', () => {
  const val = slider.value;
  display.textContent = val;
  chrome.storage.local.set({ lineHeight: val });
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'setLineHeight', value: val });
    }
  });
});
