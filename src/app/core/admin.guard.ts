import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Families } from './families';
import { AuthService } from './auth';
import { map } from 'rxjs/operators';

export const adminGuard = () => {
  const authService = inject(AuthService);
  const families = inject(Families);
  const router = inject(Router);

  return authService.authState$.pipe(
    map(user => {
      if (!user) {
        return router.parseUrl('/login');
      }

      const family = families.activeFamily();
      const member = family?.members.find(m => m.uid === user.uid);
      const userRole = member ? member.role : null;

      if (userRole === 'admin' && family?.subscription?.type === 'paid') {
        return true;
      } else {
        return router.parseUrl('/home');
      }
    })
  );
};
