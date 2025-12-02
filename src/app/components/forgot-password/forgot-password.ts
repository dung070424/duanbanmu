import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
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
export class ForgotPasswordComponent implements OnDestroy {
  // Step 1: Gửi email
  email = '';
  emailError = '';
  
  // Step 2: Verify OTP
  otp = '';
  otpError = '';
  
  // Step 3: Reset password
  newPassword = '';
  confirmPassword = '';
  passwordError = '';
  showPassword = false;
  showConfirmPassword = false;
  
  currentStep: 'email' | 'otp' | 'reset' | 'success' = 'email';
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  isResetting = false;
  countdown = 0;
  private countdownInterval: any;

  constructor(
    private authService: AuthService, 
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  // Step 1: Gửi email để nhận OTP
  onSendEmail() {
    // Reset errors
    this.emailError = '';
    this.errorMessage = '';
    this.successMessage = '';

    // Validation
    if (!this.email) {
      this.emailError = 'Vui lòng nhập email';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.emailError = 'Email không hợp lệ';
      return;
    }

    if (this.isLoading) return;

    // Chuyển sang màn hình OTP ngay lập tức (optimistic UI)
    this.currentStep = 'otp';
    this.isLoading = true;
    this.successMessage = 'Đang gửi mã OTP...';
    this.cdr.detectChanges();

    // Gọi API trong background
    this.authService.forgotPassword(this.email.trim()).subscribe({
      next: (message) => {
        this.isLoading = false;
        this.successMessage = message || 'Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.';
        this.startCountdown(60); // 60 giây countdown
        this.cdr.detectChanges();
        
        // Clear success message sau 3 giây
        setTimeout(() => {
          if (this.currentStep === 'otp') {
            this.successMessage = '';
            this.cdr.detectChanges();
          }
        }, 3000);
      },
      error: (error: any) => {
        this.isLoading = false;
        const errorMsg = error?.error?.message || error?.message || 'Có lỗi xảy ra. Vui lòng thử lại!';
        // Quay lại màn hình email nếu có lỗi
        this.currentStep = 'email';
        this.errorMessage = errorMsg;
        this.emailError = errorMsg;
        this.successMessage = '';
        this.cdr.detectChanges();
      },
    });
  }

  // Step 2: Verify OTP
  onVerifyOtp() {
    // Reset errors
    this.otpError = '';
    this.errorMessage = '';
    this.successMessage = '';

    // Validation
    if (!this.otp) {
      this.otpError = 'Vui lòng nhập mã OTP';
      this.errorMessage = 'Vui lòng nhập mã OTP';
      return;
    }

    const otpValue = this.otp.trim().toUpperCase();
    if (otpValue.length < 6 || otpValue.length > 10) {
      this.otpError = 'Mã OTP phải có từ 6-10 ký tự';
      this.errorMessage = 'Mã OTP phải có từ 6-10 ký tự';
      return;
    }

    if (this.isLoading) return;

    this.isLoading = true;

    this.authService.verifyOtp(this.email.trim(), otpValue).subscribe({
      next: (message) => {
        // Chuyển sang màn hình reset password ngay lập tức
        this.currentStep = 'reset';
        this.isLoading = false;
        this.clearCountdown();
        this.successMessage = message || 'Mã OTP hợp lệ. Vui lòng nhập mật khẩu mới.';
        this.cdr.detectChanges();
        
        // Clear success message sau 3 giây
        setTimeout(() => {
          if (this.currentStep === 'reset') {
            this.successMessage = '';
            this.cdr.detectChanges();
          }
        }, 3000);
      },
      error: (error: any) => {
        this.isLoading = false;
        const errorMsg = error?.error?.message || error?.message || 'Mã OTP không hợp lệ. Vui lòng thử lại!';
        this.errorMessage = errorMsg;
        this.otpError = errorMsg;
        this.cdr.detectChanges();
      },
    });
  }

  // Step 3: Reset password
  onResetPassword() {
    // Reset errors
    this.passwordError = '';
    this.errorMessage = '';
    this.successMessage = '';

    // Validation
    if (!this.newPassword || !this.confirmPassword) {
      this.passwordError = 'Vui lòng nhập đầy đủ mật khẩu mới và xác nhận mật khẩu';
      this.errorMessage = 'Vui lòng nhập đầy đủ mật khẩu mới và xác nhận mật khẩu';
      return;
    }

    if (this.newPassword.length < 6) {
      this.passwordError = 'Mật khẩu phải có ít nhất 6 ký tự';
      this.errorMessage = 'Mật khẩu phải có ít nhất 6 ký tự';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = 'Mật khẩu mới và xác nhận mật khẩu không khớp';
      this.errorMessage = 'Mật khẩu mới và xác nhận mật khẩu không khớp';
      return;
    }

    if (this.isLoading || this.isResetting) return;

    this.isLoading = true;
    this.isResetting = true;

    console.log('🔄 [ForgotPassword] Bắt đầu reset password cho email:', this.email);

    this.authService.resetPassword(
      this.email.trim(), 
      this.otp.trim().toUpperCase(), 
      this.newPassword, 
      this.confirmPassword
    ).subscribe({
      next: (success) => {
        console.log('✅ [ForgotPassword] Reset password response:', success);
        if (success) {
          this.successMessage = 'Đặt lại mật khẩu thành công! Đang chuyển đến trang đăng nhập...';
          this.currentStep = 'success';
          this.isLoading = false;
          this.isResetting = false;
          
          // Clear form data
          this.newPassword = '';
          this.confirmPassword = '';
          this.cdr.detectChanges();
          
          // Auto redirect sau 2 giây
          setTimeout(() => {
            console.log('🔄 [ForgotPassword] Redirecting to login page...');
            this.router.navigate(['/login'], {
              queryParams: { changedPassword: 'true' },
              replaceUrl: true
            });
          }, 2000);
        } else {
          console.warn('⚠️ [ForgotPassword] Reset password returned false');
          this.errorMessage = 'Không thể đặt lại mật khẩu. Vui lòng thử lại!';
          this.isLoading = false;
          this.isResetting = false;
          this.cdr.detectChanges();
        }
      },
      error: (error: any) => {
        console.error('❌ [ForgotPassword] Reset password error:', error);
        const errorMsg = error?.error?.message || error?.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại!';
        this.errorMessage = errorMsg;
        this.passwordError = errorMsg;
        this.isLoading = false;
        this.isResetting = false;
        this.cdr.detectChanges();
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
      this.otpError = '';
      this.clearCountdown();
    } else if (this.currentStep === 'reset') {
      this.currentStep = 'otp';
      this.newPassword = '';
      this.confirmPassword = '';
      this.passwordError = '';
    }
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();
  }

  resendOtp() {
    if (this.countdown > 0 || this.isLoading) return;
    this.onSendEmail();
    this.cdr.detectChanges();
  }

  private startCountdown(seconds: number) {
    this.countdown = seconds;
    this.clearCountdown();
    this.cdr.detectChanges();
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        this.clearCountdown();
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  private clearCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
    this.cdr.detectChanges();
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    this.clearCountdown();
  }
}
