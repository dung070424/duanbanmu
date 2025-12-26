import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HoaDonService } from '../../services/hoa-don.service';
import { HoaDonDTO } from '../../interfaces/hoa-don.interface';
import { AuthService } from '../../services/auth';
import { ShopHeaderComponent } from '../shop/shared/shop-header.component';
import { ShopFooterComponent } from '../shop/shared/shop-footer.component';

@Component({
  selector: 'app-customer-orders',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ShopHeaderComponent, ShopFooterComponent],
  templateUrl: './customer-orders.component.html',
  styleUrls: ['./customer-orders.component.scss']
})
export class CustomerOrdersComponent implements OnInit {
  orders: HoaDonDTO[] = [];
  filteredOrders: HoaDonDTO[] = [];
  isLoading = false;
  error = '';
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  pageSize = 10;
  searchTerm: string = ''; // Tìm kiếm theo mã đơn hàng
  
  // Tra cứu đơn hàng (cho khách hàng chưa đăng nhập)
  orderCodeSearch: string = '';
  searchedOrder: HoaDonDTO | null = null;
  isSearching = false;
  searchError = '';

  constructor(
    private hoaDonService: HoaDonService,
    public authService: AuthService, // Changed to public để dùng trong template
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private location: Location,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('📋 Customer Orders Component initialized');
    console.log('📋 User logged in:', this.authService.isLoggedIn());
    
    // QUAN TRỌNG: Khi chưa đăng nhập, CHỈ hiển thị view tra cứu đơn hàng
    // KHÔNG load đơn hàng từ localStorage, người dùng phải nhập mã hóa đơn để tra cứu
    if (!this.authService.isLoggedIn()) {
      this.isLoading = false;
      // Kiểm tra query params để tự động điền mã hóa đơn nếu có
      const orderCode = this.activatedRoute.snapshot.queryParams['orderCode'];
      if (orderCode) {
        this.orderCodeSearch = orderCode;
        // Tự động tra cứu nếu có mã trong query params
        setTimeout(() => {
          this.searchOrderByCode();
        }, 500);
        // Xóa query param sau khi đã sử dụng
        this.router.navigate([], {
          relativeTo: this.activatedRoute,
          queryParams: {},
          replaceUrl: true
        });
      }
      return;
    }
    
    // Nếu đã đăng nhập, load đơn hàng từ API
    this.isLoading = true;
    
    // Kiểm tra query params để highlight đơn hàng vừa tạo
    const newOrderId = this.activatedRoute.snapshot.queryParams['newOrderId'];
    if (newOrderId) {
      console.log('📋 New order ID from query params:', newOrderId);
      // Load orders và sau đó highlight đơn hàng vừa tạo
      this.loadOrders(() => {
        this.highlightNewOrder(parseInt(newOrderId, 10));
        // Xóa query param sau khi đã highlight
        this.router.navigate([], {
          relativeTo: this.activatedRoute,
          queryParams: {},
          replaceUrl: true
        });
      });
    } else {
      this.loadOrders();
    }
    
    // Auto refresh orders every 30 seconds to update status (chỉ khi đã đăng nhập)
    setInterval(() => {
      if (!this.isLoading) { // Chỉ refresh nếu không đang load
        this.loadOrders();
      }
    }, 30000);
  }

