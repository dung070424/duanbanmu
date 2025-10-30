import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  TrongLuongApiService,
  TrongLuongResponse,
  PageResponse,
} from '../../services/trong-luong-api.service';

interface TrongLuongVM {
  id: number;
  giaTriTrongLuong: number;
  donVi: string;
  moTa?: string;
  trangThai: boolean;
}

@Component({
  selector: 'app-trong-luong',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trong-luong.component.html',
  styleUrls: ['./trong-luong.component.scss'],
})
export class TrongLuongComponent implements OnInit {
  items: TrongLuongVM[] = [];
  display: TrongLuongVM[] = [];
  searchTerm: string = '';
  selectedStatus: string = 'all';

  page = 0;
  size = 10;
  totalPages = 0;
  totalElements = 0;
  sort = 'id,desc';

  showModal = false;
  isEditMode = false;
  isViewMode = false;
  selected: TrongLuongVM | null = null;
  showDeleteModal = false;
  toDelete: TrongLuongVM | null = null;

  form: TrongLuongVM = {
    id: 0,
    giaTriTrongLuong: 0,
    donVi: '',
    moTa: '',
    trangThai: true,
  };

  // Track which fields have been touched by user
  touchedFields: Set<string> = new Set();

  constructor(private api: TrongLuongApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.fetch();
  }

  fetch(page: number = 0) {
    // Lấy tất cả trọng lượng (cả active và inactive) với pagination
    this.api
      .search({
        keyword: this.searchTerm,
        trangThai: this.selectedStatus === 'all' ? undefined : this.selectedStatus === 'active',
        page: page,
        size: this.size,
        sort: this.sort,
      })
      .subscribe((response: PageResponse<TrongLuongResponse>) => {
        this.items = (response.content || []).map((x) => ({
          id: x.id,
          giaTriTrongLuong: x.giaTriTrongLuong,
          donVi: x.donVi,
          moTa: x.moTa || '',
          trangThai: !!x.trangThai,
        }));
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.page = response.number;
        this.applyFilters();
        this.cdr.detectChanges();
      });
  }

  onSearchChange() {
    this.applyFilters();
  }

  onStatusChange() {
    this.applyFilters();
  }

  setSort(field: 'giaTriTrongLuong' | 'donVi' | 'moTa' | 'trangThai') {
    const [f, d] = this.sort.split(',');
    const next = f === field && d === 'asc' ? 'desc' : 'asc';
    this.sort = `${field},${next}`;
    this.page = 0;
    this.fetch(0);
  }

  prevPage() {
    if (this.page > 0) {
      this.fetch(this.page - 1);
    }
  }

  nextPage() {
    if (this.page < this.totalPages - 1) {
      this.fetch(this.page + 1);
    }
  }

  changePageSize(size: number) {
    this.size = Number(size) || 10;
    this.page = 0;
    this.fetch(0);
  }

  openAddModal() {
    this.isEditMode = false;
    this.isViewMode = false;
    this.selected = null;
    this.form = {
      id: 0,
      giaTriTrongLuong: 0,
      donVi: '',
      moTa: '',
      trangThai: true,
    };
    this.resetTouchedFields();
    this.showModal = true;
  }

  openEditModal(t: TrongLuongVM) {
    this.isEditMode = true;
    this.isViewMode = false;
    this.selected = t;
    this.form = { ...t };
    this.resetTouchedFields();
    this.showModal = true;
  }

  viewItem(t: TrongLuongVM) {
    this.isViewMode = true;
    this.isEditMode = false;
    this.selected = t;
    this.form = { ...t };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.isEditMode = false;
    this.isViewMode = false;
    this.selected = null;
  }

