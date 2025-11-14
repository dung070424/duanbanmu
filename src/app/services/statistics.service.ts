import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface BestSellingProductDTO {
  chiTietSanPhamId: number;
  sanPhamId: number;
  tenSanPham: string; // Từ bảng san_pham thông qua san_pham_id
  mauSac: string | null; // Từ bảng mau_sac thông qua chi_tiet_san_pham -> mau_sac_id
  kieuDang: string | null; // Từ bảng kieu_dang_mu thông qua san_pham -> kieu_dang_mu_id
  donGia: number; // Từ hoa_don_chi_tiet
  soLuongBan: number; // Tổng số lượng đã bán từ hoa_don_chi_tiet
}

export interface PeriodStatisticsDTO {
  doanhThu: number;        // Tổng thanhTien
  sanPhamDaBan: number;     // Tổng soLuongSanPham
  donHang: number;           // Số lượng đơn hàng
  period: string;           // Loại khoảng thời gian: "day", "week", "month", "year"
  actualRevenue?: number;    // Tổng thanhTien của các hóa đơn đã thanh toán
  debtRevenue?: number;      // Công nợ = doanhThu - actualRevenue
}

export interface WeeklyRevenueDTO {
  weekLabel: string;       // Ví dụ: "Tuần 1", "Tuần 2"
  startDate: string;       // Ngày bắt đầu tuần
  endDate: string;         // Ngày kết thúc tuần
  totalRevenue: number;    // Tổng doanh thu của tuần
  totalOrders: number;     // Tổng số đơn hàng trong tuần
}

export interface BrandStatisticsDTO {
  nhaSanXuatId: number;
  tenNhaSanXuat: string;   // Tên nhà sản xuất
  tongSoLuongMua: number; // Tổng số lượng đã mua
}

export interface OrderStatusStatisticsDTO {
  label: string;      // Tên trạng thái: "Chờ xác nhận", "Chờ giao hàng", etc.
  count: number;      // Số lượng đơn hàng
  color: string;      // Màu sắc để hiển thị
  statusCode: string; // Mã trạng thái từ enum
}

export interface ChannelStatisticsDTO {
  channel: string;  // "Online" hoặc "Tại quầy"
  count: number;    // Số lượng đơn hàng
  color: string;   // Màu sắc để hiển thị
}

