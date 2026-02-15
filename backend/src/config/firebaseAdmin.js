import admin from 'firebase-admin';
import { config } from './env.js';

if (!config.firebase.projectId || !config.firebase.privateKey || !config.firebase.clientEmail) {
  throw new Error('Missing Firebase Admin configuration');
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: config.firebase.projectId,
    privateKey: config.firebase.privateKey,
    clientEmail: config.firebase.clientEmail,
  }),
});

export const firebaseAuth = admin.auth();
export default admin;
