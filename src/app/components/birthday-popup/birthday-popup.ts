import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth';

@Component({
    selector: 'app-birthday-popup',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './birthday-popup.html',
    styleUrls: ['./birthday-popup.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BirthdayPopupComponent {
    authService = inject(AuthService);

    @ViewChild('dialog') dialog!: ElementRef<HTMLDialogElement>;

    birthday = signal('');
    isSaving = signal(false);

    show() {
        this.dialog.nativeElement.showModal();
    }

    close() {
        this.dialog.nativeElement.close();
    }

    async saveBirthday() {
        if (!this.birthday()) return;

        this.isSaving.set(true);
        try {
            await this.authService.updateBirthday(this.birthday());
            this.close();
        } catch (error) {
            console.error('Error saving birthday:', error);
            alert('Failed to save birthday. Please try again.');
        } finally {
            this.isSaving.set(false);
        }
    }
}
