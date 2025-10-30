import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ManufacturerApiService,
  ManufacturerResponse,
  PageResponse,
} from '../../services/manufacturer-api.service';

interface Manufacturer {
  id: number;
  name: string;
  description: string;
  status: boolean;
  country?: string;
}

@Component({
  selector: 'app-manufacturers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manufacturers.component.html',
  styleUrls: ['./manufacturers.component.scss'],
})
export class ManufacturersComponent implements OnInit {
  manufacturers: Manufacturer[] = [];
  filteredManufacturers: Manufacturer[] = [];
  searchTerm: string = '';
  selectedStatus: string = 'all';
  // Paging & sorting
  currentPage: number = 0;
  pageSize: number = 10;
  totalPages: number = 0;
  totalElements: number = 0;
  sort: string = 'id,desc';
  showModal: boolean = false;
  isEditMode: boolean = false;
  isViewMode: boolean = false;
  selectedManufacturer: Manufacturer | null = null;
  showDeleteModal: boolean = false;
  manufacturerToDelete: Manufacturer | null = null;
  newManufacturer: Manufacturer = {
    id: 0,
    name: '',
    description: '',
    status: true,
  };

  // Track which fields have been touched by user
  touchedFields: Set<string> = new Set();

  constructor(private manufacturerApi: ManufacturerApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.fetchManufacturers();
  }

  fetchManufacturers(page: number = 0) {
    const statusFilter = this.selectedStatus === 'all' ? undefined : this.selectedStatus === 'true';
    this.manufacturerApi
      .search({
        keyword: this.searchTerm || undefined,
        trangThai: statusFilter,
        page,
        size: this.pageSize,
        sort: this.sort,
      })
      .subscribe((res: PageResponse<ManufacturerResponse>) => {
        this.manufacturers = res.content.map((m) => ({
          id: m.id,
          name: m.ten,
          description: m.moTa || '',
          status: !!m.trangThai,
          country: m.quocGia || '-',
        }));
        this.filteredManufacturers = [...this.manufacturers];
        this.totalPages = res.totalPages;
        this.totalElements = res.totalElements;
        this.currentPage = res.number;
        // Zoneless change detection: trigger view update after async work
        this.cdr.detectChanges();
      });
  }

  // legacy sample left empty after switch to BE

