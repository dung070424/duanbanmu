export interface HoaDonDTO {
  id: number;
  maHoaDon: string;
  khachHangId?: number;
  tenKhachHang?: string;
  emailKhachHang?: string;
  soDienThoaiKhachHang?: string;
  nhanVienId?: number;
  tenNhanVien?: string;
  ngayTao: string; // ISO 8601 string
  ngayThanhToan?: string; // ISO 8601 string
  tongTien: number;
  tienGiamGia?: number;
  thanhTien: number;
  ghiChu?: string;
  trangThai: 'CHO_XAC_NHAN' | 'DA_XAC_NHAN' | 'DANG_GIAO_HANG' | 'DA_GIAO_HANG' | 'HUY';
  soLuongSanPham?: number;
  viTriBanHang?: string; // "Tại quầy" hoặc "Online"
  danhSachSanPham?: SanPhamTrongHoaDon[]; // Danh sách sản phẩm trong hóa đơn
  // Thêm các thuộc tính còn thiếu
  soDienThoai?: string;
  email?: string;
  diaChiGiaoHang?: string;
  phuongThucThanhToan?: string;
}

export interface SanPhamTrongHoaDon {
  id?: number;
  tenSanPham: string;
  soLuong: number;
  donGia: number;
  thanhTien: number;
  ghiChu?: string;
  sanPhamId?: number; // ID sản phẩm từ database
  soLuongTon?: number; // Số lượng tồn kho
}

export interface HoaDonPaginatedResponse {
  hoaDonList: HoaDonDTO[];
  currentPage: number;
  totalItems: number;
  totalPages: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface HoaDonFilter {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  search?: string;
  trangThai?: string;
  loai?: string;
  paymentStatus?: string;
  paymentMethod?: string;
}

export interface HoaDonAdvancedFilter extends HoaDonFilter {
  searchTerm?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
}
