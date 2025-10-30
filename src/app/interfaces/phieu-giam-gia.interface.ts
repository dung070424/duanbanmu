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
  isPublic: boolean; // true = công khai, false = cá nhân
  selectedCustomerIds?: number[]; // Danh sách ID khách hàng được chọn (chỉ dùng cho chế độ Cá nhân)
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
  createdAt?: string; // Thêm thuộc tính createdAt
  updatedAt?: string; // Thêm thuộc tính updatedAt
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface KhachHang {
  id: number;                 // Khóa chính
  maKhachHang: string;        // Mã khách hàng
  tenKhachHang: string;       // Tên khách hàng
  email: string;              // Email duy nhất
  soDienThoai: string;        // Số điện thoại
  ngaySinh: string;           // Ngày sinh (LocalDate -> string ISO)
  gioiTinh: boolean;          // true = Nam, false = Nữ
  diemTichLuy: number;        // Điểm tích lũy
  ngayTao: string;            // Ngày tạo tài khoản (LocalDate -> string ISO)
  trangThai: boolean;         // true = hoạt động, false = không hoạt động
  soLanMua: number;           // Số lần mua hàng
  lanMuaGanNhat: string;      // Lần mua gần nhất (LocalDate -> string ISO)
  userId?: number;            // Liên kết với bảng User (nếu có)
}

export interface PhieuGiamGiaCaNhanRequest {
  maPhieu: string;
  tenPhieu: string;
  loaiPhieu: boolean; // true = tiền mặt, false = phần trăm
  giaTriGiam: number;
  ngayBatDau: string;
  ngayHetHan: string;
  soLuotSuDung: number;
  khachHangIds: number[]; // Danh sách ID khách hàng
}

export interface PhieuGiamGiaCaNhanResponse {
  id: number;
  maPhieu: string;
  tenPhieu: string;
  loaiPhieu: boolean;
  loaiPhieuText: string;
  giaTriGiam: number;
  ngayBatDau: string;
  ngayHetHan: string;
  soLuotSuDung: number;
  soLuotDaDung: number;
  trangThai: string;
  khachHangId: number;
  tenKhachHang: string;
  createdAt: string;
  updatedAt: string;
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
