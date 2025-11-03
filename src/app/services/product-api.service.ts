import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface SanPhamResponse {
  id: number;
  maSanPham: string;
  tenSanPham: string;
  moTa: string;
  giaBan: number;
  soLuongTon: number;
  trangThai: boolean;
  ngayTao: string;
  loaiMuBaoHiemId?: number | null;
  loaiMuBaoHiemTen?: string | null;
  nhaSanXuatId?: number | null;
  nhaSanXuatTen?: string | null;
  chatLieuVoId?: number | null;
  chatLieuVoTen?: string | null;
  trongLuongId?: number | null;
  trongLuongTen?: string | null;
  xuatXuId?: number | null;
  xuatXuTen?: string | null;
  kieuDangMuId?: number | null;
  kieuDangMuTen?: string | null;
  congNgheAnToanId?: number | null;
  congNgheAnToanTen?: string | null;
  mauSacId?: number | null;
  mauSacTen?: string | null;
  mauSacMa?: string | null;
  anhSanPham?: string | null;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface LookupItem {
  id: number;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class ProductApiService {
  // Admin endpoints (bảo vệ bằng JWT)
  private adminBaseUrl = environment.apiBaseUrl + '/api/admin/products';
  // Public endpoints cho khách hàng
  private customerBaseUrl = environment.apiBaseUrl + '/api/customer/products';
  // Legacy GET (nếu BE còn giữ cho tương thích)
  private legacyBaseUrl = environment.apiBaseUrl + '/san-pham';

  constructor(private http: HttpClient) {}

  search(params: {
    keyword?: string;
    trangThai?: boolean;
    page?: number;
    size?: number;
    sort?: string;
    useCustomerEndpoint?: boolean; // Flag để dùng endpoint customer (public)
  }): Observable<PageResponse<SanPhamResponse>> {
    let httpParams = new HttpParams();
    if (params.keyword) httpParams = httpParams.set('keyword', params.keyword);
    if (params.trangThai !== undefined && params.trangThai !== null) {
      httpParams = httpParams.set('trangThai', String(params.trangThai));
    }
    httpParams = httpParams.set('page', String(params.page ?? 0));
    httpParams = httpParams.set('size', String(params.size ?? 10));
    httpParams = httpParams.set('sort', params.sort ?? 'id,desc');

    // Sử dụng customer endpoint nếu được yêu cầu (cho shop website),
    // ngược lại dùng admin endpoint cho trang quản trị
    const url = params.useCustomerEndpoint ? this.customerBaseUrl : this.adminBaseUrl;
    return this.http.get<PageResponse<SanPhamResponse>>(url, { params: httpParams });
  }

  getById(id: number, useCustomerEndpoint: boolean = false): Observable<SanPhamResponse> {
    const url = useCustomerEndpoint
      ? `${this.customerBaseUrl}/${id}`
      : `${this.adminBaseUrl}/${id}`;
    return this.http.get<SanPhamResponse>(url);
  }

  create(
    payload: Partial<SanPhamResponse> & {
      maSanPham: string;
      tenSanPham: string;
      giaBan: number;
      soLuongTon: number;
      trangThai: boolean;
      loaiMuBaoHiemId?: number;
      nhaSanXuatId?: number;
      chatLieuVoId?: number;
      trongLuongId?: number;
      xuatXuId?: number;
      kieuDangMuId?: number;
      congNgheAnToanId?: number;
    }
  ): Observable<SanPhamResponse> {
    return this.http.post<SanPhamResponse>(this.adminBaseUrl, payload);
  }

  update(id: number, payload: Partial<SanPhamResponse>): Observable<SanPhamResponse> {
    return this.http.put<SanPhamResponse>(`${this.adminBaseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.adminBaseUrl}/${id}`);
  }

  // lookups
  getLoaiMuBaoHiemAll(): Observable<{ id: number; tenLoai: string; trangThai: boolean }[]> {
    return this.http.get<{ id: number; tenLoai: string; trangThai: boolean }[]>(
      `${environment.apiBaseUrl}/loai-mu/all`
    );
  }
  getNhaSanXuatAll(): Observable<any> {
    // reuse search endpoint first page large size, only active items
    return this.http.get(`${environment.apiBaseUrl}/nha-san-xuat`, {
      params: new HttpParams().set('page', '0').set('size', '1000').set('trangThai', 'true'),
    });
  }
  getChatLieuVoAll(): Observable<any> {
    return this.http.get(`${environment.apiBaseUrl}/chat-lieu-vo`, {
      params: new HttpParams().set('page', '0').set('size', '1000').set('trangThai', 'true'),
    });
  }
  getTrongLuongAll(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiBaseUrl}/trong-luong/all`);
  }
  getXuatXuAll(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiBaseUrl}/xuat-xu/all`);
  }
  getKieuDangMuAll(): Observable<any> {
    return this.http.get(`${environment.apiBaseUrl}/kieu-dang-mu`, {
      params: new HttpParams().set('page', '0').set('size', '1000').set('trangThai', 'true'),
    });
  }
  getCongNgheAnToanAll(): Observable<any[]> {
    // reuse search endpoint first page large size, only active items
    return this.http
      .get(`${environment.apiBaseUrl}/api/cong-nghe-an-toan`, {
        params: new HttpParams().set('page', '0').set('size', '1000').set('trangThai', 'true'),
      })
      .pipe(map((response: any) => response.content));
  }
}
