import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DotGiamGiaService, DotGiamGiaRequest } from '../../services/dot-giam-gia.service';
import { ProductApiService } from '../../services/product-api.service';
import { ChiTietSanPhamApiService } from '../../services/chi-tiet-san-pham-api.service';
import { environment } from '../../../environments/environment';


interface Product {
  id: number;
  maSanPham: string;
  tenSanPham: string;
  nhaSanXuatId: number;
  nhaSanXuatTen?: string;
  soLuongTon: number;
  selected?: boolean;
  name?: string;
  color?: string;
  memory?: string;
  imageUrl?: string;
  originalPrice?: number;
  discountedPrice?: number;
  duplicateCount?: number;
}

interface DetailProduct {
  id: number;
  maSanPham: string;
  productName: string;
  color: string;
  loaiMu: string;
  imageUrl: string;
  originalPrice: number;
  discountedPrice?: number;
  selected: boolean;
  status?: 'active' | 'inactive';
  nhaSanXuatTen?: string;
  soLuongTon?: number;
}


interface PromotionFormData {
  maDotGiamGia: string;
  tenDotGiamGia: string;
  giaTriGiamGia: number | null;
  loaiDotGiamGia: string;
  soTien: number | null;
  ngayBatDau: string;
  ngayKetThuc: string;
  moTa: string;
  selectedProducts: number[];
}

@Component({
  selector: 'app-promotion-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './promotion-form.component.html',
  styleUrls: ['./promotion-form.component.scss']
})
export class PromotionFormComponent implements OnInit {
  promotionData: PromotionFormData = {
    maDotGiamGia: '',
    tenDotGiamGia: '',
    giaTriGiamGia: 0,
    loaiDotGiamGia: '',
    soTien: 0,
    ngayBatDau: '',
    ngayKetThuc: '',
    moTa: '',
    selectedProducts: []
  };

  products: Product[] = [];
  filteredProducts: Product[] = [];
  selectedProductForDetail: Product | null = null; // Sản phẩm được chọn để xem chi tiết
  loading = false;
  error: string | null = null;

  // Validation errors
  validationErrors: {
    tenDotGiamGia: string;
    loaiDotGiamGia: string;
    giaTriGiamGia: string;
    soTien: string;
    ngayBatDau: string;
    ngayKetThuc: string;
  } = {
      tenDotGiamGia: '',
      loaiDotGiamGia: '',
      giaTriGiamGia: '',
      soTien: '',
      ngayBatDau: '',
      ngayKetThuc: ''
    };

  // Filter criteria
  searchTerm = '';
  selectedManufacturer = '';
  manufacturers: string[] = [];


  // Real promotion data from API
  promotionList: any[] = [];
  filteredPromotionList: any[] = [];

  // Detail products table data
  detailProducts: DetailProduct[] = [];
  filteredDetailProducts: DetailProduct[] = [];

  // Detail table filters
  detailFilterProduct = '';
  detailFilterLoaiMu = '';
  detailFilterColor = '';

  // Detail table pagination
  detailCurrentPage = 0;
  detailItemsPerPage = 5;

  // Confirmation Modal
  showConfirmModal = false;
  showCancelModal = false;

  constructor(
    private dotGiamGiaService: DotGiamGiaService,
    private productApiService: ProductApiService,
    private chiTietSanPhamService: ChiTietSanPhamApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    console.log('Initializing promotion form component...');
    // Reset filters
    this.searchTerm = '';
    this.selectedManufacturer = '';
    this.loadProducts();
    this.generatePromotionCode();
    this.loadPromotionList();
    this.loadProducts();
    this.generatePromotionCode();
    this.cdr.detectChanges();

    // Debug: Check data after a short delay
    setTimeout(() => {
      console.log('=== DEBUG: Data Status ===');
      console.log('Products array length:', this.products.length);
      console.log('Filtered products array length:', this.filteredProducts.length);
      console.log('Detail products array length:', this.detailProducts.length);
      console.log('Loading state:', this.loading);
      console.log('Error state:', this.error);
      console.log('Products from database:', this.products);
      console.log('Filtered products:', this.filteredProducts);
      console.log('Detail products:', this.detailProducts);
      this.cdr.detectChanges();
    }, 2000);
  }

