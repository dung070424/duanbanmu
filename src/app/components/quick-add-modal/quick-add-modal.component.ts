import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-quick-add-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quick-add-modal.component.html',
  styleUrls: ['./quick-add-modal.component.scss'],
})
export class QuickAddModalComponent implements OnInit, OnChanges {
  @Input() type: string = ''; // e.g., 'loaiMuBaoHiem', 'nhaSanXuat'
  @Input() show: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();

  form: any = {};
  modalTitle: string = '';
  fields: {
    name: string;
    label: string;
    type: string;
    required?: boolean;
    options?: { value: any; label: string }[];
  }[] = [];

  // Track which fields have been touched by user
  touchedFields: Set<string> = new Set();

  ngOnInit() {
    this.initializeFormAndFields();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['type'] || (changes['show'] && this.show)) {
      this.initializeFormAndFields();
    }
  }

  initializeFormAndFields() {
    this.form = {};
    this.fields = [];
    this.resetTouchedFields();

    switch (this.type) {
      case 'loaiMuBaoHiem':
        this.modalTitle = 'Thêm mới Loại mũ bảo hiểm';
        this.fields = [
          { name: 'tenLoai', label: 'Tên loại mũ bảo hiểm', type: 'text', required: true },
          { name: 'moTa', label: 'Mô tả', type: 'textarea' },
          {
            name: 'trangThai',
            label: 'Trạng thái',
            type: 'select',
            options: [
              { value: true, label: 'Đang dùng' },
              { value: false, label: 'Không dùng nữa' },
            ],
          },
        ];
        this.form.trangThai = true; // Default status
        break;
      case 'nhaSanXuat':
        this.modalTitle = 'Thêm mới Nhà sản xuất';
        this.fields = [
          { name: 'tenNhaSanXuat', label: 'Tên nhà sản xuất', type: 'text', required: true },
          { name: 'quocGia', label: 'Quốc gia', type: 'text', required: true },
          { name: 'moTa', label: 'Mô tả', type: 'textarea' },
          {
            name: 'trangThai',
            label: 'Trạng thái',
            type: 'select',
            options: [
              { value: true, label: 'Đang dùng' },
              { value: false, label: 'Không dùng nữa' },
            ],
          },
        ];
        this.form.trangThai = true;
        break;
      case 'chatLieuVo':
        this.modalTitle = 'Thêm mới Chất liệu vỏ';
        this.fields = [
          { name: 'tenChatLieu', label: 'Tên chất liệu vỏ', type: 'text', required: true },
          { name: 'moTa', label: 'Mô tả', type: 'textarea' },
          {
            name: 'trangThai',
            label: 'Trạng thái',
            type: 'select',
            options: [
              { value: true, label: 'Đang dùng' },
              { value: false, label: 'Không dùng nữa' },
            ],
          },
        ];
        this.form.trangThai = true;
        break;
      case 'trongLuong':
        this.modalTitle = 'Thêm mới Trọng lượng';
        this.fields = [
          {
            name: 'giaTriTrongLuong',
            label: 'Giá trị trọng lượng (gram)',
            type: 'number',
            required: true,
          },
          { name: 'donVi', label: 'Đơn vị', type: 'text', required: true },
          { name: 'moTa', label: 'Mô tả', type: 'textarea' },
          {
            name: 'trangThai',
            label: 'Trạng thái',
            type: 'select',
            options: [
              { value: true, label: 'Đang dùng' },
              { value: false, label: 'Không dùng nữa' },
            ],
          },
        ];
        this.form.trangThai = true;
        break;
      case 'xuatXu':
        this.modalTitle = 'Thêm mới Xuất xứ';
        this.fields = [
          { name: 'tenXuatXu', label: 'Tên xuất xứ', type: 'text', required: true },
          { name: 'moTa', label: 'Mô tả', type: 'textarea' },
          {
            name: 'trangThai',
            label: 'Trạng thái',
            type: 'select',
            options: [
              { value: true, label: 'Đang dùng' },
              { value: false, label: 'Không dùng nữa' },
            ],
          },
        ];
        this.form.trangThai = true;
        break;
      case 'kieuDangMu':
        this.modalTitle = 'Thêm mới Kiểu dáng mũ';
        this.fields = [
          { name: 'tenKieuDang', label: 'Tên kiểu dáng mũ', type: 'text', required: true },
          { name: 'moTa', label: 'Mô tả', type: 'textarea' },
          {
            name: 'trangThai',
            label: 'Trạng thái',
            type: 'select',
            options: [
              { value: true, label: 'Đang dùng' },
              { value: false, label: 'Không dùng nữa' },
            ],
          },
        ];
        this.form.trangThai = true;
        break;
      case 'congNgheAnToan':
        this.modalTitle = 'Thêm mới Công nghệ an toàn';
        this.fields = [
          { name: 'tenCongNghe', label: 'Tên công nghệ an toàn', type: 'text', required: true },
          { name: 'moTa', label: 'Mô tả', type: 'textarea' },
          {
            name: 'trangThai',
            label: 'Trạng thái',
            type: 'select',
            options: [
              { value: true, label: 'Đang dùng' },
              { value: false, label: 'Không dùng nữa' },
            ],
          },
        ];
        this.form.trangThai = true;
        break;
      case 'mauSac':
        this.modalTitle = 'Thêm mới Màu sắc';
        this.fields = [
          { name: 'tenMau', label: 'Tên màu sắc', type: 'text', required: true },
          { name: 'maMau', label: 'Mã màu (hex)', type: 'text', required: true },
          { name: 'moTa', label: 'Mô tả', type: 'textarea' },
          {
            name: 'trangThai',
            label: 'Trạng thái',
            type: 'select',
            options: [
              { value: true, label: 'Đang dùng' },
              { value: false, label: 'Không dùng nữa' },
            ],
          },
        ];
        this.form.trangThai = true;
        break;
      case 'kichThuoc':
        this.modalTitle = 'Thêm mới Kích thước';
        this.fields = [
          { name: 'tenKichThuoc', label: 'Tên kích thước', type: 'text', required: true },
          { name: 'moTa', label: 'Mô tả', type: 'textarea' },
          {
            name: 'trangThai',
            label: 'Trạng thái',
            type: 'select',
            options: [
              { value: true, label: 'Đang dùng' },
              { value: false, label: 'Không dùng nữa' },
            ],
          },
        ];
        this.form.trangThai = true;
        break;
      default:
        this.modalTitle = 'Thêm mới';
        break;
    }
  }

  onSave() {
    // Mark all fields as touched when user tries to submit
    this.fields.forEach((field) => this.touchedFields.add(field.name));

    // Validation chi tiết cho từng loại
    if (this.type === 'mauSac') {
      const validationErrors: string[] = [];

      // Kiểm tra tên màu sắc
      if (!this.form.tenMau?.trim()) {
        validationErrors.push('Tên màu sắc không được để trống');
      } else if (this.form.tenMau.trim().length < 2) {
        validationErrors.push('Tên màu sắc phải có ít nhất 2 ký tự');
      } else if (this.form.tenMau.trim().length > 100) {
        validationErrors.push('Tên màu sắc không được vượt quá 100 ký tự');
      }

      // Kiểm tra mã màu (bắt buộc)
      if (!this.form.maMau?.trim()) {
        validationErrors.push('Mã màu không được để trống');
      } else {
        const colorCode = this.form.maMau.trim();
        // Kiểm tra định dạng hex color
        if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colorCode)) {
          validationErrors.push('Mã màu phải có định dạng hex hợp lệ (ví dụ: #FF0000 hoặc #F00)');
        }
      }

      // Kiểm tra mô tả (nếu có)
      if (this.form.moTa?.trim() && this.form.moTa.trim().length > 500) {
        validationErrors.push('Mô tả không được vượt quá 500 ký tự');
      }

      // Hiển thị lỗi nếu có
      if (validationErrors.length > 0) {
        // Không hiển thị alert, chỉ mark fields as touched để hiển thị validation errors
        return;
      }
    } else if (this.type === 'nhaSanXuat') {
      const validationErrors: string[] = [];

      // Kiểm tra tên nhà sản xuất
      if (!this.form.tenNhaSanXuat?.trim()) {
        validationErrors.push('Tên nhà sản xuất không được để trống');
      } else if (this.form.tenNhaSanXuat.trim().length < 2) {
        validationErrors.push('Tên nhà sản xuất phải có ít nhất 2 ký tự');
      } else if (this.form.tenNhaSanXuat.trim().length > 100) {
        validationErrors.push('Tên nhà sản xuất không được vượt quá 100 ký tự');
      }

      // Kiểm tra quốc gia (bắt buộc)
      if (!this.form.quocGia?.trim()) {
        validationErrors.push('Quốc gia không được để trống');
      } else if (this.form.quocGia.trim().length < 2) {
        validationErrors.push('Tên quốc gia phải có ít nhất 2 ký tự');
      } else if (this.form.quocGia.trim().length > 50) {
        validationErrors.push('Tên quốc gia không được vượt quá 50 ký tự');
      }

      // Kiểm tra mô tả (nếu có)
      if (this.form.moTa?.trim() && this.form.moTa.trim().length > 500) {
        validationErrors.push('Mô tả không được vượt quá 500 ký tự');
      }

      // Hiển thị lỗi nếu có
      if (validationErrors.length > 0) {
        // Không hiển thị alert, chỉ mark fields as touched để hiển thị validation errors
        return;
      }
    } else if (this.type === 'chatLieuVo') {
      const validationErrors: string[] = [];

      // Kiểm tra tên chất liệu vỏ
      if (!this.form.tenChatLieu?.trim()) {
        validationErrors.push('Tên chất liệu vỏ không được để trống');
      } else if (this.form.tenChatLieu.trim().length < 2) {
        validationErrors.push('Tên chất liệu vỏ phải có ít nhất 2 ký tự');
      } else if (this.form.tenChatLieu.trim().length > 100) {
        validationErrors.push('Tên chất liệu vỏ không được vượt quá 100 ký tự');
      }

      // Kiểm tra mô tả (nếu có)
      if (this.form.moTa?.trim() && this.form.moTa.trim().length > 500) {
        validationErrors.push('Mô tả không được vượt quá 500 ký tự');
      }

      // Hiển thị lỗi nếu có
      if (validationErrors.length > 0) {
        // Không hiển thị alert, chỉ mark fields as touched để hiển thị validation errors
        return;
      }
    } else if (this.type === 'trongLuong') {
      const validationErrors: string[] = [];

      // Kiểm tra giá trị trọng lượng
      if (!this.form.giaTriTrongLuong || this.form.giaTriTrongLuong <= 0) {
        validationErrors.push('Giá trị trọng lượng phải lớn hơn 0');
      } else if (this.form.giaTriTrongLuong > 10000) {
        validationErrors.push('Giá trị trọng lượng không được vượt quá 10000 gram');
      }

      // Kiểm tra đơn vị (bắt buộc)
      if (!this.form.donVi?.trim()) {
        validationErrors.push('Đơn vị không được để trống');
      } else if (this.form.donVi.trim().length < 1) {
        validationErrors.push('Đơn vị phải có ít nhất 1 ký tự');
      } else if (this.form.donVi.trim().length > 20) {
        validationErrors.push('Đơn vị không được vượt quá 20 ký tự');
      }

      // Kiểm tra mô tả (nếu có)
      if (this.form.moTa?.trim() && this.form.moTa.trim().length > 500) {
        validationErrors.push('Mô tả không được vượt quá 500 ký tự');
      }

      // Hiển thị lỗi nếu có
      if (validationErrors.length > 0) {
        // Không hiển thị alert, chỉ mark fields as touched để hiển thị validation errors
        return;
      }
    } else if (this.type === 'xuatXu') {
      const validationErrors: string[] = [];

      // Kiểm tra tên xuất xứ
      if (!this.form.tenXuatXu?.trim()) {
        validationErrors.push('Tên xuất xứ không được để trống');
      } else if (this.form.tenXuatXu.trim().length < 2) {
        validationErrors.push('Tên xuất xứ phải có ít nhất 2 ký tự');
      } else if (this.form.tenXuatXu.trim().length > 100) {
        validationErrors.push('Tên xuất xứ không được vượt quá 100 ký tự');
      }

      // Kiểm tra mô tả (nếu có)
      if (this.form.moTa?.trim() && this.form.moTa.trim().length > 500) {
        validationErrors.push('Mô tả không được vượt quá 500 ký tự');
      }

      // Hiển thị lỗi nếu có
      if (validationErrors.length > 0) {
        // Không hiển thị alert, chỉ mark fields as touched để hiển thị validation errors
        return;
      }
    } else if (this.type === 'kieuDangMu') {
      const validationErrors: string[] = [];

      // Kiểm tra tên kiểu dáng mũ
      if (!this.form.tenKieuDang?.trim()) {
        validationErrors.push('Tên kiểu dáng mũ không được để trống');
      } else if (this.form.tenKieuDang.trim().length < 2) {
        validationErrors.push('Tên kiểu dáng mũ phải có ít nhất 2 ký tự');
      } else if (this.form.tenKieuDang.trim().length > 100) {
        validationErrors.push('Tên kiểu dáng mũ không được vượt quá 100 ký tự');
      }

      // Kiểm tra mô tả (nếu có)
      if (this.form.moTa?.trim() && this.form.moTa.trim().length > 500) {
        validationErrors.push('Mô tả không được vượt quá 500 ký tự');
      }

      // Hiển thị lỗi nếu có
      if (validationErrors.length > 0) {
        // Không hiển thị alert, chỉ mark fields as touched để hiển thị validation errors
        return;
      }
    } else {
      // Validation cơ bản cho các loại khác
      for (const field of this.fields) {
        if (
          field.required &&
          (!this.form[field.name] || String(this.form[field.name]).trim() === '')
        ) {
          console.error(`Vui lòng nhập ${field.label.toLowerCase()}`);
          return;
        }
      }
    }

    this.save.emit({ type: this.type, data: this.form });
  }

  closeModal() {
    this.close.emit();
  }

  // Method to mark field as touched
  markFieldTouched(field: string) {
    this.touchedFields.add(field);
  }

  // Method to check if field has error (only if touched)
  hasFieldError(field: string): boolean {
    if (!this.touchedFields.has(field)) {
      return false;
    }

    if (this.type === 'mauSac') {
      switch (field) {
        case 'tenMau':
          return (
            !this.form.tenMau?.trim() ||
            this.form.tenMau.trim().length < 2 ||
            this.form.tenMau.trim().length > 100
          );
        case 'maMau':
          if (!this.form.maMau?.trim()) return true; // Required field
          const colorCode = this.form.maMau.trim();
          return !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colorCode);
        case 'moTa':
          return this.form.moTa?.trim() && this.form.moTa.trim().length > 500;
        default:
          return false;
      }
    } else if (this.type === 'nhaSanXuat') {
      switch (field) {
        case 'tenNhaSanXuat':
          return (
            !this.form.tenNhaSanXuat?.trim() ||
            this.form.tenNhaSanXuat.trim().length < 2 ||
            this.form.tenNhaSanXuat.trim().length > 100
          );
        case 'quocGia':
          return (
            !this.form.quocGia?.trim() ||
            this.form.quocGia.trim().length < 2 ||
            this.form.quocGia.trim().length > 50
          );
        case 'moTa':
          return this.form.moTa?.trim() && this.form.moTa.trim().length > 500;
        default:
          return false;
      }
    } else if (this.type === 'chatLieuVo') {
      switch (field) {
        case 'tenChatLieu':
          return (
            !this.form.tenChatLieu?.trim() ||
            this.form.tenChatLieu.trim().length < 2 ||
            this.form.tenChatLieu.trim().length > 100
          );
        case 'moTa':
          return this.form.moTa?.trim() && this.form.moTa.trim().length > 500;
        default:
          return false;
      }
    } else if (this.type === 'trongLuong') {
      switch (field) {
        case 'giaTriTrongLuong':
          return (
            !this.form.giaTriTrongLuong ||
            this.form.giaTriTrongLuong <= 0 ||
            this.form.giaTriTrongLuong > 10000
          );
        case 'donVi':
          return (
            !this.form.donVi?.trim() ||
            this.form.donVi.trim().length < 1 ||
            this.form.donVi.trim().length > 20
          );
        case 'moTa':
          return this.form.moTa?.trim() && this.form.moTa.trim().length > 500;
        default:
          return false;
      }
    } else if (this.type === 'xuatXu') {
      switch (field) {
        case 'tenXuatXu':
          return (
            !this.form.tenXuatXu?.trim() ||
            this.form.tenXuatXu.trim().length < 2 ||
            this.form.tenXuatXu.trim().length > 100
          );
        case 'moTa':
          return this.form.moTa?.trim() && this.form.moTa.trim().length > 500;
        default:
          return false;
      }
    } else if (this.type === 'kieuDangMu') {
      switch (field) {
        case 'tenKieuDang':
          return (
            !this.form.tenKieuDang?.trim() ||
            this.form.tenKieuDang.trim().length < 2 ||
            this.form.tenKieuDang.trim().length > 100
          );
        case 'moTa':
          return this.form.moTa?.trim() && this.form.moTa.trim().length > 500;
        default:
          return false;
      }
    }

    // Default validation for other types
    const fieldConfig = this.fields.find((f) => f.name === field);
    if (fieldConfig?.required) {
      return !this.form[field] || String(this.form[field]).trim() === '';
    }
    return false;
  }

  // Method to get error message for field
  getFieldError(field: string): string | null {
    if (!this.hasFieldError(field)) {
      return null;
    }

    if (this.type === 'mauSac') {
      switch (field) {
        case 'tenMau':
          if (!this.form.tenMau?.trim()) return 'Tên màu sắc không được để trống';
          if (this.form.tenMau.trim().length < 2) return 'Tên màu sắc phải có ít nhất 2 ký tự';
          if (this.form.tenMau.trim().length > 100)
            return 'Tên màu sắc không được vượt quá 100 ký tự';
          break;
        case 'maMau':
          if (!this.form.maMau?.trim()) return 'Mã màu không được để trống';
          return 'Mã màu phải có định dạng hex hợp lệ (ví dụ: #FF0000 hoặc #F00)';
        case 'moTa':
          return 'Mô tả không được vượt quá 500 ký tự';
      }
    } else if (this.type === 'nhaSanXuat') {
      switch (field) {
        case 'tenNhaSanXuat':
          if (!this.form.tenNhaSanXuat?.trim()) return 'Tên nhà sản xuất không được để trống';
          if (this.form.tenNhaSanXuat.trim().length < 2)
            return 'Tên nhà sản xuất phải có ít nhất 2 ký tự';
          if (this.form.tenNhaSanXuat.trim().length > 100)
            return 'Tên nhà sản xuất không được vượt quá 100 ký tự';
          break;
        case 'quocGia':
          if (!this.form.quocGia?.trim()) return 'Quốc gia không được để trống';
          if (this.form.quocGia.trim().length < 2) return 'Tên quốc gia phải có ít nhất 2 ký tự';
          return 'Tên quốc gia không được vượt quá 50 ký tự';
        case 'moTa':
          return 'Mô tả không được vượt quá 500 ký tự';
      }
    } else if (this.type === 'chatLieuVo') {
      switch (field) {
        case 'tenChatLieu':
          if (!this.form.tenChatLieu?.trim()) return 'Tên chất liệu vỏ không được để trống';
          if (this.form.tenChatLieu.trim().length < 2)
            return 'Tên chất liệu vỏ phải có ít nhất 2 ký tự';
          if (this.form.tenChatLieu.trim().length > 100)
            return 'Tên chất liệu vỏ không được vượt quá 100 ký tự';
          break;
        case 'moTa':
          return 'Mô tả không được vượt quá 500 ký tự';
      }
    } else if (this.type === 'trongLuong') {
      switch (field) {
        case 'giaTriTrongLuong':
          if (!this.form.giaTriTrongLuong || this.form.giaTriTrongLuong <= 0)
            return 'Giá trị trọng lượng phải lớn hơn 0';
          if (this.form.giaTriTrongLuong > 10000)
            return 'Giá trị trọng lượng không được vượt quá 10000 gram';
          break;
        case 'donVi':
          if (!this.form.donVi?.trim()) return 'Đơn vị không được để trống';
          if (this.form.donVi.trim().length < 1) return 'Đơn vị phải có ít nhất 1 ký tự';
          if (this.form.donVi.trim().length > 20) return 'Đơn vị không được vượt quá 20 ký tự';
          break;
        case 'moTa':
          return 'Mô tả không được vượt quá 500 ký tự';
      }
    } else if (this.type === 'xuatXu') {
      switch (field) {
        case 'tenXuatXu':
          if (!this.form.tenXuatXu?.trim()) return 'Tên xuất xứ không được để trống';
          if (this.form.tenXuatXu.trim().length < 2) return 'Tên xuất xứ phải có ít nhất 2 ký tự';
          if (this.form.tenXuatXu.trim().length > 100)
            return 'Tên xuất xứ không được vượt quá 100 ký tự';
          break;
        case 'moTa':
          return 'Mô tả không được vượt quá 500 ký tự';
      }
    } else if (this.type === 'kieuDangMu') {
      switch (field) {
        case 'tenKieuDang':
          if (!this.form.tenKieuDang?.trim()) return 'Tên kiểu dáng mũ không được để trống';
          if (this.form.tenKieuDang.trim().length < 2)
            return 'Tên kiểu dáng mũ phải có ít nhất 2 ký tự';
          if (this.form.tenKieuDang.trim().length > 100)
            return 'Tên kiểu dáng mũ không được vượt quá 100 ký tự';
          break;
        case 'moTa':
          return 'Mô tả không được vượt quá 500 ký tự';
      }
    }

    // Default error message
    const fieldConfig = this.fields.find((f) => f.name === field);
    if (fieldConfig?.required) {
      return `Vui lòng nhập ${fieldConfig.label.toLowerCase()}`;
    }
    return null;
  }

  // Method to reset touched fields when modal opens
  resetTouchedFields() {
    this.touchedFields.clear();
  }
}
