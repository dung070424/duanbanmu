import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth';

interface LoginData {
  username: string;
  password: string;
  rememberMe: boolean;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class LoginComponent {
  loginData: LoginData = {
    username: '',
    password: '',
    rememberMe: false,
  };

  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(private authService: AuthService, private router: Router, private route: ActivatedRoute) {
    // Hiển thị thông báo sau khi đăng ký
    this.route.queryParams.subscribe(params => {
      if (params['registered'] === 'true' && params['username']) {
        this.successMessage = `Đăng ký tài khoản ${params['username']} thành công! Vui lòng đăng nhập.`;
      }
      if (params['changedPassword'] === 'true') {
        this.successMessage = 'Thay đổi mật khẩu thành công! Vui lòng đăng nhập.';
      }
    });

    // Fallback: đọc từ navigation state nếu có
    const nav = this.router.getCurrentNavigation();
    const stateMsg = nav?.extras?.state && (nav.extras.state as any).successMessage;
    if (stateMsg) {
      this.successMessage = stateMsg as string;
    }
  }

  onLogin() {
    if (this.isLoading) return;

    console.log('Attempting login with:', this.loginData);
    this.isLoading = true;
    this.errorMessage = '';

    this.authService
      .login(this.loginData.username, this.loginData.password, this.loginData.rememberMe)
      .subscribe({
        next: (success: boolean) => {
          console.log('Login result:', success);
          if (success) {
            const user = this.authService.getCurrentUser();
            console.log('Login successful, user:', user);
            
            // Redirect dựa trên role
            if (user?.roles?.includes('ADMIN') || user?.roles?.includes('STAFF')) {
              console.log('Navigating to dashboard for admin/staff');
              this.router.navigate(['/dashboard']);
            } else if (user?.roles?.includes('CUSTOMER')) {
              console.log('Navigating to shop for customer');
              this.router.navigate(['/shop']);
            } else {
              // Fallback: nếu không có role, redirect đến shop
              console.log('No role found, navigating to shop');
              this.router.navigate(['/shop']);
            }
          } else {
            console.log('Login failed - invalid credentials');
            this.errorMessage = 'Tên đăng nhập hoặc mật khẩu không đúng!';
          }
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Login error:', error);
          this.errorMessage = 'Có lỗi xảy ra khi đăng nhập. Vui lòng thử lại!';
          this.isLoading = false;
        },
      });
  }
}
