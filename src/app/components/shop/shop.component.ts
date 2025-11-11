import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProductApiService, SanPhamResponse } from '../../services/product-api.service';
import { StatisticsService } from '../../services/statistics.service';
import { LoaiMuBaoHiemApiService } from '../../services/loai-mu-bao-hiem-api.service';
import { HoaDonChoService, HoaDonCho, GioHangChoItem } from '../../services/hoa-don-cho.service';
import { ChiTietSanPhamApiService } from '../../services/chi-tiet-san-pham-api.service';
import { AuthService } from '../../services/auth';
import { CustomerService } from '../../services/customer.service';
import { ChatbotComponent } from './chatbot/chatbot.component';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, skip } from 'rxjs/operators';

// Removed CartItem interface - using HoaDonCho from backend instead

interface Category {
  id: number;
  tenLoaiMu: string;
  trangThai: boolean;
}

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ChatbotComponent],
  templateUrl: './shop.component.html',
  styleUrls: ['./shop.component.scss']
})
export class ShopComponent implements OnInit, OnDestroy {
  products: SanPhamResponse[] = [];
  filteredProducts: SanPhamResponse[] = [];
  bestSellingProducts: SanPhamResponse[] = [];
  featuredProducts: SanPhamResponse[] = [];
  bestPriceProducts: SanPhamResponse[] = [];
  categories: Category[] = [];
  
  activeTab: 'best-selling' | 'featured' | 'best-price' = 'best-selling';
  searchKeyword = '';
  selectedPriceRange = 'all';
  isLoading = false;
  showSearch = false;
  cartCount = 0; // Cart count from backend
  customerName: string = ''; // Tên khách hàng để hiển thị
  
  private authSubscription?: Subscription;

  priceRanges = [
    { value: 'all', label: 'Tất cả' },
    { value: '0-500000', label: 'Dưới 500.000đ' },
    { value: '500000-1000000', label: '500.000đ - 1.000.000đ' },
    { value: '1000000-2000000', label: '1.000.000đ - 2.000.000đ' },
    { value: '2000000', label: 'Trên 2.000.000đ' }
  ];

  constructor(
    private productApiService: ProductApiService,
    private statisticsService: StatisticsService,
    private loaiMuBaoHiemService: LoaiMuBaoHiemApiService,
    private hoaDonChoService: HoaDonChoService,
    private chiTietSanPhamService: ChiTietSanPhamApiService,
    public authService: AuthService,
    private customerService: CustomerService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    // Không gọi loadCart() trong constructor - sẽ gọi trong ngOnInit
  }

