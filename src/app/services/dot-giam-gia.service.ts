import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DotGiamGia {
  id?: number;
  maDotGiamGia: string;
  tenDotGiamGia: string;
  loaiDotGiamGia?: string;
  giaTriDotGiam?: string;
  soTien?: number;
  moTa?: string;
  ngayBatDau: string;
  ngayKetThuc: string;
  soLuongSuDung: number;
  trangThai: boolean;
}

export interface DotGiamGiaRequest {
  maDotGiamGia: string;
  tenDotGiamGia: string;
  loaiDotGiamGia?: string;
  giaTriDotGiam?: string;
  soTien?: number;
  moTa?: string;
  ngayBatDau: string;
  ngayKetThuc: string;
  soLuongSuDung: number;
  trangThai: boolean;
  chiTietDotGiamGias?: Array<{
    chiTietSanPhamId: number;
    giaTriGiam: number;
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({
  providedIn: 'root'
})
export class DotGiamGiaService {
  private apiUrl = `${environment.apiBaseUrl}/api/dot-giam-gia`;

  constructor(private http: HttpClient) { }

  createDotGiamGia(request: DotGiamGiaRequest): Observable<ApiResponse<DotGiamGia>> {
    return this.http.post<ApiResponse<DotGiamGia>>(this.apiUrl, request);
  }

  getDotGiamGiaById(id: number): Observable<ApiResponse<DotGiamGia>> {
    return this.http.get<ApiResponse<DotGiamGia>>(`${this.apiUrl}/${id}`);
  }

  getDotGiamGiaByMa(maDotGiamGia: string): Observable<ApiResponse<DotGiamGia>> {
    return this.http.get<ApiResponse<DotGiamGia>>(`${this.apiUrl}/ma/${maDotGiamGia}`);
  }

  updateDotGiamGia(id: number, request: DotGiamGiaRequest): Observable<ApiResponse<DotGiamGia>> {
    return this.http.put<ApiResponse<DotGiamGia>>(`${this.apiUrl}/${id}`, request);
  }

  deleteDotGiamGia(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }

  getAllDotGiamGia(page: number, size: number, sortBy: string, sortDir: string): Observable<ApiResponse<PaginatedResponse<DotGiamGia>>> {
    return this.http.get<ApiResponse<PaginatedResponse<DotGiamGia>>>(`${this.apiUrl}?page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`);
  }

  getAllDotGiamGiaWithoutPagination(): Observable<ApiResponse<DotGiamGia[]>> {
    return this.http.get<ApiResponse<DotGiamGia[]>>(`${this.apiUrl}/all`);
  }

  searchDotGiamGia(searchTerm: string, page: number, size: number): Observable<ApiResponse<PaginatedResponse<DotGiamGia>>> {
    return this.http.get<ApiResponse<PaginatedResponse<DotGiamGia>>>(`${this.apiUrl}/search?searchTerm=${searchTerm}&page=${page}&size=${size}`);
  }

  getDotGiamGiaByTrangThai(trangThai: boolean, page: number, size: number): Observable<ApiResponse<PaginatedResponse<DotGiamGia>>> {
    return this.http.get<ApiResponse<PaginatedResponse<DotGiamGia>>>(`${this.apiUrl}/trang-thai/${trangThai}?page=${page}&size=${size}`);
  }

  getDotGiamGiaByLoai(loaiDotGiamGia: string, page: number, size: number): Observable<ApiResponse<PaginatedResponse<DotGiamGia>>> {
    return this.http.get<ApiResponse<PaginatedResponse<DotGiamGia>>>(`${this.apiUrl}/loai/${loaiDotGiamGia}?page=${page}&size=${size}`);
  }

  getActiveDotGiamGia(): Observable<ApiResponse<DotGiamGia[]>> {
    return this.http.get<ApiResponse<DotGiamGia[]>>(`${this.apiUrl}/active`);
  }

  checkMaDotGiamGiaExists(maDotGiamGia: string): Observable<ApiResponse<boolean>> {
    return this.http.get<ApiResponse<boolean>>(`${this.apiUrl}/exists/ma/${maDotGiamGia}`);
  }
}