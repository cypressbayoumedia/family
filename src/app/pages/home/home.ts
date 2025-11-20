import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

// Material
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';

// Core Services
import { AuthService } from '../../core/auth';
import { Families } from '../../core/families';
import { Calendar } from '../../core/calendar';
import { CapsulesService } from '../../core/capsules';

// UI Components
import { PostList } from '../../posts/post-list/post-list';
import { Landing } from '../landing/landing';
import { CapsuleList } from '../../components/capsule-list/capsule-list';
import { CapsuleCreate } from '../../components/capsule-create/capsule-create';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterModule,
    CommonModule,
    // Material
    MatMenuModule,
    MatIconModule,
    MatBadgeModule,
    MatButtonModule,
    // Components
    PostList,
    Landing,
    CapsuleList,
    CapsuleCreate
  ],
  providers: [AuthService, Families],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  public authService = inject(AuthService);
  public familiesService = inject(Families);
  private calendarService = inject(Calendar);
  private capsulesService = inject(CapsulesService);

  // Signals
  showCreateCapsuleModal = signal(false);
  
  // Data Signals
  capsules = toSignal(this.capsulesService.getActiveCapsules(), { initialValue: [] });
  
  // Converting existing Observable logic to Signal for template consistency
  upcomingEventsCount = toSignal(
    this.calendarService.getUpcomingEvents().pipe(map(events => events.length)), 
    { initialValue: 0 }
  );

  switchFamily(familyId: string) {
    this.authService.switchActiveFamily(familyId);
  }
}