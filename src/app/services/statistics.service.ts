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
}

export interface WeeklyRevenueDTO {
  weekLabel: string;       // Ví dụ: "Tuần 1", "Tuần 2"
  startDate: string;       // Ngày bắt đầu tuần
  endDate: string;         // Ngày kết thúc tuần
  totalRevenue: number;    // Tổng doanh thu của tuần
  totalOrders: number;     // Tổng số đơn hàng trong tuần
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
}

