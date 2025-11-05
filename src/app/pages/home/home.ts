import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PostList } from '../../posts/post-list/post-list';
import { Landing } from '../landing/landing';
import { AuthService } from '../../core/auth';
import { InviteMembers } from '../../components/invite-members/invite-members';
import { Families } from '../../core/families';
import { FamilySwitcher } from '../../components/family-switcher/family-switcher';
@Component({
  selector: 'app-home',
  imports: [RouterModule,PostList, Landing, FamilySwitcher,InviteMembers],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  public authService = inject(AuthService);
  public familiesService = inject(Families);

  isUserMenuOpen = signal(false);
  isInviteModalOpen = signal(false);

  toggleUserMenu(): void {
    this.isUserMenuOpen.update(value => !value);
  }
  
  openInviteModal(): void {
    this.isInviteModalOpen.set(true);
  }
  
  closeInviteModal(): void {
    this.isInviteModalOpen.set(false);
  }
}
