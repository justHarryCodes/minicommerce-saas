// ─── Firebase Admin SDK (server) ─────────────────────────────────
import admin from 'firebase-admin'

const projectId   = process.env.FIREBASE_ADMIN_PROJECT_ID
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
const privateKey  = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

if (!projectId || !clientEmail || !privateKey) {
  throw new Error(
    'Missing Firebase Admin env vars: FIREBASE_ADMIN_PROJECT_ID, ' +
    'FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY must all be set.'
  )
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    storageBucket: process.env.NEXT_PUBLIC_STORAGE_BUCKET,
  })
}

export const adminAuth    = admin.auth()
export const adminStorage = admin.storage()
export { admin }
