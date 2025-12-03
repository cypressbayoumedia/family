import { Injectable, inject, signal, computed, Injector, runInInjectionContext } from '@angular/core';
import { Firestore, collection, query, orderBy, limit, collectionData, doc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { AuthService } from './auth';
import { switchMap, of } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

export interface Notification {
    id: string;
    type: 'post' | 'comment' | 'event';
    title: string;
    body: string;
    link: string;
    familyId: string;
    icon: string;
    read: boolean;
    createdAt: any;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
    private firestore = inject(Firestore);
    private auth = inject(AuthService);

    private injector = inject(Injector);

    // Stream of notifications for the current user
    private notifications$ = toSignal(this.auth.user$.pipe(
        switchMap(user => {
            if (!user) return of([]);
            return runInInjectionContext(this.injector, () => {
                const notifsRef = collection(this.firestore, `users/${user.uid}/notifications`);
                const q = query(notifsRef, orderBy('createdAt', 'desc'), limit(20));
                return collectionData(q, { idField: 'id' });
            });
        })
    ), { initialValue: [] as Notification[] });

    // Computed signal for unread count
    unreadCount = computed(() => {
        const notifs = this.notifications$() as Notification[];
        return notifs.filter(n => !n.read).length;
    });

    // Expose notifications as a signal
    notifications = computed(() => this.notifications$() as Notification[]);

    async markAsRead(notificationId: string) {
        const user = this.auth.currentUser();
        if (!user) return;
        const ref = doc(this.firestore, `users/${user.uid}/notifications/${notificationId}`);
        await updateDoc(ref, { read: true });
    }

    async markAllAsRead() {
        const user = this.auth.currentUser();
        if (!user) return;
        const notifs = this.notifications$() as Notification[];
        const unread = notifs.filter(n => !n.read);
        const promises = unread.map(n =>
            updateDoc(doc(this.firestore, `users/${user.uid}/notifications/${n.id}`), { read: true })
        );
        await Promise.all(promises);
    }

    async deleteNotification(notificationId: string) {
        const user = this.auth.currentUser();
        if (!user) return;
        const ref = doc(this.firestore, `users/${user.uid}/notifications/${notificationId}`);
        await deleteDoc(ref);
    }
}
