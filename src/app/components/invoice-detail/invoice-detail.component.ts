import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HoaDonService } from '../../services/hoa-don.service';
import { ProductApiService, PageResponse, SanPhamResponse } from '../../services/product-api.service';
import { ChiTietSanPhamApiService, ChiTietSanPhamResponse } from '../../services/chi-tiet-san-pham-api.service';
import { CustomerAddressService } from '../../services/customer-address.service';
import { EmployeeService } from '../../services/employee.service';
import { AuthService } from '../../services/auth';
import { GHNService } from '../../services/ghn.service';
import { VietnamAddressService, Province, District, Ward } from '../../services/vietnam-address.service';
import provincesData from 'sub-vn/json_data/provinces.json';
import districtsData from 'sub-vn/json_data/districts.json';
import wardsData from 'sub-vn/json_data/wards.json';
import { KhachHangService } from '../../services/khach-hang.service';
import { CustomerAddress } from '../../interfaces/customer-address.interface';
import { HoaDonDTO } from '../../interfaces/hoa-don.interface';
import { Subject, interval, takeUntil, firstValueFrom, Subscription, timeout, catchError, of } from 'rxjs';
import { InvoiceStatusTimelineComponent } from '../invoice-status-timeline/invoice-status-timeline.component';
import { ShopHeaderComponent } from '../shop/shared/shop-header.component';
import { ShopFooterComponent } from '../shop/shared/shop-footer.component';


