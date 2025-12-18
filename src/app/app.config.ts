import { ApplicationConfig, provideZoneChangeDetection, isDevMode } from '@angular/core';

// ... (omitted lines for brevity in thought, but tool needs exact match or context)
// Wait, I should use a cleaner replacement.

// START REPLACEMENT
import { provideRouter, withViewTransitions } from '@angular/router';

import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getFunctions, provideFunctions } from '@angular/fire/functions';
import { getMessaging, provideMessaging } from '@angular/fire/messaging';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { provideServiceWorker } from '@angular/service-worker';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withViewTransitions()),
    provideFirebaseApp(() => initializeApp({ projectId: "family-businesses", appId: "1:442881058036:web:f838eb06ca59977c2beaa1", storageBucket: "family-businesses.firebasestorage.app", apiKey: "AIzaSyCkoOgMLWuStZU7g9PjDcRX_-ExzAGkVk0", authDomain: "family-businesses.firebaseapp.com", messagingSenderId: "442881058036" })),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideFunctions(() => getFunctions()),
    provideMessaging(() => getMessaging()),
    provideStorage(() => getStorage()),
    provideServiceWorker('combined-sw.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