  filterManufacturers() {
    this.filteredManufacturers = this.manufacturers.filter((manufacturer) => {
      const matchesSearch =
        manufacturer.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        manufacturer.description.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchesSearch;
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
    this.currentPage = 0;
    this.fetchManufacturers(0);
  }

  onPageSizeChange(event: any) {
    this.pageSize = event;
    this.currentPage = 0;
    this.fetchManufacturers(0);
  }

  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.fetchManufacturers(page);
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

  closeModal() {
    this.showModal = false;
    this.selectedManufacturer = null;
    this.isEditMode = false;
    this.isViewMode = false;
  }

  saveManufacturer() {
    // Mark all fields as touched when user tries to submit
    this.touchedFields.add('name');
    this.touchedFields.add('country');
    this.touchedFields.add('description');

    // Validation chi tiết
    const validationErrors: string[] = [];

    // Kiểm tra tên nhà sản xuất
    if (!this.newManufacturer.name?.trim()) {
      validationErrors.push('Tên nhà sản xuất không được để trống');
    } else if (this.newManufacturer.name.trim().length < 2) {
      validationErrors.push('Tên nhà sản xuất phải có ít nhất 2 ký tự');
    } else if (this.newManufacturer.name.trim().length > 100) {
      validationErrors.push('Tên nhà sản xuất không được vượt quá 100 ký tự');
    }

    // Kiểm tra quốc gia (bắt buộc)
    if (!this.newManufacturer.country?.trim()) {
      validationErrors.push('Quốc gia không được để trống');
    } else if (this.newManufacturer.country.trim().length < 2) {
      validationErrors.push('Tên quốc gia phải có ít nhất 2 ký tự');
    } else if (this.newManufacturer.country.trim().length > 50) {
      validationErrors.push('Tên quốc gia không được vượt quá 50 ký tự');
    }

    // Kiểm tra mô tả (nếu có)
    if (
      this.newManufacturer.description?.trim() &&
      this.newManufacturer.description.trim().length > 500
    ) {
      validationErrors.push('Mô tả không được vượt quá 500 ký tự');
    }

    // Hiển thị lỗi nếu có
    if (validationErrors.length > 0) {
      // Không hiển thị alert, chỉ mark fields as touched để hiển thị validation errors
      return;
    }

    if (this.isEditMode && this.selectedManufacturer) {
      this.manufacturerApi
        .update(this.selectedManufacturer.id, {
          ten: this.newManufacturer.name,
          moTa: this.newManufacturer.description,
          trangThai: this.newManufacturer.status,
          quocGia: this.newManufacturer.country,
        })
        .subscribe({
          next: () => {
            this.fetchManufacturers(0);
            this.closeModal();
          },
          error: (err) => {
            console.error(err);
            console.error('Cập nhật nhà sản xuất thất bại.');
          },
        });
    } else {
      // Gọi API BE tạo mới và refresh danh sách
      this.manufacturerApi
        .create({
          ten: this.newManufacturer.name,
          moTa: this.newManufacturer.description,
          trangThai: this.newManufacturer.status,
          quocGia: this.newManufacturer.country,
        })
        .subscribe({
          next: () => {
            this.fetchManufacturers(0);
            this.closeModal();
          },
          error: (err) => {
            console.error(err);
            console.error('Thêm nhà sản xuất thất bại.');
          },
        });
    }
  }

  deleteManufacturer(manufacturer: Manufacturer) {
    this.manufacturerToDelete = manufacturer;
    this.showDeleteModal = true;
  }

  confirmDelete() {
    if (this.manufacturerToDelete) {
      this.manufacturerApi.delete(this.manufacturerToDelete.id).subscribe({
        next: () => {
          this.fetchManufacturers(0);
        },
        error: (err) => {
          console.error(err);
          console.error('Xóa nhà sản xuất thất bại.');
        },
      });
    }
    this.closeDeleteModal();
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.manufacturerToDelete = null;
  }

  viewManufacturer(manufacturer: Manufacturer) {
    this.isViewMode = true;
    this.isEditMode = false;
    this.selectedManufacturer = manufacturer;
    this.newManufacturer = { ...manufacturer };
    this.showModal = true;
  }

  openAddModal() {
    this.isEditMode = false;
    this.isViewMode = false;
    this.selectedManufacturer = null;
    this.newManufacturer = {
      id: 0,
      name: '',
      description: '',
      status: true,
    };
    this.resetTouchedFields();
    this.showModal = true;
  }

  openEditModal(manufacturer: Manufacturer) {
    this.isEditMode = true;
    this.isViewMode = false;
    this.selectedManufacturer = manufacturer;
    this.newManufacturer = { ...manufacturer };
    this.resetTouchedFields();
    this.showModal = true;
  }

  // Sorting controller
  setSort(field: 'tenNhaSanXuat' | 'quocGia' | 'moTa' | 'trangThai') {
    const [currentField, direction] = this.sort.split(',');
    const nextDir = currentField === field && direction === 'asc' ? 'desc' : 'asc';
    this.sort = `${field},${nextDir}`;
    this.fetchManufacturers(0);
  }

  changePageSize(size: number) {
    this.pageSize = size;
    this.fetchManufacturers(0);
  }

  // Sort helpers for UI arrows
  private get sortParts(): [string, string] {
    const [f, d] = this.sort.split(',');
    return [f, d];
  }

  getSortSymbol(field: 'tenNhaSanXuat' | 'quocGia' | 'moTa' | 'trangThai'): string {
    const [f, d] = this.sortParts;
    if (f !== field) return '';
    return d === 'asc' ? '▲' : '▼';
  }

  getCurrentYear(): number {
    return new Date().getFullYear();
  }

  trackByManufacturerId(index: number, manufacturer: Manufacturer): number {
    return manufacturer.id;
  }

  // Add Math object for template
  Math = Math;

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
          !this.newManufacturer.name?.trim() ||
          this.newManufacturer.name.trim().length < 2 ||
          this.newManufacturer.name.trim().length > 100
        );
      case 'country':
        return (
          !this.newManufacturer.country?.trim() ||
          this.newManufacturer.country.trim().length < 2 ||
          this.newManufacturer.country.trim().length > 50
        );
      case 'description':
        return !!(
          this.newManufacturer.description?.trim() &&
          this.newManufacturer.description.trim().length > 500
        );
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
        if (!this.newManufacturer.name?.trim()) return 'Tên nhà sản xuất không được để trống';
        if (this.newManufacturer.name.trim().length < 2)
          return 'Tên nhà sản xuất phải có ít nhất 2 ký tự';
        if (this.newManufacturer.name.trim().length > 100)
          return 'Tên nhà sản xuất không được vượt quá 100 ký tự';
        break;
      case 'country':
        if (!this.newManufacturer.country?.trim()) return 'Quốc gia không được để trống';
        if (this.newManufacturer.country.trim().length < 2)
          return 'Tên quốc gia phải có ít nhất 2 ký tự';
        return 'Tên quốc gia không được vượt quá 50 ký tự';
      case 'description':
        return 'Mô tả không được vượt quá 500 ký tự';
    }
    return null;
  }

  resetTouchedFields() {
    this.touchedFields.clear();
  }
}
