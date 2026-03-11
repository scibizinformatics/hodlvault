# AI Context: hodl-vault-app
**Generated on:** 2026-03-11 14:46:15
**Tech Stack:** Quasar v2 (Vue 3) | State: Vuex/None

## 1. Project Structure
```text
├── .editorconfig
├── .env
├── .gitignore
├── .prettierrc.json
├── AUTO_WITHDRAWAL_IMPLEMENTATION.md
├── COMPLETE_REDEVELOPMENT_PROMPT.md
├── Quasar_AI_Context_Exporter.py
├── README.md
├── Treeview_folder_info.py
├── docs
│   ├── ARCHITECTURE.md
│   ├── MVP.md
│   ├── README.md
│   ├── ROADMAP.md
│   ├── rundown
│   │   ├── FINAL_PAYTACA_SOLUTION.md
│   │   ├── PAYTACA_DEVELOPER_REPORT.md
│   │   ├── PAYTACA_FINAL_SOLUTION.md
│   │   ├── SYSTEM_BREAKDOWN.md
│   │   ├── TESTING_ALTERNATIVES.md
│   │   ├── ULTIMATE_PAYTACA_SOLUTION.md
│   │   ├── VERIFICATION_COMPLETE.md
│   │   ├── WITHDRAWAL_FIX_SUMMARY.md
│   │   └── WITHDRAWAL_WORKFLOW_EXPLAINED.md
│   └── sources
│       ├── Contract Instantiation.md
│       ├── Examples.md
│       ├── Network Provider.md
│       ├── Signature Templates.md
│       ├── Testing setup.md
│       └── transaction builder.md
├── eslint.config.js
├── index.html
├── jsconfig.json
├── package-lock.json
├── package.json
├── pnpm-workspace.yaml
├── postcss.config.js
├── quasar.config.js
└── src
    ├── App.vue
    ├── assets
    │   └── quasar-logo-vertical.svg
    ├── boot
    │   ├── .gitkeep
    │   ├── Untitled
    │   ├── store.js
    │   ├── trycodeTODELETE.js
    │   ├── trycodeTODELETE.vue
    │   └── walletconnect.js
    ├── components
    │   └── EssentialLink.vue
    ├── contract
    │   ├── HodlVault.cash
    │   └── HodlVault.json
    ├── css
    │   ├── app.scss
    │   └── quasar.variables.scss
    ├── layouts
    │   └── MainLayout.vue
    ├── pages
    │   ├── ErrorNotFound.vue
    │   ├── IndexPage.vue
    │   └── VaultPage.vue
    ├── router
    │   ├── index.js
    │   └── routes.js
    ├── services
    │   ├── auto-withdrawal.js
    │   ├── blockchain.js
    │   ├── direct-signing.js
    │   ├── manual-bypass.js
    │   ├── oracle.js
    │   ├── paytaca-alternatives.js
    │   ├── paytaca-compat.js
    │   ├── paytaca-recovery.js
    │   ├── pre-signing.js
    │   ├── simple-withdrawal.js
    │   └── ultimate-withdrawal-solutions.js
    └── store
        ├── index.js
        └── modules
            ├── app.js
            ├── autoWithdrawal.js
            └── wallet.js

```

## 2. Core Routing (routes.js)
```javascript
const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/VaultPage.vue') },
      { path: 'vault', component: () => import('pages/VaultPage.vue') },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes

... (truncated)
```

## 3. Quasar Configuration Snippet
```javascript
// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-file

import { defineConfig } from '#q-app/wrappers'

export default defineConfig((/* ctx */) => {
  return {
    // https://v2.quasar.dev/quasar-cli-vite/prefetch-feature
    // preFetch: true,

    // app boot file (/src/boot)
    // --> boot files are part of "main.js"
    // https://v2.quasar.dev/quasar-cli-vite/boot-files
    boot: ['store', 'walletconnect'],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#css
    css: ['app.scss'],

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      // 'ionicons-v4',
      // 'mdi-v7',
      // 'fontawesome-v6',
      // 'eva-icons',
      // 'themify',
      // 'line-awesome',
      // 'roboto-font-latin-ext', // this or either 'roboto-font', NEVER both!

      'roboto-font', // optional, you are not bound to it
      'material-icons', // optional, you are not bound to it
    ],

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#build
    build: {
      target: {
        browser: ['es2022', 'firefox115', 'chrome115', 'safari16'],
        node: 'node20',
      },

      vueRouterMode: 'hash', // available values: 'hash', 'history'
      // vueRouterBase,
      // vueDevtools,
      // vueOptionsAPI: false,

      // rebuildCache: true, // rebuilds Vite/linter/etc cache on startup

      // publicPath: '/',
      // analyze: true,
      // env: {},
      // rawDefine: {}

... (truncated)
```