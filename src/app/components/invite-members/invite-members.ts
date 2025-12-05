import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
// Import the FamiliesService to get the current family ID
import { Families } from '../../core/families'; // Adjust path
import { AuthService } from '../../core/auth';

@Component({
  selector: 'app-invite-members',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './invite-members.html',
  styleUrls: ['./invite-members.css']
})
export class InviteMembers {
  private familiesService = inject(Families);
  private authService = inject(AuthService);

  // Expose the current family ID to the template
  familyId = this.familiesService.activeFamilyId;
  familyName = this.familiesService.activeFamily

  // Check if current user is admin of active family
  isAdmin = computed(() => {
    const family = this.familiesService.activeFamily();
    const user = this.authService.currentUser();
    if (!family || !user) return false;
    const member = family.members.find(m => m.uid === user.uid);
    return member?.role === 'admin';
  });

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
      text: `I'm setting up our private family space on The Familee! Let's have one central place for family stuff, away from public social media. Here’s our private link to join it's super quick!`,
      url: `https://thefamilee.app/invited-to-join/${inviteCode}`
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
    const inviteCode = `https://thefamilee.app/invited-to-join/${this.familyId()}`
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