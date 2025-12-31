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
import {
  ManufacturerApiService,
  ManufacturerResponse,
} from '../../../services/manufacturer-api.service';
import {
  MaterialApiService,
  MaterialResponse,
} from '../../../services/material-api.service';
import { ChatbotComponent } from '../chatbot/chatbot.component';
import { ShopHeaderComponent } from '../shared/shop-header.component';
import { ShopFooterComponent } from '../shared/shop-footer.component';
import { NotificationComponent } from '../shared/notification.component';

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
    NotificationComponent,
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
  manufacturers: ManufacturerResponse[] = [];
  materials: MaterialResponse[] = [];
  searchKeyword = '';
  selectedCategory = 'all';
  selectedManufacturer = 'all';
  selectedMaterial = 'all';
  isLoading = false;
  errorMessage = '';
  highlightProductId?: number;
  currentYear = new Date().getFullYear();
  productVariantImages: Record<number, string> = {};
  chiTietSanPhamCache: ChiTietSanPhamResponse[] = [];
  // Lưu min/max giá cho từng sản phẩm
  productPriceRange: Record<
    number,
    {
      minPrice: number | null;
      maxPrice: number | null;
    }
  > = {};

  constructor(
    public authService: AuthService,
    private productApiService: ProductApiService,
    private loaiMuBaoHiemService: LoaiMuBaoHiemApiService,
    private chiTietSanPhamService: ChiTietSanPhamApiService,
    private manufacturerApiService: ManufacturerApiService,
    private materialApiService: MaterialApiService,
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
    // Load categories trước
    this.loadCategories();
    // Load products trước để có dữ liệu extract
    this.loadProducts();
    // Sau đó load manufacturers và materials (sẽ merge với dữ liệu từ products)
    this.loadManufacturers();
    this.loadMaterials();
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
          console.log('Loaded products:', this.products.length);
          // Log sample product để kiểm tra dữ liệu
          if (this.products.length > 0) {
            console.log('Sample product:', {
              id: this.products[0].id,
              tenSanPham: this.products[0].tenSanPham,
              nhaSanXuatId: this.products[0].nhaSanXuatId,
              nhaSanXuatTen: this.products[0].nhaSanXuatTen,
              chatLieuVoId: this.products[0].chatLieuVoId,
              chatLieuVoTen: this.products[0].chatLieuVoTen,
            });
          }
          // Extract unique manufacturers và materials từ products để populate filters
          this.extractFilterDataFromProducts();
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
        console.log('Loaded categories:', this.categories.length);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load categories', err);
        this.categories = [];
        this.cdr.detectChanges();
      },
    });
  }

  private loadManufacturers(): void {
    this.manufacturerApiService.getAllActive().subscribe({
      next: (res: ManufacturerResponse[]) => {
        this.manufacturers = res || [];
        console.log('Loaded manufacturers from API:', this.manufacturers.length);
        // Nếu đã có products, merge với dữ liệu từ products
        if (this.products.length > 0) {
          this.extractFilterDataFromProducts();
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Failed to load manufacturers', err);
        this.manufacturers = [];
        // Fallback: extract từ products nếu API fail
        if (this.products.length > 0) {
          this.extractFilterDataFromProducts();
        }
        this.cdr.detectChanges();
      },
    });
  }

  private loadMaterials(): void {
    this.materialApiService.getAllActive().subscribe({
      next: (res: MaterialResponse[]) => {
        this.materials = res || [];
        console.log('Loaded materials from API:', this.materials.length);
        // Nếu đã có products, merge với dữ liệu từ products
        if (this.products.length > 0) {
          this.extractFilterDataFromProducts();
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Failed to load materials', err);
        this.materials = [];
        // Fallback: extract từ products nếu API fail
        if (this.products.length > 0) {
          this.extractFilterDataFromProducts();
        }
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Extract unique manufacturers và materials từ danh sách sản phẩm
   * để đảm bảo filters chỉ hiển thị những giá trị thực sự có trong sản phẩm
   */
  private extractFilterDataFromProducts(): void {
    if (!this.products || this.products.length === 0) {
      return;
    }

    // Extract unique manufacturers từ products
    const manufacturerMap = new Map<number, { id: number; ten: string }>();
    const materialMap = new Map<number, { id: number; tenChatLieu: string }>();

    this.products.forEach((product) => {
      // Extract manufacturers
      if (
        product.nhaSanXuatId !== null &&
        product.nhaSanXuatId !== undefined &&
        product.nhaSanXuatTen
      ) {
        if (!manufacturerMap.has(product.nhaSanXuatId)) {
          manufacturerMap.set(product.nhaSanXuatId, {
            id: product.nhaSanXuatId,
            ten: product.nhaSanXuatTen,
          });
        }
      }

      // Extract materials
      if (
        product.chatLieuVoId !== null &&
        product.chatLieuVoId !== undefined &&
        product.chatLieuVoTen
      ) {
        if (!materialMap.has(product.chatLieuVoId)) {
          materialMap.set(product.chatLieuVoId, {
            id: product.chatLieuVoId,
            tenChatLieu: product.chatLieuVoTen,
          });
        }
      }
    });

    // Merge với dữ liệu từ API (nếu có)
    const extractedManufacturers = Array.from(manufacturerMap.values());
    const extractedMaterials = Array.from(materialMap.values());

    // Merge manufacturers: ưu tiên dữ liệu từ API, nhưng thêm những cái chỉ có trong products
    const manufacturerMapFromApi = new Map(
      this.manufacturers.map((m) => [m.id, m])
    );
    extractedManufacturers.forEach((m) => {
      if (!manufacturerMapFromApi.has(m.id)) {
        this.manufacturers.push({
          id: m.id,
          ten: m.ten,
          moTa: '',
          trangThai: true,
        });
      }
    });
    // Đảm bảo manufacturers được sắp xếp
    this.manufacturers.sort((a, b) => a.ten.localeCompare(b.ten));

    // Merge materials: ưu tiên dữ liệu từ API, nhưng thêm những cái chỉ có trong products
    const materialMapFromApi = new Map(
      this.materials.map((m) => [m.id, m])
    );
    extractedMaterials.forEach((m) => {
      if (!materialMapFromApi.has(m.id)) {
        this.materials.push({
          id: m.id,
          tenChatLieu: m.tenChatLieu,
          trangThai: true,
        });
      }
    });
    // Đảm bảo materials được sắp xếp
    this.materials.sort((a, b) => a.tenChatLieu.localeCompare(b.tenChatLieu));

    console.log('Extracted from products - Manufacturers:', extractedManufacturers.length, 'Materials:', extractedMaterials.length);
    console.log('Total after merge - Manufacturers:', this.manufacturers.length, 'Materials:', this.materials.length);
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
  onManufacturerChange(): void {
    this.applyFilters();
    this.cdr.detectChanges();
  }

  onMaterialChange(): void {
    this.applyFilters();
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

  /**
   * Hiển thị giá từ ... đến ... cho 1 sản phẩm ở trang bán hàng online.
   * - Nếu đã có trong productPriceRange: dùng min/max đó.
   * - Nếu chưa có: fallback dùng product.giaBan.
   */
  getProductPriceRangeDisplay(product: SanPhamResponse): string {
    const range = this.productPriceRange[product.id];
    if (range && range.minPrice != null && range.maxPrice != null) {
      if (range.minPrice === range.maxPrice) {
        return this.formatCurrency(range.minPrice);
      }
      return `${this.formatCurrency(range.minPrice)} - ${this.formatCurrency(range.maxPrice)}`;
    }
    // Fallback: dùng giá gốc nếu chưa có range
    return this.formatCurrency(product.giaBan);
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
        const imageMap: Record<number, string> = {};
        const priceMap: Record<
          number,
          {
            minPrice: number | null;
            maxPrice: number | null;
          }
        > = {};

        variants.forEach((variant) => {
          if (!variant?.sanPhamId) return;

          // Ảnh biến thể đầu tiên cho mỗi sản phẩm
          if (variant.anhSanPham && !imageMap[variant.sanPhamId]) {
            imageMap[variant.sanPhamId] = this.normalizeImagePath(variant.anhSanPham);
          }

          // Tính min/max giá từ danh sách biến thể theo sanPhamId
          const rawPrice = variant.giaBan;
          if (rawPrice == null) return;
          const num = Number(String(rawPrice).replace(/\s+/g, '').replace(/,/g, ''));
          if (!Number.isFinite(num)) return;

          const current = priceMap[variant.sanPhamId] || { minPrice: null, maxPrice: null };
          if (current.minPrice == null || num < current.minPrice) current.minPrice = num;
          if (current.maxPrice == null || num > current.maxPrice) current.maxPrice = num;
          priceMap[variant.sanPhamId] = current;
        });

        this.productVariantImages = imageMap;
        this.productPriceRange = priceMap;
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
