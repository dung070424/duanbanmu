import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Province {
  code: string;
  name: string;
}

export interface District {
  code: string;
  name: string;
  province_code: string;
}

export interface Ward {
  code: string;
  name: string;
  district_code: string;
}

@Injectable({
  providedIn: 'root'
})
export class VietnamAddressService {
  private readonly API_BASE_URL = 'https://provinces.open-api.vn/api';

  constructor(private http: HttpClient) {}

  /**
   * Lấy danh sách tất cả tỉnh/thành phố
   */
  getProvinces(): Observable<Province[]> {
    return this.http.get<any[]>(`${this.API_BASE_URL}/p/`).pipe(
      map(response => response.map(item => ({
        code: item.code,
        name: item.name
      })))
    );
  }

  /**
   * Lấy danh sách quận/huyện theo mã tỉnh
   */
  getDistrictsByProvince(provinceCode: string): Observable<District[]> {
    return this.http.get<any>(`${this.API_BASE_URL}/p/${provinceCode}?depth=2`).pipe(
      map(response => {
        if (response.districts) {
          return response.districts.map((district: any) => ({
            code: district.code,
            name: district.name,
            province_code: provinceCode
          }));
        }
        return [];
      })
    );
  }

  /**
   * Lấy danh sách xã/phường theo mã quận/huyện
   */
  getWardsByDistrict(districtCode: string): Observable<Ward[]> {
    return this.http.get<any>(`${this.API_BASE_URL}/d/${districtCode}?depth=2`).pipe(
      map(response => {
        if (response.wards) {
          return response.wards.map((ward: any) => ({
            code: ward.code,
            name: ward.name,
            district_code: districtCode
          }));
        }
        return [];
      })
    );
  }

  /**
   * Lấy thông tin chi tiết tỉnh theo mã
   */
  getProvinceByCode(provinceCode: string): Observable<Province> {
    return this.http.get<any>(`${this.API_BASE_URL}/p/${provinceCode}`).pipe(
      map(response => ({
        code: response.code,
        name: response.name
      }))
    );
  }

  /**
   * Lấy thông tin chi tiết quận theo mã
   */
  getDistrictByCode(districtCode: string): Observable<District> {
    return this.http.get<any>(`${this.API_BASE_URL}/d/${districtCode}`).pipe(
      map(response => ({
        code: response.code,
        name: response.name,
        province_code: response.province_code
      }))
    );
  }

  /**
   * Lấy thông tin chi tiết xã theo mã
   */
  getWardByCode(wardCode: string): Observable<Ward> {
    return this.http.get<any>(`${this.API_BASE_URL}/w/${wardCode}`).pipe(
      map(response => ({
        code: response.code,
        name: response.name,
        district_code: response.district_code
      }))
    );
  }
}
