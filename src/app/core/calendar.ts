import { Injectable, computed, inject, signal, Injector, runInInjectionContext } from '@angular/core';
import { Firestore, collection, addDoc, query, where, orderBy, collectionData, doc, updateDoc, deleteDoc, Timestamp, FirestoreDataConverter, DocumentData, QueryDocumentSnapshot, SnapshotOptions } from '@angular/fire/firestore';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, of, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Families, FamilyMember } from './families';
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

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  isAllDay: boolean;
  location?: string;
  description?: string;
  type: 'custom' | 'birthday';
  createdBy?: string;
  invitedUserIds: string[];
  rsvps: { [userId: string]: 'attending' | 'maybe' | 'not_attending' | 'pending' };
  ownerColor?: string; // UI helper
}

// --- Converters ---
const calendarEventConverter: FirestoreDataConverter<CalendarEvent> = {
  toFirestore: (event: CalendarEvent): DocumentData => {
    return {
      title: event.title,
      startAt: Timestamp.fromDate(event.start),
      endAt: Timestamp.fromDate(event.end),
      isAllDay: event.isAllDay,
      location: event.location,
      description: event.description,
      type: event.type,
      createdBy: event.createdBy,
      invitedUserIds: event.invitedUserIds,
      rsvps: event.rsvps,
    };
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): CalendarEvent => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      title: data['title'],
      start: (data['startAt'] as Timestamp).toDate(),
      end: (data['endAt'] as Timestamp).toDate(),
      isAllDay: data['isAllDay'],
      location: data['location'],
      description: data['description'],
      type: 'custom', // Firestore only stores custom events
      createdBy: data['createdBy'],
      invitedUserIds: data['invitedUserIds'],
      rsvps: data['rsvps'],
    } as CalendarEvent;
  }
};

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
export class Calendar {
  private afs = inject(Firestore);
  private familiesService = inject(Families);
  private authService = inject(AuthService);

  private injector = inject(Injector);

  public readonly familyId = this.familiesService.activeFamilyId;
  public currentViewDate = signal<Date>(new Date());

