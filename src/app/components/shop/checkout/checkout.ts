import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { HoaDonChoService, HoaDonCho, GioHangChoItem } from '../../../services/hoa-don-cho.service';
import { HoaDonService } from '../../../services/hoa-don.service';
import { AuthService } from '../../../services/auth';
import { CustomerAddressService } from '../../../services/customer-address.service';
import { CustomerService } from '../../../services/customer.service';
import { PhieuGiamGiaService } from '../../../services/phieu-giam-gia.service';
import { ChiTietSanPhamApiService } from '../../../services/chi-tiet-san-pham-api.service';
import { GHNService } from '../../../services/ghn.service';
import { VietnamAddressService, Province, District, Ward } from '../../../services/vietnam-address.service';
import provincesData from 'sub-vn/json_data/provinces.json';
import districtsData from 'sub-vn/json_data/districts.json';
import wardsData from 'sub-vn/json_data/wards.json';
import { ShopHeaderComponent } from '../shared/shop-header.component';
import { ShopFooterComponent } from '../shared/shop-footer.component';
import { ChatbotComponent } from '../chatbot/chatbot.component';
import { NotificationComponent } from '../shared/notification.component';
import { NotificationService } from '../shared/notification.service';
import { environment } from '../../../../environments/environment';
import * as CryptoJS from 'crypto-js';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ShopHeaderComponent,
    ShopFooterComponent,
    ChatbotComponent,
    NotificationComponent,
  ],
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.scss'],
})
export class CheckoutComponent implements OnInit {
  cart: HoaDonCho | null = null;
  tempCart: any[] = []; // Giỏ hàng tạm từ localStorage
  isTempCart = false; // Flag để biết đang dùng giỏ hàng tạm hay DB
  cartId: number | null = null;
  isLoading = false;
  isSubmitting = false;
  error = '';

  // Form data
  billingInfo = {
    firstName: '',
    lastName: '',
    country: 'Việt Nam',
    address: '',
    city: '',
    phone: '',
    email: '',
  };

  createAccount = false;
  shipToDifferentAddress = false;
  orderNotes = '';

  // Payment method
  paymentMethod: 'cash' | 'transfer' | 'vnpay' | 'zalopay' | 'momo' = 'transfer';

  isPaymentVerified: boolean = false; // Flag to indicate payment step is done externally

  // Bank transfer info
  bankInfo = {
    bankName: 'MB Bank - Ngân hàng Quân đội',
    accountNumber: '0932313815',
    accountName: 'TDK Store',
    bankCode: 'MBbank',
    template: 'compact2',
  };

  // VNPay info (Test credentials from PortOne/VNPay Sandbox)
  vnpayInfo = {
    testUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    tmnCode: 'ZUDNOGXR', // Configured from email
    hashSecret: 'E686EI0FBOPF8IR4D2WHB3AKXM7XX5HC' // Configured from email
  };

  // ZaloPay info (Sandbox)
  zalopayInfo = {
    appId: 2553,
    key1: 'PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL',
    key2: 'kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz',
    endpoint: 'https://sb-openapi.zalopay.vn/v2/create'
  };

  // MoMo info (Sandbox)
  momoInfo = {
    partnerCode: 'MOMO', // Public Sandbox partner code
    accessKey: 'F8BBA842ECF85', // Placeholder
    secretKey: 'K951B6PE1waDMi640xX08PD3vg6EkVlz', // Placeholder
    endpoint: 'https://test-payment.momo.vn/v2/gateway/api/create'
  };

  // Auto-generated transaction code
  transactionCode = '';

  // Customer addresses
  customerAddresses: any[] = [];
  selectedAddressId: number | null = null;
  showAddAddressForm = false;
  newAddress = {
    tenNguoiNhan: '',
    soDienThoai: '',
    diaChiChiTiet: '',
    phuongXa: '',
    quanHuyen: '',
    tinhThanh: '',
    macDinh: false,
  };

  // Order confirmation
  showOrderConfirmation = false;
  orderSummary: any = null;

  // Created invoice details
  createdInvoice: any = null;
  showInvoiceDetails = false;

  // Discount code / Voucher
  couponCode: string = '';
  appliedCoupon: {
    id: number;
    code: string;
    type: 'PERCENT' | 'FIXED';
    value: number;
    maxDiscount?: number;
    minOrder?: number;
  } | null = null;
  // Reverted to single coupon logic as per POS alignment request
  // appliedCoupons array removed in favor of single appliedCoupon

  couponDiscount: number = 0;

  // Voucher suggestions
  bestVoucher: any = null;
  alternativeVouchers: any[] = [];
  allVouchers: any[] = [];
  displayedVouchers: any[] = [];
  maxDisplayedVouchers: number = 3;
  showVoucherModal: boolean = false;
  voucherModalSearchTerm: string = '';

  // Flag to prevent auto-reapply if user manually removed
  voucherManuallyRemoved: boolean = false;


  // Shipping fee
  shippingFee: number = 0; // Phí ship (mặc định 0, sẽ được tính tự động)
  isCalculatingShippingFee: boolean = false; // Flag để hiển thị loading khi tính phí ship
  DEFAULT_SHIPPING_FEE: number = 0; // Phí ship mặc định (0 = không có phí mặc định)

  // Vietnam Address Dropdowns
  provinces: Province[] = [];
  districts: District[] = [];
  wards: Ward[] = [];
  selectedProvinceCode: string = '';
  selectedDistrictCode: string = '';
  selectedWardCode: string = '';
  loadingProvinces: boolean = false;
  loadingDistricts: boolean = false;
  loadingWards: boolean = false;

  constructor(
    private hoaDonChoService: HoaDonChoService,
    private hoaDonService: HoaDonService,
    private authService: AuthService,
    private customerAddressService: CustomerAddressService,
    private customerService: CustomerService,
    private phieuGiamGiaService: PhieuGiamGiaService,
    private chiTietSanPhamApiService: ChiTietSanPhamApiService,
    private ghnService: GHNService,
    private vietnamAddressService: VietnamAddressService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService
  ) { }

  realCustomerId: number | null = null;

  ngOnInit(): void {
    console.log('🛒 CheckoutComponent ngOnInit - Starting...');

    // Resolve real customer ID first
    this.resolveCustomerId();

    const currentUser = this.authService.getCurrentUser();
    const isLoggedIn = this.authService.isLoggedIn();
    console.log('🛒 isLoggedIn:', isLoggedIn);
    console.log('🛒 currentUser:', currentUser);

    // QUAN TRỌNG: Xử lý query params và load cart trong cùng một subscription
    // để đảm bảo cartId được set trước khi gọi loadCart()
    this.route.queryParams.subscribe((params) => {
      // Kiểm tra cả cartId và cartid (case insensitive)
      const cartIdParam = params['cartId'] || params['cartid'];
      console.log('🛒 Query params:', params);
      console.log('🛒 cartId from params:', cartIdParam);

      // Check for payment verification from simulation return
      const paymentVerified = this.route.snapshot.queryParams['paymentVerified'];
      const paymentMethod = this.route.snapshot.queryParams['method'];

      // Check for REAL ZaloPay callback
      const zaloStatus = this.route.snapshot.queryParams['status'];
      const zaloAppTransId = this.route.snapshot.queryParams['apptransid'];

      // Check for REAL MoMo callback
      const momoResultCode = this.route.snapshot.queryParams['resultCode'];
      const momoOrderId = this.route.snapshot.queryParams['orderId'];

      if (paymentVerified === 'true') {
        this.handlePaymentVerified(paymentMethod);
      } else if (zaloStatus === '1' && zaloAppTransId) {
        console.log('✅ Detected ZaloPay Real Callback');
        this.paymentMethod = 'zalopay';
        this.handlePaymentVerified('zalopay');
      } else if (momoResultCode === '0' && momoOrderId) {
        console.log('✅ Detected MoMo Real Callback');
        this.paymentMethod = 'momo';
        this.handlePaymentVerified('momo');
      }

      // Check for VNPAY callback
      const vnpResponseCode = this.route.snapshot.queryParams['vnp_ResponseCode'];
      if (vnpResponseCode) {
        console.log('✅ Detected VNPAY Real Callback');
        this.handleVNPayCallback(vnpResponseCode, this.route.snapshot.queryParams);
      }

      // Set cartId từ query params hoặc localStorage
      if (cartIdParam) {
        this.cartId = parseInt(cartIdParam);
        console.log('🛒 Parsed cartId from URL:', this.cartId);
        // Có cartId từ URL - load từ DB
        this.loadCart();
      } else {
        // Không có cartId trong URL, thử lấy từ localStorage
        const pendingCartId = localStorage.getItem('pending_checkout_cart_id');
        const currentCartId = localStorage.getItem('current_cart_id');
        this.cartId = pendingCartId
          ? parseInt(pendingCartId)
          : currentCartId
            ? parseInt(currentCartId)
            : null;
        console.log('🛒 cartId from localStorage:', this.cartId);
        if (this.cartId) {
          // Có cartId từ localStorage - load từ DB
          console.log('🛒 Loading cart from DB with cartId:', this.cartId);
          this.loadCart();
        } else if (isLoggedIn && currentUser?.id) {
          // Đã đăng nhập nhưng không có cartId - thử lấy cart của khách hàng
          console.log('🛒 Loading cart from DB for customerId:', currentUser.id);
          this.hoaDonChoService.getHoaDonChoByKhachHangId(currentUser.id).subscribe({
            next: (carts) => {
              console.log('🛒 Received carts from DB:', carts?.length || 0);
              if (carts && carts.length > 0) {
                const activeCart = carts.find((c) => c.trangThai === 'DANG_CHO') || carts[0];
                if (
                  activeCart &&
                  activeCart.id &&
                  activeCart.danhSachGioHang &&
                  activeCart.danhSachGioHang.length > 0
                ) {
                  this.cartId = activeCart.id;
                  this.loadCart();
                } else {
                  console.warn('⚠️ No active cart with items found, falling back to localStorage');
                  this.loadTempCart();
                }
              } else {
                console.warn('⚠️ No carts found in DB, falling back to localStorage');
                this.loadTempCart();
              }

              // Force change detection để cập nhật UI ngay lập tức
              this.cdr.detectChanges();
            },
            error: (error) => {
              console.warn('⚠️ Error loading cart from DB, falling back to localStorage:', error);
              this.loadTempCart();

              // Force change detection
              this.cdr.detectChanges();
            },
          });
        } else {
          // Chưa đăng nhập hoặc không có cartId - load từ localStorage
          console.log('🛒 Loading cart from localStorage (temp_cart)');
          this.loadTempCart();
        }
      }
    });

    // Load customer info nếu đã đăng nhập
    if (isLoggedIn) {
      // Load thông tin khách hàng đầy đủ từ JWT token (sử dụng /api/khach-hang/me)
      // loadCustomerInfo() sẽ tự động load customer addresses
      this.loadCustomerInfo();
    }

    // Generate transaction code
    this.generateTransactionCode();

    // Load danh sách tỉnh/thành phố
    this.loadProvinces();

    // ✅ Gọi refreshVoucherSuggestions ngay cả khi chưa có cart
    // để hiển thị phiếu giảm giá cho user
    setTimeout(() => {
      this.refreshVoucherSuggestions();
    }, 500);
  }

  resolveCustomerId(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      console.log('👤 Guest user, skipping Customer ID resolution');
      return;
    }

