import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PostList } from '../../posts/post-list/post-list';
import { Landing } from '../landing/landing';
import { AuthService } from '../../core/auth';
import { Families } from '../../core/families';
import { CommonModule } from '@angular/common';
import {MatMenuModule} from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button'; 
import { Calendar } from '../../core/calendar';
import { map, Observable } from 'rxjs';
@Component({
  selector: 'app-home',
  imports: [RouterModule,PostList, Landing, CommonModule, MatMenuModule, MatIconModule, MatBadgeModule, MatButtonModule],
  standalone: true,
  providers: [AuthService, Families],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  public authService = inject(AuthService);
  public familiesService = inject(Families);
  private calendarService = inject(Calendar);

  public upcomingEventsCount$: Observable<number>;

  switchFamily(familyId:string){
    this.authService.switchActiveFamily(familyId);

  }
  constructor() {
    this.upcomingEventsCount$ = this.calendarService.getUpcomingEvents().pipe(
      map(events => events.length)
    );
  }
}
