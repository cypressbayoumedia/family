import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class PwaInstallService {
    deferredPrompt = signal<any>(null);
    showInstallPromotion = signal(false);

    constructor() {
        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            this.deferredPrompt.set(e);
            // Update UI notify the user they can install the PWA
            this.showInstallPromotion.set(true);
            console.log('beforeinstallprompt captured');
        });

        window.addEventListener('appinstalled', () => {
            // Hide the app-provided install promotion
            this.showInstallPromotion.set(false);
            this.deferredPrompt.set(null);
            console.log('PWA was installed');
        });
    }

    async promptInstall() {
        const promptEvent = this.deferredPrompt();
        if (!promptEvent) return;

        // Show the install prompt
        promptEvent.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await promptEvent.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        // We've used the prompt, and can't use it again, discard it
        this.deferredPrompt.set(null);
        this.showInstallPromotion.set(false);
    }

    hidePromotion() {
        this.showInstallPromotion.set(false);
    }
}
