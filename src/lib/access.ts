// ─── Team access (owner / manager / staff) ───────────────────────
// Deny by default: getUserStore() in lib/auth stays owner-only and every
// route that still uses it is unreachable for team members. Areas a team
// member may use opt in explicitly through getStoreFor()/getPageStore()
// with the permission they need.
import { redirect } from 'next/navigation'
import { queryOne, query, toCamel } from './db'
import { getUserStore, type SessionUser } from './auth'
import { ROLE_PERMISSIONS, type Permission, type Role } from './access-shared'
import type { Store } from '@/types'

export { can, allowedPath, ROLE_LABEL, ROLE_PERMISSIONS } from './access-shared'
export type { Permission, Role } from './access-shared'

export interface StoreAccess {
  store: Store
  role: Role
  /** store_members.id — null for the owner */
  memberId: string | null
}

/**
 * The store this user works in and their role. A store they own always
 * wins over any team membership.
 */
export async function getStoreAccess(user: Pick<SessionUser, 'firebaseUid'>): Promise<StoreAccess | null> {
  const owned = await getUserStore(user.firebaseUid)
  if (owned) return { store: owned, role: 'owner', memberId: null }

  const row = await queryOne<Record<string, unknown>>(
    `SELECT s.*, m.id AS __member_id, m.role AS __member_role
     FROM store_members m
     JOIN stores s ON s.id = m.store_id
     WHERE m.firebase_uid = $1 AND m.status = 'active' AND s.is_active = true
     ORDER BY m.accepted_at DESC NULLS LAST
     LIMIT 1`,
    [user.firebaseUid]
  )
  if (!row) return null
  const { __member_id, __member_role, ...storeRow } = row
  // Best-effort "last seen" for the owner's team list
  void query('UPDATE store_members SET last_seen_at = NOW() WHERE id = $1', [__member_id]).catch(() => {})
  return {
    store: toCamel<Store>(storeRow),
    role: __member_role as Role,
    memberId: __member_id as string,
  }
}

/** The user's store if their role grants `perm`, else null (callers 401/404 as before). */
export async function getStoreFor(user: Pick<SessionUser, 'firebaseUid'>, perm: Permission): Promise<Store | null> {
  const access = await getStoreAccess(user)
  if (!access || !ROLE_PERMISSIONS[access.role].includes(perm)) return null
  return access.store
}

/** Same as getStoreFor, plus the role — for routes that vary by role. */
export async function getAccessFor(user: Pick<SessionUser, 'firebaseUid'>, perm: Permission): Promise<StoreAccess | null> {
  const access = await getStoreAccess(user)
  if (!access || !ROLE_PERMISSIONS[access.role].includes(perm)) return null
  return access
}

/** Dashboard pages: never render without access — send people somewhere they can be. */
export async function getPageAccess(user: Pick<SessionUser, 'firebaseUid'>, perm: Permission): Promise<StoreAccess> {
  const access = await getStoreAccess(user)
  if (!access) redirect('/onboarding')
  if (!ROLE_PERMISSIONS[access.role].includes(perm)) redirect('/dashboard/orders')
  return access
}

export async function getPageStore(user: Pick<SessionUser, 'firebaseUid'>, perm: Permission): Promise<Store> {
  return (await getPageAccess(user, perm)).store
}
