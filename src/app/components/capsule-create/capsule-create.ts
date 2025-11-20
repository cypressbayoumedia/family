import { Component, ChangeDetectionStrategy, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CapsulesService } from '../../core/capsules';

@Component({
  selector: 'app-capsule-create',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="create-capsule-form">
      <h3>Start a New Story Capsule</h3>
      
      <input 
        type="text" 
        class="form-input"
        [(ngModel)]="title" 
        name="title"
        placeholder="Capsule Title (e.g., Thanksgiving 2025)"
      >
      
      <input 
        type="date" 
        class="form-input"
        [(ngModel)]="eventDate"
        name="eventDate"
      >
      
      <button 
        class="button button-primary"
        (click)="createCapsule()" 
        [disabled]="!title || !eventDate"
      >
        Create Capsule
      </button>
    </div>
  `,
  styleUrls: ['./capsule-create.css']
})
export class CapsuleCreate {
  private capsulesService = inject(CapsulesService);
  private router = inject(Router);
  
  close = output<void>();

  title = '';
  eventDate = '';

  async createCapsule() {
    try {
      const newId = await this.capsulesService.createCapsule(
        this.title, 
        new Date(this.eventDate)
      );
      this.close.emit();
      this.router.navigate(['/capsule', newId]);
    } catch (error) {
      console.error('Creation failed', error);
    }
  }
}
