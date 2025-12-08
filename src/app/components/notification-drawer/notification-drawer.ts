import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { NotificationService, Notification } from '../../core/notifications';
import { Families } from '../../core/families';
import { UiService } from '../../core/ui';

@Component({
    selector: 'app-notification-drawer',
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatIconModule, MatListModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="drawer-header">
      <h3>Notifications</h3>
      <button mat-icon-button (click)="uiService.closeNotificationDrawer()">
        <mat-icon class="material-symbols-rounded">close</mat-icon>
      </button>
    </div>

    @if (unreadCount() > 0) {
      <div class="actions-row">
        <button class="mark-read-btn" (click)="notifService.markAllAsRead()">
          Mark all as read
        </button>
      </div>
    }

    <div class="notification-list">
      @for (notif of notifications(); track notif.id) {
        <div class="notification-item" [class.unread]="!notif.read" (click)="onNotificationClick(notif)">
          <div class="icon-wrapper">
             <mat-icon class="material-symbols-rounded">{{ notif.icon || 'notifications' }}</mat-icon>
             @if (!notif.read) {
               <span class="unread-dot"></span>
             }
          </div>
          <div class="content">
            <p class="body">{{ notif.body }}</p>
            <span class="time">{{ notif.createdAt.toDate() | date:'short' }}</span>
          </div>
        </div>
      } @empty {
        <div class="empty-state">
          <mat-icon class="material-symbols-rounded">notifications_off</mat-icon>
          <p>No notifications yet</p>
        </div>
      }
    </div>
  `,
    styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #FDFBF7; /* Vintage Stationery */
      width: 100%;
    }

    .drawer-header {
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(0,0,0,0.05);
      
      h3 {
        margin: 0;
        font-family: 'Roboto Mono', monospace;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-size: 1.1rem;
      }
    }

    .actions-row {
      padding: 10px 20px;
      display: flex;
      justify-content: flex-end;
      border-bottom: 1px solid rgba(0,0,0,0.03);
    }

    .mark-read-btn {
      background: none;
      border: none;
      color: var(--accent-color);
      font-weight: 600;
      cursor: pointer;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
      
      &:hover { text-decoration: underline; }
    }

    .notification-list {
      flex: 1;
      overflow-y: auto;
    }

    .notification-item {
      display: flex;
      padding: 20px;
      border-bottom: 1px solid rgba(0,0,0,0.05);
      cursor: pointer;
      transition: background 0.2s;
      gap: 16px;

      &:hover {
        background: rgba(0,0,0,0.02);
      }
      
      &.unread {
        background-color: rgba(229, 168, 155, 0.08); /* faint accent tint */
        
        &:hover {
           background-color: rgba(229, 168, 155, 0.15);
        }
        
        .icon-wrapper mat-icon {
          color: var(--accent-color);
        }
      }
    }

    .icon-wrapper {
      position: relative;
      color: #999;
      flex-shrink: 0;
      
      .unread-dot {
        position: absolute;
        top: -2px;
        right: -2px;
        width: 10px;
        height: 10px;
        background: var(--accent-color);
        border-radius: 50%;
        border: 2px solid #FDFBF7;
      }
    }

    .content {
      flex: 1;
      
      .body {
        margin: 0 0 6px 0;
        font-size: 0.95rem;
        line-height: 1.4;
        color: #333;
      }
      
      .time {
        font-size: 0.75rem;
        color: #888;
        font-family: 'Roboto Mono', monospace;
      }
    }

    .empty-state {
      padding: 60px 20px;
      text-align: center;
      color: #999;
      
      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
        opacity: 0.5;
      }
      
      p { margin: 0; font-style: italic; }
    }
  `]
})
export class NotificationDrawer {
    notifService = inject(NotificationService);
    familiesService = inject(Families);
    uiService = inject(UiService);
    router = inject(Router);

    notifications = this.notifService.notifications;
    unreadCount = this.notifService.unreadCount;

    async onNotificationClick(notif: Notification) {
        if (!notif.read) {
            this.notifService.markAsRead(notif.id);
        }

        this.uiService.closeNotificationDrawer();

        const currentFamilyId = this.familiesService.activeFamilyId();
        if (notif.familyId && notif.familyId !== currentFamilyId) {
            try {
                await this.familiesService.setActiveFamily(notif.familyId);
            } catch (err) {
                console.error('Failed to switch family context', err);
            }
        }

        if (notif.link) {
            this.router.navigateByUrl(notif.link);
        }
    }
}
