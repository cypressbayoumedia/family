import { ChangeDetectionStrategy, Component, computed, effect, inject, ViewChild, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AuthService } from './core/auth';
import { Families } from './core/families';
import { MessagingService } from './core/messaging';
import { BirthdayPopupComponent } from './components/birthday-popup/birthday-popup';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterOutlet,
    BirthdayPopupComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppRoot {
  private auth = inject(AuthService);
  private families = inject(Families);
  private router = inject(Router);
  private messagingService = inject(MessagingService);

  @ViewChild(BirthdayPopupComponent) birthdayPopup!: BirthdayPopupComponent;

  public isLoggedIn = computed(() => !!this.auth.currentUser());
  public activeFamily = this.families.activeFamily;

  public currentUserRole = computed(() => {
    const user = this.auth.currentUser();
    const family = this.activeFamily();
    if (!user || !family) return null;

    const member = family.members.find(m => m.uid === user.uid);
    return member ? member.role : null;
  });

  public isAdminOfPaidFamily = computed(() => {
    const family = this.activeFamily();
    return this.currentUserRole() === 'admin' && family?.subscription?.type === 'paid';
  });

  public async logout() {
    await this.auth.signOut();
    this.router.navigate(['/welcome']);
  }

  constructor() {
    // Request notification permission
    this.messagingService.requestPermission();

    effect(() => {
      const user = this.auth.currentUser();
      const profile = this.auth.userProfile();

      if (user && profile) {
        // Check if profile has birthday
        const hasBirthday = profile.birthday;

        if (!hasBirthday) {
          // Give a little delay for UI to settle
          setTimeout(() => {
            this.birthdayPopup?.show();
          }, 2000);
        }
      }
    });
  }
}
