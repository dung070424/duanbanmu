import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth';

interface LoginData {
  username: string;
  password: string;
  rememberMe: boolean;
}

@Component({
  selector: 'app-customer-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './customer-login.html',
  styleUrls: ['./customer-login.scss'],
})
export class CustomerLoginComponent implements OnInit {
  loginData: LoginData = {
    username: '',
    password: '',
    rememberMe: false,
  };

  isLoading = false;
  errorMessage = '';
  successMessage = '';
  returnUrl: string | null = null;

  constructor(
    private authService: AuthService, 
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Lấy returnUrl từ query params
    this.route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl'] || null;
      
      // Hiển thị thông báo đăng ký thành công nếu có
      if (params['registered'] === 'true') {
        this.successMessage = 'Đăng ký thành công! Vui lòng đăng nhập.';
        if (params['username']) {
          this.loginData.username = params['username'];
        }
        // Tự động xóa thông báo sau 5 giây
        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      }
      
      // Hiển thị thông báo đổi mật khẩu thành công nếu có
      if (params['changedPassword'] === 'true') {
        this.successMessage = 'Thay đổi mật khẩu thành công! Vui lòng đăng nhập.';
        // Tự động xóa thông báo sau 5 giây
        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      }
    });
  }

  onLogin() {
    if (this.isLoading) return;

    console.log('🛍️ Customer login attempt:', this.loginData.username);
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = ''; // Clear success message when attempting to login

    this.authService
      .login(this.loginData.username, this.loginData.password, this.loginData.rememberMe)
      .subscribe({
        next: (success: boolean) => {
          console.log('✅ Login result:', success);
          if (success) {
            const user = this.authService.getCurrentUser();
            console.log('✅ Login successful, user:', user);
            console.log('   - User roles:', user?.roles);
            
            // CHỈ CHO PHÉP ĐĂNG NHẬP VỚI ROLE CUSTOMER
            if (!user?.roles || !user.roles.includes('CUSTOMER')) {
              console.error('❌ Only CUSTOMER role can login from customer website');
              console.error('   - User roles:', user?.roles);
              this.errorMessage = 'Chỉ tài khoản khách hàng mới có thể đăng nhập tại đây! Vui lòng sử dụng trang đăng nhập dành cho nhân viên/quản trị viên.';
              this.authService.logout(); // Logout ngay lập tức
              this.isLoading = false;
              return;
            }
            
            // Nếu có returnUrl, quay lại trang đó (ví dụ: checkout)
            if (this.returnUrl) {
              console.log('🔙 Redirecting to returnUrl:', this.returnUrl);
              this.router.navigateByUrl(this.returnUrl);
              return;
            }
            
            // Redirect đến shop cho customer
            console.log('🛍️ Navigating to shop for customer');
            this.router.navigate(['/shop']);
          } else {
            console.log('❌ Login failed - invalid credentials');
            this.errorMessage = 'Tên đăng nhập hoặc mật khẩu không đúng!';
          }
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('❌ Login error:', error);
          this.errorMessage = error.error?.message || error.message || 'Có lỗi xảy ra khi đăng nhập. Vui lòng thử lại!';
          this.isLoading = false;
        },
      });
  }
}
