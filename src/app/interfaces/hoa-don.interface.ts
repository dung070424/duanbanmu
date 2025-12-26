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
  giamGiaPhanTram?: number; // Thêm field giảm giá phần trăm
  thanhTien: number;
  ghiChu?: string;
  trangThai: 'CHO_XAC_NHAN' | 'DA_XAC_NHAN' | 'DANG_GIAO_HANG' | 'DA_GIAO_HANG' | 'HUY' | 'DA_HUY'; // DA_HUY là fallback từ backend cũ
  soLuongSanPham?: number;
  viTriBanHang?: string; // "Tại quầy" hoặc "Online"
  danhSachSanPham?: SanPhamTrongHoaDon[]; // Danh sách sản phẩm trong hóa đơn (frontend only)
  danhSachChiTiet?: HoaDonChiTietDTO[]; // Danh sách chi tiết sản phẩm (backend format)
  // Thêm các thuộc tính còn thiếu
  soDienThoai?: string;
  email?: string;
  diaChiGiaoHang?: string;
  diaChiKhachHang?: string; // Địa chỉ khách hàng (từ ThongTinDonHang hoặc DiaChiKhachHang)
  phuongThucThanhToan?: string;
  // Địa chỉ khách hàng
  tinhThanh?: string;
  quanHuyen?: string;
  phuongXa?: string;
  diaChiChiTiet?: string;
  // Thông tin vận chuyển
  ngayDuKienGiao?: string;
  khoiLuong?: number;
  chieuDai?: number;
  chieuRong?: number;
  chieuCao?: number;
  phiGiaoHang?: number;
  nguoiChiuPhi?: string; // 'nguoi_gui' hoặc 'nguoi_nhan'
}

export interface HoaDonChiTietDTO {
  id?: number;
  chiTietSanPhamId: number; // Required: ID của chi tiết sản phẩm
  tenSanPham?: string;
  maSanPham?: string;
  mauSac?: string;
  kichThuoc?: string;
  nhaSanXuat?: string;
  soLuong: number;
  donGia: number;
  giamGia?: number;
  thanhTien: number;
  anhSanPham?: string;
}

export interface SanPhamTrongHoaDon {
  id?: number;
  chiTietSanPhamId?: number;
  tenSanPham: string;
  soLuong: number;
  donGia: number;
  thanhTien: number;
  giamGia?: number; // Giảm giá
  ghiChu?: string;
  sanPhamId?: number; // ID sản phẩm từ database
  soLuongTon?: number; // Số lượng tồn kho
  maSanPham?: string; // Mã sản phẩm
  danhMuc?: string; // Danh mục sản phẩm
  thuongHieu?: string; // Thương hiệu sản phẩm
  mauSac?: string; // Màu sắc
  kichThuoc?: string; // Kích thước
  anhSanPham?: string; // Hình ảnh sản phẩm
  nhaSanXuat?: string; // Nhà sản xuất
  // Các property mở rộng để hỗ trợ mapping từ localStorage
  code?: string; // Mã sản phẩm (alias của maSanPham)
  moTa?: string; // Mô tả sản phẩm
  description?: string; // Mô tả sản phẩm (alias)
  unitPrice?: number; // Đơn giá (alias của donGia)
  quantity?: number; // Số lượng (alias của soLuong)
  total?: number; // Tổng tiền (alias của thanhTien)
  imageUrl?: string; // URL hình ảnh (alias của anhSanPham)
  name?: string; // Tên sản phẩm (alias của tenSanPham)
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

export interface HoaDonActivity {
  id: number;
  hoaDonId?: number;
  maHoaDon?: string;
  action: string;
  description?: string;
  performedBy?: string;
  performedByName?: string;
  performedAt: string;
  oldData?: string;
  newData?: string;
  ipAddress?: string;
  userAgent?: string;
}
