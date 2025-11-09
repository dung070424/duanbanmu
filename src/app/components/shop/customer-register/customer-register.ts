import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { RegisterRequest } from '../../../interfaces/auth.interface';

@Component({
  selector: 'app-customer-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './customer-register.html',
  styleUrls: ['./customer-register.scss'],
})
export class CustomerRegisterComponent implements OnInit {
  registerData: RegisterRequest = {
    username: '',
    password: '',
    email: '',
    fullName: '',
  };

  confirmPassword = '';
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
    });
  }

  onRegister() {
    if (this.isLoading) return;

    // Validation
    if (this.registerData.password !== this.confirmPassword) {
      this.errorMessage = 'Mật khẩu xác nhận không khớp!';
      return;
    }

    if (this.registerData.password.length < 6) {
      this.errorMessage = 'Mật khẩu phải có ít nhất 6 ký tự!';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Đăng ký với role CUSTOMER (backend sẽ tự động gán role CUSTOMER cho đăng ký từ website)
    this.authService.register(this.registerData).subscribe({
      next: (response) => {
        console.log('✅ Customer register successful:', response);
        this.successMessage = response.message || 'Đăng ký thành công!';
        const username = this.registerData.username;
        this.isLoading = false;
        
        // Nếu có returnUrl, chuyển đến login với returnUrl để sau khi login sẽ quay lại checkout
        if (this.returnUrl) {
          this.router.navigate(['/shop/login'], {
            queryParams: { registered: 'true', username, returnUrl: this.returnUrl },
            replaceUrl: true
          });
        } else {
          this.router.navigate(['/shop/login'], {
            queryParams: { registered: 'true', username },
            replaceUrl: true
          });
        }
      },
      error: (error: Error) => {
        console.error('❌ Customer register error:', error);
        this.errorMessage = error.message || 'Có lỗi xảy ra khi đăng ký. Vui lòng thử lại!';
        this.isLoading = false;
      },
    });
  }

  goToLogin() {
    this.router.navigate(['/shop/login']);
  }
}
