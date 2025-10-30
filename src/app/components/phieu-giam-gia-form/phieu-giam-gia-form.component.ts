import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PhieuGiamGiaService } from '../../services/phieu-giam-gia.service';
import { PhieuGiamGiaRequest, KhachHang } from '../../interfaces/phieu-giam-gia.interface';

@Component({
  selector: 'app-phieu-giam-gia-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './phieu-giam-gia-form.component.html',
  styleUrls: ['./phieu-giam-gia-form.component.scss']
})
export class PhieuGiamGiaFormComponent implements OnInit {
  
  private phieuGiamGiaService = inject(PhieuGiamGiaService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  
  // Form data
  phieuCode = '';
  phieuName = '';
  phieuType: boolean = true; // true = tiền mặt, false = phần trăm
  maxDiscount = 0;
  minDiscount = 0; // Số tiền giảm tối thiểu
  minInvoice = 0;
  quantity = 0;
  startDate = '';
  endDate = '';
  trangThai = 'sap_dien_ra'; // Trạng thái: 'sap_dien_ra', 'dang_dien_ra', 'ket_thuc'
  isPublic = true; // Trạng thái privacy: true = công khai, false = cá nhân

  // Suggested codes
  suggestedCodes: string[] = [];
  showSuggestions = false;
  
  // Loading states
  isLoading = false;
  isSaving = false;
  
  // Error handling
  errorMessage = '';
  successMessage = '';
  
  // Validation errors
  validationErrors: { [key: string]: string } = {};

  // Customer selection
  searchTerm = '';
  selectedCustomers: KhachHang[] = [];
  customers: KhachHang[] = [];
  filteredCustomers: KhachHang[] = [];

  ngOnInit() {
    this.initializeForm();
    this.loadCustomers();
  }

  initializeForm() {
    // Generate suggested codes
    this.generateSuggestedCodes();
    
    // Set default dates
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
    
    this.startDate = this.formatDateForInput(today);
    this.endDate = this.formatDateForInput(nextMonth);
    
    // Tự động tính trạng thái khi khởi tạo form
    this.updateTrangThaiOnDateChange();
  }

  loadCustomers() {
    this.isLoading = true;
    
    this.phieuGiamGiaService.getAllCustomers().subscribe({
      next: (response: any) => {
        try {
          // Response trực tiếp là array, không có wrapper
          if (Array.isArray(response)) {
            this.customers = [...response]; // Tạo shallow copy để trigger change detection
            this.filteredCustomers = [...this.customers];
          } else if (response.success && response.data) {
            // Fallback cho format cũ
            this.customers = [...response.data];
            this.filteredCustomers = [...this.customers];
          } else {
            // Fallback nếu không có data
            this.customers = [];
            this.filteredCustomers = [];
          }
          
          // Trigger change detection một cách an toàn
          this.cdr.markForCheck();
        } catch (error) {
          console.error('Error processing customer data:', error);
          this.customers = [];
          this.filteredCustomers = [];
        } finally {
          this.isLoading = false;
          // Trigger change detection sau khi cập nhật loading state
          this.cdr.markForCheck();
        }
      },
      error: (error: any) => {
        console.error('Error loading customers:', error);
        this.errorMessage = 'Không thể tải danh sách khách hàng';
        this.customers = [];
        this.filteredCustomers = [];
        this.isLoading = false;
        // Trigger change detection để hiển thị error message
        this.cdr.markForCheck();
      }
    });
  }

  // Customer search and selection
  filterCustomers() {
    if (!this.searchTerm.trim()) {
      this.filteredCustomers = [...this.customers];
    } else {
      const searchLower = this.searchTerm.toLowerCase();
      this.filteredCustomers = this.customers.filter(customer =>
        customer.maKhachHang?.toLowerCase().includes(searchLower) ||
        customer.tenKhachHang.toLowerCase().includes(searchLower) ||
        customer.email.toLowerCase().includes(searchLower) ||
        customer.soDienThoai.includes(this.searchTerm)
      );
    }
    // Trigger change detection để cập nhật UI
    this.cdr.markForCheck();
  }

  selectCustomer(customer: KhachHang) {
    if (!this.selectedCustomers.find(c => c.id === customer.id)) {
      this.selectedCustomers = [...this.selectedCustomers, customer]; // Tạo new array để trigger change detection
      // Clear privacy validation error when selecting a customer
      this.clearPrivacyError();
      // Auto-update quantity for private vouchers
      this.updateQuantityForPrivateVoucher();
      // Trigger change detection
      this.cdr.markForCheck();
    }
  }

  removeCustomer(customer: KhachHang) {
    this.selectedCustomers = this.selectedCustomers.filter(c => c.id !== customer.id);
    // Clear privacy validation error when removing a customer
    this.clearPrivacyError();
    // Auto-update quantity for private vouchers
    this.updateQuantityForPrivateVoucher();
    // Trigger change detection
    this.cdr.markForCheck();
  }

  // Helper method to check if customer is selected
  isCustomerSelected(customer: KhachHang): boolean {
    return this.selectedCustomers.some(c => c.id === customer.id);
  }

  // Save phiếu giảm giá
  savePhieuGiamGia() {
    if (!this.validateForm()) {
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Tự động tính toán trạng thái dựa trên thời gian thực tế
    this.trangThai = this.calculateTrangThaiBasedOnTime();

    const requestBody: PhieuGiamGiaRequest = {
      maPhieu: this.phieuCode,
      tenPhieuGiamGia: this.phieuName,
      loaiPhieuGiamGia: this.phieuType,
      giaTriGiam: this.maxDiscount,
      giaTriToiThieu: this.minDiscount,
      soTienToiDa: this.maxDiscount,
      hoaDonToiThieu: this.minInvoice,
      soLuongDung: this.quantity,
      ngayBatDau: this.startDate,
      ngayKetThuc: this.endDate,
      trangThai: this.convertTrangThaiToBoolean(), // Convert trạng thái mới thành boolean
      isPublic: this.isPublic,
      selectedCustomerIds: this.isPublic ? undefined : this.selectedCustomers.map(c => c.id) // Chỉ gửi khi chế độ Cá nhân
    };

    console.log('Saving phiếu giảm giá:', requestBody);

    this.phieuGiamGiaService.createPhieuGiamGia(requestBody).subscribe({
      next: (response) => {
        console.log('Save success:', response);
        
        // Hiển thị message phù hợp với chế độ
        if (this.isPublic) {
          this.successMessage = 'Tạo phiếu giảm giá công khai thành công!';
        } else {
          this.successMessage = `Tạo phiếu giảm giá cá nhân thành công cho ${this.selectedCustomers.length} khách hàng!`;
        }
        
        this.resetForm();
        this.isSaving = false;
        
        // Navigate to phiếu giảm giá list page after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/phieu-giam-gia']);
        }, 2000);
      },
      error: (error) => {
        console.error('Save error:', error);
        this.errorMessage = error.error?.message || 'Lỗi khi tạo phiếu giảm giá';
        this.isSaving = false;
      }
    });
  }

