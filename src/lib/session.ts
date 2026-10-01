import { computed, ref } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type Role = 'admin' | 'editor' | 'viewer'

export interface AttributeDef {
  key: string
  label: string
  type: 'text' | 'list'
}

export interface Organization {
  id: string
  name: string
  currency: string
  business: Record<string, string>
  attribute_defs: AttributeDef[]
}

export const session = ref<Session | null>(null)
export const organization = ref<Organization | null>(null)
export const role = ref<Role | null>(null)

export const canEdit = computed(() => role.value === 'admin' || role.value === 'editor')
export const isAdmin = computed(() => role.value === 'admin')

// Por ahora se usa la primera organización del usuario (selector de organizaciones: más adelante)
export async function loadOrganization(userId: string) {
  const { data, error } = await supabase
    .from('organization_members')
    .select('role, organizations(id, name, currency, business, attribute_defs)')
    .eq('user_id', userId) // sin este filtro se verían también las membresías de otros usuarios
    .limit(1)
  if (error) throw error
  const row = data?.[0] as unknown as { role: Role; organizations: Organization } | undefined
  organization.value = row?.organizations
    ? { ...row.organizations, attribute_defs: row.organizations.attribute_defs ?? [] }
    : null
  role.value = row?.role ?? null
}

export async function initSession() {
  const { data } = await supabase.auth.getSession()
  session.value = data.session
  if (data.session) {
    try {
      await loadOrganization(data.session.user.id)
    } catch (e) {
      console.error(e)
    }
  }
  // Aquí solo se actualiza estado: no hacer llamadas a Supabase dentro de este callback
  supabase.auth.onAuthStateChange((_event, s) => {
    session.value = s
    if (!s) {
      organization.value = null
      role.value = null
    }
  })
}