import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  

  const token = authService.getToken();
  
  // Nếu có token và không phải là request đến /api/auth, thêm token vào header
  if (token && !req.url.includes('/api/auth')) {
    // Validate token format trước khi gửi
    const trimmedToken = token.trim();
    if (!trimmedToken || trimmedToken.split('.').length !== 3) {
      console.error('❌ Invalid JWT token format:', trimmedToken.substring(0, 20) + '...');
      // Không gửi token không hợp lệ, để backend trả về 401 rồi xử lý
    }
    
    const clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${trimmedToken}`
      }
    });
    
    return next(clonedReq).pipe(
      catchError((error) => {
        const currentUrl = router.url;
        
        // Xử lý lỗi 401 (Unauthorized) - token hết hạn hoặc không hợp lệ
        if (error.status === 401) {
          console.error('❌ 401 Unauthorized - Invalid or expired token');
          // Chỉ logout và redirect nếu không đang ở trang auth
          if (!currentUrl.includes('/login') && !currentUrl.includes('/register')) {
            authService.logout();
            router.navigate(['/login']);
          }
        }
        // Xử lý lỗi 403 (Forbidden) - không có quyền
        // KHÔNG redirect tự động vì component sẽ tự xử lý lỗi
        if (error.status === 403) {
          console.warn('⚠️ 403 Forbidden - Insufficient permissions for:', req.url);
          // Chỉ log, không redirect - để component tự xử lý
          // Component sẽ hiển thị error message và user có thể thử lại
        }
        return throwError(() => error);
      })
    );
  }
  
  return next(req);
};
