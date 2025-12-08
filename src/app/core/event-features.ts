import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import { Firestore, collection, addDoc, query, orderBy, collectionData, doc, updateDoc, deleteDoc, Timestamp, FirestoreDataConverter, DocumentData, QueryDocumentSnapshot, SnapshotOptions } from '@angular/fire/firestore';
import { of, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Families } from './families';
import { AuthService } from './auth';

// --- Interfaces ---
export interface EventItem {
    id?: string;
    name: string;
    claimedByUserId: string | null;
    claimedByName: string | null;
    createdBy?: string;
}
export interface ChatMessage {
    id?: string;
    text: string;
    senderId: string;
    senderName: string;
    createdAt: Timestamp;
}

// --- Converters ---
const eventItemConverter: FirestoreDataConverter<EventItem> = {
    toFirestore: (item: EventItem): DocumentData => ({ ...item }),
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): EventItem => {
        const data = snapshot.data(options)!;
        return { id: snapshot.id, ...data } as EventItem;
    }
};

const chatMessageConverter: FirestoreDataConverter<ChatMessage> = {
    toFirestore: (message: ChatMessage): DocumentData => ({ ...message }),
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): ChatMessage => {
        const data = snapshot.data(options)!;
        return { id: snapshot.id, ...data } as ChatMessage;
    }
};

@Injectable({ providedIn: 'root' })
export class EventService {
    private afs = inject(Firestore);
    private familiesService = inject(Families);
    private authService = inject(AuthService);
    private injector = inject(Injector);

    // --- Sub-Features moved from Calendar ---

    getEventItems(eventId: string): Observable<EventItem[]> {
        const familyId = this.familiesService.activeFamilyId();
        return of(familyId).pipe(
            switchMap(id => {
                if (!id || !eventId) return of([]);
                return runInInjectionContext(this.injector, () => {
                    const itemsCol = collection(this.afs, `families/${id}/events/${eventId}/items`).withConverter(eventItemConverter);
                    return collectionData(itemsCol);
                });
            })
        );
    }

    getEventChat(eventId: string): Observable<ChatMessage[]> {
        const familyId = this.familiesService.activeFamilyId();
        return of(familyId).pipe(
            switchMap(id => {
                if (!id || !eventId) return of([]);
                return runInInjectionContext(this.injector, () => {
                    const chatCol = collection(this.afs, `families/${id}/events/${eventId}/discussion`).withConverter(chatMessageConverter);
                    const q = query(chatCol, orderBy('createdAt', 'asc'));
                    return collectionData(q);
                });
            })
        );
    }

    async addEventItem(eventId: string, itemName: string): Promise<void> {
        const familyId = this.familiesService.activeFamilyId();
        if (!familyId) return;
        const col = collection(this.afs, `families/${familyId}/events/${eventId}/items`);
        const user = this.authService.currentUser();
        await addDoc(col, {
            name: itemName,
            claimedByUserId: null,
            claimedByName: null,
            createdBy: user?.uid
        });
    }

    async deleteEventItem(eventId: string, itemId: string): Promise<void> {
        const familyId = this.familiesService.activeFamilyId();
        if (!familyId) return;
        const docRef = doc(this.afs, `families/${familyId}/events/${eventId}/items/${itemId}`);
        await deleteDoc(docRef);
    }

    async claimEventItem(eventId: string, itemId: string, claim: boolean): Promise<void> {
        const familyId = this.familiesService.activeFamilyId();
        const user = this.authService.currentUser();
        if (!familyId || !user) return;

        const docRef = doc(this.afs, `families/${familyId}/events/${eventId}/items/${itemId}`);
        await updateDoc(docRef, {
            claimedByUserId: claim ? user.uid : null,
            claimedByName: claim ? user.displayName || 'Family Member' : null
        });
    }

    async postMessage(eventId: string, text: string): Promise<void> {
        const familyId = this.familiesService.activeFamilyId();
        const user = this.authService.currentUser();
        if (!familyId || !user) return;

        const col = collection(this.afs, `families/${familyId}/events/${eventId}/discussion`);
        await addDoc(col, {
            text,
            senderId: user.uid,
            senderName: user.displayName || 'Unknown',
            createdAt: Timestamp.now()
        });
    }
}
