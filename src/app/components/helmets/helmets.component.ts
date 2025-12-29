import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import {
  ProductApiService,
  SanPhamResponse,
  PageResponse,
} from '../../services/product-api.service';
import { QuickAddModalComponent } from '../quick-add-modal/quick-add-modal.component';
import {
  SearchableDropdownComponent,
  DropdownOption,
} from '../searchable-dropdown/searchable-dropdown.component';
import {
  LoaiMuBaoHiemApiService,
  LoaiMuBaoHiemRequest,
} from '../../services/loai-mu-bao-hiem-api.service';
import { ColorApiService } from '../../services/color-api.service';
import { ManufacturerApiService } from '../../services/manufacturer-api.service';
import { MaterialApiService } from '../../services/material-api.service';
import { TrongLuongApiService } from '../../services/trong-luong-api.service';
import { OriginApiService } from '../../services/origin-api.service';
import { HelmetStyleApiService } from '../../services/helmet-style-api.service';
import { CongNgheAnToanApiService } from '../../services/cong-nghe-an-toan-api.service';
import { HelmetVersionApiService } from '../../services/helmet-version-api.service';
import { SizeApiService, SizeResponse } from '../../services/size-api.service';
import { AuthService } from '../../services/auth';

interface HelmetProduct {
  id: number;
  code: string;
  name: string;
  avgPrice?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  totalQuantity?: number | null;
  loaiMuBaoHiem?: string | null;
  nhaSanXuat?: string | null;
  chatLieuVo?: string | null;
  trongLuong?: string | null;
  xuatXu?: string | null;
  kieuDangMu?: string | null;
  congNgheAnToan?: string | null;
  mauSac?: string | null;
  mauSacMa?: string | null;
  anhSanPham?: string | null;
  // ID liên kết để tạo mới
  loaiMuBaoHiemId?: number | null;
  nhaSanXuatId?: number | null;
  chatLieuVoId?: number | null;
  trongLuongId?: number | null;
  xuatXuId?: number | null;
  kieuDangMuId?: number | null;
  congNgheAnToanId?: number | null;
  mauSacId?: number | null;
  price: number;
  quantity: number;
  status: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

// Removed legacy Manufacturer demo interface

@Component({
  selector: 'app-helmets',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    QuickAddModalComponent,
    SearchableDropdownComponent,
  ],
  templateUrl: './helmets.component.html',
  styleUrls: ['./helmets.component.scss', './table-styles.scss'],
})
export class HelmetsComponent implements OnInit {
  Math = Math; // Expose Math object to template
  helmetProducts: HelmetProduct[] = [];
  filteredProducts: HelmetProduct[] = [];
  loaiMuList: { id: number; tenLoai: string }[] = [];
  nsxList: { id: number; tenNhaSanXuat: string }[] = [];
  chatLieuList: { id: number; tenChatLieu: string }[] = [];
  trongLuongList: { id: number; giaTriTrongLuong: number }[] = [];
  xuatXuList: { id: number; tenXuatXu: string }[] = [];
  kieuDangList: { id: number; tenKieuDang: string }[] = [];
  congNgheList: { id: number; tenCongNghe: string }[] = [];
  mauSacList: { id: number; tenMau: string; maMau: string }[] = [];