  // Form validation
  validateForm(): boolean {
    this.validationErrors = {};
    let isValid = true;

    // Validate Mã Phiếu
    if (!this.phieuCode.trim()) {
      this.validationErrors['phieuCode'] = 'Mã phiếu không được để trống';
      isValid = false;
    } else if (this.phieuCode.trim().length < 3) {
      this.validationErrors['phieuCode'] = 'Mã phiếu phải có ít nhất 3 ký tự';
      isValid = false;
    } else if (this.phieuCode.trim().length > 50) {
      this.validationErrors['phieuCode'] = 'Mã phiếu không được vượt quá 50 ký tự';
      isValid = false;
    }

    // Validate Tên Phiếu
    if (!this.phieuName.trim()) {
      this.validationErrors['phieuName'] = 'Tên phiếu không được để trống';
      isValid = false;
    } else if (this.phieuName.trim().length < 2) {
      this.validationErrors['phieuName'] = 'Tên phiếu phải có ít nhất 2 ký tự';
      isValid = false;
    } else if (this.phieuName.trim().length > 100) {
      this.validationErrors['phieuName'] = 'Tên phiếu không được vượt quá 100 ký tự';
      isValid = false;
    }

    // Validate Trạng thái Phiếu (isPublic) - Nếu chọn cá nhân thì phải chọn khách hàng
    if (this.isPublic === false && this.selectedCustomers.length === 0) {
      this.validationErrors['isPublic'] = 'Khi chọn trạng thái "Cá nhân", bạn phải chọn ít nhất một khách hàng';
      isValid = false;
    }

    // Validate Loại Phiếu (phieuType)
    if (this.phieuType === null || this.phieuType === undefined) {
      this.validationErrors['phieuType'] = 'Vui lòng chọn loại phiếu';
      isValid = false;
    }

    // Validate Giá trị giảm (maxDiscount) theo loại phiếu
    if (this.maxDiscount === null || this.maxDiscount === undefined) {
      this.validationErrors['maxDiscount'] = 'Giá trị giảm không được để trống';
      isValid = false;
    } else if (!Number.isFinite(this.maxDiscount)) {
      this.validationErrors['maxDiscount'] = 'Giá trị giảm phải là số hợp lệ';
      isValid = false;
    } else if (this.phieuType) {
      // Tiền mặt
      if (this.maxDiscount <= 0) {
        this.validationErrors['maxDiscount'] = 'Giá trị giảm phải lớn hơn 0';
        isValid = false;
      } else if (this.maxDiscount < 1000) {
        this.validationErrors['maxDiscount'] = 'Giá trị giảm tiền mặt phải từ 1,000 VND trở lên';
        isValid = false;
      } else if (this.maxDiscount > 999999999) {
        this.validationErrors['maxDiscount'] = 'Giá trị giảm quá lớn (tối đa 999,999,999)';
        isValid = false;
      }
    } else {
      // Phần trăm
      if (this.maxDiscount < 1 || this.maxDiscount > 100) {
        this.validationErrors['maxDiscount'] = 'Giá trị giảm phần trăm phải từ 1% đến 100%';
        isValid = false;
      }
    }

    // Validate Số tiền giảm tối thiểu (chỉ áp dụng cho Tiền mặt)
    if (this.phieuType) {
      if (this.minDiscount === null || this.minDiscount === undefined) {
        this.validationErrors['minDiscount'] = 'Số tiền giảm tối thiểu không được để trống';
        isValid = false;
      } else if (!Number.isFinite(this.minDiscount)) {
        this.validationErrors['minDiscount'] = 'Số tiền giảm tối thiểu phải là số hợp lệ';
        isValid = false;
      } else if (this.minDiscount < 0) {
        this.validationErrors['minDiscount'] = 'Số tiền giảm tối thiểu không được âm';
        isValid = false;
      } else if (this.minDiscount > this.maxDiscount) {
        this.validationErrors['minDiscount'] = 'Số tiền giảm tối thiểu không được lớn hơn giá trị giảm';
        isValid = false;
      } else if (this.minDiscount > 999999999) {
        this.validationErrors['minDiscount'] = 'Số tiền giảm tối thiểu quá lớn (tối đa 999,999,999)';
        isValid = false;
      } else if (this.minDiscount > 0 && this.minDiscount < 100) {
        this.validationErrors['minDiscount'] = 'Số tiền giảm tối thiểu tiền mặt phải từ 100 VND trở lên';
        isValid = false;
      }
    }

    // Validate Hóa đơn tối thiểu (minInvoice)
    if (this.minInvoice === null || this.minInvoice === undefined) {
      this.validationErrors['minInvoice'] = 'Hóa đơn tối thiểu không được để trống';
      isValid = false;
    } else if (this.minInvoice < 0) {
      this.validationErrors['minInvoice'] = 'Hóa đơn tối thiểu không được âm';
      isValid = false;
    } else if (this.minInvoice > 999999999) {
      this.validationErrors['minInvoice'] = 'Hóa đơn tối thiểu quá lớn';
      isValid = false;
    }

    // Validate Số lượng (quantity)
    if (this.quantity === null || this.quantity === undefined) {
      this.validationErrors['quantity'] = 'Số lượng không được để trống';
      isValid = false;
    } else if (this.quantity <= 0) {
      this.validationErrors['quantity'] = 'Số lượng phải lớn hơn 0';
      isValid = false;
    } else if (this.quantity > 9999) {
      this.validationErrors['quantity'] = 'Số lượng không được vượt quá 9999';
      isValid = false;
    } else if (!Number.isInteger(this.quantity)) {
      this.validationErrors['quantity'] = 'Số lượng phải là số nguyên';
      isValid = false;
    }

    // Validate Ngày bắt đầu (startDate)
    if (!this.startDate) {
      this.validationErrors['startDate'] = 'Ngày bắt đầu không được để trống';
      isValid = false;
    } else {
      const start = new Date(this.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (isNaN(start.getTime())) {
        this.validationErrors['startDate'] = 'Ngày bắt đầu không hợp lệ';
        isValid = false;
      } else if (start < today) {
        this.validationErrors['startDate'] = 'Ngày bắt đầu không được là ngày trong quá khứ';
        isValid = false;
      }
    }

    // Validate Ngày kết thúc (endDate)
    if (!this.endDate) {
      this.validationErrors['endDate'] = 'Ngày kết thúc không được để trống';
      isValid = false;
    } else {
      const end = new Date(this.endDate);
      
      if (isNaN(end.getTime())) {
        this.validationErrors['endDate'] = 'Ngày kết thúc không hợp lệ';
        isValid = false;
      } else if (this.startDate) {
        const start = new Date(this.startDate);
        
        if (end <= start) {
          this.validationErrors['endDate'] = 'Ngày kết thúc phải sau ngày bắt đầu';
          isValid = false;
        }

        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 365) {
          this.validationErrors['endDate'] = 'Phiếu giảm giá không được có thời hạn quá 1 năm';
          isValid = false;
        }
      }
    }

    // Validate cho chế độ Cá nhân
    if (!this.isPublic) {
      if (!this.selectedCustomers || this.selectedCustomers.length === 0) {
        this.validationErrors['customers'] = 'Chế độ Cá nhân yêu cầu phải chọn ít nhất một khách hàng';
        isValid = false;
      }
    }

    return isValid;
  }

