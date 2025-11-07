import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ProductApiService, SanPhamResponse } from '../../services/product-api.service';
import { LoaiMuBaoHiemApiService, LoaiMuBaoHiemResponse } from '../../services/loai-mu-bao-hiem-api.service';
import { AuthService } from '../../services/auth';
import { MockDataService } from '../../services/mock-data.service';

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
  selector: 'app-product-category',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './product-category.component.html',
  styleUrls: ['./product-category.component.scss']
})
export class ProductCategoryComponent implements OnInit {
  products: SanPhamResponse[] = [];
  filteredProducts: SanPhamResponse[] = [];
  categories: Category[] = [];
  relatedProducts: SanPhamResponse[] = [];
  
  selectedCategoryId: number | null = null;
  selectedCategoryName: string = '';
  categoryParam: string = '';
  
  minPrice: number = 0;
  maxPrice: number = 10000000;
  priceRange: [number, number] = [0, 10000000];
  
  sortOrder: string = 'default';
  isLoading = false;
  cart: CartItem[] = [];
  cartCount = 0;
  newsletterEmail = '';
  footerNewsletterEmail = '';
  showDropdown = false;

  // Category mapping từ query params sang tên
  categoryMap: { [key: string]: string } = {
    'non-3-4': 'Nón 3/4',
    'non-full-face': 'Nón Full Face',
    'non-lat-cam': 'Nón lật cằm',
    'non-tre-em': 'Nón trẻ em',
    'non-carbon': 'Nón Carbon',
    'phu-kien': 'Phụ kiện'
  };

  // Reverse mapping từ tên sang query param
  categoryReverseMap: { [key: string]: string } = {
    'Nón 3/4': 'non-3-4',
    'Nón Full Face': 'non-full-face',
    'Nón lật cằm': 'non-lat-cam',
    'Nón trẻ em': 'non-tre-em',
    'Nón Carbon': 'non-carbon',
    'Phụ kiện': 'phu-kien'
  };

  useMockData: boolean = true; // Set true để dùng mock data, false để dùng API

