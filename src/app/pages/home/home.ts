import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PostList } from '../../posts/post-list/post-list';
import { Landing } from '../landing/landing';
import { AuthService } from '../../core/auth';
import { InviteMembers } from '../../components/invite-members/invite-members';
import { Families } from '../../core/families';
import { FamilySwitcher } from '../../components/family-switcher/family-switcher';
import { CommonModule } from '@angular/common';
import {MatMenuModule} from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
@Component({
  selector: 'app-home',
  imports: [RouterModule,PostList, Landing, FamilySwitcher,InviteMembers, CommonModule, MatMenuModule, MatIconModule],
  standalone: true,
  providers: [AuthService, Families],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  public authService = inject(AuthService);
  public familiesService = inject(Families);
  

  switchFamily(familyId:string){
    this.authService.switchActiveFamily(familyId);

  }
}
