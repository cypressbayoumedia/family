import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PwaInstallService } from '../../core/pwa-install.service';

@Component({
    selector: 'app-install-prompt',
    imports: [CommonModule, MatButtonModule, MatIconModule],
    templateUrl: './install-prompt.html',
    styleUrl: './install-prompt.css' 
})
export class InstallPromptComponent {
    public pwaService = inject(PwaInstallService);
}
