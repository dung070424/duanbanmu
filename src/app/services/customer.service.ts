import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Customer, CustomerCreateRequest } from '../interfaces/customer.interface';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private apiUrl = `${environment.apiUrl}/khach-hang`;

  constructor(private http: HttpClient) {}

  /**
   * Tìm kiếm khách hàng theo email
   */
  findByEmail(email: string): Observable<Customer[]> {
    console.log('🔍 Searching customer by email:', email);
    console.log('📡 API URL:', `${this.apiUrl}/search?email=${encodeURIComponent(email)}`);
    
    return this.http.get<any>(`${this.apiUrl}/search?email=${encodeURIComponent(email)}`).pipe(
      map(response => {
        console.log('📥 Search response:', response);
        if (response && response.content) {
          const customers = response.content.map((customer: any) => ({
            id: customer.id,
            tenKhachHang: customer.tenKhachHang,
            email: customer.email,
            soDienThoai: customer.soDienThoai,
            ngaySinh: customer.ngaySinh,
            gioiTinh: customer.gioiTinh,
            diemTichLuy: customer.diemTichLuy,
            ngayTao: customer.ngayTao,
            trangThai: customer.trangThai
          }));
          console.log('✅ Mapped customers:', customers);
          return customers;
        }
        console.log('⚠️ No content in response');
        return [];
      }),
      catchError((error: any) => {
        console.error('❌ Error searching customer by email:', error);
        return of([]);
      })
    );
  }

  /**
   * Tìm kiếm khách hàng theo số điện thoại
   */
  findByPhone(phone: string): Observable<Customer[]> {
    console.log('🔍 Searching customer by phone:', phone);
    console.log('📡 API URL:', `${this.apiUrl}/search?soDienThoai=${encodeURIComponent(phone)}`);
    
    return this.http.get<any>(`${this.apiUrl}/search?soDienThoai=${encodeURIComponent(phone)}`).pipe(
      map(response => {
        console.log('📥 Search response:', response);
        if (response && response.content) {
          const customers = response.content.map((customer: any) => ({
            id: customer.id,
            tenKhachHang: customer.tenKhachHang,
            email: customer.email,
            soDienThoai: customer.soDienThoai,
            ngaySinh: customer.ngaySinh,
            gioiTinh: customer.gioiTinh,
            diemTichLuy: customer.diemTichLuy,
            ngayTao: customer.ngayTao,
            trangThai: customer.trangThai
          }));
          console.log('✅ Mapped customers:', customers);
          return customers;
        }
        console.log('⚠️ No content in response');
        return [];
      }),
      catchError((error: any) => {
        console.error('❌ Error searching customer by phone:', error);
        return of([]);
      })
    );
  }

  /**
   * Tạo khách hàng mới
   */
  createCustomer(customer: CustomerCreateRequest): Observable<Customer> {
    // Map CustomerCreateRequest to backend format
    const backendCustomer = {
      tenKhachHang: customer.tenKhachHang,
      email: customer.email || null,
      soDienThoai: customer.soDienThoai || null,
      ngaySinh: customer.ngaySinh || '1990-01-01',
      gioiTinh: customer.gioiTinh || true,
      diemTichLuy: customer.diemTichLuy || 0,
      trangThai: customer.trangThai !== undefined ? customer.trangThai : true,
      userId: customer.userId || null,
      username: customer.username || null,
      fullName: customer.fullName || null
    };

    console.log('🔄 Creating customer with data:', backendCustomer);
    console.log('📡 API URL:', this.apiUrl);

    return this.http.post<any>(this.apiUrl, backendCustomer).pipe(
      map(response => {
        console.log('✅ Customer created successfully:', response);
        const mappedCustomer = {
          id: response.id,
          tenKhachHang: response.tenKhachHang,
          email: response.email,
          soDienThoai: response.soDienThoai,
          ngaySinh: response.ngaySinh,
          gioiTinh: response.gioiTinh,
          diemTichLuy: response.diemTichLuy,
          ngayTao: response.ngayTao,
          trangThai: response.trangThai
        };
        console.log('📋 Mapped customer:', mappedCustomer);
        return mappedCustomer;
      })
    );
  }

  // Test tạo khách hàng đơn giản
  testCreateCustomer(): Observable<any> {
    const testCustomer = {
      tenKhachHang: 'Test Customer ' + Date.now(),
      email: 'test' + Date.now() + '@example.com',
      soDienThoai: '090' + Math.floor(Math.random() * 10000000),
      ngaySinh: '1990-01-01',
      gioiTinh: true,
      diemTichLuy: 0,
      trangThai: true
    };
    
    console.log('🧪 Testing customer creation with:', testCustomer);
    return this.http.post(this.apiUrl, testCustomer);
  }

  /**
   * Cập nhật thông tin khách hàng
   */
  updateCustomer(id: number, customer: Partial<Customer>): Observable<Customer> {
    return this.http.put<Customer>(`${this.apiUrl}/${id}`, customer);
  }

  /**
   * Lấy danh sách tất cả khách hàng
   */
  getAllCustomers(): Observable<Customer[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        if (response && response.content) {
          return response.content.map((customer: any) => ({
            id: customer.id,
            tenKhachHang: customer.tenKhachHang,
            email: customer.email,
            soDienThoai: customer.soDienThoai,
            ngaySinh: customer.ngaySinh,
            gioiTinh: customer.gioiTinh,
            diemTichLuy: customer.diemTichLuy,
            ngayTao: customer.ngayTao,
            trangThai: customer.trangThai
          }));
        }
        return [];
      })
    );
  }

  /**
   * Lấy thông tin khách hàng theo ID
   */
  getCustomerById(id: number): Observable<Customer> {
    return this.http.get<Customer>(`${this.apiUrl}/${id}`);
  }

  /**
   * Lấy thông tin khách hàng theo User ID
   */
  getCustomerByUserId(userId: number): Observable<Customer> {
    return this.http.get<Customer>(`${this.apiUrl}/user/${userId}`);
  }

  /**
   * Lấy thông tin khách hàng hiện tại từ JWT token (username)
   * Backend sẽ tự động lấy username từ JWT token và tìm khach_hang tương ứng
   */
  getCurrentCustomer(): Observable<Customer> {
    return this.http.get<Customer>(`${this.apiUrl}/me`).pipe(
      catchError((error: any) => {
        console.error('❌ Error getting current customer:', error);
        // Nếu lỗi 400, có thể là do khách hàng chưa có record
        // Backend sẽ tự động tạo, nhưng nếu vẫn lỗi thì throw error
        if (error.status === 400 || error.status === 404) {
          console.error('❌ Customer not found or error creating customer:', error.error);
        }
        throw error;
      })
    );
  }

  /**
   * Xóa khách hàng
   */
  deleteCustomer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Kiểm tra khách hàng đã tồn tại chưa (theo email hoặc số điện thoại)
   */
  checkCustomerExists(email?: string, phone?: string): Observable<Customer | null> {
    if (email) {
      return this.findByEmail(email).pipe(
        map(customers => customers && customers.length > 0 ? customers[0] : null)
      );
    } else if (phone) {
      return this.findByPhone(phone).pipe(
        map(customers => customers && customers.length > 0 ? customers[0] : null)
      );
    }
    
    // Return empty observable if no search criteria
    return new Observable(observer => {
      observer.next(null);
      observer.complete();
    });
  }

  /**
   * Tạo hoặc tìm khách hàng dựa trên thông tin từ hóa đơn
   */
  createOrFindCustomer(customerInfo: {
    tenKhachHang: string;
    soDienThoai?: string;
    email?: string;
    diaChi?: string;
  }): Observable<Customer> {
    console.log('🔄 Creating or finding customer with info:', customerInfo);
    
    return new Observable(observer => {
      // Tìm kiếm khách hàng theo email trước
      if (customerInfo.email) {
        this.findByEmail(customerInfo.email).subscribe({
          next: (customers) => {
            if (customers && customers.length > 0) {
              console.log('✅ Found existing customer:', customers[0]);
              observer.next(customers[0]);
              observer.complete();
            } else {
              console.log('🆕 No existing customer found, creating new one...');
              // Không tìm thấy, tạo mới
              const customerToCreate: CustomerCreateRequest = {
                tenKhachHang: customerInfo.tenKhachHang,
                email: customerInfo.email, // Sử dụng email gốc không thêm timestamp
                soDienThoai: customerInfo.soDienThoai, // Sử dụng số điện thoại gốc không thêm timestamp
                ngaySinh: '1990-01-01',
                gioiTinh: true,
                diemTichLuy: 0,
                trangThai: true
              };
              
              console.log('📝 Creating customer with data:', customerToCreate);
              this.createCustomer(customerToCreate).subscribe({
                next: (newCustomer) => {
                  console.log('✅ New customer created successfully:', newCustomer);
                  observer.next(newCustomer);
                  observer.complete();
                },
                error: (error) => {
                  observer.error(error);
                }
              });
            }
          },
          error: (error) => {
            observer.error(error);
          }
        });
      } else if (customerInfo.soDienThoai) {
        // Tìm kiếm theo số điện thoại nếu không có email
        this.findByPhone(customerInfo.soDienThoai).subscribe({
          next: (customers) => {
            if (customers && customers.length > 0) {
              console.log('✅ Found existing customer:', customers[0]);
              observer.next(customers[0]);
              observer.complete();
            } else {
              console.log('🆕 No existing customer found, creating new one...');
              // Không tìm thấy, tạo mới
              const customerToCreate: CustomerCreateRequest = {
                tenKhachHang: customerInfo.tenKhachHang,
                email: customerInfo.email, // Sử dụng email gốc không thêm timestamp
                soDienThoai: customerInfo.soDienThoai, // Sử dụng số điện thoại gốc không thêm timestamp
                ngaySinh: '1990-01-01',
                gioiTinh: true,
                diemTichLuy: 0,
                trangThai: true
              };
              
              console.log('📝 Creating customer with data:', customerToCreate);
              this.createCustomer(customerToCreate).subscribe({
                next: (newCustomer) => {
                  console.log('✅ New customer created successfully:', newCustomer);
                  observer.next(newCustomer);
                  observer.complete();
                },
                error: (error) => {
                  observer.error(error);
                }
              });
            }
          },
          error: (error) => {
            observer.error(error);
          }
        });
      } else {
        // Không có email hoặc số điện thoại, tạo mới luôn
        const customerToCreate: CustomerCreateRequest = {
          tenKhachHang: customerInfo.tenKhachHang,
          email: customerInfo.email ? `${customerInfo.email.split('@')[0]}_${Date.now()}@${customerInfo.email.split('@')[1]}` : undefined,
          soDienThoai: customerInfo.soDienThoai ? `${customerInfo.soDienThoai}_${Date.now()}` : undefined,
          ngaySinh: '1990-01-01',
          gioiTinh: true,
          diemTichLuy: 0,
          trangThai: true
        };
        
        this.createCustomer(customerToCreate).subscribe({
          next: (newCustomer) => {
            observer.next(newCustomer);
            observer.complete();
          },
          error: (error) => {
            observer.error(error);
          }
        });
      }
    });
  }
}