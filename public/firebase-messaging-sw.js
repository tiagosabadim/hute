importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDOeYP0MbVXKWjWhzcHJ7O0voHgk3spnNI",
  authDomain: "hutex-2026.firebaseapp.com",
  projectId: "hutex-2026",
  storageBucket: "hutex-2026.firebasestorage.app",
  messagingSenderId: "524847309009",
  appId: "1:524847309009:web:3ee21e8b44c7765403e5f0"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || 'Hute';
  const body = payload.notification?.body || '';
  self.registration.showNotification(title, {
    body,
    icon: '/ICON.svg',
    badge: '/favicon.svg',
  });
});
