import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DiaChiKhachHang } from '../interfaces/dia-chi-khach-hang.interface';

@Injectable({
  providedIn: 'root',
})
export class DiaChiKhachHangService {
  private apiUrl = `${environment.apiUrl}/dia-chi-khach-hang`;

  constructor(private http: HttpClient) {}

  // Lấy tất cả địa chỉ của khách hàng
  getDiaChiByKhachHangId(khachHangId: number): Observable<DiaChiKhachHang[]> {
    return this.http.get<DiaChiKhachHang[]>(`${this.apiUrl}/khach-hang/${khachHangId}`);
  }

  // Lấy địa chỉ mặc định của khách hàng
  getDiaChiMacDinhByKhachHangId(khachHangId: number): Observable<DiaChiKhachHang> {
    return this.http.get<DiaChiKhachHang>(`${this.apiUrl}/khach-hang/${khachHangId}/mac-dinh`);
  }

  // Thêm địa chỉ mới
  createDiaChi(diaChi: DiaChiKhachHang): Observable<DiaChiKhachHang> {
    return this.http.post<DiaChiKhachHang>(this.apiUrl, diaChi);
  }

  // Cập nhật địa chỉ
  updateDiaChi(id: number, diaChi: DiaChiKhachHang): Observable<DiaChiKhachHang> {
    return this.http.put<DiaChiKhachHang>(`${this.apiUrl}/${id}`, diaChi);
  }

  // Xóa địa chỉ
  deleteDiaChi(id: number, khachHangId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}/khach-hang/${khachHangId}`);
  }

  // Đặt địa chỉ làm mặc định
  setDiaChiMacDinh(id: number, khachHangId: number): Observable<DiaChiKhachHang> {
    return this.http.put<DiaChiKhachHang>(
      `${this.apiUrl}/${id}/khach-hang/${khachHangId}/mac-dinh`,
      {}
    );
  }

  // Lấy tất cả địa chỉ (cho hiển thị bảng)
  getAllDiaChi(): Observable<DiaChiKhachHang[]> {
    return this.http.get<DiaChiKhachHang[]>(this.apiUrl);
  }
}
