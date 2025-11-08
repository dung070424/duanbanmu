import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRoles = route.data['roles'] as string[];
  
  console.log('🔒 roleGuard - Route:', route.url);
  console.log('🔒 roleGuard - Required roles:', requiredRoles);
  
  if (!requiredRoles || requiredRoles.length === 0) {
    console.log('✅ roleGuard - No roles required, allowing access');
    return true;
  }

  if (!authService.isLoggedIn()) {
    console.warn('⚠️ roleGuard - User not logged in, redirecting to login');
    router.navigate(['/login']);
    return false;
  }

  const user = authService.getCurrentUser();
  console.log('🔒 roleGuard - Current user:', user);
  console.log('🔒 roleGuard - User roles:', user?.roles);
  
  const hasRole = authService.hasAnyRole(...requiredRoles);
  console.log('🔒 roleGuard - Has required role:', hasRole);
  
  if (!hasRole) {
    console.warn('⚠️ roleGuard - User does not have required role');
    // Redirect dựa trên role của user
    if (user?.roles?.includes('CUSTOMER')) {
      console.log('ℹ️ roleGuard - User is CUSTOMER but not authorized for this route, redirecting to shop');
      router.navigate(['/shop']); 
    } else if (user?.roles?.includes('ADMIN') || user?.roles?.includes('STAFF')) {
      console.log('ℹ️ roleGuard - User is ADMIN/STAFF, redirecting to dashboard');
      router.navigate(['/dashboard']); 
    } else {
      console.warn('⚠️ roleGuard - User has no valid roles, redirecting to shop');
      router.navigate(['/shop']); 
    }
    return false;
  }

  console.log('✅ roleGuard - Access granted');
  return true;
};
