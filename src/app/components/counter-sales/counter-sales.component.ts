import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ProductApiService, SanPhamResponse } from '../../services/product-api.service';
import {
  ChiTietSanPhamApiService,
  ChiTietSanPhamResponse,
} from '../../services/chi-tiet-san-pham-api.service';
import { KhachHangService } from '../../services/khach-hang.service';
import { HoaDonService } from '../../services/hoa-don.service';
import { PhieuGiamGiaService } from '../../services/phieu-giam-gia.service';
import { HoaDonChoService, HoaDonCho, GioHangChoItem } from '../../services/hoa-don-cho.service';
import {
  CounterSale,
  CounterSaleItem,
  CartItem,
  CounterSaleFilter,
} from '../../interfaces/counter-sale.interface';
import provincesData from 'sub-vn/json_data/provinces.json';
import districtsData from 'sub-vn/json_data/districts.json';
import wardsData from 'sub-vn/json_data/wards.json';
import { DiaChiKhachHangService } from '../../services/dia-chi-khach-hang.service';

type UICartItem = CartItem & { imageUrl?: string; gioHangChoId?: number };

@Component({
  selector: 'app-counter-sales',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './counter-sales.component.html',
  styleUrls: ['./counter-sales.component.scss'],
})
export class CounterSalesComponent implements OnInit {
  counterSales: CounterSale[] = [];
  filteredSales: CounterSale[] = [];
  paginatedSales: CounterSale[] = [];

  // Math object for template
  Math = Math;

  // Cart
  cart: UICartItem[] = [];
  cartTotal: number = 0;
  cartSubtotal: number = 0;
  cartDiscount: number = 0;
  cartTax: number = 10;
  couponDiscount: number = 0;
  // Cash received from customer at checkout
  cashReceived: number | null = null;

  // Payment method state (cash | transfer)
  checkoutPaymentMethod: 'cash' | 'transfer' = 'cash';
  transferInfo: {
    bankName: string;
    accountNumber: string;
    transactionCode: string;
    amount: number | null;
  } = { bankName: '', accountNumber: '', transactionCode: '', amount: null };

  // QR payment modal state
  showTransferQrModal: boolean = false;
  transferQrUrl: string = '';
  private transferQrConfirmed: boolean = false;

  // VietQR config (from image): VPBank - CHU DUC DUNG - 0789196545
  qrBankCode: string = 'vpbank';
  qrAccount: string = '0789196545';
  qrAccountName: string = 'CHU DUC DUNG';

  // POS state
  invoiceSearch: string = '';
  pendingInvoices: HoaDonCho[] = [];
  currentHoaDonChoId: number | null = null; // Current pending invoice ID
  isInvoiceCreated: boolean = false; // Track if invoice has been created
  customerSearch: string = '';
  customerResults: { id: number; name: string; phone: string }[] = [];
  private customerSearchTimer: any;
  customerCreating: boolean = false;
  // simple toast
  toastVisible: boolean = false;
  toastMessage: string = '';
  toastType: 'success' | 'warning' | 'error' = 'success';
  isDelivery: boolean = false;
  // Delivery input (when customer has no saved address)
  shippingAddress: string = '';
  shippingNote: string = '';

  // Coupon state
  couponCode: string = '';
  couponResults: any[] = [];
  appliedCoupon: {
    id: number;
    code: string;
    type: 'PERCENT' | 'FIXED';
    value: number;
    maxDiscount?: number;
    minOrder?: number;
  } | null = null;
  bestVoucher: {
    id: number;
    code: string;
    type: 'PERCENT' | 'FIXED';
    value: number;
    maxDiscount?: number;
    minOrder?: number;
    discount: number;
  } | null = null;
  alternativeVouchers: any[] = [];
  allVouchers: any[] = [];
  displayedVouchers: any[] = []; // Chỉ hiển thị một số phiếu giảm giá (ví dụ: 3-5 phiếu)
  maxDisplayedVouchers: number = 3; // Số lượng phiếu giảm giá hiển thị tối đa
  showBestTab: boolean = true;
  showVoucherModal: boolean = false; // Modal để xem tất cả phiếu giảm giá
  voucherModalSearchTerm: string = ''; // Tìm kiếm trong modal

  // Product filter + pagination for POS list
  // Options cho bộ lọc – được build động từ dữ liệu sản phẩm chi tiết
  colorOptions: string[] = [];
  ramOptions: string[] = [];
  storageOptions: string[] = [];
  selectedColor: string = 'all';
  selectedRam: string = 'all';
  selectedStorage: string = 'all';
  filteredProducts: any[] = [];
  pagedProducts: any[] = [];
  productPage: number = 1;
  productPageSize: number = 10;
  maxProductPage: number = 1;

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalItems: number = 0;

  // Sorting
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Filter
  searchTerm: string = '';
  selectedStatus: string = 'all';
  selectedPaymentStatus: string = 'all';
  selectedPaymentMethod: string = 'all';

  // Modal states
  showAddModal: boolean = false;
  showEditModal: boolean = false;
  showViewModal: boolean = false;
  showDeleteModal: boolean = false;
  showCartModal: boolean = false;

  // Form data
  newSale: Partial<CounterSale> = {
    saleNumber: '',
    customerName: '',
    customerPhone: '',
    staffId: 1,
    staffName: 'Nguyễn Văn A',
    items: [],
    subtotal: 0,
    discount: 0,
    discountAmount: 0,
    tax: 10,
    taxAmount: 0,
    totalAmount: 0,
    paymentMethod: 'cash',
    paymentStatus: 'pending',
    status: 'draft',
    notes: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 1,
    updatedBy: 1,
  };

  // Saved customer address (if any) set when selecting customer
  customerSavedAddress: string | null = null;
  customerAddresses: Array<any> = [];
  selectedSavedAddressId: string = '';

  // Address selections (similar to customer management)
  provinces: Array<{ code: string; name: string }> = [];
  districts: Array<{ code: string; name: string; province_code: string }> = [];
  wards: Array<{ code: string; name: string; district_code: string }> = [];
  selectedProvinceCode: string = '';
  selectedDistrictCode: string = '';
  selectedWardCode: string = '';
  addressDetail: string = '';

  selectedSale: CounterSale | null = null;
  editingSale: CounterSale | null = null;

  // Product search
  productSearchTerm: string = '';
  availableProducts: any[] = [];
  productIdToImageUrl: { [productId: number]: string } = {};
  chiTietSanPhamIdToProductId: { [chiTietSanPhamId: number]: number } = {};
  productOrderMap: Map<number, number> = new Map(); // Map to preserve product order: productId -> originalIndex

  private parsePrice(value: any): number {
    if (typeof value === 'number' && isFinite(value)) return value;
    if (typeof value === 'string') {
      const digits = value.replace(/[^0-9]/g, '');
      return digits ? Number(digits) : 0;
    }
    return 0;
  }

  // Helper method to get image URL from chiTietSanPhamId
  private getImageUrlFromChiTietSanPhamId(chiTietSanPhamId: number): string | undefined {
    // First, try to get productId from mapping
    const productId = this.chiTietSanPhamIdToProductId[chiTietSanPhamId];
    if (productId && this.productIdToImageUrl[productId]) {
      return this.productIdToImageUrl[productId];
    }

    // If not found in mapping, try to find in availableProducts
    const product = this.availableProducts.find((p) => p.id === chiTietSanPhamId);
    if (product && product.productId && this.productIdToImageUrl[product.productId]) {
      return this.productIdToImageUrl[product.productId];
    }

    // If still not found, try to load from API
    if (product && product.productId && !this.productIdToImageUrl[product.productId]) {
      this.productApi.getById(product.productId, true).subscribe((p) => {
        if (p?.anhSanPham) {
          this.productIdToImageUrl[product.productId] = p.anhSanPham as string;
          // Update cart item imageUrl if it's in the cart
          const cartItem = this.cart.find((item) => item.productId === chiTietSanPhamId);
          if (cartItem) {
            cartItem.imageUrl = p.anhSanPham as string;
          }
        }
      });
    }

    return undefined;
  }

