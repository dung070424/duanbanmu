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

  // Converted data for searchable dropdowns
  loaiMuOptions: DropdownOption[] = [];
  nsxOptions: DropdownOption[] = [];
  chatLieuOptions: DropdownOption[] = [];
  trongLuongOptions: DropdownOption[] = [];
  xuatXuOptions: DropdownOption[] = [];
  kieuDangOptions: DropdownOption[] = [];
  congNgheOptions: DropdownOption[] = [];
  mauSacOptions: DropdownOption[] = [];

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
    private congNgheAnToanApi: CongNgheAnToanApiService
  ) {}

  ngOnInit() {
    this.generateProductCode();
    this.loadLookups();
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
          console.error('Error generating product code:', error);
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
      error: (error: any) => {
        console.error('Lỗi khi tải loại mũ bảo hiểm:', error);
      },
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
      error: (error: any) => {
        console.error('Lỗi khi tải nhà sản xuất:', error);
      },
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
      error: (error: any) => {
        console.error('Lỗi khi tải chất liệu:', error);
      },
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
      error: (error: any) => {
        console.error('Lỗi khi tải trọng lượng:', error);
      },
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
      error: (error: any) => {
        console.error('Lỗi khi tải xuất xứ:', error);
      },
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
      error: (error: any) => {
        console.error('Lỗi khi tải kiểu dáng:', error);
      },
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
      error: (error: any) => {
        console.error('Lỗi khi tải công nghệ:', error);
      },
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
      error: (error: any) => {
        console.error('Lỗi khi tải màu sắc:', error);
      },
    });
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
      case 'trongLuongId':
        return !this.newProduct.trongLuongId;
      case 'xuatXuId':
        return !this.newProduct.xuatXuId;
      case 'kieuDangMuId':
        return !this.newProduct.kieuDangMuId;
      case 'congNgheAnToanId':
        return !this.newProduct.congNgheAnToanId;
      case 'mauSacId':
        return !this.newProduct.mauSacId;
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
    console.log('Quick add save event:', event);
    this.showQuickAddModal = false;

    if (event.type === 'loaiMuBaoHiem') {
      const request: LoaiMuBaoHiemRequest = {
        tenLoai: event.data.tenLoai,
        moTa: event.data.moTa,
        trangThai: event.data.trangThai,
      };

      this.loaiMuBaoHiemApi.create(request).subscribe({
        next: (response) => {
          console.log('LoaiMuBaoHiem created:', response);
          alert('Thêm mới Loại mũ bảo hiểm thành công!');
          this.loadLoaiMuBaoHiem(); // Refresh dropdown
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error creating LoaiMuBaoHiem:', error);
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
            console.log('MauSac created:', response);
            alert('Thêm mới Màu sắc thành công!');
            this.loadMauSac(); // Refresh dropdown
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('Error creating MauSac:', error);
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
            console.log('Manufacturer created:', response);
            alert('Thêm mới Nhà sản xuất thành công!');
            this.loadNhaSanXuat(); // Refresh dropdown
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('Error creating Manufacturer:', error);
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
            console.log('Material created:', response);
            alert('Thêm mới Chất liệu vỏ thành công!');
            this.loadChatLieu(); // Refresh dropdown
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('Error creating Material:', error);
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
            console.log('TrongLuong created:', response);
            alert('Thêm mới Trọng lượng thành công!');
            this.loadTrongLuong(); // Refresh dropdown
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('Error creating TrongLuong:', error);
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
            console.log('Origin created:', response);
            alert('Thêm mới Xuất xứ thành công!');
            this.loadXuatXu(); // Refresh dropdown
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('Error creating Origin:', error);
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
            console.log('HelmetStyle created:', response);
            alert('Thêm mới Kiểu dáng mũ thành công!');
            this.loadKieuDang(); // Refresh dropdown
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('Error creating HelmetStyle:', error);
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
            console.log('CongNgheAnToan created:', response);
            alert('Thêm mới Công nghệ an toàn thành công!');
            this.loadCongNghe(); // Refresh dropdown
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('Error creating CongNgheAnToan:', error);
            alert(
              'Lỗi khi thêm mới Công nghệ an toàn: ' +
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

  isFormValid(): boolean {
    return (
      this.newProduct.code.trim() !== '' &&
      this.newProduct.name.trim() !== '' &&
      this.newProduct.price >= 0 &&
      this.newProduct.quantity >= 0 &&
      this.newProduct.loaiMuBaoHiemId !== null &&
      this.newProduct.nhaSanXuatId !== null &&
      this.newProduct.chatLieuVoId !== null &&
      this.newProduct.trongLuongId !== null &&
      this.newProduct.xuatXuId !== null &&
      this.newProduct.kieuDangMuId !== null &&
      this.newProduct.congNgheAnToanId !== null &&
      this.newProduct.mauSacId !== null
    );
  }

  onSubmit() {
    if (!this.isFormValid()) {
      // Mark all fields as touched to show validation errors
      this.touchedFields.add('code');
      this.touchedFields.add('name');
      this.touchedFields.add('price');
      this.touchedFields.add('quantity');
      this.touchedFields.add('loaiMuBaoHiemId');
      this.touchedFields.add('nhaSanXuatId');
      this.touchedFields.add('chatLieuVoId');
      this.touchedFields.add('trongLuongId');
      this.touchedFields.add('xuatXuId');
      this.touchedFields.add('kieuDangMuId');
      this.touchedFields.add('congNgheAnToanId');
      this.touchedFields.add('mauSacId');
      return;
    }

    this.isLoading = true;

    const payload = {
      maSanPham: this.newProduct.code,
      tenSanPham: this.newProduct.name,
      giaBan: this.newProduct.price,
      soLuongTon: this.newProduct.quantity,
      trangThai: this.newProduct.status === 'Đang bán',
      loaiMuBaoHiemId: this.newProduct.loaiMuBaoHiemId || undefined,
      nhaSanXuatId: this.newProduct.nhaSanXuatId || undefined,
      chatLieuVoId: this.newProduct.chatLieuVoId || undefined,
      trongLuongId: this.newProduct.trongLuongId || undefined,
      xuatXuId: this.newProduct.xuatXuId || undefined,
      kieuDangMuId: this.newProduct.kieuDangMuId || undefined,
      congNgheAnToanId: this.newProduct.congNgheAnToanId || undefined,
      mauSacId: this.newProduct.mauSacId || undefined,
      moTa: this.newProduct.description,
      anhSanPham: this.newProduct.anhSanPham,
    };

    this.productApi.create(payload).subscribe({
      next: (response) => {
        console.log('Tạo sản phẩm thành công:', response);
        alert('Thêm sản phẩm thành công!');
        this.router.navigate(['/products/helmets']);
      },
      error: (error) => {
        console.error('Lỗi khi tạo sản phẩm:', error);
        if (error?.status === 409) {
          // Xóa thông báo lỗi mã sản phẩm trùng lặp
          this.isLoading = false;
          return;
        }
        alert(
          `Lỗi khi tạo sản phẩm: ${error.error?.message || error.message || 'Lỗi không xác định'}`
        );
        this.isLoading = false;
      },
    });
  }

  onCancel() {
    this.router.navigate(['/products/helmets']);
  }
}
