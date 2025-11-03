import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HoaDonService } from '../../services/hoa-don.service';
import { HoaDonDTO } from '../../interfaces/hoa-don.interface';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-customer-orders',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './customer-orders.component.html',
  styleUrls: ['./customer-orders.component.scss']
})
export class CustomerOrdersComponent implements OnInit {
  orders: HoaDonDTO[] = [];
  isLoading = false;
  error = '';
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  pageSize = 10;

  constructor(
    private hoaDonService: HoaDonService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.isCustomer()) {
      this.router.navigate(['/shop']);
      return;
    }
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading = true;
    this.error = '';

    this.hoaDonService.getCustomerOrders(this.currentPage, this.pageSize).subscribe({
      next: (response: any) => {
        console.log('Customer orders response:', response);
        if (response.content) {
          this.orders = response.content;
          this.totalPages = response.totalPages || 0;
          this.totalElements = response.totalElements || 0;
        } else {
          this.orders = [];
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading customer orders:', error);
        this.error = 'Không thể tải danh sách đơn hàng. Vui lòng thử lại!';
        this.isLoading = false;
      }
    });
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadOrders();
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
      'DA_XAC_NHAN': 'Đã xác nhận',
      'DANG_GIAO_HANG': 'Đang giao hàng',
      'DA_GIAO_HANG': 'Đã giao hàng',
      'HUY': 'Đã hủy'
    };
    return statusMap[status] || status;
  }

  getStatusClass(status: string): string {
    const classMap: { [key: string]: string } = {
      'CHO_XAC_NHAN': 'status-waiting',
      'DA_XAC_NHAN': 'status-confirmed',
      'DANG_GIAO_HANG': 'status-shipping',
      'DA_GIAO_HANG': 'status-delivered',
      'HUY': 'status-cancelled'
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
}

