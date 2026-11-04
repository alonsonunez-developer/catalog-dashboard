import { createRouter, createWebHistory } from 'vue-router'
import { organization, session } from './lib/session'
import { pageTitle } from './lib/brand'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('./views/LoginView.vue'), meta: { public: true } },
    { path: '/onboarding', name: 'onboarding', component: () => import('./views/OnboardingView.vue') },
    { path: '/catalogs/:id/print', name: 'catalog-print', component: () => import('./views/PrintView.vue') },
    {
      path: '/',
      component: () => import('./views/AppLayout.vue'),
      children: [
        { path: '', redirect: { name: 'catalogs' } },
        { path: 'catalogs', meta: { title: 'Catálogos' }, name: 'catalogs', component: () => import('./views/CatalogsView.vue') },
        { path: 'catalogs/new', meta: { title: 'Nuevo Catálogo' }, name: 'catalog-new', component: () => import('./views/NewCatalogView.vue') },
        { path: 'catalogs/:id', meta: { title: 'Editar Catálogo' }, name: 'catalog-editor', component: () => import('./views/CatalogEditorView.vue') },
        { path: 'products', meta: { title: 'Productos' }, name: 'products', component: () => import('./views/ProductsView.vue') },
        { path: 'products/new', meta: { title: 'Nuevo Producto' }, name: 'product-new', component: () => import('./views/ProductFormView.vue') },
        { path: 'products/:id', meta: { title: 'Editar Producto' }, name: 'product-edit', component: () => import('./views/ProductFormView.vue') },
        { path: 'categories', meta: { title: 'Categorías' }, name: 'categories', component: () => import('./views/CategoriesView.vue') },
        { path: 'attributes', meta: { title: 'Atributos' }, name: 'attributes', component: () => import('./views/AttributesView.vue') },
        { path: 'settings', meta: { title: 'Configuración' }, name: 'settings', component: () => import('./views/SettingsView.vue') },
        { path: '/reset-password', name: 'reset-password', component: () => import('./views/ResetPasswordView.vue'), meta: { public: true } },
            { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('./views/NotFoundView.vue'), meta: { public: true, title: 'No encontrada' } },
      ],
    },
  ],
})

router.beforeEach((to) => {
  if (to.name === 'reset-password') return true
  if (!session.value) return to.meta.public ? true : { name: 'login' }
  if (to.name === 'login') return { name: organization.value ? 'catalogs' : 'onboarding' }
  if (!organization.value) return to.name === 'onboarding' ? true : { name: 'onboarding' }
  if (to.name === 'onboarding') return { name: 'catalogs' }
  return true
})

router.afterEach((to) => {
  document.title = pageTitle(typeof to.meta.title === 'string' ? to.meta.title : undefined)
})

export default router