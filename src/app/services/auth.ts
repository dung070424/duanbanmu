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
    if (typeof window !== 'undefined' && window.localStorage) {
      const token = localStorage.getItem('authToken');
      const user = localStorage.getItem('currentUser');

      if (token && user) {
        try {
          const userObj = JSON.parse(user);
          this.isAuthenticatedSubject.next(true);
          this.currentUserSubject.next(userObj);
        } catch (e) {
          console.error('Error parsing user data:', e);
          this.clearAuthData();
        }
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
    console.log('hasAnyRole', roles.some(role => user?.roles?.includes(role)) || false);
    return roles.some(role => user?.roles?.includes(role)) || false;
  }
}
