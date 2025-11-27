import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GHNShippingFeeRequest {
  from_district_id: number; // ID quận/huyện gửi
  from_ward_code?: string; // Mã phường/xã gửi (optional)
  to_district_id: number; // ID quận/huyện nhận
  to_ward_code?: string; // Mã phường/xã nhận (optional)
  weight: number; // Trọng lượng (gram)
  length?: number; // Chiều dài (cm)
  width?: number; // Chiều rộng (cm)
  height?: number; // Chiều cao (cm)
  insurance_value?: number; // Giá trị đơn hàng (VND)
  service_type_id?: number; // ID loại dịch vụ (optional)
  coupon?: string; // Mã giảm giá (optional)
}

export interface GHNShippingFeeResponse {
  code: number;
  message: string;
  data: {
    total: number; // Tổng phí
    service_fee: number; // Phí dịch vụ
    insurance_fee: number; // Phí bảo hiểm
    pick_station_fee: number; // Phí lấy hàng tại bưu cục
    coupon_value: number; // Giá trị coupon
    r2s_fee: number; // Phí R2S
  };
}

export interface GHNAvailableService {
  service_id: number;
  short_name: string;
  service_type_id: number;
}

@Injectable({
  providedIn: 'root',
})
export class GHNService {
  // GHN API endpoints
  private readonly GHN_API_BASE_URL = 'https://online-gateway.ghn.vn/shiip/public-api/v2';
  private readonly GHN_AVAILABLE_SERVICES_URL = `${this.GHN_API_BASE_URL}/shipping-order/available-services`;
  private readonly GHN_FEE_URL = `${this.GHN_API_BASE_URL}/shipping-order/fee`;

  // Thông tin shop mặc định (cần cấu hình)
  private readonly DEFAULT_SHOP_ID = 0; // Cần cấu hình shop_id thực tế
  private readonly DEFAULT_FROM_DISTRICT_ID = 1442; // Quận Ba Đình, Hà Nội (cần cấu hình)
  private readonly DEFAULT_FROM_WARD_CODE = '10001'; // Phường Điện Biên (cần cấu hình)

  constructor(private http: HttpClient) {}

  /**
   * Tính phí vận chuyển GHN qua backend (khuyến nghị)
   * Backend sẽ xử lý authentication với GHN
   */
  calculateShippingFeeViaBackend(request: Partial<GHNShippingFeeRequest>): Observable<any> {
    // Endpoint backend để proxy request đến GHN
    return this.http.post<any>(`${environment.apiBaseUrl}/api/ghn/calculate-fee`, request, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Lấy danh sách dịch vụ khả dụng qua backend
   */
  getAvailableServicesViaBackend(fromDistrictId: number, toDistrictId: number): Observable<any> {
    return this.http.post<any>(
      `${environment.apiBaseUrl}/api/ghn/available-services`,
      {
        from_district_id: fromDistrictId,
        to_district_id: toDistrictId,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}



