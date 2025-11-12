import { Routes } from '@angular/router';
import {
  AuthGuard,
  redirectLoggedInTo,
  redirectUnauthorizedTo
} from '@angular/fire/auth-guard';
import { Login } from './entry/login/login';
import { Signup } from './entry/signup/signup';
import { JoinHub } from './entry/join-hub/join-hub';
// A pipe function for redirecting unauthorized users to the login page.
const redirectUnauthorizedToLogin = () => redirectUnauthorizedTo(['login']);

// A pipe function for redirecting logged-in users to the dashboard.
const redirectLoggedInToDashboard = () => redirectLoggedInTo(['']);
export const routes: Routes = [
  { 
    path: 'login', 
    component: Login,
    canActivate: [AuthGuard], // Use the built-in AuthGuard
    data: { authGuardPipe: redirectLoggedInToDashboard } // Apply the redirect logic
  },
  { 
    path: 'signup', 
    component: Signup,
    canActivate: [AuthGuard], // Use the built-in AuthGuard
    data: { authGuardPipe: redirectLoggedInToDashboard } // Apply the redirect logic
  },
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then(m => m.Home)
  },
  {
    path: 'create-post',
    loadComponent: () => import('./posts/post-create/post-create').then(m => m.PostCreate),
    canActivate: [AuthGuard], // Use the built-in AuthGuard
    data: { authGuardPipe: redirectUnauthorizedToLogin }
  },{ 
    path: 'welcome',
    // Use `loadComponent` with a dynamic import
    loadComponent: () => import('./entry/welcome/welcome').then(m => m.Welcome),
    canActivate: [AuthGuard],
    data: { authGuardPipe: redirectUnauthorizedToLogin }
  },{ 
    path: 'invite-members',
    // Use `loadComponent` with a dynamic import
    loadComponent: () => import('./components/invite-members/invite-members').then(m => m.InviteMembers),
    canActivate: [AuthGuard],
    data: { authGuardPipe: redirectUnauthorizedToLogin }
  },{
    path: 'post/:postId', // The ':postId' is a dynamic parameter
    loadComponent: () => import('./posts/post-details/post-details').then(m => m.PostDetails),
    canActivate: [AuthGuard], // Protect this route
    data: { authGuardPipe: redirectUnauthorizedToLogin }
  },
  {
    path: 'manage-circles',
    loadComponent: () => import('./pages/manage-families/manage-families').then(m => m.ManageFamilies),
    canActivate: [AuthGuard],
    data: { authGuardPipe: redirectUnauthorizedToLogin }
  },
  { 
    path: 'invited-to-join/:inviteId', 
    component: JoinHub,
  },
  {
    path: 'calendar',
    loadComponent: () => import('./pages/calendar-page/calendar-page').then(m => m.CalendarPage),
    canActivate: [AuthGuard],
    data: { authGuardPipe: redirectUnauthorizedToLogin }
  },

  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile').then(m => m.Profile),
    canActivate: [AuthGuard],
    data: { authGuardPipe: redirectUnauthorizedToLogin }
  },
];
