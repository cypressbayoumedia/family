import { inject, computed } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { Families } from './families';
import { AuthService } from './auth';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const families = inject(Families);
  const router = inject(Router);

  const user = authService.currentUser();
  const family = families.activeFamily();

  const userRole = computed(() => {
    if (!user || !family) {
      return null;
    }
    const member = family.members.find(m => m.uid === user.uid);
    return member ? member.role : null;
  });

  const isAdmin = computed(() => {
    return userRole() === 'admin' && family?.subscription?.type === 'paid';
  });

  if (isAdmin()) {
    return true;
  } else {
    return router.parseUrl('/home');
  }
};
