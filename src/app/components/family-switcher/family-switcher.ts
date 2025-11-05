import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Families } from '../../core/families';
import { AuthService } from '../../core/auth';

@Component({
  selector: 'app-family-switcher',
  imports: [CommonModule],
  templateUrl: './family-switcher.html',
  styleUrl: './family-switcher.css',
})
export class FamilySwitcher {
  familiesService = inject(Families);
  authService = inject(AuthService);

  // Expose signals to the template
  allFamilies = this.familiesService.allUserFamilies;
  activeFamily = this.familiesService.activeFamily;

  switchFamily(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const familyId = selectElement.value;
    if (familyId) {
      this.authService.switchActiveFamily(familyId);
    }
  }
}