  constructor(
    private productApiService: ProductApiService,
    private loaiMuBaoHiemService: LoaiMuBaoHiemApiService,
    public authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private mockDataService: MockDataService,
    private elementRef: ElementRef
  ) {
    this.loadCart();
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.categoryParam = params['category'] || '';
      this.loadCategories();
      this.loadProducts();
    });
  }

  loadCategories(): void {
    if (this.useMockData) {
      // Sử dụng mock data
      const mockCategories = this.mockDataService.getMockCategories();
      this.categories = mockCategories.map(cat => ({
        id: cat.id,
        tenLoaiMu: cat.tenLoai || '',
        trangThai: cat.trangThai || true
      }));
      
      // Tìm category dựa trên param
      if (this.categoryParam) {
        const categoryName = this.categoryMap[this.categoryParam];
        if (categoryName) {
          const found = this.categories.find(c => c.tenLoaiMu === categoryName);
          if (found) {
            this.selectedCategoryId = found.id;
            this.selectedCategoryName = found.tenLoaiMu;
          }
        }
      }
    } else {
      // Sử dụng API
      this.loaiMuBaoHiemService.getAllActive().subscribe({
        next: (categories) => {
          this.categories = categories.map(cat => ({
            id: cat.id,
            tenLoaiMu: cat.tenLoai || '',
            trangThai: cat.trangThai || true
          }));
          
          // Tìm category dựa trên param
          if (this.categoryParam) {
            const categoryName = this.categoryMap[this.categoryParam];
            if (categoryName) {
              const found = this.categories.find(c => c.tenLoaiMu === categoryName);
              if (found) {
                this.selectedCategoryId = found.id;
                this.selectedCategoryName = found.tenLoaiMu;
              }
            }
          }
        },
        error: (error) => {
          console.error('Error loading categories:', error);
          // Fallback to mock data on error
          const mockCategories = this.mockDataService.getMockCategories();
          this.categories = mockCategories.map(cat => ({
            id: cat.id,
            tenLoaiMu: cat.tenLoai || '',
            trangThai: cat.trangThai || true
          }));
        }
      });
    }
  }

  loadProducts(): void {
    this.isLoading = true;
    
    if (this.useMockData) {
      // Sử dụng mock data
      setTimeout(() => {
        this.products = this.mockDataService.getMockProducts();
        
        // Tính toán min/max price từ tất cả products
        if (this.products.length > 0) {
          const prices = this.products.map(p => Number(p.giaBan) || 0);
          this.minPrice = Math.min(...prices);
          this.maxPrice = Math.max(...prices);
          
          // Khởi tạo price range nếu chưa được set
          if (this.priceRange[0] === 0 && this.priceRange[1] === 10000000) {
            this.priceRange = [this.minPrice, this.maxPrice];
          }
        }
        
        this.filterProducts();
        this.loadRelatedProducts();
        this.isLoading = false;
      }, 500); // Simulate API delay
    } else {
      // Sử dụng API
      this.productApiService.search({
        trangThai: true,
        page: 0,
        size: 1000,
        useCustomerEndpoint: true
      }).subscribe({
        next: (response) => {
          this.products = response.content.filter(p => p.trangThai === true);
          
          // Tính toán min/max price từ tất cả products
          if (this.products.length > 0) {
            const prices = this.products.map(p => Number(p.giaBan) || 0);
            this.minPrice = Math.min(...prices);
            this.maxPrice = Math.max(...prices);
            
            // Khởi tạo price range nếu chưa được set
            if (this.priceRange[0] === 0 && this.priceRange[1] === 10000000) {
              this.priceRange = [this.minPrice, this.maxPrice];
            }
          }
          
          this.filterProducts();
          this.loadRelatedProducts();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading products:', error);
          // Fallback to mock data on error
          this.products = this.mockDataService.getMockProducts();
          
          if (this.products.length > 0) {
            const prices = this.products.map(p => Number(p.giaBan) || 0);
            this.minPrice = Math.min(...prices);
            this.maxPrice = Math.max(...prices);
            
            if (this.priceRange[0] === 0 && this.priceRange[1] === 10000000) {
              this.priceRange = [this.minPrice, this.maxPrice];
            }
          }
          
          this.filterProducts();
          this.loadRelatedProducts();
          this.isLoading = false;
        }
      });
    }
  }

  filterProducts(): void {
    let filtered = [...this.products];

    // Lọc theo category
    if (this.selectedCategoryId) {
      filtered = filtered.filter(p => p.loaiMuBaoHiemId === this.selectedCategoryId);
    }

    // Lọc theo giá
    filtered = filtered.filter(p => {
      const price = Number(p.giaBan) || 0;
      return price >= this.priceRange[0] && price <= this.priceRange[1];
    });

    // Sắp xếp
    filtered = this.sortProducts(filtered);

    this.filteredProducts = filtered;
  }

  sortProducts(products: SanPhamResponse[]): SanPhamResponse[] {
    const sorted = [...products];
    switch (this.sortOrder) {
      case 'price-asc':
        return sorted.sort((a, b) => (Number(a.giaBan) || 0) - (Number(b.giaBan) || 0));
      case 'price-desc':
        return sorted.sort((a, b) => (Number(b.giaBan) || 0) - (Number(a.giaBan) || 0));
      case 'name-asc':
        return sorted.sort((a, b) => (a.tenSanPham || '').localeCompare(b.tenSanPham || ''));
      case 'name-desc':
        return sorted.sort((a, b) => (b.tenSanPham || '').localeCompare(a.tenSanPham || ''));
      default:
        return sorted;
    }
  }

  onSortChange(): void {
    this.filterProducts();
  }

  onCategoryClick(category: Category): void {
    this.selectedCategoryId = category.id;
    this.selectedCategoryName = category.tenLoaiMu;
    
    // Cập nhật URL với query param
    const categoryParam = this.categoryReverseMap[category.tenLoaiMu] || '';
    this.router.navigate(['/shop/products'], {
      queryParams: categoryParam ? { category: categoryParam } : {}
    });
    
    this.filterProducts();
  }

  onPriceRangeChange(): void {
    this.filterProducts();
  }

  loadRelatedProducts(): void {
    // Lấy 4 sản phẩm ngẫu nhiên hoặc best selling
    this.relatedProducts = [...this.products]
      .sort(() => Math.random() - 0.5)
      .slice(0, 4);
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

  subscribeNewsletter(): void {
    if (this.newsletterEmail.trim()) {
      alert(`Đã đăng ký nhận thông tin với email: ${this.newsletterEmail}`);
      this.newsletterEmail = '';
    } else {
      alert('Vui lòng nhập email của bạn');
    }
  }

  subscribeFooterNewsletter(): void {
    if (this.footerNewsletterEmail.trim()) {
      alert(`Đã đăng ký nhận thông tin với email: ${this.footerNewsletterEmail}`);
      this.footerNewsletterEmail = '';
    } else {
      alert('Vui lòng nhập email của bạn');
    }
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
