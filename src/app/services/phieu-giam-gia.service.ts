import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PhieuGiamGia, PhieuGiamGiaRequest, PhieuGiamGiaResponse, ApiResponse, KhachHangResponse } from '../interfaces/phieu-giam-gia.interface';

@Injectable({
  providedIn: 'root'
})
export class PhieuGiamGiaService {
  private readonly API_BASE_URL = 'http://localhost:8081/api';

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
  }

  // Tạo phiếu giảm giá mới
  createPhieuGiamGia(request: PhieuGiamGiaRequest): Observable<ApiResponse<PhieuGiamGiaResponse>> {
    return this.http.post<ApiResponse<PhieuGiamGiaResponse>>(
      `${this.API_BASE_URL}/phieu-giam-gia`,
      request,
      { headers: this.getHeaders() }
    );
  }

  // Lấy danh sách phiếu giảm giá
  getAllPhieuGiamGia(page: number = 0, size: number = 10, sortBy: string = 'id', sortOrder: string = 'asc'): Observable<any> {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('size', size.toString());
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    
    return this.http.get<any>(`${this.API_BASE_URL}/phieu-giam-gia?${params.toString()}`, { headers: this.getHeaders() });
  }

  // Cập nhật phiếu giảm giá
  updatePhieuGiamGia(id: number, request: PhieuGiamGiaRequest): Observable<ApiResponse<PhieuGiamGiaResponse>> {
    return this.http.put<ApiResponse<PhieuGiamGiaResponse>>(
      `${this.API_BASE_URL}/phieu-giam-gia/${id}`,
      request,
      { headers: this.getHeaders() }
    );
  }

  // Xóa phiếu giảm giá
  deletePhieuGiamGia(id: number): Observable<ApiResponse<string>> {
    return this.http.delete<ApiResponse<string>>(
      `${this.API_BASE_URL}/phieu-giam-gia/${id}`,
      { headers: this.getHeaders() }
    );
  }

  // Lấy phiếu giảm giá theo ID
  getPhieuGiamGiaById(id: number): Observable<ApiResponse<PhieuGiamGiaResponse>> {
    return this.http.get<ApiResponse<PhieuGiamGiaResponse>>(
      `${this.API_BASE_URL}/phieu-giam-gia/${id}`,
      { headers: this.getHeaders() }
    );
  }

  // Lấy phiếu giảm giá theo mã phiếu
  getPhieuGiamGiaByMaPhieu(maPhieu: string): Observable<ApiResponse<PhieuGiamGiaResponse>> {
    return this.http.get<ApiResponse<PhieuGiamGiaResponse>>(
      `${this.API_BASE_URL}/phieu-giam-gia/ma-phieu/${maPhieu}`,
      { headers: this.getHeaders() }
    );
  }

  // Lấy phiếu giảm giá đang hoạt động
  getActivePhieuGiamGia(): Observable<ApiResponse<PhieuGiamGiaResponse[]>> {
    return this.http.get<ApiResponse<PhieuGiamGiaResponse[]>>(
      `${this.API_BASE_URL}/phieu-giam-gia/active`,
      { headers: this.getHeaders() }
    );
  }

  // Tìm kiếm phiếu giảm giá
  searchPhieuGiamGia(keyword: string): Observable<ApiResponse<PhieuGiamGiaResponse[]>> {
    return this.http.get<ApiResponse<PhieuGiamGiaResponse[]>>(
      `${this.API_BASE_URL}/phieu-giam-gia/search?keyword=${keyword}`,
      { headers: this.getHeaders() }
    );
  }

  // Mock data cho khách hàng (tạm thời)
  getAllCustomers(): Observable<KhachHangResponse> {
    const mockCustomers = [
      {
        id: 1,
        maKhachHang: 'KH00001',
        tenKhachHang: 'Nguyễn Văn A',
        gioiTinh: true,
        ngaySinh: '15/3/1990',
        tongSoLanMua: 25,
        lanMuaGanNhat: '15/9/2024'
      },
      {
        id: 2,
        maKhachHang: 'KH00002',
        tenKhachHang: 'Đinh Thế Mạnh',
        gioiTinh: true,
        ngaySinh: '12/9/1998',
        tongSoLanMua: 19,
        lanMuaGanNhat: '28/8/2025'
      },
      {
        id: 3,
        maKhachHang: 'KH00003',
        tenKhachHang: 'Trịnh Châu Anh',
        gioiTinh: false,
        ngaySinh: '17/4/1986',
        tongSoLanMua: 2,
        lanMuaGanNhat: '9/3/2025'
      },
      {
        id: 4,
        maKhachHang: 'KH00004',
        tenKhachHang: 'Lê Thị B',
        gioiTinh: false,
        ngaySinh: '22/7/1995',
        tongSoLanMua: 8,
        lanMuaGanNhat: '12/10/2024'
      },
      {
        id: 5,
        maKhachHang: 'KH00005',
        tenKhachHang: 'Trần Văn C',
        gioiTinh: true,
        ngaySinh: '5/11/1988',
        tongSoLanMua: 15,
        lanMuaGanNhat: '3/9/2024'
      }
    ];

    return new Observable(observer => {
      observer.next({
        success: true,
        message: 'Lấy danh sách khách hàng thành công',
        data: mockCustomers
      });
      observer.complete();
    });
  }

  // Utility methods
  generatePhieuCode(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PGG_${timestamp}_${random}`;
  }

  formatDateForAPI(date: string | Date): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  formatDateForDisplay(date: string): string {
    const d = new Date(date);
    return d.toLocaleDateString('vi-VN');
  }

  // Additional methods for compatibility
  testApi(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.API_BASE_URL}/phieu-giam-gia/test`);
  }

  createSampleData(): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.API_BASE_URL}/phieu-giam-gia/sample`, {});
  }

  togglePhieuGiamGiaStatus(id: number): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.API_BASE_URL}/phieu-giam-gia/${id}/toggle`, {});
  }

  getAllActivePhieuGiamGia(): Observable<ApiResponse<PhieuGiamGiaResponse[]>> {
    return this.getActivePhieuGiamGia();
  }

}
