import { Component, OnInit } from '@angular/core';
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
import {
  CounterSale,
  CounterSaleItem,
  CartItem,
  CounterSaleFilter,
} from '../../interfaces/counter-sale.interface';

type UICartItem = CartItem & { imageUrl?: string };

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

  // POS state
  invoiceSearch: string = '';
  pendingInvoices: { code: string; items: CartItem[] }[] = [];
  customerSearch: string = '';
  customerResults: { id: number; name: string; phone: string }[] = [];
  private customerSearchTimer: any;
  customerCreating: boolean = false;
  // simple toast
  toastVisible: boolean = false;
  toastMessage: string = '';
  toastType: 'success' | 'warning' | 'error' = 'success';
  isDelivery: boolean = false;

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
  showBestTab: boolean = true;

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

  selectedSale: CounterSale | null = null;
  editingSale: CounterSale | null = null;

  // Product search
  productSearchTerm: string = '';
  availableProducts: any[] = [];
  productIdToImageUrl: { [productId: number]: string } = {};

  private parsePrice(value: any): number {
    if (typeof value === 'number' && isFinite(value)) return value;
    if (typeof value === 'string') {
      const digits = value.replace(/[^0-9]/g, '');
      return digits ? Number(digits) : 0;
    }
    return 0;
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
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadSampleData();
    this.loadAvailableProducts();
    this.filterSales();
    this.filterProducts();
    this.refreshVoucherSuggestions();
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
          return {
            id: r.id,
            code: `${r.sanPhamId || r.san_pham_id}-${r.kichThuocId || r.kich_thuoc_id}-${
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
            productId: r.sanPhamId || r.san_pham_id,
            imageUrl: undefined as string | undefined,
          };
        });
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
    // Luôn tạo 1 hóa đơn chờ mới (kể cả khi giỏ hàng trống)
    const code = this.generateSaleNumber();
    const snapshot = JSON.parse(JSON.stringify(this.cart));
    this.pendingInvoices.unshift({ code, items: snapshot });
    // Reset giỏ hiện tại cho hóa đơn mới
    this.cart = [];
    this.calculateCartTotal();
  }

  loadPending(inv: { code: string; items: CartItem[] }): void {
    this.cart = JSON.parse(JSON.stringify(inv.items));
    this.calculateCartTotal();
  }

  deletePending(inv: { code: string; items: CartItem[] }, event?: Event): void {
    if (event) event.stopPropagation();
    this.pendingInvoices = this.pendingInvoices.filter((p) => p !== inv);
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
          const payload: any = {
            tenKhachHang: name,
            soDienThoai: phoneDigits,
            trangThai: true,
          };
          this.khachHangService
            .createKhachHang(payload)
            .subscribe({
              next: (res: any) => {
                const id = res?.id ?? 0;
                this.newSale.customerId = id;
                this.customerSearch = `${name} - ${phoneDigits}`;
                this.customerResults = [];
                this.showToast('Thêm khách hàng thành công', 'success');
              },
              error: (err) => {
                this.showToast('Không thể thêm khách hàng. Vui lòng thử lại.', 'error');
              },
            })
            .add(() => (this.customerCreating = false));
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
    const existingItem = this.cart.find((item) => item.productId === product.id);

    if (existingItem) {
      existingItem.quantity += 1;
      existingItem.totalPrice = existingItem.unitPrice * existingItem.quantity;
    } else {
      this.cart.push({
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        category: product.category,
        imageUrl: product.imageUrl,
        quantity: 1,
        unitPrice: product.price,
        totalPrice: product.price,
        discount: 0,
        discountAmount: 0,
        stockQuantity: product.stock,
      });
    }

    this.calculateCartTotal();
  }

  removeFromCart(productId: number): void {
    this.cart = this.cart.filter((item) => item.productId !== productId);
    this.calculateCartTotal();
  }

  updateCartQuantity(productId: number, quantity: string | number): void {
    const item = this.cart.find((item) => item.productId === productId);
    if (item) {
      const qty = typeof quantity === 'string' ? parseInt(quantity, 10) : quantity;
      item.quantity = Math.max(1, qty);
      item.totalPrice = item.unitPrice * item.quantity;
      this.calculateCartTotal();
    }
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
      trangThai: 'DA_XAC_NHAN',
      danhSachChiTiet: this.cart.map((item) => ({
        chiTietSanPhamId: item.productId,
        tenSanPham: item.productName,
        soLuong: item.quantity,
        donGia: item.unitPrice,
        giamGia: item.discountAmount,
        thanhTien: item.totalPrice - item.discountAmount,
      })),
    };

    this.hoaDonService.createHoaDon(payload).subscribe({
      next: (created: any) => {
        const createdId = created?.id;
        // reset POS state trước khi điều hướng
        this.counterSales.unshift(newSale);
        this.cart = [];
        this.calculateCartTotal();
        this.closeModals();
        this.filterSales();
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
      },
    });
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
}
