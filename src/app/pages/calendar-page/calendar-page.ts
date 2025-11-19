import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Calendar, CalendarEvent } from '../../core/calendar';
import { AuthService } from '../../core/auth';
import { EventDetail } from '../event-detail/event-detail';

@Component({
  selector: 'app-calendar-page',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, EventDetail],
  templateUrl: './calendar-page.html',
  styleUrls: ['./calendar-page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarPage {
  calendarService = inject(Calendar);
  authService = inject(AuthService);

  // Current Month View State
  viewDate = signal(new Date());
  
  // Events source
  events$ = this.calendarService.getEventsForCurrentMonth();

  // Logic to build the calendar grid
  calendarGrid = computed(() => {
    const date = this.viewDate();
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    
    // Previous Month Padding
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ day: null, date: null }); 
    }
    
    // Actual Days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ 
        day: i, 
        date: new Date(year, month, i),
        isToday: this.isSameDate(new Date(), new Date(year, month, i))
      });
    }

    return days;
  });

  // Selected Event for Modal
  selectedEvent = signal<CalendarEvent | null>(null);
  showCreateModal = signal(false);

  // Simple Create Form Data
  newEventData = {   
    title: '', 
    date: '', 
    time: '12:00', // Default Time
    location: '', 
    description: '',
     type: 'custom' 
    };

  changeMonth(delta: number) {
    const current = this.viewDate();
    const newDate = new Date(current.getFullYear(), current.getMonth() + delta, 1);
    this.viewDate.set(newDate);
    this.calendarService.currentViewDate$.next(newDate);
  }

  openEvent(event: CalendarEvent) {
    this.selectedEvent.set(event);
  }

  // Helper to filter events for a specific day in the grid
  getEventsForDay(date: Date | null, allEvents: CalendarEvent[] | null): CalendarEvent[] {
    if (!date || !allEvents) return [];
    return allEvents.filter(e => this.isSameDate(e.start, date));
  }

  private isSameDate(d1: Date, d2: Date): boolean {
    return d1.getDate() === d2.getDate() && 
           d1.getMonth() === d2.getMonth() && 
           d1.getFullYear() === d2.getFullYear();
  }

  async createFullEvent() {
    if(!this.newEventData.title || !this.newEventData.date) return;

    // Merge Date and Time strings into one Date object
    const dateTimeString = `${this.newEventData.date}T${this.newEventData.time}:00`;
    const startDate = new Date(dateTimeString);

    await this.calendarService.createEvent({
      title: this.newEventData.title,
      start: startDate,
      end: startDate, // MVP: 1 hour duration or same end time
      isAllDay: false, // We now have time, so it's not always all-day
      location: this.newEventData.location,
      description: this.newEventData.description
    });

    // Reset and close
    this.showCreateModal.set(false);
    this.newEventData = { title: '', date: '', time: '12:00', location: '', description: '', type: 'custom' };
  }

  openCreateModal(date: Date | null) {
    if (!date) return; // Ignore empty padding days

    // Format Date to YYYY-MM-DD for the input field
    // We use this trick to ensure we get the Local date, not UTC
    const offset = date.getTimezoneOffset(); 
    const localDate = new Date(date.getTime() - (offset * 60 * 1000)); 
    const dateString = localDate.toISOString().split('T')[0];

    this.newEventData = { 
      title: '', 
      date: dateString, // <--- Pre-fill the date
      time: '12:00', 
      location: '', 
      description: '',
      type: 'custom' 
    };
    
    this.showCreateModal.set(true);
  }

}