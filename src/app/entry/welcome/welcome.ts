import { Component, inject, effect, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Families } from '../../core/families';
import { AuthService } from '../../core/auth'; // <-- Import AuthService

// Essential imports for a standalone component
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-welcome',
  imports: [CommonModule, FormsModule],
  templateUrl: './welcome.html',
  styleUrls: ['./welcome.css']
})
export class Welcome {
  // Inject both services now
  familiesService = inject(Families);
  authService = inject(AuthService); // <-- Inject AuthService
  private router = inject(Router);

  // Expose the currentUser signal to the template
  currentUser = this.authService.currentUser;

  // Create new signals for the form inputs
  userName = signal('');
  familyName = signal('');
  familyId = signal('');

  constructor() {
    // This effect correctly redirects users who are already in a family
    effect(() => {
      if (this.familiesService.currentFamilyId() && !this.familiesService.isLoading()) {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  // Update the create method to pass the user's name
  create(): void {
    if (this.familyName().trim()) {
      this.familiesService.createFamily(this.familyName(), this.userName().trim());
    }
  }

  // Update the join method to pass the user's name
  join(): void {
    if (this.familyId().trim()) {
      this.familiesService.joinFamily(this.familyId(), this.userName().trim());
    }
  }
}