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
   */
  getAddressesByCustomerId(customerId: number): Observable<CustomerAddress[]> {
    return this.http.get<any>(`${this.apiUrl}/addresses`).pipe(
      map(response => {
        if (response && Array.isArray(response)) {
          // Filter by customer ID on frontend since backend doesn't have this endpoint
          return response
            .filter((address: any) => address.khachHangId === customerId)
            .map((address: any) => ({
              id: address.id,
              khachHangId: address.khachHangId,
              tenNguoiNhan: address.tenNguoiNhan,
              soDienThoai: address.soDienThoai,
              diaChi: address.diaChi,
              tinhThanh: address.tinhThanh,
              quanHuyen: address.quanHuyen,
              phuongXa: address.phuongXa,
              macDinh: address.macDinh,
              trangThai: address.trangThai
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
    return this.http.post('http://localhost:8081/api/address/save', address, { 
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