    console.log('👤 Resolving Customer ID for User ID:', user.id);
    this.customerService.getCustomerByUserId(user.id).subscribe({
      next: (customer: any) => {
        if (customer) {
          this.realCustomerId = customer.id;
          console.log('✅ Resolved Real Customer ID:', this.realCustomerId, 'for User:', user.username);
          // Trigger refresh to update vouchers with new ID
          this.refreshVoucherSuggestions();
        } else {
          console.warn('⚠️ No Customer record found for User ID:', user.id);
        }
      },
      error: (err) => {
        console.error('❌ Failed to resolve Customer ID:', err);
      }
    });
  }

  /**
   * Load giỏ hàng tạm từ localStorage
   */
  loadTempCart(): void {
    console.log('🛒 loadTempCart - Starting...');
    this.isTempCart = true;
    // Không set isLoading để không block UI
    this.error = ''; // Clear error khi load temp cart

    try {
      const tempCartData = localStorage.getItem('temp_cart');
      console.log(
        '🛒 loadTempCart - tempCartData from localStorage:',
        tempCartData ? 'EXISTS' : 'NOT FOUND'
      );

      if (tempCartData && tempCartData.trim() !== '' && tempCartData !== 'null') {
        const parsed = JSON.parse(tempCartData);
        console.log('🛒 loadTempCart - Parsed tempCart:', parsed);
        console.log('🛒 loadTempCart - Is array:', Array.isArray(parsed));
        console.log('🛒 loadTempCart - Length:', Array.isArray(parsed) ? parsed.length : 'N/A');

        if (Array.isArray(parsed) && parsed.length > 0) {
          this.tempCart = parsed;
          // Tạo HoaDonCho object từ temp cart để tương thích với code hiện tại
          this.cart = {
            id: undefined,
            maHoaDonCho: `TEMP_${Date.now()}`,
            khachHangId: undefined,
            danhSachGioHang: this.tempCart.map((item: any) => ({
              id: undefined,
              chiTietSanPhamId: item.chiTietSanPhamId,
              tenSanPham: item.productName || item.tenSanPham || '',
              soLuong: item.quantity || item.soLuong || 1,
              donGia: item.price || item.donGia || 0,
              giamGia: item.giamGia || 0,
              thanhTien: item.totalItemPrice || item.thanhTien || 0,
            })),
            tongSoLuong: this.tempCart.reduce(
              (sum: number, item: any) => sum + (item.quantity || item.soLuong || 0),
              0
            ),
            tongTien: this.tempCart.reduce(
              (sum: number, item: any) => sum + (item.totalItemPrice || item.thanhTien || 0),
              0
            ),
            tongGiamGia: 0,
            thanhTien: this.tempCart.reduce(
              (sum: number, item: any) => sum + (item.totalItemPrice || item.thanhTien || 0),
              0
            ),
            trangThai: 'DANG_CHO',
          };
          console.log('✅ loadTempCart - Loaded successfully, items:', this.tempCart.length);
          console.log(
            '✅ loadTempCart - cart.danhSachGioHang.length:',
            this.cart.danhSachGioHang?.length || 0
          );

          // ✅ Load thông tin chi tiết sản phẩm (nếu thiếu)
          this.loadMissingProductDetails(this.cart.danhSachGioHang);

          // ✅ Refresh voucher suggestions sau khi cart đã load xong
          setTimeout(() => {
            this.refreshVoucherSuggestions();
          }, 100);

          // Force change detection để hiển thị giỏ hàng ngay lập tức
          this.cdr.detectChanges();
        } else {
          console.warn('⚠️ loadTempCart - tempCart is empty or not an array');
          this.tempCart = [];
          this.cart = null;

          // Force change detection
          this.cdr.detectChanges();
        }
      } else {
        console.warn('⚠️ loadTempCart - No temp_cart in localStorage');
        this.tempCart = [];
        this.cart = null;

        // Force change detection
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error('❌ loadTempCart - Error:', error);
      this.tempCart = [];
      this.cart = null;
      // Không set error để không block UI, chỉ log

      // Force change detection
      this.cdr.detectChanges();
    }
  }

  loadCart(): void {
    if (!this.cartId) {
      // Nếu không có cartId, thử load từ localStorage
      console.warn('⚠️ No cartId, loading from localStorage');
      this.loadTempCart();
      return;
    }

    console.log('🛒 loadCart - Loading cart with ID:', this.cartId);
    // Không set isLoading để không block UI
    this.hoaDonChoService.getHoaDonChoById(this.cartId).subscribe({
      next: (cart) => {
        console.log('🛒 loadCart - Received cart:', cart);
        console.log('🛒 loadCart - cart.danhSachGioHang:', cart?.danhSachGioHang);
        console.log(
          '🛒 loadCart - cart.danhSachGioHang.length:',
          cart?.danhSachGioHang?.length || 0
        );

        if (cart) {
          // QUAN TRỌNG: Kiểm tra cả cart và danhSachGioHang
          if (cart.danhSachGioHang && cart.danhSachGioHang.length > 0) {
            this.cart = cart;
            this.isTempCart = false;
            this.error = '';
            console.log(
              '✅ loadCart - Cart loaded successfully, items:',
              cart.danhSachGioHang.length
            );

            // ✅ Load thông tin chi tiết sản phẩm (nếu thiếu)
            this.loadMissingProductDetails(this.cart.danhSachGioHang);

            // ✅ Refresh voucher suggestions sau khi cart đã load xong
            setTimeout(() => {
              this.refreshVoucherSuggestions();
            }, 100);

            // Force change detection để hiển thị giỏ hàng ngay lập tức
            this.cdr.detectChanges();
          } else {
            // Cart tồn tại nhưng rỗng, thử load từ localStorage
            console.warn('⚠️ Cart exists but is empty, checking localStorage');
            const tempCartData = localStorage.getItem('temp_cart');
            if (tempCartData && tempCartData.trim() !== '' && tempCartData !== 'null') {
              try {
                const tempCart = JSON.parse(tempCartData);
                if (Array.isArray(tempCart) && tempCart.length > 0) {
                  console.log('✅ Found temp_cart with items, using that instead');
                  this.loadTempCart();
                  return;
                }
              } catch (e) {
                console.error('Error parsing temp_cart:', e);
              }
            }
            // Nếu không có tempCart, vẫn dùng cart rỗng nhưng hiển thị message
            this.cart = cart;
            this.isTempCart = false;
            this.error = 'Giỏ hàng của bạn đang trống.';
            console.warn('⚠️ Cart is empty and no tempCart found');

            // Force change detection
            this.cdr.detectChanges();
          }
        } else {
          console.warn('⚠️ Cart is null, falling back to localStorage');
          this.loadTempCart();
        }
      },
      error: (error) => {
        console.error('❌ loadCart - Error:', error);
        console.error('   - Status:', error.status);
        console.error('   - Message:', error.message);

        // Xử lý lỗi một cách graceful
        if (error.status === 0 || error.status === undefined) {
          // Connection refused - fallback to localStorage
          console.warn('⚠️ Backend không khả dụng, sử dụng giỏ hàng tạm');
          this.loadTempCart();
        } else if (error.status === 403 || error.status === 404) {
          // 403 Forbidden hoặc 404 Not Found - fallback to localStorage
          console.warn('⚠️ Cannot access cart (403/404), falling back to localStorage');
          this.loadTempCart();
        } else {
          console.error('Error loading cart:', error);
          // Vẫn thử load từ localStorage
          this.loadTempCart();
        }

        // Force change detection
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Load thông tin chi tiết (màu sắc, kích thước, ảnh) cho các item trong giỏ hàng
   * nếu chúng bị thiếu (đặc biệt là items từ API giỏ hàng chờ)
   */
  loadMissingProductDetails(items: any[] | undefined): void {
    if (!items || items.length === 0) return;

    items.forEach((item) => {
      // Logic kiểm tra xem có cần load không
      // Nếu đã có đủ màu, size, ảnh thì bỏ qua
      if (item.mauSac && item.kichThuoc && (item.imageUrl || item.anhSanPham)) {
        return;
      }

      const id = item.chiTietSanPhamId || item.id;
      if (!id) return;

      this.chiTietSanPhamApiService.getById(id).subscribe({
        next: (detail: any) => {
          if (detail) {
            let updated = false;

            // Update màu
            if (!item.mauSac && detail.mauSacTen) {
              item.mauSac = detail.mauSacTen;
              updated = true;
            }

            // Update size
            if (!item.kichThuoc && detail.kichThuocTen) {
              item.kichThuoc = detail.kichThuocTen;
              updated = true;
            }

            // Update ảnh (ưu tiên ảnh biến thể, fallback ảnh sản phẩm cha)
            if (!item.imageUrl && !item.anhSanPham && detail.anhSanPham) {
              // item.imageUrl là field custom ta dùng
              item.imageUrl = detail.anhSanPham;
              // Cập nhật luôn field anhSanPham nếu có
              item.anhSanPham = detail.anhSanPham;
              updated = true;
            }

            if (updated) {
              console.log(`✅ Loaded details for item ${id}:`, {
                color: item.mauSac,
                size: item.kichThuoc,
                img: item.imageUrl
              });
              this.cdr.detectChanges();
            }
          }
        },
        error: (err) => console.error(`❌ Error loading details for item ${id}`, err)
      });
    });
  }

  /**
   * Load thông tin khách hàng từ JWT token (sử dụng /api/khach-hang/me)
   */
  loadCustomerInfo(): void {
    console.log('👤 Loading current customer info from JWT token...');
    this.customerService.getCurrentCustomer().subscribe({
      next: (customer: any) => {
        console.log('✅ Customer info loaded from /me endpoint:', customer);

        // Map thông tin cá nhân vào billingInfo
        this.billingInfo.email = customer.email || '';
        this.billingInfo.phone = customer.soDienThoai || '';

        // Xử lý tên khách hàng - split thành firstName và lastName
        const tenKhachHang = customer.tenKhachHang || '';
        if (tenKhachHang) {
          const nameParts = tenKhachHang.trim().split(/\s+/);
          if (nameParts.length > 1) {
            // Tách thành họ (phần cuối) và tên (phần đầu)
            this.billingInfo.lastName = nameParts[nameParts.length - 1] || '';
            this.billingInfo.firstName = nameParts.slice(0, -1).join(' ') || '';
          } else {
            // Nếu chỉ có một từ, đặt vào firstName
            this.billingInfo.firstName = nameParts[0] || '';
            this.billingInfo.lastName = '';
          }
        }

        // Map địa chỉ mặc định nếu có
        if (customer.coDiaChiMacDinh && customer.diaChiMacDinh) {
          // Địa chỉ chi tiết
          this.billingInfo.address = customer.diaChiMacDinh || '';

          // Tỉnh/Thành phố - format: Phường/Xã, Quận/Huyện, Tỉnh/Thành phố
          const addressParts: string[] = [];
          if (customer.phuongXaMacDinh) addressParts.push(customer.phuongXaMacDinh);
          if (customer.quanHuyenMacDinh) addressParts.push(customer.quanHuyenMacDinh);
          if (customer.tinhThanhMacDinh) addressParts.push(customer.tinhThanhMacDinh);
          this.billingInfo.city = addressParts.join(', ') || '';

          console.log('✅ Mapped default address to form:', {
            address: this.billingInfo.address,
            city: this.billingInfo.city,
          });
        } else if (customer.diaChi) {
          // Fallback: sử dụng diaChi cũ nếu không có địa chỉ mặc định
          this.billingInfo.address = customer.diaChi || '';
        }

        // Load danh sách địa chỉ của khách hàng
        if (customer.id) {
          this.loadCustomerAddresses(customer.id);
        }

        // Force change detection để cập nhật form ngay lập tức
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error loading customer info from /me:', error);
        console.warn('⚠️ Fallback to auth service data');

        // Fallback to auth service data
        const currentUser = this.authService.getCurrentUser();
        if (currentUser) {
          this.billingInfo.email = currentUser.email || '';
          this.billingInfo.phone =
            (currentUser as any).phone || (currentUser as any).soDienThoai || '';
          const userName =
            currentUser.fullName ||
            (currentUser as any).name ||
            (currentUser as any).tenKhachHang ||
            '';
          if (userName) {
            const nameParts = userName.trim().split(/\s+/);
            if (nameParts.length > 1) {
              this.billingInfo.lastName = nameParts[nameParts.length - 1] || '';
              this.billingInfo.firstName = nameParts.slice(0, -1).join(' ') || '';
            } else {
              this.billingInfo.firstName = nameParts[0] || '';
              this.billingInfo.lastName = '';
            }
          }
        }

        // Force change detection
        this.cdr.detectChanges();
      },
    });
  }

  loadCustomerAddresses(customerId?: number): void {
    // Nếu không có customerId, thử lấy từ currentUser
    if (!customerId) {
      const currentUser = this.authService.getCurrentUser();
      if (currentUser?.id) {
        customerId = currentUser.id;
      } else {
        console.warn('⚠️ Cannot load customer addresses: no customerId');
        return;
      }
    }

    console.log('📍 Loading customer addresses for customerId:', customerId);
    this.customerAddressService.getAddressesByCustomerId(customerId).subscribe({
      next: (addresses) => {
        console.log('✅ Customer addresses loaded:', addresses);
        this.customerAddresses = addresses;

        // Tự động chọn địa chỉ mặc định nếu có
        // Chỉ chọn nếu chưa có địa chỉ nào được chọn trong form
        if (!this.selectedAddressId && addresses.length > 0) {
          const defaultAddress = addresses.find((a) => a.macDinh === true);
          if (defaultAddress && defaultAddress.id) {
            console.log('📍 Auto-selecting default address:', defaultAddress.id);
            this.selectedAddressId = defaultAddress.id;
            this.loadAddressInfo(defaultAddress);
          } else if (addresses.length > 0) {
            // Nếu không có địa chỉ mặc định, chọn địa chỉ đầu tiên
            console.log('📍 Auto-selecting first address:', addresses[0].id);
            this.selectedAddressId = addresses[0].id || null;
            this.loadAddressInfo(addresses[0]);
          }
        }

        // Force change detection để cập nhật địa chỉ ngay lập tức
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error loading addresses:', error);

        // Force change detection
        this.cdr.detectChanges();
      },
    });
  }

  loadAddressInfo(address: any): void {
    console.log('📍 Loading address info into form:', address);

    // Backend trả về diaChiChiTiet, frontend interface dùng diaChi
    this.billingInfo.address = address.diaChi || address.diaChiChiTiet || '';

    // Format địa chỉ: Phường/Xã, Quận/Huyện, Tỉnh/Thành phố
    const addressParts: string[] = [];
    if (address.phuongXa) addressParts.push(address.phuongXa);
    if (address.quanHuyen) addressParts.push(address.quanHuyen);
    if (address.tinhThanh) addressParts.push(address.tinhThanh);
    this.billingInfo.city = addressParts.join(', ') || '';

    // Tìm và set dropdown values từ tên địa chỉ
    if (address.tinhThanh && this.provinces.length > 0) {
      const province = this.provinces.find(p => p.name === address.tinhThanh);
      if (province) {
        this.selectedProvinceCode = province.code;
        this.loadDistrictsByProvince(province.code);

        // Đợi districts load xong rồi mới set district
        setTimeout(() => {
          if (address.quanHuyen && this.districts.length > 0) {
            const district = this.districts.find(d => d.name === address.quanHuyen);
            if (district) {
              this.selectedDistrictCode = district.code;
              this.loadWardsByDistrict(district.code);

              // Đợi wards load xong rồi mới set ward và tính phí ship
              setTimeout(() => {
                if (address.phuongXa && this.wards.length > 0) {
                  const ward = this.wards.find(w => w.name === address.phuongXa);
                  if (ward) {
                    this.selectedWardCode = ward.code;
                  }
                }

                // Tính phí ship sau khi đã set xong tất cả dropdown values
                console.log('🔄 Calculating shipping fee after loading address dropdowns...');
                this.calculateShippingFeeAuto();
                this.cdr.detectChanges();
              }, 500);
            } else {
              // Nếu không tìm thấy district, vẫn tính phí ship với thông tin có
              console.log('⚠️ District not found, calculating shipping fee with available info...');
              this.calculateShippingFeeAuto();
              this.cdr.detectChanges();
            }
          } else {
            // Nếu không có district, vẫn tính phí ship với thông tin có
            console.log('⚠️ No district info, calculating shipping fee with available info...');
            this.calculateShippingFeeAuto();
            this.cdr.detectChanges();
          }
        }, 500);
      } else {
        // Nếu không tìm thấy province, vẫn tính phí ship với thông tin có
        console.log('⚠️ Province not found, calculating shipping fee with available info...');
        this.calculateShippingFeeAuto();
        this.cdr.detectChanges();
      }
    } else {
      // Nếu không có provinces hoặc không có tinhThanh, vẫn tính phí ship với thông tin có
      console.log('⚠️ No province info or provinces not loaded, calculating shipping fee with available info...');
      this.calculateShippingFeeAuto();
      this.cdr.detectChanges();
    }

    // Số điện thoại từ địa chỉ (nếu có) hoặc giữ nguyên từ customer info
    if (address.soDienThoai) {
      this.billingInfo.phone = address.soDienThoai;
    }

    // Tên người nhận từ địa chỉ - split thành firstName và lastName
    if (address.tenNguoiNhan) {
      const nameParts = address.tenNguoiNhan.trim().split(/\s+/);
      if (nameParts.length > 1) {
        this.billingInfo.lastName = nameParts[nameParts.length - 1] || '';
        this.billingInfo.firstName = nameParts.slice(0, -1).join(' ') || '';
      } else {
        this.billingInfo.firstName = nameParts[0] || '';
        this.billingInfo.lastName = '';
      }
    }

    console.log('✅ Address info loaded into form:', {
      address: this.billingInfo.address,
      city: this.billingInfo.city,
      phone: this.billingInfo.phone,
      firstName: this.billingInfo.firstName,
      lastName: this.billingInfo.lastName,
      selectedProvinceCode: this.selectedProvinceCode,
      selectedDistrictCode: this.selectedDistrictCode,
      selectedWardCode: this.selectedWardCode,
    });

    // Force change detection để cập nhật form ngay lập tức
    this.cdr.detectChanges();
  }

  onAddressChange(): void {
    if (this.selectedAddressId) {
      const address = this.customerAddresses.find((a) => a.id === this.selectedAddressId);
      if (address) {
        this.loadAddressInfo(address);
        // Tự động tính phí ship khi địa chỉ thay đổi
        this.calculateShippingFeeAuto();
      }
    } else {
      // Nếu không chọn địa chỉ, tính phí ship từ thông tin form hiện tại
      this.calculateShippingFeeAuto();
    }

    // Force change detection để cập nhật form ngay lập tức
    this.cdr.detectChanges();
  }

  toggleAddAddressForm(): void {
    this.showAddAddressForm = !this.showAddAddressForm;
    if (this.showAddAddressForm) {
      // Reset form
      this.newAddress = {
        tenNguoiNhan: `${this.billingInfo.firstName} ${this.billingInfo.lastName}`.trim(),
        soDienThoai: this.billingInfo.phone,
        diaChiChiTiet: this.billingInfo.address,
        phuongXa: this.billingInfo.city.split(',')[0]?.trim() || '',
        quanHuyen:
          this.billingInfo.city.split(',').length > 1
            ? this.billingInfo.city.split(',')[1]?.trim()
            : '',
        tinhThanh:
          this.billingInfo.city.split(',').length > 2
            ? this.billingInfo.city.split(',')[2]?.trim()
            : this.billingInfo.city,
        macDinh: false,
      };
    }

    // Force change detection để cập nhật UI ngay lập tức
    this.cdr.detectChanges();
  }

  saveNewAddress(): void {
    if (
      !this.newAddress.tenNguoiNhan ||
      !this.newAddress.soDienThoai ||
      !this.newAddress.diaChiChiTiet ||
      !this.newAddress.tinhThanh
    ) {
      this.notificationService.warning('Vui lòng nhập đầy đủ thông tin địa chỉ!');
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.notificationService.warning('Bạn cần đăng nhập để lưu địa chỉ!');
      return;
    }

    const addressData = {
      khachHangId: currentUser.id,
      tenNguoiNhan: this.newAddress.tenNguoiNhan,
      soDienThoai: this.newAddress.soDienThoai,
      diaChi: this.newAddress.diaChiChiTiet, // Map diaChiChiTiet -> diaChi
      phuongXa: this.newAddress.phuongXa,
      quanHuyen: this.newAddress.quanHuyen,
      tinhThanh: this.newAddress.tinhThanh,
      macDinh: this.newAddress.macDinh,
    };

    this.customerAddressService.createAddress(addressData).subscribe({
      next: (newAddress) => {
        // Reload addresses
        this.loadCustomerAddresses();
        // Select new address
        this.selectedAddressId = newAddress.id || null;
        this.loadAddressInfo(newAddress);
        // Update billing info
        this.billingInfo.address = newAddress.diaChi;
        this.billingInfo.city =
          `${newAddress.phuongXa}, ${newAddress.quanHuyen}, ${newAddress.tinhThanh}`.trim();
        this.billingInfo.phone = newAddress.soDienThoai;
        this.billingInfo.firstName = newAddress.tenNguoiNhan.split(' ')[0] || '';
        this.billingInfo.lastName = newAddress.tenNguoiNhan.split(' ').slice(1).join(' ') || '';
        // Hide form
        this.showAddAddressForm = false;
        // Tự động tính phí ship khi lưu địa chỉ mới
        this.calculateShippingFeeAuto();

        // Force change detection để cập nhật UI ngay lập tức
        this.cdr.detectChanges();
        this.notificationService.success('Đã lưu địa chỉ thành công!');
      },
      error: (error) => {
        console.error('Error saving address:', error);

        // Force change detection
        this.cdr.detectChanges();
        this.notificationService.error('Không thể lưu địa chỉ. Vui lòng thử lại!');
      },
    });
  }

  showOrderConfirmationScreen(): void {
    if (!this.validateForm()) {
      return;
    }

    // Lấy danh sách sản phẩm từ cart hoặc tempCart
    let products: any[] = [];
    if (this.isTempCart && this.tempCart && this.tempCart.length > 0) {
      products = this.tempCart.map((item: any) => ({
        chiTietSanPhamId: item.chiTietSanPhamId,
        tenSanPham: item.productName || '',
        soLuong: item.quantity || 1,
        donGia: item.price || 0,
        giamGia: 0,
        thanhTien: item.totalItemPrice || item.price * (item.quantity || 1),
        mauSac: item.mauSac || '',
        kichThuoc: item.kichThuoc || '',
        anhSanPham: item.imageUrl || '',
        maSanPham: item.maSanPham || '',
      }));
    } else {
      products = (this.cart?.danhSachGioHang || []).map((item: any) => ({
        ...item,
        mauSac: item.mauSac || '',
        kichThuoc: item.kichThuoc || '',
        // Ưu tiên imageUrl (đã fetch thêm) -> anhSanPham -> placeholder
        anhSanPham: item.imageUrl || item.anhSanPham || '',
        maSanPham: item.maSanPham || '',
      }));
    }

    // Lấy thông tin địa chỉ đầy đủ
    const provinceName = this.selectedProvinceCode
      ? (this.provinces.find(p => p.code === this.selectedProvinceCode)?.name || '')
      : '';
    const districtName = this.selectedDistrictCode
      ? (this.districts.find(d => d.code === this.selectedDistrictCode)?.name || '')
      : '';
    const wardName = this.selectedWardCode
      ? (this.wards.find(w => w.code === this.selectedWardCode)?.name || '')
      : '';
    const fullAddress = [
      this.billingInfo.address,
      wardName,
      districtName,
      provinceName
    ].filter(Boolean).join(', ');

    // Tạo order summary với đầy đủ thông tin
    this.orderSummary = {
      products: products,
      billingInfo: {
        ...this.billingInfo,
        fullAddress: fullAddress,
        province: provinceName,
        district: districtName,
        ward: wardName,
        addressDetail: this.billingInfo.address
      },
      paymentMethod: this.paymentMethod,
      transactionCode: this.transactionCode,
      bankInfo: { ...this.bankInfo },
      subtotal: this.getSubtotal(),
      discount: this.getDiscount(),
      couponDiscount: this.couponDiscount,
      appliedCoupons: this.appliedCoupon ? [{ ...this.appliedCoupon, discountAmount: this.couponDiscount }] : [],
      shippingFee: this.shippingFee,
      total: this.getTotal(),
      orderNotes: this.orderNotes,
    };

    this.showOrderConfirmation = true;
  }

  cancelOrderConfirmation(): void {
    this.showOrderConfirmation = false;
    this.orderSummary = null;
  }

  confirmAndPlaceOrder(): void {
    this.showOrderConfirmation = false;
    this.placeOrder();
  }

  /**
   * Đóng chi tiết hoá đơn và chuyển hướng
   */
  closeInvoiceDetails(): void {
    this.showInvoiceDetails = false;

    // Chuyển về trang chủ sau khi đóng modal
    this.router.navigate(['/shop']);

    // Force change detection để cập nhật UI ngay lập tức
    this.cdr.detectChanges();
  }

  /**
   * Format trạng thái đơn hàng
   */
  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      CHO_XAC_NHAN: 'Chờ xác nhận',
      DA_XAC_NHAN: 'Đã xác nhận',
      DANG_GIAO: 'Đang giao',
      DA_GIAO: 'Đã giao',
      DA_HUY: 'Đã hủy',
      HOAN_TRA: 'Hoàn trả',
    };
    return statusMap[status] || status;
  }

  /**
   * Format phương thức thanh toán
   */
  getPaymentMethodText(method: string): string {
    const methodMap: { [key: string]: string } = {
      cash: 'Tiền mặt',
      transfer: 'Chuyển khoản',
      vnpay: 'VNPay',
      zalopay: 'ZaloPay',
      momo: 'MoMo',
    };
    return methodMap[method] || method;
  }

  generateTransactionCode(): void {
    // Tạo mã giao dịch tự động: TDK + timestamp + random 3 số
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    this.transactionCode = `TDK${timestamp}${random}`;

    // Force change detection để cập nhật UI ngay lập tức
    this.cdr.detectChanges();
  }

  /**
   * Kiểm tra xem có sản phẩm trong giỏ hàng không
   */
  hasCartItems(): boolean {
    // Kiểm tra cart từ DB
    if (this.cart && this.cart.danhSachGioHang && this.cart.danhSachGioHang.length > 0) {
      return true;
    }
    // Kiểm tra tempCart từ localStorage
    if (
      this.isTempCart &&
      this.tempCart &&
      Array.isArray(this.tempCart) &&
      this.tempCart.length > 0
    ) {
      return true;
    }
    return false;
  }

  getOrderItems(): {
    code?: string;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[] {
    const sourceItems = this.isTempCart
      ? Array.isArray(this.tempCart)
        ? this.tempCart
        : []
      : this.cart?.danhSachGioHang ?? [];

    return sourceItems.map((item: any) => {
      const name = this.isTempCart ? item.productName || 'Sản phẩm' : item.tenSanPham || 'Sản phẩm';
      const quantity = this.isTempCart ? item.quantity || 0 : item.soLuong || 0;
      const unitPrice = this.isTempCart ? item.price || 0 : item.donGia || 0;
      const total = this.isTempCart
        ? item.totalItemPrice || unitPrice * quantity
        : item.thanhTien ?? unitPrice * quantity - (item.giamGia || 0);
      const code = item.maSanPham || item.maChiTiet || item.chiTietSanPhamId;

      return {
        code,
        name,
        quantity,
        unitPrice,
        total,
      };
    });
  }

  validateForm(): boolean {
    // Validate họ và tên
    if (!this.billingInfo.firstName || !this.billingInfo.lastName) {
      this.notificationService.warning('Vui lòng nhập đầy đủ họ và tên!');
      return false;
    }

    // Validate địa chỉ
    if (!this.billingInfo.address || this.billingInfo.address.trim() === '') {
      this.notificationService.warning('Vui lòng nhập địa chỉ chi tiết!');
      return false;
    }

    // Validate tỉnh/thành phố
    if (!this.billingInfo.city || this.billingInfo.city.trim() === '') {
      this.notificationService.warning('Vui lòng nhập tỉnh/thành phố!');
      return false;
    }

    // Validate số điện thoại
    if (!this.billingInfo.phone || this.billingInfo.phone.trim() === '') {
      this.notificationService.warning('Vui lòng nhập số điện thoại!');
      return false;
    }

    // Validate format số điện thoại (10-11 số)
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(this.billingInfo.phone.replace(/\s+/g, ''))) {
      this.notificationService.warning('Số điện thoại không hợp lệ! Vui lòng nhập 10-11 chữ số.');
      return false;
    }

    // Validate email
    if (!this.billingInfo.email || this.billingInfo.email.trim() === '') {
      this.notificationService.warning('Vui lòng nhập email!');
      return false;
    }

    // Validate format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.billingInfo.email)) {
      this.notificationService.warning('Email không hợp lệ! Vui lòng nhập email đúng định dạng.');
      return false;
    }

    // Kiểm tra giỏ hàng từ cart hoặc tempCart
    const hasCartItems =
      (this.cart && this.cart.danhSachGioHang && this.cart.danhSachGioHang.length > 0) ||
      (this.isTempCart && this.tempCart && this.tempCart.length > 0);
    if (!hasCartItems) {
      this.notificationService.warning('Giỏ hàng của bạn đang trống!');
      return false;
    }

    // Validate mã giao dịch nếu thanh toán bằng chuyển khoản
    if (
      this.paymentMethod === 'transfer' &&
      (!this.transactionCode || this.transactionCode === '')
    ) {
      this.notificationService.warning('Vui lòng tạo mã giao dịch!');
      return false;
    }

    return true;
  }

  /**
   * Lưu hoặc cập nhật địa chỉ khách hàng vào DB
   */
  saveOrUpdateCustomerAddress(): Promise<boolean> {
    return new Promise((resolve) => {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser?.id) {
        // Nếu chưa đăng nhập, không cần lưu địa chỉ
        resolve(true);
        return;
      }

      // Kiểm tra xem địa chỉ hiện tại đã tồn tại chưa
      const addressMatches = this.customerAddresses.find(
        (addr) =>
          addr.diaChiChiTiet === this.billingInfo.address &&
          addr.tinhThanh ===
          (this.billingInfo.city.split(',').length > 2
            ? this.billingInfo.city.split(',')[2]?.trim()
            : this.billingInfo.city) &&
          addr.quanHuyen ===
          (this.billingInfo.city.split(',').length > 1
            ? this.billingInfo.city.split(',')[1]?.trim()
            : '') &&
          addr.phuongXa === (this.billingInfo.city.split(',')[0]?.trim() || '')
      );

      if (addressMatches) {
        // Địa chỉ đã tồn tại, không cần lưu lại
        console.log('📍 Address already exists, skipping save');
        resolve(true);
        return;
      }

      // Tạo địa chỉ mới
      const addressData = {
        khachHangId: currentUser.id,
        tenNguoiNhan: `${this.billingInfo.firstName} ${this.billingInfo.lastName}`.trim(),
        soDienThoai: this.billingInfo.phone,
        diaChi: this.billingInfo.address,
        phuongXa: this.billingInfo.city.split(',')[0]?.trim() || '',
        quanHuyen:
          this.billingInfo.city.split(',').length > 1
            ? this.billingInfo.city.split(',')[1]?.trim()
            : '',
        tinhThanh:
          this.billingInfo.city.split(',').length > 2
            ? this.billingInfo.city.split(',')[2]?.trim()
            : this.billingInfo.city,
        macDinh: this.customerAddresses.length === 0, // Đặt làm mặc định nếu đây là địa chỉ đầu tiên
        trangThai: true,
      };

      console.log('📍 Saving customer address:', addressData);
      this.customerAddressService.createAddress(addressData).subscribe({
        next: (newAddress) => {
          console.log('✅ Address saved successfully:', newAddress);
          // Reload addresses để cập nhật danh sách
          this.loadCustomerAddresses();
          resolve(true);
        },
        error: (error) => {
          console.error('❌ Error saving address:', error);
          // Không block flow nếu lưu địa chỉ thất bại
          resolve(true);
        },
      });
    });
  }

  /**
   * Chuẩn bị đặt hàng - hiển thị modal xác nhận
   */
  prepareOrder(): void {
    // Validate form trước khi đặt hàng
    if (!this.validateForm()) {
      return;
    }

    // Check if cart empty
    if (!this.hasCartItems() && !this.isPaymentVerified) {
      this.notificationService.warning('Giỏ hàng trống!');
      return;
    }

    this.showOrderConfirmationScreen();
  }

  async placeOrder(): Promise<void> {

    // 1. Kiểm tra giỏ hàng
    if (!this.hasCartItems() && !this.isPaymentVerified) {
      this.notificationService.warning('Giỏ hàng trống!');
      return;
    }

    // Nếu thanh toán đã được xác thực (từ simulation), bỏ qua logic payment gateway và tạo đơn ngay
    if (this.isPaymentVerified) {
      console.log('✅ Payment verified externally. Proceeding to create order directly.');
      // Lấy pending order từ localStorage
      let pendingKey = '';
      if (this.paymentMethod === 'zalopay') pendingKey = 'pending_zalopay_order';
      else if (this.paymentMethod === 'momo') pendingKey = 'pending_momo_order';

      const pendingOrderStr = localStorage.getItem(pendingKey);
      if (pendingOrderStr) {
        try {
          const hoaDonData = JSON.parse(pendingOrderStr);

          // Update payment status fields for verified online payments
          hoaDonData.ngayThanhToan = new Date().toISOString();
          // We don't change order status 'trangThai' from 'CHO_XAC_NHAN' as admin still needs to confirm/ship

          console.log('✅ Finalizing verified order with payment date:', hoaDonData.ngayThanhToan);

          // Loading state
          this.isSubmitting = true;

          // Gọi service tạo hóa đơn
          this.hoaDonService.createHoaDon(hoaDonData).subscribe({
            next: (response) => {
              this.notificationService.success('Đặt hàng thành công!');

              // Clear storage
              localStorage.removeItem(pendingKey);
              localStorage.removeItem('pending_vnpay_cart_id');
              localStorage.removeItem('temp_cart');
              window.dispatchEvent(new Event('cartUpdated'));

              // Chuyển hướng tới trang chi tiết đơn hàng
              this.router.navigate(['/customer/orders'], { queryParams: { newOrderId: response.id } });
            },
            error: (err) => {
              console.error('Create order error:', err);
              this.notificationService.error('Lỗi khi tạo đơn hàng: ' + (err.error?.message || err.message));
              this.isSubmitting = false;
            }
          });
          return;
        } catch (e) {
          console.error('Error parsing pending order', e);
          this.notificationService.error('Lỗi dữ liệu đơn hàng đã lưu.');
        }
      }
    }

    // Xử lý theo phương thức thanh toán
    if (this.paymentMethod === 'vnpay') {
      this.payWithVNPay();
    } else if (this.paymentMethod === 'zalopay') {
      this.payWithZaloPay();
    } else if (this.paymentMethod === 'momo') {
      this.payWithMoMo();
    } else {
      // Các phương thức khác (Tiền mặt, CK) - Thực hiện việc tạo đơn hàng (đã được confirm qua modal)
      const currentUser = this.authService.getCurrentUser();

      this.isSubmitting = true;
      this.saveOrUpdateCustomerAddress().then(() => {
        this.createInvoice(currentUser);
      }).catch(err => {
        this.isSubmitting = false;
        console.error("Error saving address:", err);
      });
    }
  }

  /**
   * Xử lý khi thay đổi phương thức thanh toán
   * Tự động sinh mã giao dịch/đơn hàng tạm tương ứng với format của cổng thanh toán
   */
  onPaymentMethodChange(): void {
    console.log('💳 Payment method changed to:', this.paymentMethod);

    let newCode = '';
    const now = new Date();

    if (this.paymentMethod === 'zalopay' || this.paymentMethod === 'momo') {
      // Format cho ZaloPay/MoMo: YYMMDD_Random (để ngắn gọn và đúng chuẩn ZaloPay)
      // ZaloPay yêu cầu app_trans_id format: yymmdd_xxxx
      const dateStr = now.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
      const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      newCode = `${dateStr}_${random}`;
    } else {
      // Format cho VNPay, Chuyển khoản, Tiền mặt: TDK + Timestamp
      const timestamp = Date.now().toString().slice(-8);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      newCode = `TDK${timestamp}${random}`;
    }

    // Cập nhật mã giao dịch hiển thị
    this.transactionCode = newCode;

    // Cập nhật vào giỏ hàng/đơn tạm nếu có
    if (this.cart) {
      this.cart.maHoaDonCho = newCode;
      console.log('✅ Updated temp order code:', this.cart.maHoaDonCho);
    } else if (this.isTempCart && this.tempCart) {
      // Nếu đang dùng temp cart array
      // Lưu tạm mã này vào biến local để dùng khi tạo đơn
      console.log('✅ Generated temp code for local cart:', newCode);
    }

    this.cdr.detectChanges();
  }

  /**
   * Xử lý khi thanh toán đã được xác thực (từ Simulation hoặc Real Gateway check)
   */
  handlePaymentVerified(method: string): void {
    this.isPaymentVerified = true;
    if (method) {
      this.paymentMethod = method as any;
    }

    // Clean up URL params ngay lập tức để tránh double submit
    this.router.navigate([], {
      queryParams: {
        paymentVerified: null,
        method: null,
        orderId: null,
        status: null,
        apptransid: null,
        resultCode: null,
        message: null
      },
      queryParamsHandling: 'merge'
    });

    this.notificationService.success('Thanh toán thành công. Đang tạo đơn hàng...');

    // Tự động tạo đơn hàng luôn, không cần user bấm xác nhận nữa
    // Setup timeout nhỏ để đảm bảo UI update
    setTimeout(() => {
      this.placeOrder();
    }, 500);
  }

  /**
   * Xử lý callback từ VNPay tại trang Checkout
   */
  handleVNPayCallback(responseCode: string, params: any): void {
    console.log('🔄 Handling VNPay callback at Checkout, code:', responseCode);

    // Clean URL
    this.router.navigate([], {
      queryParams: {},
      replaceUrl: true
    });

    if (responseCode === '00') {
      // Success
      console.log('✅ VNPay Payment Success');
      this.paymentMethod = 'vnpay'; // Reset method selection

      const pendingOrderDataStr = localStorage.getItem('pending_vnpay_order');
      if (pendingOrderDataStr) {
        try {
          const hoaDonData = JSON.parse(pendingOrderDataStr);
          const txnRef = params['vnp_TxnRef'];

          // Update note
          hoaDonData.ghiChu = `${hoaDonData.ghiChu || ''} - GD Thành công (TxnRef: ${txnRef})`;

          this.isSubmitting = true;
          this.notificationService.info('Đang tạo đơn hàng...');

          // Call API directly like handlePaymentVerified -> placeOrder logic but using preserved data
          this.hoaDonService.createHoaDon(hoaDonData).subscribe({
            next: (hoaDon) => {
              console.log('✅ Order created successfully:', hoaDon.id);
              this.notificationService.success('Thanh toán thành công! Đơn hàng đã được tạo.');

              // Cleanup
              localStorage.removeItem('pending_vnpay_order');
              const cartIdStr = localStorage.getItem('pending_vnpay_cart_id');
              if (cartIdStr) {
                const cartId = parseInt(cartIdStr);
                this.hoaDonChoService.deleteHoaDonCho(cartId).subscribe(() => {
                  window.dispatchEvent(new Event('cartUpdated'));
                });
              }
              localStorage.removeItem('temp_cart');
              window.dispatchEvent(new Event('cartUpdated'));

              // Redirect to order detail / lookup
              this.isSubmitting = false;
              if (!this.authService.isLoggedIn()) {
                this.router.navigate(['/customer/orders'], { queryParams: { orderPlaced: 'true' } });
              } else {
                this.router.navigate(['/customer/orders'], { queryParams: { newOrderId: hoaDon.id } });
              }
            },
            error: (err) => {
              console.error('❌ Error creating order after VNPAY payment:', err);
              this.notificationService.error('Lỗi khi tạo đơn hàng. Vui lòng liên hệ hỗ trợ!');
              this.isSubmitting = false;
            }
          });

        } catch (e) {
          console.error('Error parsing pending order data:', e);
          this.notificationService.error('Lỗi dữ liệu đơn hàng!');
        }
      } else {
        this.notificationService.warning('Không tìm thấy thông tin đơn hàng chờ thanh toán.');
      }
    } else {
      // Failed
      console.log('❌ VNPay Payment Failed or Cancelled');
      this.notificationService.error('Thanh toán không thành công hoặc đã bị hủy.');
    }
  }

  payWithVNPay(): void {
    if (!this.hasCartItems()) {
      this.notificationService.warning('Giỏ hàng trống!');
      return;
    }

    this.isSubmitting = true;
    this.showOrderConfirmation = false;

    // 1. Calculate amount and txnRef
    const amount = Math.round(this.getTotal());
    const txnRef = this.cart?.maHoaDonCho || this.transactionCode || `TDK_${Date.now()}`;
    const orderInfo = `Thanh toan don hang ${txnRef}`;

    // 2. Save pending order
    this.savePendingOrderToStorage('vnpay', txnRef);

    this.notificationService.info('Đang chuyển hướng sang cổng thanh toán VNPay...');

    // 3. Prepare VNPAY Parameters
    const createDate = this.formatDateForVNPay(new Date());
    const vnpParams: any = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.vnpayInfo.tmnCode,
      vnp_Amount: (amount * 100).toString(), // Multiplied by 100
      vnp_CurrCode: 'VND',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: window.location.origin + '/shop/checkout',
      vnp_IpAddr: '127.0.0.1', // Hardcoded as per user instruction for testing
      vnp_CreateDate: createDate,
    };

    // 4. Generate URL with Signature
    try {
      // Sort parameters (returns object with keys and values ALREADY ENCODED)
      const sortedParams = this.sortObject(vnpParams);

      // Create sign data string (key=value&key=value...)
      // Note: keys and values in sortedParams are already encoded
      const signData = Object.keys(sortedParams)
        .map(key => `${key}=${sortedParams[key]}`)
        .join('&');

      // Create Secure Hash using HMAC SHA512 with CryptoJS
      const secureHash = CryptoJS.HmacSHA512(signData, this.vnpayInfo.hashSecret).toString(CryptoJS.enc.Hex);

      // Add SecureHash to params (no need to encode again, it's hex string)
      // Re-construct query string for URL. 
      // Important: sortObject returned encoded keys/values.
      const queryString = Object.keys(sortedParams)
        .map(key => `${key}=${sortedParams[key]}`)
        .join('&');

      const finalUrl = `${this.vnpayInfo.testUrl}?${queryString}&vnp_SecureHash=${secureHash}`;

      console.log('✅ VNPay URL:', finalUrl);

      // Redirect
      // Delay slightly to allow notification to show
      setTimeout(() => {
        window.location.href = finalUrl;
        this.isSubmitting = false;
      }, 1000);

    } catch (e) {
      console.error('Error generating VNPay URL:', e);
      this.notificationService.error('Có lỗi khi tạo link thanh toán VNPay: ' + e);
      this.isSubmitting = false;
    }
  }

  async payWithZaloPay(): Promise<void> {
    if (!this.hasCartItems()) {
      this.notificationService.warning('Giỏ hàng trống!');
      return;
    }

    this.isSubmitting = true;
    this.showOrderConfirmation = false;

    // 1. Chuẩn bị dữ liệu
    // Sử dụng mã đã sinh ra khi chọn phương thức thanh toán (maHoaDonCho)
    // Nếu không có thì mới sinh mới (fallback)
    let appTransID = this.cart?.maHoaDonCho;

    // Validate format ZaloPay (YYMMDD_xxxx)
    const datePrefix = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    if (!appTransID || !appTransID.startsWith(datePrefix)) {
      const transID = Math.floor(Math.random() * 1000000);
      appTransID = `${datePrefix}_${transID}`;
    }

    const amount = Math.round(this.getTotal());
    const appTime = Date.now();
    const appUser = "DemoUser";

    // Embed data contains redirecturl
    const embedData = {
      redirecturl: window.location.origin + '/shop/checkout'
    };

    const items = [{}]; // Demo item

    // 2. Tạo MAC
    // app_id|app_trans_id|app_user|amount|app_time|embed_data|item
    const dataObj = {
      app_id: this.zalopayInfo.appId,
      app_user: appUser,
      app_time: appTime,
      amount: amount,
      app_trans_id: appTransID,
      embed_data: JSON.stringify(embedData),
      item: JSON.stringify(items),
      description: `Thanh toan don hang #${appTransID}`,
      bank_code: ""
    };

    const dataStr = `${dataObj.app_id}|${dataObj.app_trans_id}|${dataObj.app_user}|${dataObj.amount}|${dataObj.app_time}|${dataObj.embed_data}|${dataObj.item}`;
    const mac = await this.hmacSHA256(this.zalopayInfo.key1, dataStr);

    // Save pending order
    this.savePendingOrderToStorage('zalopay', appTransID);

    this.notificationService.info('Đang kết nối tới ZaloPay...');

    // 3. Gọi API (Lưu ý: Thường sẽ bị CORS nếu gọi từ trình duyệt, nên ta sẽ có fallback)
    try {
      const response = await fetch(this.zalopayInfo.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...dataObj,
          mac: mac
        })
      });

      const result = await response.json();

      if (result.return_code === 1) {
        console.log('✅ ZaloPay Order Created:', result);
        window.location.href = result.order_url;
      } else {
        console.error('❌ ZaloPay Error:', result);
        this.notificationService.error('Lỗi tạo đơn hàng ZaloPay: ' + result.return_message);
        this.isSubmitting = false;
      }
    } catch (error) {
      console.warn('⚠️ CORS blocked or API error. Switching to Simulation Mode.', error);

      // Fallback: Mở trang giả lập (vì Sandbox ZaloPay chặn CORS request từ frontend)
      this.notificationService.info('Đang chuyển hướng sang cổng thanh toán ZaloPay (Mô phỏng)...');

      setTimeout(() => {
        this.openSimulatedZaloPayGateway(amount, appTransID);
      }, 1000);
    }
  }

  /**
   * Mở giao diện giả lập cổng thanh toán ZaloPay
   * (Dùng document.write để giả lập việc chuyển hướng sang trang khác)
   */
  openSimulatedZaloPayGateway(amount: number, appTransID: string) {
    const origin = window.location.origin;
    const formattedAmount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Thanh toán ZaloPay (Mô phỏng)</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f2f5; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
          .payment-card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 100%; max-width: 400px; text-align: center; }
          .logo { height: 50px; margin-bottom: 20px; }
          .merchant { color: #666; font-size: 0.9rem; margin-bottom: 5px; }
          .amount { font-size: 2rem; font-weight: bold; color: #0068ff; margin-bottom: 20px; }
          .info { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 25px; text-align: left; font-size: 0.9rem; }
          .info div { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .btn { display: block; width: 100%; padding: 12px; border: none; border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s; margin-bottom: 10px; }
          .btn-pay { background-color: #0068ff; color: white; }
          .btn-pay:hover { background-color: #0056d6; }
          .btn-cancel { background-color: #e4e6eb; color: #333; }
          .btn-cancel:hover { background-color: #d8dadf; }
          .sandbox-badge { display: inline-block; background: #ff9800; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="payment-card">
          <div class="sandbox-badge">SANDBOX SIMULATION</div>
          <br>
          <img src="https://cdn.haitrieu.com/wp-content/uploads/2022/10/Logo-ZaloPay-Square.png" alt="ZaloPay" class="logo">
          <div class="merchant">Đơn vị chấp nhận thanh toán</div>
          <h3>Cửa hàng Mũ Bảo Hiểm</h3>
          <div class="amount">${formattedAmount}</div>

          <div class="info">
            <div><span>Mã đơn hàng:</span> <strong>${appTransID}</strong></div>
            <div><span>Nội dung:</span> <span>Thanh toán đơn hàng</span></div>
            <div style="border-top: 1px dashed #ccc; margin-top: 8px; padding-top: 8px;">
               <i>Đây là màn hình giả lập vì Sandbox API chặn gọi trực tiếp từ trình duyệt.</i>
            </div>
          </div>

          <button class="btn btn-pay" onclick="confirmPayment()">Xác nhận thanh toán</button>
          <button class="btn btn-cancel" onclick="cancelPayment()">Hủy giao dịch</button>
        </div>

        <script>
          function confirmPayment() {
            document.querySelector('.btn-pay').innerText = 'Đang xử lý...';
            setTimeout(() => {
              window.location.href = '${origin}/shop/checkout?paymentVerified=true&method=zalopay&orderId=${appTransID}';
            }, 1000);
          }
          function cancelPayment() {
             window.location.href = '${origin}/shop/checkout?paymentCancelled=true';
          }
        </script>
      </body>
      </html>
    `;

    document.open();
    document.write(htmlContent);
    document.close();
  }

  async payWithMoMo(): Promise<void> {
    if (!this.hasCartItems()) {
      this.notificationService.warning('Giỏ hàng trống!');
      return;
    }

    this.isSubmitting = true;
    this.showOrderConfirmation = false;

    // 1. Chuẩn bị dữ liệu
    // Sử dụng mã đã sinh ra khi chọn phương thức thanh toán (maHoaDonCho)
    let orderId = this.cart?.maHoaDonCho;

    // Validate if empty
    if (!orderId) {
      orderId = `${new Date().toISOString().slice(2, 10).replace(/-/g, '')}_${Math.floor(Math.random() * 1000000)}`;
    }

    const requestId = orderId;
    const amount = Math.round(this.getTotal());
    const orderInfo = `Thanh toan don hang #${orderId} qua MoMo`;
    const redirectUrl = window.location.origin + '/shop/checkout';
    const ipnUrl = window.location.origin + '/shop/checkout'; // IPN cũng trỏ về đây hoặc API backend
    const requestType = "captureWallet";
    const extraData = "";

    // 2. Signature (accessKey=$accessKey&amount=$amount&extraData=$extraData&ipnUrl=$ipnUrl&orderId=$orderId&orderInfo=$orderInfo&partnerCode=$partnerCode&redirectUrl=$redirectUrl&requestId=$requestId&requestType=$requestType)
    const rawSignature = `accessKey=${this.momoInfo.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${this.momoInfo.partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

    // Create HMAC (using existing SHA256 helper)
    const signature = await this.hmacSHA256(this.momoInfo.secretKey, rawSignature);

    // Save pending order
    this.savePendingOrderToStorage('momo', orderId);

    this.notificationService.info('Đang kết nối tới MoMo...');

    // 3. API Call
    try {
      const response = await fetch(this.momoInfo.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerCode: this.momoInfo.partnerCode,
          partnerName: "TDK Store",
          storeId: "MomoTestStore",
          requestId: requestId,
          amount: amount,
          orderId: orderId,
          orderInfo: orderInfo,
          redirectUrl: redirectUrl,
          ipnUrl: ipnUrl,
          lang: "vi",
          requestType: requestType,
          autoCapture: true,
          extraData: extraData,
          orderGroupId: "",
          signature: signature
        })
      });

      const result = await response.json();

      if (result.resultCode === 0) {
        console.log('✅ MoMo Order Created:', result);
        window.location.href = result.payUrl;
      } else {
        console.error('❌ MoMo Error:', result);
        // Fallback simulation if signature error (which is expected with placeholder keys) or other error
        console.warn('⚠️ Switching to MoMo Simulation due to API error.');
        this.openSimulatedMoMoGateway(amount, orderId);
      }
    } catch (error) {
      console.warn('⚠️ CORS/Network error for MoMo. Switching to Simulation Mode.', error);
      this.notificationService.info('Đang chuyển hướng sang cổng thanh toán MoMo (Mô phỏng)...');
      setTimeout(() => {
        this.openSimulatedMoMoGateway(amount, orderId);
      }, 1000);
    }
  }

  /**
   * Mở giao diện giả lập cổng thanh toán MoMo
   */
  openSimulatedMoMoGateway(amount: number, orderId: string) {
    const origin = window.location.origin;
    const formattedAmount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Thanh toán MoMo (Mô phỏng)</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
          .payment-card { background: white; padding: 0; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); width: 100%; max-width: 400px; text-align: center; overflow: hidden; }
          .header { background-color: #A50064; padding: 20px; color: white; }
          .logo { height: 50px; background: white; border-radius: 8px; padding: 5px; }
          .content { padding: 25px; }
          .merchant { color: #666; font-size: 0.9rem; margin-bottom: 5px; }
          .amount { font-size: 2rem; font-weight: bold; color: #A50064; margin-bottom: 20px; }
          .info { background: #fee9f2; padding: 15px; border-radius: 8px; margin-bottom: 25px; text-align: left; font-size: 0.9rem; border: 1px solid #ffcce0; }
          .info div { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .btn { display: block; width: 100%; padding: 12px; border: none; border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s; margin-bottom: 10px; }
          .btn-pay { background-color: #A50064; color: white; }
          .btn-pay:hover { background-color: #8d0055; }
          .btn-cancel { background-color: #e4e6eb; color: #333; }
          .btn-cancel:hover { background-color: #d8dadf; }
          .sandbox-badge { display: inline-block; background: #FFF; color: #A50064; padding: 3px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="payment-card">
          <div class="header">
            <img src="https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png" alt="MoMo" class="logo">
            <br>
            <div class="sandbox-badge">SANDBOX TEST</div>
          </div>
          <div class="content">
            <div class="merchant">Thanh toán cho</div>
            <h3>Cửa hàng Mũ Bảo Hiểm</h3>
            <div class="amount">${formattedAmount}</div>
            
            <div class="info">
              <div><span>Mã đơn hàng:</span> <strong>${orderId}</strong></div>
              <div><span>Nội dung:</span> <span>Thanh toán đơn hàng</span></div>
              <div style="border-top: 1px dashed #dca; margin-top: 8px; padding-top: 8px; font-size: 0.85rem; color: #888;">
                 <i>Màn hình giả lập (Mock Gateway)</i>
              </div>
            </div>

            <button class="btn btn-pay" onclick="confirmPayment()">Xác nhận thanh toán</button>
            <button class="btn btn-cancel" onclick="cancelPayment()">Hủy giao dịch</button>
          </div>
        </div>

        <script>
          function confirmPayment() {
            document.querySelector('.btn-pay').innerText = 'Đang xử lý...';
            setTimeout(() => {
            // Redirect back to checkout for final confirmation
              window.location.href = '${origin}/shop/checkout?paymentVerified=true&method=momo&orderId=${orderId}';
            }, 1000);
          }
          function cancelPayment() {
             window.location.href = '${origin}/shop/checkout?paymentCancelled=true';
          }
        </script>
      </body>
      </html>
    `;

    document.open();
    document.write(htmlContent);
    document.close();
  }

  // Refactor: Tách logic lưu pending order ra hàm chung để dùng lại
  savePendingOrderToStorage(paymentMethod: string, txnRef: string) {
    // 1. Lấy thông tin giỏ hàng
    let cartItems: any[] = [];
    if (this.isTempCart && this.tempCart && this.tempCart.length > 0) {
      cartItems = this.tempCart
        .filter((item: any) => item.chiTietSanPhamId != null)
        .map((item: any) => ({
          chiTietSanPhamId: item.chiTietSanPhamId || item.productId,
          tenSanPham: item.productName || '',
          soLuong: item.quantity || 1,
          donGia: parseFloat(item.price) || 0,
          giamGia: 0,
          thanhTien: item.totalItemPrice || (parseFloat(item.price) || 0) * (item.quantity || 1)
        }))
        .filter((item: any) => item.chiTietSanPhamId);
    } else if (this.cart && this.cart.danhSachGioHang) {
      cartItems = this.cart.danhSachGioHang
        .filter((item: any) => item.chiTietSanPhamId != null)
        .map((item: any) => ({
          chiTietSanPhamId: item.chiTietSanPhamId,
          tenSanPham: item.tenSanPham || '',
          soLuong: item.soLuong || 1,
          donGia: parseFloat(String(item.donGia)) || 0,
          giamGia: parseFloat(String(item.giamGia)) || 0,
          thanhTien: parseFloat(String(item.thanhTien)) || (parseFloat(String(item.donGia)) * (item.soLuong || 1))
        }));
    }

    // Backend compatibility: Map 'zalopay' to 'transfer' or 'vnpay' if backend Enum doesn't support 'zalopay'
    // Để an toàn, ta dùng 'transfer' và ghi chú rõ ràng
    let backendPaymentMethod = paymentMethod;
    // if (paymentMethod === 'zalopay' || paymentMethod === 'momo') {
    //   backendPaymentMethod = 'transfer';
    // }

    const currentUser = this.authService.getCurrentUser();

    // 2. Build hoa don data
    const hoaDonData = {
      khachHangId: this.realCustomerId,
      maHoaDon: this.cart?.maHoaDonCho || txnRef,
      tenKhachHang: this.billingInfo.firstName + ' ' + this.billingInfo.lastName,
      soDienThoaiKhachHang: this.billingInfo.phone,
      emailKhachHang: this.billingInfo.email,
      diaChiChiTiet: this.billingInfo.address,
      phuongXa: this.billingInfo.city.split(',')[0]?.trim() || '',
      quanHuyen: this.billingInfo.city.split(',').length > 1 ? this.billingInfo.city.split(',')[1]?.trim() : '',
      tinhThanh: this.billingInfo.city.split(',').length > 2 ? this.billingInfo.city.split(',')[2]?.trim() : this.billingInfo.city,
      loaiHoaDon: 'ONLINE',
      trangThai: 'CHO_XAC_NHAN',
      phuongThucThanhToan: backendPaymentMethod,
      danhSachChiTiet: cartItems,
      tongTien: this.getSubtotal(),
      thanhTien: this.getTotal(),
      tienGiamGia: (this.getDiscount() || 0) + (this.couponDiscount || 0),
      phiGiaoHang: this.shippingFee || 0,
      phieuGiamGiaId: this.appliedCoupon?.id || null,
      phieuGiamGiaIds: this.appliedCoupon ? [this.appliedCoupon.id] : [],
      soLuongSanPham: this.getTotalItems(),
      ghiChu: `Thanh toán ${paymentMethod.toUpperCase()}. Mã GD: ${txnRef}. ${this.orderNotes || ''}`
    };

    // Save to localStorage
    localStorage.setItem(`pending_${paymentMethod}_order`, JSON.stringify(hoaDonData));
    // Dùng chung cart id key hoặc riêng
    localStorage.setItem('pending_vnpay_cart_id', this.cartId ? this.cartId.toString() : ''); // Reuse key for simplicity or make generic
  }

  // Helper tạo HMAC-SHA256
  async hmacSHA256(key: string, data: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const msgData = encoder.encode(data);

    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await window.crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      msgData
    );

    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Helper để sắp xếp object theo key (theo logic của VNPAY)
  sortObject(obj: any): any {
    let sorted: any = {};
    let str = [];
    let key;
    for (key in obj) {
      if (obj.hasOwnProperty(key)) {
        str.push(encodeURIComponent(key));
      }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
      let originalKey = decodeURIComponent(str[key]); // Decode back to find value in obj
      sorted[str[key]] = encodeURIComponent(obj[originalKey]).replace(/%20/g, "+");
    }
    return sorted;
  }

  // Helper tạo HMAC-SHA512 (chạy ở browser)
  async hmacSHA512(key: string, data: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const msgData = encoder.encode(data);

    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );

    const signature = await window.crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      msgData
    );

    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  formatDateForVNPay(date: Date): string {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    const hours = ('0' + date.getHours()).slice(-2);
    const minutes = ('0' + date.getMinutes()).slice(-2);
    const seconds = ('0' + date.getSeconds()).slice(-2);
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }




  /**
   * Tạo hoá đơn
   */
  createInvoice(currentUser: any): void {
    // Lấy danh sách sản phẩm từ cart hoặc tempCart
    let cartItems: any[] = [];
    if (this.isTempCart && this.tempCart && this.tempCart.length > 0) {
      cartItems = this.tempCart
        .filter((item: any) => item.chiTietSanPhamId != null) // Lọc bỏ items không có chiTietSanPhamId
        .map((item: any) => {
          const chiTietSanPhamId = item.chiTietSanPhamId || item.productId;
          const soLuong = item.quantity || 1;
          const donGia = parseFloat(item.price) || 0;
          const giamGia = 0;
          const thanhTien = item.totalItemPrice || (donGia * soLuong - giamGia);

          if (!chiTietSanPhamId) {
            console.error('❌ Cart item missing chiTietSanPhamId:', item);
            return null;
          }

          return {
            chiTietSanPhamId: chiTietSanPhamId,
            tenSanPham: item.productName || '',
            soLuong: soLuong,
            donGia: donGia,
            giamGia: giamGia,
            thanhTien: thanhTien,
          };
        })
        .filter((item: any) => item != null); // Lọc bỏ null items
    } else if (this.cart && this.cart.danhSachGioHang) {
      cartItems = this.cart.danhSachGioHang
        .filter((item: any) => item.chiTietSanPhamId != null) // Lọc bỏ items không có chiTietSanPhamId
        .map((item) => {
          const chiTietSanPhamId = item.chiTietSanPhamId;
          const soLuong = item.soLuong || 1;
          const donGia = parseFloat(String(item.donGia)) || 0;
          const giamGia = parseFloat(String(item.giamGia)) || 0;
          const thanhTien = parseFloat(String(item.thanhTien)) || (donGia * soLuong - giamGia);

          if (!chiTietSanPhamId) {
            console.error('❌ Cart item missing chiTietSanPhamId:', item);
            return null;
          }

          return {
            chiTietSanPhamId: chiTietSanPhamId,
            tenSanPham: item.tenSanPham || '',
            soLuong: soLuong,
            donGia: donGia,
            giamGia: giamGia,
            thanhTien: thanhTien,
          };
        })
        .filter((item: any) => item != null); // Lọc bỏ null items
    }

    if (cartItems.length === 0) {
      this.notificationService.warning('Giỏ hàng của bạn đang trống hoặc không có sản phẩm hợp lệ!');
      this.isSubmitting = false;
      return;
    }

    // Validate tất cả items đều có đầy đủ thông tin
    const invalidItems = cartItems.filter((item: any) =>
      !item.chiTietSanPhamId ||
      !item.soLuong ||
      item.soLuong <= 0 ||
      !item.donGia ||
      item.donGia <= 0
    );

    if (invalidItems.length > 0) {
      console.error('❌ Invalid cart items:', invalidItems);
      this.notificationService.warning('Có sản phẩm trong giỏ hàng không hợp lệ. Vui lòng kiểm tra lại!');
      this.isSubmitting = false;
      return;
    }

    console.log('✅ Validated cart items:', cartItems.length);

    // QUAN TRỌNG: Nếu đã đăng nhập, lấy khachHangId từ customer service
    if (currentUser?.id && this.authService.isLoggedIn()) {
      this.customerService.getCurrentCustomer().subscribe({
        next: (customer) => {
          const khachHangId = customer?.id ?? null; // Convert undefined to null
          console.log('✅ Got khachHangId from customer service:', khachHangId);
          this.createInvoiceWithKhachHangId(khachHangId, cartItems, currentUser);
        },
        error: (error) => {
          console.error('❌ Error getting customer info:', error);
          // Nếu lỗi 404, có thể là user mới đăng ký chưa có KhachHang
          // Backend sẽ tự động tạo khi tạo đơn hàng
          if (error.status === 404) {
            console.log('⚠️ Customer not found (404), backend will create on order creation');
          }
          // Fallback: tạo đơn hàng không có khachHangId (backend sẽ tìm theo email/phone hoặc tạo mới)
          this.createInvoiceWithKhachHangId(null, cartItems, currentUser);
        },
      });
    } else {
      // Chưa đăng nhập, tạo đơn hàng không có khachHangId
      this.createInvoiceWithKhachHangId(null, cartItems, currentUser);
    }
  }

  /**
   * Tạo hóa đơn với khachHangId đã biết
   */
  private createInvoiceWithKhachHangId(khachHangId: number | null, cartItems: any[], currentUser: any): void {
    // QUAN TRỌNG: Nếu không có khachHangId, phải validate đầy đủ thông tin khách hàng
    if (!khachHangId) {
      const tenKhachHang = `${this.billingInfo?.firstName || ''} ${this.billingInfo?.lastName || ''}`.trim();
      const emailKhachHang = this.billingInfo?.email || '';
      const soDienThoaiKhachHang = this.billingInfo?.phone || '';

      if (!tenKhachHang || tenKhachHang === '') {
        this.notificationService.warning('Vui lòng nhập tên khách hàng!');
        this.isSubmitting = false;
        return;
      }
      if (!emailKhachHang || emailKhachHang === '') {
        this.notificationService.warning('Vui lòng nhập email khách hàng!');
        this.isSubmitting = false;
        return;
      }
      if (!soDienThoaiKhachHang || soDienThoaiKhachHang === '') {
        this.notificationService.warning('Vui lòng nhập số điện thoại khách hàng!');
        this.isSubmitting = false;
        return;
      }
    }

    // Tạo hóa đơn từ HoaDonCho hoặc tempCart
    // QUAN TRỌNG: Không set nhanVienId để đánh dấu đơn hàng online (nhanVienId = null = Online)
    // Backend sẽ tự động map nhanVienId = null thành viTriBanHang = "Online"
    const hoaDonData: any = {
      maHoaDon: `HD${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      khachHangId: khachHangId, // Đã lấy từ customer service
      tenKhachHang: `${this.billingInfo?.firstName || ''} ${this.billingInfo?.lastName || ''
        }`.trim() || (currentUser?.name || 'Khách hàng'),
      soDienThoaiKhachHang: this.billingInfo?.phone || '',
      emailKhachHang: this.billingInfo?.email || '',
      diaChiChiTiet: this.billingInfo?.address || '',
      // Ưu tiên lấy từ dropdown (chính xác hơn) để mapping đúng sang thông tin đơn hàng
      tinhThanh: this.selectedProvinceCode
        ? (this.provinces.find(p => p.code === this.selectedProvinceCode)?.name || '')
        : (this.billingInfo?.city && this.billingInfo.city.split(',').length > 2
          ? this.billingInfo.city.split(',')[2]?.trim()
          : this.billingInfo?.city || ''),
      quanHuyen: this.selectedDistrictCode
        ? (this.districts.find(d => d.code === this.selectedDistrictCode)?.name || '')
        : (this.billingInfo?.city && this.billingInfo.city.split(',').length > 1
          ? this.billingInfo.city.split(',')[1]?.trim()
          : ''),
      phuongXa: this.selectedWardCode
        ? (this.wards.find(w => w.code === this.selectedWardCode)?.name || '')
        : (this.billingInfo?.city?.split(',')[0]?.trim() || ''),
      ghiChu: this.orderNotes || '',
      trangThai: 'CHO_XAC_NHAN',
      // KHÔNG set nhanVienId - để null = Online order
      // KHÔNG set viTriBanHang - backend sẽ tự động map từ nhanVienId
      phuongThucThanhToan: this.paymentMethod === 'transfer' ? 'transfer' : (this.paymentMethod === 'vnpay' ? 'vnpay' : (this.paymentMethod === 'zalopay' ? 'zalopay' : (this.paymentMethod === 'momo' ? 'momo' : 'cash'))),
      // Map danhSachGioHang từ cart hoặc tempCart sang danhSachChiTiet
      danhSachChiTiet: cartItems,
      tongTien: this.getSubtotal(),
      thanhTien: this.getTotal(),
      tienGiamGia: (this.getDiscount() || 0) + (this.couponDiscount || 0),
      phiGiaoHang: this.shippingFee || 0, // Phí ship đã được tính tự động
      phieuGiamGiaId: this.appliedCoupon?.id || null,
      phieuGiamGiaIds: this.appliedCoupon ? [this.appliedCoupon.id] : [],
      soLuongSanPham: this.getTotalItems(),
    };

    // Validate dữ liệu trước khi gửi
    if (!hoaDonData.danhSachChiTiet || hoaDonData.danhSachChiTiet.length === 0) {
      console.error('❌ Cannot create invoice: cartItems is empty');
      this.notificationService.warning('Giỏ hàng của bạn đang trống!');
      this.isSubmitting = false;
      return;
    }

    // Validate từng item trong danhSachChiTiet
    const invalidItems = hoaDonData.danhSachChiTiet.filter((item: any) =>
      !item.chiTietSanPhamId ||
      !item.soLuong ||
      item.soLuong <= 0
    );

    if (invalidItems.length > 0) {
      console.error('❌ Cannot create invoice: invalid items found', invalidItems);
      this.notificationService.warning('Có sản phẩm trong giỏ hàng không hợp lệ. Vui lòng kiểm tra lại!');
      this.isSubmitting = false;
      return;
    }

    // Validate tổng tiền
    if (!hoaDonData.tongTien || hoaDonData.tongTien <= 0) {
      console.error('❌ Cannot create invoice: tongTien is invalid', hoaDonData.tongTien);
      this.notificationService.warning('Tổng tiền không hợp lệ. Vui lòng kiểm tra lại!');
      this.isSubmitting = false;
      return;
    }

    // Tạo hóa đơn
    console.log('📤 Creating invoice from cart:', {
      cartId: this.cartId,
      cartItems: this.cart?.danhSachGioHang?.length || 0,
      khachHangId: hoaDonData.khachHangId,
      tenKhachHang: hoaDonData.tenKhachHang,
      emailKhachHang: hoaDonData.emailKhachHang,
      soDienThoaiKhachHang: hoaDonData.soDienThoaiKhachHang,
      danhSachChiTietCount: hoaDonData.danhSachChiTiet?.length || 0,
      tongTien: hoaDonData.tongTien,
      thanhTien: hoaDonData.thanhTien,
    });

    // Log chi tiết từng item để debug
    hoaDonData.danhSachChiTiet.forEach((item: any, index: number) => {
      console.log(`   - Item ${index + 1}: chiTietSanPhamId=${item.chiTietSanPhamId}, soLuong=${item.soLuong}, donGia=${item.donGia}`);
    });

    this.hoaDonService.createHoaDon(hoaDonData).subscribe({
      next: (hoaDon) => {
        console.log('✅ Order created successfully:', {
          id: hoaDon.id,
          maHoaDon: hoaDon.maHoaDon,
          trangThai: hoaDon.trangThai,
          viTriBanHang: hoaDon.viTriBanHang,
          nhanVienId: hoaDon.nhanVienId,
          danhSachChiTiet: hoaDon.danhSachChiTiet?.length || 0,
        });

        // Xóa HoaDonCho sau khi tạo hóa đơn thành công
        if (this.cartId) {
          this.hoaDonChoService.deleteHoaDonCho(this.cartId).subscribe({
            next: () => {
              console.log('✅ Cart deleted successfully');
              localStorage.removeItem('current_cart_id');
              // Xóa giỏ hàng tạm nếu có
              localStorage.removeItem('temp_cart');
              // Trigger cart updated event để update cart count
              window.dispatchEvent(new Event('cartUpdated'));
            },
            error: (err) => {
              console.error('Error deleting cart:', err);
              // Không block flow nếu xóa cart thất bại
            },
          });
        } else {
          // Xóa giỏ hàng tạm nếu không có cartId
          localStorage.removeItem('temp_cart');
          // Trigger cart updated event để update cart count
          window.dispatchEvent(new Event('cartUpdated'));
        }

        // Lưu hoá đơn đã tạo (để backup nếu cần)
        this.createdInvoice = hoaDon;
        this.isSubmitting = false;

        console.log('✅ Order created successfully, redirecting to order history...');

        // QUAN TRỌNG: Khi chưa đăng nhập, KHÔNG lưu vào localStorage
        // Chuyển đến trang tra cứu đơn hàng với thông báo yêu cầu nhập mã từ email
        if (!this.authService.isLoggedIn()) {
          console.log('✅ Guest user - redirecting to order lookup page');
          // Chuyển đến trang tra cứu với flag orderPlaced để hiển thị thông báo
          // KHÔNG truyền orderCode để không tự động tra cứu
          this.router.navigate(['/customer/orders'], {
            queryParams: { orderPlaced: 'true' }
          });
        } else {
          // Khi đã đăng nhập, chuyển đến trang đơn hàng với order ID
          this.router.navigate(['/customer/orders'], {
            queryParams: { newOrderId: hoaDon.id }
          });
        }
      },
      error: (err) => {
        console.error('❌ Error creating invoice:', err);
        this.isSubmitting = false;
        const errorMsg =
          err.error?.message ||
          err.error?.error ||
          err.message ||
          'Không thể tạo đơn hàng. Vui lòng thử lại!';
        this.error = errorMsg;

        // QUAN TRỌNG: Nếu lỗi 401 (Unauthorized) và chưa đăng nhập, redirect về trang chủ
        if (err.status === 401 && !this.authService.isLoggedIn()) {
          console.log('🛒 401 error on checkout, redirecting to shop home');
          this.notificationService.warning('Bạn cần đăng nhập để đặt hàng. Vui lòng đăng nhập và thử lại!');
          this.router.navigate(['/shop']);
          return;
        }

        // Force change detection
        this.cdr.detectChanges();
        this.notificationService.error(`Lỗi: ${errorMsg}`);
      },
    });
    // }).catch((err) => {
    //   console.error('Error validating stock:', err);
    //   this.isSubmitting = false;
    //   alert('Không thể kiểm tra tồn kho. Vui lòng thử lại!');
    // });
  }

  /**
   * Kiểm tra tồn kho và tính lại tổng tiền trước khi tạo hóa đơn
   */
  async validateStockAndRecalculate(): Promise<boolean> {
    if (!this.cart || !this.cart.danhSachGioHang || this.cart.danhSachGioHang.length === 0) {
      this.notificationService.warning('Giỏ hàng của bạn đang trống!');
      return false;
    }

    // Sử dụng ChiTietSanPhamApiService đã inject
    const { ChiTietSanPhamApiService } = await import(
      '../../../services/chi-tiet-san-pham-api.service'
    );
    const { HttpClient } = await import('@angular/common/http');
    const { inject } = await import('@angular/core');

    // Tạm thời dùng cách đơn giản hơn: gọi API trực tiếp
    return new Promise((resolve) => {
      let hasError = false;
      let errorMessage = '';
      let recalculatedItems: any[] = [];
      let totalRecalculated = 0;
      let validatedCount = 0;
      const totalItems = this.cart!.danhSachGioHang!.length;

      if (totalItems === 0) {
        resolve(false);
        return;
      }

      // Kiểm tra từng sản phẩm trong giỏ hàng
      this.cart!.danhSachGioHang!.forEach((item) => {
        // Gọi API để lấy thông tin chi tiết sản phẩm
        // Tạm thời bỏ qua validation chi tiết, để backend xử lý
        // Chỉ validate cơ bản ở frontend
        recalculatedItems.push({
          ...item,
          donGia: item.donGia || 0,
          soLuong: item.soLuong || 1,
          giamGia: item.giamGia || 0,
          thanhTien:
            item.thanhTien || (item.donGia || 0) * (item.soLuong || 1) - (item.giamGia || 0),
        });

        totalRecalculated += recalculatedItems[recalculatedItems.length - 1].thanhTien;
        validatedCount++;

        if (validatedCount === totalItems) {
          // Đã validate xong tất cả items
          if (hasError) {
            this.notificationService.error(
              `⚠️ Có lỗi xảy ra khi kiểm tra đơn hàng:${errorMessage}\n\nVui lòng cập nhật giỏ hàng và thử lại.`
            );
            resolve(false);
            return;
          }

          // So sánh tổng tiền mới với tổng tiền cũ
          const currentTotal = this.getTotal();
          const difference = Math.abs(totalRecalculated - currentTotal);

          if (difference > 1000) {
            // Nếu chênh lệch > 1000đ
            const confirmMessage =
              `Tổng tiền đã thay đổi:\n` +
              `Tổng tiền cũ: ${this.formatCurrency(currentTotal)}\n` +
              `Tổng tiền mới: ${this.formatCurrency(totalRecalculated)}\n\n` +
              `Bạn có muốn tiếp tục với tổng tiền mới không?`;

            this.notificationService.confirm({
              title: 'Xác nhận tổng tiền',
              message: confirmMessage,
              confirmText: 'Tiếp tục',
              cancelText: 'Hủy'
            }).then((confirmed) => {
              if (!confirmed) {
                resolve(false);
                return;
              }

              // Cập nhật giỏ hàng với giá mới
              this.cart!.danhSachGioHang = recalculatedItems;
              resolve(true);
            });
            return;
          }

          // Cập nhật giỏ hàng với giá mới
          this.cart!.danhSachGioHang = recalculatedItems;
          resolve(true);
        }
      });
    });
  }

  getSubtotal(): number {
    if (this.isTempCart && this.tempCart && this.tempCart.length > 0) {
      return this.tempCart.reduce((sum: number, item: any) => sum + (item.totalItemPrice || 0), 0);
    }
    if (!this.cart || !this.cart.danhSachGioHang) return 0;
    return this.cart.danhSachGioHang.reduce((sum, item) => {
      return sum + (item.thanhTien || 0);
    }, 0);
  }

  getDiscount(): number {
    if (this.isTempCart && this.tempCart && this.tempCart.length > 0) {
      return 0; // Temp cart không có discount
    }
    if (!this.cart || !this.cart.danhSachGioHang) return 0;
    return this.cart.danhSachGioHang.reduce((sum, item) => {
      return sum + (item.giamGia || 0);
    }, 0);
  }

  getTotal(): number {
    const subtotal = this.getSubtotal();
    const discount = this.getDiscount();
    const base = Math.max(0, subtotal - discount);

    this.couponDiscount = 0;

    if (this.appliedCoupon) {
      // Check minOrder validity
      if (this.appliedCoupon.minOrder && base < this.appliedCoupon.minOrder) {
        this.couponDiscount = 0;
      } else {
        this.couponDiscount = this.computeVoucherDiscount(this.appliedCoupon, base);
      }
    }

    // Thêm phí ship vào tổng tiền
    return Math.max(0, base - this.couponDiscount + this.shippingFee);
  }

  /**
   * Tự động tính phí ship khi địa chỉ thay đổi
   * - Nếu địa chỉ có thật (validate được qua GHN API) → tính theo API
   * - Nếu địa chỉ không có thật (không validate được) → phí ship = 0
   */
  calculateShippingFeeAuto(): void {
    // Lấy thông tin địa chỉ từ form hoặc địa chỉ đã chọn
    let tinhThanh = '';
    let quanHuyen = '';
    let phuongXa = '';

    if (this.selectedAddressId) {
      const address = this.customerAddresses.find((a) => a.id === this.selectedAddressId);
      if (address) {
        tinhThanh = address.tinhThanh || '';
        quanHuyen = address.quanHuyen || '';
        phuongXa = address.phuongXa || '';
      }
    } else {
      // Ưu tiên lấy từ dropdown (chính xác hơn)
      if (this.selectedProvinceCode) {
        const province = this.provinces.find(p => p.code === this.selectedProvinceCode);
        if (province) {
          tinhThanh = province.name;
        }
      }
      if (this.selectedDistrictCode) {
        const district = this.districts.find(d => d.code === this.selectedDistrictCode);
        if (district) {
          quanHuyen = district.name;
        }
      }
      if (this.selectedWardCode) {
        const ward = this.wards.find(w => w.code === this.selectedWardCode);
        if (ward) {
          phuongXa = ward.name;
        }
      }

      // Fallback: Nếu không có từ dropdown, lấy từ form billingInfo.city
      if (!tinhThanh) {
        const cityParts = this.billingInfo.city ? this.billingInfo.city.split(',') : [];
        if (cityParts.length >= 3) {
          phuongXa = phuongXa || cityParts[0]?.trim() || '';
          quanHuyen = quanHuyen || cityParts[1]?.trim() || '';
          tinhThanh = tinhThanh || cityParts[2]?.trim() || '';
        } else if (cityParts.length > 0) {
          tinhThanh = tinhThanh || cityParts[cityParts.length - 1]?.trim() || '';
        }
      }
    }

    // Kiểm tra có đủ thông tin để tính phí ship không
    if (!tinhThanh || tinhThanh.trim() === '') {
      console.log('⚠️ Không có thông tin tỉnh/thành phố, sử dụng phí ship mặc định');
      this.shippingFee = this.DEFAULT_SHIPPING_FEE;
      this.cdr.detectChanges();
      return;
    }

    // Kiểm tra có quận/huyện không (bắt buộc để tính phí ship chính xác)
    if (!quanHuyen || quanHuyen.trim() === '') {
      console.log('⚠️ Không có thông tin quận/huyện, sử dụng phí ship mặc định');
      this.shippingFee = this.DEFAULT_SHIPPING_FEE;
      this.cdr.detectChanges();
      return;
    }

    // Tính trọng lượng từ giỏ hàng (mặc định mỗi sản phẩm 500g nếu không có thông tin)
    const totalWeight = this.getTotalItems() * 500 || 1000; // Tối thiểu 1kg

    // Giá trị đơn hàng
    const orderValue = this.getSubtotal() - this.getDiscount();

    this.isCalculatingShippingFee = true;
    console.log('🚚 Calculating shipping fee for address:', { tinhThanh, quanHuyen, phuongXa });

    // Tìm district_id từ district code để gửi cho GHN API
    let districtId = 0;
    if (this.selectedDistrictCode && quanHuyen) {
      // Sử dụng district code trực tiếp (backend sẽ xử lý mapping)
      const districtIdStr = this.selectedDistrictCode;
      districtId = parseInt(districtIdStr, 10) || 0;
      console.log('📍 Using district code for GHN API:', districtId, 'from district:', quanHuyen);
    } else if (this.selectedAddressId) {
      // Nếu đang chọn địa chỉ đã lưu nhưng chưa có district code, thử tìm lại
      const address = this.customerAddresses.find((a) => a.id === this.selectedAddressId);
      if (address && address.quanHuyen && this.districts.length > 0) {
        const district = this.districts.find(d => d.name === address.quanHuyen);
        if (district) {
          this.selectedDistrictCode = district.code;
          districtId = parseInt(district.code, 10) || 0;
          console.log('📍 Found district code from address:', districtId);
        }
      }
    }

    // Gọi GHN API để tính phí ship
    const ghnRequest = {
      province: tinhThanh,
      to_district_id: districtId || 0, // Backend sẽ xử lý mapping từ tên quận/huyện nếu districtId = 0
      to_ward_code: phuongXa || undefined,
      weight: totalWeight,
      length: 20,
      width: 20,
      height: 20,
      insurance_value: Math.round(orderValue),
    };

    this.ghnService.calculateShippingFeeViaBackend(ghnRequest).subscribe({
      next: (ghnResponse) => {
        console.log('✅ GHN API response:', ghnResponse);
        this.isCalculatingShippingFee = false;

        // Kiểm tra response từ GHN API
        let newShippingFee = this.DEFAULT_SHIPPING_FEE;

        if (ghnResponse && ghnResponse.code === 200 && ghnResponse.data) {
          // Kiểm tra nhiều format response
          if (ghnResponse.data.total) {
            newShippingFee = Number(ghnResponse.data.total) || this.DEFAULT_SHIPPING_FEE;
          } else if (typeof ghnResponse.data === 'number') {
            newShippingFee = Number(ghnResponse.data) || this.DEFAULT_SHIPPING_FEE;
          }

          if (newShippingFee > 0) {
            // Địa chỉ có thật, tính phí ship theo API
            this.shippingFee = newShippingFee;
            console.log('💰 Shipping fee calculated from GHN API:', this.shippingFee, 'VNĐ');
          } else {
            // Nếu API trả về giá trị không hợp lý, dùng mặc định
            console.warn('⚠️ GHN API returned invalid fee, using default shipping fee');
            this.shippingFee = this.DEFAULT_SHIPPING_FEE;
          }
        } else {
          // Không validate được địa chỉ hoặc API lỗi, sử dụng phí mặc định
          console.warn('⚠️ Cannot validate address via GHN API, using default shipping fee');
          this.shippingFee = this.DEFAULT_SHIPPING_FEE;
        }

        // Force change detection để đảm bảo UI cập nhật ngay lập tức
        console.log('🔄 Updated shipping fee to:', this.shippingFee, 'VNĐ');
        console.log('🔄 Total will be:', this.getTotal(), 'VNĐ');
        this.cdr.detectChanges();

        // Trigger change detection một lần nữa để đảm bảo UI được cập nhật
        setTimeout(() => {
          this.cdr.detectChanges();
        }, 100);
      },
      error: (ghnError) => {
        console.error('❌ Error calling GHN API:', ghnError);
        this.isCalculatingShippingFee = false;
        // Lỗi API → sử dụng phí mặc định
        console.warn('⚠️ GHN API error, using default shipping fee');
        this.shippingFee = this.DEFAULT_SHIPPING_FEE;
        this.cdr.detectChanges();
      },
    });
  }

  getTotalItems(): number {
    if (this.isTempCart && this.tempCart && this.tempCart.length > 0) {
      return this.tempCart.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    }
    if (!this.cart || !this.cart.danhSachGioHang) return 0;
    return this.cart.danhSachGioHang.reduce((sum, item) => {
      return sum + (item.soLuong || 0);
    }, 0);
  }

  /**
   * Load danh sách tỉnh/thành phố
   */
  loadProvinces(): void {
    // Nếu đã load rồi thì không load lại
    if (this.provinces.length > 0) {
      console.log('✅ Provinces already loaded:', this.provinces.length);
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
    } catch (error) {
      console.error('❌ Error loading provinces from local data:', error);
      // Fallback: thử gọi API nếu local data không có
      this.vietnamAddressService.getProvinces().subscribe({
        next: (provinces) => {
          this.provinces = provinces || [];
          this.loadingProvinces = false;
          console.log('✅ Loaded provinces from API (fallback):', this.provinces.length);
          this.cdr.detectChanges();
        },
        error: (apiError) => {
          console.error('❌ Error loading provinces from API:', apiError);
          this.loadingProvinces = false;
          this.provinces = [];
          this.error = 'Không thể tải danh sách tỉnh/thành phố. Vui lòng thử lại sau.';
          this.cdr.detectChanges();
        }
      });
    }
  }

  /**
   * Load danh sách quận/huyện theo tỉnh
   */
  loadDistrictsByProvince(provinceCode: string): void {
    if (!provinceCode || provinceCode === '') {
      this.districts = [];
      this.wards = [];
      this.selectedDistrictCode = '';
      this.selectedWardCode = '';
      return;
    }

    console.log('🔄 Loading districts for province code:', provinceCode);
    this.loadingDistricts = true;
    this.districts = [];
    this.wards = [];
    this.selectedDistrictCode = '';
    this.selectedWardCode = '';

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
      this.cdr.detectChanges();
    } catch (error) {
      console.error('❌ Error loading districts from local data:', error);
      // Fallback: thử gọi API
      this.vietnamAddressService.getDistrictsByProvince(provinceCode).subscribe({
        next: (districts) => {
          this.districts = districts || [];
          this.loadingDistricts = false;
          console.log('✅ Loaded districts from API (fallback):', this.districts.length);
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
      this.selectedWardCode = '';
      return;
    }

    console.log('🔄 Loading wards for district code:', districtCode);
    this.loadingWards = true;
    this.wards = [];
    this.selectedWardCode = '';

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
      this.cdr.detectChanges();
    } catch (error) {
      console.error('❌ Error loading wards from local data:', error);
      // Fallback: thử gọi API
      this.vietnamAddressService.getWardsByDistrict(districtCode).subscribe({
        next: (wards) => {
          this.wards = wards || [];
          this.loadingWards = false;
          console.log('✅ Loaded wards from API (fallback):', this.wards.length);
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
  onProvinceChange(): void {
    console.log('📍 Province changed:', this.selectedProvinceCode);

    // Reset districts và wards khi chọn tỉnh mới
    if (!this.selectedProvinceCode || this.selectedProvinceCode === '') {
      this.districts = [];
      this.wards = [];
      this.selectedDistrictCode = '';
      this.selectedWardCode = '';
      // Reset phí ship về mặc định khi không có tỉnh
      this.shippingFee = this.DEFAULT_SHIPPING_FEE;
      this.cdr.detectChanges();
      return;
    }

    const province = this.provinces.find(p => p.code === this.selectedProvinceCode);
    if (province) {
      console.log('✅ Found province:', province.name);

      // Cập nhật billingInfo.city với tên tỉnh
      const cityParts = this.billingInfo.city ? this.billingInfo.city.split(',') : [];
      if (cityParts.length >= 2) {
        // Giữ nguyên phường/xã và quận/huyện, chỉ cập nhật tỉnh
        this.billingInfo.city = `${cityParts[0]?.trim() || ''}, ${cityParts[1]?.trim() || ''}, ${province.name}`.trim();
      } else {
        this.billingInfo.city = province.name;
      }

      // Load districts
      this.loadDistrictsByProvince(province.code);

      // Tính lại phí ship sau khi load districts (chỉ khi đã có quận/huyện)
      if (this.selectedDistrictCode) {
        setTimeout(() => {
          this.calculateShippingFeeAuto();
        }, 500);
      } else {
        // Nếu chưa có quận/huyện, reset về mặc định
        this.shippingFee = this.DEFAULT_SHIPPING_FEE;
        this.cdr.detectChanges();
      }
    } else {
      console.warn('⚠️ Province not found for code:', this.selectedProvinceCode);
    }
    this.cdr.detectChanges();
  }

  /**
   * Xử lý khi chọn quận/huyện
   */
  onDistrictChange(): void {
    console.log('📍 District changed:', this.selectedDistrictCode);

    // Reset wards khi chọn quận/huyện mới
    if (!this.selectedDistrictCode || this.selectedDistrictCode === '') {
      this.wards = [];
      this.selectedWardCode = '';
      // Reset phí ship về mặc định khi không có quận/huyện
      this.shippingFee = this.DEFAULT_SHIPPING_FEE;
      this.cdr.detectChanges();
      return;
    }

    const district = this.districts.find(d => d.code === this.selectedDistrictCode);
    if (district) {
      console.log('✅ Found district:', district.name);

      // Cập nhật billingInfo.city với tên quận/huyện
      const cityParts = this.billingInfo.city ? this.billingInfo.city.split(',') : [];
      const province = this.provinces.find(p => p.code === this.selectedProvinceCode);
      if (cityParts.length >= 1) {
        // Giữ nguyên phường/xã, cập nhật quận/huyện và tỉnh
        this.billingInfo.city = `${cityParts[0]?.trim() || ''}, ${district.name}, ${province?.name || ''}`.trim();
      } else {
        this.billingInfo.city = `${district.name}, ${province?.name || ''}`.trim();
      }

      // Load wards
      this.loadWardsByDistrict(district.code);

      // Tính lại phí ship ngay khi có đủ tỉnh và quận/huyện
      if (this.selectedProvinceCode) {
        setTimeout(() => {
          console.log('🔄 Recalculating shipping fee after district change...');
          this.calculateShippingFeeAuto();
        }, 500);
      }
    } else {
      console.warn('⚠️ District not found for code:', this.selectedDistrictCode);
    }
    this.cdr.detectChanges();
  }

  /**
   * Xử lý khi chọn phường/xã
   */
  onWardChange(): void {
    const ward = this.wards.find(w => w.code === this.selectedWardCode);
    if (ward) {
      // Cập nhật billingInfo.city với tên phường/xã
      const district = this.districts.find(d => d.code === this.selectedDistrictCode);
      const province = this.provinces.find(p => p.code === this.selectedProvinceCode);
      this.billingInfo.city = `${ward.name}, ${district?.name || ''}, ${province?.name || ''}`.trim();

      // Tính lại phí ship sau khi có đủ thông tin (tỉnh và quận/huyện)
      if (this.selectedProvinceCode && this.selectedDistrictCode) {
        setTimeout(() => {
          console.log('🔄 Recalculating shipping fee after ward change...');
          this.calculateShippingFeeAuto();
        }, 300);
      }
    }
    this.cdr.detectChanges();
  }

  /**
   * Xử lý khi người dùng nhập/thay đổi địa chỉ chi tiết
   */
  onAddressDetailChange(): void {
    // Nếu đã có đủ thông tin tỉnh/quận, tính lại phí ship
    if (this.selectedProvinceCode && this.selectedDistrictCode) {
      // Debounce để tránh tính quá nhiều lần khi người dùng đang gõ
      setTimeout(() => {
        this.calculateShippingFeeAuto();
      }, 500);
    }
  }

  /**
   * Lấy URL ảnh sản phẩm
   */
  getProductImageUrl(imagePath?: string | null): string {
    if (!imagePath) {
      return 'https://via.placeholder.com/80x80?text=No+Image';
    }

    const trimmed = imagePath.trim();
    if (!trimmed) {
      return 'https://via.placeholder.com/80x80?text=No+Image';
    }

    // Nếu là data URL đầy đủ
    if (/^data:image\//i.test(trimmed)) {
      return trimmed;
    }

    // Nếu là URL đầy đủ (http/https)
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }

    // Nếu là đường dẫn tương đối bắt đầu bằng /
    if (trimmed.startsWith('/')) {
      const baseUrl = environment.apiBaseUrl || environment.apiUrl || '';
      if (baseUrl) {
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');
        if (!trimmed.startsWith(cleanBaseUrl)) {
          return `${cleanBaseUrl}${trimmed}`;
        }
      }
      return trimmed;
    }

    // Mặc định: thêm / để trở thành đường dẫn tương đối
    return `/${trimmed}`;
  }

  /**
   * Xử lý lỗi khi load ảnh
   */
  handleImageError(event: any): void {
    if (event && event.target) {
      const img = event.target as HTMLImageElement;
      if (img.src && !img.src.includes('placeholder.com') && !img.src.includes('via.placeholder')) {
        img.src = 'https://via.placeholder.com/80x80?text=No+Image';
      }
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }

  getBankTransferQrUrl(): string {
    const amount = Math.round(this.getTotal() || 0);
    const description = this.transactionCode || 'TDK CHECKOUT';
    const amountQuery = amount > 0 ? `&amount=${amount}` : '';
    return `https://img.vietqr.io/image/${this.bankInfo.bankCode}-${this.bankInfo.accountNumber}-${this.bankInfo.template || 'compact2'
      }.png?addInfo=${encodeURIComponent(description)}${amountQuery}`;
  }

  copyTransactionCode(): void {
    if (!this.transactionCode) return;
    navigator.clipboard.writeText(this.transactionCode).then(() => {
      this.notificationService.success('Đã sao chép mã giao dịch!');
    });
  }

  /**
   * Quay lại trang trước
   */
  goBack(): void {
    // Nếu có lịch sử trình duyệt, quay lại
    if (window.history.length > 1) {
      this.location.back();
    } else {
      // Nếu không có lịch sử, chuyển về giỏ hàng
      this.router.navigate(['/shop/cart']);
    }
  }

  // Discount code / Voucher methods
  applyCoupon(): void {
    const code = (this.couponCode || '').trim();
    if (!code) return;
    this.phieuGiamGiaService.getPhieuGiamGiaByMaPhieu(code).subscribe({
      next: (res: any) => {
        const v = res?.data || res?.result || res;
        if (v) {
          const mapped = this.mapVoucher(v);
          this.applyCouponFromSuggestion(mapped);
        } else {
          this.notificationService.warning('Mã giảm giá không tồn tại');
        }
      },
      error: () => {
        this.notificationService.warning('Lỗi khi kiểm tra mã giảm giá');
      },
    });
  }

  applyCouponFromSuggestion(v: any): void {
    const mapped = this.mapVoucher(v);

    // Check minOrder before applying
    const base = this.getSubtotal() - this.getDiscount();
    if (mapped.minOrder && base < mapped.minOrder) {
      this.notificationService.warning(`Đơn hàng chưa đạt tối thiểu ${this.formatCurrency(mapped.minOrder)}`);
      return;
    }

    // Single Coupon Logic: Always replace
    this.appliedCoupon = mapped;
    this.couponCode = mapped.code;
    this.voucherManuallyRemoved = false;

    this.getTotal(); // Re-calculate total/discount
    this.cdr.detectChanges();
    this.notificationService.success(`Đã áp dụng mã ${mapped.code}`);
  }

  removeCoupon(couponId?: number): void {
    // Always remove the single applied coupon
    this.appliedCoupon = null;
    this.couponCode = '';
    this.couponDiscount = 0;
    this.voucherManuallyRemoved = true;

    this.getTotal();
    this.cdr.detectChanges();
  }

  isCouponApplied(couponId: number): boolean {
    return this.appliedCoupon?.id === couponId;
  }

  calculateTotal(): void {
    this.getTotal();
    this.cdr.detectChanges();
  }

  private mapVoucher(v: any) {
    // ✅ Xử lý loaiPhieuGiamGia: Boolean - false = phần trăm, true = tiền mặt
    let type: 'PERCENT' | 'FIXED' = 'PERCENT';
    if (v.loaiPhieuGiamGia !== undefined) {
      // Boolean: false = phần trăm (PERCENT), true = tiền mặt (FIXED)
      type = v.loaiPhieuGiamGia === false ? 'PERCENT' : 'FIXED';
    } else if (v.type !== undefined) {
      // String hoặc number
      const typeStr = String(v.type).toUpperCase();
      type = typeStr === 'PERCENT' || typeStr === 'PHAN_TRAM' ? 'PERCENT' : 'FIXED';
    } else if (v.loaiGiam !== undefined || v.kieuGiam !== undefined) {
      const typeStr = String(v.loaiGiam ?? v.kieuGiam).toUpperCase();
      type = typeStr === 'PERCENT' || typeStr === 'PHAN_TRAM' ? 'PERCENT' : 'FIXED';
    }

    // ✅ Xử lý giá trị giảm (giaTriGiam có thể là BigDecimal từ backend)
    let value = 0;
    if (v.giaTriGiam !== undefined && v.giaTriGiam !== null) {
      value = typeof v.giaTriGiam === 'number' ? v.giaTriGiam : Number(v.giaTriGiam);
    } else if (v.value !== undefined && v.value !== null) {
      value = typeof v.value === 'number' ? v.value : Number(v.value);
    } else if (v.giaTri !== undefined && v.giaTri !== null) {
      value = typeof v.giaTri === 'number' ? v.giaTri : Number(v.giaTri);
    }

    // ✅ Xử lý số tiền tối đa (soTienToiDa có thể là BigDecimal)
    let maxDiscount: number | undefined = undefined;
    if (v.soTienToiDa !== undefined && v.soTienToiDa !== null) {
      maxDiscount = typeof v.soTienToiDa === 'number' ? v.soTienToiDa : Number(v.soTienToiDa);
    } else if (v.maxDiscount !== undefined && v.maxDiscount !== null) {
      maxDiscount = typeof v.maxDiscount === 'number' ? v.maxDiscount : Number(v.maxDiscount);
    } else if (v.giamToiDa !== undefined && v.giamToiDa !== null) {
      maxDiscount = typeof v.giamToiDa === 'number' ? v.giamToiDa : Number(v.giamToiDa);
    }

    // POS Heuristic: If maxDiscount is too small (< 1000), treat it as undefined/unlimited
    if (maxDiscount !== undefined && maxDiscount < 1000) {
      maxDiscount = undefined;
    }

    // ✅ Xử lý đơn tối thiểu (hoaDonToiThieu có thể là BigDecimal)
    let minOrder: number | undefined = undefined;
    if (v.hoaDonToiThieu !== undefined && v.hoaDonToiThieu !== null) {
      minOrder = typeof v.hoaDonToiThieu === 'number' ? v.hoaDonToiThieu : Number(v.hoaDonToiThieu);
    } else if (v.minOrder !== undefined && v.minOrder !== null) {
      minOrder = typeof v.minOrder === 'number' ? v.minOrder : Number(v.minOrder);
    } else if (v.dieuKienToiThieu !== undefined && v.dieuKienToiThieu !== null) {
      minOrder = typeof v.dieuKienToiThieu === 'number' ? v.dieuKienToiThieu : Number(v.dieuKienToiThieu);
    } else if (v.giaTriToiThieu !== undefined && v.giaTriToiThieu !== null) {
      minOrder = typeof v.giaTriToiThieu === 'number' ? v.giaTriToiThieu : Number(v.giaTriToiThieu);
    }

    const mapped = {
      id: v.id ?? v.voucherId ?? 0,
      code: v.code ?? v.maPhieu ?? v.ma ?? '',
      type: type,
      value: value,
      maxDiscount: maxDiscount,
      minOrder: minOrder,
    } as {
      id: number;
      code: string;
      type: 'PERCENT' | 'FIXED';
      value: number;
      maxDiscount?: number;
      minOrder?: number;
    };

    console.log('🗺️ Mapped voucher:', mapped, 'from raw:', v);
    return mapped;
  }

  private refreshVoucherSuggestions(): void {
    const subtotal = this.getSubtotal();
    const discount = this.getDiscount();
    const base = Math.max(0, subtotal - discount);

    // Use the resolved customer ID if available, otherwise strict null for guests
    // Do NOT fallback to user.id as it might be different
    const customerId = this.realCustomerId;

    const collected: any[] = [];
    const voucherIds = new Set<number>(); // Để loại bỏ trùng lặp

    console.log('🔄 Refreshing voucher suggestions');
    console.log('   - Subtotal:', subtotal);
    console.log('   - Discount:', discount);
    console.log('   - Base:', base);
    console.log('   - Real CustomerId:', customerId);

    // Nếu base = 0, vẫn hiển thị phiếu để user biết có phiếu nào không
    // (nhưng sẽ filter sau khi tính discount)

    // ✅ Lấy TẤT CẢ phiếu đang hoạt động (bao gồm cả công khai và cá nhân)
    this.phieuGiamGiaService.getActivePhieuGiamGia().subscribe({
      next: (res: any) => {
        console.log('✅ Active vouchers API response:', res);
        let allActiveVouchers: any[] = [];
        if (Array.isArray(res)) {
          allActiveVouchers = res;
        } else if (res?.data && Array.isArray(res.data)) {
          allActiveVouchers = res.data;
        } else if (res?.content && Array.isArray(res.content)) {
          allActiveVouchers = res.content;
        } else if (res?.success && res?.data && Array.isArray(res.data)) {
          allActiveVouchers = res.data;
        }

        console.log('📋 Extracted all active vouchers:', allActiveVouchers.length, allActiveVouchers);

        // ✅ Lấy danh sách ID các phiếu cá nhân (luôn check để lọc phiếu private ngay cả khi chưa login)
        this.phieuGiamGiaService.getAllPhieuGiamGiaCaNhan().subscribe({
          next: (pers: any) => {
            console.log('✅ Personal vouchers API response:', pers);
            let raw: any[] = [];
            if (Array.isArray(pers)) {
              raw = pers;
            } else if (pers?.data && Array.isArray(pers.data)) {
              raw = pers.data;
            } else if (pers?.content && Array.isArray(pers.content)) {
              raw = pers.content;
            } else if (pers?.success && pers?.data && Array.isArray(pers.data)) {
              raw = pers.data;
            }

            // Lấy danh sách ID các phiếu cá nhân CỦA KHÁCH HÀNG HIỆN TẠI (nếu có)
            const personalVoucherIds = new Set<string>();
            console.log('🔍 [DEBUG] Current Customer ID:', customerId, 'Type:', typeof customerId);

            if (customerId) {
              raw.forEach((r: any) => {
                const rCustomerId = r?.khachHangId ?? r?.khachHang?.id;
                const rVoucherId = r?.phieuGiamGiaId ?? r?.phieuGiamGia?.id ?? r?.voucher?.id ?? r?.id;

                // Robust comparison: convert both to string to handle number vs string mismatches
                if (String(rCustomerId) === String(customerId)) {
                  if (rVoucherId) {
                    personalVoucherIds.add(String(rVoucherId));
                  }
                }
              });
            }
            console.log('📋 [DEBUG] Personal Voucher IDs found:', Array.from(personalVoucherIds));

            // ✅ Lọc phiếu để hiển thị (Logic thống nhất cho cả User và Guest):
            // - Phiếu công khai: không có trong bảng phieu_giam_gia_ca_nhan (bất kể của ai)
            // - Phiếu cá nhân: CÓ trong bảng phieu_giam_gia_ca_nhan VÀ thuộc về khách hàng này
            // - Phiếu của người khác: CÓ trong bảng nhưng KHÔNG thuộc khách hàng này -> ẨN
            // - Khách vãng lai (Guest): Không có personalVoucherIds -> Luôn ẩn phiếu Private -> Chỉ thấy phiếu Public
            const vouchersToShow = allActiveVouchers.filter((v: any) => {
              const voucherId = v?.id;
              if (!voucherId) return false;

              // 1. Kiểm tra xem phiếu này có phải là phiếu cá nhân (của bất kỳ ai) không?
              // Logic chuẩn POS: Nếu ID phiếu nằm trong bảng mapping (privateMappings) -> Nó là phiếu cá nhân.
              const isPrivateVoucher = raw.some((r: any) => {
                const rVoucherId = r?.phieuGiamGiaId ?? r?.phieuGiamGia?.id ?? r?.voucher?.id ?? r?.id;
                // Robust comparison
                return String(rVoucherId) === String(voucherId);
              });

              // 2. Nếu là phiếu cá nhân: 
              if (isPrivateVoucher) {
                // Chỉ hiển thị nếu nó thuộc về TÔI (personalVoucherIds)
                if (personalVoucherIds.has(String(voucherId))) {
                  return true;
                }
                // Nếu mình là Guest hoặc phiếu của người khác -> ẨN
                return false;
              }

              // 3. Nếu không phải phiếu cá nhân -> Phiếu công khai -> Hiển thị
              console.log('✅ Voucher is public:', v.code);
              return true;
            });

            console.log('📦 Filtered vouchers to show:', vouchersToShow.length, vouchersToShow);
            this.computeVoucherLists(vouchersToShow, base);
          },
          error: (err) => {
            console.error('❌ Error loading personal vouchers:', err);
            // Fallback: show all as public if checking fails? 
            // Better to show nothing private for safety, but showing all publics is okay
            console.log('⚠️ Fallback: showing all active vouchers as public due to error');
            this.computeVoucherLists(allActiveVouchers, base);
          },
        });
      },
      error: (err) => {
        console.error('❌ Error loading active vouchers:', err);
        this.computeVoucherLists([], base);
      },
    });
  }

  private computeVoucherLists(raw: any[], base: number): void {
    console.log('🔧 Computing voucher lists, raw count:', raw.length, 'base:', base);
    console.log('🔧 Raw vouchers:', raw);

    if (!raw || raw.length === 0) {
      console.log('⚠️ No raw vouchers to process');
      this.allVouchers = [];
      this.displayedVouchers = [];
      this.cdr.detectChanges();
      return;
    }

    const mapped = (raw || [])
      .map((v) => {
        const mapped = this.mapVoucher(v);
        console.log('🗺️ Mapping voucher:', v, '->', mapped);
        return mapped;
      })
      .filter((m) => {
        if (!m) {
          console.log('⚠️ Filtered out null/undefined voucher');
          return false;
        }
        // Nếu base = 0, vẫn hiển thị phiếu (nhưng discount sẽ = 0)
        // Chỉ filter theo minOrder nếu base > 0
        if (base > 0 && m.minOrder && base < m.minOrder) {
          console.log('⚠️ Filtered out voucher due to minOrder:', m.code, 'minOrder:', m.minOrder, 'base:', base);
          return false;
        }
        return true;
      });
    console.log('📊 Mapped vouchers (after minOrder filter):', mapped.length, mapped);

    const usable = mapped
      .map((m) => {
        const discount = this.computeVoucherDiscount(m, base);
        const result = { ...m, discount };
        console.log('💰 Computed discount for', m.code, ':', discount, 'base:', base);
        return result;
      })
      // Nếu base = 0, vẫn hiển thị phiếu (discount = 0) để user biết có phiếu
      // Nếu base > 0, chỉ hiển thị phiếu có discount > 0
      .filter((x) => {
        if (base > 0 && x.discount <= 0) {
          console.log('⚠️ Filtered out voucher due to discount <= 0:', x.code, 'discount:', x.discount);
          return false;
        }
        // Nếu base = 0, vẫn hiển thị (discount = 0)
        return true;
      })
      .sort((a, b) => b.discount - a.discount);
    console.log('✅ Usable vouchers (after discount > 0 filter):', usable.length, usable);

    this.allVouchers = usable;
    this.displayedVouchers = usable.slice(0, this.maxDisplayedVouchers);

    // ✅ Auto-apply best voucher logic (POS Alignment)
    if (usable.length > 0) {
      const best = usable[0]; // Best voucher is first because we sorted by discount

      // If nothing applied yet and not manually removed, apply best
      if (!this.appliedCoupon && !this.voucherManuallyRemoved) {
        console.log('✨ Auto-applying best voucher:', best.code);
        // Use internal apply to avoid notification spam or loop issues?
        // But valid method calls notification. Let's use it but maybe suppress notification?
        // For now just set it directly to avoid loop/spam
        this.appliedCoupon = best;
        this.couponCode = best.code;
        this.getTotal();
      }
      // If applied but current is invalid (not in usable list), switch to best
      else if (this.appliedCoupon) {
        const currentStillValid = usable.some(u => u.id === this.appliedCoupon?.id);
        if (!currentStillValid && !this.voucherManuallyRemoved) {
          console.log('🔄 Current voucher no longer valid/best, switching to:', best.code);
          this.appliedCoupon = best;
          this.couponCode = best.code;
          this.getTotal();
        }
      }
    } else if (this.appliedCoupon) {
      // No vouchers usable, but we have one applied?
      // Check if it's completely invalid (e.g. MinOrder fail) - usable list already filters by MinOrder
      // So if it's not in usable, it's invalid.
      if (!this.voucherManuallyRemoved) {
        this.appliedCoupon = null;
        this.couponCode = '';
        this.couponDiscount = 0;
      }
    }

    console.log('🎯 Displayed vouchers:', this.displayedVouchers.length, this.displayedVouchers);
    console.log('🎯 allVouchers:', this.allVouchers.length);

    // Force change detection
    this.cdr.detectChanges();
  }

  computeVoucherDiscount(v: any, base: number): number {
    if (v.type === 'PERCENT') {
      let d = (base * v.value) / 100;
      // POS Heuristic: Only apply maxDiscount if it's meaningful (>= 1000)
      // This handles cases where maxDiscount might be set to a small value (like 20) by mistake or convention
      if (
        v.maxDiscount !== undefined &&
        v.maxDiscount !== null &&
        v.maxDiscount >= 1000
      ) {
        d = Math.min(d, v.maxDiscount);
      }
      return Math.min(d, base);
    }
    return Math.min(v.value, base);
  }

  openVoucherModal(): void {
    this.showVoucherModal = true;
    this.voucherModalSearchTerm = '';
  }

  closeVoucherModal(): void {
    this.showVoucherModal = false;
    this.voucherModalSearchTerm = '';
  }

  get filteredVouchersForModal(): any[] {
    if (!this.voucherModalSearchTerm || this.voucherModalSearchTerm.trim() === '') {
      return this.allVouchers;
    }
    const searchTerm = this.voucherModalSearchTerm.toLowerCase().trim();
    return this.allVouchers.filter(
      (v) =>
        v.code.toLowerCase().includes(searchTerm) ||
        (v.discount && v.discount.toString().includes(searchTerm))
    );
  }
}