  // Converted data for searchable dropdowns
  loaiMuOptions: DropdownOption[] = [];
  nsxOptions: DropdownOption[] = [];
  chatLieuOptions: DropdownOption[] = [];
  trongLuongOptions: DropdownOption[] = [];
  xuatXuOptions: DropdownOption[] = [];
  kieuDangOptions: DropdownOption[] = [];
  congNgheOptions: DropdownOption[] = [];
  mauSacOptions: DropdownOption[] = [];
  kichThuocOptions: DropdownOption[] = [];
  searchTerm: string = '';
  selectedStatus: string = 'all';
  showModal: boolean = false;
  isEditMode: boolean = false;
  isViewMode: boolean = false;
  selectedProduct: HelmetProduct | null = null;
  showDeleteModal: boolean = false;
  productToDelete: HelmetProduct | null = null;
  // Danh sách phiên bản sản phẩm cho modal xem/sửa
  helmetVersions: Array<{
    id?: number;
    kichThuocId: number;
    mauSacId: number;
    trongLuongId?: number | null;
    trongLuongTen?: string | null;
    giaBan: number;
    soLuongTon: number;
    trangThai: boolean;
    anhSanPham?: string | null;
    imageFileName?: string | null;
  }> = [];
  newProduct: HelmetProduct = {
    id: 0,
    code: '',
    name: '',
    loaiMuBaoHiemId: null,
    nhaSanXuatId: null,
    chatLieuVoId: null,
    trongLuongId: null,
    xuatXuId: null,
    kieuDangMuId: null,
    congNgheAnToanId: null,
    price: 0,
    quantity: 0,
    status: 'Đang bán',
    description: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Confirmation Modal State
  showConfirmModal: boolean = false;
  confirmModalTitle: string = '';
  confirmModalMessage: string = '';
  pendingAction: (() => void) | null = null;

  // Track which fields have been touched by user
  touchedFields: Set<string> = new Set();

  // Quick Add Modal state
  showQuickAddModal: boolean = false;
  quickAddModalType: string = '';

  // Variant generation properties
  selectedSizes: number[] = [];
  selectedColors: number[] = [];
  deletedVersionIds: number[] = [];

  constructor(
    private productApi: ProductApiService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private loaiMuBaoHiemApi: LoaiMuBaoHiemApiService,
    private colorApi: ColorApiService,
    private manufacturerApi: ManufacturerApiService,
    private materialApi: MaterialApiService,
    private trongLuongApi: TrongLuongApiService,
    private originApi: OriginApiService,
    private helmetStyleApi: HelmetStyleApiService,
    private congNgheAnToanApi: CongNgheAnToanApiService,
    private helmetVersionApi: HelmetVersionApiService,
    private sizeApi: SizeApiService,
    private authService: AuthService
  ) { }

  // Kiểm tra quyền ADMIN để hiển thị các nút thêm/sửa/xóa
  get isAdmin(): boolean {
    return this.authService.hasAnyRole('ADMIN');
  }

  ngOnInit() {
    this.loadLookups();
    this.fetchProducts();
  }

  loadLookups() {
    this.loadHelmetTypes();
    this.loadColors();
    this.loadSizes();
    this.productApi.getNhaSanXuatAll().subscribe({
      next: (res: any) => {
        this.nsxList = (res.content || []).map((x: any) => ({
          id: x.id,
          tenNhaSanXuat: x.tenNhaSanXuat || x.ten,
        }));
        this.nsxOptions = this.nsxList.map((x) => ({ id: x.id, name: x.tenNhaSanXuat }));
        this.cdr.detectChanges();
      },
      error: (error) => { },
    });
    this.productApi.getChatLieuVoAll().subscribe((res: any) => {
      this.chatLieuList = (res.content || []).map((x: any) => ({
        id: x.id,
        tenChatLieu: x.tenChatLieu,
      }));
      this.chatLieuOptions = this.chatLieuList.map((x) => ({ id: x.id, name: x.tenChatLieu }));
      this.cdr.detectChanges();
    });
    this.productApi.getTrongLuongAll().subscribe((data: any[]) => {
      this.trongLuongList = (data || []).map((x: any) => ({
        id: x.id,
        giaTriTrongLuong: x.giaTriTrongLuong,
      }));
      this.trongLuongOptions = this.trongLuongList.map((x) => ({
        id: x.id,
        name: `${x.giaTriTrongLuong}g`,
      }));
      this.cdr.detectChanges();
    });
    this.productApi.getXuatXuAll().subscribe((data: any[]) => {
      this.xuatXuList = (data || []).map((x: any) => ({ id: x.id, tenXuatXu: x.tenXuatXu }));
      this.xuatXuOptions = this.xuatXuList.map((x) => ({ id: x.id, name: x.tenXuatXu }));
      this.cdr.detectChanges();
    });
    this.productApi.getKieuDangMuAll().subscribe((res: any) => {
      this.kieuDangList = (res.content || []).map((x: any) => ({
        id: x.id,
        tenKieuDang: x.tenKieuDang,
      }));
      this.kieuDangOptions = this.kieuDangList.map((x) => ({ id: x.id, name: x.tenKieuDang }));
      this.cdr.detectChanges();
    });
    this.productApi.getCongNgheAnToanAll().subscribe((data: any[]) => {
      this.congNgheList = (data || []).map((x: any) => ({ id: x.id, tenCongNghe: x.tenCongNghe }));
      this.congNgheOptions = this.congNgheList.map((x) => ({ id: x.id, name: x.tenCongNghe }));
      this.cdr.detectChanges();
    });
  }

  private loadSizes() {
    this.sizeApi.getAllActive().subscribe((response: SizeResponse[]) => {
      this.kichThuocOptions = (response || []).map((item) => ({
        id: item.id,
        name: item.tenKichThuoc,
      }));
      this.cdr.detectChanges();
    });
  }

  // pagination + sorting state
  page: number = 0;
  size: number = 10;
  totalElements: number = 0;
  totalPages: number = 0;
  sortField: string = 'id';
  sortDir: 'asc' | 'desc' = 'desc';

  fetchProducts() {
    this.productApi
      .search({
        keyword: this.searchTerm || undefined,
        page: this.page,
        size: this.size,
        sort: `${this.sortField},${this.sortDir}`,
      })
      .subscribe({
        next: (res: PageResponse<SanPhamResponse>) => {
          this.helmetProducts = (res.content || []).map((p) => ({
            id: p.id,
            code: (p as any).maSanPham ?? p.maSanPham ?? '',
            name: (p as any).tenSanPham ?? p.tenSanPham ?? '',
            // ids for editing
            loaiMuBaoHiemId: (p as any).loaiMuBaoHiemId ?? p.loaiMuBaoHiemId ?? null,
            nhaSanXuatId: (p as any).nhaSanXuatId ?? p.nhaSanXuatId ?? null,
            chatLieuVoId: (p as any).chatLieuVoId ?? p.chatLieuVoId ?? null,
            trongLuongId: (p as any).trongLuongId ?? p.trongLuongId ?? null,
            xuatXuId: (p as any).xuatXuId ?? p.xuatXuId ?? null,
            kieuDangMuId: (p as any).kieuDangMuId ?? p.kieuDangMuId ?? null,
            congNgheAnToanId: (p as any).congNgheAnToanId ?? p.congNgheAnToanId ?? null,
            mauSacId: (p as any).mauSacId ?? p.mauSacId ?? null,
            loaiMuBaoHiem: p.loaiMuBaoHiemTen ?? null,
            nhaSanXuat: p.nhaSanXuatTen ?? null,
            chatLieuVo: p.chatLieuVoTen ?? null,
            trongLuong: p.trongLuongTen ?? null,
            xuatXu: p.xuatXuTen ?? null,
            kieuDangMu: p.kieuDangMuTen ?? null,
            congNgheAnToan: p.congNgheAnToanTen ?? null,
            mauSac: p.mauSacTen ?? null,
            mauSacMa: p.mauSacMa ?? null,
            anhSanPham: p.anhSanPham ?? null,
            avgPrice:
              (p as any).giaTrungBinh !== undefined &&
                (p as any).giaTrungBinh !== null &&
                String((p as any).giaTrungBinh).trim() !== ''
                ? Number((p as any).giaTrungBinh)
                : null,
            totalQuantity:
              (p as any).tongSoLuongChiTiet !== undefined && (p as any).tongSoLuongChiTiet !== null
                ? Number((p as any).tongSoLuongChiTiet)
                : null,
            price:
              p.giaBan !== undefined && p.giaBan !== null && String(p.giaBan).trim() !== ''
                ? Number(p.giaBan)
                : (null as any),
            quantity:
              p.soLuongTon !== undefined &&
                p.soLuongTon !== null &&
                String(p.soLuongTon).trim() !== ''
                ? Number(p.soLuongTon)
                : (null as any),
            status: p.trangThai ? 'Đang bán' : 'Ngừng bán',
            description: p.moTa ?? '',
            createdAt: new Date((p as any).ngayTao ?? new Date()),
            updatedAt: new Date(),
          }));
          this.filteredProducts = [...this.helmetProducts];
          this.totalElements = res.totalElements ?? 0;
          this.totalPages = res.totalPages ?? 0;
          this.cdr.detectChanges();

          // Tính lại tổng số lượng, giá trung bình và khoảng giá từ danh sách phiên bản
          this.helmetProducts.forEach((prod, idx) => {
            this.helmetVersionApi.getBySanPhamId(prod.id).subscribe({
              next: (resp: any) => {
                const items = resp?.data || resp || [];
                // Tổng số lượng
                if (prod.totalQuantity === null || prod.totalQuantity === undefined) {
                  const sumQty = items
                    .map((v: any) => (v?.soLuongTon != null ? String(v.soLuongTon) : ''))
                    .map((s: string) => {
                      const cleaned = (s || '').trim().replace(/\s+/g, '').replace(/,/g, '');
                      const onlyDigits = cleaned.replace(/[^0-9-]/g, '');
                      const n = onlyDigits ? Number(onlyDigits) : NaN;
                      return Number.isFinite(n) ? n : 0;
                    })
                    .reduce((a: number, b: number) => a + b, 0);
                  this.helmetProducts[idx].totalQuantity = sumQty;
                  this.filteredProducts[idx].totalQuantity = sumQty;
                }

                // Giá từ/toi đa + giá trung bình
                const prices = items
                  .map((v: any) => (v?.giaBan != null ? String(v.giaBan) : ''))
                  .map((s: string) => {
                    let cleaned = (s || '').trim().replace(/\s+/g, '').replace(/,/g, '');
                    const firstDot = cleaned.indexOf('.');
                    const lastDot = cleaned.lastIndexOf('.');
                    if (firstDot !== -1 && lastDot !== -1 && firstDot !== lastDot) {
                      cleaned = cleaned.replace(/\./g, '');
                    }
                    const n = Number(cleaned);
                    return Number.isFinite(n) ? n : NaN;
                  })
                  .filter((n: number) => Number.isFinite(n));

                if (prices.length > 0) {
                  // Giá thấp nhất & cao nhất
                  const min = Math.min(...prices);
                  const max = Math.max(...prices);
                  this.helmetProducts[idx].minPrice = min;
                  this.helmetProducts[idx].maxPrice = max;
                  this.filteredProducts[idx].minPrice = min;
                  this.filteredProducts[idx].maxPrice = max;

                  // Giá trung bình (nếu BE không trả)
                  if (prod.avgPrice === null || prod.avgPrice === undefined) {
                    const avg = Math.round(
                      prices.reduce((a: number, b: number) => a + b, 0) / prices.length
                    );
                    this.helmetProducts[idx].avgPrice = avg;
                    this.filteredProducts[idx].avgPrice = avg;
                  }
                } else {
                  this.helmetProducts[idx].minPrice = null;
                  this.helmetProducts[idx].maxPrice = null;
                  this.filteredProducts[idx].minPrice = null;
                  this.filteredProducts[idx].maxPrice = null;
                }
                this.cdr.detectChanges();
              },
              error: () => { },
            });
          });
        },
        error: (err) => {
          this.helmetProducts = [];
          this.filteredProducts = [];
          this.totalElements = 0;
          this.totalPages = 0;
          this.cdr.detectChanges();
        },
      });
  }

  changePageSize(newSize: number) {
    this.size = Number(newSize) || 10;
    this.page = 0;
    this.fetchProducts();
  }

  prevPage() {
    if (this.page > 0) {
      this.page -= 1;
      this.fetchProducts();
    }
  }

  nextPage() {
    if (this.page + 1 < this.totalPages) {
      this.page += 1;
      this.fetchProducts();
    }
  }

  changeSort(field: string) {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDir = 'desc';
    }
    this.page = 0;
    this.fetchProducts();
  }

