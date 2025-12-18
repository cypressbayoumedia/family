import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class WakeLockService {
    private sentinel: WakeLockSentinel | null = null;
    isActive = signal(false);

    constructor() {
        // Re-acquire lock when the page becomes visible again
        document.addEventListener('visibilitychange', async () => {
            if (this.sentinel !== null && document.visibilityState === 'visible') {
                await this.requestLock();
            }
        });
    }

    async requestLock(): Promise<void> {
        if ('wakeLock' in navigator) {
            try {
                this.sentinel = await navigator.wakeLock.request('screen');
                this.isActive.set(true);
                console.log('Wake Lock active');

                this.sentinel.addEventListener('release', () => {
                    this.isActive.set(false);
                    console.log('Wake Lock released');
                });
            } catch (err) {
                console.error(`${err} - Wake Lock request failed`);
                this.isActive.set(false);
            }
        } else {
            console.warn('Wake Lock API not supported.');
        }
    }

    async releaseLock(): Promise<void> {
        if (this.sentinel) {
            await this.sentinel.release();
            this.sentinel = null;
        }
    }
}
