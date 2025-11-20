import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HoaDonChoService, HoaDonCho, GioHangChoItem } from '../../../services/hoa-don-cho.service';
import { AuthService } from '../../../services/auth';
import { ColorApiService, ColorResponse } from '../../../services/color-api.service';
import { SizeApiService, SizeResponse } from '../../../services/size-api.service';
import { ShopHeaderComponent } from '../shared/shop-header.component';
import { ShopFooterComponent } from '../shared/shop-footer.component';
import { ChatbotComponent } from '../chatbot/chatbot.component';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ShopHeaderComponent, ShopFooterComponent, ChatbotComponent],
  templateUrl: './cart.html',
  styleUrls: ['./cart.scss']
})
export class CartComponent implements OnInit {
  cart: HoaDonCho | null = null;
  tempCart: any[] = []; // Giỏ hàng tạm từ localStorage
  isTempCart = false; // Flag để biết đang hiển thị giỏ hàng tạm hay DB
  error = '';
  currentHoaDonChoId: number | null = null;
  cartItems: any[] = []; // Cache danh sách sản phẩm để tránh gọi getCartItems() nhiều lần
  isLoading = false; // Flag để biết đang load cart hay chưa - Đặt false để hiển thị ngay
  showItemDetail = false;
  selectedItem: any = null;
  detailQuantity = 1;
  detailColor = '';
  detailSize = '';
  availableColors: ColorResponse[] = [];
  availableSizes: SizeResponse[] = [];
  bankTransferInfo = {
    bankName: 'MB Bank - Ngân hàng Quân đội',
    accountName: 'CÔNG TY TDK STUDIO',
    accountNumber: '987654321',
    branch: 'Chi nhánh Sài Gòn',
    bankCode: 'MBbank',
    template: 'compact2',
    note: 'Nội dung chuyển khoản sẽ tự động chèn mã đơn để hệ thống khớp thanh toán.'
  };

  constructor(
    private hoaDonChoService: HoaDonChoService,
    private authService: AuthService,
    private router: Router,
    private location: Location,
    private cdr: ChangeDetectorRef,
    private colorApiService: ColorApiService,
    private sizeApiService: SizeApiService
  ) {}

  ngOnInit(): void {
    // Không kiểm tra quyền - giỏ hàng là public
    console.log('🛒 CartComponent ngOnInit - Loading cart...');
    console.log('   - isLoggedIn:', this.authService.isLoggedIn());
    
    // QUAN TRỌNG: Load dữ liệu ngay lập tức từ localStorage trước (đồng bộ)
    // Sau đó mới load từ DB nếu đã đăng nhập (bất đồng bộ)
    const tempCartData = localStorage.getItem('temp_cart');
    console.log('🛒 ngOnInit - temp_cart in localStorage:', tempCartData ? 'EXISTS' : 'NOT FOUND');
    
    // Load ngay từ localStorage nếu có (đồng bộ - hiển thị ngay)
    if (tempCartData && tempCartData.trim() !== '' && tempCartData !== 'null') {
      try {
        const parsed = JSON.parse(tempCartData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.tempCart = parsed;
          this.isTempCart = true;
          this.cart = null;
          // QUAN TRỌNG: Update cache ngay để hiển thị
          this.updateCartItemsCache();
          // Force change detection để Angular render ngay
          this.cdr.detectChanges();
          console.log('✅ ngOnInit - Loaded tempCart immediately, length:', this.tempCart.length);
          console.log('✅ ngOnInit - cartItems.length after update:', this.cartItems.length);
        } else {
          this.tempCart = [];
          this.cartItems = [];
        }
      } catch (e) {
        console.error('🛒 ngOnInit - Error parsing temp_cart:', e);
        this.tempCart = [];
        this.cartItems = [];
      }
    } else {
      // Không có temp cart, khởi tạo rỗng
      this.tempCart = [];
      this.cartItems = [];
    }

    this.loadReferenceData();

    // Sau đó load từ DB nếu đã đăng nhập (bất đồng bộ - update sau)
    if (this.authService.isLoggedIn()) {
      console.log('   - User logged in, loading cart from DB...');
      this.loadCart();
    } else if (!this.tempCart || this.tempCart.length === 0) {
      // Chỉ gọi loadTempCart nếu chưa có dữ liệu từ localStorage
      console.log('   - User not logged in, no temp cart data, calling loadTempCart...');
      this.loadTempCart();
    }
  }

