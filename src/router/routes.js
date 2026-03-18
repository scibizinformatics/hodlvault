const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') },
      { path: 'vault', component: () => import('pages/VaultPage.vue') },
      { path: 'my-vaults', component: () => import('pages/MyVaultsPage.vue') },
      { path: 'vault/manage', component: () => import('pages/VaultManagePage.vue') },
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
