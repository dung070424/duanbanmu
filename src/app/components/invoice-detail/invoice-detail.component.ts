import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HoaDonService } from '../../services/hoa-don.service';
import { ProductApiService, PageResponse, SanPhamResponse } from '../../services/product-api.service';
import { ChiTietSanPhamApiService } from '../../services/chi-tiet-san-pham-api.service';
import { CustomerAddressService } from '../../services/customer-address.service';
import { EmployeeService } from '../../services/employee.service';
import { CustomerAddress } from '../../interfaces/customer-address.interface';
import { HoaDonDTO } from '../../interfaces/hoa-don.interface';
import { Subject, interval, takeUntil, firstValueFrom, Subscription, timeout, catchError, of } from 'rxjs';
import { InvoiceStatusTimelineComponent } from '../invoice-status-timeline/invoice-status-timeline.component';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, InvoiceStatusTimelineComponent],
  templateUrl: './invoice-detail.component.html',
  styleUrls: ['./invoice-detail.component.scss']
})

export class InvoiceDetailComponent implements OnInit, OnDestroy {
  invoiceId: number = 0;
  invoice: HoaDonDTO | null = null;
  customer: any = null;
  customerAddresses: CustomerAddress[] = [];
  loadingAddresses: boolean = false;
  error: string = '';
  isEditMode: boolean = false;
  editingInvoice: HoaDonDTO | null = null;
  employees: any[] = [];
  
  // Properties cho update modal
  allProducts: any[] = [];
  selectedProductsForUpdate: any[] = [];
  selectedAddressId: number | null = null;
  loadingProducts: boolean = false;
  productsLoaded: boolean = false;
  
  // Print invoice properties
  isPrinting: boolean = false;

  // Status change properties
  statusChanged: boolean = false;
  savingStatus: boolean = false;
  originalStatus: 'CHO_XAC_NHAN' | 'DA_XAC_NHAN' | 'DANG_GIAO_HANG' | 'DA_GIAO_HANG' | 'HUY' | '' = '';

  // Auto-refreshhhh
  private destroy$ = new Subject<void>();
  private refreshInterval = interval(5000); // 5 seconds
  private autoRefreshSub?: Subscription;

