import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PhieuGiamGiaService } from '../../services/phieu-giam-gia.service';
import { PhieuGiamGiaRequest, KhachHang, PhieuGiamGiaCaNhan } from '../../interfaces/phieu-giam-gia.interface';

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
  trangThai = true; // Trạng thái: true = hoạt động, false = không hoạt động

  // Suggested codes
  suggestedCodes: string[] = [];
  showSuggestions = false;
  
  // Customer selection
  searchTerm = '';
  selectedCustomers: KhachHang[] = [];
  customers: KhachHang[] = [];
  filteredCustomers: KhachHang[] = [];
  
  // Loading states
  isLoading = false;
  isSaving = false;
  
  // Error handling
  errorMessage = '';
  successMessage = '';
  
  // Validation errors
  validationErrors: { [key: string]: string } = {};

  // Phiếu Giảm Giá Cá Nhân
  phieuGiamGiaCaNhans: PhieuGiamGiaCaNhan[] = [];

  ngOnInit() {
    this.initializeForm();
    this.loadCustomers();
    this.loadPhieuGiamGiaCaNhans();
  }

  initializeForm() {
    // Generate suggested codes
    this.generateSuggestedCodes();
    
    // Set default dates
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
    
    this.startDate = this.formatDateForInput(today);
    this.endDate = this.formatDateForInput(nextMonth);
  }

  loadCustomers() {
    this.isLoading = true;
    
    this.phieuGiamGiaService.getAllCustomers().subscribe({
      next: (response: any) => {
        // Response trực tiếp là array, không có wrapper
        if (Array.isArray(response)) {
          this.customers = response;
          this.filteredCustomers = this.customers;
        } else if (response.success && response.data) {
          // Fallback cho format cũ
          this.customers = response.data;
          this.filteredCustomers = this.customers;
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading customers:', error);
        this.errorMessage = 'Không thể tải danh sách khách hàng';
        this.isLoading = false;
      }
    });
  }

  // Customer search and selection
  filterCustomers() {
    if (!this.searchTerm.trim()) {
      this.filteredCustomers = this.customers;
    } else {
      const searchLower = this.searchTerm.toLowerCase();
      this.filteredCustomers = this.customers.filter(customer =>
        customer.tenKhachHang.toLowerCase().includes(searchLower) ||
        customer.email.toLowerCase().includes(searchLower) ||
        customer.soDienThoai.includes(this.searchTerm)
      );
    }
  }

  selectCustomer(customer: KhachHang) {
    if (!this.selectedCustomers.find(c => c.id === customer.id)) {
      this.selectedCustomers.push(customer);
    }
  }

  removeCustomer(customer: KhachHang) {
    this.selectedCustomers = this.selectedCustomers.filter(c => c.id !== customer.id);
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
    
    const phieuData: PhieuGiamGiaRequest = {
      maPhieu: this.phieuCode,
      tenPhieuGiamGia: this.phieuName,
      loaiPhieuGiamGia: this.phieuType,
      giaTriGiam: this.maxDiscount,
      giaTriToiThieu: this.minDiscount, // Sử dụng minDiscount cho giaTriToiThieu
      soTienToiDa: this.maxDiscount,
      hoaDonToiThieu: this.minInvoice,
      soLuongDung: this.quantity,
      ngayBatDau: this.phieuGiamGiaService.formatDateForAPI(this.startDate),
      ngayKetThuc: this.phieuGiamGiaService.formatDateForAPI(this.endDate),
      trangThai: this.trangThai
    };
    
    this.phieuGiamGiaService.createPhieuGiamGia(phieuData).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.successMessage = 'Tạo phiếu giảm giá thành công!';
          
          // Reset form after successful creation
          setTimeout(() => {
            this.initializeForm();
            this.selectedCustomers = [];
            this.successMessage = '';
          }, 2000);
        } else {
          this.errorMessage = response.message || 'Không thể tạo phiếu giảm giá';
        }
        this.isSaving = false;
      },
      error: (error: any) => {
        console.error('Error creating phiếu giảm giá:', error);
        this.errorMessage = 'Lỗi khi tạo phiếu giảm giá: ' + error.message;
        this.isSaving = false;
      }
    });
  }

  // Validation methods
  validateForm(): boolean {
    this.validationErrors = {};
    let isValid = true;

    // Mã Phiếu validation
    if (!this.phieuCode || this.phieuCode.trim() === '') {
      this.validationErrors['phieuCode'] = 'Mã phiếu không được để trống';
      isValid = false;
    } else if (this.phieuCode.length < 3) {
      this.validationErrors['phieuCode'] = 'Mã phiếu phải có ít nhất 3 ký tự';
      isValid = false;
    }

    // Tên validation
    if (!this.phieuName || this.phieuName.trim() === '') {
      this.validationErrors['phieuName'] = 'Tên phiếu không được để trống';
      isValid = false;
    } else if (this.phieuName.length < 5) {
      this.validationErrors['phieuName'] = 'Tên phiếu phải có ít nhất 5 ký tự';
      isValid = false;
    }

    // Số tiền giảm tối đa validation
    if (this.maxDiscount < 0) {
      this.validationErrors['maxDiscount'] = 'Số tiền giảm tối đa không được âm';
      isValid = false;
    } else if (this.phieuType && this.maxDiscount > 1000000) {
      this.validationErrors['maxDiscount'] = 'Số tiền giảm tối đa không được vượt quá 1,000,000 VND';
      isValid = false;
    } else if (!this.phieuType && this.maxDiscount > 100) {
      this.validationErrors['maxDiscount'] = 'Phần trăm giảm không được vượt quá 100%';
      isValid = false;
    }

    // Số tiền giảm tối thiểu validation
    if (this.minDiscount < 0) {
      this.validationErrors['minDiscount'] = 'Số tiền giảm tối thiểu không được âm';
      isValid = false;
    } else if (this.minDiscount > this.maxDiscount) {
      this.validationErrors['minDiscount'] = 'Số tiền giảm tối thiểu không được lớn hơn tối đa';
      isValid = false;
    }

    // Hóa đơn tối thiểu validation
    if (this.minInvoice < 0) {
      this.validationErrors['minInvoice'] = 'Hóa đơn tối thiểu không được âm';
      isValid = false;
    } else if (this.minInvoice < 10000) {
      this.validationErrors['minInvoice'] = 'Hóa đơn tối thiểu phải ít nhất 10,000 VND';
      isValid = false;
    }

    // Số lượng validation
    if (this.quantity <= 0) {
      this.validationErrors['quantity'] = 'Số lượng phải lớn hơn 0';
      isValid = false;
    } else if (this.quantity > 10000) {
      this.validationErrors['quantity'] = 'Số lượng không được vượt quá 10,000';
      isValid = false;
    }

    // Ngày validation
    if (!this.startDate) {
      this.validationErrors['startDate'] = 'Ngày bắt đầu không được để trống';
      isValid = false;
    }

    if (!this.endDate) {
      this.validationErrors['endDate'] = 'Ngày kết thúc không được để trống';
      isValid = false;
    }

    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (start < today) {
        this.validationErrors['startDate'] = 'Ngày bắt đầu không được trong quá khứ';
        isValid = false;
      }

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

  getGenderText(gender: boolean): string {
    return gender ? 'Nam' : 'Nữ';
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

  // Toggle suggestions
  toggleSuggestions() {
    this.showSuggestions = !this.showSuggestions;
  }

  // Generate new suggestions
  generateNewSuggestions() {
    this.generateSuggestedCodes();
  }

  // Handle input focus
  onCodeInputFocus() {
    this.showSuggestions = true;
  }

  // Handle input blur (with delay to allow clicking suggestions)
  onCodeInputBlur() {
    setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
  }

  // Load Phiếu Giảm Giá Cá Nhân
  loadPhieuGiamGiaCaNhans() {
    console.log('Loading phiếu giảm giá cá nhân from API...');
    
    this.phieuGiamGiaService.getAllPhieuGiamGiaCaNhan().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.phieuGiamGiaCaNhans = response.data;
          console.log('Loaded phiếu giảm giá cá nhân:', this.phieuGiamGiaCaNhans);
          this.cdr.detectChanges();
        } else {
          console.error('Error loading phiếu giảm giá cá nhân:', response.message);
          this.loadMockData();
        }
      },
      error: (error) => {
        console.error('API Error loading phiếu giảm giá cá nhân:', error);
        this.loadMockData();
        this.cdr.detectChanges();
      }
    });
  }

  // Fallback mock data nếu API không hoạt động
  loadMockData() {
    console.log('Using mock data for phiếu giảm giá cá nhân');
    this.phieuGiamGiaCaNhans = [
      {
        id: 1,
        khachHangId: 1,
        phieuGiamGiaId: 1,
        daSuDung: false,
        ngayHetHan: '2024-12-31T23:59:59',
        soLanDaDung: 0,
        trangThai: 'Có thể sử dụng',
        tenKhachHang: 'Nguyễn Văn A',
        tenPhieuGiamGia: 'Giảm giá 10% cho đơn hàng từ 500k'
      },
      {
        id: 2,
        khachHangId: 2,
        phieuGiamGiaId: 1,
        daSuDung: true,
        ngayHetHan: '2024-12-31T23:59:59',
        ngaySuDung: '2024-10-10T10:30:00',
        soLanDaDung: 1,
        trangThai: 'Đã sử dụng',
        tenKhachHang: 'Đinh Thế Mạnh',
        tenPhieuGiamGia: 'Giảm giá 10% cho đơn hàng từ 500k'
      },
      {
        id: 3,
        khachHangId: 3,
        phieuGiamGiaId: 2,
        daSuDung: false,
        ngayHetHan: '2024-09-30T23:59:59',
        soLanDaDung: 0,
        trangThai: 'Hết hạn',
        tenKhachHang: 'Trịnh Châu Anh',
        tenPhieuGiamGia: 'Giảm giá 50k cho đơn hàng từ 1 triệu'
      }
    ];
    this.cdr.detectChanges();
  }

  // Get status class for styling
  getStatusClass(status: string): string {
    switch (status) {
      case 'Có thể sử dụng':
        return 'status-active';
      case 'Đã sử dụng':
        return 'status-used';
      case 'Hết hạn':
        return 'status-expired';
      default:
        return 'status-inactive';
    }
  }

  // Action methods for Phiếu Giảm Giá Cá Nhân
  toggleStatus(phieuCaNhan: PhieuGiamGiaCaNhan) {
    console.log('Toggle status for:', phieuCaNhan);
    // Logic để toggle trạng thái
    if (phieuCaNhan.trangThai === 'Có thể sử dụng') {
      phieuCaNhan.trangThai = 'Tạm khóa';
    } else {
      phieuCaNhan.trangThai = 'Có thể sử dụng';
    }
    this.cdr.detectChanges();
  }

  // Modal chỉnh sửa phiếu giảm giá cá nhân
  showEditPersonalVoucherModal = false;
  editingPersonalVoucher: PhieuGiamGiaCaNhan | null = null;
  isUpdatingPersonalVoucher = false;

  editPhieuCaNhan(phieuCaNhan: PhieuGiamGiaCaNhan) {
    console.log('Edit phiếu cá nhân:', phieuCaNhan);
    
    // Tạo bản copy để chỉnh sửa
    this.editingPersonalVoucher = {
      ...phieuCaNhan,
      ngayHetHan: this.formatDateTimeForInput(phieuCaNhan.ngayHetHan),
      ngaySuDung: phieuCaNhan.ngaySuDung ? this.formatDateTimeForInput(phieuCaNhan.ngaySuDung) : ''
    };
    
    this.showEditPersonalVoucherModal = true;
    this.cdr.detectChanges();
  }

  closeEditPersonalVoucherModal() {
    this.showEditPersonalVoucherModal = false;
    this.editingPersonalVoucher = null;
    this.isUpdatingPersonalVoucher = false;
    this.cdr.detectChanges();
  }

  updatePersonalVoucher() {
    if (!this.editingPersonalVoucher) {
      return;
    }

    this.isUpdatingPersonalVoucher = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Chuẩn bị dữ liệu để gửi API
    const requestData = {
      khachHangId: this.editingPersonalVoucher.khachHangId,
      phieuGiamGiaId: this.editingPersonalVoucher.phieuGiamGiaId,
      daSuDung: this.editingPersonalVoucher.daSuDung,
      ngayHetHan: this.editingPersonalVoucher.ngayHetHan,
      ngaySuDung: this.editingPersonalVoucher.daSuDung ? this.editingPersonalVoucher.ngaySuDung : null
    };

    console.log('Updating personal voucher:', requestData);

    this.phieuGiamGiaService.updatePhieuGiamGiaCaNhan(this.editingPersonalVoucher.id!, requestData).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          console.log('Update personal voucher success:', response.data);
          
          // Cập nhật trong danh sách local
          const index = this.phieuGiamGiaCaNhans.findIndex(p => p.id === this.editingPersonalVoucher!.id);
          if (index > -1) {
            this.phieuGiamGiaCaNhans[index] = response.data;
          }
          
          this.successMessage = 'Cập nhật phiếu giảm giá cá nhân thành công!';
          this.closeEditPersonalVoucherModal();
          
          // Reload danh sách để đảm bảo dữ liệu đồng bộ
          this.loadPhieuGiamGiaCaNhans();
          this.cdr.detectChanges();
        } else {
          this.errorMessage = response.message || 'Lỗi khi cập nhật phiếu giảm giá cá nhân';
        }
        this.isUpdatingPersonalVoucher = false;
      },
      error: (error) => {
        console.error('Error updating personal voucher:', error);
        this.errorMessage = 'Lỗi khi cập nhật phiếu giảm giá cá nhân: ' + (error.error?.message || error.message);
        this.isUpdatingPersonalVoucher = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Helper method để format datetime cho input
  private formatDateTimeForInput(dateTimeString: string): string {
    if (!dateTimeString) return '';
    
    try {
      const date = new Date(dateTimeString);
      // Format thành YYYY-MM-DDTHH:mm để input datetime-local có thể hiểu
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (error) {
      console.error('Error formatting datetime:', error);
      return '';
    }
  }

  viewDetails(phieuCaNhan: PhieuGiamGiaCaNhan) {
    console.log('View details for:', phieuCaNhan);
    // Logic để xem chi tiết phiếu cá nhân
  }

  deletePhieuCaNhan(phieuCaNhan: PhieuGiamGiaCaNhan) {
    console.log('Delete phiếu cá nhân:', phieuCaNhan);
    // Logic để xóa phiếu cá nhân
    if (confirm('Bạn có chắc chắn muốn xóa phiếu giảm giá cá nhân này?')) {
      const index = this.phieuGiamGiaCaNhans.findIndex(p => p.id === phieuCaNhan.id);
      if (index > -1) {
        this.phieuGiamGiaCaNhans.splice(index, 1);
      }
    }
  }
}