  onDiscountTypeChange(value: string) {
    if (value === 'PHAN_TRAM') {
      // Xóa số tiền khi chọn giảm theo %
      // Xóa số tiền khi chọn giảm theo %
      this.promotionData.soTien = null;
    } else if (value === 'SO_TIEN') {
      // Xóa giá trị % khi chọn giảm theo số tiền
      this.promotionData.giaTriGiamGia = null;
    }
    // Tính lại giá sau giảm cho tất cả sản phẩm chi tiết
    this.recalculateAllPrices();
  }

  // Tính lại giá sau giảm cho tất cả sản phẩm chi tiết
  recalculateAllPrices() {
    this.detailProducts.forEach(product => {
      product.discountedPrice = this.calculateDiscountedPrice(product.originalPrice);
    });
    this.cdr.detectChanges();
  }

  // Gọi khi thay đổi giá trị giảm giá
  onDiscountValueChange() {
    this.recalculateAllPrices();
  }





  loadProducts() {
    this.loading = true;
    this.error = null;

    this.productApiService.search({
      page: 0,
      size: 1000
    }).subscribe({
      next: (response: any) => {

        // API trả về dữ liệu trực tiếp, không có wrapper
        const products = response.content || response;

        this.products = products.map((product: any) => ({
          id: product.id,
          maSanPham: product.maSanPham || 'N/A',
          tenSanPham: product.tenSanPham || 'N/A',
          nhaSanXuatId: product.nhaSanXuatId || product.nhaSanXuat?.id || 0,
          nhaSanXuatTen: product.nhaSanXuatTen || product.nhaSanXuat?.ten || 'N/A',
          soLuongTon: product.soLuongTon || 0,
          selected: false,
          name: product.tenSanPham || 'N/A',
          color: 'Đen', // Default color
          memory: '128GB', // Default memory
          imageUrl: 'assets/default-product.png',
          originalPrice: 1000000, // Default price
          discountedPrice: 800000, // Default discounted price
          duplicateCount: 0
        }));

        this.extractManufacturers();
        this.applyFilters(); // Apply filters after loading products
        this.loading = false;
        this.cdr.detectChanges();
        console.log('Loaded products:', this.products);
        console.log('Filtered products:', this.filteredProducts);
        console.log('Products count:', this.products.length);
        console.log('Filtered products count:', this.filteredProducts.length);
        console.log('Search term:', this.searchTerm);
        console.log('Selected manufacturer:', this.selectedManufacturer);
      },
      error: (error: any) => {
        console.error('=== PRODUCT API ERROR ===');
        console.error('Full error object:', error);
        console.error('Error message:', error.message);
        console.error('Error status:', error.status);
        console.error('Error statusText:', error.statusText);
        console.error('Error url:', error.url);
        console.error('Error name:', error.name);
        console.error('Error stack:', error.stack);

        // Set error message based on error type
        if (error.status === 0) {
          console.error('🌐 Network error - CORS or server not running');
          this.error = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối hoặc khởi động lại server.';
        } else if (error.status === 404) {
          console.error('🔍 Endpoint not found');
          this.error = 'API endpoint không tồn tại. Vui lòng kiểm tra cấu hình backend.';
        } else if (error.status === 403) {
          console.error('🔒 Access forbidden - CORS issue');
          this.error = 'Lỗi CORS - Không có quyền truy cập API. Vui lòng cấu hình CORS trên backend.';
        } else {
          this.error = `Lỗi API (${error.status}): ${error.message || error.statusText}`;
        }

        // Clear products and show empty state
        this.products = [];
        this.filteredProducts = [];
        this.manufacturers = [];
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }



  reloadFromDatabase() {
    console.log('🔄 Reloading data from database...');
    this.loading = true;
    this.error = null;

    // Clear existing data
    this.products = [];
    this.filteredProducts = [];

    // Reload from database
    this.loadProducts();
  }



  loadPromotionList() {
    this.dotGiamGiaService.getAllDotGiamGiaWithoutPagination().subscribe({
      next: (response) => {
        // Sort theo ID giảm dần - đợt giảm giá mới nhất hiển thị trên đầu
        this.promotionList = (response.data || []).sort((a: any, b: any) => {
          return (b.id || 0) - (a.id || 0);
        });
        this.filteredPromotionList = [...this.promotionList];
        console.log('Loaded promotion list (sorted by newest first):', this.promotionList);
      },
      error: (error) => {
        console.error('Error loading promotion list:', error);
        // Fallback to empty array if API fails
        this.promotionList = [];
        this.filteredPromotionList = [];
      }
    });
  }

  // Load variants for a specific parent product
  loadVariants(productId: number) {
    this.loading = true;
    console.log('Fetching variants for product ID:', productId);

    this.chiTietSanPhamService.getBySanPhamId(productId).subscribe({
      next: (response: any) => {
        const rawData = Array.isArray(response) ? response : response?.data || response?.content || [];
        console.log(`Found ${rawData.length} variants for product ${productId}.`);

        this.detailProducts = rawData.map((item: any) => {
          // Robust name lookup logic
          const colorName = item.mauSacTen || item.mau_sac_ten || 'N/A';
          // Fix: item.kichThuocTen might be mapped to 'loaiMu' or 'memory' in other places?
          // Looking at previous valid code:
          const sizeName = item.kichThuocTen || item.kich_thuoc_ten || 'N/A';

          // Check if this variant is already selected
          const isSelected = this.promotionData.selectedProducts.includes(item.id);

          return {
            id: item.id,
            maSanPham: item.maSanPham || '',
            productName: item.sanPhamTen || this.selectedProductForDetail?.tenSanPham || 'N/A',
            color: colorName,
            // Map backend 'kichThuocTen' or similar to 'loaiMu' field which is used in HTML
            loaiMu: sizeName,
            imageUrl: item.anhSanPham || 'assets/default-product.png',
            originalPrice: Number(item.giaBan) || 0,
            discountedPrice: this.calculateDiscountedPrice(Number(item.giaBan) || 0),
            selected: isSelected,
            status: item.trangThai ? 'active' : 'inactive',
            nhaSanXuatTen: item.nhaSanXuatTen || '',
            soLuongTon: Number(item.soLuongTon) || 0
          };
        });

        this.filteredDetailProducts = [...this.detailProducts];
        this.applyDetailFilters();
        this.loading = false;
        this.cdr.detectChanges();

        // Auto-scroll to details
        setTimeout(() => {
          const detailSection = document.querySelector('.product-detail-section');
          if (detailSection) {
            detailSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      },
      error: (error) => {
        console.error('Error loading variants:', error);
        this.loading = false;
        this.detailProducts = [];
        this.filteredDetailProducts = [];
      }
    });
  }

  extractManufacturers() {
    const manufacturers = new Set<string>();
    this.products.forEach(product => {
      if (product.nhaSanXuatTen && product.nhaSanXuatTen !== 'N/A') {
        manufacturers.add(product.nhaSanXuatTen);
      }
    });
    this.manufacturers = Array.from(manufacturers).sort();
    console.log('Extracted manufacturers:', this.manufacturers);
  }

  generatePromotionCode() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

    this.promotionData.maDotGiamGia = `KM${year}${month}${day}${hours}${minutes}${seconds}${random}`;
  }

  onSearch() {
    this.applyFilters();
    console.log('Search term:', this.searchTerm);
    console.log('Filtered products:', this.filteredProducts);
    console.log('Total products:', this.products.length);
    console.log('Filtered count:', this.filteredProducts.length);
  }




  onManufacturerChange(manufacturer: string = '') {
    this.selectedManufacturer = manufacturer;
    this.applyFilters();
    console.log('Selected manufacturer:', this.selectedManufacturer);
  }




  clearFilters() {
    this.searchTerm = '';
    this.selectedManufacturer = '';
    this.applyFilters();
    console.log('Filters cleared');
  }

  applyFilters() {
    let filtered = [...this.products];
    console.log('Starting with products:', filtered.length);

    // Apply search filter
    if (this.searchTerm && this.searchTerm.trim()) {
      const searchTerm = this.searchTerm.toLowerCase().trim();
      console.log('Searching for:', searchTerm);

      filtered = filtered.filter(product => {
        const matchesName = product.tenSanPham && product.tenSanPham.toLowerCase().includes(searchTerm);
        const matchesCode = product.maSanPham && product.maSanPham.toLowerCase().includes(searchTerm);
        const matchesManufacturer = product.nhaSanXuatTen && product.nhaSanXuatTen.toLowerCase().includes(searchTerm);

        return matchesName || matchesCode || matchesManufacturer;
      });

      console.log('After search filter:', filtered.length);
    }

    // Apply manufacturer filter
    if (this.selectedManufacturer) {
      console.log('Filtering by manufacturer:', this.selectedManufacturer);
      filtered = filtered.filter(product =>
        product.nhaSanXuatTen && product.nhaSanXuatTen.toLowerCase().includes(this.selectedManufacturer.toLowerCase())
      );
      console.log('After manufacturer filter:', filtered.length);
    }

    this.filteredProducts = filtered;
    console.log('Final filtered products:', this.filteredProducts.length);
  }


  onProductSelect(product: Product) {
    product.selected = !product.selected;

    if (product.selected) {
      if (!this.promotionData.selectedProducts.includes(product.id)) {
        this.promotionData.selectedProducts.push(product.id);
      }
      // Hiển thị chi tiết sản phẩm khi tích checkbox
      this.selectedProductForDetail = product;
      this.detailFilterProduct = product.tenSanPham;
      this.detailFilterLoaiMu = '';
      this.detailFilterColor = '';

      // Load variants for this product
      this.loadVariants(product.id);

    } else {
      this.promotionData.selectedProducts = this.promotionData.selectedProducts.filter(
        id => id !== product.id
      );
      // Nếu bỏ tích và đang hiển thị chi tiết của sản phẩm này, thì xóa hiển thị
      if (this.selectedProductForDetail?.id === product.id) {
        this.selectedProductForDetail = null;
        this.detailFilterProduct = '';
        this.detailFilterLoaiMu = '';
        this.detailFilterColor = '';
        this.detailProducts = [];
        this.filteredDetailProducts = [];
      }
    }
  }

  // Click vào dòng sản phẩm để xem chi tiết
  // Click vào dòng sản phẩm để xem chi tiết
  onProductRowClick(product: Product) {
    this.selectedProductForDetail = product;
    console.log('Selected product for detail view:', product);

    // Reset filter khi chọn sản phẩm mới
    this.detailFilterProduct = product.tenSanPham;
    this.detailFilterLoaiMu = '';
    this.detailFilterColor = '';

    if (product.id) {
      this.loadVariants(product.id);
    }
  }


  // New methods for product selection table
  getFilteredProducts() {
    // Sử dụng filteredProducts đã được filter trong applyFilters()
    console.log('getFilteredProducts called, returning:', this.filteredProducts?.length || 0, 'products');
    return this.filteredProducts || [];
  }


  calculateDiscountedPrice(originalPrice: number): number {
    if (!originalPrice) return 0;

    if (this.promotionData.loaiDotGiamGia === 'PHAN_TRAM') {
      const discountPercent = this.promotionData.giaTriGiamGia || 0;
      return Math.round(originalPrice * (1 - discountPercent / 100));
    } else if (this.promotionData.loaiDotGiamGia === 'SO_TIEN') {
      const discountAmount = this.promotionData.soTien || 0;
      return Math.max(0, originalPrice - discountAmount);
    }
    return originalPrice;
  }

  // Tính số tiền được giảm
  calculateDiscountAmount(originalPrice: number): number {
    if (!originalPrice) return 0;
    return originalPrice - this.calculateDiscountedPrice(originalPrice);
  }

  // Kiểm tra có đang áp dụng giảm giá không
  hasDiscount(): boolean {
    if (this.promotionData.loaiDotGiamGia === 'PHAN_TRAM') {
      return (this.promotionData.giaTriGiamGia || 0) > 0;
    } else if (this.promotionData.loaiDotGiamGia === 'SO_TIEN') {
      return (this.promotionData.soTien || 0) > 0;
    }
    return false;
  }


  // Product selection methods
  isAllSelected(): boolean {
    const filtered = this.getFilteredProducts();
    return filtered.length > 0 && filtered.every(product => product.selected);
  }

  onSelectAll() {
    const allSelected = this.isAllSelected();
    const filtered = this.getFilteredProducts();

    filtered.forEach(product => {
      product.selected = !allSelected;

      if (!allSelected) {
        if (!this.promotionData.selectedProducts.includes(product.id)) {
          this.promotionData.selectedProducts.push(product.id);
        }
      } else {
        this.promotionData.selectedProducts = this.promotionData.selectedProducts.filter(
          id => id !== product.id
        );
      }
    });

    // Hiển thị tất cả chi tiết sản phẩm khi chọn tất cả
    if (!allSelected && filtered.length > 0) {
      this.selectedProductForDetail = null; // Không chọn sản phẩm cụ thể
      // Xóa tất cả filter để hiển thị hết dữ liệu
      this.detailFilterProduct = '';
      this.detailFilterLoaiMu = '';
      this.detailFilterColor = '';
      this.onDetailFilterChange();

      setTimeout(() => {
        const detailSection = document.querySelector('.product-detail-section');
        if (detailSection) {
          detailSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else if (allSelected) {
      // Xóa hiển thị chi tiết khi bỏ chọn tất cả
      this.selectedProductForDetail = null;
      this.detailFilterProduct = '';
      this.detailFilterLoaiMu = '';
      this.detailFilterColor = '';
      this.onDetailFilterChange();
    }
  }

  selectAllProducts() {
    console.log('🔄 Selecting all products...');

    const filtered = this.getFilteredProducts();
    filtered.forEach(product => {
      product.selected = true;
      if (!this.promotionData.selectedProducts.includes(product.id)) {
        this.promotionData.selectedProducts.push(product.id);
      }
    });

    // Hiển thị tất cả chi tiết sản phẩm
    if (filtered.length > 0) {
      this.selectedProductForDetail = null; // Không chọn sản phẩm cụ thể
      // Xóa tất cả filter để hiển thị hết dữ liệu
      this.detailFilterProduct = '';
      this.detailFilterLoaiMu = '';
      this.detailFilterColor = '';
      this.onDetailFilterChange();

      setTimeout(() => {
        const detailSection = document.querySelector('.product-detail-section');
        if (detailSection) {
          detailSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }

  deselectAllProducts() {
    console.log('🔄 Deselecting all products...');

    this.getFilteredProducts().forEach(product => {
      product.selected = false;
      this.promotionData.selectedProducts = this.promotionData.selectedProducts.filter(
        id => id !== product.id
      );
    });

    // Xóa hiển thị chi tiết khi bỏ chọn tất cả
    this.selectedProductForDetail = null;
    this.detailFilterProduct = '';
    this.detailFilterLoaiMu = '';
    this.detailFilterColor = '';
    this.onDetailFilterChange();
  }

  onSubmit() {
    if (!this.validateForm()) {
      return;
    }
    this.showConfirmModal = true;
  }

  onCancelSubmit() {
    this.showConfirmModal = false;
  }

  onConfirmSubmit() {
    this.showConfirmModal = false;
    this.loading = true;
    this.error = null;

    // Xây dựng payload theo loại giảm giá
    const isPercent = this.promotionData.loaiDotGiamGia === 'PHAN_TRAM';
    const soTienNum = !isPercent
      ? (typeof this.promotionData.soTien === 'string'
        ? parseInt(this.promotionData.soTien as any, 10)
        : Number(this.promotionData.soTien || 0))
      : 0;
    const giaTriDotGiamStr = isPercent
      ? String(this.promotionData.giaTriGiamGia ?? '0')
      : '0';

    const request: DotGiamGiaRequest = {
      maDotGiamGia: this.promotionData.maDotGiamGia,
      tenDotGiamGia: this.promotionData.tenDotGiamGia,
      loaiDotGiamGia: this.promotionData.loaiDotGiamGia,
      // Một số schema bắt buộc cả hai cột NOT NULL → gửi giá trị 0 cho cột còn lại
      giaTriDotGiam: giaTriDotGiamStr,
      soTien: soTienNum,
      moTa: this.promotionData.moTa,
      ngayBatDau: this.promotionData.ngayBatDau + 'T00:00:00',
      ngayKetThuc: this.promotionData.ngayKetThuc + 'T23:59:59',
      soLuongSuDung: 1000, // Default value
      trangThai: true,
      chiTietDotGiamGias: this.detailProducts
        .filter(p => p.selected)
        .map(p => ({
          chiTietSanPhamId: p.id,
          giaTriGiam: isPercent ? Number(this.promotionData.giaTriGiamGia) : Number(this.promotionData.soTien)
        }))
    };

    console.log('[Create Promotion] Payload:', request);

    this.dotGiamGiaService.createDotGiamGia(request).subscribe({
      next: (response: any) => {
        if (response.success) {
          // Alert removed
          this.router.navigate(['/promotions']);
        } else {
          this.error = response.message;
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        const backendMsg = error?.error?.message || error?.error || error?.message;
        this.error = 'Lỗi khi tạo đợt giảm giá: ' + backendMsg;
        console.error('[Create Promotion] Error response:', error);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  validateForm(): boolean {
    // Reset all errors
    this.clearValidationErrors();

    let isValid = true;

    // Validate tên đợt giảm giá
    if (!this.promotionData.tenDotGiamGia || !this.promotionData.tenDotGiamGia.trim()) {
      this.validationErrors.tenDotGiamGia = 'Vui lòng nhập tên đợt giảm giá';
      isValid = false;
    }

    // Validate loại giảm giá
    if (!this.promotionData.loaiDotGiamGia) {
      this.validationErrors.loaiDotGiamGia = 'Vui lòng chọn loại giảm giá';
      isValid = false;
    }

    // Validate theo loại giảm giá
    if (this.promotionData.loaiDotGiamGia === 'PHAN_TRAM') {
      const percent = Number(this.promotionData.giaTriGiamGia);
      if (!percent || percent <= 0) {
        this.validationErrors.giaTriGiamGia = 'Giá trị giảm phải lớn hơn 0';
        isValid = false;
      } else if (percent > 100) {
        this.validationErrors.giaTriGiamGia = 'Giá trị giảm không được vượt quá 100%';
        isValid = false;
      }
    } else if (this.promotionData.loaiDotGiamGia === 'SO_TIEN') {
      if (!this.promotionData.soTien || this.promotionData.soTien <= 0) {
        this.validationErrors.soTien = 'Số tiền giảm phải lớn hơn 0';
        isValid = false;
      }
    }

    // Validate ngày bắt đầu
    if (!this.promotionData.ngayBatDau) {
      this.validationErrors.ngayBatDau = 'Vui lòng chọn ngày bắt đầu';
      isValid = false;
    }

    // Validate ngày kết thúc
    if (!this.promotionData.ngayKetThuc) {
      this.validationErrors.ngayKetThuc = 'Vui lòng chọn ngày kết thúc';
      isValid = false;
    }

    // Validate ngày kết thúc phải sau ngày bắt đầu
    if (this.promotionData.ngayBatDau && this.promotionData.ngayKetThuc) {
      if (new Date(this.promotionData.ngayBatDau) >= new Date(this.promotionData.ngayKetThuc)) {
        this.validationErrors.ngayKetThuc = 'Ngày kết thúc phải sau ngày bắt đầu';
        isValid = false;
      }
    }

    // Show alert with first error if form is invalid
    if (!isValid) {
      const firstError = Object.values(this.validationErrors).find(err => err !== '');
      if (firstError) {
        alert('⚠️ Vui lòng kiểm tra lại thông tin:\n' + firstError);
      }
    }

    return isValid;
  }

  clearValidationErrors() {
    this.validationErrors = {
      tenDotGiamGia: '',
      loaiDotGiamGia: '',
      giaTriGiamGia: '',
      soTien: '',
      ngayBatDau: '',
      ngayKetThuc: ''
    };
  }

  // Clear error for specific field when user starts typing
  clearFieldError(fieldName: keyof typeof this.validationErrors) {
    this.validationErrors[fieldName] = '';
  }

  onBack() {
    this.router.navigate(['/promotions']);
  }

  // Reset form - Hủy tất cả dữ liệu đã nhập
  // Reset form - Hủy tất cả dữ liệu đã nhập
  onCancel() {
    this.showCancelModal = true;
  }

  onCloseCancelModal() {
    this.showCancelModal = false;
  }

  onConfirmCancel() {
    this.showCancelModal = false;

    // Reset promotion data
    this.promotionData = {
      maDotGiamGia: '',
      tenDotGiamGia: '',
      giaTriGiamGia: 0,
      loaiDotGiamGia: '',
      soTien: 0,
      ngayBatDau: '',
      ngayKetThuc: '',
      moTa: '',
      selectedProducts: []
    };

    // Clear validation errors
    this.clearValidationErrors();

    // Reset selected products
    this.products.forEach(product => {
      product.selected = false;
    });

    // Reset detail products selection
    this.detailProducts.forEach(product => {
      product.selected = false;
    });

    // Clear selected product for detail view
    this.selectedProductForDetail = null;

    // Reset filters
    this.detailFilterProduct = '';
    this.detailFilterLoaiMu = '';
    this.detailFilterColor = '';
    this.applyDetailFilters();

    // Generate new promotion code
    this.generatePromotionCode();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Show success message
    console.log('✅ Form đã được reset');
  }

  formatCurrency(amount: number): string {
    if (!amount || amount === 0) {
      return '0';
    }
    // Format với dấu phân cách hàng nghìn, không có đơn vị
    return new Intl.NumberFormat('vi-VN', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  // Debug method to check current state
  debugCurrentState() {
    console.log('=== CURRENT STATE DEBUG ===');
    console.log('Products:', this.products);
    console.log('Filtered Products:', this.filteredProducts);
    console.log('Loading:', this.loading);
    console.log('Error:', this.error);
    console.log('Search Term:', this.searchTerm);
    console.log('Selected Manufacturer:', this.selectedManufacturer);
  }

  // ========== Detail Product Table Methods ==========

  // Filter methods for detail table
  getUniqueProductNames(): string[] {
    const names = new Set<string>();
    this.detailProducts.forEach(product => {
      if (product.productName) {
        names.add(product.productName);
      }
    });
    return Array.from(names).sort();
  }

  getUniqueLoaiMu(): string[] {
    const loaiMus = new Set<string>();
    this.detailProducts.forEach(product => {
      if (product.loaiMu && product.loaiMu !== 'N/A') {
        loaiMus.add(product.loaiMu);
      }
    });
    return Array.from(loaiMus).sort();
  }

  getUniqueColors(): string[] {
    const colors = new Set<string>();
    this.detailProducts.forEach(product => {
      if (product.color) {
        colors.add(product.color);
      }
    });
    return Array.from(colors).sort();
  }

  onDetailFilterChange() {
    this.detailCurrentPage = 0;
    this.applyDetailFilters();
  }

  applyDetailFilters() {
    let filtered = [...this.detailProducts];

    // Filter by product name
    if (this.detailFilterProduct) {
      filtered = filtered.filter(product =>
        product.productName.toLowerCase().includes(this.detailFilterProduct.toLowerCase())
      );
    }

    // Filter by loai mu
    if (this.detailFilterLoaiMu) {
      filtered = filtered.filter(product =>
        product.loaiMu.toLowerCase().includes(this.detailFilterLoaiMu.toLowerCase())
      );
    }

    // Filter by color
    if (this.detailFilterColor) {
      filtered = filtered.filter(product =>
        product.color.toLowerCase().includes(this.detailFilterColor.toLowerCase())
      );
    }

    this.filteredDetailProducts = filtered;
  }

  getFilteredDetailProducts(): DetailProduct[] {
    // Chỉ return data đã được filter và phân trang, KHÔNG gọi applyDetailFilters() ở đây
    const start = this.detailCurrentPage * this.detailItemsPerPage;
    const end = start + this.detailItemsPerPage;
    return this.filteredDetailProducts.slice(start, end);
  }

  // Selection methods
  selectAllDetailProducts() {
    this.getFilteredDetailProducts().forEach(product => {
      product.selected = true;
    });
  }

  deselectAllDetailProducts() {
    this.getFilteredDetailProducts().forEach(product => {
      product.selected = false;
    });
  }

  // Status methods
  getStatusClass(detail: DetailProduct): string {
    // Tất cả đều hiển thị màu xanh vì text giống nhau
    return 'status-active';
  }

  getStatusText(detail: DetailProduct): string {
    return 'Trùng với 0 đợt giảm giá';
  }

  // Pagination methods
  getDetailTotalPages(): number {
    return Math.ceil(this.filteredDetailProducts.length / this.detailItemsPerPage);
  }

  getDetailPageNumbers(): number[] {
    const totalPages = this.getDetailTotalPages();
    const pages: number[] = [];
    const maxPagesToShow = 5;

    let startPage = Math.max(1, this.detailCurrentPage + 1 - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  getDetailPaginationStart(): number {
    if (this.filteredDetailProducts.length === 0) return 0;
    return this.detailCurrentPage * this.detailItemsPerPage + 1;
  }

  getDetailPaginationEnd(): number {
    const end = (this.detailCurrentPage + 1) * this.detailItemsPerPage;
    return Math.min(end, this.filteredDetailProducts.length);
  }

  detailFirstPage() {
    this.detailCurrentPage = 0;
  }

  detailPreviousPage() {
    if (this.detailCurrentPage > 0) {
      this.detailCurrentPage--;
    }
  }

  detailNextPage() {
    if (this.detailCurrentPage < this.getDetailTotalPages() - 1) {
      this.detailCurrentPage++;
    }
  }

  detailLastPage() {
    this.detailCurrentPage = this.getDetailTotalPages() - 1;
  }

  detailGoToPage(page: number) {
    this.detailCurrentPage = page;
  }

  onDetailItemsPerPageChange() {
    this.detailCurrentPage = 0;
  }

}

