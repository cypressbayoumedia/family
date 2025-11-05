import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
// Import the FamiliesService to get the current family ID
import { Families } from '../../core/families'; // Adjust path

@Component({
  selector: 'app-invite-members',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './invite-members.html',
  styleUrls: ['./invite-members.css']
})
export class InviteMembers {
  private familiesService = inject(Families);

  // Expose the current family ID to the template
  familyId = this.familiesService.activeFamilyId;

  // Signal to check if the Web Share API is available on this device
  canShare = signal<boolean>(!!navigator.share);

  // Signal to provide feedback when the user copies the code
  copied = signal<boolean>(false);

  /**
   * Shares the family invite code using the native Web Share API.
   */
  async nativeShare(): Promise<void> {
    const inviteCode = this.familyId();
    if (!inviteCode) return;

    const shareData = {
      title: 'Join our Familee!',
      text: `You've been invited to join our family hub. Use this invite code to sign up: ${inviteCode}`,
      // Optional: Add a URL to your app's homepage
      // url: 'https://your-app-url.web.app' 
    };

    try {
      await navigator.share(shareData);
    } catch (err) {
      // This will catch if the user cancels the share action.
      // We can safely ignore this error.
      console.log('User cancelled share action');
    }
  }

  /**
   * The fallback method to copy the invite code to the clipboard.
   */
  copyToClipboard(): void {
    const inviteCode = this.familyId();
    if (!inviteCode) return;

    navigator.clipboard.writeText(inviteCode).then(() => {
      // Provide visual feedback that the copy was successful
      this.copied.set(true);
      // Reset the feedback message after 2 seconds
      setTimeout(() => this.copied.set(false), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  }
}