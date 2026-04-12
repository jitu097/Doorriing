import admin from 'firebase-admin';
import { config } from './env.js';

export const isFirebaseAdminConfigured = Boolean(
  config.firebase.projectId && config.firebase.privateKey && config.firebase.clientEmail
);

if (isFirebaseAdminConfigured && admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: config.firebase.projectId,
      privateKey: config.firebase.privateKey,
      clientEmail: config.firebase.clientEmail,
    }),
  });
} else if (!isFirebaseAdminConfigured) {
  console.warn('Firebase Admin is not configured. Push notifications will be disabled until env vars are set.');
}

export const firebaseAuth = isFirebaseAdminConfigured ? admin.auth() : null;
export default admin;
