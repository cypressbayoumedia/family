import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule,DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { Calendar, CalendarEvent } from '../../core/calendar';
import { AuthService } from '../../core/auth';

@Component({
  selector: 'app-calendar-page',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './calendar-page.html',
  styleUrls: ['./calendar-page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarPage {
  private calendarService = inject(Calendar);
  authService = inject(AuthService);

  events$: Observable<CalendarEvent[]>;
  currentUser = this.authService.currentUser;

  showCreateForm = signal(false);
  newEventTitle = signal('');
  newEventDate = signal('');

  constructor() {
    this.events$ = this.calendarService.getUpcomingEvents();
  }

  async createEvent(): Promise<void> {
    if (!this.newEventTitle() || !this.newEventDate()) return;
    
    await this.calendarService.createEvent({
      title: this.newEventTitle(),
      start: new Date(this.newEventDate() + "T00:00:00"), // Ensure it's a valid date
    });
    
    this.showCreateForm.set(false);
    this.newEventTitle.set('');
    this.newEventDate.set('');
  }

  updateRsvp(eventId: string, status: 'attending' | 'maybe' | 'not_attending'): void {
    this.calendarService.updateRsvp(eventId, status);
  }

  // Helper to get the user's RSVP status for a specific event
  getUserRsvpStatus(event: CalendarEvent): string {
    const uid = this.currentUser()?.uid;
    return uid ? event.rsvps[uid] : 'pending';
  }

  deleteEvent(event: CalendarEvent): void {
    if (!event.id || event.type === 'birthday') return;

    // It's good practice to confirm a destructive action.
    const confirmation = confirm(`Are you sure you want to delete the event "${event.title}"?`);
    if (confirmation) {
      this.calendarService.deleteEvent(event.id);
    }
  }


  isEventOwner(event: CalendarEvent): boolean {
    const uid = this.currentUser()?.uid;
    return uid ? event.type === 'custom' && (event as any).createdBy === uid : false;
  }
}