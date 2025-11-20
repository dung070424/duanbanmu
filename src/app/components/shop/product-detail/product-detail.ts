import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProductApiService, SanPhamResponse } from '../../../services/product-api.service';
import { ChiTietSanPhamApiService, ChiTietSanPhamResponse } from '../../../services/chi-tiet-san-pham-api.service';
import { HoaDonChoService, GioHangChoItem } from '../../../services/hoa-don-cho.service';
import { AuthService } from '../../../services/auth';
import { ChatbotComponent } from '../chatbot/chatbot.component';


@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ChatbotComponent],
  templateUrl: './product-detail.html',
  styleUrls: ['./product-detail.scss']
})
export class ProductDetailComponent implements OnInit, AfterViewInit {
  product: SanPhamResponse | null = null;
  productVariants: ChiTietSanPhamResponse[] = [];
  selectedVariant: ChiTietSanPhamResponse | null = null;
  selectedQuantity: number = 1;
  error = '';
  mainImageUrl = '';
  selectedImageIndex = 0;
  activeTab: 'description' | 'specifications' | 'reviews' = 'description';
  customerName: string = '';
  cartCount = 0;
  showSearch = false;
  similarProducts: SanPhamResponse[] = [];

  // Image gallery (nếu có nhiều ảnh)
  productImages: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private productApiService: ProductApiService,
    private chiTietSanPhamApiService: ChiTietSanPhamApiService,
    private hoaDonChoService: HoaDonChoService,
    public authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('🛍️ ProductDetailComponent ngOnInit - Starting...');
    const productId = this.route.snapshot.paramMap.get('id');
    console.log('🛍️ Product ID from route:', productId);
    
    // Load cart count and customer name
    this.updateCartCount();
    if (this.authService.isLoggedIn()) {
      this.loadCustomerName();
    }

    // Đảm bảo error được reset
    this.error = '';

