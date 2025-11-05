import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HoaDonDTO, HoaDonFilter, HoaDonChiTietDTO } from '../../interfaces/hoa-don.interface';
import { HoaDonService } from '../../services/hoa-don.service';
import { InvoiceValidationService, FieldValidation } from '../../services/invoice-validation.service';
import { CustomerService } from '../../services/customer.service';
import { Customer, CustomerCreateRequest } from '../../interfaces/customer.interface';
import { CustomerAddressService } from '../../services/customer-address.service';
import { CustomerAddress, CustomerAddressCreateRequest } from '../../interfaces/customer-address.interface';
import { VietnamAddressService, Province, District, Ward } from '../../services/vietnam-address.service';
import { EmployeeService } from '../../services/employee.service';
import { Employee } from '../../interfaces/employee.interface';
import { ChiTietSanPhamApiService, ChiTietSanPhamResponse } from '../../services/chi-tiet-san-pham-api.service';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { map, tap } from 'rxjs/operators';

@Component({
  selector: 'app-invoice-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invoice-management.component.html',
  styleUrls: ['./invoice-management.component.scss'],
})
export class InvoiceManagementComponent implements OnInit, OnDestroy {
  invoices: HoaDonDTO[] = [];
  filteredInvoices: HoaDonDTO[] = [];
  paginatedInvoices: HoaDonDTO[] = [];

  // Math object for templatee
  Math = Math;

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 5;
  totalItems: number = 0;

  // Sorting - Không có sort mặc định, để hiển thị data theo thứ tự tự nhiên (mới nhất ở cuối)
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Filter
  searchTerm: string = '';
  selectedStatus: string = 'all';
  selectedPaymentStatus: string = 'all';
  selectedPaymentMethod: string = 'all';
  startDate: string = '';
  endDate: string = '';

  // Modal states
  showEditModal: boolean = false;
  showViewModal: boolean = false;
  showProductModal: boolean = false;
  loadingProducts: boolean = false;
  loadingInvoices: boolean = false;

  // Form data
  newInvoice: Partial<HoaDonDTO> = {
    maHoaDon: '',
    tenKhachHang: '',
    soDienThoaiKhachHang: '',
    emailKhachHang: '',
    nhanVienId: 1,
    tenNhanVien: 'Nguyễn Văn A',
    tongTien: 0,
    tienGiamGia: 0,
    thanhTien: 0,
    ghiChu: '',
    trangThai: 'CHO_XAC_NHAN',
    phuongThucThanhToan: 'cash',
    viTriBanHang: 'Tại quầy',
    danhSachSanPham: [],
    // Địa chỉ khách hàng
    tinhThanh: '',
    quanHuyen: '',
    phuongXa: '',
    diaChiChiTiet: '',
  };

  selectedInvoice: HoaDonDTO | null = null;
  editingInvoice: HoaDonDTO | null = null;

  // Additional properties for detail modal
  invoiceDetail: any = null;
  loadingDetail: boolean = false;
  isEditMode: boolean = false;
  editingInvoiceDetail: any = null;

  // Product selection properties
  availableProducts: any[] = [];
  selectedProducts: any[] = [];
  discountPercentage: number = 0;

  // Employee management
  employees: Employee[] = [];
  loadingEmployees = false;
  selectedEmployee: Employee | null = null;

  // Vietnam Address Management
  provinces: Province[] = [];
  districts: District[] = [];
  wards: Ward[] = [];
  loadingProvinces = false;
  loadingDistricts = false;
  loadingWards = false;
  selectedProvince: Province | null = null;
  selectedDistrict: District | null = null;
  selectedWard: Ward | null = null;

  // Customer Address Management
  showCustomerAddressModal = false;
  showAddAddressModal = false;
  customerAddresses: CustomerAddress[] = [];
  selectedCustomerAddress: CustomerAddress | null = null;
  loadingCustomerAddresses = false;
  newCustomerAddress: CustomerAddressCreateRequest = {
    khachHangId: 0,
    tenNguoiNhan: '',
    soDienThoai: '',
    diaChi: '',
    tinhThanh: '',
    quanHuyen: '',
    phuongXa: '',
    maTinh: '',
    maQuan: '',
    maXa: '',
    macDinh: false,
    trangThai: true
  };

  // Customer data cache
  customerCache: { [key: number]: string } = {};

  // Validation properties
  fieldValidations: { [key: string]: FieldValidation } = {};
  formErrors: string[] = [];
  isFormValid: boolean = true;
  showValidationErrors: boolean = false;
  
  // Customer validation properties
  customerValidationMessage: string = '';
  customerValidationValid: boolean = true;

  // Search debounce
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  // Status options
  statusOptions = [
    { value: 'all', label: 'Tất cả' },
    { value: 'CHO_XAC_NHAN', label: 'Chờ xác nhận' },
    { value: 'DA_XAC_NHAN', label: 'Đã xác nhận' },
    { value: 'DANG_GIAO_HANG', label: 'Đang giao hàng' },
    { value: 'DA_GIAO_HANG', label: 'Đã giao hàng' },
    { value: 'HUY', label: 'Hủy' },
  ];

  paymentStatusOptions = [
    { value: 'all', label: 'Tất cả' },
    { value: 'pending', label: 'Chờ thanh toán' },
    { value: 'paid', label: 'Đã thanh toán' },
    { value: 'cancelled', label: 'Đã hủy' },
    
  ];

  paymentMethodOptions = [
    { value: 'all', label: 'Tất cả' },
    { value: 'cash', label: 'Tiền mặt' },
    { value: 'transfer', label: 'Chuyển khoản' },
  ];

