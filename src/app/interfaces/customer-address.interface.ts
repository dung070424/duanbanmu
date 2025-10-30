export interface CustomerAddress {
  id?: number;
  khachHangId: number;
  tenNguoiNhan: string;
  soDienThoai: string;
  diaChi: string;
  tinhThanh: string;
  quanHuyen: string;
  phuongXa: string;
  maTinh?: string;
  maQuan?: string;
  maXa?: string;
  macDinh: boolean;
  trangThai: boolean;
}

export interface CustomerAddressCreateRequest {
  khachHangId: number;
  tenNguoiNhan: string;
  soDienThoai: string;
  diaChi: string;
  tinhThanh: string;
  quanHuyen: string;
  phuongXa: string;
  maTinh?: string;
  maQuan?: string;
  maXa?: string;
  macDinh?: boolean;
  trangThai?: boolean;
}

export interface CustomerAddressUpdateRequest {
  tenNguoiNhan?: string;
  soDienThoai?: string;
  diaChi?: string;
  tinhThanh?: string;
  quanHuyen?: string;
  phuongXa?: string;
  maTinh?: string;
  maQuan?: string;
  maXa?: string;
  macDinh?: boolean;
  trangThai?: boolean;
}
