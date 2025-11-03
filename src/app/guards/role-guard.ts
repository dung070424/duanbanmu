import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRoles = route.data['roles'] as string[];
  
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  const hasRole = authService.hasAnyRole(...requiredRoles);
  
  if (!hasRole) {
    // Redirect dựa trên role của user
    const user = authService.getCurrentUser();
    if (user?.roles?.includes('CUSTOMER')) {
      router.navigate(['/shop']); 
    } else {
      router.navigate(['/dashboard']); 
    }
    return false;
  }

  return true;
};
