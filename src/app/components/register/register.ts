import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth';
import { RegisterRequest } from '../../interfaces/auth.interface';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
})
export class RegisterComponent {
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

  constructor(private authService: AuthService, private router: Router) {}

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

    this.authService.register(this.registerData).subscribe({
      next: (response) => {
        this.successMessage = response.message || 'Đăng ký thành công!';
        const username = this.registerData.username;
        this.isLoading = false;
        this.router.navigate(['/login'], {
          queryParams: { registered: 'true', username },
          replaceUrl: true
        });
      },
      error: (error: Error) => {
        this.errorMessage = error.message || 'Có lỗi xảy ra khi đăng ký. Vui lòng thử lại!';
        this.isLoading = false;
      },
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
