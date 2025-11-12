import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, serverTimestamp, query, orderBy, collectionData, doc, updateDoc, where, Timestamp,deleteDoc } from '@angular/fire/firestore';
import { Observable, combineLatest, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';

import { Families, FamilyMember } from './families';
import { AuthService } from './auth';

// Interface for a Firestore event document
export interface EventDocument {
  id?: string;
  title: string;
  startAt: Timestamp; // Use Firestore Timestamp for queries
  endAt: Timestamp;
  isAllDay: boolean;
  createdBy: string;
  invitedUserIds: string[];
  rsvps: { [key: string]: 'attending' | 'maybe' | 'not_attending' | 'pending' };
}

// Interface for the rich event object our app will use
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  isAllDay: boolean;
  type: 'custom' | 'birthday';
  rsvps: { [key: string]: 'attending' | 'maybe' | 'not_attending' | 'pending' };
  relatedUserId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class Calendar {
  private afs = inject(Firestore);
  private familiesService = inject(Families);
  private authService = inject(AuthService);

  /**
   * Gets a merged and sorted list of all upcoming family events (custom + birthdays).
   */
  getUpcomingEvents(): Observable<CalendarEvent[]> {
    const familyId$ = toObservable(this.familiesService.activeFamilyId);
    const familyMembers$ = toObservable(this.familiesService.activeFamilyMembers);

    return familyId$.pipe(
      switchMap(familyId => {
        if (!familyId) return of([]);

        const customEvents$ = this.getCustomEvents(familyId);
        
        return combineLatest([customEvents$, familyMembers$]).pipe(
          map(([customEvents, members]) => {
            const birthdayEvents = this.generateBirthdayEvents(members);
            const allEvents = [...customEvents, ...birthdayEvents];
            return allEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
          })
        );
      })
    );
  }

  /**
   * Adds a new custom event to the family's calendar.
   */
  async createEvent(eventData: { title: string; start: Date; }): Promise<void> {
    const familyId = this.familiesService.activeFamilyId();
    const user = this.authService.currentUser();
    const members = this.familiesService.activeFamilyMembers();
    if (!familyId || !user) throw new Error("Not authorized.");

    const invitedUserIds = members.map(m => m.uid);
    // Initialize RSVPs with all invited members as 'pending'
    const rsvps = invitedUserIds.reduce((acc, uid) => ({ ...acc, [uid]: 'pending' }), {});

    const eventsCollection = collection(this.afs, `families/${familyId}/events`);
    await addDoc(eventsCollection, {
      title: eventData.title,
      startAt: Timestamp.fromDate(eventData.start),
      endAt: Timestamp.fromDate(eventData.start), // MVP: end is same as start
      isAllDay: true, // MVP: all events are all-day
      createdBy: user.uid,
      invitedUserIds,
      rsvps,
    });
  }

  /**
   * Updates the current user's RSVP status for a given event using dot notation.
   */
  async updateRsvp(eventId: string, status: 'attending' | 'maybe' | 'not_attending'): Promise<void> {
    const familyId = this.familiesService.activeFamilyId();
    const user = this.authService.currentUser();
    if (!familyId || !user || !eventId) return;

    const eventDocRef = doc(this.afs, `families/${familyId}/events/${eventId}`);
    
    // Use dot notation to update a specific field within the 'rsvps' map.
    // This is highly efficient and avoids race conditions.
    const rsvpField = `rsvps.${user.uid}`;
    await updateDoc(eventDocRef, {
      [rsvpField]: status
    });
  }

  /**
   * Fetches upcoming custom events from Firestore.
   */
  private getCustomEvents(familyId: string): Observable<CalendarEvent[]> {
    const eventsCollection = collection(this.afs, `families/${familyId}/events`);
    // Query for events that start today or in the future
    const q = query(eventsCollection, where('startAt', '>=', new Date()), orderBy('startAt', 'asc'));
    
    return collectionData(q, { idField: 'id' }).pipe(
      map(events => events.map(event => this.docToEvent(event as EventDocument)))
    );
  }

  /**
   * Dynamically generates birthday events from the member list for the upcoming year.
   */
  private generateBirthdayEvents(members: FamilyMember[]): CalendarEvent[] {
    const today = new Date();
    const currentYear = today.getFullYear();
    const events: CalendarEvent[] = [];
    
    for (const member of members) {
      if (member.birthday) { // Expects 'YYYY-MM-DD'
        const birthDate = new Date(`${member.birthday}T00:00:00`);
        let thisYearsBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());

        // If the birthday has already passed this year, show next year's birthday
        if (thisYearsBirthday < today) {
          thisYearsBirthday.setFullYear(currentYear + 1);
        }

        events.push({
          id: `birthday_${member.uid}`, // Create a stable ID
          title: `${member.name}'s Birthday`,
          start: thisYearsBirthday,
          end: thisYearsBirthday,
          isAllDay: true,
          type: 'birthday',
          rsvps: {},
          relatedUserId: member.uid
        });
      }
    }
    return events;
  }
  
  /**
   * Converts a Firestore event document to a client-side CalendarEvent object.
   */
  private docToEvent(doc: EventDocument): CalendarEvent {
    return {
      ...doc,
      id: doc.id!,
      start: doc.startAt.toDate(),
      end: doc.endAt.toDate(),
      type: 'custom',
    };
  }

  async deleteEvent(eventId: string): Promise<void> {
    const familyId = this.familiesService.activeFamilyId();
    const user = this.authService.currentUser();
    if (!familyId || !user || !eventId) return;
    const eventDocRef = doc(this.afs, `families/${familyId}/events/${eventId}`);

    await deleteDoc(eventDocRef);
  }
}