  loadCart(): void {
    this.isLoading = false; // Không hiển thị loading, hiển thị dữ liệu ngay
    this.error = '';
    this.isTempCart = false;

    // Lấy hoặc tạo HoaDonCho cho khách hàng
    const customerId = this.authService.getCurrentUser()?.id;
    console.log('🛒 loadCart - customerId:', customerId);
    
    if (!customerId) {
      // Nếu chưa đăng nhập, load giỏ hàng tạm
      console.log('⚠️ loadCart - No customerId, loading temp cart');
      this.loadTempCart();
      return;
    }

    // Nếu đã đăng nhập, lấy cart của khách hàng từ DB
    console.log('🛒 loadCart - Fetching cart from DB for customerId:', customerId);
    this.hoaDonChoService.getHoaDonChoByKhachHangId(customerId).subscribe({
      next: (carts) => {
        console.log('✅ loadCart - Received carts from DB:', carts);
        console.log('   - carts length:', carts?.length || 0);
        
        if (carts && carts.length > 0) {
          // Lấy cart đầu tiên có trạng thái DANG_CHO
          const activeCart = carts.find(c => c.trangThai === 'DANG_CHO') || carts[0];
          console.log('✅ loadCart - Active cart:', activeCart);
          console.log('   - cart items count:', activeCart.danhSachGioHang?.length || 0);
          
          // QUAN TRỌNG: Nếu cart DB trống nhưng có temp_cart, ưu tiên hiển thị temp_cart
          if (!activeCart.danhSachGioHang || activeCart.danhSachGioHang.length === 0) {
            const tempCartData = localStorage.getItem('temp_cart');
            if (tempCartData) {
              try {
                const tempCart = JSON.parse(tempCartData);
                if (tempCart && tempCart.length > 0) {
                  console.log('⚠️ loadCart - DB cart is empty but temp_cart has items, loading temp_cart');
                  this.loadTempCart();
                  return;
                }
              } catch (e) {
                console.error('Error parsing temp_cart:', e);
              }
            }
          }
          
          this.currentHoaDonChoId = activeCart.id!;
          this.cart = activeCart;
          this.isTempCart = false; // Đảm bảo flag đúng
          // Update cartItems cache ngay để hiển thị
          this.updateCartItemsCache();
          // Force change detection để Angular render ngay
          this.cdr.detectChanges();
          console.log('✅ loadCart - Updated cartItems from DB, length:', this.cartItems.length);
          this.isLoading = false; // Đã tắt loading
        } else {
          console.log('⚠️ loadCart - No carts found in DB');
          // Kiểm tra xem có temp_cart không
          const tempCartData = localStorage.getItem('temp_cart');
          if (tempCartData) {
            try {
              const tempCart = JSON.parse(tempCartData);
              if (tempCart && tempCart.length > 0) {
                console.log('⚠️ loadCart - No DB cart but temp_cart has items, loading temp_cart');
                this.loadTempCart();
                return;
              }
            } catch (e) {
              console.error('Error parsing temp_cart:', e);
            }
          }
          console.log('⚠️ loadCart - Creating new cart');
          this.createNewCart();
          this.isLoading = false; // Đã tắt loading
        }
      },
      error: (error) => {
        // Xử lý lỗi một cách graceful
        if (error.status === 0 || error.status === undefined) {
          // Connection refused - backend không khả dụng, fallback to temp cart
          console.warn('⚠️ Backend không khả dụng, sử dụng giỏ hàng tạm');
          this.loadTempCart();
        } else {
          console.error('❌ Error loading cart:', error);
          console.error('   - Status:', error.status);
          console.error('   - Message:', error.message);
          this.error = 'Không thể tải giỏ hàng. Vui lòng thử lại!';
          // Fallback: thử load temp cart nếu có
          console.log('⚠️ loadCart - Error occurred, falling back to temp_cart');
          this.loadTempCart();
        }
      }
    });
  }

