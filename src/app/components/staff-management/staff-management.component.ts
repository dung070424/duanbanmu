import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { NhanVienService } from '../../services/nhan-vien.service';
import {
  NhanVien,
  NhanVienSearchParams,
  PageResponse,
  getTrangThaiText,
  getGioiTinhText,
} from '../../interfaces/nhan-vien.interface';

@Component({
  selector: 'app-staff-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './staff-management.component.html',
  styleUrls: ['./staff-management.component.scss'],
})
export class StaffManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Expose Math to template
  Math = Math;

  // Search and filter properties
  searchTerm = '';
  selectedStatus = 'all';

  // Data properties
  nhanVienList: NhanVien[] = [];
  filteredList: NhanVien[] = [];
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  loading = false;

  // Modal properties
  showModal = false;
  isEditMode = false;
  isViewMode = false;
  selectedNhanVien: NhanVien | null = null;

  // Form properties
  form: NhanVien = {
    hoTen: '',
    email: '',
    soDienThoai: '',
    soCanCuocCongDan: '',
    diaChi: '',
    gioiTinh: true,
    ngaySinh: '',
    ngayVaoLam: '',
    trangThai: true,
  };

  // Error handling
  errorMessage = '';
  fieldErrors: { [key: string]: string } = {};

  constructor(private nhanVienService: NhanVienService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadNhanVienList();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Load nhân viên list from backend
  loadNhanVienList(): void {
    this.loading = true;
    this.errorMessage = '';

    const searchParams: NhanVienSearchParams = {
      page: this.currentPage,
      size: this.pageSize,
      sortBy: 'id',
      sortDir: 'desc',
    };

    this.nhanVienService
      .searchNhanVien(searchParams)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PageResponse<NhanVien>) => {
          this.nhanVienList = response.content;
          this.filteredList = [...this.nhanVienList];
          this.totalElements = response.totalElements;
          this.totalPages = response.totalPages;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading nhân viên:', error);
          this.errorMessage = error.message || 'Có lỗi xảy ra khi tải danh sách nhân viên';
          this.loading = false;
          // Clear data on error
          this.nhanVienList = [];
          this.filteredList = [];
          this.totalElements = 0;
          this.totalPages = 0;
          this.cdr.detectChanges();
        },
      });
  }

  // Retry connection method
  retryConnection(): void {
    this.loadNhanVienList();
    this.cdr.detectChanges();
  }

  // Search and filter methods
  onFilterChange(): void {
    this.currentPage = 0;
    this.performSearch();
  }

  performSearch(): void {
    this.loading = true;
    this.errorMessage = '';

    const searchParams: NhanVienSearchParams = {
      page: this.currentPage,
      size: this.pageSize,
      sortBy: 'id',
      sortDir: 'desc',
    };

    // Add search filters
    if (this.searchTerm.trim()) {
      const keyword = this.searchTerm.trim();
      const lower = keyword.toLowerCase();
      const isEmail = /@/.test(keyword);
      const isPhone = /^[0-9]{9,11}$/.test(keyword);
      const isCccd = /^[0-9]{12}$/.test(keyword);
      const isMaNV = /^nv\d+$/i.test(keyword);

      if (isMaNV) {
        searchParams.maNhanVien = keyword.toUpperCase();
      } else if (isEmail) {
        searchParams.email = lower;
      } else if (isPhone) {
        searchParams.soDienThoai = keyword;
      } else if (!isCccd) {
        // CCCD chưa có API filter riêng; giữ lại lọc FE
        searchParams.hoTen = keyword;
      }
    }

    if (this.selectedStatus !== 'all') {
      searchParams.trangThai = this.selectedStatus === 'Hoạt động';
    }

    this.nhanVienService
      .searchNhanVien(searchParams)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PageResponse<NhanVien>) => {
          this.nhanVienList = response.content;
          // Lọc lại trên FE để đảm bảo tìm kiếm hoạt động ổn định và cả trạng thái
          if (this.searchTerm.trim()) {
            const q = this.normalizeText(this.searchTerm.trim());
            this.filteredList = this.nhanVienList.filter((nv) => {
              const fields = [
                (nv.maNhanVien || '').toLowerCase(),
                this.normalizeText(nv.hoTen),
                (nv.email || '').toLowerCase(),
                (nv.soDienThoai || '').toLowerCase(),
                (nv.soCanCuocCongDan || '').toLowerCase(),
              ];
              const textMatch = fields.some((v) => v.includes(q));
              const statusMatch =
                this.selectedStatus === 'all' ||
                (this.selectedStatus === 'Hoạt động' ? nv.trangThai : !nv.trangThai);
              return textMatch && statusMatch;
            });
          } else {
            this.filteredList = [...this.nhanVienList];
          }
          this.totalElements = response.totalElements;
          this.totalPages = response.totalPages;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error searching nhân viên:', error);
          this.errorMessage = error.message || 'Có lỗi xảy ra khi tìm kiếm';
          this.loading = false;
          // Clear data on error
          this.nhanVienList = [];
          this.filteredList = [];
          this.totalElements = 0;
          this.totalPages = 0;
          this.cdr.detectChanges();
        },
      });
  }

  // Pagination
  onPageChange(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.performSearch();
    }
  }

  onPageSizeChange(event: any): void {
    this.pageSize = parseInt(event.target.value);
    this.currentPage = 0;
    this.performSearch();
  }

  getPageNumbers(): number[] {
    const maxPagesToShow = 5;
    const pages: number[] = [];

    if (this.totalPages <= maxPagesToShow) {
      // Show all pages if total is less than max
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show current page and surrounding pages
      let startPage = Math.max(1, this.currentPage - 1);
      let endPage = Math.min(this.totalPages, this.currentPage + 3);

      // Adjust if we're near the beginning
      if (this.currentPage <= 2) {
        endPage = Math.min(this.totalPages, maxPagesToShow);
      }

      // Adjust if we're near the end
      if (this.currentPage >= this.totalPages - 2) {
        startPage = Math.max(1, this.totalPages - maxPagesToShow + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages;
  }

  resetFilter(): void {
    this.searchTerm = '';
    this.selectedStatus = 'all';
    this.currentPage = 0;
    this.loadNhanVienList();
  }

  // Modal methods
  openAdd(): void {
    this.isEditMode = false;
    this.isViewMode = false;
    this.selectedNhanVien = null;
    this.resetForm();
    // Auto-generate employee code on opening Add modal
    this.nhanVienService
      .generateMaNhanVien()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (code: string) => {
          this.form.maNhanVien = code;
          this.cdr.detectChanges();
        },
        error: () => {
          // Fallback: default prefix if API fails
          this.form.maNhanVien = this.form.maNhanVien || 'NV001';
          this.cdr.detectChanges();
        },
      });
    this.showModal = true;
  }

  openEdit(nhanVien: NhanVien): void {
    this.isEditMode = true;
    this.isViewMode = false;
    this.selectedNhanVien = nhanVien;
    this.form = { ...nhanVien };
    this.showModal = true;
  }

  view(nhanVien: NhanVien): void {
    this.isEditMode = false;
    this.isViewMode = true;
    this.selectedNhanVien = nhanVien;
    this.form = { ...nhanVien };
    this.showModal = true;
  }

  close(): void {
    this.showModal = false;
    this.isEditMode = false;
    this.isViewMode = false;
    this.selectedNhanVien = null;
    this.errorMessage = '';
    this.clearFieldErrors();
  }

  // Form methods
  resetForm(): void {
    this.form = {
      maNhanVien: '',
      hoTen: '',
      email: '',
      soDienThoai: '',
      soCanCuocCongDan: '',
      diaChi: '',
      gioiTinh: true,
      ngaySinh: '',
      ngayVaoLam: '',
      trangThai: true,
    };
  }

  save(): void {
    // Clear previous errors
    this.clearFieldErrors();
    this.errorMessage = '';

    // Validate all fields
    if (!this.isFormValid()) {
      this.errorMessage = 'Vui lòng kiểm tra lại thông tin đã nhập';
      return;
    }

    this.loading = true;

    const saveOperation =
      this.isEditMode && this.selectedNhanVien?.id
        ? this.nhanVienService.updateNhanVien(this.selectedNhanVien.id, this.form)
        : this.nhanVienService.createNhanVien(this.form);

    saveOperation.pipe(takeUntil(this.destroy$)).subscribe({
      next: (nhanVien) => {
        this.loadNhanVienList();
        this.close();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = error.message || 'Có lỗi xảy ra khi lưu nhân viên';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  remove(nhanVien: NhanVien): void {
    if (!nhanVien.id) return;

    if (
      confirm(
        `Bạn có chắc chắn muốn xóa vĩnh viễn nhân viên ${nhanVien.hoTen}?\n\nHành động này không thể hoàn tác!`
      )
    ) {
      this.loading = true;
      this.errorMessage = '';

      this.nhanVienService
        .permanentlyDeleteNhanVien(nhanVien.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadNhanVienList();
            this.cdr.detectChanges();
          },
          error: (error) => {
            this.errorMessage = error.message || 'Có lỗi xảy ra khi xóa nhân viên';
            this.loading = false;
            this.cdr.detectChanges();
          },
        });
    }
  }

  // Utility methods
  statusClass(trangThai: boolean | undefined): string {
    if (trangThai === undefined) return 'badge-locked';
    return trangThai ? 'badge-active' : 'badge-locked';
  }

  getTrangThaiText(trangThai: boolean | undefined): string {
    return getTrangThaiText(trangThai);
  }

  getGioiTinhText(gioiTinh: boolean | undefined): string {
    return getGioiTinhText(gioiTinh);
  }

  // Helper function to format date for display
  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'Chưa có';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN');
    } catch {
      return 'Chưa có';
    }
  }

  // Helper function to truncate text for display
  truncateText(text: string | undefined, maxLength: number = 50): string {
    if (!text) return 'Chưa có';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  // Normalize text for diacritics-insensitive comparison
  private normalizeText(input: string | undefined): string {
    if (!input) return '';
    return input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  // Validation methods
  validateField(fieldName: string): void {
    this.fieldErrors[fieldName] = '';

    switch (fieldName) {
      case 'hoTen':
        if (!this.form.hoTen || this.form.hoTen.trim() === '') {
          this.fieldErrors[fieldName] = 'Vui lòng nhập họ tên.';
        } else if (this.form.hoTen.trim().length < 2) {
          this.fieldErrors[fieldName] = 'Họ tên phải có ít nhất 2 ký tự.';
        }
        break;

      case 'maNhanVien':
        if (this.form.maNhanVien && this.form.maNhanVien.trim() !== '') {
          const maNhanVienPattern = /^NV\d{3,}$/;
          if (!maNhanVienPattern.test(this.form.maNhanVien.trim())) {
            this.fieldErrors[fieldName] = 'Mã nhân viên phải có định dạng NV001, NV002...';
          }
        }
        break;

      case 'email':
        if (!this.form.email || this.form.email.trim() === '') {
          this.fieldErrors[fieldName] = 'Vui lòng nhập email.';
        } else {
          const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailPattern.test(this.form.email.trim())) {
            this.fieldErrors[fieldName] = 'Vui lòng nhập email hợp lệ.';
          }
        }
        break;

      case 'soDienThoai':
        if (!this.form.soDienThoai || this.form.soDienThoai.trim() === '') {
          this.fieldErrors[fieldName] = 'Vui lòng nhập số điện thoại.';
        } else {
          const phonePattern = /^[0-9]{10,11}$/;
          if (!phonePattern.test(this.form.soDienThoai.trim())) {
            this.fieldErrors[fieldName] = 'Số điện thoại phải có 10-11 chữ số.';
          }
        }
        break;
    }

    this.cdr.detectChanges();
  }

  // Clear all field errors
  clearFieldErrors(): void {
    this.fieldErrors = {};
  }

  // Check if form is valid
  isFormValid(): boolean {
    this.validateField('hoTen');
    this.validateField('email');
    this.validateField('soDienThoai');
    if (this.form.maNhanVien && this.form.maNhanVien.trim() !== '') {
      this.validateField('maNhanVien');
    }
    return Object.keys(this.fieldErrors).every((key) => !this.fieldErrors[key]);
  }
}
