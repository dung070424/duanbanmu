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
  description?: string;
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
  items: HelmetStyleVM[] = [];
  filtered: HelmetStyleVM[] = [];
  searchTerm = '';
  selectedStatus: string = 'all';
  showModal = false;
  isEditMode = false;
  isViewMode = false;
  selected: HelmetStyleVM | null = null;
  newItem: HelmetStyleVM = { id: 0, name: '', description: '', status: true };
  showDeleteModal = false;
  itemToDelete: HelmetStyleVM | null = null;

  // Track which fields have been touched by user
  touchedFields: Set<string> = new Set();

  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;
  sort = 'id,desc';

  // Make Math available in template
  Math = Math;

  trackById(index: number, item: HelmetStyleVM): number {
    return item.id;
  }

  constructor(private api: HelmetStyleApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.fetch();
  }

  fetch(page: number = 0) {
    this.api
      .search({ keyword: this.searchTerm || undefined, page, size: this.pageSize, sort: this.sort })
      .subscribe((res: PageResponse<HelmetStyleResponse>) => {
        this.items = res.content.map((k) => ({
          id: k.id,
          name: k.tenKieuDang,
          description: k.moTa,
          status: !!k.trangThai,
        }));
        this.filtered = [...this.items];
        this.totalPages = res.totalPages;
        this.totalElements = res.totalElements;
        this.currentPage = res.number;
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

  resetFilter() {
    this.searchTerm = '';
    this.selectedStatus = 'all';
    this.applyFilters();
  }

  applyFilters() {
    let filtered = [...this.items];

    // Filter by search term
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchLower) ||
          (item.description && item.description.toLowerCase().includes(searchLower))
      );
    }

    // Filter by status
    if (this.selectedStatus !== 'all') {
      const statusFilter = this.selectedStatus === 'true';
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    this.filtered = filtered;
  }

  openAddModal() {
    this.isEditMode = false;
    this.isViewMode = false;
    this.selected = null;
    this.newItem = { id: 0, name: '', description: '', status: true };
    this.resetTouchedFields();
    this.showModal = true;
  }
  openEditModal(i: HelmetStyleVM) {
    this.isEditMode = true;
    this.isViewMode = false;
    this.selected = i;
    this.newItem = { ...i };
    this.resetTouchedFields();
    this.showModal = true;
  }
  view(i: HelmetStyleVM) {
    this.isViewMode = true;
    this.isEditMode = false;
    this.selected = i;
    this.newItem = { ...i };
    this.showModal = true;
  }
  closeModal() {
    this.showModal = false;
    this.selected = null;
    this.isEditMode = false;
    this.isViewMode = false;
  }

  save() {
    // Mark all fields as touched when user tries to submit
    this.touchedFields.add('name');
    this.touchedFields.add('description');

    // Validation chi tiết
    const validationErrors: string[] = [];

    // Kiểm tra tên kiểu dáng
    if (!this.newItem.name?.trim()) {
      validationErrors.push('Tên kiểu dáng không được để trống');
    } else if (this.newItem.name.trim().length < 2) {
      validationErrors.push('Tên kiểu dáng phải có ít nhất 2 ký tự');
    } else if (this.newItem.name.trim().length > 100) {
      validationErrors.push('Tên kiểu dáng không được vượt quá 100 ký tự');
    }

    // Kiểm tra mô tả (nếu có)
    if (this.newItem.description?.trim() && this.newItem.description.trim().length > 500) {
      validationErrors.push('Mô tả không được vượt quá 500 ký tự');
    }

    // Hiển thị lỗi nếu có
    if (validationErrors.length > 0) {
      // Không hiển thị alert, chỉ mark fields as touched để hiển thị validation errors
      return;
    }
    if (this.isEditMode && this.selected) {
      this.api
        .update(this.selected.id, {
          tenKieuDang: this.newItem.name,
          moTa: this.newItem.description,
          trangThai: this.newItem.status,
        })
        .subscribe({
          next: () => {
            this.fetch(0);
            this.closeModal();
          },
          error: () => console.error('Cập nhật thất bại'),
        });
    } else {
      this.api
        .create({
          tenKieuDang: this.newItem.name,
          moTa: this.newItem.description,
          trangThai: this.newItem.status,
        })
        .subscribe({
          next: () => {
            this.fetch(0);
            this.closeModal();
          },
          error: () => console.error('Thêm mới thất bại'),
        });
    }
  }

  delete(i: HelmetStyleVM) {
    this.itemToDelete = i;
    this.showDeleteModal = true;
  }
  confirmDelete() {
    if (!this.itemToDelete) return;
    this.api.delete(this.itemToDelete.id).subscribe({
      next: () => {
        this.fetch(0);
        this.closeDeleteModal();
      },
      error: () => console.error('Xóa thất bại'),
    });
  }
  closeDeleteModal() {
    this.showDeleteModal = false;
    this.itemToDelete = null;
  }

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

  changePageSize(size: number) {
    this.pageSize = size;
    this.fetch(0);
  }

  onPageSizeChange(event: any) {
    this.pageSize = event.target.value;
    this.fetch(0);
  }

  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.fetch(page);
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, this.currentPage + 1 - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  prevPage() {
    if (this.currentPage > 0) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.goToPage(this.currentPage + 1);
    }
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
          !this.newItem.name?.trim() ||
          this.newItem.name.trim().length < 2 ||
          this.newItem.name.trim().length > 100
        );
      case 'description':
        return !!(this.newItem.description?.trim() && this.newItem.description.trim().length > 500);
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
        if (!this.newItem.name?.trim()) return 'Tên kiểu dáng không được để trống';
        if (this.newItem.name.trim().length < 2) return 'Tên kiểu dáng phải có ít nhất 2 ký tự';
        if (this.newItem.name.trim().length > 100)
          return 'Tên kiểu dáng không được vượt quá 100 ký tự';
        break;
      case 'description':
        return 'Mô tả không được vượt quá 500 ký tự';
    }
    return null;
  }

  resetTouchedFields() {
    this.touchedFields.clear();
  }
}
