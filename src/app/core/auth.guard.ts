import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { BlogService } from './blog.service';

export const authGuard: CanActivateFn = () => {
  const blogService = inject(BlogService);
  const router = inject(Router);

  return blogService.isAuthenticated() || router.createUrlTree(['/auth']);
};
