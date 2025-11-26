import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Calendar, CalendarEvent } from '../../core/calendar';
import { AuthService } from '../../core/auth';
import { EventDetail } from '../event-detail/event-detail';
import { RouterLink } from '@angular/router'

@Component({
  selector: 'app-calendar-page',
  imports: [CommonModule, FormsModule, DatePipe, EventDetail, RouterLink],
  templateUrl: './calendar-page.html',
  styleUrls: ['./calendar-page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarPage {
  calendarService = inject(Calendar);
  authService = inject(AuthService);

  // Signals for view state
  viewDate = this.calendarService.currentViewDate;
  viewMode = signal<'calendar' | 'list'>(
    (localStorage.getItem('calViewPref') as 'calendar' | 'list') || 'calendar'
  );

  // Directly use the signals from the service
  monthEvents = this.calendarService.eventsForCurrentMonth;
  listEvents = this.calendarService.upcomingEvents;

  setViewMode(mode: 'calendar' | 'list') {
    this.viewMode.set(mode);
    localStorage.setItem('calViewPref', mode);
  }

  getEventColor(event: CalendarEvent): string {
    if (event.type === 'birthday') return '#e91e63';
    return event.ownerColor || '#bcaaa4';
  }

  calendarGrid = computed(() => {
    const date = this.viewDate();
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ day: null, date: null, isToday: false }); 
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const dayDate = new Date(year, month, i);
      days.push({ 
        day: i, 
        date: dayDate,
        isToday: this.isSameDate(new Date(), dayDate)
      });
    }

    return days;
  });

  selectedEvent = signal<CalendarEvent | null>(null);
  showCreateModal = signal(false);

  newEventData = {   
    title: '', 
    date: '', 
    time: '12:00',
    location: '', 
    description: '',
    type: 'custom' 
  };

  changeMonth(delta: number) {
    const current = this.viewDate();
    const newDate = new Date(current.getFullYear(), current.getMonth() + delta, 1);
    this.viewDate.set(newDate);
  }

  openEvent(event: CalendarEvent) {
    this.selectedEvent.set(event);
  }

  getEventsForDay(date: Date | null, allEvents: readonly CalendarEvent[] | null): CalendarEvent[] {
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

    const dateTimeString = `${this.newEventData.date}T${this.newEventData.time}:00`;
    const startDate = new Date(dateTimeString);

    await this.calendarService.createEvent({
      title: this.newEventData.title,
      start: startDate,
      end: startDate, 
      isAllDay: false, 
      location: this.newEventData.location,
      description: this.newEventData.description
    });

    this.showCreateModal.set(false);
    this.newEventData = { title: '', date: '', time: '12:00', location: '', description: '', type: 'custom' };
  }

  openCreateModal(date: Date | null) {
    if (!date) return;

    const offset = date.getTimezoneOffset(); 
    const localDate = new Date(date.getTime() - (offset * 60 * 1000)); 
    const dateString = localDate.toISOString().split('T')[0];

    this.newEventData = { 
      title: '', 
      date: dateString, 
      time: '12:00', 
      location: '', 
      description: '',
      type: 'custom' 
    };
    
    this.showCreateModal.set(true);
  }
}
