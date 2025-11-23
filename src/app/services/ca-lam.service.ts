import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface LichLamRequest {
  userId: number;
  week: number;
  year: number;
  position: string;
  caLamList: CaLamItem[];
}

export interface CaLamItem {
  dayOfWeek: string;
  shift: number;
  date: string;
}

export interface LichLamWeekResponse {
  week: number;
  year: number;
  weekStartDate: string;
  weekEndDate: string;
  nhanVienList: NhanVienCaLam[];
}

export interface NhanVienCaLam {
  userId: number;
  maNhanVien: string;
  tenNhanVien: string;
  position: string;
  caLam: CaLamWeek;
}

export interface CaLamWeek {
  thu2?: number;
  thu3?: number;
  thu4?: number;
  thu5?: number;
  thu6?: number;
  thu7?: number;
  chuNhat?: number;
}

export interface LichLamResponse {
  id: number;
  userId: number;
  userName: string;
  maNhanVien: string;
  dayOfWeek: string;
  shift: string;
  position: string;
  date: string;
  week: number;
  year: number;
}

@Injectable({
  providedIn: 'root'
})
export class CaLamService {
  private readonly baseUrl = `${environment.apiUrl}/lich-lam`;

  constructor(private http: HttpClient) {
    console.log('CaLamService initialized with baseUrl:', this.baseUrl);
  }

  /**
   * Test endpoint để kiểm tra API có hoạt động không
   */
  testConnection(): Observable<string> {
    return this.http.get<ApiResponse<string>>(`${this.baseUrl}/test`).pipe(
      map((response) => response.data),
      catchError((error) => {
        console.error('Error testing lich lam connection:', error);
        throw error;
      })
    );
  }

  /**
   * Lấy lịch làm theo tuần và năm
   */
  getLichLamByWeek(week: number, year: number): Observable<LichLamWeekResponse> {
    const params = new HttpParams()
      .set('week', week.toString())
      .set('year', year.toString());

    return this.http.get<ApiResponse<LichLamWeekResponse>>(`${this.baseUrl}/week`, { params }).pipe(
      map((response) => response.data),
      catchError((error) => {
        console.error('Error getting lich lam:', error);
        throw error;
      })
    );
  }

  /**
   * Lưu lịch làm cho một nhân viên
   */
  saveLichLam(request: LichLamRequest): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/save`, request).pipe(
      map(() => undefined),
      catchError((error) => {
        console.error('Error saving lich lam:', error);
        throw error;
      })
    );
  }

  /**
   * Lưu lịch làm cho nhiều nhân viên
   */
  saveLichLamBatch(requests: LichLamRequest[]): Observable<void> {
    console.log('Saving lich lam batch to:', `${this.baseUrl}/save-batch`);
    console.log('Requests:', JSON.stringify(requests, null, 2));
    
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/save-batch`, requests).pipe(
      map((response) => {
        console.log('Save response:', response);
        return undefined;
      }),
      catchError((error) => {
        console.error('Error saving lich lam batch:', error);
        console.error('Error status:', error.status);
        console.error('Error statusText:', error.statusText);
        console.error('Error url:', error.url);
        console.error('Error message:', error.message);
        console.error('Error error:', error.error);
        throw error;
      })
    );
  }

  /**
   * Lấy lịch sử ca làm
   */
  getLichSuCaLam(userId?: number): Observable<LichLamResponse[]> {
    let params = new HttpParams();
    if (userId) {
      params = params.set('userId', userId.toString());
    }

    return this.http.get<ApiResponse<LichLamResponse[]>>(`${this.baseUrl}/history`, { params }).pipe(
      map((response) => response.data),
      catchError((error) => {
        console.error('Error getting lich su ca lam:', error);
        throw error;
      })
    );
  }
}

