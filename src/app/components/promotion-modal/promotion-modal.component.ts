import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChiTietSanPhamApiService } from '../../services/chi-tiet-san-pham-api.service';
import { DotGiamGiaService } from '../../services/dot-giam-gia.service';

export interface PromotionFormData {
  id?: string;
  code: string;
  name: string;
  discountType: string;
  discountValue: string;
  maxDiscountAmount: string;
  startDate: string;
  endDate: string;
  status: string;
  chiTietDotGiamGias?: Array<{
    chiTietSanPhamId: number;
    giaTriGiam: number;
  }>;
}

export interface Product {
  id: string; // This is actually chiTietSanPhamId
  code: string;
  name: string;
  brand: string;
  quantity: number;
  selected: boolean;
  originalPrice?: number;
  discountedPrice?: number;
  color?: string;
  size?: string;
  imageUrl?: string;
  overlapCount?: number;
}

@Component({
  selector: 'app-promotion-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './promotion-modal.component.html',
  styleUrls: ['./promotion-modal.component.scss'],
})
export class PromotionModalComponent implements OnInit, OnChanges {
  @Input() isVisible = false;
  @Input() promotionData: PromotionFormData | null = null;
  @Input() isEditMode = false;
  @Input() isViewMode = false; // Chế độ xem chi tiết (read-only)
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<PromotionFormData>();

  formData: PromotionFormData = {
    code: '',
    name: '',
    discountType: 'Phần trăm',
    discountValue: '',
    maxDiscountAmount: '',
    startDate: '',
    endDate: '',
    status: 'Chưa bắt đầu',
  };

  constructor(
    private chiTietSanPhamService: ChiTietSanPhamApiService,
    private dotGiamGiaService: DotGiamGiaService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.loadAllProducts();
  }

  // Product List Properties
  searchTerm = '';
  selectedColor = '';
  selectedSize = '';
  selectAll = false;

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  totalPages = 0;

  // Confirmation Modal
  showConfirmModal = false;

  // Sample data
  // Products data will be loaded from API
  products: Product[] = [];

  filteredProducts: Product[] = [];
  paginatedProducts: Product[] = [];
  colors: string[] = [];
  sizes: string[] = [];

  discountTypes = [
    { value: 'Phần trăm', label: 'Phần trăm (%)' },
    { value: 'Số tiền cố định', label: 'Số tiền cố định (₫)' },
    { value: 'Sản phẩm tặng', label: 'Sản phẩm tặng' },
  ];
  statusOptions = [
    { value: 'Chưa bắt đầu', label: 'Chưa bắt đầu' },
    { value: 'Sắp diễn ra', label: 'Sắp diễn ra' },
    { value: 'Đang hoạt động', label: 'Đang hoạt động' },
    { value: 'Đã kết thúc', label: 'Đã kết thúc' },
  ];

  ngOnChanges() {
    console.log('=== MODAL ngOnChanges ===');
    console.log('isEditMode:', this.isEditMode);
    console.log('isViewMode:', this.isViewMode);
    console.log('promotionData:', this.promotionData);
    console.log('isVisible:', this.isVisible);

    if (this.promotionData && (this.isEditMode || this.isViewMode)) {
      // Khi chỉnh sửa, copy tất cả dữ liệu từ promotionData
      this.formData = {
        ...this.promotionData,
        // Đảm bảo tất cả trường đều có giá trị
        id: this.promotionData.id || '',
        code: this.promotionData.code || '',
        name: this.promotionData.name || '',
        discountType: this.promotionData.discountType || 'PHAN_TRAM',
        discountValue: this.promotionData.discountValue || '',
        startDate: this.promotionData.startDate || '',
        endDate: this.promotionData.endDate || '',
        status: this.promotionData.status || 'Chưa bắt đầu'
      };

      console.log('isEditMode:', this.isEditMode);

      if (this.isVisible) {
        if (!this.products || this.products.length === 0) {
          this.loadAllProducts(() => {
            if (this.promotionData && this.promotionData.id) {
              this.loadPromotionDetails(Number(this.promotionData.id));
            }
          });
        } else {
          if (this.promotionData && this.promotionData.id) {
            this.loadPromotionDetails(Number(this.promotionData.id));
          }
        }
      } else {
        this.resetForm();
      }
    }
  }

