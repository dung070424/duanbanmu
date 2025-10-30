import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OriginApiService, OriginResponse, PageResponse } from '../../services/origin-api.service';

interface OriginVM {
  id: number;
  tenXuatXu: string;
  moTa?: string;
  trangThai: boolean;
}

@Component({
  selector: 'app-origins',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './origins.component.html',
  styleUrls: ['./origins.component.scss'],
})
export class OriginsComponent implements OnInit {
  items: OriginVM[] = [];
  filtered: OriginVM[] = [];
  display: OriginVM[] = [];
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
  selected: OriginVM | null = null;
  showDeleteModal = false;
  toDelete: OriginVM | null = null;

  form: OriginVM = { id: 0, tenXuatXu: '', moTa: '', trangThai: true };

  // Track which fields have been touched by user
  touchedFields: Set<string> = new Set();

  constructor(private api: OriginApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.fetch();
  }

  fetch(page: number = 0) {
    // Lấy tất cả xuất xứ (cả active và inactive) với pagination
    this.api
      .search({
        keyword: this.searchTerm,
        trangThai: this.selectedStatus === 'all' ? undefined : this.selectedStatus === 'active',
        page: page,
        size: this.size,
        sort: this.sort,
      })
      .subscribe((response: PageResponse<OriginResponse>) => {
        this.items = (response.content || []).map((x) => ({
          id: x.id,
          tenXuatXu: x.tenXuatXu,
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

  setSort(field: 'tenXuatXu' | 'moTa' | 'trangThai') {
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
    this.form = { id: 0, tenXuatXu: '', moTa: '', trangThai: true };
    this.resetTouchedFields();
    this.showModal = true;
  }
  openEditModal(x: OriginVM) {
    this.isEditMode = true;
    this.isViewMode = false;
    this.selected = x;
    this.form = { ...x };
    this.resetTouchedFields();
    this.showModal = true;
  }
  viewItem(x: OriginVM) {
    this.isViewMode = true;
    this.isEditMode = false;
    this.selected = x;
    this.form = { ...x };
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
    this.touchedFields.add('tenXuatXu');
    this.touchedFields.add('moTa');

    // Validation chi tiết
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
    const payload = {
      tenXuatXu: this.form.tenXuatXu,
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
              ? 'Tên xuất xứ đã tồn tại, vui lòng dùng tên khác.'
              : err?.status === 400
              ? 'Dữ liệu không hợp lệ, vui lòng kiểm tra lại.'
              : 'Cập nhật xuất xứ thất bại');
          console.error(msg);
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
              ? 'Tên xuất xứ đã tồn tại, vui lòng dùng tên khác.'
              : err?.status === 400
              ? 'Dữ liệu không hợp lệ, vui lòng nhập tên xuất xứ.'
              : 'Thêm xuất xứ thất bại');
          console.error(msg);
        },
      });
    }
  }

  delete(x: OriginVM) {
    this.toDelete = x;
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
            (err?.error && (err.error.message || err.error.error)) || 'Xóa xuất xứ thất bại';
          console.error(msg);
        },
      });
    }
    this.closeDeleteModal();
  }
  closeDeleteModal() {
    this.showDeleteModal = false;
    this.toDelete = null;
  }

  trackById(i: number, x: OriginVM) {
    return x.id;
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
      case 'tenXuatXu':
        return (
          !this.form.tenXuatXu?.trim() ||
          this.form.tenXuatXu.trim().length < 2 ||
          this.form.tenXuatXu.trim().length > 100
        );
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
      case 'tenXuatXu':
        if (!this.form.tenXuatXu?.trim()) return 'Tên xuất xứ không được để trống';
        if (this.form.tenXuatXu.trim().length < 2) return 'Tên xuất xứ phải có ít nhất 2 ký tự';
        if (this.form.tenXuatXu.trim().length > 100)
          return 'Tên xuất xứ không được vượt quá 100 ký tự';
        break;
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
          item.tenXuatXu.toLowerCase().includes(term) ||
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