    if (productId) {
      const id = +productId;
      if (isNaN(id) || id <= 0) {
        console.error('❌ Invalid product ID:', productId);
        this.error = 'Mã sản phẩm không hợp lệ!';
        this.cdr.detectChanges();
        return;
      }
      this.loadProduct(id);
    } else {
      console.error('❌ No product ID in route');
      this.error = 'Không tìm thấy mã sản phẩm!';
      this.cdr.detectChanges();
    }
  }

  loadProduct(productId: number): void {
    console.log('🛍️ loadProduct - Loading product with ID:', productId);
    this.error = '';

    // Load product details
    this.productApiService.getById(productId, true).subscribe({
      next: (product) => {
        console.log('✅ loadProduct - Product loaded successfully:', product);
        console.log('   - Product name:', product.tenSanPham);
        console.log('   - Product status:', product.trangThai);
        console.log('   - Product image:', product.anhSanPham);

        if (!product) {
          console.error('❌ Product is null or undefined');
          this.error = 'Không tìm thấy thông tin sản phẩm!';
          this.product = null;
          this.cdr.detectChanges();
          return;
        }

        // Set product ngay lập tức để hiển thị view
        this.product = product;
        this.mainImageUrl = product.anhSanPham || '/assets/default-product.png';
        this.productImages = [this.mainImageUrl];

        // Force change detection NGAY LẬP TỨC để hiển thị sản phẩm (TRƯỚC khi load variants)
        // Sử dụng setTimeout để đảm bảo Angular đã cập nhật DOM
        setTimeout(() => {
          this.cdr.detectChanges();
        }, 0);

        // Load product variants (chi tiết sản phẩm) - không block UI
        this.loadProductVariants(productId);
        
        // Load similar products
        this.loadSimilarProducts(product);
      },
      error: (err) => {
        console.error('❌ loadProduct - Error loading product:', err);
        console.error('   - Status:', err.status);
        console.error('   - Message:', err.message);
        console.error('   - Error object:', err);

        this.product = null;

        // Xử lý các loại lỗi khác nhau - nhưng không block view nếu lỗi connection
        if (err.status === 0 || err.status === undefined) {
          // Connection refused - không set error để không block view
          console.warn('⚠️ Connection refused - Backend may be down');
          this.error = ''; // Không hiển thị error để view vẫn có thể hiển thị
        } else if (err.status === 404) {
          this.error = 'Không tìm thấy sản phẩm với mã này!';
        } else if (err.status === 403) {
          this.error = 'Bạn không có quyền truy cập sản phẩm này!';
        } else {
          this.error = `Không thể tải thông tin sản phẩm. Lỗi: ${err.status || 'Unknown'}`;
        }

        // Force change detection
        this.cdr.detectChanges();
      }
    });
  }

  loadProductVariants(productId: number): void {
    console.log('🛍️ loadProductVariants - Loading variants for product ID:', productId);
    this.chiTietSanPhamApiService.getBySanPhamId(productId).subscribe({
      next: (variants) => {
        console.log('✅ loadProductVariants - Variants received:', variants);
        console.log('   - Total variants:', variants?.length || 0);

        if (!variants || !Array.isArray(variants)) {
          console.warn('⚠️ loadProductVariants - Variants is not an array, setting to empty array');
          this.productVariants = [];
          this.cdr.detectChanges();
          return;
        }

        this.productVariants = variants.filter(v => v && v.trangThai !== false);
        console.log('   - Active variants after filter:', this.productVariants.length);

        // Auto-select first available variant
        if (this.productVariants.length > 0) {
          this.selectedVariant = this.productVariants[0];
          console.log('   - Selected variant:', this.selectedVariant);
        } else {
          console.warn('⚠️ loadProductVariants - No active variants found');
          this.selectedVariant = null;
        }

        // Force change detection để hiển thị variants ngay lập tức
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ loadProductVariants - Error loading variants:', err);
        console.error('   - Status:', err.status);
        console.error('   - Message:', err.message);

        // Không set error vì có thể sản phẩm chưa có variants
        // Nhưng vẫn log để debug
        this.productVariants = [];
        this.selectedVariant = null;

        // Force change detection
        this.cdr.detectChanges();
      }
    });
  }

  selectVariant(variant: ChiTietSanPhamResponse): void {
    this.selectedVariant = variant;
    this.selectedQuantity = 1; // Reset quantity when changing variant
    // Force change detection để cập nhật UI ngay lập tức
    this.cdr.detectChanges();
  }

  increaseQuantity(): void {
    const maxStock = parseInt(this.selectedVariant?.soLuongTon?.toString() || '0', 10);
    if (this.selectedVariant && this.selectedQuantity < maxStock) {
      this.selectedQuantity++;
      // Force change detection để cập nhật số lượng ngay lập tức
      this.cdr.detectChanges();
    }
  }

  getMaxStock(): number {
    return parseInt(this.selectedVariant?.soLuongTon?.toString() || '0', 10);
  }

  decreaseQuantity(): void {
    if (this.selectedQuantity > 1) {
      this.selectedQuantity--;
      // Force change detection để cập nhật số lượng ngay lập tức
      this.cdr.detectChanges();
    }
  }

  onQuantityChange(event: any): void {
    const value = +event.target.value;
    if (value >= 1) {
      const maxQuantity = parseInt(this.selectedVariant?.soLuongTon?.toString() || '0', 10);
      this.selectedQuantity = Math.min(value, maxQuantity);
    } else {
      this.selectedQuantity = 1;
    }
    // Force change detection để cập nhật số lượng ngay lập tức
    this.cdr.detectChanges();
  }

  addToCart(): void {
    if (!this.product) {
      alert('Vui lòng chọn sản phẩm');
      return;
    }

    // Nếu có variant thì phải chọn variant
    if (this.productVariants.length > 0 && !this.selectedVariant) {
      alert('Vui lòng chọn biến thể sản phẩm (màu sắc, kích thước)');
      return;
    }

    if (this.selectedQuantity < 1) {
      alert('Số lượng phải lớn hơn 0');
      return;
    }

    // Kiểm tra số lượng tồn kho
    if (this.selectedVariant) {
      const stock = parseInt(this.selectedVariant.soLuongTon?.toString() || '0', 10);
      if (stock < this.selectedQuantity) {
        alert('Số lượng trong kho không đủ');
        return;
      }
    } else if (this.product.soLuongTon !== undefined) {
      // Nếu không có variant, kiểm tra số lượng từ product
      const stock = this.product.soLuongTon || 0;
      if (stock < this.selectedQuantity) {
        alert('Số lượng trong kho không đủ');
        return;
      }
    }

    const price = this.selectedVariant 
      ? parseFloat(this.selectedVariant.giaBan?.toString() || '0') || this.product.giaBan || 0
      : this.product.giaBan || 0;
    const totalPrice = price * this.selectedQuantity;

    // Nếu chưa đăng nhập, lưu vào giỏ hàng tạm (localStorage)
    if (!this.authService.isLoggedIn()) {
      console.log('🛒 ProductDetail addToCart - User not logged in, saving to temp_cart');

      const cartItem = {
        chiTietSanPhamId: this.selectedVariant?.id || null,
        productId: this.product.id,
        productName: this.product.tenSanPham,
        price: price,
        quantity: this.selectedQuantity,
        totalItemPrice: totalPrice,
        imageUrl: this.mainImageUrl,
        mauSac: this.selectedVariant?.mauSacTen || '',
        kichThuoc: this.selectedVariant?.kichThuocTen || ''
      };

      const tempCart = JSON.parse(localStorage.getItem('temp_cart') || '[]');
      // Tìm item trùng: nếu có variant thì tìm theo chiTietSanPhamId, nếu không thì tìm theo productId
      const existingIndex = this.selectedVariant
        ? tempCart.findIndex((item: any) => item.chiTietSanPhamId === cartItem.chiTietSanPhamId)
        : tempCart.findIndex((item: any) => item.productId === cartItem.productId && !item.chiTietSanPhamId);

      if (existingIndex >= 0) {
        tempCart[existingIndex].quantity += cartItem.quantity;
        tempCart[existingIndex].totalItemPrice = tempCart[existingIndex].quantity * tempCart[existingIndex].price;
      } else {
        tempCart.push(cartItem);
      }

      localStorage.setItem('temp_cart', JSON.stringify(tempCart));
      this.updateCartCount();
      // Force change detection sau khi cập nhật localStorage
      this.cdr.detectChanges();
      alert(`Đã thêm "${this.product.tenSanPham}" (x${this.selectedQuantity}) vào giỏ hàng!`);
      return;
    }

    // Nếu đã đăng nhập, thêm vào giỏ hàng trong DB
    this.getOrCreateCart().then(cartId => {
      if (!cartId) {
        alert('Không thể tạo giỏ hàng. Vui lòng thử lại!');
        return;
      }

      if (!this.product) {
        alert('Lỗi: Không tìm thấy thông tin sản phẩm');
        return;
      }

      // Nếu có variant thì phải có selectedVariant
      if (this.productVariants.length > 0 && !this.selectedVariant) {
        alert('Vui lòng chọn biến thể sản phẩm');
        return;
      }

      // Nếu không có variant, không thể thêm vào giỏ hàng DB (cần chiTietSanPhamId)
      if (!this.selectedVariant) {
        alert('Sản phẩm chưa có biến thể. Vui lòng liên hệ cửa hàng để đặt hàng.');
        return;
      }

      const gioHangItem: GioHangChoItem = {
        chiTietSanPhamId: this.selectedVariant.id,
        tenSanPham: this.product.tenSanPham,
        soLuong: this.selectedQuantity,
        donGia: price,
        giamGia: 0,
        thanhTien: totalPrice
      };

      this.hoaDonChoService.addItemToCart(cartId, gioHangItem).subscribe({
        next: () => {
          this.updateCartCount();
          // Force change detection sau khi thêm vào giỏ hàng thành công
          this.cdr.detectChanges();
          alert(`Đã thêm "${this.product!.tenSanPham}" (x${this.selectedQuantity}) vào giỏ hàng!`);
        },
        error: (error) => {
          console.error('Error adding to cart:', error);
          const errorMsg = error.error?.error || error.message || 'Không thể thêm sản phẩm vào giỏ hàng. Vui lòng thử lại!';
          // Force change detection sau khi có lỗi
          this.cdr.detectChanges();
          alert(errorMsg);
        }
      });
    });
  }

  getOrCreateCart(): Promise<number | null> {
    return new Promise((resolve) => {
      const currentUser = this.authService.getCurrentUser();
      const savedCartId = localStorage.getItem('current_cart_id');

      if (savedCartId && currentUser) {
        this.hoaDonChoService.getHoaDonChoById(parseInt(savedCartId)).subscribe({
          next: (cart) => {
            if (cart && cart.trangThai === 'DANG_CHO') {
              resolve(cart.id!);
            } else {
              localStorage.removeItem('current_cart_id');
              this.createNewCart(resolve);
            }
          },
          error: () => {
            localStorage.removeItem('current_cart_id');
            this.createNewCart(resolve);
          }
        });
      } else {
        this.createNewCart(resolve);
      }
    });
  }

  createNewCart(resolve: (value: number | null) => void): void {
    const customerId = this.authService.getCurrentUser()?.id;
    const maHoaDonCho = `HDC${Date.now()}`;

    const newCart: Partial<any> = {
      maHoaDonCho: maHoaDonCho,
      khachHangId: customerId || undefined,
      trangThai: 'DANG_CHO',
      danhSachGioHang: []
    };

    this.hoaDonChoService.createHoaDonCho(newCart).subscribe({
      next: (cart) => {
        localStorage.setItem('current_cart_id', cart.id!.toString());
        resolve(cart.id!);
      },
      error: (error) => {
        console.error('Error creating cart:', error);
        resolve(null);
      }
    });
  }

  goToCart(): void {
    this.router.navigate(['/shop/cart']);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  getProductPrice(): number {
    if (this.selectedVariant && this.selectedVariant.giaBan) {
      return parseFloat(this.selectedVariant.giaBan.toString()) || 0;
    }
    return this.product?.giaBan || 0;
  }

  isVariantAvailable(variant: ChiTietSanPhamResponse): boolean {
    const stock = parseInt(variant.soLuongTon?.toString() || '0', 10);
    return stock > 0 && variant.trangThai !== false;
  }

  selectImage(index: number): void {
    if (index >= 0 && index < this.productImages.length) {
      this.selectedImageIndex = index;
      this.mainImageUrl = this.productImages[index];
      // Force change detection để cập nhật ảnh ngay lập tức
      this.cdr.detectChanges();
    }
  }

  ngAfterViewInit(): void {
    // Force change detection sau khi view được khởi tạo
    // Đảm bảo view hiển thị ngay nếu đã có product
    if (this.product) {
      setTimeout(() => {
        this.cdr.detectChanges();
      }, 0);
    }
  }

  goBack(): void {
    // Nếu có lịch sử trình duyệt, quay lại
    if (window.history.length > 1) {
      this.location.back();
    } else {
      // Nếu không có lịch sử, chuyển về trang chủ
      this.router.navigate(['/shop']);
    }
  }

  // Variant selection methods
  hasColorVariants(): boolean {
    if (this.productVariants.length === 0) return false;
    const colors = new Set(this.productVariants.map(v => v.mauSacTen).filter(Boolean));
    return colors.size > 1;
  }

  hasSizeVariants(): boolean {
    if (this.productVariants.length === 0) return false;
    const sizes = new Set(this.productVariants.map(v => v.kichThuocTen).filter(Boolean));
    return sizes.size > 1;
  }

  getUniqueColors(): string[] {
    const colors = new Set(this.productVariants.map(v => v.mauSacTen).filter(Boolean));
    return Array.from(colors) as string[];
  }

  getUniqueSizes(): string[] {
    const sizes = new Set(this.productVariants.map(v => v.kichThuocTen).filter(Boolean));
    return Array.from(sizes) as string[];
  }

  isSelectedColor(color: string): boolean {
    return this.selectedVariant?.mauSacTen === color;
  }

  isSelectedSize(size: string): boolean {
    return this.selectedVariant?.kichThuocTen === size;
  }

  isSizeAvailable(size: string): boolean {
    const variant = this.productVariants.find(
      v => v.kichThuocTen === size &&
      (this.selectedVariant?.mauSacTen ? v.mauSacTen === this.selectedVariant.mauSacTen : true)
    );
    return variant ? this.isVariantAvailable(variant) : false;
  }

  selectColorVariant(color: string): void {
    // Tìm variant với màu đã chọn và size hiện tại (nếu có)
    const currentSize = this.selectedVariant?.kichThuocTen;
    let variant = this.productVariants.find(
      v => v.mauSacTen === color && (!currentSize || v.kichThuocTen === currentSize)
    );

    // Nếu không tìm thấy với size hiện tại, lấy variant đầu tiên với màu này
    if (!variant) {
      variant = this.productVariants.find(v => v.mauSacTen === color);
    }

    if (variant) {
      this.selectVariant(variant);
      // Force change detection để cập nhật UI ngay lập tức
      this.cdr.detectChanges();
    }
  }

  selectSizeVariant(size: string): void {
    // Tìm variant với size đã chọn và màu hiện tại (nếu có)
    const currentColor = this.selectedVariant?.mauSacTen;
    let variant = this.productVariants.find(
      v => v.kichThuocTen === size && (!currentColor || v.mauSacTen === currentColor)
    );

    // Nếu không tìm thấy với màu hiện tại, lấy variant đầu tiên với size này
    if (!variant) {
      variant = this.productVariants.find(v => v.kichThuocTen === size);
    }

    if (variant && this.isVariantAvailable(variant)) {
      this.selectVariant(variant);
      // Force change detection để cập nhật UI ngay lập tức
      this.cdr.detectChanges();
    }
  }

  getColorCode(colorName: string): string {
    // Map màu sắc phổ biến sang mã màu (có thể mở rộng)
    const colorMap: { [key: string]: string } = {
      'Đỏ': '#ff0000',
      'Xanh': '#0000ff',
      'Xanh lá': '#00ff00',
      'Vàng': '#ffff00',
      'Đen': '#000000',
      'Trắng': '#ffffff',
      'Xám': '#808080',
      'Cam': '#ffa500',
      'Tím': '#800080',
      'Hồng': '#ffc0cb'
    };
    return colorMap[colorName] || '#cccccc';
  }

  buyNow(): void {
    // Thêm vào giỏ hàng và chuyển đến checkout
    if (!this.product) {
      alert('Vui lòng chọn sản phẩm');
      return;
    }

    // Nếu có variant thì phải chọn variant
    if (this.productVariants.length > 0 && !this.selectedVariant) {
      alert('Vui lòng chọn biến thể sản phẩm (màu sắc, kích thước)');
      return;
    }

    if (this.selectedQuantity < 1) {
      alert('Số lượng phải lớn hơn 0');
      return;
    }

    // Kiểm tra số lượng tồn kho
    if (this.selectedVariant) {
      const stock = parseInt(this.selectedVariant.soLuongTon?.toString() || '0', 10);
      if (stock < this.selectedQuantity) {
        alert('Số lượng trong kho không đủ');
        return;
      }
    } else if (this.product.soLuongTon !== undefined) {
      const stock = this.product.soLuongTon || 0;
      if (stock < this.selectedQuantity) {
        alert('Số lượng trong kho không đủ');
        return;
      }
    }

    const price = this.selectedVariant 
      ? parseFloat(this.selectedVariant.giaBan?.toString() || '0') || this.product.giaBan || 0
      : this.product.giaBan || 0;

    // Nếu chưa đăng nhập, thêm vào giỏ hàng tạm và chuyển đến checkout
    if (!this.authService.isLoggedIn()) {
      const totalPrice = price * this.selectedQuantity;
      const cartItem = {
        chiTietSanPhamId: this.selectedVariant?.id || null,
        productId: this.product.id,
        productName: this.product.tenSanPham,
        price: price,
        quantity: this.selectedQuantity,
        totalItemPrice: totalPrice,
        imageUrl: this.mainImageUrl,
        mauSac: this.selectedVariant?.mauSacTen || '',
        kichThuoc: this.selectedVariant?.kichThuocTen || ''
      };

      const tempCart = JSON.parse(localStorage.getItem('temp_cart') || '[]');
      const existingIndex = this.selectedVariant
        ? tempCart.findIndex((item: any) => item.chiTietSanPhamId === cartItem.chiTietSanPhamId)
        : tempCart.findIndex((item: any) => item.productId === cartItem.productId && !item.chiTietSanPhamId);

      if (existingIndex >= 0) {
        tempCart[existingIndex].quantity += cartItem.quantity;
        tempCart[existingIndex].totalItemPrice = tempCart[existingIndex].quantity * tempCart[existingIndex].price;
      } else {
        tempCart.push(cartItem);
      }

      localStorage.setItem('temp_cart', JSON.stringify(tempCart));
      this.updateCartCount();
      this.cdr.detectChanges();
      
      // Chuyển đến checkout
      this.router.navigate(['/shop/checkout']);
      return;
    }

    // Nếu đã đăng nhập, thêm vào giỏ hàng DB rồi chuyển đến checkout
    this.getOrCreateCart().then(cartId => {
      if (!cartId) {
        alert('Không thể tạo giỏ hàng. Vui lòng thử lại!');
        return;
      }

      if (!this.product) {
        alert('Lỗi: Không tìm thấy thông tin sản phẩm');
        return;
      }

      if (this.productVariants.length > 0 && !this.selectedVariant) {
        alert('Vui lòng chọn biến thể sản phẩm');
        return;
      }

      if (!this.selectedVariant) {
        alert('Sản phẩm chưa có biến thể. Vui lòng liên hệ cửa hàng để đặt hàng.');
        return;
      }

      const totalPrice = price * this.selectedQuantity;
      const gioHangItem: GioHangChoItem = {
        chiTietSanPhamId: this.selectedVariant.id,
        tenSanPham: this.product.tenSanPham,
        soLuong: this.selectedQuantity,
        donGia: price,
        giamGia: 0,
        thanhTien: totalPrice
      };

      this.hoaDonChoService.addItemToCart(cartId, gioHangItem).subscribe({
        next: () => {
          this.updateCartCount();
          this.cdr.detectChanges();
          // Chuyển đến checkout với cartId
          this.router.navigate(['/shop/checkout'], { 
            queryParams: { cartId: cartId } 
          });
        },
        error: (error) => {
          console.error('Error adding to cart:', error);
          const errorMsg = error.error?.error || error.message || 'Không thể thêm sản phẩm vào giỏ hàng. Vui lòng thử lại!';
          this.cdr.detectChanges();
          alert(errorMsg);
        }
      });
    });
  }

  toggleSearch(): void {
    this.showSearch = !this.showSearch;
  }

  navigateToProfile(event: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/customer/profile']);
    } else {
      this.router.navigate(['/shop/login']);
    }
  }

  logout(): void {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      this.authService.logout();
      this.customerName = '';
      this.cartCount = 0;
      localStorage.removeItem('temp_cart');
      localStorage.removeItem('current_cart_id');
      this.router.navigate(['/shop']);
      this.cdr.detectChanges();
    }
  }

  updateCartCount(): void {
    if (!this.authService.isLoggedIn()) {
      try {
        const tempCart = JSON.parse(localStorage.getItem('temp_cart') || '[]');
        this.cartCount = Array.isArray(tempCart) ? tempCart.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) : 0;
      } catch (e) {
        this.cartCount = 0;
      }
      this.cdr.detectChanges();
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.hoaDonChoService.getHoaDonChoByKhachHangId(currentUser.id).subscribe({
        next: (carts) => {
          const activeCart = carts.find(c => c.trangThai === 'DANG_CHO');
          if (activeCart) {
            this.cartCount = activeCart.danhSachGioHang?.reduce((sum, item) => sum + (item.soLuong || 0), 0) || 0;
          } else {
            this.cartCount = 0;
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.cartCount = 0;
          this.cdr.detectChanges();
        }
      });
    }
  }

  loadCustomerName(): void {
    if (!this.authService.isLoggedIn()) {
      this.customerName = '';
      return;
    }
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.customerName = currentUser.fullName || currentUser.username || 'Tài khoản';
    }
  }

  navigateToProducts(): void {
    this.router.navigate(['/shop/products']);
  }

  loadSimilarProducts(currentProduct: SanPhamResponse): void {
    // Load sản phẩm cùng loại hoặc cùng nhà sản xuất
    this.productApiService.search({
      trangThai: true,
      page: 0,
      size: 20,
      useCustomerEndpoint: true
    }).subscribe({
      next: (response) => {
        // Lọc sản phẩm tương tự (cùng loại hoặc cùng nhà sản xuất, loại trừ sản phẩm hiện tại)
        this.similarProducts = response.content
          .filter(p => 
            p.id !== currentProduct.id && 
            p.trangThai === true &&
            (p.loaiMuBaoHiemId === currentProduct.loaiMuBaoHiemId || 
             p.nhaSanXuatId === currentProduct.nhaSanXuatId)
          )
          .slice(0, 5);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading similar products:', err);
        this.similarProducts = [];
        this.cdr.detectChanges();
      }
    });
  }

  getProductImageUrl(product: SanPhamResponse): string {
    return product.anhSanPham || '/assets/default-product.png';
  }

  getSimilarProductPrice(product: SanPhamResponse): number {
    return Number(product.giaBan) || 0;
  }

  viewProduct(productId: number): void {
    this.router.navigate(['/shop/product', productId]);
  }
}
