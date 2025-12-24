import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HoaDonDTO } from '../../../interfaces/hoa-don.interface';
import { AuthService } from '../../../services/auth';
import { ShopHeaderComponent } from '../shared/shop-header.component';
import { ShopFooterComponent } from '../shared/shop-footer.component';
import { HoaDonService } from '../../../services/hoa-don.service';

@Component({
  selector: 'app-shop-my-orders',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ShopHeaderComponent, ShopFooterComponent],
  templateUrl: './my-orders.component.html',
  styleUrls: ['./my-orders.component.scss']
})
export class ShopMyOrdersComponent implements OnInit {
  orders: HoaDonDTO[] = [];
  filteredOrders: HoaDonDTO[] = [];
  isLoading = false;
  error = '';
  searchTerm: string = '';
  isLoggedIn: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private location: Location,
    private cdr: ChangeDetectorRef,
    private hoaDonService: HoaDonService
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    
    // Nếu đã đăng nhập, chuyển đến customer/orders
    if (this.isLoggedIn) {
      this.router.navigate(['/customer/orders']);
      return;
    }

    // Load đơn hàng từ localStorage
    this.loadOrdersFromLocalStorage();

    // Kiểm tra query params để highlight đơn hàng vừa tạo
    const newOrderId = this.activatedRoute.snapshot.queryParams['newOrderId'];
    if (newOrderId) {
      setTimeout(() => {
        this.highlightNewOrder(newOrderId);
        // Xóa query param sau khi đã highlight
        this.router.navigate([], {
          relativeTo: this.activatedRoute,
          queryParams: {},
          replaceUrl: true
        });
      }, 200);
    }
  }

  /**
   * Load đơn hàng từ localStorage
   */
  loadOrdersFromLocalStorage(): void {
    this.isLoading = true;
    this.error = '';

    try {
      const storedOrders = localStorage.getItem('guest_orders');
      if (storedOrders) {
        const ordersData = JSON.parse(storedOrders);
        
        // Đảm bảo mỗi đơn hàng có danhSachSanPham
        const processedOrders = ordersData.map((order: any) => {
          // Nếu không có danhSachSanPham nhưng có danhSachChiTiet, map lại
          if (!order.danhSachSanPham && order.danhSachChiTiet && Array.isArray(order.danhSachChiTiet)) {
            order.danhSachSanPham = order.danhSachChiTiet.map((item: any) => ({
              id: item.id,
              chiTietSanPhamId: item.chiTietSanPhamId,
              tenSanPham: item.tenSanPham || 'Sản phẩm',
              maSanPham: item.maSanPham,
              mauSac: item.mauSac,
              kichThuoc: item.kichThuoc,
              nhaSanXuat: item.nhaSanXuat,
              soLuong: item.soLuong || 0,
              donGia: item.donGia ? Number(item.donGia) : 0,
              giamGia: item.giamGia ? Number(item.giamGia) : 0,
              thanhTien: item.thanhTien ? Number(item.thanhTien) : 0,
              anhSanPham: item.anhSanPham,
              sanPhamId: item.chiTietSanPhamId
            }));
          }
          
          // Đảm bảo các trường số được convert đúng
          if (order.tongTien && typeof order.tongTien === 'string') {
            order.tongTien = Number(order.tongTien);
          }
          if (order.thanhTien && typeof order.thanhTien === 'string') {
            order.thanhTien = Number(order.thanhTien);
          }
          if (order.tienGiamGia && typeof order.tienGiamGia === 'string') {
            order.tienGiamGia = Number(order.tienGiamGia);
          }
          if (order.phiGiaoHang && typeof order.phiGiaoHang === 'string') {
            order.phiGiaoHang = Number(order.phiGiaoHang);
          }
          
          return order;
        });
        
        // Sắp xếp theo ngày tạo mới nhất
        this.orders = processedOrders.sort((a: HoaDonDTO, b: HoaDonDTO) => {
          const dateA = new Date(a.ngayTao || '').getTime();
          const dateB = new Date(b.ngayTao || '').getTime();
          return dateB - dateA;
        });
        
        this.filterOrders();
        console.log('✅ Loaded', this.orders.length, 'orders from localStorage');
        console.log('📦 Sample order:', this.orders[0]);
      } else {
        this.orders = [];
        this.filteredOrders = [];
        console.log('ℹ️ No orders found in localStorage');
      }
    } catch (error) {
      console.error('❌ Error loading orders from localStorage:', error);
      this.error = 'Không thể tải danh sách đơn hàng. Vui lòng thử lại!';
      this.orders = [];
      this.filteredOrders = [];
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Lọc đơn hàng theo mã đơn hàng
   */
  filterOrders(): void {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.filteredOrders = [...this.orders];
    } else {
      const searchLower = this.searchTerm.toLowerCase().trim();
      this.filteredOrders = this.orders.filter(order => 
        order.maHoaDon?.toLowerCase().includes(searchLower)
      );
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
   * Xem chi tiết đơn hàng
   */
  viewOrderDetail(orderId: number): void {
    // Nếu đã đăng nhập, dùng route customer
    if (this.isLoggedIn) {
      this.router.navigate(['/customer/orders', orderId]);
    } else {
      // Nếu chưa đăng nhập, dùng route shop với query param
      this.router.navigate(['/shop/invoice', orderId], {
        queryParams: { isGuest: 'true' }
      });
    }
  }

  /**
   * Hủy đơn hàng (chỉ cho phép khi chưa đăng nhập và đơn hàng ở trạng thái CHO_XAC_NHAN)
   */
  cancelOrder(orderId: number): void {
    if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) {
      return;
    }

    // Tìm đơn hàng trong localStorage
    const orderIndex = this.orders.findIndex(order => order.id === orderId);
    if (orderIndex === -1) {
      alert('Không tìm thấy đơn hàng!');
      return;
    }

    const order = this.orders[orderIndex];
    
    // Chỉ cho phép hủy nếu đơn hàng ở trạng thái CHO_XAC_NHAN
    if (order.trangThai !== 'CHO_XAC_NHAN') {
      alert('Chỉ có thể hủy đơn hàng ở trạng thái "Chờ xác nhận"!');
      return;
    }

    // Gọi API để hủy đơn hàng
    this.hoaDonService.cancelCustomerOrder(orderId).subscribe({
      next: () => {
        // Cập nhật trạng thái trong localStorage
        order.trangThai = 'HUY';
        this.updateOrdersInLocalStorage();
        alert('Đã hủy đơn hàng thành công!');
        this.filterOrders();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error canceling order:', error);
        alert(error.error?.message || 'Không thể hủy đơn hàng. Vui lòng thử lại!');
      }
    });
  }

  /**
   * Cập nhật đơn hàng trong localStorage
   */
  updateOrdersInLocalStorage(): void {
    try {
      localStorage.setItem('guest_orders', JSON.stringify(this.orders));
    } catch (error) {
      console.error('❌ Error updating orders in localStorage:', error);
    }
  }

  /**
   * Lấy nhãn trạng thái
   */
  getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'CHO_XAC_NHAN': 'Chờ xác nhận',
      'DA_XAC_NHAN': 'Chờ vận chuyển',
      'DANG_GIAO_HANG': 'Đang giao hàng',
      'DANG_VAN_CHUYEN': 'Đang vận chuyển',
      'DA_GIAO_HANG': 'Đã giao hàng',
      'DA_HOAN_THANH': 'Đã hoàn thành',
      'HUY': 'Đã hủy',
      'DA_HUY': 'Đã hủy'
    };
    return statusMap[status] || status;
  }

  /**
   * Lấy class trạng thái
   */
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

  /**
   * Format tiền tệ
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  /**
   * Format ngày tháng
   */
  formatDate(date: string | Date): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('vi-VN');
  }

  /**
   * Kiểm tra có thể hủy đơn hàng không
   */
  canCancel(order: HoaDonDTO): boolean {
    return order.trangThai === 'CHO_XAC_NHAN';
  }

  /**
   * Quay lại
   */
  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/shop']);
    }
  }

  /**
   * Highlight đơn hàng vừa tạo
   */
  highlightNewOrder(orderId: string | number): void {
    const orderIdNum = typeof orderId === 'string' ? parseInt(orderId, 10) : orderId;
    console.log('🎯 Highlighting new order:', orderIdNum);
    
    // Tìm đơn hàng trong danh sách
    const orderIndex = this.orders.findIndex(order => order.id === orderIdNum);
    
    if (orderIndex !== -1) {
      // Scroll đến đơn hàng vừa tạo
      setTimeout(() => {
        const orderElement = document.getElementById(`order-${orderIdNum}`);
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
      console.log('⚠️ Order not found in localStorage');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * Đăng nhập để xem tất cả đơn hàng
   */
  goToLogin(): void {
    this.router.navigate(['/shop/login'], {
      queryParams: { returnUrl: '/shop/my-orders' }
    });
  }
}

