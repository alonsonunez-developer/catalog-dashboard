import { createRouter, createWebHistory } from 'vue-router'
import { organization, session } from './lib/session'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('./views/LoginView.vue'), meta: { public: true } },
    { path: '/onboarding', name: 'onboarding', component: () => import('./views/OnboardingView.vue') },
    {
      path: '/',
      component: () => import('./views/AppLayout.vue'),
      children: [
        { path: '', redirect: { name: 'catalogs' } },
        { path: 'catalogs', name: 'catalogs', component: () => import('./views/CatalogsView.vue') },
        { path: 'catalogs/:id', name: 'catalog-editor', component: () => import('./views/CatalogEditorView.vue') },
        { path: 'products', name: 'products', component: () => import('./views/ProductsView.vue') },
        { path: 'categories', name: 'categories', component: () => import('./views/CategoriesView.vue') },
        { path: 'attributes', name: 'attributes', component: () => import('./views/AttributesView.vue') },
        { path: 'settings', name: 'settings', component: () => import('./views/SettingsView.vue') },
      ],
    },
  ],
})

router.beforeEach((to) => {
  if (!session.value) return to.meta.public ? true : { name: 'login' }
  if (to.name === 'login') return { name: organization.value ? 'catalogs' : 'onboarding' }
  if (!organization.value) return to.name === 'onboarding' ? true : { name: 'onboarding' }
  if (to.name === 'onboarding') return { name: 'catalogs' }
  return true
})

export default router