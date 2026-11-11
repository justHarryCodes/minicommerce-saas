// Firebase email-action links (verify email, reset password, undo or confirm
// an email change) land on https://dukanigeria.com/_/auth/action instead of
// Firebase's default page. Pure helpers, so they can be tested.

export type AuthActionMode = 'verifyEmail' | 'resetPassword' | 'recoverEmail' | 'verifyAndChangeEmail' | 'signIn' | 'revertSecondFactorAddition'

const MODES: readonly AuthActionMode[] = ['verifyEmail', 'resetPassword', 'recoverEmail', 'verifyAndChangeEmail', 'signIn', 'revertSecondFactorAddition']

export interface AuthAction {
  mode: AuthActionMode | null
  oobCode: string | null
  /** Where to send the person afterwards — only ever a Duka address */
  continueUrl: string | null
}

const ROOT = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'dukanigeria.com').replace(/^www\./, '').toLowerCase()

/**
 * Keep a continue URL only if it points back to Duka (this site, the root
 * domain or a store subdomain) over https — so an action link can never be
 * used to bounce someone to another site.
 */
export function safeContinueUrl(raw: string | null | undefined, currentOrigin: string): string | null {
  if (!raw) return null
  let url: URL
  try {
    url = new URL(raw, currentOrigin)
  } catch {
    return null
  }
  const here = new URL(currentOrigin)
  const host = url.hostname.toLowerCase()
  const sameOrigin = url.origin === here.origin
  const ours = url.protocol === 'https:' && (host === ROOT || host.endsWith(`.${ROOT}`))
  return sameOrigin || ours ? url.toString() : null
}

export function parseAuthAction(params: URLSearchParams, currentOrigin: string): AuthAction {
  const mode = params.get('mode')
  const oobCode = params.get('oobCode')
  return {
    mode: MODES.includes(mode as AuthActionMode) ? (mode as AuthActionMode) : null,
    oobCode: oobCode && /^[\w-]{10,}$/.test(oobCode) ? oobCode : null,
    continueUrl: safeContinueUrl(params.get('continueUrl'), currentOrigin),
  }
}

/** Plain-language messages for the Firebase errors these links can hit. */
export function authActionError(code: string | undefined): string {
  switch (code) {
    case 'auth/expired-action-code':
      return 'This link has expired. Request a new one and use it within an hour.'
    case 'auth/invalid-action-code':
      return 'This link has already been used or isn’t valid. Request a new one.'
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact Duka support for help.'
    case 'auth/user-not-found':
      return 'We couldn’t find an account for this link. It may have been deleted.'
    case 'auth/weak-password':
      return 'Choose a stronger password.'
    case 'auth/email-already-in-use':
      return 'That email address is already used by another account.'
    case 'auth/network-request-failed':
      return 'No connection. Check your internet and try again.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.'
    default:
      return 'Something went wrong with this link. Request a new one and try again.'
  }
}

/** What's still missing from a new password (empty = good to go). */
export function passwordProblems(pw: string): string[] {
  const out: string[] = []
  if (pw.length < 8) out.push('at least 8 characters')
  if (!/[A-Za-z]/.test(pw)) out.push('a letter')
  if (!/\d/.test(pw)) out.push('a number')
  return out
}
