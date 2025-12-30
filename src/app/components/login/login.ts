import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
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
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('videoBackground') videoElement!: ElementRef<HTMLVideoElement>;

  loginData: LoginData = {
    username: '',
    password: '',
    rememberMe: false,
  };

  isLoading = false;
  errorMessage = '';
  returnUrl: string | null = null;
  private videoCheckInterval: any = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    // Lấy returnUrl từ query params
    this.route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl'] || null;
    });
  }

  ngAfterViewInit(): void {
    // Đảm bảo video tự động phát và lặp lại
    setTimeout(() => {
      if (this.videoElement && this.videoElement.nativeElement) {
        const video = this.videoElement.nativeElement;

        // Đảm bảo các thuộc tính cần thiết
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.autoplay = true;

        // Function để play video
        const playVideo = () => {
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('✅ Video is playing');
              })
              .catch((error) => {
                console.warn('⚠️ Video autoplay failed:', error);
                // Thử lại sau một chút
                setTimeout(() => {
                  playVideo();
                }, 500);
              });
          }
        };

        // Xử lý khi video có thể play
        video.addEventListener('loadeddata', () => {
          console.log('✅ Video loaded');
          playVideo();
        });

        // Xử lý khi video kết thúc - đảm bảo lặp lại
        video.addEventListener('ended', () => {
          console.log('🔄 Video ended, restarting...');
          video.currentTime = 0;
          playVideo();
        });

        // Xử lý khi video bị pause - tự động play lại
        video.addEventListener('pause', () => {
          if (!video.ended) {
            console.log('▶️ Video paused, resuming...');
            playVideo();
          }
        });

        // Xử lý khi video có thể play (canplay event)
        video.addEventListener('canplay', () => {
          playVideo();
        });

        // Xử lý lỗi
        video.addEventListener('error', (e) => {
          console.error('❌ Video error:', e);
          console.error('Video src:', video.src);
          console.error('Video error code:', video.error?.code);
        });

        // Load và play video ngay lập tức
        video.load();
        playVideo();

        // Đảm bảo video luôn play - kiểm tra định kỳ
        this.videoCheckInterval = setInterval(() => {
          if (video.paused && !video.ended) {
            console.log('🔄 Video is paused, resuming...');
            playVideo();
          }
        }, 1000);
      }
    }, 100);
  }

  ngOnDestroy(): void {
    // Cleanup interval khi component bị destroy
    if (this.videoCheckInterval) {
      clearInterval(this.videoCheckInterval);
      this.videoCheckInterval = null;
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

            // Nếu có returnUrl, quay lại trang đó (ví dụ: checkout)
            if (this.returnUrl) {
              console.log('Redirecting to returnUrl:', this.returnUrl);
              this.router.navigateByUrl(this.returnUrl);
              return;
            }

            // Redirect dựa trên role
            // QUAN TRỌNG: Trang login này CHỈ dành cho Admin và Staff
            if (user?.roles?.includes('ADMIN') || user?.roles?.includes('STAFF')) {
              console.log('Navigating to dashboard for admin/staff');
              this.router.navigate(['/dashboard']);
            } else {
              // Nếu không phải Admin/Staff (ví dụ: Customer), chặn đăng nhập
              console.warn('User is not ADMIN/STAFF, blocking access to admin portal');

              // Logout ngay lập tức
              this.authService.logout();

              // Hiển thị thông báo lỗi
              this.handleLoginError('Tài khoản của bạn không có quyền truy cập trang quản trị.');
            }
          } else {
            console.log('Login failed - invalid credentials');
            this.handleLoginError('Tên đăng nhập hoặc mật khẩu không đúng. Vui lòng kiểm tra lại và thử lại!');
          }
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Login error:', error);
          const errorMsg = error.error?.message || error.message || 'Có lỗi xảy ra khi đăng nhập. Vui lòng thử lại!';
          this.handleLoginError(errorMsg);
          this.isLoading = false;
        },
      });
  }

  /**
   * Xử lý lỗi đăng nhập: hiển thị thông báo và yêu cầu nhập lại
   */
  private handleLoginError(message: string): void {
    this.errorMessage = message;
    // Xóa mật khẩu để yêu cầu nhập lại
    this.loginData.password = '';
    // Focus vào ô username sau một chút để người dùng có thể nhập lại
    setTimeout(() => {
      const usernameInput = document.getElementById('username') as HTMLInputElement;
      if (usernameInput) {
        usernameInput.focus();
        usernameInput.select();
      }
    }, 100);
  }
}
