import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface AddressFormData {
  tenNguoiNhan: string;
  soDienThoai: string;
  diaChi: string;
  tinhThanh: string;
  quanHuyen: string;
  phuongXa: string;
  macDinh: boolean;
  trangThai: boolean;
}

@Component({
  selector: 'app-address-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="address-form">
      <div class="row">
        <div class="col-md-6">
          <div class="mb-3">
            <label class="form-label">Tên người nhận <span class="text-danger">*</span></label>
            <input 
              type="text" 
              class="form-control" 
              [(ngModel)]="addressData.tenNguoiNhan" 
              name="tenNguoiNhan"
              placeholder="Nhập tên người nhận"
              required>
          </div>
        </div>
        <div class="col-md-6">
          <div class="mb-3">
            <label class="form-label">Số điện thoại <span class="text-danger">*</span></label>
            <input 
              type="tel" 
              class="form-control" 
              [(ngModel)]="addressData.soDienThoai" 
              name="soDienThoai"
              placeholder="Nhập số điện thoại"
              pattern="[0-9]{10,11}"
              required>
          </div>
        </div>
      </div>

      <div class="row">
        <div class="col-md-12">
          <div class="mb-3">
            <label class="form-label">Địa chỉ chi tiết <span class="text-danger">*</span></label>
            <textarea 
              class="form-control" 
              [(ngModel)]="addressData.diaChi" 
              name="diaChi"
              rows="2"
              placeholder="Nhập địa chỉ chi tiết (số nhà, tên đường, tên khu vực)"
              required></textarea>
          </div>
        </div>
      </div>

      <div class="row">
        <div class="col-md-4">
          <div class="mb-3">
            <label class="form-label">Tỉnh/Thành phố <span class="text-danger">*</span></label>
            <select 
              class="form-select" 
              [(ngModel)]="addressData.tinhThanh" 
              name="tinhThanh"
              (change)="onProvinceChange()"
              required>
              <option value="">Chọn tỉnh/thành phố</option>
              <option *ngFor="let province of provinces" [value]="province">
                {{ province }}
              </option>
            </select>
          </div>
        </div>
        <div class="col-md-4">
          <div class="mb-3">
            <label class="form-label">Quận/Huyện <span class="text-danger">*</span></label>
            <select 
              class="form-select" 
              [(ngModel)]="addressData.quanHuyen" 
              name="quanHuyen"
              (change)="onDistrictChange()"
              [disabled]="!addressData.tinhThanh"
              required>
              <option value="">Chọn quận/huyện</option>
              <option *ngFor="let district of filteredDistricts" [value]="district">
                {{ district }}
              </option>
            </select>
          </div>
        </div>
        <div class="col-md-4">
          <div class="mb-3">
            <label class="form-label">Phường/Xã <span class="text-danger">*</span></label>
            <select 
              class="form-select" 
              [(ngModel)]="addressData.phuongXa" 
              name="phuongXa"
              [disabled]="!addressData.quanHuyen"
              required>
              <option value="">Chọn phường/xã</option>
              <option *ngFor="let ward of filteredWards" [value]="ward">
                {{ ward }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <div class="row">
        <div class="col-md-6">
          <div class="mb-3">
            <div class="form-check">
              <input 
                class="form-check-input" 
                type="checkbox" 
                [(ngModel)]="addressData.macDinh" 
                name="macDinh"
                id="macDinh">
              <label class="form-check-label" for="macDinh">
                Đặt làm địa chỉ mặc định
              </label>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="mb-3">
            <div class="form-check">
              <input 
                class="form-check-input" 
                type="checkbox" 
                [(ngModel)]="addressData.trangThai" 
                name="trangThai"
                id="trangThai">
              <label class="form-check-label" for="trangThai">
                Địa chỉ đang hoạt động
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="row" *ngIf="showActions">
        <div class="col-md-12">
          <div class="d-flex gap-2">
            <button 
              type="button" 
              class="btn btn-primary" 
              (click)="onSave()"
              [disabled]="!isFormValid()">
              <i class="fas fa-save"></i> Lưu địa chỉ
            </button>
            <button 
              type="button" 
              class="btn btn-secondary" 
              (click)="onCancel()">
              <i class="fas fa-times"></i> Hủy
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .address-form {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .form-label {
      font-weight: 600;
      color: #495057;
      margin-bottom: 8px;
    }

    .form-control, .form-select {
      border-radius: 6px;
      border: 1px solid #ced4da;
      transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
    }

    .form-control:focus, .form-select:focus {
      border-color: #80bdff;
      box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    }

    // Style cho select quận/huyện - màu xám
    select[name="quanHuyen"] {
      background-color: #e9ecef;
      border-color: #adb5bd;
      color: #495057;
    }

    select[name="quanHuyen"]:focus {
      background-color: #e9ecef;
      border-color: #adb5bd;
      color: #495057;
      box-shadow: 0 0 0 0.2rem rgba(173, 181, 189, 0.25);
    }

    .form-check-input:checked {
      background-color: #0d6efd;
      border-color: #0d6efd;
    }

    .text-danger {
      color: #dc3545 !important;
    }

    .btn {
      border-radius: 6px;
      font-weight: 500;
    }

    .btn-primary {
      background-color: #0d6efd;
      border-color: #0d6efd;
    }

    .btn-primary:hover {
      background-color: #0b5ed7;
      border-color: #0a58ca;
    }

    .btn-secondary {
      background-color: #6c757d;
      border-color: #6c757d;
    }

    .btn-secondary:hover {
      background-color: #5c636a;
      border-color: #565e64;
    }

    .d-flex.gap-2 {
      gap: 0.5rem;
    }

    .form-control:disabled, .form-select:disabled {
      background-color: #e9ecef;
      opacity: 1;
    }
  `]
})
export class AddressFormComponent implements OnInit {
  @Input() addressData: AddressFormData = {
    tenNguoiNhan: '',
    soDienThoai: '',
    diaChi: '',
    tinhThanh: '',
    quanHuyen: '',
    phuongXa: '',
    macDinh: false,
    trangThai: true
  };

  @Input() showActions: boolean = true;
  @Output() save = new EventEmitter<AddressFormData>();
  @Output() cancel = new EventEmitter<void>();

  provinces: string[] = [
    'Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ',
    'An Giang', 'Bà Rịa - Vũng Tàu', 'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu',
    'Bắc Ninh', 'Bến Tre', 'Bình Định', 'Bình Dương', 'Bình Phước',
    'Bình Thuận', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Đắk Nông',
    'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Giang',
    'Hà Nam', 'Hà Tĩnh', 'Hải Dương', 'Hậu Giang', 'Hòa Bình',
    'Hưng Yên', 'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu',
    'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định',
    'Nghệ An', 'Ninh Bình', 'Ninh Thuận', 'Phú Thọ', 'Quảng Bình',
    'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 'Sóc Trăng',
    'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên', 'Thanh Hóa',
    'Thừa Thiên Huế', 'Tiền Giang', 'Trà Vinh', 'Tuyên Quang', 'Vĩnh Long',
    'Vĩnh Phúc', 'Yên Bái'
  ];

  districts: { [key: string]: string[] } = {
    'Hà Nội': [
      'Quận Ba Đình', 'Quận Hoàn Kiếm', 'Quận Tây Hồ', 'Quận Long Biên',
      'Quận Cầu Giấy', 'Quận Đống Đa', 'Quận Hai Bà Trưng', 'Quận Hoàng Mai',
      'Quận Thanh Xuân', 'Huyện Sóc Sơn', 'Huyện Đông Anh', 'Huyện Gia Lâm',
      'Quận Nam Từ Liêm', 'Huyện Thanh Trì', 'Quận Bắc Từ Liêm', 'Huyện Mê Linh',
      'Quận Hà Đông', 'Thị xã Sơn Tây', 'Huyện Ba Vì', 'Huyện Phúc Thọ',
      'Huyện Đan Phượng', 'Huyện Hoài Đức', 'Huyện Quốc Oai', 'Huyện Thạch Thất',
      'Huyện Chương Mỹ', 'Huyện Thanh Oai', 'Huyện Thường Tín', 'Huyện Phú Xuyên',
      'Huyện Ứng Hòa', 'Huyện Mỹ Đức'
    ],
    'TP. Hồ Chí Minh': [
      'Quận 1', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 8',
      'Quận 10', 'Quận 11', 'Quận 12', 'Quận Bình Thạnh', 'Quận Bình Tân',
      'Quận Gò Vấp', 'Quận Phú Nhuận', 'Quận Tân Bình', 'Quận Tân Phú',
      'Quận Thủ Đức', 'Huyện Bình Chánh', 'Huyện Cần Giờ', 'Huyện Củ Chi',
      'Huyện Hóc Môn', 'Huyện Nhà Bè'
    ],
    'Đà Nẵng': [
      'Quận Hải Châu', 'Quận Thanh Khê', 'Quận Sơn Trà', 'Quận Ngũ Hành Sơn',
      'Quận Liên Chiểu', 'Huyện Hòa Vang', 'Huyện Hoàng Sa'
    ]
  };

  wards: { [key: string]: string[] } = {
    'Quận 1': [
      'Phường Tân Định', 'Phường Đa Kao', 'Phường Bến Nghé', 'Phường Bến Thành',
      'Phường Nguyễn Thái Bình', 'Phường Phạm Ngũ Lão', 'Phường Cầu Ông Lãnh',
      'Phường Cô Giang', 'Phường Nguyễn Cư Trinh', 'Phường Cầu Kho'
    ],
    'Quận 3': [
      'Phường Võ Thị Sáu', 'Phường Phạm Ngũ Lão', 'Phường Cầu Ông Lãnh',
      'Phường Nguyễn Thái Bình', 'Phường Tân Định', 'Phường Đa Kao',
      'Phường Bến Nghé', 'Phường Bến Thành', 'Phường Cô Giang', 'Phường Cầu Kho'
    ],
    'Quận Ba Đình': [
      'Phường Phúc Xá', 'Phường Trúc Bạch', 'Phường Vĩnh Phúc', 'Phường Cống Vị',
      'Phường Liễu Giai', 'Phường Nguyễn Trung Trực', 'Phường Quán Thánh',
      'Phường Ngọc Hà', 'Phường Điện Biên', 'Phường Đội Cấn', 'Phường Ngọc Khánh',
      'Phường Kim Mã', 'Phường Giảng Võ', 'Phường Thành Công'
    ]
  };

  filteredDistricts: string[] = [];
  filteredWards: string[] = [];

  ngOnInit() {
    this.initializeForm();
  }

  initializeForm() {
    if (this.addressData.tinhThanh) {
      this.onProvinceChange();
    }
    if (this.addressData.quanHuyen) {
      this.onDistrictChange();
    }
  }

  onProvinceChange() {
    this.filteredDistricts = this.districts[this.addressData.tinhThanh] || [];
    this.addressData.quanHuyen = '';
    this.addressData.phuongXa = '';
    this.filteredWards = [];
  }

  onDistrictChange() {
    this.filteredWards = this.wards[this.addressData.quanHuyen] || [];
    this.addressData.phuongXa = '';
  }

  isFormValid(): boolean {
    return !!(
      this.addressData.tenNguoiNhan &&
      this.addressData.soDienThoai &&
      this.addressData.diaChi &&
      this.addressData.tinhThanh &&
      this.addressData.quanHuyen &&
      this.addressData.phuongXa
    );
  }

  onSave() {
    if (this.isFormValid()) {
      this.save.emit(this.addressData);
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
