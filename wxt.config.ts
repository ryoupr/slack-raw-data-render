import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
// version は package.json から、name / description は public/_locales から、アイコンは public/icon/ から、
// content_scripts と action（popup）は entrypoints/ から自動で manifest に反映される。
// UI 文言は public/_locales/*/messages.json で9言語対応（chrome.i18n）。
// 該当言語が無いブラウザでは default_locale の en にフォールバックする。
// ref: https://wxt.dev/guide/essentials/i18n
// ref: https://developer.chrome.com/docs/extensions/reference/api/i18n
export default defineConfig({
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    permissions: ['storage'],
    // action.default_title は entrypoints/popup/index.html の <title> から設定される
  },
});
