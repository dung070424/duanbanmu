import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PhieuGiamGiaService } from '../../services/phieu-giam-gia.service';
import { PhieuGiamGiaResponse, PhieuGiamGiaRequest } from '../../interfaces/phieu-giam-gia.interface';

interface Voucher {
  id: number;
  code: string;
  name: string;
  type: 'cash' | 'percentage';
  value: number;
  minOrder: number;
  quantity: number;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'inactive' | 'expired';
  isActive: boolean;
  description?: string;
}

// Interface để map từ API response
interface PhieuGiamGiaFromAPI {
  id: number;
  maPhieu: string;
  tenPhieu: string;
  moTa?: string;
  ngayBatDau: string;
  ngayKetThuc: string;
  giaTriGiam: number;
  giaTriToiThieu: number;
  soLuong: number;
  loaiGiamGia: 'PHAN_TRAM' | 'TIEN_MAT';
  trangThai: boolean;
  trangThaiText: string;
  loaiGiamGiaText: string;
}

@Component({
  selector: 'app-voucher-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './voucher-form.html',
  styleUrl: './voucher-form.scss'
})
export class VoucherForm implements OnInit {
  private phieuGiamGiaService = inject(PhieuGiamGiaService);
  
  // View management
  currentView: 'list' | 'add' = 'list';
  
  // Filter properties
  searchTerm: string = '';
  selectedVoucherType: string = '';
  selectedStatus: string = '';
  startDate: string = '';
  endDate: string = '';
  startDateDisplay: string = '';
  endDateDisplay: string = '';
  minValue: number = 0;
  maxValue: number = 5000000;

  // Data
  vouchers: Voucher[] = [];
  loading: boolean = false;
  error: string = '';

  filteredVouchers: Voucher[] = [];
  
  // Add voucher form
  voucherForm = {
    code: '',
    name: '',
    type: 'cash' as 'cash' | 'percentage',
    typeDisplay: 'Tiền mặt',
    maxDiscount: 0,
    minOrder: 0,
    quantity: 0,
    startDate: '',
    endDate: '',
    description: '',
    isPrivate: true
  };

  // Validation
  codeError: string = '';

  // Customer selection
  searchCustomer: string = '';
  selectedCustomers: any[] = [];
  
      customers: any[] = [
        {
          id: 1,
          code: 'KH00002',
          name: 'Đình Thế Mạnh',
          gender: 'Nữ',
          birthDate: new Date('1998-09-12'),
          totalPurchases: 19,
          lastPurchase: new Date('2025-08-28')
        },
        {
          id: 2,
          code: 'KH00003',
          name: 'Trịnh Châu Anh',
          gender: 'Nam',
          birthDate: new Date('1986-04-17'),
          totalPurchases: 2,
          lastPurchase: new Date('2025-03-09')
        },
        {
          id: 3,
          code: 'KH00004',
          name: 'Nguyễn Hoàng...',
          gender: 'Nữ',
          birthDate: new Date('2000-08-06'),
          totalPurchases: 13,
          lastPurchase: new Date('2025-08-02')
        },
        {
          id: 4,
          code: 'KH00005',
          name: 'Nguyễn Minh ...',
          gender: 'Nam',
          birthDate: new Date('2001-12-19'),
          totalPurchases: 2,
          lastPurchase: new Date('2025-03-09')
        },
        {
          id: 5,
          code: 'KH00006',
          name: 'Nguyễn Hải Lo...',
          gender: 'Nữ',
          birthDate: new Date('1994-10-20'),
          totalPurchases: 1,
          lastPurchase: new Date('2025-03-09')
        },
        {
          id: 6,
          code: 'KH00007',
          name: 'Bùi Thu Anh',
          gender: 'Nam',
          birthDate: new Date('2004-11-30'),
          totalPurchases: 2,
          lastPurchase: new Date('2025-03-09')
        }
      ];

  filteredCustomers: any[] = [];

  ngOnInit() {
    this.loadVouchers();
    this.filteredCustomers = [...this.customers];
    this.generateVoucherCode();
  }

  // Load vouchers from API
  loadVouchers() {
    this.loading = true;
    this.error = '';
    
    console.log('Loading vouchers from API...');
    
    this.phieuGiamGiaService.getAllActivePhieuGiamGia().subscribe({
      next: (response: any) => {
        console.log('API Response:', response);
        this.vouchers = this.mapApiResponseToVouchers(response.data || []);
        console.log('Mapped vouchers:', this.vouchers);
        this.filteredVouchers = [...this.vouchers];
        this.loading = false;
        console.log('Vouchers loaded successfully. Count:', this.vouchers.length);
      },
      error: (error: any) => {
        console.error('Error loading vouchers:', error);
        this.error = 'Không thể tải danh sách phiếu giảm giá: ' + (error.message || 'Lỗi không xác định');
        this.loading = false;
      }
    });
  }

