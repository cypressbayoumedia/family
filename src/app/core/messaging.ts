import { Injectable, inject, signal } from '@angular/core';
import { Messaging, getToken, onMessage } from '@angular/fire/messaging';
import { Observable, from } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class MessagingService {
    private messaging = inject(Messaging);

    currentMessage = signal<any>(null);
    fcmToken = signal<string | null>(null);

    constructor() {
        this.listen();
    }

    async requestPermission(): Promise<void> {
        try {
            const token = await getToken(this.messaging, {
                vapidKey: 'BMQJ_..._REPLACE_WITH_YOUR_VAPID_KEY_...'
                // NOTE: You usually get this from Firebase Console -> Project Settings -> Cloud Messaging -> Web Configuration
                // user needs to fill this in or we can try without it, but usually required for web.
                // For now I'll just use getToken() with no args if the user hasn't provided one, 
                // but typically a vapidKey is needed for web push.
            });
            console.log('FCM Token:', token);
            this.fcmToken.set(token);
        } catch (err) {
            console.error('Unable to get permission to notify.', err);
        }
    }

    listen() {
        onMessage(this.messaging, (payload) => {
            console.log('Message received. ', payload);
            this.currentMessage.set(payload);
            // Optional: Show a toast/snackbar here since the app is in foreground
        });
    }
}
