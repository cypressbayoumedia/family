import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { AuthService } from '../../core/auth';
import { Families } from '../../core/families';

@Component({
  selector: 'app-mobile-profile-sheet',
  standalone: true,
  imports: [CommonModule, RouterModule, MatListModule, MatIconModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sheet-header">
      <img [src]="authService.currentUser()?.photoURL || 'https://api.dicebear.com/9.x/glass/svg?seed=' + authService.currentUser()?.displayName" 
           class="sheet-avatar" alt="User avatar">
      <div class="sheet-user-info">
        <h3>{{ authService.currentUser()?.displayName }}</h3>
        <p class="email">{{ authService.currentUser()?.email }}</p>
      </div>
    </div>

    <div class="section-title">Active Family</div>
    <div class="family-list">
      @for (family of familiesService.allUserFamilies(); track family.id) {
        <button mat-button class="family-btn" 
                [class.active]="family.id === familiesService.activeFamily()?.id"
                (click)="switchFamily(family.id)">
          @if (family.id === familiesService.activeFamily()?.id) {
            <mat-icon class="material-symbols-rounded check-icon">check_circle</mat-icon>
          } @else {
            <mat-icon class="material-symbols-rounded radio-icon">radio_button_unchecked</mat-icon>
          }
          {{ family.name }}
        </button>
      }
    </div>

    <hr class="divider">

    <mat-nav-list>
      <a mat-list-item routerLink="/chat" (click)="close()">
        <mat-icon matListItemIcon class="material-symbols-rounded">chat</mat-icon>
        <span matListItemTitle>Chat</span>
      </a>
      <a mat-list-item routerLink="/invite-members" (click)="close()">
        <mat-icon matListItemIcon class="material-symbols-rounded">group_add</mat-icon>
        <span matListItemTitle>Invite Members</span>
      </a>
      <a mat-list-item routerLink="/profile" (click)="close()">
        <mat-icon matListItemIcon class="material-symbols-rounded">account_circle</mat-icon>
        <span matListItemTitle>My Profile</span>
      </a>
      <a mat-list-item routerLink="/manage-circles" (click)="close()">
        <mat-icon matListItemIcon class="material-symbols-rounded">settings</mat-icon>
        <span matListItemTitle>Manage Circles</span>
      </a>
      <a mat-list-item routerLink="/calendar" (click)="close()">
        <mat-icon matListItemIcon class="material-symbols-rounded">calendar_month</mat-icon>
        <span matListItemTitle>Family Calendar</span>
      </a>
    </mat-nav-list>

    <div class="sheet-footer">
      <button mat-stroked-button color="warn" class="sign-out-btn" (click)="signOut()">
        <mat-icon class="material-symbols-rounded">logout</mat-icon>
        Sign Out
      </button>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      padding-bottom: 24px;
    }

    .sheet-header {
      padding: 24px 24px 16px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .sheet-avatar {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      object-fit: cover;
      background: #f0f0f0;
    }

    .sheet-user-info h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      font-family: var(--font-heading);
    }

    .sheet-user-info .email {
      margin: 4px 0 0;
      color: #666;
      font-size: 0.9rem;
    }

    .section-title {
      font-size: 0.75rem;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #888;
      padding: 8px 24px;
      margin-top: 8px;
    }

    .family-list {
      padding: 0 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .family-btn {
      width: 100%;
      justify-content: flex-start;
      padding: 8px 16px;
      font-weight: 600;
      color: #444;
      
      &.active {
        color: var(--accent-color);
        background-color: rgba(229, 168, 155, 0.1);
      }

      .material-symbols-rounded {
        margin-right: 12px;
      }
      
      .check-icon { color: var(--accent-color); }
      .radio-icon { color: #ccc; }
    }

    .divider {
      border: 0;
      border-top: 1px solid rgba(0,0,0,0.05);
      margin: 16px 0;
    }

    mat-nav-list a {
      height: 56px;
    }

    .sheet-footer {
      padding: 24px 24px 0;
    }

    .sign-out-btn {
      width: 100%;
      height: 48px;
      border-radius: 99px;
      font-weight: 700;
    }
  `]
})
export class MobileProfileSheet {
  authService = inject(AuthService);
  familiesService = inject(Families);
  bottomSheetRef = inject(MatBottomSheetRef);

  switchFamily(id: string) {
    this.authService.switchActiveFamily(id);
    this.bottomSheetRef.dismiss();
  }

  close() {
    this.bottomSheetRef.dismiss();
  }

  signOut() {
    this.authService.signOut();
    this.bottomSheetRef.dismiss();
  }
}
