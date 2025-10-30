import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SizeApiService, SizeResponse, PageResponse } from '../../services/size-api.service';

interface SizeVM {
  id: number;
  name: string;
  description?: string;
  status: boolean;
}

@Component({
  selector: 'app-sizes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sizes.component.html',
  styleUrls: ['./sizes.component.scss'],
})
export class SizesComponent implements OnInit {
  items: SizeVM[] = [];
  filtered: SizeVM[] = [];
  searchTerm = '';
  selectedStatus = 'all';
  showModal = false;
  isEditMode = false;
  isViewMode = false;
  selected: SizeVM | null = null;
  newItem: SizeVM = { id: 0, name: '', description: '', status: true };
  showDeleteModal = false;
  itemToDelete: SizeVM | null = null;
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;
  sort = 'id,desc';

  // Track which fields have been touched by user
  touchedFields: Set<string> = new Set();

  constructor(private api: SizeApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.fetch();
  }

  fetch(page: number = 0) {
    this.api
      .search({ keyword: this.searchTerm || undefined, page, size: this.pageSize, sort: this.sort })
      .subscribe((res: PageResponse<SizeResponse>) => {
        this.items = res.content.map((s) => ({
          id: s.id,
          name: s.tenKichThuoc,
          description: s.moTa,
          status: !!s.trangThai,
        }));
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
  openAddModal() {
    this.isEditMode = false;
    this.isViewMode = false;
    this.selected = null;
    this.newItem = { id: 0, name: '', description: '', status: true };
    this.resetTouchedFields();
    this.showModal = true;
  }
  openEditModal(i: SizeVM) {
    this.isEditMode = true;
    this.isViewMode = false;
    this.selected = i;
    this.newItem = { ...i };
    this.resetTouchedFields();
    this.showModal = true;
  }
  view(i: SizeVM) {
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

    // Kiểm tra tên kích thước
    if (!this.newItem.name?.trim()) {
      validationErrors.push('Tên kích thước không được để trống');
    } else if (this.newItem.name.trim().length < 2) {
      validationErrors.push('Tên kích thước phải có ít nhất 2 ký tự');
    } else if (this.newItem.name.trim().length > 100) {
      validationErrors.push('Tên kích thước không được vượt quá 100 ký tự');
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
          tenKichThuoc: this.newItem.name,
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
          tenKichThuoc: this.newItem.name,
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

  delete(i: SizeVM) {
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

  setSort(field: 'tenKichThuoc' | 'trangThai') {
    const [f, d] = this.sort.split(',');
    const nextDir = f === field && d === 'asc' ? 'desc' : 'asc';
    this.sort = `${field},${nextDir}`;
    this.fetch(0);
  }
  getSortSymbol(field: 'tenKichThuoc' | 'trangThai') {
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
        if (!this.newItem.name?.trim()) return 'Tên kích thước không được để trống';
        if (this.newItem.name.trim().length < 2) return 'Tên kích thước phải có ít nhất 2 ký tự';
        if (this.newItem.name.trim().length > 100)
          return 'Tên kích thước không được vượt quá 100 ký tự';
        break;
      case 'description':
        return 'Mô tả không được vượt quá 500 ký tự';
    }
    return null;
  }

  resetTouchedFields() {
    this.touchedFields.clear();
  }

  // New methods for the updated UI
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

    // Apply search filter
    if (this.searchTerm?.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          (item.description && item.description.toLowerCase().includes(term))
      );
    }

    // Apply status filter
    if (this.selectedStatus !== 'all') {
      const status = this.selectedStatus === 'true';
      filtered = filtered.filter((item) => item.status === status);
    }

    this.filtered = filtered;
  }

  onPageSizeChange(event: any) {
    this.pageSize = parseInt(event.target.value);
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
    const startPage = Math.max(0, this.currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(this.totalPages - 1, startPage + maxVisiblePages - 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i + 1);
    }
    return pages;
  }

  // Add Math object for template
  Math = Math;
}