  constructor(
    private hoaDonService: HoaDonService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private validationService: InvoiceValidationService,
    private customerService: CustomerService,
    private customerAddressService: CustomerAddressService,
    private vietnamAddressService: VietnamAddressService,
    private employeeService: EmployeeService,
    private chiTietSanPhamService: ChiTietSanPhamApiService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.setupAutoSearch();
    this.loadHoaDon();
    this.loadEmployees(); // Load employees when component initializes
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupAutoSearch(): void {
    this.searchSubject
      .pipe(
        debounceTime(150), // Giảm thời gian debounce để phản hồi nhanh hơn
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((searchTerm) => {
        this.searchTerm = searchTerm;
        this.currentPage = 1;
        this.loadHoaDon();
      });
  }

  loadHoaDon(): void {
    this.loadingInvoices = true;

    // Build filter parameters
    const filterParams: any = {
      page: this.currentPage - 1, // Backend uses 0-based pagination
      size: this.itemsPerPage,
    };

    // Add search term if provided - tìm kiếm theo số hóa đơn và tên khách hàng
    if (this.searchTerm && this.searchTerm.trim()) {
      const trimmedSearchTerm = this.searchTerm.trim();
      // Kiểm tra nếu là số hóa đơn (bắt đầu bằng HD, INV, hoặc MA)
      if (trimmedSearchTerm.toUpperCase().startsWith('HD') || 
          trimmedSearchTerm.toUpperCase().startsWith('INV') || 
          trimmedSearchTerm.toUpperCase().startsWith('MA')) {
        filterParams.maHoaDon = trimmedSearchTerm;
      } else {
        // Tìm kiếm theo tên khách hàng, số điện thoại, hoặc email
        filterParams.keyword = trimmedSearchTerm;
      }
    }

    // Add status filter if not 'all'
    if (this.selectedStatus && this.selectedStatus !== 'all') {
      filterParams.trangThai = this.selectedStatus;
    }

    // Add payment status filter if not 'all'
    if (this.selectedPaymentStatus && this.selectedPaymentStatus !== 'all') {
      filterParams.trangThaiThanhToan = this.selectedPaymentStatus;
    }

    // Add payment method filter if not 'all'
    if (this.selectedPaymentMethod && this.selectedPaymentMethod !== 'all') {
      filterParams.phuongThucThanhToan = this.selectedPaymentMethod;
    }

    // Add date range filter if provided
    if (this.startDate) {
      filterParams.ngayBatDau = this.startDate;
    }
    if (this.endDate) {
      filterParams.ngayKetThuc = this.endDate;
    }

    // Add sorting - chỉ gửi sort parameters nếu người dùng đã click sort
    // Không gửi sort mặc định để data hiển thị theo thứ tự tự nhiên (mới nhất ở cuối)
    if (this.sortColumn && this.sortColumn.trim() !== '') {
      filterParams.sortBy = this.sortColumn;
      filterParams.sortDirection = this.sortDirection;
    }
    // Nếu không có sort, không gửi sortBy và sortDirection để backend không sort

    console.log('Filter params:', filterParams);

    this.hoaDonService.getAllHoaDon(filterParams).subscribe({
      next: (response: any) => {
        console.log('API Response:', response);
        // Handle different response structures
        if (response.content) {
          this.paginatedInvoices = response.content;
          this.totalItems = response.totalElements || 0;
        } else if (response.hoaDonList) {
          this.paginatedInvoices = response.hoaDonList;
          this.totalItems = response.totalItems || 0;
        } else if (Array.isArray(response)) {
          this.paginatedInvoices = response;
          this.totalItems = response.length;
        } else {
          this.paginatedInvoices = [];
          this.totalItems = 0;
        }
        this.filteredInvoices = this.paginatedInvoices;

        // Apply additional frontend filtering if needed
        this.applyFrontendFilters();

        // Load customer names for invoices that have khachHangId but no tenKhachHang
        this.loadCustomerNames();

        this.loadingInvoices = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading invoices:', error);
        this.loadingInvoices = false;
        // Fallback to sample data if API fails
      }
    });
  }

  /**
   * Apply frontend filtering to ensure correct display
   */
  private applyFrontendFilters(): void {
    let filtered = [...this.paginatedInvoices];

    // Apply search term filter - tìm kiếm ngay lập tức
    if (this.searchTerm && this.searchTerm.trim()) {
      const searchTerm = this.searchTerm.trim().toLowerCase();
      filtered = filtered.filter(invoice => {
        // Search in invoice number
        if (invoice.maHoaDon && invoice.maHoaDon.toLowerCase().includes(searchTerm)) {
          return true;
        }
        // Search in customer name
        if (invoice.tenKhachHang && invoice.tenKhachHang.toLowerCase().includes(searchTerm)) {
          return true;
        }
        // Search in phone number
        if (invoice.soDienThoaiKhachHang && invoice.soDienThoaiKhachHang.includes(searchTerm)) {
          return true;
        }
        // Search in email
        if (invoice.emailKhachHang && invoice.emailKhachHang.toLowerCase().includes(searchTerm)) {
          return true;
        }
        return false;
      });
    }

    // Apply status filter if backend didn't handle it properly
    if (this.selectedStatus && this.selectedStatus !== 'all') {
      filtered = filtered.filter(invoice => invoice.trangThai === this.selectedStatus);
    }

    // Derive payment status from order status for display/filtering
    const derivePaymentStatus = (orderStatus: string): 'pending' | 'paid' | 'cancelled' => {
      if (orderStatus === 'DA_GIAO_HANG') return 'paid';
      if (orderStatus === 'HUY') return 'cancelled';
      return 'pending';
    };

    // Apply payment status filter based on derived status
    if (this.selectedPaymentStatus && this.selectedPaymentStatus !== 'all') {
      filtered = filtered.filter(invoice => derivePaymentStatus(invoice.trangThai) === this.selectedPaymentStatus);
    }

    // Apply payment method filter if backend didn't handle it properly
    if (this.selectedPaymentMethod && this.selectedPaymentMethod !== 'all') {
      filtered = filtered.filter(invoice => {
        const invoiceMethod = invoice.phuongThucThanhToan || 'cash'; // Default to 'cash' if null
        return invoiceMethod === this.selectedPaymentMethod;
      });
    }

    this.filteredInvoices = filtered;
  }

  // Employee management methods
  loadEmployees(): void {
    console.log('🔄 Starting to load employees...');
    this.loadingEmployees = true;
    this.employeeService.getEmployeesForInvoice().subscribe({
      next: (employees) => {
        console.log('✅ Successfully loaded employees:', employees);
        this.employees = employees;
        this.loadingEmployees = false;
        this.cdr.detectChanges();
        
        if (employees.length === 0) {
          console.log('⚠️ No employees found');
          this.showToast('Không có nhân viên nào trong hệ thống', 'warning');
        } else {
          console.log(`✅ Loaded ${employees.length} active employees successfully`);
          console.log('Active employees:', employees.map(emp => `${emp.maNhanVien} - ${emp.tenNhanVien}`));
        }
      },
      error: (error) => {
        console.error('❌ Error loading employees:', error);
        this.loadingEmployees = false;
        this.showToast('Không thể tải danh sách nhân viên', 'error');
        this.cdr.detectChanges();
      }
    });
  }

  onEmployeeChange(employeeId: number): void {
    const employee = this.employees.find(emp => emp.id === employeeId);
    if (employee) {
      this.selectedEmployee = employee;
      this.newInvoice.nhanVienId = employee.id;
      this.newInvoice.tenNhanVien = employee.tenNhanVien;
      
      // Clear validation error for employee field
      this.clearFieldValidation('nhanVienId');
      this.updateFormValidity();
      this.cdr.detectChanges();
    }
  }

  getEmployeeDisplayName(employee: Employee): string {
    if (employee.maNhanVien && employee.tenNhanVien) {
      return `${employee.maNhanVien} - ${employee.tenNhanVien}`;
    }
    return employee.tenNhanVien || 'Nhân viên không tên';
  }

  /**
   * Refresh danh sách nhân viên
   */
  refreshEmployees(): void {
    console.log('Refreshing active employee list...');
    this.loadEmployees();
  }

  /**
   * Kiểm tra xem có nhân viên nào không
   */
  hasEmployees(): boolean {
    return this.employees && this.employees.length > 0;
  }

  loadSampleData(): void {
    // Fallback sample data if API fails
    this.paginatedInvoices = [
      {
        id: 1,
        maHoaDon: 'INV-2024-001',
        khachHangId: 1,
        tenKhachHang: 'Nguyễn Văn An',
        soDienThoaiKhachHang: '0123456789',
        emailKhachHang: 'an.nguyen@email.com',
        nhanVienId: 1,
        tenNhanVien: 'Nguyễn Văn A',
        tongTien: 3135000,
        tienGiamGia: 150000,
        thanhTien: 2985000,
        phuongThucThanhToan: 'cash',
        trangThai: 'DA_GIAO_HANG',
        ghiChu: 'Giao hàng tận nơi',
        ngayTao: '2024-01-15T10:00:00',
        ngayThanhToan: '2024-01-15T10:30:00',
        soLuongSanPham: 1,
        viTriBanHang: 'Tại quầy',
        danhSachSanPham: [],
      },
      {
        id: 2,
        maHoaDon: 'INV-2024-002',
        khachHangId: 2,
        tenKhachHang: 'Lê Thị Bình',
        soDienThoaiKhachHang: '0987654321',
        emailKhachHang: 'binh.le@email.com',
        nhanVienId: 1,
        tenNhanVien: 'Nguyễn Văn A',
        tongTien: 2500000,
        tienGiamGia: 0,
        thanhTien: 2500000,
        phuongThucThanhToan: 'transfer',
        trangThai: 'CHO_XAC_NHAN',
        ghiChu: 'Thanh toán chuyển khoản',
        ngayTao: '2024-01-15T14:00:00',
        ngayThanhToan: undefined,
        soLuongSanPham: 2,
        viTriBanHang: 'Online',
        danhSachSanPham: [],
      },
    ];

    this.filteredInvoices = this.paginatedInvoices;
    this.totalItems = 2;
    this.cdr.detectChanges();
  }

  // Methods for template compatibility
  onSearchInput(event: any): void {
    const value = event.target.value;
    // Cập nhật searchTerm ngay lập tức để UI phản hồi
    this.searchTerm = value;
    // Áp dụng filter ngay lập tức cho dữ liệu hiện tại
    this.applyFrontendFilters();
    // Gửi đến searchSubject để xử lý debounced search với backend
    this.searchSubject.next(value);
  }

  onSearchTermChange(): void {
    // Xử lý khi người dùng thay đổi search term
    this.currentPage = 1;
    this.loadHoaDon();
  }

  clearSearch(): void {
    this.searchTerm = '';
    // Áp dụng filter ngay lập tức
    this.applyFrontendFilters();
    // Gửi đến searchSubject
    this.searchSubject.next('');
  }

  clearStatusFilter(): void {
    this.selectedStatus = 'all';
    this.currentPage = 1;
    // Áp dụng filter ngay lập tức
    this.applyFrontendFilters();
    // Gọi API để lấy dữ liệu mới
    this.loadHoaDon();
  }

  clearPaymentStatusFilter(): void {
    this.selectedPaymentStatus = 'all';
    this.currentPage = 1;
    // Áp dụng filter ngay lập tức
    this.applyFrontendFilters();
    // Gọi API để lấy dữ liệu mới
    this.loadHoaDon();
  }

  clearPaymentMethodFilter(): void {
    this.selectedPaymentMethod = 'all';
    this.currentPage = 1;
    // Áp dụng filter ngay lập tức
    this.applyFrontendFilters();
    // Gọi API để lấy dữ liệu mới
    this.loadHoaDon();
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.loadHoaDon();
  }

  onStatusChange(): void {
    this.currentPage = 1;
    // Áp dụng filter ngay lập tức
    this.applyFrontendFilters();
    // Gọi API để lấy dữ liệu mới
    this.loadHoaDon();
  }

  onPaymentStatusChange(): void {
    this.currentPage = 1;
    // Áp dụng filter ngay lập tức
    this.applyFrontendFilters();
    // Gọi API để lấy dữ liệu mới
    this.loadHoaDon();
  }

  onDateFilterChange(): void {
    this.currentPage = 1;
    // Áp dụng filter ngay lập tức
    this.applyFrontendFilters();
    // Gọi API để lấy dữ liệu mới
    this.loadHoaDon();
  }

  clearDateFilter(): void {
    this.startDate = '';
    this.endDate = '';
    this.currentPage = 1;
    // Áp dụng filter ngay lập tức
    this.applyFrontendFilters();
    // Gọi API để lấy dữ liệu mới
    this.loadHoaDon();
  }

  onPaymentMethodChange(): void {
    this.currentPage = 1;
    // Áp dụng filter ngay lập tức
    this.applyFrontendFilters();
    // Gọi API để lấy dữ liệu mới
    this.loadHoaDon();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= Math.ceil(this.totalItems / this.itemsPerPage)) {
      this.currentPage = page;
      this.loadHoaDon();
    }
  }

  onItemsPerPageChange(event: any): void {
    this.itemsPerPage = parseInt(event.target.value);
    this.currentPage = 1;
    this.loadHoaDon();
  }

  sort(column: string): void {
    // Map frontend column names to backend field names
    const columnMapping: { [key: string]: string } = {
      invoiceNumber: 'maHoaDon',
      customerName: 'tenKhachHang',
      totalAmount: 'tongTien',
      status: 'trangThai',
      paymentStatus: 'ngayThanhToan',
      paymentMethod: 'viTriBanHang',
      createdAt: 'ngayTao',
    };

    const backendColumn = columnMapping[column] || column;

    if (this.sortColumn === backendColumn) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = backendColumn;
      this.sortDirection = 'asc';
    }
    this.currentPage = 1;
    this.loadHoaDon();
  }

  // Modal methods

  openEditModal(invoice: HoaDonDTO): void {
    this.selectedInvoice = invoice;
    this.editingInvoice = { ...invoice };
    this.showEditModal = true;
    this.clearAllValidations();
    
    // Đồng bộ selectedProducts từ editingInvoice.danhSachSanPham
    if (this.editingInvoice && this.editingInvoice.danhSachSanPham) {
      this.selectedProducts = this.editingInvoice.danhSachSanPham.map((product: any) => ({
        id: product.chiTietSanPhamId || product.id, // Ưu tiên chiTietSanPhamId
        chiTietSanPhamId: product.chiTietSanPhamId || product.id,
        sanPhamId: product.sanPhamId || product.id,
        maSanPham: product.maSanPham || `SP${(product.id || 0).toString().padStart(3, '0')}`,
        tenSanPham: product.tenSanPham || 'Chưa có tên',
        giaBan: product.donGia || product.giaBan || 0,
        donGia: product.donGia || product.giaBan || 0,
        soLuong: product.soLuong || 1,
        soLuongTon: product.soLuongTon || 0,
        thanhTien: product.thanhTien || (product.donGia || 0) * (product.soLuong || 1),
        trangThai: product.trangThai !== undefined ? product.trangThai : true,
        // Thông tin chi tiết
        kichThuoc: product.kichThuoc || '',
        mauSac: product.mauSac || '',
        anhSanPham: product.anhSanPham || '',
      }));
      this.calculateTotal();
    } else {
      this.selectedProducts = [];
    }
  }

  openViewModal(invoice: HoaDonDTO): void {
    // Validate invoice ID before navigation
    if (!invoice || invoice.id === undefined || invoice.id === null) {
      console.error('❌ Invalid invoice data:', invoice);
      alert('Không thể xem chi tiết hóa đơn: thiếu thông tin ID');
      return;
    }

    // Đảm bảo ID là số
    const invoiceId = Number(invoice.id);
    if (isNaN(invoiceId) || invoiceId <= 0) {
      console.error('❌ Invalid invoice ID:', invoice.id);
      alert('Mã hóa đơn không hợp lệ');
      return;
    }

    console.log('🔍 [openViewModal] Invoice data:', invoice);
    console.log('🔍 [openViewModal] Parsed invoiceId:', invoiceId);
    console.log('🔍 [openViewModal] Current route:', this.router.url);
    console.log('🔍 [openViewModal] Navigating to:', `/invoices/${invoiceId}`);
    
    // Navigate to detail view instead of opening modal
    // Sử dụng navigateByUrl để đảm bảo route chính xác
    this.router.navigateByUrl(`/invoices/${invoiceId}`).then(
      (success) => {
        console.log('✅ [openViewModal] Navigation successful:', success);
      },
      (error) => {
        console.error('❌ [openViewModal] Navigation error:', error);
        console.error('❌ [openViewModal] Error details:', JSON.stringify(error, null, 2));
        alert('Không thể mở chi tiết hóa đơn. Vui lòng đăng nhập lại hoặc liên hệ quản trị viên!');
      }
    );
  }


  closeModals(): void {
    this.showEditModal = false;
    this.showViewModal = false;
    this.showProductModal = false;
    this.showCustomerAddressModal = false;
    this.showAddAddressModal = false;
    
    // Reset form data
    this.resetNewInvoiceForm();
    this.clearAllValidations();
    
    // Reset selected items
    this.selectedInvoice = null;
    this.editingInvoice = null;
    this.invoiceDetail = null;
    this.isEditMode = false;
    this.editingInvoiceDetail = null;
    this.selectedCustomerAddress = null;
    
    // Force change detection
    this.cdr.detectChanges();
    
    // Remove any backdrop
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.remove();
    }
    
