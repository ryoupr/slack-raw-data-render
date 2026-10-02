import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
// version / description は package.json から、アイコンは public/icon/ から、
// content_scripts と action（popup）は entrypoints/ から自動で manifest に反映される。
export default defineConfig({
  manifest: {
    name: 'Slack Markdown Renderer',
    permissions: ['storage'],
  },
});
