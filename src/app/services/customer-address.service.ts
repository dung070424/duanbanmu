import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { CustomerAddress, CustomerAddressCreateRequest, CustomerAddressUpdateRequest } from '../interfaces/customer-address.interface';

@Injectable({
  providedIn: 'root'
})
export class CustomerAddressService {
  private apiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  /**
   * Lấy danh sách địa chỉ của khách hàng theo ID
   * Sử dụng endpoint đúng: /api/dia-chi-khach-hang/khach-hang/{khachHangId}
   */
  getAddressesByCustomerId(customerId: number): Observable<CustomerAddress[]> {
    // Sử dụng endpoint đúng từ backend
    const correctApiUrl = `${environment.apiUrl}/dia-chi-khach-hang/khach-hang/${customerId}`;
    
    return this.http.get<any[]>(correctApiUrl).pipe(
      map(response => {
        if (response && Array.isArray(response)) {
          // Map response từ backend sang format CustomerAddress
          // Backend DTO có: id, tenNguoiNhan, soDienThoai, diaChiChiTiet, tinhThanh, quanHuyen, phuongXa, macDinh, trangThai, khachHangId
          return response.map((address: any) => ({
            id: address.id,
            khachHangId: address.khachHangId || customerId,
            tenNguoiNhan: address.tenNguoiNhan || '',
            soDienThoai: address.soDienThoai || '',
            diaChi: address.diaChiChiTiet || address.diaChi || '', // Backend dùng diaChiChiTiet
            tinhThanh: address.tinhThanh || '',
            quanHuyen: address.quanHuyen || '',
            phuongXa: address.phuongXa || '',
            macDinh: address.macDinh || false,
            trangThai: address.trangThai !== undefined ? address.trangThai : true
          }));
        }
        return [];
      })
    );
  }

  /**
   * Lấy địa chỉ theo ID
   */
  getAddressById(addressId: number): Observable<CustomerAddress> {
    return this.http.get<any>(`${this.apiUrl}/${addressId}`).pipe(
      map(response => ({
        id: response.id,
        khachHangId: response.khachHangId,
        tenNguoiNhan: response.tenNguoiNhan,
        soDienThoai: response.soDienThoai,
        diaChi: response.diaChi,
        tinhThanh: response.tinhThanh,
        quanHuyen: response.quanHuyen,
        phuongXa: response.phuongXa,
        macDinh: response.macDinh,
        trangThai: response.trangThai
      }))
    );
  }

  /**
   * Tạo địa chỉ mới cho khách hàng
   */
  createAddress(address: CustomerAddressCreateRequest): Observable<CustomerAddress> {
    console.log('📍 Creating address with data:', address);
    
    // Sử dụng endpoint thực tế với responseType text
    return this.http.post(`${environment.apiUrl}/address/save`, address, { 
      responseType: 'text' 
    }).pipe(
      map(responseText => {
        console.log('✅ Address creation response (text):', responseText);
        
        // Parse response text để lấy ID thực tế
        const idMatch = responseText.match(/ID địa chỉ: (\d+)/);
        const actualId = idMatch ? parseInt(idMatch[1]) : Date.now();
        
        console.log('📍 Extracted address ID:', actualId);
        
        // Tạo response từ request và ID thực tế
        return {
          id: actualId,
          khachHangId: address.khachHangId,
          tenNguoiNhan: address.tenNguoiNhan,
          soDienThoai: address.soDienThoai,
          diaChi: address.diaChi,
          tinhThanh: address.tinhThanh,
          quanHuyen: address.quanHuyen,
          phuongXa: address.phuongXa,
          macDinh: address.macDinh || false,
          trangThai: address.trangThai || true
        };
      }),
      tap({
        error: (error) => {
          console.error('❌ Error creating customer address:', error);
        }
      })
    );
  }

  /**
   * Cập nhật địa chỉ
   */
  updateAddress(addressId: number, address: CustomerAddressUpdateRequest): Observable<CustomerAddress> {
    return this.http.put<any>(`${this.apiUrl}/${addressId}`, address).pipe(
      map(response => ({
        id: response.id,
        khachHangId: response.khachHangId,
        tenNguoiNhan: response.tenNguoiNhan,
        soDienThoai: response.soDienThoai,
        diaChi: response.diaChi,
        tinhThanh: response.tinhThanh,
        quanHuyen: response.quanHuyen,
        phuongXa: response.phuongXa,
        macDinh: response.macDinh,
        trangThai: response.trangThai
      }))
    );
  }

  /**
   * Xóa địa chỉ
   */
  deleteAddress(addressId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${addressId}`);
  }

  /**
   * Đặt địa chỉ làm mặc định
   */
  setDefaultAddress(customerId: number, addressId: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/set-default/${customerId}/${addressId}`, {});
  }
}