    // Remove modal-open class from body
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }

  // Additional methods for detail modal
  loadInvoiceDetail(id: number): void {
    this.loadingDetail = true;
    this.hoaDonService.getHoaDonDetail(id).subscribe({
      next: (detail) => {
        this.invoiceDetail = detail;
        this.loadingDetail = false;
      },
      error: (error) => {
        console.error('Error loading invoice detail:', error);
        this.loadingDetail = false;
      },
    });
  }

  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      CHO_XAC_NHAN: 'Chờ xác nhận',
      DA_XAC_NHAN: 'Đã xác nhận',
      DANG_GIAO_HANG: 'Đang giao hàng',
      DA_GIAO_HANG: 'Đã giao hàng',
      HUY: 'Hủy',
    };
    return statusMap[status] || status;
  }

  printInvoice(): void {
    window.print();
  }

  closeDetailModal(): void {
    this.closeModals();
  }

  // Status and display methods
  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      CHO_XAC_NHAN: 'badge-warning',
      DA_XAC_NHAN: 'badge-primary',
      DANG_GIAO_HANG: 'badge-info',
      DA_GIAO_HANG: 'badge-success',
      HUY: 'badge-danger',
    };
    return statusClasses[status] || 'badge-secondary';
  }

  getStatusLabel(status: string): string {
    const option = this.statusOptions.find((opt) => opt.value === status);
    return option ? option.label : status;
  }

  getPaymentStatusClass(paymentStatus: string): string {
    const statusClasses: { [key: string]: string } = {
      pending: 'badge-warning',
      paid: 'badge-success',
      cancelled: 'badge-danger',
    };
    return statusClasses[paymentStatus] || 'badge-secondary';
  }

  getPaymentStatusLabel(paymentStatus: string): string {
    const option = this.paymentStatusOptions.find((opt) => opt.value === paymentStatus);
    return option ? option.label : paymentStatus;
  }

  // Helper for templates: get derived payment status from invoice
  getInvoicePaymentStatus(invoice: HoaDonDTO): 'pending' | 'paid' | 'cancelled' {
    if (!invoice || !invoice.trangThai) return 'pending';
    if (invoice.trangThai === 'DA_GIAO_HANG') return 'paid';
    if (invoice.trangThai === 'HUY') return 'cancelled';
    return 'pending';
  }

  getPaymentMethodLabel(method?: string | null): string {
    if (!method) return 'Tiền mặt';
    
    // Map từ backend format về hiển thị
    const methodLower = method.toLowerCase().trim();
    
    if (methodLower === 'cash' || methodLower === 'tiền mặt' || methodLower === 'tiền mặt') {
      return 'Tiền mặt';
    } else if (methodLower === 'transfer' || methodLower === 'chuyển khoản' || methodLower === 'chuyen khoan') {
      return 'Chuyển khoản';
    }
    
    // Trả về giá trị gốc nếu không match
    return method;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('vi-VN').format(new Date(date));
  }

  formatDateTimeForAPI(dateTime: string): string | undefined {
    if (!dateTime) return undefined;
    // Chuyển đổi từ datetime-local format sang ISO string
    const date = new Date(dateTime);
    return date.toISOString();
  }

  // CRUD Operations
  async saveInvoice(): Promise<void> {
    // Kiểm tra validation trước khi lưu
    if (!this.validateForm()) {
      return;
    }

    // Bắt đầu loading state
    this.loadingInvoices = true;

    try {
      // Tự động tạo hoặc tìm khách hàng
      console.log('🔄 Starting customer creation/finding process...');
      const customer = await this.createOrFindCustomer().toPromise();
      
      console.log('📋 Customer result from service:', customer);
      
      if (customer) {
        console.log('✅ Customer found/created successfully:', customer);
        this.newInvoice.khachHangId = customer.id;
        this.newInvoice.tenKhachHang = customer.tenKhachHang;
        console.log('📝 Updated newInvoice with customer info:', {
          khachHangId: this.newInvoice.khachHangId,
          tenKhachHang: this.newInvoice.tenKhachHang
        });
      } else {
        console.error('❌ No customer returned from service');
        this.loadingInvoices = false;
        this.showToast('Không thể tạo hoặc tìm khách hàng', 'error');
        return;
      }

      if (this.newInvoice.maHoaDon && this.newInvoice.tenKhachHang) {
        // Kiểm tra có sản phẩm đã chọn không
        if (!this.selectedProducts || this.selectedProducts.length === 0) {
          console.error('❌ No products selected for invoice');
          this.loadingInvoices = false;
          this.showToast('Vui lòng chọn ít nhất một sản phẩm', 'error');
          return;
        }

        // Chuyển đổi selectedProducts thành danhSachChiTiet (format backend yêu cầu)
        const danhSachChiTiet: HoaDonChiTietDTO[] = this.selectedProducts.map((product) => {
          const chiTietSanPhamId = product.chiTietSanPhamId || product.id;
          const soLuong = product.soLuong || 1;
          const donGia = product.giaBan || product.donGia || 0;
          const giamGia = product.giamGia || 0;
          const thanhTien = (donGia * soLuong) - giamGia;

          return {
            chiTietSanPhamId: chiTietSanPhamId,
            soLuong: soLuong,
            donGia: donGia,
            giamGia: giamGia,
            thanhTien: thanhTien,
            tenSanPham: product.tenSanPham,
            maSanPham: product.maSanPham,
            mauSac: product.mauSac,
            kichThuoc: product.kichThuoc
          };
        });

        // Prepare invoice data for backend
        const invoiceData = {
          ...this.newInvoice,
          ngayTao: new Date().toISOString(),
          danhSachChiTiet: danhSachChiTiet, // Dùng danhSachChiTiet thay vì danhSachSanPham
          // Tính lại tổng tiền và số lượng
          soLuongSanPham: danhSachChiTiet.reduce((sum, item) => sum + item.soLuong, 0),
          tongTien: danhSachChiTiet.reduce((sum, item) => sum + (item.donGia * item.soLuong), 0),
          thanhTien: danhSachChiTiet.reduce((sum, item) => sum + item.thanhTien, 0),
        };

        console.log('📝 Preparing invoice data for database:', invoiceData);
        console.log('📦 danhSachChiTiet:', danhSachChiTiet);

        // Validation: Kiểm tra dữ liệu trước khi gửi
        if (!invoiceData.maHoaDon || !invoiceData.tenKhachHang || !invoiceData.khachHangId) {
          console.error('❌ Missing required invoice data:', {
            maHoaDon: invoiceData.maHoaDon,
            tenKhachHang: invoiceData.tenKhachHang,
            khachHangId: invoiceData.khachHangId
          });
          this.loadingInvoices = false;
          this.showToast('Thiếu thông tin bắt buộc để tạo hóa đơn', 'error');
          return;
        }

        if (!invoiceData.danhSachChiTiet || invoiceData.danhSachChiTiet.length === 0) {
          console.error('❌ No products selected for invoice');
          this.loadingInvoices = false;
          this.showToast('Vui lòng chọn ít nhất một sản phẩm', 'error');
          return;
        }

        this.hoaDonService.createHoaDon(invoiceData).subscribe({
          next: (result) => {
            console.log('✅ Invoice created successfully:', result);
            
            // Reload danh sách từ server
            this.loadHoaDon();
            
            // Reset form
            this.resetNewInvoiceForm();
            
            // Đóng modal
            this.closeModals();

            // Show success message
            this.showToast('Tạo hóa đơn thành công!', 'success');
            
            // Kết thúc loading state
            this.loadingInvoices = false;
            
            // Refresh danh sách để đảm bảo đồng bộ với database
            this.loadHoaDon();
          },
          error: (error) => {
            console.error('❌ Error creating invoice:', error);
            this.loadingInvoices = false;
            this.showToast('Có lỗi xảy ra khi tạo hóa đơn', 'error');
          },
        });
      } else {
        this.loadingInvoices = false;
        this.showToast('Vui lòng điền đầy đủ thông tin bắt buộc!', 'warning');
      }
    } catch (error) {
      console.error('Lỗi khi xử lý hóa đơn:', error);
      this.loadingInvoices = false;
      this.showToast('Có lỗi xảy ra khi tạo khách hàng', 'error');
    }
  }

  updateInvoice(): void {
    if (!this.validateForm() || !this.editingInvoice || !this.editingInvoice.id) {
      return;
    }

    this.loadingInvoices = true;
    
      // Chuẩn hóa dữ liệu trước khi gửi
      const invoiceData: any = {
        ...this.editingInvoice,
        tongTien: this.editingInvoice.tongTien ? Number(this.editingInvoice.tongTien) : 0,
        tienGiamGia: this.editingInvoice.tienGiamGia ? Number(this.editingInvoice.tienGiamGia) : 0,
        thanhTien: this.editingInvoice.thanhTien ? Number(this.editingInvoice.thanhTien) : 0,
        nhanVienId: this.editingInvoice.nhanVienId
          ? Number(this.editingInvoice.nhanVienId)
          : undefined,
        khachHangId: this.editingInvoice.khachHangId
          ? Number(this.editingInvoice.khachHangId)
          : undefined,
        // Chuẩn hóa định dạng ngày tháng
        ngayThanhToan: this.editingInvoice.ngayThanhToan
          ? this.formatDateTimeForAPI(this.editingInvoice.ngayThanhToan)
          : undefined,
        ngayTao: this.editingInvoice.ngayTao
          ? this.formatDateTimeForAPI(this.editingInvoice.ngayTao)
          : undefined,
        // Remove danhSachSanPham nếu có (frontend format)
        danhSachSanPham: undefined
      };
      
      // Map danhSachSanPham (frontend) sang danhSachChiTiet (backend) cho update
      if (this.editingInvoice.danhSachSanPham && Array.isArray(this.editingInvoice.danhSachSanPham)) {
        invoiceData.danhSachChiTiet = this.editingInvoice.danhSachSanPham.map((product: any) => ({
          chiTietSanPhamId: product.chiTietSanPhamId || product.id, // Ưu tiên chiTietSanPhamId
          soLuong: product.soLuong || 1,
          donGia: product.donGia ? (typeof product.donGia === 'number' ? product.donGia : parseFloat(String(product.donGia))) : 0,
          giamGia: product.giamGia ? (typeof product.giamGia === 'number' ? product.giamGia : parseFloat(String(product.giamGia))) : 0,
          thanhTien: product.thanhTien ? (typeof product.thanhTien === 'number' ? product.thanhTien : parseFloat(String(product.thanhTien))) : (product.donGia || 0) * (product.soLuong || 1)
        }));
        console.log('✅ Mapped danhSachChiTiet for update:', invoiceData.danhSachChiTiet);
      } else if (this.selectedProducts && Array.isArray(this.selectedProducts) && this.selectedProducts.length > 0) {
        // Fallback: nếu không có danhSachSanPham nhưng có selectedProducts
        invoiceData.danhSachChiTiet = this.selectedProducts.map((product: any) => ({
          chiTietSanPhamId: product.chiTietSanPhamId || product.id,
          soLuong: product.soLuong || 1,
          donGia: product.donGia ? (typeof product.donGia === 'number' ? product.donGia : parseFloat(String(product.donGia))) : 0,
          giamGia: product.giamGia ? (typeof product.giamGia === 'number' ? product.giamGia : parseFloat(String(product.giamGia))) : 0,
          thanhTien: product.thanhTien ? (typeof product.thanhTien === 'number' ? product.thanhTien : parseFloat(String(product.thanhTien))) : (product.donGia || 0) * (product.soLuong || 1)
        }));
        console.log('✅ Mapped danhSachChiTiet from selectedProducts for update:', invoiceData.danhSachChiTiet);
      }

      this.hoaDonService.updateHoaDonNew(this.editingInvoice.id, invoiceData).subscribe({
        next: (result: any) => {
          this.closeModals();
        
        // Cập nhật hóa đơn trong danh sách và di chuyển lên đầu
        this.updateInvoiceInList(result);
        
        this.clearAllValidations();
          this.showToast('Cập nhật hóa đơn thành công!', 'success');
        this.cdr.detectChanges();
        },
        error: (error: any) => {
          console.error('Error updating invoice:', error);
        this.formErrors.push('Có lỗi xảy ra khi cập nhật hóa đơn. Vui lòng thử lại.');
        this.showToast('Có lỗi xảy ra khi cập nhật hóa đơn', 'error');
          this.cdr.detectChanges();
          },
        complete: () => {
          this.loadingInvoices = false;
        }
        });
  }

  // Additional utility methods
  generateInvoiceNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `HD${year}${month}${day}${random}`;
  }

  initializeNewInvoice(): void {
    this.newInvoice = {
      maHoaDon: this.generateInvoiceNumber(),
      tenKhachHang: '',
      soDienThoaiKhachHang: '',
      emailKhachHang: '',
      nhanVienId: 1,
      tenNhanVien: 'Nguyễn Văn A',
      tongTien: 0,
      tienGiamGia: 0,
      thanhTien: 0,
      ghiChu: '',
      trangThai: 'CHO_XAC_NHAN',
      phuongThucThanhToan: 'cash',
      viTriBanHang: 'Tại quầy',
      danhSachSanPham: [],
      // Địa chỉ khách hàng
      tinhThanh: '',
      quanHuyen: '',
      phuongXa: '',
      diaChiChiTiet: '',
    };
    this.selectedProducts = [];
    this.discountPercentage = 0;
  }

  // Product selection methods
  openProductModal(): void {
    this.showProductModal = true;
    this.loadProducts();
    
    // Đồng bộ selectedProductIds với selectedProducts hiện tại
    // Kiểm tra xem có đang ở edit mode không để đồng bộ đúng
    this.selectedProductIds.clear();
    if (this.showEditModal && this.editingInvoice && this.editingInvoice.danhSachSanPham) {
      // Đang ở edit mode - đồng bộ từ editingInvoice.danhSachSanPham
      this.editingInvoice.danhSachSanPham.forEach((product: any) => {
        const productId = product.chiTietSanPhamId || product.id;
        if (productId) {
          this.selectedProductIds.add(productId);
        }
      });
    } else {
      // Đang ở create mode - đồng bộ từ selectedProducts
      this.selectedProducts.forEach(product => {
        if (product.id) {
          this.selectedProductIds.add(product.id);
        }
      });
    }
    
    this.cdr.detectChanges(); // Force change detection
  }

  closeProductModal(): void {
    this.showProductModal = false;
    // Không xóa selectedProductIds để giữ trạng thái checkbox
    // selectedProductIds sẽ được đồng bộ với selectedProducts
  }

  loadProducts(): void {
    this.loadingProducts = true;

    // Load ChiTietSanPham thay vì SanPham để có chiTietSanPhamId đúng
    this.chiTietSanPhamService.getAll().subscribe({
      next: (chiTietProducts: ChiTietSanPhamResponse[]) => {
        // Map ChiTietSanPhamResponse to match frontend expected format
        this.availableProducts = chiTietProducts.map((product: ChiTietSanPhamResponse) => ({
          id: product.id, // Đây là chiTietSanPhamId - ID chính xác cần dùng
          chiTietSanPhamId: product.id, // Đảm bảo có chiTietSanPhamId
          sanPhamId: product.sanPhamId, // ID của SanPham gốc
          maSanPham: `SP${product.sanPhamId?.toString().padStart(3, '0') || '000'}`,
          tenSanPham: product.sanPhamTen || 'Chưa có tên',
          giaBan: parseFloat(product.giaBan || '0'),
          donGia: parseFloat(product.giaBan || '0'), // Map giaBan to donGia for compatibility
          soLuongTon: parseInt(product.soLuongTon || '0', 10),
          trangThai: product.trangThai,
          // Thông tin chi tiết
          kichThuoc: product.kichThuocTen || '',
          mauSac: product.mauSacTen || '',
          mauSacMa: product.mauSacMa || '',
          trongLuong: product.trongLuongTen || '',
          // Thông tin sản phẩm gốc (sẽ load thêm nếu cần)
          danhMuc: '',
          thuongHieu: '',
          chatLieu: '',
          xuatXu: '',
          kieuDang: '',
          congNgheAnToan: '',
          anhSanPham: '',
        }));
        console.log('✅ Loaded ChiTietSanPham products:', this.availableProducts);
        this.loadingProducts = false;
        this.cdr.detectChanges(); // Force change detection
      },
      error: (error: any) => {
        console.error('Error loading ChiTietSanPham, falling back to SanPham:', error);
        // Fallback to SanPham if ChiTietSanPham fails
        this.hoaDonService.getProducts().subscribe({
          next: (products) => {
            this.availableProducts = products.map((product: any) => ({
              id: product.id,
              chiTietSanPhamId: product.id, // Tạm thời dùng SanPham ID
              sanPhamId: product.id,
              maSanPham: product.maSanPham,
              tenSanPham: product.tenSanPham,
              giaBan: product.giaBan,
              donGia: product.giaBan,
              soLuongTon: product.soLuongTon || 0,
              trangThai: product.trangThai,
              danhMuc: product.loaiMuBaoHiemTen,
              thuongHieu: product.nhaSanXuatTen,
              chatLieu: product.chatLieuVoTen,
              trongLuong: product.trongLuongTen,
              xuatXu: product.xuatXuTen,
              kieuDang: product.kieuDangMuTen,
              congNgheAnToan: product.congNgheAnToanTen,
              mauSac: product.mauSacTen,
              anhSanPham: product.anhSanPham,
            }));
            this.loadingProducts = false;
            this.cdr.detectChanges();
          },
          error: (fallbackError) => {
            console.error('Error loading SanPham fallback:', fallbackError);
            this.loadingProducts = false;
            this.availableProducts = [];
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  updateProductQuantity(product: any, quantity: number): void {
    const selectedProduct = this.selectedProducts.find((p) => p.id === product.id);
    if (selectedProduct) {
      // Sử dụng validation nghiêm ngặt
      const quantityValidation = this.validationService.validateProductQuantityStrict(quantity, selectedProduct.soLuongTon);
      
      // Store validation result for this specific product
      const fieldKey = `soLuong_${selectedProduct.id}`;
      
      if (!quantityValidation.isValid) {
        this.fieldValidations[fieldKey] = {
          field: fieldKey,
          isValid: false,
          errorMessage: quantityValidation.errorMessage
        };
        this.showValidationErrors = true;
        this.updateFormValidity();
        this.cdr.detectChanges();
        return;
      }
      
      // Đảm bảo số lượng là số nguyên dương và không vượt quá tồn kho
      const validQuantity = Math.max(1, Math.floor(quantity || 1));
      const adjustedQuantity = this.validationService.adjustQuantityToMaxStock(validQuantity, selectedProduct.soLuongTon);
      
      selectedProduct.soLuong = adjustedQuantity;

      // Tính lại tổng tiền
      this.calculateTotal();
      
      // Clear validation error for this product
      delete this.fieldValidations[fieldKey];
      this.updateFormValidity();
      this.cdr.detectChanges();
    }
  }

  onQuantityInputChange(product: any, event: any): void {
    const quantity = parseInt(event.target.value) || 1;
    
    // Kiểm tra và điều chỉnh số lượng ngay lập tức
    const adjustedQuantity = this.validationService.adjustQuantityToMaxStock(quantity, product.soLuongTon);
    
    // Nếu số lượng bị điều chỉnh, cập nhật lại input
    if (adjustedQuantity !== quantity) {
      event.target.value = adjustedQuantity;
      // Hiển thị thông báo cảnh báo
      this.showQuantityAdjustmentWarning(product, quantity, adjustedQuantity);
    }
    
    this.updateProductQuantity(product, adjustedQuantity);
  }

  /**
   * Xử lý sự kiện keydown để ngăn chặn nhập số lượng vượt quá tồn kho
   */
  onQuantityKeydown(event: KeyboardEvent, product: any): void {
    const input = event.target as HTMLInputElement;
    const currentValue = parseInt(input.value) || 0;
    const stockQuantity = product.soLuongTon;
    
    // Ngăn chặn nhập số âm hoặc 0
    if (event.key === '-' || event.key === '0') {
      event.preventDefault();
      return;
    }
    
    // Ngăn chặn nhập số vượt quá tồn kho
    if (event.key >= '0' && event.key <= '9') {
      const newValue = parseInt(input.value + event.key);
      if (newValue > stockQuantity) {
        event.preventDefault();
        // Hiển thị cảnh báo
        this.showQuantityExceedWarning(product, newValue, stockQuantity);
        return;
      }
    }
    
    // Ngăn chặn paste nội dung vượt quá tồn kho
    if (event.key === 'v' && (event.ctrlKey || event.metaKey)) {
      setTimeout(() => {
        const pastedValue = parseInt(input.value) || 0;
        if (pastedValue > stockQuantity) {
          input.value = stockQuantity.toString();
          this.showQuantityExceedWarning(product, pastedValue, stockQuantity);
        }
      }, 0);
    }
  }

  /**
   * Hiển thị toast notification
   */
  showToast(message: string, type: 'success' | 'warning' | 'error' = 'warning'): void {
    try {
      // Tạo toast element
      const toast = document.createElement('div');
      toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'warning'} border-0`;
      toast.setAttribute('role', 'alert');
      toast.setAttribute('aria-live', 'assertive');
      toast.setAttribute('aria-atomic', 'true');
      
      toast.innerHTML = `
        <div class="d-flex">
          <div class="toast-body">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'exclamation-triangle'} me-2"></i>
            ${message}
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
      `;
      
      // Thêm vào container toast
      let toastContainer = document.getElementById('toast-container');
      if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
      }
      
      toastContainer.appendChild(toast);
      
      // Hiển thị toast với animation đơn giản
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      
      setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
      }, 100);
      
      // Tự động ẩn sau 3 giây
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (toast.parentElement) {
            toast.remove();
          }
        }, 300);
      }, 3000);
      
    } catch (error) {
      console.error('Error showing toast:', error);
      // Fallback: sử dụng alert nếu toast không hoạt động
      alert(`${type.toUpperCase()}: ${message}`);
    }
  }

  /**
   * Hiển thị cảnh báo khi số lượng vượt quá tồn kho
   */
  showQuantityExceedWarning(product: any, attemptedQuantity: number, maxQuantity: number): void {
    const message = `Số lượng ${attemptedQuantity} vượt quá tồn kho (${maxQuantity}). Số lượng tối đa có thể nhập là ${maxQuantity}.`;
    this.showToast(message, 'warning');
  }

  /**
   * Hiển thị cảnh báo khi số lượng bị điều chỉnh
   */
  showQuantityAdjustmentWarning(product: any, originalQuantity: number, adjustedQuantity: number): void {
    if (originalQuantity > product.soLuongTon) {
      const message = `Số lượng ${originalQuantity} vượt quá tồn kho (${product.soLuongTon}). Đã tự động điều chỉnh về ${adjustedQuantity}.`;
      this.showToast(message, 'warning');
    }
  }

  /**
   * Reset new invoice form
   */
  resetNewInvoiceForm(): void {
    this.newInvoice = {
      maHoaDon: '',
      tenKhachHang: '',
      soDienThoaiKhachHang: '',
      emailKhachHang: '',
      nhanVienId: 1,
      tenNhanVien: 'Nguyễn Văn A',
      tongTien: 0,
      tienGiamGia: 0,
      thanhTien: 0,
      ghiChu: '',
      trangThai: 'CHO_XAC_NHAN',
      phuongThucThanhToan: 'cash',
      viTriBanHang: 'Tại quầy',
      danhSachSanPham: [],
      // Địa chỉ khách hàng
      tinhThanh: '',
      quanHuyen: '',
      phuongXa: '',
      diaChiChiTiet: '',
    };
    this.selectedProducts = [];
    this.clearAllValidations();
  }

  /**
   * Generate invoice code
   */
  generateInvoiceCode(): void {
    const timestamp = new Date().getTime();
    const randomNum = Math.floor(Math.random() * 1000);
    this.newInvoice.maHoaDon = `HD${timestamp}${randomNum}`;
    this.validateField('maHoaDon', this.newInvoice.maHoaDon);
  }

  calculateTotal(): void {
    // Tính tổng tiền từ các sản phẩm đã chọn
    // Công thức: Σ(đơn giá × số lượng) cho tất cả sản phẩm
    this.newInvoice.tongTien = this.selectedProducts.reduce((total, product) => {
      const productTotal = product.giaBan * product.soLuong;
      return total + productTotal;
    }, 0);

    // Tính tiền giảm giá
    this.newInvoice.tienGiamGia = (this.newInvoice.tongTien || 0) * (this.discountPercentage / 100);

    // Tính thành tiền
    this.newInvoice.thanhTien =
      (this.newInvoice.tongTien || 0) - (this.newInvoice.tienGiamGia || 0);
  }

  // Method để hiển thị chi tiết tính toán
  getCalculationDetails(): string {
    if (this.selectedProducts.length === 0) {
      return 'Chưa có sản phẩm nào được chọn';
    }

    let details = 'Chi tiết tính toán:\n';
    let total = 0;

    this.selectedProducts.forEach((product, index) => {
      const productTotal = product.giaBan * product.soLuong;
      total += productTotal;
      details += `${index + 1}. ${product.tenSanPham}: ${this.formatCurrency(product.giaBan)} × ${
        product.soLuong
      } = ${this.formatCurrency(productTotal)}\n`;
    });

    details += `\nTổng cộng: ${this.formatCurrency(total)}`;

    if (this.discountPercentage > 0) {
      const discountAmount = total * (this.discountPercentage / 100);
      details += `\nGiảm giá ${this.discountPercentage}%: -${this.formatCurrency(discountAmount)}`;
      details += `\nThành tiền: ${this.formatCurrency(total - discountAmount)}`;
    }

    return details;
  }

  // Tự động tạo khách hàng mới nếu chưa có
  async createCustomerIfNotExists(customerName: string): Promise<number> {
    if (!customerName || customerName.trim() === '') {
      throw new Error('Tên khách hàng không được để trống');
    }

    try {
      // Tìm khách hàng theo tên (tìm chính xác)
      const existingCustomers = await this.hoaDonService
        .searchCustomerByName(customerName.trim())
        .toPromise();
      if (existingCustomers && existingCustomers.length > 0) {
        // Tìm khách hàng có tên chính xác
        const exactMatch = existingCustomers.find(
          (customer) => customer.tenKhachHang.toLowerCase() === customerName.trim().toLowerCase()
        );
        if (exactMatch) {
          return exactMatch.id;
        }
      }

      // Tạo khách hàng mới
      const newCustomer = {
        tenKhachHang: customerName.trim(),
        email: `${customerName.toLowerCase().replace(/\s+/g, '')}@example.com`,
        soDienThoai: 'Chưa có',
        gioiTinh: null, // Không xác định
        ngaySinh: null,
        diemTichLuy: 0,
        trangThai: true,
        ngayTao: new Date().toISOString().split('T')[0], // Format YYYY-MM-DD
      };

      const createdCustomer = await this.hoaDonService.createCustomer(newCustomer).toPromise();

      // Reload danh sách khách hàng để hiển thị khách hàng mới
      this.loadCustomerNames();

      return createdCustomer.id;
    } catch (error) {
      console.error('Lỗi khi tạo khách hàng:', error);
      // Fallback: tạo ID tạm thời
      return Math.floor(Math.random() * 1000) + 1;
    }
  }

  confirmProductSelection(): void {
    // Nếu đang ở edit mode, cập nhật editingInvoice.danhSachSanPham
    if (this.showEditModal && this.editingInvoice) {
      this.editingInvoice.danhSachSanPham = this.selectedProducts.map((product: any) => ({
        chiTietSanPhamId: product.chiTietSanPhamId || product.id, // Ưu tiên chiTietSanPhamId
        id: product.id,
        sanPhamId: product.sanPhamId || product.id,
        maSanPham: product.maSanPham,
        tenSanPham: product.tenSanPham,
        donGia: product.donGia || product.giaBan || 0,
        giaBan: product.giaBan || product.donGia || 0,
        soLuong: product.soLuong || 1,
        thanhTien: product.thanhTien || (product.donGia || 0) * (product.soLuong || 1),
        kichThuoc: product.kichThuoc || '',
        mauSac: product.mauSac || '',
        anhSanPham: product.anhSanPham || '',
      }));
      
      // Tính lại tổng tiền cho editingInvoice
      const tongTien = this.selectedProducts.reduce((sum, p) => {
        return sum + ((p.donGia || p.giaBan || 0) * (p.soLuong || 1));
      }, 0);
      this.editingInvoice.tongTien = tongTien;
      this.editingInvoice.thanhTien = tongTien - (this.editingInvoice.tienGiamGia || 0);
      
      console.log('✅ Updated editingInvoice.danhSachSanPham:', this.editingInvoice.danhSachSanPham);
    }
    
    // Đóng modal và cập nhật UI
    this.closeProductModal();
  }

  // Load customer names for all invoices
  loadCustomerNames(): void {
    const invoicesToUpdate = this.paginatedInvoices.filter(
      (invoice) => invoice.khachHangId && !invoice.tenKhachHang
    );

    invoicesToUpdate.forEach((invoice) => {
      if (invoice.khachHangId) {
        this.hoaDonService.getCustomerById(invoice.khachHangId).subscribe({
          next: (customer) => {
            invoice.tenKhachHang = customer.tenKhachHang || 'Khách hàng không xác định';
            invoice.soDienThoaiKhachHang = customer.soDienThoai || invoice.soDienThoaiKhachHang;
            invoice.emailKhachHang = customer.email || invoice.emailKhachHang;
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('Error loading customer:', error);
            invoice.tenKhachHang = 'Khách hàng không xác định';
            this.cdr.detectChanges();
          },
        });
      }
    });
  }

  // Customer methods
  getCustomerName(customerId: number): string {
    if (this.customerCache[customerId]) {
      return this.customerCache[customerId];
    }

    // Load customer name if not cached
    if (customerId) {
      this.hoaDonService.getCustomerById(customerId).subscribe({
        next: (customer) => {
          this.customerCache[customerId] = customer.tenKhachHang || 'Khách hàng không xác định';
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading customer:', error);
          this.customerCache[customerId] = 'Khách hàng không xác định';
          this.cdr.detectChanges();
        },
      });
    }

    return 'Đang tải...';
  }

  // Enhanced product modal methods
  addProductToInvoice(product: any): void {
    const existingProduct = this.selectedProducts.find((p) => p.id === product.id);
    if (existingProduct) {
      existingProduct.soLuong += 1;
    } else {
      this.selectedProducts.push({
        ...product,
        soLuong: 1,
      });
    }
    this.calculateTotal();
  }

  removeProductFromInvoice(product: any): void {
    const index = this.selectedProducts.findIndex((p) => p.id === product.id);
    if (index > -1) {
      this.selectedProducts.splice(index, 1);
      this.calculateTotal();
    }
  }

  isProductInInvoice(product: any): boolean {
    return this.selectedProducts.some((p) => p.id === product.id);
  }

  getProductQuantityInInvoice(product: any): number {
    const selectedProduct = this.selectedProducts.find((p) => p.id === product.id);
    return selectedProduct ? selectedProduct.soLuong : 0;
  }

  // Product selection methods
  selectedProductIds: Set<number> = new Set();

  isProductSelected(product: any): boolean {
    return this.selectedProductIds.has(product.id);
  }

  /**
   * Kiểm tra sản phẩm có khả dụng để chọn không
   * Sản phẩm khả dụng khi: trạng thái = true và số lượng tồn > 0
   */
  isProductAvailable(product: any): boolean {
    return product.trangThai === true && product.soLuongTon > 0;
  }

  toggleProductSelection(product: any, event: any): void {
    // Chỉ cho phép chọn nếu sản phẩm khả dụng
    if (!this.isProductAvailable(product)) {
      event.preventDefault();
      return;
    }

    if (event.target.checked) {
      // Thêm sản phẩm vào danh sách đã chọn với số lượng mặc định là 1
      this.selectedProductIds.add(product.id);
      
      // Thêm sản phẩm vào selectedProducts ngay lập tức
      const existingProduct = this.selectedProducts.find((p) => p.id === product.id);
      if (!existingProduct) {
        this.selectedProducts.push({
          ...product,
          soLuong: 1,
        });
        // Tính lại tổng tiền
        this.calculateTotal();
      }
    } else {
      // Xóa sản phẩm khỏi danh sách
      this.selectedProductIds.delete(product.id);
      
      // Xóa sản phẩm khỏi selectedProducts
      const index = this.selectedProducts.findIndex((p) => p.id === product.id);
      if (index !== -1) {
        this.selectedProducts.splice(index, 1);
        // Tính lại tổng tiền
        this.calculateTotal();
      }
    }
  }

  isAllProductsSelected(): boolean {
    const availableProducts = this.availableProducts.filter((p) => this.isProductAvailable(p));
    return (
      availableProducts.length > 0 &&
      availableProducts.every((p) => this.selectedProductIds.has(p.id))
    );
  }

  isSomeProductsSelected(): boolean {
    const availableProducts = this.availableProducts.filter((p) => this.isProductAvailable(p));
    const selectedCount = availableProducts.filter((p) => this.selectedProductIds.has(p.id)).length;
    return selectedCount > 0 && selectedCount < availableProducts.length;
  }

  toggleSelectAll(event: any): void {
    const availableProducts = this.availableProducts.filter((p) => this.isProductAvailable(p));

    if (event.target.checked) {
      // Chọn tất cả sản phẩm
      availableProducts.forEach((product) => {
        this.selectedProductIds.add(product.id);
        
        // Thêm sản phẩm vào selectedProducts nếu chưa có
        const existingProduct = this.selectedProducts.find((p) => p.id === product.id);
        if (!existingProduct) {
          this.selectedProducts.push({
            ...product,
            soLuong: 1,
          });
        }
      });
    } else {
      // Bỏ chọn tất cả sản phẩm
      availableProducts.forEach((product) => {
        this.selectedProductIds.delete(product.id);
        
        // Xóa sản phẩm khỏi selectedProducts
        const index = this.selectedProducts.findIndex((p) => p.id === product.id);
        if (index !== -1) {
          this.selectedProducts.splice(index, 1);
        }
      });
    }
    
    // Tính lại tổng tiền
    this.calculateTotal();
  }

  getSelectedProducts(): any[] {
    return this.availableProducts.filter((p) => this.selectedProductIds.has(p.id));
  }

  onDiscountChange(): void {
    this.calculateTotal();
  }

  // Validation methods
  validateField(fieldName: string, value: any, additionalData?: any): void {
    const validation = this.validationService.getFieldValidation(fieldName, value, additionalData);
    this.fieldValidations[fieldName] = validation;
    
    if (!validation.isValid) {
      this.showValidationErrors = true;
    }
    
    this.updateFormValidity();
    this.cdr.detectChanges();
  }

  validateForm(): boolean {
    console.log('🔄 validateForm() called');
    this.showValidationErrors = true;
    this.formErrors = []; // Clear general form errors - now only show field-specific errors
    
    // Validate new invoice form
    if (false) { // showAddModal removed
      console.log('📝 Validating new invoice form');
      console.log('newInvoice:', this.newInvoice);
      console.log('selectedProducts:', this.selectedProducts);
      
      // Tạo một copy của newInvoice với danhSachSanPham từ selectedProducts
      const invoiceToValidate = {
        ...this.newInvoice,
        danhSachSanPham: this.selectedProducts.map((product) => ({
          sanPhamId: product.id,
          tenSanPham: product.tenSanPham,
          soLuong: product.soLuong,
          donGia: product.giaBan,
          thanhTien: product.giaBan * product.soLuong,
        }))
      };
      
      console.log('invoiceToValidate:', invoiceToValidate);
      
      const validation = this.validationService.validateInvoiceFormStrict(invoiceToValidate);
      console.log('validation result:', validation);
      this.isFormValid = validation.isValid;
      
      if (!validation.isValid) {
        console.log('❌ New invoice validation failed:', validation.errors);
        return false;
      }
    }
    
    // Validate edit invoice form
    if (this.showEditModal && this.editingInvoice) {
      console.log('📝 Validating edit invoice form');
      const validation = this.validationService.validateInvoiceFormStrict(this.editingInvoice);
      this.isFormValid = validation.isValid;
      
      if (!validation.isValid) {
        console.log('❌ Edit invoice validation failed:', validation.errors);
        return false;
      }
    }
    
    console.log('✅ Form validation passed, isFormValid:', this.isFormValid);
    return this.isFormValid;
  }

  updateFormValidity(): void {
    console.log('🔄 updateFormValidity() called');
    const hasErrors = Object.values(this.fieldValidations).some(validation => !validation.isValid);
    console.log('fieldValidations:', this.fieldValidations);
    console.log('hasErrors:', hasErrors);
    
    // Chỉ kiểm tra fieldValidations để tránh infinite loop
    this.isFormValid = !hasErrors;
    console.log('isFormValid:', this.isFormValid);
  }

  // Field validation methods
  isFieldInvalid(fieldName: string): boolean {
    const validation = this.fieldValidations[fieldName];
    return validation ? !validation.isValid : false;
  }

  getFieldError(fieldName: string): string {
    const validation = this.fieldValidations[fieldName];
    return validation && !validation.isValid ? validation.errorMessage : '';
  }

  isFieldValid(fieldName: string): boolean {
    const validation = this.fieldValidations[fieldName];
    return validation && validation.isValid;
  }

  getFieldClass(fieldName: string): string {
    if (this.isFieldInvalid(fieldName)) {
      return 'is-invalid';
    } else if (this.isFieldValid(fieldName)) {
      return 'is-valid';
    }
    return '';
  }

  clearFieldValidation(fieldName: string): void {
    delete this.fieldValidations[fieldName];
    this.updateFormValidity();
  }

  clearAllValidations(): void {
    this.fieldValidations = {};
    this.formErrors = [];
    this.isFormValid = true;
    this.showValidationErrors = false;
  }

  // Real-time validation for form inputs
  onCustomerNameChange(): void {
    this.validateField('tenKhachHang', this.newInvoice.tenKhachHang);
  }

  onPhoneNumberChange(): void {
    this.validateField('soDienThoaiKhachHang', this.newInvoice.soDienThoaiKhachHang);
  }

  /**
   * Xử lý khi blur khỏi field số điện thoại - LUÔN TẠO KHÁCH HÀNG MỚI
   * Không kiểm tra trong DB, luôn tạo mới theo yêu cầu
   */
  async onPhoneNumberBlur(): Promise<void> {
    const phoneNumber = (this.newInvoice.soDienThoaiKhachHang || '').trim();
    
    // Bỏ qua nếu số điện thoại rỗng hoặc đã có khachHangId (đã tạo rồi)
    if (!phoneNumber || this.newInvoice.khachHangId) {
      return;
    }

    // LUÔN TẠO MỚI - không kiểm tra trong DB theo yêu cầu
    console.log('🆕 Nhập số điện thoại mới, LUÔN TẠO KHÁCH HÀNG MỚI (không kiểm tra DB)');
    this.createNewCustomerFromForm();
  }

  /**
   * Tạo khách hàng mới từ thông tin form khi nhập số điện thoại mới
   */
  private createNewCustomerFromForm(): void {
    const phoneNumber = (this.newInvoice.soDienThoaiKhachHang || '').trim();
    const customerName = (this.newInvoice.tenKhachHang || '').trim();
    const email = (this.newInvoice.emailKhachHang || '').trim();

    // Kiểm tra có đủ thông tin để tạo khách hàng không
    if (!phoneNumber) {
      console.warn('⚠️ Không có số điện thoại để tạo khách hàng');
      return;
    }

    // Nếu chưa có tên khách hàng, tạo tên mặc định
    const finalCustomerName = customerName || `Khách hàng ${phoneNumber}`;
    
    // Nếu chưa có email, tạo email mặc định dựa trên số điện thoại
    const finalEmail = email || `kh${phoneNumber}@example.com`;

    console.log('📝 Tạo khách hàng mới với thông tin:', {
      tenKhachHang: finalCustomerName,
      soDienThoai: phoneNumber,
      email: finalEmail
    });

    // Tạo khách hàng MỚI (không tìm trong DB) - luôn tạo mới khi nhập số điện thoại mới
    const customerToCreate: CustomerCreateRequest = {
      tenKhachHang: finalCustomerName,
      soDienThoai: phoneNumber,
      email: finalEmail,
      ngaySinh: '1990-01-01',
      gioiTinh: true,
      diemTichLuy: 0,
      trangThai: true
    };

    console.log('📝 Creating NEW customer (not searching in DB):', customerToCreate);
    
    // Gọi trực tiếp createCustomer thay vì createOrFindCustomer để LUÔN TẠO MỚI
    this.customerService.createCustomer(customerToCreate).subscribe({
      next: (newCustomer) => {
        console.log('✅ Đã tạo khách hàng mới thành công:', newCustomer);
        
        // Cập nhật thông tin vào form
        this.newInvoice.khachHangId = newCustomer.id;
        this.newInvoice.tenKhachHang = newCustomer.tenKhachHang;
        this.newInvoice.emailKhachHang = newCustomer.email || finalEmail;
        this.newInvoice.soDienThoaiKhachHang = newCustomer.soDienThoai || phoneNumber;

        // Tự động lưu địa chỉ nếu có thông tin địa chỉ trong form
        if (newCustomer.id) {
          this.saveCustomerAddressIfAvailable(newCustomer.id);
          // Load danh sách địa chỉ của khách hàng mới
          this.loadCustomerAddresses(newCustomer.id);
        }

        this.showToast('Đã tạo khách hàng mới thành công!', 'success');
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Lỗi khi tạo khách hàng mới:', error);
        this.showToast('Có lỗi xảy ra khi tạo khách hàng mới', 'error');
      }
    });
  }

  /**
   * Tự động lưu địa chỉ khách hàng nếu có đủ thông tin trong form
   */
  private saveCustomerAddressIfAvailable(khachHangId: number): void {
    const diaChiChiTiet = (this.newInvoice.diaChiChiTiet || '').trim();
    const tinhThanh = (this.newInvoice.tinhThanh || '').trim();
    const quanHuyen = (this.newInvoice.quanHuyen || '').trim();
    const phuongXa = (this.newInvoice.phuongXa || '').trim();

    // Chỉ lưu địa chỉ nếu có đủ thông tin bắt buộc
    if (diaChiChiTiet && tinhThanh && quanHuyen && phuongXa) {
      console.log('📍 Tự động lưu địa chỉ khách hàng...');
      
      this.createCustomerAddressFromForm(khachHangId).subscribe({
        next: (newAddress) => {
          console.log('✅ Đã lưu địa chỉ khách hàng thành công:', newAddress);
          
          // Thêm địa chỉ vào danh sách
          if (!this.customerAddresses.find(addr => addr.id === newAddress.id)) {
            this.customerAddresses.push(newAddress);
          }
          
          // Tự động chọn địa chỉ mới nếu là mặc định
          if (newAddress.macDinh) {
            this.selectedCustomerAddress = newAddress;
          }
          
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('❌ Lỗi khi lưu địa chỉ khách hàng:', error);
          // Không hiển thị lỗi cho người dùng vì đây là tự động
        }
      });
    } else {
      console.log('⚠️ Chưa có đủ thông tin địa chỉ để tự động lưu');
    }
  }

  /**
   * Load danh sách địa chỉ của khách hàng
   */
  private loadCustomerAddresses(khachHangId: number): void {
    this.customerAddressService.getAddressesByCustomerId(khachHangId).subscribe({
      next: (addresses) => {
        console.log('✅ Đã load địa chỉ khách hàng:', addresses);
        this.customerAddresses = addresses;
        
        // Tự động chọn địa chỉ mặc định nếu có
        const defaultAddress = addresses.find(addr => addr.macDinh);
        if (defaultAddress) {
          this.selectedCustomerAddress = defaultAddress;
        }
        
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Lỗi khi load địa chỉ khách hàng:', error);
        this.customerAddresses = [];
      }
    });
  }

  onEmailChange(): void {
    this.validateField('emailKhachHang', this.newInvoice.emailKhachHang);
  }

  onInvoiceCodeChange(): void {
    this.validateField('maHoaDon', this.newInvoice.maHoaDon);
  }

  onNotesChange(): void {
    this.validateField('ghiChu', this.newInvoice.ghiChu);
  }

  onPaymentMethodFormChange(): void {
    this.validateField('phuongThucThanhToan', this.newInvoice.phuongThucThanhToan);
  }

  // Address validation methods
  onTinhThanhChange(): void {
    this.validateField('tinhThanh', this.newInvoice.tinhThanh);
  }

  onQuanHuyenChange(): void {
    this.validateField('quanHuyen', this.newInvoice.quanHuyen);
  }

  onPhuongXaChange(): void {
    this.validateField('phuongXa', this.newInvoice.phuongXa);
  }

  onDiaChiChiTietChange(): void {
    this.validateField('diaChiChiTiet', this.newInvoice.diaChiChiTiet);
  }

  // Enhanced form submission with validation
  submitInvoiceForm(): void {
    console.log('🔄 submitInvoiceForm() called');
    // showAddModal removed - không tạo hóa đơn mới nữa
    console.log('showEditModal:', this.showEditModal);
    console.log('isFormValid:', this.isFormValid);
    
    if (!this.validateForm()) {
      console.log('❌ Form validation failed');
      // Scroll to first error
      const firstErrorElement = document.querySelector('.is-invalid');
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    console.log('✅ Form validation passed');
    // Proceed with form submission
    if (this.showEditModal) {
      console.log('🔄 Calling updateInvoice()');
      this.updateInvoice();
    }
  }

  // REMOVED: All create invoice methods - không tạo hóa đơn mới nữa
  // Commented out: createInvoice, proceedWithInvoiceCreation, createInvoiceWithProducts
  // Commented out: addInvoiceToTop, resetForm, scrollToTop

  /**
   * Cập nhật hóa đơn trong danh sách và di chuyển lên đầu
   */
  updateInvoiceInList(updatedInvoice: HoaDonDTO): void {
    // Tìm và cập nhật hóa đơn trong danh sách
    const index = this.paginatedInvoices.findIndex(invoice => invoice.id === updatedInvoice.id);
    
    if (index !== -1) {
      // Xóa hóa đơn cũ
      this.paginatedInvoices.splice(index, 1);
    }
    
    // Thêm hóa đơn đã cập nhật vào đầu danh sách
    this.paginatedInvoices.unshift(updatedInvoice);
    
    // Đảm bảo pagination vẫn hoạt động đúng
    this.updatePagination();
    
    console.log('✅ Updated invoice and moved to top:', updatedInvoice.maHoaDon);
  }

  /**
   * Xóa hóa đơn khỏi danh sách
   */
  removeInvoiceFromList(invoiceId: number): void {
    // Xóa khỏi paginatedInvoices
    const paginatedIndex = this.paginatedInvoices.findIndex(invoice => invoice.id === invoiceId);
    if (paginatedIndex !== -1) {
      this.paginatedInvoices.splice(paginatedIndex, 1);
    }
    
    // Xóa khỏi filteredInvoices
    const filteredIndex = this.filteredInvoices.findIndex(invoice => invoice.id === invoiceId);
    if (filteredIndex !== -1) {
      this.filteredInvoices.splice(filteredIndex, 1);
    }
    
    // Xóa khỏi invoices
    const invoicesIndex = this.invoices.findIndex(invoice => invoice.id === invoiceId);
    if (invoicesIndex !== -1) {
      this.invoices.splice(invoicesIndex, 1);
    }
    
    // Cập nhật totalItems
      this.totalItems--;
    
    // Cập nhật pagination
      this.updatePagination();
    
    console.log('✅ Removed invoice from all lists:', invoiceId);
  }

  /**
   * Cập nhật pagination sau khi thay đổi danh sách
   */
  private updatePagination(): void {
    // Đảm bảo currentPage không vượt quá số trang tối đa
    const maxPage = Math.ceil(this.totalItems / this.itemsPerPage);
    if (this.currentPage > maxPage && maxPage > 0) {
      this.currentPage = maxPage;
    }
    
    // Trigger change detection
    this.cdr.detectChanges();
  }

  /**
   * Mở modal chọn địa chỉ khách hàng
   */
  openCustomerAddressModal(): void {
    if (!this.newInvoice.emailKhachHang || !this.newInvoice.soDienThoaiKhachHang) {
      this.showToast('Vui lòng nhập email và số điện thoại khách hàng trước', 'warning');
      return;
    }

    this.showCustomerAddressModal = true;
    this.loadCustomerAddressesFromForm();
  }

  /**
   * Đóng modal chọn địa chỉ khách hàng
   */
  closeCustomerAddressModal(): void {
    this.showCustomerAddressModal = false;
    this.selectedCustomerAddress = null;
    this.customerAddresses = [];
  }

  /**
   * Mở modal thêm địa chỉ mới
   */
  openAddAddressModal(): void {
    this.showAddAddressModal = true;
    this.resetNewCustomerAddress();
  }

  /**
   * Đóng modal thêm địa chỉ mới
   */
  closeAddAddressModal(): void {
    this.showAddAddressModal = false;
    this.resetNewCustomerAddress();
  }

  /**
   * Load danh sách địa chỉ của khách hàng (overload không có parameter - sử dụng khachHangId từ form)
   */
  loadCustomerAddressesFromForm(): void {
    if (!this.newInvoice.khachHangId) {
      this.showToast('Không tìm thấy ID khách hàng', 'error');
      return;
    }

    this.loadingCustomerAddresses = true;
    this.customerAddressService.getAddressesByCustomerId(this.newInvoice.khachHangId).subscribe({
      next: (addresses) => {
        this.customerAddresses = addresses || [];
        this.loadingCustomerAddresses = false;
        console.log('✅ Loaded customer addresses:', addresses);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error loading customer addresses:', error);
        this.customerAddresses = [];
        this.loadingCustomerAddresses = false;
        this.showToast('Không thể tải danh sách địa chỉ', 'error');
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Chọn địa chỉ khách hàng
   */
  selectCustomerAddress(address: CustomerAddress): void {
    this.selectedCustomerAddress = address;
    console.log('✅ Selected customer address:', address);
  }

  /**
   * Xác nhận lựa chọn địa chỉ
   */
  confirmCustomerAddressSelection(): void {
    if (this.selectedCustomerAddress) {
      // Cập nhật thông tin địa chỉ vào hóa đơn
      this.newInvoice.diaChiGiaoHang = `${this.selectedCustomerAddress.diaChi}, ${this.selectedCustomerAddress.phuongXa}, ${this.selectedCustomerAddress.quanHuyen}, ${this.selectedCustomerAddress.tinhThanh}`;
      
      this.closeCustomerAddressModal();
      this.showToast('Đã chọn địa chỉ khách hàng', 'success');
      console.log('✅ Confirmed customer address selection:', this.selectedCustomerAddress);
    }
  }

  /**
   * Load danh sách tỉnh/thành phố
   */
  loadProvinces(): void {
    this.loadingProvinces = true;
    this.vietnamAddressService.getProvinces().subscribe({
      next: (provinces) => {
        this.provinces = provinces;
        this.loadingProvinces = false;
        console.log('✅ Loaded provinces:', provinces.length);
      },
      error: (error) => {
        console.error('❌ Error loading provinces:', error);
        this.loadingProvinces = false;
        this.showToast('Không thể tải danh sách tỉnh/thành phố', 'error');
      }
    });
  }

  /**
   * Load danh sách quận/huyện theo tỉnh
   */
  loadDistrictsByProvince(provinceCode: string): void {
    this.loadingDistricts = true;
    this.districts = [];
    this.wards = [];
    this.selectedDistrict = null;
    this.selectedWard = null;
    
    this.vietnamAddressService.getDistrictsByProvince(provinceCode).subscribe({
      next: (districts) => {
        this.districts = districts;
        this.loadingDistricts = false;
        console.log('✅ Loaded districts:', districts.length);
      },
      error: (error) => {
        console.error('❌ Error loading districts:', error);
        this.loadingDistricts = false;
        this.showToast('Không thể tải danh sách quận/huyện', 'error');
      }
    });
  }

  /**
   * Load danh sách xã/phường theo quận
   */
  loadWardsByDistrict(districtCode: string): void {
    this.loadingWards = true;
    this.wards = [];
    this.selectedWard = null;
    
    this.vietnamAddressService.getWardsByDistrict(districtCode).subscribe({
      next: (wards) => {
        this.wards = wards;
        this.loadingWards = false;
        console.log('✅ Loaded wards:', wards.length);
      },
      error: (error) => {
        console.error('❌ Error loading wards:', error);
        this.loadingWards = false;
        this.showToast('Không thể tải danh sách xã/phường', 'error');
      }
    });
  }

  /**
   * Xử lý khi chọn tỉnh
   */
  onProvinceChange(provinceCode: string): void {
    const province = this.provinces.find(p => p.code === provinceCode);
    if (province) {
      this.selectedProvince = province;
      this.newCustomerAddress.tinhThanh = province.name;
      this.newCustomerAddress.maTinh = province.code;
      
      // Reset quận và xã
      this.districts = [];
      this.wards = [];
      this.selectedDistrict = null;
      this.selectedWard = null;
      this.newCustomerAddress.quanHuyen = '';
      this.newCustomerAddress.phuongXa = '';
      this.newCustomerAddress.maQuan = '';
      this.newCustomerAddress.maXa = '';
      
      // Load quận/huyện
      this.loadDistrictsByProvince(provinceCode);
    }
  }

  /**
   * Xử lý khi chọn quận/huyện
   */
  onDistrictChange(districtCode: string): void {
    const district = this.districts.find(d => d.code === districtCode);
    if (district) {
      this.selectedDistrict = district;
      this.newCustomerAddress.quanHuyen = district.name;
      this.newCustomerAddress.maQuan = district.code;
      
      // Reset xã/phường
      this.wards = [];
      this.selectedWard = null;
      this.newCustomerAddress.phuongXa = '';
      this.newCustomerAddress.maXa = '';
      
      // Load xã/phường
      this.loadWardsByDistrict(districtCode);
    }
  }

  /**
   * Xử lý khi chọn xã/phường
   */
  onWardChange(wardCode: string): void {
    const ward = this.wards.find(w => w.code === wardCode);
    if (ward) {
      this.selectedWard = ward;
      this.newCustomerAddress.phuongXa = ward.name;
      this.newCustomerAddress.maXa = ward.code;
    }
  }

  /**
   * Reset form địa chỉ mới với địa chỉ Việt Nam
   */
  resetNewCustomerAddress(): void {
    this.newCustomerAddress = {
      khachHangId: this.newInvoice.khachHangId || 0,
      tenNguoiNhan: '',
      soDienThoai: '',
      diaChi: '',
      tinhThanh: '',
      quanHuyen: '',
      phuongXa: '',
      maTinh: '',
      maQuan: '',
      maXa: '',
      macDinh: false,
      trangThai: true
    };
    
    // Reset dropdown selections
    this.selectedProvince = null;
    this.selectedDistrict = null;
    this.selectedWard = null;
    this.districts = [];
    this.wards = [];
    
    // Load provinces if not loaded
    if (this.provinces.length === 0) {
      this.loadProvinces();
    }
  }

  /**
   * Kiểm tra tính hợp lệ của địa chỉ mới với địa chỉ Việt Nam
   */
  isNewAddressValid(): boolean {
    return !!(
      this.newCustomerAddress.tenNguoiNhan &&
      this.newCustomerAddress.soDienThoai &&
      this.newCustomerAddress.diaChi &&
      this.newCustomerAddress.tinhThanh &&
      this.newCustomerAddress.quanHuyen &&
      this.newCustomerAddress.phuongXa
    );
  }

  /**
   * Lưu địa chỉ khách hàng mới
   */
  saveCustomerAddress(): void {
    if (!this.isNewAddressValid()) {
      this.showToast('Vui lòng điền đầy đủ thông tin địa chỉ', 'warning');
      return;
    }

    this.newCustomerAddress.khachHangId = this.newInvoice.khachHangId || 0;
    
    this.customerAddressService.createAddress(this.newCustomerAddress).subscribe({
      next: (newAddress: any) => {
        console.log('✅ Created new customer address:', newAddress);
        
        // Thêm địa chỉ mới vào danh sách
        this.customerAddresses.push(newAddress);
        
        // Tự động chọn địa chỉ mới nếu được đặt làm mặc định
        if (newAddress.macDinh) {
          this.selectedCustomerAddress = newAddress;
        }
        
        this.closeAddAddressModal();
        this.showToast('Thêm địa chỉ thành công', 'success');
      },
      error: (error: any) => {
        console.error('❌ Error creating customer address:', error);
        this.showToast('Có lỗi xảy ra khi thêm địa chỉ', 'error');
      }
    });
  }

  /**
   * Tạo địa chỉ khách hàng từ form
   */
  createCustomerAddressFromForm(khachHangId: number): Observable<any> {
    // Kiểm tra xem có đủ thông tin địa chỉ không
    const diaChiChiTiet = (this.newInvoice.diaChiChiTiet || '').trim();
    const tinhThanh = (this.newInvoice.tinhThanh || '').trim();
    const quanHuyen = (this.newInvoice.quanHuyen || '').trim();
    const phuongXa = (this.newInvoice.phuongXa || '').trim();
    
    // Nếu thiếu thông tin bắt buộc, không tạo địa chỉ
    if (!diaChiChiTiet || !tinhThanh || !quanHuyen || !phuongXa) {
      console.warn('⚠️ Thiếu thông tin địa chỉ, bỏ qua việc tạo địa chỉ');
      return new Observable(observer => {
        observer.error(new Error('Thiếu thông tin địa chỉ bắt buộc'));
        observer.complete();
      });
    }
    
    const addressData = {
      khachHangId: khachHangId,
      tenNguoiNhan: (this.newInvoice.tenKhachHang || '').trim(),
      soDienThoai: (this.newInvoice.soDienThoaiKhachHang || '').trim(),
      diaChi: diaChiChiTiet,
      tinhThanh: tinhThanh,
      quanHuyen: quanHuyen,
      phuongXa: phuongXa,
      macDinh: true, // Đặt làm địa chỉ mặc định
      trangThai: true // Địa chỉ đang hoạt động
    };

    console.log('📍 Creating customer address with data:', addressData);
    
    // Map data sang format của backend DTO
    const diaChiDTO = {
      khachHangId: khachHangId,
      tenNguoiNhan: addressData.tenNguoiNhan,
      soDienThoai: addressData.soDienThoai,
      diaChiChiTiet: addressData.diaChi,
      tinhThanh: addressData.tinhThanh,
      quanHuyen: addressData.quanHuyen,
      phuongXa: addressData.phuongXa,
      macDinh: addressData.macDinh,
      trangThai: addressData.trangThai
    };
    
    // Sử dụng endpoint đúng từ backend: /api/dia-chi-khach-hang
    return this.http.post<any>(`${environment.apiBaseUrl}/api/dia-chi-khach-hang`, diaChiDTO).pipe(
      map(response => {
        console.log('✅ Address creation response:', response);
        
        return {
          id: response.id,
          khachHangId: response.khachHangId || khachHangId,
          tenNguoiNhan: response.tenNguoiNhan || addressData.tenNguoiNhan,
          soDienThoai: response.soDienThoai || addressData.soDienThoai,
          diaChi: response.diaChiChiTiet || addressData.diaChi,
          tinhThanh: response.tinhThanh || addressData.tinhThanh,
          quanHuyen: response.quanHuyen || addressData.quanHuyen,
          phuongXa: response.phuongXa || addressData.phuongXa,
          macDinh: response.macDinh !== undefined ? response.macDinh : addressData.macDinh,
          trangThai: response.trangThai !== undefined ? response.trangThai : addressData.trangThai
        };
      }),
      tap({
        error: (error) => {
          console.error('❌ Error creating customer address:', error);
        }
      })
    );
  }

  /**
   * Validation real-time khi người dùng nhập email hoặc số điện thoại
   */
  onCustomerInfoChange(): void {
    const email = this.newInvoice.emailKhachHang;
    const phone = this.newInvoice.soDienThoaiKhachHang;
    
    // Clear validation message nếu không có thông tin
    if (!email && !phone) {
      this.customerValidationMessage = '';
      this.customerValidationValid = true;
      return;
    }
    
    // Chỉ validate nếu có ít nhất email hoặc số điện thoại
    if (email || phone) {
      console.log('🔍 Real-time validation for:', { email, phone });
      
      // Debounce để tránh gọi API quá nhiều
      setTimeout(() => {
        this.validateCustomerInfo().subscribe({
          next: (result) => {
            this.customerValidationMessage = result.message;
            this.customerValidationValid = result.isValid;
            
            if (!result.isValid) {
              console.log('⚠️ Real-time validation warning:', result.message);
            } else {
              console.log('✅ Real-time validation passed:', result.message);
            }
          },
          error: (error) => {
            console.error('❌ Real-time validation error:', error);
            this.customerValidationMessage = 'Lỗi khi kiểm tra thông tin khách hàng';
            this.customerValidationValid = false;
          }
        });
      }, 500); // Debounce 500ms
    }
  }

  /**
   * Kiểm tra email và số điện thoại - CHỈ VALIDATE, KHÔNG TỰ ĐỘNG MAP
   * Luôn cho phép tạo mới theo yêu cầu
   */
  private validateCustomerInfo(): Observable<{isValid: boolean, message: string}> {
    const email = this.newInvoice.emailKhachHang;
    const phone = this.newInvoice.soDienThoaiKhachHang;
    
    console.log('🔍 Validating customer info:', { email, phone });
    
    return new Observable(observer => {
      if (!email && !phone) {
        observer.next({ isValid: false, message: 'Vui lòng nhập email hoặc số điện thoại' });
        observer.complete();
        return;
      }
      
      // Chỉ validate format, không kiểm tra trong DB
      // Luôn cho phép tạo khách hàng mới
      if (email && !this.isValidEmail(email)) {
        observer.next({ isValid: false, message: 'Email không hợp lệ' });
        observer.complete();
        return;
      }
      
      if (phone && !this.isValidPhone(phone)) {
        observer.next({ isValid: false, message: 'Số điện thoại không hợp lệ' });
                  observer.complete();
        return;
      }
      
      // Thông tin hợp lệ, cho phép tạo khách hàng mới
      console.log('✅ Thông tin khách hàng hợp lệ, sẽ tạo khách hàng mới');
              observer.next({ isValid: true, message: 'Thông tin khách hàng hợp lệ' });
              observer.complete();
    });
  }

  /**
   * Kiểm tra format email hợp lệ
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Kiểm tra format số điện thoại hợp lệ (10-11 chữ số)
   */
  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[0-9]{10,11}$/;
    return phoneRegex.test(phone.trim().replace(/\s+/g, ''));
  }

  /**
   * Tạo hoặc tìm khách hàng dựa trên thông tin từ form
   */
  private createOrFindCustomer(): Observable<Customer> {
    // Đảm bảo tên khách hàng không rỗng
    if (!this.newInvoice.tenKhachHang || this.newInvoice.tenKhachHang.trim() === '') {
      throw new Error('Tên khách hàng không được để trống');
    }
    
    // Đảm bảo có ít nhất số điện thoại hoặc email
    if (!this.newInvoice.soDienThoaiKhachHang && !this.newInvoice.emailKhachHang) {
      throw new Error('Vui lòng nhập ít nhất số điện thoại hoặc email');
    }
    
    const customerInfo = {
      tenKhachHang: this.newInvoice.tenKhachHang.trim(), // Đảm bảo trim và lưu tên đúng
      soDienThoai: this.newInvoice.soDienThoaiKhachHang?.trim() || undefined,
      email: this.newInvoice.emailKhachHang?.trim() || undefined,
      diaChi: '' // Có thể thêm field địa chỉ nếu cần
    };

    console.log('🔄 Creating or finding customer with info:', customerInfo);
    console.log('📝 Current newInvoice:', this.newInvoice);

    return this.customerService.createOrFindCustomer(customerInfo).pipe(
      tap({
        next: (customer) => {
          console.log('✅ Customer result:', customer);
          console.log('🆔 Customer ID:', customer?.id);
          console.log('👤 Customer name:', customer?.tenKhachHang);
          
          // Đảm bảo tên khách hàng được cập nhật từ DB vào invoice
          if (customer && customer.tenKhachHang) {
            this.newInvoice.tenKhachHang = customer.tenKhachHang;
          }
        },
        error: (error) => {
          console.error('❌ Error creating/finding customer:', error);
        }
      })
    );
  }

  /**
   * Hiển thị thông báo thành công
   */
  showSuccessMessage(message: string): void {
    // Tạo toast notification với styling tốt hơn
    const toast = document.createElement('div');
    toast.className = 'toast align-items-center text-white bg-success border-0';
    toast.setAttribute('role', 'alert');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      min-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border-radius: 8px;
    `;
    
    toast.innerHTML = `
      <div class="d-flex align-items-center">
        <div class="toast-body d-flex align-items-start">
          <i class="fas fa-check-circle me-2" style="font-size: 1.2rem; margin-top: 2px;"></i>
          <div style="font-weight: 500; white-space: pre-line;">${message}</div>
        </div>
        <button type="button" class="btn-close btn-close-white me-2" data-bs-dismiss="toast" style="margin-left: auto;"></button>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Bootstrap toast initialization với error handling
    try {
      if ((window as any).bootstrap && (window as any).bootstrap.Toast) {
        const bsToast = new (window as any).bootstrap.Toast(toast, {
          autohide: true,
          delay: 4000
        });
        bsToast.show();
      } else {
        // Fallback nếu Bootstrap không có sẵn
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
      }
    } catch (error) {
      console.warn('Bootstrap Toast not available, using fallback:', error);
      // Fallback nếu Bootstrap không có sẵn
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    }
    
    // Auto remove sau 5 giây để đảm bảo
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 5000);
  }

  /**
   * Hiển thị thông báo lỗi
   */
  showErrorMessage(message: string): void {
    // Tạo toast notification với styling tốt hơn
    const toast = document.createElement('div');
    toast.className = 'toast align-items-center text-white bg-danger border-0';
    toast.setAttribute('role', 'alert');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      min-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border-radius: 8px;
    `;
    
    toast.innerHTML = `
      <div class="d-flex align-items-center">
        <div class="toast-body d-flex align-items-center">
          <i class="fas fa-exclamation-circle me-2" style="font-size: 1.2rem;"></i>
          <span style="font-weight: 500;">${message}</span>
        </div>
        <button type="button" class="btn-close btn-close-white me-2" data-bs-dismiss="toast" style="margin-left: auto;"></button>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Bootstrap toast initialization với error handling
    try {
      if ((window as any).bootstrap && (window as any).bootstrap.Toast) {
        const bsToast = new (window as any).bootstrap.Toast(toast, {
          autohide: true,
          delay: 5000
        });
        bsToast.show();
      } else {
        // Fallback nếu Bootstrap không có sẵn
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
      }
    } catch (error) {
      console.warn('Bootstrap Toast not available, using fallback:', error);
      // Fallback nếu Bootstrap không có sẵn
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    }
    
    // Auto remove sau 6 giây để đảm bảo
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 6000);
  }

  /**
   * Kiểm tra xem có thể xóa hóa đơn không
   */
  canDeleteInvoice(): boolean {
    if (!this.selectedInvoice || !this.selectedInvoice.id) {
      return false;
    }
    
    // Cho phép xóa tất cả hóa đơn không bị hạn chế bởi trạng thái
    return true;
  }

  /**
   * Lấy thông báo hạn chế xóa
   */
  getDeleteRestrictionMessage(): string {
    if (!this.selectedInvoice || !this.selectedInvoice.id) {
      return 'Không thể xóa hóa đơn. Vui lòng chọn hóa đơn hợp lệ.';
    }
    
    return 'Có thể xóa hóa đơn này.';
  }

  /**
   * Lấy tooltip cho button xóa
   */
  getDeleteButtonTooltip(): string {
    if (this.canDeleteInvoice()) {
      return 'Xóa hóa đơn này khỏi hệ thống';
    } else {
      return this.getDeleteRestrictionMessage();
    }
  }

}