  ngOnInit(): void {
    this.loadProducts();
    this.loadBestSellingProducts();
    this.loadCategories();
    this.updateCartCount();
    
    // Load thông tin khách hàng nếu đã login
    if (this.authService.isLoggedIn()) {
      this.loadCustomerName();
    }
    
    // Lắng nghe event merge giỏ hàng tạm sau khi đăng nhập
    if (typeof window !== 'undefined') {
      window.addEventListener('mergeTempCart', this.handleMergeTempCart.bind(this));
    }
    
    // QUAN TRỌNG: Reload products khi user đăng nhập thành công
    // Subscribe vào auth state để reload khi login
    // Sử dụng skip(1) để bỏ qua giá trị đầu tiên (khi component init)
    // và distinctUntilChanged để chỉ reload khi state thay đổi
    this.authSubscription = this.authService.isAuthenticated$.pipe(
      distinctUntilChanged(),
      skip(1) // Bỏ qua giá trị đầu tiên khi component init
    ).subscribe(isAuthenticated => {
      // Chỉ reload khi user vừa đăng nhập (chuyển từ false -> true)
      if (isAuthenticated) {
        console.log('🔄 ShopComponent: User logged in, reloading products...');
        // Reload tất cả dữ liệu sau khi login
        this.loadProducts();
        this.loadBestSellingProducts();
        this.loadCategories();
        this.updateCartCount();
        this.loadCustomerName(); // Load tên khách hàng khi login
      } else {
        // User đã logout
        this.customerName = '';
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    // Cleanup event listener
    if (typeof window !== 'undefined') {
      window.removeEventListener('mergeTempCart', this.handleMergeTempCart.bind(this));
    }
    // Unsubscribe để tránh memory leak
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  /**
   * Xử lý merge giỏ hàng tạm với giỏ hàng trong DB sau khi đăng nhập
   */
  handleMergeTempCart(event: any): void {
    const { userId, tempCart } = event.detail;
    if (!userId || !tempCart || tempCart.length === 0) {
      return;
    }

    console.log('🛒 ShopComponent: Merging temp cart with DB cart');
    
    // Lấy hoặc tạo giỏ hàng trong DB
    this.getOrCreateCart().then(cartId => {
      if (!cartId) {
        console.error('❌ Cannot create cart for merging');
        return;
      }

      // Merge từng item từ giỏ hàng tạm vào giỏ hàng DB
      let mergedCount = 0;
      let errorCount = 0;

      tempCart.forEach((tempItem: any, index: number) => {
        const cartItem: GioHangChoItem = {
          chiTietSanPhamId: tempItem.chiTietSanPhamId,
          tenSanPham: tempItem.productName,
          soLuong: tempItem.quantity,
          donGia: tempItem.price,
          giamGia: 0,
          thanhTien: tempItem.totalItemPrice
        };

        // Thêm vào giỏ hàng DB
        this.hoaDonChoService.addItemToCart(cartId, cartItem).subscribe({
          next: () => {
            mergedCount++;
            if (mergedCount + errorCount === tempCart.length) {
              // Đã merge xong tất cả items
              console.log(`✅ Merged ${mergedCount} items from temp cart`);
              // Xóa giỏ hàng tạm
              localStorage.removeItem('temp_cart');
              // Cập nhật số lượng giỏ hàng
              this.updateCartCount();
            }
          },
          error: (error) => {
            console.error(`❌ Error merging item ${index + 1}:`, error);
            errorCount++;
            if (mergedCount + errorCount === tempCart.length) {
              // Đã xử lý xong tất cả items (thành công hoặc lỗi)
              if (mergedCount > 0) {
                console.log(`✅ Merged ${mergedCount} items, ${errorCount} failed`);
                localStorage.removeItem('temp_cart');
                this.updateCartCount();
              }
            }
          }
        });
      });
    });
  }

  loadProducts(): void {
    // Không set isLoading để không block UI
    this.productApiService.search({
      trangThai: true,
      page: 0,
      size: 1000,
      useCustomerEndpoint: true
    }).subscribe({
      next: (response) => {
        this.products = response.content.filter(p => p.trangThai === true);
        this.filteredProducts = [...this.products];
        
        // Featured products: lấy 8 sản phẩm đầu tiên
        this.featuredProducts = this.products.slice(0, 8);
        
        // Best price products: sắp xếp theo giá tăng dần, lấy 8 sản phẩm
        this.bestPriceProducts = [...this.products]
          .sort((a, b) => (Number(a.giaBan) || 0) - (Number(b.giaBan) || 0))
          .slice(0, 8);
        
        // Force change detection để hiển thị sản phẩm ngay lập tức
        this.cdr.detectChanges();
      },
      error: (error) => {
        // Xử lý lỗi một cách graceful - không log lỗi connection refused
        if (error.status === 0 || error.status === undefined) {
          // Connection refused hoặc network error - backend có thể chưa chạy
          console.warn('⚠️ Backend không khả dụng. Vui lòng đảm bảo backend đang chạy.');
        } else {
        console.error('Error loading products:', error);
        }
        // Fallback: hiển thị empty state
        this.products = [];
        this.filteredProducts = [];
        this.featuredProducts = [];
        this.bestPriceProducts = [];
        
        // Force change detection
        this.cdr.detectChanges();
      }
    });
  }

  loadBestSellingProducts(): void {
    this.statisticsService.getBestSellingProducts(8).subscribe({
      next: (response) => {
        if (response && response.data) {
          // Map best selling products từ statistics service
          // Cần load chi tiết sản phẩm từ product service
          const bestSellingIds = response.data.map(item => item.sanPhamId);
          this.productApiService.search({
            trangThai: true,
            page: 0,
            size: 1000,
            useCustomerEndpoint: true
          }).subscribe({
            next: (productResponse) => {
              this.bestSellingProducts = productResponse.content
                .filter(p => bestSellingIds.includes(p.id))
                .slice(0, 8);
              
              // Force change detection để hiển thị sản phẩm ngay lập tức
              this.cdr.detectChanges();
            },
            error: (error) => {
              // Xử lý lỗi một cách graceful
              if (error.status === 0 || error.status === undefined) {
                // Connection refused - fallback
                this.bestSellingProducts = this.products.slice(0, 8);
              } else {
                console.error('Error loading best selling product details:', error);
                this.bestSellingProducts = this.products.slice(0, 8);
              }
              
              // Force change detection
              this.cdr.detectChanges();
            }
          });
        }
      },
      error: (error) => {
        // Xử lý lỗi một cách graceful
        if (error.status === 0 || error.status === undefined) {
          // Connection refused - fallback
          this.bestSellingProducts = this.products.slice(0, 8);
        } else {
          console.error('Error loading best selling products:', error);
          // Fallback: lấy 8 sản phẩm đầu tiên
          this.bestSellingProducts = this.products.slice(0, 8);
        }
        
        // Force change detection
        this.cdr.detectChanges();
      }
    });
  }

  loadCategories(): void {
    this.loaiMuBaoHiemService.getAllActive().subscribe({
      next: (categories) => {
        this.categories = categories.map(cat => ({
          id: cat.id,
          tenLoaiMu: cat.tenLoai || '', // Map tenLoai to tenLoaiMu
          trangThai: cat.trangThai || true
        }));
        
        // Force change detection để hiển thị categories ngay lập tức
        this.cdr.detectChanges();
      },
      error: (error) => {
        // Xử lý lỗi một cách graceful
        if (error.status === 0 || error.status === undefined) {
          // Connection refused - backend có thể chưa chạy
          console.warn('⚠️ Không thể load categories - backend không khả dụng');
        } else {
          console.error('Error loading categories:', error);
        }
        this.categories = [];
        
        // Force change detection
        this.cdr.detectChanges();
      }
    });
  }

  getActiveProducts(): SanPhamResponse[] {
    switch (this.activeTab) {
      case 'best-selling':
        return this.bestSellingProducts;
      case 'featured':
        return this.featuredProducts;
      case 'best-price':
        return this.bestPriceProducts;
      default:
        return [];
    }
  }

  setActiveTab(tab: 'best-selling' | 'featured' | 'best-price'): void {
    this.activeTab = tab;
    // Force change detection để cập nhật tab content ngay lập tức
    this.cdr.detectChanges();
  }

  getProductsByCategory(categoryId: number): SanPhamResponse[] {
    return this.products.filter(p => p.loaiMuBaoHiemId === categoryId);
  }

  toggleSearch(): void {
    this.showSearch = !this.showSearch;
  }

  filterProducts(): void {
    let filtered = [...this.products];

    // Tìm kiếm theo từ khóa
    if (this.searchKeyword.trim()) {
      const keyword = this.searchKeyword.toLowerCase();
      filtered = filtered.filter(p => 
        p.tenSanPham?.toLowerCase().includes(keyword) ||
        p.maSanPham?.toLowerCase().includes(keyword) ||
        p.mauSacTen?.toLowerCase().includes(keyword) ||
        p.loaiMuBaoHiemTen?.toLowerCase().includes(keyword) ||
        p.nhaSanXuatTen?.toLowerCase().includes(keyword)
      );
    }

    // Lọc theo khoảng giá
    if (this.selectedPriceRange !== 'all') {
      filtered = filtered.filter(p => {
        const price = Number(p.giaBan) || 0;
        switch (this.selectedPriceRange) {
          case '0-500000':
            return price < 500000;
          case '500000-1000000':
            return price >= 500000 && price < 1000000;
          case '1000000-2000000':
            return price >= 1000000 && price < 2000000;
          case '2000000':
            return price >= 2000000;
          default:
            return true;
        }
      });
    }

    this.filteredProducts = filtered;
    
    // Force change detection để cập nhật danh sách sản phẩm ngay lập tức
    this.cdr.detectChanges();
  }

  addToCart(product: SanPhamResponse): void {
    // Lấy chi tiết sản phẩm đầu tiên (hoặc có thể cho user chọn size/color)
    this.chiTietSanPhamService.getBySanPhamId(product.id).subscribe({
      next: (chiTietList) => {
        if (!chiTietList || chiTietList.length === 0) {
          alert('Sản phẩm này hiện không có chi tiết. Vui lòng liên hệ cửa hàng!');
          return;
        }

        // Lấy chi tiết đầu tiên có sẵn
        const chiTiet = chiTietList.find(ct => ct.trangThai && parseInt(ct.soLuongTon) > 0) || chiTietList[0];
        
        if (!chiTiet) {
          alert('Sản phẩm này hiện không có sẵn!');
          return;
        }

        // Kiểm tra số lượng tồn
        const stock = parseInt(chiTiet.soLuongTon) || 0;
        if (stock <= 0) {
          alert('Sản phẩm này đã hết hàng!');
      return;
    }

        // Cảnh báo nếu sắp hết hàng (còn ít hơn 5 sản phẩm)
        if (stock <= 5) {
          const confirmAdd = confirm(`⚠️ Cảnh báo: Sản phẩm chỉ còn ${stock} cái trong kho.\n\nBạn có muốn thêm vào giỏ hàng không?`);
          if (!confirmAdd) {
            return;
          }
        }

        const price = parseFloat(chiTiet.giaBan) || product.giaBan || 0;

        // Nếu chưa đăng nhập, lưu vào giỏ hàng tạm (localStorage)
        if (!this.authService.isLoggedIn()) {
          console.log('🛒 addToCart - User not logged in, saving to temp_cart');
          
          const tempCartItem: any = {
            productId: product.id,
            chiTietSanPhamId: chiTiet.id,
            productName: product.tenSanPham,
            quantity: 1,
            price: price,
            totalItemPrice: price,
            imageUrl: product.anhSanPham,
            mauSac: chiTiet.mauSacTen || '',
            kichThuoc: chiTiet.kichThuocTen || ''
          };

          console.log('🛒 addToCart - tempCartItem:', tempCartItem);

          // Import và sử dụng TempCartService
          // Tạm thời lưu trực tiếp vào localStorage
          const tempCart = JSON.parse(localStorage.getItem('temp_cart') || '[]');
          console.log('🛒 addToCart - Current tempCart from localStorage:', tempCart);
          console.log('   - tempCart length before:', tempCart.length);
          
          const existingIndex = tempCart.findIndex((item: any) => item.chiTietSanPhamId === chiTiet.id);
          console.log('🛒 addToCart - existingIndex:', existingIndex);
          
          if (existingIndex >= 0) {
            tempCart[existingIndex].quantity += 1;
            tempCart[existingIndex].totalItemPrice = tempCart[existingIndex].quantity * tempCart[existingIndex].price;
            console.log('🛒 addToCart - Updated existing item:', tempCart[existingIndex]);
    } else {
            tempCart.push(tempCartItem);
            console.log('🛒 addToCart - Added new item to tempCart');
          }
          
          console.log('🛒 addToCart - Final tempCart:', tempCart);
          console.log('   - tempCart length after:', tempCart.length);
          
          localStorage.setItem('temp_cart', JSON.stringify(tempCart));
          
          // Verify saved
          const savedCart = JSON.parse(localStorage.getItem('temp_cart') || '[]');
          console.log('🛒 addToCart - Verified saved tempCart:', savedCart);
          console.log('   - savedCart length:', savedCart.length);
          
    this.updateCartCount();
          // Force change detection để cập nhật cart count ngay lập tức
          this.cdr.detectChanges();
          alert(`Đã thêm "${product.tenSanPham}" vào giỏ hàng!`);
          return;
        }

        // Nếu đã đăng nhập, thêm vào giỏ hàng trong DB
        this.getOrCreateCart().then(cartId => {
          if (!cartId) {
            alert('Không thể tạo giỏ hàng. Vui lòng thử lại!');
            return;
          }

          // Tạo item để thêm vào giỏ hàng
          const cartItem: GioHangChoItem = {
            chiTietSanPhamId: chiTiet.id,
            tenSanPham: product.tenSanPham,
            soLuong: 1,
            donGia: price,
            giamGia: 0,
            thanhTien: price
          };

          // Thêm vào giỏ hàng qua backend
          this.hoaDonChoService.addItemToCart(cartId, cartItem).subscribe({
            next: (updatedCart) => {
              this.updateCartCount();
              // Force change detection để cập nhật cart count ngay lập tức
              this.cdr.detectChanges();
    alert(`Đã thêm "${product.tenSanPham}" vào giỏ hàng!`);
            },
            error: (error) => {
              console.error('Error adding to cart:', error);
              const errorMsg = error.error?.error || error.message || 'Không thể thêm sản phẩm vào giỏ hàng. Vui lòng thử lại!';
              alert(errorMsg);
            }
          });
        });
      },
      error: (error) => {
        console.error('Error loading product details:', error);
        alert('Không thể tải thông tin sản phẩm. Vui lòng thử lại!');
      }
    });
  }

  getOrCreateCart(): Promise<number | null> {
    return new Promise((resolve) => {
      const currentUser = this.authService.getCurrentUser();

      // Nếu user đã đăng nhập, tìm giỏ hàng theo khachHangId
      if (currentUser?.id) {
        // QUAN TRỌNG: Load giỏ hàng theo khachHangId để đảm bảo giỏ hàng đi theo khách hàng
        this.hoaDonChoService.getHoaDonChoByKhachHangId(currentUser.id).subscribe({
          next: (carts) => {
            // Tìm giỏ hàng đang chờ (trạng thái DANG_CHO)
            const activeCart = carts.find(c => c.trangThai === 'DANG_CHO');
            if (activeCart && activeCart.id) {
              console.log('✅ Found existing cart for customer:', activeCart.id);
              localStorage.setItem('current_cart_id', activeCart.id.toString());
              resolve(activeCart.id);
            } else {
              // Không có giỏ hàng đang chờ, tạo mới
              console.log('📦 No active cart found, creating new cart for customer:', currentUser.id);
              this.createNewCart(resolve);
            }
          },
          error: (error) => {
            console.error('Error loading cart by customer ID:', error);
            // Nếu lỗi, thử tạo mới
            this.createNewCart(resolve);
          }
        });
      } else {
        // Chưa đăng nhập, tạo giỏ hàng tạm (không có khachHangId)
        this.createNewCart(resolve);
      }
    });
  }

  createNewCart(resolve: (value: number | null) => void): void {
    const currentUser = this.authService.getCurrentUser();
    const maHoaDonCho = `HDC${Date.now()}`;
    const newCart: Partial<HoaDonCho> = {
      maHoaDonCho: maHoaDonCho,
      khachHangId: currentUser?.id || undefined,
      trangThai: 'DANG_CHO',
      danhSachGioHang: []
    };

    this.hoaDonChoService.createHoaDonCho(newCart).subscribe({
      next: (cart) => {
        if (cart && cart.id) {
          localStorage.setItem('current_cart_id', cart.id.toString());
          resolve(cart.id);
        } else {
          resolve(null);
        }
      },
      error: (error) => {
        console.error('Error creating cart:', error);
        resolve(null);
      }
    });
  }

  loadCart(): void {
    // Load cart count từ backend
    const currentUser = this.authService.getCurrentUser();

    // Nếu chưa đăng nhập, load từ localStorage
    if (!currentUser) {
      try {
        const tempCart = JSON.parse(localStorage.getItem('temp_cart') || '[]');
        this.cartCount = Array.isArray(tempCart) ? tempCart.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) : 0;
        } catch (e) {
        this.cartCount = 0;
      }
      // Force change detection để cập nhật cart count ngay lập tức
      this.cdr.detectChanges();
      return;
    }

    // Nếu đã đăng nhập, load cart từ backend
    this.hoaDonChoService.getHoaDonChoByKhachHangId(currentUser.id).subscribe({
      next: (carts) => {
        const activeCart = carts.find(c => c.trangThai === 'DANG_CHO');
        if (activeCart) {
          this.cartCount = activeCart.danhSachGioHang?.reduce((sum, item) => sum + (item.soLuong || 0), 0) || 0;
          localStorage.setItem('current_cart_id', activeCart.id!.toString());
        } else {
          this.cartCount = 0;
        }
        
        // Force change detection để cập nhật cart count ngay lập tức
        this.cdr.detectChanges();
      },
      error: (error) => {
        // Xử lý lỗi một cách graceful
        if (error.status === 0 || error.status === undefined) {
          // Connection refused - fallback to localStorage
          try {
            const tempCart = JSON.parse(localStorage.getItem('temp_cart') || '[]');
            this.cartCount = Array.isArray(tempCart) ? tempCart.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) : 0;
          } catch (e) {
            this.cartCount = 0;
          }
        } else {
          console.error('Error loading cart:', error);
          this.cartCount = 0;
        }
        
        // Force change detection
        this.cdr.detectChanges();
      }
    });
  }

  updateCartCount(): void {
    // Reload cart count từ backend
    this.loadCart();
    // Force change detection để cập nhật cart count ngay lập tức
    this.cdr.detectChanges();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  getProductPrice(product: SanPhamResponse): number {
    return Number(product.giaBan) || 0;
  }

  getProductImageUrl(product: SanPhamResponse): string {
    return product.anhSanPham || '/assets/default-product.png';
  }

  viewProduct(productId: number): void {
    this.router.navigate(['/shop/product', productId]);
  }

  addToCartFromDetail(cartItem: any): void {
    // Nếu chưa đăng nhập, lưu vào giỏ hàng tạm (localStorage)
    if (!this.authService.isLoggedIn()) {
      console.log('🛒 addToCartFromDetail - User not logged in, saving to temp_cart');
      
      const tempCart = JSON.parse(localStorage.getItem('temp_cart') || '[]');
      console.log('🛒 addToCartFromDetail - Current tempCart from localStorage:', tempCart);
      console.log('   - tempCart length before:', tempCart.length);
      
      const existingIndex = tempCart.findIndex((item: any) => item.chiTietSanPhamId === cartItem.chiTietSanPhamId);
      console.log('🛒 addToCartFromDetail - existingIndex:', existingIndex);
      
      if (existingIndex >= 0) {
        tempCart[existingIndex].quantity += cartItem.quantity;
        tempCart[existingIndex].totalItemPrice = tempCart[existingIndex].quantity * tempCart[existingIndex].price;
        console.log('🛒 addToCartFromDetail - Updated existing item:', tempCart[existingIndex]);
      } else {
        tempCart.push(cartItem);
        console.log('🛒 addToCartFromDetail - Added new item to tempCart');
      }
      
      console.log('🛒 addToCartFromDetail - Final tempCart:', tempCart);
      console.log('   - tempCart length after:', tempCart.length);
      
      localStorage.setItem('temp_cart', JSON.stringify(tempCart));
      
      // Verify saved
      const savedCart = JSON.parse(localStorage.getItem('temp_cart') || '[]');
      console.log('🛒 addToCartFromDetail - Verified saved tempCart:', savedCart);
      console.log('   - savedCart length:', savedCart.length);
      
      this.updateCartCount();
      alert(`Đã thêm "${cartItem.productName}" (x${cartItem.quantity}) vào giỏ hàng!`);
      return;
    }

    // Nếu đã đăng nhập, thêm vào giỏ hàng trong DB
    this.getOrCreateCart().then(cartId => {
      if (!cartId) {
        alert('Không thể tạo giỏ hàng. Vui lòng thử lại!');
        return;
      }

      // Tạo item để thêm vào giỏ hàng
      const gioHangItem: GioHangChoItem = {
        chiTietSanPhamId: cartItem.chiTietSanPhamId,
        tenSanPham: cartItem.productName,
        soLuong: cartItem.quantity,
        donGia: cartItem.price,
        giamGia: 0,
        thanhTien: cartItem.totalItemPrice
      };

      // Thêm vào giỏ hàng qua backend
      this.hoaDonChoService.addItemToCart(cartId, gioHangItem).subscribe({
        next: (updatedCart) => {
          this.updateCartCount();
          alert(`Đã thêm "${cartItem.productName}" (x${cartItem.quantity}) vào giỏ hàng!`);
        },
        error: (error) => {
          console.error('Error adding to cart:', error);
          const errorMsg = error.error?.error || error.message || 'Không thể thêm sản phẩm vào giỏ hàng. Vui lòng thử lại!';
          alert(errorMsg);
        }
      });
    });
  }

  goToCart(): void {
    console.log('goToCart() called - Navigating to /shop/cart');
    // Giỏ hàng là public, không cần kiểm tra quyền
    this.router.navigate(['/shop/cart']).then(
      (success) => {
        console.log('Navigation to cart successful:', success);
      },
      (error) => {
        console.error('Navigation to cart failed:', error);
      }
    );
  }

  /**
   * Load tên khách hàng từ DB
   */
  loadCustomerName(): void {
    if (!this.authService.isLoggedIn()) {
      this.customerName = '';
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      this.customerName = '';
      return;
    }

    // Load tên khách hàng từ DB
    this.customerService.getCustomerByUserId(currentUser.id).subscribe({
      next: (customer) => {
        console.log('✅ Customer name loaded:', customer.tenKhachHang);
        this.customerName = customer.tenKhachHang || currentUser.fullName || currentUser.username || 'Tài khoản';
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.warn('⚠️ Could not load customer name:', error);
        // Fallback to user's fullName or username
        this.customerName = currentUser.fullName || currentUser.username || 'Tài khoản';
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Navigate to customer profile
   */
  navigateToProfile(event: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const currentUser = this.authService.getCurrentUser();
    console.log('👤 Navigating to profile...');
    console.log('   - Current user:', currentUser);
    console.log('   - Is logged in:', this.authService.isLoggedIn());
    console.log('   - User roles:', currentUser?.roles);
    console.log('   - Has CUSTOMER role:', this.authService.hasRole('CUSTOMER'));
    
    if (!this.authService.isLoggedIn()) {
      console.warn('⚠️ User not logged in, redirecting to login');
      this.router.navigateByUrl('/login');
      return;
    }

    // Cho phép truy cập ngay cả khi không có role CUSTOMER (để test)
    // if (!this.authService.hasRole('CUSTOMER')) {
    //   console.warn('⚠️ User does not have CUSTOMER role');
    //   const userRoles = currentUser?.roles || [];
    //   if (userRoles.length === 0) {
    //     console.error('❌ User has no roles!');
    //     alert('Tài khoản của bạn chưa có quyền truy cập. Vui lòng liên hệ quản trị viên.');
    //     return;
    //   }
    //   // If user has ADMIN or STAFF role, redirect to dashboard
    //   if (this.authService.hasRole('ADMIN') || this.authService.hasRole('STAFF')) {
    //     console.log('ℹ️ User is ADMIN/STAFF, redirecting to dashboard');
    //     this.router.navigateByUrl('/dashboard');
    //     return;
    //   }
    // }

    console.log('✅ Navigating to /customer/profile');
    // Sử dụng navigateByUrl thay vì navigate để đảm bảo navigation hoạt động
    this.router.navigateByUrl('/customer/profile').then(
      (success) => {
        console.log('✅ Navigation to profile successful:', success);
        if (!success) {
          console.error('❌ Navigation returned false');
          alert('Không thể truy cập trang profile. Vui lòng kiểm tra lại quyền truy cập!');
        }
      },
      (error) => {
        console.error('❌ Navigation to profile failed:', error);
        alert('Không thể truy cập trang profile. Vui lòng thử lại!');
      }
    );
  }

  logout(): void {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      this.authService.logout();
      this.customerName = '';
      this.cartCount = 0;
      // Clear cart data
      localStorage.removeItem('temp_cart');
      localStorage.removeItem('current_cart_id');
      // Redirect to shop
      this.router.navigate(['/shop']);
      this.cdr.detectChanges();
    }
  }
}
