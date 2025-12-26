import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HoaDonService } from '../../../services/hoa-don.service';
import { HoaDonDTO } from '../../../interfaces/hoa-don.interface';
import { AuthService } from '../../../services/auth';
import { ShopHeaderComponent } from '../shared/shop-header.component';
import { ShopFooterComponent } from '../shared/shop-footer.component';

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
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  pageSize = 10;
  searchTerm: string = '';

  constructor(
    private hoaDonService: HoaDonService,
    public authService: AuthService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private location: Location,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Nếu đã đăng nhập, redirect đến trang đơn hàng của khách hàng
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/customer/orders']);
      return;
    }

    // Load đơn hàng từ localStorage
    this.loadOrdersFromLocalStorage();

    // Kiểm tra query params để highlight đơn hàng vừa tạo
    const newOrderId = this.activatedRoute.snapshot.queryParams['newOrderId'];
    if (newOrderId) {
      console.log('📋 New order ID from query params:', newOrderId);
      setTimeout(() => {
        this.highlightNewOrder(parseInt(newOrderId, 10));
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
      const guestOrdersData = localStorage.getItem('guest_orders');
      console.log('📋 Loading guest orders from localStorage:', guestOrdersData ? 'EXISTS' : 'NOT FOUND');

      if (guestOrdersData && guestOrdersData.trim() !== '' && guestOrdersData !== 'null') {
        const parsed = JSON.parse(guestOrdersData);
        console.log('📋 Parsed guest orders:', parsed);

        // Xử lý cả trường hợp là array hoặc object
        let ordersArray: any[] = [];
        if (Array.isArray(parsed)) {
          ordersArray = parsed;
        } else if (parsed && typeof parsed === 'object') {
          // Nếu là object, có thể là single order hoặc object chứa orders
          if (parsed.id || parsed.maHoaDon) {
            ordersArray = [parsed];
          } else if (parsed.orders && Array.isArray(parsed.orders)) {
            ordersArray = parsed.orders;
          } else if (parsed.content && Array.isArray(parsed.content)) {
            ordersArray = parsed.content;
          }
        }

        // Map và xử lý dữ liệu đơn hàng
        this.orders = ordersArray.map((order: any) => {
          // Đảm bảo danhSachSanPham có dữ liệu
          if (!order.danhSachSanPham && order.danhSachChiTiet) {
            // Map từ danhSachChiTiet sang danhSachSanPham
            order.danhSachSanPham = order.danhSachChiTiet.map((item: any) => ({
              tenSanPham: item.tenSanPham || item.name || '',
              soLuong: item.soLuong || item.quantity || 1,
              donGia: item.donGia || item.unitPrice || 0,
              thanhTien: item.thanhTien || item.total || 0,
              anhSanPham: item.anhSanPham || item.imageUrl || '',
              mauSac: item.mauSac || '',
              kichThuoc: item.kichThuoc || '',
              maSanPham: item.maSanPham || item.code || '',
              moTa: item.moTa || item.description || '',
            }));
          } else if (order.danhSachSanPham && Array.isArray(order.danhSachSanPham)) {
            // Đảm bảo các trường chi tiết có trong danhSachSanPham
            order.danhSachSanPham = order.danhSachSanPham.map((product: any) => ({
              ...product,
              imageUrl: product.imageUrl || product.anhSanPham || '',
              name: product.name || product.tenSanPham || '',
              quantity: product.quantity || product.soLuong || 1,
              unitPrice: product.unitPrice || product.donGia || 0,
              total: product.total || product.thanhTien || 0,
              code: product.code || product.maSanPham || '',
              description: product.description || product.moTa || '',
            }));
          }

          // Đảm bảo các trường số được parse đúng
          if (typeof order.tongTien === 'string') {
            order.tongTien = parseFloat(order.tongTien) || 0;
          }
          if (typeof order.thanhTien === 'string') {
            order.thanhTien = parseFloat(order.thanhTien) || 0;
          }
          if (typeof order.tienGiamGia === 'string') {
            order.tienGiamGia = parseFloat(order.tienGiamGia) || 0;
          }
          if (typeof order.soLuongSanPham === 'string') {
            order.soLuongSanPham = parseInt(order.soLuongSanPham, 10) || 0;
          }

          return order;
        });

        // Sắp xếp theo ngày tạo (mới nhất trước)
        this.orders.sort((a, b) => {
          const dateA = new Date(a.ngayTao || 0).getTime();
          const dateB = new Date(b.ngayTao || 0).getTime();
          return dateB - dateA;
        });

        this.totalElements = this.orders.length;
        this.totalPages = Math.ceil(this.totalElements / this.pageSize);

        console.log('✅ Loaded', this.orders.length, 'guest orders from localStorage');
        this.filterOrders();
      } else {
        this.orders = [];
        this.filteredOrders = [];
        this.totalElements = 0;
        this.totalPages = 0;
        console.log('⚠️ No guest orders found in localStorage');
      }

      this.isLoading = false;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('❌ Error loading guest orders from localStorage:', error);
      this.error = 'Không thể tải danh sách đơn hàng. Vui lòng thử lại!';
      this.orders = [];
      this.filteredOrders = [];
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.filterOrders();
  }

  viewOrderDetail(orderId: number): void {
    // Nếu đã đăng nhập, chuyển đến trang chi tiết đơn hàng của khách hàng
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/customer/orders', orderId]);
    } else {
      // Chưa đăng nhập, hiển thị thông báo hoặc redirect đến login
      this.showToast('Vui lòng đăng nhập để xem chi tiết đơn hàng!', 'warning');
      this.router.navigate(['/shop/login'], {
        queryParams: { returnUrl: `/shop/my-orders` }
      });
    }
  }

  async cancelOrder(orderId: number): Promise<void> {
    const confirmed = await this.showConfirm('Bạn có chắc chắn muốn hủy đơn hàng này?');
    if (!confirmed) {
      return;
    }

    // Nếu đã đăng nhập, gọi API để hủy
    if (this.authService.isLoggedIn()) {
      this.hoaDonService.cancelCustomerOrder(orderId).subscribe({
        next: () => {
          this.showToast('Đã hủy đơn hàng thành công!', 'success');
          this.loadOrdersFromLocalStorage();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error canceling order:', error);
          this.showToast(error.error?.message || 'Không thể hủy đơn hàng. Vui lòng thử lại!', 'error');
        }
      });
    } else {
      // Chưa đăng nhập, chỉ xóa khỏi localStorage
      const guestOrdersData = localStorage.getItem('guest_orders');
      if (guestOrdersData) {
        try {
          const parsed = JSON.parse(guestOrdersData);
          let ordersArray: any[] = [];
          if (Array.isArray(parsed)) {
            ordersArray = parsed;
          } else if (parsed && typeof parsed === 'object') {
            if (parsed.id || parsed.maHoaDon) {
              ordersArray = [parsed];
            } else if (parsed.orders && Array.isArray(parsed.orders)) {
              ordersArray = parsed.orders;
            }
          }

          ordersArray = ordersArray.filter((order: any) => order.id !== orderId);
          localStorage.setItem('guest_orders', JSON.stringify(ordersArray));
          this.loadOrdersFromLocalStorage();
          this.showToast('Đã xóa đơn hàng khỏi danh sách!', 'success');
        } catch (error) {
          console.error('Error removing order from localStorage:', error);
          this.showToast('Không thể xóa đơn hàng. Vui lòng thử lại!', 'error');
        }
      }
    }
  }

  getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'CHO_XAC_NHAN': 'Chờ xác nhận',
      'CHO_VAN_CHUYEN': 'Chờ vận chuyển',
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
      'CHO_VAN_CHUYEN': 'status-confirmed',
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

    // Áp dụng pagination
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.filteredOrders = this.filteredOrders.slice(startIndex, endIndex);
    this.totalPages = Math.ceil(this.orders.filter(order => 
      !this.searchTerm || order.maHoaDon?.toLowerCase().includes(this.searchTerm.toLowerCase().trim())
    ).length / this.pageSize);

    this.cdr.detectChanges();
  }

  /**
   * Xử lý khi thay đổi search term
   */
  onSearchChange(): void {
    this.currentPage = 0; // Reset về trang đầu khi search
    this.filterOrders();
  }

  /**
   * Xóa search term
   */
  clearSearch(): void {
    this.searchTerm = '';
    this.currentPage = 0;
    this.filterOrders();
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * Hiển thị toast notification ở giữa màn hình (không dùng class)
   */
  showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    const toast = document.createElement('div');
    const colors: { [key: string]: string } = {
      success: '#28a745',
      error: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8'
    };
    const icons: { [key: string]: string } = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    
    toast.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: ${colors[type]};
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 10px;
      max-width: 400px;
      text-align: center;
      animation: fadeIn 0.3s ease-out;
    `;
    
    toast.innerHTML = `
      <span style="font-size: 18px;">${icons[type]}</span>
      <span>${message}</span>
    `;
    
    if (!document.getElementById('toast-animations')) {
      const style = document.createElement('style');
      style.id = 'toast-animations';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -60%); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: translate(-50%, -50%); }
          to { opacity: 0; transform: translate(-50%, -40%); }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Hiển thị confirm dialog ở giữa màn hình (không dùng class)
   */
  showConfirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.2s ease-out;
      `;
      
      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background: white;
        padding: 24px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        max-width: 400px;
        width: 90%;
        text-align: center;
      `;
      
      dialog.innerHTML = `
        <div style="margin-bottom: 20px; font-size: 16px; color: #333;">${message}</div>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button id="confirm-yes" style="
            padding: 10px 24px;
            background: #28a745;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
          ">Xác nhận</button>
          <button id="confirm-no" style="
            padding: 10px 24px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
          ">Hủy</button>
        </div>
      `;
      
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
      
      const removeDialog = () => {
        overlay.style.animation = 'fadeOut 0.2s ease-out';
        setTimeout(() => overlay.remove(), 200);
      };
      
      dialog.querySelector('#confirm-yes')?.addEventListener('click', () => {
        resolve(true);
        removeDialog();
      });
      
      dialog.querySelector('#confirm-no')?.addEventListener('click', () => {
        resolve(false);
        removeDialog();
      });
      
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          resolve(false);
          removeDialog();
        }
      });
    });
  }
}
