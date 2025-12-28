import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ColorApiService, ColorResponse, PageResponse } from '../../services/color-api.service';

interface ColorVM {
  id: number;
  name: string;
  code: string;
  status: boolean;
}

@Component({
  selector: 'app-colors',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './colors.component.html',
  styleUrls: ['./colors.component.scss'],
})
export class ColorsComponent implements OnInit {
  colors: ColorVM[] = [];
  filtered: ColorVM[] = [];
  searchTerm = '';
  selectedStatus = 'all';
  showModal = false;
  isEditMode = false;
  isViewMode = false;
  selected: ColorVM | null = null;
  newColor: ColorVM = { id: 0, name: '', code: '', status: true };
  showDeleteModal = false;
  colorToDelete: ColorVM | null = null;

  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;
  sort = 'id,desc';

  // Track which fields have been touched by user
  touchedFields: Set<string> = new Set();

  // Expose Math to template
  Math = Math;

  constructor(private api: ColorApiService, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.fetch();
  }

  fetch(page: number = 0) {
    this.api
      .search({ keyword: this.searchTerm || undefined, page, size: this.pageSize, sort: this.sort })
      .subscribe((res: PageResponse<ColorResponse>) => {
        this.colors = res.content.map((c) => ({
          id: c.id,
          name: c.tenMau,
          code: c.maMau,
          status: !!c.trangThai,
        }));
        this.filtered = [...this.colors];
        this.totalPages = res.totalPages;
        this.totalElements = res.totalElements;
        this.currentPage = res.number;
        this.cdr.detectChanges();
      });
  }

  filterColors() {
    // Nếu searchTerm chỉ chứa dấu cách hoặc rỗng, hiển thị tất cả màu sắc
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.filtered = this.colors.filter((color) => {
        const matchesStatus =
          this.selectedStatus === 'all' ||
          (this.selectedStatus === 'true' && color.status) ||
          (this.selectedStatus === 'false' && !color.status);
        return matchesStatus;
      });
      return;
    }