  private readonly monthlyEvents$ = combineLatest([
    toObservable(this.familiesService.activeFamilyId),
    toObservable(this.currentViewDate)
  ]).pipe(
    switchMap(([familyId, viewDate]) => {
      if (!familyId) return of([]);

      const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
      const endOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0, 23, 59, 59);

      return runInInjectionContext(this.injector, () => {
        const eventsRef = collection(this.afs, `families/${familyId}/events`).withConverter(calendarEventConverter);
        const q = query(eventsRef, where('startAt', '>=', startOfMonth), where('startAt', '<=', endOfMonth));
        return collectionData(q);
      });
    })
  );

  private readonly upcomingEvents$ = toObservable(this.familiesService.activeFamilyId).pipe(
    switchMap(familyId => {
      if (!familyId) return of([]);
      return runInInjectionContext(this.injector, () => {
        const eventsRef = collection(this.afs, `families/${familyId}/events`).withConverter(calendarEventConverter);
        const q = query(eventsRef, where('startAt', '>=', new Date()), orderBy('startAt', 'asc'));
        return collectionData(q);
      });
    })
  );

  private readonly monthlyFirestoreEvents = toSignal(this.monthlyEvents$, { initialValue: [] });
  private readonly upcomingFirestoreEvents = toSignal(this.upcomingEvents$, { initialValue: [] });

  public readonly eventsForCurrentMonth = computed(() => {
    const events = this.monthlyFirestoreEvents();
    const members = this.familiesService.activeFamilyMembers();
    const viewDate = this.currentViewDate();
    const customEvents = events.map(e => this.addOwnerColor(e, members));
    const birthdayEvents = this.generateBirthdaysForMonth(members, viewDate);
    return [...customEvents, ...birthdayEvents].sort((a, b) => a.start.getTime() - b.start.getTime());
  });

  public readonly upcomingEvents = computed(() => {
    const events = this.upcomingFirestoreEvents();
    const members = this.familiesService.activeFamilyMembers();
    const customEvents = events.map(e => this.addOwnerColor(e, members));
    const birthdayEvents = this.generateUpcomingBirthdays(members);
    return [...customEvents, ...birthdayEvents].sort((a, b) => a.start.getTime() - b.start.getTime());
  });


  // --- Sub-Features ---

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

  // --- Core Operations ---

  async createEvent(data: Partial<CalendarEvent>): Promise<void> {
    const familyId = this.familiesService.activeFamilyId();
    const user = this.authService.currentUser();
    const members = this.familiesService.activeFamilyMembers();
    if (!familyId || !user || !data.start) return;

    const invitedUserIds = data.invitedUserIds || members.map(m => m.uid);
    const rsvps = invitedUserIds.reduce((acc, uid) => {
      acc[uid] = 'pending';
      return acc;
    }, {} as { [userId: string]: 'attending' | 'maybe' | 'not_attending' | 'pending' });
    rsvps[user.uid] = 'attending';

    const newEvent: CalendarEvent = {
      id: '', // Firestore will generate
      title: data.title || 'New Event',
      start: data.start,
      end: data.end || data.start,
      isAllDay: data.isAllDay ?? true,
      location: data.location || '',
      description: data.description || '',
      createdBy: user.uid,
      invitedUserIds,
      rsvps,
      type: 'custom'
    };

    const col = collection(this.afs, `families/${familyId}/events`).withConverter(calendarEventConverter);
    await addDoc(col, newEvent);
  }

  async updateRsvp(eventId: string, status: 'attending' | 'maybe' | 'not_attending'): Promise<void> {
    const familyId = this.familiesService.activeFamilyId();
    const user = this.authService.currentUser();
    if (!familyId || !user) return;
    const eventRef = doc(this.afs, `families/${familyId}/events/${eventId}`);
    await updateDoc(eventRef, { [`rsvps.${user.uid}`]: status });
  }

  async deleteEvent(eventId: string): Promise<void> {
    const familyId = this.familiesService.activeFamilyId();
    if (!familyId) return;
    await deleteDoc(doc(this.afs, `families/${familyId}/events/${eventId}`));
  }

  // --- Helpers ---
  private addOwnerColor(event: CalendarEvent, members: readonly FamilyMember[]): CalendarEvent {
    const creator = members.find(m => m.uid === event.createdBy);
    return { ...event, ownerColor: creator?.color || '#BB7F6A' };
  }

  private generateBirthdaysForMonth(members: readonly FamilyMember[], viewDate: Date): CalendarEvent[] {
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();

    return members
      .filter(m => {
        if (!m.birthday) return false;
        const bMonth = new Date(m.birthday).getMonth();
        return bMonth === month;
      })
      .map(m => {
        const bDate = new Date(m.birthday!);
        const thisYearBday = new Date(year, month, bDate.getDate() + 1);
        return {
          id: `bday_${m.uid}_${year}`,
          title: `${m.name}'s Birthday`,
          start: thisYearBday,
          end: thisYearBday,
          isAllDay: true,
          type: 'birthday',
          rsvps: {},
          invitedUserIds: [],
          ownerColor: m.color || 'gold'
        };
      });
  }

  private generateUpcomingBirthdays(members: readonly FamilyMember[]): CalendarEvent[] {
    const today = new Date();
    const currentYear = today.getFullYear();

    return members
      .filter(m => m.birthday)
      .map(m => {
        const birthDate = new Date(m.birthday! + 'T00:00:00');
        let targetDate = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());

        if (targetDate < today) {
          targetDate.setFullYear(currentYear + 1);
        }

        return {
          id: `bday_up_${m.uid}`,
          title: `${m.name}'s Birthday`,
          start: targetDate,
          end: targetDate,
          isAllDay: true,
          type: 'birthday',
          rsvps: {},
          invitedUserIds: [],
          ownerColor: m.color || 'gold'
        } as CalendarEvent;
      });
  }
}
