import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, serverTimestamp, query, orderBy, collectionData, doc, updateDoc, arrayUnion, arrayRemove, where, getDocs } from '@angular/fire/firestore';
import { Observable, combineLatest, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Families, FamilyMember } from './families';
import { AuthService } from './auth';
import { toObservable } from '@angular/core/rxjs-interop';

// Define the interface for a calendar event
export interface CalendarEvent {
  id?: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  type: 'custom' | 'birthday';
  rsvps?: { uid: string; name: string; photoURL?: string | null; status: 'going' | 'not_going' | 'maybe' }[];
  relatedUserId?: string; // For linking birthdays back to a user
}

@Injectable({
  providedIn: 'root',
})
export class Calendar {
  private afs = inject(Firestore);
  private familiesService = inject(Families);
  private authService = inject(AuthService);

  /**
   * Gets a merged and sorted list of all family events (custom + birthdays).
   * This is the primary method for the calendar page.
   */
  getEvents(): Observable<CalendarEvent[]> {
    const familyId$ = toObservable(this.familiesService.activeFamilyId);
    const familyMembers$ = toObservable(this.familiesService.activeFamilyMembers);

    return familyId$.pipe(
      switchMap(familyId => {
        if (!familyId) return of([]);

        const customEvents$ = this.getCustomEvents(familyId);
        
        // Combine the stream of custom events with the list of family members
        return combineLatest([customEvents$, familyMembers$]).pipe(
          map(([customEvents, members]) => {
            const birthdayEvents = this.generateBirthdayEvents(members);
            const allEvents = [...customEvents, ...birthdayEvents];
            // Sort all events by their start date, earliest first
            return allEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
          })
        );
      })
    );
  }

  /**
   * Adds a new custom event to the family's calendar.
   */
  async addEvent(eventData: { title: string; start: Date; allDay: boolean }): Promise<void> {
    const familyId = this.familiesService.activeFamilyId();
    const user = this.authService.currentUser();
    if (!familyId || !user) throw new Error("Family or user not available.");

    const eventsCollection = collection(this.afs, `families/${familyId}/events`);
    await addDoc(eventsCollection, {
      ...eventData,
      end: eventData.start, // For simple MVP, start and end are the same
      type: 'custom',
      createdBy: user.uid,
      rsvps: []
    });
  }

  /**
   * Updates the current user's RSVP status for a given event.
   */
  async updateRsvp(eventId: string, status: 'going' | 'not_going' | 'maybe'): Promise<void> {
    const familyId = this.familiesService.activeFamilyId();
    const user = this.authService.currentUser();
    if (!familyId || !user || !eventId) return;

    const eventDocRef = doc(this.afs, `families/${familyId}/events/${eventId}`);
    
    // First, remove any existing RSVP from this user
    const existingRsvpQuery = query(collection(this.afs, `families/${familyId}/events`), where('rsvps', 'array-contains', { uid: user.uid }));
    const querySnapshot = await getDocs(existingRsvpQuery);
    let existingStatus = null;
    if (!querySnapshot.empty) {
      const docData = querySnapshot.docs[0].data();
      const userRsvp = docData['rsvps'].find((rsvp: any) => rsvp.uid === user.uid);
      if(userRsvp) existingStatus = userRsvp;
    }
    if (existingStatus) {
      await updateDoc(eventDocRef, {
        rsvps: arrayRemove(existingStatus)
      });
    }

    // Now, add the new RSVP
    await updateDoc(eventDocRef, {
      rsvps: arrayUnion({
        uid: user.uid,
        name: user.displayName,
        photoURL: user.photoURL,
        status: status
      })
    });
  }

  /**
   * Private helper to fetch only the custom events from Firestore.
   */
  private getCustomEvents(familyId: string): Observable<CalendarEvent[]> {
    const eventsCollection = collection(this.afs, `families/${familyId}/events`);
    const q = query(eventsCollection, orderBy('start', 'asc'));
    
    return collectionData(q, { idField: 'id' }).pipe(
      map(events => events.map(event => ({
        ...event,
        // Convert Firestore Timestamps to JavaScript Date objects
        start: (event['start'] as any).toDate(),
        end: (event['end'] as any).toDate()
      } as CalendarEvent)))
    );
  }

  /**
   * Private helper to dynamically generate birthday events from the member list.
   */
  private generateBirthdayEvents(members: FamilyMember[]): CalendarEvent[] {
    const currentYear = new Date().getFullYear();
    const events: CalendarEvent[] = [];
    
    for (const member of members) {
      if (member.birthday) { // Assuming birthday is 'YYYY-MM-DD'
        const birthDate = new Date(`${member.birthday}T00:00:00`);
        events.push({
          title: `${member.name}'s Birthday`,
          start: new Date(currentYear, birthDate.getMonth(), birthDate.getDate()),
          end: new Date(currentYear, birthDate.getMonth(), birthDate.getDate()),
          allDay: true,
          type: 'birthday',
          relatedUserId: member.uid
        });
      }
    }
    return events;
  }
}
