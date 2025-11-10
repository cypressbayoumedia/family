import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Calendar, CalendarEvent } from '../../core/calendar';
import { AuthService } from '../../core/auth';
import { User } from '@angular/fire/auth';

// Interface for the new data structure the template needs
export interface MonthGroup {
  name: string; // e.g., "November 2025"
  events: CalendarEvent[];
}

@Component({
  selector: 'app-calendar-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar-page.html',
  styleUrls: ['./calendar-page.css']
})
export class CalendarPage {
  private calendarService = inject(Calendar);
  private authService = inject(AuthService);

  // This observable will hold the final, transformed data for the template.
  eventsByMonth$: Observable<MonthGroup[]>;
  currentUser: User | null = this.authService.currentUser();

  // --- UI State Signals ---
  showCreateForm = signal(false);
  newEventTitle = signal('');
  newEventDate = signal('');
  
  // This signal tracks which event's RSVP menu is currently open by storing its ID.
  activeRsvpMenu = signal<string | null>(null);

  constructor() {
    // We create a reactive pipeline. The `getEvents()` observable is piped through
    // our `map` operator, which transforms the flat array into a grouped array.
    this.eventsByMonth$ = this.calendarService.getEvents().pipe(
      map(events => this.groupEventsByMonth(events))
    );
  }

  /**
   * Creates a new custom event and resets the form.
   */
  async createEvent(): Promise<void> {
    if (!this.newEventTitle() || !this.newEventDate()) return;
    
    await this.calendarService.addEvent({
      title: this.newEventTitle(),
      start: new Date(this.newEventDate() + 'T00:00:00'), // Add time to avoid timezone issues
      allDay: true
    });
    
    // Reset form state
    this.showCreateForm.set(false);
    this.newEventTitle.set('');
    this.newEventDate.set('');
  }

  /**
   * Toggles the visibility of the RSVP menu for a specific event.
   */
  openRsvpMenu(eventId: string | undefined): void {
    if (!eventId) return;
    // If the same menu is already open, clicking again will close it.
    this.activeRsvpMenu.set(this.activeRsvpMenu() === eventId ? null : eventId);
  }

  /**
   * Updates the user's RSVP status for an event and closes the menu.
   */
  updateRsvp(event: CalendarEvent, status: 'going' | 'not_going' | 'maybe'): void {
    if (!event.id) return;
    this.calendarService.updateRsvp(event.id, status);
    this.activeRsvpMenu.set(null); // Close the menu after an action
  }

  /**
   * A helper function for the template to find the current user's RSVP status for an event.
   * This is what makes the RSVP button "stateful".
   */
  getUserRsvpStatus(event: CalendarEvent): 'going' | 'not_going' | 'maybe' | null {
    if (!this.currentUser || !event.rsvps) return null;
    const userRsvp = event.rsvps.find(rsvp => rsvp.uid === this.currentUser!.uid);
    return userRsvp ? userRsvp.status : null;
  }

  /**
   * The core transformation logic. Takes a flat array of events and groups
   * them into an array of MonthGroup objects.
   */
  private groupEventsByMonth(events: CalendarEvent[]): MonthGroup[] {
    if (!events || events.length === 0) return [];

    const groups: { [key: string]: CalendarEvent[] } = {};

    for (const event of events) {
      // Create a grouping key like "November 2025"
      const monthKey = event.start.toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      });

      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(event);
    }

    // Convert the grouped object (e.g., { "November 2025": [...] }) into the
    // array structure the template's @for loop needs (e.g., [{ name: "November 2025", events: [...] }]).
    return Object.keys(groups).map(key => ({
      name: key,
      events: groups[key]
    }));
  }
}