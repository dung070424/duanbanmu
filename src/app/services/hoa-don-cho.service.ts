import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GioHangChoItem {
  id?: number;
  chiTietSanPhamId: number;
  tenSanPham?: string;
  soLuong: number;
  donGia: number;
  giamGia?: number;
  thanhTien?: number;
  mauSac?: string;
  kichThuoc?: string;
}

export interface HoaDonCho {
  id?: number;
  maHoaDonCho: string;
  khachHangId?: number;
  tenKhachHang?: string;
  soDienThoaiKhachHang?: string;
  nhanVienId?: number;
  tenNhanVien?: string;
  ghiChu?: string;
  trangThai?: string;
  ngayTao?: string;
  ngayCapNhat?: string;
  danhSachGioHang?: GioHangChoItem[];
  tongSoLuong?: number;
  tongTien?: number;
  tongGiamGia?: number;
  thanhTien?: number;
  // Snapshot phiếu giảm giá cho từng hóa đơn chờ
  voucherCode?: string;
  voucherDiscountAmount?: number;
  voucherType?: 'PERCENT' | 'FIXED';
  voucherValue?: number;
  voucherMaxDiscount?: number;
}

@Injectable({
  providedIn: 'root'
})
export class HoaDonChoService {
  private apiUrl = `${environment.apiUrl}/hoa-don-cho`;

  constructor(private http: HttpClient) { }

  getAllHoaDonCho(): Observable<HoaDonCho[]> {
    return this.http.get<HoaDonCho[]>(this.apiUrl);
  }

  getHoaDonChoById(id: number): Observable<HoaDonCho> {
    return this.http.get<HoaDonCho>(`${this.apiUrl}/${id}`);
  }

  getHoaDonChoByTrangThai(trangThai: string): Observable<HoaDonCho[]> {
    return this.http.get<HoaDonCho[]>(`${this.apiUrl}/trang-thai/${trangThai}`);
  }

  getHoaDonChoByKhachHangId(khachHangId: number): Observable<HoaDonCho[]> {
    return this.http.get<HoaDonCho[]>(`${this.apiUrl}/khach-hang/${khachHangId}`);
  }

  createHoaDonCho(hoaDonCho: Partial<HoaDonCho>): Observable<HoaDonCho> {
    return this.http.post<HoaDonCho>(this.apiUrl, hoaDonCho);
  }

  updateHoaDonCho(id: number, hoaDonCho: Partial<HoaDonCho>): Observable<HoaDonCho> {
    return this.http.put<HoaDonCho>(`${this.apiUrl}/${id}`, hoaDonCho);
  }

  deleteHoaDonCho(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  addItemToCart(hoaDonChoId: number, item: GioHangChoItem): Observable<HoaDonCho> {
    return this.http.post<HoaDonCho>(`${this.apiUrl}/${hoaDonChoId}/gio-hang`, item);
  }

  updateCartItemQuantity(hoaDonChoId: number, gioHangChoId: number, soLuong: number): Observable<HoaDonCho> {
    let params = new HttpParams();
    params = params.append('soLuong', soLuong.toString());
    return this.http.put<HoaDonCho>(`${this.apiUrl}/${hoaDonChoId}/gio-hang/${gioHangChoId}/so-luong`, null, { params });
  }

  removeItemFromCart(hoaDonChoId: number, gioHangChoId: number): Observable<HoaDonCho> {
    return this.http.delete<HoaDonCho>(`${this.apiUrl}/${hoaDonChoId}/gio-hang/${gioHangChoId}`);
  }
}

