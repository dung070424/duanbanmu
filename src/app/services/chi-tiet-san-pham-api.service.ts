import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ChiTietSanPhamResponse {
  id: number;
  sanPhamId: number;
  sanPhamTen: string;
  kichThuocId: number;
  kichThuocTen: string;
  mauSacId: number;
  mauSacTen: string;
  mauSacMa: string;
  trongLuongId: number;
  trongLuongTen: string;
  giaBan: string;
  soLuongTon: string;
  trangThai: boolean;
}

export interface ChiTietSanPhamRequest {
  sanPhamId: number;
  kichThuocId: number;
  mauSacId: number;
  trongLuongId: number;
  giaBan: string;
  soLuongTon: string;
  trangThai: boolean;
}

@Injectable({ providedIn: 'root' })
export class ChiTietSanPhamApiService {
  private baseUrl = environment.apiBaseUrl + '/api/chi-tiet-san-pham';

  constructor(private http: HttpClient) {}

  create(request: ChiTietSanPhamRequest): Observable<ChiTietSanPhamResponse> {
    return this.http.post<ChiTietSanPhamResponse>(this.baseUrl, request);
  }

  update(id: number, request: ChiTietSanPhamRequest): Observable<ChiTietSanPhamResponse> {
    return this.http.put<ChiTietSanPhamResponse>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getAll(): Observable<ChiTietSanPhamResponse[]> {
    return this.http.get<ChiTietSanPhamResponse[]>(this.baseUrl);
  }

  getById(id: number): Observable<ChiTietSanPhamResponse> {
    return this.http.get<ChiTietSanPhamResponse>(`${this.baseUrl}/${id}`);
  }

  getBySanPhamId(sanPhamId: number): Observable<ChiTietSanPhamResponse[]> {
    return this.http.get<ChiTietSanPhamResponse[]>(`${this.baseUrl}/san-pham/${sanPhamId}`);
  }

 
}