  // Map API response to Voucher interface
  mapApiResponseToVouchers(apiData: PhieuGiamGiaResponse[]): Voucher[] {
    console.log('Mapping API data:', apiData);
    
    const mappedVouchers = apiData.map(item => {
      console.log('Mapping item:', item);
      
      const voucher: Voucher = {
        id: item.id,
        code: item.maPhieu,
        name: item.tenPhieuGiamGia,
        type: item.loaiPhieuGiamGia ? 'cash' : 'percentage',
        value: item.giaTriGiam,
        minOrder: item.giaTriToiThieu,
        quantity: item.soLuongDung,
        startDate: new Date(item.ngayBatDau),
        endDate: new Date(item.ngayKetThuc),
        status: this.determineStatus(item.ngayBatDau, item.ngayKetThuc, item.trangThai),
        isActive: item.trangThai,
        description: ''
      };
      
      console.log('Mapped voucher:', voucher);
      return voucher;
    });
    
    console.log('All mapped vouchers:', mappedVouchers);
    return mappedVouchers;
  }

  // Determine voucher status based on dates and active status
  determineStatus(startDate: string, endDate: string, isActive: boolean): 'active' | 'inactive' | 'expired' {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (!isActive) {
      return 'inactive';
    }

    if (now < start) {
      return 'inactive';
    } else if (now > end) {
      return 'expired';
    } else {
      return 'active';
    }
  }

  onSearchChange() {
    this.applyFilters();
  }

  onValueRangeChange() {
    this.applyFilters();
  }

  applyFilters() {
    this.filteredVouchers = this.vouchers.filter(voucher => {
      // Search term filter
      if (this.searchTerm && !voucher.code.toLowerCase().includes(this.searchTerm.toLowerCase()) &&
          !voucher.name.toLowerCase().includes(this.searchTerm.toLowerCase())) {
        return false;
      }

      // Voucher type filter
      if (this.selectedVoucherType && voucher.type !== this.selectedVoucherType) {
        return false;
      }

      // Status filter
      if (this.selectedStatus && voucher.status !== this.selectedStatus) {
        return false;
      }

      // Date range filter
      if (this.startDate && voucher.startDate < new Date(this.startDate)) {
        return false;
      }
      if (this.endDate && voucher.endDate > new Date(this.endDate)) {
        return false;
      }

      // Value range filter
      if (voucher.value < this.minValue || voucher.value > this.maxValue) {
        return false;
      }

      return true;
    });
  }