  save() {
    // Mark all fields as touched when user tries to submit
    this.touchedFields.add('giaTriTrongLuong');
    this.touchedFields.add('donVi');
    this.touchedFields.add('moTa');

    // Validation chi tiết
    const validationErrors: string[] = [];

    // Kiểm tra giá trị trọng lượng
    if (!this.form.giaTriTrongLuong || this.form.giaTriTrongLuong <= 0) {
      validationErrors.push('Giá trị trọng lượng phải lớn hơn 0');
    } else if (this.form.giaTriTrongLuong > 999999) {
      validationErrors.push('Giá trị trọng lượng không được vượt quá 999,999');
    }

    // Kiểm tra đơn vị
    if (!this.form.donVi?.trim()) {
      validationErrors.push('Vui lòng chọn đơn vị');
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

    const payload = {
      giaTriTrongLuong: Number(this.form.giaTriTrongLuong),
      donVi: this.form.donVi,
      moTa: this.form.moTa,
      trangThai: this.form.trangThai,
    };

    if (this.isEditMode && this.selected) {
      this.api.update(this.selected.id, payload).subscribe({
        next: () => {
          this.fetch(this.page); // Giữ nguyên trang hiện tại
          this.closeModal();
        },
        error: (err) => {
          console.error(err);
          const msg =
            (err?.error && (err.error.message || err.error.error)) ||
            (err?.status === 409
              ? 'Trọng lượng với giá trị và đơn vị này đã tồn tại, vui lòng dùng giá trị khác.'
              : err?.status === 400
              ? 'Dữ liệu không hợp lệ, vui lòng kiểm tra lại.'
              : 'Cập nhật trọng lượng thất bại');
          alert(msg);
        },
      });
    } else {
      this.api.create(payload).subscribe({
        next: () => {
          this.fetch(0); // Về trang đầu sau khi tạo mới
          this.closeModal();
        },
        error: (err) => {
          console.error(err);
          const msg =
            (err?.error && (err.error.message || err.error.error)) ||
            (err?.status === 409
              ? 'Trọng lượng với giá trị và đơn vị này đã tồn tại, vui lòng dùng giá trị khác.'
              : err?.status === 400
              ? 'Dữ liệu không hợp lệ, vui lòng nhập đầy đủ thông tin.'
              : 'Thêm trọng lượng thất bại');
          alert(msg);
        },
      });
    }
  }

  delete(t: TrongLuongVM) {
    this.toDelete = t;
    this.showDeleteModal = true;
  }

  confirmDelete() {
    if (this.toDelete) {
      this.api.delete(this.toDelete.id).subscribe({
        next: () => {
          this.fetch(this.page); // Giữ nguyên trang hiện tại
        },
        error: (err) => {
          console.error(err);
          const msg =
            (err?.error && (err.error.message || err.error.error)) || 'Xóa trọng lượng thất bại';
          alert(msg);
        },
      });
    }
    this.closeDeleteModal();
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.toDelete = null;
  }

  trackById(i: number, t: TrongLuongVM) {
    return t.id;
  }

  // Validation methods
  markFieldTouched(field: string) {
    this.touchedFields.add(field);
  }

  hasFieldError(field: string): boolean {
    if (!this.touchedFields.has(field)) {
      return false;
    }

    switch (field) {
      case 'giaTriTrongLuong':
        return (
          !this.form.giaTriTrongLuong ||
          this.form.giaTriTrongLuong <= 0 ||
          this.form.giaTriTrongLuong > 999999
        );
      case 'donVi':
        return !this.form.donVi?.trim();
      case 'moTa':
        return !!(this.form.moTa?.trim() && this.form.moTa.trim().length > 500);
      default:
        return false;
    }
  }

  getFieldError(field: string): string | null {
    if (!this.hasFieldError(field)) {
      return null;
    }

    switch (field) {
      case 'giaTriTrongLuong':
        if (!this.form.giaTriTrongLuong || this.form.giaTriTrongLuong <= 0) {
          return 'Giá trị trọng lượng phải lớn hơn 0';
        }
        if (this.form.giaTriTrongLuong > 999999) {
          return 'Giá trị trọng lượng không được vượt quá 999,999';
        }
        break;
      case 'donVi':
        return 'Vui lòng chọn đơn vị';
      case 'moTa':
        return 'Mô tả không được vượt quá 500 ký tự';
    }
    return null;
  }

  resetTouchedFields() {
    this.touchedFields.clear();
  }

  // New methods for the updated UI
  resetFilter() {
    this.searchTerm = '';
    this.selectedStatus = 'all';
    this.applyFilters();
  }

  applyFilters() {
    let filtered = [...this.items];

    // Apply search filter
    if (this.searchTerm?.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (item) =>
          item.giaTriTrongLuong.toString().includes(term) ||
          item.donVi.toLowerCase().includes(term) ||
          (item.moTa && item.moTa.toLowerCase().includes(term))
      );
    }

    // Apply status filter
    if (this.selectedStatus !== 'all') {
      const status = this.selectedStatus === 'true';
      filtered = filtered.filter((item) => item.trangThai === status);
    }

    this.display = filtered;
  }

  onPageSizeChange(event: any) {
    this.size = parseInt(event.target.value);
    this.fetch(0);
  }

  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages) {
      this.fetch(page);
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    const startPage = Math.max(0, this.page - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(this.totalPages - 1, startPage + maxVisiblePages - 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i + 1);
    }
    return pages;
  }

  // Add Math object for template
  Math = Math;
}