@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, InvoiceStatusTimelineComponent, ShopHeaderComponent, ShopFooterComponent],
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
  isCustomerView: boolean = false; // Phân biệt customer view và admin view

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
  originalStatus: 'CHO_XAC_NHAN' | 'DA_XAC_NHAN' | 'DANG_GIAO_HANG' | 'DA_GIAO_HANG' | 'HUY' | 'DA_HUY' | '' = '';
  selectedStatus: string = '';

  // Confirm invoice properties (khi trạng thái là CHO_XAC_NHAN)
  confirmInvoiceData = {
    ngayDuKienGiao: '',
    khoiLuong: null as number | null,
    chieuDai: null as number | null,
    chieuRong: null as number | null,
    chieuCao: null as number | null,
    phiGiaoHang: 0,
    nguoiChiuPhi: 'nguoi_gui' as 'nguoi_gui' | 'nguoi_nhan',
  };

  // Cancel invoice properties
  showCancelInvoiceModal: boolean = false;
  cancelInvoiceNote: string = '';

  // Refund properties
  showRefundModal: boolean = false;
  refundData = {
    refundAmount: 0,
    refundReason: '',
    refundMethod: 'original_method' as 'original_method' | 'bank_transfer' | 'cash',
    bankAccount: '',
    bankName: '',
    accountHolder: ''
  };
  
  // Shipping fee adjustment properties
  showShippingFeeAdjustmentModal: boolean = false;
  pendingSaveAfterShippingAdjustment: boolean = false; // Flag để tự động tiếp tục lưu sau khi xử lý modal
  shippingFeeAdjustmentData = {
    newShippingFee: 0,
    oldShippingFee: 0,
    adjustmentType: 'REFUND' as 'REFUND' | 'SURCHARGE',
    adjustmentAmount: 0,
    reason: '',
    refundMethod: 'original_method' as 'original_method' | 'bank_transfer' | 'cash',
    bankAccount: '',
    bankName: '',
    accountHolder: ''
  };

  // Vietnam Address properties
  provinces: Province[] = [];
  districts: District[] = [];
  wards: Ward[] = [];
  selectedProvince: string = '';
  selectedDistrict: string = '';
  selectedWard: string = '';
  loadingProvinces: boolean = false;
  loadingDistricts: boolean = false;
  loadingWards: boolean = false;
  calculatingShippingFee: boolean = false;
  originalShippingFee: number = 0; // Lưu phí ship ban đầu

  // Selected saved address
  selectedSavedAddressId: string = '';

  // Auto-refresh - Cập nhật liên tục từ DB
  private destroy$ = new Subject<void>();
  private refreshInterval = interval(2000); // 2 giây để cập nhật liên tục
  private autoRefreshSub?: Subscription;

  // Status mapping - 5 giai đoạn như trong hình ảnh
  statusSteps = [
    { key: 'CHO_XAC_NHAN', label: 'Chờ xác nhận', iconClass: 'fas fa-clock', color: '#ffc107', description: 'Đơn hàng đang chờ xác nhận' },
    { key: 'DA_XAC_NHAN', label: 'Đã xác nhận', iconClass: 'fas fa-clipboard-check', color: '#17a2b8', description: 'Đơn hàng đã được xác nhận' },
    { key: 'DANG_GIAO_HANG', label: 'Đang giao hàng', iconClass: 'fas fa-truck', color: '#007bff', description: 'Đơn hàng đang được giao' },
    { key: 'DA_GIAO_HANG', label: 'Đã Hoàn Thành', iconClass: 'fas fa-box-open', color: '#28a745', description: 'Đơn hàng đã giao thành công' },
    { key: 'HUY', label: 'Hủy', iconClass: 'fas fa-times-circle', color: '#dc3545', description: 'Đơn hàng đã bị hủy' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private hoaDonService: HoaDonService,
    private customerAddressService: CustomerAddressService,
    private employeeService: EmployeeService,
    public authService: AuthService,
    private cdr: ChangeDetectorRef,
    private productApi: ProductApiService,
    private chiTietSanPhamService: ChiTietSanPhamApiService,
    private ghnService: GHNService,
    private vietnamAddressService: VietnamAddressService,
    private khachHangService: KhachHangService
  ) {}

  /**
   * Quay lại trang quản lý hóa đơn hoặc đơn hàng của customer
   */
  goBack(): void {
    // Nếu là customer, quay lại trang đơn hàng của họ
    if (this.authService.isCustomer()) {
      this.router.navigate(['/customer/orders']);
    } else {
      // Nếu là admin/staff, quay lại trang quản lý hóa đơn
      this.router.navigate(['/invoices']);
    }
  }

  /**
   * Lấy địa chỉ khách hàng để hiển thị
   */
  getCustomerAddress(): string {
    if (!this.invoice) {
      return 'Không có thông tin';
    }

    // QUAN TRỌNG: Ưu tiên lấy địa chỉ từ invoice (từ ThongTinDonHang - đơn hàng online)
    // Đây là thông tin giao hàng chính xác từ checkout
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

    // Nếu có địa chỉ từ invoice (từ ThongTinDonHang - đơn hàng online)
    if (addressParts.length > 0) {
      console.log('✅ Using address from invoice (ThongTinDonHang):', addressParts.join(', '));
      return addressParts.join(', ');
    }

    // Fallback 1: kiểm tra địa chỉ giao hàng trong invoice (nếu có)
    if (this.invoice.diaChiGiaoHang) {
      console.log('✅ Using address from invoice.diaChiGiaoHang:', this.invoice.diaChiGiaoHang);
      return this.invoice.diaChiGiaoHang;
    }

    // Fallback 2: kiểm tra địa chỉ từ database (cho đơn hàng tại quầy)
    if (this.customerAddresses && this.customerAddresses.length > 0) {
      // Tìm địa chỉ mặc định
      const defaultAddress = this.customerAddresses.find(addr => addr.macDinh === true);
      if (defaultAddress) {
        console.log('✅ Using default address from database:', this.formatAddress(defaultAddress));
        return this.formatAddress(defaultAddress);
      }

      // Nếu không có địa chỉ mặc định, lấy địa chỉ đầu tiên
      const firstAddress = this.customerAddresses[0];
      console.log('✅ Using first address from database:', this.formatAddress(firstAddress));
      return this.formatAddress(firstAddress);
    }

    // Fallback 3: kiểm tra địa chỉ từ customer object
    if (this.customer?.diaChi) {
      console.log('✅ Using address from customer.diaChi:', this.customer.diaChi);
      return this.customer.diaChi;
    }

    // Fallback 4: kiểm tra địa chỉ từ diaChiKhachHang trong invoice (nếu có)
    // Backend map diaChiKhachHang từ ThongTinDonHang (online) hoặc DiaChiKhachHang (counter)
    if (this.invoice.diaChiKhachHang) {
      console.log('✅ Using address from invoice.diaChiKhachHang:', this.invoice.diaChiKhachHang);
      return this.invoice.diaChiKhachHang;
    }

    // Fallback 5: kiểm tra địa chỉ từ diaChiGiaoHang trong invoice (nếu có)
    if (this.invoice.diaChiGiaoHang) {
      console.log('✅ Using address from invoice.diaChiGiaoHang:', this.invoice.diaChiGiaoHang);
      return this.invoice.diaChiGiaoHang;
    }

    console.warn('⚠️ No address found, returning default message');
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

  /**
   * Xử lý khi chọn địa chỉ đã lưu từ dropdown
   */
  onSelectSavedAddress(): void {
    if (!this.selectedSavedAddressId || this.selectedSavedAddressId === 'new') {
      // Reset địa chỉ khi chọn "Nhập địa chỉ mới"
      this.selectedProvince = '';
      this.selectedDistrict = '';
      this.selectedWard = '';
      if (this.editingInvoice) {
        this.editingInvoice.diaChiChiTiet = '';
        this.editingInvoice.tinhThanh = '';
        this.editingInvoice.quanHuyen = '';
        this.editingInvoice.phuongXa = '';
      }
      this.districts = [];
      this.wards = [];
      return;
    }

    const addr = this.customerAddresses.find((a) => String(a.id) === this.selectedSavedAddressId);
    if (addr) {
      this.applyAddressFromSaved(addr);
      // Tự động tính phí vận chuyển sau khi áp dụng địa chỉ
      setTimeout(() => {
        if (addr.tinhThanh && addr.quanHuyen) {
          this.calculateShippingFeeForAddress(addr.tinhThanh, addr.quanHuyen);
        }
      }, 200);
    }
  }

  /**
   * Áp dụng địa chỉ đã lưu vào form chỉnh sửa
   */
  private applyAddressFromSaved(addr: CustomerAddress): void {
    if (!this.editingInvoice) return;

    console.log('📍 Applying saved address:', addr);

    // Cập nhật địa chỉ chi tiết
    this.editingInvoice.diaChiChiTiet = addr.diaChi || '';
    this.editingInvoice.tinhThanh = addr.tinhThanh || '';
    this.editingInvoice.quanHuyen = addr.quanHuyen || '';
    this.editingInvoice.phuongXa = addr.phuongXa || '';

    // Map names back to codes for selectors
    try {
      const province = this.provinces.find((p) => p.name === addr.tinhThanh);
      if (province) {
        this.selectedProvince = province.code;
        this.onProvinceChange(province.code);
        
        // Đợi districts load xong rồi mới set district
        setTimeout(() => {
          const district = this.districts.find((d) => d.name === addr.quanHuyen);
          if (district) {
            this.selectedDistrict = district.code;
            this.onDistrictChange(district.code);
            
            // Đợi wards load xong rồi mới set ward
            setTimeout(() => {
              const ward = this.wards.find((w) => w.name === addr.phuongXa);
              if (ward) {
                this.selectedWard = ward.code;
                this.onWardChange(ward.code);
              }
            }, 300);
          }
        }, 300);
      }
    } catch (error) {
      console.error('❌ Error applying saved address:', error);
    }

    this.cdr.detectChanges();
  }

  /**
   * Tính phí ship cho địa chỉ đã chọn
   */
  private calculateShippingFeeForAddress(tinhThanh: string, quanHuyen: string): void {
    if (!this.editingInvoice || !tinhThanh || !quanHuyen) return;

    this.calculatingShippingFee = true;
    
    // Tìm district code từ district name
    const district = this.districts.find((d) => d.name === quanHuyen);
    if (!district) {
      console.warn('⚠️ District not found for shipping fee calculation');
      this.calculatingShippingFee = false;
      return;
    }

    const districtId = this.getDistrictIdForGHN(district.code);
    
    // Tính phí ship qua GHN API
    this.ghnService.calculateShippingFeeViaBackend({
      from_district_id: 1442, // Quận Ba Đình, Hà Nội (mặc định)
      to_district_id: districtId,
      to_ward_code: this.selectedWard || undefined,
      weight: 1000, // Mặc định 1kg
      length: 20,
      width: 20,
      height: 20,
      insurance_value: Math.round(this.editingInvoice.tongTien || 0),
      province: tinhThanh
    }).subscribe({
      next: (response: any) => {
        this.calculatingShippingFee = false;
        let fee = 0;

        if (response && response.code === 200 && response.data) {
          fee = Number(response.data.total) || 0;
        } else if (response && response.data && typeof response.data === 'number') {
          fee = Number(response.data);
        }

        if (fee > 0) {
          this.editingInvoice!.phiGiaoHang = fee;
          this.showToast(`Phí vận chuyển: ${this.formatCurrency(fee)}`, 'success');
          // Trigger change detection để hiển thị thông báo chênh lệch
          this.cdr.detectChanges();
          // Log để debug
          console.log('💰 Shipping fee updated:', {
            original: this.originalShippingFee,
            new: fee,
            difference: fee - this.originalShippingFee,
            message: this.getShippingFeeDifferenceMessage()
          });
        } else {
          // Dùng phí mặc định
          this.editingInvoice!.phiGiaoHang = 0;
          this.showToast('Không thể tính phí ship, vui lòng nhập thủ công', 'info');
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.calculatingShippingFee = false;
        console.error('❌ Lỗi tính phí vận chuyển:', error);
        // Không set phí mặc định khi có lỗi, để người dùng nhập thủ công
        if (this.editingInvoice) {
          this.editingInvoice.phiGiaoHang = 0;
        }
        this.showToast('Không thể tính phí ship, vui lòng nhập thủ công', 'info');
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Tính chênh lệch phí ship và trả về thông báo
   */
  getShippingFeeDifferenceMessage(): string | null {
    if (!this.editingInvoice) {
      return null;
    }

    // Nếu chưa có originalShippingFee, lấy từ invoice
    const originalFee = this.originalShippingFee !== undefined 
      ? this.originalShippingFee 
      : (this.invoice?.phiGiaoHang || 0);

    const currentFee = this.editingInvoice.phiGiaoHang || 0;
    const difference = currentFee - originalFee;

    // Nếu không có thay đổi (chênh lệch < 1 VND)
    if (Math.abs(difference) < 1) {
      return null;
    }

    // Nếu phí mới cao hơn
    if (difference > 0) {
      return `Khách cần nộp thêm ${this.formatCurrency(difference)}`;
    }

    // Nếu phí mới thấp hơn
    return `Cần hoàn lại ${this.formatCurrency(Math.abs(difference))} cho khách`;
  }

  /**
   * Kiểm tra xem phí ship có thay đổi không
   */
  hasShippingFeeChanged(): boolean {
    if (!this.editingInvoice) {
      return false;
    }

    // Nếu chưa có originalShippingFee, lấy từ invoice
    const originalFee = this.originalShippingFee !== undefined 
      ? this.originalShippingFee 
      : (this.invoice?.phiGiaoHang || 0);

    const currentFee = this.editingInvoice.phiGiaoHang || 0;
    const difference = Math.abs(currentFee - originalFee);
    
    // Chỉ hiển thị nếu chênh lệch >= 1 VND
    return difference >= 1;
  }

  /**
   * Xử lý khi phí ship thay đổi (khi người dùng nhập thủ công)
   */
  onShippingFeeChange(): void {
    this.cdr.detectChanges();
    // Log để debug
    if (this.editingInvoice) {
      const originalFee = this.originalShippingFee !== undefined 
        ? this.originalShippingFee 
        : (this.invoice?.phiGiaoHang || 0);
      console.log('💰 Shipping fee changed manually:', {
        original: originalFee,
        new: this.editingInvoice.phiGiaoHang || 0,
        difference: (this.editingInvoice.phiGiaoHang || 0) - originalFee,
        message: this.getShippingFeeDifferenceMessage()
      });
    }
  }

  ngOnInit(): void {
    // Xác định xem đây có phải là customer view không
    this.isCustomerView = this.authService.isCustomer();
    console.log('🔍 InvoiceDetailComponent initialized, isCustomerView:', this.isCustomerView);
    
    // Load provinces ngay khi component khởi tạo
    this.loadProvinces();
    this.route.params.subscribe(params => {
      const idParam = params['id'];
      console.log('📋 Route params received:', params, 'id param:', idParam);

      this.invoiceId = +idParam;
      console.log('✅ Parsed invoiceId:', this.invoiceId);

      if (this.invoiceId && !isNaN(this.invoiceId) && this.invoiceId > 0) {
        console.log('🔄 Valid invoiceId, loading detail...');
        this.loadInvoiceDetail();
        this.startAutoRefresh();
      } else {
        console.error('❌ Invalid invoiceId:', this.invoiceId);
        this.error = 'Mã hóa đơn không hợp lệ';
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
      next: (chiTietProducts: ChiTietSanPhamResponse[]) => {
        // Map ChiTietSanPhamResponse to match frontend expected format
        this.allProducts = (chiTietProducts || []).map((product: ChiTietSanPhamResponse) => ({
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
          anhSanPham: '', // ChiTietSanPhamResponse không có anhSanPham
        }));
        console.log('✅ Loaded ChiTietSanPham products for invoice detail:', this.allProducts);
        this.productsLoaded = true;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
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
        // Cập nhật liên tục từ DB: Load invoice detail và customer info
        this.loadInvoiceDetail();
        
        // Cũng reload customer info nếu có khachHangId
        if (this.invoice?.khachHangId) {
          this.loadCustomerInfo(this.invoice.khachHangId);
        }
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
    console.log('🔄 Loading invoice detail from DB for ID:', this.invoiceId);
    console.log('🔑 Current auth token:', this.authService.getToken() ? 'Present' : 'Missing');
    console.log('👤 Current user:', this.authService.getCurrentUser());
    console.log('✅ Is logged in:', this.authService.isLoggedIn());

    this.error = '';

    // ✅ QUAN TRỌNG: Load dữ liệu trực tiếp từ DB (không cache)
    this.hoaDonService.getHoaDonDetail(this.invoiceId).subscribe({
      next: (invoice) => {
        console.log('✅ Invoice loaded from DB:', invoice);
        console.log('💰 phiGiaoHang from DB:', invoice.phiGiaoHang);
        console.log('💰 thanhTien from DB:', invoice.thanhTien);
        console.log('💰 tongTien from DB:', invoice.tongTien);
        console.log('💰 tienGiamGia from DB:', invoice.tienGiamGia);

        // Map danhSachChiTiet sang danhSachSanPham nếu chưa có
        if (invoice.danhSachChiTiet && invoice.danhSachChiTiet.length > 0 && (!invoice.danhSachSanPham || invoice.danhSachSanPham.length === 0)) {
          console.log('📦 Mapping danhSachChiTiet to danhSachSanPham...');
          invoice.danhSachSanPham = invoice.danhSachChiTiet.map((item: any) => {
            const donGia = parseFloat(item.donGia) || 0;
            const soLuong = parseInt(item.soLuong) || 1;
            const giamGia = parseFloat(item.giamGia) || 0;
            const thanhTien = item.thanhTien
              ? parseFloat(item.thanhTien)
              : (donGia * soLuong - giamGia);

            return {
              id: item.id || null,
              chiTietSanPhamId: item.chiTietSanPhamId || null,
              tenSanPham: item.tenSanPham || 'Chưa có tên',
              maSanPham: item.maSanPham || '',
              soLuong: soLuong,
              donGia: donGia,
              thanhTien: thanhTien,
              giamGia: giamGia,
              mauSac: item.mauSac || '',
              kichThuoc: item.kichThuoc || '',
              nhaSanXuat: item.nhaSanXuat || '',
              anhSanPham: item.anhSanPham || '',
              ghiChu: item.ghiChu || '',
              sanPhamId: item.sanPhamId || null,
              danhMuc: item.danhMuc || '',
              thuongHieu: item.thuongHieu || ''
            };
          });
        }

        // Đảm bảo danhSachSanPham được map đầy đủ nếu đã có
        if (invoice.danhSachSanPham && invoice.danhSachSanPham.length > 0) {
          invoice.danhSachSanPham = invoice.danhSachSanPham.map((item: any) => {
            // Đảm bảo tất cả các trường đều có giá trị
            const donGia = parseFloat(item.donGia) || 0;
            const soLuong = parseInt(item.soLuong) || 1;
            const giamGia = parseFloat(item.giamGia) || 0;
            const thanhTien = item.thanhTien
              ? parseFloat(item.thanhTien)
              : (donGia * soLuong - giamGia);

            return {
              id: item.id || null,
              chiTietSanPhamId: item.chiTietSanPhamId || null,
              tenSanPham: item.tenSanPham || 'Chưa có tên',
              maSanPham: item.maSanPham || '',
              soLuong: soLuong,
              donGia: donGia,
              thanhTien: thanhTien,
              giamGia: giamGia,
              mauSac: item.mauSac || '',
              kichThuoc: item.kichThuoc || '',
              nhaSanXuat: item.nhaSanXuat || '',
              anhSanPham: item.anhSanPham || '',
              ghiChu: item.ghiChu || '',
              sanPhamId: item.sanPhamId || null,
              danhMuc: item.danhMuc || '',
              thuongHieu: item.thuongHieu || ''
            };
          });
        }

        // Đảm bảo các giá trị số được parse đúng từ backend
        // Backend trả về BigDecimal/Number, cần đảm bảo convert sang number
        if (invoice.tongTien !== undefined && invoice.tongTien !== null) {
          invoice.tongTien = typeof invoice.tongTien === 'string' ? parseFloat(invoice.tongTien) : Number(invoice.tongTien);
        }
        if (invoice.tienGiamGia !== undefined && invoice.tienGiamGia !== null) {
          invoice.tienGiamGia = typeof invoice.tienGiamGia === 'string' ? parseFloat(invoice.tienGiamGia) : Number(invoice.tienGiamGia);
        }
        if (invoice.thanhTien !== undefined && invoice.thanhTien !== null) {
          invoice.thanhTien = typeof invoice.thanhTien === 'string' ? parseFloat(invoice.thanhTien) : Number(invoice.thanhTien);
        }
        if (invoice.phiGiaoHang !== undefined && invoice.phiGiaoHang !== null) {
          invoice.phiGiaoHang = typeof invoice.phiGiaoHang === 'string' ? parseFloat(invoice.phiGiaoHang) : Number(invoice.phiGiaoHang);
        }
        
        // Parse các trường vận chuyển
        if (invoice.khoiLuong !== undefined && invoice.khoiLuong !== null) {
          invoice.khoiLuong = typeof invoice.khoiLuong === 'string' ? parseFloat(invoice.khoiLuong) : Number(invoice.khoiLuong);
        }
        if (invoice.chieuDai !== undefined && invoice.chieuDai !== null) {
          invoice.chieuDai = typeof invoice.chieuDai === 'string' ? parseFloat(invoice.chieuDai) : Number(invoice.chieuDai);
        }
        if (invoice.chieuRong !== undefined && invoice.chieuRong !== null) {
          invoice.chieuRong = typeof invoice.chieuRong === 'string' ? parseFloat(invoice.chieuRong) : Number(invoice.chieuRong);
        }
        if (invoice.chieuCao !== undefined && invoice.chieuCao !== null) {
          invoice.chieuCao = typeof invoice.chieuCao === 'string' ? parseFloat(invoice.chieuCao) : Number(invoice.chieuCao);
        }
        
        // Đảm bảo ngayDuKienGiao là string hoặc Date hợp lệ
        if (invoice.ngayDuKienGiao) {
          // Nếu là string, giữ nguyên; nếu là Date object, convert sang string
          if (invoice.ngayDuKienGiao instanceof Date) {
            invoice.ngayDuKienGiao = invoice.ngayDuKienGiao.toISOString();
          }
        }

        // Đảm bảo danhSachSanPham luôn được map từ danhSachChiTiet
        // Priority: 1. danhSachChiTiet (từ backend) -> map sang danhSachSanPham
        //           2. danhSachSanPham (đã được map trong service)
        //           3. Mảng rỗng nếu không có gì

        // QUAN TRỌNG: Ưu tiên map từ danhSachChiTiet (backend) để đảm bảo dữ liệu mới nhất
        console.log('🔍 Checking invoice data structure:', {
          hasDanhSachChiTiet: !!invoice.danhSachChiTiet,
          danhSachChiTietLength: invoice.danhSachChiTiet?.length || 0,
          hasDanhSachSanPham: !!invoice.danhSachSanPham,
          danhSachSanPhamLength: invoice.danhSachSanPham?.length || 0,
          invoiceKeys: Object.keys(invoice)
        });

        if (invoice.danhSachChiTiet && Array.isArray(invoice.danhSachChiTiet) && invoice.danhSachChiTiet.length > 0) {
          console.log('📦 Mapping danhSachChiTiet to danhSachSanPham, count:', invoice.danhSachChiTiet.length);
          invoice.danhSachSanPham = invoice.danhSachChiTiet.map((item: any) => {
            // Đảm bảo parse đúng các giá trị số (có thể là string hoặc number từ backend)
            const donGia = item.donGia
              ? (typeof item.donGia === 'string' ? parseFloat(item.donGia) : Number(item.donGia))
              : 0;
            const soLuong = item.soLuong
              ? (typeof item.soLuong === 'string' ? parseInt(item.soLuong, 10) : Number(item.soLuong))
              : 0;
            const giamGia = item.giamGia
              ? (typeof item.giamGia === 'string' ? parseFloat(item.giamGia) : Number(item.giamGia))
              : 0;
            const thanhTien = item.thanhTien
              ? (typeof item.thanhTien === 'string' ? parseFloat(item.thanhTien) : Number(item.thanhTien))
              : (donGia * soLuong - giamGia);

            // Map đầy đủ tất cả các trường từ backend
            return {
              id: item.id || null,
              chiTietSanPhamId: item.chiTietSanPhamId || null,
              sanPhamId: item.chiTietSanPhamId || item.sanPhamId || null,
              tenSanPham: item.tenSanPham || 'Chưa có tên',
              maSanPham: item.maSanPham || '',
              soLuong: soLuong,
              donGia: donGia,
              thanhTien: thanhTien,
              giamGia: giamGia,
              // Thông tin sản phẩm chi tiết
              mauSac: item.mauSac || item.mauSacTen || '',
              kichThuoc: item.kichThuoc || item.kichThuocTen || '',
              nhaSanXuat: item.nhaSanXuat || item.nhaSanXuatTen || '',
              anhSanPham: item.anhSanPham || item.anhSanPhamUrl || '',
              // Các trường bổ sung
              danhMuc: item.danhMuc || item.loaiMuBaoHiemTen || item.loaiMuBaoHiem || '',
              thuongHieu: item.thuongHieu || '',
              ghiChu: item.ghiChu || ''
            };
          });
          console.log('✅ Mapped danhSachSanPham from danhSachChiTiet, count:', invoice.danhSachSanPham.length);
          if (invoice.danhSachSanPham.length > 0) {
            console.log('📦 Sample mapped product:', invoice.danhSachSanPham[0]);
          }
        } else if (invoice.danhSachSanPham && Array.isArray(invoice.danhSachSanPham) && invoice.danhSachSanPham.length > 0) {
          // Nếu không có danhSachChiTiet nhưng đã có danhSachSanPham (đã được map trong service)
          console.log('📦 Using existing danhSachSanPham, count:', invoice.danhSachSanPham.length);
          // Đảm bảo các giá trị số được parse đúng
          invoice.danhSachSanPham = invoice.danhSachSanPham.map((item: any) => ({
            ...item,
            donGia: typeof item.donGia === 'string' ? parseFloat(item.donGia) : Number(item.donGia || 0),
            soLuong: typeof item.soLuong === 'string' ? parseInt(item.soLuong, 10) : Number(item.soLuong || 0),
            giamGia: typeof item.giamGia === 'string' ? parseFloat(item.giamGia) : Number(item.giamGia || 0),
            thanhTien: typeof item.thanhTien === 'string' ? parseFloat(item.thanhTien) : Number(item.thanhTien || 0)
          }));
          console.log('✅ Processed existing danhSachSanPham, count:', invoice.danhSachSanPham.length);
        } else {
          // Nếu không có cả hai, set mảng rỗng và log warning
          console.warn('⚠️ No danhSachChiTiet or danhSachSanPham found in invoice response');
          console.warn('⚠️ Invoice data:', {
            id: invoice.id,
            maHoaDon: invoice.maHoaDon,
            keys: Object.keys(invoice),
            danhSachChiTiet: invoice.danhSachChiTiet,
            danhSachSanPham: invoice.danhSachSanPham
          });
          invoice.danhSachSanPham = [];
        }

        // Đảm bảo danhSachSanPham là array hợp lệ
        if (!Array.isArray(invoice.danhSachSanPham)) {
          invoice.danhSachSanPham = [];
        }

        // QUAN TRỌNG: Đảm bảo phiGiaoHang và thanhTien được parse đúng
        if (invoice.phiGiaoHang !== undefined && invoice.phiGiaoHang !== null) {
          invoice.phiGiaoHang = typeof invoice.phiGiaoHang === 'string' 
            ? parseFloat(invoice.phiGiaoHang) 
            : Number(invoice.phiGiaoHang);
        }
        if (invoice.thanhTien !== undefined && invoice.thanhTien !== null) {
          invoice.thanhTien = typeof invoice.thanhTien === 'string' 
            ? parseFloat(invoice.thanhTien) 
            : Number(invoice.thanhTien);
        }

        console.log('💰 Invoice financial data:', {
          tongTien: invoice.tongTien,
          tienGiamGia: invoice.tienGiamGia,
          thanhTien: invoice.thanhTien,
          phiGiaoHang: invoice.phiGiaoHang,
          nguoiChiuPhi: invoice.nguoiChiuPhi,
          tinhThanh: invoice.tinhThanh,
          quanHuyen: invoice.quanHuyen,
          phuongXa: invoice.phuongXa,
          diaChiChiTiet: invoice.diaChiChiTiet
        });
        
        console.log('📦 Invoice shipping data:', {
          khoiLuong: invoice.khoiLuong,
          chieuDai: invoice.chieuDai,
          chieuRong: invoice.chieuRong,
          chieuCao: invoice.chieuCao,
          ngayDuKienGiao: invoice.ngayDuKienGiao
        });

        // Tạo object mới để trigger change detection - QUAN TRỌNG để UI cập nhật
        this.invoice = { ...invoice };
        this.originalStatus = invoice.trangThai; // Lưu trạng thái ban đầu
        this.originalShippingFee = invoice.phiGiaoHang || 0; // Lưu phí ship ban đầu
        this.statusChanged = false; // Reset flag
        this.selectedStatus = ''; // Reset selected status
        
        // Force change detection để đảm bảo UI cập nhật ngay lập tức
        this.cdr.detectChanges();
        
        console.log('✅ Invoice object updated in component:', {
          id: this.invoice?.id,
          phiGiaoHang: this.invoice?.phiGiaoHang,
          thanhTien: this.invoice?.thanhTien,
          tinhThanh: this.invoice?.tinhThanh,
          quanHuyen: this.invoice?.quanHuyen
        });

        console.log('✅ Invoice loaded:', {
          id: this.invoice?.id,
          maHoaDon: this.invoice?.maHoaDon,
          danhSachChiTiet: invoice.danhSachChiTiet?.length || 0,
          danhSachSanPham: this.invoice?.danhSachSanPham?.length || 0,
          products: this.invoice?.danhSachSanPham || [],
          isArray: Array.isArray(this.invoice?.danhSachSanPham)
        });

        // Debug: Log toàn bộ cấu trúc invoice để kiểm tra
        if (this.invoice && (!this.invoice.danhSachSanPham || this.invoice.danhSachSanPham.length === 0)) {
          console.error('❌ CRITICAL: danhSachSanPham is empty or missing!');
          console.error('❌ Invoice structure:', {
            id: this.invoice?.id,
            maHoaDon: this.invoice?.maHoaDon,
            allKeys: this.invoice ? Object.keys(this.invoice) : [],
            danhSachChiTiet: invoice.danhSachChiTiet,
            danhSachSanPham: this.invoice?.danhSachSanPham
          });
        }

        // Force UI update để đảm bảo danh sách sản phẩm được hiển thị
        this.cdr.detectChanges();

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
              // Không set error chính, chỉ log để không làm gián đoạn hiển thị invoice
              this.customer = null;
              this.cdr.detectChanges();
            }
          });
        } else {
          this.customer = null;
          this.cdr.detectChanges();
        }

        // QUAN TRỌNG: Luôn load product details để đảm bảo danh sách sản phẩm được hiển thị cho tất cả trạng thái
        // Gọi loadProductDetails() để đảm bảo dữ liệu sản phẩm được load đầy đủ từ API
        console.log('🔄 Loading product details for all statuses...');
        this.loadProductDetails();

        // Force UI update
        this.cdr.detectChanges();
        console.log('🔄 Invoice detail UI updated');
      },
      error: (error) => {
        console.error('❌ Error loading invoice detail:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error details:', error);

        // Xử lý các loại lỗi khác nhau
        if (error.status === 401) {
          this.error = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
          // Không redirect tự động, để user tự quyết định
          console.warn('⚠️ 401 - Session expired, but staying on page to show error');
        } else if (error.status === 403) {
          this.error = 'Bạn không có quyền xem hóa đơn này.';
          console.warn('⚠️ 403 - Forbidden, but staying on page to show error');
        } else if (error.status === 404) {
          this.error = 'Không tìm thấy hóa đơn với ID: ' + this.invoiceId;
        } else {
          this.error = 'Không thể tải thông tin hóa đơn. Vui lòng thử lại sau.';
        }

        // Không redirect, chỉ hiển thị error message
        this.cdr.detectChanges();
      }
    });


  }

  /**
   * Load product details for the invoice
   * QUAN TRỌNG: Method này được gọi cho TẤT CẢ các trạng thái để đảm bảo danh sách sản phẩm luôn được hiển thị
   */
  private loadProductDetails(): void {
    console.log('🔄 Loading product details for invoice:', this.invoiceId);
    if (!this.invoiceId) {
      console.warn('⚠️ No invoiceId, skipping product details load');
      return;
    }

    // Nếu invoice chưa được load, đợi một chút rồi thử lại
    if (!this.invoice) {
      console.log('⏳ Invoice not loaded yet, will retry after invoice is loaded');
      setTimeout(() => {
        if (this.invoice) {
          this.loadProductDetails();
        }
      }, 500);
      return;
    }

    this.hoaDonService.getHoaDonDetail(this.invoiceId).subscribe({
      next: (detailData: any) => {
        console.log('📦 Chi tiết hóa đơn loaded for product details:', detailData);
        console.log('📦 Current invoice status:', this.invoice?.trangThai);

        // Backend trả về danhSachChiTiet, cần map sang danhSachSanPham cho frontend
        const danhSachChiTiet = Array.isArray(detailData?.danhSachChiTiet)
          ? detailData.danhSachChiTiet
          : (Array.isArray(detailData?.danhSachSanPham) ? detailData.danhSachSanPham : []);

        console.log('📦 danhSachChiTiet length:', danhSachChiTiet.length);

        // Map danhSachChiTiet sang danhSachSanPham format - mapping đầy đủ tất cả các trường
        const danhSachSanPham = danhSachChiTiet.map((item: any) => {
          // Đảm bảo parse đúng các giá trị số (backend có thể trả về string hoặc number)
          const donGia = item.donGia
            ? (typeof item.donGia === 'string' ? parseFloat(item.donGia) : Number(item.donGia))
            : 0;
          const soLuong = item.soLuong
            ? (typeof item.soLuong === 'string' ? parseInt(item.soLuong, 10) : Number(item.soLuong))
            : 0;
          const giamGia = item.giamGia
            ? (typeof item.giamGia === 'string' ? parseFloat(item.giamGia) : Number(item.giamGia))
            : 0;
          const thanhTien = item.thanhTien
            ? (typeof item.thanhTien === 'string' ? parseFloat(item.thanhTien) : Number(item.thanhTien))
            : (donGia * soLuong - giamGia);

          // Map đầy đủ tất cả các trường từ backend, hỗ trợ nhiều tên trường khác nhau
          return {
            id: item.id || null,
            chiTietSanPhamId: item.chiTietSanPhamId || null,
            sanPhamId: item.chiTietSanPhamId || item.sanPhamId || null,
            tenSanPham: item.tenSanPham || 'Chưa có tên',
            maSanPham: item.maSanPham || '',
            soLuong: soLuong,
            donGia: donGia,
            thanhTien: thanhTien,
            giamGia: giamGia,
            // Thông tin sản phẩm chi tiết - hỗ trợ nhiều tên trường
            mauSac: item.mauSac || item.mauSacTen || '',
            kichThuoc: item.kichThuoc || item.kichThuocTen || '',
            nhaSanXuat: item.nhaSanXuat || item.nhaSanXuatTen || '',
            anhSanPham: item.anhSanPham || item.anhSanPhamUrl || item.anhSanPhamUrl || '',
            // Các trường bổ sung
            danhMuc: item.danhMuc || item.loaiMuBaoHiemTen || item.loaiMuBaoHiem || '',
            thuongHieu: item.thuongHieu || '',
            ghiChu: item.ghiChu || ''
          };
        });

        console.log('📦 Mapped danhSachSanPham from danhSachChiTiet:', danhSachSanPham);

        // Cập nhật invoice với dữ liệu mới nhất từ server
        if (this.invoice) {
          this.invoice.danhSachSanPham = danhSachSanPham;
          this.invoice.soLuongSanPham = danhSachSanPham.length;
          this.invoice.tongTien = detailData?.tongTien ?? this.invoice.tongTien ?? 0;
          this.invoice.thanhTien = detailData?.thanhTien ?? detailData?.tongTien ?? this.invoice.thanhTien ?? 0;
          this.invoice.tienGiamGia = detailData?.tienGiamGia ?? this.invoice.tienGiamGia ?? 0;
          this.invoice.giamGiaPhanTram = detailData?.giamGiaPhanTram ?? this.invoice.giamGiaPhanTram ?? 0;
          if (detailData?.trangThai) this.invoice.trangThai = detailData.trangThai;
          if (detailData?.phuongThucThanhToan) this.invoice.phuongThucThanhToan = detailData.phuongThucThanhToan;
          if (detailData?.ngayThanhToan) this.invoice.ngayThanhToan = detailData.ngayThanhToan;
          if (detailData?.ghiChu !== undefined) this.invoice.ghiChu = detailData.ghiChu;
        } else {
          // Nếu invoice chưa có, tạo mới
          this.invoice = {
            ...detailData,
            danhSachSanPham: danhSachSanPham,
            soLuongSanPham: danhSachSanPham.length
          } as any;
        }

        if (danhSachSanPham.length === 0) {
          console.warn('⚠️ No products found in danhSachChiTiet, but soLuongSanPham might be > 0');
          console.warn('⚠️ Invoice data:', {
            id: detailData?.id,
            maHoaDon: detailData?.maHoaDon,
            soLuongSanPham: detailData?.soLuongSanPham || this.invoice?.soLuongSanPham,
            danhSachChiTiet: detailData?.danhSachChiTiet,
            trangThai: detailData?.trangThai || this.invoice?.trangThai
          });
          
          // QUAN TRỌNG: Nếu soLuongSanPham > 0 nhưng danhSachChiTiet rỗng, 
          // có thể backend chưa load chi tiết. Thử gọi lại API với force load chi tiết
          if ((detailData?.soLuongSanPham || this.invoice?.soLuongSanPham || 0) > 0) {
            console.log('🔄 soLuongSanPham > 0 but danhSachChiTiet is empty, trying to reload...');
            // Thử gọi lại API sau 1 giây để xem có load được không
            setTimeout(() => {
              this.hoaDonService.getHoaDonDetail(this.invoiceId).subscribe({
                next: (retryData: any) => {
                  console.log('🔄 Retry load product details:', retryData);
                  if (retryData.danhSachChiTiet && retryData.danhSachChiTiet.length > 0) {
                    // Nếu lần này có dữ liệu, map lại
                    const retryDanhSachSanPham = retryData.danhSachChiTiet.map((item: any) => ({
                      id: item.id || null,
                      chiTietSanPhamId: item.chiTietSanPhamId || null,
                      sanPhamId: item.chiTietSanPhamId || item.sanPhamId || null,
                      tenSanPham: item.tenSanPham || 'Chưa có tên',
                      maSanPham: item.maSanPham || '',
                      soLuong: typeof item.soLuong === 'string' ? parseInt(item.soLuong, 10) : Number(item.soLuong || 0),
                      donGia: typeof item.donGia === 'string' ? parseFloat(item.donGia) : Number(item.donGia || 0),
                      thanhTien: typeof item.thanhTien === 'string' ? parseFloat(item.thanhTien) : Number(item.thanhTien || 0),
                      giamGia: typeof item.giamGia === 'string' ? parseFloat(item.giamGia) : Number(item.giamGia || 0),
                      mauSac: item.mauSac || item.mauSacTen || '',
                      kichThuoc: item.kichThuoc || item.kichThuocTen || '',
                      nhaSanXuat: item.nhaSanXuat || item.nhaSanXuatTen || '',
                      anhSanPham: item.anhSanPham || item.anhSanPhamUrl || '',
                      danhMuc: item.danhMuc || item.loaiMuBaoHiemTen || item.loaiMuBaoHiem || '',
                      thuongHieu: item.thuongHieu || '',
                      ghiChu: item.ghiChu || ''
                    }));
                    
                    if (this.invoice) {
                      this.invoice.danhSachSanPham = retryDanhSachSanPham;
                      this.invoice.soLuongSanPham = retryDanhSachSanPham.length;
                      console.log('✅ Retry successful, loaded', retryDanhSachSanPham.length, 'products');
                      this.cdr.detectChanges();
                    }
                  } else {
                    console.error('❌ Retry failed: danhSachChiTiet still empty. Backend may not be loading product details for this status.');
                  }
                },
                error: (retryError) => {
                  console.error('❌ Retry load failed:', retryError);
                }
              });
            }, 1000);
          }
        } else {
          console.log('✅ Products loaded from API:', danhSachSanPham.length, 'items');
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
      // Lưu phí ship ban đầu khi mở modal
      this.originalShippingFee = this.invoice?.phiGiaoHang || 0;

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
      // Lưu phí ship ban đầu khi vào edit mode
      this.originalShippingFee = this.invoice?.phiGiaoHang || 0;
      this.stopAutoRefresh(); // Stop auto-refresh during edit
    }
  }

  startPendingInvoiceEdit(): void {
    if (!this.invoice) {
      this.showToast('Không tìm thấy dữ liệu hóa đơn để cập nhật.', 'warning');
      return;
    }

    // Kiểm tra quyền: chỉ admin/nhân viên mới được sửa
    if (!this.authService.hasRole('ADMIN') && !this.authService.hasRole('STAFF')) {
      this.showToast('Chỉ admin/nhân viên mới được chỉnh sửa đơn hàng.', 'warning');
      return;
    }

    // Kiểm tra nếu là đơn hàng online (nhanVienId = null)
    const isOnlineOrder = !this.invoice.nhanVienId || this.invoice.nhanVienId === null;
    if (isOnlineOrder) {
      // Kiểm tra xem đơn hàng đã được chỉnh sửa chưa (dựa trên activity logs hoặc flag)
      // TODO: Backend cần thêm field hasBeenEdited hoặc kiểm tra activity logs
      // Tạm thời kiểm tra qua activity logs nếu có
      if (this.invoice.ghiChu && this.invoice.ghiChu.includes('[ĐÃ CHỈNH SỬA]')) {
        this.showToast('Đơn hàng online chỉ được chỉnh sửa 1 lần. Đơn hàng này đã được chỉnh sửa trước đó.', 'warning');
        return;
      }
    }

    if (this.invoice.trangThai !== 'CHO_XAC_NHAN') {
      this.showToast('Chỉ hóa đơn ở trạng thái chờ xác nhận mới được chỉnh sửa.', 'warning');
      return;
    }

    this.isEditMode = true;
    this.editingInvoice = { ...this.invoice };
    // Lưu phí ship ban đầu khi vào edit mode
    this.originalShippingFee = this.invoice?.phiGiaoHang || 0;
    this.stopAutoRefresh();
    
    // Load provinces và địa chỉ khi vào edit mode
    this.loadProvinces();
    
    // Load customer addresses nếu có khách hàng
    if (this.invoice?.khachHangId) {
      this.loadCustomerAddresses();
    }
    
    // Nếu đã có địa chỉ, load districts và wards tương ứng
    // Đợi provinces load xong rồi mới tìm province code
    setTimeout(() => {
      if (this.editingInvoice?.tinhThanh && this.provinces.length > 0) {
        console.log('📍 Loading address from invoice:', this.editingInvoice.tinhThanh);
        this.findProvinceCodeAndLoadDistricts(this.editingInvoice.tinhThanh);
      } else if (this.editingInvoice?.tinhThanh && this.provinces.length === 0) {
        // Nếu provinces chưa load xong, đợi thêm
        console.log('⏳ Provinces not loaded yet, waiting...');
        setTimeout(() => {
          if (this.provinces.length > 0 && this.editingInvoice?.tinhThanh) {
            this.findProvinceCodeAndLoadDistricts(this.editingInvoice.tinhThanh);
          }
        }, 1000);
      }
    }, 1000); // Tăng thời gian đợi để đảm bảo provinces đã load xong
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
      // Kiểm tra nếu là đơn hàng online và đã được chỉnh sửa
      const isOnlineOrder = !this.invoice?.nhanVienId || this.invoice.nhanVienId === null;
      if (isOnlineOrder && this.invoice?.ghiChu && this.invoice.ghiChu.includes('[ĐÃ CHỈNH SỬA]')) {
        this.showToast('Đơn hàng online chỉ được chỉnh sửa 1 lần.', 'warning');
        return;
      }

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
      const saveButton = document.getElementById('saveChangesButton') as HTMLButtonElement | null;
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

        // Kiểm tra thay đổi địa chỉ và phí ship
        const originalAddress = this.invoice 
          ? `${this.invoice.tinhThanh || ''}_${this.invoice.quanHuyen || ''}_${this.invoice.phuongXa || ''}_${this.invoice.diaChiChiTiet || ''}`
          : '';
        const newAddress = `${this.editingInvoice.tinhThanh || ''}_${this.editingInvoice.quanHuyen || ''}_${this.editingInvoice.phuongXa || ''}_${this.editingInvoice.diaChiChiTiet || ''}`;
        const addressChanged = originalAddress !== newAddress;
        
        const originalShippingFee = this.invoice?.phiGiaoHang || 0;
        let newShippingFee = this.editingInvoice.phiGiaoHang || 0;
        
        // Nếu địa chỉ thay đổi, tự động tính lại phí ship bằng GHN API
        if (addressChanged && this.editingInvoice.tinhThanh && this.editingInvoice.quanHuyen) {
          console.log('📍 Address changed, calculating new shipping fee via GHN API...');
          
          // Tính phí ship mới bằng GHN API
          const ghnRequest = {
            province: this.editingInvoice.tinhThanh,
            to_district_id: 0, // Sẽ được tính từ tên quận/huyện
            to_ward_code: '', // Optional
            weight: this.invoice?.khoiLuong ? Math.round(this.invoice.khoiLuong * 1000) : 1000, // Convert kg to gram
            length: this.invoice?.chieuDai || 20,
            width: this.invoice?.chieuRong || 20,
            height: this.invoice?.chieuCao || 20,
            insurance_value: this.invoice?.tongTien || 0
          };
          
          this.ghnService.calculateShippingFeeViaBackend(ghnRequest).subscribe({
            next: (ghnResponse) => {
              console.log('✅ GHN API response:', ghnResponse);
              if (ghnResponse && ghnResponse.code === 200 && ghnResponse.data) {
                newShippingFee = ghnResponse.data.total || 0;
                if (this.editingInvoice) {
                  this.editingInvoice.phiGiaoHang = newShippingFee;
                  console.log('💰 Updated editingInvoice.phiGiaoHang to:', newShippingFee);
                }
                console.log('💰 New shipping fee calculated:', newShippingFee);
                
                // Tiếp tục xử lý với phí ship mới
                this.processShippingFeeAfterCalculation(originalShippingFee, newShippingFee, addressChanged, saveButton, customerId || null);
              } else {
                console.warn('⚠️ GHN API returned error, using default fee');
                // Nếu GHN API lỗi, sử dụng phí ship hiện tại hoặc mặc định
                this.processShippingFeeAfterCalculation(originalShippingFee, newShippingFee, addressChanged, saveButton, customerId || null);
              }
            },
            error: (ghnError) => {
              console.error('❌ Error calling GHN API:', ghnError);
              // Nếu GHN API lỗi, tiếp tục với phí ship hiện tại
              this.processShippingFeeAfterCalculation(originalShippingFee, newShippingFee, addressChanged, saveButton, customerId || null);
            }
          });
          
          return; // Return để chờ GHN API response
        }
        
        // Nếu không thay đổi địa chỉ, xử lý bình thường
        const shippingFeeChanged = originalShippingFee !== newShippingFee;
        const shippingFeeDifference = newShippingFee - originalShippingFee;

        // Nếu phí ship thay đổi, hiển thị modal điều chỉnh phí ship
          if (shippingFeeChanged) {
            this.shippingFeeAdjustmentData = {
              newShippingFee: newShippingFee,
              oldShippingFee: originalShippingFee,
              adjustmentType: shippingFeeDifference > 0 ? 'SURCHARGE' : 'REFUND',
              adjustmentAmount: Math.abs(shippingFeeDifference),
              reason: addressChanged ? 'Thay đổi địa chỉ giao hàng' : 'Điều chỉnh phí ship',
              refundMethod: 'original_method',
              bankAccount: '',
              bankName: '',
              accountHolder: ''
            };
            this.pendingSaveAfterShippingAdjustment = true; // Đánh dấu cần tiếp tục lưu sau khi xử lý modal
            this.showShippingFeeAdjustmentModal = true;
            
            // Reset button state và return - sẽ tiếp tục trong modal
            if (saveButton) {
              saveButton.disabled = false;
              saveButton.innerHTML = '<i class="fas fa-save"></i> Lưu thay đổi';
            }
            return;
        }
        
        // Nếu chỉ thay đổi địa chỉ nhưng phí ship không đổi, tiếp tục cập nhật
        if (addressChanged && !shippingFeeChanged) {
          if (!confirm('Địa chỉ giao hàng đã thay đổi nhưng phí ship không đổi.\n\nBạn có muốn tiếp tục cập nhật?')) {
              if (saveButton) {
                saveButton.disabled = false;
                saveButton.innerHTML = '<i class="fas fa-save"></i> Lưu thay đổi';
              }
              return;
            }
        }

        // Đảm bảo giá trị từ dropdown được map vào editingInvoice trước khi save
        if (this.selectedProvince) {
          const province = this.provinces.find(p => p.code === this.selectedProvince);
          if (province && this.editingInvoice) {
            this.editingInvoice.tinhThanh = province.name;
          }
        }
        if (this.selectedDistrict) {
          const district = this.districts.find(d => d.code === this.selectedDistrict);
          if (district && this.editingInvoice) {
            this.editingInvoice.quanHuyen = district.name;
          }
        }
        if (this.selectedWard) {
          const ward = this.wards.find(w => w.code === this.selectedWard);
          if (ward && this.editingInvoice) {
            this.editingInvoice.phuongXa = ward.name;
          }
        }

        // So sánh với dữ liệu gốc để chỉ gửi các trường đã thay đổi
        const invoiceData: any = {
          maHoaDon: this.editingInvoice.maHoaDon, // Luôn cần có
          khachHangId: this.editingInvoice.khachHangId ? Number(this.editingInvoice.khachHangId) : undefined,
        };

        // Chỉ thêm các trường đã thay đổi so với invoice gốc
        if (this.invoice) {
          // Thông tin khách hàng
          if (this.editingInvoice.tenKhachHang !== this.invoice.tenKhachHang) {
            invoiceData.tenKhachHang = this.editingInvoice.tenKhachHang;
          }
          if (this.editingInvoice.emailKhachHang !== this.invoice.emailKhachHang) {
            invoiceData.emailKhachHang = this.editingInvoice.emailKhachHang;
          }
          if (this.editingInvoice.soDienThoaiKhachHang !== this.invoice.soDienThoaiKhachHang) {
            invoiceData.soDienThoaiKhachHang = this.editingInvoice.soDienThoaiKhachHang;
          }

          // Địa chỉ
          if (this.editingInvoice.diaChiChiTiet !== this.invoice.diaChiChiTiet) {
            invoiceData.diaChiChiTiet = this.editingInvoice.diaChiChiTiet;
          }
          if (this.editingInvoice.tinhThanh !== this.invoice.tinhThanh) {
            invoiceData.tinhThanh = this.editingInvoice.tinhThanh;
          }
          if (this.editingInvoice.quanHuyen !== this.invoice.quanHuyen) {
            invoiceData.quanHuyen = this.editingInvoice.quanHuyen;
          }
          if (this.editingInvoice.phuongXa !== this.invoice.phuongXa) {
            invoiceData.phuongXa = this.editingInvoice.phuongXa;
          }

          // Tiền
          const newTongTien = this.editingInvoice.tongTien ? Number(this.editingInvoice.tongTien) : 0;
          const oldTongTien = this.invoice.tongTien ? Number(this.invoice.tongTien) : 0;
          if (newTongTien !== oldTongTien) {
            invoiceData.tongTien = newTongTien;
          }

          const newTienGiamGia = this.editingInvoice.tienGiamGia ? Number(this.editingInvoice.tienGiamGia) : 0;
          const oldTienGiamGia = this.invoice.tienGiamGia ? Number(this.invoice.tienGiamGia) : 0;
          if (newTienGiamGia !== oldTienGiamGia) {
            invoiceData.tienGiamGia = newTienGiamGia;
          }

          const newThanhTien = this.editingInvoice.thanhTien ? Number(this.editingInvoice.thanhTien) : 0;
          const oldThanhTien = this.invoice.thanhTien ? Number(this.invoice.thanhTien) : 0;
          if (newThanhTien !== oldThanhTien) {
            invoiceData.thanhTien = newThanhTien;
          }

          // Phí ship - QUAN TRỌNG: Luôn gửi phiGiaoHang nếu đã được tính lại từ GHN API hoặc có thay đổi
          const newPhiGiaoHang = this.editingInvoice.phiGiaoHang !== undefined && this.editingInvoice.phiGiaoHang !== null 
            ? Number(this.editingInvoice.phiGiaoHang) 
            : (this.invoice?.phiGiaoHang || 0);
          const oldPhiGiaoHang = this.invoice.phiGiaoHang !== undefined && this.invoice.phiGiaoHang !== null 
            ? Number(this.invoice.phiGiaoHang) 
            : 0;
          // Luôn gửi phiGiaoHang nếu có thay đổi hoặc đã được tính lại (khi địa chỉ thay đổi)
          if (newPhiGiaoHang !== oldPhiGiaoHang || addressChanged) {
            invoiceData.phiGiaoHang = newPhiGiaoHang;
            console.log('💰 Sending phiGiaoHang to backend:', newPhiGiaoHang, '(old:', oldPhiGiaoHang, ', addressChanged:', addressChanged, ')');
          }

          // Ghi chú
          if (this.editingInvoice.ghiChu !== this.invoice.ghiChu) {
            invoiceData.ghiChu = this.editingInvoice.ghiChu;
          }

          // Trạng thái
          if (this.editingInvoice.trangThai !== this.invoice.trangThai) {
            invoiceData.trangThai = this.editingInvoice.trangThai;
          }

          // Nhân viên
          const newNhanVienId = this.editingInvoice.nhanVienId ? Number(this.editingInvoice.nhanVienId) : null;
          const oldNhanVienId = this.invoice.nhanVienId ? Number(this.invoice.nhanVienId) : null;
          if (newNhanVienId !== oldNhanVienId) {
            invoiceData.nhanVienId = newNhanVienId;
          }

          // Phương thức thanh toán
          if (this.editingInvoice.phuongThucThanhToan !== this.invoice.phuongThucThanhToan) {
            invoiceData.phuongThucThanhToan = this.editingInvoice.phuongThucThanhToan;
          }

          // Ngày thanh toán
          if (this.editingInvoice.ngayThanhToan !== this.invoice.ngayThanhToan) {
            invoiceData.ngayThanhToan = this.editingInvoice.ngayThanhToan ? this.formatDateTimeForAPI(this.editingInvoice.ngayThanhToan) : undefined;
          }
        } else {
          // Nếu không có invoice gốc, gửi tất cả dữ liệu
          invoiceData.tenKhachHang = this.editingInvoice.tenKhachHang;
          invoiceData.emailKhachHang = this.editingInvoice.emailKhachHang;
          invoiceData.soDienThoaiKhachHang = this.editingInvoice.soDienThoaiKhachHang;
          invoiceData.diaChiChiTiet = this.editingInvoice.diaChiChiTiet;
          invoiceData.tinhThanh = this.editingInvoice.tinhThanh;
          invoiceData.quanHuyen = this.editingInvoice.quanHuyen;
          invoiceData.phuongXa = this.editingInvoice.phuongXa;
          invoiceData.tongTien = this.editingInvoice.tongTien ? Number(this.editingInvoice.tongTien) : 0;
          invoiceData.tienGiamGia = this.editingInvoice.tienGiamGia ? Number(this.editingInvoice.tienGiamGia) : 0;
          invoiceData.thanhTien = this.editingInvoice.thanhTien ? Number(this.editingInvoice.thanhTien) : 0;
          invoiceData.phiGiaoHang = this.editingInvoice.phiGiaoHang ? Number(this.editingInvoice.phiGiaoHang) : 0;
          invoiceData.ghiChu = this.editingInvoice.ghiChu;
          invoiceData.trangThai = this.editingInvoice.trangThai;
          invoiceData.nhanVienId = this.editingInvoice.nhanVienId ? Number(this.editingInvoice.nhanVienId) : undefined;
          invoiceData.phuongThucThanhToan = this.editingInvoice.phuongThucThanhToan;
          invoiceData.ngayThanhToan = this.editingInvoice.ngayThanhToan ? this.formatDateTimeForAPI(this.editingInvoice.ngayThanhToan) : undefined;
        }

        // Map danhSachSanPham (frontend) sang danhSachChiTiet (backend) cho update
        // Ưu tiên sử dụng selectedProductsForUpdate nếu có, nếu không thì dùng editingInvoice.danhSachSanPham
        const productsToMap = this.selectedProductsForUpdate.length > 0
          ? this.selectedProductsForUpdate
          : (this.editingInvoice.danhSachSanPham || []);

        if (productsToMap.length > 0) {
          invoiceData.danhSachChiTiet = productsToMap.map((product: any) => ({
            chiTietSanPhamId: product.chiTietSanPhamId || product.id, // QUAN TRỌNG: chiTietSanPhamId cho backend
            soLuong: Number(product.soLuong) || 1,
            donGia: product.donGia ? (typeof product.donGia === 'number' ? product.donGia : parseFloat(String(product.donGia))) : 0,
            giamGia: product.giamGia ? (typeof product.giamGia === 'number' ? product.giamGia : parseFloat(String(product.giamGia))) : 0,
            thanhTien: product.thanhTien ? (typeof product.thanhTien === 'number' ? product.thanhTien : parseFloat(String(product.thanhTien))) : ((product.donGia || 0) * (product.soLuong || 1))
          }));
          console.log('✅ Mapped danhSachChiTiet for saveChanges:', invoiceData.danhSachChiTiet);
        } else {
          // Nếu không có sản phẩm mới, giữ nguyên danhSachChiTiet từ invoice gốc
          if ((this.invoice as any)?.danhSachChiTiet && (this.invoice as any).danhSachChiTiet.length > 0) {
            invoiceData.danhSachChiTiet = (this.invoice as any).danhSachChiTiet.map((item: any) => ({
              chiTietSanPhamId: item.chiTietSanPhamId || item.id,
              soLuong: Number(item.soLuong) || 1,
              donGia: item.donGia ? (typeof item.donGia === 'number' ? item.donGia : parseFloat(String(item.donGia))) : 0,
              giamGia: item.giamGia ? (typeof item.giamGia === 'number' ? item.giamGia : parseFloat(String(item.giamGia))) : 0,
              thanhTien: item.thanhTien ? (typeof item.thanhTien === 'number' ? item.thanhTien : parseFloat(String(item.thanhTien))) : ((item.donGia || 0) * (item.soLuong || 1))
            }));
            console.log('✅ Using original danhSachChiTiet from invoice:', invoiceData.danhSachChiTiet);
          }
        }

        // ✅ QUAN TRỌNG: Đảm bảo phiGiaoHang luôn được gửi trong request (kể cả khi không thay đổi)
        if (invoiceData.phiGiaoHang === undefined || invoiceData.phiGiaoHang === null) {
          // Nếu không có trong invoiceData, lấy từ editingInvoice hoặc invoice hiện tại
          invoiceData.phiGiaoHang = this.editingInvoice?.phiGiaoHang 
            ? Number(this.editingInvoice.phiGiaoHang) 
            : (this.invoice?.phiGiaoHang ? Number(this.invoice.phiGiaoHang) : 0);
          console.log('💰 Added phiGiaoHang to invoiceData:', invoiceData.phiGiaoHang);
        }

        console.log('📤 Sending invoice data to API:', {
          ...invoiceData,
          phiGiaoHang: invoiceData.phiGiaoHang, // Log rõ ràng phiGiaoHang
          danhSachChiTiet: invoiceData.danhSachChiTiet?.map((p: any) => ({
            chiTietSanPhamId: p.chiTietSanPhamId,
            soLuong: p.soLuong,
            donGia: p.donGia,
            thanhTien: p.thanhTien
          })) || []
        });

        // Đánh dấu đơn hàng đã được chỉnh sửa nếu là đơn hàng online
        const isOnlineOrder = !this.invoice?.nhanVienId || this.invoice.nhanVienId === null;
        if (isOnlineOrder) {
          // Thêm ghi chú đánh dấu đã chỉnh sửa
          const editNote = '[ĐÃ CHỈNH SỬA]';
          if (!invoiceData.ghiChu || !invoiceData.ghiChu.includes(editNote)) {
            invoiceData.ghiChu = invoiceData.ghiChu 
              ? `${editNote} ${invoiceData.ghiChu}` 
              : editNote;
          }
        }

        // Nếu phí ship thay đổi, gọi API điều chỉnh phí ship trước
        if (shippingFeeChanged) {
          const adjustmentRequest = {
            newShippingFee: newShippingFee,
            oldShippingFee: originalShippingFee,
            adjustmentType: (shippingFeeDifference > 0 ? 'SURCHARGE' : 'REFUND') as 'REFUND' | 'SURCHARGE',
            adjustmentAmount: Math.abs(shippingFeeDifference),
            reason: this.shippingFeeAdjustmentData.reason || (addressChanged ? 'Thay đổi địa chỉ giao hàng' : 'Điều chỉnh phí ship'),
            refundMethod: this.shippingFeeAdjustmentData.refundMethod || 'original_method',
            bankAccount: this.shippingFeeAdjustmentData.bankAccount || '',
            bankName: this.shippingFeeAdjustmentData.bankName || '',
            accountHolder: this.shippingFeeAdjustmentData.accountHolder || ''
          };
          
          this.hoaDonService.adjustShippingFee(this.invoiceId, adjustmentRequest).subscribe({
            next: (adjustedInvoice) => {
              console.log('✅ Shipping fee adjusted successfully:', adjustedInvoice);
              console.log('💰 Adjusted invoice phiGiaoHang:', adjustedInvoice.phiGiaoHang);
              
              // QUAN TRỌNG: Cập nhật phiGiaoHang trong invoiceData từ adjustedInvoice
              if (adjustedInvoice.phiGiaoHang !== undefined && adjustedInvoice.phiGiaoHang !== null) {
                invoiceData.phiGiaoHang = typeof adjustedInvoice.phiGiaoHang === 'string' 
                  ? parseFloat(adjustedInvoice.phiGiaoHang) 
                  : Number(adjustedInvoice.phiGiaoHang);
                console.log('💰 Updated invoiceData.phiGiaoHang to:', invoiceData.phiGiaoHang);
              }
              
              // Cập nhật thanhTien nếu có
              if (adjustedInvoice.thanhTien !== undefined && adjustedInvoice.thanhTien !== null) {
                invoiceData.thanhTien = typeof adjustedInvoice.thanhTien === 'string' 
                  ? parseFloat(adjustedInvoice.thanhTien) 
                  : Number(adjustedInvoice.thanhTien);
              }
              
              // Tiếp tục cập nhật hóa đơn với phiGiaoHang mới
              this.continueUpdateInvoice(invoiceData, customerId || null, saveButton);
            },
            error: (adjustError) => {
              console.error('❌ Error adjusting shipping fee:', adjustError);
              this.showToast('Lỗi khi điều chỉnh phí ship: ' + (adjustError.error?.message || adjustError.message), 'error');
              if (saveButton) {
                saveButton.disabled = false;
                saveButton.innerHTML = '<i class="fas fa-save"></i> Lưu thay đổi';
              }
            }
          });
        } else {
          // Không thay đổi phí ship, cập nhật hóa đơn trực tiếp
          this.continueUpdateInvoice(invoiceData, customerId || null, saveButton);
        }
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

  /**
   * Xử lý phí ship sau khi tính toán từ GHN API
   */
  private processShippingFeeAfterCalculation(
    originalShippingFee: number,
    newShippingFee: number,
    addressChanged: boolean,
    saveButton: HTMLButtonElement | null,
    customerId: number | null
  ): void {
    const shippingFeeChanged = originalShippingFee !== newShippingFee;
    const shippingFeeDifference = newShippingFee - originalShippingFee;

    if (shippingFeeChanged) {
      // Phí ship thay đổi, hiển thị modal điều chỉnh phí ship
      this.shippingFeeAdjustmentData = {
        newShippingFee: newShippingFee,
        oldShippingFee: originalShippingFee,
        adjustmentType: shippingFeeDifference > 0 ? 'SURCHARGE' : 'REFUND',
        adjustmentAmount: Math.abs(shippingFeeDifference),
        reason: addressChanged ? 'Thay đổi địa chỉ giao hàng - Tự động tính lại phí ship' : 'Điều chỉnh phí ship',
        refundMethod: 'original_method',
        bankAccount: '',
        bankName: '',
        accountHolder: ''
      };
      this.pendingSaveAfterShippingAdjustment = true; // Đánh dấu cần tiếp tục lưu sau khi xử lý modal
      this.showShippingFeeAdjustmentModal = true;
      
      // Reset button state
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.innerHTML = '<i class="fas fa-save"></i> Lưu thay đổi';
      }
    } else {
      // Phí ship không đổi, tiếp tục cập nhật hóa đơn
      this.continueSaveChanges(customerId, saveButton);
    }
  }

  /**
   * Tiếp tục lưu thay đổi sau khi xử lý phí ship
   */
  private continueSaveChanges(customerId: number | null, saveButton: HTMLButtonElement | null): void {
    if (!this.editingInvoice || !this.invoiceId) {
      return;
    }

    // Chuẩn hóa dữ liệu trước khi gửi
    // QUAN TRỌNG: Đảm bảo phiGiaoHang luôn được gửi khi đã tính lại từ GHN API
    const invoiceData: any = {
      ...this.editingInvoice,
      tongTien: this.editingInvoice.tongTien ? Number(this.editingInvoice.tongTien) : 0,
      tienGiamGia: this.editingInvoice.tienGiamGia ? Number(this.editingInvoice.tienGiamGia) : 0,
      thanhTien: this.editingInvoice.thanhTien ? Number(this.editingInvoice.thanhTien) : 0,
      phiGiaoHang: this.editingInvoice.phiGiaoHang !== undefined && this.editingInvoice.phiGiaoHang !== null 
        ? Number(this.editingInvoice.phiGiaoHang) 
        : (this.invoice?.phiGiaoHang || 0),
      nhanVienId: this.editingInvoice.nhanVienId ? Number(this.editingInvoice.nhanVienId) : undefined,
      khachHangId: customerId || this.editingInvoice.khachHangId ? Number(customerId || this.editingInvoice.khachHangId) : undefined,
      ngayThanhToan: this.editingInvoice.ngayThanhToan ? this.formatDateTimeForAPI(this.editingInvoice.ngayThanhToan) : undefined,
      ngayTao: this.editingInvoice.ngayTao ? this.formatDateTimeForAPI(this.editingInvoice.ngayTao) : undefined,
      danhSachSanPham: undefined
    };

    // Map danhSachSanPham sang danhSachChiTiet
    const productsToMap = this.selectedProductsForUpdate.length > 0
      ? this.selectedProductsForUpdate
      : (this.editingInvoice.danhSachSanPham || []);

    if (productsToMap.length > 0) {
      invoiceData.danhSachChiTiet = productsToMap.map((product: any) => ({
        chiTietSanPhamId: product.chiTietSanPhamId || product.id,
        soLuong: Number(product.soLuong) || 1,
        donGia: product.donGia ? (typeof product.donGia === 'number' ? product.donGia : parseFloat(String(product.donGia))) : 0,
        giamGia: product.giamGia ? (typeof product.giamGia === 'number' ? product.giamGia : parseFloat(String(product.giamGia))) : 0,
        thanhTien: product.thanhTien ? (typeof product.thanhTien === 'number' ? product.thanhTien : parseFloat(String(product.thanhTien))) : ((product.donGia || 0) * (product.soLuong || 1))
      }));
    } else if ((this.invoice as any)?.danhSachChiTiet && (this.invoice as any).danhSachChiTiet.length > 0) {
      invoiceData.danhSachChiTiet = (this.invoice as any).danhSachChiTiet.map((item: any) => ({
        chiTietSanPhamId: item.chiTietSanPhamId || item.id,
        soLuong: Number(item.soLuong) || 1,
        donGia: item.donGia ? (typeof item.donGia === 'number' ? item.donGia : parseFloat(String(item.donGia))) : 0,
        giamGia: item.giamGia ? (typeof item.giamGia === 'number' ? item.giamGia : parseFloat(String(item.giamGia))) : 0,
        thanhTien: item.thanhTien ? (typeof item.thanhTien === 'number' ? item.thanhTien : parseFloat(String(item.thanhTien))) : ((item.donGia || 0) * (item.soLuong || 1))
      }));
    }

    // Đánh dấu đơn hàng đã được chỉnh sửa nếu là đơn hàng online
    const isOnlineOrder = !this.invoice?.nhanVienId || this.invoice.nhanVienId === null;
    if (isOnlineOrder) {
      const editNote = '[ĐÃ CHỈNH SỬA]';
      if (!invoiceData.ghiChu || !invoiceData.ghiChu.includes(editNote)) {
        invoiceData.ghiChu = invoiceData.ghiChu 
          ? `${editNote} ${invoiceData.ghiChu}` 
          : editNote;
      }
    }

    // Cập nhật hóa đơn
    this.continueUpdateInvoice(invoiceData, customerId, saveButton);
  }

  /**
   * Tiếp tục cập nhật hóa đơn sau khi điều chỉnh phí ship
   */
  private continueUpdateInvoice(invoiceData: any, customerId: number | null, saveButton: HTMLButtonElement | null): void {
        // ✅ QUAN TRỌNG: Log dữ liệu trước khi gửi request
        console.log('📤 Sending update request with invoiceData:', {
          id: this.invoiceId,
          phiGiaoHang: invoiceData.phiGiaoHang,
          tongTien: invoiceData.tongTien,
          tienGiamGia: invoiceData.tienGiamGia,
          thanhTien: invoiceData.thanhTien
        });
        
        this.hoaDonService.updateHoaDonNew(this.invoiceId, invoiceData).subscribe({
          next: (updatedInvoice: any) => {
            console.log('✅ Invoice updated successfully from API:', updatedInvoice);
            console.log('💰 Updated shipping fee (phiGiaoHang) from API:', updatedInvoice.phiGiaoHang);
            console.log('💰 Updated thanhTien from API:', updatedInvoice.thanhTien);

        // Đóng modal điều chỉnh phí ship nếu đang mở
        if (this.showShippingFeeAdjustmentModal) {
          this.closeShippingFeeAdjustmentModal();
        }

            // Cập nhật invoice ngay lập tức với dữ liệu từ response để hiển thị ngay
            if (updatedInvoice) {
              // Đảm bảo phiGiaoHang được convert sang number
              if (updatedInvoice.phiGiaoHang !== undefined && updatedInvoice.phiGiaoHang !== null) {
                updatedInvoice.phiGiaoHang = typeof updatedInvoice.phiGiaoHang === 'string' 
                  ? parseFloat(updatedInvoice.phiGiaoHang) 
                  : Number(updatedInvoice.phiGiaoHang);
              }
              
              // Đảm bảo thanhTien cũng được cập nhật nếu phiGiaoHang thay đổi
              if (updatedInvoice.thanhTien !== undefined && updatedInvoice.thanhTien !== null) {
                updatedInvoice.thanhTien = typeof updatedInvoice.thanhTien === 'string' 
                  ? parseFloat(updatedInvoice.thanhTien) 
                  : Number(updatedInvoice.thanhTien);
              }
              
              // Cập nhật invoice object để hiển thị ngay
              this.invoice = { ...updatedInvoice }; // Tạo object mới để trigger change detection
              this.cdr.detectChanges();
              
              console.log('🔄 Updated invoice object immediately:', {
                phiGiaoHang: updatedInvoice.phiGiaoHang,
                thanhTien: updatedInvoice.thanhTien,
                tinhThanh: updatedInvoice.tinhThanh,
                quanHuyen: updatedInvoice.quanHuyen
              });
            }

            // ✅ QUAN TRỌNG: Reload toàn bộ dữ liệu hóa đơn từ DB để đảm bảo hiển thị đúng
            // Delay để đảm bảo backend đã lưu xong và commit transaction
            setTimeout(() => {
              console.log('🔄 Reloading invoice detail from DB after update...');
              this.loadInvoiceDetail();
              // Force change detection sau khi reload
              setTimeout(() => {
                this.cdr.detectChanges();
                console.log('✅ Reloaded invoice detail from DB, phiGiaoHang:', this.invoice?.phiGiaoHang);
                console.log('✅ Reloaded invoice detail from DB, thanhTien:', this.invoice?.thanhTien);
              }, 200);
            }, 1000); // Tăng delay để đảm bảo backend đã lưu xong và commit transaction

            // Reload customer information
            if (customerId) {
              this.loadCustomerInfo(customerId);
            } else if (updatedInvoice?.khachHangId) {
              this.loadCustomerInfo(updatedInvoice.khachHangId);
            } else if (this.invoice?.khachHangId) {
              this.loadCustomerInfo(this.invoice.khachHangId);
            }

            // Thoát edit mode sau khi reload
            setTimeout(() => {
              this.isEditMode = false;
              const editingEmail = this.editingInvoice?.emailKhachHang;
              this.editingInvoice = null;
              this.startAutoRefresh(); // Resume auto-refresh
              
              // Thông báo thành công - backend sẽ tự động gửi email nếu có thay đổi và có email khách hàng
              if (editingEmail && editingEmail.trim() !== '') {
                this.showToast('Cập nhật hóa đơn thành công! Email thông báo các thay đổi đã được gửi đến khách hàng.', 'success');
              } else {
                this.showToast('Cập nhật hóa đơn thành công!', 'success');
              }
              
              // Force change detection một lần nữa để đảm bảo UI cập nhật
              // Đảm bảo invoice object được cập nhật lại từ server
              this.cdr.detectChanges();
              
              // ✅ QUAN TRỌNG: Reload lại một lần nữa từ DB để đảm bảo dữ liệu đồng bộ hoàn toàn
              setTimeout(() => {
                console.log('🔄 Final reload from DB to ensure data sync...');
                this.loadInvoiceDetail();
                setTimeout(() => {
                  this.cdr.detectChanges();
                  console.log('✅ Final reload completed, all data synced from DB');
                }, 100);
              }, 500);
            }, 500);
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
  }

  /**
   * Mở modal điều chỉnh phí ship
   */
  openShippingFeeAdjustmentModal(): void {
    this.showShippingFeeAdjustmentModal = true;
  }

  /**
   * Đóng modal điều chỉnh phí ship
   */
  closeShippingFeeAdjustmentModal(): void {
    this.showShippingFeeAdjustmentModal = false;
    this.pendingSaveAfterShippingAdjustment = false; // Reset flag khi đóng modal
    // Reset data
    this.shippingFeeAdjustmentData = {
      newShippingFee: 0,
      oldShippingFee: 0,
      adjustmentType: 'REFUND',
      adjustmentAmount: 0,
      reason: '',
      refundMethod: 'original_method',
      bankAccount: '',
      bankName: '',
      accountHolder: ''
    };
  }

  /**
   * Xử lý điều chỉnh phí ship
   */
  processShippingFeeAdjustment(): void {
    if (!this.invoice || !this.invoice.id) {
      this.showToast('Không tìm thấy hóa đơn', 'error');
      return;
    }

    if (!this.shippingFeeAdjustmentData.reason || this.shippingFeeAdjustmentData.reason.trim().length === 0) {
      this.showToast('Vui lòng nhập lý do điều chỉnh', 'warning');
      return;
    }

    this.savingStatus = true;
    const shouldContinueSave = this.pendingSaveAfterShippingAdjustment; // Lưu flag trước khi reset

    const adjustmentRequest = {
      newShippingFee: this.shippingFeeAdjustmentData.newShippingFee,
      oldShippingFee: this.shippingFeeAdjustmentData.oldShippingFee,
      adjustmentType: this.shippingFeeAdjustmentData.adjustmentType,
      adjustmentAmount: this.shippingFeeAdjustmentData.adjustmentAmount,
      reason: this.shippingFeeAdjustmentData.reason.trim(),
      refundMethod: this.shippingFeeAdjustmentData.refundMethod,
      bankAccount: this.shippingFeeAdjustmentData.bankAccount || '',
      bankName: this.shippingFeeAdjustmentData.bankName || '',
      accountHolder: this.shippingFeeAdjustmentData.accountHolder || ''
    };

    this.hoaDonService.adjustShippingFee(this.invoice.id, adjustmentRequest).subscribe({
      next: (updatedInvoice) => {
        console.log('✅ Shipping fee adjusted successfully:', updatedInvoice);
        console.log('💰 Updated shipping fee (phiGiaoHang):', updatedInvoice.phiGiaoHang);
        
        // Cập nhật invoice ngay lập tức với dữ liệu từ response để hiển thị ngay
        if (updatedInvoice) {
          // Đảm bảo phiGiaoHang được convert sang number
          if (updatedInvoice.phiGiaoHang !== undefined && updatedInvoice.phiGiaoHang !== null) {
            updatedInvoice.phiGiaoHang = typeof updatedInvoice.phiGiaoHang === 'string' 
              ? parseFloat(updatedInvoice.phiGiaoHang) 
              : Number(updatedInvoice.phiGiaoHang);
          }
          
          // Đảm bảo thanhTien cũng được cập nhật nếu phiGiaoHang thay đổi
          if (updatedInvoice.thanhTien !== undefined && updatedInvoice.thanhTien !== null) {
            updatedInvoice.thanhTien = typeof updatedInvoice.thanhTien === 'string' 
              ? parseFloat(updatedInvoice.thanhTien) 
              : Number(updatedInvoice.thanhTien);
          }
          
          // Cập nhật editingInvoice với phiGiaoHang mới để tiếp tục lưu
          if (this.editingInvoice) {
            this.editingInvoice.phiGiaoHang = updatedInvoice.phiGiaoHang;
            this.editingInvoice.thanhTien = updatedInvoice.thanhTien;
          }
          
          // Cập nhật invoice object để hiển thị ngay (tạo object mới để trigger change detection)
          this.invoice = { ...updatedInvoice };
          this.cdr.detectChanges();
          
          console.log('🔄 Updated invoice object immediately after shipping fee adjustment:', {
            phiGiaoHang: updatedInvoice.phiGiaoHang,
            thanhTien: updatedInvoice.thanhTien
          });
        }
        
        this.savingStatus = false;
        this.closeShippingFeeAdjustmentModal();
        
        const message = this.shippingFeeAdjustmentData.adjustmentType === 'REFUND'
          ? `Đã hoàn phí ship thành công. Số tiền ${this.formatCurrency(this.shippingFeeAdjustmentData.adjustmentAmount)} ₫ sẽ được hoàn trả trong vòng 3-5 ngày làm việc.`
          : `Đã tăng phụ phí ship thành công. Khách hàng cần thanh toán thêm ${this.formatCurrency(this.shippingFeeAdjustmentData.adjustmentAmount)} ₫.`;
        
        this.showToast(message, 'success');
        
        // ✅ Tự động tiếp tục lưu thay đổi nếu có flag
        if (shouldContinueSave) {
          console.log('🔄 Auto-continuing save after shipping fee adjustment...');
          setTimeout(() => {
            this.saveChanges();
          }, 500); // Delay nhỏ để đảm bảo modal đã đóng
        } else {
          // ✅ QUAN TRỌNG: Reload toàn bộ dữ liệu hóa đơn từ DB để đảm bảo hiển thị đúng
          setTimeout(() => {
            console.log('🔄 Reloading invoice detail from DB after shipping fee adjustment...');
            this.loadInvoiceDetail();
            setTimeout(() => {
              this.cdr.detectChanges();
              console.log('✅ Reloaded invoice detail from DB after adjustment, phiGiaoHang:', this.invoice?.phiGiaoHang);
              console.log('✅ Reloaded invoice detail from DB after adjustment, thanhTien:', this.invoice?.thanhTien);
            }, 200);
          }, 1000);
        }
      },
      error: (error) => {
        console.error('❌ Error adjusting shipping fee:', error);
        this.savingStatus = false;
        this.pendingSaveAfterShippingAdjustment = false; // Reset flag khi có lỗi
        this.showToast('Lỗi khi điều chỉnh phí ship: ' + (error.error?.message || error.message), 'error');
      }
    });
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
            // Customer doesn't exist, create new one with unique email and phone
            const baseEmail = `${customerName.toLowerCase().replace(/\s+/g, '')}@example.com`;
            
            // Lấy số điện thoại từ form nếu có, nếu không thì tạo unique
            let phoneNumber = '';
            if (this.editingInvoice?.soDienThoaiKhachHang && 
                this.editingInvoice.soDienThoaiKhachHang.trim() !== '' &&
                this.editingInvoice.soDienThoaiKhachHang.trim() !== 'Chưa có') {
              phoneNumber = this.editingInvoice.soDienThoaiKhachHang.trim();
            } else {
              // Tạo số điện thoại unique bằng cách thêm timestamp
              const timestamp = Date.now();
              phoneNumber = `TEMP_${timestamp}`;
            }
            
            this.generateUniqueEmail(baseEmail).then((uniqueEmail) => {
              // ✅ BỎ QUA VALIDATE SỐ ĐIỆN THOẠI - Tạo khách hàng trực tiếp không cần check
              // (Theo yêu cầu: bỏ qua validate số điện thoại đã tồn tại)
              
            const newCustomer = {
              tenKhachHang: customerName,
                email: uniqueEmail,
                soDienThoai: phoneNumber,
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
                  // Nếu lỗi do email trùng, thử lại với email unique mới
                  if (error.error?.message && error.error.message.includes('Email đã tồn tại')) {
                    this.generateUniqueEmail(baseEmail).then((newUniqueEmail) => {
                      newCustomer.email = newUniqueEmail;
                      this.hoaDonService.createCustomer(newCustomer).subscribe({
                        next: (retryCustomer) => {
                          console.log('New customer created with unique email:', retryCustomer);
                          resolve(retryCustomer.id);
                        },
                        error: (retryError) => {
                          console.error('Error creating customer (retry):', retryError);
                          reject(retryError);
                        }
                      });
                    });
                  } else {
                reject(error);
                  }
              }
              });
            }).catch((emailError) => {
              console.error('Error generating unique email:', emailError);
              reject(emailError);
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

  private async generateUniqueEmail(baseEmail: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // First check if base email exists
      this.khachHangService.checkEmailExists(baseEmail).subscribe({
        next: (exists) => {
          if (!exists) {
            // Email is available, use it
            resolve(baseEmail);
          } else {
            // Email exists, generate unique one with timestamp
            const timestamp = Date.now();
            const [localPart, domain] = baseEmail.split('@');
            const uniqueEmail = `${localPart}_${timestamp}@${domain}`;
            console.log(`Email ${baseEmail} exists, using unique: ${uniqueEmail}`);
            resolve(uniqueEmail);
          }
        },
        error: (error) => {
          // If check fails, use timestamp to make it unique anyway
          console.warn('Could not check email existence, using timestamp:', error);
          const timestamp = Date.now();
          const [localPart, domain] = baseEmail.split('@');
          const uniqueEmail = `${localPart}_${timestamp}@${domain}`;
          resolve(uniqueEmail);
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
      'CHO_XAC_NHAN': 'fa-solid fa-hourglass-half text-warning',
      'DA_XAC_NHAN': 'fa-solid fa-circle-check text-success',
      'DANG_GIAO_HANG': 'fa-solid fa-truck-fast text-primary',
      'DA_GIAO_HANG': 'fa-solid fa-box-open text-info',
      'HUY': 'fa-solid fa-circle-xmark text-danger'
    };
    return statusMap[status] || 'fa-solid fa-question-circle';
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

  /**
   * Chuyển đổi mã phương thức thanh toán sang label hiển thị
   */
  getPaymentMethodLabel(method?: string): string {
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

  // Derived payment status from current invoice status

  public getDerivedPaymentStatus(): 'pending' | 'paid' | 'cancelled' {
    const status = this.invoice?.trangThai;
    if (status === 'HUY') return 'cancelled';
    
    // Nếu phương thức thanh toán là "Chuyển khoản ngân hàng" => trạng thái thanh toán là "Đã thanh toán"
    const paymentMethod = this.invoice?.phuongThucThanhToan || '';
    const paymentMethodLower = paymentMethod.toLowerCase();
    if (paymentMethodLower === 'transfer' || 
        paymentMethodLower === 'chuyển khoản' || 
        paymentMethodLower === 'chuyen khoan' ||
        paymentMethodLower === 'chuyển khoản ngân hàng' ||
        paymentMethodLower === 'chuyen khoan ngan hang') {
      return 'paid';
    }
    
    if (status === 'DA_GIAO_HANG') return 'paid';
    return 'pending';
  }

  public getDerivedPaymentStatusLabel(): string {
    const s = this.getDerivedPaymentStatus();
    if (s === 'paid') return 'Đã thanh toán';
    if (s === 'cancelled') return 'Đã hủy';
    return 'Chờ thanh toán';
  }

  public getDerivedPaymentStatusClass(): string {
    const s = this.getDerivedPaymentStatus();
    if (s === 'paid') return 'text-success';
    if (s === 'cancelled') return 'text-danger';
    return 'text-warning';
  }

  /**
   * Chuyển đổi district code sang district ID cho GHN API
   * GHN API yêu cầu district_id (số) thay vì district code (string)
   * Tạm thời sử dụng district code như một số (parseInt)
   */
  private getDistrictIdForGHN(districtCode: string): number {
    // Nếu district code là số, parse nó
    const parsed = parseInt(districtCode, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
    // Nếu không parse được, trả về giá trị mặc định (1442 - Quận Ba Đình, Hà Nội)
    console.warn(`⚠️ Could not parse district code ${districtCode}, using default district ID 1442`);
    return 1442;
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
      'DA_GIAO_HANG': 'Đã Hoàn Thành',
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

    this.loadingAddresses = true;

    this.customerAddressService.getAddressesByCustomerId(khachHangId).subscribe({
      next: (addresses) => {
        console.log('✅ Customer addresses loaded:', addresses);
        this.customerAddresses = addresses || [];
        this.loadingAddresses = false;

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
        this.customerAddresses = [];
        this.loadingAddresses = false;
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
   * Load danh sách tỉnh/thành phố
   */
  loadProvinces(): void {
    // Nếu đã load rồi thì không load lại
    if (this.provinces.length > 0) {
      console.log('✅ Provinces already loaded:', this.provinces.length);
      // Nếu đang trong edit mode và có địa chỉ, load districts
      if (this.isEditMode && this.editingInvoice?.tinhThanh) {
        setTimeout(() => {
          this.findProvinceCodeAndLoadDistricts(this.editingInvoice?.tinhThanh || '');
        }, 100);
      }
      return;
    }

    this.loadingProvinces = true;
    console.log('🔄 Loading provinces from local data...');
    
    try {
      // Sử dụng dữ liệu local từ sub-vn package thay vì gọi API
      this.provinces = provincesData as any as Array<{ code: string; name: string }>;
      this.loadingProvinces = false;
      console.log('✅ Loaded provinces from local data:', this.provinces.length);
      this.cdr.detectChanges();
      
      // Nếu đang trong edit mode và có địa chỉ, load districts sau khi provinces load xong
      if (this.isEditMode && this.editingInvoice?.tinhThanh) {
        setTimeout(() => {
          this.findProvinceCodeAndLoadDistricts(this.editingInvoice?.tinhThanh || '');
        }, 100);
      }
    } catch (error) {
      console.error('❌ Error loading provinces from local data:', error);
      // Fallback: thử gọi API nếu local data không có
      this.vietnamAddressService.getProvinces().subscribe({
        next: (provinces) => {
          this.provinces = provinces || [];
          this.loadingProvinces = false;
          console.log('✅ Loaded provinces from API (fallback):', this.provinces.length);
          this.cdr.detectChanges();
          
          if (this.isEditMode && this.editingInvoice?.tinhThanh) {
            setTimeout(() => {
              this.findProvinceCodeAndLoadDistricts(this.editingInvoice?.tinhThanh || '');
            }, 100);
          }
        },
        error: (apiError) => {
          console.error('❌ Error loading provinces from API:', apiError);
          this.loadingProvinces = false;
          this.provinces = [];
          this.cdr.detectChanges();
        }
      });
    }
  }

  /**
   * Tìm province code từ tên tỉnh và load districts
   */
  findProvinceCodeAndLoadDistricts(provinceName: string): void {
    if (!provinceName || provinceName.trim() === '') {
      console.warn('⚠️ Province name is empty');
      return;
    }

    console.log('🔍 Finding province code for:', provinceName);
    console.log('   Available provinces:', this.provinces.length);
    
    // Tìm province với nhiều cách matching
    const province = this.provinces.find(p => {
      const pName = p.name.trim().toLowerCase();
      const searchName = provinceName.trim().toLowerCase();
      return pName === searchName || 
             pName.includes(searchName) || 
             searchName.includes(pName) ||
             pName.replace(/\s+/g, '') === searchName.replace(/\s+/g, '');
    });
    
    if (province) {
      console.log('✅ Found province:', province);
      this.selectedProvince = province.code;
      if (this.editingInvoice) {
        this.editingInvoice.tinhThanh = province.name;
      }
      this.loadDistrictsByProvince(province.code);
      
      // Nếu đã có quận/huyện, tìm và load wards
      if (this.editingInvoice?.quanHuyen) {
        // Đợi districts load xong
        setTimeout(() => {
          const district = this.districts.find(d => {
            const dName = d.name.trim().toLowerCase();
            const searchName = (this.editingInvoice?.quanHuyen || '').trim().toLowerCase();
            return dName === searchName || 
                   dName.includes(searchName) || 
                   searchName.includes(dName) ||
                   dName.replace(/\s+/g, '') === searchName.replace(/\s+/g, '');
          });
          if (district) {
            console.log('✅ Found district:', district);
            this.selectedDistrict = district.code;
            if (this.editingInvoice) {
              this.editingInvoice.quanHuyen = district.name;
            }
            this.loadWardsByDistrict(district.code);
            
            // Nếu đã có phường/xã, tìm và set selectedWard
            if (this.editingInvoice?.phuongXa) {
              setTimeout(() => {
                const ward = this.wards.find(w => {
                  const wName = w.name.trim().toLowerCase();
                  const searchName = (this.editingInvoice?.phuongXa || '').trim().toLowerCase();
                  return wName === searchName || 
                         wName.includes(searchName) || 
                         searchName.includes(wName) ||
                         wName.replace(/\s+/g, '') === searchName.replace(/\s+/g, '');
                });
                if (ward) {
                  console.log('✅ Found ward:', ward);
                  this.selectedWard = ward.code;
                  if (this.editingInvoice) {
                    this.editingInvoice.phuongXa = ward.name;
                  }
                }
                this.cdr.detectChanges();
              }, 500);
            } else {
              this.cdr.detectChanges();
            }
          } else {
            console.warn('⚠️ District not found:', this.editingInvoice?.quanHuyen);
            this.cdr.detectChanges();
          }
        }, 500);
      } else {
        this.cdr.detectChanges();
      }
    } else {
      console.warn('⚠️ Province not found:', provinceName);
      console.log('   Available provinces:', this.provinces.map(p => p.name).slice(0, 10));
    }
  }

  /**
   * Load danh sách quận/huyện theo tỉnh
   */
  loadDistrictsByProvince(provinceCode: string): void {
    if (!provinceCode || provinceCode === '') {
      this.districts = [];
      this.wards = [];
      this.selectedDistrict = '';
      this.selectedWard = '';
      return;
    }

    console.log('🔄 Loading districts for province code:', provinceCode);
    this.loadingDistricts = true;
    this.districts = [];
    this.wards = [];
    this.selectedDistrict = '';
    this.selectedWard = '';

    try {
      // Sử dụng dữ liệu local từ sub-vn package
      const allDistricts = districtsData as any as Array<{
        code: string;
        name: string;
        province_code: string;
      }>;
      this.districts = allDistricts.filter((d) => d.province_code === provinceCode);
      this.loadingDistricts = false;
      console.log('✅ Loaded districts from local data:', this.districts.length);
      
      // Nếu đã có quận/huyện trong editingInvoice, tìm và load wards
      if (this.editingInvoice?.quanHuyen) {
        const district = this.districts.find(d => {
          const dName = d.name.trim().toLowerCase();
          const searchName = (this.editingInvoice?.quanHuyen || '').trim().toLowerCase();
          return dName === searchName || 
                 dName.includes(searchName) || 
                 searchName.includes(dName) ||
                 dName.replace(/\s+/g, '') === searchName.replace(/\s+/g, '');
        });
        if (district) {
          this.selectedDistrict = district.code;
          this.loadWardsByDistrict(district.code);
        }
      }
      this.cdr.detectChanges();
    } catch (error) {
      console.error('❌ Error loading districts from local data:', error);
      // Fallback: thử gọi API
      this.vietnamAddressService.getDistrictsByProvince(provinceCode).subscribe({
        next: (districts) => {
          this.districts = districts || [];
          this.loadingDistricts = false;
          console.log('✅ Loaded districts from API (fallback):', this.districts.length);
          
          if (this.editingInvoice?.quanHuyen) {
            const district = districts.find(d => d.name === this.editingInvoice?.quanHuyen);
            if (district) {
              this.selectedDistrict = district.code;
              this.loadWardsByDistrict(district.code);
            }
          }
          this.cdr.detectChanges();
        },
        error: (apiError) => {
          console.error('❌ Error loading districts from API:', apiError);
          this.loadingDistricts = false;
          this.districts = [];
          this.cdr.detectChanges();
        }
      });
    }
  }

  /**
   * Load danh sách phường/xã theo quận/huyện
   */
  loadWardsByDistrict(districtCode: string): void {
    if (!districtCode || districtCode === '') {
      this.wards = [];
      this.selectedWard = '';
      return;
    }

    console.log('🔄 Loading wards for district code:', districtCode);
    this.loadingWards = true;
    this.wards = [];
    this.selectedWard = '';

    try {
      // Sử dụng dữ liệu local từ sub-vn package
      const allWards = wardsData as any as Array<{
        code: string;
        name: string;
        district_code: string;
      }>;
      this.wards = allWards.filter((w) => w.district_code === districtCode);
      this.loadingWards = false;
      console.log('✅ Loaded wards from local data:', this.wards.length);
      
      // Nếu đã có phường/xã trong editingInvoice, tìm và set selectedWard
      if (this.editingInvoice?.phuongXa) {
        const ward = this.wards.find(w => {
          const wName = w.name.trim().toLowerCase();
          const searchName = (this.editingInvoice?.phuongXa || '').trim().toLowerCase();
          return wName === searchName || 
                 wName.includes(searchName) || 
                 searchName.includes(wName) ||
                 wName.replace(/\s+/g, '') === searchName.replace(/\s+/g, '');
        });
        if (ward) {
          this.selectedWard = ward.code;
        }
      }
      this.cdr.detectChanges();
    } catch (error) {
      console.error('❌ Error loading wards from local data:', error);
      // Fallback: thử gọi API
      this.vietnamAddressService.getWardsByDistrict(districtCode).subscribe({
        next: (wards) => {
          this.wards = wards || [];
          this.loadingWards = false;
          console.log('✅ Loaded wards from API (fallback):', this.wards.length);
          
          if (this.editingInvoice?.phuongXa) {
            const ward = wards.find(w => w.name === this.editingInvoice?.phuongXa);
            if (ward) {
              this.selectedWard = ward.code;
            }
          }
          this.cdr.detectChanges();
        },
        error: (apiError) => {
          console.error('❌ Error loading wards from API:', apiError);
          this.loadingWards = false;
          this.wards = [];
          this.cdr.detectChanges();
        }
      });
    }
  }

  /**
   * Xử lý khi chọn tỉnh/thành phố
   */
  onProvinceChange(provinceCode: string): void {
    const province = this.provinces.find(p => p.code === provinceCode);
    if (province && this.editingInvoice) {
      this.editingInvoice.tinhThanh = province.name;
      this.selectedProvince = provinceCode;
      this.loadDistrictsByProvince(provinceCode);
      
      // Reset district và ward
      this.editingInvoice.quanHuyen = '';
      this.editingInvoice.phuongXa = '';
      this.selectedDistrict = '';
      this.selectedWard = '';
      
      // Tự động tính lại phí ship
      this.calculateShippingFeeOnAddressChange();
    }
  }

  /**
   * Xử lý khi chọn quận/huyện
   */
  onDistrictChange(districtCode: string): void {
    const district = this.districts.find(d => d.code === districtCode);
    if (district && this.editingInvoice) {
      this.editingInvoice.quanHuyen = district.name;
      this.selectedDistrict = districtCode;
      this.loadWardsByDistrict(districtCode);
      
      // Reset ward
      this.editingInvoice.phuongXa = '';
      this.selectedWard = '';
      
      // Tự động tính lại phí ship
      this.calculateShippingFeeOnAddressChange();
    }
  }

  /**
   * Xử lý khi chọn phường/xã
   */
  onWardChange(wardCode: string): void {
    const ward = this.wards.find(w => w.code === wardCode);
    if (ward && this.editingInvoice) {
      this.editingInvoice.phuongXa = ward.name;
      this.selectedWard = wardCode;
      
      // Tự động tính lại phí ship
      this.calculateShippingFeeOnAddressChange();
    }
  }

  /**
   * Tự động tính lại phí ship khi địa chỉ thay đổi
   */
  calculateShippingFeeOnAddressChange(): void {
    if (!this.editingInvoice || !this.editingInvoice.tinhThanh || !this.editingInvoice.quanHuyen) {
      return;
    }

    this.calculatingShippingFee = true;
    console.log('🚚 Calculating shipping fee for new address...');

    const ghnRequest = {
      province: this.editingInvoice.tinhThanh,
      to_district_id: 0, // Sẽ được tính từ tên quận/huyện
      to_ward_code: this.selectedWard || '',
      weight: this.invoice?.khoiLuong ? Math.round(this.invoice.khoiLuong * 1000) : 1000,
      length: this.invoice?.chieuDai || 20,
      width: this.invoice?.chieuRong || 20,
      height: this.invoice?.chieuCao || 20,
      insurance_value: this.invoice?.tongTien || 0
    };

    this.ghnService.calculateShippingFeeViaBackend(ghnRequest).subscribe({
      next: (ghnResponse) => {
        console.log('✅ GHN API response:', ghnResponse);
        this.calculatingShippingFee = false;
        
        if (ghnResponse && ghnResponse.code === 200 && ghnResponse.data) {
          const newShippingFee = ghnResponse.data.total || 0;
          if (this.editingInvoice) {
            this.editingInvoice.phiGiaoHang = newShippingFee;
          }
          console.log('💰 New shipping fee calculated:', newShippingFee);
          this.showToast(`Phí ship mới: ${this.formatCurrency(newShippingFee)} ₫`, 'success');
        } else {
          console.warn('⚠️ GHN API returned error');
          this.showToast('Không thể tính phí ship tự động. Vui lòng nhập thủ công.', 'warning');
        }
      },
      error: (ghnError) => {
        console.error('❌ Error calling GHN API:', ghnError);
        this.calculatingShippingFee = false;
        this.showToast('Không thể tính phí ship tự động. Vui lòng nhập thủ công.', 'warning');
      }
    });
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
      next: (chiTietProducts: ChiTietSanPhamResponse[]) => {
        console.log('✅ ChiTietSanPham loaded from API:', chiTietProducts);
        console.log('📊 Products count:', chiTietProducts.length);

        // Map ChiTietSanPhamResponse to match frontend expected format
        this.allProducts = chiTietProducts.map((product: ChiTietSanPhamResponse) => ({
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
          anhSanPham: '', // ChiTietSanPhamResponse không có anhSanPham
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
        ) as ChiTietSanPhamResponse[];

        // Map ChiTietSanPhamResponse to match frontend expected format
        this.allProducts = chiTietProducts.map((product: ChiTietSanPhamResponse) => ({
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
          anhSanPham: '', // ChiTietSanPhamResponse không có anhSanPham
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
        sanPhamId: p.sanPhamId || p.id, // ID của SanPham gốc
        chiTietSanPhamId: p.chiTietSanPhamId || p.id, // QUAN TRỌNG: chiTietSanPhamId cho backend
        tenSanPham: p.tenSanPham,
        soLuong: p.soLuong || 1,
        donGia: p.donGia || p.giaBan || 0,
        thanhTien: p.thanhTien || ((p.soLuong || 1) * (p.donGia || p.giaBan || 0)),
        maSanPham: p.maSanPham || '',
        danhMuc: p.danhMuc || '',
        thuongHieu: p.thuongHieu || '',
        soLuongTon: p.soLuongTon || 0,
        trangThai: p.trangThai || 'ACTIVE',
        // Thông tin chi tiết sản phẩm
        kichThuoc: p.kichThuoc || '',
        mauSac: p.mauSac || '',
        trongLuong: p.trongLuong || '',
        anhSanPham: p.anhSanPham || ''
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
   * Xử lý khi trạng thái thay đổi từ timeline (click vào icon)
   */
  onStatusChangeFromTimeline(newStatus: string): void {
    console.log('📥 ========== RECEIVED STATUS CHANGE ==========');
    console.log('📥 onStatusChangeFromTimeline called with:', newStatus);
    console.log('📥 Type of newStatus:', typeof newStatus);
    console.log('📥 ===========================================');
    console.log('📋 Current invoice data:', {
      invoice: this.invoice,
      invoiceId: this.invoiceId,
      currentStatus: this.invoice?.trangThai
    });

    if (!this.invoice) {
      console.error('❌ Cannot update: invoice is null');
      this.showToast('Không có dữ liệu hóa đơn để cập nhật', 'error');
      return;
    }

    if (!this.invoiceId) {
      console.error('❌ Cannot update: invoiceId is missing');
      this.showToast('Không tìm thấy ID hóa đơn', 'error');
      return;
    }

    if (!newStatus) {
      console.error('❌ Cannot update: newStatus is empty');
      this.showToast('Trạng thái mới không hợp lệ', 'error');
      return;
    }

    // Kiểm tra xem trạng thái mới có khác trạng thái hiện tại không
    if (this.invoice.trangThai === newStatus) {
      console.log('ℹ️ Status unchanged:', newStatus);
      const statusLabel = this.getStatusLabel(newStatus);
      this.showToast(`Trạng thái hiện tại đã là: ${statusLabel}`, 'info');
      return;
    }

    console.log('🔄 Updating invoice status from', this.invoice.trangThai, 'to', newStatus);
    console.log('🌐 Calling API: PATCH /api/hoa-don/' + this.invoiceId + '/trang-thai?trangThai=' + newStatus);

    this.savingStatus = true;

    // Gọi API để cập nhật trạng thái
    this.hoaDonService.updateTrangThaiHoaDon(this.invoiceId, newStatus).subscribe({
      next: (updatedInvoice) => {
        console.log('✅ Status updated successfully:', updatedInvoice);
        console.log('📊 Updated invoice:', {
          id: updatedInvoice.id,
          maHoaDon: updatedInvoice.maHoaDon,
          trangThai: updatedInvoice.trangThai
        });

        // Cập nhật invoice với dữ liệu mới từ server
        this.invoice = updatedInvoice;
        this.originalStatus = updatedInvoice.trangThai as 'CHO_XAC_NHAN' | 'DA_XAC_NHAN' | 'DANG_GIAO_HANG' | 'DA_GIAO_HANG' | 'HUY';
        this.statusChanged = false;
        this.savingStatus = false;
        this.selectedStatus = ''; // Reset selected status after successful update

        // Hiển thị thông báo thành công
        const statusLabel = this.getStatusLabel(updatedInvoice.trangThai);
        this.showToast(`Đã cập nhật trạng thái thành: ${statusLabel}`, 'success');

        // Reload lại invoice detail để đảm bảo view được cập nhật đúng theo trạng thái mới
        // Điều này đảm bảo khi chuyển từ DANG_GIAO_HANG sang trạng thái khác,
        // view sẽ tự động chuyển từ timeline sang icon display
        console.log('🔄 Reloading invoice detail to update view...');
        this.loadInvoiceDetail();

        console.log('✅ Invoice reloaded, view should update based on new status:', updatedInvoice.trangThai);
      },
      error: (error) => {
        console.error('❌ Error updating status:', error);
        console.error('❌ Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });

        this.savingStatus = false;

        // Hiển thị thông báo lỗi chi tiết
        let errorMessage = 'Vui lòng thử lại';
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.status === 404) {
          errorMessage = 'Không tìm thấy hóa đơn';
        } else if (error.status === 400) {
          errorMessage = 'Trạng thái không hợp lệ';
        } else if (error.status === 500) {
          errorMessage = 'Lỗi server, vui lòng thử lại sau';
        }

        this.showToast('Lỗi khi cập nhật trạng thái: ' + errorMessage, 'error');

        // Reload invoice để đảm bảo UI đồng bộ với server
        console.log('🔄 Reloading invoice to sync UI with server');
        this.loadInvoiceDetail();
      }
    });
  }

  /**
   * Xử lý khi thay đổi trạng thái từ dropdown
   */
  onStatusSelectChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedStatus = selectElement.value;
    console.log('📝 Status selected from dropdown:', this.selectedStatus);
  }

  /**
   * Cập nhật trạng thái hóa đơn từ dropdown
   */
  updateInvoiceStatus(): void {
    if (!this.selectedStatus || !this.invoice) {
      this.showToast('Vui lòng chọn trạng thái mới', 'error');
      return;
    }

    if (this.selectedStatus === this.invoice.trangThai) {
      this.showToast('Trạng thái đã được chọn là trạng thái hiện tại', 'info');
      return;
    }

    // Xác nhận với người dùng
    const currentStatusLabel = this.getStatusLabel(this.invoice.trangThai);
    const newStatusLabel = this.getStatusLabel(this.selectedStatus);
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn đổi trạng thái từ "${currentStatusLabel}" sang "${newStatusLabel}"?`
    );

    if (!confirmed) {
      console.log('❌ User cancelled status change');
      return;
    }

    // Gọi phương thức cập nhật trạng thái hiện có
    this.onStatusChangeFromTimeline(this.selectedStatus);
  }

  /**
   * Lấy label của trạng thái
   */
  /**
   * Lấy icon class cho single status display (không phải timeline)
   */
  getSingleStatusIcon(status: string): string {
    const statusMap: { [key: string]: string } = {
      'CHO_XAC_NHAN': 'fas fa-clock',
      'DA_XAC_NHAN': 'fas fa-clipboard-check',
      'DANG_GIAO_HANG': 'fas fa-truck',
      'DA_GIAO_HANG': 'fas fa-check-double',
      'HUY': 'fas fa-times-circle',
      'DA_HUY': 'fas fa-times-circle'
    };
    return statusMap[status] || 'fas fa-question-circle';
  }

  /**
   * Lấy CSS class cho status icon wrapper
   */
  getSingleStatusIconClass(status: string): string {
    const statusClassMap: { [key: string]: string } = {
      'CHO_XAC_NHAN': 'status-icon-pending',
      'DA_XAC_NHAN': 'status-icon-confirmed',
      'DANG_GIAO_HANG': 'status-icon-shipping',
      'DA_GIAO_HANG': 'status-icon-delivered',
      'HUY': 'status-icon-cancelled',
      'DA_HUY': 'status-icon-cancelled'
    };
    return statusClassMap[status] || 'status-icon-unknown';
  }

  getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'CHO_XAC_NHAN': 'Chờ xác nhận',
      'DA_XAC_NHAN': 'Đã xác nhận',
      'DANG_GIAO_HANG': 'Đang giao hàng',
      'DA_GIAO_HANG': 'Đã Hoàn Thành',
      'HUY': 'Hủy'
    };
    return statusMap[status] || status;
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

        // Reload invoice để cập nhật UI và view theo trạng thái mới
        // Điều này đảm bảo view tự động chuyển đổi giữa timeline và icon display
        console.log('🔄 Reloading invoice detail to update view based on new status:', updatedInvoice.trangThai);
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

  /**
   * Tính tổng tiền bao gồm phí vận chuyển
   * Nếu người nhận chịu phí thì cộng phí vận chuyển vào tổng tiền
   * Nếu người gửi chịu phí thì không cộng phí vận chuyển
   */
  getTotalAmountWithShipping(): number {
    if (!this.invoice) return 0;
    const tongTien = this.invoice.tongTien || 0;
    const phiVanChuyen = this.invoice.phiGiaoHang || 0;
    const tienGiamGia = this.invoice.tienGiamGia || 0;

    // Tính tổng: tổng tiền - tiền giảm
    let total = tongTien - tienGiamGia;

    // Nếu người nhận chịu phí, cộng phí vận chuyển vào tổng tiền
    if (this.invoice.nguoiChiuPhi === 'nguoi_nhan') {
      total += phiVanChuyen;
    }

    return total;
  }

  /**
   * Hoàn thành hóa đơn - cập nhật trạng thái theo logic:
   * - Nếu trạng thái là "Đã xác nhận" (DA_XAC_NHAN) => chuyển sang "Đang vận chuyển" (DANG_GIAO_HANG)
   * - Nếu trạng thái là "Đang vận chuyển" (DANG_GIAO_HANG) => chuyển sang "Đã hoàn thành" (DA_GIAO_HANG)
   */
  completeInvoice(): void {
    if (!this.invoice || !this.invoice.id) {
      this.showToast('Không tìm thấy hóa đơn', 'error');
      return;
    }

    // Xác định trạng thái mới dựa trên trạng thái hiện tại
    let newStatus: string;
    let statusMessage: string;

    if (this.invoice.trangThai === 'DA_XAC_NHAN') {
      // Đã xác nhận => Đang vận chuyển
      newStatus = 'DANG_GIAO_HANG';
      statusMessage = 'Đang vận chuyển';
    } else if (this.invoice.trangThai === 'DANG_GIAO_HANG') {
      // Đang vận chuyển => Đã hoàn thành
      newStatus = 'DA_GIAO_HANG';
      statusMessage = 'Đã hoàn thành';
    } else {
      this.showToast('Trạng thái hiện tại không thể chuyển sang trạng thái tiếp theo', 'warning');
      return;
    }

    // Xác nhận với người dùng
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn cập nhật hóa đơn "${this.invoice.maHoaDon}"?\n\n` +
      `Hóa đơn sẽ được chuyển sang trạng thái "${statusMessage}".`
    );

    if (!confirmed) {
      return;
    }

    this.savingStatus = true;

    // Cập nhật trạng thái
    console.log('🔄 Calling updateTrangThaiHoaDon with invoiceId:', this.invoiceId, 'trangThai:', newStatus);
    this.hoaDonService.updateTrangThaiHoaDon(this.invoiceId, newStatus).subscribe({
      next: (updatedInvoice) => {
        console.log('✅ Invoice status updated successfully:', updatedInvoice);
        this.savingStatus = false;

        // Hiển thị thông báo thành công
        this.showToast(`Cập nhật hóa đơn thành công! Trạng thái đã được cập nhật thành "${statusMessage}".`, 'success');

        // Reload invoice để cập nhật UI và view theo trạng thái mới
        // Điều này đảm bảo khi chuyển từ DANG_GIAO_HANG sang DA_GIAO_HANG,
        // view sẽ tự động chuyển từ timeline sang icon display
        console.log('🔄 Reloading invoice detail to update view based on new status:', updatedInvoice.trangThai);
        this.loadInvoiceDetail();

        // Sau 2 giây, chuyển về trang quản lý hóa đơn
        setTimeout(() => {
          this.router.navigate(['/invoices']);
        }, 2000);
      },
      error: (error) => {
        console.error('❌ Error updating invoice status:', error);
        console.error('   - Status: ' + error.status);
        console.error('   - StatusText: ' + error.statusText);
        console.error('   - Error body: ', error.error);
        console.error('   - Error message: ', error.message);
        console.error('   - Full error: ', error);
        this.savingStatus = false;
        const errorMessage = error.error?.message || error.error || error.message || 'Vui lòng thử lại';
        this.showToast('Lỗi khi cập nhật trạng thái: ' + errorMessage, 'error');
      }
    });
  }

  /**
   * Khách hàng hủy đơn hàng (chỉ khi trạng thái là CHO_XAC_NHAN)
   */
  cancelOrderByCustomer(): void {
    if (!this.invoice || !this.invoice.id) {
      this.showToast('Không tìm thấy đơn hàng', 'error');
      return;
    }

    // Chỉ cho phép hủy khi trạng thái là CHO_XAC_NHAN
    if (this.invoice.trangThai !== 'CHO_XAC_NHAN') {
      this.showToast('Chỉ có thể hủy đơn hàng khi đang chờ xác nhận', 'warning');
      return;
    }

    // Xác nhận với khách hàng
    if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này? Số lượng sản phẩm sẽ được hoàn lại vào kho.')) {
      return;
    }

    this.savingStatus = true;
    console.log('🔄 Customer cancelling order:', this.invoice.id);

    // Gọi API cập nhật trạng thái thành DA_HUY
    // Backend sẽ tự động hoàn lại stock cho đơn hàng online
    this.hoaDonService.updateTrangThaiHoaDon(this.invoice.id, 'DA_HUY').subscribe({
      next: (updatedInvoice) => {
        console.log('✅ Order cancelled successfully by customer:', updatedInvoice);
        this.savingStatus = false;

        // Cập nhật invoice với dữ liệu mới
        this.invoice = updatedInvoice;

        // Hiển thị thông báo thành công với thông tin hoàn tiền
        // Backend sẽ tự động xử lý hoàn tiền nếu đơn hàng đã thanh toán
        const refundMessage = this.invoice.phuongThucThanhToan === 'transfer' && this.invoice.ngayThanhToan
          ? 'Đã hủy đơn hàng thành công. Số lượng sản phẩm đã được hoàn lại vào kho. Tiền sẽ được hoàn trả trong vòng 3-5 ngày làm việc.'
          : 'Đã hủy đơn hàng thành công. Số lượng sản phẩm đã được hoàn lại vào kho.';
        this.showToast(refundMessage, 'success');

        // Reload lại invoice detail để cập nhật UI
        setTimeout(() => {
          this.loadInvoiceDetail();
        }, 1000);
      },
      error: (error) => {
        console.error('❌ Error cancelling order:', error);
        this.savingStatus = false;

        let errorMessage = 'Không thể hủy đơn hàng. Vui lòng thử lại!';
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }

        this.showToast(errorMessage, 'error');
      }
    });
  }

  /**
   * Reset form xác nhận hóa đơn
   */
  resetConfirmInvoiceForm(): void {
    this.confirmInvoiceData = {
      ngayDuKienGiao: '',
      khoiLuong: null,
      chieuDai: null,
      chieuRong: null,
      chieuCao: null,
      phiGiaoHang: 0,
      nguoiChiuPhi: 'nguoi_gui',
    };
  }

  /**
   * Lấy ngày hôm nay để set min cho date picker
   */
  getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  /**
   * Xác nhận hóa đơn với thông tin vận chuyển
   */
  submitConfirmInvoice(): void {
    if (!this.invoice || !this.invoice.id) {
      this.showToast('Không tìm thấy hóa đơn', 'error');
      return;
    }

    // Validate form
    if (!this.confirmInvoiceData.ngayDuKienGiao) {
      this.showToast('Vui lòng nhập ngày dự kiến giao', 'warning');
      return;
    }

    if (!this.confirmInvoiceData.khoiLuong || this.confirmInvoiceData.khoiLuong <= 0) {
      this.showToast('Vui lòng nhập khối lượng hợp lệ', 'warning');
      return;
    }

    if (!this.confirmInvoiceData.chieuDai || !this.confirmInvoiceData.chieuRong || !this.confirmInvoiceData.chieuCao) {
      this.showToast('Vui lòng nhập đầy đủ kích thước (dài, rộng, cao)', 'warning');
      return;
    }

    this.savingStatus = true;

    // ƯU TIÊN: Sử dụng dữ liệu đã load sẵn từ this.invoice (từ loadInvoiceDetail)
    // Tránh gọi API lại không cần thiết và có thể mất dữ liệu
    console.log('📦 Current invoice data (from this.invoice):', {
      id: this.invoice.id,
      maHoaDon: this.invoice.maHoaDon,
      danhSachSanPham: this.invoice.danhSachSanPham?.length || 0,
      danhSachChiTiet: (this.invoice as any).danhSachChiTiet?.length || 0
    });

    // Validate các field bắt buộc
    if (!this.invoice.maHoaDon || !this.invoice.maHoaDon.trim()) {
      console.error('❌ maHoaDon is required but missing or empty');
      this.showToast('Lỗi: Mã hóa đơn không hợp lệ!', 'error');
      this.savingStatus = false;
      return;
    }

    if (!this.invoice.khachHangId) {
      console.error('❌ khachHangId is required but missing');
      this.showToast('Lỗi: Khách hàng ID không hợp lệ!', 'error');
      this.savingStatus = false;
      return;
    }

    if (!this.invoice.tongTien || Number(this.invoice.tongTien) <= 0) {
      console.error('❌ tongTien is required and must be > 0:', this.invoice.tongTien);
      this.showToast('Lỗi: Tổng tiền không hợp lệ!', 'error');
      this.savingStatus = false;
      return;
    }

    const updateData: any = {
      // Các trường bắt buộc từ hóa đơn hiện tại (đã validate ở trên)
      maHoaDon: this.invoice.maHoaDon.trim(),
      khachHangId: this.invoice.khachHangId,
      tongTien: Number(this.invoice.tongTien), // Đảm bảo là number
      thanhTien: this.invoice.thanhTien ? Number(this.invoice.thanhTien) : Number(this.invoice.tongTien),
      tienGiamGia: this.invoice.tienGiamGia ? Number(this.invoice.tienGiamGia) : 0,
      soLuongSanPham: this.invoice.soLuongSanPham || 0,
      nhanVienId: this.invoice.nhanVienId || null,
      ghiChu: this.invoice.ghiChu || '',

      // Cập nhật trạng thái mới (phải là enum value từ backend)
      trangThai: 'DA_XAC_NHAN',

      // ✅ QUAN TRỌNG: Gửi thông tin vận chuyển để lưu vào ThongTinDonHang
      ngayDuKienGiao: this.confirmInvoiceData.ngayDuKienGiao ? new Date(this.confirmInvoiceData.ngayDuKienGiao).toISOString() : null,
      khoiLuong: this.confirmInvoiceData.khoiLuong || null,
      chieuDai: this.confirmInvoiceData.chieuDai || null,
      chieuRong: this.confirmInvoiceData.chieuRong || null,
      chieuCao: this.confirmInvoiceData.chieuCao || null,
      phiGiaoHang: this.confirmInvoiceData.phiGiaoHang || 0
    };

    // QUAN TRỌNG: Giữ lại danh sách sản phẩm từ hóa đơn hiện tại
    // Backend yêu cầu danhSachChiTiet với chiTietSanPhamId bắt buộc (không được null)
    // Ưu tiên: 1. danhSachChiTiet gốc từ this.invoice, 2. danhSachSanPham từ this.invoice
    let danhSachChiTietToUse: any[] = [];

    // Option 1: Sử dụng danhSachChiTiet gốc từ this.invoice (tốt nhất - đã được load từ loadInvoiceDetail)
    if ((this.invoice as any).danhSachChiTiet && Array.isArray((this.invoice as any).danhSachChiTiet) && (this.invoice as any).danhSachChiTiet.length > 0) {
      danhSachChiTietToUse = (this.invoice as any).danhSachChiTiet;
      console.log('✅ Using danhSachChiTiet from this.invoice:', danhSachChiTietToUse.length, 'items');
    }
    // Option 2: Sử dụng danhSachSanPham từ this.invoice
    else if (this.invoice.danhSachSanPham && Array.isArray(this.invoice.danhSachSanPham) && this.invoice.danhSachSanPham.length > 0) {
      console.log('✅ Using danhSachSanPham from this.invoice:', this.invoice.danhSachSanPham.length, 'items');
      danhSachChiTietToUse = this.invoice.danhSachSanPham;
    }
    // Option 3: Fallback - Load lại từ API nếu không có dữ liệu
    else {
      console.warn('⚠️ No products in this.invoice, loading from API...');
      this.hoaDonService.getHoaDonById(this.invoice.id).subscribe({
        next: (currentInvoice) => {
          console.log('📦 Loaded invoice from API:', {
            danhSachSanPham: currentInvoice.danhSachSanPham?.length || 0,
            danhSachChiTiet: (currentInvoice as any).danhSachChiTiet?.length || 0
          });

          if ((currentInvoice as any).danhSachChiTiet && Array.isArray((currentInvoice as any).danhSachChiTiet) && (currentInvoice as any).danhSachChiTiet.length > 0) {
            danhSachChiTietToUse = (currentInvoice as any).danhSachChiTiet;
            console.log('✅ Using danhSachChiTiet from API:', danhSachChiTietToUse.length, 'items');
          } else if (currentInvoice.danhSachSanPham && Array.isArray(currentInvoice.danhSachSanPham) && currentInvoice.danhSachSanPham.length > 0) {
            danhSachChiTietToUse = currentInvoice.danhSachSanPham;
            console.log('✅ Using danhSachSanPham from API:', danhSachChiTietToUse.length, 'items');
          }

          // Tiếp tục xử lý với danhSachChiTietToUse
          this.processSubmitConfirmInvoice(updateData, danhSachChiTietToUse);
        },
        error: (error) => {
          console.error('❌ Error loading invoice from API:', error);
          this.showToast('Lỗi khi tải thông tin hóa đơn', 'error');
          this.savingStatus = false;
        }
      });
      return; // Exit early, sẽ tiếp tục trong callback
    }

    // Tiếp tục xử lý với danhSachChiTietToUse đã có
    this.processSubmitConfirmInvoice(updateData, danhSachChiTietToUse);
  }

  /**
   * Xử lý submit confirm invoice với updateData và danhSachChiTietToUse
   */
  private processSubmitConfirmInvoice(updateData: any, danhSachChiTietToUse: any[]): void {
    // Map danhSachChiTietToUse sang format backend yêu cầu
    if (danhSachChiTietToUse.length > 0) {
      updateData.danhSachChiTiet = danhSachChiTietToUse
        .map((item: any) => {
          // Lấy chiTietSanPhamId - có thể từ item.chiTietSanPhamId hoặc item.sanPhamId
          let chiTietSanPhamId: number | null = null;

          if (item.chiTietSanPhamId != null && item.chiTietSanPhamId !== undefined) {
            chiTietSanPhamId = Number(item.chiTietSanPhamId);
          } else if (item.sanPhamId != null && item.sanPhamId !== undefined) {
            // Fallback: nếu không có chiTietSanPhamId, dùng sanPhamId (nhưng đây có thể không đúng)
            console.warn('⚠️ Using sanPhamId as chiTietSanPhamId fallback:', item.sanPhamId);
            chiTietSanPhamId = Number(item.sanPhamId);
          }

          if (!chiTietSanPhamId || isNaN(chiTietSanPhamId)) {
            console.warn('⚠️ Invalid chiTietSanPhamId in item:', item);
            return null;
          }

          // QUAN TRỌNG: Chỉ gửi các field cần thiết cho backend
          // Backend chỉ cần: chiTietSanPhamId, soLuong, donGia, giamGia, thanhTien
          return {
            id: item.id || null, // ID của HoaDonChiTiet (nếu có - để update existing item)
            chiTietSanPhamId: chiTietSanPhamId, // Bắt buộc phải có và là số hợp lệ
            soLuong: item.soLuong ? Number(item.soLuong) : 1, // Bắt buộc phải > 0
            donGia: item.donGia != null ? Number(item.donGia) : 0,
            giamGia: item.giamGia != null ? Number(item.giamGia) : 0,
            thanhTien: item.thanhTien != null ? Number(item.thanhTien) : ((item.donGia || 0) * (item.soLuong || 1))
            // Các field khác (tenSanPham, maSanPham, mauSac, etc.) không cần gửi vì backend sẽ load từ ChiTietSanPham
          };
        })
        .filter((item: any) => item != null && item.chiTietSanPhamId != null && !isNaN(item.chiTietSanPhamId));

      console.log('✅ Processed danhSachChiTiet:', updateData.danhSachChiTiet.length, 'valid items');
      console.log('📦 danhSachChiTiet details:', updateData.danhSachChiTiet.map((item: any) => ({
        chiTietSanPhamId: item.chiTietSanPhamId,
        tenSanPham: item.tenSanPham,
        soLuong: item.soLuong,
        donGia: item.donGia
      })));
    } else {
      updateData.danhSachChiTiet = [];
      console.warn('⚠️ No products found in any source');
    }

    // Validate: Đảm bảo có ít nhất một sản phẩm hợp lệ
    if (!updateData.danhSachChiTiet || updateData.danhSachChiTiet.length === 0) {
      console.error('❌ No valid products found! Cannot update invoice without products.');
      console.error('🔍 Debug info:', {
        invoiceDanhSachChiTiet: (this.invoice as any).danhSachChiTiet?.length || 0,
        invoiceDanhSachSanPham: this.invoice?.danhSachSanPham?.length || 0
      });
      this.showToast('Không thể xác nhận hóa đơn: Hóa đơn không có sản phẩm hợp lệ!', 'error');
      this.savingStatus = false;
      return;
    }

    // Cập nhật hóa đơn
    if (!this.invoice || !this.invoice.id) {
      this.showToast('Không tìm thấy hóa đơn', 'error');
      this.savingStatus = false;
      return;
    }

    // Đảm bảo format đúng cho backend:
    // - trangThai phải là string enum value (DA_XAC_NHAN)
    // - tongTien, thanhTien phải là number (BigDecimal trong backend)
    // - danhSachChiTiet phải là array (không null)
    const finalUpdateData: any = {
      ...updateData,
      // Đảm bảo trangThai là string enum value
      trangThai: 'DA_XAC_NHAN' as const,
      // Đảm bảo các số là number (BigDecimal sẽ được convert từ number)
      tongTien: Number(updateData.tongTien),
      thanhTien: Number(updateData.thanhTien),
      tienGiamGia: updateData.tienGiamGia ? Number(updateData.tienGiamGia) : 0,
      soLuongSanPham: updateData.soLuongSanPham || 0,
      // Đảm bảo danhSachChiTiet là array
      danhSachChiTiet: updateData.danhSachChiTiet || [],
      // ✅ QUAN TRỌNG: Đảm bảo thông tin vận chuyển được gửi lên backend
      ngayDuKienGiao: updateData.ngayDuKienGiao || null,
      khoiLuong: updateData.khoiLuong ? Number(updateData.khoiLuong) : null,
      chieuDai: updateData.chieuDai ? Number(updateData.chieuDai) : null,
      chieuRong: updateData.chieuRong ? Number(updateData.chieuRong) : null,
      chieuCao: updateData.chieuCao ? Number(updateData.chieuCao) : null,
      phiGiaoHang: updateData.phiGiaoHang ? Number(updateData.phiGiaoHang) : 0
    };

    // Log final data trước khi gửi
    console.log('📤 Final update data to send:', JSON.stringify(finalUpdateData, null, 2));

    this.hoaDonService.updateHoaDonNew(this.invoice.id, finalUpdateData).subscribe({
      next: (updatedInvoice) => {
        console.log('✅ Invoice confirmed successfully:', updatedInvoice);
        this.savingStatus = false;

        // Hiển thị thông báo thành công
        this.showToast('Xác nhận hóa đơn thành công! Trạng thái đã được cập nhật thành "Đã xác nhận".', 'success');

        // Reset form
        this.resetConfirmInvoiceForm();

        // Reload invoice để cập nhật UI và hiển thị view chi tiết với trạng thái mới
        console.log('🔄 Reloading invoice detail to show updated status (DA_XAC_NHAN)...');
        this.loadInvoiceDetail();

        // Sau 2 giây, chuyển về trang quản lý hóa đơn
        setTimeout(() => {
          this.router.navigate(['/invoices']);
        }, 2000);
      },
      error: (error) => {
        console.error('❌ Error confirming invoice:', error);
        this.savingStatus = false;
        const errorMessage = error.error?.message || error.message || 'Vui lòng thử lại';
        this.showToast('Lỗi khi xác nhận hóa đơn: ' + errorMessage, 'error');
      }
    });
  }


  /**
   * Mở modal hủy hóa đơn
   */
  openCancelInvoiceModal(): void {
    if (!this.invoice || !this.invoice.id) {
      this.showToast('Không tìm thấy hóa đơn', 'error');
      return;
    }
    this.cancelInvoiceNote = '';
    this.showCancelInvoiceModal = true;
  }

  /**
   * Đóng modal hủy hóa đơn
   */
  closeCancelInvoiceModal(): void {
    this.showCancelInvoiceModal = false;
    this.cancelInvoiceNote = '';
  }

  /**
   * Đánh dấu hóa đơn là thất bại - cập nhật trạng thái thành "Hủy"
   */
  markAsFailed(): void {
    if (!this.invoice || !this.invoice.id) {
      this.showToast('Không tìm thấy hóa đơn', 'error');
      return;
    }

    // Validate ghi chú (bắt buộc)
    if (!this.cancelInvoiceNote || this.cancelInvoiceNote.trim().length === 0) {
      this.showToast('Vui lòng nhập lý do hủy hóa đơn', 'warning');
      return;
    }

    this.savingStatus = true;

    // Load hóa đơn hiện tại để lấy đầy đủ thông tin
    console.log('🔄 Loading current invoice data...');
    this.hoaDonService.getHoaDonById(this.invoice.id).subscribe({
      next: (currentInvoice) => {
        console.log('✅ Current invoice loaded:', {
          id: currentInvoice.id,
          maHoaDon: currentInvoice.maHoaDon,
          danhSachSanPham: currentInvoice.danhSachSanPham?.length || 0,
          danhSachChiTiet: (currentInvoice as any).danhSachChiTiet?.length || 0
        });

        // Chuẩn bị dữ liệu cập nhật: cả trạng thái và ghi chú
        const cancelNote = this.cancelInvoiceNote ? this.cancelInvoiceNote.trim() : '';
        console.log('📝 Cancel note to save:', cancelNote, '(length:', cancelNote.length, ')');

        // QUAN TRỌNG: Lấy danhSachChiTiet từ currentInvoice (đã được load với đầy đủ thông tin)
        // Ưu tiên: danhSachChiTiet gốc > danhSachSanPham đã map
        const originalDanhSachChiTiet = (currentInvoice as any).danhSachChiTiet;
        const mappedDanhSachSanPham = currentInvoice.danhSachSanPham || [];

        console.log('📦 Product data sources:', {
          originalDanhSachChiTiet: originalDanhSachChiTiet?.length || 0,
          mappedDanhSachSanPham: mappedDanhSachSanPham.length,
          invoiceId: currentInvoice.id,
          trangThai: currentInvoice.trangThai
        });

        // Map danhSachChiTiet từ nguồn phù hợp
        let danhSachChiTietToUpdate: any[] = [];

        if (originalDanhSachChiTiet && originalDanhSachChiTiet.length > 0) {
          // Nếu có danhSachChiTiet gốc, dùng nó
          console.log('✅ Using original danhSachChiTiet from backend');
          danhSachChiTietToUpdate = originalDanhSachChiTiet.map((item: any) => ({
            id: item.id || null,
            chiTietSanPhamId: item.chiTietSanPhamId || null,
            tenSanPham: item.tenSanPham || '',
            maSanPham: item.maSanPham || '',
            soLuong: item.soLuong ? Number(item.soLuong) : 0,
            donGia: item.donGia != null ? Number(item.donGia) : 0,
            thanhTien: item.thanhTien != null ? Number(item.thanhTien) : 0,
            giamGia: item.giamGia != null ? Number(item.giamGia) : 0,
            mauSac: item.mauSac || '',
            kichThuoc: item.kichThuoc || '',
            nhaSanXuat: item.nhaSanXuat || '',
            anhSanPham: item.anhSanPham || ''
          })).filter((item: any) => item.chiTietSanPhamId != null);
        } else if (mappedDanhSachSanPham && mappedDanhSachSanPham.length > 0) {
          // Nếu không có danhSachChiTiet gốc, map từ danhSachSanPham
          console.log('⚠️ No original danhSachChiTiet, mapping from danhSachSanPham');
          danhSachChiTietToUpdate = mappedDanhSachSanPham.map((item: any) => ({
            id: item.id || null,
            chiTietSanPhamId: item.chiTietSanPhamId || item.sanPhamId || null,
            tenSanPham: item.tenSanPham || '',
            maSanPham: item.maSanPham || '',
            soLuong: item.soLuong ? Number(item.soLuong) : 0,
            donGia: item.donGia != null ? Number(item.donGia) : 0,
            thanhTien: item.thanhTien != null ? Number(item.thanhTien) : 0,
            giamGia: item.giamGia != null ? Number(item.giamGia) : 0,
            mauSac: item.mauSac || '',
            kichThuoc: item.kichThuoc || '',
            nhaSanXuat: item.nhaSanXuat || '',
            anhSanPham: item.anhSanPham || ''
          })).filter((item: any) => item.chiTietSanPhamId != null);
        } else {
          console.warn('⚠️ No products found in invoice. This might cause products to be deleted when cancelling.');
        }

        console.log('📦 Final danhSachChiTiet to update:', {
          count: danhSachChiTietToUpdate.length,
          items: danhSachChiTietToUpdate.map((item: any) => ({
            id: item.id,
            chiTietSanPhamId: item.chiTietSanPhamId,
            tenSanPham: item.tenSanPham,
            soLuong: item.soLuong
          }))
        });

        const updateData: any = {
          maHoaDon: currentInvoice.maHoaDon.trim(),
          khachHangId: currentInvoice.khachHangId,
          tongTien: Number(currentInvoice.tongTien),
          thanhTien: currentInvoice.thanhTien ? Number(currentInvoice.thanhTien) : Number(currentInvoice.tongTien),
          tienGiamGia: currentInvoice.tienGiamGia ? Number(currentInvoice.tienGiamGia) : 0,
          soLuongSanPham: currentInvoice.soLuongSanPham || danhSachChiTietToUpdate.length || 0,
          nhanVienId: currentInvoice.nhanVienId || null,
          ghiChu: cancelNote, // Lưu ghi chú hủy (đảm bảo không null)
          trangThai: 'HUY', // Sẽ được backend map thành DA_HUY
          danhSachChiTiet: danhSachChiTietToUpdate // QUAN TRỌNG: Giữ lại danhSachChiTiet khi hủy
        };

        console.log('📦 Update data prepared:', {
          maHoaDon: updateData.maHoaDon,
          trangThai: updateData.trangThai,
          ghiChu: updateData.ghiChu,
          ghiChuLength: updateData.ghiChu ? updateData.ghiChu.length : 0,
          danhSachChiTietCount: updateData.danhSachChiTiet?.length || 0,
          soLuongSanPham: updateData.soLuongSanPham
        });

        // Đảm bảo format đúng cho backend
        const finalUpdateData: any = {
          ...updateData,
          trangThai: 'HUY' as const,
          tongTien: Number(updateData.tongTien),
          thanhTien: Number(updateData.thanhTien),
          tienGiamGia: updateData.tienGiamGia ? Number(updateData.tienGiamGia) : 0,
          soLuongSanPham: updateData.soLuongSanPham || 0,
          danhSachChiTiet: updateData.danhSachChiTiet || []
        };

        console.log('📤 Updating invoice with status HUY and note:', {
          maHoaDon: finalUpdateData.maHoaDon,
          trangThai: finalUpdateData.trangThai,
          ghiChu: finalUpdateData.ghiChu,
          danhSachChiTietCount: finalUpdateData.danhSachChiTiet.length
        });

        // Cập nhật hóa đơn với cả trạng thái và ghi chú trong một request
        if (!this.invoice || !this.invoice.id) {
          this.showToast('Không tìm thấy hóa đơn', 'error');
          this.savingStatus = false;
          return;
        }

        // Bước 1: Cập nhật trạng thái thành HUY
        this.hoaDonService.updateTrangThaiHoaDon(this.invoice.id, 'HUY').subscribe({
          next: (updatedInvoice) => {
            console.log('✅ Invoice status updated to HUY:', updatedInvoice);
            
            // Bước 2: Nếu đơn hàng đã thanh toán, xử lý hoàn tiền
            if (currentInvoice.ngayThanhToan) {
              console.log('💰 Processing refund for paid invoice...');
              const refundRequest = {
                refundAmount: Number(currentInvoice.thanhTien),
                refundReason: cancelNote || 'Hủy đơn hàng',
                refundMethod: 'original_method' as const
              };
              
              if (!this.invoice || !this.invoice.id) {
                this.savingStatus = false;
                this.showToast('Không tìm thấy hóa đơn', 'error');
                return;
              }
              
              this.hoaDonService.refundInvoice(this.invoice.id, refundRequest).subscribe({
                next: (refundedInvoice) => {
                  console.log('✅ Refund processed successfully:', refundedInvoice);
                  this.savingStatus = false;
                  this.closeCancelInvoiceModal();
                  this.showToast('Đã hủy hóa đơn và xử lý hoàn tiền thành công. Số tiền sẽ được hoàn trả trong vòng 3-5 ngày làm việc.', 'success');
            this.loadInvoiceDetail();
            setTimeout(() => {
              this.router.navigate(['/invoices']);
            }, 2000);
                },
                error: (refundError) => {
                  console.error('❌ Error processing refund:', refundError);
                  // Vẫn hiển thị thành công vì đơn hàng đã được hủy
                  this.savingStatus = false;
                  this.closeCancelInvoiceModal();
                  this.showToast('Đã hủy hóa đơn thành công. Lưu ý: Có thể cần xử lý hoàn tiền thủ công.', 'warning');
                  this.loadInvoiceDetail();
                }
              });
            } else {
              // Đơn hàng chưa thanh toán, không cần hoàn tiền
              this.savingStatus = false;
              this.closeCancelInvoiceModal();
              this.showToast('Đã hủy hóa đơn thành công. Số lượng sản phẩm đã được hoàn lại vào kho.', 'success');
              this.loadInvoiceDetail();
              setTimeout(() => {
                this.router.navigate(['/invoices']);
              }, 2000);
            }
          },
          error: (error) => {
            console.error('❌ Error cancelling invoice:', error);
            console.error('   - Status: ' + error.status);
            console.error('   - StatusText: ' + error.statusText);
            console.error('   - Error body: ', error.error);
            console.error('   - Error message: ', error.message);
            this.savingStatus = false;
            const errorMessage = error.error?.message || error.error || error.message || 'Vui lòng thử lại';
            this.showToast('Lỗi khi hủy hóa đơn: ' + errorMessage, 'error');
          }
        });
      },
      error: (error) => {
        console.error('❌ Error loading invoice:', error);
        this.savingStatus = false;
        this.showToast('Lỗi khi tải thông tin hóa đơn', 'error');
      }
    });
  }
}
