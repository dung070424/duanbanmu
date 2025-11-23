import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NhanVienService } from '../../services/nhan-vien.service';
import { CaLamService, LichLamRequest, CaLamItem, NhanVienCaLam } from '../../services/ca-lam.service';
import { NhanVien } from '../../interfaces/nhan-vien.interface';
import { Subject, takeUntil } from 'rxjs';

interface CaLam {
  nhanVienId: number;
  thu2?: number; // 1, 2, 3, 4
  thu3?: number;
  thu4?: number;
  thu5?: number;
  thu6?: number;
  thu7?: number;
  chuNhat?: number;
}

interface NhanVienWithCa {
  stt: number;
  nhanVien: NhanVien;
  caLam: CaLam;
  viTriLamViec?: string; // Vị trí làm việc của nhân viên
}

@Component({
  selector: 'app-ca-lam-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ca-lam-management.component.html',
  styleUrls: ['./ca-lam-management.component.scss'],
})
export class CaLamManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  nhanVienList: NhanVien[] = [];
  nhanVienWithCaList: NhanVienWithCa[] = [];
  loading = false;
  errorMessage = '';
  
  // Tuần hiện tại
  currentWeek = 1;
  currentYear = new Date().getFullYear();
  
  // Danh sách các ngày trong tuần
  weekDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
  
  // Ngày bắt đầu và kết thúc của tuần
  weekStartDate: Date | null = null;
  weekEndDate: Date | null = null;

  // Dữ liệu tạm thời để hủy
  tempCaLamData: Map<number, CaLam> = new Map();
  tempViTriData: Map<number, string> = new Map();

  // Lịch sử ca làm
  lichSuCaLam: any[] = [];
  
  // Định nghĩa các ca
  caList = [
    { id: 1, name: 'Ca 1', time: '6h - 14h', color: '#C6EFCE' }, // Xanh lá nhạt
    { id: 2, name: 'Ca 2', time: '14h - 22h', color: '#FFEB9C' }, // Cam/vàng
    { id: 3, name: 'Ca 3', time: '22h - 6h', color: '#BDD7EE' }, // Xanh dương
    { id: 4, name: 'Ca 4', time: 'Hành Chính (7h - 16h)', color: '#A9D08E' }, // Xanh lá đậm
  ];

  // Danh sách vị trí làm việc
  viTriLamViecList = [
    'Nhân Viên Thu Ngân',
    'Quản Lý Ca',
    'Nhân Viên Phục Vụ',
    'Nhân Viên Bảo Vệ'
  ];

  constructor(
    private nhanVienService: NhanVienService,
    private caLamService: CaLamService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Tính tuần hiện tại dựa trên ngày thực tế
    this.calculateCurrentWeek();
    this.calculateWeekDates();
    this.loadNhanVienList();
    this.loadLichSuCaLam();
  }

  // Tính tuần hiện tại dựa trên ngày thực tế (tuần bắt đầu từ thứ 2)
  calculateCurrentWeek(): void {
    const today = new Date();
    // Đặt về 0 giờ để so sánh chính xác
    today.setHours(0, 0, 0, 0);
    
    // Tìm thứ 2 của tuần hiện tại
    const currentMonday = new Date(today);
    const dayOfWeek = today.getDay(); // 0 = Chủ Nhật, 1 = Thứ 2, ...
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Số ngày cần lùi về thứ 2
    currentMonday.setDate(today.getDate() - daysToMonday);
    currentMonday.setHours(0, 0, 0, 0);
    
    // Xác định năm của tuần (có thể là năm trước nếu thứ 2 thuộc năm trước)
    this.currentYear = currentMonday.getFullYear();
    
    // Tìm thứ 2 đầu tiên của năm
    const jan1 = new Date(this.currentYear, 0, 1);
    jan1.setHours(0, 0, 0, 0);
    const firstMonday = new Date(jan1);
    const jan1DayOfWeek = jan1.getDay();
    
    if (jan1DayOfWeek === 0) {
      // Nếu 1/1 là Chủ Nhật, thứ 2 đầu tiên là 2/1
      firstMonday.setDate(2);
    } else if (jan1DayOfWeek !== 1) {
      // Nếu 1/1 không phải thứ 2, tính số ngày cần thêm để đến thứ 2
      const daysToAdd = 8 - jan1DayOfWeek;
      firstMonday.setDate(1 + daysToAdd);
    }
    firstMonday.setHours(0, 0, 0, 0);
    
    // Tính số tuần từ thứ 2 đầu tiên đến thứ 2 của tuần hiện tại
    const diffTime = currentMonday.getTime() - firstMonday.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      // Nếu thứ 2 hiện tại trước thứ 2 đầu tiên của năm, thì thuộc tuần cuối năm trước
      this.currentYear = this.currentYear - 1;
      const prevJan1 = new Date(this.currentYear, 0, 1);
      prevJan1.setHours(0, 0, 0, 0);
      const prevFirstMonday = new Date(prevJan1);
      const prevDayOfWeek = prevJan1.getDay();
      
      if (prevDayOfWeek === 0) {
        prevFirstMonday.setDate(2);
      } else if (prevDayOfWeek !== 1) {
        const daysToAdd = 8 - prevDayOfWeek;
        prevFirstMonday.setDate(1 + daysToAdd);
      }
      prevFirstMonday.setHours(0, 0, 0, 0);
      
      const prevDiffTime = currentMonday.getTime() - prevFirstMonday.getTime();
      const prevDiffDays = Math.floor(prevDiffTime / (1000 * 60 * 60 * 24));
      this.currentWeek = Math.floor(prevDiffDays / 7) + 1;
    } else {
      // Tính tuần hiện tại
      this.currentWeek = Math.floor(diffDays / 7) + 1;
    }
    
    // Đảm bảo tuần trong khoảng hợp lệ (1-53)
    if (this.currentWeek < 1) {
      this.currentWeek = 1;
    } else if (this.currentWeek > 53) {
      this.currentWeek = 53;
    }
  }

  // Tính ngày bắt đầu và kết thúc của tuần
  calculateWeekDates(): void {
    // Lấy ngày 1 tháng 1 của năm hiện tại
    const jan1 = new Date(this.currentYear, 0, 1);
    
    // Tính ngày thứ 2 đầu tiên của năm (tuần 1 bắt đầu từ thứ 2)
    const firstMonday = new Date(jan1);
    const dayOfWeek = jan1.getDay(); // 0 = Chủ Nhật, 1 = Thứ 2, ...
    
    // Nếu 1/1 không phải thứ 2, tìm thứ 2 đầu tiên
    if (dayOfWeek === 0) {
      // Nếu 1/1 là Chủ Nhật, thứ 2 đầu tiên là 2/1
      firstMonday.setDate(2);
    } else if (dayOfWeek !== 1) {
      // Nếu 1/1 không phải thứ 2, tính số ngày cần thêm để đến thứ 2
      const daysToAdd = 8 - dayOfWeek; // 8 - dayOfWeek để đến thứ 2 tuần sau
      firstMonday.setDate(1 + daysToAdd);
    }
    
    // Tính ngày bắt đầu của tuần hiện tại
    const weekStart = new Date(firstMonday);
    weekStart.setDate(firstMonday.getDate() + (this.currentWeek - 1) * 7);
    
    this.weekStartDate = weekStart;
    this.weekEndDate = new Date(weekStart);
    this.weekEndDate.setDate(weekStart.getDate() + 6); // Thêm 6 ngày để có Chủ Nhật
  }

  // Format ngày theo định dạng "DD tháng MM năm YYYY"
  formatDate(date: Date | null): string {
    if (!date) return '';
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day} tháng ${month} năm ${year}`;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadNhanVienList(): void {
    this.loading = true;
    this.errorMessage = '';
    
    // Lấy tất cả nhân viên (có thể cần lấy nhiều trang)
    this.nhanVienService
      .getAllNhanVien(0, 1000, 'id', 'asc')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Chỉ lấy nhân viên đang hoạt động
          this.nhanVienList = response.content.filter((nv) => nv.trangThai === true);
          this.loadCaLamFromAPI();
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading employees:', error);
          this.errorMessage = 'Không thể tải danh sách nhân viên';
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }

  // Load ca làm từ API
  loadCaLamFromAPI(): void {
    this.caLamService.getLichLamByWeek(this.currentWeek, this.currentYear)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Tạo map để tìm nhanh ca làm theo userId
          const caLamMap = new Map<number, NhanVienCaLam>();
          response.nhanVienList.forEach(nv => {
            caLamMap.set(nv.userId, nv);
          });

          // Khởi tạo danh sách nhân viên với ca làm
          this.nhanVienWithCaList = this.nhanVienList.map((nv, index) => {
            const nvCaLam = caLamMap.get(nv.userId || 0);
            
            return {
              stt: index + 1,
              nhanVien: nv,
              caLam: nvCaLam ? {
                nhanVienId: nv.id!,
                thu2: nvCaLam.caLam.thu2,
                thu3: nvCaLam.caLam.thu3,
                thu4: nvCaLam.caLam.thu4,
                thu5: nvCaLam.caLam.thu5,
                thu6: nvCaLam.caLam.thu6,
                thu7: nvCaLam.caLam.thu7,
                chuNhat: nvCaLam.caLam.chuNhat,
              } : {
                nhanVienId: nv.id!,
                thu2: undefined,
                thu3: undefined,
                thu4: undefined,
                thu5: undefined,
                thu6: undefined,
                thu7: undefined,
                chuNhat: undefined,
              },
              viTriLamViec: nvCaLam?.position || this.viTriLamViecList[0],
            };
          });
          
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading ca lam:', error);
          // Nếu lỗi, khởi tạo với dữ liệu rỗng
          this.initializeCaLamDataEmpty();
        }
      });
  }

  // Khởi tạo dữ liệu rỗng khi không load được từ API
  initializeCaLamDataEmpty(): void {
    this.nhanVienWithCaList = this.nhanVienList.map((nv, index) => ({
      stt: index + 1,
      nhanVien: nv,
      caLam: {
        nhanVienId: nv.id!,
        thu2: undefined,
        thu3: undefined,
        thu4: undefined,
        thu5: undefined,
        thu6: undefined,
        thu7: undefined,
        chuNhat: undefined,
      },
      viTriLamViec: this.viTriLamViecList[0],
    }));
    this.cdr.detectChanges();
  }


  getDayKey(day: string): string | null {
    const mapping: { [key: string]: string } = {
      'Thứ 2': 'thu2',
      'Thứ 3': 'thu3',
      'Thứ 4': 'thu4',
      'Thứ 5': 'thu5',
      'Thứ 6': 'thu6',
      'Thứ 7': 'thu7',
      'Chủ Nhật': 'chuNhat',
    };
    return mapping[day] || null;
  }

  getCaForDay(item: NhanVienWithCa, day: string): number | undefined {
    const dayKey = this.getDayKey(day);
    return dayKey ? (item.caLam as any)[dayKey] : undefined;
  }

  getCaColor(caId: number | undefined): string {
    if (!caId) return '#FFFFFF';
    const ca = this.caList.find((c) => c.id === caId);
    return ca ? ca.color : '#FFFFFF';
  }

  getGioiTinhText(gioiTinh: boolean | undefined): string {
    if (gioiTinh === undefined) return '—';
    return gioiTinh ? 'Nam' : 'NỮ';
  }

  onCellClick(item: NhanVienWithCa, day: string, event: MouseEvent): void {
    const cell = event.currentTarget as HTMLElement;
    const select = cell.querySelector('.ca-select') as HTMLSelectElement;
    if (select) {
      select.style.display = 'block';
      select.focus();
      select.click();
    }
  }

  getViTriLamViecForNhanVien(nhanVienId: number | undefined): string | null {
    if (!nhanVienId) return null;
    const key = `viTriLamViec_nv${nhanVienId}`;
    const saved = localStorage.getItem(key);
    return saved || null;
  }

  saveViTriLamViecToStorage(nhanVienId: number, viTri: string): void {
    const key = `viTriLamViec_nv${nhanVienId}`;
    localStorage.setItem(key, viTri);
  }

  onViTriChange(nhanVienId: number, viTri: string): void {
    const item = this.nhanVienWithCaList.find((item) => item.nhanVien.id === nhanVienId);
    if (item) {
      // Lưu giá trị cũ vào temp nếu chưa có
      if (!this.tempViTriData.has(nhanVienId)) {
        this.tempViTriData.set(nhanVienId, item.viTriLamViec || this.viTriLamViecList[0]);
      }
      item.viTriLamViec = viTri;
    }
  }

  onCaChange(nhanVienId: number, day: string, caId: number | null): void {
    const item = this.nhanVienWithCaList.find((item) => item.nhanVien.id === nhanVienId);
    if (!item) return;

    // Lưu giá trị cũ vào temp nếu chưa có
    if (!this.tempCaLamData.has(nhanVienId)) {
      this.tempCaLamData.set(nhanVienId, { ...item.caLam });
    }

    const dayKey = this.getDayKey(day);
    if (dayKey) {
      if (caId) {
        (item.caLam as any)[dayKey] = caId;
      } else {
        delete (item.caLam as any)[dayKey];
      }
      
      // Ẩn select sau khi chọn
      const select = document.activeElement as HTMLSelectElement;
      if (select && select.classList.contains('ca-select')) {
        select.style.display = 'none';
      }
    }
  }

  onSave(): void {
    this.loading = true;
    
    // Chuẩn bị danh sách request để lưu
    const requests: LichLamRequest[] = [];
    
    this.nhanVienWithCaList.forEach((item) => {
      // Kiểm tra userId - phải có userId vì lich_lam cần user_id
      const userId = item.nhanVien.userId;
      
      if (!userId) {
        console.warn('Nhân viên không có userId, bỏ qua:', item.nhanVien);
        return; // Bỏ qua nhân viên không có userId
      }
      
      if (item.nhanVien.id && userId) {
        // Tạo danh sách ca làm
        const caLamList: CaLamItem[] = [];
        
        // Tính ngày cho từng thứ trong tuần
        if (this.weekStartDate) {
          const weekDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
          weekDays.forEach((day, index) => {
            const dayKey = this.getDayKey(day);
            if (dayKey) {
              const caId = (item.caLam as any)[dayKey];
              if (caId) {
                // Tính ngày cụ thể
                const date = new Date(this.weekStartDate!);
                date.setDate(this.weekStartDate!.getDate() + index);
                const dateStr = this.formatDateForAPI(date);
                
                caLamList.push({
                  dayOfWeek: day,
                  shift: caId,
                  date: dateStr
                });
              }
            }
          });
        }
        
        // Thêm request nếu có ca làm hoặc có vị trí làm việc
        // Lưu cả khi không có ca làm để lưu vị trí làm việc
        requests.push({
          userId: userId,
          week: this.currentWeek,
          year: this.currentYear,
          position: item.viTriLamViec || this.viTriLamViecList[0],
          caLamList: caLamList
        });
      } else {
        console.warn('Nhân viên không có userId hoặc id:', item.nhanVien);
      }
    });
    
    // Lưu tất cả vào API
    if (requests.length > 0) {
      console.log('Saving requests:', JSON.stringify(requests, null, 2));
      console.log('Total requests:', requests.length);
      
      this.caLamService.saveLichLamBatch(requests)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            // Reload dữ liệu từ API
            this.loadCaLamFromAPI();
            this.loadLichSuCaLam();
            
            // Xóa temp data
            this.tempCaLamData.clear();
            this.tempViTriData.clear();
            
            this.loading = false;
            alert('Đã lưu thành công!');
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('Error saving ca lam:', error);
            console.error('Error details:', {
              status: error.status,
              statusText: error.statusText,
              url: error.url,
              message: error.message,
              error: error.error
            });
            this.loading = false;
            
            let errorMsg = 'Lỗi không xác định';
            if (error.status === 404) {
              errorMsg = 'Không tìm thấy API endpoint. Vui lòng kiểm tra backend đã được khởi động chưa.';
            } else if (error.status === 500) {
              errorMsg = error.error?.message || 'Lỗi server. Vui lòng kiểm tra log backend.';
            } else if (error.error?.message) {
              errorMsg = error.error.message;
            } else if (error.message) {
              errorMsg = error.message;
            } else {
              errorMsg = `Lỗi ${error.status || 'không xác định'}`;
            }
            
            alert('Lỗi khi lưu lịch làm: ' + errorMsg);
            this.cdr.detectChanges();
          }
        });
    } else {
      this.loading = false;
      const nhanVienWithoutUserId = this.nhanVienWithCaList.filter(item => !item.nhanVien.userId);
      if (nhanVienWithoutUserId.length > 0) {
        alert(`Không thể lưu: ${nhanVienWithoutUserId.length} nhân viên không có userId. Vui lòng kiểm tra lại thông tin nhân viên.`);
      } else {
        alert('Không có dữ liệu để lưu!');
      }
    }
  }

  // Format ngày cho API (dd/MM/yyyy)
  formatDateForAPI(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  onCancel(): void {
    // Khôi phục từ temp data
    this.nhanVienWithCaList.forEach((item) => {
      if (item.nhanVien.id) {
        const savedCa = this.tempCaLamData.get(item.nhanVien.id);
        if (savedCa) {
          item.caLam = { ...savedCa };
        }
        const savedViTri = this.tempViTriData.get(item.nhanVien.id);
        if (savedViTri) {
          item.viTriLamViec = savedViTri;
        }
      }
    });

    // Xóa temp data
    this.tempCaLamData.clear();
    this.tempViTriData.clear();

    alert('Đã hủy thay đổi!');
  }

  // Không cần addToHistory nữa vì đã lưu vào DB và load từ API

  loadLichSuCaLam(): void {
    this.caLamService.getLichSuCaLam()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Convert response thành format hiện tại
          this.lichSuCaLam = response.map(item => ({
            tuan: item.week,
            nam: item.year,
            msnv: item.maNhanVien || '—',
            tenNhanVien: item.userName,
            viTriLamViec: item.position,
            ngay: item.dayOfWeek,
            ca: this.parseShiftToNumber(item.shift),
            ngayTao: item.date
          }));
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading lich su ca lam:', error);
          this.lichSuCaLam = [];
        }
      });
  }

  // Parse shift string thành number (Ca 1 -> 1, Ca 2 -> 2, ...)
  parseShiftToNumber(shift: string): number | null {
    if (!shift) return null;
    const match = shift.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  }

  viewHistory(history: any): void {
    // TODO: Implement view history detail
    console.log('View history:', history);
  }

  changeWeek(direction: 'prev' | 'next'): void {
    if (direction === 'prev') {
      this.currentWeek--;
      if (this.currentWeek < 1) {
        this.currentWeek = 52;
        this.currentYear--;
      }
    } else {
      this.currentWeek++;
      if (this.currentWeek > 52) {
        this.currentWeek = 1;
        this.currentYear++;
      }
    }
    this.calculateWeekDates();
    this.loadCaLamFromAPI();
  }

  exportToExcel(): void {
    // TODO: Implement export to Excel
    alert('Chức năng xuất Excel đang được phát triển');
  }

  parseNumber(value: string): number | null {
    const num = Number(value);
    return isNaN(num) ? null : num;
  }
}
