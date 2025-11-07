import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProductApiService, SanPhamResponse } from '../../services/product-api.service';
import { AuthService } from '../../services/auth';

interface CartItem {
  product: SanPhamResponse;
  quantity: number;
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit {
  cart: CartItem[] = [];
  cartCount = 0;
  showDropdown = false;
  
  // Form fields
  firstName = '';
  lastName = '';
  country = 'Việt Nam';
  address = '';
  city = '';
  phone = '';
  email = '';
  createAccount = false;
  shipToDifferentAddress = false;
  orderNotes = '';
  
  // Payment
  paymentMethod: 'cod' | 'bank' = 'cod';
  
  // Discount
  discountCode = '';
  showDiscountInput = false;
  showLoginPrompt = false;
  
  // Newsletter
  newsletterEmail = '';

  constructor(
    public authService: AuthService,
    private router: Router,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.loadCart();
    if (this.cart.length === 0) {
      this.router.navigate(['/shop/cart']);
      return;
    }
    
    // Load user info if logged in
    if (this.authService.isCustomer()) {
      const user = this.authService.getCurrentUser();
      if (user) {
        this.email = user.email || '';
        if (user.fullName) {
          const nameParts = user.fullName.split(' ');
          this.firstName = nameParts[0] || '';
          this.lastName = nameParts.slice(1).join(' ') || '';
        }
      }
    }
  }

  loadCart(): void {
    if (typeof window !== 'undefined') {
      const cartData = localStorage.getItem('shop_cart');
      if (cartData) {
        try {
          this.cart = JSON.parse(cartData);
          this.updateCartCount();
        } catch (e) {
          this.cart = [];
        }
      }
    }
  }

  updateCartCount(): void {
    this.cartCount = this.cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  getSubtotal(): number {
    return this.cart.reduce((sum, item) => {
      return sum + (Number(item.product.giaBan) || 0) * item.quantity;
    }, 0);
  }

  getShippingFee(): number {
    return 0; // Free shipping
  }

  getTotal(): number {
    return this.getSubtotal() + this.getShippingFee();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  getProductImageUrl(product: SanPhamResponse): string {
    return product.anhSanPham || '/assets/default-product.png';
  }

  toggleDiscountInput(): void {
    this.showDiscountInput = !this.showDiscountInput;
  }

  toggleLoginPrompt(): void {
    this.showLoginPrompt = !this.showLoginPrompt;
    if (this.showLoginPrompt) {
      this.router.navigate(['/login']);
    }
  }

  applyDiscountCode(): void {
    if (this.discountCode.trim()) {
      alert(`Đã áp dụng mã giảm giá: ${this.discountCode}`);
      // TODO: Implement discount logic
    } else {
      alert('Vui lòng nhập mã giảm giá');
    }
  }

  placeOrder(): void {
    // Validate required fields
    if (!this.firstName || !this.lastName || !this.address || !this.city || !this.phone || !this.email) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc (*)');
      return;
    }

    // TODO: Submit order to backend
    alert('Đặt hàng thành công!');
    // Clear cart and redirect
    localStorage.removeItem('shop_cart');
    this.router.navigate(['/shop']);
  }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }

  closeDropdown(): void {
    this.showDropdown = false;
  }

  subscribeNewsletter(): void {
    if (this.newsletterEmail.trim()) {
      alert(`Đã đăng ký nhận tin với email: ${this.newsletterEmail}`);
      this.newsletterEmail = '';
      // TODO: Implement newsletter subscription logic
    } else {
      alert('Vui lòng nhập email');
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const clickedInside = this.elementRef.nativeElement.querySelector('.has-dropdown')?.contains(event.target as Node);
    if (!clickedInside && this.showDropdown) {
      this.closeDropdown();
    }
  }
}

