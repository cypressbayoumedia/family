import { Component, ChangeDetectionStrategy, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../core/notifications';
import { UiService } from '../../core/ui';

// Material
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showLabel()) {
      <button class="sidebar-nav-btn" (click)="toggleDrawer()">
        <mat-icon class="material-symbols-rounded">notifications</mat-icon>
        <span class="nav-label">Notifications</span>
        @if (unreadCount() > 0) {
           <span class="nav-badge">{{ unreadCount() }}</span>
        }
      </button>
    } @else {
      <button mat-icon-button (click)="toggleDrawer()" class="bell-button">
        <mat-icon 
          [matBadge]="unreadCount() || 0" 
          [matBadgeHidden]="unreadCount() === 0" 
          matBadgeColor="warn"
          aria-hidden="false"
          aria-label="Notifications"
          class="material-symbols-rounded">
          notifications
        </mat-icon>
      </button>
    }
  `,
  styles: [`
    /* Sidebar Button Styles (Preserved) */
    .sidebar-nav-btn {
       display: flex;
       align-items: center;
       gap: 0.75rem;
       padding: 0.75rem 1rem;
       width: 100%;
       background: none;
       border: none;
       border-radius: 99px;
       color: var(--text-secondary, #5c5c5c);
       font-family: var(--font-heading);
       font-weight: 600;
       font-size: 1.1rem;
       transition: all 0.2s ease;
       cursor: pointer;
       text-align: left;
    }

    .sidebar-nav-btn:hover {
       background-color: rgba(0,0,0,0.03);
       color: var(--text-color);
    }

    .sidebar-nav-btn .material-symbols-rounded {
       font-size: 1.5rem;
    }

    .sidebar-nav-btn .nav-badge {
       margin-left: auto;
       background-color: var(--error-color);
       color: white;
       font-size: 0.75rem;
       font-weight: 700;
       padding: 0.15rem 0.5rem;
       border-radius: 99px;
    }
    
    .cursor-pointer {
      cursor: pointer;
    }
  `]
})
export class NotificationBell {
  private notifService = inject(NotificationService);
  private uiService = inject(UiService);

  showLabel = input<boolean>(false); // Used for sidebar display mode

  unreadCount = this.notifService.unreadCount;

  toggleDrawer() {
    this.uiService.toggleNotificationDrawer();
  }
}
