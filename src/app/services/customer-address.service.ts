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
    
    // Map frontend format to backend format (diaChi -> diaChiChiTiet)
    const backendAddress = {
      khachHangId: address.khachHangId,
      tenNguoiNhan: address.tenNguoiNhan,
      soDienThoai: address.soDienThoai,
      diaChiChiTiet: address.diaChi, // Backend uses diaChiChiTiet
      tinhThanh: address.tinhThanh,
      quanHuyen: address.quanHuyen,
      phuongXa: address.phuongXa,
      macDinh: address.macDinh || false,
      trangThai: address.trangThai !== undefined ? address.trangThai : true
    };
    
    const apiUrl = `${environment.apiUrl}/dia-chi-khach-hang`;
    console.log('📡 POST to:', apiUrl);
    
    return this.http.post<any>(apiUrl, backendAddress).pipe(
      map(response => {
        console.log('✅ Address created:', response);
        // Map backend response to frontend format
        return {
          id: response.id,
          khachHangId: response.khachHangId,
          tenNguoiNhan: response.tenNguoiNhan,
          soDienThoai: response.soDienThoai,
          diaChi: response.diaChiChiTiet || response.diaChi || '',
          tinhThanh: response.tinhThanh,
          quanHuyen: response.quanHuyen,
          phuongXa: response.phuongXa,
          macDinh: response.macDinh || false,
          trangThai: response.trangThai !== undefined ? response.trangThai : true
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
  updateAddress(addressId: number, address: CustomerAddressUpdateRequest | CustomerAddressCreateRequest): Observable<CustomerAddress> {
    console.log('📍 Updating address ID:', addressId, 'with data:', address);
    
    // Map frontend format to backend format (diaChi -> diaChiChiTiet)
    const backendAddress: any = {
      khachHangId: (address as CustomerAddressCreateRequest).khachHangId || 0,
      tenNguoiNhan: address.tenNguoiNhan || (address as any).tenNguoiNhan,
      soDienThoai: address.soDienThoai || (address as any).soDienThoai,
      diaChiChiTiet: address.diaChi || (address as any).diaChi, // Backend uses diaChiChiTiet
      tinhThanh: address.tinhThanh || (address as any).tinhThanh,
      quanHuyen: address.quanHuyen || (address as any).quanHuyen,
      phuongXa: address.phuongXa || (address as any).phuongXa,
      macDinh: address.macDinh !== undefined ? address.macDinh : ((address as any).macDinh || false),
      trangThai: address.trangThai !== undefined ? address.trangThai : ((address as any).trangThai !== undefined ? (address as any).trangThai : true)
    };
    
    const apiUrl = `${environment.apiUrl}/dia-chi-khach-hang/${addressId}`;
    console.log('📡 PUT to:', apiUrl);
    
    return this.http.put<any>(apiUrl, backendAddress).pipe(
      map(response => {
        console.log('✅ Address updated:', response);
        // Map backend response to frontend format
        return {
          id: response.id,
          khachHangId: response.khachHangId,
          tenNguoiNhan: response.tenNguoiNhan,
          soDienThoai: response.soDienThoai,
          diaChi: response.diaChiChiTiet || response.diaChi || '',
          tinhThanh: response.tinhThanh,
          quanHuyen: response.quanHuyen,
          phuongXa: response.phuongXa,
          macDinh: response.macDinh || false,
          trangThai: response.trangThai !== undefined ? response.trangThai : true
        };
      }),
      tap({
        error: (error) => {
          console.error('❌ Error updating address:', error);
        }
      })
    );
  }

  /**
   * Xóa địa chỉ
   */
  deleteAddress(addressId: number, customerId?: number): Observable<void> {
    // Backend endpoint: DELETE /api/dia-chi-khach-hang/{id}/khach-hang/{khachHangId}
    // If customerId is not provided, we need to get it from the address first
    if (customerId) {
      const apiUrl = `${environment.apiUrl}/dia-chi-khach-hang/${addressId}/khach-hang/${customerId}`;
      console.log('📡 DELETE to:', apiUrl);
      return this.http.delete<void>(apiUrl);
    } else {
      // If customerId is not provided, try to delete without it (may not work)
      const apiUrl = `${environment.apiUrl}/dia-chi-khach-hang/${addressId}`;
      console.log('📡 DELETE to:', apiUrl);
      return this.http.delete<void>(apiUrl);
    }
  }

  /**
   * Đặt địa chỉ làm mặc định
   */
  setDefaultAddress(customerId: number, addressId: number): Observable<CustomerAddress> {
    // Backend endpoint: PUT /api/dia-chi-khach-hang/{id}/khach-hang/{khachHangId}/mac-dinh
    const apiUrl = `${environment.apiUrl}/dia-chi-khach-hang/${addressId}/khach-hang/${customerId}/mac-dinh`;
    console.log('📡 PUT to:', apiUrl);
    return this.http.put<any>(apiUrl, {}).pipe(
      map(response => {
        console.log('✅ Default address set:', response);
        return {
          id: response.id,
          khachHangId: response.khachHangId,
          tenNguoiNhan: response.tenNguoiNhan,
          soDienThoai: response.soDienThoai,
          diaChi: response.diaChiChiTiet || response.diaChi || '',
          tinhThanh: response.tinhThanh,
          quanHuyen: response.quanHuyen,
          phuongXa: response.phuongXa,
          macDinh: response.macDinh || false,
          trangThai: response.trangThai !== undefined ? response.trangThai : true
        };
      })
    );
  }
}
