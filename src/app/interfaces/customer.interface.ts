export interface Customer {
  id?: number;
  maKhachHang?: string;
  tenKhachHang: string;
  soDienThoai?: string;
  email?: string;
  diaChi?: string;
  ngaySinh?: string;
  gioiTinh?: boolean;
  diemTichLuy?: number;
  soLanMua?: number;
  lanMuaGanNhat?: string;
  ngayTao?: string;
  trangThai?: boolean | string;
  userId?: number;
  username?: string;
  // Địa chỉ mặc định
  coDiaChiMacDinh?: boolean;
  diaChiMacDinh?: string;
  phuongXaMacDinh?: string;
  quanHuyenMacDinh?: string;
  tinhThanhMacDinh?: string;
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