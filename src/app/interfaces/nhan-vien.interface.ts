export interface NhanVien {
  id?: number;
  hoTen: string;
  maNhanVien?: string;
  email: string;
  soDienThoai: string;
  soCanCuocCongDan?: string;
  diaChi?: string;
  gioiTinh?: boolean; // true: Nam, false: Nữ
  ngaySinh?: string;
  ngayVaoLam?: string;
  trangThai?: boolean; // true: Hoạt động, false: Nghỉ việc
  userId?: number;
  username?: string;
  fullName?: string;
}

export interface NhanVienSearchParams {
  hoTen?: string;
  email?: string;
  soDienThoai?: string;
  maNhanVien?: string;
  trangThai?: boolean;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
}

export interface NhanVienStats {
  activeCount: number;
  inactiveCount: number;
  totalCount: number;
}

// Enum cho phòng ban
export enum PhongBan {
  BAN_HANG = 'Bán hàng',
  KHO = 'Kho',
  KE_TOAN = 'Kế toán',
  MARKETING = 'Marketing',
  CSKH = 'CSKH',
}

// Enum cho trạng thái
export enum TrangThai {
  HOAT_DONG = 'Hoạt động',
  TAM_NGHI = 'Tạm nghỉ',
  NGHI_VIEC = 'Nghỉ việc',
}

// Helper functions
export function getTrangThaiText(trangThai: boolean | undefined): string {
  if (trangThai === undefined) return 'Không xác định';
  return trangThai ? TrangThai.HOAT_DONG : TrangThai.NGHI_VIEC;
}

export function getGioiTinhText(gioiTinh: boolean | undefined): string {
  if (gioiTinh === undefined) return 'Không xác định';
  return gioiTinh ? 'Nam' : 'Nữ';
}
