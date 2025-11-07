import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProductApiService, SanPhamResponse } from '../../services/product-api.service';
import { StatisticsService } from '../../services/statistics.service';
import { LoaiMuBaoHiemApiService } from '../../services/loai-mu-bao-hiem-api.service';
import { AuthService } from '../../services/auth';

interface CartItem {
  product: SanPhamResponse;
  quantity: number;
}

interface Category {
  id: number;
  tenLoaiMu: string;
  trangThai: boolean;
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
  bestSellingProducts: SanPhamResponse[] = [];
  featuredProducts: SanPhamResponse[] = [];
  bestPriceProducts: SanPhamResponse[] = [];
  categories: Category[] = [];
  
  activeTab: 'best-selling' | 'featured' | 'best-price' = 'best-selling';
  searchKeyword = '';
  selectedPriceRange = 'all';
  isLoading = false;
  showSearch = false;
  showDropdown = false;
  showMiniCart = false;
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
    private statisticsService: StatisticsService,
    private loaiMuBaoHiemService: LoaiMuBaoHiemApiService,
    public authService: AuthService,
    private router: Router,
    private elementRef: ElementRef
  ) {
    this.loadCart();
  }

  ngOnInit(): void {
    this.loadProducts();
    this.loadBestSellingProducts();
    this.loadCategories();
  }

  loadProducts(): void {
    this.isLoading = true;
    this.productApiService.search({
      trangThai: true,
      page: 0,
      size: 1000,
      useCustomerEndpoint: true
    }).subscribe({
      next: (response) => {
        this.products = response.content.filter(p => p.trangThai === true);
        this.filteredProducts = [...this.products];
        
        // Featured products: lấy 8 sản phẩm đầu tiên
        this.featuredProducts = this.products.slice(0, 8);
        
        // Best price products: sắp xếp theo giá tăng dần, lấy 8 sản phẩm
        this.bestPriceProducts = [...this.products]
          .sort((a, b) => (Number(a.giaBan) || 0) - (Number(b.giaBan) || 0))
          .slice(0, 8);
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.isLoading = false;
      }
    });
  }

  loadBestSellingProducts(): void {
    this.statisticsService.getBestSellingProducts(8).subscribe({
      next: (response) => {
        if (response && response.data) {
          // Map best selling products từ statistics service
          // Cần load chi tiết sản phẩm từ product service
          const bestSellingIds = response.data.map(item => item.sanPhamId);
          this.productApiService.search({
            trangThai: true,
            page: 0,
            size: 1000,
            useCustomerEndpoint: true
          }).subscribe({
            next: (productResponse) => {
              this.bestSellingProducts = productResponse.content
                .filter(p => bestSellingIds.includes(p.id))
                .slice(0, 8);
            },
            error: (error) => {
              console.error('Error loading best selling product details:', error);
            }
          });
        }
      },
      error: (error) => {
        console.error('Error loading best selling products:', error);
        // Fallback: lấy 8 sản phẩm đầu tiên
        this.bestSellingProducts = this.products.slice(0, 8);
      }
    });
  }

  loadCategories(): void {
    this.loaiMuBaoHiemService.getAllActive().subscribe({
      next: (categories) => {
        this.categories = categories.map(cat => ({
          id: cat.id,
          tenLoaiMu: cat.tenLoai || '', // Map tenLoai to tenLoaiMu
          trangThai: cat.trangThai || true
        }));
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.categories = [];
      }
    });
  }

  getActiveProducts(): SanPhamResponse[] {
    switch (this.activeTab) {
      case 'best-selling':
        return this.bestSellingProducts;
      case 'featured':
        return this.featuredProducts;
      case 'best-price':
        return this.bestPriceProducts;
      default:
        return [];
    }
  }

  setActiveTab(tab: 'best-selling' | 'featured' | 'best-price'): void {
    this.activeTab = tab;
  }

  getProductsByCategory(categoryId: number): SanPhamResponse[] {
    return this.products.filter(p => p.loaiMuBaoHiemId === categoryId);
  }

  toggleSearch(): void {
    this.showSearch = !this.showSearch;
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
    
    const clickedCartIcon = this.elementRef.nativeElement.querySelector('.cart-wrapper')?.contains(event.target as Node);
    const clickedMiniCart = this.elementRef.nativeElement.querySelector('.mini-cart-popup')?.contains(event.target as Node);
    if (!clickedCartIcon && !clickedMiniCart && this.showMiniCart) {
      this.closeMiniCart();
    }
  }

  toggleMiniCart(): void {
    this.showMiniCart = !this.showMiniCart;
    if (this.showMiniCart) {
      this.loadCart();
    }
  }

  closeMiniCart(): void {
    this.showMiniCart = false;
  }

  removeFromCart(index: number): void {
    this.cart.splice(index, 1);
    this.saveCart();
    this.updateCartCount();
  }

  getCartSubtotal(): number {
    return this.cart.reduce((sum, item) => {
      return sum + (Number(item.product.giaBan) || 0) * item.quantity;
    }, 0);
  }

  goToCart(): void {
    this.closeMiniCart();
    this.router.navigate(['/shop/cart']);
  }

  goToCheckout(): void {
    this.closeMiniCart();
    if (!this.authService.isCustomer()) {
      this.router.navigate(['/login']);
      return;
    }
    this.router.navigate(['/shop/checkout']);
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
    
    // Tự động mở mini-cart popup
    this.showMiniCart = true;
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
