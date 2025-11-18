import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { HoaDonDTO, HoaDonPaginatedResponse, HoaDonFilter, HoaDonAdvancedFilter, HoaDonActivity } from '../interfaces/hoa-don.interface';

@Injectable({
  providedIn: 'root'
})
export class HoaDonService {
  private apiUrl = `${environment.apiUrl}/hoa-don`;

  constructor(private http: HttpClient) { }


//kkhja
  getAllHoaDon(filterParams?: any): Observable<any> {
    let params = new HttpParams();
    
    if (filterParams) {
      // Add pagination parameters
      if (filterParams.page !== undefined) {
        params = params.append('page', filterParams.page.toString());
      }
      if (filterParams.size !== undefined) {
        params = params.append('size', filterParams.size.toString());
      }
      
      // Add search parameters
      if (filterParams.keyword) {
        params = params.append('keyword', filterParams.keyword);
      }
      
      // Add filter parameters
      if (filterParams.trangThai) {
        params = params.append('trangThai', filterParams.trangThai);
      }
      if (filterParams.trangThaiThanhToan) {
        params = params.append('trangThaiThanhToan', filterParams.trangThaiThanhToan);
      }
      if (filterParams.phuongThucThanhToan) {
        params = params.append('phuongThucThanhToan', filterParams.phuongThucThanhToan);
      }
      
      // Add date range parameters
      if (filterParams.ngayBatDau) {
        params = params.append('ngayBatDau', filterParams.ngayBatDau);
      }
      if (filterParams.ngayKetThuc) {
        params = params.append('ngayKetThuc', filterParams.ngayKetThuc);
      }
      
      // Add sorting parameters
      if (filterParams.sortBy) {
        params = params.append('sortBy', filterParams.sortBy);
      }
      if (filterParams.sortDirection) {
        params = params.append('sortDirection', filterParams.sortDirection);
      }
    }
    
    return this.http.get<any>(`${this.apiUrl}/page`, { params }).pipe(
      map((response: any) => {
        // Map danhSachChiTiet sang danhSachSanPham cho từng hóa đơn
        if (response.content && Array.isArray(response.content)) {
          response.content = response.content.map((invoice: any) => {
            if (invoice.danhSachChiTiet && Array.isArray(invoice.danhSachChiTiet)) {
              invoice.danhSachSanPham = invoice.danhSachChiTiet.map((item: any) => ({
                id: item.id,
                chiTietSanPhamId: item.chiTietSanPhamId,
                tenSanPham: item.tenSanPham,
                maSanPham: item.maSanPham,
                mauSac: item.mauSac,
                kichThuoc: item.kichThuoc,
                nhaSanXuat: item.nhaSanXuat,
                soLuong: item.soLuong,
                donGia: item.donGia ? Number(item.donGia) : 0,
                giamGia: item.giamGia ? Number(item.giamGia) : 0,
                thanhTien: item.thanhTien ? Number(item.thanhTien) : 0,
                anhSanPham: item.anhSanPham,
                sanPhamId: item.chiTietSanPhamId
              }));
            } else {
              invoice.danhSachSanPham = [];
            }
            return invoice;
          });
        }
        return response;
      })
    );
  }