  getFieldError(fieldName: string): string {
    return this.validationErrors[fieldName] || '';
  }

  clearFieldError(fieldName: string) {
    if (this.validationErrors[fieldName]) {
      delete this.validationErrors[fieldName];
    }
  }

  // Clear privacy validation error when changing privacy status or selecting customers
  clearPrivacyError() {
    if (this.validationErrors['isPublic']) {
      delete this.validationErrors['isPublic'];
    }
    // Reset quantity to 0 when switching to private mode
    if (!this.isPublic) {
      this.quantity = 0;
      // Clear any quantity validation errors
      this.clearFieldError('quantity');
    }
    // Auto-update quantity when changing privacy status
    this.updateQuantityForPrivateVoucher();
  }

  // Auto-update quantity for private vouchers based on selected customers
  updateQuantityForPrivateVoucher() {
    if (!this.isPublic) {
      this.quantity = this.selectedCustomers.length;
    }
  }

  // Method to handle privacy status change
  onPrivacyStatusChange() {
    this.clearPrivacyError();
    // Force update quantity based on current mode
    if (!this.isPublic) {
      this.quantity = this.selectedCustomers.length;
    }
  }

  // Handle quantity input for private vouchers
  onQuantityInput(event: any) {
    if (!this.isPublic) {
      // Prevent input for private vouchers
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      event.target.value = this.quantity; // Reset to current value
      // Force update the model
      setTimeout(() => {
        this.quantity = this.selectedCustomers.length;
      }, 0);
      return false;
    }
    this.clearFieldError('quantity');
    return true;
  }

