import { Component, inject, signal, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';

// Material
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatBottomSheetModule, MatBottomSheet } from '@angular/material/bottom-sheet';

// Core Services
import { AuthService } from '../../core/auth';
import { Families } from '../../core/families';
import { Calendar } from '../../core/calendar';
import { CapsulesService } from '../../core/capsules';
import { UiService } from '../../core/ui';

// UI Components
import { PostList } from '../../posts/post-list/post-list';
import { Landing } from '../landing/landing';
import { CapsuleList } from '../../components/capsule-list/capsule-list';
import { CapsuleCreate } from '../../components/capsule-create/capsule-create';
import { NotificationBell } from '../../components/notification-bell/notification-bell';
import { NotificationDrawer } from '../../components/notification-drawer/notification-drawer';
import { MobileProfileSheet } from '../../components/mobile-profile-sheet/mobile-profile-sheet';

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
    MatSidenavModule,
    MatBottomSheetModule,
    // Components
    PostList,
    Landing,
    CapsuleList,
    CapsuleCreate,
    NotificationBell,
    NotificationDrawer
  ],
  providers: [AuthService, Families],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  public authService = inject(AuthService);
  public familiesService = inject(Families);
  public uiService = inject(UiService);
  private calendarService = inject(Calendar);
  private capsulesService = inject(CapsulesService);
  private bottomSheet = inject(MatBottomSheet);

  // Signals
  showCreateCapsuleModal = signal(false);

  // View State
  viewMode = signal<'feed' | 'capsules'>('feed');

  constructor() {
    // Initialize view from local storage
    const saved = localStorage.getItem('homeViewPref');
    if (saved === 'feed' || saved === 'capsules') {
      this.viewMode.set(saved);
    }
  }

  setViewMode(mode: 'feed' | 'capsules') {
    this.viewMode.set(mode);
    localStorage.setItem('homeViewPref', mode);
  }

  // Data Signals
  capsules = toSignal(this.capsulesService.getActiveCapsules(), { initialValue: [] });

  // Computed signal for the count of upcoming events
  upcomingEventsCount = computed(() => this.calendarService.upcomingEvents().length);

  switchFamily(familyId: string) {
    this.authService.switchActiveFamily(familyId);
  }

  openMobileProfile() {
    this.bottomSheet.open(MobileProfileSheet);
  }
}