  getHoaDonPaginated(filter: HoaDonFilter): Observable<any> {
    let params = new HttpParams();
    if (filter.page !== undefined) params = params.append('page', filter.page.toString());
    if (filter.size !== undefined) params = params.append('size', filter.size.toString());
    if (filter.sortBy) params = params.append('sortBy', filter.sortBy);
    if (filter.sortDir) params = params.append('sortDir', filter.sortDir);
    if (filter.search) params = params.append('search', filter.search);
    if (filter.trangThai) params = params.append('trangThai', filter.trangThai);

    return this.http.get<any>(`${this.apiUrl}/page`, { params }).pipe(
      map((response: any) => {
        // Map danhSachChiTiet sang danhSachSanPham cho từng hóa đơn
        if (response.content && Array.isArray(response.content)) {
          response.content = response.content.map((invoice: any) => {
            if (invoice.danhSachChiTiet && Array.isArray(invoice.danhSachChiTiet)) {
              invoice.danhSachSanPham = invoice.danhSachChiTiet.map((item: any) => ({
                id: item.id,
                chiTietSanPhamId: item.chiTietSanPhamId,
                tenSanPham: item.tenSanPham,
                maSanPham: item.maSanPham,
                mauSac: item.mauSac,
                kichThuoc: item.kichThuoc,
                nhaSanXuat: item.nhaSanXuat,
                soLuong: item.soLuong,
                donGia: item.donGia ? Number(item.donGia) : 0,
                giamGia: item.giamGia ? Number(item.giamGia) : 0,
                thanhTien: item.thanhTien ? Number(item.thanhTien) : 0,
                anhSanPham: item.anhSanPham,
                sanPhamId: item.chiTietSanPhamId
              }));
            } else {
              invoice.danhSachSanPham = [];
            }
            return invoice;
          });
        }
        return response;
      })
    );
  }

