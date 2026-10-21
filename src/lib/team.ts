// Team invitations: owner invites by email → invitee opens the link,
// signs in with that same email, and accepts. The token is single-use.
import { randomBytes } from 'crypto'
import { query, queryOne } from './db'
import { getAppUrl } from './paystack'
import { hasFeature } from './plan'
import { sendEmail } from './notify/providers'
import { ROLE_LABEL, type Role } from './access-shared'

export interface TeamMember {
  id: string
  email: string
  name: string | null
  role: Exclude<Role, 'owner'>
  status: 'invited' | 'active' | 'removed'
  invited_at: string
  accepted_at: string | null
  last_seen_at: string | null
}

export const INVITE_COOKIE = 'duka_team_invite'
/** Invites go stale after this long — the owner can resend. */
export const INVITE_TTL_DAYS = 14

export function newInviteToken(): string {
  return randomBytes(24).toString('base64url')
}

export function inviteUrl(token: string): string {
  return `${getAppUrl()}/team/join?token=${encodeURIComponent(token)}`
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function listTeam(storeId: string): Promise<TeamMember[]> {
  return query<TeamMember>(
    `SELECT id, email, name, role, status, invited_at, accepted_at, last_seen_at
     FROM store_members WHERE store_id = $1 AND status <> 'removed'
     ORDER BY status = 'active' DESC, invited_at DESC`,
    [storeId]
  )
}

export async function sendInviteEmail(opts: { to: string; storeName: string; role: Exclude<Role, 'owner'>; token: string }) {
  const url = inviteUrl(opts.token)
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
  return sendEmail(
    opts.to,
    `You've been invited to help run ${opts.storeName} on Duka`,
    `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px">
      <h2 style="margin:0 0 12px">Join ${esc(opts.storeName)}</h2>
      <p>You've been added as <strong>${ROLE_LABEL[opts.role]}</strong>. Sign in (or create a free account) with
      <strong>${esc(opts.to)}</strong> to accept.</p>
      <p><a href="${url}" style="display:inline-block;background:#111;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Accept invitation</a></p>
      <p style="color:#888;font-size:12px">This link expires in ${INVITE_TTL_DAYS} days. If you weren't expecting it, you can ignore this email.</p>
    </div>`
  )
}

export type InviteLookup =
  | { ok: true; invite: { id: string; email: string; role: Exclude<Role, 'owner'>; store_id: string; store_name: string; store_logo: string | null } }
  | { ok: false; error: string }

export async function findInvite(token: string): Promise<InviteLookup> {
  if (!token || token.length > 100) return { ok: false, error: 'This invitation link is not valid.' }
  const row = await queryOne<{
    id: string; email: string; role: Exclude<Role, 'owner'>; store_id: string; store_name: string; store_logo: string | null; invited_at: string | Date
  }>(
    `SELECT m.id, m.email, m.role, m.store_id, m.invited_at, s.name AS store_name, s.logo_url AS store_logo
     FROM store_members m JOIN stores s ON s.id = m.store_id
     WHERE m.invite_token = $1 AND m.status = 'invited' AND s.is_active = true`,
    [token]
  )
  if (!row) return { ok: false, error: 'This invitation has already been used or was cancelled.' }
  if (inviteExpired(row.invited_at)) return { ok: false, error: 'This invitation has expired. Ask the store owner to send a new one.' }
  const { invited_at: _invitedAt, ...invite } = row
  return { ok: true, invite }
}

export function inviteExpired(invitedAt: string | Date, now = new Date()): boolean {
  return now.getTime() - new Date(invitedAt).getTime() > INVITE_TTL_DAYS * 86_400_000
}

export type AcceptResult = { ok: true; storeName: string } | { ok: false; error: string; status: number }

/**
 * Accept an invite for the signed-in user. Their account email must be the
 * one invited, and they can't already own a store (owning always wins, so
 * the membership would never be used).
 */
export async function acceptInvite(token: string, user: { firebaseUid: string; email: string }): Promise<AcceptResult> {
  const found = await findInvite(token)
  if (!found.ok) return { ok: false, error: found.error, status: 410 }
  const { invite } = found
  if (!user.email || normaliseEmail(user.email) !== normaliseEmail(invite.email)) {
    return {
      ok: false,
      status: 403,
      error: `This invitation is for ${invite.email}. Sign in with that email to accept it.`,
    }
  }
  if (!(await hasFeature(invite.store_id, 'team'))) {
    return { ok: false, status: 403, error: "This store's plan doesn't include team accounts right now. Ask the owner to upgrade." }
  }
  const owns = await queryOne('SELECT 1 FROM stores WHERE owner_id = $1 AND is_active = true', [user.firebaseUid])
  if (owns) {
    return { ok: false, status: 409, error: 'This account already owns a store. Use a different account to join another store’s team.' }
  }

  const updated = await queryOne<{ id: string }>(
    `UPDATE store_members
     SET firebase_uid = $2, status = 'active', accepted_at = NOW(), invite_token = NULL
     WHERE id = $1 AND status = 'invited' AND invite_token = $3
     RETURNING id`,
    [invite.id, user.firebaseUid, token]
  )
  if (!updated) return { ok: false, error: 'This invitation has already been used.', status: 410 }

  // One store per team member: leaving any earlier team keeps access unambiguous
  await query(
    `UPDATE store_members SET status = 'removed', invite_token = NULL
     WHERE firebase_uid = $1 AND id <> $2 AND status = 'active'`,
    [user.firebaseUid, invite.id]
  )
  return { ok: true, storeName: invite.store_name }
}
