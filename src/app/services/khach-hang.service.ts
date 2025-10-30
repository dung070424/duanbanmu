import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  KhachHang,
  KhachHangSearchParams,
  PageResponse,
  KhachHangStats,
} from '../interfaces/khach-hang.interface';

@Injectable({
  providedIn: 'root',
})
export class KhachHangService {
  private apiUrl = `${environment.apiUrl}/khach-hang`;

  constructor(private http: HttpClient) {}

  // Lấy tất cả khách hàng với phân trang
  getAllKhachHang(
    page: number = 0,
    size: number = 10,
    sortBy: string = 'id',
    sortDir: string = 'desc'
  ): Observable<PageResponse<KhachHang>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    return this.http.get<PageResponse<KhachHang>>(this.apiUrl, { params });
  }

  // Tìm kiếm khách hàng với bộ lọc
  searchKhachHang(searchParams: KhachHangSearchParams): Observable<PageResponse<KhachHang>> {
    let params = new HttpParams()
      .set('page', searchParams.page.toString())
      .set('size', searchParams.size.toString())
      .set('sortBy', searchParams.sortBy)
      .set('sortDir', searchParams.sortDir);

    if (searchParams.keyword) {
      params = params.set('keyword', searchParams.keyword);
    }

    if (searchParams.trangThai !== undefined) {
      params = params.set('trangThai', searchParams.trangThai.toString());
    }

    return this.http.get<PageResponse<KhachHang>>(`${this.apiUrl}/search`, { params });
  }

  // Lấy khách hàng theo ID
  getKhachHangById(id: number): Observable<KhachHang> {
    return this.http.get<KhachHang>(`${this.apiUrl}/${id}`);
  }

  // Lấy khách hàng theo mã
  getKhachHangByMa(maKhachHang: string): Observable<KhachHang> {
    return this.http.get<KhachHang>(`${this.apiUrl}/ma/${maKhachHang}`);
  }

  // Lấy khách hàng theo email
  getKhachHangByEmail(email: string): Observable<KhachHang> {
    return this.http.get<KhachHang>(`${this.apiUrl}/email/${email}`);
  }

  // Lấy khách hàng theo số điện thoại
  getKhachHangBySoDienThoai(soDienThoai: string): Observable<KhachHang> {
    return this.http.get<KhachHang>(`${this.apiUrl}/sdt/${soDienThoai}`);
  }

  // Tạo khách hàng mới
  createKhachHang(khachHang: KhachHang): Observable<KhachHang> {
    return this.http.post<KhachHang>(this.apiUrl, khachHang);
  }

  // Cập nhật khách hàng
  updateKhachHang(id: number, khachHang: KhachHang): Observable<KhachHang> {
    return this.http.put<KhachHang>(`${this.apiUrl}/${id}`, khachHang);
  }

  // Xóa vĩnh viễn khách hàng (hard delete)
  deleteKhachHang(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Xóa mềm khách hàng (chuyển trạng thái thành không hoạt động)
  softDeleteKhachHang(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}/soft`);
  }

  // Xóa cứng khách hàng
  deleteKhachHangPermanently(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}/permanent`);
  }

  // Kiểm tra email đã tồn tại
  checkEmailExists(email: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/check-email/${email}`);
  }

  // Kiểm tra số điện thoại đã tồn tại
  checkSoDienThoaiExists(soDienThoai: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/check-sdt/${soDienThoai}`);
  }

  // Kiểm tra mã khách hàng đã tồn tại
  checkMaKhachHangExists(maKhachHang: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/check-ma/${maKhachHang}`);
  }

  // Lấy thống kê
  getStats(): Observable<KhachHangStats> {
    return this.http.get<KhachHangStats>(`${this.apiUrl}/stats`);
  }

  // Lấy top khách hàng có điểm tích lũy cao
  getTopKhachHangByDiemTichLuy(limit: number): Observable<KhachHang[]> {
    return this.http.get<KhachHang[]>(`${this.apiUrl}/top/${limit}`);
  }

  // Tạo khách hàng mẫu
  createSampleKhachHang(): Observable<any> {
    return this.http.post(`${this.apiUrl}/create-sample`, {});
  }

  // Test endpoint
  test(): Observable<string> {
    return this.http.get<string>(`${this.apiUrl}/test`);
  }
}
