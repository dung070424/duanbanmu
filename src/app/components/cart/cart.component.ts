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
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss']
})
export class CartComponent implements OnInit {
  cart: CartItem[] = [];
  cartCount = 0;
  discountCode = '';
  selectedShipping: 'free' | 'standard' = 'standard';
  shippingFee = 30000;
  showDropdown = false;

  constructor(
    public authService: AuthService,
    private router: Router,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.loadCart();
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

  saveCart(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('shop_cart', JSON.stringify(this.cart));
      this.updateCartCount();
    }
  }

  updateCartCount(): void {
    this.cartCount = this.cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  removeItem(index: number): void {
    this.cart.splice(index, 1);
    this.saveCart();
  }

  updateQuantity(index: number, quantity: number): void {
    if (quantity < 1) {
      quantity = 1;
    }
    this.cart[index].quantity = quantity;
    this.saveCart();
  }

  getSubtotal(): number {
    return this.cart.reduce((sum, item) => {
      return sum + (Number(item.product.giaBan) || 0) * item.quantity;
    }, 0);
  }

  getShippingFee(): number {
    return this.selectedShipping === 'free' ? 0 : this.shippingFee;
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

  applyDiscountCode(): void {
    if (this.discountCode.trim()) {
      alert(`Đã áp dụng mã giảm giá: ${this.discountCode}`);
      // TODO: Implement discount logic
    } else {
      alert('Vui lòng nhập mã giảm giá');
    }
  }

  updateCart(): void {
    this.saveCart();
    alert('Đã cập nhật giỏ hàng!');
  }

  continueShopping(): void {
    this.router.navigate(['/shop/products']);
  }

  proceedToCheckout(): void {
    if (this.cart.length === 0) {
      alert('Giỏ hàng của bạn đang trống!');
      return;
    }
    
    if (!this.authService.isCustomer()) {
      this.router.navigate(['/login']);
      return;
    }

    this.router.navigate(['/shop/checkout']);
  }

  onShippingChange(): void {
    // Shipping fee will be recalculated automatically
  }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }

  closeDropdown(): void {
    this.showDropdown = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const clickedInside = this.elementRef.nativeElement.querySelector('.has-dropdown')?.contains(event.target as Node);
    if (!clickedInside && this.showDropdown) {
      this.closeDropdown();
    }
  }
}

