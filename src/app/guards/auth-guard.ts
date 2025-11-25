import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    // QUAN TRỌNG: Khi refresh trang, authentication state đã được restore trong constructor của AuthService
    // Nhưng để chắc chắn, kiểm tra cả token và isLoggedIn()
    const token = this.authService.getToken();
    const isLoggedIn = this.authService.isLoggedIn();
    
    console.log('🔒 AuthGuard - Checking authentication:', {
      hasToken: !!token,
      isLoggedIn: isLoggedIn,
      currentUrl: route.url.join('/'),
      routerUrl: this.router.url
    });
    
    // QUAN TRỌNG: Nếu có token trong storage, cho phép truy cập
    // Nếu token không hợp lệ hoặc hết hạn, interceptor sẽ xử lý 401 và redirect
    // Điều này đảm bảo khi refresh trang, không bị redirect ngay lập tức
    if (token) {
      // Có token, cho phép truy cập
      // Nếu token không hợp lệ, interceptor sẽ xử lý
      if (isLoggedIn) {
        console.log('✅ AuthGuard - User is logged in, allowing access');
      } else {
        console.log('⏳ AuthGuard - Token exists but auth state not fully restored, allowing access (interceptor will handle invalid token)');
      }
      return true;
    }
    
    // Không có token, redirect đến login
    if (!isLoggedIn) {
      console.warn('⚠️ AuthGuard - No token and user not logged in, redirecting to login');
      // QUAN TRỌNG: Lưu URL hiện tại để có thể quay lại sau khi login
      const currentUrl = this.router.url;
      if (currentUrl && currentUrl !== '/login' && currentUrl !== '/register' && !currentUrl.startsWith('/shop')) {
        console.log('💾 AuthGuard - Saving return URL:', currentUrl);
        // Có thể lưu vào query params hoặc service để quay lại sau
      }
      this.router.navigate(['/login']);
      return false;
    }
    
    return true;
  }
}
