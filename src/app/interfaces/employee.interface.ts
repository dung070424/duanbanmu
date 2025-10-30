export interface Employee {
  id?: number;
  maNhanVien?: string;
  tenNhanVien: string;
  email?: string;
  soDienThoai?: string;
  diaChi?: string;
  chucVu?: string;
  ngayTao?: string;
  trangThai?: string;
  luong?: number;
  phongBan?: string;
}

export interface EmployeeCreateRequest {
  maNhanVien?: string;
  tenNhanVien: string;
  email?: string;
  soDienThoai?: string;
  diaChi?: string;
  chucVu?: string;
  luong?: number;
  phongBan?: string;
}

export interface EmployeeSearchResult {
  employees: Employee[];
  total: number;
}
