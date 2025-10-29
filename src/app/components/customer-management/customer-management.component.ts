import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { KhachHangService } from '../../services/khach-hang.service';
import { DiaChiKhachHangService } from '../../services/dia-chi-khach-hang.service';
import {
  KhachHang,
  KhachHangSearchParams,
  PageResponse,
  getTrangThaiText,
  getGioiTinhText,
} from '../../interfaces/khach-hang.interface';
import {
  DiaChiKhachHang,
  DiaChiKhachHangFormData,
  getTrangThaiDiaChiText,
  getMacDinhText,
  formatDiaChiFull,
} from '../../interfaces/dia-chi-khach-hang.interface';

@Component({
  selector: 'app-customer-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-management.component.html',
  styleUrls: ['./customer-management.component.css'],
})
export class CustomerManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Search and filter properties
  searchTerm = '';
  selectedStatus = '';

  // Data properties
  khachHangList: KhachHang[] = [];
  filteredList: KhachHang[] = [];
  paginatedList: KhachHang[] = [];
  allAddresses: DiaChiKhachHang[] = []; // Store all addresses for table display
  currentPage = 0;
  pageSize = 5; // Mặc định 5 items per page
  totalElements = 0;
  totalPages = 0;
  loading = false;

  // Modal properties
  showModal = false;
  showViewModal = false;
  isEditMode = false;
  isViewMode = false;
  selectedKhachHang: KhachHang | null = null;

  // Address management properties
  showAddressModal = false;
  showAddressList = false;
  isEditAddressMode = false;
  // Blur the customer modal when address modal is open
  blurCustomerModal = false;
  selectedAddress: DiaChiKhachHang | null = null;
  addressList: DiaChiKhachHang[] = [];
  pendingAddresses: DiaChiKhachHangFormData[] = []; // Địa chỉ tạm thời khi thêm khách hàng mới
  addressForm: DiaChiKhachHangFormData = {
    tenNguoiNhan: '',
    soDienThoai: '',
    diaChiChiTiet: '',
    tinhThanh: '',
    quanHuyen: '',
    phuongXa: '',
    macDinh: false,
    trangThai: true,
  };

  // Form properties
  form: KhachHang = {
    maKhachHang: '',
    tenKhachHang: '',
    email: '',
    soDienThoai: '',
    diaChi: '',
    gioiTinh: true,
    ngaySinh: '',
    trangThai: true,
  };

  // Error handling
  errorMessage = '';
  fieldErrors: { [key: string]: string } = {};

  // New UI properties for address navigation
  currentAddressIndex = 0;
  formattedNgaySinh = '';
  currentAddressMacDinh = false;

  constructor(
    private khachHangService: KhachHangService,
    private diaChiKhachHangService: DiaChiKhachHangService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('Customer Management Component initialized');
    this.loadKhachHangList();
    this.loadAllAddresses();

    // Fallback: Load sample data if API fails
    setTimeout(() => {
      if (this.khachHangList.length === 0 && !this.loading) {
        console.log('Loading sample data as fallback...');
        this.loadSampleData();
      }
    }, 2000);
  }

  // Generate next customer code (e.g., KH0001, KH0002, ...)
  private generateCustomerCode(): void {
    // Default visible immediately
    this.form.maKhachHang = 'KH001';

    const params: KhachHangSearchParams = {
      page: 0,
      size: 1,
      sortBy: 'id',
      sortDir: 'desc',
    } as any;

    this.khachHangService
      .searchKhachHang(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PageResponse<KhachHang>) => {
          let nextNumber = 1;
          const last =
            response?.content && response.content.length > 0 ? response.content[0] : null;
          const lastCode = last?.maKhachHang || '';
          if (lastCode && lastCode.startsWith('KH')) {
            const num = parseInt(lastCode.substring(2), 10);
            if (!isNaN(num)) nextNumber = num + 1;
          }
          this.form.maKhachHang = `KH${nextNumber.toString().padStart(3, '0')}`;
          this.cdr.detectChanges();
        },
        error: () => {
          // keep default KH001
          this.cdr.detectChanges();
        },
      });
  }

  // Load sample data for testing
  loadSampleData(): void {
    const sampleData: KhachHang[] = [
      {
        id: 1,
        maKhachHang: 'KH001',
        tenKhachHang: 'Nguyễn Văn An',
        email: 'an@email.com',
        soDienThoai: '0123456789',
        diaChi: '123 Đường ABC, Quận 1, TP.HCM',
        ngaySinh: '1990-01-15',
        gioiTinh: true,
        trangThai: true,
        ngayTao: new Date().toISOString(),
      },
      {
        id: 2,
        maKhachHang: 'KH002',
        tenKhachHang: 'Trần Thị Bình',
        email: 'binh@email.com',
        soDienThoai: '0987654321',
        diaChi: '456 Đường XYZ, Quận 2, TP.HCM',
        ngaySinh: '1985-05-20',
        gioiTinh: false,
        trangThai: true,
        ngayTao: new Date().toISOString(),
      },
      {
        id: 3,
        maKhachHang: 'KH003',
        tenKhachHang: 'Lê Văn Cường',
        email: 'cuong@email.com',
        soDienThoai: '0369852147',
        diaChi: '789 Đường DEF, Quận 3, TP.HCM',
        ngaySinh: '1992-12-10',
        gioiTinh: true,
        trangThai: false,
        ngayTao: new Date().toISOString(),
      },
      {
        id: 4,
        maKhachHang: 'KH004',
        tenKhachHang: 'Phạm Thị Dung',
        email: 'dung@email.com',
        soDienThoai: '0369852148',
        diaChi: '321 Đường GHI, Quận 4, TP.HCM',
        ngaySinh: '1988-08-25',
        gioiTinh: false,
        trangThai: true,
        ngayTao: new Date().toISOString(),
      },
      {
        id: 5,
        maKhachHang: 'KH005',
        tenKhachHang: 'Hoàng Văn Em',
        email: 'em@email.com',
        soDienThoai: '0369852149',
        diaChi: '654 Đường JKL, Quận 5, TP.HCM',
        ngaySinh: '1995-03-12',
        gioiTinh: true,
        trangThai: true,
        ngayTao: new Date().toISOString(),
      },
      {
        id: 6,
        maKhachHang: 'KH006',
        tenKhachHang: 'Võ Thị Phương',
        email: 'phuong@email.com',
        soDienThoai: '0369852150',
        diaChi: '987 Đường MNO, Quận 6, TP.HCM',
        ngaySinh: '1993-11-08',
        gioiTinh: false,
        trangThai: false,
        ngayTao: new Date().toISOString(),
      },
      {
        id: 7,
        maKhachHang: 'KH007',
        tenKhachHang: 'Đặng Văn Quang',
        email: 'quang@email.com',
        soDienThoai: '0369852151',
        diaChi: '147 Đường PQR, Quận 7, TP.HCM',
        ngaySinh: '1987-07-30',
        gioiTinh: true,
        trangThai: true,
        ngayTao: new Date().toISOString(),
      },
      {
        id: 8,
        maKhachHang: 'KH008',
        tenKhachHang: 'Bùi Thị Hoa',
        email: 'hoa@email.com',
        soDienThoai: '0369852152',
        diaChi: '258 Đường STU, Quận 8, TP.HCM',
        ngaySinh: '1991-04-18',
        gioiTinh: false,
        trangThai: true,
        ngayTao: new Date().toISOString(),
      },
    ];

    this.khachHangList = sampleData;
    this.filteredList = [...sampleData];
    this.totalElements = sampleData.length;
    this.totalPages = Math.ceil(sampleData.length / this.pageSize);
    this.updatePaginatedList();
    this.cdr.detectChanges();

    console.log('Sample data loaded:', sampleData);
  }

  // Test API connection
  testApiConnection(): void {
    console.log('Testing API connection...');
    const testParams: KhachHangSearchParams = {
      page: 0,
      size: 1,
      sortBy: 'id',
      sortDir: 'desc',
    };

    this.khachHangService
      .searchKhachHang(testParams)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('API connection successful:', response);
        },
        error: (error) => {
          console.error('API connection failed:', error);
          alert('API connection failed: ' + error.message);
        },
      });
  }

  // Getter for total customers
  get totalCustomers(): number {
    return this.khachHangList.length;
  }

  // Math object for template
  Math = Math;

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Load khách hàng list from backend
  loadKhachHangList(): void {
    this.loading = true;
    this.errorMessage = '';

    // Use search with current filters
    const searchParams: KhachHangSearchParams = {
      page: this.currentPage,
      size: this.pageSize,
      sortBy: 'id',
      sortDir: 'desc',
      keyword: this.searchTerm || undefined,
      trangThai: this.selectedStatus === '' ? undefined : this.selectedStatus === 'true',
    };

    console.log('Loading khách hàng with params:', searchParams);
    console.log('Current state:', {
      currentPage: this.currentPage,
      pageSize: this.pageSize,
      searchTerm: this.searchTerm,
      selectedStatus: this.selectedStatus,
    });

    this.khachHangService
      .searchKhachHang(searchParams)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PageResponse<KhachHang>) => {
          console.log('Received response:', response);

          // Update data arrays with new references to trigger change detection
          this.khachHangList = response.content ? [...response.content] : [];
          this.filteredList = [...this.khachHangList];
          this.totalElements = response.totalElements || 0;
          this.totalPages = response.totalPages || 0;
          this.loading = false;

          // For server-side pagination, paginatedList = khachHangList
          this.paginatedList = [...this.khachHangList];

          // Force change detection
          this.cdr.detectChanges();

          console.log('Updated data:', {
            khachHangList: this.khachHangList.length,
            filteredList: this.filteredList.length,
            totalElements: this.totalElements,
            totalPages: this.totalPages,
            currentPage: this.currentPage,
          });
        },
        error: (error) => {
          console.error('Error loading khách hàng:', error);
          this.errorMessage = error.message || 'Có lỗi xảy ra khi tải danh sách khách hàng';
          this.loading = false;
          // Clear data on error
          this.khachHangList = [];
          this.filteredList = [];
          this.paginatedList = [];
          this.totalElements = 0;
          this.totalPages = 0;
          this.cdr.detectChanges();

          // Show error message to user
          alert('Lỗi khi tải dữ liệu: ' + this.errorMessage);
        },
      });
  }

  // Filter change handler
  onFilterChange(): void {
    this.currentPage = 0; // Reset to first page when filtering

    // If we already have data loaded (e.g., sample data or first page from API),
    // perform a fast client-side filter for instant UX. We still support
    // server-side search when needed via loadKhachHangList().
    if (this.khachHangList && this.khachHangList.length > 0) {
      const term = (this.searchTerm || '').trim().toLowerCase();
      const statusFilter = this.selectedStatus === '' ? undefined : this.selectedStatus === 'true';

      this.filteredList = this.khachHangList.filter((kh) => {
        const matchesTerm =
          !term ||
          (kh.maKhachHang || '').toLowerCase().includes(term) ||
          (kh.tenKhachHang || '').toLowerCase().includes(term) ||
          (kh.email || '').toLowerCase().includes(term) ||
          (kh.soDienThoai || '').toLowerCase().includes(term);
        const matchesStatus = statusFilter === undefined ? true : kh.trangThai === statusFilter;
        return matchesTerm && matchesStatus;
      });

      // Update totals and paginated list (client-side)
      this.totalElements = this.filteredList.length;
      this.totalPages = Math.max(1, Math.ceil(this.totalElements / this.pageSize));
      this.paginatedList = [...this.filteredList].slice(0, this.pageSize);
      this.cdr.detectChanges();
      return;
    }

    // Fallback to server-side search when no data is loaded yet
    this.loadKhachHangList();
    this.cdr.detectChanges();
  }

  // Reset filter
  resetFilter(): void {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.onFilterChange();
    this.cdr.detectChanges();
  }

  // Toggle customer status
  toggleStatus(khachHang: KhachHang): void {
    if (!khachHang.id) return;

    const updatedKhachHang = { ...khachHang, trangThai: !khachHang.trangThai };

    this.khachHangService
      .updateKhachHang(khachHang.id, updatedKhachHang)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Update local data
          const index = this.khachHangList.findIndex((kh) => kh.id === khachHang.id);
          if (index !== -1) {
            this.khachHangList[index] = response;
          }
          this.onFilterChange();
          alert('Cập nhật trạng thái thành công!');
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error updating status:', error);
          alert('Có lỗi xảy ra khi cập nhật trạng thái!');
          this.cdr.detectChanges();
        },
      });
  }

  // Update paginated list (for client-side filtering only)
  updatePaginatedList(): void {
    // For server-side pagination, paginatedList is set directly in loadKhachHangList.
    // For client-side filtering, slice from filteredList based on currentPage/pageSize.
    if (this.filteredList && this.filteredList.length > 0) {
      const start = this.currentPage * this.pageSize;
      const end = start + this.pageSize;
      this.paginatedList = this.filteredList.slice(start, end);
    }
    this.cdr.detectChanges();
  }

  // Get page numbers for pagination
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(0, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages - 1, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(0, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i + 1);
    }

    return pages;
  }

  // Force refresh data (for debugging)
  forceRefresh(): void {
    console.log('Force refreshing data...');
    this.currentPage = 0;
    this.loadKhachHangList();
    this.cdr.detectChanges();
  }

  // Refresh data after save operation
  refreshAfterSave(): void {
    console.log('Refreshing data after save...');
    this.forceRefreshData();
  }

  // Remove item from UI immediately (optimistic update)
  removeFromUI(id: number): void {
    console.log('Removing item from UI with ID:', id);

    // Remove from khachHangList
    this.khachHangList = this.khachHangList.filter((item) => item.id !== id);

    // Remove from filteredList
    this.filteredList = this.filteredList.filter((item) => item.id !== id);

    // Update totals
    this.totalElements = Math.max(0, this.totalElements - 1);

    // Recalculate total pages
    this.totalPages = Math.ceil(this.totalElements / this.pageSize);

    // If current page is empty and not the first page, go to previous page
    if (this.currentPage >= this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages - 1;
    }

    // Force change detection
    this.cdr.detectChanges();

    console.log('Item removed from UI. New totals:', {
      khachHangList: this.khachHangList.length,
      filteredList: this.filteredList.length,
      totalElements: this.totalElements,
      totalPages: this.totalPages,
      currentPage: this.currentPage,
    });
  }

  // Refresh data after delete operation
  refreshAfterDelete(): void {
    console.log('Refreshing data after delete...');

    // Reload data from server to ensure consistency
    this.loadKhachHangList();

    // Force change detection
    this.cdr.detectChanges();

    console.log('Data refreshed after delete');
  }

  // Open add modal
  openAdd(): void {
    this.isEditMode = false;
    this.isViewMode = false;
    this.selectedKhachHang = null;
    this.resetForm();
    // Auto-generate code for new customer
    this.generateCustomerCode();
    this.fieldErrors = {};
    this.addressList = []; // Reset address list for new customer
    this.pendingAddresses = []; // Reset pending addresses
    this.currentAddressIndex = 0;
    this.formattedNgaySinh = '';
    this.currentAddressMacDinh = false;
    this.showModal = true;
    this.cdr.detectChanges();
  }

  // Open edit modal
  openEdit(khachHang: KhachHang): void {
    this.isEditMode = true;
    this.isViewMode = false;
    this.selectedKhachHang = khachHang;
    this.fieldErrors = {};

    this.form = {
      maKhachHang: khachHang.maKhachHang || '',
      tenKhachHang: khachHang.tenKhachHang || '',
      email: khachHang.email || '',
      soDienThoai: khachHang.soDienThoai || '',
      diaChi: khachHang.diaChi || '',
      ngaySinh: khachHang.ngaySinh ? khachHang.ngaySinh.split('T')[0] : '',
      gioiTinh: khachHang.gioiTinh !== undefined ? khachHang.gioiTinh : true,
      trangThai: khachHang.trangThai !== undefined ? khachHang.trangThai : true,
    };

    // Format date for display
    if (this.form.ngaySinh) {
      const dateParts = this.form.ngaySinh.split('-');
      if (dateParts.length === 3) {
        this.formattedNgaySinh = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
      }
    } else {
      this.formattedNgaySinh = '';
    }

    // Load addresses for existing customer
    if (khachHang.id) {
      this.loadAddressListForCustomer(khachHang.id);
    } else {
      this.addressList = [];
    }

    // Reset address navigation
    this.currentAddressIndex = 0;
    this.updateCurrentAddressMacDinh();

    // Also reload all addresses to ensure table display is updated
    this.loadAllAddresses();

    this.showModal = true;
    this.cdr.detectChanges();
  }

  // View details
  view(khachHang: KhachHang): void {
    this.isEditMode = false;
    this.isViewMode = true;
    this.selectedKhachHang = khachHang;

    // Load addresses for viewing
    if (khachHang.id) {
      this.loadAddressListForCustomer(khachHang.id);
    } else {
      this.addressList = [];
    }

    this.showViewModal = true;
    this.cdr.detectChanges();
  }

  // Close modal
  closeModal(): void {
    this.showModal = false;
    this.isEditMode = false;
    this.isViewMode = false;
    this.selectedKhachHang = null;
    this.resetForm();
    this.fieldErrors = {};
    this.errorMessage = '';
    this.loading = false;
    this.addressList = []; // Reset address list
    this.pendingAddresses = []; // Reset pending addresses
    this.currentAddressIndex = 0;
    this.formattedNgaySinh = '';
    this.currentAddressMacDinh = false;

    // Reload all addresses to ensure table display is updated
    this.loadAllAddresses();

    this.cdr.detectChanges();
  }

  // Form methods
  resetForm(): void {
    this.form = {
      maKhachHang: '',
      tenKhachHang: '',
      email: '',
      soDienThoai: '',
      diaChi: '',
      gioiTinh: true,
      ngaySinh: '',
      trangThai: true,
    };
    this.formattedNgaySinh = '';
    this.cdr.detectChanges();
  }

  // Save customer
  save(): void {
    // Clear previous errors
    this.clearFieldErrors();
    this.errorMessage = '';

    // Validate all fields
    if (!this.isFormValid()) {
      this.errorMessage = 'Vui lòng kiểm tra lại thông tin đã nhập';
      return;
    }

    this.loading = true;

    const khachHangData: KhachHang = {
      ...this.form,
      ngaySinh: this.form.ngaySinh || undefined,
    };

    const saveOperation =
      this.isEditMode && this.selectedKhachHang?.id
        ? this.khachHangService.updateKhachHang(this.selectedKhachHang.id, khachHangData)
        : this.khachHangService.createKhachHang(khachHangData);

    saveOperation.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.loading = false;

        // Update address list after save and reset navigation
      if (this.isEditMode && response.id) {
        this.loadAddressListForCustomer(response.id);
        setTimeout(() => {
          this.currentAddressIndex = 0;
          this.updateCurrentAddressMacDinh();
        }, 300);
      }

      // Nếu là thêm khách hàng mới và có địa chỉ cần lưu
        if (!this.isEditMode && response.id) {
          let hasAddressToSave = false;

          // Kiểm tra nếu có địa chỉ từ trường diaChi
          if (khachHangData.diaChi && khachHangData.diaChi.trim()) {
            hasAddressToSave = true;
            // Tạo địa chỉ mặc định từ trường diaChi
            this.createDefaultAddressFromDiaChi(response.id, khachHangData.diaChi);
          }

          // Kiểm tra nếu có địa chỉ tạm thời từ phần quản lý địa chỉ
          if (this.pendingAddresses.length > 0) {
            hasAddressToSave = true;
            // Lưu tất cả địa chỉ tạm thời
            this.savePendingAddresses(response.id);
          }

          if (!hasAddressToSave) {
            // Không có địa chỉ nào để lưu
            const successMessage = 'Thêm khách hàng thành công! (0/0 địa chỉ được lưu)';
            alert(successMessage);
            this.closeModal();
            this.refreshAfterSave();
          }
        } else {
          // Show success message cho edit mode
          const successMessage = this.isEditMode
            ? 'Cập nhật khách hàng thành công!'
            : 'Thêm khách hàng thành công!';
          alert(successMessage);

          // Close modal
          this.closeModal();

          // Refresh data to show the new/updated customer
          this.refreshAfterSave();
        }

        console.log('Customer saved successfully:', response);
      },
      error: (error) => {
        this.loading = false;
        console.error('Error saving khách hàng:', error);

        if (error.error && typeof error.error === 'string') {
          // Backend validation error
          this.errorMessage = error.error;
        } else if (error.error && error.error.message) {
          this.errorMessage = error.error.message;
        } else {
          this.errorMessage = this.isEditMode
            ? 'Có lỗi xảy ra khi cập nhật khách hàng'
            : 'Có lỗi xảy ra khi thêm khách hàng';
        }
        this.cdr.detectChanges();
      },
    });
  }

  // Delete customer permanently
  delete(khachHang: KhachHang): void {
    if (!khachHang.id) return;

    const confirmed = confirm(
      `Bạn có chắc chắn muốn XÓA VĨNH VIỄN khách hàng "${khachHang.tenKhachHang}"?\n\n⚠️ Hành động này sẽ XÓA HOÀN TOÀN dữ liệu khách hàng khỏi hệ thống và KHÔNG THỂ hoàn tác!`
    );
    if (!confirmed) return;

    this.loading = true;
    this.errorMessage = ''; // Clear any previous errors
    console.log('Deleting khách hàng with ID:', khachHang.id);

    // Optimistic update: Remove from UI immediately
    this.removeFromUI(khachHang.id);

    this.khachHangService
      .deleteKhachHangPermanently(khachHang.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Delete response:', response);
          this.loading = false;

          // Show success message
          alert('✅ Đã XÓA VĨNH VIỄN khách hàng khỏi hệ thống thành công!');

          // Refresh data from server to ensure consistency
          this.refreshAfterDelete();
        },
        error: (error) => {
          this.loading = false;
          console.error('Error deleting khách hàng permanently:', error);

          // If delete failed, reload data to restore the item
          this.loadKhachHangList();

          // Show error message
          this.errorMessage = error.error || 'Có lỗi xảy ra khi xóa khách hàng';
          this.cdr.detectChanges();
        },
      });
  }

  // Pagination
  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      // If we are filtering client-side, just update the slice; otherwise, hit API
      if (
        this.filteredList &&
        this.filteredList.length > 0 &&
        this.filteredList.length !== this.khachHangList.length
      ) {
        this.updatePaginatedList();
      } else {
        // Load data from API for the new page
        this.loadKhachHangList();
      }
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 0; // Reset về trang đầu tiên
    // Load data from API with new page size
    this.loadKhachHangList();
  }

  // Utility functions
  getTrangThaiText(trangThai: boolean | undefined): string {
    return getTrangThaiText(trangThai);
  }

  getGioiTinhText(gioiTinh: boolean | undefined): string {
    return getGioiTinhText(gioiTinh);
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'Chưa cập nhật';
    return new Date(dateString).toLocaleDateString('vi-VN');
  }

  truncateText(text: string | undefined, maxLength: number): string {
    if (!text) return 'Chưa cập nhật';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  // Form validation
  isFormValid(): boolean {
    this.clearFieldErrors();
    let isValid = true;

    // Validate required fields
    if (!this.form.tenKhachHang?.trim()) {
      this.fieldErrors['tenKhachHang'] = 'Họ tên là bắt buộc';
      isValid = false;
    } else if (this.form.tenKhachHang.trim().length < 2) {
      this.fieldErrors['tenKhachHang'] = 'Họ tên phải có ít nhất 2 ký tự';
      isValid = false;
    } else if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(this.form.tenKhachHang.trim())) {
      this.fieldErrors['tenKhachHang'] = 'Họ tên chỉ được chứa chữ cái và khoảng trắng';
      isValid = false;
    }

    if (!this.form.email?.trim()) {
      this.fieldErrors['email'] = 'Email là bắt buộc';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email.trim())) {
      this.fieldErrors['email'] = 'Email không hợp lệ';
      isValid = false;
    }

    if (!this.form.soDienThoai?.trim()) {
      this.fieldErrors['soDienThoai'] = 'Số điện thoại là bắt buộc';
      isValid = false;
    } else if (!/^[0-9]{10,11}$/.test(this.form.soDienThoai.trim())) {
      this.fieldErrors['soDienThoai'] = 'Số điện thoại phải có 10-11 chữ số';
      isValid = false;
    }

    // Validate optional fields
    if (this.form.maKhachHang?.trim() && !/^[A-Z0-9_-]*$/.test(this.form.maKhachHang.trim())) {
      this.fieldErrors['maKhachHang'] =
        'Mã khách hàng chỉ được chứa chữ hoa, số, gạch ngang và gạch dưới';
      isValid = false;
    }

    if (this.form.trangThai === undefined || this.form.trangThai === null) {
      this.fieldErrors['trangThai'] = 'Trạng thái là bắt buộc';
      isValid = false;
    }

    return isValid;
  }

  private clearFieldErrors(): void {
    this.fieldErrors = {};
  }

  // Validate individual field
  validateField(fieldName: string, value: any): void {
    this.clearFieldErrors();

    switch (fieldName) {
      case 'tenKhachHang':
        if (!value?.trim()) {
          this.fieldErrors['tenKhachHang'] = 'Họ tên là bắt buộc';
        } else if (value.trim().length < 2) {
          this.fieldErrors['tenKhachHang'] = 'Họ tên phải có ít nhất 2 ký tự';
        } else if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(value.trim())) {
          this.fieldErrors['tenKhachHang'] = 'Họ tên chỉ được chứa chữ cái và khoảng trắng';
        }
        break;

      case 'email':
        if (!value?.trim()) {
          this.fieldErrors['email'] = 'Email là bắt buộc';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          this.fieldErrors['email'] = 'Email không hợp lệ';
        }
        break;

      case 'soDienThoai':
        if (!value?.trim()) {
          this.fieldErrors['soDienThoai'] = 'Số điện thoại là bắt buộc';
        } else if (!/^[0-9]{10,11}$/.test(value.trim())) {
          this.fieldErrors['soDienThoai'] = 'Số điện thoại phải có 10-11 chữ số';
        }
        break;

      case 'maKhachHang':
        if (value?.trim() && !/^[A-Z0-9_-]*$/.test(value.trim())) {
          this.fieldErrors['maKhachHang'] =
            'Mã khách hàng chỉ được chứa chữ hoa, số, gạch ngang và gạch dưới';
        }
        break;
    }
  }

  // Address management methods
  openAddressManagement(khachHang: KhachHang): void {
    this.selectedKhachHang = khachHang;
    this.showAddressList = true;
    this.loadAddressList();
    this.cdr.detectChanges();
  }

  closeAddressManagement(): void {
    this.showAddressList = false;
    this.showAddressModal = false;
    this.selectedKhachHang = null;
    this.selectedAddress = null;
    this.addressList = [];
    this.resetAddressForm();
    this.cdr.detectChanges();
  }

  loadAddressList(): void {
    if (!this.selectedKhachHang?.id) return;

    this.diaChiKhachHangService
      .getDiaChiByKhachHangId(this.selectedKhachHang.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (addresses) => {
          this.addressList = addresses;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading addresses:', error);
          this.errorMessage = 'Có lỗi xảy ra khi tải danh sách địa chỉ';
          this.cdr.detectChanges();
        },
      });
  }

  // Load address list for customer (used in customer modal)
  loadAddressListForCustomer(khachHangId: number): void {
    this.diaChiKhachHangService
      .getDiaChiByKhachHangId(khachHangId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (addresses) => {
          this.addressList = addresses;
          // Reset to first address if index is out of bounds
          if (this.currentAddressIndex >= addresses.length) {
            this.currentAddressIndex = 0;
          }
          this.updateCurrentAddressMacDinh();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading addresses for customer:', error);
          this.addressList = [];
          this.currentAddressIndex = 0;
          this.updateCurrentAddressMacDinh();
          this.cdr.detectChanges();
        },
      });
  }

  openAddAddress(): void {
    this.isEditAddressMode = false;
    this.selectedAddress = null;
    this.resetAddressForm();
    this.showAddressModal = true;
    this.cdr.detectChanges();
  }

  openEditAddress(address: DiaChiKhachHang): void {
    this.isEditAddressMode = true;
    this.selectedAddress = address;
    this.addressForm = {
      tenNguoiNhan: address.tenNguoiNhan || '',
      soDienThoai: address.soDienThoai || '',
      diaChiChiTiet: address.diaChiChiTiet,
      tinhThanh: address.tinhThanh,
      quanHuyen: address.quanHuyen,
      phuongXa: address.phuongXa,
      macDinh: address.macDinh,
      trangThai: address.trangThai,
    };
    this.showAddressModal = true;
    this.cdr.detectChanges();
  }

  closeAddressModal(): void {
    this.showAddressModal = false;
    this.isEditAddressMode = false;
    this.selectedAddress = null;
    this.resetAddressForm();
    // Remove blur from customer modal if applied
    this.blurCustomerModal = false;
    this.cdr.detectChanges();
  }

  saveAddress(): void {
    console.log('Saving address...', {
      isEditMode: this.isEditMode,
      isEditAddressMode: this.isEditAddressMode,
      selectedKhachHang: this.selectedKhachHang,
      addressForm: this.addressForm,
    });

    if (!this.isAddressFormValid()) return;

    // Nếu đang thêm khách hàng mới (chưa có ID)
    if (!this.isEditMode && !this.selectedKhachHang?.id) {
      // Lưu địa chỉ vào danh sách tạm thời
      const newAddress = { ...this.addressForm };

      if (this.isEditAddressMode && this.selectedAddress) {
        // Cập nhật địa chỉ trong danh sách tạm thời
        const index = this.pendingAddresses.findIndex(
          (addr) =>
            addr.diaChiChiTiet === this.selectedAddress?.diaChiChiTiet &&
            addr.tinhThanh === this.selectedAddress?.tinhThanh &&
            addr.quanHuyen === this.selectedAddress?.quanHuyen &&
            addr.phuongXa === this.selectedAddress?.phuongXa
        );
        if (index !== -1) {
          this.pendingAddresses[index] = newAddress;
        }
      } else {
        // Thêm địa chỉ mới vào danh sách tạm thời
        this.pendingAddresses.push(newAddress);
      }

      // Cập nhật danh sách hiển thị
      this.updateAddressListFromPending();
      
      // Update current address index
      if (this.isEditAddressMode && this.selectedAddress) {
        const index = this.pendingAddresses.findIndex(
          (addr) =>
            addr.diaChiChiTiet === this.addressForm.diaChiChiTiet &&
            addr.tinhThanh === this.addressForm.tinhThanh &&
            addr.quanHuyen === this.addressForm.quanHuyen &&
            addr.phuongXa === this.addressForm.phuongXa
        );
        if (index !== -1) {
          this.currentAddressIndex = index;
        }
      } else {
        this.currentAddressIndex = this.pendingAddresses.length - 1;
      }
      this.updateCurrentAddressMacDinh();

      const successMessage = this.isEditAddressMode
        ? 'Cập nhật địa chỉ thành công!'
        : 'Thêm địa chỉ thành công!';
      alert(successMessage);
      this.closeAddressModal();
      this.cdr.detectChanges();
      return;
    }

    // Nếu đang edit khách hàng và thêm địa chỉ mới
    if (this.isEditMode && this.selectedKhachHang?.id && !this.isEditAddressMode) {
      // Thêm địa chỉ mới vào addressList để hiển thị ngay
      const newAddress: DiaChiKhachHang = {
        ...this.addressForm,
        id: Date.now(), // Temporary ID
        khachHangId: this.selectedKhachHang.id,
        ngayTao: new Date().toISOString(),
        ngayCapNhat: new Date().toISOString(),
      };

      this.addressList.push(newAddress);

      const successMessage = 'Thêm địa chỉ thành công!';
      alert(successMessage);
      this.closeAddressModal();
      this.cdr.detectChanges();
      return;
    }

    // Nếu khách hàng đã có ID (sửa khách hàng)
    if (!this.selectedKhachHang?.id) return;

    this.loading = true;
    const addressData: DiaChiKhachHang = {
      ...this.addressForm,
      khachHangId: this.selectedKhachHang.id,
    };

    const saveOperation =
      this.isEditAddressMode && this.selectedAddress?.id
        ? this.diaChiKhachHangService.updateDiaChi(this.selectedAddress.id, addressData)
        : this.diaChiKhachHangService.createDiaChi(addressData);

    saveOperation.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.loading = false;
        const successMessage = this.isEditAddressMode
          ? 'Cập nhật địa chỉ thành công!'
          : 'Thêm địa chỉ thành công!';
        alert(successMessage);
        this.closeAddressModal();

          // Update addressList immediately for edit mode
        if (this.isEditMode && this.selectedKhachHang?.id) {
          console.log('Updating addressList for edit mode...', {
            isEditAddressMode: this.isEditAddressMode,
            selectedAddress: this.selectedAddress,
            response: response,
          });

          if (this.isEditAddressMode && this.selectedAddress?.id) {
            // Update existing address in addressList
            const index = this.addressList.findIndex(
              (addr) => addr.id === this.selectedAddress?.id
            );
            console.log('Found address index:', index);
            if (index !== -1) {
              this.addressList[index] = { ...response, khachHangId: this.selectedKhachHang.id };
              console.log('Updated address in addressList:', this.addressList[index]);
              this.currentAddressIndex = index;
            }
          } else {
            // Add new address to addressList
            const newAddress = { ...response, khachHangId: this.selectedKhachHang.id };
            this.addressList.push(newAddress);
            console.log('Added new address to addressList:', newAddress);
            this.currentAddressIndex = this.addressList.length - 1;
          }
          this.updateCurrentAddressMacDinh();
        }
        
        // Update pending addresses for new customer
        if (!this.isEditMode && !this.selectedKhachHang?.id) {
          if (this.isEditAddressMode && this.selectedAddress) {
            // Update existing pending address
            const index = this.pendingAddresses.findIndex(
              (addr) =>
                addr.diaChiChiTiet === this.selectedAddress?.diaChiChiTiet &&
                addr.tinhThanh === this.selectedAddress?.tinhThanh &&
                addr.quanHuyen === this.selectedAddress?.quanHuyen &&
                addr.phuongXa === this.selectedAddress?.phuongXa
            );
            if (index !== -1) {
              this.pendingAddresses[index] = { ...this.addressForm };
              this.currentAddressIndex = index;
            }
          } else {
            // Add new pending address
            this.pendingAddresses.push({ ...this.addressForm });
            this.currentAddressIndex = this.pendingAddresses.length - 1;
          }
          this.updateAddressListFromPending();
          this.updateCurrentAddressMacDinh();
        }

        // Reload address list based on context
        if (this.showAddressList) {
          // If in address management modal, reload address list
          this.loadAddressList();
        } else if (this.selectedKhachHang?.id) {
          // If in customer modal (both edit and add mode), reload address list for customer
          this.loadAddressListForCustomer(this.selectedKhachHang.id);
        }

        // Also reload all addresses for table display
        this.loadAllAddresses();

        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loading = false;
        console.error('Error saving address:', error);
        this.errorMessage = this.isEditAddressMode
          ? 'Có lỗi xảy ra khi cập nhật địa chỉ'
          : 'Có lỗi xảy ra khi thêm địa chỉ';
        this.cdr.detectChanges();
      },
    });
  }

  deleteAddress(address: DiaChiKhachHang): void {
    // Nếu đang thêm khách hàng mới (chưa có ID)
    if (!this.isEditMode && !this.selectedKhachHang?.id) {
      // Xóa địa chỉ khỏi danh sách tạm thời
      const index = this.pendingAddresses.findIndex(
        (addr) =>
          addr.diaChiChiTiet === address.diaChiChiTiet &&
          addr.tinhThanh === address.tinhThanh &&
          addr.quanHuyen === address.quanHuyen &&
          addr.phuongXa === address.phuongXa
      );

      if (index !== -1) {
        this.pendingAddresses.splice(index, 1);
        this.updateAddressListFromPending();
        alert('Xóa địa chỉ thành công!');
        this.cdr.detectChanges();
      }
      return;
    }

    // Nếu khách hàng đã có ID
    if (!address.id || !this.selectedKhachHang?.id) return;

    const confirmed = confirm(`Bạn có chắc chắn muốn xóa địa chỉ "${formatDiaChiFull(address)}"?`);
    if (!confirmed) return;

    this.loading = true;
    this.diaChiKhachHangService
      .deleteDiaChi(address.id, this.selectedKhachHang.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading = false;
          alert('Xóa địa chỉ thành công!');

          // Update addressList immediately for edit mode
          if (this.isEditMode && this.selectedKhachHang?.id) {
            const index = this.addressList.findIndex((addr) => addr.id === address.id);
            if (index !== -1) {
              this.addressList.splice(index, 1);
            }
          }

          // Reload address list based on context
          if (this.showAddressList) {
            // If in address management modal, reload address list
            this.loadAddressList();
          } else if (this.selectedKhachHang?.id) {
            // If in customer modal (both edit and add mode), reload address list for customer
            this.loadAddressListForCustomer(this.selectedKhachHang.id);
          }

          // Also reload all addresses for table display
          this.loadAllAddresses();

          this.cdr.detectChanges();
        },
        error: (error) => {
          this.loading = false;
          console.error('Error deleting address:', error);
          this.errorMessage = 'Có lỗi xảy ra khi xóa địa chỉ';
          this.cdr.detectChanges();
        },
      });
  }

  setDefaultAddress(address: DiaChiKhachHang): void {
    if (!address.id || !this.selectedKhachHang?.id) return;

    this.loading = true;
    this.diaChiKhachHangService
      .setDiaChiMacDinh(address.id, this.selectedKhachHang.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading = false;
          alert('Đặt địa chỉ mặc định thành công!');

          // Reload address list based on context
          if (this.showAddressList) {
            // If in address management modal, reload address list
            this.loadAddressList();
          } else if (this.selectedKhachHang?.id) {
            // If in customer modal, reload address list for customer
            this.loadAddressListForCustomer(this.selectedKhachHang.id);
          }

          this.cdr.detectChanges();
        },
        error: (error) => {
          this.loading = false;
          console.error('Error setting default address:', error);
          this.errorMessage = 'Có lỗi xảy ra khi đặt địa chỉ mặc định';
          this.cdr.detectChanges();
        },
      });
  }

  resetAddressForm(): void {
    this.addressForm = {
      tenNguoiNhan: '',
      soDienThoai: '',
      diaChiChiTiet: '',
      tinhThanh: '',
      quanHuyen: '',
      phuongXa: '',
      macDinh: false,
      trangThai: true,
    };
    this.cdr.detectChanges();
  }

  // Cập nhật danh sách địa chỉ hiển thị từ danh sách tạm thời
  updateAddressListFromPending(): void {
    this.addressList = this.pendingAddresses.map((addr, index) => ({
      id: index + 1, // Temporary ID for display
      tenNguoiNhan: '', // Không cần tên người nhận
      soDienThoai: '', // Không cần số điện thoại
      diaChiChiTiet: addr.diaChiChiTiet,
      tinhThanh: addr.tinhThanh,
      quanHuyen: addr.quanHuyen,
      phuongXa: addr.phuongXa,
      macDinh: addr.macDinh,
      trangThai: addr.trangThai,
      khachHangId: 0, // Temporary
      ngayTao: new Date().toISOString(),
      ngayCapNhat: new Date().toISOString(),
    }));
    // Ensure current index is within bounds
    if (this.currentAddressIndex >= this.addressList.length) {
      this.currentAddressIndex = Math.max(0, this.addressList.length - 1);
    }
    this.updateCurrentAddressMacDinh();
    this.cdr.detectChanges();
  }

  // Lưu tất cả địa chỉ tạm thời sau khi tạo khách hàng thành công
  savePendingAddresses(khachHangId: number): void {
    if (this.pendingAddresses.length === 0) {
      // Không có địa chỉ tạm thời, đóng modal
      const successMessage = 'Thêm khách hàng thành công!';
      alert(successMessage);
      this.closeModal();
      this.refreshAfterSave();
      return;
    }

    // Lưu từng địa chỉ
    let completedCount = 0;
    const totalCount = this.pendingAddresses.length;

    this.pendingAddresses.forEach((addressData, index) => {
      const addressToSave: DiaChiKhachHang = {
        ...addressData,
        khachHangId: khachHangId,
      };

      this.diaChiKhachHangService
        .createDiaChi(addressToSave)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            completedCount++;
            if (completedCount === totalCount) {
              // Tất cả địa chỉ đã được lưu
              const successMessage = `Thêm khách hàng thành công! (${totalCount}/${totalCount} địa chỉ được lưu)`;
              alert(successMessage);
              this.closeModal();
              this.refreshAfterSave();
            }
          },
          error: (error) => {
            console.error('Error saving address:', error);
            completedCount++;
            if (completedCount === totalCount) {
              // Vẫn đóng modal dù có lỗi
              const successMessage = `Thêm khách hàng thành công! (${
                totalCount - 1
              }/${totalCount} địa chỉ được lưu)`;
              alert(successMessage);
              this.closeModal();
              this.refreshAfterSave();
            }
          },
        });
    });
  }

  // Tạo địa chỉ mặc định từ trường diaChi
  createDefaultAddressFromDiaChi(khachHangId: number, diaChi: string): void {
    // Parse địa chỉ từ trường diaChi (format: "số nhà, phường/xã, quận/huyện, tỉnh/thành")
    const addressParts = diaChi.split(',').map((part) => part.trim());

    let diaChiChiTiet = '';
    let phuongXa = '';
    let quanHuyen = '';
    let tinhThanh = '';

    if (addressParts.length >= 1) diaChiChiTiet = addressParts[0];
    if (addressParts.length >= 2) phuongXa = addressParts[1];
    if (addressParts.length >= 3) quanHuyen = addressParts[2];
    if (addressParts.length >= 4) tinhThanh = addressParts[3];

    const defaultAddress: DiaChiKhachHang = {
      khachHangId: khachHangId,
      diaChiChiTiet: diaChiChiTiet,
      phuongXa: phuongXa,
      quanHuyen: quanHuyen,
      tinhThanh: tinhThanh,
      macDinh: true, // Đặt làm địa chỉ mặc định
      trangThai: true,
    };

    this.diaChiKhachHangService
      .createDiaChi(defaultAddress)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Default address created successfully:', response);

          // Kiểm tra nếu cũng có pendingAddresses
          if (this.pendingAddresses.length > 0) {
            // Có cả địa chỉ mặc định và địa chỉ chi tiết
            this.savePendingAddressesWithDefault(khachHangId, 1); // 1 địa chỉ mặc định đã được lưu
          } else {
            // Chỉ có địa chỉ mặc định
            const successMessage = 'Thêm khách hàng thành công! (1/1 địa chỉ được lưu)';
            alert(successMessage);
            this.closeModal();
            this.refreshAfterSave();
          }
        },
        error: (error) => {
          console.error('Error creating default address:', error);

          // Kiểm tra nếu cũng có pendingAddresses
          if (this.pendingAddresses.length > 0) {
            // Có địa chỉ chi tiết, lưu chúng (địa chỉ mặc định lỗi)
            this.savePendingAddressesWithDefault(khachHangId, 0); // 0 địa chỉ mặc định được lưu
          } else {
            // Không có địa chỉ nào được lưu
            const successMessage = 'Thêm khách hàng thành công! (0/1 địa chỉ được lưu)';
            alert(successMessage);
            this.closeModal();
            this.refreshAfterSave();
          }
        },
      });
  }

  // Lưu địa chỉ tạm thời khi đã có địa chỉ mặc định
  savePendingAddressesWithDefault(khachHangId: number, defaultAddressCount: number): void {
    if (this.pendingAddresses.length === 0) {
      // Không có địa chỉ tạm thời, đóng modal
      const totalAddresses = defaultAddressCount;
      const successMessage = `Thêm khách hàng thành công! (${defaultAddressCount}/${totalAddresses} địa chỉ được lưu)`;
      alert(successMessage);
      this.closeModal();
      this.refreshAfterSave();
      return;
    }

    // Lưu từng địa chỉ
    let completedCount = 0;
    const totalCount = this.pendingAddresses.length;
    const totalAddresses = defaultAddressCount + totalCount;

    this.pendingAddresses.forEach((addressData, index) => {
      const addressToSave: DiaChiKhachHang = {
        ...addressData,
        khachHangId: khachHangId,
      };

      this.diaChiKhachHangService
        .createDiaChi(addressToSave)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            completedCount++;
            if (completedCount === totalCount) {
              // Tất cả địa chỉ đã được lưu
              const successMessage = `Thêm khách hàng thành công! (${
                defaultAddressCount + totalCount
              }/${totalAddresses} địa chỉ được lưu)`;
              alert(successMessage);
              this.closeModal();
              this.refreshAfterSave();
            }
          },
          error: (error) => {
            console.error('Error saving address:', error);
            completedCount++;
            if (completedCount === totalCount) {
              // Vẫn đóng modal dù có lỗi
              const successMessage = `Thêm khách hàng thành công! (${
                defaultAddressCount + totalCount - 1
              }/${totalAddresses} địa chỉ được lưu)`;
              alert(successMessage);
              this.closeModal();
              this.refreshAfterSave();
            }
          },
        });
    });
  }

  private isAddressFormValid(): boolean {
    return !!(
      this.addressForm.diaChiChiTiet?.trim() &&
      this.addressForm.tinhThanh?.trim() &&
      this.addressForm.quanHuyen?.trim() &&
      this.addressForm.phuongXa?.trim()
    );
  }

  // Utility functions for template
  getTrangThaiDiaChiText(trangThai: boolean | undefined): string {
    return getTrangThaiDiaChiText(trangThai);
  }

  getMacDinhText(macDinh: boolean | undefined): string {
    return getMacDinhText(macDinh);
  }

  formatDiaChiFull(diaChi: DiaChiKhachHang): string {
    return formatDiaChiFull(diaChi);
  }

  // View modal methods

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedKhachHang = null;
    this.cdr.detectChanges();
  }

  editFromView(): void {
    if (this.selectedKhachHang) {
      this.closeViewModal();
      this.openEdit(this.selectedKhachHang);
      this.cdr.detectChanges();
    }
  }

  closeAllModals(): void {
    this.showModal = false;
    this.showViewModal = false;
    this.showAddressList = false;
    this.showAddressModal = false;
    this.selectedKhachHang = null;
    this.cdr.detectChanges();
  }

  // Force refresh data immediately
  forceRefreshData(): void {
    console.log('Force refreshing data...');
    this.currentPage = 0;
    this.searchTerm = '';
    this.selectedStatus = '';

    // Clear all data
    this.khachHangList = [];
    this.filteredList = [];
    this.paginatedList = [];

    // Reload from API
    this.loadKhachHangList();

    // If API fails, load sample data
    setTimeout(() => {
      if (this.khachHangList.length === 0 && !this.loading) {
        console.log('API failed, loading sample data...');
        this.loadSampleData();
      }
    }, 1000);
  }

  // Address management methods for new customer form
  openAddressModalForNewCustomer(): void {
    this.showAddressModal = true;
    this.isEditAddressMode = false;
    this.resetAddressForm();
    this.cdr.detectChanges();
  }

  editPendingAddress(index: number): void {
    if (index >= 0 && index < this.pendingAddresses.length) {
      const address = this.pendingAddresses[index];
      this.selectedAddress = {
        ...address,
        khachHangId: 0, // Temporary ID for pending addresses
      };
      this.addressForm = {
        tenNguoiNhan: address.tenNguoiNhan || '',
        soDienThoai: address.soDienThoai || '',
        diaChiChiTiet: address.diaChiChiTiet || '',
        tinhThanh: address.tinhThanh || '',
        quanHuyen: address.quanHuyen || '',
        phuongXa: address.phuongXa || '',
        macDinh: address.macDinh || false,
        trangThai: address.trangThai || true,
      };
      this.isEditAddressMode = true;
      this.showAddressModal = true;
      this.cdr.detectChanges();
    }
  }

  deletePendingAddress(index: number): void {
    if (index >= 0 && index < this.pendingAddresses.length) {
      this.pendingAddresses.splice(index, 1);
      this.updateAddressListFromPending();
      // Adjust current index if needed
      if (this.currentAddressIndex >= this.pendingAddresses.length && this.currentAddressIndex > 0) {
        this.currentAddressIndex = this.pendingAddresses.length - 1;
      }
      this.updateCurrentAddressMacDinh();
      this.cdr.detectChanges();
    }
  }

  // Get total address count for display
  getTotalAddressCount(): number {
    if (this.isEditMode) {
      return this.addressList.length;
    } else {
      return this.pendingAddresses.length;
    }
  }

  // Open address modal for both edit and add modes
  openAddressModal(): void {
    console.log('Opening address modal...', {
      isEditMode: this.isEditMode,
      selectedKhachHang: this.selectedKhachHang,
      showAddressModal: this.showAddressModal,
    });

    // If customer modal is open, blur it (keep visible)
    if (this.showModal) {
      this.blurCustomerModal = true;
    }

    this.showAddressModal = true;
    this.isEditAddressMode = false;
    this.resetAddressForm();
    this.cdr.detectChanges();
    console.log('Address modal opened:', this.showAddressModal);
  }

  // Edit existing address (for edit mode)
  editAddress(address: DiaChiKhachHang): void {
    console.log('Editing address:', address);
    this.selectedAddress = address;
    this.addressForm = {
      tenNguoiNhan: address.tenNguoiNhan || '',
      soDienThoai: address.soDienThoai || '',
      diaChiChiTiet: address.diaChiChiTiet || '',
      tinhThanh: address.tinhThanh || '',
      quanHuyen: address.quanHuyen || '',
      phuongXa: address.phuongXa || '',
      macDinh: address.macDinh || false,
      trangThai: address.trangThai || true,
    };
    this.isEditAddressMode = true;
    this.showAddressModal = true;
    console.log('Address form set:', this.addressForm);
    this.cdr.detectChanges();
  }

  // Format full address for display
  getFullAddress(address: any): string {
    const parts = [];
    if (address.diaChiChiTiet) parts.push(address.diaChiChiTiet);
    if (address.phuongXa) parts.push(address.phuongXa);
    if (address.quanHuyen) parts.push(address.quanHuyen);
    if (address.tinhThanh) parts.push(address.tinhThanh);

    return parts.length > 0 ? parts.join(', ') : 'Không có thông tin địa chỉ';
  }

  // Get customer's primary address for table display
  getCustomerAddress(khachHang?: KhachHang | null): string {
    if (!khachHang) return 'Không có địa chỉ';
    // Ưu tiên địa chỉ từ backend (địa chỉ mặc định)
    if (khachHang.coDiaChiMacDinh && khachHang.diaChiMacDinh) {
      const parts = [];
      if (khachHang.diaChiMacDinh) parts.push(khachHang.diaChiMacDinh);
      if (khachHang.phuongXaMacDinh) parts.push(khachHang.phuongXaMacDinh);
      if (khachHang.quanHuyenMacDinh) parts.push(khachHang.quanHuyenMacDinh);
      if (khachHang.tinhThanhMacDinh) parts.push(khachHang.tinhThanhMacDinh);

      return parts.length > 0 ? parts.join(' / ') : 'Chưa có địa chỉ chi tiết';
    }

    // Fallback: Check if we have addresses loaded for this customer (legacy support)
    const customerAddresses = this.allAddresses.filter((addr) => addr.khachHangId === khachHang.id);
    if (customerAddresses.length > 0) {
      const defaultAddress = customerAddresses.find((addr) => addr.macDinh) || customerAddresses[0];
      const parts = [];
      if (defaultAddress.diaChiChiTiet) parts.push(defaultAddress.diaChiChiTiet);
      if (defaultAddress.phuongXa) parts.push(defaultAddress.phuongXa);
      if (defaultAddress.quanHuyen) parts.push(defaultAddress.quanHuyen);
      if (defaultAddress.tinhThanh) parts.push(defaultAddress.tinhThanh);

      return parts.length > 0 ? parts.join(' / ') : 'Chưa có địa chỉ chi tiết';
    }

    // Final fallback to old diaChi field
    if (khachHang.diaChi) {
      const addressParts = khachHang.diaChi.split(',').map((part) => part.trim());
      if (addressParts.length > 1) {
        return addressParts.join(' / ');
      }
      return khachHang.diaChi;
    }

    return 'Không có địa chỉ';
  }

  // Load all addresses for table display
  loadAllAddresses(): void {
    this.diaChiKhachHangService
      .getAllDiaChi()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (addresses: DiaChiKhachHang[]) => {
          this.allAddresses = addresses;
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          console.error('Error loading all addresses:', error);
          this.allAddresses = [];
        },
      });
  }

  // New UI methods for address navigation and management
  getCurrentAddress(): DiaChiKhachHang | DiaChiKhachHangFormData | null {
    const addresses = this.isEditMode ? this.addressList : this.pendingAddresses;
    if (addresses.length > 0 && this.currentAddressIndex >= 0 && this.currentAddressIndex < addresses.length) {
      return addresses[this.currentAddressIndex];
    }
    return null;
  }

  previousAddress(): void {
    if (this.currentAddressIndex > 0) {
      this.currentAddressIndex--;
      this.updateCurrentAddressMacDinh();
    }
    this.cdr.detectChanges();
  }

  nextAddress(): void {
    const totalCount = this.getTotalAddressCount();
    if (this.currentAddressIndex < totalCount - 1) {
      this.currentAddressIndex++;
      this.updateCurrentAddressMacDinh();
    }
    this.cdr.detectChanges();
  }

  editCurrentAddress(): void {
    const currentAddress = this.getCurrentAddress();
    if (currentAddress) {
      if (this.isEditMode && 'id' in currentAddress) {
        this.editAddress(currentAddress as DiaChiKhachHang);
      } else {
        this.editPendingAddress(this.currentAddressIndex);
      }
    }
  }

  deleteCurrentAddress(): void {
    const currentAddress = this.getCurrentAddress();
    if (currentAddress) {
      if (this.isEditMode && 'id' in currentAddress) {
        this.deleteAddress(currentAddress as DiaChiKhachHang);
      } else {
        this.deletePendingAddress(this.currentAddressIndex);
      }
      // Adjust index if needed
      const totalCount = this.getTotalAddressCount();
      if (this.currentAddressIndex >= totalCount && this.currentAddressIndex > 0) {
        this.currentAddressIndex = totalCount - 1;
      }
      this.updateCurrentAddressMacDinh();
    }
    this.cdr.detectChanges();
  }

  toggleCurrentAddressDefault(): void {
    const currentAddress = this.getCurrentAddress();
    if (currentAddress) {
      // If setting as default, unset all others
      if (this.currentAddressMacDinh) {
        if (this.isEditMode) {
          this.addressList.forEach((addr, index) => {
            if (index !== this.currentAddressIndex) {
              addr.macDinh = false;
            }
          });
          currentAddress.macDinh = true;
        } else {
          this.pendingAddresses.forEach((addr, index) => {
            if (index !== this.currentAddressIndex) {
              addr.macDinh = false;
            }
          });
          (currentAddress as DiaChiKhachHangFormData).macDinh = true;
        }
      } else {
        if (this.isEditMode) {
          (currentAddress as DiaChiKhachHang).macDinh = false;
        } else {
          (currentAddress as DiaChiKhachHangFormData).macDinh = false;
        }
      }
    }
    this.cdr.detectChanges();
  }

  updateCurrentAddressMacDinh(): void {
    const currentAddress = this.getCurrentAddress();
    this.currentAddressMacDinh = currentAddress?.macDinh || false;
    this.cdr.detectChanges();
  }

  onDateBlur(): void {
    // Parse dd/mm/yyyy format to yyyy-mm-dd
    if (this.formattedNgaySinh) {
      const parts = this.formattedNgaySinh.split('/');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        this.form.ngaySinh = `${year}-${month}-${day}`;
      }
    }
    this.cdr.detectChanges();
  }
}
