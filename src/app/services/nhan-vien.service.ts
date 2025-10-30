import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  NhanVien,
  NhanVienSearchParams,
  ApiResponse,
  PageResponse,
  NhanVienStats,
} from '../interfaces/nhan-vien.interface';

@Injectable({
  providedIn: 'root',
})
export class NhanVienService {
  private readonly baseUrl = 'http://localhost:8081/api/nhan-vien';
  private nhanVienSubject = new BehaviorSubject<NhanVien[]>([]);
  public nhanVien$ = this.nhanVienSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Lấy tất cả nhân viên với phân trang
  getAllNhanVien(
    page: number = 0,
    size: number = 10,
    sortBy: string = 'id',
    sortDir: string = 'asc'
  ): Observable<PageResponse<NhanVien>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    return this.http.get<ApiResponse<PageResponse<NhanVien>>>(this.baseUrl, { params }).pipe(
      map((response) => response.data),
      catchError(this.handleError)
    );
  }

  // Lấy nhân viên theo ID
  getNhanVienById(id: number): Observable<NhanVien> {
    return this.http.get<ApiResponse<NhanVien>>(`${this.baseUrl}/${id}`).pipe(
      map((response) => response.data),
      catchError(this.handleError)
    );
  }

  // Tìm kiếm nhân viên với bộ lọc
  searchNhanVien(params: NhanVienSearchParams): Observable<PageResponse<NhanVien>> {
    let httpParams = new HttpParams();

    if (params.hoTen) httpParams = httpParams.set('hoTen', params.hoTen);
    if (params.email) httpParams = httpParams.set('email', params.email);
    if (params.soDienThoai) httpParams = httpParams.set('soDienThoai', params.soDienThoai);
    if (params.maNhanVien) httpParams = httpParams.set('maNhanVien', params.maNhanVien);
    if (params.trangThai !== undefined)
      httpParams = httpParams.set('trangThai', params.trangThai.toString());
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size.toString());
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDir) httpParams = httpParams.set('sortDir', params.sortDir);

    return this.http
      .get<ApiResponse<PageResponse<NhanVien>>>(`${this.baseUrl}/search`, { params: httpParams })
      .pipe(
        map((response) => response.data),
        catchError(this.handleError)
      );
  }

  // Tạo nhân viên mới
  createNhanVien(nhanVien: NhanVien): Observable<NhanVien> {
    return this.http.post<ApiResponse<NhanVien>>(this.baseUrl, nhanVien).pipe(
      map((response) => response.data),
      catchError(this.handleError)
    );
  }

  // Cập nhật nhân viên
  updateNhanVien(id: number, nhanVien: NhanVien): Observable<NhanVien> {
    return this.http.put<ApiResponse<NhanVien>>(`${this.baseUrl}/${id}`, nhanVien).pipe(
      map((response) => response.data),
      catchError(this.handleError)
    );
  }

  // Xóa nhân viên (soft delete)
  deleteNhanVien(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(
      map((response) => response.data),
      catchError(this.handleError)
    );
  }

  // Xóa vĩnh viễn nhân viên
  permanentlyDeleteNhanVien(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}/permanent`).pipe(
      map((response) => response.data),
      catchError(this.handleError)
    );
  }

  // Lấy nhân viên theo email
  getNhanVienByEmail(email: string): Observable<NhanVien> {
    return this.http.get<ApiResponse<NhanVien>>(`${this.baseUrl}/email/${email}`).pipe(
      map((response) => response.data),
      catchError(this.handleError)
    );
  }

  // Lấy nhân viên theo số điện thoại
  getNhanVienBySoDienThoai(soDienThoai: string): Observable<NhanVien> {
    return this.http.get<ApiResponse<NhanVien>>(`${this.baseUrl}/phone/${soDienThoai}`).pipe(
      map((response) => response.data),
      catchError(this.handleError)
    );
  }

  // Lấy nhân viên theo mã nhân viên
  getNhanVienByMaNhanVien(maNhanVien: string): Observable<NhanVien> {
    return this.http.get<ApiResponse<NhanVien>>(`${this.baseUrl}/ma-nhan-vien/${maNhanVien}`).pipe(
      map((response) => response.data),
      catchError(this.handleError)
    );
  }

  // Lấy nhân viên theo trạng thái
  getNhanVienByTrangThai(trangThai: boolean): Observable<NhanVien[]> {
    return this.http.get<ApiResponse<NhanVien[]>>(`${this.baseUrl}/trang-thai/${trangThai}`).pipe(
      map((response) => response.data),
      catchError(this.handleError)
    );
  }

  // Lấy thống kê nhân viên
  getNhanVienStats(): Observable<NhanVienStats> {
    return this.http.get<ApiResponse<NhanVienStats>>(`${this.baseUrl}/stats`).pipe(
      map((response) => response.data),
      catchError(this.handleError)
    );
  }

  // Lấy nhân viên theo khoảng thời gian vào làm
  getNhanVienByDateRange(startDate: string, endDate: string): Observable<NhanVien[]> {
    const params = new HttpParams().set('startDate', startDate).set('endDate', endDate);

    return this.http.get<ApiResponse<NhanVien[]>>(`${this.baseUrl}/date-range`, { params }).pipe(
      map((response) => response.data),
      catchError(this.handleError)
    );
  }

  // Tạo mã nhân viên mới
  generateMaNhanVien(): Observable<string> {
    return this.http.get<ApiResponse<string>>(`${this.baseUrl}/generate-ma-nhan-vien`).pipe(
      map((response) => response.data),
      catchError(this.handleError)
    );
  }

  // Kiểm tra email đã tồn tại
  checkEmailExists(email: string): Observable<boolean> {
    return this.http
      .get<ApiResponse<{ exists: boolean }>>(`${this.baseUrl}/check-email/${email}`)
      .pipe(
        map((response) => response.data.exists),
        catchError(this.handleError)
      );
  }

  // Kiểm tra số điện thoại đã tồn tại
  checkPhoneExists(soDienThoai: string): Observable<boolean> {
    return this.http
      .get<ApiResponse<{ exists: boolean }>>(`${this.baseUrl}/check-phone/${soDienThoai}`)
      .pipe(
        map((response) => response.data.exists),
        catchError(this.handleError)
      );
  }

  // Kiểm tra mã nhân viên đã tồn tại
  checkMaNhanVienExists(maNhanVien: string): Observable<boolean> {
    return this.http
      .get<ApiResponse<{ exists: boolean }>>(`${this.baseUrl}/check-ma-nhan-vien/${maNhanVien}`)
      .pipe(
        map((response) => response.data.exists),
        catchError(this.handleError)
      );
  }

  // Cập nhật danh sách nhân viên trong BehaviorSubject
  updateNhanVienList(nhanVienList: NhanVien[]): void {
    this.nhanVienSubject.next(nhanVienList);
  }

  // Lấy danh sách nhân viên hiện tại
  getCurrentNhanVienList(): NhanVien[] {
    return this.nhanVienSubject.value;
  }

  // Xử lý lỗi
  private handleError(error: any): Observable<never> {
    console.error('NhanVienService Error:', error);
    let errorMessage = 'Có lỗi xảy ra';

    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    throw new Error(errorMessage);
  }
}
