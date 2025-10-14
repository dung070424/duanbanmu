export interface PhieuGiamGia {
  id?: number;
  maPhieu: string;
  tenPhieuGiamGia: string;
  loaiPhieuGiamGia: boolean; // false = phần trăm, true = tiền mặt
  giaTriGiam: number;
  giaTriToiThieu: number;
  soTienToiDa: number;
  hoaDonToiThieu: number;
  soLuongDung: number;
  ngayBatDau: string;
  ngayKetThuc: string;
  trangThai: boolean;
}

export interface PhieuGiamGiaRequest {
  maPhieu: string;
  tenPhieuGiamGia: string;
  loaiPhieuGiamGia: boolean;
  giaTriGiam: number;
  giaTriToiThieu: number;
  soTienToiDa: number;
  hoaDonToiThieu: number;
  soLuongDung: number;
  ngayBatDau: string;
  ngayKetThuc: string;
  trangThai: boolean;
}

export interface PhieuGiamGiaResponse {
  id: number;
  maPhieu: string;
  tenPhieuGiamGia: string;
  loaiPhieuGiamGia: boolean;
  loaiPhieuGiamGiaText: string;
  giaTriGiam: number;
  giaTriToiThieu: number;
  soTienToiDa: number;
  hoaDonToiThieu: number;
  soLuongDung: number;
  ngayBatDau: string;
  ngayKetThuc: string;
  trangThai: boolean;
  trangThaiText: string;
  isActive: boolean;
  isExpired: boolean;
  isNotStarted: boolean;
  isUpdating?: boolean; // Thêm property để hỗ trợ loading state
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface KhachHang {
  id: number;                 // Khóa chính
  tenKhachHang: string;       // Tên khách hàng
  email: string;              // Email duy nhất
  soDienThoai: string;        // Số điện thoại
  ngaySinh: string;           // Ngày sinh (LocalDate -> string ISO)
  gioiTinh: boolean;          // true = Nam, false = Nữ
  diemTichLuy: number;        // Điểm tích lũy
  ngayTao: string;            // Ngày tạo tài khoản (LocalDate -> string ISO)
  trangThai: boolean;         // true = hoạt động, false = không hoạt động
  userId?: number;            // Liên kết với bảng User (nếu có)
}

export interface PhieuGiamGiaCaNhan {
  id: number;                 // Khóa chính
  khachHangId: number;        // ID khách hàng
  phieuGiamGiaId: number;     // ID phiếu giảm giá
  daSuDung: boolean;          // Đã sử dụng hay chưa
  ngayHetHan: string;         // Ngày hết hạn
  ngaySuDung?: string;        // Ngày sử dụng (nếu có)
  soLanDaDung: number;        // Số lần đã dùng
  trangThai: string;          // Trạng thái text
  // Thông tin liên quan
  tenKhachHang?: string;      // Tên khách hàng
  tenPhieuGiamGia?: string;   // Tên phiếu giảm giá
  maPhieuGiamGia?: string;    // Mã phiếu giảm giá
  giaTriGiam?: number;        // Giá trị giảm
  loaiPhieuGiamGia?: boolean; // Loại phiếu giảm giá (true = tiền mặt, false = phần trăm)
  loaiPhieuGiamGiaText?: string; // Text loại phiếu giảm giá
}


export interface KhachHangResponse {
  success: boolean;
  message: string;
  data: KhachHang[];
}
