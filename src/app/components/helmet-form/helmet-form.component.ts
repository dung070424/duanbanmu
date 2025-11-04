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
import {
  HelmetVersionApiService,
  HelmetVersionRequest,
} from '../../services/helmet-version-api.service';
import { SizeApiService, SizeResponse } from '../../services/size-api.service';

interface HelmetProduct {
  id: number;
  code: string;
  name: string;
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

@Component({
  selector: 'app-helmet-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    QuickAddModalComponent,
    SearchableDropdownComponent,
  ],
  templateUrl: './helmet-form.component.html',
  styleUrls: ['./helmet-form.component.scss'],
})
export class HelmetFormComponent implements OnInit {
  Math = Math;
  loaiMuList: { id: number; tenLoai: string }[] = [];
  nsxList: { id: number; tenNhaSanXuat: string }[] = [];
  chatLieuList: { id: number; tenChatLieu: string }[] = [];
  trongLuongList: { id: number; giaTriTrongLuong: number }[] = [];
  xuatXuList: { id: number; tenXuatXu: string }[] = [];
  kieuDangList: { id: number; tenKieuDang: string }[] = [];
  congNgheList: { id: number; tenCongNghe: string }[] = [];
  mauSacList: { id: number; tenMau: string; maMau: string }[] = [];
  kichThuocList: { id: number; tenKichThuoc: string }[] = [];

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

