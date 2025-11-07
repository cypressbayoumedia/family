import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Families } from '../../core/families';
import { AuthService } from '../../core/auth';

@Component({
  selector: 'app-join-hub',
  imports: [],
  templateUrl: './join-hub.html',
  styleUrl: './join-hub.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinHub {
private authService = inject(AuthService);
private familiesService = inject(Families);
private router = inject(Router);
private route = inject(ActivatedRoute);

errorMessage = signal<string | null>(null);

constructor() {
  effect(
    () => {
      // This effect runs once the auth state is resolved
      if (this.authService.loading()) {
        return; // Wait for auth to finish loading
      }

      const inviteId = this.route.snapshot.paramMap.get('inviteId');

      // If there's no inviteId, we can't proceed. Redirect home.
      if (!inviteId) {
        this.router.navigate(['/']);
        return;
      }

      const user = this.authService.currentUser();

      if (user) {
        // If a user is already logged in, attempt to join the family.
        // The `joinFamily` method will handle navigation on success.
        this.familiesService.joinFamily(inviteId).catch(() => {
          this.errorMessage.set('Failed to join family:')
          // On failure, redirect to the main dashboard.
          this.router.navigate(['/']);
        });
      } else {
        // If no user is logged in, redirect to the login page,
        // passing the inviteId as a query parameter.
        this.router.navigate(['/login'], { queryParams: { inviteId } });
      }
    },
    { allowSignalWrites: true }
  );
}
}