    this.filtered = this.colors.filter((color) => {
      const searchTerm = this.searchTerm.toLowerCase().trim();

      // Tìm kiếm trong các trường: Mã màu, Tên màu
      const matchesSearch =
        color.code.toLowerCase().includes(searchTerm) ||
        color.name.toLowerCase().includes(searchTerm);

      const matchesStatus =
        this.selectedStatus === 'all' ||
        (this.selectedStatus === 'true' && color.status) ||
        (this.selectedStatus === 'false' && !color.status);

      return matchesSearch && matchesStatus;
    });
  }

  onSearchChange() {
    // Không tìm kiếm nếu chỉ có dấu cách
    if (this.searchTerm && this.searchTerm.trim() === '') {
      return;
    }
    this.filterColors();
  }

  onStatusChange() {
    this.filterColors();
  }

  resetFilter() {
    this.searchTerm = '';
    this.selectedStatus = 'all';
    this.currentPage = 0;
    this.fetch();
  }

  openAddModal() {
    this.isEditMode = false;
    this.isViewMode = false;
    this.selected = null;
    this.newColor = { id: 0, name: '', code: '', status: true };
    this.resetTouchedFields();
    this.showModal = true;
  }
  openEditModal(c: ColorVM) {
    this.isEditMode = true;
    this.isViewMode = false;
    this.selected = c;
    this.newColor = { ...c };
    this.resetTouchedFields();
    this.showModal = true;
  }
  viewColor(c: ColorVM) {
    this.isViewMode = true;
    this.isEditMode = false;
    this.selected = c;
    this.newColor = { ...c };
    this.showModal = true;
  }
  closeModal() {
    this.showModal = false;
    this.selected = null;
    this.isEditMode = false;
    this.isViewMode = false;
  }

  errorMessage: string = '';

  save() {
    // Mark all fields as touched when user tries to submit
    this.touchedFields.add('name');
    this.touchedFields.add('code');

    // Validation chi tiết
    const validationErrors: string[] = [];

    // Kiểm tra tên màu
    if (!this.newColor.name?.trim()) {
      validationErrors.push('Tên màu không được để trống');
    } else if (this.newColor.name.trim().length < 2) {
      validationErrors.push('Tên màu phải có ít nhất 2 ký tự');
    } else if (this.newColor.name.trim().length > 100) {
      validationErrors.push('Tên màu không được vượt quá 100 ký tự');
    }

    // Kiểm tra mã màu (bắt buộc)
    if (!this.newColor.code?.trim()) {
      validationErrors.push('Mã màu không được để trống');
    } else {
      const colorCode = this.newColor.code.trim();
      // Kiểm tra định dạng hex color
      if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colorCode)) {
        validationErrors.push('Mã màu phải có định dạng hex hợp lệ (ví dụ: #FF0000 hoặc #F00)');
      }
    }

    // Hiển thị lỗi nếu có
    if (validationErrors.length > 0) {
      // Không hiển thị alert, chỉ mark fields as touched để hiển thị validation errors
      return;
    }

    const errorHandler = (err: any) => {
      console.error('API Error:', err);
      if (err?.status === 409 || err?.error?.message?.includes('exist') || err?.error?.message?.includes('tồn tại')) {
        this.errorMessage = 'Tên màu hoặc mã màu đã tồn tại trong hệ thống.';
      } else {
        this.errorMessage =
          (err?.error && (err.error.message || err.error.error)) ||
          'Đã có lỗi xảy ra. Vui lòng thử lại sau.';
      }
    };

    if (this.isEditMode && this.selected) {
      this.api
        .update(this.selected.id, {
          tenMau: this.newColor.name,
          maMau: this.newColor.code,
          trangThai: this.newColor.status,
        })
        .subscribe({
          next: () => {
            this.fetch(0);
            this.closeModal();
          },
          error: errorHandler,
        });
    } else {
      this.api
        .create({
          tenMau: this.newColor.name,
          maMau: this.newColor.code,
          trangThai: this.newColor.status,
        })
        .subscribe({
          next: () => {
            this.fetch(0);
            this.closeModal();
          },
          error: errorHandler,
        });
    }
  }

  delete(c: ColorVM) {
    this.colorToDelete = c;
    this.showDeleteModal = true;
  }

  // sort helpers
  setSort(field: 'tenMau' | 'maMau' | 'trangThai') {
    const [f, d] = this.sort.split(',');
    const nextDir = f === field && d === 'asc' ? 'desc' : 'asc';
    this.sort = `${field},${nextDir}`;
    this.fetch(0);
  }
  getSortSymbol(field: 'tenMau' | 'maMau' | 'trangThai') {
    const [f, d] = this.sort.split(',');
    return f === field ? (d === 'asc' ? '▲' : '▼') : '';
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1) this.fetch(this.currentPage + 1);
  }
  prevPage() {
    if (this.currentPage > 0) this.fetch(this.currentPage - 1);
  }
  changePageSize(size: number) {
    this.pageSize = size;
    this.fetch(0);
  }

  onPageSizeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.changePageSize(+target.value);
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(0, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages - 1, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(0, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i + 1);
    }
    return pages;
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.fetch(page);
    }
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.colorToDelete = null;
  }

  confirmDelete() {
    if (!this.colorToDelete) return;
    this.api.delete(this.colorToDelete.id).subscribe({
      next: () => {
        this.fetch(0);
        this.closeDeleteModal();
      },
      error: () => console.error('Xóa thất bại'),
    });
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
      case 'name':
        return (
          !this.newColor.name?.trim() ||
          this.newColor.name.trim().length < 2 ||
          this.newColor.name.trim().length > 100
        );
      case 'code':
        if (!this.newColor.code?.trim()) return true; // Required field
        const colorCode = this.newColor.code.trim();
        return !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colorCode);
      default:
        return false;
    }
  }

  getFieldError(field: string): string | null {
    if (!this.hasFieldError(field)) {
      return null;
    }

    switch (field) {
      case 'name':
        if (!this.newColor.name?.trim()) return 'Tên màu không được để trống';
        if (this.newColor.name.trim().length < 2) return 'Tên màu phải có ít nhất 2 ký tự';
        if (this.newColor.name.trim().length > 100) return 'Tên màu không được vượt quá 100 ký tự';
        break;
      case 'code':
        if (!this.newColor.code?.trim()) return 'Mã màu không được để trống';
        return 'Mã màu phải có định dạng hex hợp lệ (ví dụ: #FF0000 hoặc #F00)';
    }
    return null;
  }

  resetTouchedFields() {
    this.touchedFields.clear();
    this.errorMessage = '';
  }
}
