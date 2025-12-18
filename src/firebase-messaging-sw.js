importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyCkoOgMLWuStZU7g9PjDcRX_-ExzAGkVk0",
    authDomain: "family-businesses.firebaseapp.com",
    projectId: "family-businesses",
    storageBucket: "family-businesses.firebasestorage.app",
    messagingSenderId: "442881058036",
    appId: "1:442881058036:web:f838eb06ca59977c2beaa1"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/assets/icons/icon-72x72.png'
    };

    self.registration.showNotification(notificationTitle,
        notificationOptions);
});