  private loadReferenceData(): void {
    this.colorApiService.getAllActive().subscribe({
      next: (colors) => (this.availableColors = colors),
      error: (error) => console.warn('⚠️ Không thể tải danh sách màu sắc:', error)
    });
    this.sizeApiService.getAllActive().subscribe({
      next: (sizes) => (this.availableSizes = sizes),
      error: (error) => console.warn('⚠️ Không thể tải danh sách kích cỡ:', error)
    });
  }

  /**
   * Load giỏ hàng tạm từ localStorage
   */
  loadTempCart(): void {
    this.isTempCart = true;
    this.cart = null;
    this.isLoading = false; // Không hiển thị loading, hiển thị dữ liệu ngay
    
    try {
      const tempCartData = localStorage.getItem('temp_cart');
      console.log('🛒 loadTempCart - tempCartData from localStorage:', tempCartData);
      console.log('🛒 loadTempCart - typeof tempCartData:', typeof tempCartData);
      
      if (tempCartData && tempCartData.trim() !== '' && tempCartData !== 'null') {
        try {
          this.tempCart = JSON.parse(tempCartData);
          console.log('✅ loadTempCart - Parsed tempCart:', this.tempCart);
          console.log('   - tempCart type:', Array.isArray(this.tempCart) ? 'ARRAY' : typeof this.tempCart);
          console.log('   - tempCart length:', this.tempCart.length);
          console.log('   - tempCart items:', this.tempCart);
          
          // Đảm bảo tempCart là array
          if (!Array.isArray(this.tempCart)) {
            console.warn('⚠️ loadTempCart - tempCart is not an array, resetting to []');
            console.warn('   - tempCart value:', this.tempCart);
            this.tempCart = [];
          } else if (this.tempCart.length === 0) {
            console.log('⚠️ loadTempCart - tempCart is an empty array');
          }
        } catch (parseError) {
          console.error('❌ Error parsing tempCart JSON:', parseError);
          console.error('   - Raw data:', tempCartData);
          this.tempCart = [];
        }
      } else {
        console.log('⚠️ loadTempCart - No temp_cart in localStorage or empty/null');
        this.tempCart = [];
      }
      
      // Update cartItems cache ngay để hiển thị
      this.updateCartItemsCache();
      // Force change detection để Angular render ngay
      this.cdr.detectChanges();
      console.log('🛒 loadTempCart - Final state:');
      console.log('   - tempCart.length:', this.tempCart.length);
      console.log('   - cartItems.length:', this.cartItems.length);
      console.log('   - cartItems:', this.cartItems);
      this.isLoading = false;
    } catch (error) {
      console.error('❌ Error loading temp cart:', error);
      this.tempCart = [];
      this.error = 'Không thể tải giỏ hàng tạm. Vui lòng thử lại!';
      this.updateCartItemsCache();
      this.isLoading = false;
    }
  }

  loadCartById(id: number): void {
    this.hoaDonChoService.getHoaDonChoById(id).subscribe({
      next: (cart) => {
        this.cart = cart;
        this.updateCartItemsCache();
      },
      error: (error) => {
        console.error('Error loading cart:', error);
        this.error = 'Không thể tải giỏ hàng. Vui lòng thử lại!';
      }
    });
  }

  createNewCart(): void {
    const customerId = this.authService.getCurrentUser()?.id;
    const maHoaDonCho = `HDC${Date.now()}`;
    
    const newCart: Partial<HoaDonCho> = {
      maHoaDonCho: maHoaDonCho,
      khachHangId: customerId || undefined,
      trangThai: 'DANG_CHO',
      danhSachGioHang: []
    };

    this.hoaDonChoService.createHoaDonCho(newCart).subscribe({
      next: (cart) => {
        this.cart = cart;
        this.currentHoaDonChoId = cart.id!;
        localStorage.setItem('current_cart_id', cart.id!.toString());
        this.updateCartItemsCache();
      },
      error: (error) => {
        console.error('Error creating cart:', error);
        this.error = 'Không thể tạo giỏ hàng. Vui lòng thử lại!';
      }
    });
  }

