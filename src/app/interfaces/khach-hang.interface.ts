export interface KhachHang {
  id?: number;
  maKhachHang?: string;
  tenKhachHang: string;
  email: string;
  soDienThoai: string;
  diaChi?: string;
  ngaySinh?: string;
  gioiTinh?: boolean;
  ngayTao?: string;
  trangThai?: boolean;
  userId?: number;
  username?: string;
  // Địa chỉ mặc định từ backend
  coDiaChiMacDinh?: boolean;
  diaChiMacDinh?: string;
  phuongXaMacDinh?: string;
  quanHuyenMacDinh?: string;
  tinhThanhMacDinh?: string;
}

export interface KhachHangSearchParams {
  page: number;
  size: number;
  sortBy: string;
  sortDir: string;
  keyword?: string;
  trangThai?: boolean;
}

export interface PageResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      sorted: boolean;
      unsorted: boolean;
    };
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
  numberOfElements: number;
  size: number;
  number: number;
}

export interface KhachHangStats {
  total: number;
  active: number;
  inactive: number;
}

// Utility functions
export function getTrangThaiText(trangThai: boolean | undefined): string {
  return trangThai ? 'Hoạt động' : 'Dừng hoạt động';
}

export function getGioiTinhText(gioiTinh: boolean | undefined): string {
  return gioiTinh ? 'Nam' : 'Nữ';
}
