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

  // Lấy danh sách khách hàng từ API thật
  getAllCustomers(): Observable<KhachHangResponse> {
    return this.http.get<KhachHangResponse>(
      `${this.API_BASE_URL}/khach-hang/for-voucher`,
      { headers: this.getHeaders() }
    );
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

  togglePhieuGiamGiaStatus(phieu: PhieuGiamGiaResponse): Observable<ApiResponse<any>> {
    // Sử dụng endpoint PUT hiện có để cập nhật trạng thái
    const requestData = {
      maPhieu: phieu.maPhieu,
      tenPhieuGiamGia: phieu.tenPhieuGiamGia,
      loaiPhieuGiamGia: phieu.loaiPhieuGiamGia,
      giaTriGiam: phieu.giaTriGiam,
      giaTriToiThieu: phieu.giaTriToiThieu,
      soTienToiDa: phieu.soTienToiDa,
      hoaDonToiThieu: phieu.hoaDonToiThieu,
      soLuongDung: phieu.soLuongDung,
      ngayBatDau: phieu.ngayBatDau,
      ngayKetThuc: phieu.ngayKetThuc,
      trangThai: !phieu.trangThai // Toggle trạng thái
    };
    
    return this.http.put<ApiResponse<any>>(`${this.API_BASE_URL}/phieu-giam-gia/${phieu.id}`, requestData);
  }

  getAllActivePhieuGiamGia(): Observable<ApiResponse<PhieuGiamGiaResponse[]>> {
    return this.getActivePhieuGiamGia();
  }

  // Export to Excel
  exportToExcel(data: any[]): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(
      `${this.API_BASE_URL}/phieu-giam-gia/export-excel`,
      { data },
      { headers: this.getHeaders() }
    );
  }
}