  updateQuantity(item: GioHangChoItem | any, newQuantity: number): void {
    // Nếu là giỏ hàng tạm
    if (this.isTempCart) {
      const tempItem = item as any;
      if (tempItem.chiTietSanPhamId && newQuantity >= 1) {
        const index = this.tempCart.findIndex((i: any) => i.chiTietSanPhamId === tempItem.chiTietSanPhamId);
        if (index >= 0) {
          this.tempCart[index].quantity = newQuantity;
          this.tempCart[index].totalItemPrice = this.tempCart[index].quantity * this.tempCart[index].price;
          localStorage.setItem('temp_cart', JSON.stringify(this.tempCart));
          this.updateCartItemsCache();
          this.refreshDetailQuantityIfNeeded(item);
        }
      }
      return;
    }

    // Nếu là giỏ hàng DB
    if (!this.currentHoaDonChoId || !item.id || newQuantity < 1) return;

    this.hoaDonChoService.updateCartItemQuantity(
      this.currentHoaDonChoId,
      item.id,
      newQuantity
    ).subscribe({
      next: (updatedCart) => {
        this.cart = updatedCart;
        this.updateCartItemsCache();
        this.refreshDetailQuantityIfNeeded(item);
      },
      error: (error) => {
        console.error('Error updating quantity:', error);
        alert('Không thể cập nhật số lượng. Vui lòng thử lại!');
      }
    });
  }

  removeItem(item: GioHangChoItem | any): void {
    // Nếu là giỏ hàng tạm
    if (this.isTempCart) {
      const tempItem = item as any;
      if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng?')) {
        return;
      }
      
      if (tempItem.chiTietSanPhamId) {
        this.tempCart = this.tempCart.filter((i: any) => i.chiTietSanPhamId !== tempItem.chiTietSanPhamId);
        localStorage.setItem('temp_cart', JSON.stringify(this.tempCart));
        this.updateCartItemsCache();
      }
      return;
    }