  loadAllProducts(callback?: () => void) {
    this.chiTietSanPhamService.getAll().subscribe({
      next: (response: any) => {
        const variants = response.data || response;
        if (Array.isArray(variants)) {
          this.products = variants.map((v: any) => ({
            id: v.id,
            code: v.maSanPham || 'Unknown',
            name: v.sanPhamTen || (v.sanPham ? v.sanPham.tenSanPham : 'Unknown'),
            brand: v.nhaSanXuatTen || (v.sanPham && v.sanPham.nhaSanXuat ? v.sanPham.nhaSanXuat.tenNhaSanXuat : 'Unknown'),
            quantity: v.soLuongTon ? Number(v.soLuongTon) : 0,
            selected: false,
            originalPrice: v.giaBan ? Number(v.giaBan) : 0,
            discountedPrice: v.giaBan ? Number(v.giaBan) : 0,
            color: v.mauSacTen || (v.mauSac ? v.mauSac.tenMau : ''),
            size: v.kichThuocTen || (v.kichThuoc ? v.kichThuoc.tenKichThuoc : ''),
            imageUrl: v.anhSanPham || 'assets/images/default-product.png',
            overlapCount: 0
          }));

          // Extract unique colors and sizes
          this.colors = [...new Set(this.products.map(p => p.color).filter(Boolean))].sort() as string[];
          this.sizes = [...new Set(this.products.map(p => p.size).filter(Boolean))].sort() as string[];

          this.initializeProductList();
        }
        if (callback) callback();
      },
      error: (err: any) => console.error('Error loading products', err)
    });
  }

  loadPromotionDetails(id: number) {
    this.dotGiamGiaService.getDotGiamGiaById(id).subscribe({
      next: (response: any) => {
        const data = response.data;
        if (data && data.chiTietDotGiamGias) {
          const selectedIds = new Set(data.chiTietDotGiamGias.map((d: any) => d.chiTietSanPhamId));

          // Update selected status in products list
          this.products.forEach(p => {
            if (selectedIds.has(Number(p.id))) {
              p.selected = true;
              // Find detail to get discount info if needed (though editing uses global discount)
              const detail = data.chiTietDotGiamGias.find((d: any) => d.chiTietSanPhamId === Number(p.id));
              if (detail && detail.giaSauGiam) {
                p.discountedPrice = detail.giaSauGiam;
              }
            } else {
              p.selected = false;
            }
          });

          // Refresh list?
          this.filterProducts();
          this.cdr.detectChanges(); // Force UI update
        }
      },
      error: (err) => console.error('Error loading promotion details', err)
    });
  }

  resetForm() {
    this.formData = {
      code: '',
      name: '',
      discountType: 'Phần trăm',
      discountValue: '',
      maxDiscountAmount: '',
      startDate: '',
      endDate: '',
      status: 'Chưa bắt đầu',
    };
    // Reset product selection
    if (this.products) {
      this.products.forEach(p => p.selected = false);
      this.filterProducts();
    }
  }

  onClose() {
    this.close.emit();
    this.resetForm();
  }

  onSave() {
    if (this.validateForm()) {
      // Generate automatic code if not provided
      if (!this.formData.code) {
        this.formData.code = this.generatePromotionCode();
      }

      this.showConfirmModal = true;
    }
  }

  onCancelSave() {
    this.showConfirmModal = false;
  }

  onConfirmSave() {
    this.showConfirmModal = false;

    // Prepare detail payload
    const selectedProducts = this.products.filter(p => p.selected);
    const details = selectedProducts.map(p => {
      let discount = 0;
      if (this.formData.discountType === 'PHAN_TRAM') {
        discount = Number(this.formData.discountValue);
      } else {
        discount = Number(this.formData.maxDiscountAmount);
      }
      return {
        chiTietSanPhamId: Number(p.id),
        giaTriGiam: discount
      };
    });

    this.formData.chiTietDotGiamGias = details;

    this.save.emit(this.formData);
    this.resetForm();
  }