  // legacy demo manufacturers removed

  filterProducts() {
    // Nếu searchTerm chỉ chứa dấu cách hoặc rỗng, hiển thị tất cả sản phẩm
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.filteredProducts = this.helmetProducts.filter((product) => {
        const matchesStatus =
          this.selectedStatus === 'all' || product.status === this.selectedStatus;
        return matchesStatus;
      });
      return;
    }

    this.filteredProducts = this.helmetProducts.filter((product) => {
      const searchTerm = this.searchTerm.toLowerCase().trim();

      // Tìm kiếm trong các trường: Mã SP, Tên sản phẩm, Loại mũ, Nhà sản xuất, Giá bán
      const matchesSearch =
        product.code.toLowerCase().includes(searchTerm) ||
        product.name.toLowerCase().includes(searchTerm) ||
        (product.loaiMuBaoHiem && product.loaiMuBaoHiem.toLowerCase().includes(searchTerm)) ||
        (product.nhaSanXuat && product.nhaSanXuat.toLowerCase().includes(searchTerm)) ||
        (product.price != null && product.price.toString().includes(searchTerm));

      const matchesStatus = this.selectedStatus === 'all' || product.status === this.selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }

  onSearchChange() {
    // Không tìm kiếm nếu chỉ có dấu cách
    if (this.searchTerm && this.searchTerm.trim() === '') {
      return;
    }
    this.filterProducts();
  }

  onStatusChange() {
    this.filterProducts();
  }

  resetFilter() {
    this.searchTerm = '';
    this.selectedStatus = 'all';
    this.page = 0;
    this.fetchProducts();
  }

  // removed manufacturer filter

  closeModal() {
    this.showModal = false;
    this.selectedProduct = null;
    this.isEditMode = false;
    this.isViewMode = false;
  }

  canSubmit(): boolean {
    // Kiểm tra mã sản phẩm (chỉ khi thêm mới)
    const codeValid =
      this.isEditMode ||
      (!!this.newProduct.code?.trim() &&
        this.newProduct.code.trim().length >= 3 &&
        /^[A-Za-z0-9_-]+$/.test(this.newProduct.code.trim()));

    // Kiểm tra tên sản phẩm
    const nameValid =
      !!this.newProduct.name?.trim() &&
      this.newProduct.name.trim().length >= 2 &&
      this.newProduct.name.trim().length <= 255;

    // Kiểm tra giá bán
    const priceValid = true; // không bắt buộc

    // Kiểm tra số lượng tồn
    const quantityValid = true; // không bắt buộc

    // Kiểm tra các trường bắt buộc
    const requiredFieldsValid =
      Number.isInteger(Number(this.newProduct.loaiMuBaoHiemId)) &&
      Number.isInteger(Number(this.newProduct.nhaSanXuatId)) &&
      Number.isInteger(Number(this.newProduct.chatLieuVoId)) &&
      Number.isInteger(Number(this.newProduct.xuatXuId)) &&
      Number.isInteger(Number(this.newProduct.kieuDangMuId)) &&
      Number.isInteger(Number(this.newProduct.congNgheAnToanId));

    return codeValid && nameValid && priceValid && quantityValid && requiredFieldsValid;
  }

  onSelect(field: keyof HelmetProduct, value: any) {
    const n = Number(value);
    (this.newProduct as any)[field] = Number.isFinite(n) ? n : value;
    // Mark field as touched when user makes a selection
    this.markFieldTouched(field as string);
  }

  saveProduct() {
    // Mark all fields as touched when user tries to submit
    this.markAllFieldsTouched();

    // Validation chi tiết cho thêm mới vào DB
    const validationErrors: string[] = [];

    // Kiểm tra mã sản phẩm (chỉ khi thêm mới)
    if (!this.isEditMode) {
      if (!this.newProduct.code?.trim()) {
        validationErrors.push('Mã sản phẩm không được để trống');
      } else if (this.newProduct.code.trim().length < 3) {
        validationErrors.push('Mã sản phẩm phải có ít nhất 3 ký tự');
      } else if (!/^[A-Za-z0-9_-]+$/.test(this.newProduct.code.trim())) {
        validationErrors.push('Mã sản phẩm chỉ được chứa chữ cái, số, dấu gạch ngang và gạch dưới');
      }
    }

    // Kiểm tra tên sản phẩm
    if (!this.newProduct.name?.trim()) {
      validationErrors.push('Tên sản phẩm không được để trống');
    } else if (this.newProduct.name.trim().length < 2) {
      validationErrors.push('Tên sản phẩm phải có ít nhất 2 ký tự');
    } else if (this.newProduct.name.trim().length > 255) {
      validationErrors.push('Tên sản phẩm không được vượt quá 255 ký tự');
    }

    // Bỏ validate giá bán và số lượng theo yêu cầu

    // Kiểm tra các trường bắt buộc
    const requiredFields = [
      { field: 'loaiMuBaoHiemId', name: 'Loại mũ bảo hiểm' },
      { field: 'nhaSanXuatId', name: 'Nhà sản xuất' },
      { field: 'chatLieuVoId', name: 'Chất liệu vỏ' },
      { field: 'xuatXuId', name: 'Xuất xứ' },
      { field: 'kieuDangMuId', name: 'Kiểu dáng mũ' },
      { field: 'congNgheAnToanId', name: 'Công nghệ an toàn' },
    ];

    requiredFields.forEach(({ field, name }) => {
      const value = (this.newProduct as any)[field];
      if (!value || !Number.isInteger(Number(value)) || Number(value) <= 0) {
        validationErrors.push(`Vui lòng chọn ${name}`);
      }
    });

    if (!this.helmetVersions.length) {
      validationErrors.push('Sản phẩm cần ít nhất một biến thể để lưu.');
    } else {
      this.helmetVersions.forEach((variant, index) => {
        if (!variant.anhSanPham) {
          validationErrors.push(`Biến thể số ${index + 1} chưa có ảnh sản phẩm.`);
        }
      });
    }

    // Hiển thị lỗi nếu có
    if (validationErrors.length > 0) {
      alert('Vui lòng kiểm tra lại thông tin:\n\n' + validationErrors.join('\n'));
      return;
    }
    // Chuẩn hóa giá trị danh mục: gõ hoặc chọn đều được (bỏ dấu, so khớp gần đúng)
    const stripAccents = (v: string) =>
      (v || '')
        .normalize('NFD')
        .replace(/\p{Diacritic}+/gu, '')
        .toLowerCase()
        .trim();

    const normalizeId = (raw: any, list: any[], nameKey: string): number | undefined => {
      // Người dùng nhập số → coi như ID
      const asNumber = Number(raw);
      if (Number.isInteger(asNumber) && asNumber > 0) return asNumber;

      const s = stripAccents(String(raw ?? ''));
      if (!s) return undefined;

      // So khớp chính xác (bỏ dấu)
      let found = list.find((x: any) => stripAccents(String(x[nameKey] ?? '')) === s);
      if (found) return Number(found.id);

      // So khớp gần đúng (contains)
      found = list.find((x: any) => stripAccents(String(x[nameKey] ?? '')).includes(s));
      return found ? Number(found.id) : undefined;
    };

    this.newProduct.loaiMuBaoHiemId = normalizeId(
      this.newProduct.loaiMuBaoHiemId,
      this.loaiMuList,
      'tenLoai'
    );
    this.newProduct.nhaSanXuatId = normalizeId(
      this.newProduct.nhaSanXuatId,
      this.nsxList,
      'tenNhaSanXuat'
    );
    this.newProduct.chatLieuVoId = normalizeId(
      this.newProduct.chatLieuVoId,
      this.chatLieuList,
      'tenChatLieu'
    );
    this.newProduct.trongLuongId = normalizeId(
      this.newProduct.trongLuongId,
      this.trongLuongList as any,
      'giaTriTrongLuong'
    );
    this.newProduct.xuatXuId = normalizeId(this.newProduct.xuatXuId, this.xuatXuList, 'tenXuatXu');
    this.newProduct.kieuDangMuId = normalizeId(
      this.newProduct.kieuDangMuId,
      this.kieuDangList,
      'tenKieuDang'
    );
    this.newProduct.congNgheAnToanId = normalizeId(
      this.newProduct.congNgheAnToanId,
      this.congNgheList,
      'tenCongNghe'
    );
    this.newProduct.mauSacId = normalizeId(this.newProduct.mauSacId, this.mauSacList, 'tenMau');

    // Kiểm tra đủ danh mục sau chuẩn hóa để tránh 400 từ BE
    const missing: string[] = [];
    if (!this.newProduct.loaiMuBaoHiemId) missing.push('Loại mũ');
    if (!this.newProduct.nhaSanXuatId) missing.push('Nhà sản xuất');
    if (!this.newProduct.chatLieuVoId) missing.push('Chất liệu vỏ');
    if (!this.newProduct.xuatXuId) missing.push('Xuất xứ');
    if (!this.newProduct.kieuDangMuId) missing.push('Kiểu dáng mũ');
    if (!this.newProduct.congNgheAnToanId) missing.push('Công nghệ an toàn');
    if (missing.length) {
      alert('Vui lòng chọn: ' + missing.join(', '));
      return;
    }

    if (this.isEditMode && this.selectedProduct) {
      const payloadUpdate = {
        maSanPham: this.newProduct.code,
        tenSanPham: this.newProduct.name,
        moTa: this.newProduct.description || '',
        trangThai: this.newProduct.status !== 'Ngừng bán',
        loaiMuBaoHiemId: Number(this.newProduct.loaiMuBaoHiemId),
        nhaSanXuatId: Number(this.newProduct.nhaSanXuatId),
        chatLieuVoId: Number(this.newProduct.chatLieuVoId),
        xuatXuId: Number(this.newProduct.xuatXuId),
        kieuDangMuId: Number(this.newProduct.kieuDangMuId),
        congNgheAnToanId: Number(this.newProduct.congNgheAnToanId),
      } as any;

      const updateAction = () => {
        this.productApi.update(this.selectedProduct!.id, payloadUpdate).subscribe({
          next: () => {
            // Đồng bộ phiên bản sau khi cập nhật sản phẩm
            const sanPhamId = this.selectedProduct!.id;
            const toNum = (v: any) => {
              if (v === null || v === undefined) return 0;
              if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
              let s = String(v).trim().replace(/\s+/g, '').replace(/,/g, '');
              const firstDot = s.indexOf('.');
              const lastDot = s.lastIndexOf('.');
              if (firstDot !== -1 && lastDot !== -1 && firstDot !== lastDot) s = s.replace(/\./g, '');
              const n = Number(s);
              return Number.isFinite(n) ? n : 0;
            };
            let pending = this.helmetVersions.length;
            if (pending === 0) {
              this.fetchProducts();
              this.closeModal();
              return;
            }
            this.helmetVersions.forEach((v) => {
              const versionPayload: any = {
                sanPhamId,
                kichThuocId: toNum(v.kichThuocId),
                mauSacId: toNum(v.mauSacId),
                trongLuongId: toNum(v.trongLuongId),
                giaBan: v.giaBan !== undefined && v.giaBan !== null ? String(v.giaBan) : '',
                soLuongTon:
                  v.soLuongTon !== undefined && v.soLuongTon !== null ? String(v.soLuongTon) : '',
                trangThai: v.trangThai !== false,
                anhSanPham: v.anhSanPham || null,
              };
              if (v.id) {
                this.helmetVersionApi.update(v.id, versionPayload).subscribe({
                  next: done,
                  error: done,
                });
              } else {
                this.helmetVersionApi.create(versionPayload).subscribe({
                  next: done,
                  error: done,
                });
              }
            });
            const self = this;
            function done() {
              pending--;
              if (pending <= 0) {
                // After all variants are created/updated, delete removed variants
                if (self.deletedVersionIds.length > 0) {
                  let deletedCount = 0;
                  self.deletedVersionIds.forEach((id) => {
                    self.helmetVersionApi.delete(id).subscribe({
                      next: () => {
                        deletedCount++;
                        if (deletedCount === self.deletedVersionIds.length) {
                          self.fetchProducts();
                          self.closeModal();
                        }
                      },
                      error: (err) => console.error('Lỗi xóa biến thể:', err),
                    });
                  });
                } else {
                  self.fetchProducts();
                  self.closeModal();
                }
              }
            }
          },
          error: (err) => {
            const msg =
              (err?.error && (err.error.message || err.error.error)) ||
              'Cập nhật thất bại. Vui lòng kiểm tra dữ liệu.';
            alert(msg);
          },
        });
      };

      this.openConfirmModal('Xác nhận', 'Bạn có muốn cập nhật sản phẩm này không?', updateAction);
      return;
    }

    // Chuyển các ô nhập ID (đang là text) sang số nếu hợp lệ
    const toId = (v: any) => Number(v);

    // Gọi API BE tạo mới Sản phẩm (BE chỉ nhận ID cho các liên kết)
    const payload = {
      maSanPham: this.newProduct.code,
      tenSanPham: this.newProduct.name,
      moTa: this.newProduct.description || '',
      trangThai: true,
      loaiMuBaoHiemId: toId(this.newProduct.loaiMuBaoHiemId),
      nhaSanXuatId: toId(this.newProduct.nhaSanXuatId),
      chatLieuVoId: toId(this.newProduct.chatLieuVoId),
      xuatXuId: toId(this.newProduct.xuatXuId),
      kieuDangMuId: toId(this.newProduct.kieuDangMuId),
      congNgheAnToanId: toId(this.newProduct.congNgheAnToanId),
    } as any;

    const createAction = () => {
      this.productApi.create(payload).subscribe({
        next: () => {
          this.fetchProducts();
          this.closeModal();
        },
        error: (err) => {
          if (err?.status === 409) {
            return;
          }
          if (err?.status === 400) {
            const msg400 =
              (err?.error && (err.error.message || err.error.error)) ||
              'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các danh mục và giá trị bắt buộc.';
            alert(msg400);
            return;
          }
          const msg =
            (err?.error && (err.error.message || err.error.error)) ||
            'Thêm mới thất bại. Vui lòng kiểm tra dữ liệu (mã SP không trùng, giá > 0).';
          alert(msg);
        },
      });
    };

    this.openConfirmModal('Xác nhận', 'Bạn có muốn thêm mới sản phẩm này không?', createAction);
  }

  // Ép kiểu số khi người dùng nhập giá/số lượng trong bảng phiên bản
  castVersionNumber(index: number, field: 'giaBan' | 'soLuongTon') {
    if (!this.helmetVersions || !this.helmetVersions[index]) return;
    // No-op: BE nhận string cho giaBan và soLuongTon, giữ nguyên người dùng nhập
    return;
  }

  viewProduct(product: HelmetProduct) {
    // Mở modal xem chi tiết sản phẩm
    this.isViewMode = true;
    this.isEditMode = false;
    this.selectedProduct = product;
    this.newProduct = { ...product };
    this.showModal = true;
    // Tải phiên bản sản phẩm
    this.loadHelmetVersions(product.id);
  }

  confirmDelete() {
    if (this.productToDelete) {
      this.productApi.delete(this.productToDelete.id).subscribe({
        next: () => {
          this.fetchProducts();
        },
        error: (err) => {
          alert('Xóa thất bại');
        },
      });
    }
    this.closeDeleteModal();
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.productToDelete = null;
  }

  // Confirmation Modal Logic
  openConfirmModal(title: string, message: string, action: () => void) {
    this.confirmModalTitle = title;
    this.confirmModalMessage = message;
    this.pendingAction = action;
    this.showConfirmModal = true;
  }



  closeConfirmModal() {
    this.showConfirmModal = false;
    this.pendingAction = null;
  }

  onConfirm() {
    if (this.pendingAction) {
      this.pendingAction();
    }
    this.closeConfirmModal();
  }

  openAddModal() {
    this.isEditMode = false;
    this.isViewMode = false;
    this.selectedProduct = null;
    this.newProduct = {
      id: 0,
      code: '',
      name: '',
      price: 0,
      quantity: 0,
      status: 'Đang bán',
      description: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    // Reset touched fields when opening new modal
    this.touchedFields.clear();

    // Force reload helmet types if empty
    if (this.loaiMuList.length === 0) {
      this.loadHelmetTypes();
    }

    this.showModal = true;
  }

  navigateToAddForm() {
    this.router.navigate(['/products/helmets/new']);
  }

  loadHelmetTypes() {
    this.productApi.getLoaiMuBaoHiemAll().subscribe({
      next: (data) => {
        this.loaiMuList = (data || []).map((x) => ({ id: x.id, tenLoai: x.tenLoai }));
        this.loaiMuOptions = this.loaiMuList.map((x) => ({ id: x.id, name: x.tenLoai }));
        this.cdr.detectChanges();
      },
      error: (error) => {
        alert(
          'Lỗi khi tải danh sách loại mũ bảo hiểm: ' +
          (error.message || 'Không thể kết nối đến server')
        );
      },
    });
  }

  loadColors() {
    this.colorApi.getAllActive().subscribe({
      next: (data) => {
        this.mauSacList = data.map((x) => ({
          id: x.id,
          tenMau: x.tenMau,
          maMau: x.maMau || '',
        }));
        this.mauSacOptions = this.mauSacList.map((x) => ({
          id: x.id,
          name: `${x.tenMau}${x.maMau ? ' (' + x.maMau + ')' : ''}`,
        }));
        this.cdr.detectChanges();
      },
      error: (error) => {
        alert(
          'Lỗi khi tải danh sách màu sắc: ' + (error.message || 'Không thể kết nối đến server')
        );
      },
    });
  }

  openEditModal(product: HelmetProduct) {
    this.isEditMode = true;
    this.isViewMode = false;
    this.selectedProduct = product;
    this.newProduct = { ...product };
    this.showModal = true;
    // Reset selected sizes/colors and deleted IDs
    this.selectedSizes = [];
    this.selectedColors = [];
    this.deletedVersionIds = [];
    // Tải phiên bản sản phẩm khi mở sửa
    this.loadHelmetVersions(product.id);
  }

  // Generate/add variants based on selected sizes and colors
  generateVariants() {
    if (this.selectedSizes.length === 0 || this.selectedColors.length === 0) {
      alert('Vui lòng chọn ít nhất một kích thước và một màu sắc!');
      return;
    }

    // Chế độ thêm biến thể: giữ lại biến thể cũ, chỉ thêm mới
    const existingVersions = this.helmetVersions || [];
    let addedCount = 0;

    this.selectedSizes.forEach((kichThuocId) => {
      this.selectedColors.forEach((mauSacId) => {
        // Kiểm tra xem biến thể này đã tồn tại chưa
        const exists = existingVersions.find(
          (v) => v.kichThuocId == kichThuocId && v.mauSacId == mauSacId
        );

        // Nếu chưa tồn tại → thêm mới
        if (!exists) {
          this.helmetVersions.push({
            kichThuocId,
            mauSacId,
            trongLuongId: null,
            trongLuongTen: '',
            giaBan: 0,
            soLuongTon: 0,
            trangThai: true,
            anhSanPham: null,
            imageFileName: null,
          });
          addedCount++;
        }
      });
    });

    // Thông báo cho người dùng
    if (addedCount > 0) {
      alert(`Đã thêm ${addedCount} biến thể mới!`);
    } else {
      alert('Không có biến thể mới nào được thêm. Tất cả các tổ hợp đã tồn tại.');
    }

    this.cdr.detectChanges();
  }

  // Remove variant from list
  removeVariant(index: number) {
    const variant = this.helmetVersions[index];
    if (variant && variant.id) {
      // Nếu variant đã có ID (tồn tại trong DB), thêm vào danh sách xóa
      this.deletedVersionIds.push(variant.id);
    }
    // Xóa khỏi mảng hiển thị
    this.helmetVersions.splice(index, 1);
    this.cdr.detectChanges();
  }

  // Update existing product
  updateProduct() {
    const payload = {
      maSanPham: this.newProduct.code,
      tenSanPham: this.newProduct.name,
      trangThai: this.newProduct.status === 'Đang bán',
      loaiMuBaoHiemId: this.newProduct.loaiMuBaoHiemId || undefined,
      nhaSanXuatId: this.newProduct.nhaSanXuatId || undefined,
      chatLieuVoId: this.newProduct.chatLieuVoId || undefined,
      xuatXuId: this.newProduct.xuatXuId || undefined,
      kieuDangMuId: this.newProduct.kieuDangMuId || undefined,
      congNgheAnToanId: this.newProduct.congNgheAnToanId || undefined,
      moTa: this.newProduct.description || '',
    };

    this.productApi.update(this.newProduct.id, payload as any).subscribe({
      next: (response: any) => {
        const sanPhamId = response.id || this.newProduct.id;

        // Update/create variants
        let completedVariants = 0;
        const totalVariants = this.helmetVersions.length;

        if (totalVariants === 0 && this.deletedVersionIds.length === 0) {
          alert('Cập nhật sản phẩm thành công!');
          this.closeModal();
          this.fetchProducts();
          return;
        }

        // Create or update variants
        this.helmetVersions.forEach((v) => {
          const versionPayload = {
            sanPhamId,
            kichThuocId: Number(v.kichThuocId),
            mauSacId: Number(v.mauSacId),
            trongLuongId: null,
            trongLuongTen: v.trongLuongTen || null,
            giaBan: String(v.giaBan || 0),
            soLuongTon: String(v.soLuongTon || 0),
            trangThai: true,
            anhSanPham: v.anhSanPham || null,
          };

          if (v.id) {
            // Update existing variant
            this.helmetVersionApi.update(v.id, versionPayload).subscribe({
              next: () => {
                completedVariants++;
                if (completedVariants === totalVariants) {
                  this.deleteRemovedVariants();
                }
              },
              error: (err) => alert('Lỗi cập nhật biến thể: ' + (err.error?.message || err.message)),
            });
          } else {
            // Create new variant
            this.helmetVersionApi.create(versionPayload).subscribe({
              next: () => {
                completedVariants++;
                if (completedVariants === totalVariants) {
                  this.deleteRemovedVariants();
                }
              },
              error: (err) => alert('Lỗi tạo biến thể: ' + (err.error?.message || err.message)),
            });
          }
        });

        // If no variants to update, just delete removed ones
        if (totalVariants === 0) {
          this.deleteRemovedVariants();
        }
      },
      error: (err) => alert('Lỗi cập nhật sản phẩm: ' + (err.error?.message || err.message)),
    });
  }

  // Delete removed variants from database
  deleteRemovedVariants() {
    if (this.deletedVersionIds.length === 0) {
      alert('Cập nhật sản phẩm thành công!');
      this.closeModal();
      this.fetchProducts();
      return;
    }

    let deletedCount = 0;
    this.deletedVersionIds.forEach((id) => {
      this.helmetVersionApi.delete(id).subscribe({
        next: () => {
          deletedCount++;
          if (deletedCount === this.deletedVersionIds.length) {
            alert('Cập nhật sản phẩm thành công!');
            this.closeModal();
            this.fetchProducts();
          }
        },
        error: (err) => console.error('Lỗi xóa biến thể:', err),
      });
    });
  }

  formatPrice(price: any): string {
    if (price === null || price === undefined || isNaN(Number(price))) return '-';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  }

  /**
   * Hiển thị giá từ ... đến ... cho danh sách sản phẩm.
   * - Nếu có cả minPrice và maxPrice:
   *   + Nếu bằng nhau -> hiển thị một giá.
   *   + Nếu khác nhau -> hiển thị "min - max".
   * - Nếu chưa có min/max nhưng có avgPrice -> fallback dùng avgPrice.
   * - Nếu không có dữ liệu -> "-".
   */
  getPriceRangeDisplay(p: HelmetProduct): string {
    const hasMin = p.minPrice !== null && p.minPrice !== undefined;
    const hasMax = p.maxPrice !== null && p.maxPrice !== undefined;

    if (hasMin && hasMax) {
      if (p.minPrice === p.maxPrice) {
        return this.formatPrice(p.minPrice);
      }
      return `${this.formatPrice(p.minPrice)} - ${this.formatPrice(p.maxPrice)}`;
    }

    if (p.avgPrice !== null && p.avgPrice !== undefined) {
      return this.formatPrice(p.avgPrice);
    }

    return '-';
  }

  // Helpers: hiển thị tên theo id
  getKichThuocTenById(id: number): string {
    const obj = this.kichThuocOptions?.find((x) => x.id === id);
    return obj ? obj.name : String(id);
  }
  getMauSacTenById(id: number): string {
    const obj = this.mauSacOptions?.find((x) => x.id === id);
    return obj ? obj.name : String(id);
  }
  getMauSacMaById(id: number): string {
    const obj = this.mauSacList?.find((x) => x.id === id);
    return obj ? obj.maMau || '' : '';
  }
  getTrongLuongTenById(id: number): string {
    const obj = this.trongLuongOptions?.find((x) => x.id === id);
    return obj ? obj.name : String(id);
  }

  private loadHelmetVersions(sanPhamId: number) {
    if (!sanPhamId) {
      this.helmetVersions = [];
      this.cdr.detectChanges();
      return;
    }
    this.helmetVersionApi.getBySanPhamId(sanPhamId).subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : res?.data ?? res?.content ?? res?.items ?? [];
        this.helmetVersions = (raw || []).map((v: any) => {
          // Lấy trongLuongTen từ DB - ƯU TIÊN, không dùng trongLuongId
          let trongLuongTen = v.trongLuongTen || v.trong_luong_ten || '';
          // Nếu null hoặc undefined, chuyển thành chuỗi rỗng
          if (trongLuongTen === null || trongLuongTen === undefined || trongLuongTen === 'null') {
            trongLuongTen = '';
          }
          return {
            id: v.id,
            kichThuocId: v.kichThuocId,
            mauSacId: v.mauSacId,
            trongLuongId: null, // KHÔNG DÙNG ID - chỉ dùng trongLuongTen
            trongLuongTen: trongLuongTen, // Lấy TỪ CỘT trong_luong_ten trong DB
            giaBan: v.giaBan || '',
            soLuongTon: v.soLuongTon || '',
            trangThai: v.trangThai !== false,
            anhSanPham: v.anhSanPham || v.anh_san_pham || null,
            imageFileName: v.anhSanPham || v.anh_san_pham ? 'Ảnh hiện có' : null,
          };
        });
        this.cdr.detectChanges();
      },
      error: () => {
        this.helmetVersions = [];
        this.cdr.detectChanges();
      },
    });
  }

  trackByProductId(index: number, product: HelmetProduct): number {
    return product.id;
  }

  onImageError(event: any) {
    event.target.style.display = 'none';
    event.target.parentElement.innerHTML = '<span class="text-muted">Lỗi tải ảnh</span>';
  }

  onVariantImageSelected(event: any, index: number) {
    const file = event.target.files?.[0];
    if (!file || !this.helmetVersions[index]) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước file quá lớn. Vui lòng chọn file nhỏ hơn 5MB.');
      event.target.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh hợp lệ.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.helmetVersions[index].anhSanPham = e.target.result;
      this.helmetVersions[index].imageFileName = file.name;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  removeVariantImage(index: number) {
    if (!this.helmetVersions[index]) return;
    this.helmetVersions[index].anhSanPham = null;
    this.helmetVersions[index].imageFileName = null;
  }

  // Validation methods for real-time feedback
  getCodeError(): string | null {
    if (this.isEditMode) return null;
    if (!this.newProduct.code?.trim()) return 'Mã sản phẩm không được để trống';
    if (this.newProduct.code.trim().length < 3) return 'Mã sản phẩm phải có ít nhất 3 ký tự';
    if (!/^[A-Za-z0-9_-]+$/.test(this.newProduct.code.trim()))
      return 'Mã sản phẩm chỉ được chứa chữ cái, số, dấu gạch ngang và gạch dưới';
    return null;
  }

  getNameError(): string | null {
    if (!this.newProduct.name?.trim()) return 'Tên sản phẩm không được để trống';
    if (this.newProduct.name.trim().length < 2) return 'Tên sản phẩm phải có ít nhất 2 ký tự';
    if (this.newProduct.name.trim().length > 255)
      return 'Tên sản phẩm không được vượt quá 255 ký tự';
    return null;
  }

  getPriceError(): string | null {
    if (!this.newProduct.price || this.newProduct.price <= 0) return 'Giá bán phải lớn hơn 0';
    if (this.newProduct.price > 999999999) return 'Giá bán không được vượt quá 999,999,999 VNĐ';
    return null;
  }

  getQuantityError(): string | null {
    if (
      this.newProduct.quantity === undefined ||
      this.newProduct.quantity === null ||
      this.newProduct.quantity < 0
    )
      return 'Số lượng tồn phải lớn hơn hoặc bằng 0';
    if (this.newProduct.quantity > 999999) return 'Số lượng tồn không được vượt quá 999,999';
    return null;
  }

  hasFieldError(field: string): boolean {
    // Only show error if field has been touched
    if (!this.touchedFields.has(field)) {
      return false;
    }

    switch (field) {
      case 'code':
        return !!this.getCodeError();
      case 'name':
        return !!this.getNameError();
      case 'price':
        return !!this.getPriceError();
      case 'quantity':
        return !!this.getQuantityError();
      default:
        return false;
    }
  }

  // Method to mark field as touched
  markFieldTouched(field: string) {
    this.touchedFields.add(field);
  }

  // Method to mark all fields as touched (when user tries to submit)
  markAllFieldsTouched() {
    const allFields = [
      'code',
      'name',
      'price',
      'quantity',
      'loaiMuBaoHiemId',
      'nhaSanXuatId',
      'chatLieuVoId',
      'trongLuongId',
      'xuatXuId',
      'kieuDangMuId',
      'congNgheAnToanId',
      'mauSacId',
    ];
    allFields.forEach((field) => this.touchedFields.add(field));
  }

  // Method to check if dropdown has error (only if touched)
  hasDropdownError(field: string): boolean {
    if (!this.touchedFields.has(field)) {
      return false;
    }

    const value = (this.newProduct as any)[field];
    return !value || !Number.isInteger(Number(value)) || Number(value) <= 0;
  }

  // Method để mở modal thêm nhanh
  openQuickAddModal(type: string) {
    this.quickAddModalType = type;
    this.showQuickAddModal = true;
  }

  // Method để xử lý save từ quick add modal
  onQuickAddSave(event: { type: string; data: any }) {
    if (event.type === 'loaiMuBaoHiem') {
      const request: LoaiMuBaoHiemRequest = {
        tenLoai: event.data.tenLoai,
        moTa: event.data.moTa,
        trangThai: event.data.trangThai,
      };

      this.loaiMuBaoHiemApi.create(request).subscribe({
        next: (response) => {
          alert('Thêm mới Loại mũ bảo hiểm thành công!');
          this.loadHelmetTypes(); // Refresh dropdown
          this.cdr.detectChanges();
        },
        error: (error) => {
          alert(
            'Lỗi khi thêm mới Loại mũ bảo hiểm: ' +
            (error.error?.message || error.message || 'Không thể kết nối đến server')
          );
        },
      });
    } else if (event.type === 'mauSac') {
      this.colorApi
        .create({
          tenMau: event.data.tenMau,
          maMau: event.data.maMau,
          trangThai: event.data.trangThai,
        })
        .subscribe({
          next: (response) => {
            alert('Thêm mới Màu sắc thành công!');
            this.loadColors(); // Refresh dropdown
            this.cdr.detectChanges();
          },
          error: (error) => {
            alert(
              'Lỗi khi thêm mới Màu sắc: ' +
              (error.error?.message || error.message || 'Không thể kết nối đến server')
            );
          },
        });
    } else if (event.type === 'nhaSanXuat') {
      this.manufacturerApi
        .create({
          ten: event.data.tenNhaSanXuat,
          moTa: event.data.moTa,
          trangThai: event.data.trangThai,
          quocGia: event.data.quocGia,
        })
        .subscribe({
          next: (response) => {
            alert('Thêm mới Nhà sản xuất thành công!');
            this.loadLookups(); // Refresh all dropdowns
            this.cdr.detectChanges();
          },
          error: (error) => {
            alert(
              'Lỗi khi thêm mới Nhà sản xuất: ' +
              (error.error?.message || error.message || 'Không thể kết nối đến server')
            );
          },
        });
    } else if (event.type === 'chatLieuVo') {
      this.materialApi
        .create({
          tenChatLieu: event.data.tenChatLieu,
          moTa: event.data.moTa,
          trangThai: event.data.trangThai,
        })
        .subscribe({
          next: (response) => {
            alert('Thêm mới Chất liệu vỏ thành công!');
            this.loadLookups(); // Refresh all dropdowns
            this.cdr.detectChanges();
          },
          error: (error) => {
            alert(
              'Lỗi khi thêm mới Chất liệu vỏ: ' +
              (error.error?.message || error.message || 'Không thể kết nối đến server')
            );
          },
        });
    } else if (event.type === 'trongLuong') {
      this.trongLuongApi
        .create({
          giaTriTrongLuong: event.data.giaTriTrongLuong,
          donVi: event.data.donVi,
          moTa: event.data.moTa,
          trangThai: event.data.trangThai,
        })
        .subscribe({
          next: (response) => {
            alert('Thêm mới Trọng lượng thành công!');
            this.loadLookups(); // Refresh all dropdowns
            this.cdr.detectChanges();
          },
          error: (error) => {
            alert(
              'Lỗi khi thêm mới Trọng lượng: ' +
              (error.error?.message || error.message || 'Không thể kết nối đến server')
            );
          },
        });
    } else if (event.type === 'xuatXu') {
      this.originApi
        .create({
          tenXuatXu: event.data.tenXuatXu,
          moTa: event.data.moTa,
          trangThai: event.data.trangThai,
        })
        .subscribe({
          next: (response) => {
            alert('Thêm mới Xuất xứ thành công!');
            this.loadLookups(); // Refresh all dropdowns
            this.cdr.detectChanges();
          },
          error: (error) => {
            alert(
              'Lỗi khi thêm mới Xuất xứ: ' +
              (error.error?.message || error.message || 'Không thể kết nối đến server')
            );
          },
        });
    } else if (event.type === 'kieuDangMu') {
      this.helmetStyleApi
        .create({
          tenKieuDang: event.data.tenKieuDang,
          moTa: event.data.moTa,
          trangThai: event.data.trangThai,
        })
        .subscribe({
          next: (response) => {
            alert('Thêm mới Kiểu dáng mũ thành công!');
            this.loadLookups(); // Refresh all dropdowns
            this.cdr.detectChanges();
          },
          error: (error) => {
            alert(
              'Lỗi khi thêm mới Kiểu dáng mũ: ' +
              (error.error?.message || error.message || 'Không thể kết nối đến server')
            );
          },
        });
    } else if (event.type === 'congNgheAnToan') {
      this.congNgheAnToanApi
        .create({
          tenCongNghe: event.data.tenCongNghe,
          moTa: event.data.moTa,
          trangThai: event.data.trangThai,
        })
        .subscribe({
          next: (response) => {
            alert('Thêm mới Công nghệ an toàn thành công!');
            this.loadLookups(); // Refresh all dropdowns
            this.cdr.detectChanges();
          },
          error: (error) => {
            alert(
              'Lỗi khi thêm mới Công nghệ an toàn: ' +
              (error.error?.message || error.message || 'Không thể kết nối đến server')
            );
          },
        });
    } else {
      // Tạm thời hiển thị alert cho các loại khác
      const typeNames: { [key: string]: string } = {
        nhaSanXuat: 'Nhà sản xuất',
        chatLieuVo: 'Chất liệu vỏ',
        trongLuong: 'Trọng lượng',
        xuatXu: 'Xuất xứ',
        kieuDangMu: 'Kiểu dáng mũ',
        congNgheAnToan: 'Công nghệ an toàn',
        mauSac: 'Màu sắc',
      };

      const typeName = typeNames[event.type] || event.type;
      alert(
        `Tính năng thêm mới "${typeName}" sẽ được implement sau. Hiện tại bạn có thể thêm mới từ menu "Quản lý sản phẩm" tương ứng.`
      );
    }

    this.onQuickAddClose(); // Close modal
  }

  // Method để đóng quick add modal
  onQuickAddClose() {
    this.showQuickAddModal = false;
    this.quickAddModalType = '';
    this.cdr.detectChanges();
  }

  // Get page numbers for pagination
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(0, this.page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages - 1, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(0, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i + 1);
    }

    return pages;
  }

  // Pagination
  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.page = page;
      this.fetchProducts();
    }
  }
}
