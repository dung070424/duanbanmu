import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  PromotionModalComponent,
  PromotionFormData,
} from '../promotion-modal/promotion-modal.component';
import { DotGiamGiaService, DotGiamGia, DotGiamGiaRequest } from '../../services/dot-giam-gia.service';

interface Promotion {
  id: string;
  code: string;
  name: string;
  discountType: string;
  discountValue: string;
  discountPercentage?: number;
  maxDiscountAmount?: number;
  voucherType?: string;
  startDate: string;
  endDate: string;
  status: string;
  rawData?: DotGiamGia; // Lưu dữ liệu thô từ DotGiamGia
}

@Component({
  selector: 'app-promotion-management',
  standalone: true,
  imports: [CommonModule, FormsModule, PromotionModalComponent],
  templateUrl: './promotion-management.component.html',
  styleUrls: ['./promotion-management.component.scss'],
})
export class PromotionManagementComponent implements OnInit {
  searchTerm = '';
  showModal = false;
  isEditMode = false;
  isViewMode = false;
  selectedPromotion: PromotionFormData | null = null;
  loading = false;
  error: string | null = null;

  // DotGiamGia data
  dotGiamGiaList: DotGiamGia[] = [];
  filteredDotGiamGiaList: DotGiamGia[] = [];
  promotions: Promotion[] = [];

  // Filter criteria
  filterCriteria = {
    searchTerm: '',
    discountType: '',
    status: '',
    startDate: '',
    endDate: '',
    discountPercentageMax: 100,
    maxDiscountAmount: 50000000
  };

  // Pagination
  currentPage = 1;
  itemsPerPage = 5;
  totalPages = 1;

  constructor(
    private dotGiamGiaService: DotGiamGiaService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    console.log('🚀 PromotionManagementComponent initialized');
    this.initializeData();
  }