  generatePromotionCode(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `KM${timestamp}${random}`;
  }



  validateForm(): boolean {
    // Basic validation
    if (!this.formData.code || !this.formData.name) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc: Mã và Tên đợt giảm giá');
      return false;
    }

    // Validate discount value based on discount type
    if (this.formData.discountType === 'PHAN_TRAM') {
      if (!this.formData.discountValue || this.formData.discountValue === '' || this.formData.discountValue === '0') {
        alert('Vui lòng nhập giá trị phần trăm giảm giá');
        return false;
      }
    } else if (this.formData.discountType === 'SO_TIEN') {
      if (!this.formData.maxDiscountAmount || this.formData.maxDiscountAmount === '' || this.formData.maxDiscountAmount === '0') {
        alert('Vui lòng nhập số tiền giảm giá');
        return false;
      }
    }

    // Validate dates
    if (!this.formData.startDate || !this.formData.endDate) {
      alert('Vui lòng chọn ngày bắt đầu và ngày kết thúc');
      return false;
    }

    return true;
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  // Product List Methods
  initializeProductList() {
    this.filteredProducts = [...this.products];
    this.totalItems = this.products.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.updatePagination();
  }

  onSearch() {
    this.currentPage = 1;
    this.filterProducts();
  }

  onColorChange() {
    this.currentPage = 1;
    this.filterProducts();
  }

  onSizeChange() {
    this.currentPage = 1;
    this.filterProducts();
  }

  filterProducts() {
    let filtered = [...this.products];

    if (this.searchTerm) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    if (this.selectedColor) {
      filtered = filtered.filter(p => p.color === this.selectedColor);
    }

    if (this.selectedSize) {
      filtered = filtered.filter(p => p.size === this.selectedSize);
    }

    this.filteredProducts = filtered;
    this.totalItems = filtered.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.updatePagination();
  }

  onSelectAll() {
    this.filteredProducts.forEach(product => {
      product.selected = this.selectAll;
    });
  }

  onProductSelect(product: Product) {
    // product.selected is already toggled by ngModel
    this.selectAll = this.filteredProducts.every(p => p.selected);
  }

  onItemsPerPageChange() {
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedProducts = this.filteredProducts.slice(startIndex, endIndex);
  }

  getSelectedCount(): number {
    return this.products.filter(p => p.selected).length;
  }

  selectAllProducts() {
    this.filteredProducts.forEach(p => p.selected = true);
  }

  deselectAllProducts() {
    this.filteredProducts.forEach(p => p.selected = false);
    this.selectAll = false;
  }
  getStartItem(): number {
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  getEndItem(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
  }

  get visiblePages(): number[] {
    const pages = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  goToPage(page: number) {
    this.currentPage = page;
    this.updatePagination();
  }

  goToFirstPage() {
    this.currentPage = 1;
    this.updatePagination();
  }

  goToPreviousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  goToNextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  // Calculate discounted price for generic display
  getDiscountedPrice(originalPrice: number): number {
    if (!originalPrice) return 0;

    let discount = 0;
    if (this.formData.discountType === 'PHAN_TRAM') {
      const percent = Number(this.formData.discountValue) || 0;
      discount = originalPrice * (percent / 100);
    } else {
      discount = Number(this.formData.maxDiscountAmount) || 0;
    }

    // Ensure accurate big decimal handling expectation if needed, but number is fine for now
    return Math.max(0, originalPrice - discount);
  }

  getDiscountAmount(originalPrice: number): number {
    if (!originalPrice) return 0;
    return originalPrice - this.getDiscountedPrice(originalPrice);
  }

  goToLastPage() {
    this.currentPage = this.totalPages;
    this.updatePagination();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }
}
