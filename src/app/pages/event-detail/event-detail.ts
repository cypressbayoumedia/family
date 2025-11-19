import { Component, EventEmitter, Input, Output, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Calendar, CalendarEvent, EventItem, ChatMessage } from '../../core/calendar';
import { AuthService } from '../../core/auth';
import { Families, FamilyMember } from '../../core/families'; // Import Families
import { Observable } from 'rxjs';

@Component({
  selector: 'app-event-detail',

  imports: [CommonModule, FormsModule],
  templateUrl: './event-detail.html',
  styleUrls: ['./event-detail.css']
})
export class EventDetail implements OnInit {
  @Input({ required: true }) event!: CalendarEvent;
  @Output() close = new EventEmitter<void>();

  calendarService = inject(Calendar);
  authService = inject(AuthService);
  familiesService = inject(Families); // Inject Families Service
  
  currentUser = this.authService.currentUser();
  members = this.familiesService.activeFamilyMembers; // Signal for members

  activeTab = signal<'details' | 'items' | 'chat'>('details');
  items$!: Observable<EventItem[]>;
  chatMessages$!: Observable<ChatMessage[]>;
  
  // New Inputs
  newItemName = '';
  chatInput = '';

  ngOnInit() {
    if (this.event.type === 'custom') {
      this.items$ = this.calendarService.getEventItems(this.event.id);
      this.chatMessages$ = this.calendarService.getEventChat(this.event.id);
    }
  }

  // --- RSVP Logic ---

  get myRsvp(): string {
    if (!this.currentUser || !this.event.rsvps) return 'pending';
    return this.event.rsvps[this.currentUser.uid] || 'pending';
  }

  setRsvp(status: 'attending' | 'maybe' | 'not_attending') {
    this.calendarService.updateRsvp(this.event.id, status);
    this.event.rsvps[this.currentUser!.uid] = status; // Optimistic UI update
  }

  // Helper to get lists of members for specific statuses
  getGuestsByStatus(status: 'attending' | 'maybe' | 'not_attending' | 'pending'): FamilyMember[] {
    if (!this.event.rsvps) return [];
    
    // Filter RSVPs by status, then map to Member objects
    return Object.entries(this.event.rsvps)
      .filter(([uid, s]) => s === status)
      .map(([uid]) => this.members().find(m => m.uid === uid))
      .filter((m): m is FamilyMember => !!m); // Remove undefineds
  }

  // --- Other Actions ---
  async addItem() {
    if (!this.newItemName.trim()) return;
    await this.calendarService.addEventItem(this.event.id, this.newItemName);
    this.newItemName = '';
  }

  toggleClaim(item: EventItem, claim: boolean) {
    if(item.id) this.calendarService.claimEventItem(this.event.id, item.id, claim);
  }

  async sendMessage() {
    if (!this.chatInput.trim()) return;
    await this.calendarService.postMessage(this.event.id, this.chatInput);
    this.chatInput = '';
  }
}