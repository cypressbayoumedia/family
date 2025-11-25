import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AuthService } from './core/auth';
import { Families } from './core/families';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterOutlet,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppRoot {
  private auth = inject(AuthService);
  private families = inject(Families);
  private router = inject(Router);

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
}
