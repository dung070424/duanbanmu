import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ManufacturerResponse {
  id: number;
  ten: string;
  moTa: string;
  trangThai: boolean;
  quocGia?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({ providedIn: 'root' })
export class ManufacturerApiService {
  private baseUrl = environment.apiBaseUrl + '/nha-san-xuat';
  constructor(private http: HttpClient) {}

  search(params: {
    keyword?: string;
    trangThai?: boolean;
    page?: number;
    size?: number;
    sort?: string;
  }): Observable<PageResponse<ManufacturerResponse>> {
    let httpParams = new HttpParams();
    if (params.keyword) httpParams = httpParams.set('keyword', params.keyword);
    if (params.trangThai !== undefined && params.trangThai !== null) {
      httpParams = httpParams.set('trangThai', String(params.trangThai));
    }
    httpParams = httpParams.set('page', String(params.page ?? 0));
    httpParams = httpParams.set('size', String(params.size ?? 10));
    httpParams = httpParams.set('sort', params.sort ?? 'id,desc');
    return this.http.get<PageResponse<ManufacturerResponse>>(this.baseUrl, { params: httpParams });
  }

  create(payload: {
    ten: string;
    moTa?: string;
    trangThai: boolean;
    quocGia?: string;
  }): Observable<ManufacturerResponse> {
    return this.http.post<ManufacturerResponse>(this.baseUrl, payload);
  }

  update(
    id: number,
    payload: {
      ten: string;
      moTa?: string;
      trangThai: boolean;
      quocGia?: string;
    }
  ): Observable<ManufacturerResponse> {
    return this.http.put<ManufacturerResponse>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
  getAllActive(): Observable<ManufacturerResponse[]> {
    return this.search({ trangThai: true, page: 0, size: 1000 }).pipe(
      map(response => response.content)
    );
  }
}
