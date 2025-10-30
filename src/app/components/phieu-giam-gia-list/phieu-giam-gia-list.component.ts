import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PhieuGiamGiaService } from '../../services/phieu-giam-gia.service';
import { PhieuGiamGiaResponse } from '../../interfaces/phieu-giam-gia.interface';

@Component({
  selector: 'app-phieu-giam-gia-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './phieu-giam-gia-list.component.html',
  styleUrls: ['./phieu-giam-gia-list.component.scss'],
})
export class PhieuGiamGiaListComponent implements OnInit {
  private phieuGiamGiaService = inject(PhieuGiamGiaService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  // Filter properties
  searchTerm = '';
  selectedType = 'all';
  selectedStatus = 'all';
  startDate = '';
  endDate = '';

  // Data
  phieuGiamGiaList: PhieuGiamGiaResponse[] = [];
  filteredList: PhieuGiamGiaResponse[] = [];
  loading = true; // Bắt đầu với loading = true
  error = '';

  // Edit modal
  showEditModal = false;
  editingPhieu: PhieuGiamGiaResponse | null = null;
  editForm = {
    maPhieu: '',
    tenPhieuGiamGia: '',
    loaiPhieuGiamGia: true,
    giaTriGiam: 0,
    giaTriToiThieu: 0,
    soTienToiDa: 0,
    hoaDonToiThieu: 0,
    soLuongDung: 0,
    ngayBatDau: '',
    ngayKetThuc: '',
    trangThai: 'sap_dien_ra', // Thay đổi từ boolean thành string
  };
  isUpdating = false;
  
  // Validation
  editValidationErrors: { [key: string]: string } = {};
  editTouchedFields = new Set<string>();

  // Pagination
  currentPage = 1;
  itemsPerPage = 5; // Hiển thị 5 dòng mỗi trang
  totalItems = 0;

  ngOnInit() {
    this.loadPhieuGiamGiaList();
  }

  // Tính toán trạng thái dựa trên thời gian thực tế
  calculateTrangThaiBasedOnTime(ngayBatDau: string, ngayKetThuc: string): string {
    console.log('=== CALCULATING STATUS ===');
    console.log('ngayBatDau:', ngayBatDau);
    console.log('ngayKetThuc:', ngayKetThuc);
    
    const now = new Date();
    const startDate = new Date(ngayBatDau);
    const endDate = new Date(ngayKetThuc);
    
    console.log('now:', now);
    console.log('startDate:', startDate);
    console.log('endDate:', endDate);
    
    // Set thời gian về 00:00:00 để so sánh chính xác ngày
    now.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    
    console.log('After setting hours:');
    console.log('now:', now);
    console.log('startDate:', startDate);
    console.log('endDate:', endDate);
    
    let status: string;
    if (now < startDate) {
      // Ngày hiện tại < ngày bắt đầu → Sắp diễn ra
      status = 'sap_dien_ra';
      console.log('Status: Sắp diễn ra');
    } else if (now >= startDate && now <= endDate) {
      // Ngày hiện tại trong khoảng từ ngày bắt đầu đến ngày kết thúc → Đang diễn ra
      status = 'dang_dien_ra';
      console.log('Status: Đang diễn ra');
    } else {
      // Ngày hiện tại > ngày kết thúc → Kết thúc
      status = 'ket_thuc';
      console.log('Status: Kết thúc');
    }
    
    console.log('Final status:', status);
    console.log('=== END CALCULATING STATUS ===');
    
    return status;
  }

  // Lấy text hiển thị của trạng thái
  getTrangThaiText(trangThai: string): string {
    switch (trangThai) {
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

  // Cập nhật trạng thái khi thay đổi ngày trong modal
  onEditDateChange() {
    if (this.editForm.ngayBatDau && this.editForm.ngayKetThuc) {
      this.editForm.trangThai = this.calculateTrangThaiBasedOnTime(this.editForm.ngayBatDau, this.editForm.ngayKetThuc);
    }
  }

  loadPhieuGiamGiaList() {
    this.loading = true;
    this.error = '';

    this.phieuGiamGiaService.getAllPhieuGiamGia(0, 1000, 'id', 'desc').subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.phieuGiamGiaList = response.data.data || [];
          this.filteredList = [...this.phieuGiamGiaList];
          this.totalItems = this.filteredList.length;
          this.currentPage = 1; // Reset về trang đầu tiên

          // Force change detection để UI update ngay lập tức
          this.cdr.detectChanges();
        } else {
          this.error = response.message || 'Không có dữ liệu phiếu giảm giá';
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error loading phiếu giảm giá:', error);
        this.error = 'Không thể tải danh sách phiếu giảm giá: ' + (error.message || error);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // Filter methods
  // Method to calculate status based on current time
  calculateStatus(phieu: PhieuGiamGiaResponse): string {
    const now = new Date();
    const startDate = new Date(phieu.ngayBatDau);
    const endDate = new Date(phieu.ngayKetThuc);

    if (now < startDate) {
      return 'sap_dien_ra';
    } else if (now >= startDate && now <= endDate) {
      return 'dang_dien_ra';
    } else {
      return 'ket_thuc';
    }
  }

  applyFilters() {
    this.filteredList = this.phieuGiamGiaList.filter((phieu) => {
      // Search filter
      if (this.searchTerm) {
        const searchLower = this.searchTerm.toLowerCase();
        if (
          !phieu.maPhieu.toLowerCase().includes(searchLower) &&
          !phieu.tenPhieuGiamGia.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // Type filter
      if (this.selectedType !== 'all') {
        const isTienMat = this.selectedType === 'tien_mat';
        if (phieu.loaiPhieuGiamGia !== isTienMat) {
          return false;
        }
      }

      // Status filter - based on time calculation
      if (this.selectedStatus !== 'all') {
        const calculatedStatus = this.calculateStatus(phieu);
        if (calculatedStatus !== this.selectedStatus) {
          return false;
        }
      }

      // Date range filter
      if (this.startDate && this.endDate) {
        const phieuStartDate = new Date(phieu.ngayBatDau);
        const phieuEndDate = new Date(phieu.ngayKetThuc);
        const filterStartDate = new Date(this.startDate);
        const filterEndDate = new Date(this.endDate);

        if (phieuStartDate < filterStartDate || phieuEndDate > filterEndDate) {
          return false;
        }
      }

      return true;
    });

    this.totalItems = this.filteredList.length;
    this.currentPage = 1;
    this.cdr.detectChanges();
  }

  resetFilters() {
    this.searchTerm = '';
    this.selectedType = 'all';
    this.selectedStatus = 'all';
    this.startDate = '';
    this.endDate = '';
    this.filteredList = [...this.phieuGiamGiaList];
    this.totalItems = this.filteredList.length;
    this.currentPage = 1;
    this.cdr.detectChanges();
  }

  exportExcel() {
    // TODO: Implement Excel export
    console.log('Export Excel functionality');
  }

  addPhieuGiamGia() {
    this.router.navigate(['/phieu-giam-gia-form']);
  }

  editPhieuGiamGia(phieu: PhieuGiamGiaResponse) {
    console.log('=== EDIT PHIEU GIAM GIA ===');
    console.log('phieu:', phieu);
    
    this.editingPhieu = phieu;
    
    // Tính toán trạng thái dựa trên thời gian thực tế
    const calculatedStatus = this.calculateTrangThaiBasedOnTime(phieu.ngayBatDau, phieu.ngayKetThuc);
    console.log('calculatedStatus:', calculatedStatus);
    
    this.editForm = {
      maPhieu: phieu.maPhieu,
      tenPhieuGiamGia: phieu.tenPhieuGiamGia,
      loaiPhieuGiamGia: phieu.loaiPhieuGiamGia,
      giaTriGiam: phieu.giaTriGiam,
      giaTriToiThieu: phieu.giaTriToiThieu,
      soTienToiDa: phieu.soTienToiDa,
      hoaDonToiThieu: phieu.hoaDonToiThieu,
      soLuongDung: phieu.soLuongDung,
      ngayBatDau: phieu.ngayBatDau,
      ngayKetThuc: phieu.ngayKetThuc,
      trangThai: calculatedStatus, // Sử dụng trạng thái được tính toán
    };
    
    console.log('editForm after setting:', this.editForm);
    
    // Reset validation state khi mở modal
    this.editValidationErrors = {};
    this.editTouchedFields.clear();
    this.isUpdating = false;
    
    this.showEditModal = true;
    console.log('=== END EDIT PHIEU GIAM GIA ===');
    
    // Force change detection để đảm bảo dropdown được cập nhật
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  toggleStatus(phieu: PhieuGiamGiaResponse, event?: Event) {
    console.log('=== TOGGLE STATUS CLICKED ===');
    console.log('Phieu clicked:', phieu);
    console.log('Current trangThai:', phieu.trangThai);
    console.log('isUpdating:', phieu.isUpdating);
    
    // Ngăn chặn default behavior của checkbox
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (phieu.isUpdating) {
      console.log('Phieu is already updating, returning.');
      return;
    }

    if (!phieu.id) {
      console.error('Không có ID cho phiếu giảm giá');
      return;
    }

    console.log('Setting isUpdating to true for phieu:', phieu.maPhieu);
    phieu.isUpdating = true;

    console.log('Calling API togglePhieuGiamGiaStatus...');
    this.phieuGiamGiaService.togglePhieuGiamGiaStatus(phieu).subscribe({
      next: (response) => {
        console.log('=== API RESPONSE ===');
        console.log('Response:', response);
        
        if (response.success) {
          console.log('API call successful, updating UI...');
          // Cập nhật trạng thái thành công
          phieu.trangThai = !phieu.trangThai;
          phieu.trangThaiText = phieu.trangThai ? 'Đang diễn ra' : 'Không hoạt động';
          
          console.log('New trangThai:', phieu.trangThai);
          console.log('New trangThaiText:', phieu.trangThaiText);
          
          // Cập nhật trong danh sách
          const index = this.phieuGiamGiaList.findIndex(p => p.id === phieu.id);
          if (index !== -1) {
            this.phieuGiamGiaList[index].trangThai = phieu.trangThai;
            this.phieuGiamGiaList[index].trangThaiText = phieu.trangThaiText;
            console.log('Updated in phieuGiamGiaList at index:', index);
          }
          
          // Cập nhật filtered list
          this.applyFilters();
          
          console.log('Toggle status thành công:', phieu);
        } else {
          console.error('API returned success=false:', response.message);
          this.error = response.message || 'Lỗi khi cập nhật trạng thái';
        }
        phieu.isUpdating = false;
        console.log('Setting isUpdating to false (success) for phieu:', phieu.maPhieu);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('=== API ERROR ===');
        console.error('Error toggling status:', error);
        this.error = 'Lỗi khi cập nhật trạng thái phiếu giảm giá: ' + (error.error?.message || error.message);
        phieu.isUpdating = false;
        console.log('Setting isUpdating to false (error) for phieu:', phieu.maPhieu);
        this.cdr.detectChanges();
      }
    });
  }

  // Utility methods
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  }

  getStatusText(phieu: PhieuGiamGiaResponse): string {
    const status = this.calculateStatus(phieu);
    switch (status) {
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

  getStatusClass(phieu: PhieuGiamGiaResponse): string {
    const status = this.calculateStatus(phieu);
    switch (status) {
      case 'sap_dien_ra':
        return 'status-upcoming';
      case 'dang_dien_ra':
        return 'status-active';
      case 'ket_thuc':
        return 'status-ended';
      default:
        return 'status-unknown';
    }
  }

  getTypeText(type: boolean): string {
    return type ? 'Tiền mặt' : 'Phần trăm';
  }

  getTypeClass(type: boolean): string {
    return type ? 'type-cash' : 'type-percentage';
  }

  // Pagination
  get paginatedList(): PhieuGiamGiaResponse[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredList.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  getPageNumbers(): (number | string)[] {
    const pages: (number | string)[] = [];
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;

    if (totalPages <= 7) {
      // Nếu tổng số trang <= 7, hiển thị tất cả
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Logic hiển thị trang với dấu "..."
      if (currentPage <= 4) {
        // Trang hiện tại ở đầu
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // Trang hiện tại ở cuối
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Trang hiện tại ở giữa
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  }

  onPageNumberClick(page: number | string) {
    if (typeof page === 'number') {
      this.goToPage(page);
    }
  }


  // Modal methods
  closeEditModal() {
    this.showEditModal = false;
    this.editingPhieu = null;
    this.isUpdating = false;
    this.editValidationErrors = {};
    this.editTouchedFields.clear();
    this.error = ''; // Clear general error message
  }

  // Validation methods
  validateEditForm(): boolean {
    this.editValidationErrors = {};
    let isValid = true;

    console.log('Validating form with data:', this.editForm);

    // Mã Phiếu validation
    if (!this.editForm.maPhieu || this.editForm.maPhieu.trim() === '') {
      this.editValidationErrors['maPhieu'] = 'Mã phiếu không được để trống';
      isValid = false;
    } else if (this.editForm.maPhieu.length < 3) {
      this.editValidationErrors['maPhieu'] = 'Mã phiếu phải có ít nhất 3 ký tự';
      isValid = false;
    }

    // Tên Phiếu validation
    if (!this.editForm.tenPhieuGiamGia || this.editForm.tenPhieuGiamGia.trim() === '') {
      this.editValidationErrors['tenPhieuGiamGia'] = 'Tên phiếu không được để trống';
      isValid = false;
    } else if (this.editForm.tenPhieuGiamGia.length < 5) {
      this.editValidationErrors['tenPhieuGiamGia'] = 'Tên phiếu phải có ít nhất 5 ký tự';
      isValid = false;
    }

    // Giá trị giảm validation
    if (this.editForm.giaTriGiam <= 0) {
      this.editValidationErrors['giaTriGiam'] = 'Giá trị giảm phải lớn hơn 0';
      isValid = false;
    } else if (this.editForm.loaiPhieuGiamGia && this.editForm.giaTriGiam > 1000000) {
      this.editValidationErrors['giaTriGiam'] = 'Giá trị giảm tiền mặt không được vượt quá 1,000,000 VND';
      isValid = false;
    } else if (!this.editForm.loaiPhieuGiamGia && this.editForm.giaTriGiam > 100) {
      this.editValidationErrors['giaTriGiam'] = 'Phần trăm giảm không được vượt quá 100%';
      isValid = false;
    }

    // Giá trị tối thiểu validation
    if (this.editForm.giaTriToiThieu < 0) {
      this.editValidationErrors['giaTriToiThieu'] = 'Giá trị tối thiểu không được âm';
      isValid = false;
    } else if (this.editForm.giaTriToiThieu > this.editForm.giaTriGiam) {
      this.editValidationErrors['giaTriToiThieu'] = 'Giá trị tối thiểu không được lớn hơn giá trị giảm';
      isValid = false;
    }

    // Số tiền tối đa validation
    if (this.editForm.soTienToiDa < 0) {
      this.editValidationErrors['soTienToiDa'] = 'Số tiền tối đa không được âm';
      isValid = false;
    }

    // Hóa đơn tối thiểu validation
    if (this.editForm.hoaDonToiThieu < 0) {
      this.editValidationErrors['hoaDonToiThieu'] = 'Hóa đơn tối thiểu không được âm';
      isValid = false;
    }

    // Số lượng validation
    if (this.editForm.soLuongDung <= 0) {
      this.editValidationErrors['soLuongDung'] = 'Số lượng phải lớn hơn 0';
      isValid = false;
    }

    // Ngày bắt đầu validation
    if (!this.editForm.ngayBatDau) {
      this.editValidationErrors['ngayBatDau'] = 'Ngày bắt đầu không được để trống';
      isValid = false;
    }

    // Ngày kết thúc validation
    if (!this.editForm.ngayKetThuc) {
      this.editValidationErrors['ngayKetThuc'] = 'Ngày kết thúc không được để trống';
      isValid = false;
    }

    // Kiểm tra ngày bắt đầu phải trước ngày kết thúc
    if (this.editForm.ngayBatDau && this.editForm.ngayKetThuc) {
      const startDate = new Date(this.editForm.ngayBatDau);
      const endDate = new Date(this.editForm.ngayKetThuc);
      
      if (startDate >= endDate) {
        this.editValidationErrors['ngayKetThuc'] = 'Ngày kết thúc phải sau ngày bắt đầu';
        isValid = false;
      }
    }

    console.log('Validation result:', { isValid, errors: this.editValidationErrors });
    return isValid;
  }

  hasEditFieldError(field: string): boolean {
    return this.editTouchedFields.has(field) && !!this.editValidationErrors[field];
  }

  getEditFieldError(field: string): string | null {
    if (!this.hasEditFieldError(field)) {
      return null;
    }
    return this.editValidationErrors[field];
  }

  onEditFieldBlur(field: string) {
    this.editTouchedFields.add(field);
    this.validateEditForm();
  }

  onEditFieldChange(field: string) {
    // Validate ngay khi người dùng thay đổi giá trị
    if (this.editTouchedFields.has(field)) {
      this.validateEditForm();
    }
  }

  // Method để test validation (có thể xóa sau khi test xong)
  testValidation() {
    console.log('Testing validation...');
    this.editForm.tenPhieuGiamGia = 'ab'; // Nhập tên ngắn để test
    this.editTouchedFields.add('tenPhieuGiamGia');
    this.validateEditForm();
    console.log('Has error for tenPhieuGiamGia:', this.hasEditFieldError('tenPhieuGiamGia'));
    console.log('Error message:', this.getEditFieldError('tenPhieuGiamGia'));
  }

  // Parse server error và map về các trường cụ thể
  parseServerError(errorMessage: string) {
    console.log('Parsing server error:', errorMessage);
    
    // Clear existing errors
    this.editValidationErrors = {};
    
    // Map các lỗi phổ biến từ server
    if (errorMessage.includes('Mã phiếu giảm giá đã tồn tại')) {
      this.editValidationErrors['maPhieu'] = 'Mã phiếu này đã được sử dụng';
      this.editTouchedFields.add('maPhieu');
    } else if (errorMessage.includes('Mã phiếu giảm giá không được để trống')) {
      this.editValidationErrors['maPhieu'] = 'Mã phiếu không được để trống';
      this.editTouchedFields.add('maPhieu');
    } else if (errorMessage.includes('Tên phiếu giảm giá không được để trống')) {
      this.editValidationErrors['tenPhieuGiamGia'] = 'Tên phiếu không được để trống';
      this.editTouchedFields.add('tenPhieuGiamGia');
    } else if (errorMessage.includes('Giá trị giảm phải lớn hơn 0')) {
      this.editValidationErrors['giaTriGiam'] = 'Giá trị giảm phải lớn hơn 0';
      this.editTouchedFields.add('giaTriGiam');
    } else if (errorMessage.includes('Giá trị tối thiểu không được âm')) {
      this.editValidationErrors['giaTriToiThieu'] = 'Giá trị tối thiểu không được âm';
      this.editTouchedFields.add('giaTriToiThieu');
    } else if (errorMessage.includes('Số tiền tối đa không được âm')) {
      this.editValidationErrors['soTienToiDa'] = 'Số tiền tối đa không được âm';
      this.editTouchedFields.add('soTienToiDa');
    } else if (errorMessage.includes('Hóa đơn tối thiểu không được âm')) {
      this.editValidationErrors['hoaDonToiThieu'] = 'Hóa đơn tối thiểu không được âm';
      this.editTouchedFields.add('hoaDonToiThieu');
    } else if (errorMessage.includes('Số lượng dùng phải lớn hơn 0')) {
      this.editValidationErrors['soLuongDung'] = 'Số lượng phải lớn hơn 0';
      this.editTouchedFields.add('soLuongDung');
    } else if (errorMessage.includes('Ngày bắt đầu không được để trống')) {
      this.editValidationErrors['ngayBatDau'] = 'Ngày bắt đầu không được để trống';
      this.editTouchedFields.add('ngayBatDau');
    } else if (errorMessage.includes('Ngày kết thúc không được để trống')) {
      this.editValidationErrors['ngayKetThuc'] = 'Ngày kết thúc không được để trống';
      this.editTouchedFields.add('ngayKetThuc');
    } else if (errorMessage.includes('Ngày bắt đầu phải trước ngày kết thúc')) {
      this.editValidationErrors['ngayKetThuc'] = 'Ngày kết thúc phải sau ngày bắt đầu';
      this.editTouchedFields.add('ngayKetThuc');
    } else {
      // Nếu không map được lỗi cụ thể, hiển thị lỗi chung ở đầu form
      this.editValidationErrors['general'] = errorMessage;
    }
  }

  // Parse HTTP error (400, 500, etc.)
  parseHttpError(error: any) {
    console.log('Parsing HTTP error:', error);
    
    // Clear existing errors
    this.editValidationErrors = {};
    
    let errorMessage = 'Lỗi không xác định';
    
    if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.status === 400) {
      errorMessage = 'Dữ liệu không hợp lệ';
    } else if (error.status === 404) {
      errorMessage = 'Không tìm thấy phiếu giảm giá';
    } else if (error.status === 500) {
      errorMessage = 'Lỗi server nội bộ';
    }
    
    // Hiển thị lỗi chung ở đầu form
    this.editValidationErrors['general'] = errorMessage;
  }

  updatePhieuGiamGia() {
    if (!this.editingPhieu) return;

    // Mark all fields as touched để hiển thị tất cả lỗi validation
    this.editTouchedFields.add('maPhieu');
    this.editTouchedFields.add('tenPhieuGiamGia');
    this.editTouchedFields.add('giaTriGiam');
    this.editTouchedFields.add('giaTriToiThieu');
    this.editTouchedFields.add('soTienToiDa');
    this.editTouchedFields.add('hoaDonToiThieu');
    this.editTouchedFields.add('soLuongDung');
    this.editTouchedFields.add('ngayBatDau');
    this.editTouchedFields.add('ngayKetThuc');

    // Validate form trước khi submit
    if (!this.validateEditForm()) {
      console.log('Validation failed:', this.editValidationErrors);
      return; // Không submit nếu validation fail
    }

    this.isUpdating = true;

    const updateData = {
      maPhieu: this.editForm.maPhieu,
      tenPhieuGiamGia: this.editForm.tenPhieuGiamGia,
      loaiPhieuGiamGia: this.editForm.loaiPhieuGiamGia,
      giaTriGiam: this.editForm.giaTriGiam,
      giaTriToiThieu: this.editForm.giaTriToiThieu,
      soTienToiDa: this.editForm.soTienToiDa,
      hoaDonToiThieu: this.editForm.hoaDonToiThieu,
      soLuongDung: this.editForm.soLuongDung,
      ngayBatDau: this.editForm.ngayBatDau,
      ngayKetThuc: this.editForm.ngayKetThuc,
      trangThai: this.convertTrangThaiToBoolean(this.editForm.trangThai), // Convert trạng thái mới thành boolean
      isPublic: true, // Mặc định là công khai cho các phiếu cũ
    };

    console.log('Submitting update data:', updateData);

    this.phieuGiamGiaService.updatePhieuGiamGia(this.editingPhieu.id, updateData).subscribe({
      next: (response: any) => {
        console.log('Update response:', response);
        if (response.success) {
          // Reload data
          this.loadPhieuGiamGiaList();
          this.closeEditModal();
        } else {
          // Parse server error và map về các trường cụ thể
          this.parseServerError(response.message);
        }
        this.isUpdating = false;
      },
      error: (error: any) => {
        console.error('Error updating phiếu giảm giá:', error);
        // Parse HTTP error và map về các trường cụ thể
        this.parseHttpError(error);
        this.isUpdating = false;
      },
    });
  }

  // Export to Excel
  exportToExcel() {
    console.log('=== EXPORT TO EXCEL ===');
    console.log('Filtered list:', this.filteredList);
    
    if (this.filteredList.length === 0) {
      alert('Không có dữ liệu để xuất Excel!');
      return;
    }

    // Tạo dữ liệu Excel
    const excelData = this.filteredList.map((phieu, index) => ({
      'STT': index + 1,
      'Mã Phiếu': phieu.maPhieu,
      'Tên Phiếu': phieu.tenPhieuGiamGia,
      'Loại Phiếu': phieu.loaiPhieuGiamGia ? 'Tiền mặt' : 'Phần trăm',
      'Giá Trị Giảm': phieu.giaTriGiam,
      'Giá Trị Tối Thiểu': phieu.giaTriToiThieu,
      'Số Tiền Tối Đa': phieu.soTienToiDa,
      'Hóa Đơn Tối Thiểu': phieu.hoaDonToiThieu,
      'Số Lượng': phieu.soLuongDung,
      'Trạng Thái': phieu.trangThai ? 'Hoạt động' : 'Không hoạt động',
      'Ngày Bắt Đầu': this.formatDate(phieu.ngayBatDau),
      'Ngày Kết Thúc': this.formatDate(phieu.ngayKetThuc),
      'Ngày Tạo': phieu.createdAt ? this.formatDate(phieu.createdAt) : 'N/A',
      'Ngày Cập Nhật': phieu.updatedAt ? this.formatDate(phieu.updatedAt) : 'N/A'
    }));

    // Gọi API để xuất Excel
    this.phieuGiamGiaService.exportToExcel(excelData).subscribe({
      next: (response: any) => {
        console.log('Excel export response:', response);
        
        if (response.success && response.data) {
          // Tạo blob từ base64 data
          const byteCharacters = atob(response.data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
          });

          // Tạo link download
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `phieu-giam-gia-${new Date().toISOString().split('T')[0]}.xlsx`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          console.log('Excel file downloaded successfully');
        } else {
          console.error('Excel export failed:', response.message);
          alert('Lỗi khi xuất Excel: ' + (response.message || 'Không xác định'));
        }
      },
      error: (error: any) => {
        console.error('Excel export error:', error);
        alert('Lỗi khi xuất Excel: ' + (error.error?.message || error.message));
      }
    });
  }

  // Method để refresh dữ liệu khi cần thiết
  refreshData() {
    this.loadPhieuGiamGiaList();
  }

  // Method để convert trạng thái string thành boolean
  convertTrangThaiToBoolean(trangThai: string): boolean {
    // Chuyển đổi trạng thái string thành boolean
    // Có thể tùy chỉnh logic này dựa trên yêu cầu business
    return trangThai === 'dang_dien_ra' || trangThai === 'active' || trangThai === 'true';
  }
}
