import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CongNgheAnToanApiService,
  CongNgheAnToanResponse,
} from '../../services/cong-nghe-an-toan-api.service';

interface CongNgheAnToanVM {
  id?: number;
  tenCongNghe: string;
  moTa: string;
  trangThai: boolean;
}

@Component({
  selector: 'app-cong-nghe-an-toan',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cong-nghe-an-toan.component.html',
  styleUrls: ['./cong-nghe-an-toan.component.scss'],
})
export class CongNgheAnToanComponent implements OnInit {
  items: CongNgheAnToanResponse[] = [];
  filteredItems: CongNgheAnToanResponse[] = [];
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  // Search and filter
  searchKeyword = '';
  selectedStatus: string = 'all';

  // Modal states
  showModal = false;
  showDeleteModal = false;
  isEditMode = false;
  isViewMode = false;

  // Form data
  form: CongNgheAnToanVM = {
    tenCongNghe: '',
    moTa: '',
    trangThai: true,
  };

  // Item to delete
  itemToDelete: CongNgheAnToanResponse | null = null;

  // Validation
  touchedFields: Set<string> = new Set();

  // Sort
  sortField = 'id';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Math for template
  Math = Math;

  constructor(private api: CongNgheAnToanApiService, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.fetch(0);
  }

  fetch(page: number): void {
    let trangThai: boolean | undefined = undefined;
    if (this.selectedStatus === 'true') trangThai = true;
    if (this.selectedStatus === 'false') trangThai = false;

    this.api
      .search({
        keyword: this.searchKeyword || undefined,
        trangThai: trangThai,
        page: page,
        size: this.pageSize,
        sort: `${this.sortField},${this.sortDirection}`,
      })
      .subscribe({
        next: (response) => {
          this.items = response.content;
          this.filteredItems = response.content;
          this.currentPage = response.number;
          this.totalElements = response.totalElements;
          this.totalPages = response.totalPages;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error fetching data:', error);
          alert(
            'Lỗi khi tải dữ liệu: ' +
            (error.error?.message || error.message || 'Không thể kết nối đến server')
          );
        },
      });
  }

  onSearchChange(): void {
    this.currentPage = 0;
    this.fetch(0);
  }

  onStatusChange(): void {
    this.currentPage = 0;
    this.fetch(0);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.fetch(page);
  }

  changePageSize(newSize: number): void {
    this.pageSize = newSize;
    this.currentPage = 0;
    this.fetch(0);
  }

  prevPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.fetch(this.currentPage);
    }
  }

  nextPage(): void {
    if (this.currentPage + 1 < this.totalPages) {
      this.currentPage++;
      this.fetch(this.currentPage);
    }
  }

  changeSort(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.fetch(this.currentPage);
  }

  trackByItemId(index: number, item: any): number {
    return item.id;
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.isViewMode = false;
    this.form = {
      tenCongNghe: '',
      moTa: '',
      trangThai: true,
    };
    this.touchedFields.clear();
    this.showModal = true;
  }

  openEditModal(item: CongNgheAnToanResponse): void {
    this.isEditMode = true;
    this.isViewMode = false;
    this.form = {
      id: item.id,
      tenCongNghe: item.tenCongNghe,
      moTa: item.moTa || '',
      trangThai: item.trangThai,
    };
    this.touchedFields.clear();
    this.showModal = true;
  }

  openViewModal(item: CongNgheAnToanResponse): void {
    this.isEditMode = false;
    this.isViewMode = true;
    this.form = {
      id: item.id,
      tenCongNghe: item.tenCongNghe,
      moTa: item.moTa || '',
      trangThai: item.trangThai,
    };
    this.touchedFields.clear();
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.isEditMode = false;
    this.isViewMode = false;
    this.form = {
      tenCongNghe: '',
      moTa: '',
      trangThai: true,
    };
    this.touchedFields.clear();
    this.errorMessage = '';
  }

  openDeleteModal(item: CongNgheAnToanResponse): void {
    this.itemToDelete = item;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.itemToDelete = null;
  }

  errorMessage: string = '';

  save(): void {
    // Mark all fields as touched for validation
    this.markAllFieldsTouched();

    // Validation
    const validationErrors: string[] = [];

    if (!this.form.tenCongNghe?.trim()) {
      validationErrors.push('Tên công nghệ an toàn không được để trống');
    } else if (this.form.tenCongNghe.trim().length < 2) {
      validationErrors.push('Tên công nghệ an toàn phải có ít nhất 2 ký tự');
    } else if (this.form.tenCongNghe.trim().length > 100) {
      validationErrors.push('Tên công nghệ an toàn không được vượt quá 100 ký tự');
    }

    if (this.form.moTa?.trim() && this.form.moTa.trim().length > 500) {
      validationErrors.push('Mô tả không được vượt quá 500 ký tự');
    }

    // Hiển thị lỗi nếu có
    if (validationErrors.length > 0) {
      // Không hiển thị alert, chỉ mark fields as touched để hiển thị validation errors
      return;
    }

    const payload = {
      tenCongNghe: this.form.tenCongNghe.trim(),
      moTa: this.form.moTa?.trim() || '',
      trangThai: this.form.trangThai,
    };

    const errorHandler = (err: any) => {
      console.error('API Error:', err);
      if (err?.status === 409 || err?.error?.message?.includes('exist') || err?.error?.message?.includes('tồn tại')) {
        this.errorMessage = 'Tên công nghệ an toàn đã tồn tại trong hệ thống.';
      } else {
        this.errorMessage =
          (err?.error && (err.error.message || err.error.error)) ||
          'Đã có lỗi xảy ra. Vui lòng thử lại sau.';
      }
    };

    if (this.isEditMode && this.form.id) {
      this.api.update(this.form.id, payload).subscribe({
        next: () => {
          this.fetch(this.currentPage);
          this.closeModal();
        },
        error: errorHandler,
      });
    } else {
      this.api.create(payload).subscribe({
        next: () => {
          this.fetch(0);
          this.closeModal();
        },
        error: errorHandler,
      });
    }
  }

  confirmDelete(): void {
    if (!this.itemToDelete) return;

    this.api.delete(this.itemToDelete.id).subscribe({
      next: () => {
        alert('Xóa công nghệ an toàn thành công!');
        this.fetch(this.currentPage);
        this.closeDeleteModal();
      },
      error: (error) => {
        console.error('Xóa thất bại:', error);
        alert(
          'Lỗi khi xóa công nghệ an toàn: ' +
          (error.error?.message || error.message || 'Không thể kết nối đến server')
        );
      },
    });
  }

  // Validation methods
  markFieldTouched(field: string): void {
    this.touchedFields.add(field);
  }

  markAllFieldsTouched(): void {
    this.touchedFields.add('tenCongNghe');
    this.touchedFields.add('moTa');
  }

  hasFieldError(field: string): boolean {
    if (!this.touchedFields.has(field)) return false;

    switch (field) {
      case 'tenCongNghe':
        return (
          !this.form.tenCongNghe?.trim() ||
          this.form.tenCongNghe.trim().length < 2 ||
          this.form.tenCongNghe.trim().length > 100
        );
      case 'moTa':
        return !!(this.form.moTa?.trim() && this.form.moTa.trim().length > 500);
      default:
        return false;
    }
  }

  getFieldError(field: string): string {
    if (!this.touchedFields.has(field)) return '';

    switch (field) {
      case 'tenCongNghe':
        if (!this.form.tenCongNghe?.trim()) return 'Tên công nghệ an toàn không được để trống';
        if (this.form.tenCongNghe.trim().length < 2)
          return 'Tên công nghệ an toàn phải có ít nhất 2 ký tự';
        if (this.form.tenCongNghe.trim().length > 100)
          return 'Tên công nghệ an toàn không được vượt quá 100 ký tự';
        break;
      case 'moTa':
        return 'Mô tả không được vượt quá 500 ký tự';
    }
    return '';
  }

  getStatusText(trangThai: boolean): string {
    return trangThai ? 'Đang dùng' : 'Không dùng nữa';
  }

  getStatusClass(trangThai: boolean): string {
    return trangThai ? 'badge-success' : 'badge-danger';
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
}