export interface LowStockProductDTO {
  sanPhamId: number;
  tenSanPham: string;
  soLuongTon: number; // Số lượng tồn kho hiện tại
}

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {
  private apiUrl = `${environment.apiUrl}/statistics`;

  constructor(private http: HttpClient) {}

  getBestSellingProducts(limit: number = 5): Observable<{ data: BestSellingProductDTO[], total: number }> {
    let params = new HttpParams();
    params = params.append('limit', limit.toString());
    
    const fullUrl = `${this.apiUrl}/best-selling-products?limit=${limit}`;
    console.log('📡 [StatisticsService] Calling API:', fullUrl);
    console.log('📡 [StatisticsService] Base URL:', this.apiUrl);
    console.log('📡 [StatisticsService] Environment API URL:', environment.apiUrl);
    
    return this.http.get<{ data: BestSellingProductDTO[], total: number }>(
      `${this.apiUrl}/best-selling-products`,
      { params }
    ).pipe(
      // Thêm logging để debug
      tap({
        next: (response) => {
          console.log('📥 [StatisticsService] API Response received:', response);
          if (response.data) {
            console.log(`   - Data array length: ${response.data.length}`);
            if (response.data.length > 0) {
              console.log(`   - First item:`, response.data[0]);
            }
          }
        },
        error: (error) => {
          console.error('❌ [StatisticsService] API Error occurred:');
          console.error('   - URL:', fullUrl);
          console.error('   - Status:', error.status);
          console.error('   - Status Text:', error.statusText);
          console.error('   - Message:', error.message);
          if (error.error) {
            console.error('   - Error Body:', error.error);
          }
          if (error.url) {
            console.error('   - Requested URL:', error.url);
          }
        }
      })
    );
  }

  getBestSellingProductsByPeriod(period: 'day' | 'week' | 'month' | 'year', limit: number = 5): Observable<{ data: BestSellingProductDTO[], total: number, period: string }> {
    let params = new HttpParams()
      .set('period', period)
      .set('limit', limit.toString());

    const fullUrl = `${this.apiUrl}/best-selling-products/period?period=${period}&limit=${limit}`;
    console.log('📡 [StatisticsService] Calling Best Selling Products by Period API:', fullUrl);

    return this.http.get<{ data: BestSellingProductDTO[], total: number, period: string }>(
      `${this.apiUrl}/best-selling-products/period`,
      { params }
    ).pipe(
      tap({
        next: (response) => {
          console.log(`📥 [StatisticsService] Best Selling Products (${period}) received:`, response);
        },
        error: (error) => {
          console.error(`❌ [StatisticsService] Best Selling Products (${period}) Error:`, error);
        }
      })
    );
  }

  getBestSellingProductsByDateRange(startDate: string, endDate: string, limit: number = 5): Observable<{ data: BestSellingProductDTO[], total: number, startDate: string, endDate: string }> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate)
      .set('limit', limit.toString());

    const fullUrl = `${this.apiUrl}/best-selling-products/date-range?startDate=${startDate}&endDate=${endDate}&limit=${limit}`;
    console.log('📡 [StatisticsService] Calling Best Selling Products by Date Range API:', fullUrl);

    return this.http.get<{ data: BestSellingProductDTO[], total: number, startDate: string, endDate: string }>(
      `${this.apiUrl}/best-selling-products/date-range`,
      { params }
    ).pipe(
      tap({
        next: (response) => {
          console.log(`📥 [StatisticsService] Best Selling Products (date range ${startDate} -> ${endDate}) received:`, response);
        },
        error: (error) => {
          console.error('❌ [StatisticsService] Best Selling Products (date range) Error:', error);
        }
      })
    );
  }

  getPeriodStatistics(period: 'day' | 'week' | 'month' | 'year'): Observable<PeriodStatisticsDTO> {
    const fullUrl = `${this.apiUrl}/period?period=${period}`;
    console.log('📡 [StatisticsService] Calling Period Statistics API:', fullUrl);
    
    return this.http.get<PeriodStatisticsDTO>(fullUrl).pipe(
      tap({
        next: (response) => {
          console.log(`📥 [StatisticsService] Period Statistics (${period}) received:`, response);
        },
        error: (error) => {
          console.error(`❌ [StatisticsService] Period Statistics (${period}) Error:`, error);
          if (error.error) {
            console.error('   - Error Body:', error.error);
          }
        }
      })
    );
  }

  getPeriodStatisticsByDateRange(startDate: string, endDate: string): Observable<PeriodStatisticsDTO> {
    const fullUrl = `${this.apiUrl}/period/date-range?startDate=${startDate}&endDate=${endDate}`;
    console.log('📡 [StatisticsService] Calling Date Range Statistics API:', fullUrl);
    
    return this.http.get<PeriodStatisticsDTO>(fullUrl).pipe(
      tap({
        next: (response) => {
          console.log(`📥 [StatisticsService] Date Range Statistics (${startDate} to ${endDate}) received:`, response);
        },
        error: (error) => {
          console.error(`❌ [StatisticsService] Date Range Statistics Error:`, error);
          if (error.error) {
            console.error('   - Error Body:', error.error);
          }
        }
      })
    );
  }

  getWeeklyRevenue(): Observable<{ data: WeeklyRevenueDTO[], total: number }> {
    const fullUrl = `${this.apiUrl}/weekly-revenue`;
    console.log('📡 [StatisticsService] Calling Weekly Revenue API:', fullUrl);
    
    return this.http.get<{ data: WeeklyRevenueDTO[], total: number }>(fullUrl).pipe(
      tap({
        next: (response) => {
          console.log('📥 [StatisticsService] Weekly Revenue received:', response);
          if (response.data) {
            console.log(`   - Data array length: ${response.data.length}`);
            if (response.data.length > 0) {
              console.log(`   - First item:`, response.data[0]);
            }
          }
        },
        error: (error) => {
          console.error('❌ [StatisticsService] Weekly Revenue Error:', error);
          if (error.error) {
            console.error('   - Error Body:', error.error);
          }
        }
      })
    );
  }

  getTopBrands(limit: number = 3): Observable<{ data: BrandStatisticsDTO[], total: number }> {
    const fullUrl = `${this.apiUrl}/top-brands?limit=${limit}`;
    console.log('📡 [StatisticsService] Calling Top Brands API:', fullUrl);
    
    return this.http.get<{ data: BrandStatisticsDTO[], total: number }>(fullUrl).pipe(
      tap({
        next: (response) => {
          console.log('📥 [StatisticsService] Top Brands received:', response);
          if (response.data) {
            console.log(`   - Data array length: ${response.data.length}`);
            if (response.data.length > 0) {
              console.log(`   - First item:`, response.data[0]);
            }
          }
        },
        error: (error) => {
          console.error('❌ [StatisticsService] Top Brands Error:', error);
          if (error.error) {
            console.error('   - Error Body:', error.error);
          }
        }
      })
    );
  }

  getOrderStatusStatistics(period: 'day' | 'week' | 'month' | 'year' = 'month'): Observable<{ data: OrderStatusStatisticsDTO[], total: number, period: string }> {
    const fullUrl = `${this.apiUrl}/order-status?period=${period}`;
    console.log('📡 [StatisticsService] Calling Order Status Statistics API:', fullUrl);
    
    return this.http.get<{ data: OrderStatusStatisticsDTO[], total: number, period: string }>(fullUrl).pipe(
      tap({
        next: (response) => {
          console.log(`📥 [StatisticsService] Order Status Statistics (${period}) received:`, response);
          if (response.data) {
            console.log(`   - Data array length: ${response.data.length}`);
            if (response.data.length > 0) {
              console.log(`   - First item:`, response.data[0]);
            }
          }
        },
        error: (error) => {
          console.error(`❌ [StatisticsService] Order Status Statistics (${period}) Error:`, error);
          if (error.error) {
            console.error('   - Error Body:', error.error);
          }
        }
      })
    );
  }

  getChannelStatistics(): Observable<{ data: ChannelStatisticsDTO[], total: number }> {
    const fullUrl = `${this.apiUrl}/channels`;
    console.log('📡 [StatisticsService] Calling Channel Statistics API:', fullUrl);
    
    return this.http.get<{ data: ChannelStatisticsDTO[], total: number }>(fullUrl).pipe(
      tap({
        next: (response) => {
          console.log(`📥 [StatisticsService] Channel Statistics received:`, response);
          if (response.data) {
            console.log(`   - Data array length: ${response.data.length}`);
            if (response.data.length > 0) {
              console.log(`   - First item:`, response.data[0]);
            }
          }
        },
        error: (error) => {
          console.error(`❌ [StatisticsService] Channel Statistics Error:`, error);
          if (error.error) {
            console.error('   - Error Body:', error.error);
          }
        }
      })
    );
  }

  getLowStockProducts(threshold: number = 5, limit: number = 10): Observable<{ data: LowStockProductDTO[], total: number, threshold: number }> {
    let params = new HttpParams();
    params = params.set('threshold', threshold.toString());
    params = params.set('limit', limit.toString());
    
    const fullUrl = `${this.apiUrl}/low-stock-products?threshold=${threshold}&limit=${limit}`;
    console.log('📡 [StatisticsService] Calling Low Stock Products API:', fullUrl);
    console.log('📡 [StatisticsService] Base URL:', this.apiUrl);
    console.log('📡 [StatisticsService] Full URL:', fullUrl);
    
    return this.http.get<{ data: LowStockProductDTO[], total: number, threshold: number }>(
      `${this.apiUrl}/low-stock-products`,
      { params }
    ).pipe(
      tap({
        next: (response) => {
          console.log('📥 [StatisticsService] Low Stock Products received:', response);
          if (response && response.data) {
            console.log(`   - Data array length: ${response.data.length}`);
            if (response.data.length > 0) {
              console.log(`   - First item:`, response.data[0]);
            }
          }
        },
        error: (error) => {
          console.error('❌ [StatisticsService] Low Stock Products Error:');
          console.error('   - URL:', fullUrl);
          console.error('   - Status:', error.status);
          console.error('   - Status Text:', error.statusText);
          console.error('   - Message:', error.message);
          if (error.error) {
            console.error('   - Error Body:', error.error);
          }
          if (error.url) {
            console.error('   - Requested URL:', error.url);
          }
        }
      })
    );
  }
}