  getHoaDonById(id: number): Observable<HoaDonDTO> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map((response: any) => {
        // QUAN TRỌNG: Giữ lại danhSachChiTiet gốc từ backend để có thể dùng khi update
        // Lưu danhSachChiTiet gốc trước khi map
        const originalDanhSachChiTiet = response.danhSachChiTiet ? [...response.danhSachChiTiet] : null;
        
        // Map danhSachChiTiet từ backend sang danhSachSanPham cho frontend
        if (response.danhSachChiTiet && Array.isArray(response.danhSachChiTiet)) {
          response.danhSachSanPham = response.danhSachChiTiet.map((item: any) => ({
            id: item.id,
            chiTietSanPhamId: item.chiTietSanPhamId,
            tenSanPham: item.tenSanPham,
            maSanPham: item.maSanPham,
            mauSac: item.mauSac,
            kichThuoc: item.kichThuoc,
            nhaSanXuat: item.nhaSanXuat,
            soLuong: item.soLuong,
            donGia: item.donGia ? Number(item.donGia) : 0,
            giamGia: item.giamGia ? Number(item.giamGia) : 0,
            thanhTien: item.thanhTien ? Number(item.thanhTien) : 0,
            anhSanPham: item.anhSanPham,
            sanPhamId: item.chiTietSanPhamId // Map chiTietSanPhamId to sanPhamId for compatibility
          }));
        } else {
          response.danhSachSanPham = [];
        }
        
        // Giữ lại danhSachChiTiet gốc trong response để có thể dùng khi update
        // (ép kiểu để TypeScript không báo lỗi vì HoaDonDTO không có field này)
        if (originalDanhSachChiTiet) {
          (response as any).danhSachChiTiet = originalDanhSachChiTiet;
        }
        
        return response as HoaDonDTO;
      })
    );
  }

  createHoaDon(hoaDon: Partial<HoaDonDTO>): Observable<HoaDonDTO> {
    console.log('🔄 Sending invoice data to backend:', hoaDon);
    console.log('📡 API URL:', this.apiUrl);
    
    // Test connection first
    this.testConnection().subscribe({
      next: () => console.log('✅ Backend connection successful'),
      error: (error) => console.error('❌ Backend connection failed:', error)
    });
    
    return this.http.post<HoaDonDTO>(this.apiUrl, hoaDon).pipe(
      map(result => {
        console.log('✅ Invoice saved to database successfully:', result);
        return result;
      }),
      tap({
        error: (error) => {
          console.error('❌ Error saving invoice to database:', error);
          console.error('📝 Invoice data that failed:', hoaDon);
        }
      })
    );
  }

  // Test backend connection
  private testConnection(): Observable<any> {
    return this.http.get(`${this.apiUrl}/test`).pipe(
      catchError(() => {
        // If test endpoint doesn't exist, try a simple GET to the base URL
        return this.http.get(`${environment.apiBaseUrl}/actuator/health`);
      })
    );
  }

  // Test tạo hóa đơn đơn giản
  testCreateInvoice(): Observable<any> {
    const testInvoice = {
      maHoaDon: 'TEST_' + Date.now(),
      tenKhachHang: 'Test Customer',
      tongTien: 100000,
      thanhTien: 100000,
      trangThai: 'CHO_XAC_NHAN',
      ngayTao: new Date().toISOString()
    };
    
    console.log('🧪 Testing invoice creation with:', testInvoice);
    return this.http.post(this.apiUrl, testInvoice);
  }

  deleteHoaDon(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  updateTrangThaiHoaDon(id: number, trangThai: string): Observable<HoaDonDTO> {
    // Best practice: PATCH request nên dùng @RequestBody thay vì @RequestParam
    // RFC 5789 (PATCH) khuyến nghị dùng request body
    const body = { trangThai: trangThai };
    
    // Log để debug
    console.log('📤 Sending PATCH request:', {
      url: `${this.apiUrl}/${id}/trang-thai`,
      body: body,
      bodyStringified: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Đảm bảo body được stringify đúng cách
    // Angular HttpClient tự động serialize object thành JSON, nhưng đôi khi cần explicit
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      })
    };
    
    return this.http.patch<HoaDonDTO>(`${this.apiUrl}/${id}/trang-thai`, body, httpOptions);
  }

  getHoaDonDashboard(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dashboard`);
  }

  exportExcel(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/export/excel`);
  }

  // Additional API methods for complete CRUD operations
  getAllHoaDonSimple(): Observable<HoaDonDTO[]> {
    return this.http.get<HoaDonDTO[]>(this.apiUrl);
  }

  createHoaDonNew(hoaDon: Partial<HoaDonDTO>): Observable<HoaDonDTO> {
    return this.http.post<HoaDonDTO>(this.apiUrl, hoaDon);
  }

  updateHoaDonNew(id: number, hoaDon: Partial<HoaDonDTO>): Observable<HoaDonDTO> {
    // Đảm bảo Content-Type header được set đúng
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    
    console.log('📤 Sending PUT request to:', `${this.apiUrl}/${id}`);
    console.log('📦 Request body:', JSON.stringify(hoaDon, null, 2));
    
    return this.http.put<HoaDonDTO>(`${this.apiUrl}/${id}`, hoaDon, { headers });
  }

  deleteHoaDonNew(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  updateTrangThaiHoaDonNew(id: number, trangThai: string): Observable<HoaDonDTO> {
    let params = new HttpParams();
    params = params.append('trangThai', trangThai);
    return this.http.patch<HoaDonDTO>(`${this.apiUrl}/${id}/trang-thai`, null, { params });
  }

  // Advanced search method
  getHoaDonAdvancedSearch(filter: HoaDonAdvancedFilter): Observable<HoaDonPaginatedResponse> {
    let params = new HttpParams();
    if (filter.page !== undefined) params = params.append('page', filter.page.toString());
    if (filter.size !== undefined) params = params.append('size', filter.size.toString());
    if (filter.sortBy) params = params.append('sortBy', filter.sortBy);
    if (filter.sortDir) params = params.append('sortDir', filter.sortDir);
    if (filter.searchTerm) params = params.append('searchTerm', filter.searchTerm);
    if (filter.trangThai) params = params.append('trangThai', filter.trangThai);
    if (filter.startDate) params = params.append('startDate', filter.startDate);
    if (filter.endDate) params = params.append('endDate', filter.endDate);
    if (filter.minAmount !== undefined) params = params.append('minAmount', filter.minAmount.toString());
    if (filter.maxAmount !== undefined) params = params.append('maxAmount', filter.maxAmount.toString());

    return this.http.get<HoaDonPaginatedResponse>(`${this.apiUrl}/advanced-search`, { params });
  }

  // Search suggestions
  getSearchSuggestions(query: string): Observable<string[]> {
    let params = new HttpParams();
    params = params.append('query', query);
    return this.http.get<string[]>(`${this.apiUrl}/search-suggestions`, { params });
  }

  getHoaDonActivities(params: { hoaDonId?: number | null; page?: number; size?: number }): Observable<{
    content: HoaDonActivity[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
    size: number;
  }> {
    let httpParams = new HttpParams();
    // Chỉ thêm hoaDonId nếu có giá trị hợp lệ (không null, không undefined)
    if (params.hoaDonId !== undefined && params.hoaDonId !== null && !isNaN(Number(params.hoaDonId))) {
      httpParams = httpParams.set('hoaDonId', String(params.hoaDonId));
    }
    // Đảm bảo page và size luôn là số hợp lệ
    const page = params.page !== undefined && !isNaN(Number(params.page)) ? Number(params.page) : 0;
    const size = params.size !== undefined && !isNaN(Number(params.size)) ? Number(params.size) : 20;
    httpParams = httpParams.set('page', String(page));
    httpParams = httpParams.set('size', String(size));
    return this.http.get<{
      content: HoaDonActivity[];
      totalElements: number;
      totalPages: number;
      currentPage: number;
      size: number;
    }>(`${environment.apiUrl}/hoa-don-activity`, { params: httpParams });
  }

  // SanPham API methods
  getAllSanPham(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiBaseUrl}/san-pham/all`);
  }

  getActiveSanPham(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/san-pham/active`);
  }

  getAvailableSanPham(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/san-pham/available`);
  }

  createSanPham(sanPham: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/san-pham/create`, sanPham);
  }

  getProducts(): Observable<any[]> {
    return this.getAllSanPham();
  }

  // Methods for DataService compatibility
  testApi(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/test`);
  }

  createSampleData(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/sample-data`, {});
  }

  // Get detailed invoice information
  getHoaDonDetail(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map((response: any) => {
        console.log('📦 getHoaDonDetail - Raw response from backend:', {
          id: response.id,
          maHoaDon: response.maHoaDon,
          trangThai: response.trangThai,
          danhSachChiTiet: response.danhSachChiTiet?.length || 0,
          danhSachSanPham: response.danhSachSanPham?.length || 0
        });
        
        // QUAN TRỌNG: Giữ lại danhSachChiTiet gốc từ backend để có thể dùng khi update
        // Lưu danhSachChiTiet gốc trước khi map
        const originalDanhSachChiTiet = response.danhSachChiTiet ? [...response.danhSachChiTiet] : null;
        
        // Map danhSachChiTiet từ backend sang danhSachSanPham cho frontend
        if (response.danhSachChiTiet && Array.isArray(response.danhSachChiTiet) && response.danhSachChiTiet.length > 0) {
          console.log('📦 Mapping danhSachChiTiet to danhSachSanPham, count:', response.danhSachChiTiet.length);
          response.danhSachSanPham = response.danhSachChiTiet.map((item: any) => {
            // Đảm bảo parse đúng các giá trị số
            const donGia = item.donGia ? (typeof item.donGia === 'string' ? parseFloat(item.donGia) : Number(item.donGia)) : 0;
            const soLuong = item.soLuong ? (typeof item.soLuong === 'string' ? parseInt(item.soLuong, 10) : Number(item.soLuong)) : 0;
            const giamGia = item.giamGia ? (typeof item.giamGia === 'string' ? parseFloat(item.giamGia) : Number(item.giamGia)) : 0;
            const thanhTien = item.thanhTien 
              ? (typeof item.thanhTien === 'string' ? parseFloat(item.thanhTien) : Number(item.thanhTien))
              : (donGia * soLuong - giamGia);
            
            return {
              id: item.id || null,
              chiTietSanPhamId: item.chiTietSanPhamId || null,
              sanPhamId: item.chiTietSanPhamId || item.sanPhamId || null, // Map chiTietSanPhamId to sanPhamId for compatibility
              tenSanPham: item.tenSanPham || 'Chưa có tên',
              maSanPham: item.maSanPham || '',
              mauSac: item.mauSac || item.mauSacTen || '',
              kichThuoc: item.kichThuoc || item.kichThuocTen || '',
              nhaSanXuat: item.nhaSanXuat || item.nhaSanXuatTen || '',
              soLuong: soLuong,
              donGia: donGia,
              giamGia: giamGia,
              thanhTien: thanhTien,
              anhSanPham: item.anhSanPham || item.anhSanPhamUrl || '',
              // Các trường bổ sung nếu có
              danhMuc: item.danhMuc || item.loaiMuBaoHiemTen || '',
              thuongHieu: item.thuongHieu || '',
              ghiChu: item.ghiChu || ''
            };
          });
          console.log('✅ Mapped danhSachSanPham, count:', response.danhSachSanPham.length);
          console.log('📦 Sample mapped product:', response.danhSachSanPham[0]);
        } else {
          console.warn('⚠️ No danhSachChiTiet found in response or empty array');
          response.danhSachSanPham = [];
        }
        
        // Giữ lại danhSachChiTiet gốc trong response để có thể dùng khi update
        // (ép kiểu để TypeScript không báo lỗi vì HoaDonDTO không có field này)
        if (originalDanhSachChiTiet) {
          (response as any).danhSachChiTiet = originalDanhSachChiTiet;
        }
        
        console.log('✅ getHoaDonDetail - Final response:', {
          id: response.id,
          maHoaDon: response.maHoaDon,
          trangThai: response.trangThai,
          danhSachChiTiet: (response as any).danhSachChiTiet?.length || 0,
          danhSachSanPham: response.danhSachSanPham?.length || 0
        });
        
        return response;
      })
    );
  }



  // Customer API methods
  getAllCustomers(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/khach-hang/all`);
  }

  getCustomerById(id: number): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/khach-hang/${id}`);
  }

  getCustomerByEmail(email: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/khach-hang/email/${email}`);
  }

  getCustomerByPhone(phone: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/khach-hang/phone/${phone}`);
  }

  createCustomer(customer: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/khach-hang/create`, customer);
  }

  searchCustomerByName(name: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/khach-hang/search?name=${encodeURIComponent(name)}`);
  }

  // Customer orders methods
  getCustomerOrders(page: number = 0, size: number = 10): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    return this.http.get<any>(`${environment.apiBaseUrl}/api/customer/orders`, { params }).pipe(
      map((response: any) => {
        // Map danhSachChiTiet sang danhSachSanPham
        if (response.content && Array.isArray(response.content)) {
          response.content = response.content.map((invoice: any) => {
            if (invoice.danhSachChiTiet && Array.isArray(invoice.danhSachChiTiet)) {
              invoice.danhSachSanPham = invoice.danhSachChiTiet.map((item: any) => ({
                id: item.id,
                chiTietSanPhamId: item.chiTietSanPhamId,
                tenSanPham: item.tenSanPham,
                maSanPham: item.maSanPham,
                mauSac: item.mauSac,
                kichThuoc: item.kichThuoc,
                nhaSanXuat: item.nhaSanXuat,
                soLuong: item.soLuong,
                donGia: item.donGia ? Number(item.donGia) : 0,
                giamGia: item.giamGia ? Number(item.giamGia) : 0,
                thanhTien: item.thanhTien ? Number(item.thanhTien) : 0,
                anhSanPham: item.anhSanPham,
                sanPhamId: item.chiTietSanPhamId
              }));
            } else {
              invoice.danhSachSanPham = [];
            }
            return invoice;
          });
        }
        return response;
      })
    );
  }

  cancelCustomerOrder(orderId: number): Observable<any> {
    return this.http.patch<any>(`${environment.apiBaseUrl}/api/customer/orders/${orderId}/cancel`, {});
  }
}
