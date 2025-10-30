import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, retry, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Employee, EmployeeCreateRequest } from '../interfaces/employee.interface';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private apiUrl = `${environment.apiUrl}/nhan-vien`;

  constructor(private http: HttpClient) {}

  /**
   * Lấy danh sách tất cả nhân viên với retry mechanism
   */
  getAllEmployees(): Observable<Employee[]> {
    console.log('🔄 EmployeeService: Calling getAllEmployees API...');
    return this.http.get<any>(this.apiUrl).pipe(
      retry(2), // Retry up to 2 times
      map(response => {
        console.log('📥 EmployeeService: Received API response:', response);
        // Extract employees from response.data.content
        if (response && response.data && response.data.content) {
          const employees = response.data.content.map((emp: any) => ({
            id: emp.id,
            maNhanVien: emp.maNhanVien,
            tenNhanVien: emp.hoTen,
            email: emp.email,
            soDienThoai: emp.soDienThoai,
            diaChi: emp.diaChi,
            chucVu: emp.chucVu || 'Nhân viên',
            ngayTao: emp.ngayVaoLam,
            trangThai: emp.trangThai ? 'ACTIVE' : 'INACTIVE'
          }));
          console.log('✅ EmployeeService: Mapped employees:', employees);
          return employees;
        }
        console.log('⚠️ EmployeeService: No employees found in response');
        return [];
      }),
      catchError((error) => {
        console.error('❌ EmployeeService: Failed to load employees after retries:', error);
        throw error;
      })
    );
  }

  /**
   * Lấy danh sách nhân viên có phân trang
   */
  getEmployeesWithPagination(page: number = 0, size: number = 10): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}?page=${page}&size=${size}`);
  }

  /**
   * Lấy thông tin nhân viên theo ID
   */
  getEmployeeById(id: number): Observable<Employee> {
    return this.http.get<Employee>(`${this.apiUrl}/${id}`);
  }

  /**
   * Tìm kiếm nhân viên theo tên
   */
  searchEmployeesByName(name: string): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.apiUrl}/search?name=${name}`);
  }

  /**
   * Tìm kiếm nhân viên theo mã nhân viên
   */
  searchEmployeesByCode(code: string): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.apiUrl}/search?code=${code}`);
  }

  /**
   * Lấy danh sách nhân viên theo chức vụ
   */
  getEmployeesByPosition(position: string): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.apiUrl}/position/${position}`);
  }

  /**
   * Lấy danh sách nhân viên theo phòng ban
   */
  getEmployeesByDepartment(department: string): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.apiUrl}/department/${department}`);
  }

  /**
   * Lấy danh sách nhân viên đang hoạt động
   */
  getActiveEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.apiUrl}/active`);
  }

  /**
   * Tạo nhân viên mới
   */
  createEmployee(employee: EmployeeCreateRequest): Observable<Employee> {
    return this.http.post<Employee>(this.apiUrl, employee);
  }

  /**
   * Cập nhật thông tin nhân viên
   */
  updateEmployee(id: number, employee: Partial<Employee>): Observable<Employee> {
    return this.http.put<Employee>(`${this.apiUrl}/${id}`, employee);
  }

  /**
   * Xóa nhân viên
   */
  deleteEmployee(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Lấy danh sách nhân viên cho dropdown (chỉ lấy id, tên, mã)
   */
  getEmployeesForDropdown(): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.apiUrl}/dropdown`);
  }

  /**
   * Lấy danh sách nhân viên có thể tạo hóa đơn
   * Fallback to getAllEmployees if specific endpoint fails
   */
  getEmployeesForInvoice(): Observable<Employee[]> {
    console.log('🔄 EmployeeService: Calling getEmployeesForInvoice...');
    // Since we don't have a specific endpoint, use getAllEmployees
    return this.getAllEmployees().pipe(
      map(employees => {
        console.log('📥 EmployeeService: Received all employees:', employees);
        // Filter only active employees for invoice creation
        const activeEmployees = employees.filter(emp => emp.trangThai === 'ACTIVE');
        console.log('✅ EmployeeService: Filtered active employees:', activeEmployees);
        return activeEmployees;
      }),
      catchError((error) => {
        console.warn('❌ EmployeeService: Failed to load employees for invoice:', error);
        return of([]);
      })
    );
  }

  /**
   * Lấy danh sách nhân viên với multiple fallback strategies
   */
  getEmployeesWithFallback(): Observable<Employee[]> {
    return this.getAllEmployees().pipe(
      catchError((error) => {
        console.error('All employee endpoints failed:', error);
        // Return empty array as last resort
        return of([]);
      })
    );
  }
}