  newProduct: HelmetProduct = {
    id: 0,
    code: '', // Will be auto-generated
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
    status: 'Ngừng bán', // Thay đổi trạng thái mặc định
    description: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Track which fields have been touched by user
  touchedFields: Set<string> = new Set();

  // Quick Add Modal state
  showQuickAddModal: boolean = false;
  quickAddModalType: string = '';

  // Loading state
  isLoading: boolean = false;

  selectedSizes: number[] = [];
  selectedColors: number[] = [];

  helmetVersions: any[] = [];
  priceAll: number = 0;
  quantityAll: number = 0;
  generatingVariants: boolean = false;
  versionError: string = '';

  deletedVersionIds: number[] = [];

  // Confirm dialogs state
  showConfirmCreate: boolean = false;
  showConfirmUpdate: boolean = false;

  public get hasHelmetVersions(): boolean {
    return Array.isArray(this.helmetVersions) && this.helmetVersions.length > 0;
  }

  // Chuẩn hóa giá trị số: nhận string/number, bỏ dấu phẩy/khoảng trắng, ép về number an toàn
  private toNumberSafe(value: any, fallback = 0): number {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : fallback;
    }
    const cleaned = String(value)
      .replace(/\s+/g, '') // remove spaces
      .replace(/[,]/g, '') // remove thousand separators
      .replace(/[^0-9.-]/g, ''); // keep digits, minus, dot
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : fallback;
  }

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
    private sizeApi: SizeApiService
  ) {}

  ngOnInit() {
    this.generateProductCode();
    this.loadLookups();
    this.loadKichThuoc();
    // Nếu là sửa sản phẩm (điều kiện là id > 0)
    if (this.newProduct && this.newProduct.id > 0) {
      this.helmetVersionApi.getBySanPhamId(this.newProduct.id).subscribe({
        next: (res: any) => {
          // Xử lý response structure khác nhau
          // Backend trả về List trực tiếp (không wrap) hoặc wrap trong ApiResponse với field 'data'
          const raw = Array.isArray(res) ? res : res?.data || [];
          this.helmetVersions = (raw || []).map((v: any) => {
            // Lấy trongLuongTen từ DB - ƯU TIÊN, không dùng trongLuongId
            let trongLuongTen = v.trongLuongTen || v.trong_luong_ten || '';
            // Nếu null hoặc undefined, chuyển thành chuỗi rỗng
            if (trongLuongTen === null || trongLuongTen === undefined || trongLuongTen === 'null') {
              trongLuongTen = '';
            }
            return {
              id: v.id,
              sanPhamId: v.sanPhamId || v.san_pham_id,
              kichThuocId: v.kichThuocId || v.kich_thuoc_id,
              mauSacId: v.mauSacId || v.mau_sac_id,
              trongLuongId: null, // KHÔNG DÙNG ID - chỉ dùng trongLuongTen
              trongLuongTen: trongLuongTen, // Lấy TỪ CỘT trong_luong_ten trong DB
              giaBan: v.giaBan || v.gia_ban || '',
              soLuongTon: v.soLuongTon || v.so_luong_ton || '',
              trangThai:
                v.trangThai !== undefined
                  ? v.trangThai
                  : v.trang_thai !== undefined
                  ? v.trang_thai
                  : true,
              isNew: false,
            };
          });
          this.cdr.detectChanges();
        },
        error: (err) => {},
      });
    }
  }

  // Generate product code automatically
  generateProductCode() {
    // Set default first to show immediately
    this.newProduct.code = 'SP0001';

    this.productApi
      .search({
        keyword: '',
        page: 0,
        size: 1,
        sort: 'id,desc',
      })
      .subscribe({
        next: (response) => {
          let nextNumber = 1;

          if (response.content && response.content.length > 0) {
            // Get the last product code
            const lastProduct = response.content[0];
            const lastCode = lastProduct.maSanPham;

            // Extract number from code like "SP0001"
            if (lastCode && lastCode.startsWith('SP')) {
              const numStr = lastCode.substring(2);
              const num = parseInt(numStr, 10);
              if (!isNaN(num)) {
                nextNumber = num + 1;
              }
            }
          }

          // Format: SP0001, SP0002, etc.
          this.newProduct.code = `SP${nextNumber.toString().padStart(4, '0')}`;
          this.cdr.detectChanges(); // Force update view
        },
        error: (error) => {
          // Keep SP0001 as fallback
          this.newProduct.code = 'SP0001';
          this.cdr.detectChanges(); // Force update view
        },
      });
  }

  loadLookups() {
    // Load all lookup data
    this.loadLoaiMuBaoHiem();
    this.loadNhaSanXuat();
    this.loadChatLieu();
    this.loadTrongLuong();
    this.loadXuatXu();
    this.loadKieuDang();
    this.loadCongNghe();
    this.loadMauSac();
    this.loadKichThuoc();
  }

  loadLoaiMuBaoHiem() {
    this.loaiMuBaoHiemApi.getAllActive().subscribe({
      next: (response: any) => {
        this.loaiMuList = response || [];
        this.loaiMuOptions = this.loaiMuList.map((item: any) => ({
          id: item.id,
          name: item.tenLoai,
        }));
      },
      error: (error: any) => {},
    });
  }

  loadNhaSanXuat() {
    this.manufacturerApi.search({ trangThai: true, page: 0, size: 1000 }).subscribe({
      next: (response: any) => {
        this.nsxList = response.content || [];
        this.nsxOptions = this.nsxList.map((item: any) => ({
          id: item.id,
          name: item.ten,
        }));
      },
      error: (error: any) => {},
    });
  }

  loadChatLieu() {
    this.materialApi.getAllActive().subscribe({
      next: (response: any) => {
        this.chatLieuList = response || [];
        this.chatLieuOptions = this.chatLieuList.map((item: any) => ({
          id: item.id,
          name: item.tenChatLieu,
        }));
      },
      error: (error: any) => {},
    });
  }

  loadTrongLuong() {
    this.trongLuongApi.getAllActive().subscribe({
      next: (response: any) => {
        this.trongLuongList = response || [];
        this.trongLuongOptions = this.trongLuongList.map((item: any) => ({
          id: item.id,
          name: `${item.giaTriTrongLuong}g`,
        }));
      },
      error: (error: any) => {},
    });
  }

  loadXuatXu() {
    this.originApi.getAllActive().subscribe({
      next: (response: any) => {
        this.xuatXuList = response || [];
        this.xuatXuOptions = this.xuatXuList.map((item: any) => ({
          id: item.id,
          name: item.tenXuatXu,
        }));
      },
      error: (error: any) => {},
    });
  }

  loadKieuDang() {
    this.helmetStyleApi.search({ trangThai: true, page: 0, size: 1000 }).subscribe({
      next: (response: any) => {
        this.kieuDangList = response.content || [];
        this.kieuDangOptions = this.kieuDangList.map((item: any) => ({
          id: item.id,
          name: item.tenKieuDang,
        }));
      },
      error: (error: any) => {},
    });
  }

  loadCongNghe() {
    this.congNgheAnToanApi.getAllActive().subscribe({
      next: (response: any) => {
        this.congNgheList = response || [];
        this.congNgheOptions = this.congNgheList.map((item: any) => ({
          id: item.id,
          name: item.tenCongNghe,
        }));
      },
      error: (error: any) => {},
    });
  }

  loadMauSac() {
    this.colorApi.getAllActive().subscribe({
      next: (response: any) => {
        this.mauSacList = response || [];
        this.mauSacOptions = this.mauSacList.map((item: any) => ({
          id: item.id,
          name: item.tenMau,
        }));
      },
      error: (error: any) => {},
    });
  }

  loadKichThuoc() {
    this.sizeApi.getAllActive().subscribe((response: SizeResponse[]) => {
      this.kichThuocOptions = (response || []).map((item) => ({
        id: item.id,
        name: item.tenKichThuoc,
      }));
      this.cdr.detectChanges();
    });
  }

  getKichThuocTenById(id: number): string {
    const obj = this.kichThuocOptions?.find((opt) => opt.id === id);
    return obj ? obj.name : id + '';
  }
  getMauSacTenById(id: number): string {
    const obj = this.mauSacOptions?.find((opt) => opt.id === id);
    return obj ? obj.name : id + '';
  }
  getMauSacMaById(id: number): string {
    const obj = this.mauSacOptions?.find((opt) => opt.id === id);
    return obj && obj['maMau'] ? obj['maMau'] : '';
  }
  getTrongLuongTenById(id: number): string {
    const obj = this.trongLuongOptions?.find((opt) => opt.id === id);
    return obj ? obj.name : id + '';
  }

  onSelect(field: string, value: number | null) {
    switch (field) {
      case 'loaiMuBaoHiemId':
        this.newProduct.loaiMuBaoHiemId = value;
        break;
      case 'nhaSanXuatId':
        this.newProduct.nhaSanXuatId = value;
        break;
      case 'chatLieuVoId':
        this.newProduct.chatLieuVoId = value;
        break;
      case 'trongLuongId':
        this.newProduct.trongLuongId = value;
        break;
      case 'xuatXuId':
        this.newProduct.xuatXuId = value;
        break;
      case 'kieuDangMuId':
        this.newProduct.kieuDangMuId = value;
        break;
      case 'congNgheAnToanId':
        this.newProduct.congNgheAnToanId = value;
        break;
      case 'mauSacId':
        this.newProduct.mauSacId = value;
        break;
    }
    this.markFieldTouched(field);
  }

  markFieldTouched(field: string) {
    this.touchedFields.add(field);
  }

  hasFieldError(field: string): boolean {
    if (!this.touchedFields.has(field)) return false;

    switch (field) {
      case 'code':
        return !this.newProduct.code || this.newProduct.code.trim() === '';
      case 'name':
        return !this.newProduct.name || this.newProduct.name.trim() === '';
      case 'price':
        return this.newProduct.price < 0;
      case 'quantity':
        return this.newProduct.quantity < 0;
      default:
        return false;
    }
  }

  hasDropdownError(field: string): boolean {
    if (!this.touchedFields.has(field)) return false;

    switch (field) {
      case 'loaiMuBaoHiemId':
        return !this.newProduct.loaiMuBaoHiemId;
      case 'nhaSanXuatId':
        return !this.newProduct.nhaSanXuatId;
      case 'chatLieuVoId':
        return !this.newProduct.chatLieuVoId;
      case 'xuatXuId':
        return !this.newProduct.xuatXuId;
      case 'kieuDangMuId':
        return !this.newProduct.kieuDangMuId;
      case 'congNgheAnToanId':
        return !this.newProduct.congNgheAnToanId;
      default:
        return false;
    }
  }

  getCodeError(): string {
    if (!this.newProduct.code || this.newProduct.code.trim() === '') {
      return 'Mã sản phẩm không được để trống';
    }
    return '';
  }

  getNameError(): string {
    if (!this.newProduct.name || this.newProduct.name.trim() === '') {
      return 'Tên sản phẩm không được để trống';
    }
    return '';
  }

  getPriceError(): string {
    if (this.newProduct.price < 0) {
      return 'Giá bán không được âm';
    }
    return '';
  }

  getQuantityError(): string {
    if (this.newProduct.quantity < 0) {
      return 'Số lượng tồn không được âm';
    }
    return '';
  }

  openQuickAddModal(type: string) {
    this.quickAddModalType = type;
    this.showQuickAddModal = true;
  }

  onQuickAddSuccess(event: { type: string; data: any }) {
    this.showQuickAddModal = false;

    if (event.type === 'loaiMuBaoHiem') {
      const request: LoaiMuBaoHiemRequest = {
        tenLoai: event.data.tenLoai,
        moTa: event.data.moTa,
        trangThai: event.data.trangThai,
      };

      this.loaiMuBaoHiemApi.create(request).subscribe({
        next: (response) => {
          alert('Thêm mới Loại mũ bảo hiểm thành công!');
          this.loadLoaiMuBaoHiem(); // Refresh dropdown
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
            this.loadMauSac(); // Refresh dropdown
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
            this.loadNhaSanXuat(); // Refresh dropdown
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
            this.loadChatLieu(); // Refresh dropdown
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
            this.loadTrongLuong(); // Refresh dropdown
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
            this.loadXuatXu(); // Refresh dropdown
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
            this.loadKieuDang(); // Refresh dropdown
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
            this.loadCongNghe(); // Refresh dropdown
            this.cdr.detectChanges();
          },
          error: (error) => {
            alert(
              'Lỗi khi thêm mới Công nghệ an toàn: ' +
                (error.error?.message || error.message || 'Không thể kết nối đến server')
            );
          },
        });
    } else if (event.type === 'kichThuoc') {
      this.sizeApi
        .create({
          tenKichThuoc: event.data.tenKichThuoc,
          moTa: event.data.moTa,
          trangThai: event.data.trangThai,
        })
        .subscribe({
          next: () => {
            alert('Thêm mới Kích thước thành công!');
            this.loadKichThuoc();
            this.cdr.detectChanges();
          },
          error: (error) => {
            alert(
              'Lỗi khi thêm mới Kích thước: ' +
                (error.error?.message || error.message || 'Không thể kết nối đến server')
            );
          },
        });
    }
  }

  onQuickAddCancel() {
    this.showQuickAddModal = false;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.newProduct.anhSanPham = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  // Sinh các phiên bản/biến thể dựa vào tổ hợp thuộc tính user chọn
  generateVariants() {
    const oldVersions = this.helmetVersions || [];
    this.helmetVersions = [];
    this.versionError = '';
    if (this.selectedSizes.length === 0 || this.selectedColors.length === 0) {
      this.versionError = 'Vui lòng chọn ít nhất một kích thước và một màu sắc để sinh phiên bản!';
      return;
    }
    this.selectedSizes.forEach((kichThuocId) => {
      this.selectedColors.forEach((mauSacId) => {
        // Tìm bản ghi cũ (nếu có) theo kích thước và màu
        const old = oldVersions.find((v) => v.kichThuocId == kichThuocId && v.mauSacId == mauSacId);
        this.helmetVersions.push({
          kichThuocId,
          mauSacId,
          trongLuongId: null, // Không dùng ID nữa
          trongLuongTen: old && typeof old.trongLuongTen !== 'undefined' ? old.trongLuongTen : '',
          giaBan: String(
            (old && typeof old.giaBan !== 'undefined' ? old.giaBan : this.priceAll) || ''
          ),
          soLuongTon: String(
            (old && typeof old.soLuongTon !== 'undefined' ? old.soLuongTon : this.quantityAll) || ''
          ),
          trangThai: true, // default on
        });
      });
    });
  }

  onPriceChangeAll() {
    this.helmetVersions.forEach((v) => {
      v.giaBan = this.priceAll ? String(this.priceAll) : '';
    });
  }
  onQuantityChangeAll() {
    this.helmetVersions.forEach((v) => {
      v.soLuongTon = this.quantityAll ? String(this.quantityAll) : '';
    });
  }
  onPriceChangeRow(index: number, value: any) {
    const val = value !== undefined && value !== null ? String(value).trim() : '';
    this.helmetVersions[index].giaBan = val;
  }
  onQuantityChangeRow(index: number, value: any) {
    const val = value !== undefined && value !== null ? String(value).trim() : '';
    this.helmetVersions[index].soLuongTon = val;
  }
  removeVariant(index: number) {
    const v = this.helmetVersions[index];
    if (v && v.id) {
      this.deletedVersionIds.push(v.id);
    }
    this.helmetVersions.splice(index, 1);
  }

  castVersionNumber(index: number, field: 'giaBan' | 'soLuongTon') {
    if (!this.helmetVersions || !this.helmetVersions[index]) return;
    // No-op: giữ nguyên chuỗi người dùng nhập
    return;
  }

  isFormValid(): boolean {
    // Phải có đủ mã, tên sản phẩm, và ít nhất 1 phiên bản
    if (
      !this.newProduct.code.trim() ||
      !this.newProduct.name.trim() ||
      this.helmetVersions.length === 0
    )
      return false;
    // Chỉ cần có kích thước; giá và số lượng để dạng chuỗi (không bắt buộc ràng số)
    for (const [i, v] of this.helmetVersions.entries()) {
      if (!v.kichThuocId) {
        this.versionError = `Biến thể dòng ${i + 1} thiếu kích thước!`;
        return false;
      }
    }
    this.versionError = '';
    return true;
  }

  requestCreate() {
    // Hiển thị modal xác nhận trước khi thêm mới
    this.showConfirmCreate = true;
  }

  confirmCreate() {
    this.showConfirmCreate = false;
    this.onSubmit();
  }

  cancelConfirmCreate() {
    this.showConfirmCreate = false;
  }

  onSubmit() {
    if (!this.isFormValid()) {
      this.versionError =
        this.helmetVersions.length === 0 ? 'Bạn cần tạo ít nhất một phiên bản cho sản phẩm!' : '';
      // Mark all fields as touched to show validation errors
      this.touchedFields.add('code');
      this.touchedFields.add('name');
      this.touchedFields.add('loaiMuBaoHiemId');
      this.touchedFields.add('nhaSanXuatId');
      this.touchedFields.add('chatLieuVoId');
      this.touchedFields.add('xuatXuId');
      this.touchedFields.add('kieuDangMuId');
      this.touchedFields.add('congNgheAnToanId');
      return;
    }

    this.isLoading = true;

    // Lấy giá bán từ giá chung hoặc giá của phiên bản đầu tiên
    let giaBanValue: number | undefined = undefined;
    if (this.priceAll && this.priceAll > 0) {
      giaBanValue = this.priceAll;
    } else if (this.helmetVersions.length > 0 && this.helmetVersions[0].giaBan) {
      const firstPrice = this.helmetVersions[0].giaBan;
      if (typeof firstPrice === 'string') {
        giaBanValue = parseFloat(firstPrice.replace(/,/g, '').replace(/\s/g, '')) || undefined;
      } else if (typeof firstPrice === 'number') {
        giaBanValue = firstPrice;
      }
    }

    // Lấy số lượng tồn từ số lượng chung hoặc số lượng của phiên bản đầu tiên
    let soLuongTonValue: number | undefined = undefined;
    if (this.quantityAll && this.quantityAll > 0) {
      soLuongTonValue = this.quantityAll;
    } else if (this.helmetVersions.length > 0 && this.helmetVersions[0].soLuongTon) {
      const firstQuantity = this.helmetVersions[0].soLuongTon;
      if (typeof firstQuantity === 'string') {
        soLuongTonValue =
          parseInt(firstQuantity.replace(/,/g, '').replace(/\s/g, ''), 10) || undefined;
      } else if (typeof firstQuantity === 'number') {
        soLuongTonValue = firstQuantity;
      }
    }

    const payload = {
      maSanPham: this.newProduct.code,
      tenSanPham: this.newProduct.name,
      trangThai: true,
      loaiMuBaoHiemId: this.newProduct.loaiMuBaoHiemId || undefined,
      nhaSanXuatId: this.newProduct.nhaSanXuatId || undefined,
      chatLieuVoId: this.newProduct.chatLieuVoId || undefined,
      trongLuongId: this.newProduct.trongLuongId || undefined, // Thêm trongLuongId
      xuatXuId: this.newProduct.xuatXuId || undefined,
      kieuDangMuId: this.newProduct.kieuDangMuId || undefined,
      congNgheAnToanId: this.newProduct.congNgheAnToanId || undefined,
      moTa: this.newProduct.description,
      anhSanPham: this.newProduct.anhSanPham,
      giaBan: giaBanValue !== undefined ? giaBanValue : 0, // Gửi giá bán, mặc định 0 nếu không có
      soLuongTon: soLuongTonValue !== undefined ? soLuongTonValue : 0, // Gửi số lượng tồn, mặc định 0 nếu không có
    };

    this.productApi.create(payload as any).subscribe({
      next: (response: any) => {
        const sanPhamId = response.id || response?.idSanPham || null;
        if (!sanPhamId) {
          this.isLoading = false;
          alert('Không nhận được mã sản phẩm sau khi tạo!');
          return;
        }
        // Gọi lần lượt API tạo các phiên bản
        let doneCount = 0;
        let errorFlag = false;
        this.helmetVersions.forEach((v, idx) => {
          const versionPayload: HelmetVersionRequest = {
            sanPhamId,
            kichThuocId: Number(v.kichThuocId),
            mauSacId: Number(v.mauSacId),
            trongLuongId: v.trongLuongId ? Number(v.trongLuongId) : null,
            trongLuongTen: v.trongLuongTen || null,
            giaBan: v.giaBan !== undefined && v.giaBan !== null ? String(v.giaBan) : '',
            soLuongTon:
              v.soLuongTon !== undefined && v.soLuongTon !== null ? String(v.soLuongTon) : '',
            trangThai: true,
          };
          this.helmetVersionApi.create(versionPayload).subscribe({
            next: () => {
              doneCount++;
              if (doneCount === this.helmetVersions.length && !errorFlag) {
                alert('Tạo sản phẩm và các phiên bản thành công!');
                this.router.navigate(['/products/helmets']);
              }
            },
            error: (err: any) => {
              errorFlag = true;
              alert(
                'Lỗi khi tạo phiên bản: ' + (err.error?.message || err.message || 'Không xác định')
              );
              this.isLoading = false;
            },
          });
        });
      },
      error: (error) => {
        this.isLoading = false;
        alert(
          'Lỗi khi tạo sản phẩm: ' + (error.error?.message || error.message || 'Không xác định')
        );
      },
    });
  }

  requestUpdate() {
    this.showConfirmUpdate = true;
  }

  confirmUpdate() {
    this.showConfirmUpdate = false;
    this.onUpdate();
  }

  cancelConfirmUpdate() {
    this.showConfirmUpdate = false;
  }

  onUpdate() {
    // Lấy giá bán từ giá chung hoặc giá của phiên bản đầu tiên
    let giaBanValue: number | undefined = undefined;
    if (this.priceAll && this.priceAll > 0) {
      giaBanValue = this.priceAll;
    } else if (this.helmetVersions.length > 0 && this.helmetVersions[0].giaBan) {
      const firstPrice = this.helmetVersions[0].giaBan;
      if (typeof firstPrice === 'string') {
        giaBanValue = parseFloat(firstPrice.replace(/,/g, '').replace(/\s/g, '')) || undefined;
      } else if (typeof firstPrice === 'number') {
        giaBanValue = firstPrice;
      }
    }

    // Lấy số lượng tồn từ số lượng chung hoặc số lượng của phiên bản đầu tiên
    let soLuongTonValue: number | undefined = undefined;
    if (this.quantityAll && this.quantityAll > 0) {
      soLuongTonValue = this.quantityAll;
    } else if (this.helmetVersions.length > 0 && this.helmetVersions[0].soLuongTon) {
      const firstQuantity = this.helmetVersions[0].soLuongTon;
      if (typeof firstQuantity === 'string') {
        soLuongTonValue =
          parseInt(firstQuantity.replace(/,/g, '').replace(/\s/g, ''), 10) || undefined;
      } else if (typeof firstQuantity === 'number') {
        soLuongTonValue = firstQuantity;
      }
    }

    // Cập nhật sản phẩm chính (giả sử payload giống onSubmit)
    const payload = {
      maSanPham: this.newProduct.code,
      tenSanPham: this.newProduct.name,
      trangThai: this.newProduct.status === 'Đang bán',
      loaiMuBaoHiemId: this.newProduct.loaiMuBaoHiemId || undefined,
      nhaSanXuatId: this.newProduct.nhaSanXuatId || undefined,
      chatLieuVoId: this.newProduct.chatLieuVoId || undefined,
      trongLuongId: this.newProduct.trongLuongId || undefined, // Thêm trongLuongId
      xuatXuId: this.newProduct.xuatXuId || undefined,
      kieuDangMuId: this.newProduct.kieuDangMuId || undefined,
      congNgheAnToanId: this.newProduct.congNgheAnToanId || undefined,
      moTa: this.newProduct.description,
      anhSanPham: this.newProduct.anhSanPham,
      giaBan: giaBanValue !== undefined ? giaBanValue : 0, // Gửi giá bán, mặc định 0 nếu không có
      soLuongTon: soLuongTonValue !== undefined ? soLuongTonValue : 0, // Gửi số lượng tồn, mặc định 0 nếu không có
    };
    this.productApi.update(this.newProduct.id, payload as any).subscribe({
      next: (response: any) => {
        const sanPhamId = response.id || this.newProduct.id;
        // Update + create variant
        this.helmetVersions.forEach((v, idx) => {
          const versionPayload: HelmetVersionRequest = {
            sanPhamId,
            kichThuocId: Number(v.kichThuocId),
            mauSacId: Number(v.mauSacId),
            trongLuongId: v.trongLuongId ? Number(v.trongLuongId) : null,
            trongLuongTen: v.trongLuongTen || null,
            giaBan: v.giaBan !== undefined && v.giaBan !== null ? String(v.giaBan) : '',
            soLuongTon:
              v.soLuongTon !== undefined && v.soLuongTon !== null ? String(v.soLuongTon) : '',
            trangThai: true,
          };
          if (v.id) {
            this.helmetVersionApi.update(v.id, versionPayload).subscribe();
          } else {
            this.helmetVersionApi.create(versionPayload).subscribe();
          }
        });
        // Delete removed variants
        this.deletedVersionIds.forEach((id) => this.helmetVersionApi.delete(id).subscribe());
        alert('Cập nhật sản phẩm và các phiên bản thành công!');
        this.router.navigate(['/products/helmets']);
      },
      error: (err) => alert(err.error?.message || 'Lỗi cập nhật'),
    });
  }

  onCancel() {
    this.router.navigate(['/products/helmets']);
  }
}
