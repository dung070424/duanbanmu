import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GHTKShippingFeeRequest {
  pick_province: string; // Tỉnh/Thành phố gửi
  pick_district: string; // Quận/Huyện gửi
  pick_ward?: string; // Phường/Xã gửi (optional)
  province: string; // Tỉnh/Thành phố nhận
  district: string; // Quận/Huyện nhận
  ward?: string; // Phường/Xã nhận (optional)
  address?: string; // Địa chỉ chi tiết
  weight: number; // Trọng lượng (gram)
  value: number; // Giá trị đơn hàng (VND)
  transport?: string; // Phương thức vận chuyển: 'road' (đường bộ) hoặc 'fly' (đường hàng không)
  deliver_option?: string; // Tùy chọn giao hàng: 'xteam' (nhanh) hoặc 'none' (thường)
}

export interface GHTKShippingFeeResponse {
  success: boolean;
  message: string;
  fee: {
    name: string;
    fee: number;
    insurance_fee: number;
    include_vat: string;
    cost_id: string;
    delivery_type: string;
    a: string;
    dt: string;
  };
  delivery: {
    standard: {
      fee: number;
      delivery_type: string;
    };
    fast: {
      fee: number;
      delivery_type: string;
    };
  };
}

@Injectable({
  providedIn: 'root',
})
export class GHTKService {
  // GHTK API endpoint (có thể cần proxy qua backend để bảo mật token)
  private readonly GHTK_API_URL = 'https://services.giaohangtietkiem.vn/services/shipment/fee';

  // Thông tin shop mặc định (cần cấu hình)
  private readonly DEFAULT_PICK_PROVINCE = 'Hà Nội';
  private readonly DEFAULT_PICK_DISTRICT = 'Quận Ba Đình';
  private readonly DEFAULT_PICK_WARD = 'Phường Điện Biên';
  private readonly DEFAULT_PICK_ADDRESS = 'Số 1, Phố Điện Biên Phủ';

  constructor(private http: HttpClient) {}

  /**
   * Tính phí vận chuyển GHTK
   * Lưu ý: API GHTK thực tế có thể yêu cầu token/authentication
   * Nên tạo endpoint backend để proxy request này
   */
  calculateShippingFee(
    request: Partial<GHTKShippingFeeRequest>
  ): Observable<GHTKShippingFeeResponse> {
    const payload: GHTKShippingFeeRequest = {
      pick_province: request.pick_province || this.DEFAULT_PICK_PROVINCE,
      pick_district: request.pick_district || this.DEFAULT_PICK_DISTRICT,
      pick_ward: request.pick_ward || this.DEFAULT_PICK_WARD,
      province: request.province || '',
      district: request.district || '',
      ward: request.ward || '',
      address: request.address || '',
      weight: request.weight || 1000, // Mặc định 1kg
      value: request.value || 0,
      transport: request.transport || 'road',
      deliver_option: request.deliver_option || 'none',
    };

    // GHTK API thường yêu cầu token trong header
    // Nên tạo endpoint backend để xử lý
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      // 'Token': 'YOUR_GHTK_TOKEN' // Cần cấu hình token
    });

    // Tạm thời gọi trực tiếp, nhưng nên tạo endpoint backend
    return this.http.post<GHTKShippingFeeResponse>(this.GHTK_API_URL, payload, { headers });
  }

  /**
   * Tính phí vận chuyển qua backend (khuyến nghị)
   * Backend sẽ xử lý authentication với GHTK
   */
  calculateShippingFeeViaBackend(request: Partial<GHTKShippingFeeRequest>): Observable<any> {
    // Endpoint backend để proxy request đến GHTK
    return this.http.post<any>(`${environment.apiBaseUrl}/api/ghtk/calculate-fee`, request, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
