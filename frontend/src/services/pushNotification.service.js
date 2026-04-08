import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { app } from '../config/firebase';
import api from './api';

let foregroundListenerAttached = false;

const canUseBrowserNotifications = () => {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator;
};

export const registerWebPushToken = async () => {
  if (!canUseBrowserNotifications()) {
    return null;
  }

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.warn('Skipping web push setup: VITE_FIREBASE_VAPID_KEY is missing');
    return null;
  }

  const supported = await isSupported().catch(() => false);
  if (!supported) {
    return null;
  }

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }

  if (permission !== 'granted') {
    return null;
  }

  const messaging = getMessaging(app);

  const serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');

  const fcmToken = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration,
  });

  if (!fcmToken) {
    return null;
  }

  await api.post('/notification/save-fcm-token', {
    token: fcmToken,
    device_type: 'web',
  });

  return fcmToken;
};

export const attachForegroundNotificationListener = async () => {
  if (!canUseBrowserNotifications() || foregroundListenerAttached) {
    return;
  }

  const supported = await isSupported().catch(() => false);
  if (!supported) {
    return;
  }

  const messaging = getMessaging(app);

  onMessage(messaging, (payload) => {
    const title = payload?.notification?.title || payload?.data?.title || 'Doorriing';
    const body = payload?.notification?.body || payload?.data?.body || '';

    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  });

  foregroundListenerAttached = true;
};
