import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LoginRequest, RegisterRequest, ForgotPasswordRequest, VerifyOtpRequest, ResetPasswordRequest, AuthResponse, User } from '../interfaces/auth.interface';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.apiBaseUrl}/api/auth`;
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private currentUserSubject = new BehaviorSubject<User | null>(null);

  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    // Kiểm tra trạng thái đăng nhập từ localStorage
    this.checkAuthStatus();
  }

  private checkAuthStatus(): void {
    if (typeof window !== 'undefined') {
      // Kiểm tra cả localStorage và sessionStorage
      // Ưu tiên localStorage (rememberMe = true), sau đó sessionStorage (rememberMe = false)
      let token: string | null = null;
      let user: string | null = null;
      
      // Thử lấy từ localStorage trước
      if (window.localStorage) {
        token = localStorage.getItem('authToken');
        user = localStorage.getItem('currentUser');
      }
      
      // Nếu không có trong localStorage, thử sessionStorage
      if ((!token || !user) && window.sessionStorage) {
        const sessionToken = sessionStorage.getItem('authToken');
        const sessionUser = sessionStorage.getItem('currentUser');
        if (sessionToken && sessionUser) {
          token = sessionToken;
          user = sessionUser;
        }
      }

      if (token && user) {
        try {
          const userObj = JSON.parse(user);
          this.isAuthenticatedSubject.next(true);
          this.currentUserSubject.next(userObj);
          console.log('✅ Authentication state restored from storage');
        } catch (e) {
          console.error('Error parsing user data:', e);
          this.clearAuthData();
        }
      } else {
        console.log('ℹ️ No authentication data found in storage');
      }
    }
  }

  login(username: string, password: string, rememberMe: boolean = false): Observable<boolean> {
    const request: LoginRequest = { username, password, rememberMe };
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, request).pipe(
      map((response: AuthResponse) => {
        if (response.token) {
          const user: User = {
            id: response.id,
            username: response.username,
            email: response.email,
            fullName: response.fullName,
            roles: response.roles || []
          };

          this.saveAuthData(response.token, user, rememberMe);
          this.isAuthenticatedSubject.next(true);
          this.currentUserSubject.next(user);
          
          // Merge giỏ hàng tạm với giỏ hàng trong DB sau khi đăng nhập
          this.mergeTempCartWithDBCart(user.id);
          
          return true;
        }
        throw new Error(response.message || 'Đăng nhập thất bại');
      }),
      catchError((error) => {
        console.error('Login error:', error);
        return throwError(() => new Error(error.error?.message || 'Tên đăng nhập hoặc mật khẩu không đúng'));
      })
    );
  }

  /**
   * Gộp giỏ hàng tạm (localStorage) với giỏ hàng trong DB
   */
  private mergeTempCartWithDBCart(userId: number): void {
    try {
      const tempCartData = localStorage.getItem('temp_cart');
      if (!tempCartData) {
        return; // Không có giỏ hàng tạm
      }

      const tempCart = JSON.parse(tempCartData);
      if (!Array.isArray(tempCart) || tempCart.length === 0) {
        return; // Giỏ hàng tạm rỗng
      }

      console.log('🛒 Merging temp cart with DB cart for user:', userId);
      console.log('📦 Temp cart items:', tempCart.length);

      // Import HoaDonChoService để merge
      // Tạm thời emit event để component xử lý
      // Hoặc có thể inject service ở đây
      // Để đơn giản, ta sẽ emit event và để shop component xử lý
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('mergeTempCart', { 
          detail: { userId, tempCart } 
        }));
      }
    } catch (error) {
      console.error('Error merging temp cart:', error);
    }
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, request).pipe(
      tap((response: AuthResponse) => {
        if (response.token) {
          const user: User = {
            id: response.id,
            username: response.username,
            email: response.email,
            fullName: response.fullName,
            roles: response.roles || []
          };

          this.saveAuthData(response.token, user, false);
          this.isAuthenticatedSubject.next(true);
          this.currentUserSubject.next(user);
        }
      }),
      catchError((error) => {
        console.error('Register error:', error);
        return throwError(() => new Error(error.error?.message || 'Đăng ký thất bại'));
      })
    );
  }

  forgotPassword(email: string): Observable<string> {
    const request: ForgotPasswordRequest = { email };
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/forgot-password`, request).pipe(
      map((response: AuthResponse) => response.message || 'Mã OTP đã được gửi đến email của bạn'),
      catchError((error) => {
        console.error('Forgot password error:', error);
        return throwError(() => new Error(error.error?.message || 'Không thể gửi mã OTP'));
      })
    );
  }

  verifyOtp(email: string, otp: string): Observable<string> {
    const request: VerifyOtpRequest = { email, otp };
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/verify-otp`, request).pipe(
      map((response: AuthResponse) => response.message || 'Mã OTP hợp lệ'),
      catchError((error) => {
        console.error('Verify OTP error:', error);
        return throwError(() => new Error(error.error?.message || 'Mã OTP không hợp lệ'));
      })
    );
  }

  resetPassword(email: string, otp: string, newPassword: string, confirmPassword: string): Observable<boolean> {
    const request: ResetPasswordRequest = { email, otp, newPassword, confirmPassword };
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/reset-password`, request).pipe(
      map(() => {
        // Không tự động đăng nhập; chỉ báo thành công
        return true;
      }),
      catchError((error) => {
        console.error('Reset password error:', error);
        return throwError(() => new Error(error.error?.message || 'Không thể đặt lại mật khẩu'));
      })
    );
  }

  
  private saveAuthData(token: string, user: User, rememberMe: boolean): void {
    if (typeof window !== 'undefined') {
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('authToken', token);
      storage.setItem('currentUser', JSON.stringify(user));
    }
  }

  private clearAuthData(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('currentUser');
    }
  }

  logout(): void {
    this.clearAuthData();
    this.isAuthenticatedSubject.next(false);
    this.currentUserSubject.next(null);
  }

  isLoggedIn(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }
    return null;
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.roles?.includes(role) || false;
  }

  isAdmin(): boolean {
    return this.hasRole('ADMIN');
  }

  isStaff(): boolean {
    return this.hasRole('STAFF');
  }

  isCustomer(): boolean {
    return this.hasRole('CUSTOMER');
  }

  hasAnyRole(...roles: string[]): boolean {
    const user = this.getCurrentUser();
    const hasRole = roles.some(role => user?.roles?.includes(role)) || false;
    // Chỉ log khi không có role để debug, không log mỗi lần gọi
    if (!hasRole && roles.length > 0) {
      console.log('hasAnyRole false:', { 
        requiredRoles: roles, 
        userRoles: user?.roles || [],
        currentUrl: typeof window !== 'undefined' ? window.location.pathname : 'unknown'
      });
    }
    return hasRole;
  }
}
