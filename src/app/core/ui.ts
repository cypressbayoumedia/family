import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class UiService {
    // State for the right-side notification drawer
    readonly showNotificationDrawer = signal(false);

    toggleNotificationDrawer() {
        this.showNotificationDrawer.update(v => !v);
    }

    openNotificationDrawer() {
        this.showNotificationDrawer.set(true);
    }

    closeNotificationDrawer() {
        this.showNotificationDrawer.set(false);
    }
}
