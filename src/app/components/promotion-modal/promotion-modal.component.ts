import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
}

export interface Product {
  id: string;
  code: string;
  name: string;
  brand: string;
  quantity: number;
  selected: boolean;
}

@Component({
  selector: 'app-promotion-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './promotion-modal.component.html',
  styleUrls: ['./promotion-modal.component.scss'],
})
export class PromotionModalComponent {
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

  // Product List Properties
  searchTerm = '';
  selectedOS = '';
  selectedManufacturer = '';
  selectAll = false;

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  totalPages = 0;

  // Sample data
  products: Product[] = [
    { id: '1', code: 'SP00001', name: 'Iphone 14', brand: 'Apple', quantity: 1, selected: false },
    { id: '2', code: 'SP00002', name: 'Iphone 14 Plus', brand: 'Apple', quantity: 0, selected: false },
    { id: '3', code: 'SP00003', name: 'Iphone 14 Pro', brand: 'Apple', quantity: 2, selected: false },
    { id: '4', code: 'SP00004', name: 'Iphone 14 Pro Max', brand: 'Apple', quantity: 1, selected: false },
    { id: '5', code: 'SP00005', name: 'Iphone 15', brand: 'Apple', quantity: 0, selected: false },
    { id: '6', code: 'SP00006', name: 'Iphone 15 Plus', brand: 'Apple', quantity: 1, selected: false },
    { id: '7', code: 'SP00007', name: 'Iphone 15 Pro', brand: 'Apple', quantity: 1, selected: false },
    { id: '8', code: 'SP00008', name: 'Iphone 15 Pro Max', brand: 'Apple', quantity: 0, selected: false },
    { id: '9', code: 'SP00009', name: 'Iphone 16', brand: 'Apple', quantity: 4, selected: false },
    { id: '10', code: 'SP00010', name: 'Iphone 16 Plus', brand: 'Apple', quantity: 4, selected: false },
  ];

  filteredProducts: Product[] = [];
  operatingSystems = ['iOS', 'Android', 'Windows'];
  manufacturers = ['Apple', 'Samsung', 'Google'];

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

      console.log('Form data after mapping:', this.formData);
      console.log('formData.discountType:', this.formData.discountType);
      console.log('formData.startDate:', this.formData.startDate);
      console.log('formData.endDate:', this.formData.endDate);
      console.log('formData.discountValue:', this.formData.discountValue);
      console.log('formData.maxDiscountAmount:', this.formData.maxDiscountAmount);
    } else {
      this.resetForm();
    }
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

      // Show success message with entered data
      this.showSuccessMessage();

      this.save.emit(this.formData);
      this.resetForm();
    }
  }

  generatePromotionCode(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `KM${timestamp}${random}`;
  }

  showSuccessMessage() {
    const message = `
      Đã thêm đợt giảm giá thành công!

      Thông tin đã nhập:
      - Mã đợt: ${this.formData.code}
      - Tên đợt: ${this.formData.name}
      - Loại giảm giá: ${this.formData.discountType}
      - Giá trị: ${this.formData.discountValue}
      - Số tiền giảm: ${this.formData.maxDiscountAmount || 'Không có'}
      - Ngày bắt đầu: ${this.formData.startDate}
- Ngày kết thúc: ${this.formData.endDate}
    `;

    alert(message);
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

  onOSChange() {
    this.currentPage = 1;
    this.filterProducts();
  }

  onManufacturerChange() {
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

    if (this.selectedOS) {
      // Add OS filtering logic here
    }

    if (this.selectedManufacturer) {
      filtered = filtered.filter(p => p.brand === this.selectedManufacturer);
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
    product.selected = !product.selected;
    this.selectAll = this.filteredProducts.every(p => p.selected);
  }

  onItemsPerPageChange() {
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.filteredProducts = this.filteredProducts.slice(startIndex, endIndex);
  }
get startItem(): number {
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get endItem(): number {
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

  goToLastPage() {
    this.currentPage = this.totalPages;
    this.updatePagination();
  }
}