  // Status mapping - 5 giai đoạn như trong hình ảnh
  statusSteps = [
    { key: 'CHO_XAC_NHAN', label: 'Chờ xác nhận', iconClass: 'fas fa-clock', color: '#ffc107', description: 'Đơn hàng đang chờ xác nhận' },
    { key: 'DA_XAC_NHAN', label: 'Đã xác nhận', iconClass: 'fas fa-check-circle', color: '#17a2b8', description: 'Đơn hàng đã được xác nhận' },
    { key: 'DANG_GIAO_HANG', label: 'Đang giao hàng', iconClass: 'fas fa-truck', color: '#007bff', description: 'Đơn hàng đang được giao' },
    { key: 'DA_GIAO_HANG', label: 'Đã giao hàng', iconClass: 'fas fa-box-open', color: '#28a745', description: 'Đơn hàng đã giao thành công' },
    { key: 'HUY', label: 'Hủy', iconClass: 'fas fa-times-circle', color: '#dc3545', description: 'Đơn hàng đã bị hủy' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private hoaDonService: HoaDonService,
    private customerAddressService: CustomerAddressService,
    private employeeService: EmployeeService,
    private cdr: ChangeDetectorRef,
    private productApi: ProductApiService,
    private chiTietSanPhamService: ChiTietSanPhamApiService
  ) {}

  /**
   * Quay lại trang quản lý hóa đơn
   */
  goBack(): void {
    this.router.navigate(['/invoices']);
  }

  /**
   * Lấy địa chỉ khách hàng để hiển thị
   */
  getCustomerAddress(): string {
    if (!this.invoice) {
      return 'Không có thông tin';
    }

    // Kiểm tra địa chỉ từ database trước
    if (this.customerAddresses && this.customerAddresses.length > 0) {
      // Tìm địa chỉ mặc định
      const defaultAddress = this.customerAddresses.find(addr => addr.macDinh === true);
      if (defaultAddress) {
        return this.formatAddress(defaultAddress);
      }
      
      // Nếu không có địa chỉ mặc định, lấy địa chỉ đầu tiên
      const firstAddress = this.customerAddresses[0];
      return this.formatAddress(firstAddress);
    }

    // Fallback: kiểm tra địa chỉ từ các field trong invoice
    const addressParts = [];
    
    if (this.invoice.diaChiChiTiet) {
      addressParts.push(this.invoice.diaChiChiTiet);
    }
    
    if (this.invoice.phuongXa) {
      addressParts.push(this.invoice.phuongXa);
    }
    
    if (this.invoice.quanHuyen) {
      addressParts.push(this.invoice.quanHuyen);
    }
    
    if (this.invoice.tinhThanh) {
      addressParts.push(this.invoice.tinhThanh);
    }

    // Nếu có địa chỉ từ các field trên
    if (addressParts.length > 0) {
      return addressParts.join(', ');
    }

    // Fallback: kiểm tra địa chỉ từ customer object
    if (this.customer?.diaChi) {
      return this.customer.diaChi;
    }

    // Fallback: kiểm tra địa chỉ giao hàng trong invoice
    if (this.invoice.diaChiGiaoHang) {
      return this.invoice.diaChiGiaoHang;
    }

    return 'Hãy cập nhật địa chỉ';
  }

  /**
   * Format địa chỉ từ CustomerAddress object
   */
  private formatAddress(address: CustomerAddress): string {
    const parts = [];
    
    if (address.diaChi) {
      parts.push(address.diaChi);
    }
    
    if (address.phuongXa) {
      parts.push(address.phuongXa);
    }
    
    if (address.quanHuyen) {
      parts.push(address.quanHuyen);
    }
    
    if (address.tinhThanh) {
      parts.push(address.tinhThanh);
    }

    return parts.join(', ');
  }

  /**
   * Kiểm tra xem khách hàng có địa chỉ hay không
   */
  hasCustomerAddress(): boolean {
    return this.customerAddresses && this.customerAddresses.length > 0;
  }

  /**
   * Populate địa chỉ từ dữ liệu invoice hiện tại
   */
  populateAddressFromInvoice(): void {
    if (!this.editingInvoice) return;
    
    console.log('📍 Populating address from invoice data:', {
      tinhThanh: this.editingInvoice.tinhThanh,
      quanHuyen: this.editingInvoice.quanHuyen,
      phuongXa: this.editingInvoice.phuongXa,
      diaChiChiTiet: this.editingInvoice.diaChiChiTiet
    });
    
    // Đảm bảo các trường địa chỉ có giá trị từ invoice
    this.editingInvoice.tinhThanh = this.editingInvoice.tinhThanh || '';
    this.editingInvoice.quanHuyen = this.editingInvoice.quanHuyen || '';
    this.editingInvoice.phuongXa = this.editingInvoice.phuongXa || '';
    this.editingInvoice.diaChiChiTiet = this.editingInvoice.diaChiChiTiet || '';
    
    console.log('✅ Address populated from invoice:', {
      tinhThanh: this.editingInvoice.tinhThanh,
      quanHuyen: this.editingInvoice.quanHuyen,
      phuongXa: this.editingInvoice.phuongXa,
      diaChiChiTiet: this.editingInvoice.diaChiChiTiet
    });
    
    // Trigger change detection để cập nhật UI ngay lập tức
    this.cdr.detectChanges();
  }

  /**
   * Load địa chỉ khách hàng từ database
   */
  private loadCustomerAddresses(): void {
    if (!this.invoice?.khachHangId) {
      return;
    }

    this.loadingAddresses = true;
    console.log('📍 Loading addresses for customer ID:', this.invoice.khachHangId);

    this.customerAddressService.getAddressesByCustomerId(this.invoice.khachHangId).subscribe({
      next: (addresses) => {
        console.log('✅ Loaded customer addresses:', addresses);
        this.customerAddresses = addresses || [];
        this.loadingAddresses = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error loading customer addresses:', error);
        this.customerAddresses = [];
        this.loadingAddresses = false;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.invoiceId = +params['id'];
      if (this.invoiceId) {
        this.loadInvoiceDetail();
        this.startAutoRefresh();
      }
    });
    // Prefetch sản phẩm để mở modal là có dữ liệu ngay
    this.prefetchProducts();
  }
  private prefetchProducts(): void {
    if (this.productsLoaded) {
      return;
    }
    
    // Sử dụng ChiTietSanPham API thay vì SanPham API
    this.chiTietSanPhamService.getAll().pipe(
      timeout(4000),
      catchError(() => of([]))
    ).subscribe({
      next: (chiTietProducts: any[]) => {
        // Map ChiTietSanPhamResponse to match frontend expected format
        this.allProducts = (chiTietProducts || []).map((product: any) => ({
          id: product.id, // Đây là chiTietSanPhamId - ID chính xác cần dùng
          chiTietSanPhamId: product.id, // Đảm bảo có chiTietSanPhamId
          sanPhamId: product.sanPhamId, // ID của SanPham gốc
          tenSanPham: product.sanPhamTen || 'Chưa có tên',
          giaBan: parseFloat(product.giaBan || '0'),
          donGia: parseFloat(product.giaBan || '0'), // Map giaBan to donGia for compatibility
          soLuongTon: parseInt(product.soLuongTon || '0', 10),
          maSanPham: `SP${product.sanPhamId?.toString().padStart(3, '0') || '000'}`,
          trangThai: product.trangThai,
          // Thông tin chi tiết
          kichThuoc: product.kichThuocTen || '',
          mauSac: product.mauSacTen || '',
          mauSacMa: product.mauSacMa || '',
          trongLuong: product.trongLuongTen || '',
          // Thông tin sản phẩm gốc
          danhMuc: '',
          thuongHieu: '',
          moTa: '',
          anhSanPham: product.anhSanPham || '',
        }));
        console.log('✅ Loaded ChiTietSanPham products for invoice detail:', this.allProducts);
        this.productsLoaded = true;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error loading ChiTietSanPham, falling back to SanPham:', error);
        // Fallback to SanPham if ChiTietSanPham fails
        this.hoaDonService.getProducts().pipe(
          timeout(4000),
          catchError(() => of([]))
        ).subscribe({
          next: (products: any[]) => {
            this.allProducts = (products || []).map((product: any) => ({
              id: product.id,
              chiTietSanPhamId: product.id, // Tạm thời dùng SanPham ID
              tenSanPham: product.tenSanPham,
              giaBan: product.giaBan || 0,
              donGia: product.giaBan || 0,
              soLuongTon: product.soLuongTon || 0,
              maSanPham: product.maSanPham,
              danhMuc: product.danhMuc || product.loaiMuBaoHiemTen || 'Chưa phân loại',
              thuongHieu: product.thuongHieu || product.nhaSanXuatTen || 'Chưa có',
              moTa: product.moTa,
              trangThai: product.trangThai
            }));
            this.productsLoaded = true;
            this.cdr.detectChanges();
          },
          error: () => {
            this.allProducts = [];
            this.productsLoaded = false;
          }
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopAutoRefresh();
  }

  private startAutoRefresh(): void {
    // Ensure only one active subscription
    this.stopAutoRefresh();
    this.autoRefreshSub = this.refreshInterval.subscribe(() => {
      if (!this.isEditMode) {
        this.loadInvoiceDetail();
      }
    });
  }

  private stopAutoRefresh(): void {
    if (this.autoRefreshSub) {
      this.autoRefreshSub.unsubscribe();
      this.autoRefreshSub = undefined;
    }
  }

  loadInvoiceDetail(): void {
    console.log('🔄 Loading invoice detail for ID:', this.invoiceId);
    this.error = '';

    this.hoaDonService.getHoaDonDetail(this.invoiceId).subscribe({
      next: (invoice) => {
        console.log('✅ Invoice loaded from server:', invoice);
        this.invoice = invoice;
        this.originalStatus = invoice.trangThai; // Lưu trạng thái ban đầu
        this.statusChanged = false; // Reset flag

        // getHoaDonDetail() đã load sản phẩm rồi, không cần gọi loadProductDetails()
        console.log('✅ Invoice with products loaded:', invoice.danhSachSanPham);

        // Load customer information if khachHangId exists
        if (invoice.khachHangId) {
          this.hoaDonService.getCustomerById(invoice.khachHangId).subscribe({
            next: (customer) => {
              console.log('✅ Customer loaded:', customer);
              this.customer = customer;
              this.cdr.detectChanges();
              
              // Load customer addresses after customer is loaded
              this.loadCustomerAddresses();
            },
            error: (error) => {
              console.error('❌ Error loading customer:', error);
              this.customer = null;
              this.cdr.detectChanges();
            }
          });
        } else {
          this.customer = null;
          this.cdr.detectChanges();
        }

        // Force UI update
        this.cdr.detectChanges();
        console.log('🔄 Invoice detail UI updated');
      },
      error: (error) => {
        console.error('❌ Error loading invoice detail:', error);
        this.error = 'Không thể tải thông tin hóa đơn';
        this.cdr.detectChanges();
      }
    });


  }

  /**
   * Load product details for the invoice
   */
  private loadProductDetails(): void {
    console.log('🔄 Loading product details for invoice:', this.invoiceId);
    if (!this.invoiceId) {
      return;
    }

    this.hoaDonService.getHoaDonDetail(this.invoiceId).subscribe({
      next: (detailData: any) => {
        console.log('📦 Chi tiết hóa đơn loaded:', detailData);

        const danhSach = Array.isArray(detailData?.danhSachSanPham) ? detailData.danhSachSanPham : [];
        
        // Cập nhật invoice với dữ liệu mới nhất từ server
        this.invoice = {
          ...(this.invoice || {} as any),
          danhSachSanPham: danhSach,
          soLuongSanPham: danhSach.length,
          tongTien: detailData?.tongTien ?? 0,
          thanhTien: detailData?.thanhTien ?? detailData?.tongTien ?? 0,
          tienGiamGia: detailData?.tienGiamGia ?? 0,
          giamGiaPhanTram: detailData?.giamGiaPhanTram ?? 0,
          trangThai: detailData?.trangThai,
          phuongThucThanhToan: detailData?.phuongThucThanhToan,
          ngayThanhToan: detailData?.ngayThanhToan,
          ghiChu: detailData?.ghiChu
        } as any;

        if (danhSach.length === 0) {
          console.log('📦 No products found for this invoice');
        } else {
          console.log('✅ Real products loaded from API:', danhSach);
        }

        // Force UI update
        this.cdr.detectChanges();
        console.log('🔄 Product details UI updated');
      },
      error: (error: any) => {
        console.error('❌ Error loading product details:', error);
        // Không dùng dữ liệu mẫu; hiển thị trống để đúng theo DB
        if (this.invoice) {
          this.invoice.danhSachSanPham = [];
          this.invoice.soLuongSanPham = 0;
          this.invoice.tongTien = this.invoice.tongTien ?? 0;
          this.invoice.thanhTien = this.invoice.thanhTien ?? this.invoice.tongTien ?? 0;
        }
        this.cdr.detectChanges();
      }
    });
  }


  openUpdateModal(): void {
    try {
      console.log('🚀 Opening update modal...');
      
      // Kiểm tra invoice có tồn tại không
      if (!this.invoice) {
        console.error('❌ No invoice data available');
        this.showToast('Không có dữ liệu hóa đơn để cập nhật!', 'error');
        return;
      }
      
    // Tạo bản sao của invoice hiện tại để chỉnh sửa
      this.editingInvoice = { ...this.invoice };
    
      console.log('🔄 Opening update modal for invoice:', this.editingInvoice.maHoaDon);
      console.log('📋 Invoice data:', this.editingInvoice);
      
      // Debug: Kiểm tra dữ liệu địa chỉ trong invoice gốc
      console.log('🔍 Original invoice address data:', {
        tinhThanh: this.invoice?.tinhThanh,
        quanHuyen: this.invoice?.quanHuyen,
        phuongXa: this.invoice?.phuongXa,
        diaChiChiTiet: this.invoice?.diaChiChiTiet,
        khachHangId: this.invoice?.khachHangId
      });
      
      // Đảm bảo tất cả các trường có giá trị mặc định nếu chưa có
      this.editingInvoice.tenKhachHang = this.editingInvoice.tenKhachHang || '';
      this.editingInvoice.soDienThoaiKhachHang = this.editingInvoice.soDienThoaiKhachHang || '';
      this.editingInvoice.emailKhachHang = this.editingInvoice.emailKhachHang || '';
      this.editingInvoice.tinhThanh = this.editingInvoice.tinhThanh || '';
      this.editingInvoice.quanHuyen = this.editingInvoice.quanHuyen || '';
      this.editingInvoice.phuongXa = this.editingInvoice.phuongXa || '';
      this.editingInvoice.diaChiChiTiet = this.editingInvoice.diaChiChiTiet || '';
      this.editingInvoice.tongTien = this.editingInvoice.tongTien || 0;
      this.editingInvoice.tienGiamGia = this.editingInvoice.tienGiamGia || 0;
      this.editingInvoice.thanhTien = this.editingInvoice.thanhTien || 0;
      this.editingInvoice.ghiChu = this.editingInvoice.ghiChu || '';
      this.editingInvoice.trangThai = this.editingInvoice.trangThai || 'CHO_XAC_NHAN';
      this.editingInvoice.nhanVienId = this.editingInvoice.nhanVienId || 1;
      
      // Populate địa chỉ từ dữ liệu invoice hiện tại trước
      this.populateAddressFromInvoice();
      
      // Load địa chỉ khách hàng từ database nếu có khachHangId
      if (this.editingInvoice.khachHangId) {
        this.loadCustomerAddress(this.editingInvoice.khachHangId);
      }
      
      // Debug: Kiểm tra dữ liệu sản phẩm trong hóa đơn trước khi load
      console.log('🔍 Invoice products debug before load:', {
        invoiceId: this.editingInvoice.id,
        maHoaDon: this.editingInvoice.maHoaDon,
        danhSachSanPham: this.editingInvoice.danhSachSanPham,
        danhSachSanPhamLength: this.editingInvoice.danhSachSanPham?.length || 0
      });
      
      if (this.editingInvoice.danhSachSanPham && this.editingInvoice.danhSachSanPham.length > 0) {
        console.log('📦 Detailed invoice products before load:', this.editingInvoice.danhSachSanPham.map(p => ({
          id: p.id,
          sanPhamId: p.sanPhamId,
          maSanPham: p.maSanPham,
          tenSanPham: p.tenSanPham,
          soLuong: p.soLuong,
          donGia: p.donGia,
          thanhTien: p.thanhTien
        })));
      }
      
      // Load sản phẩm đã chọn
      this.loadSelectedProducts();
      
      // Load danh sách sản phẩm để chọn
      console.log('🔄 About to load all products...');
      this.loadAllProducts();
      
      // Debug: Kiểm tra products sau khi load
      setTimeout(() => {
        console.log('🔍 All products loaded for modal:', this.allProducts);
        console.log('🔍 All products length:', this.allProducts?.length || 0);
        if (this.allProducts && this.allProducts.length > 0) {
          console.log('🔍 First product:', this.allProducts[0]);
        }
      }, 2000);
      
      // Load danh sách nhân viên
      console.log('🔄 Loading employees for update modal...');
      this.loadEmployees();
      
      // Debug: Kiểm tra employees sau khi load
      setTimeout(() => {
        console.log('🔍 Employees loaded for modal:', this.employees);
        console.log('🔍 Employees length:', this.employees?.length || 0);
        if (this.employees && this.employees.length > 0) {
          console.log('🔍 First employee:', this.employees[0]);
        }
      }, 1000);
      
      // Đảm bảo tất cả các trường có giá trị mặc định nếu chưa có
      this.editingInvoice.tenKhachHang = this.editingInvoice.tenKhachHang || '';
      this.editingInvoice.soDienThoaiKhachHang = this.editingInvoice.soDienThoaiKhachHang || '';
      this.editingInvoice.emailKhachHang = this.editingInvoice.emailKhachHang || '';
      this.editingInvoice.tinhThanh = this.editingInvoice.tinhThanh || '';
      this.editingInvoice.quanHuyen = this.editingInvoice.quanHuyen || '';
      this.editingInvoice.phuongXa = this.editingInvoice.phuongXa || '';
      this.editingInvoice.diaChiChiTiet = this.editingInvoice.diaChiChiTiet || '';
      this.editingInvoice.tongTien = Number(this.editingInvoice.tongTien) || 0;
      this.editingInvoice.tienGiamGia = Number(this.editingInvoice.tienGiamGia) || 0;
      this.editingInvoice.thanhTien = Number(this.editingInvoice.thanhTien) || 0;
      this.editingInvoice.giamGiaPhanTram = Number(this.editingInvoice.giamGiaPhanTram) || 0;
      this.editingInvoice.ghiChu = this.editingInvoice.ghiChu || '';
      this.editingInvoice.trangThai = this.editingInvoice.trangThai || 'CHO_XAC_NHAN';
      this.editingInvoice.nhanVienId = Number(this.editingInvoice.nhanVienId) || 1;
      this.editingInvoice.phuongThucThanhToan = this.editingInvoice.phuongThucThanhToan || 'Tiền Mặt';
      
      // Format ngày thanh toán nếu có
      if (this.editingInvoice.ngayThanhToan) {
        this.editingInvoice.ngayThanhToan = this.formatDateTimeForInput(this.editingInvoice.ngayThanhToan);
      }
      
      console.log('✅ Form data prepared and validated:', {
        maHoaDon: this.editingInvoice.maHoaDon,
        tenKhachHang: this.editingInvoice.tenKhachHang,
        soDienThoaiKhachHang: this.editingInvoice.soDienThoaiKhachHang,
        emailKhachHang: this.editingInvoice.emailKhachHang,
        tinhThanh: this.editingInvoice.tinhThanh,
        quanHuyen: this.editingInvoice.quanHuyen,
        phuongXa: this.editingInvoice.phuongXa,
        diaChiChiTiet: this.editingInvoice.diaChiChiTiet,
        tongTien: this.editingInvoice.tongTien,
        tienGiamGia: this.editingInvoice.tienGiamGia,
        thanhTien: this.editingInvoice.thanhTien,
        giamGiaPhanTram: this.editingInvoice.giamGiaPhanTram,
        trangThai: this.editingInvoice.trangThai,
        nhanVienId: this.editingInvoice.nhanVienId,
        phuongThucThanhToan: this.editingInvoice.phuongThucThanhToan,
        ngayThanhToan: this.editingInvoice.ngayThanhToan,
        ghiChu: this.editingInvoice.ghiChu
      });
      
      // Debug: Kiểm tra dữ liệu địa chỉ sau khi populate
      console.log('🔍 Address data after population:', {
        tinhThanh: this.editingInvoice.tinhThanh,
        quanHuyen: this.editingInvoice.quanHuyen,
        phuongXa: this.editingInvoice.phuongXa,
        diaChiChiTiet: this.editingInvoice.diaChiChiTiet,
        khachHangId: this.editingInvoice.khachHangId
      });
      
      // Trigger change detection để đảm bảo UI được cập nhật
      this.cdr.detectChanges();
    
    // Mở modal
    const modal = document.getElementById('updateInvoiceModal');
    if (modal) {
      modal.classList.add('show');
      modal.style.display = 'block';
      document.body.classList.add('modal-open');
        console.log('✅ Update modal opened successfully');
        
        // Force update UI sau khi modal mở để đảm bảo dữ liệu hiển thị
        setTimeout(() => {
          this.cdr.detectChanges();
          console.log('🔄 UI force updated after modal opened');
          
          // Debug: Kiểm tra giá trị trong DOM
          const tinhThanhInput = document.querySelector('input[name="tinhThanh"]') as HTMLInputElement;
          const quanHuyenInput = document.querySelector('input[name="quanHuyen"]') as HTMLInputElement;
          const phuongXaInput = document.querySelector('input[name="phuongXa"]') as HTMLInputElement;
          const diaChiInput = document.querySelector('textarea[name="diaChiChiTiet"]') as HTMLTextAreaElement;
          
          console.log('🔍 DOM values after modal opened:', {
            tinhThanh: tinhThanhInput?.value,
            quanHuyen: quanHuyenInput?.value,
            phuongXa: phuongXaInput?.value,
            diaChiChiTiet: diaChiInput?.value
          });
        }, 100);
      } else {
        console.error('❌ Update modal element not found');
        this.showToast('Không thể mở modal cập nhật!', 'error');
      }
      
    } catch (error) {
      console.error('❌ Error opening update modal:', error);
      this.showToast('Có lỗi xảy ra khi mở modal cập nhật: ' + error, 'error');
    }
  }

  closeUpdateModal(): void {
    // Đóng modal
    const modal = document.getElementById('updateInvoiceModal');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
      document.body.classList.remove('modal-open');
    }
    
    // Đóng modal chọn sản phẩm nếu đang mở
    const productModal = document.getElementById('productSelectionModal');
    if (productModal) {
      productModal.classList.remove('show');
      productModal.style.display = 'none';
    }
    
    // Reset editing invoice và các state
    this.editingInvoice = null;
    this.isEditMode = false;
    this.selectedProductsForUpdate = [];
    
    // Resume auto-refresh
    this.startAutoRefresh();
    
    console.log('✅ Update modal closed and returned to invoice detail view');
  }

  toggleEditMode(): void {
    if (this.isEditMode) {
      // Cancel edit mode
      this.isEditMode = false;
      this.editingInvoice = null;
      this.startAutoRefresh(); // Resume auto-refresh
    } else {
      // Enter edit mode
      this.isEditMode = true;
      this.editingInvoice = this.invoice ? { ...this.invoice } : null;
      this.stopAutoRefresh(); // Stop auto-refresh during edit
    }
  }

  cancelEdit(): void {
    // Đóng modal update nếu đang mở
    const modal = document.getElementById('updateInvoiceModal');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
      document.body.classList.remove('modal-open');
    }
    
    // Đóng modal chọn sản phẩm nếu đang mở
    const productModal = document.getElementById('productSelectionModal');
    if (productModal) {
      productModal.classList.remove('show');
      productModal.style.display = 'none';
    }
    
    // Reset tất cả state
    this.isEditMode = false;
    this.editingInvoice = null;
    this.selectedProductsForUpdate = [];
    
    // Resume auto-refresh
    this.startAutoRefresh();
    
    console.log('✅ Edit cancelled and returned to invoice detail view');
  }

  async saveChanges(): Promise<void> {
    if (this.editingInvoice && this.invoiceId) {
      // Validation
      if (!this.editingInvoice.tenKhachHang || this.editingInvoice.tenKhachHang.trim() === '') {
        this.showToast('Vui lòng nhập tên khách hàng!', 'warning');
        return;
      }

      if (!this.editingInvoice.tongTien || this.editingInvoice.tongTien <= 0) {
        this.showToast('Tổng tiền phải lớn hơn 0!', 'warning');
        return;
      }

      // Show loading state
      const saveButton = document.querySelector('.btn-success') as HTMLButtonElement;
      if (saveButton) {
        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';
      }

      try {
        // Check if customer exists, if not create new one
        let customerId = this.editingInvoice.khachHangId;
        if (this.editingInvoice.tenKhachHang && this.editingInvoice.tenKhachHang.trim() !== '') {
          customerId = await this.createCustomerIfNotExists(this.editingInvoice.tenKhachHang.trim());
          this.editingInvoice.khachHangId = customerId;
        }

        // Chuẩn hóa dữ liệu trước khi gửi
        const invoiceData = {
          ...this.editingInvoice,
          tongTien: this.editingInvoice.tongTien ? Number(this.editingInvoice.tongTien) : 0,
          tienGiamGia: this.editingInvoice.tienGiamGia ? Number(this.editingInvoice.tienGiamGia) : 0,
          thanhTien: this.editingInvoice.thanhTien ? Number(this.editingInvoice.thanhTien) : 0,
          nhanVienId: this.editingInvoice.nhanVienId ? Number(this.editingInvoice.nhanVienId) : undefined,
          khachHangId: this.editingInvoice.khachHangId ? Number(this.editingInvoice.khachHangId) : undefined,
          // Chuẩn hóa định dạng ngày tháng
          ngayThanhToan: this.editingInvoice.ngayThanhToan ? this.formatDateTimeForAPI(this.editingInvoice.ngayThanhToan) : undefined,
          ngayTao: this.editingInvoice.ngayTao ? this.formatDateTimeForAPI(this.editingInvoice.ngayTao) : undefined
        };

        console.log('Sending invoice data:', invoiceData);

        this.hoaDonService.updateHoaDonNew(this.invoiceId, invoiceData).subscribe({
          next: (updatedInvoice: any) => {
            this.invoice = updatedInvoice;
            this.isEditMode = false;
            this.editingInvoice = null;
            this.startAutoRefresh(); // Resume auto-refresh

            // Reload customer information
            if (customerId) {
              this.loadCustomerInfo(customerId);
            }

            this.showToast('Cập nhật hóa đơn thành công!', 'success');
          },
          error: (error: any) => {
            console.error('Error updating invoice:', error);
            this.showToast('Lỗi khi cập nhật hóa đơn: ' + (error.error?.message || error.message), 'error');
          },
          complete: () => {
            // Reset button state
            if (saveButton) {
              saveButton.disabled = false;
              saveButton.innerHTML = '<i class="fas fa-save"></i> Lưu thay đổi';
            }
          }
        });
      } catch (error) {
        console.error('Error creating customer:', error);
        this.showToast('Lỗi khi tạo khách hàng: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');

        // Reset button state
        if (saveButton) {
          saveButton.disabled = false;
          saveButton.innerHTML = '<i class="fas fa-save"></i> Lưu thay đổi';
        }
      }
    }
  }

  async createCustomerIfNotExists(customerName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      // First, search for existing customer by name
      this.hoaDonService.searchCustomerByName(customerName).subscribe({
        next: (customers) => {
          if (customers && customers.length > 0) {
            // Customer exists, return the first match
            console.log('Customer found:', customers[0]);
            resolve(customers[0].id);
          } else {
            // Customer doesn't exist, create new one
            const newCustomer = {
              tenKhachHang: customerName,
              email: `${customerName.toLowerCase().replace(/\s+/g, '')}@example.com`,
              soDienThoai: 'Chưa có',
              gioiTinh: true,
              ngaySinh: new Date().toISOString().split('T')[0],
              diemTichLuy: 0,
              ngayTao: new Date().toISOString().split('T')[0],
              trangThai: true
            };

            this.hoaDonService.createCustomer(newCustomer).subscribe({
              next: (createdCustomer) => {
                console.log('New customer created:', createdCustomer);
                resolve(createdCustomer.id);
              },
              error: (error) => {
                console.error('Error creating customer:', error);
                reject(error);
              }
            });
          }
        },
        error: (error) => {
          console.error('Error searching customer:', error);
          reject(error);
        }
      });
    });
  }

  loadCustomerInfo(customerId: number): void {
    this.hoaDonService.getCustomerById(customerId).subscribe({
      next: (customer) => {
        this.customer = customer;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading customer info:', error);
        this.customer = null;
      }
    });
  }

  getCurrentStatusIndex(): number {
    if (!this.invoice) return 0;
    
    const status = this.invoice.trangThai;
    
    // Mapping các trạng thái với 5 giai đoạn như hình ảnh
    const statusMapping: { [key: string]: number } = {
      'CHO_XAC_NHAN': 0,
      'DA_XAC_NHAN': 1,
      'DANG_GIAO_HANG': 2,
      'DA_GIAO_HANG': 3,
      'HUY': 4 // Trạng thái "Hủy" là giai đoạn cuối cùng
    };
    
    return statusMapping[status] || 0;
  }

  getProgressPercentage(): number {
    const currentIndex = this.getCurrentStatusIndex();
    
    // Tính phần trăm dựa trên 5 giai đoạn
    return ((currentIndex + 1) / 5) * 100;
  }

  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'CHO_XAC_NHAN': 'status-pending',
      'DA_XAC_NHAN': 'status-confirmed',
      'DANG_GIAO_HANG': 'status-shipping',
      'DA_GIAO_HANG': 'status-delivered',
      'HUY': 'status-cancelled'
    };
    return statusMap[status] || 'status-unknown';
  }

  getStatusIcon(status: string): string {
    const statusMap: { [key: string]: string } = {
      'CHO_XAC_NHAN': 'fas fa-clock',
      'DA_XAC_NHAN': 'fas fa-check-circle',
      'DANG_GIAO_HANG': 'fas fa-truck',
      'DA_GIAO_HANG': 'fas fa-box-open',
      'HUY': 'fas fa-times-circle'
    };
    return statusMap[status] || 'fas fa-question-circle';
  }

  getStatusDescription(status: string): string {
    const statusMap: { [key: string]: string } = {
      'CHO_XAC_NHAN': 'Đơn hàng đang chờ xác nhận từ cửa hàng',
      'DA_XAC_NHAN': 'Đơn hàng đã được xác nhận và đang được xử lý',
      'DANG_GIAO_HANG': 'Đơn hàng đang được vận chuyển đến bạn',
      'DA_GIAO_HANG': 'Đơn hàng đã được giao thành công',
      'HUY': 'Đơn hàng đã bị hủy và không được xử lý'
    };
    return statusMap[status] || 'Trạng thái không xác định';
  }

  getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'CHO_XAC_NHAN': 'Chờ xác nhận',
      'DA_XAC_NHAN': 'Đã xác nhận',
      'DANG_GIAO_HANG': 'Đang giao hàng',
      'DA_GIAO_HANG': 'Đã giao hàng',
      'HUY': 'Hủy'
    };
    return statusMap[status] || status;
  }

  formatDate(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }

  /**
   * Format datetime cho input datetime-local
   */
  formatDateTimeForInput(dateTime: string | Date): string {
    if (!dateTime) return '';
    
    let date: Date;
    if (typeof dateTime === 'string') {
      date = new Date(dateTime);
    } else {
      date = dateTime;
    }
    
    // Format thành YYYY-MM-DDTHH:mm để tương thích với datetime-local input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  formatDateTimeForAPI(dateTime: string): string | undefined {
    if (!dateTime) return undefined;
    // Chuyển đổi từ datetime-local format sang ISO string
    const date = new Date(dateTime);
    return date.toISOString();
  }

  printInvoice(): void {
    if (!this.invoice) {
      console.error('Không có dữ liệu hóa đơn để in');
      this.showToast('Không có dữ liệu hóa đơn để in', 'error');
      return;
    }

    this.isPrinting = true;

    try {
      // Tạo nội dung hóa đơn đẹp
      const printContent = this.generateInvoiceContent();
      
      // Tạo cửa sổ mới để in
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Đợi một chút để đảm bảo nội dung được load
        setTimeout(() => {
          try {
            printWindow.print();
            this.showToast('Hóa đơn đã được gửi đến máy in', 'success');
          } catch (printError) {
            console.error('Lỗi khi in:', printError);
            this.showToast('Có lỗi xảy ra khi in hóa đơn', 'error');
          } finally {
            // Đóng cửa sổ sau khi in
            setTimeout(() => {
              printWindow.close();
              this.isPrinting = false;
            }, 1000);
          }
        }, 500);
      } else {
        this.isPrinting = false;
        this.showToast('Không thể mở cửa sổ in. Vui lòng kiểm tra popup blocker.', 'error');
      }
    } catch (error) {
      console.error('Lỗi khi tạo hóa đơn:', error);
      this.isPrinting = false;
      this.showToast('Có lỗi xảy ra khi tạo hóa đơn', 'error');
    }
  }

  private generateInvoiceContent(): string {
    if (!this.invoice) return '';

    const currentDate = new Date().toLocaleDateString('vi-VN');
    const invoiceDate = this.invoice.ngayTao ? new Date(this.invoice.ngayTao).toLocaleDateString('vi-VN') : currentDate;
    
    // Tính tổng tiền
    const totalAmount = this.invoice.danhSachSanPham?.reduce((sum, item) => {
      return sum + (item.soLuong * item.donGia);
    }, 0) || 0;

    // Tính tổng giảm giá
    const totalDiscount = this.invoice.danhSachSanPham?.reduce((sum, item) => {
      const discountAmount = (item.soLuong * item.donGia * (this.invoice?.giamGiaPhanTram || 0)) / 100;
      return sum + discountAmount;
    }, 0) || 0;

    // Tính tổng thanh toán
    const finalAmount = totalAmount - totalDiscount;

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hóa đơn ${this.invoice.maHoaDon}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            font-size: 14px;
            line-height: 1.4;
            color: #000;
            background: #fff;
        }
        
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 30px;
            background: #fff;
            border: 1px solid #000;
        }
        
        .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
        }
        
        .invoice-title {
            font-size: 48px;
            font-weight: bold;
            color: #000;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        
        .company-info {
            text-align: right;
            font-size: 14px;
            line-height: 1.6;
        }
        
        .company-name {
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 5px;
        }
        
        .invoice-details-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
        }
        
        .bill-to-section {
            flex: 1;
        }
        
        .bill-to-title {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 10px;
            text-transform: uppercase;
        }
        
        .customer-details {
            font-size: 14px;
            line-height: 1.6;
        }
        
        .invoice-details {
            text-align: right;
            font-size: 14px;
            line-height: 1.6;
        }
        
        .invoice-detail-row {
            margin-bottom: 5px;
        }
        
        .invoice-detail-label {
            font-weight: bold;
        }
        
        .products-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        
        .products-table th {
            font-weight: bold;
            font-size: 14px;
            text-align: left;
            padding: 15px 0;
            border-bottom: 1px solid #000;
        }
        
        .products-table th:nth-child(2),
        .products-table th:nth-child(3),
        .products-table th:nth-child(4) {
            text-align: right;
        }
        
        .products-table td {
            font-size: 14px;
            padding: 10px 0;
            border-bottom: 1px solid #ccc;
        }
        
        .products-table td:nth-child(2),
        .products-table td:nth-child(3),
        .products-table td:nth-child(4) {
            text-align: right;
        }
        
        .summary-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 40px;
        }
        
        .summary-table {
            width: 300px;
        }
        
        .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 14px;
        }
        
        .summary-label {
            font-weight: bold;
        }
        
        .summary-value {
            font-weight: bold;
        }
        
        .total-row {
            border-top: 2px solid #000;
            margin-top: 10px;
            padding-top: 15px;
            font-size: 16px;
        }
        
        .notes-section {
            margin-top: 40px;
        }
        
        .notes-title {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 10px;
        }
        
        .notes-content {
            font-size: 14px;
            line-height: 1.6;
        }
        
        @media print {
            body {
                margin: 0;
                padding: 0;
            }
            
            .invoice-container {
                margin: 0;
                padding: 20px;
                max-width: none;
                border: 1px solid #000;
            }
            
            .invoice-title {
                font-size: 40px;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- Header -->
        <div class="invoice-header">
            <div class="invoice-title">Hóa đơn</div>
            <div class="company-info">
                <div class="company-name">Cửa hàng mũ bảo hiểm</div>
                <div>123 Đường ABC, Quận XYZ</div>
                <div>TP. Hồ Chí Minh</div>
                <div>(028) 1234-5678</div>
                <div>info@muhoi.com</div>
            </div>
        </div>

        <!-- Invoice Details Section -->
        <div class="invoice-details-section">
            <div class="bill-to-section">
                <div class="bill-to-title">Gửi đến</div>
                <div class="customer-details">
                    <div>${this.invoice.tenKhachHang}</div>
                    <div>${this.invoice.diaChiChiTiet || 'N/A'}</div>
                    <div>${this.invoice.tinhThanh || ''} ${this.invoice.quanHuyen || ''}</div>
                    <div>${this.invoice.soDienThoaiKhachHang || 'N/A'}</div>
                    <div>${this.invoice.emailKhachHang || 'N/A'}</div>
                </div>
            </div>
            
            <div class="invoice-details">
                <div class="invoice-detail-row">
                    <span class="invoice-detail-label">Số hóa đơn:</span> ${this.invoice.maHoaDon}
                </div>
                <div class="invoice-detail-row">
                    <span class="invoice-detail-label">Ngày hóa đơn:</span> ${invoiceDate}
                </div>
                <div class="invoice-detail-row">
                    <span class="invoice-detail-label">Ngày đến hạn:</span> ${invoiceDate}
                </div>
                <div class="invoice-detail-row">
                    <span class="invoice-detail-label">Nhân viên:</span> ${this.invoice.tenNhanVien || 'N/A'}
                </div>
                <div class="invoice-detail-row">
                    <span class="invoice-detail-label">Trạng thái:</span> ${this.getStatusText(this.invoice.trangThai)}
                </div>
            </div>
        </div>

        <!-- Products Table -->
        <table class="products-table">
            <thead>
                <tr>
                    <th style="width: 50%;">Mô tả</th>
                    <th style="width: 15%;">Số lượng</th>
                    <th style="width: 20%;">Đơn giá</th>
                    <th style="width: 15%;">Thành tiền</th>
                </tr>
            </thead>
            <tbody>
                ${this.invoice.danhSachSanPham?.map((item, index) => `
                    <tr>
                        <td>${item.tenSanPham}${this.invoice?.giamGiaPhanTram && this.invoice.giamGiaPhanTram > 0 ? ` (Giảm ${this.invoice.giamGiaPhanTram}%)` : ''}</td>
                        <td>${item.soLuong}</td>
                        <td>${this.formatCurrency(item.donGia)}</td>
                        <td>${this.formatCurrency(item.soLuong * item.donGia * (1 - (this.invoice?.giamGiaPhanTram || 0) / 100))}</td>
                    </tr>
                `).join('') || '<tr><td colspan="4" style="text-align: center;">Không có sản phẩm</td></tr>'}
            </tbody>
        </table>

        <!-- Summary Section -->
        <div class="summary-section">
            <div class="summary-table">
                <div class="summary-row">
                    <span class="summary-label">Tổng tiền hàng:</span>
                    <span class="summary-value">${this.formatCurrency(totalAmount)}</span>
                </div>
                ${totalDiscount > 0 ? `
                <div class="summary-row">
                    <span class="summary-label">Giảm giá:</span>
                    <span class="summary-value">-${this.formatCurrency(totalDiscount)}</span>
                </div>
                ` : ''}
                <div class="summary-row total-row">
                    <span class="summary-label">Tổng cộng:</span>
                    <span class="summary-value">${this.formatCurrency(finalAmount)}</span>
                </div>
            </div>
        </div>

        <!-- Payment Info -->
        <div class="notes-section">
            <div class="notes-title">Thông tin thanh toán:</div>
            <div class="notes-content">
                Phương thức thanh toán: ${this.invoice.phuongThucThanhToan || 'Tiền mặt'}<br>
                Trạng thái thanh toán: ${this.getPaymentStatusText(this.invoice.ngayThanhToan ? 'DA_THANH_TOAN' : 'CHUA_THANH_TOAN')}
            </div>
        </div>

        <!-- Thank You -->
        <div class="notes-section">
            <div class="notes-title">Ghi chú:</div>
            <div class="notes-content">
                Cảm ơn quý khách đã mua hàng!<br>
                Hẹn gặp lại quý khách lần sau!
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  private showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): void {
    // Tạo toast notification đơn giản
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
      </div>
    `;
    
    // Thêm styles
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
      animation: slideInRight 0.3s ease-out;
    `;
    
    // Thêm animation keyframes
    if (!document.getElementById('toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = `
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    // Tự động xóa sau 3 giây
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  private getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'CHO_XAC_NHAN': 'Chờ xác nhận',
      'DA_XAC_NHAN': 'Đã xác nhận',
      'DANG_GIAO_HANG': 'Đang giao hàng',
      'DA_GIAO_HANG': 'Đã giao hàng',
      'DA_HUY': 'Đã hủy'
    };
    return statusMap[status] || status;
  }

  private getPaymentStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'CHO_THANH_TOAN': 'Chờ thanh toán',
      'DA_THANH_TOAN': 'Đã thanh toán',
      'THANH_TOAN_THAT_BAI': 'Thanh toán thất bại'
    };
    return statusMap[status] || 'Chưa xác định';
  }

  /**
   * Load địa chỉ khách hàng
   */
  loadCustomerAddress(khachHangId: number): void {
    console.log('📍 Loading customer addresses for ID:', khachHangId);
    
    this.customerAddressService.getAddressesByCustomerId(khachHangId).subscribe({
      next: (addresses) => {
        console.log('✅ Customer addresses loaded:', addresses);
        this.customerAddresses = addresses;
        
        // Chỉ populate địa chỉ nếu các trường địa chỉ hiện tại đang trống
        if (addresses && addresses.length > 0) {
          this.selectedAddressId = addresses[0].id || null;
          
          // Chỉ populate nếu các trường địa chỉ chưa có dữ liệu
          const hasEmptyAddress = !this.editingInvoice?.tinhThanh || 
                                 !this.editingInvoice?.quanHuyen || 
                                 !this.editingInvoice?.phuongXa || 
                                 !this.editingInvoice?.diaChiChiTiet;
          
          if (hasEmptyAddress) {
            console.log('📍 Populating address from database (fields were empty)');
          this.populateAddressFields(addresses[0]);
          } else {
            console.log('📍 Address fields already populated from invoice, skipping database population');
        }
        }
        
        // Trigger change detection để cập nhật UI
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error loading customer addresses:', error);
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Populate địa chỉ vào các input fields
   */
  populateAddressFields(address: any): void {
    if (this.editingInvoice) {
      this.editingInvoice.tinhThanh = address.tinhThanh || '';
      this.editingInvoice.quanHuyen = address.quanHuyen || '';
      this.editingInvoice.phuongXa = address.phuongXa || '';
      this.editingInvoice.diaChiChiTiet = address.diaChi || '';
      this.editingInvoice.diaChiGiaoHang = `${address.diaChi}, ${address.phuongXa}, ${address.quanHuyen}, ${address.tinhThanh}`;
      
      console.log('📍 Address fields populated:', {
        tinhThanh: this.editingInvoice.tinhThanh,
        quanHuyen: this.editingInvoice.quanHuyen,
        phuongXa: this.editingInvoice.phuongXa,
        diaChiChiTiet: this.editingInvoice.diaChiChiTiet
      });
      
      // Trigger change detection để cập nhật UI
      this.cdr.detectChanges();
    }
  }

  /**
   * Load sản phẩm đã chọn từ hóa đơn hiện tại
   */
  loadSelectedProducts(): void {
    if (this.editingInvoice && this.editingInvoice.danhSachSanPham) {
      console.log('🛍️ Loading selected products from invoice:', this.editingInvoice.danhSachSanPham);
      
      // Map dữ liệu sản phẩm từ invoice để đảm bảo cấu trúc đúng
      this.selectedProductsForUpdate = this.editingInvoice.danhSachSanPham.map(invoiceProduct => ({
        id: invoiceProduct.sanPhamId || invoiceProduct.id,
        tenSanPham: invoiceProduct.tenSanPham,
        maSanPham: invoiceProduct.maSanPham,
        giaBan: invoiceProduct.donGia || 0,
        soLuongTon: 0, // Không có trong invoice product
        soLuong: invoiceProduct.soLuong || 1,
        donGia: invoiceProduct.donGia || 0,
        thanhTien: invoiceProduct.thanhTien || (invoiceProduct.soLuong || 1) * (invoiceProduct.donGia || 0),
        danhMuc: 'Chưa phân loại', // Không có trong invoice product
        thuongHieu: 'Chưa có', // Không có trong invoice product
        moTa: '', // Không có trong invoice product
        trangThai: true // Không có trong invoice product
      }));
      
      console.log('✅ Selected products mapped and loaded:', this.selectedProductsForUpdate);
      console.log('🔍 Product IDs in selectedProductsForUpdate:', this.selectedProductsForUpdate.map(p => ({ id: p.id, tenSanPham: p.tenSanPham, maSanPham: p.maSanPham })));
    } else {
      console.log('📝 No products in invoice to load');
      this.selectedProductsForUpdate = [];
    }
  }

  /**
   * Load danh sách nhân viên (chỉ hiển thị nhân viên có trạng thái true)
   */
  loadEmployees(): void {
    console.log('🔄 Loading active employees for invoice...');
    
    // Sử dụng method getEmployeesForInvoice() đã được thiết kế để lấy nhân viên đang hoạt động
    this.employeeService.getEmployeesForInvoice().subscribe({
      next: (employees: any[]) => {
        console.log('✅ Active employees loaded for invoice:', employees);
        
        // Không cần filter thêm vì getEmployeesForInvoice() đã filter rồi
        this.employees = employees || [];
        
        console.log('✅ Employees ready for dropdown:', this.employees);
        console.log('🔍 Employee details:', this.employees.map(emp => ({ 
          id: emp.id,
          tenNhanVien: emp.tenNhanVien, 
          maNhanVien: emp.maNhanVien,
          trangThai: emp.trangThai
        })));
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('❌ Error loading employees for invoice:', error);
        // Fallback: thử getAllEmployees() và filter thủ công
        console.log('🔄 Fallback: trying getAllEmployees()...');
        this.employeeService.getAllEmployees().subscribe({
          next: (allEmployees: any[]) => {
            console.log('✅ All employees loaded (fallback):', allEmployees);
            
            // Lọc chỉ nhân viên có trạng thái ACTIVE (string) hoặc true (boolean)
            this.employees = (allEmployees || []).filter(employee => 
              employee.trangThai === 'ACTIVE' || employee.trangThai === true
            );
            
            console.log('✅ Active employees filtered (fallback):', this.employees);
            this.cdr.detectChanges();
          },
          error: (fallbackError: any) => {
            console.error('❌ Fallback also failed:', fallbackError);
            this.employees = [];
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  /**
   * Load tất cả sản phẩm để chọn từ database
   */
  loadAllProducts(): void {
    console.log('🔄 Loading all products from database...');
    console.log('🔍 ProductApiService available:', !!this.productApi);
    
    // Fallback: thử trực tiếp với HttpClient nếu ProductApiService có vấn đề
    if (!this.productApi) {
      console.warn('⚠️ ProductApiService not available, using fallback method');
      this.loadAllProductsFallback();
      return;
    }
    
    // Sử dụng ChiTietSanPham API thay vì SanPham API
    this.chiTietSanPhamService.getAll().pipe(
      timeout(4000),
      catchError(() => of([]))
    ).subscribe({
      next: (chiTietProducts: any[]) => {
        console.log('✅ ChiTietSanPham loaded from API:', chiTietProducts);
        console.log('📊 Products count:', chiTietProducts.length);
        
        // Map ChiTietSanPhamResponse to match frontend expected format
        this.allProducts = chiTietProducts.map((product: any) => ({
          id: product.id, // Đây là chiTietSanPhamId - ID chính xác cần dùng
          chiTietSanPhamId: product.id, // Đảm bảo có chiTietSanPhamId
          sanPhamId: product.sanPhamId, // ID của SanPham gốc
          tenSanPham: product.sanPhamTen || 'Chưa có tên',
          giaBan: parseFloat(product.giaBan || '0'),
          donGia: parseFloat(product.giaBan || '0'), // Map giaBan to donGia for compatibility
          soLuongTon: parseInt(product.soLuongTon || '0', 10),
          maSanPham: `SP${product.sanPhamId?.toString().padStart(3, '0') || '000'}`,
          trangThai: product.trangThai,
          // Thông tin chi tiết
          kichThuoc: product.kichThuocTen || '',
          mauSac: product.mauSacTen || '',
          mauSacMa: product.mauSacMa || '',
          trongLuong: product.trongLuongTen || '',
          anhSanPham: product.anhSanPham || '',
          // Thông tin sản phẩm gốc (sẽ load thêm nếu cần)
          danhMuc: '',
          thuongHieu: '',
          moTa: '',
          chatLieuVo: '',
          xuatXu: '',
          kieuDangMu: '',
          congNgheAnToan: ''
        }));
        
        console.log('🛍️ All ChiTietSanPham processed:', this.allProducts);
        console.log('📊 Total products loaded:', this.allProducts.length);
        console.log('📊 First product:', this.allProducts[0]);
        
        // Force UI update
        this.loadingProducts = false;
        this.cdr.detectChanges();
        console.log('🔄 UI updated after loading ChiTietSanPham');
      },
      error: (error: any) => {
        console.error('❌ Error loading ChiTietSanPham, falling back to SanPham:', error);
        console.error('❌ Error details:', error.message);
        console.error('❌ Error status:', error.status);
        console.log('🔄 Trying fallback method...');
        this.loadAllProductsFallback();
      }
    });
  }

  /**
   * Fallback method để load sản phẩm trực tiếp từ API
   */
  loadAllProductsFallback(): void {
    console.log('🔄 Using fallback method to load products...');
    
    // Sử dụng hoaDonService.getAllSanPham() làm fallback
    this.hoaDonService.getAllSanPham().subscribe({
      next: (products: any[]) => {
        console.log('✅ Products loaded via fallback:', products);
        
        this.allProducts = products.map((product: any) => ({
          id: product.id,
          tenSanPham: product.tenSanPham,
          giaBan: product.giaBan || 0,
          soLuongTon: product.soLuongTon || 0,
          maSanPham: product.maSanPham,
          danhMuc: product.loaiMuBaoHiemTen || 'Chưa phân loại',
          thuongHieu: product.nhaSanXuatTen || 'Chưa có',
          moTa: product.moTa,
          trangThai: product.trangThai,
          anhSanPham: product.anhSanPham,
          chatLieuVo: product.chatLieuVoTen || 'Chưa có',
          trongLuong: product.trongLuongTen || 'Chưa có',
          xuatXu: product.xuatXuTen || 'Chưa có',
          kieuDangMu: product.kieuDangMuTen || 'Chưa có',
          congNgheAnToan: product.congNgheAnToanTen || 'Chưa có',
          mauSac: product.mauSacTen || 'Chưa có'
        }));
        
        console.log('🛍️ Fallback products processed:', this.allProducts);
        this.loadingProducts = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('❌ Fallback also failed:', error);
        this.allProducts = [];
        this.loadingProducts = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Kiểm tra sản phẩm đã được chọn
   */

  /**
   * Mở modal chọn sản phẩm - FIX: Reset hoàn toàn selectedProductsForUpdate
   */
  async openProductModal(): Promise<void> {
    console.log('🚀 Opening product selection modal...');
    console.log('🔍 Current selectedProductsForUpdate before reset:', this.selectedProductsForUpdate);
    
    this.loadingProducts = true;
    
    // FIX: Reset hoàn toàn selectedProductsForUpdate ngay từ đầu
    this.selectedProductsForUpdate = [];
    console.log('🔄 Reset selectedProductsForUpdate to empty array IMMEDIATELY');

    // Open the modal immediately (shows spinner), then fetch data
    const modal = document.getElementById('productSelectionModal');
    if (modal) {
      const updateModal = document.getElementById('updateInvoiceModal');
      if (updateModal) {
        updateModal.style.zIndex = '1040';
      }
      let backdrop = document.getElementById('product-modal-backdrop');
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'product-modal-backdrop';
        backdrop.className = 'modal-backdrop fade show';
        backdrop.style.zIndex = '1050';
        document.body.appendChild(backdrop);
      }
      modal.classList.add('show');
      modal.style.display = 'block';
      modal.style.zIndex = '1060';
      document.body.classList.add('modal-open');
    }

    try {
      // 1) Tải toàn bộ danh sách ChiTietSanPham thay vì SanPham
        const chiTietProducts = await firstValueFrom(
          this.chiTietSanPhamService.getAll().pipe(
            timeout(5000),
            catchError(() => of([]))
          )
        );
        
        // Map ChiTietSanPhamResponse to match frontend expected format
        this.allProducts = chiTietProducts.map((product: any) => ({
          id: product.id, // Đây là chiTietSanPhamId - ID chính xác cần dùng
          chiTietSanPhamId: product.id, // Đảm bảo có chiTietSanPhamId
          sanPhamId: product.sanPhamId, // ID của SanPham gốc
          tenSanPham: product.sanPhamTen || 'Chưa có tên',
          giaBan: parseFloat(product.giaBan || '0'),
          donGia: parseFloat(product.giaBan || '0'), // Map giaBan to donGia for compatibility
          soLuongTon: parseInt(product.soLuongTon || '0', 10),
          maSanPham: `SP${product.sanPhamId?.toString().padStart(3, '0') || '000'}`,
          trangThai: product.trangThai,
          // Thông tin chi tiết
          kichThuoc: product.kichThuocTen || '',
          mauSac: product.mauSacTen || '',
          mauSacMa: product.mauSacMa || '',
          trongLuong: product.trongLuongTen || '',
          anhSanPham: product.anhSanPham || '',
          // Thông tin sản phẩm gốc
          danhMuc: '',
          thuongHieu: '',
          moTa: ''
        }));
      console.log('✅ ChiTietSanPham loaded for modal:', this.allProducts);
      console.log('🔍 Debug - All products IDs:', this.allProducts.map(p => p.id));
      console.log('🔍 Debug - Product with ID=6:', this.allProducts.find(p => Number(p.id) === 6));

      // 2) Lấy danh sách sản phẩm đã chọn của hóa đơn hiện tại
      let selectedFromInvoice: any[] = [];
      if (this.editingInvoice && this.editingInvoice.danhSachSanPham) {
        selectedFromInvoice = [...this.editingInvoice.danhSachSanPham];
        console.log('📋 Current invoice products:', selectedFromInvoice);
        console.log('🔍 Invoice product structure:', selectedFromInvoice.map(p => ({
          id: p.id,
          sanPhamId: p.sanPhamId,
          tenSanPham: p.tenSanPham,
          maSanPham: p.maSanPham
        })));
      }
      
      // Debug: Kiểm tra dữ liệu invoice
      console.log('🔍 Debug - editingInvoice:', {
        id: this.editingInvoice?.id,
        maHoaDon: this.editingInvoice?.maHoaDon,
        danhSachSanPham: this.editingInvoice?.danhSachSanPham,
        danhSachSanPhamLength: this.editingInvoice?.danhSachSanPham?.length || 0
      });

      // 3) Pre-select theo danh sách đã lưu trong hóa đơn (KHÔNG reset nữa vì đã reset ở đầu)
      console.log('🔄 About to pre-select products from invoice...');
      console.log('🔍 Current selectedProductsForUpdate before pre-selection:', this.selectedProductsForUpdate);
      
      if (selectedFromInvoice.length > 0) {
        console.log('🔄 Pre-selecting products from current invoice...');
        console.log('📦 Invoice products to pre-select:', selectedFromInvoice);
        
        // DEBUG: Kiểm tra xem có sản phẩm ID = 6 không
        const productWithId6 = selectedFromInvoice.find(p => Number(p.sanPhamId) === 6 || Number(p.id) === 6);
        if (productWithId6) {
          console.log('🚨 FOUND PRODUCT WITH ID = 6 in invoice:', productWithId6);
        } else {
          console.log('✅ No product with ID = 6 found in invoice products');
        }
        
        selectedFromInvoice.forEach(invoiceProduct => {
          console.log(`🔍 Processing invoice product:`, invoiceProduct);
          console.log(`🔍 Looking for product with:`, {
            id: invoiceProduct.id,
            sanPhamId: invoiceProduct.sanPhamId,
            maSanPham: invoiceProduct.maSanPham,
            tenSanPham: invoiceProduct.tenSanPham
          });
          
          // DEBUG: Kiểm tra xem có phải sản phẩm ID = 3 không
          if (Number(invoiceProduct.id) === 3 || Number(invoiceProduct.sanPhamId) === 3) {
            console.log('🚨 PROCESSING PRODUCT ID = 3:', invoiceProduct);
          }
          
          // DEBUG: Kiểm tra xem có phải sản phẩm ID = 6 không
          if (Number(invoiceProduct.id) === 6 || Number(invoiceProduct.sanPhamId) === 6) {
            console.log('🚨 PROCESSING PRODUCT ID = 6:', invoiceProduct);
          }
          
          // Tìm sản phẩm theo ID chính xác - FIX: Ưu tiên id trước sanPhamId
          let foundProduct = null;
          let matchMethod = '';
          
          // Cách 1: Tìm theo id trước (ID của sản phẩm trong bảng SanPham)
          if (invoiceProduct.id) {
            console.log(`🔍 Searching by id: ${invoiceProduct.id}`);
            foundProduct = this.allProducts.find(p => Number(p.id) === Number(invoiceProduct.id));
          if (foundProduct) {
              matchMethod = 'id';
              console.log(`✅ Found by id: ${invoiceProduct.id} -> Product ID: ${foundProduct.id}`);
            } else {
              console.log(`❌ Not found by id: ${invoiceProduct.id}`);
            }
          }
          
          // Cách 2: Tìm theo sanPhamId (nếu id không tìm thấy)
          if (!foundProduct && invoiceProduct.sanPhamId) {
            console.log(`🔍 Searching by sanPhamId: ${invoiceProduct.sanPhamId}`);
            foundProduct = this.allProducts.find(p => Number(p.id) === Number(invoiceProduct.sanPhamId));
            if (foundProduct) {
              matchMethod = 'sanPhamId';
              console.log(`✅ Found by sanPhamId: ${invoiceProduct.sanPhamId} -> Product ID: ${foundProduct.id}`);
            } else {
              console.log(`❌ Not found by sanPhamId: ${invoiceProduct.sanPhamId}`);
            }
          }
          
          // Cách 3: Tìm theo maSanPham (mã sản phẩm)
          if (!foundProduct && invoiceProduct.maSanPham) {
            foundProduct = this.allProducts.find(p => p.maSanPham === invoiceProduct.maSanPham);
            if (foundProduct) {
              matchMethod = 'maSanPham';
              console.log(`✅ Found by maSanPham: ${invoiceProduct.maSanPham} -> Product ID: ${foundProduct.id}`);
            }
          }
          
          // Cách 4: Tìm theo tên sản phẩm (fallback)
          if (!foundProduct && invoiceProduct.tenSanPham) {
            foundProduct = this.allProducts.find(p => p.tenSanPham === invoiceProduct.tenSanPham);
            if (foundProduct) {
              matchMethod = 'tenSanPham';
              console.log(`✅ Found by tenSanPham: ${invoiceProduct.tenSanPham} -> Product ID: ${foundProduct.id}`);
            }
          }
          
          if (foundProduct) {
            console.log(`🔍 Creating preSelectedProduct for: ${foundProduct.tenSanPham} (ID: ${foundProduct.id})`);
            console.log(`🔍 Found product details:`, foundProduct);
            console.log(`🔍 Invoice product details:`, invoiceProduct);
            
            const preSelectedProduct = {
              ...foundProduct,
              soLuong: Number(invoiceProduct.soLuong) || 1,
              donGia: Number(invoiceProduct.donGia) || Number(foundProduct.giaBan),
              thanhTien: (Number(invoiceProduct.soLuong) || 1) * (Number(invoiceProduct.donGia) || Number(foundProduct.giaBan))
            };
            
            console.log(`🔍 PreSelectedProduct created:`, preSelectedProduct);
            this.selectedProductsForUpdate.push(preSelectedProduct);
            console.log(`✅ Pre-selected: ${foundProduct.tenSanPham} (ID: ${foundProduct.id}, Method: ${matchMethod}, Qty: ${preSelectedProduct.soLuong}, Price: ${preSelectedProduct.donGia})`);
          } else {
            console.warn(`❌ Product not found: ${invoiceProduct.tenSanPham || 'Unknown'} (sanPhamId: ${invoiceProduct.sanPhamId}, id: ${invoiceProduct.id}, maSanPham: ${invoiceProduct.maSanPham})`);
            console.log(`📋 Available products:`, this.allProducts.map(p => ({ id: p.id, maSanPham: p.maSanPham, tenSanPham: p.tenSanPham })));
          }
        });
        
        console.log('🎯 Final selected products for update:', this.selectedProductsForUpdate);
        console.log('🎯 Final selectedProductsForUpdate IDs:', this.selectedProductsForUpdate.map(p => p.id));
      } else {
        console.log('📝 No products in current invoice to pre-select');
        console.log('🎯 selectedProductsForUpdate after no pre-selection:', this.selectedProductsForUpdate);
      }
    } catch (err) {
      console.error('❌ Failed to load products:', err);
      this.allProducts = [];
    } finally {
      this.loadingProducts = false;
      console.log('🛒 Modal opened with pre-selected products:', this.selectedProductsForUpdate);
      
      // Force update UI sau khi pre-select
      setTimeout(() => {
        this.cdr.detectChanges();
        console.log('🔄 UI updated after pre-selection');
        console.log('🔍 Debug - isProductSelected check for first product:', this.allProducts.length > 0 ? this.isProductSelected(this.allProducts[0]) : 'No products');
        
        // Debug: Kiểm tra tất cả sản phẩm
        console.log('🔍 Debug - Checking all products selection status:');
        this.allProducts.forEach(product => {
          const isSelected = this.isProductSelected(product);
          const quantity = this.getSelectedProductQuantity(product);
          console.log(`  - ${product.tenSanPham} (ID: ${product.id}): Selected=${isSelected}, Qty=${quantity}`);
        });
        
        // Debug: Kiểm tra tại sao sản phẩm ID=6 luôn được tích
        const productId6 = this.allProducts.find(p => Number(p.id) === 6);
        if (productId6) {
          console.log('🔍 Debug - Product ID=6 details:', productId6);
          console.log('🔍 Debug - Is product ID=6 selected?', this.isProductSelected(productId6));
          console.log('🔍 Debug - selectedProductsForUpdate contains ID=6?', this.selectedProductsForUpdate.some(p => Number(p.id) === 6));
        }
        
        // Debug: Kiểm tra tất cả sản phẩm được chọn
        console.log('🔍 Debug - All selected products:', this.selectedProductsForUpdate.map(p => ({
          id: p.id,
          tenSanPham: p.tenSanPham,
          maSanPham: p.maSanPham,
          soLuong: p.soLuong
        })));
        
        // Debug: Kiểm tra tại sao có sản phẩm được chọn mặc định
        console.log('🔍 Debug - Why are products pre-selected?');
        console.log('🔍 Debug - editingInvoice.danhSachSanPham:', this.editingInvoice?.danhSachSanPham);
        console.log('🔍 Debug - selectedProductsForUpdate length:', this.selectedProductsForUpdate.length);
      }, 100);
    }
  }

  /**
   * Kiểm tra xem sản phẩm có được chọn không - cải thiện logic
   */
  isProductSelected(product: any): boolean {
    if (!product || !product.id) {
      return false;
    }
    
    // Chuyển đổi ID về số để so sánh chính xác
    const productId = Number(product.id);
    
    // Tìm trong danh sách đã chọn
    const isSelected = this.selectedProductsForUpdate.some(selectedProduct => {
      const selectedId = Number(selectedProduct.id);
      return selectedId === productId;
    });
    
    return isSelected;
  }

  /**
   * Kiểm tra xem sản phẩm có hết hàng không
   */
  isProductOutOfStock(product: any): boolean {
    return product.soLuongTon === 0;
  }

  /**
   * Toggle chọn sản phẩm
   */
  toggleProductSelection(event: any, product: any): void {
    if (this.isProductOutOfStock(product)) {
      event.preventDefault(); // Ngăn chặn thay đổi trạng thái nếu hết hàng
      return;
    }

    const productId = Number(product.id);

    if (event.target.checked) {
      // Thêm sản phẩm vào danh sách đã chọn với số lượng mặc định là 1
      const newProduct = { 
        ...product, 
        soLuong: 1,
        donGia: product.giaBan || 0,
        thanhTien: product.giaBan || 0
      };
      
      this.selectedProductsForUpdate.push(newProduct);
      console.log(`✅ Added ${product.tenSanPham} to selected products`);
    } else {
      // Xóa sản phẩm khỏi danh sách đã chọn
      this.selectedProductsForUpdate = this.selectedProductsForUpdate.filter(p => Number(p.id) !== productId);
      console.log(`❌ Removed ${product.tenSanPham} from selected products`);
    }
    
    // Cập nhật tổng tiền
    this.updateTotalAmount();
    
    // Trigger change detection để cập nhật UI
    this.cdr.detectChanges();
  }

  /**
   * Cập nhật số lượng sản phẩm đã chọn - cải thiện logic
   */
  updateSelectedProductQuantity(product: any, event: any): void {
    const quantity = parseInt(event.target.value, 10);
    if (isNaN(quantity) || quantity <= 0) {
      // Đặt lại giá trị nếu không hợp lệ
      event.target.value = this.getSelectedProductQuantity(product);
      return;
    }

    const productId = Number(product.id);
    const selected = this.selectedProductsForUpdate.find(p => Number(p.id) === productId);
    
    if (selected) {
      // Kiểm tra số lượng không vượt quá tồn kho
      if (quantity > product.soLuongTon) {
        this.showToast(`Số lượng không được vượt quá số lượng tồn kho (${product.soLuongTon})`, 'warning');
        selected.soLuong = product.soLuongTon;
        event.target.value = product.soLuongTon;
      } else {
        selected.soLuong = quantity;
      }
      
      // Cập nhật thành tiền
      selected.thanhTien = selected.soLuong * selected.donGia;
    
      console.log(`🔢 Updated quantity for ${product.tenSanPham}: ${selected.soLuong} (Total: ${selected.thanhTien})`);
      
      // Cập nhật tổng tiền của hóa đơn
    this.updateTotalAmount();
      
      // Trigger change detection để cập nhật UI
      this.cdr.detectChanges();
    }
  }

  /**
   * Lấy số lượng của sản phẩm đã chọn
   */
  getSelectedProductQuantity(product: any): number {
    if (!product || !product.id) {
      return 1;
    }
    
    const productId = Number(product.id);
    const selected = this.selectedProductsForUpdate.find(p => Number(p.id) === productId);
    return selected ? Number(selected.soLuong) || 1 : 1;
  }

  /**
   * Cập nhật tổng tiền dựa trên sản phẩm đã chọn
   */
  updateTotalAmount(): void {
    if (!this.editingInvoice) return;
    
    // Tính tổng tiền từ các sản phẩm đã chọn
    const tongTien = this.selectedProductsForUpdate.reduce((total, product) => {
      return total + (Number(product.soLuong) * Number(product.donGia));
    }, 0);
    
    // Cập nhật tổng tiền
    this.editingInvoice.tongTien = tongTien;
    
    // Tính thành tiền sau giảm giá
    const tienGiamGia = Number(this.editingInvoice.tienGiamGia) || 0;
    this.editingInvoice.thanhTien = tongTien - tienGiamGia;
    
    console.log(`💰 Updated totals - TongTien: ${tongTien}, TienGiamGia: ${tienGiamGia}, ThanhTien: ${this.editingInvoice.thanhTien}`);
  }

  /**
   * Validate form data trước khi lưu
   */
  validateFormData(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate tên khách hàng
    if (!this.editingInvoice?.tenKhachHang || this.editingInvoice.tenKhachHang.trim() === '') {
      errors.push('Tên khách hàng không được để trống');
    }
    
    // Validate số điện thoại
    if (!this.editingInvoice?.soDienThoaiKhachHang || this.editingInvoice.soDienThoaiKhachHang.trim() === '') {
      errors.push('Số điện thoại không được để trống');
    } else if (!/^[0-9+\-\s()]+$/.test(this.editingInvoice.soDienThoaiKhachHang)) {
      errors.push('Số điện thoại không hợp lệ');
    }
    
    // Validate email
    if (!this.editingInvoice?.emailKhachHang || this.editingInvoice.emailKhachHang.trim() === '') {
      errors.push('Email không được để trống');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.editingInvoice.emailKhachHang)) {
      errors.push('Email không hợp lệ');
    }
    
    // Validate địa chỉ
    if (!this.editingInvoice?.tinhThanh || this.editingInvoice.tinhThanh.trim() === '') {
      errors.push('Tỉnh/Thành phố không được để trống');
    }
    if (!this.editingInvoice?.quanHuyen || this.editingInvoice.quanHuyen.trim() === '') {
      errors.push('Quận/Huyện không được để trống');
    }
    if (!this.editingInvoice?.phuongXa || this.editingInvoice.phuongXa.trim() === '') {
      errors.push('Xã/Phường không được để trống');
    }
    if (!this.editingInvoice?.diaChiChiTiet || this.editingInvoice.diaChiChiTiet.trim() === '') {
      errors.push('Địa chỉ chi tiết không được để trống');
    }
    
    // Validate giá tiền
    if (!this.editingInvoice?.tongTien || Number(this.editingInvoice.tongTien) <= 0) {
      errors.push('Tổng tiền phải lớn hơn 0');
    }
    if (this.editingInvoice?.tienGiamGia && Number(this.editingInvoice.tienGiamGia) < 0) {
      errors.push('Tiền giảm giá không được âm');
    }
    if (this.editingInvoice?.giamGiaPhanTram && (Number(this.editingInvoice.giamGiaPhanTram) < 0 || Number(this.editingInvoice.giamGiaPhanTram) > 100)) {
      errors.push('Phần trăm giảm giá phải từ 0 đến 100');
    }
    
    // Validate nhân viên
    if (!this.editingInvoice?.nhanVienId || Number(this.editingInvoice.nhanVienId) <= 0) {
      errors.push('Vui lòng chọn nhân viên');
    }
    
    // Validate phương thức thanh toán
    if (!this.editingInvoice?.phuongThucThanhToan || this.editingInvoice.phuongThucThanhToan.trim() === '') {
      errors.push('Vui lòng chọn phương thức thanh toán');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Tính toán lại thành tiền khi có thay đổi
   */
  calculateTotalAmount(): void {
    if (!this.editingInvoice) return;
    
    const tongTien = Number(this.editingInvoice.tongTien) || 0;
    const tienGiamGia = Number(this.editingInvoice.tienGiamGia) || 0;
    
    this.editingInvoice.thanhTien = tongTien - tienGiamGia;
    
    // Tính phần trăm giảm giá nếu có
    if (tongTien > 0) {
      this.editingInvoice.giamGiaPhanTram = Math.round((tienGiamGia / tongTien) * 100);
    }
    
    console.log('💰 Calculated amounts:', {
      tongTien: this.editingInvoice.tongTien,
      tienGiamGia: this.editingInvoice.tienGiamGia,
      thanhTien: this.editingInvoice.thanhTien,
      giamGiaPhanTram: this.editingInvoice.giamGiaPhanTram
    });
  }

  /**
   * Tính toán lại tiền giảm giá từ phần trăm
   */
  calculateDiscountFromPercentage(): void {
    if (!this.editingInvoice) return;
    
    const tongTien = Number(this.editingInvoice.tongTien) || 0;
    const giamGiaPhanTram = Number(this.editingInvoice.giamGiaPhanTram) || 0;
    
    this.editingInvoice.tienGiamGia = Math.round((tongTien * giamGiaPhanTram) / 100);
    this.editingInvoice.thanhTien = tongTien - this.editingInvoice.tienGiamGia;
    
    console.log('💰 Calculated discount from percentage:', {
      tongTien: this.editingInvoice.tongTien,
      giamGiaPhanTram: this.editingInvoice.giamGiaPhanTram,
      tienGiamGia: this.editingInvoice.tienGiamGia,
      thanhTien: this.editingInvoice.thanhTien
    });
  }


  /**
   * Mở modal chọn sản phẩm (alias)
   */
  openProductSelectionModal(): void {
    this.openProductModal();
  }

  /**
   * Lưu hóa đơn đã cập nhật
   */
  saveUpdatedInvoice(): void {
    if (!this.editingInvoice || !this.invoiceId) {
      console.error('❌ No invoice data or invoice ID available');
      this.showToast('Không có dữ liệu hóa đơn để cập nhật!', 'error');
      return;
    }
    
    console.log('💾 ===== STARTING INVOICE UPDATE PROCESS =====');
    console.log('💾 Invoice ID:', this.invoiceId);
    console.log('💾 Current editingInvoice:', this.editingInvoice);
    console.log('💾 Current selectedProductsForUpdate:', this.selectedProductsForUpdate);
    
    // Validate form data
    const validation = this.validateFormData();
    if (!validation.isValid) {
      console.error('❌ Validation failed:', validation.errors);
      this.showToast('Vui lòng kiểm tra lại thông tin: ' + validation.errors.join(', '), 'error');
      return;
    }
    
    console.log('✅ Form validation passed');
    
    // Tính toán lại thành tiền trước khi lưu
    this.calculateTotalAmount();
    console.log('💰 Recalculated totals:', {
      tongTien: this.editingInvoice.tongTien,
      tienGiamGia: this.editingInvoice.tienGiamGia,
      thanhTien: this.editingInvoice.thanhTien
    });
    
    // Chuẩn hóa dữ liệu trước khi gửi
    const invoiceData: any = {
      ...this.editingInvoice,
      tongTien: Number(this.editingInvoice.tongTien) || 0,
      tienGiamGia: Number(this.editingInvoice.tienGiamGia) || 0,
      thanhTien: Number(this.editingInvoice.thanhTien) || 0,
      giamGiaPhanTram: Number(this.editingInvoice.giamGiaPhanTram) || 0,
      nhanVienId: Number(this.editingInvoice.nhanVienId) || 1,
      khachHangId: Number(this.editingInvoice.khachHangId) || undefined,
      // Chuẩn hóa định dạng ngày tháng
      ngayThanhToan: this.editingInvoice.ngayThanhToan ? this.formatDateTimeForAPI(this.editingInvoice.ngayThanhToan) : undefined,
      ngayTao: this.editingInvoice.ngayTao ? this.formatDateTimeForAPI(this.editingInvoice.ngayTao) : undefined,
      // Remove danhSachSanPham nếu có (frontend format)
      danhSachSanPham: undefined
    };
    
    // Map danhSachSanPham (frontend) sang danhSachChiTiet (backend) cho update
    // Ưu tiên sử dụng selectedProductsForUpdate nếu có, nếu không thì dùng editingInvoice.danhSachSanPham
    const productsToMap = this.selectedProductsForUpdate.length > 0 
      ? this.selectedProductsForUpdate 
      : (this.editingInvoice.danhSachSanPham || []);
    
    if (productsToMap.length > 0) {
      invoiceData.danhSachChiTiet = productsToMap.map((product: any) => ({
        chiTietSanPhamId: product.chiTietSanPhamId || product.id, // Ưu tiên chiTietSanPhamId
        soLuong: Number(product.soLuong) || 1,
        donGia: product.donGia ? (typeof product.donGia === 'number' ? product.donGia : parseFloat(String(product.donGia))) : 0,
        giamGia: product.giamGia ? (typeof product.giamGia === 'number' ? product.giamGia : parseFloat(String(product.giamGia))) : 0,
        thanhTien: product.thanhTien ? (typeof product.thanhTien === 'number' ? product.thanhTien : parseFloat(String(product.thanhTien))) : (product.donGia || 0) * (product.soLuong || 1)
      }));
      console.log('✅ Mapped danhSachChiTiet for invoice detail update:', invoiceData.danhSachChiTiet);
    }
    
    console.log('📤 ===== SENDING DATA TO API =====');
    console.log('📤 Invoice data:', invoiceData);
    console.log('📤 Customer info being sent:', {
      tenKhachHang: invoiceData.tenKhachHang,
      emailKhachHang: invoiceData.emailKhachHang,
      soDienThoaiKhachHang: invoiceData.soDienThoaiKhachHang,
      tinhThanh: invoiceData.tinhThanh,
      quanHuyen: invoiceData.quanHuyen,
      phuongXa: invoiceData.phuongXa,
      diaChiChiTiet: invoiceData.diaChiChiTiet,
      khachHangId: invoiceData.khachHangId
    });
    console.log('📦 Products being sent:', invoiceData.danhSachChiTiet);
    console.log('📦 Product details:', invoiceData.danhSachChiTiet?.map((p: any) => ({
      chiTietSanPhamId: p.chiTietSanPhamId,
      soLuong: p.soLuong,
      donGia: p.donGia,
      giamGia: p.giamGia,
      thanhTien: p.thanhTien
    })) || []);
      
      // Gọi API để cập nhật hóa đơn
    this.hoaDonService.updateHoaDonNew(this.invoiceId, invoiceData).subscribe({
        next: (response: any) => {
        console.log('✅ ===== API RESPONSE SUCCESS =====');
          console.log('✅ Invoice updated successfully:', response);
        
        // Cập nhật dữ liệu local ngay lập tức
        console.log('🔄 Updating local data...');
        this.updateLocalInvoiceData(invoiceData);
        
        // Đóng modal
        console.log('🚪 Closing update modal...');
          this.closeUpdateModal();
        
        // Refresh dữ liệu từ server để đảm bảo đồng bộ
        console.log('🔄 Refreshing invoice detail from server...');
          this.loadInvoiceDetail();
        
        // Hiển thị thông báo thành công
        this.showToast('Cập nhật hóa đơn thành công!', 'success');
        
        console.log('✅ ===== INVOICE UPDATE PROCESS COMPLETED =====');
        },
        error: (error: any) => {
        console.error('❌ ===== API RESPONSE ERROR =====');
          console.error('❌ Error updating invoice:', error);
        const errorMessage = error.error?.message || error.message || 'Có lỗi xảy ra khi cập nhật hóa đơn';
        this.showToast('Lỗi khi cập nhật hóa đơn: ' + errorMessage, 'error');
      }
    });
  }

  /**
   * Cập nhật dữ liệu local ngay lập tức sau khi lưu thành công
   */
  updateLocalInvoiceData(updatedData: any): void {
    if (!this.invoice) return;
    
    console.log('🔄 ===== UPDATING LOCAL INVOICE DATA =====');
    console.log('🔄 Original invoice:', this.invoice);
    console.log('🔄 Updated data:', updatedData);
    
    // Cập nhật tất cả các trường từ dữ liệu đã lưu
    this.invoice.tenKhachHang = updatedData.tenKhachHang;
    this.invoice.soDienThoaiKhachHang = updatedData.soDienThoaiKhachHang;
    this.invoice.emailKhachHang = updatedData.emailKhachHang;
    this.invoice.tinhThanh = updatedData.tinhThanh;
    this.invoice.quanHuyen = updatedData.quanHuyen;
    this.invoice.phuongXa = updatedData.phuongXa;
    this.invoice.diaChiChiTiet = updatedData.diaChiChiTiet;
    this.invoice.tongTien = updatedData.tongTien;
    this.invoice.tienGiamGia = updatedData.tienGiamGia;
    this.invoice.thanhTien = updatedData.thanhTien;
    this.invoice.giamGiaPhanTram = updatedData.giamGiaPhanTram;
    this.invoice.trangThai = updatedData.trangThai;
    this.invoice.nhanVienId = updatedData.nhanVienId;
    this.invoice.phuongThucThanhToan = updatedData.phuongThucThanhToan;
    this.invoice.ngayThanhToan = updatedData.ngayThanhToan;
    this.invoice.ghiChu = updatedData.ghiChu;
    
    console.log('📝 Updated invoice fields:', {
      tenKhachHang: this.invoice.tenKhachHang,
      tongTien: this.invoice.tongTien,
      tienGiamGia: this.invoice.tienGiamGia,
      thanhTien: this.invoice.thanhTien,
      trangThai: this.invoice.trangThai
    });
    
    // Cập nhật danh sách sản phẩm từ selectedProductsForUpdate
    if (this.selectedProductsForUpdate && this.selectedProductsForUpdate.length > 0) {
      console.log('📦 Updating invoice products from selectedProductsForUpdate:', this.selectedProductsForUpdate);
      
      this.invoice.danhSachSanPham = this.selectedProductsForUpdate.map(product => ({
        id: product.id,
        sanPhamId: product.id,
        tenSanPham: product.tenSanPham,
        maSanPham: product.maSanPham,
        soLuong: product.soLuong,
        donGia: product.donGia,
        thanhTien: product.thanhTien,
        giaBan: product.giaBan,
        soLuongTon: product.soLuongTon,
        danhMuc: product.danhMuc,
        thuongHieu: product.thuongHieu,
        moTa: product.moTa,
        trangThai: product.trangThai
      }));
      
      console.log('📦 Updated invoice products:', this.invoice.danhSachSanPham);
    } else {
      console.log('⚠️ No selectedProductsForUpdate to update invoice products');
    }
    
    // Cập nhật số lượng sản phẩm
    this.invoice.soLuongSanPham = this.invoice.danhSachSanPham?.length || 0;
    console.log('📊 Updated soLuongSanPham:', this.invoice.soLuongSanPham);
    
    // Trigger change detection để cập nhật UI ngay lập tức
    this.cdr.detectChanges();
    
    console.log('✅ ===== LOCAL INVOICE DATA UPDATED SUCCESSFULLY =====');
  }


  /**
   * Lấy tổng tiền
   */
  getTotalAmount(): number {
    if (!this.editingInvoice || !this.editingInvoice.danhSachSanPham) {
      return 0;
    }
    
    return this.editingInvoice.danhSachSanPham.reduce((total, product) => {
      return total + (product.thanhTien || (product.soLuong * product.donGia));
    }, 0);
  }

  /**
   * Đóng modal chọn sản phẩm
   */
  closeProductModal(): void {
    const modal = document.getElementById('productSelectionModal');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
      document.body.classList.remove('modal-open');
    }
    // Remove product modal backdrop if exists
    const backdrop = document.getElementById('product-modal-backdrop');
    if (backdrop && backdrop.parentNode) {
      backdrop.parentNode.removeChild(backdrop);
    }
    // Restore update modal z-index
    const updateModal = document.getElementById('updateInvoiceModal');
    if (updateModal) {
      updateModal.style.zIndex = '';
    }
    
    console.log('✅ Product selection modal closed');
  }

  /**
   * Xác nhận lựa chọn sản phẩm
   */
  confirmProductSelection(): void {
    console.log('💾 Confirming product selection...');
    console.log('📦 Selected products:', this.selectedProductsForUpdate);
    
    // Cập nhật danh sách sản phẩm trong editing invoice
    if (this.editingInvoice) {
      this.editingInvoice.danhSachSanPham = this.selectedProductsForUpdate.map(p => ({
        id: p.id, // ID của sản phẩm
        sanPhamId: p.id, // ID của sản phẩm
        tenSanPham: p.tenSanPham,
        soLuong: p.soLuong,
        donGia: p.donGia || p.giaBan,
        thanhTien: p.thanhTien || (p.soLuong * (p.donGia || p.giaBan)),
        maSanPham: p.maSanPham,
        danhMuc: p.danhMuc,
        thuongHieu: p.thuongHieu,
        soLuongTon: p.soLuongTon,
        trangThai: p.trangThai
      }));
      
      // Cập nhật số lượng sản phẩm
      this.editingInvoice.soLuongSanPham = this.editingInvoice.danhSachSanPham.length;
      
      // Cập nhật tổng tiền
      this.updateTotalAmount();
      
      console.log('✅ Product selection confirmed. Updated invoice products:', this.editingInvoice.danhSachSanPham);
      console.log('💰 Updated totals - TongTien:', this.editingInvoice.tongTien, 'ThanhTien:', this.editingInvoice.thanhTien);
      
      // Trigger change detection để cập nhật UI
      this.cdr.detectChanges();
    }
    
    // Đóng modal
    this.closeProductModal();
  }

  /**
   * Xử lý khi trạng thái thay đổi
   */
  onStatusChange(): void {
    if (this.invoice && this.invoice.trangThai !== this.originalStatus) {
      this.statusChanged = true;
      console.log('📝 Status changed from', this.originalStatus, 'to', this.invoice.trangThai);
    } else {
      this.statusChanged = false;
    }
  }

  /**
   * Lưu thay đổi trạng thái vào database
   */
  saveStatusChange(): void {
    if (!this.invoice || !this.statusChanged) {
      return;
    }

    this.savingStatus = true;
    const newStatus = this.invoice.trangThai;

    console.log('💾 Saving status change for invoice', this.invoiceId, 'to', newStatus);

    this.hoaDonService.updateTrangThaiHoaDon(this.invoiceId, newStatus).subscribe({
      next: (updatedInvoice) => {
        console.log('✅ Status updated successfully:', updatedInvoice);
        this.originalStatus = newStatus;
        this.statusChanged = false;
        this.savingStatus = false;
        
        // Hiển thị thông báo thành công
        this.showToast('Cập nhật trạng thái thành công!', 'success');
        
        // Reload invoice để cập nhật timeline
        this.loadInvoiceDetail();
      },
      error: (error) => {
        console.error('❌ Error updating status:', error);
        this.savingStatus = false;
        
        // Khôi phục trạng thái cũ
        if (this.invoice && this.originalStatus !== '') {
          this.invoice.trangThai = this.originalStatus as 'CHO_XAC_NHAN' | 'DA_XAC_NHAN' | 'DANG_GIAO_HANG' | 'DA_GIAO_HANG' | 'HUY';
        }
        this.statusChanged = false;
        
        // Hiển thị thông báo lỗi
        this.showToast('Lỗi khi cập nhật trạng thái: ' + (error.message || 'Vui lòng thử lại'), 'error');
      }
    });
  }
}
