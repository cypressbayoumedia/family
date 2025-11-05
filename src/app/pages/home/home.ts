import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PostList } from '../../posts/post-list/post-list';
import { Landing } from '../landing/landing';
import { AuthService } from '../../core/auth';
import { InviteMembers } from '../../components/invite-members/invite-members';
import { Families } from '../../core/families';

@Component({
  selector: 'app-home',
  imports: [RouterModule,PostList, Landing,],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  public authService = inject(AuthService);
  public familiesService = inject(Families);
}
