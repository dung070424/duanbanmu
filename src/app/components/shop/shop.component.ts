import { Component, OnInit } from '@angular/core';
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
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './shop.component.html',
  styleUrls: ['./shop.component.scss']
})
export class ShopComponent implements OnInit {
  products: SanPhamResponse[] = [];
  filteredProducts: SanPhamResponse[] = [];
  searchKeyword = '';
  selectedPriceRange = 'all';
  isLoading = false;
  cart: CartItem[] = [];
  cartCount = 0;

  priceRanges = [
    { value: 'all', label: 'Tất cả' },
    { value: '0-500000', label: 'Dưới 500.000đ' },
    { value: '500000-1000000', label: '500.000đ - 1.000.000đ' },
    { value: '1000000-2000000', label: '1.000.000đ - 2.000.000đ' },
    { value: '2000000', label: 'Trên 2.000.000đ' }
  ];

  constructor(
    private productApiService: ProductApiService,
    public authService: AuthService, // Public để template có thể access
    private router: Router
  ) {
    this.loadCart();
  }

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading = true;
    // Sử dụng endpoint customer - không cần authentication
    this.productApiService.search({
      trangThai: true,
      page: 0,
      size: 1000,
      useCustomerEndpoint: true
    }).subscribe({
      next: (response) => {
        // Chỉ hiển thị sản phẩm có trạng thái active
        this.products = response.content.filter(p => p.trangThai === true);
        this.filteredProducts = [...this.products];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.isLoading = false;
      }
    });
  }

  filterProducts(): void {
    let filtered = [...this.products];

    // Tìm kiếm theo từ khóa
    if (this.searchKeyword.trim()) {
      const keyword = this.searchKeyword.toLowerCase();
      filtered = filtered.filter(p => 
        p.tenSanPham?.toLowerCase().includes(keyword) ||
        p.maSanPham?.toLowerCase().includes(keyword) ||
        p.mauSacTen?.toLowerCase().includes(keyword) ||
        p.loaiMuBaoHiemTen?.toLowerCase().includes(keyword) ||
        p.nhaSanXuatTen?.toLowerCase().includes(keyword)
      );
    }

    // Lọc theo khoảng giá
    if (this.selectedPriceRange !== 'all') {
      filtered = filtered.filter(p => {
        const price = Number(p.giaBan) || 0;
        switch (this.selectedPriceRange) {
          case '0-500000':
            return price < 500000;
          case '500000-1000000':
            return price >= 500000 && price < 1000000;
          case '1000000-2000000':
            return price >= 1000000 && price < 2000000;
          case '2000000':
            return price >= 2000000;
          default:
            return true;
        }
      });
    }

    this.filteredProducts = filtered;
  }

  addToCart(product: SanPhamResponse): void {
    if (!this.authService.isCustomer()) {
      this.router.navigate(['/login']);
      return;
    }

    const existingItem = this.cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      this.cart.push({ product, quantity: 1 });
    }

    this.saveCart();
    this.updateCartCount();
    
    // Hiển thị thông báo (có thể dùng toast service)
    alert(`Đã thêm "${product.tenSanPham}" vào giỏ hàng!`);
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
    }
  }

  updateCartCount(): void {
    this.cartCount = this.cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  getProductPrice(product: SanPhamResponse): number {
    return Number(product.giaBan) || 0;
  }

  getProductImageUrl(product: SanPhamResponse): string {
    return product.anhSanPham || '/assets/default-product.png';
  }

  viewProduct(productId: number): void {
    this.router.navigate(['/shop/product', productId]);
  }
}