  loadOrders(callback?: () => void): void {
    // Set isLoading = true khi bắt đầu load (trừ lần đầu đã set trong ngOnInit)
    if (!this.isLoading) {
      this.isLoading = true;
    }
    this.error = '';

    // Nếu đã đăng nhập, load từ API
    if (this.authService.isLoggedIn()) {
      console.log('📋 Loading customer orders from API, page:', this.currentPage, 'size:', this.pageSize);

      this.hoaDonService.getCustomerOrders(this.currentPage, this.pageSize).subscribe({
        next: (response: any) => {
          console.log('✅ Customer orders response:', {
            contentLength: response.content?.length || 0,
            totalElements: response.totalElements || 0,
            totalPages: response.totalPages || 0,
            currentPage: response.currentPage || 0
          });
          
          if (response.content && Array.isArray(response.content)) {
            this.orders = response.content;
            this.totalPages = response.totalPages || 0;
            this.totalElements = response.totalElements || 0;
            this.filterOrders(); // Áp dụng filter sau khi load
            console.log('✅ Loaded', this.orders.length, 'orders from API');
          } else {
            this.orders = [];
            this.filteredOrders = [];
            this.totalPages = 0;
            this.totalElements = 0;
            console.log('⚠️ No orders found or invalid response format');
          }
          
          this.isLoading = false;
          
          // Force change detection để đảm bảo UI được cập nhật
          this.cdr.detectChanges();
          
          // Gọi callback nếu có (để highlight đơn hàng mới)
          if (callback) {
            setTimeout(() => callback(), 100); // Đợi một chút để DOM render
          }
        },
        error: (error) => {
          console.error('❌ Error loading customer orders:', error);
          this.error = 'Không thể tải danh sách đơn hàng. Vui lòng thử lại!';
          this.orders = [];
          this.filteredOrders = [];
          this.isLoading = false;
          
          // Force change detection để đảm bảo UI được cập nhật
          this.cdr.detectChanges();
          
          // Vẫn gọi callback nếu có lỗi
          if (callback) {
            callback();
          }
        }
      });
    } else {
      // QUAN TRỌNG: Khi chưa đăng nhập, KHÔNG load từ localStorage
      // Người dùng phải tra cứu bằng mã hóa đơn
      console.log('📋 User not logged in - showing order lookup view only');
      this.orders = [];
      this.filteredOrders = [];
      this.totalElements = 0;
      this.totalPages = 0;
      this.isLoading = false;
      this.cdr.detectChanges();
      
      // Gọi callback nếu có
      if (callback) {
        setTimeout(() => callback(), 100);
      }
    }
  }

  /**
   * Load đơn hàng từ localStorage (cho khách hàng chưa đăng nhập)
   */
  private loadOrdersFromLocalStorage(): void {
    try {
      const storedOrders = localStorage.getItem('guest_orders');
      if (storedOrders) {
        const orders = JSON.parse(storedOrders);
        // Sắp xếp theo ngày tạo (mới nhất trước)
        this.orders = orders.sort((a: HoaDonDTO, b: HoaDonDTO) => {
          const dateA = new Date(a.ngayTao).getTime();
          const dateB = new Date(b.ngayTao).getTime();
          return dateB - dateA;
        });
        this.totalElements = this.orders.length;
        this.totalPages = Math.ceil(this.totalElements / this.pageSize);
        this.filterOrders();
        console.log('✅ Loaded', this.orders.length, 'orders from localStorage');
      } else {
        this.orders = [];
        this.filteredOrders = [];
        this.totalElements = 0;
        this.totalPages = 0;
        console.log('⚠️ No orders found in localStorage');
      }
    } catch (error) {
      console.error('❌ Error loading orders from localStorage:', error);
      this.orders = [];
      this.filteredOrders = [];
      this.totalElements = 0;
      this.totalPages = 0;
    }
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    if (this.authService.isLoggedIn()) {
      this.loadOrders();
    } else {
      // Với localStorage, chỉ cần filter lại
      this.filterOrders();
    }
  }

  viewOrderDetail(orderId: number): void {
    this.router.navigate(['/customer/orders', orderId]);
  }

  cancelOrder(orderId: number): void {
    if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) {
      return;
    }

