export interface ChatMessage {
  id?: number;
  conversationId?: number;
  loaiNguoiGui: 'KHACH_HANG' | 'NHAN_VIEN' | 'CHATBOT';
  khachHangId?: number;
  khachHangTen?: string;
  nhanVienId?: number;
  nhanVienTen?: string;
  noiDung: string;
  thoiGianGui: string;
  tuDongTraLoi?: boolean;
  daDoc?: boolean;
}

export interface Conversation {
  id?: number;
  khachHangId?: number;
  khachHangTen?: string;
  khachHangEmail?: string;
  nhanVienId?: number;
  nhanVienTen?: string;
  ngayTao: string;
  ngayCapNhat?: string;
  trangThai: 'DANG_CHO' | 'DANG_XU_LY' | 'DA_HOAN_THANH' | 'DA_DONG';
  dangChoPhanHoi?: boolean;
  tuDongTraLoi?: boolean;
  messages?: ChatMessage[];
  soTinNhanChuaDoc?: number;
}

export interface SendMessageRequest {
  conversationId?: number;
  noiDung: string;
  khachHangId?: number;
  nhanVienId?: number;
}


