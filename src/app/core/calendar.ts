import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, query, where, orderBy, collectionData, doc, updateDoc, deleteDoc, Timestamp, getDocs } from '@angular/fire/firestore';
import { Observable, combineLatest, of, BehaviorSubject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { Families, FamilyMember } from './families';
import { AuthService } from './auth';

// --- Interfaces ---
export interface EventItem {
  id?: string;
  name: string;
  claimedByUserId: string | null;
  claimedByName: string | null;
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

@Injectable({ providedIn: 'root' })
export class Calendar {
  private afs = inject(Firestore);
  private familiesService = inject(Families);
  private authService = inject(AuthService);

  // Tracks the currently viewed month (defaults to today)
  currentViewDate$ = new BehaviorSubject<Date>(new Date());

  /**
   * Gets events for the specific month currently being viewed.
   */
  getEventsForCurrentMonth(): Observable<CalendarEvent[]> {
    const familyId$ = toObservable(this.familiesService.activeFamilyId);
    const members$ = toObservable(this.familiesService.activeFamilyMembers);

    return combineLatest([familyId$, this.currentViewDate$, members$]).pipe(
      switchMap(([familyId, viewDate, members]) => {
        if (!familyId) return of([]);

        // Calculate start/end of the month for Firestore query
        const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
        const endOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0, 23, 59, 59);

        const eventsRef = collection(this.afs, `families/${familyId}/events`);
        
        // Query: Get events that start within this month range
        // Note: This is a basic range query. 
        const q = query(
          eventsRef, 
          where('startAt', '>=', startOfMonth),
          where('startAt', '<=', endOfMonth)
        );

        return collectionData(q, { idField: 'id' }).pipe(
          map(events => {
            const customEvents = events.map(e => this.docToEvent(e, members));
            const birthdayEvents = this.generateBirthdaysForMonth(members, viewDate);
            return [...customEvents, ...birthdayEvents].sort((a, b) => a.start.getTime() - b.start.getTime());
          })
        );
      })
    );
  }

  getUpcomingEvents(): Observable<CalendarEvent[]> {
    const familyId$ = toObservable(this.familiesService.activeFamilyId);
    const members$ = toObservable(this.familiesService.activeFamilyMembers);

    return combineLatest([familyId$, members$]).pipe(
      switchMap(([familyId, members]) => {
        if (!familyId) return of([]);

        const eventsRef = collection(this.afs, `families/${familyId}/events`);
        
        // Query: All events starting from Right Now
        const q = query(
          eventsRef, 
          where('startAt', '>=', new Date()),
          orderBy('startAt', 'asc')
        );

        return collectionData(q, { idField: 'id' }).pipe(
          map(events => {
            // 1. Convert Firestore docs to Event objects
            const customEvents = events.map(e => this.docToEvent(e, members));
            
            // 2. Generate upcoming birthdays (next 12 months)
            const birthdayEvents = this.generateUpcomingBirthdays(members);
            
            // 3. Merge and Sort
            return [...customEvents, ...birthdayEvents].sort((a, b) => a.start.getTime() - b.start.getTime());
          })
        );
      })
    );
  }

  // --- Sub-Feature: Potluck ---
  
  getEventItems(eventId: string): Observable<EventItem[]> {
    const familyId = this.familiesService.activeFamilyId();
    if (!familyId) return of([]);
    // Path is now .../events/{id}/items
    const col = collection(this.afs, `families/${familyId}/events/${eventId}/items`);
    return collectionData(col, { idField: 'id' }) as Observable<EventItem[]>;
  }

  async addEventItem(eventId: string, itemName: string): Promise<void> {
    const familyId = this.familiesService.activeFamilyId();
    if (!familyId) return;
    const col = collection(this.afs, `families/${familyId}/events/${eventId}/items`);
    await addDoc(col, { name: itemName, claimedByUserId: null, claimedByName: null });
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

  // --- Sub-Feature: Discussion Board ---

  getEventChat(eventId: string): Observable<ChatMessage[]> {
    const familyId = this.familiesService.activeFamilyId();
    if (!familyId) return of([]);
    const col = collection(this.afs, `families/${familyId}/events/${eventId}/discussion`);
    const q = query(col, orderBy('createdAt', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<ChatMessage[]>;
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
    if (!familyId || !user) return;

    // Default: Invite everyone if specific IDs not provided
    const invitedUserIds = data.invitedUserIds || members.map(m => m.uid);
    const rsvps = invitedUserIds.reduce((acc, uid) => ({ ...acc, [uid]: 'pending' }), {} as Record<string, string>);
    // Auto-set creator as attending
    rsvps[user.uid] = 'attending';

    const col = collection(this.afs, `families/${familyId}/events`);
    await addDoc(col, {
      title: data.title,
      startAt: Timestamp.fromDate(data.start!),
      endAt: Timestamp.fromDate(data.end || data.start!),
      isAllDay: data.isAllDay ?? true,
      location: data.location || '',
      description: data.description || '',
      createdBy: user.uid,
      invitedUserIds,
      rsvps
    });
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
    if(!familyId) return;
    // Note: In a real app, delete subcollections (chat/potluck) via Cloud Functions to avoid orphans.
    await deleteDoc(doc(this.afs, `families/${familyId}/events/${eventId}`));
  }

  // --- Helpers ---

  private docToEvent(doc: any, members: FamilyMember[]): CalendarEvent {
    const creator = members.find(m => m.uid === doc.createdBy);
    return {
      ...doc,
      id: doc.id,
      start: doc.startAt.toDate(),
      end: doc.endAt.toDate(),
      type: 'custom',
      ownerColor: creator?.color || '#BB7F6A' // Assumes FamilyMember has a 'color' property
    };
  }

  private generateBirthdaysForMonth(members: FamilyMember[], viewDate: Date): CalendarEvent[] {
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();
    
    return members
      .filter(m => {
        if (!m.birthday) return false; // Format YYYY-MM-DD
        const bMonth = new Date(m.birthday).getMonth(); // 0-11
        // Note: This simple check ignores timezone edge cases for simplicity
        return bMonth === month;
      })
      .map(m => {
        const bDate = new Date(m.birthday!);
        const thisYearBday = new Date(year, month, bDate.getDate() + 1); // +1 handles timezone drift in simple conversions
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

  private generateUpcomingBirthdays(members: FamilyMember[]): CalendarEvent[] {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    return members
      .filter(m => m.birthday) // Only members with birthdays
      .map(m => {
        const birthDate = new Date(m.birthday! + 'T00:00:00'); // Ensure YYYY-MM-DD is parsed correctly
        let targetDate = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());

        // If birthday has passed this year, move to next year
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