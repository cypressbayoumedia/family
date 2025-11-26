import { Component, input, output, inject, signal, computed } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Calendar, CalendarEvent, EventItem, ChatMessage } from '../../core/calendar';
import { AuthService } from '../../core/auth';
import { Families, FamilyMember } from '../../core/families';
import { of, switchMap } from 'rxjs';

@Component({
  selector: 'app-event-detail',
  imports: [CommonModule, FormsModule],
  templateUrl: './event-detail.html',
  styleUrls: ['./event-detail.css']
})
export class EventDetail {
  event = input.required<CalendarEvent>();
  close = output<void>();

  private calendarService = inject(Calendar);
  private authService = inject(AuthService);
  private familiesService = inject(Families); 
  
  currentUser = this.authService.currentUser;
  members = this.familiesService.activeFamilyMembers;

  activeTab = signal<'details' | 'items' | 'chat'>('details');
  
  newItemName = signal('');
  chatInput = signal('');

  private eventId = computed(() => this.event().id);

  private items$ = toObservable(this.eventId).pipe(
    switchMap(id => id ? this.calendarService.getEventItems(id) : of([]))
  );
  items = toSignal(this.items$, { initialValue: [] as EventItem[] });

  private chatMessages$ = toObservable(this.eventId).pipe(
    switchMap(id => id ? this.calendarService.getEventChat(id) : of([]))
  );
  chatMessages = toSignal(this.chatMessages$, { initialValue: [] as ChatMessage[] });

  myRsvp = computed(() => {
    const user = this.currentUser();
    const rsvps = this.event().rsvps;
    if (!user || !rsvps) return 'pending';
    return rsvps[user.uid] || 'pending';
  });

  guestsByStatus = computed(() => (status: 'attending' | 'maybe' | 'not_attending' | 'pending') => {
    const rsvps = this.event().rsvps;
    const members = this.members();
    if (!rsvps) return [];
    
    return Object.entries(rsvps)
      .filter(([_, s]) => s === status)
      .map(([uid]) => members.find(m => m.uid === uid))
      .filter((m): m is FamilyMember => !!m);
  });

  setRsvp(status: 'attending' | 'maybe' | 'not_attending') {
    const eventId = this.eventId();
    if (eventId) {
      this.calendarService.updateRsvp(eventId, status);
      // Optimistic update
      const currentEvent = this.event();
      const currentUser = this.currentUser();
      if(currentEvent && currentUser) {
        currentEvent.rsvps[currentUser.uid] = status;
      }
    }
  }

  async addItem() {
    const eventId = this.eventId();
    const itemName = this.newItemName().trim();
    if (eventId && itemName) {
      await this.calendarService.addEventItem(eventId, itemName);
      this.newItemName.set('');
    }
  }

  toggleClaim(item: EventItem, claim: boolean) {
    const eventId = this.eventId();
    if (eventId && item.id) {
      this.calendarService.claimEventItem(eventId, item.id, claim);
    }
  }

  async sendMessage() {
    const eventId = this.eventId();
    const text = this.chatInput().trim();
    if (eventId && text) {
      await this.calendarService.postMessage(eventId, text);
      this.chatInput.set('');
    }
  }
}
