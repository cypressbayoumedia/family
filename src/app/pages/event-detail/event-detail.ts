import { Component, input, output, inject, signal, computed } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Calendar, CalendarEvent } from '../../core/calendar';
import { EventService, EventItem, ChatMessage } from '../../core/event-features';
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
  private eventService = inject(EventService);
  private authService = inject(AuthService);
  private familiesService = inject(Families);

  currentUser = this.authService.currentUser;
  members = this.familiesService.activeFamilyMembers;

  activeTab = signal<'details' | 'items' | 'chat'>('details');

  newItemName = signal('');
  chatInput = signal('');

  private eventId = computed(() => this.event().id);

  private items$ = toObservable(this.eventId).pipe(
    switchMap(id => id ? this.eventService.getEventItems(id) : of([]))
  );
  items = toSignal(this.items$, { initialValue: [] as EventItem[] });

  private chatMessages$ = toObservable(this.eventId).pipe(
    switchMap(id => id ? this.eventService.getEventChat(id) : of([]))
  );
  chatMessages = toSignal(this.chatMessages$, { initialValue: [] as ChatMessage[] });



  async addItem() {
    const eventId = this.eventId();
    const itemName = this.newItemName().trim();
    if (eventId && itemName) {
      await this.eventService.addEventItem(eventId, itemName);
      this.newItemName.set('');
    }
  }

  async deleteItem(item: EventItem) {
    const eventId = this.eventId();
    if (eventId && item.id) {
      if (confirm('Are you sure you want to delete this item?')) {
        await this.eventService.deleteEventItem(eventId, item.id);
      }
    }
  }

  toggleClaim(item: EventItem, claim: boolean) {
    const eventId = this.eventId();
    if (eventId && item.id) {
      this.eventService.claimEventItem(eventId, item.id, claim);
    }
  }

  async sendMessage() {
    const eventId = this.eventId();
    const text = this.chatInput().trim();
    if (eventId && text) {
      await this.eventService.postMessage(eventId, text);
      this.chatInput.set('');
    }
  }
}