    // Nếu là giỏ hàng DB
    if (!this.currentHoaDonChoId || !item.id) return;

    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng?')) {
      return;
    }

    this.hoaDonChoService.removeItemFromCart(
      this.currentHoaDonChoId,
      item.id
    ).subscribe({
      next: (updatedCart) => {
        this.cart = updatedCart;
        this.updateCartItemsCache();
      },
      error: (error) => {
        console.error('Error removing item:', error);
        alert('Không thể xóa sản phẩm. Vui lòng thử lại!');
      }
    });
  }

  proceedToCheckout(): void {
    // Kiểm tra giỏ hàng tạm
    if (this.isTempCart) {
      if (!this.tempCart || this.tempCart.length === 0) {
        alert('Giỏ hàng của bạn đang trống!');
        return;
      }
      
      // Đảm bảo tempCart được lưu vào localStorage
      localStorage.setItem('temp_cart', JSON.stringify(this.tempCart));
      console.log('🛒 proceedToCheckout - Saved temp_cart to localStorage, items:', this.tempCart.length);
      
      // CHO PHÉP thanh toán không cần đăng nhập (để test)
      // Chuyển đến checkout với tempCart
      this.router.navigate(['/shop/checkout']);
      return;
      
      // Code cũ: yêu cầu đăng nhập
      // if (!this.authService.isLoggedIn()) {
      //   if (confirm('Bạn cần đăng nhập để thanh toán. Bạn có muốn đăng nhập ngay không?')) {
      //     this.router.navigate(['/login'], { queryParams: { returnUrl: '/shop/checkout' } });
      //   }
      //   return;
      // }
      // 
      // // Nếu đã đăng nhập, merge giỏ hàng tạm vào DB trước
      // this.mergeTempCartToDB();
      // return;
    }

    // Kiểm tra giỏ hàng DB
    if (!this.cart || !this.cart.danhSachGioHang || this.cart.danhSachGioHang.length === 0) {
      // Nếu DB cart rỗng, thử load từ localStorage
      const tempCartData = localStorage.getItem('temp_cart');
      if (tempCartData) {
        try {
          const tempCart = JSON.parse(tempCartData);
          if (Array.isArray(tempCart) && tempCart.length > 0) {
            console.log('🛒 proceedToCheckout - DB cart empty, using tempCart from localStorage');
            this.router.navigate(['/shop/checkout']);
            return;
          }
        } catch (e) {
          console.error('Error parsing temp_cart:', e);
        }
      }
      alert('Giỏ hàng của bạn đang trống!');
      return;
    }

    // Kiểm tra đăng nhập (CHO PHÉP thanh toán không cần đăng nhập để test)
    // if (!this.authService.isLoggedIn()) {
    //   if (confirm('Bạn cần đăng nhập để thanh toán. Bạn có muốn đăng nhập ngay không?')) {
    //     this.router.navigate(['/login'], { queryParams: { returnUrl: '/shop/checkout' } });
    //   }
    //   return;
    // }

    // Chuyển đến trang checkout với cartId
    if (this.currentHoaDonChoId) {
      console.log('🛒 proceedToCheckout - Navigating to checkout with cartId:', this.currentHoaDonChoId);
      this.router.navigate(['/shop/checkout'], { 
        queryParams: { cartId: this.currentHoaDonChoId } 
      });
    } else {
      // Không có cartId, vẫn navigate để load từ localStorage
      console.log('🛒 proceedToCheckout - No cartId, navigating to checkout (will load from localStorage)');
      this.router.navigate(['/shop/checkout']);
    }
  }

  /**
   * Merge giỏ hàng tạm vào DB
   */
  mergeTempCartToDB(): void {
    if (this.tempCart.length === 0) {
      return;
    }

    // Lấy hoặc tạo giỏ hàng trong DB
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      return;
    }

    this.hoaDonChoService.getHoaDonChoByKhachHangId(currentUser.id).subscribe({
      next: (carts) => {
        let cartId: number;
        
        if (carts && carts.length > 0) {
          const activeCart = carts.find(c => c.trangThai === 'DANG_CHO') || carts[0];
          cartId = activeCart.id!;
        } else {
          // Tạo giỏ hàng mới
          const maHoaDonCho = `HDC${Date.now()}`;
          const newCart: Partial<HoaDonCho> = {
            maHoaDonCho: maHoaDonCho,
            khachHangId: currentUser.id,
            trangThai: 'DANG_CHO',
            danhSachGioHang: []
          };
          
          this.hoaDonChoService.createHoaDonCho(newCart).subscribe({
            next: (cart) => {
              if (cart.id) {
                this.mergeItemsToCart(cart.id);
              }
            },
            error: (error) => {
              console.error('Error creating cart for merge:', error);
            }
          });
          return;
        }

        this.mergeItemsToCart(cartId);
      },
      error: (error) => {
        console.error('Error loading cart for merge:', error);
      }
    });
  }

  /**
   * Merge các items từ temp cart vào DB cart
   */
  mergeItemsToCart(cartId: number): void {
    let mergedCount = 0;
    let totalItems = this.tempCart.length;

    this.tempCart.forEach((tempItem: any) => {
      const cartItem: GioHangChoItem = {
        chiTietSanPhamId: tempItem.chiTietSanPhamId,
        tenSanPham: tempItem.productName,
        soLuong: tempItem.quantity,
        donGia: tempItem.price,
        giamGia: 0,
        thanhTien: tempItem.totalItemPrice
      };

      this.hoaDonChoService.addItemToCart(cartId, cartItem).subscribe({
        next: () => {
          mergedCount++;
          if (mergedCount === totalItems) {
            // Đã merge xong
            console.log('✅ Merged all temp cart items');
            localStorage.removeItem('temp_cart');
            this.currentHoaDonChoId = cartId;
            localStorage.setItem('current_cart_id', cartId.toString());
            // Reload cart và chuyển đến checkout
            this.loadCart();
            setTimeout(() => {
              this.router.navigate(['/shop/checkout'], { 
                queryParams: { cartId: cartId } 
              });
            }, 500);
          }
        },
        error: (error) => {
          console.error('Error merging item:', error);
          mergedCount++;
          if (mergedCount === totalItems) {
            // Đã xử lý xong (có thể có lỗi)
            if (mergedCount > 0) {
              localStorage.removeItem('temp_cart');
              this.loadCart();
            }
          }
        }
      });
    });
  }

  formatCurrency(amount: number | undefined): string {
    if (!amount) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  getSubtotal(): number {
    if (this.isTempCart) {
      return this.tempCart.reduce((sum, item) => sum + (item.totalItemPrice || 0), 0);
    }
    if (!this.cart || !this.cart.danhSachGioHang) return 0;
    return this.cart.danhSachGioHang.reduce((sum, item) => {
      return sum + (item.thanhTien || 0);
    }, 0);
  }

  getTotal(): number {
    return this.getSubtotal();
  }

  getTotalItems(): number {
    if (this.isTempCart) {
      return this.tempCart.reduce((sum, item) => sum + (item.quantity || 0), 0);
    }
    if (!this.cart || !this.cart.danhSachGioHang) return 0;
    return this.cart.danhSachGioHang.reduce((sum, item) => {
      return sum + (item.soLuong || 0);
    }, 0);
  }

  /**
   * Update cache cho cartItems
   */
  updateCartItemsCache(): void {
    if (this.isTempCart) {
      this.cartItems = Array.isArray(this.tempCart)
        ? this.tempCart.map(item => ({
            ...item
          }))
        : [];
      console.log('🛒 updateCartItemsCache - Updated from tempCart, length:', this.cartItems.length);
    } else if (this.cart && this.cart.danhSachGioHang) {
      // Map từ GioHangChoItem sang format giống temp cart
      this.cartItems = this.cart.danhSachGioHang.map(item => {
        const gioHangItem = item as GioHangChoItem & { mauSac?: string; kichThuoc?: string };
        return {
          productId: gioHangItem.chiTietSanPhamId,
          chiTietSanPhamId: gioHangItem.chiTietSanPhamId,
          productName: gioHangItem.tenSanPham || '',
          quantity: gioHangItem.soLuong || 0,
          price: gioHangItem.donGia || 0,
          totalItemPrice: gioHangItem.thanhTien || 0,
          imageUrl: '', // Cần lấy từ product
          id: gioHangItem.id,
          mauSac: gioHangItem.mauSac || '',
          kichThuoc: gioHangItem.kichThuoc || ''
        };
      });
      console.log('🛒 updateCartItemsCache - Updated from cart.danhSachGioHang, length:', this.cartItems.length);
    } else {
      this.cartItems = [];
      console.log('🛒 updateCartItemsCache - No cart data, set to empty array');
    }
  }

  /**
   * Lấy danh sách sản phẩm để hiển thị (từ DB hoặc temp cart)
   * Sử dụng cache để tránh tính toán lại nhiều lần
   */
  getCartItems(): any[] {
    // Nếu cache chưa được update, update ngay
    if (this.cartItems.length === 0 && ((this.isTempCart && this.tempCart.length > 0) || 
        (!this.isTempCart && this.cart && this.cart.danhSachGioHang && this.cart.danhSachGioHang.length > 0))) {
      console.log('🛒 getCartItems - Cache is empty but data exists, updating cache...');
      this.updateCartItemsCache();
    }
    
    console.log('🛒 getCartItems - Returning cached items, length:', this.cartItems.length);
    return this.cartItems;
  }

  getLocalStorageCart(): string {
    try {
      const tempCart = localStorage.getItem('temp_cart');
      if (tempCart) {
        const parsed = JSON.parse(tempCart);
        return `[${parsed.length} items] ${JSON.stringify(parsed).substring(0, 100)}...`;
      }
      return 'EMPTY';
    } catch (e: any) {
      return 'ERROR: ' + (e?.message || e);
    }
  }

  forceRefresh(): void {
    console.log('🔄 Force refresh cart...');
    // Reload từ localStorage
    const tempCartData = localStorage.getItem('temp_cart');
    if (tempCartData && tempCartData.trim() !== '' && tempCartData !== 'null') {
      try {
        this.tempCart = JSON.parse(tempCartData);
        if (Array.isArray(this.tempCart) && this.tempCart.length > 0) {
          this.isTempCart = true;
          this.cart = null;
          this.updateCartItemsCache();
          // Force change detection
          this.cdr.detectChanges();
          console.log('✅ Force refresh - Loaded tempCart, length:', this.tempCart.length);
        } else {
          this.tempCart = [];
          this.cartItems = [];
        }
      } catch (e) {
        console.error('Error parsing temp_cart:', e);
        this.tempCart = [];
        this.cartItems = [];
      }
    } else {
      this.tempCart = [];
      this.cartItems = [];
    }
    
    // Nếu đã đăng nhập, reload từ DB
    if (this.authService.isLoggedIn()) {
      this.loadCart();
    }
  }

  /**
   * Quay lại trang trước
   */
  goBack(): void {
    // Nếu có lịch sử trình duyệt, quay lại
    if (window.history.length > 1) {
      this.location.back();
    } else {
      // Nếu không có lịch sử, chuyển về trang chủ
      this.router.navigate(['/shop']);
    }
  }

  openItemDetail(item: any): void {
    this.selectedItem = item;
    this.detailQuantity = item.quantity || item.soLuong || 1;
    this.detailColor = item.mauSac || '';
    this.detailSize = item.kichThuoc || '';
    this.showItemDetail = true;
  }

  closeItemDetail(): void {
    this.showItemDetail = false;
    this.selectedItem = null;
  }

  saveItemDetail(): void {
    if (!this.selectedItem) {
      return;
    }
    const currentQty = this.selectedItem.quantity || this.selectedItem.soLuong || 1;
    if (this.detailQuantity !== currentQty) {
      this.updateQuantity(this.selectedItem, this.detailQuantity);
    }
    this.applyDetailUpdates(this.selectedItem, {
      soLuong: this.detailQuantity,
      quantity: this.detailQuantity,
      mauSac: this.detailColor,
      kichThuoc: this.detailSize
    });
    this.updateCartItemsCache();
    this.closeItemDetail();
  }

  removeItemFromDetail(): void {
    if (!this.selectedItem) {
      return;
    }
    this.removeItem(this.selectedItem);
    this.closeItemDetail();
  }

  decreaseDetailQuantity(): void {
    this.detailQuantity = Math.max(1, this.detailQuantity - 1);
  }

  increaseDetailQuantity(): void {
    this.detailQuantity = this.detailQuantity + 1;
  }

  getTransferQrUrl(): string {
    const amount = Math.round(this.getTotal() || 0);
    const description = this.getTransferDescription();
    const amountQuery = amount > 0 ? `&amount=${amount}` : '';
    return `https://img.vietqr.io/image/${this.bankTransferInfo.bankCode}-${this.bankTransferInfo.accountNumber}-${this.bankTransferInfo.template || 'compact2'}.png?addInfo=${encodeURIComponent(description)}${amountQuery}`;
  }

  getTransferDescription(): string {
    return `TDK ${this.cart?.maHoaDonCho || 'TEMP'} ${new Date().getFullYear()}`;
  }

  private refreshDetailQuantityIfNeeded(item: any): void {
    if (this.selectedItem && this.getItemKey(this.selectedItem) === this.getItemKey(item)) {
      this.detailQuantity = item.quantity || item.soLuong || 1;
    }
  }

  private getItemKey(item: any): string {
    if (!item) {
      return '';
    }
    if (item.id) {
      return `db_${item.id}`;
    }
    return `temp_${item.chiTietSanPhamId || item.productId || item.productName}`;
  }

  private applyDetailUpdates(item: any, updates: Record<string, any>): void {
    const key = this.getItemKey(item);
    const updater = (target: any) => {
      Object.assign(target, updates);
      if (target.quantity !== undefined) {
        target.totalItemPrice = (target.quantity || 0) * (target.price || 0);
      }
      if (target.soLuong !== undefined) {
        target.thanhTien = (target.soLuong || 0) * (target.donGia || 0);
      }
    };
    if (this.isTempCart) {
      const index = this.tempCart.findIndex(temp => this.getItemKey(temp) === key);
      if (index >= 0) {
        updater(this.tempCart[index]);
        localStorage.setItem('temp_cart', JSON.stringify(this.tempCart));
      }
    } else if (this.cart?.danhSachGioHang) {
      const index = this.cart.danhSachGioHang.findIndex(gi => this.getItemKey(gi) === key);
      if (index >= 0) {
        updater(this.cart.danhSachGioHang[index]);
      }
    }
  }
}
