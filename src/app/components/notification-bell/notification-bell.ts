import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
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
  template: `
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

    <mat-menu #notificationMenu="matMenu" xPosition="before" class="notification-menu-panel">
      <div class="menu-header" (click)="$event.stopPropagation()">
        <h3>Notifications</h3>
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
              <span class="notif-time">{{ notif.createdAt?.toDate() | date:'short' }}</span>
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
    .bell-button {
      color: #555;
    }

    /* Customizing the menu panel via global styles might be needed, 
       but we can style the content inside. */
    
    .menu-header {
      padding: 12px 16px;
      border-bottom: 1px solid #f0f0f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      outline: none;
    }

    .menu-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-color);
    }

    .mark-read-btn {
      background: none;
      border: none;
      color: var(--accent-color);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
    }
    
    .mark-read-btn:hover {
      background-color: rgba(0,0,0,0.05);
    }

    .notification-list {
      max-height: 400px;
      overflow-y: auto;
      overflow-x: hidden;
      min-width: 280px;
      max-width: 320px;
    }

    .notification-item {
      height: auto !important; /* Override mat-menu-item fixed height */
      padding: 12px 16px !important;
      line-height: normal !important;
      display: flex;
      align-items: flex-start;
      white-space: normal !important; /* Allow text wrapping */
    }

    .notification-item.unread {
      background-color: #f0f7ff;
    }

    .item-icon {
      margin-right: 12px;
      color: #666;
    }

    .notif-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .notif-body {
      margin: 0;
      font-size: 0.9rem;
      color: var(--text-color);
    }

    .notif-time {
      font-size: 0.75rem;
      color: #999;
    }

    .unread-dot {
      width: 8px;
      height: 8px;
      background-color: var(--accent-color);
      border-radius: 50%;
      margin-left: 8px;
      margin-top: 6px;
    }

    .empty-state {
      padding: 32px;
      text-align: center;
      color: #999;
      font-size: 0.9rem;
    }
  `]
})
export class NotificationBell {
  private notifService = inject(NotificationService);

  notifications = this.notifService.notifications;
  unreadCount = this.notifService.unreadCount;

  markAllRead() {
    this.notifService.markAllAsRead();
  }

  onNotificationClick(notif: any) {
    if (!notif.read) {
      this.notifService.markAsRead(notif.id);
    }
  }
}