  // Handle quantity keydown for private vouchers
  onQuantityKeydown(event: KeyboardEvent) {
    if (!this.isPublic) {
      // Prevent all keyboard input for private vouchers
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return false;
    }
    return true;
  }

  // Handle quantity click for private vouchers
  onQuantityClick(event: any) {
    if (!this.isPublic) {
      // Prevent click for private vouchers
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      event.target.blur(); // Remove focus
      return false;
    }
    return true;
  }

  // Handle quantity focus for private vouchers
  onQuantityFocus(event: any) {
    if (!this.isPublic) {
      // Prevent focus for private vouchers
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      event.target.blur(); // Remove focus immediately
      return false;
    }
    return true;
  }

  // Handle quantity change for private vouchers (ngModel change)
  onQuantityChange() {
    if (!this.isPublic) {
      // Force reset to selected customers count
      this.quantity = this.selectedCustomers.length;
    }
  }

  // Handle quantity paste for private vouchers
  onQuantityPaste(event: any) {
    if (!this.isPublic) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return false;
    }
    return true;
  }

  // Handle quantity wheel (scroll) for private vouchers
  onQuantityWheel(event: any) {
    if (!this.isPublic) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return false;
    }
    return true;
  }

  // Navigation
  goBack() {
    this.router.navigate(['/phieu-giam-gia']);
  }

  navigateToHome() {
    this.router.navigate(['/dashboard']);
  }

  // Utility methods
  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getPhieuTypeText(): string {
    return this.phieuType ? 'Tiền mặt' : 'Phần trăm';
  }

  getTrangThaiText(): string {
    switch (this.trangThai) {
      case 'sap_dien_ra':
        return 'Sắp diễn ra';
      case 'dang_dien_ra':
        return 'Đang diễn ra';
      case 'ket_thuc':
        return 'Kết thúc';
      default:
        return 'Không xác định';
    }
  }

  // Convert trạng thái mới thành boolean để tương thích với backend
  convertTrangThaiToBoolean(): boolean {
    // Chỉ "Đang diễn ra" mới là true (hoạt động), các trạng thái khác là false
    return this.trangThai === 'dang_dien_ra';
  }

  // Tính toán trạng thái dựa trên thời gian thực tế
  calculateTrangThaiBasedOnTime(): string {
    const now = new Date();
    const startDate = new Date(this.startDate);
    const endDate = new Date(this.endDate);
    
    // Set thời gian về 00:00:00 để so sánh chính xác ngày
    now.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    
    if (now < startDate) {
      // Ngày hiện tại < ngày bắt đầu → Sắp diễn ra
      return 'sap_dien_ra';
    } else if (now >= startDate && now <= endDate) {
      // Ngày hiện tại trong khoảng từ ngày bắt đầu đến ngày kết thúc → Đang diễn ra
      return 'dang_dien_ra';
    } else {
      // Ngày hiện tại > ngày kết thúc → Kết thúc
      return 'ket_thuc';
    }
  }

  // Cập nhật trạng thái khi thay đổi ngày
  updateTrangThaiOnDateChange() {
    if (this.startDate && this.endDate) {
      this.trangThai = this.calculateTrangThaiBasedOnTime();
      console.log('Trạng thái đã được cập nhật:', this.getTrangThaiText());
    }
  }

  getGenderText(gender: boolean): string {
    return gender ? 'Nam' : 'Nữ';
  }

  onPhieuTypeChange() {
    // Xóa lỗi liên quan khi đổi loại
    this.clearFieldError('maxDiscount');
    this.clearFieldError('minDiscount');
    // Nếu chuyển sang phần trăm thì ẩn và reset minDiscount
    if (!this.phieuType) {
      this.minDiscount = 0;
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Chưa có';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN');
    } catch (error) {
      return 'Chưa có';
    }
  }

  // Generate suggested codes
  generateSuggestedCodes() {
    this.suggestedCodes = [
      this.phieuGiamGiaService.generatePhieuCode(),
      this.phieuGiamGiaService.generatePhieuCode(),
      this.phieuGiamGiaService.generatePhieuCode(),
      this.phieuGiamGiaService.generatePhieuCode(),
      this.phieuGiamGiaService.generatePhieuCode()
    ];
  }

  // Select suggested code
  selectSuggestedCode(code: string) {
    this.phieuCode = code;
    this.showSuggestions = false;
  }

  // Toggle suggestions (chỉ hiển thị khi click nút gợi ý)
  toggleSuggestions() {
    if (!this.showSuggestions) {
      // Nếu chưa có gợi ý, tạo mới
      this.generateSuggestedCodes();
    }
    this.showSuggestions = !this.showSuggestions;
  }

  // Generate new suggestions
  generateNewSuggestions() {
    this.generateSuggestedCodes();
  }

  // Reset form
  resetForm() {
    this.phieuCode = '';
    this.phieuName = '';
    this.phieuType = true;
    this.maxDiscount = 0;
    this.minDiscount = 0;
    this.minInvoice = 0;
    this.quantity = 0;
    this.trangThai = 'sap_dien_ra';
    this.isPublic = true;
    
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
    this.startDate = this.formatDateForInput(today);
    this.endDate = this.formatDateForInput(nextMonth);
    
    this.validationErrors = {};
    this.errorMessage = '';
    this.successMessage = '';
    
    // Reset customer data
    this.selectedCustomers = [];
    this.searchTerm = '';
    this.filteredCustomers = [...this.customers]; // Reset filtered customers to show all
    
    this.generateSuggestedCodes();
    
    // Trigger change detection để cập nhật UI
    this.cdr.markForCheck();
  }
}