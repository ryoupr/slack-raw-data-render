// i18n: ブラウザの表示言語の messages.json から取得（該当なし → default_locale の en）
const t = (key) => browser.i18n.getMessage(key) || key;

const uiLang = browser.i18n.getUILanguage?.() ?? 'en';
document.documentElement.lang = uiLang;
// アラビア語などの RTL 言語ではポップアップ全体を右→左レイアウトにする
document.documentElement.dir = t('@@bidi_dir') === 'rtl' ? 'rtl' : 'ltr';

document.querySelectorAll('[data-i18n]').forEach((el) => {
  el.textContent = t(el.dataset.i18n);
});

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
