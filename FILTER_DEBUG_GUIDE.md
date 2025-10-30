# 🔍 Hướng Dẫn Kiểm Tra Bộ Lọc Khách Hàng

## 📋 Tổng Quan

Bộ lọc khách hàng trong form "Thêm Phiếu Giảm Giá" đã được triển khai với **client-side filtering** (lọc phía frontend). Điều này có nghĩa là:

- ✅ **API đã hoạt động**: Endpoint `/api/khach-hang/for-voucher` đã trả về đầy đủ dữ liệu khách hàng
- ✅ **Không cần API mới**: Bộ lọc hoạt động trên dữ liệu đã load, không cần gọi API mỗi lần lọc
- ✅ **Hiệu suất tốt**: Lọc nhanh chóng trên client, không tốn bandwidth

## 🛠️ Các Trường Lọc

### 1. **Tìm kiếm (Search)**
- Tìm theo: Mã khách hàng, Tên, Email, Số điện thoại
- Không phân biệt hoa thường

### 2. **Giới tính**
- Tất cả
- Nam (true)
- Nữ (false)

### 3. **Trạng thái**
- Tất cả
- Hoạt động (true)
- Không hoạt động (false)

### 4. **Độ tuổi**
- Tất cả
- Dưới 18 tuổi (0-18)
- 18-25 tuổi
- 26-35 tuổi
- 36-50 tuổi
- Trên 50 tuổi (51-100)

### 5. **Số lần mua**
- Tất cả
- Chưa mua lần nào (0)
- 1-5 lần
- 6-10 lần
- 11-20 lần
- Trên 20 lần (21-9999)

### 6. **Điểm tích lũy**
- Tất cả
- 0-100 điểm
- 101-500 điểm
- 501-1,000 điểm
- Trên 1,000 điểm (1001-9999999)

## 🔧 Cách Kiểm Tra

### Bước 1: Mở Developer Console

1. Vào trang "Thêm Phiếu Giảm Giá"
2. Nhấn `F12` hoặc `Ctrl+Shift+I` để mở Developer Tools
3. Chọn tab **Console**

### Bước 2: Kiểm Tra Log

Khi bạn thay đổi bất kỳ bộ lọc nào, console sẽ hiển thị:

```
=== filterCustomers called ===
Total customers: 50
Filters: {
  searchTerm: "",
  filterGender: true,
  filterStatus: null,
  filterAgeRange: "",
  filterPurchaseRange: "",
  filterPointRange: ""
}
After gender filter (true): 25 (was 50)
Final filtered customers: 25
=== filterCustomers end ===
```

### Bước 3: Xác Định Vấn Đề

#### ❌ **Nếu không thấy log**
- Bộ lọc không được kích hoạt khi thay đổi select
- Kiểm tra: `(change)="filterCustomers()"` có trong HTML không

#### ❌ **Nếu `Total customers: 0`**
- API không trả về dữ liệu hoặc có lỗi
- Kiểm tra tab **Network** → Tìm request `/api/khach-hang/for-voucher`
- Xem response có dữ liệu không

#### ❌ **Nếu filter không giảm số lượng**
- Logic lọc có vấn đề
- Xem chi tiết log để biết filter nào không hoạt động
- Ví dụ: `After gender filter (true): 50 (was 50)` → Không có khách hàng Nam

#### ✅ **Nếu filter hoạt động đúng**
- Số lượng khách hàng giảm dần sau mỗi filter
- UI cập nhật hiển thị đúng kết quả

## 🐛 Troubleshooting

### Vấn đề 1: Không có dữ liệu khách hàng

**Nguyên nhân:**
- Backend chưa chạy
- Database không có dữ liệu khách hàng
- API endpoint sai

**Giải pháp:**
```bash
# Kiểm tra backend đang chạy
curl http://localhost:8080/api/khach-hang/for-voucher

# Nếu cần, thêm dữ liệu mẫu vào database
```

### Vấn đề 2: Bộ lọc không hoạt động

**Nguyên nhân:**
- Angular binding không đúng
- Giá trị null/undefined không được xử lý đúng

**Giải pháp:**
- Đã sửa: Sử dụng `[ngValue]` thay vì `[value]` cho boolean
- Đã thêm: Null checks trong logic lọc

### Vấn đề 3: Một số khách hàng không có ngày sinh

**Nguyên nhân:**
- Database có giá trị null cho `ngay_sinh`

**Hành vi:**
- Khách hàng không có ngày sinh sẽ **bị loại** khi lọc theo độ tuổi
- Console sẽ log: `"Customer has no birth date: [Tên KH]"`

**Giải pháp:**
- Cập nhật database để đảm bảo tất cả khách hàng có ngày sinh
- Hoặc chấp nhận rằng một số khách hàng sẽ không xuất hiện khi lọc theo tuổi

## 📊 Cấu Trúc Dữ Liệu

### KhachHang Interface
```typescript
export interface KhachHang {
  id: number;
  maKhachHang: string;
  tenKhachHang: string;
  email: string;
  soDienThoai: string;
  ngaySinh: string;           // LocalDate ISO string
  gioiTinh: boolean;          // true=Nam, false=Nữ
  diemTichLuy: number;
  ngayTao: string;
  trangThai: boolean;         // true=Hoạt động, false=Không hoạt động
  soLanMua: number;
  lanMuaGanNhat: string;
  userId?: number;
}
```

### API Response Format
```json
{
  "success": true,
  "message": "Lấy danh sách khách hàng thành công",
  "data": [
    {
      "id": 1,
      "maKhachHang": "KH001",
      "tenKhachHang": "Nguyễn Văn A",
      "email": "nguyenvana@example.com",
      "soDienThoai": "0123456789",
      "ngaySinh": "1990-01-15",
      "gioiTinh": true,
      "diemTichLuy": 500,
      "ngayTao": "2023-01-01",
      "trangThai": true,
      "soLanMua": 10,
      "lanMuaGanNhat": "2024-10-20"
    }
  ]
}
```

## ✅ Checklist Kiểm Tra

- [ ] Backend đang chạy trên `http://localhost:8080`
- [ ] Database có dữ liệu khách hàng
- [ ] Mở Developer Console (F12)
- [ ] Vào trang "Thêm Phiếu Giảm Giá"
- [ ] Click nút "Bộ lọc nâng cao" để mở rộng
- [ ] Thay đổi từng bộ lọc một và xem console log
- [ ] Kiểm tra số lượng khách hàng hiển thị có thay đổi không
- [ ] Kiểm tra nút "Xóa bộ lọc" hoạt động đúng không

## 🎯 Kết Luận

- ✅ **Bộ lọc đã được triển khai đầy đủ**
- ✅ **Logic lọc hoạt động trên client-side**
- ✅ **Có console logging để debug**
- ✅ **Không cần tạo API mới**
- ✅ **Không ảnh hưởng đến các bảng khác**

Nếu vẫn gặp vấn đề, vui lòng:
1. Copy toàn bộ console log
2. Screenshot giao diện
3. Mô tả chi tiết hành vi không mong muốn

