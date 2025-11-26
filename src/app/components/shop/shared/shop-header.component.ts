import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth';
import { CustomerService } from '../../../services/customer.service';
import { HoaDonChoService } from '../../../services/hoa-don-cho.service';

@Component({
  selector: 'app-shop-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './shop-header.component.html',
  styleUrls: ['./shop-header.component.scss'],
})
export class ShopHeaderComponent implements OnInit, OnDestroy {
  customerName = '';
  cartCount = 0;
  private authSubscription?: Subscription;
  private cartUpdateListener?: () => void;

  constructor(
    public authService: AuthService,
    private customerService: CustomerService,
    private hoaDonChoService: HoaDonChoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadHeaderState();
    this.authSubscription = this.authService.isAuthenticated$.subscribe(() => {
      this.loadHeaderState();
    });
    
    // Lắng nghe sự kiện cập nhật cart từ các component khác
    this.cartUpdateListener = () => {
      this.updateCartCount();
    };
    window.addEventListener('cartUpdated', this.cartUpdateListener);
    
    // Lắng nghe storage events để cập nhật khi localStorage thay đổi
    window.addEventListener('storage', (e) => {
      if (e.key === 'temp_cart') {
        this.updateCartCount();
      }
    });
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
    if (this.cartUpdateListener) {
      window.removeEventListener('cartUpdated', this.cartUpdateListener);
    }
  }

  goToProducts(filter?: string): void {
    const queryParams = filter ? { category: filter } : undefined;
    this.router.navigate(['/shop/products'], { queryParams }).catch((error) => {
      console.error('Navigation to products failed:', error);
    });
  }

  goToCart(): void {
    this.router.navigate(['/shop/cart']).catch(() => {});
  }

  navigateToProfile(event: Event): void {
    event.preventDefault();
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/customer/profile']).catch(() => {});
    } else {
      this.router.navigate(['/shop/login']).catch(() => {});
    }
  }

  logout(): void {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      this.authService.logout();
      this.customerName = '';
      this.cartCount = 0;
      localStorage.removeItem('temp_cart');
      localStorage.removeItem('current_cart_id');
      this.router.navigate(['/shop']).catch(() => {});
    }
  }

  private loadHeaderState(): void {
    if (this.authService.isLoggedIn()) {
      this.loadCustomerName();
      this.updateCartCountFromServer();
    } else {
      this.customerName = '';
      this.updateCartCountFromLocal();
    }
  }

  private loadCustomerName(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.customerName = '';
      return;
    }

    // Sử dụng /api/khach-hang/me thay vì /api/khach-hang/{id} để tránh lỗi 404
    if (this.authService.isLoggedIn()) {
      this.customerService.getCurrentCustomer().subscribe({
        next: (customer) => {
          this.customerName =
            customer?.tenKhachHang || currentUser.fullName || currentUser.username || 'Tài khoản';
        },
        error: () => {
          // Nếu không tìm thấy customer, sử dụng thông tin từ user
          this.customerName = currentUser.fullName || currentUser.username || 'Tài khoản';
        },
      });
    } else {
      this.customerName = currentUser.fullName || currentUser.username || 'Tài khoản';
    }
  }

  private updateCartCountFromLocal(): void {
    try {
      const tempCart = JSON.parse(localStorage.getItem('temp_cart') || '[]');
      this.cartCount = Array.isArray(tempCart)
        ? tempCart.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)
        : 0;
    } catch {
      this.cartCount = 0;
    }
  }

  private updateCartCountFromServer(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.cartCount = 0;
      return;
    }

    // Lấy khachHangId từ customer service
    this.customerService.getCurrentCustomer().subscribe({
      next: (customer) => {
        const khachHangId = customer?.id;
        if (!khachHangId) {
          this.cartCount = 0;
          return;
        }

        this.hoaDonChoService.getHoaDonChoByKhachHangId(khachHangId).subscribe({
          next: (carts) => {
            const activeCart = carts.find((c) => c.trangThai === 'DANG_CHO');
            if (activeCart) {
              this.cartCount =
                activeCart.danhSachGioHang?.reduce((sum, item) => sum + (item.soLuong || 0), 0) || 0;
              if (activeCart.id) {
                localStorage.setItem('current_cart_id', String(activeCart.id));
              }
            } else {
              this.cartCount = 0;
            }
          },
          error: () => {
            this.cartCount = 0;
          },
        });
      },
      error: () => {
        this.cartCount = 0;
      },
    });
  }

  /**
   * Cập nhật cart count (được gọi từ event hoặc khi cần refresh)
   */
  updateCartCount(): void {
    if (this.authService.isLoggedIn()) {
      this.updateCartCountFromServer();
    } else {
      this.updateCartCountFromLocal();
    }
  }
}