  // Status options
  statusOptions = [
    { value: 'all', label: 'Tất cả' },
    { value: 'draft', label: 'Nháp' },
    { value: 'processing', label: 'Đang xử lý' },
    { value: 'completed', label: 'Hoàn thành' },
    { value: 'cancelled', label: 'Hủy' },
  ];

  paymentStatusOptions = [
    { value: 'all', label: 'Tất cả' },
    { value: 'pending', label: 'Chờ thanh toán' },
    { value: 'paid', label: 'Đã thanh toán' },
    { value: 'partial', label: 'Thanh toán một phần' },
    { value: 'refunded', label: 'Hoàn tiền' },
  ];

  paymentMethodOptions = [
    { value: 'all', label: 'Tất cả' },
    { value: 'cash', label: 'Tiền mặt' },
    { value: 'card', label: 'Thẻ' },
    { value: 'transfer', label: 'Chuyển khoản' },
    { value: 'other', label: 'Khác' },
  ];

  // Computed change to return to customer
  get changeDue(): number {
    const received = this.cashReceived ?? 0;
    return Math.max(0, received - this.cartTotal);
  }

  constructor(
    private http: HttpClient,
    private productApi: ProductApiService,
    private chiTietApi: ChiTietSanPhamApiService,
    private khachHangService: KhachHangService,
    private phieuGiamGiaService: PhieuGiamGiaService,
    private hoaDonService: HoaDonService,
    private hoaDonChoService: HoaDonChoService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private diaChiKhachHangService: DiaChiKhachHangService
  ) {}

  ngOnInit(): void {
    this.loadSampleData();
    this.loadAvailableProducts();
    this.filterSales();
    this.filterProducts();
    this.refreshVoucherSuggestions();
    this.loadPendingInvoices();
    this.loadProvinces();
  }

  loadSampleData(): void {
    this.counterSales = [
      {
        id: 1,
        saleNumber: 'CS-2024-001',
        customerId: 1,
        customerName: 'Nguyễn Văn An',
        customerPhone: '0123456789',
        staffId: 1,
        staffName: 'Nguyễn Văn A',
        items: [
          {
            id: 1,
            productId: 1,
            productCode: 'P001',
            productName: 'AGV K1 Helmet',
            category: 'Mũ bảo hiểm toàn đầu',
            quantity: 1,
            unitPrice: 1500000,
            totalPrice: 1500000,
            discount: 5,
            discountAmount: 75000,
            stockQuantity: 50,
          },
        ],
        subtotal: 1500000,
        discount: 5,
        discountAmount: 75000,
        tax: 10,
        taxAmount: 142500,
        totalAmount: 1567500,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        status: 'completed',
        notes: 'Bán tại quầy',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
        createdBy: 1,
        updatedBy: 1,
      },
      {
        id: 2,
        saleNumber: 'CS-2024-002',
        customerId: 2,
        customerName: 'Trần Thị Bình',
        customerPhone: '0987654321',
        staffId: 2,
        staffName: 'Trần Thị B',
        items: [
          {
            id: 2,
            productId: 2,
            productCode: 'P002',
            productName: 'Shoei X14 Helmet',
            category: 'Mũ bảo hiểm đua xe',
            quantity: 1,
            unitPrice: 2500000,
            totalPrice: 2500000,
            discount: 0,
            discountAmount: 0,
            stockQuantity: 30,
          },
        ],
        subtotal: 2500000,
        discount: 0,
        discountAmount: 0,
        tax: 10,
        taxAmount: 250000,
        totalAmount: 2750000,
        paymentMethod: 'card',
        paymentStatus: 'paid',
        status: 'completed',
        notes: '',
        createdAt: new Date('2024-01-16'),
        updatedAt: new Date('2024-01-16'),
        createdBy: 2,
        updatedBy: 2,
      },
    ];
  }

  loadAvailableProducts(): void {
    // Lấy dữ liệu từ BẢNG SẢN PHẨM CHI TIẾT theo yêu cầu
    this.chiTietApi.getAll().subscribe({
      next: (rows: ChiTietSanPhamResponse[] | any) => {
        // Xử lý response structure khác nhau
        const raw = Array.isArray(rows) ? rows : rows?.data || rows?.content || [];

        const variants = (raw || []).map((r: any) => {
          // Lấy trongLuongTen từ DB - không dùng trongLuongId
          const trongLuongTen = r.trongLuongTen || r.trong_luong_ten || '';
          const chiTietId = r.id;
          const productId = r.sanPhamId || r.san_pham_id;

          // Map chiTietSanPhamId to productId
          if (chiTietId && productId) {
            this.chiTietSanPhamIdToProductId[chiTietId] = productId;
          }

          return {
            id: chiTietId,
            code: `${productId}-${r.kichThuocId || r.kich_thuoc_id}-${
              r.mauSacId || r.mau_sac_id
            }-${trongLuongTen}`,
            name: r.sanPhamTen || r.san_pham_ten || '',
            category: undefined,
            price: this.parsePrice(r.giaBan || r.gia_ban),
            stock: Number((r.soLuongTon || r.so_luong_ton) ?? 0),
            color: r.mauSacTen || r.mau_sac_ten || '',
            colorName: r.mauSacTen || r.mau_sac_ten || '',
            colorCode: r.mauSacMa || r.mau_sac_ma || '',
            ram: r.kichThuocTen || r.kich_thuoc_ten || '',
            storage: trongLuongTen, // Dùng trongLuongTen từ DB
            productId: productId,
            imageUrl: undefined as string | undefined,
          };
        });

        // Giữ nguyên thứ tự ban đầu nếu đã có
        if (this.productOrderMap.size > 0) {
          // Sắp xếp lại theo thứ tự ban đầu
          variants.sort((a: any, b: any) => {
            const orderA = this.productOrderMap.get(a.id) ?? Infinity;
            const orderB = this.productOrderMap.get(b.id) ?? Infinity;
            return orderA - orderB;
          });
        } else {
          // Lần đầu tiên load, lưu thứ tự ban đầu
          variants.forEach((product: any, index: number) => {
            if (product.id) {
              this.productOrderMap.set(product.id, index);
            }
          });
        }

        this.availableProducts = variants;
        // Build options động từ dữ liệu
        const colors = new Set<string>();
        const sizes = new Set<string>();
        const weights = new Set<string>();
        variants.forEach((v: any) => {
          if (v.colorName) colors.add(String(v.colorName));
          if (v.ram) sizes.add(String(v.ram));
          if (v.storage) weights.add(String(v.storage));
        });
        this.colorOptions = Array.from(colors);
        this.ramOptions = Array.from(sizes);
        this.storageOptions = Array.from(weights);
        // Đặt về 'all' sau khi load
        this.selectedColor = 'all';
        this.selectedRam = 'all';
        this.selectedStorage = 'all';
        // Lấy ảnh sản phẩm từ bảng sản phẩm cha (nếu có)
        const uniqueProductIds = Array.from(new Set(variants.map((v: any) => v.productId))).filter(
          (id): id is number => typeof id === 'number'
        );
        uniqueProductIds.forEach((pid: number) => {
          this.productApi.getById(pid, true).subscribe((p) => {
            if (p?.anhSanPham) {
              this.productIdToImageUrl[pid] = p.anhSanPham as string;
              // Gán vào các biến thể cùng productId
              this.availableProducts
                .filter((v) => v.productId === pid)
                .forEach((v) => (v.imageUrl = p.anhSanPham as string));
            }
          });
        });
        this.filterProducts();
      },
      error: (err) => {
        this.availableProducts = [];
        this.filterProducts();
        this.showToast(
          'Lỗi khi tải danh sách sản phẩm: ' +
            (err.error?.message || err.message || 'Không xác định'),
          'error'
        );
      },
    });
  }

