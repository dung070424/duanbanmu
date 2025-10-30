export interface Customer {
  id?: number;
  tenKhachHang: string;
  soDienThoai?: string;
  email?: string;
  diaChi?: string;
  ngayTao?: string;
  trangThai?: string;
}

export interface CustomerCreateRequest {
  tenKhachHang: string;
  soDienThoai?: string;
  email?: string;
  ngaySinh?: string;
  gioiTinh?: boolean;
  diemTichLuy?: number;
  trangThai?: boolean;
  userId?: number;
  username?: string;
  fullName?: string;
}

export interface CustomerSearchResult {
  customers: Customer[];
  total: number;
}