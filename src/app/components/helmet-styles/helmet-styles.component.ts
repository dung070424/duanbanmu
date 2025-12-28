import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  HelmetStyleApiService,
  HelmetStyleResponse,
  PageResponse,
} from '../../services/helmet-style-api.service';

interface HelmetStyleVM {
  id: number;
  name: string;
  description: string;
  status: boolean;
}

@Component({
  selector: 'app-helmet-styles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './helmet-styles.component.html',
  styleUrls: ['./helmet-styles.component.scss'],
})
export class HelmetStylesComponent implements OnInit {
  styles: HelmetStyleVM[] = [];
  filtered: HelmetStyleVM[] = [];
  searchTerm = '';
  selectedStatus = 'all';
  showModal = false;
  isEditMode = false;
  isViewMode = false;
  selected: HelmetStyleVM | null = null;
  newStyle: HelmetStyleVM = { id: 0, name: '', description: '', status: true };
  showDeleteModal = false;
  styleToDelete: HelmetStyleVM | null = null;

  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;
  sort = 'id,desc';

  // Track which fields have been touched by user
  touchedFields: Set<string> = new Set();

  // Expose Math to template
  Math = Math;

  constructor(private api: HelmetStyleApiService, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.fetch();
  }

  fetch(page: number = 0) {
    this.api
      .search({ keyword: this.searchTerm || undefined, page, size: this.pageSize, sort: this.sort })
      .subscribe((res: PageResponse<HelmetStyleResponse>) => {
        this.styles = res.content.map((s) => ({
          id: s.id,
          name: s.tenKieuDang,
          description: s.moTa || '',
          status: !!s.trangThai,
        }));
        this.filtered = [...this.styles];
        this.totalPages = res.totalPages;
        this.totalElements = res.totalElements;
        this.currentPage = res.number;
        this.cdr.detectChanges();
      });
  }

  filterStyles() {
    // Nếu searchTerm chỉ chứa dấu cách hoặc rỗng, hiển thị tất cả kiểu dáng
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.filtered = this.styles.filter((style) => {
        const matchesStatus =
          this.selectedStatus === 'all' ||
          (this.selectedStatus === 'true' && style.status) ||
          (this.selectedStatus === 'false' && !style.status);
        return matchesStatus;
      });
      return;
    }

    this.filtered = this.styles.filter((style) => {
      const searchTerm = this.searchTerm.toLowerCase().trim();

      // Tìm kiếm trong các trường: Tên kiểu dáng, Mô tả
      const matchesSearch =
        style.name.toLowerCase().includes(searchTerm) ||
        (style.description && style.description.toLowerCase().includes(searchTerm));

      const matchesStatus =
        this.selectedStatus === 'all' ||
        (this.selectedStatus === 'true' && style.status) ||
        (this.selectedStatus === 'false' && !style.status);

      return matchesSearch && matchesStatus;
    });
  }

  onSearchChange() {
    // Không tìm kiếm nếu chỉ có dấu cách
    if (this.searchTerm && this.searchTerm.trim() === '') {
      return;
    }
    this.filterStyles();
  }

  onStatusChange() {
    this.filterStyles();
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
    this.newStyle = { id: 0, name: '', description: '', status: true };
    this.resetTouchedFields();
    this.showModal = true;
  }
  openEditModal(s: HelmetStyleVM) {
    this.isEditMode = true;
    this.isViewMode = false;
    this.selected = s;
    this.newStyle = { ...s };
    this.resetTouchedFields();
    this.showModal = true;
  }
  viewStyle(s: HelmetStyleVM) {
    this.isViewMode = true;
    this.isEditMode = false;
    this.selected = s;
    this.newStyle = { ...s };
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

    // Validation chi tiết
    const validationErrors: string[] = [];

    // Kiểm tra tên kiểu dáng
    if (!this.newStyle.name?.trim()) {
      validationErrors.push('Tên kiểu dáng không được để trống');
    } else if (this.newStyle.name.trim().length < 2) {
      validationErrors.push('Tên kiểu dáng phải có ít nhất 2 ký tự');
    } else if (this.newStyle.name.trim().length > 100) {
      validationErrors.push('Tên kiểu dáng không được vượt quá 100 ký tự');
    }

    // Kiểm tra mô tả (tùy chọn, nhưng nếu có thì phải hợp lệ)
    if (this.newStyle.description && this.newStyle.description.trim().length > 500) {
      validationErrors.push('Mô tả không được vượt quá 500 ký tự');
    }

    // Hiển thị lỗi nếu có
    if (validationErrors.length > 0) {
      // Không hiển thị alert, chỉ mark fields as touched để hiển thị validation errors
      return;
    }

    const errorHandler = (err: any) => {
      console.error('API Error:', err);
      if (err?.status === 409 || err?.error?.message?.includes('exist') || err?.error?.message?.includes('tồn tại')) {
        this.errorMessage = 'Tên kiểu dáng đã tồn tại trong hệ thống.';
      } else {
        this.errorMessage =
          (err?.error && (err.error.message || err.error.error)) ||
          'Đã có lỗi xảy ra. Vui lòng thử lại sau.';
        console.error(this.errorMessage);
      }
    };

    if (this.isEditMode && this.selected) {
      this.api
        .update(this.selected.id, {
          tenKieuDang: this.newStyle.name,
          moTa: this.newStyle.description || undefined,
          trangThai: this.newStyle.status,
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
          tenKieuDang: this.newStyle.name,
          moTa: this.newStyle.description || undefined,
          trangThai: this.newStyle.status,
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

  delete(s: HelmetStyleVM) {
    this.styleToDelete = s;
    this.showDeleteModal = true;
  }

  // sort helpers
  setSort(field: 'tenKieuDang' | 'trangThai') {
    const [f, d] = this.sort.split(',');
    const nextDir = f === field && d === 'asc' ? 'desc' : 'asc';
    this.sort = `${field},${nextDir}`;
    this.fetch(0);
  }
  getSortSymbol(field: 'tenKieuDang' | 'trangThai') {
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
    this.styleToDelete = null;
  }

  confirmDelete() {
    if (!this.styleToDelete) return;
    this.api.delete(this.styleToDelete.id).subscribe({
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
          !this.newStyle.name?.trim() ||
          this.newStyle.name.trim().length < 2 ||
          this.newStyle.name.trim().length > 100
        );
      case 'description':
        return !!(this.newStyle.description && this.newStyle.description.trim().length > 500);
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
        if (!this.newStyle.name?.trim()) return 'Tên kiểu dáng không được để trống';
        if (this.newStyle.name.trim().length < 2) return 'Tên kiểu dáng phải có ít nhất 2 ký tự';
        if (this.newStyle.name.trim().length > 100)
          return 'Tên kiểu dáng không được vượt quá 100 ký tự';
        break;
      case 'description':
        return 'Mô tả không được vượt quá 500 ký tự';
    }
    return null;
  }

  resetTouchedFields() {
    this.touchedFields.clear();
    this.errorMessage = '';
  }
}