  // Filter products for POS list
  filterProducts(): void {
    const term = (this.productSearchTerm || '').toLowerCase().trim();
    const selColor = (this.selectedColor || 'all').toString().trim();
    const selSize = (this.selectedRam || 'all').toString().trim();
    const selWeight = (this.selectedStorage || 'all').toString().trim();

    this.filteredProducts = this.availableProducts.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const code = (p.code || '').toLowerCase();
      const color = (p.color || p.colorName || '').toString().trim();
      const size = (p.ram || '').toString().trim();
      const weight = (p.storage || '').toString().trim();

      const matchTerm = !term || name.includes(term) || code.includes(term);
      const matchColor = selColor === 'all' || color === selColor;
      const matchSize = selSize === 'all' || size === selSize;
      const matchWeight = selWeight === 'all' || weight === selWeight;
      return matchTerm && matchColor && matchSize && matchWeight;
    });
    this.productPage = 1;
    this.updateProductPagination();
  }

  updateProductPagination(): void {
    this.maxProductPage = Math.max(
      1,
      Math.ceil(this.filteredProducts.length / this.productPageSize)
    );
    const start = (this.productPage - 1) * this.productPageSize;
    const end = start + this.productPageSize;
    this.pagedProducts = this.filteredProducts.slice(start, end);
  }

  gotoProductPage(page: number): void {
    if (page < 1 || page > this.maxProductPage) return;
    this.productPage = page;
    this.updateProductPagination();
  }

  onChangeProductPageSize(event: any): void {
    this.productPageSize = parseInt(event.target.value, 10) || 10;
    this.productPage = 1;
    this.updateProductPagination();
  }

  // POS helpers
  createNewInvoice(): void {
    // Kiểm tra số lượng hóa đơn chờ hiện tại (tối đa 5)
    const MAX_PENDING_INVOICES = 5;
    if (this.pendingInvoices.length >= MAX_PENDING_INVOICES) {
      this.showToast(
        `Bạn chỉ có thể tạo tối đa ${MAX_PENDING_INVOICES} hóa đơn chờ. Vui lòng xóa hoặc thanh toán hóa đơn chờ hiện tại trước khi tạo mới.`,
        'warning'
      );
      return;
    }

    // Tạo hóa đơn chờ mới trong database
    const code = this.generateSaleNumber();
    const hoaDonChoData: Partial<HoaDonCho> = {
      maHoaDonCho: code,
      khachHangId: this.newSale.customerId,
      tenKhachHang: this.newSale.customerName,
      soDienThoaiKhachHang: this.newSale.customerPhone,
      nhanVienId: this.newSale.staffId,
      tenNhanVien: this.newSale.staffName,
      trangThai: 'DANG_CHO',
      ghiChu: this.newSale.notes,
    };

    this.hoaDonChoService.createHoaDonCho(hoaDonChoData).subscribe({
      next: (created: HoaDonCho) => {
        this.currentHoaDonChoId = created.id || null;

        // Thêm hóa đơn mới vào danh sách ngay lập tức để hiển thị ngay
        // Đảm bảo có danhSachGioHang rỗng nếu chưa có
        if (!created.danhSachGioHang) {
          created.danhSachGioHang = [];
        }

        // Thêm vào đầu danh sách ngay lập tức
        this.pendingInvoices = [created, ...this.pendingInvoices];
        this.cdr.detectChanges();

        // Sau đó reload để lấy đầy đủ thông tin (bao gồm danhSachGioHang) nếu cần
        if (created.id) {
          this.hoaDonChoService.getHoaDonChoById(created.id).subscribe({
            next: (fullHoaDonCho: HoaDonCho) => {
              // Cập nhật lại hóa đơn trong danh sách với thông tin đầy đủ
              const index = this.pendingInvoices.findIndex((inv) => inv.id === created.id);
              if (index !== -1) {
                this.pendingInvoices[index] = fullHoaDonCho;
                this.cdr.detectChanges();
              }
            },
            error: () => {
              // Nếu không load được chi tiết, giữ nguyên dữ liệu cơ bản
              console.warn('Không thể load chi tiết hóa đơn chờ');
            },
          });
        }

        // Reset giỏ hiện tại cho hóa đơn mới
        this.cart = [];
        this.calculateCartTotal();
        // Enable adding products to cart after creating invoice
        this.isInvoiceCreated = true;
        this.showToast('Đã tạo hóa đơn mới. Bạn có thể thêm sản phẩm vào giỏ hàng.', 'success');
      },
      error: (err) => {
        this.showToast(
          'Lỗi khi tạo hóa đơn chờ: ' + (err.error?.error || err.message || 'Không xác định'),
          'error'
        );
      },
    });
  }

  loadPendingInvoices(): void {
    this.hoaDonChoService.getHoaDonChoByTrangThai('DANG_CHO').subscribe({
      next: (invoices: HoaDonCho[]) => {
        this.pendingInvoices = invoices;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Lỗi khi tải hóa đơn chờ:', err);
        this.pendingInvoices = [];
        this.cdr.detectChanges();
      },
    });
  }

  loadPending(inv: HoaDonCho): void {
    if (!inv.id) return;

    this.hoaDonChoService.getHoaDonChoById(inv.id).subscribe({
      next: (hoaDonCho: HoaDonCho) => {
        this.currentHoaDonChoId = hoaDonCho.id || null;
        // Convert GioHangChoItem[] to CartItem[]
        this.cart = (hoaDonCho.danhSachGioHang || []).map((item: GioHangChoItem) => {
          const imageUrl = this.getImageUrlFromChiTietSanPhamId(item.chiTietSanPhamId);
          return {
            productId: item.chiTietSanPhamId,
            productCode: '',
            productName: item.tenSanPham || '',
            category: '',
            quantity: item.soLuong,
            unitPrice: item.donGia,
            totalPrice: item.thanhTien || item.donGia * item.soLuong - (item.giamGia || 0),
            discount: item.giamGia ? (item.giamGia / (item.donGia * item.soLuong)) * 100 : 0,
            discountAmount: item.giamGia || 0,
            stockQuantity: 0,
            imageUrl: imageUrl,
            gioHangChoId: item.id, // Store gioHangChoId for deletion
          };
        });
        this.calculateCartTotal();
        // Enable adding products to cart when loading pending invoice
        this.isInvoiceCreated = true;

        // Update customer info if available
        if (hoaDonCho.khachHangId) {
          this.newSale.customerId = hoaDonCho.khachHangId;
        }
        if (hoaDonCho.tenKhachHang) {
          this.newSale.customerName = hoaDonCho.tenKhachHang;
        }
        if (hoaDonCho.soDienThoaiKhachHang) {
          this.newSale.customerPhone = hoaDonCho.soDienThoaiKhachHang;
        }
      },
      error: (err) => {
        this.showToast(
          'Lỗi khi tải hóa đơn chờ: ' + (err.error?.error || err.message || 'Không xác định'),
          'error'
        );
      },
    });
  }

  deletePending(inv: HoaDonCho, event?: Event): void {
    if (event) event.stopPropagation();

    if (!inv.id) {
      this.pendingInvoices = this.pendingInvoices.filter((p) => p !== inv);
      return;
    }

    if (confirm('Bạn có chắc chắn muốn xóa hóa đơn chờ này?')) {
      this.hoaDonChoService.deleteHoaDonCho(inv.id).subscribe({
        next: () => {
          this.loadPendingInvoices();
          if (this.currentHoaDonChoId === inv.id) {
            this.currentHoaDonChoId = null;
            this.cart = [];
            this.calculateCartTotal();
            this.isInvoiceCreated = false;
          }
          this.showToast('Đã xóa hóa đơn chờ', 'success');
        },
        error: (err) => {
          this.showToast(
            'Lỗi khi xóa hóa đơn chờ: ' + (err.error?.error || err.message || 'Không xác định'),
            'error'
          );
        },
      });
    }
  }

  scanQr(): void {
    alert('QR scanner is not implemented in demo.');
  }

  saveCustomerDraft(): void {
    // Intentionally simple for demo
    if (!this.newSale.customerName || !this.newSale.customerPhone) {
      alert('Vui lòng nhập tên và số điện thoại khách hàng');
      return;
    }
  }

  // Customer search (typeahead)
  onCustomerSearchChange(): void {
    const keyword = (this.customerSearch || '').trim();
    clearTimeout(this.customerSearchTimer);
    if (!keyword) {
      this.customerResults = [];
      // reset selection when user clears
      this.newSale.customerId = undefined;
      this.newSale.customerName = '';
      this.newSale.customerPhone = '';
      return;
    }
    // Chỉ cho tìm khi từ khóa đủ dài hoặc có khả năng là SĐT hợp lệ
    const digits = keyword.replace(/\D/g, '');
    // nếu là số điện thoại (>=9 chữ số) thì ưu tiên tìm theo SĐT chính xác
    if (digits.length >= 9) {
      this.customerSearchTimer = setTimeout(() => {
        this.khachHangService.getKhachHangBySoDienThoai(digits).subscribe({
          next: (kh: any) => {
            if (kh) {
              this.customerResults = [
                {
                  id: kh.id ?? 0,
                  name: kh.tenKhachHang ?? kh.hoTen ?? kh.name ?? '',
                  phone: kh.soDienThoai ?? kh.sdt ?? kh.phone ?? '',
                },
              ];
            } else {
              this.customerResults = [];
            }
          },
          error: () => (this.customerResults = []),
        });
      }, 300);
      return;
    }

    // tên khách hàng: chỉ tìm khi từ khóa >= 3 ký tự để tránh trả về quá rộng
    if (keyword.length < 3) {
      this.customerResults = [];
      return;
    }

    this.customerSearchTimer = setTimeout(() => {
      this.khachHangService
        .searchKhachHang({
          keyword,
          page: 0,
          size: 8,
          sortBy: 'id',
          sortDir: 'desc',
          trangThai: true,
        } as any)
        .subscribe({
          next: (res: any) => {
            const rows: any[] = res?.content || [];
            const lower = keyword.toLowerCase();
            const digitsOnly = keyword.replace(/\D/g, '');
            const filtered = rows.filter((r) => {
              const name = (r.tenKhachHang ?? r.hoTen ?? r.name ?? '').toLowerCase();
              const phone = (r.soDienThoai ?? r.sdt ?? r.phone ?? '').toString();
              const nameMatch = name.includes(lower);
              const phoneMatch = digitsOnly.length >= 3 && phone.includes(digitsOnly);
              return nameMatch || phoneMatch;
            });
            this.customerResults = filtered.slice(0, 8).map((r) => ({
              id: r.id ?? r.khachHangId ?? 0,
              name: r.tenKhachHang ?? r.hoTen ?? r.name ?? '',
              phone: r.soDienThoai ?? r.sdt ?? r.phone ?? '',
            }));
          },
          error: () => (this.customerResults = []),
        });
    }, 300);
  }

  selectCustomer(c: { id: number; name: string; phone: string }): void {
    this.newSale.customerId = c.id;
    this.newSale.customerName = c.name;
    this.newSale.customerPhone = c.phone;
    this.customerSearch = `${c.name} - ${c.phone}`;
    this.customerResults = [];
    this.refreshVoucherSuggestions();
  }

  // Quick add customer
  quickAddCustomer(): void {
    const name = (this.newSale.customerName || '').trim();
    const phone = (this.newSale.customerPhone || '').trim();
    const phoneDigits = phone.replace(/\D/g, '');
    if (!name || phoneDigits.length < 9) {
      this.showToast('Vui lòng nhập tên và số điện thoại hợp lệ (>=9 chữ số).', 'warning');
      return;
    }
    this.customerCreating = true;
    // kiểm tra tồn tại theo SĐT trước khi tạo
    this.khachHangService.checkSoDienThoaiExists(phoneDigits).subscribe({
      next: (exists) => {
        if (exists) {
          this.showToast('Khách hàng này đã tồn tại', 'warning');
          this.customerCreating = false;
        } else {
          // Tạo email tạm unique từ số điện thoại và timestamp để tránh trùng
          const timestamp = Date.now();
          const tempEmail = `kh${phoneDigits}${timestamp}@temp.local`;
          const payload: any = {
            tenKhachHang: name,
            soDienThoai: phoneDigits,
            email: tempEmail,
            trangThai: true,
          };
          this.khachHangService.createKhachHang(payload).subscribe({
            next: (res: any) => {
              const id = res?.id ?? 0;
              this.newSale.customerId = id;
              this.customerSearch = `${name} - ${phoneDigits}`;
              this.customerResults = [];
              this.showToast('Thêm khách hàng thành công', 'success');
              this.customerCreating = false;
              this.refreshVoucherSuggestions();
            },
            error: (err) => {
              const errorMsg =
                err?.error?.message ||
                err?.message ||
                'Không thể thêm khách hàng. Vui lòng thử lại.';
              this.showToast(errorMsg, 'error');
              this.customerCreating = false;
            },
          });
        }
      },
      error: () => {
        this.customerCreating = false;
        this.showToast('Không thể kiểm tra số điện thoại.', 'error');
      },
    });
  }

  private showToast(message: string, type: 'success' | 'warning' | 'error' = 'success') {
    this.toastMessage = message;
    this.toastType = type;
    this.toastVisible = true;
    setTimeout(() => (this.toastVisible = false), 2500);
  }

  // Coupon handlers
  onCouponInput(): void {
    const code = (this.couponCode || '').trim();
    if (!code || code.length < 2) {
      this.couponResults = [];
      return;
    }
    // tìm chính xác theo mã
    this.phieuGiamGiaService.getPhieuGiamGiaByMaPhieu(code).subscribe({
      next: (res: any) => {
        const v = res?.data || res?.result || res;
        if (v) this.couponResults = [this.mapVoucher(v)];
      },
      error: () => {},
    });
    // tìm kiếm gần đúng
    this.phieuGiamGiaService.searchPhieuGiamGia(code).subscribe({
      next: (res: any) => {
        const list = res?.data || res?.content || res || [];
        this.couponResults = (Array.isArray(list) ? list : []).map((x) => this.mapVoucher(x));
      },
    });
  }

  applyCouponFromSuggestion(v: any): void {
    const mapped = this.mapVoucher(v);
    this.appliedCoupon = mapped;
    this.couponCode = mapped.code;
    this.couponResults = [];
    this.calculateCartTotal();
  }

  applyCoupon(): void {
    const code = (this.couponCode || '').trim();
    if (!code) return;
    this.phieuGiamGiaService.getPhieuGiamGiaByMaPhieu(code).subscribe({
      next: (res: any) => {
        const v = res?.data || res?.result || res;
        if (v) {
          this.applyCouponFromSuggestion(v);
          this.showToast('Đã áp dụng phiếu giảm giá', 'success');
        } else {
          this.showToast('Không tìm thấy phiếu giảm giá', 'warning');
        }
      },
      error: () => this.showToast('Không tìm thấy phiếu giảm giá', 'warning'),
    });
  }

  removeCoupon(): void {
    this.appliedCoupon = null;
    this.couponCode = '';
    this.calculateCartTotal();
  }

  private mapVoucher(v: any) {
    return {
      id: v.id ?? v.voucherId ?? 0,
      code: v.code ?? v.maPhieu ?? v.ma ?? '',
      type:
        (v.type ?? v.loaiPhieuGiamGia ?? v.loaiGiam ?? v.kieuGiam ?? 'PERCENT')
          .toString()
          .toUpperCase() === 'PERCENT'
          ? 'PERCENT'
          : 'FIXED',
      value: Number(v.value ?? v.giaTri ?? v.giaTriGiam ?? 0),
      maxDiscount: v.maxDiscount ?? v.giamToiDa ?? v.soTienToiDa ?? undefined,
      minOrder:
        v.minOrder ?? v.dieuKienToiThieu ?? v.hoaDonToiThieu ?? v.giaTriToiThieu ?? undefined,
    } as {
      id: number;
      code: string;
      type: 'PERCENT' | 'FIXED';
      value: number;
      maxDiscount?: number;
      minOrder?: number;
    };
  }

  filterSales(): void {
    this.filteredSales = this.counterSales.filter((sale) => {
      const matchesSearch =
        !this.searchTerm ||
        sale.saleNumber.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        sale.customerName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        sale.customerPhone?.includes(this.searchTerm);

      const matchesStatus = this.selectedStatus === 'all' || sale.status === this.selectedStatus;
      const matchesPaymentStatus =
        this.selectedPaymentStatus === 'all' || sale.paymentStatus === this.selectedPaymentStatus;
      const matchesPaymentMethod =
        this.selectedPaymentMethod === 'all' || sale.paymentMethod === this.selectedPaymentMethod;

      return matchesSearch && matchesStatus && matchesPaymentStatus && matchesPaymentMethod;
    });

    this.applySorting();
    this.updatePagination();
  }

  applySorting(): void {
    if (this.sortColumn && this.sortDirection) {
      this.filteredSales.sort((a, b) => {
        let aValue: any = a[this.sortColumn as keyof CounterSale];
        let bValue: any = b[this.sortColumn as keyof CounterSale];

        if (this.sortColumn === 'createdAt' || this.sortColumn === 'updatedAt') {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }

        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
  }

  sort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.applySorting();
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalItems = this.filteredSales.length;
    this.currentPage = 1;
    this.paginateSales();
  }

  paginateSales(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedSales = this.filteredSales.slice(startIndex, endIndex);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.paginateSales();
  }

  onItemsPerPageChange(event: any): void {
    this.itemsPerPage = parseInt(event.target.value, 10);
    this.currentPage = 1;
    this.paginateSales();
  }

  onSearchChange(): void {
    this.filterSales();
  }

  onStatusChange(): void {
    this.filterSales();
  }

  onPaymentStatusChange(): void {
    this.filterSales();
  }

  onPaymentMethodChange(): void {
    this.filterSales();
  }

  openAddModal(): void {
    this.newSale = {
      saleNumber: this.generateSaleNumber(),
      customerName: '',
      customerPhone: '',
      staffId: 1,
      staffName: 'Nguyễn Văn A',
      items: [],
      subtotal: 0,
      discount: 0,
      discountAmount: 0,
      tax: 10,
      taxAmount: 0,
      totalAmount: 0,
      paymentMethod: 'cash',
      paymentStatus: 'pending',
      status: 'draft',
      notes: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 1,
      updatedBy: 1,
    };
    this.cart = [];
    this.calculateCartTotal();
    this.showAddModal = true;
  }

  openEditModal(sale: CounterSale): void {
    this.editingSale = { ...sale };
    this.showEditModal = true;
  }

  openViewModal(sale: CounterSale): void {
    this.selectedSale = sale;
    this.showViewModal = true;
  }

  openDeleteModal(sale: CounterSale): void {
    this.selectedSale = sale;
    this.showDeleteModal = true;
  }

  openCartModal(): void {
    this.showCartModal = true;
  }

  closeModals(): void {
    this.showAddModal = false;
    this.showEditModal = false;
    this.showViewModal = false;
    this.showDeleteModal = false;
    this.showCartModal = false;
    this.selectedSale = null;
    this.editingSale = null;
  }

  generateSaleNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `CS-${year}${month}${day}-${random}`;
  }

  // Cart methods
  addToCart(product: any): void {
    // Check if invoice has been created before allowing to add products
    if (!this.isInvoiceCreated || !this.currentHoaDonChoId) {
      this.showToast('Vui lòng tạo hóa đơn trước khi thêm sản phẩm vào giỏ hàng.', 'warning');
      return;
    }

    const itemRequest: GioHangChoItem = {
      chiTietSanPhamId: product.id,
      tenSanPham: product.name,
      soLuong: 1,
      donGia: product.price,
      giamGia: 0,
      thanhTien: product.price,
    };

    this.hoaDonChoService.addItemToCart(this.currentHoaDonChoId, itemRequest).subscribe({
      next: (hoaDonCho: HoaDonCho) => {
        // Update local cart from response
        this.cart = (hoaDonCho.danhSachGioHang || []).map((item: GioHangChoItem) => {
          const imageUrl = this.getImageUrlFromChiTietSanPhamId(item.chiTietSanPhamId);
          return {
            productId: item.chiTietSanPhamId,
            productCode: '',
            productName: item.tenSanPham || '',
            category: '',
            quantity: item.soLuong,
            unitPrice: item.donGia,
            totalPrice: item.thanhTien || item.donGia * item.soLuong - (item.giamGia || 0),
            discount: item.giamGia ? (item.giamGia / (item.donGia * item.soLuong)) * 100 : 0,
            discountAmount: item.giamGia || 0,
            stockQuantity: 0,
            imageUrl: imageUrl,
            gioHangChoId: item.id, // Store gioHangChoId for deletion
          };
        });
        this.calculateCartTotal();
        this.loadPendingInvoices();
        // Reload product list to update stock quantity
        this.loadAvailableProducts();
        this.showToast('Đã thêm sản phẩm vào giỏ hàng', 'success');
      },
      error: (err) => {
        this.showToast(
          'Lỗi khi thêm sản phẩm: ' + (err.error?.error || err.message || 'Không xác định'),
          'error'
        );
      },
    });
  }

  removeFromCart(productId: number): void {
    if (!this.currentHoaDonChoId) {
      this.cart = this.cart.filter((item) => item.productId !== productId);
      this.calculateCartTotal();
      return;
    }

    // Find the cart item
    const cartItem = this.cart.find((item) => item.productId === productId);
    if (!cartItem) {
      this.showToast('Không tìm thấy sản phẩm trong giỏ hàng', 'warning');
      return;
    }

    // Get gioHangChoId from cart item (stored when loading/adding)
    const gioHangChoId = cartItem.gioHangChoId;
    if (!gioHangChoId) {
      // Fallback: try to reload pending invoice to get fresh data
      this.hoaDonChoService.getHoaDonChoById(this.currentHoaDonChoId).subscribe({
        next: (hoaDonCho: HoaDonCho) => {
          const gioHangItem = hoaDonCho.danhSachGioHang?.find(
            (item) => item.chiTietSanPhamId === productId
          );
          if (gioHangItem && gioHangItem.id) {
            this.removeCartItem(gioHangItem.id);
          } else {
            this.showToast('Không tìm thấy ID giỏ hàng để xóa', 'error');
          }
        },
        error: () => {
          this.showToast('Lỗi khi tải dữ liệu giỏ hàng', 'error');
        },
      });
      return;
    }

    this.removeCartItem(gioHangChoId);
  }

  private removeCartItem(gioHangChoId: number): void {
    if (!this.currentHoaDonChoId) return;

    this.hoaDonChoService.removeItemFromCart(this.currentHoaDonChoId, gioHangChoId).subscribe({
      next: (hoaDonCho: HoaDonCho) => {
        console.log('Response after delete:', hoaDonCho);
        console.log('danhSachGioHang length:', hoaDonCho.danhSachGioHang?.length || 0);

        // Update local cart from response
        this.cart = (hoaDonCho.danhSachGioHang || []).map((item: GioHangChoItem) => {
          const imageUrl = this.getImageUrlFromChiTietSanPhamId(item.chiTietSanPhamId);
          return {
            productId: item.chiTietSanPhamId,
            productCode: '',
            productName: item.tenSanPham || '',
            category: '',
            quantity: item.soLuong,
            unitPrice: item.donGia,
            totalPrice: item.thanhTien || item.donGia * item.soLuong - (item.giamGia || 0),
            discount: item.giamGia ? (item.giamGia / (item.donGia * item.soLuong)) * 100 : 0,
            discountAmount: item.giamGia || 0,
            stockQuantity: 0,
            imageUrl: imageUrl,
            gioHangChoId: item.id, // Store gioHangChoId for deletion
          };
        });

        console.log('Updated cart length:', this.cart.length);
        this.calculateCartTotal();
        this.loadPendingInvoices();
        // Reload product list to update stock quantity
        this.loadAvailableProducts();
        this.showToast('Đã xóa sản phẩm khỏi giỏ hàng', 'success');
      },
      error: (err) => {
        console.error('Error deleting cart item:', err);
        this.showToast(
          'Lỗi khi xóa sản phẩm: ' + (err.error?.error || err.message || 'Không xác định'),
          'error'
        );
      },
    });
  }

  updateCartQuantity(productId: number, quantity: string | number): void {
    if (!this.currentHoaDonChoId) {
      const item = this.cart.find((item) => item.productId === productId);
      if (item) {
        const qty = typeof quantity === 'string' ? parseInt(quantity, 10) : quantity;
        item.quantity = Math.max(1, qty);
        item.totalPrice = item.unitPrice * item.quantity;
        this.calculateCartTotal();
      }
      return;
    }

    const qty = typeof quantity === 'string' ? parseInt(quantity, 10) : quantity;
    const finalQty = Math.max(1, qty);

    // Get gioHangChoId from cart item
    const cartItem = this.cart.find((item) => item.productId === productId);
    if (!cartItem) return;

    const gioHangChoId = cartItem.gioHangChoId;
    if (!gioHangChoId) {
      // Fallback: try to reload pending invoice to get fresh data
      this.hoaDonChoService.getHoaDonChoById(this.currentHoaDonChoId).subscribe({
        next: (hoaDonCho: HoaDonCho) => {
          const gioHangItem = hoaDonCho.danhSachGioHang?.find(
            (item) => item.chiTietSanPhamId === productId
          );
          if (gioHangItem && gioHangItem.id) {
            this.updateCartItemQuantity(gioHangItem.id, finalQty);
          } else {
            this.showToast('Không tìm thấy ID giỏ hàng để cập nhật', 'error');
          }
        },
        error: () => {
          this.showToast('Lỗi khi tải dữ liệu giỏ hàng', 'error');
        },
      });
      return;
    }

    this.updateCartItemQuantity(gioHangChoId, finalQty);
  }

  private updateCartItemQuantity(gioHangChoId: number, quantity: number): void {
    if (!this.currentHoaDonChoId) return;

    this.hoaDonChoService
      .updateCartItemQuantity(this.currentHoaDonChoId, gioHangChoId, quantity)
      .subscribe({
        next: (hoaDonCho: HoaDonCho) => {
          // Update local cart from response
          this.cart = (hoaDonCho.danhSachGioHang || []).map((item: GioHangChoItem) => {
            const imageUrl = this.getImageUrlFromChiTietSanPhamId(item.chiTietSanPhamId);
            return {
              productId: item.chiTietSanPhamId,
              productCode: '',
              productName: item.tenSanPham || '',
              category: '',
              quantity: item.soLuong,
              unitPrice: item.donGia,
              totalPrice: item.thanhTien || item.donGia * item.soLuong - (item.giamGia || 0),
              discount: item.giamGia ? (item.giamGia / (item.donGia * item.soLuong)) * 100 : 0,
              discountAmount: item.giamGia || 0,
              stockQuantity: 0,
              imageUrl: imageUrl,
              gioHangChoId: item.id, // Store gioHangChoId for future operations
            };
          });
          this.calculateCartTotal();
          this.loadPendingInvoices();
          // Reload product list to update stock quantity
          this.loadAvailableProducts();
          this.showToast('Đã cập nhật số lượng sản phẩm', 'success');
        },
        error: (err) => {
          this.showToast(
            'Lỗi khi cập nhật số lượng: ' + (err.error?.error || err.message || 'Không xác định'),
            'error'
          );
        },
      });
  }

  updateCartDiscount(productId: number, discount: string | number): void {
    const item = this.cart.find((item) => item.productId === productId);
    if (item) {
      const disc = typeof discount === 'string' ? parseFloat(discount) : discount;
      item.discount = Math.max(0, Math.min(100, disc));
      item.discountAmount = (item.totalPrice * item.discount) / 100;
      this.calculateCartTotal();
    }
  }

  calculateCartTotal(): void {
    this.cartSubtotal = this.cart.reduce((sum, item) => sum + item.totalPrice, 0);
    this.cartDiscount = this.cart.reduce((sum, item) => sum + item.discountAmount, 0);
    // tính coupon
    this.couponDiscount = 0;
    if (this.appliedCoupon) {
      const base = Math.max(0, this.cartSubtotal - this.cartDiscount);
      if (this.appliedCoupon.minOrder && base < this.appliedCoupon.minOrder) {
        this.couponDiscount = 0;
      } else if (this.appliedCoupon.type === 'PERCENT') {
        this.couponDiscount = (base * this.appliedCoupon.value) / 100;
        if (
          this.appliedCoupon.maxDiscount !== undefined &&
          this.appliedCoupon.maxDiscount !== null
        ) {
          this.couponDiscount = Math.min(this.couponDiscount, this.appliedCoupon.maxDiscount);
        }
      } else {
        this.couponDiscount = this.appliedCoupon.value;
      }
      this.couponDiscount = Math.min(this.couponDiscount, base);
    }
    const afterDiscount = Math.max(0, this.cartSubtotal - this.cartDiscount - this.couponDiscount);
    this.cartTotal = afterDiscount + afterDiscount * (this.cartTax / 100);
    this.refreshVoucherSuggestions();
  }

  private refreshVoucherSuggestions(): void {
    const base = Math.max(0, this.cartSubtotal - this.cartDiscount);
    const customerId = this.newSale.customerId;
    const collected: any[] = [];
    // lấy mã chung đang hoạt động
    this.phieuGiamGiaService.getActivePhieuGiamGia().subscribe({
      next: (res: any) => {
        const general = (res?.data || res?.content || res || []) as any[];
        collected.push(...general);
        if (customerId) {
          // lấy toàn bộ mã cá nhân rồi lọc theo khách hàng hiện tại
          this.phieuGiamGiaService.getAllPhieuGiamGiaCaNhan().subscribe({
            next: (pers: any) => {
              const raw = pers?.data || pers?.content || pers || [];
              const personal = (Array.isArray(raw) ? raw : [])
                .filter((r: any) => (r?.khachHangId ?? r?.khachHang?.id) === customerId)
                .map((r: any) => r?.phieuGiamGia || r?.voucher || r);
              this.computeVoucherLists([...collected, ...personal], base);
            },
            error: () => this.computeVoucherLists(collected, base),
          });
        } else {
          this.computeVoucherLists(collected, base);
        }
      },
      error: () => this.computeVoucherLists([], base),
    });
  }

  private computeVoucherLists(raw: any[], base: number): void {
    const mapped = (raw || [])
      .map((v) => this.mapVoucher(v))
      .filter((m) => m && (!m.minOrder || base >= m.minOrder));
    const usable = mapped
      .map((m) => ({ ...m, discount: this.computeVoucherDiscount(m, base) }))
      .filter((x) => x.discount > 0)
      .sort((a, b) => b.discount - a.discount);
    this.bestVoucher = usable[0] || null;
    this.alternativeVouchers = usable.slice(1, 5);
    this.allVouchers = usable; // flat, sorted desc
    // Chỉ hiển thị một số phiếu giảm giá đầu tiên (giới hạn để view không bị dài)
    this.displayedVouchers = usable.slice(0, this.maxDisplayedVouchers);
  }

  private computeVoucherDiscount(v: any, base: number): number {
    if (v.type === 'PERCENT') {
      let d = (base * v.value) / 100;
      if (v.maxDiscount !== undefined && v.maxDiscount !== null) d = Math.min(d, v.maxDiscount);
      return Math.min(d, base);
    }
    return Math.min(v.value, base);
  }

  processSale(): void {
    if (this.cart.length === 0) {
      alert('Giỏ hàng trống!');
      return;
    }

    // Nếu chọn giao hàng, bắt buộc có địa chỉ nhận
    if (this.isDelivery) {
      const finalAddress = this.customerSavedAddress || this.shippingAddress;
      if (!finalAddress || String(finalAddress).trim().length === 0) {
        this.showToast('Vui lòng nhập địa chỉ giao hàng', 'warning');
        return;
      }
    }

    // Nếu chọn chuyển khoản và chưa xác nhận QR, hiện QR trước
    if (this.checkoutPaymentMethod === 'transfer' && !this.transferQrConfirmed) {
      this.transferQrUrl = this.buildTransferQrUrl();
      this.showTransferQrModal = true;
      return; // Dừng tại đây, sau khi xác nhận sẽ tiếp tục
    }

    // Set payment method based on selection
    this.newSale.paymentMethod = this.checkoutPaymentMethod;

    const newSale: CounterSale = {
      id: this.counterSales.length + 1,
      saleNumber: this.newSale.saleNumber!,
      customerId: this.newSale.customerId,
      customerName: this.newSale.customerName,
      customerPhone: this.newSale.customerPhone,
      staffId: this.newSale.staffId!,
      staffName: this.newSale.staffName!,
      items: this.cart.map((item) => ({
        id: item.productId,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        category: item.category,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        discount: item.discount,
        discountAmount: item.discountAmount,
        stockQuantity: item.stockQuantity,
      })),
      subtotal: this.cartSubtotal,
      discount: this.cartDiscount,
      discountAmount: this.cartDiscount,
      tax: this.cartTax,
      taxAmount: (this.cartSubtotal - this.cartDiscount) * (this.cartTax / 100),
      totalAmount: this.cartTotal,
      paymentMethod: this.newSale.paymentMethod!,
      paymentStatus: this.newSale.paymentStatus!,
      status: 'completed',
      notes: this.newSale.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: this.newSale.createdBy!,
      updatedBy: this.newSale.updatedBy!,
    };

    // Gọi BE tạo hóa đơn rồi điều hướng sang trang chi tiết
    // Khi thanh toán tại quầy, hóa đơn tự động hoàn thành (DA_GIAO_HANG) và không cần xác nhận
    const payload: any = {
      maHoaDon: this.generateSaleNumber().replace('CS', 'HD'),
      khachHangId: this.newSale.customerId,
      tenKhachHang: this.newSale.customerName,
      soDienThoaiKhachHang: this.newSale.customerPhone,
      ngayTao: new Date().toISOString(),
      tongTien: Math.round(this.cartTotal),
      thanhTien: Math.round(this.cartTotal),
      tienGiamGia: Math.round(this.cartDiscount + this.couponDiscount),
      phuongThucThanhToan: this.newSale.paymentMethod,
      trangThai: this.isDelivery ? 'DA_XAC_NHAN' : 'DA_GIAO_HANG',
      danhSachChiTiet: this.cart.map((item) => ({
        chiTietSanPhamId: item.productId,
        tenSanPham: item.productName,
        soLuong: item.quantity,
        donGia: item.unitPrice,
        giamGia: item.discountAmount,
        thanhTien: item.totalPrice - item.discountAmount,
      })),
    };

    // Giao hàng
    if (this.isDelivery) {
      const finalAddress = this.customerSavedAddress || this.shippingAddress;
      // Resolve address component names
      const provinceName =
        this.provinces.find((p) => p.code === this.selectedProvinceCode)?.name || '';
      const districtName =
        this.districts.find((d) => d.code === this.selectedDistrictCode)?.name || '';
      const wardName = this.wards.find((w) => w.code === this.selectedWardCode)?.name || '';
      const detail = this.addressDetail || '';

      payload.giaoHang = {
        // Common fields
        diaChiNhan: finalAddress,
        diaChiGiaoHang: finalAddress,
        diaChi: finalAddress,
        // Component fields for rendering
        diaChiChiTiet: detail,
        phuongXa: wardName,
        quanHuyen: districtName,
        tinhThanh: provinceName,
        // Recipient info
        tenNguoiNhan: this.newSale.customerName,
        soDienThoaiNguoiNhan: this.newSale.customerPhone,
        // Note
        ghiChuGiaoHang: this.shippingNote,
      };
    }

    // Đính kèm thông tin chuyển khoản nếu có
    if (this.checkoutPaymentMethod === 'transfer') {
      payload.thanhToanChuyenKhoan = {
        soTienChuyen: this.transferInfo.amount ?? this.cartTotal,
        nganHang: this.transferInfo.bankName,
        soTaiKhoan: this.transferInfo.accountNumber,
        maGiaoDich: this.transferInfo.transactionCode,
      };
    } else {
      // Tiền mặt
      payload.tienMatKhachDua = this.cashReceived ?? this.cartTotal;
    }

    this.submitSale(payload, newSale);
  }

  private submitSale(payload: any, newSale: CounterSale): void {
    this.hoaDonService.createHoaDon(payload).subscribe({
      next: (created: any) => {
        const createdId = created?.id;

        // Nếu là giao hàng và KH chưa có địa chỉ lưu sẵn -> Lưu địa chỉ mới vào sổ địa chỉ KH
        if (this.isDelivery && !this.customerSavedAddress && this.newSale.customerId) {
          const provinceName =
            this.provinces.find((p) => p.code === this.selectedProvinceCode)?.name || '';
          const districtName =
            this.districts.find((d) => d.code === this.selectedDistrictCode)?.name || '';
          const wardName = this.wards.find((w) => w.code === this.selectedWardCode)?.name || '';
          const detail = this.addressDetail || '';
          const addressToSave = {
            tenNguoiNhan: this.newSale.customerName || '',
            soDienThoai: this.newSale.customerPhone || '',
            diaChiChiTiet: detail,
            tinhThanh: provinceName,
            quanHuyen: districtName,
            phuongXa: wardName,
            macDinh: false,
            trangThai: true,
            khachHangId: this.newSale.customerId as number,
          } as any;
          this.diaChiKhachHangService
            .createDiaChi(addressToSave)
            .subscribe({ next: () => {}, error: () => {} });
        }

        // Xóa hóa đơn chờ nếu có
        if (this.currentHoaDonChoId) {
          this.hoaDonChoService.deleteHoaDonCho(this.currentHoaDonChoId).subscribe({
            next: () => {},
            error: () => {},
          });
        }

        // reset POS state trước khi điều hướng
        this.counterSales.unshift(newSale);
        this.cart = [];
        this.calculateCartTotal();
        this.closeModals();
        this.filterSales();
        // Reset flag và currentHoaDonChoId để chuẩn bị cho hóa đơn mới
        this.isInvoiceCreated = false;
        this.currentHoaDonChoId = null;
        // Reload danh sách hóa đơn chờ
        this.loadPendingInvoices();
        if (createdId) {
          this.router.navigate(['/invoices', createdId]);
        }
      },
      error: () => {
        // Nếu lỗi tạo hóa đơn, vẫn dọn trạng thái giỏ và ở lại trang hiện tại
        this.counterSales.unshift(newSale);
        this.cart = [];
        this.calculateCartTotal();
        this.closeModals();
        this.filterSales();
        // Reset flag để chuẩn bị cho hóa đơn mới
        this.isInvoiceCreated = false;
      },
    });
  }

  confirmTransferQrAndPay(): void {
    this.transferQrConfirmed = true;
    this.showTransferQrModal = false;
    // Gọi lại processSale để tiếp tục submit
    this.processSale();
  }

  cancelTransferQr(): void {
    this.showTransferQrModal = false;
    this.transferQrConfirmed = false;
  }

  private buildTransferQrUrl(): string {
    const amount = this.cartTotal;
    const info = `Thanh toan tai quay`; // ghi nội dung chuyển khoản
    const params = new URLSearchParams({
      amount: String(amount || 0),
      addInfo: info,
      accountName: this.qrAccountName,
    });
    // VietQR image API
    return `https://img.vietqr.io/image/${this.qrBankCode}-${
      this.qrAccount
    }-compact.png?${params.toString()}`;
  }

  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      draft: 'badge-secondary',
      processing: 'badge-primary',
      completed: 'badge-success',
      cancelled: 'badge-danger',
    };
    return statusClasses[status] || 'badge-secondary';
  }

  getStatusLabel(status: string): string {
    const statusLabels: { [key: string]: string } = {
      draft: 'Nháp',
      processing: 'Đang xử lý',
      completed: 'Hoàn thành',
      cancelled: 'Hủy',
    };
    return statusLabels[status] || status;
  }

  getPaymentStatusClass(paymentStatus: string): string {
    const statusClasses: { [key: string]: string } = {
      pending: 'badge-warning',
      paid: 'badge-success',
      partial: 'badge-info',
      refunded: 'badge-danger',
    };
    return statusClasses[paymentStatus] || 'badge-secondary';
  }

  getPaymentStatusLabel(paymentStatus: string): string {
    const statusLabels: { [key: string]: string } = {
      pending: 'Chờ thanh toán',
      paid: 'Đã thanh toán',
      partial: 'Thanh toán một phần',
      refunded: 'Hoàn tiền',
    };
    return statusLabels[paymentStatus] || paymentStatus;
  }

  getPaymentMethodLabel(method: string): string {
    const methodLabels: { [key: string]: string } = {
      cash: 'Tiền mặt',
      card: 'Thẻ',
      transfer: 'Chuyển khoản',
      other: 'Khác',
    };
    return methodLabels[method] || method;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('vi-VN').format(new Date(date));
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = 'all';
    this.selectedPaymentStatus = 'all';
    this.selectedPaymentMethod = 'all';
    this.filterSales();
  }

  // Load provinces from sub-vn library
  loadProvinces(): void {
    this.provinces = provincesData as any as Array<{ code: string; name: string }>;
  }

  onProvinceChange(): void {
    this.selectedDistrictCode = '';
    this.selectedWardCode = '';
    const allDistricts = districtsData as any as Array<{
      code: string;
      name: string;
      province_code: string;
    }>;
    this.districts = allDistricts.filter((d) => d.province_code === this.selectedProvinceCode);
    this.wards = [];
    this.composeShippingAddress();
  }

  onDistrictChange(): void {
    this.selectedWardCode = '';
    const allWards = wardsData as any as Array<{
      code: string;
      name: string;
      district_code: string;
    }>;
    this.wards = allWards.filter((w) => w.district_code === this.selectedDistrictCode);
    this.composeShippingAddress();
  }

  onWardChange(): void {
    this.composeShippingAddress();
  }

  composeShippingAddress(): void {
    const province = this.provinces.find((p) => p.code === this.selectedProvinceCode)?.name || '';
    const district = this.districts.find((d) => d.code === this.selectedDistrictCode)?.name || '';
    const ward = this.wards.find((w) => w.code === this.selectedWardCode)?.name || '';
    const detail = this.addressDetail || '';
    const parts = [detail, ward, district, province].filter((x) => x && x.trim().length > 0);
    this.shippingAddress = parts.join(', ');
  }

  // Load customer's default (or first) address when available and delivery enabled
  onDeliveryToggleChange(): void {
    if (this.isDelivery) {
      this.tryLoadCustomerDefaultAddress();
    }
  }

  private tryLoadCustomerDefaultAddress(): void {
    const customerId = this.newSale.customerId as any;
    if (!customerId) return;
    this.diaChiKhachHangService.getDiaChiByKhachHangId(customerId).subscribe({
      next: (addresses: any[]) => {
        this.customerAddresses = Array.isArray(addresses) ? addresses : [];
        if (this.customerAddresses.length > 0) {
          const def =
            this.customerAddresses.find((a: any) => a.macDinh) || this.customerAddresses[0];
          this.applyAddressFromSaved(def);
          this.selectedSavedAddressId = String(def.id);
        } else {
          // No saved addresses
          this.customerSavedAddress = null;
          this.selectedSavedAddressId = 'new';
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.customerAddresses = [];
      },
    });
  }

  onSelectSavedAddress(): void {
    if (!this.selectedSavedAddressId || this.selectedSavedAddressId === 'new') {
      this.customerSavedAddress = null;
      return;
    }
    const addr = this.customerAddresses.find((a) => String(a.id) === this.selectedSavedAddressId);
    if (addr) {
      this.applyAddressFromSaved(addr);
    }
  }

  private applyAddressFromSaved(def: any): void {
    const full = [def?.diaChiChiTiet, def?.phuongXa, def?.quanHuyen, def?.tinhThanh]
      .filter((x) => !!x)
      .join(', ');
    this.customerSavedAddress = full;
    // Map names back to codes for selectors
    try {
      const province = (this.provinces as any[]).find((p) => p.name === def?.tinhThanh);
      if (province) {
        this.selectedProvinceCode = province.code;
        this.onProvinceChange();
        const district = (this.districts as any[]).find((d) => d.name === def?.quanHuyen);
        if (district) {
          this.selectedDistrictCode = district.code;
          this.onDistrictChange();
          const ward = (this.wards as any[]).find((w) => w.name === def?.phuongXa);
          if (ward) {
            this.selectedWardCode = ward.code;
          }
        }
        this.addressDetail = def?.diaChiChiTiet || '';
        this.composeShippingAddress();
      }
    } catch {}
  }

  shouldShowShippingAddress(): boolean {
    // Show manual input only when delivery ON and either no saved addresses or user chooses 'new'
    return (
      this.isDelivery &&
      (this.customerAddresses.length === 0 || this.selectedSavedAddressId === 'new')
    );
  }

  // Mở modal để xem tất cả phiếu giảm giá
  openVoucherModal(): void {
    this.showVoucherModal = true;
    this.voucherModalSearchTerm = '';
  }

  // Đóng modal phiếu giảm giá
  closeVoucherModal(): void {
    this.showVoucherModal = false;
    this.voucherModalSearchTerm = '';
  }

  // Lọc phiếu giảm giá trong modal dựa trên từ khóa tìm kiếm
  get filteredVouchersForModal(): any[] {
    if (!this.voucherModalSearchTerm || this.voucherModalSearchTerm.trim() === '') {
      return this.allVouchers;
    }
    const searchTerm = this.voucherModalSearchTerm.toLowerCase().trim();
    return this.allVouchers.filter(
      (v) =>
        v.code.toLowerCase().includes(searchTerm) ||
        (v.minOrder && v.minOrder.toString().includes(searchTerm)) ||
        (v.discount && v.discount.toString().includes(searchTerm))
    );
  }

  // Áp dụng phiếu giảm giá từ modal
  applyCouponFromModal(v: any): void {
    this.applyCouponFromSuggestion(v);
    this.closeVoucherModal();
  }
}