  resetFilters() {
    this.searchTerm = '';
    this.selectedVoucherType = '';
    this.selectedStatus = '';
    this.startDate = '';
    this.endDate = '';
    this.minValue = 0;
    this.maxValue = 5000000;
    this.filteredVouchers = [...this.vouchers];
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(value);
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'active': return 'Đang diễn ra';
      case 'inactive': return 'Chưa bắt đầu';
      case 'expired': return 'Đã kết thúc';
      default: return status;
    }
  }

  toggleVoucherStatus(voucher: Voucher) {
    // Tạo một object PhieuGiamGiaResponse từ Voucher để gọi API
    const phieuData = {
      id: voucher.id,
      maPhieu: voucher.code,
      tenPhieuGiamGia: voucher.name || '',
      loaiPhieuGiamGia: voucher.type === 'cash',
      loaiPhieuGiamGiaText: voucher.type === 'cash' ? 'Tiền mặt' : 'Phần trăm',
      giaTriGiam: voucher.value,
      giaTriToiThieu: voucher.minOrder,
      soTienToiDa: 1000000, // Giá trị mặc định
      hoaDonToiThieu: voucher.minOrder,
      soLuongDung: voucher.quantity,
      ngayBatDau: voucher.startDate instanceof Date ? voucher.startDate.toISOString().split('T')[0] : voucher.startDate,
      ngayKetThuc: voucher.endDate instanceof Date ? voucher.endDate.toISOString().split('T')[0] : voucher.endDate,
      trangThai: voucher.isActive,
      trangThaiText: voucher.isActive ? 'Đang diễn ra' : 'Không hoạt động',
      isActive: voucher.isActive,
      isExpired: false,
      isNotStarted: false
    };
    
    this.phieuGiamGiaService.togglePhieuGiamGiaStatus(phieuData).subscribe({
      next: (response: any) => {
        // Update local data
        voucher.isActive = response.data?.trangThai || !voucher.isActive;
        voucher.status = voucher.isActive ? 'active' : 'inactive';
        console.log('Voucher status updated:', response);
      },
      error: (error: any) => {
        console.error('Error toggling voucher status:', error);
        // Revert the change
        voucher.isActive = !voucher.isActive;
        voucher.status = voucher.isActive ? 'active' : 'inactive';
        alert('Không thể cập nhật trạng thái phiếu giảm giá');
      }
    });
  }

  viewVoucherDetail(voucher: Voucher) {
    console.log('Viewing voucher detail:', voucher);
    // TODO: Implement voucher detail view
  }

  generateVoucherCode() {
    const randomString = Math.random().toString(36).substring(2, 10).toUpperCase();
    this.voucherForm.code = `PGG_${randomString}`;
    this.validateVoucherCode();
  }

  validateVoucherCode() {
    this.codeError = '';
    
    if (!this.voucherForm.code.trim()) {
      this.codeError = 'Mã phiếu không được để trống';
      return false;
    }
    
    if (this.voucherForm.code.length < 3) {
      this.codeError = 'Mã phiếu phải có ít nhất 3 ký tự';
      return false;
    }
    
    // Check for duplicate codes in current list
    const isDuplicate = this.vouchers.some(voucher => 
      voucher.code.toLowerCase() === this.voucherForm.code.toLowerCase()
    );
    
    if (isDuplicate) {
      this.codeError = 'Mã phiếu đã tồn tại';
      return false;
    }
    
    return true;
  }

  onCodeChange() {
    this.validateVoucherCode();
  }

  openAddModal() {
    this.currentView = 'add';
    this.generateVoucherCode();
  }

  goBackToList() {
    this.currentView = 'list';
    this.resetVoucherForm();
  }

  resetVoucherForm() {
    this.voucherForm = {
      code: '',
      name: '',
      type: 'cash',
      typeDisplay: 'Tiền mặt',
      maxDiscount: 0,
      minOrder: 0,
      quantity: 0,
      startDate: '',
      endDate: '',
      description: '',
      isPrivate: true
    };
    this.selectedCustomers = [];
    this.searchCustomer = '';
    this.filteredCustomers = [...this.customers];
  }

  onCustomerSearch() {
    if (!this.searchCustomer.trim()) {
      this.filteredCustomers = [...this.customers];
      return;
    }

    this.filteredCustomers = this.customers.filter(customer =>
      customer.code.toLowerCase().includes(this.searchCustomer.toLowerCase()) ||
      customer.name.toLowerCase().includes(this.searchCustomer.toLowerCase())
    );
  }

  showAllCustomers() {
    this.searchCustomer = '';
    this.filteredCustomers = [...this.customers];
  }

  selectCustomer(customer: any) {
    if (!this.isCustomerSelected(customer)) {
      this.selectedCustomers.push(customer);
    }
  }

  removeCustomer(customer: any) {
    this.selectedCustomers = this.selectedCustomers.filter(c => c.id !== customer.id);
  }

  isCustomerSelected(customer: any): boolean {
    return this.selectedCustomers.some(c => c.id === customer.id);
  }

  saveVoucher() {
    if (!this.validateVoucherCode()) {
      return;
    }
    
    // Convert form data to API request format
    const request: PhieuGiamGiaRequest = {
      maPhieu: this.voucherForm.code,
      tenPhieuGiamGia: this.voucherForm.name,
      loaiPhieuGiamGia: this.voucherForm.type === 'cash',
      giaTriGiam: this.voucherForm.maxDiscount,
      giaTriToiThieu: this.voucherForm.minOrder,
      soTienToiDa: this.voucherForm.maxDiscount,
      hoaDonToiThieu: this.voucherForm.minOrder,
      soLuongDung: this.voucherForm.quantity,
      ngayBatDau: this.voucherForm.startDate,
      ngayKetThuc: this.voucherForm.endDate,
      trangThai: true
    };

    this.phieuGiamGiaService.createPhieuGiamGia(request).subscribe({
      next: (response: any) => {
        console.log('Voucher created successfully:', response);
        alert('Tạo phiếu giảm giá thành công!');
        this.goBackToList();
        this.loadVouchers(); // Reload the list
      },
      error: (error: any) => {
        console.error('Error creating voucher:', error);
        alert('Không thể tạo phiếu giảm giá: ' + (error.message || 'Lỗi không xác định'));
      }
    });
  }

  editVoucher(voucher: Voucher) {
    console.log('Editing voucher:', voucher);
    // TODO: Implement edit voucher functionality
  }

  exportExcel() {
    console.log('Exporting vouchers to Excel');
    // TODO: Implement Excel export
  }

  // Refresh data from API
  refreshData() {
    this.loadVouchers();
  }

  // Create sample data
  createSampleData() {
    this.phieuGiamGiaService.createSampleData().subscribe({
      next: (response: any) => {
        console.log('Sample data created:', response);
        alert(response.message || 'Sample data created successfully');
        this.loadVouchers(); // Reload the list
      },
      error: (error: any) => {
        console.error('Error creating sample data:', error);
        alert('Không thể tạo dữ liệu mẫu: ' + (error.message || 'Lỗi không xác định'));
      }
    });
  }

  // Test API connection
  testApiConnection() {
    console.log('Testing API connection...');
    this.phieuGiamGiaService.testApi().subscribe({
      next: (response: any) => {
        console.log('API Test Response:', response);
        alert('API kết nối thành công: ' + (response.message || 'Success'));
      },
      error: (error: any) => {
        console.error('API Test Error:', error);
        alert('API kết nối thất bại: ' + (error.message || 'Lỗi không xác định'));
      }
    });
  }
}
