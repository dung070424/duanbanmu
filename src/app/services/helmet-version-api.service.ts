import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface HelmetVersion {
  id?: number;
  sanPhamId: number;
  kichThuocId: number;
  mauSacId: number;
  trongLuongId: number;
  giaBan: string;
  soLuongTon: string;
  trangThai: boolean;
}
export interface HelmetVersionRequest {
  sanPhamId: number;
  kichThuocId: number;
  mauSacId: number;
  trongLuongId: number;
  giaBan: string;
  soLuongTon: string;
  trangThai: boolean;
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

@Injectable({ providedIn: 'root' })
export class HelmetVersionApiService {
  private apiUrl = `${environment.apiUrl}/chi-tiet-san-pham`;
  constructor(private http: HttpClient) {}

  create(request: HelmetVersionRequest): Observable<ApiResponse<HelmetVersion>> {
    return this.http.post<ApiResponse<HelmetVersion>>(this.apiUrl, request);
  }
  update(id: number, request: HelmetVersionRequest): Observable<ApiResponse<HelmetVersion>> {
    return this.http.put<ApiResponse<HelmetVersion>>(`${this.apiUrl}/${id}`, request);
  }
  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }
  getById(id: number): Observable<ApiResponse<HelmetVersion>> {
    return this.http.get<ApiResponse<HelmetVersion>>(`${this.apiUrl}/${id}`);
  }
  getBySanPhamId(sanPhamId: number): Observable<ApiResponse<HelmetVersion[]>> {
    return this.http.get<ApiResponse<HelmetVersion[]>>(`${this.apiUrl}/san-pham/${sanPhamId}`);
  }
  getAll(): Observable<ApiResponse<HelmetVersion[]>> {
    return this.http.get<ApiResponse<HelmetVersion[]>>(this.apiUrl);
  }
}