    this.hoaDonService.cancelCustomerOrder(orderId).subscribe({
      next: () => {
        alert('Đã hủy đơn hàng thành công!');
        this.loadOrders();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error canceling order:', error);
        alert(error.error?.message || 'Không thể hủy đơn hàng. Vui lòng thử lại!');
      }
    });
  }

  getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'CHO_XAC_NHAN': 'Chờ xác nhận',
      'DA_XAC_NHAN': 'Đã xác nhận (Chờ vận chuyển)',
      'DANG_GIAO_HANG': 'Đang giao hàng',
      'DANG_VAN_CHUYEN': 'Đang vận chuyển',
      'DA_GIAO_HANG': 'Đã giao hàng',
      'DA_HOAN_THANH': 'Đã hoàn thành',
      'HUY': 'Đã hủy',
      'DA_HUY': 'Đã hủy'
    };
    return statusMap[status] || status;
  }

  getStatusClass(status: string): string {
    const classMap: { [key: string]: string } = {
      'CHO_XAC_NHAN': 'status-waiting',
      'DA_XAC_NHAN': 'status-confirmed',
      'DANG_GIAO_HANG': 'status-shipping',
      'DANG_VAN_CHUYEN': 'status-shipping',
      'DA_GIAO_HANG': 'status-delivered',
      'DA_HOAN_THANH': 'status-delivered',
      'HUY': 'status-cancelled',
      'DA_HUY': 'status-cancelled'
    };
    return classMap[status] || '';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  formatDate(date: string | Date): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('vi-VN');
  }

  canCancel(order: HoaDonDTO): boolean {
    return order.trangThai === 'CHO_XAC_NHAN';
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/shop']);
    }
  }

  /**
   * Lọc đơn hàng theo mã đơn hàng và áp dụng pagination
   */
  filterOrders(): void {
    let filtered: HoaDonDTO[] = [];
    
    // Lọc theo search term
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      filtered = [...this.orders];
    } else {
      const searchLower = this.searchTerm.toLowerCase().trim();
      filtered = this.orders.filter(order => 
        order.maHoaDon?.toLowerCase().includes(searchLower)
      );
    }
    
    // Áp dụng pagination cho localStorage orders (khi chưa đăng nhập)
    if (!this.authService.isLoggedIn()) {
      const startIndex = this.currentPage * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      this.filteredOrders = filtered.slice(startIndex, endIndex);
      this.totalElements = filtered.length;
      this.totalPages = Math.ceil(this.totalElements / this.pageSize);
    } else {
      // Với API, filteredOrders đã được pagination từ backend
      this.filteredOrders = filtered;
    }
    
    this.cdr.detectChanges();
  }

  /**
   * Xử lý khi thay đổi search term
   */
  onSearchChange(): void {
    this.filterOrders();
  }

  /**
   * Xóa search term
   */
  clearSearch(): void {
    this.searchTerm = '';
    this.filterOrders();
  }

  /**
   * Tra cứu đơn hàng theo mã hóa đơn (cho khách hàng chưa đăng nhập)
   */
  searchOrderByCode(): void {
    if (!this.orderCodeSearch || this.orderCodeSearch.trim() === '') {
      this.searchError = 'Vui lòng nhập mã hóa đơn';
      return;
    }

    this.isSearching = true;
    this.searchError = '';
    this.searchedOrder = null;

    this.hoaDonService.searchOrderByCode(this.orderCodeSearch.trim()).subscribe({
      next: (order: HoaDonDTO) => {
        this.searchedOrder = order;
        this.isSearching = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error searching order:', error);
        this.searchError = error.error?.message || 'Không tìm thấy đơn hàng với mã này. Vui lòng kiểm tra lại mã hóa đơn!';
        this.searchedOrder = null;
        this.isSearching = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Xóa kết quả tra cứu
   */
  clearSearchResult(): void {
    this.orderCodeSearch = '';
    this.searchedOrder = null;
    this.searchError = '';
  }

  /**
   * Highlight đơn hàng vừa tạo
   */
  highlightNewOrder(orderId: number): void {
    console.log('🎯 Highlighting new order:', orderId);
    
    // Tìm đơn hàng trong danh sách
    const orderIndex = this.orders.findIndex(order => order.id === orderId);
    
    if (orderIndex !== -1) {
      // Scroll đến đơn hàng vừa tạo
      setTimeout(() => {
        const orderElement = document.getElementById(`order-${orderId}`);
        if (orderElement) {
          orderElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Highlight với animation
          orderElement.classList.add('new-order-highlight');
          
          // Xóa highlight sau 3 giây
          setTimeout(() => {
            orderElement.classList.remove('new-order-highlight');
          }, 3000);
        }
      }, 200);
    } else {
      console.log('⚠️ Order not found in current page, might be on another page');
      // Có thể đơn hàng ở trang khác, nhưng vẫn scroll lên đầu trang
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}

