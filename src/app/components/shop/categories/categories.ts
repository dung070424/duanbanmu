import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { CustomerService } from '../../../services/customer.service';
import { HoaDonChoService } from '../../../services/hoa-don-cho.service';
import { ChatbotComponent } from '../chatbot/chatbot.component';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, RouterModule, ChatbotComponent],
  templateUrl: './categories.html',
  styleUrl: './categories.scss'
})
export class CategoriesComponent implements OnInit {
  customerName: string = '';
  cartCount = 0;
  showSearch = false;

  constructor(
    public authService: AuthService,
    public router: Router,
    private customerService: CustomerService,
    private hoaDonChoService: HoaDonChoService
  ) {}

  ngOnInit(): void {
    this.updateCartCount();
    if (this.authService.isLoggedIn()) {
      this.loadCustomerName();
    }
  }

  updateCartCount(): void {
    if (!this.authService.isLoggedIn()) {
      const tempCart = JSON.parse(localStorage.getItem('temp_cart') || '[]');
      this.cartCount = tempCart.length;
      return;
    }

    const savedCartId = localStorage.getItem('current_cart_id');
    if (savedCartId) {
      this.hoaDonChoService.getHoaDonChoById(parseInt(savedCartId)).subscribe({
        next: (cart) => {
          this.cartCount = cart?.danhSachGioHang?.length || 0;
        },
        error: () => {
          this.cartCount = 0;
        }
      });
    } else {
      this.cartCount = 0;
    }
  }

  loadCustomerName(): void {
    if (!this.authService.isLoggedIn()) {
      this.customerName = '';
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      this.customerName = '';
      return;
    }

    this.customerService.getCustomerByUserId(currentUser.id).subscribe({
      next: (customer) => {
        this.customerName = customer.tenKhachHang || '';
      },
      error: () => {
        this.customerName = '';
      }
    });
  }

  toggleSearch(): void {
    this.showSearch = !this.showSearch;
  }

  navigateToProfile(event: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (!this.authService.isLoggedIn()) {
      this.router.navigateByUrl('/shop/login');
      return;
    }
    
    this.router.navigate(['/customer/profile']);
  }

  logout(): void {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      this.authService.logout();
      this.customerName = '';
      this.cartCount = 0;
      localStorage.removeItem('temp_cart');
      localStorage.removeItem('current_cart_id');
      this.router.navigate(['/shop']);
    }
  }

  goToCart(): void {
    this.router.navigate(['/shop/cart']);
  }
}
