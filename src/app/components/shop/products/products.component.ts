import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { ProductApiService, SanPhamResponse } from '../../../services/product-api.service';
import {
  LoaiMuBaoHiemApiService,
  LoaiMuBaoHiemResponse,
} from '../../../services/loai-mu-bao-hiem-api.service';
import {
  ChiTietSanPhamApiService,
  ChiTietSanPhamResponse,
} from '../../../services/chi-tiet-san-pham-api.service';
import { ChatbotComponent } from '../chatbot/chatbot.component';
import { ShopHeaderComponent } from '../shared/shop-header.component';
import { ShopFooterComponent } from '../shared/shop-footer.component';

@Component({
  selector: 'app-shop-products',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ChatbotComponent,
    ShopHeaderComponent,
    ShopFooterComponent,
  ],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
})
export class ShopProductsComponent implements OnInit {
  customerName = '';
  cartCount = 0;
  products: SanPhamResponse[] = [];
  filteredProducts: SanPhamResponse[] = [];
  categories: LoaiMuBaoHiemResponse[] = [];
  searchKeyword = '';
  selectedCategory = 'all';
  isLoading = false;
  errorMessage = '';
  highlightProductId?: number;
  currentYear = new Date().getFullYear();
  productVariantImages: Record<number, string> = {};
  chiTietSanPhamCache: ChiTietSanPhamResponse[] = [];

  constructor(
    public authService: AuthService,
    private productApiService: ProductApiService,
    private loaiMuBaoHiemService: LoaiMuBaoHiemApiService,
    private chiTietSanPhamService: ChiTietSanPhamApiService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      const user = this.authService.getCurrentUser();
      this.customerName = user?.username || '';
    }

    // Load query params trước
    this.loadQueryParams();
    // Load categories và products
    this.loadCategories();
    this.loadProducts();
    // Sau đó mới observe query params để cập nhật khi có thay đổi
    this.observeQueryParams();
  }

  private loadQueryParams(): void {
    const params = this.route.snapshot.queryParamMap;
    const categoryParam = params.get('category');
    this.selectedCategory = categoryParam && categoryParam !== 'all' ? categoryParam : 'all';
    this.searchKeyword = params.get('keyword') ?? '';

    const highlightParam = params.get('highlight');
    this.highlightProductId = highlightParam ? Number(highlightParam) : undefined;
  }

  private observeQueryParams(): void {
    this.route.queryParamMap.subscribe((params) => {
      const categoryParam = params.get('category');
      this.selectedCategory = categoryParam && categoryParam !== 'all' ? categoryParam : 'all';
      this.searchKeyword = params.get('keyword') ?? '';

      const highlightParam = params.get('highlight');
      this.highlightProductId = highlightParam ? Number(highlightParam) : undefined;

      // Chỉ apply filters nếu đã có products
      if (this.products.length > 0) {
        this.applyFilters();
        if (this.highlightProductId) {
          setTimeout(() => this.scrollToHighlightedCard(), 300);
        }
        this.cdr.detectChanges();
      }
    });
  }

  loadProducts(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.productApiService
      .search({
        trangThai: true,
        page: 0,
        size: 200,
        sort: 'tenSanPham,asc',
        useCustomerEndpoint: true,
      })
      .subscribe({
        next: (res) => {
          this.products = res?.content ?? [];
          // Áp dụng filters ngay sau khi load products
          this.applyFilters();
          // Load variant images (async, sẽ apply filters lại sau khi load xong)
          this.loadVariantImages();
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load products', err);
          this.errorMessage = 'Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.';
          this.products = [];
          this.filteredProducts = [];
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
  }

  private loadCategories(): void {
    this.loaiMuBaoHiemService.getAllActive().subscribe({
      next: (res) => {
        this.categories = res || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.categories = [];
        this.cdr.detectChanges();
      },
    });
  }

  applyFilters(): void {
    if (!this.products || this.products.length === 0) {
      this.filteredProducts = [];
      return;
    }

    const keyword = this.searchKeyword.trim().toLowerCase();
    this.filteredProducts = this.products.filter((product) => {
      const matchesKeyword =
        !keyword ||
        product.tenSanPham?.toLowerCase().includes(keyword) ||
        product.maSanPham?.toLowerCase().includes(keyword);

      const matchesCategory =
        this.selectedCategory === 'all' ||
        (product.loaiMuBaoHiemId !== undefined &&
          product.loaiMuBaoHiemId !== null &&
          String(product.loaiMuBaoHiemId) === this.selectedCategory) ||
        (product.loaiMuBaoHiemTen &&
          product.loaiMuBaoHiemTen.toLowerCase().includes(this.selectedCategory.toLowerCase()));

      return matchesKeyword && matchesCategory;
    });

    // Scroll to highlighted product nếu có
    if (this.highlightProductId && this.filteredProducts.length > 0) {
      setTimeout(() => this.scrollToHighlightedCard(), 300);
    }
    this.cdr.detectChanges();
  }

  onSearchChange(): void {
    this.applyFilters();
    this.cdr.detectChanges();
  }

  onCategoryChange(): void {
    this.applyFilters();
    this.cdr.detectChanges();
  }

  formatCurrency(value?: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value ?? 0);
  }

  getProductImageUrl(product: SanPhamResponse): string {
    const variantImage = this.productVariantImages[product.id];
    return this.normalizeImagePath(variantImage || product.anhSanPham);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'https://via.placeholder.com/400x400?text=No+Image';
  }

  viewProductDetail(productId: number): void {
    this.router.navigate(['/shop/product', productId]).catch((error) => {
      console.error('Navigation to product detail failed', error);
    });
  }

  goToCart(): void {
    this.router.navigate(['/shop/cart']);
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

  private scrollToHighlightedCard(): void {
    if (!this.highlightProductId) return;
    const element = document.querySelector<HTMLElement>(
      `[data-product-id="${this.highlightProductId}"]`
    );
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('pulse');
      setTimeout(() => element.classList.remove('pulse'), 2000);
    }
  }

  trackByProduct(_: number, item: SanPhamResponse): number {
    return item.id;
  }

  private loadVariantImages(): void {
    this.chiTietSanPhamService.getAll().subscribe({
      next: (variants: ChiTietSanPhamResponse[]) => {
        this.chiTietSanPhamCache = variants || [];
        const map: Record<number, string> = {};
        variants.forEach((variant) => {
          if (!variant?.sanPhamId) return;
          if (variant.anhSanPham && !map[variant.sanPhamId]) {
            map[variant.sanPhamId] = this.normalizeImagePath(variant.anhSanPham);
          }
        });
        this.productVariantImages = map;
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: () => {
        this.productVariantImages = {};
        this.cdr.detectChanges();
      },
    });
  }

  private normalizeImagePath(src?: string | null): string {
    if (!src) {
      return 'https://via.placeholder.com/400x400?text=No+Image';
    }

    const trimmed = src.trim();
    if (!trimmed) {
      return 'https://via.placeholder.com/400x400?text=No+Image';
    }

    if (/^data:image\//i.test(trimmed)) {
      return trimmed;
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }

    if (this.looksLikeBase64(trimmed)) {
      return `data:image/jpeg;base64,${trimmed.replace(/^\/+/, '')}`;
    }

    if (trimmed.startsWith('/')) {
      return trimmed;
    }

    return `/${trimmed}`;
  }

  private looksLikeBase64(value: string): boolean {
    if (!value) return false;
    const cleaned = value.replace(/\s+/g, '');
    return cleaned.length > 40 && /^[A-Za-z0-9+/]+=*$/.test(cleaned);
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/shop']);
    }
  }
}
