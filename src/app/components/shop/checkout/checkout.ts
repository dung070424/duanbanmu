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
import { ShopHeaderComponent } from '../shared/shop-header.component';
import { ShopFooterComponent } from '../shared/shop-footer.component';
import { ChatbotComponent } from '../chatbot/chatbot.component';

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
  paymentMethod: 'cash' | 'transfer' = 'transfer';

  // Bank transfer info
  bankInfo = {
    bankName: 'MB Bank - Ngân hàng Quân đội',
    accountNumber: '0932313815',
    accountName: 'TDK Store',
    bankCode: 'MBbank',
    template: 'compact2',
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
  couponDiscount: number = 0;
  displayedVouchers: any[] = [];
  allVouchers: any[] = [];
  maxDisplayedVouchers: number = 3;
  showVoucherModal: boolean = false;
  voucherModalSearchTerm: string = '';

  constructor(
    private hoaDonChoService: HoaDonChoService,
    private hoaDonService: HoaDonService,
    private authService: AuthService,
    private customerAddressService: CustomerAddressService,
    private customerService: CustomerService,
    private phieuGiamGiaService: PhieuGiamGiaService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('🛒 CheckoutComponent ngOnInit - Starting...');

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
    this.refreshVoucherSuggestions();
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
    });

    // Force change detection để cập nhật form ngay lập tức
    this.cdr.detectChanges();
  }

  onAddressChange(): void {
    if (this.selectedAddressId) {
      const address = this.customerAddresses.find((a) => a.id === this.selectedAddressId);
      if (address) {
        this.loadAddressInfo(address);
      }
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
      alert('Vui lòng nhập đầy đủ thông tin địa chỉ!');
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      alert('Bạn cần đăng nhập để lưu địa chỉ!');
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

        // Force change detection để cập nhật UI ngay lập tức
        this.cdr.detectChanges();
        alert('Đã lưu địa chỉ thành công!');
      },
      error: (error) => {
        console.error('Error saving address:', error);

        // Force change detection
        this.cdr.detectChanges();
        alert('Không thể lưu địa chỉ. Vui lòng thử lại!');
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
      }));
    } else {
      products = this.cart?.danhSachGioHang || [];
    }

    // Tạo order summary
    this.orderSummary = {
      products: products,
      billingInfo: { ...this.billingInfo },
      paymentMethod: this.paymentMethod,
      transactionCode: this.transactionCode,
      bankInfo: { ...this.bankInfo },
      subtotal: this.getSubtotal(),
      discount: this.getDiscount(),
      couponDiscount: this.couponDiscount,
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
      alert('Vui lòng nhập đầy đủ họ và tên!');
      return false;
    }

    // Validate địa chỉ
    if (!this.billingInfo.address || this.billingInfo.address.trim() === '') {
      alert('Vui lòng nhập địa chỉ chi tiết!');
      return false;
    }

    // Validate tỉnh/thành phố
    if (!this.billingInfo.city || this.billingInfo.city.trim() === '') {
      alert('Vui lòng nhập tỉnh/thành phố!');
      return false;
    }

    // Validate số điện thoại
    if (!this.billingInfo.phone || this.billingInfo.phone.trim() === '') {
      alert('Vui lòng nhập số điện thoại!');
      return false;
    }

    // Validate format số điện thoại (10-11 số)
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(this.billingInfo.phone.replace(/\s+/g, ''))) {
      alert('Số điện thoại không hợp lệ! Vui lòng nhập 10-11 chữ số.');
      return false;
    }

    // Validate email
    if (!this.billingInfo.email || this.billingInfo.email.trim() === '') {
      alert('Vui lòng nhập email!');
      return false;
    }

    // Validate format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.billingInfo.email)) {
      alert('Email không hợp lệ! Vui lòng nhập email đúng định dạng.');
      return false;
    }

    // Kiểm tra giỏ hàng từ cart hoặc tempCart
    const hasCartItems =
      (this.cart && this.cart.danhSachGioHang && this.cart.danhSachGioHang.length > 0) ||
      (this.isTempCart && this.tempCart && this.tempCart.length > 0);
    if (!hasCartItems) {
      alert('Giỏ hàng của bạn đang trống!');
      return false;
    }

    // Validate mã giao dịch nếu thanh toán bằng chuyển khoản
    if (
      this.paymentMethod === 'transfer' &&
      (!this.transactionCode || this.transactionCode === '')
    ) {
      alert('Vui lòng tạo mã giao dịch!');
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

  placeOrder(): void {
    // Validate form trước khi đặt hàng
    if (!this.validateForm()) {
      this.isSubmitting = false;
      return;
    }

    this.isSubmitting = true;
    this.error = '';

    const currentUser = this.authService.getCurrentUser();

    // Bước 1: Lưu địa chỉ vào DB nếu cần (cho khách hàng đã đăng nhập)
    this.saveOrUpdateCustomerAddress().then(() => {
      // Bước 2: Tạo hoá đơn sau khi đã lưu địa chỉ
      this.createInvoice(currentUser);
    });
  }

  /**
   * Tạo hoá đơn
   */
  createInvoice(currentUser: any): void {
    // Lấy danh sách sản phẩm từ cart hoặc tempCart
    let cartItems: any[] = [];
    if (this.isTempCart && this.tempCart && this.tempCart.length > 0) {
      cartItems = this.tempCart.map((item: any) => ({
        chiTietSanPhamId: item.chiTietSanPhamId,
        tenSanPham: item.productName || '',
        soLuong: item.quantity || 1,
        donGia: item.price || 0,
        giamGia: 0,
        thanhTien: item.totalItemPrice || item.price * (item.quantity || 1),
      }));
    } else if (this.cart && this.cart.danhSachGioHang) {
      cartItems = this.cart.danhSachGioHang.map((item) => ({
        chiTietSanPhamId: item.chiTietSanPhamId,
        tenSanPham: item.tenSanPham || '',
        soLuong: item.soLuong || 1,
        donGia: item.donGia || 0,
        giamGia: item.giamGia || 0,
        thanhTien: item.thanhTien || item.donGia * (item.soLuong || 1) - (item.giamGia || 0),
      }));
    }

    if (cartItems.length === 0) {
      alert('Giỏ hàng của bạn đang trống!');
      this.isSubmitting = false;
      return;
    }

    // QUAN TRỌNG: Kiểm tra tồn kho và tính lại tổng tiền trước khi tạo hóa đơn
    // Tạm thời bỏ qua validation để test nhanh
    // this.validateStockAndRecalculate().then((validated) => {
    //   if (!validated) {
    //     this.isSubmitting = false;
    //     return;
    //   }

    // Tạo hóa đơn từ HoaDonCho hoặc tempCart
    // QUAN TRỌNG: Không set nhanVienId để đánh dấu đơn hàng online (nhanVienId = null = Online)
    // Backend sẽ tự động map nhanVienId = null thành viTriBanHang = "Online"
    // CHO PHÉP khachHangId = null để test không cần đăng nhập
    const hoaDonData: any = {
      maHoaDon: `HD${Date.now()}`,
      khachHangId: currentUser?.id || null, // Cho phép null để test
      tenKhachHang: `${this.billingInfo?.firstName || ''} ${
        this.billingInfo?.lastName || ''
      }`.trim(),
      soDienThoaiKhachHang: this.billingInfo?.phone || '',
      emailKhachHang: this.billingInfo?.email || '',
      diaChiChiTiet: this.billingInfo?.address || '',
      tinhThanh:
        this.billingInfo?.city && this.billingInfo.city.split(',').length > 2
          ? this.billingInfo.city.split(',')[2]?.trim()
          : this.billingInfo?.city || '',
      quanHuyen:
        this.billingInfo?.city && this.billingInfo.city.split(',').length > 1
          ? this.billingInfo.city.split(',')[1]?.trim()
          : '',
      phuongXa: this.billingInfo?.city?.split(',')[0]?.trim() || '',
      ghiChu: this.orderNotes || '',
      trangThai: 'CHO_XAC_NHAN',
      // KHÔNG set nhanVienId - để null = Online order
      // KHÔNG set viTriBanHang - backend sẽ tự động map từ nhanVienId
      phuongThucThanhToan: this.paymentMethod === 'transfer' ? 'transfer' : 'cash',
      // Map danhSachGioHang từ cart hoặc tempCart sang danhSachChiTiet
      danhSachChiTiet: cartItems,
      tongTien: this.getSubtotal(),
      thanhTien: this.getTotal(),
      tienGiamGia: (this.getDiscount() || 0) + (this.couponDiscount || 0),
      phieuGiamGiaId: this.appliedCoupon?.id || null,
      soLuongSanPham: this.getTotalItems(),
    };

    // Nếu thanh toán bằng chuyển khoản, thêm thông tin giao dịch vào ghi chú
    if (this.paymentMethod === 'transfer') {
      const transferNote = `Mã giao dịch: ${this.transactionCode || ''}\nNgân hàng: ${
        this.bankInfo?.bankName || ''
      }\nSố tài khoản: ${this.bankInfo?.accountNumber || ''}\nChủ tài khoản: ${
        this.bankInfo?.accountName || ''
      }`;
      hoaDonData.ghiChu = hoaDonData.ghiChu
        ? `${hoaDonData.ghiChu}\n\n${transferNote}`
        : transferNote;
    }

    // Tạo hóa đơn
    console.log('📤 Creating invoice from cart:', {
      cartId: this.cartId,
      cartItems: this.cart?.danhSachGioHang?.length || 0,
      hoaDonData: {
        ...hoaDonData,
        danhSachChiTiet: hoaDonData.danhSachChiTiet?.length || 0,
      },
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
            },
            error: (err) => {
              console.error('Error deleting cart:', err);
              // Không block flow nếu xóa cart thất bại
            },
          });
        } else {
          // Xóa giỏ hàng tạm nếu không có cartId
          localStorage.removeItem('temp_cart');
        }

        // Lưu hoá đơn đã tạo để hiển thị chi tiết
        this.createdInvoice = hoaDon;

        // Hiển thị chi tiết hoá đơn
        this.showInvoiceDetails = true;
        this.isSubmitting = false;

        // Force change detection để hiển thị invoice details ngay lập tức
        this.cdr.detectChanges();
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

        // Force change detection
        this.cdr.detectChanges();
        alert(`Lỗi: ${errorMsg}`);
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
      alert('Giỏ hàng của bạn đang trống!');
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
            alert(
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

            if (!confirm(confirmMessage)) {
              resolve(false);
              return;
            }
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

    // Tính coupon discount
    this.couponDiscount = 0;
    if (this.appliedCoupon) {
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

    return Math.max(0, base - this.couponDiscount);
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
    return `https://img.vietqr.io/image/${this.bankInfo.bankCode}-${this.bankInfo.accountNumber}-${
      this.bankInfo.template || 'compact2'
    }.png?addInfo=${encodeURIComponent(description)}${amountQuery}`;
  }

  copyTransactionCode(): void {
    if (!this.transactionCode) return;
    navigator.clipboard.writeText(this.transactionCode).then(() => {
      alert('Đã sao chép mã giao dịch!');
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
          this.applyCouponFromSuggestion(this.mapVoucher(v));
          this.cdr.detectChanges();
        }
      },
      error: () => {},
    });
  }

  applyCouponFromSuggestion(v: any): void {
    const mapped = this.mapVoucher(v);
    this.appliedCoupon = mapped;
    this.couponCode = mapped.code;
    this.cdr.detectChanges();
  }

  removeCoupon(): void {
    this.appliedCoupon = null;
    this.couponCode = '';
    this.couponDiscount = 0;
    this.cdr.detectChanges();
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

  private refreshVoucherSuggestions(): void {
    const base = Math.max(0, this.getSubtotal() - this.getDiscount());
    const currentUser = this.authService.getCurrentUser();
    const customerId = currentUser?.id;
    const collected: any[] = [];

    // Lấy mã chung đang hoạt động
    this.phieuGiamGiaService.getActivePhieuGiamGia().subscribe({
      next: (res: any) => {
        const general = (res?.data || res?.content || res || []) as any[];
        collected.push(...general);
        if (customerId) {
          // Lấy toàn bộ mã cá nhân rồi lọc theo khách hàng hiện tại
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
    this.allVouchers = usable;
    this.displayedVouchers = usable.slice(0, this.maxDisplayedVouchers);
    this.cdr.detectChanges();
  }

  private computeVoucherDiscount(v: any, base: number): number {
    if (v.type === 'PERCENT') {
      let d = (base * v.value) / 100;
      if (v.maxDiscount !== undefined && v.maxDiscount !== null) d = Math.min(d, v.maxDiscount);
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
