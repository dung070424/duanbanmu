import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.scss'],
})
export class ForgotPasswordComponent {
  // Step 1: Gửi email
  email = '';
  
  // Step 2: Verify OTP
  otp = '';
  
  // Step 3: Reset password
  newPassword = '';
  confirmPassword = '';
  
  currentStep: 'email' | 'otp' | 'reset' = 'email';
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

  // Step 1: Gửi email để nhận OTP
  onSendEmail() {
    if (this.isLoading || !this.email) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.forgotPassword(this.email).subscribe({
      next: (message) => {
        this.successMessage = message;
        this.currentStep = 'otp';
        this.isLoading = false;
      },
      error: (error: Error) => {
        this.errorMessage = error.message || 'Có lỗi xảy ra. Vui lòng thử lại!';
        this.isLoading = false;
      },
    });
  }

  // Step 2: Verify OTP
  onVerifyOtp() {
    if (this.isLoading || !this.otp || this.otp.length < 6) {
      this.errorMessage = 'Vui lòng nhập mã OTP (tối thiểu 6 ký tự)';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.verifyOtp(this.email, this.otp).subscribe({
      next: (message) => {
        this.successMessage = message;
        this.currentStep = 'reset';
        this.isLoading = false;
      },
      error: (error: Error) => {
        this.errorMessage = error.message || 'Mã OTP không hợp lệ. Vui lòng thử lại!';
        this.isLoading = false;
      },
    });
  }

  // Step 3: Reset password
  onResetPassword() {
    if (this.isLoading || !this.newPassword || !this.confirmPassword) {
      this.errorMessage = 'Vui lòng nhập đầy đủ mật khẩu mới và xác nhận mật khẩu';
      return;
    }

    if (this.newPassword.length < 6) {
      this.errorMessage = 'Mật khẩu phải có ít nhất 6 ký tự';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Mật khẩu mới và xác nhận mật khẩu không khớp';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.resetPassword(this.email, this.otp, this.newPassword, this.confirmPassword).subscribe({
      next: (success) => {
        if (success) {
          // Chuyển về trang đăng nhập và hiển thị thông báo thành công
          this.router.navigate(['/login'], {
            queryParams: { changedPassword: 'true' },
            state: { successMessage: 'Thay đổi mật khẩu thành công! Vui lòng đăng nhập.' },
            replaceUrl: true
          });
        }
        this.isLoading = false;
      },
      error: (error: Error) => {
        this.errorMessage = error.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại!';
        this.isLoading = false;
      },
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  goBack() {
    if (this.currentStep === 'otp') {
      this.currentStep = 'email';
      this.otp = '';
    } else if (this.currentStep === 'reset') {
      this.currentStep = 'otp';
      this.newPassword = '';
      this.confirmPassword = '';
    }
    this.errorMessage = '';
    this.successMessage = '';
  }
}
