import { Component, ChangeDetectionStrategy, inject, input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationService } from '../../core/notifications';

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
    RouterModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None, // Allow styling of overlay panel
  template: `
    @if (showLabel()) {
      <button class="sidebar-nav-btn" [matMenuTriggerFor]="notificationMenu">
        <mat-icon class="material-symbols-rounded">notifications</mat-icon>
        <span class="nav-label">Notifications</span>
        @if (unreadCount() > 0) {
           <span class="nav-badge">{{ unreadCount() }}</span>
        }
      </button>
    } @else {
      <button mat-icon-button [matMenuTriggerFor]="notificationMenu" class="bell-button">
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

    <!-- Add panelClass for theming -->
    <mat-menu #notificationMenu="matMenu" xPosition="after" panelClass="guide-themed-menu">
      <div class="menu-header" (click)="$event.stopPropagation()">
        <h3>NOTIFICATIONS</h3>
        @if (unreadCount() > 0) {
          <button class="mark-read-btn" (click)="markAllRead()">Mark all read</button>
        }
      </div>

      <div class="notification-list">
        @for (notif of notifications(); track notif.id) {
          <button mat-menu-item [routerLink]="notif.link" class="notification-item" [class.unread]="!notif.read" (click)="onNotificationClick(notif)">
            <mat-icon class="material-symbols-rounded item-icon">{{ notif.icon }}</mat-icon>
            <div class="notif-content">
              <p class="notif-body">{{ notif.body }}</p>
              <span class="notif-time">{{ notif.createdAt.toDate() | date:'short' }}</span>
            </div>
            @if (!notif.read) {
              <span class="unread-dot"></span>
            }
          </button>
        } @empty {
          <div class="empty-state">
            <p>No notifications yet.</p>
          </div>
        }
      </div>
    </mat-menu>
  `,
  styles: [`
    /* 
      Guide-Themed Menu Override 
      Targeting the mat-menu-panel via class added in template
    */
    .guide-themed-menu.mat-mdc-menu-panel {
      background-color: #FDFBF7; /* Vintage Stationery */
      border-radius: 24px;       /* Guide Card Radius */
      min-width: 320px;
      max-width: 360px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3); /* Deep lifted shadow */
      padding: 0;
      overflow: hidden;
      border: 1px solid rgba(0,0,0,0.05);
    }

    .guide-themed-menu .mat-mdc-menu-content {
      padding: 0 !important;
    }

    /* Header styling matching Guide 'h3' */
    .menu-header {
      padding: 20px 24px;
      border-bottom: 1px solid rgba(0,0,0,0.06);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: transparent;
    }

    .menu-header h3 {
      margin: 0;
      font-family: 'Roboto Mono', monospace; /* Monospace for header */
      font-size: 0.9rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #333;
      text-transform: uppercase;
    }

    .mark-read-btn {
      background: none;
      border: none;
      color: var(--accent-color);
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .mark-read-btn:hover {
      text-decoration: underline;
    }

    /* List Area */
    .notification-list {
      max-height: 480px;
      overflow-y: auto;
    }

    /* Items */
    .notification-item {
      height: auto !important;
      min-height: 72px;
      padding: 16px 24px !important;
      display: flex;
      align-items: flex-start;
      border-bottom: 1px solid rgba(0,0,0,0.03);
      white-space: normal !important;
    }
    
    .notification-item:last-child {
      border-bottom: none;
    }

    .notification-item.unread {
      background-color: rgba(229, 168, 155, 0.08); /* faint accent tint */
    }

    .item-icon {
      margin-right: 16px;
      color: #777;
    }
    
    .notification-item.unread .item-icon {
      color: var(--accent-color); /* Highlight icon for unread */
    }

    .notif-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .notif-body {
      margin: 0;
      font-size: 0.95rem;
      color: #444;
      line-height: 1.4;
    }

    .notif-time {
      font-size: 0.75rem;
      color: #999;
      font-family: 'Roboto Mono', monospace;
    }

    .unread-dot {
      width: 8px;
      height: 8px;
      background-color: var(--accent-color);
      border-radius: 50%;
      margin-left: 12px;
      margin-top: 8px;
    }

    .empty-state {
      padding: 48px 24px;
      text-align: center;
      color: #888;
      font-style: italic;
    }

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

    /* Mobile Bottom Sheet Override */
    @media (max-width: 600px) {
      .guide-themed-menu.mat-mdc-menu-panel {
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        max-width: none !important;
        width: 100% !important;
        min-width: 100% !important;
        border-radius: 24px 24px 0 0 !important;
        margin: 0 !important;
        transform-origin: bottom !important;
      }
      
      /* Only animate if supported by overlay configs, 
         otherwise this just ensures placement. */
    }
  `]
})
export class NotificationBell {
  private notifService = inject(NotificationService);

  showLabel = input<boolean>(false); // Used for sidebar display mode

  notifications = this.notifService.notifications;
  unreadCount = this.notifService.unreadCount;
  // ... rest of class remains valid

  markAllRead() {
    this.notifService.markAllAsRead();
  }

  onNotificationClick(notif: any) {
    if (!notif.read) {
      this.notifService.markAsRead(notif.id);
    }
  }
}