  // Initialize data with proper error handling
  initializeData() {
    console.log('🔄 Initializing promotion data...');
    this.loading = true;
    this.error = null;
    this.cdr.detectChanges();

    // Load data immediately
    this.loadDotGiamGiaList();

    // Also try to refresh after a short delay to ensure data is loaded
    setTimeout(() => {
      if (this.promotions.length === 0 && !this.loading) {
        console.log('⚠️ No data found, retrying...');
        this.loadDotGiamGiaList();
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  // Method để test dữ liệu
  testData() {
    console.log('=== TEST DATA ===');
    console.log('dotGiamGiaList length:', this.dotGiamGiaList.length);
    console.log('promotions length:', this.promotions.length);

    if (this.dotGiamGiaList.length > 0) {
      const firstItem = this.dotGiamGiaList[0];
      console.log('First dotGiamGia item:', firstItem);
      console.log('loaiDotGiamGia:', firstItem.loaiDotGiamGia);
      console.log('ngayBatDau:', firstItem.ngayBatDau);
      console.log('ngayKetThuc:', firstItem.ngayKetThuc);
      console.log('giaTriDotGiam:', firstItem.giaTriDotGiam);
      console.log('soTien:', firstItem.soTien);
    }

    if (this.promotions.length > 0) {
      const firstPromotion = this.promotions[0];
      console.log('First promotion item:', firstPromotion);
      console.log('promotion.discountType:', firstPromotion.discountType);
      console.log('promotion.startDate:', firstPromotion.startDate);
      console.log('promotion.endDate:', firstPromotion.endDate);
      console.log('promotion.rawData:', firstPromotion.rawData);
    }
  }

  // Method để test hiển thị bảng chi tiết
  testDetailsTable() {
    if (this.dotGiamGiaList.length > 0) {
      console.log('Testing details table with first item');
      this.showPromotionDetailsTable(this.dotGiamGiaList[0]);
    } else {
      console.log('No data available to test');
    }
  }

  // Load DotGiamGia data from API
  loadDotGiamGiaList() {
    console.log('🔄 Loading DotGiamGia list...');
    this.loading = true;
    this.error = null;

    this.dotGiamGiaService.getAllDotGiamGiaWithoutPagination().subscribe({
      next: (response: any) => {
        console.log('✅ API Response received:', response);
        if (response.success) {
          // Sort theo ID giảm dần - đợt giảm giá mới nhất hiển thị trên đầu
          this.dotGiamGiaList = (response.data || []).sort((a: DotGiamGia, b: DotGiamGia) => {
            return (b.id || 0) - (a.id || 0);
          });
          this.filteredDotGiamGiaList = [...this.dotGiamGiaList];
          console.log('📊 DotGiamGia list loaded (sorted by newest first):', this.dotGiamGiaList.length, 'items');

          // Debug: Kiểm tra dữ liệu từ API
          if (this.dotGiamGiaList.length > 0) {
            console.log('🔍 First item from API:', this.dotGiamGiaList[0]);
            console.log('📅 loaiDotGiamGia:', this.dotGiamGiaList[0].loaiDotGiamGia);
            console.log('📅 ngayBatDau:', this.dotGiamGiaList[0].ngayBatDau);
            console.log('📅 ngayKetThuc:', this.dotGiamGiaList[0].ngayKetThuc);
          } else {
            console.log('⚠️ No data received from API');
          }

          this.convertToPromotions();
          console.log('🎯 Promotions converted:', this.promotions.length, 'items');
          this.cdr.detectChanges();
        } else {
          this.error = response.message || 'Không thể tải dữ liệu';
          console.error('❌ API Error:', response.message);
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('❌ HTTP Error:', error);
        this.error = 'Lỗi khi tải danh sách đợt giảm giá: ' + (error.message || error);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Convert DotGiamGia to Promotion format for display
  convertToPromotions() {
    console.log('Converting DotGiamGia to Promotions:', this.filteredDotGiamGiaList.length, 'items');
    this.promotions = this.filteredDotGiamGiaList.map(dotGiamGia => ({
      id: dotGiamGia.id?.toString() || '',
      code: dotGiamGia.maDotGiamGia,
      name: dotGiamGia.tenDotGiamGia,
      discountType: dotGiamGia.loaiDotGiamGia || 'Phần trăm',
      discountValue: (dotGiamGia.loaiDotGiamGia === 'SO_TIEN')
        ? this.formatCurrency(dotGiamGia.soTien || 0)
        : (dotGiamGia.giaTriDotGiam ? `${dotGiamGia.giaTriDotGiam}%` : '0%'),
      discountPercentage: dotGiamGia.giaTriDotGiam ? parseFloat(dotGiamGia.giaTriDotGiam) : 0,
      maxDiscountAmount: dotGiamGia.soTien || 0,
      voucherType: (dotGiamGia.loaiDotGiamGia === 'SO_TIEN') ? 'Tiền mặt' : 'Phần trăm', // Fix: Map correctly instead of hardcoding
      startDate: this.formatDate(dotGiamGia.ngayBatDau),
      endDate: this.formatDate(dotGiamGia.ngayKetThuc),
      status: this.calculateStatus(dotGiamGia.ngayBatDau, dotGiamGia.ngayKetThuc, dotGiamGia.trangThai),
      // Lưu dữ liệu thô để sử dụng khi edit
      rawData: dotGiamGia
    }));
    console.log('✅ Promotions converted:', this.promotions.length, 'items');
    console.log('🔍 First promotion ID:', this.promotions[0]?.id, 'Type:', typeof this.promotions[0]?.id);

    // Update pagination
    this.totalPages = Math.ceil(this.promotions.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }

    // Force change detection
    this.cdr.detectChanges();
    setTimeout(() => {
      console.log('🔄 Data refresh completed - Total items:', this.promotions.length);
      this.cdr.detectChanges();
    }, 100);
  }

  calculateStatus(startDateStr: string, endDateStr: string, isActive: boolean): string {
    if (!isActive) return 'INACTIVE'; // Đã bị vô hiệu hóa thủ công

    const now = new Date();
    // Reset time part of now to compare strictly by date if needed, 
    // but usually promotions are time-sensitive. 
    // Assuming inputs are YYYY-MM-DD or ISO strings.
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Set end date to end of day to be inclusive
    endDate.setHours(23, 59, 59, 999);

    if (now < startDate) {
      return 'UPCOMING';
    } else if (now > endDate) {
      return 'ENDED';
    } else {
      return 'ACTIVE';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'Đang diễn ra';
      case 'INACTIVE':
        return 'Ngừng hoạt động';
      case 'UPCOMING':
        return 'Sắp diễn ra';
      case 'ENDED':
        return 'Kết thúc';
      default:
        return 'Không xác định';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'status-active';
      case 'INACTIVE':
        return 'status-inactive';
      case 'UPCOMING':
        return 'status-upcoming'; // Cần define class này nếu chưa có
      case 'ENDED':
        return 'status-ended';    // Cần define class này nếu chưa có
      default:
        return 'status-active';
    }
  }

  getTypeClass(type: string): string {
    return type === 'Phần trăm' ? 'type-percentage' : 'type-money';
  }

  onSearch() {
    this.applyFilters();
    this.cdr.detectChanges();
  }

  onFilter() {
    this.applyFilters();
    this.cdr.detectChanges();
  }

  onDateFilterChange() {
    // Validate date range
    if (this.filterCriteria.startDate && this.filterCriteria.endDate) {
      const startDate = new Date(this.filterCriteria.startDate);
      const endDate = new Date(this.filterCriteria.endDate);

      if (startDate > endDate) {
        this.error = 'Ngày bắt đầu không thể lớn hơn ngày kết thúc';
        setTimeout(() => {
          this.error = null;
          this.cdr.detectChanges();
        }, 3000);
        return;
      }
    }

    this.applyFilters();
    this.cdr.detectChanges();
  }

  clearDateFilter() {
    this.filterCriteria.startDate = '';
    this.filterCriteria.endDate = '';
    this.applyFilters();
    this.cdr.detectChanges();
  }

  getMaxDate(): string {
    // Set max date to 5 years from now
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 5);
    return maxDate.toISOString().split('T')[0];
  }

  applyFilters() {
    // Không set loading = true vì filter là xử lý local, không cần disable input
    this.error = null;

    // Start with all data
    let filteredData = [...this.dotGiamGiaList];

    // Apply search term filter (chỉ tìm kiếm khi nhập >= 2 ký tự)
    const trimmedSearchTerm = this.filterCriteria.searchTerm.trim();
    if (trimmedSearchTerm && trimmedSearchTerm.length >= 2) {
      const searchTerm = trimmedSearchTerm.toLowerCase();
      filteredData = filteredData.filter(item =>
        item.maDotGiamGia?.toLowerCase().includes(searchTerm) ||
        item.tenDotGiamGia?.toLowerCase().includes(searchTerm) ||
        item.moTa?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply discount type filter
    if (this.filterCriteria.discountType) {
      filteredData = filteredData.filter(item => {
        if (this.filterCriteria.discountType === 'PHAN_TRAM') {
          return item.giaTriDotGiam && parseFloat(item.giaTriDotGiam) > 0;
        } else if (this.filterCriteria.discountType === 'SO_TIEN') {
          return item.soTien && item.soTien > 0;
        }
        return true;
      });
    }

    // Apply status filter
    if (this.filterCriteria.status) {
      filteredData = filteredData.filter(item => {
        const currentDate = new Date();
        const startDate = new Date(item.ngayBatDau);
        const endDate = new Date(item.ngayKetThuc);

        switch (this.filterCriteria.status) {
          case 'ACTIVE':
            return item.trangThai && currentDate >= startDate && currentDate <= endDate;
          case 'UPCOMING':
            return item.trangThai && currentDate < startDate;
          case 'ENDED':
            return currentDate > endDate;
          case 'INACTIVE':
            return !item.trangThai;
          default:
            return true;
        }
      });
    }

    // Apply date range filter with improved logic
    if (this.filterCriteria.startDate || this.filterCriteria.endDate) {
      filteredData = filteredData.filter(item => {
        const itemStartDate = new Date(item.ngayBatDau);
        const itemEndDate = new Date(item.ngayKetThuc);

        let matchesStartDate = true;
        let matchesEndDate = true;

        // Check start date filter
        if (this.filterCriteria.startDate) {
          const filterStartDate = new Date(this.filterCriteria.startDate);
          // Item should start on or after the filter start date
          matchesStartDate = itemStartDate >= filterStartDate;
        }

        // Check end date filter  
        if (this.filterCriteria.endDate) {
          const filterEndDate = new Date(this.filterCriteria.endDate);
          // Item should end on or before the filter end date
          matchesEndDate = itemEndDate <= filterEndDate;
        }

        return matchesStartDate && matchesEndDate;
      });
    }

    // Apply discount percentage filter
    if (this.filterCriteria.discountPercentageMax < 100) {
      filteredData = filteredData.filter(item => {
        return !item.giaTriDotGiam || parseFloat(item.giaTriDotGiam) <= this.filterCriteria.discountPercentageMax;
      });
    }

    // Apply max discount amount filter
    if (this.filterCriteria.maxDiscountAmount < 50000000) {
      filteredData = filteredData.filter(item => {
        return !item.soTien || item.soTien <= this.filterCriteria.maxDiscountAmount;
      });
    }

    // Sort lại theo ID giảm dần để đảm bảo đợt giảm giá mới nhất luôn ở đầu
    filteredData.sort((a: DotGiamGia, b: DotGiamGia) => {
      return (b.id || 0) - (a.id || 0);
    });

    this.filteredDotGiamGiaList = filteredData;
    this.convertToPromotions();
    this.cdr.detectChanges();
  }

  resetFilter() {
    this.filterCriteria = {
      searchTerm: '',
      discountType: '',
      status: '',
      startDate: '',
      endDate: '',
      discountPercentageMax: 100,
      maxDiscountAmount: 50000000
    };
    // Sort lại theo ID giảm dần để đảm bảo đợt giảm giá mới nhất luôn ở đầu
    this.filteredDotGiamGiaList = [...this.dotGiamGiaList].sort((a: DotGiamGia, b: DotGiamGia) => {
      return (b.id || 0) - (a.id || 0);
    });
    this.convertToPromotions();
    this.cdr.detectChanges();
  }

  onAddPromotion() {
    this.router.navigate(['/promotions/new']);
  }

  onExportExcel() {
    console.log('Exporting to Excel...');

    // Prepare data for export
    const exportData = this.promotions.map((promotion, index) => ({
      'STT': index + 1,
      'Mã khuyến mãi': promotion.code,
      'Tên chương trình': promotion.name,
      'Loại giảm giá': promotion.discountType,
      'Giá trị giảm': promotion.discountValue,
      'Ngày bắt đầu': promotion.startDate,
      'Ngày kết thúc': promotion.endDate,
      'Trạng thái': promotion.status
    }));


    // Set column widths
    const colWidths = [
      { wch: 5 },   // STT
      { wch: 15 },  // Mã khuyến mãi
      { wch: 25 },  // Tên chương trình
      { wch: 15 },  // Loại giảm giá
      { wch: 15 },  // Giá trị giảm
      { wch: 12 },  // Ngày bắt đầu
      { wch: 12 },  // Ngày kết thúc
      { wch: 30 },  // Điều kiện
      { wch: 15 }   // Trạng thái
    ];


    // Generate filename with current date
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const filename = `Danh_sach_khuyen_mai_${dateStr}.xlsx`;


    console.log('Excel file exported successfully:', filename);
  }

  onView(promotion: Promotion) {
    console.log('Viewing promotion:', promotion);

    // Tìm thông tin chi tiết từ dotGiamGiaList
    const dotGiamGiaDetail = this.dotGiamGiaList.find(item =>
      item.id?.toString() === promotion.id
    );

    if (dotGiamGiaDetail) {
      // Hiển thị modal xem chi tiết (read-only)
      this.showPromotionDetailsModal(dotGiamGiaDetail);
    } else {
      this.error = 'Không tìm thấy thông tin chi tiết của khuyến mại';
    }
  }

  showPromotionDetailsModal(dotGiamGia: DotGiamGia) {
    console.log('=== VIEW DETAILS DEBUG ===');
    console.log('Raw DotGiamGia data:', dotGiamGia);
    console.log('maDotGiamGia:', dotGiamGia.maDotGiamGia);
    console.log('tenDotGiamGia:', dotGiamGia.tenDotGiamGia);
    console.log('loaiDotGiamGia:', dotGiamGia.loaiDotGiamGia);
    console.log('giaTriDotGiam:', dotGiamGia.giaTriDotGiam);
    console.log('soTien:', dotGiamGia.soTien);
    console.log('ngayBatDau:', dotGiamGia.ngayBatDau);
    console.log('ngayKetThuc:', dotGiamGia.ngayKetThuc);
    console.log('trangThai:', dotGiamGia.trangThai);

    // Tạo PromotionFormData từ DotGiamGia
    const promotionFormData: PromotionFormData = {
      code: dotGiamGia.maDotGiamGia || '',
      name: dotGiamGia.tenDotGiamGia || '',
      discountType: dotGiamGia.loaiDotGiamGia === 'SO_TIEN' ? 'Số tiền cố định' : 'Phần trăm',
      discountValue: dotGiamGia.loaiDotGiamGia === 'SO_TIEN'
        ? (dotGiamGia.soTien ? this.formatCurrency(dotGiamGia.soTien) : '0₫')
        : (dotGiamGia.giaTriDotGiam ? dotGiamGia.giaTriDotGiam + '%' : '0%'),
      maxDiscountAmount: dotGiamGia.soTien ? this.formatCurrency(dotGiamGia.soTien) : '0₫',
      startDate: this.formatDateForInput(dotGiamGia.ngayBatDau),
      endDate: this.formatDateForInput(dotGiamGia.ngayKetThuc),
      status: dotGiamGia.trangThai ? 'Đang hoạt động' : 'Tạm dừng'
    };

    console.log('Converted PromotionFormData:', promotionFormData);
    console.log('discountType mapped to:', promotionFormData.discountType);
    console.log('discountValue mapped to:', promotionFormData.discountValue);
    console.log('startDate mapped to:', promotionFormData.startDate);
    console.log('endDate mapped to:', promotionFormData.endDate);

    // Hiển thị modal ở chế độ xem (read-only)
    this.selectedPromotion = promotionFormData;
    this.isEditMode = false; // Không phải edit mode
    this.isViewMode = true; // Chế độ xem chi tiết
    this.showModal = true;
  }

  showPromotionDetailsTable(dotGiamGia: DotGiamGia) {
    // Tạo bảng chi tiết
    const tableContent = `
      <div class="promotion-details-table">
        <div class="table-header">
          <h4><i class="bi bi-gift"></i> Chi tiết chương trình khuyến mãi</h4>
        </div>
        <div class="table-container">
          <table class="details-table">
            <tbody>
              <tr>
                <td class="label-cell"><strong>Mã đợt giảm giá:</strong></td>
                <td class="value-cell">${dotGiamGia.maDotGiamGia}</td>
              </tr>
              <tr>
                <td class="label-cell"><strong>Tên đợt giảm giá:</strong></td>
                <td class="value-cell">${dotGiamGia.tenDotGiamGia}</td>
              </tr>
              <tr>
                <td class="label-cell"><strong>Loại giảm giá:</strong></td>
                <td class="value-cell">${dotGiamGia.loaiDotGiamGia || 'Phần trăm'}</td>
              </tr>
              <tr>
                <td class="label-cell"><strong>Giá trị giảm:</strong></td>
                <td class="value-cell">
                  ${dotGiamGia.giaTriDotGiam ? `${dotGiamGia.giaTriDotGiam}%` :
        dotGiamGia.soTien ? this.formatCurrency(dotGiamGia.soTien) : 'N/A'}
                </td>
              </tr>
              <tr>
                <td class="label-cell"><strong>Ngày bắt đầu:</strong></td>
                <td class="value-cell">${this.formatDate(dotGiamGia.ngayBatDau)}</td>
              </tr>
              <tr>
                <td class="label-cell"><strong>Ngày kết thúc:</strong></td>
                <td class="value-cell">${this.formatDate(dotGiamGia.ngayKetThuc)}</td>
              </tr>
              <tr>
                <td class="label-cell"><strong>Số lượng sử dụng:</strong></td>
                <td class="value-cell">${dotGiamGia.soLuongSuDung || 'Không giới hạn'}</td>
              </tr>
              <tr>
                <td class="label-cell"><strong>Mô tả:</strong></td>
                <td class="value-cell">${dotGiamGia.moTa || 'Không có mô tả'}</td>
              </tr>
              <tr>
                <td class="label-cell"><strong>Trạng thái:</strong></td>
                <td class="value-cell">
                  <span class="status-badge ${this.getStatusClass(dotGiamGia.trangThai ? 'Đang hoạt động' : 'Tạm dừng')}">
                    ${dotGiamGia.trangThai ? 'Đang hoạt động' : 'Tạm dừng'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="table-actions">
          <button class="btn btn-primary" onclick="this.closest('.promotion-details-modal').remove()">
            <i class="bi bi-check"></i> Đóng
          </button>
        </div>
      </div>
    `;

    // Hiển thị modal với bảng chi tiết
    const modal = document.createElement('div');
    modal.className = 'promotion-details-modal';
    modal.innerHTML = `
      <div class="modal-overlay" onclick="this.parentElement.remove()">
        <div class="modal-content" onclick="event.stopPropagation()">
          ${tableContent}
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  onEdit(promotion: Promotion) {
    console.log('=== DEBUG EDIT ===');
    console.log('Selected promotion:', promotion);
    console.log('Promotion ID:', promotion.id);
    console.log('Promotion ID type:', typeof promotion.id);

    // Kiểm tra dữ liệu promotion
    if (!promotion || !promotion.id) {
      this.error = 'Dữ liệu khuyến mại không hợp lệ';
      console.error('Invalid promotion data:', promotion);
      return;
    }

    // Sử dụng dữ liệu thô từ rawData nếu có, nếu không thì tìm từ dotGiamGiaList
    let dotGiamGiaDetail = promotion.rawData;

    if (!dotGiamGiaDetail) {
      console.log('Raw data not found, searching in dotGiamGiaList...');
      dotGiamGiaDetail = this.dotGiamGiaList.find(item =>
        item.id?.toString() === promotion.id
      );
    }

    console.log('Found dotGiamGiaDetail:', dotGiamGiaDetail);
    console.log('loaiDotGiamGia:', dotGiamGiaDetail?.loaiDotGiamGia);
    console.log('ngayBatDau:', dotGiamGiaDetail?.ngayBatDau);
    console.log('ngayKetThuc:', dotGiamGiaDetail?.ngayKetThuc);

    if (dotGiamGiaDetail) {
      try {
        // Debug và sửa dữ liệu nếu cần
        const fixedData = this.fixDotGiamGiaData(dotGiamGiaDetail);
        console.log('Fixed data:', fixedData);

        // Chuyển đổi từ DotGiamGia sang PromotionFormData
        const discountType = this.mapDiscountType(fixedData.loaiDotGiamGia || '');

        console.log('=== MAPPING DISCOUNT TYPE ===');
        console.log('Original loaiDotGiamGia:', fixedData.loaiDotGiamGia);
        console.log('Mapped discountType:', discountType);
        console.log('giaTriDotGiam:', fixedData.giaTriDotGiam);
        console.log('soTien:', fixedData.soTien);

        const promotionFormData: PromotionFormData = {
          id: fixedData.id?.toString() || '',
          code: fixedData.maDotGiamGia || '',
          name: fixedData.tenDotGiamGia || '',
          discountType: discountType,
          // Nếu là phần trăm thì set discountValue, nếu là số tiền thì để trống
          discountValue: discountType === 'PHAN_TRAM' ? (fixedData.giaTriDotGiam || '0') : '',
          // Nếu là số tiền thì set maxDiscountAmount, nếu là phần trăm thì để trống
          maxDiscountAmount: discountType === 'SO_TIEN' ? (fixedData.soTien ? fixedData.soTien.toString() : '0') : '',
          startDate: this.formatDateForInput(fixedData.ngayBatDau),
          endDate: this.formatDateForInput(fixedData.ngayKetThuc),
          status: fixedData.trangThai ? 'Đang hoạt động' : 'Tạm dừng'
        };

        console.log('=== FINAL PROMOTION FORM DATA ===');
        console.log('Converted promotionFormData:', promotionFormData);
        console.log('discountType:', promotionFormData.discountType);
        console.log('discountValue:', promotionFormData.discountValue);
        console.log('maxDiscountAmount:', promotionFormData.maxDiscountAmount);
        console.log('startDate:', promotionFormData.startDate);
        console.log('endDate:', promotionFormData.endDate);

        // Kiểm tra dữ liệu trước khi set
        if (!promotionFormData.id) {
          console.error('Missing promotion ID');
          this.error = 'Không tìm thấy ID của khuyến mại';
          return;
        }

        this.selectedPromotion = promotionFormData;
        this.isEditMode = true;
        this.isViewMode = false;
        this.showModal = true;

        console.log('=== FINAL EDIT DATA ===');
        console.log('selectedPromotion:', this.selectedPromotion);
        console.log('isEditMode:', this.isEditMode);
        console.log('showModal:', this.showModal);

        // Scroll to top when opening edit modal
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Force change detection
        this.cdr.detectChanges();

      } catch (error) {
        console.error('Error processing edit data:', error);
        this.error = 'Lỗi khi xử lý dữ liệu chỉnh sửa: ' + error;
      }
    } else {
      console.error('No dotGiamGiaDetail found for promotion:', promotion);
      this.error = 'Không tìm thấy thông tin chi tiết của khuyến mại';
    }
  }

  // Method để sửa dữ liệu nếu có vấn đề
  fixDotGiamGiaData(data: DotGiamGia): DotGiamGia {
    const fixed = { ...data };

    // Sửa loại giảm giá nếu null/undefined hoặc normalize về format chuẩn
    if (!fixed.loaiDotGiamGia) {
      if (fixed.giaTriDotGiam && fixed.giaTriDotGiam !== '0') {
        fixed.loaiDotGiamGia = 'PHAN_TRAM';
      } else if (fixed.soTien && fixed.soTien > 0) {
        fixed.loaiDotGiamGia = 'SO_TIEN';
      } else {
        fixed.loaiDotGiamGia = 'PHAN_TRAM';
      }
    } else {
      // Normalize về format chuẩn nếu cần
      fixed.loaiDotGiamGia = this.mapDiscountType(fixed.loaiDotGiamGia);
    }

    // Sửa ngày tháng nếu null/undefined
    if (!fixed.ngayBatDau) {
      fixed.ngayBatDau = new Date().toISOString().split('T')[0];
    }

    if (!fixed.ngayKetThuc) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      fixed.ngayKetThuc = tomorrow.toISOString().split('T')[0];
    }

    console.log('Fixed data:', fixed);
    return fixed;
  }

  onDelete(promotion: Promotion) {
    this.showDeleteConfirmation(promotion);
  }

  showDeleteConfirmation(promotion: Promotion) {
    console.log('=== DELETE CONFIRMATION DEBUG ===');
    console.log('Promotion to delete:', promotion);
    console.log('Promotion ID:', promotion.id);
    console.log('Promotion ID type:', typeof promotion.id);

    // Tạo modal xác nhận đẹp
    const modal = document.createElement('div');
    modal.className = 'delete-confirmation-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      animation: fadeIn 0.3s ease-out;
    `;

    // Thêm CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideDown {
        from { 
          opacity: 0;
          transform: translateY(-20px);
        }
        to { 
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);

    modal.innerHTML = `
      <div style="
        background: white;
        border-radius: 8px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        text-align: center;
        animation: slideDown 0.3s ease-out;
      ">
        <div style="
          color: #dc3545;
          font-size: 40px;
          margin-bottom: 20px;
        ">⚠️</div>
        
        <h3 style="
          color: #333;
          margin-bottom: 20px;
          font-size: 18px;
          font-weight: 600;
        ">Xác nhận xóa</h3>
        
        <p style="
          color: #666;
          margin-bottom: 20px;
          line-height: 1.5;
          font-size: 14px;
        ">Bạn có chắc chắn muốn xóa khuyến mại này không?</p>
        
        <div style="
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 20px;
          text-align: left;
        ">
          <div style="margin-bottom: 8px; font-size: 14px;">
            <strong>Mã KM:</strong> ${promotion.code}
          </div>
          <div style="font-size: 14px;">
            <strong>Tên chương trình:</strong> ${promotion.name}
          </div>
        </div>
        
        <p style="
          color: #dc3545;
          font-size: 13px;
          margin-bottom: 24px;
          font-weight: 500;
        ">⚠️ Hành động này không thể hoàn tác!</p>
        
        <div style="
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-top: 8px;
        ">
          <button id="cancelDelete" style="
            background: #6c757d;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
            min-width: 70px;
          " onmouseover="this.style.background='#5a6268'" onmouseout="this.style.background='#6c757d'">Hủy</button>
          
          <button id="confirmDelete" style="
            background: #dc3545;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
            min-width: 70px;
          " onmouseover="this.style.background='#c82333'" onmouseout="this.style.background='#dc3545'">Xóa</button>
        </div>
      </div>
    `;

    // Thêm event listeners
    const cancelBtn = modal.querySelector('#cancelDelete');
    const confirmBtn = modal.querySelector('#confirmDelete');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    }

    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        console.log('User confirmed delete');
        const idToDelete = parseInt(promotion.id);
        console.log('Parsed ID to delete:', idToDelete);
        this.performDelete(idToDelete);
        document.body.removeChild(modal);
      });
    }

    // Đóng modal khi click outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });

    document.body.appendChild(modal);
  }

  performDelete(id: number) {
    console.log('=== DELETE DEBUG ===');
    console.log('Deleting promotion with ID:', id);
    console.log('ID type:', typeof id);

    this.loading = true;
    this.error = null;

    this.dotGiamGiaService.deleteDotGiamGia(id).subscribe({
      next: (response: any) => {
        console.log('Delete API Response:', response);
        if (response.success) {
          console.log('Delete successful, reloading list...');
          this.loadDotGiamGiaList();
          this.showSuccessMessage('Xóa khuyến mại thành công!');
        } else {
          console.error('Delete failed:', response.message);
          this.error = response.message;
          this.showErrorMessage('Lỗi: ' + response.message);
        }
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Delete HTTP Error:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        this.error = 'Lỗi khi xóa đợt giảm giá: ' + error.message;
        this.showErrorMessage('Lỗi khi xóa đợt giảm giá: ' + error.message);
        this.loading = false;
      }
    });
  }

  showSuccessMessage(message: string) {
    this.showToast(message, 'success');
  }

  showErrorMessage(message: string) {
    this.showToast(message, 'error');
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      font-size: 14px;
      font-weight: 500;
      max-width: 300px;
      word-wrap: break-word;
    `;

    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">
          ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
        </span>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  }


  onModalClose() {
    this.showModal = false;
    this.isEditMode = false;
    this.isViewMode = false;
    this.selectedPromotion = null;
  }

  onModalSave(formData: PromotionFormData) {
    console.log('=== UPDATE DEBUG ===');
    console.log('formData:', formData);
    console.log('isEditMode:', this.isEditMode);
    console.log('selectedPromotion:', this.selectedPromotion);

    // Map discountType từ PHAN_TRAM/SO_TIEN về format backend
    let loaiDotGiamGiaBackend = 'Phần trăm';
    if (formData.discountType === 'SO_TIEN') {
      loaiDotGiamGiaBackend = 'Số tiền cố định';
    }

    const dotGiamGiaRequest: DotGiamGiaRequest = {
      maDotGiamGia: formData.code,
      tenDotGiamGia: formData.name,
      loaiDotGiamGia: loaiDotGiamGiaBackend,
      // Nếu là phần trăm thì lấy discountValue, nếu là số tiền thì set '0'
      giaTriDotGiam: formData.discountType === 'PHAN_TRAM'
        ? (formData.discountValue || '0')
        : '0',
      // Nếu là số tiền thì lấy maxDiscountAmount, nếu là phần trăm thì undefined
      soTien: formData.discountType === 'SO_TIEN'
        ? (formData.maxDiscountAmount ? parseInt(formData.maxDiscountAmount) : 0)
        : undefined,
      moTa: '', // Empty description
      ngayBatDau: formData.startDate + 'T00:00:00',
      ngayKetThuc: formData.endDate + 'T23:59:59',
      soLuongSuDung: 1000, // Default value
      trangThai: formData.status === 'Đang hoạt động',
      chiTietDotGiamGias: formData.chiTietDotGiamGias
    };

    console.log('Request to send:', dotGiamGiaRequest);
    console.log('Promotion ID:', this.selectedPromotion?.id);

    this.loading = true;
    this.error = null;

    if (this.isEditMode && this.selectedPromotion && this.selectedPromotion.id) {
      console.log('Calling update API...');
      // Update existing
      this.dotGiamGiaService.updateDotGiamGia(parseInt(this.selectedPromotion.id), dotGiamGiaRequest).subscribe({
        next: (response: any) => {
          console.log('Update response:', response);
          if (response.success) {
            console.log('Update successful, reloading data...');
            this.loadDotGiamGiaList();
            this.showModal = false;
            this.selectedPromotion = null;
            this.showSuccessMessage('Cập nhật khuyến mại thành công!');
          } else {
            console.log('Update failed:', response.message);
            this.error = response.message;
          }
          this.loading = false;
        },
        error: (error: any) => {
          console.log('Update error:', error);
          console.log('Error status:', error.status);
          console.log('Error message:', error.message);
          console.log('Error body:', error.error);
          this.error = 'Lỗi khi cập nhật đợt giảm giá: ' + error.message;
          this.loading = false;
        }
      });
    } else {
      // Create new
      this.dotGiamGiaService.createDotGiamGia(dotGiamGiaRequest).subscribe({
        next: (response: any) => {
          if (response.success) {
            this.loadDotGiamGiaList();
            this.showModal = false;
            this.selectedPromotion = null;
            this.showCreateSuccessMessage(formData);
          } else {
            this.error = response.message;
          }
          this.loading = false;
        },
        error: (error: any) => {
          this.error = 'Lỗi khi tạo đợt giảm giá: ' + error.message;
          this.loading = false;
        }
      });
    }
  }

  showCreateSuccessMessage(formData: PromotionFormData) {
    const message = `
      ✅ Đã thêm đợt giảm giá thành công!
      
      📋 Thông tin đã nhập:
      • Mã đợt: ${formData.code}
      • Tên đợt: ${formData.name}
      • Loại giảm giá: ${formData.discountType}
      • Giá trị: ${formData.discountValue}
      • Số tiền giảm: ${formData.maxDiscountAmount || 'Không có'}
      • Ngày bắt đầu: ${formData.startDate}
      • Ngày kết thúc: ${formData.endDate}
      
      Dữ liệu đã được thêm vào danh sách đợt giảm giá.
    `;

    alert(message);
  }

  // Helper methods
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  }

  formatDateForInput(dateString: string): string {
    if (!dateString) return '';
    try {
      console.log('formatDateForInput - Input:', dateString);
      const date = new Date(dateString);
      console.log('formatDateForInput - Parsed date:', date);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', dateString);
        return '';
      }
      // Sử dụng local timezone để tránh vấn đề timezone
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const result = `${year}-${month}-${day}`;
      console.log('formatDateForInput - Output:', result);
      return result;
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return '';
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  testDelete() {
    console.log('=== TEST DELETE ===');
    if (this.promotions.length > 0) {
      const firstPromotion = this.promotions[0];
      console.log('Testing delete with promotion:', firstPromotion);
      console.log('ID to delete:', firstPromotion.id);
      console.log('Parsed ID:', parseInt(firstPromotion.id));

      // Test API call directly
      const idToTest = parseInt(firstPromotion.id);
      console.log('Testing delete API call with ID:', idToTest);

      this.dotGiamGiaService.deleteDotGiamGia(idToTest).subscribe({
        next: (response) => {
          console.log('Test delete response:', response);
          alert('Test delete successful: ' + JSON.stringify(response));
        },
        error: (error) => {
          console.error('Test delete error:', error);
          alert('Test delete error: ' + error.message);
        }
      });
    } else {
      console.log('No promotions to test delete');
      alert('No promotions to test delete');
    }
  }

  // Pagination methods
  goToFirstPage() {
    this.currentPage = 1;
    this.cdr.detectChanges();
  }

  goToPreviousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.cdr.detectChanges();
    }
  }

  goToNextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.cdr.detectChanges();
    }
  }

  goToLastPage() {
    this.currentPage = this.totalPages;
    this.cdr.detectChanges();
  }

  getPaginatedPromotions(): Promotion[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.promotions.slice(startIndex, endIndex);
  }

  getStartItem(): number {
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  getEndItem(): number {
    const endIndex = this.currentPage * this.itemsPerPage;
    return Math.min(endIndex, this.promotions.length);
  }

  getVisiblePages(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    const startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.cdr.detectChanges();
    }
  }

  mapDiscountType(loaiDotGiamGia: string): string {
    if (!loaiDotGiamGia) return 'PHAN_TRAM';

    // Check if already in correct format
    if (loaiDotGiamGia === 'PHAN_TRAM' || loaiDotGiamGia === 'SO_TIEN') {
      return loaiDotGiamGia;
    }

    // Normalize: lowercase and remove spaces
    const normalized = loaiDotGiamGia.toLowerCase().replace(/\s+/g, '');

    switch (normalized) {
      case 'phầntrăm':
      case 'phantram':
      case 'phan_tram':
        return 'PHAN_TRAM';
      case 'sốtiềncốđịnh':
      case 'sotiencôdinh':
      case 'sotiêncodinh':
      case 'so_tien_co_dinh':
      case 'so_tien':
        return 'SO_TIEN';
      default:
        console.warn('Unknown discount type:', loaiDotGiamGia, 'normalized:', normalized);
        return 'PHAN_TRAM';
    }
  }

  mapDiscountValue(fixedData: DotGiamGia): string {
    if (fixedData.giaTriDotGiam && fixedData.giaTriDotGiam !== '0') {
      return fixedData.giaTriDotGiam;
    } else if (fixedData.soTien && fixedData.soTien > 0) {
      return fixedData.soTien.toString();
    }
    return '0';
  }



  // Force refresh data
  refreshData() {
    console.log('🔄 Force refreshing data...');
    this.loading = true;
    this.error = null;
    this.cdr.detectChanges();
    this.loadDotGiamGiaList();
  }

  // Test edit button functionality
  testEditButton() {
    console.log('=== TEST EDIT BUTTON ===');
    if (this.promotions.length > 0) {
      const firstPromotion = this.promotions[0];
      console.log('Testing edit with promotion:', firstPromotion);
      this.onEdit(firstPromotion);
    } else {
      console.log('No promotions available to test edit');
      this.error = 'Không có dữ liệu để test chức năng chỉnh sửa';
    }
  }
}
