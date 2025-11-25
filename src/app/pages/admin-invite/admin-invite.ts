import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Families } from '../../core/families';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule, Location } from '@angular/common';

@Component({
  selector: 'app-admin-invite',
  templateUrl: './admin-invite.html',
  styleUrls: ['./admin-invite.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatIconModule,
    MatProgressSpinnerModule
  ]
})
export class AdminInvite {
  private functions = inject(Functions);
  private snackBar = inject(MatSnackBar);
  private families = inject(Families);
  private location = inject(Location);

  public name = signal('');
  public email = signal('');
  public loading = signal(false);

  public isButtonDisabled = computed(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return this.loading() || !this.name().trim() || !emailRegex.test(this.email());
  });

  public goBack(): void {
    this.location.back();
  }

  public async sendInvite() {
    if (this.isButtonDisabled()) {
      return;
    }

    this.loading.set(true);

    const familyId = this.families.activeFamily()?.id;
    if (!familyId) {
      this.snackBar.open('No active family selected', 'Close', { duration: 3000, panelClass: 'error-snackbar' });
      this.loading.set(false);
      return;
    }

    const createAdminInviteFn = httpsCallable(this.functions, 'createAdminInvite');
    try {
      await createAdminInviteFn({ name: this.name(), email: this.email(), familyId });
      this.snackBar.open('Invite sent successfully!', 'Close', { duration: 5000, panelClass: 'success-snackbar' });
      this.name.set('');
      this.email.set('');
    } catch (error) {
      console.error('Error sending invite:', error);
      this.snackBar.open('Error sending invite. Please try again.', 'Close', { duration: 3000, panelClass: 'error-snackbar' });
    } finally {
      this.loading.set(false);
    }
  }
}
