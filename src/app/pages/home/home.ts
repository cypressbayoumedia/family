import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PostList } from '../../posts/post-list/post-list';
import { Landing } from '../landing/landing';
import { AuthService } from '../../core/auth';
@Component({
  selector: 'app-home',
  imports: [RouterModule,PostList, Landing],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  public authService = inject(AuthService);
}
