import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface ShiftSchedule {
  id: string;
  employee: string;
  role: string;
  date: string;
  time: string;
  status: string;
  notes?: string;
}

interface EmployeeSchedule {
  stt: number;
  maNhanVien: string;
  tenNhanVien: string;
  gioiTinh: string; // 'Nam' | 'Nữ'
  viTriLamViec: string;
  shifts: { [day: string]: number | null }; // 'Thứ 2', 'Thứ 3', etc. -> shift number (1-4) or null
}

interface ShiftType {
  id: number;
  tenCa: string;
  gio: string;
  color: string;
}

@Component({
  selector: 'app-shift-management',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './shift-management.html',
  styleUrl: './shift-management.scss'
})
export class ShiftManagementComponent implements OnInit {
  selectedWeek: number = 47; // Tuần hiện tại
  selectedYear: number = 2025;
  showWeekDropdown: boolean = false; // Hiển thị dropdown chọn tuần

  // Danh sách các ngày trong tuần
  weekDays: string[] = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

  // Định nghĩa các ca làm việc
  shiftTypes: ShiftType[] = [
    { id: 1, tenCa: 'Ca 1', gio: '6h - 14h', color: 'shift-1' },
    { id: 2, tenCa: 'Ca 2', gio: '14h - 22h', color: 'shift-2' },
    { id: 3, tenCa: 'Ca 3', gio: '22h - 6h', color: 'shift-3' },
    { id: 4, tenCa: 'Ca 4', gio: 'Hành Chính (7h - 16h)', color: 'shift-4' }
  ];

  // Dữ liệu lịch làm việc cho nhân viên
  employeeSchedules: EmployeeSchedule[] = [
    {
      stt: 1,
      maNhanVien: 'NV0001',
      tenNhanVien: 'Phạm Thành An',
      gioiTinh: 'Nam',
      viTriLamViec: 'NV Kế Toán',
      shifts: { 'Thứ 2': 4, 'Thứ 3': 4, 'Thứ 4': 4, 'Thứ 5': null, 'Thứ 6': null, 'Thứ 7': null, 'Chủ nhật': null }
    },
    {
      stt: 2,
      maNhanVien: 'NV0002',
      tenNhanVien: 'Nguyễn Thị An',
      gioiTinh: 'Nữ',
      viTriLamViec: 'NV Bán Hàng',
      shifts: { 'Thứ 2': 4, 'Thứ 3': 4, 'Thứ 4': 4, 'Thứ 5': null, 'Thứ 6': null, 'Thứ 7': null, 'Chủ nhật': null }
    },
    {
      stt: 3,
      maNhanVien: 'NV0003',
      tenNhanVien: 'Trần Đức Anh',
      gioiTinh: 'Nam',
      viTriLamViec: 'NV Sản Xuất',
      shifts: { 'Thứ 2': 1, 'Thứ 3': 1, 'Thứ 4': 1, 'Thứ 5': null, 'Thứ 6': null, 'Thứ 7': null, 'Chủ nhật': null }
    },
    {
      stt: 4,
      maNhanVien: 'NV0004',
      tenNhanVien: 'Bùi Thị Anh',
      gioiTinh: 'Nữ',
      viTriLamViec: 'NV Sản Xuất',
      shifts: { 'Thứ 2': 1, 'Thứ 3': 1, 'Thứ 4': 1, 'Thứ 5': null, 'Thứ 6': null, 'Thứ 7': null, 'Chủ nhật': null }
    },
    {
      stt: 5,
      maNhanVien: 'NV0005',
      tenNhanVien: 'Hà Bảo Ca',
      gioiTinh: 'Nam',
      viTriLamViec: 'NV Kinh Doanh',
      shifts: { 'Thứ 2': 4, 'Thứ 3': 4, 'Thứ 4': 4, 'Thứ 5': null, 'Thứ 6': null, 'Thứ 7': null, 'Chủ nhật': null }
    },
    {
      stt: 6,
      maNhanVien: 'NV0006',
      tenNhanVien: 'Nguyễn Thị Duyên',
      gioiTinh: 'Nữ',
      viTriLamViec: 'NV Kế Toán',
      shifts: { 'Thứ 2': 4, 'Thứ 3': 4, 'Thứ 4': 4, 'Thứ 5': null, 'Thứ 6': null, 'Thứ 7': null, 'Chủ nhật': null }
    },
    {
      stt: 7,
      maNhanVien: 'NV0007',
      tenNhanVien: 'Trần Đình Đảm',
      gioiTinh: 'Nam',
      viTriLamViec: 'NV Sản Xuất',
      shifts: { 'Thứ 2': 2, 'Thứ 3': 2, 'Thứ 4': 2, 'Thứ 5': null, 'Thứ 6': null, 'Thứ 7': null, 'Chủ nhật': null }
    },
    {
      stt: 8,
      maNhanVien: 'NV0008',
      tenNhanVien: 'Phạm Thành Đức',
      gioiTinh: 'Nam',
      viTriLamViec: 'NV Sản Xuất',
      shifts: { 'Thứ 2': 2, 'Thứ 3': 2, 'Thứ 4': 2, 'Thứ 5': null, 'Thứ 6': null, 'Thứ 7': null, 'Chủ nhật': null }
    },
    {
      stt: 9,
      maNhanVien: 'NV0009',
      tenNhanVien: 'Phan Phúc Đức',
      gioiTinh: 'Nam',
      viTriLamViec: 'NV Sản Xuất',
      shifts: { 'Thứ 2': 2, 'Thứ 3': 2, 'Thứ 4': 2, 'Thứ 5': null, 'Thứ 6': null, 'Thứ 7': null, 'Chủ nhật': null }
    },
    {
      stt: 10,
      maNhanVien: 'NV0010',
      tenNhanVien: 'Lê Quốc Hà',
      gioiTinh: 'Nam',
      viTriLamViec: 'NV Sản Xuất',
      shifts: { 'Thứ 2': 1, 'Thứ 3': 1, 'Thứ 4': 1, 'Thứ 5': null, 'Thứ 6': null, 'Thứ 7': null, 'Chủ nhật': null }
    },
    {
      stt: 11,
      maNhanVien: 'NV0011',
      tenNhanVien: 'Nguyễn Thu Hà',
      gioiTinh: 'Nữ',
      viTriLamViec: 'NV Sản Xuất',
      shifts: { 'Thứ 2': 3, 'Thứ 3': 3, 'Thứ 4': 3, 'Thứ 5': null, 'Thứ 6': null, 'Thứ 7': null, 'Chủ nhật': null }
    },
    {
      stt: 12,
      maNhanVien: 'NV0012',
      tenNhanVien: 'Trần Đức Nam',
      gioiTinh: 'Nam',
      viTriLamViec: 'NV Bảo Vệ',
      shifts: { 'Thứ 2': 3, 'Thứ 3': 3, 'Thứ 4': 3, 'Thứ 5': null, 'Thứ 6': null, 'Thứ 7': null, 'Chủ nhật': null }
    },
    {
      stt: 13,
      maNhanVien: 'NV0013',
      tenNhanVien: 'Lê Quốc Sư',
      gioiTinh: 'Nam',
      viTriLamViec: 'NV Bảo Vệ',
      shifts: { 'Thứ 2': 4, 'Thứ 3': 4, 'Thứ 4': 4, 'Thứ 5': null, 'Thứ 6': null, 'Thứ 7': null, 'Chủ nhật': null }
    },
    {
      stt: 14,
      maNhanVien: 'NV0014',
      tenNhanVien: 'Trần Đình Sự',
      gioiTinh: 'Nam',
      viTriLamViec: 'NV Sản Xuất',
      shifts: { 'Thứ 2': 3, 'Thứ 3': 3, 'Thứ 4': 3, 'Thứ 5': null, 'Thứ 6': null, 'Thứ 7': null, 'Chủ nhật': null }
    },
    {
      stt: 15,
      maNhanVien: 'NV0015',
      tenNhanVien: 'Bùi Thế Sự',
      gioiTinh: 'Nam',
      viTriLamViec: 'NV Sản Xuất',
      shifts: { 'Thứ 2': 3, 'Thứ 3': 3, 'Thứ 4': 3, 'Thứ 5': null, 'Thứ 6': null, 'Thứ 7': null, 'Chủ nhật': null }
    }
  ];

  shiftFilters = {
    keyword: '',
    status: 'all',
    fromDate: '',
    toDate: ''
  };

  upcomingShifts: ShiftSchedule[] = [];
  shiftHistory: ShiftSchedule[] = [];
  upcomingShiftView: ShiftSchedule[] = [];
  shiftHistoryView: ShiftSchedule[] = [];

  constructor() { }

  ngOnInit(): void {
    this.applyFilters();
    // Chỉ tính toán tuần hiện tại nếu chưa được set
    if (!this.selectedWeek || this.selectedWeek === 0) {
      const currentWeek = this.getCurrentWeek();
      if (currentWeek) {
        this.selectedWeek = currentWeek.week;
        this.selectedYear = currentWeek.year;
      }
    }
  }

  // Tính toán tuần hiện tại trong năm (tuần bắt đầu từ Thứ 2)
  getCurrentWeek(): { week: number; year: number } | null {
    const now = new Date();
    const year = now.getFullYear();
    
    // Tìm Thứ 2 đầu tiên của năm
    const jan1 = new Date(year, 0, 1);
    const dayOfWeek = jan1.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7
    
    let daysToFirstMonday = 0;
    if (dayOfWeek === 0) {
      daysToFirstMonday = 1; // Chủ nhật -> Thứ 2 (ngày 2/1)
    } else if (dayOfWeek === 1) {
      daysToFirstMonday = 0; // Đã là Thứ 2 (ngày 1/1)
    } else {
      daysToFirstMonday = -(dayOfWeek - 1); // Thứ 3-7 -> Thứ 2 tuần đó (lùi lại)
    }
    
    const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);
    
    // Tính số tuần từ Thứ 2 đầu tiên đến ngày hiện tại
    const daysDiff = Math.floor((now.getTime() - firstMonday.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.floor(daysDiff / 7) + 1;
    
    return { week: weekNumber, year: year };
  }

  // Lấy ngày bắt đầu của tuần (Thứ 2)
  getWeekStartDate(weekNumber: number, year: number): Date {
    // Tìm ngày 1 tháng 1 của năm
    const jan1 = new Date(year, 0, 1);
    const dayOfWeek = jan1.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7
    
    // Tính số ngày cần thêm/trừ để đến Thứ 2 đầu tiên của năm
    // Tuần 1 luôn bắt đầu từ Thứ 2 đầu tiên của năm
    let daysToFirstMonday = 0;
    if (dayOfWeek === 0) {
      // Nếu 1/1 là Chủ nhật, Thứ 2 đầu tiên là ngày 2/1
      daysToFirstMonday = 1;
    } else if (dayOfWeek === 1) {
      // Nếu 1/1 là Thứ 2, Thứ 2 đầu tiên là ngày 1/1
      daysToFirstMonday = 0;
    } else {
      // Nếu 1/1 là Thứ 3-7, Thứ 2 đầu tiên là Thứ 2 của tuần đó (lùi lại)
      // Ví dụ: 1/1 là Thứ 3 (dayOfWeek = 3) -> Thứ 2 là ngày 30/12 năm trước
      daysToFirstMonday = -(dayOfWeek - 1);
    }
    
    // Tạo ngày Thứ 2 đầu tiên của năm
    const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);
    
    // Tính ngày bắt đầu của tuần được chọn
    const weekStart = new Date(firstMonday);
    weekStart.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);
    
    return weekStart;
  }

  // Lấy ngày kết thúc của tuần (Chủ nhật)
  getWeekEndDate(weekNumber: number, year: number): Date {
    const weekStart = this.getWeekStartDate(weekNumber, year);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return weekEnd;
  }

  // Format ngày theo định dạng dd/MM/yyyy
  formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Lấy chuỗi hiển thị thời gian tuần
  getWeekDateRange(): string {
    const startDate = this.getWeekStartDate(this.selectedWeek, this.selectedYear);
    const endDate = this.getWeekEndDate(this.selectedWeek, this.selectedYear);
    return `từ ngày ${this.formatDate(startDate)} - đến ngày ${this.formatDate(endDate)}`;
  }

  // Lấy danh sách các tuần trong năm (1-52)
  getAvailableWeeks(): number[] {
    const weeks: number[] = [];
    for (let i = 1; i <= 52; i++) {
      weeks.push(i);
    }
    return weeks;
  }

  // Xử lý thay đổi tuần
  onWeekChange(week: number): void {
    this.selectedWeek = week;
    this.showWeekDropdown = false;
    // TODO: Load dữ liệu lịch làm việc cho tuần mới
    console.log(`Changed to week ${week}`);
  }

  // Toggle dropdown chọn tuần
  toggleWeekDropdown(): void {
    this.showWeekDropdown = !this.showWeekDropdown;
  }

  // Đóng dropdown khi click bên ngoài
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.week-selector') && !target.closest('.week-dropdown')) {
      this.showWeekDropdown = false;
    }
  }

  applyFilters(): void {
    this.upcomingShiftView = this.filterShifts(this.upcomingShifts);
    this.shiftHistoryView = this.filterShifts(this.shiftHistory);
  }

  resetFilters(): void {
    this.shiftFilters = {
      keyword: '',
      status: 'all',
      fromDate: '',
      toDate: ''
    };
    this.applyFilters();
  }

  openCreateShift(): void {
    // TODO: Replace with modal navigation when backend is ready
    console.log('Open create shift dialog');
  }

  // Lấy class màu cho ca làm việc
  getShiftColorClass(shiftId: number | null): string {
    if (!shiftId) return '';
    return `shift-${shiftId}`;
  }

  // Xử lý thay đổi ca làm việc
  onShiftChange(employee: EmployeeSchedule, day: string, shiftId: number | null): void {
    employee.shifts[day] = shiftId;
    // TODO: Gọi API để lưu thay đổi
    console.log(`Updated ${employee.maNhanVien} - ${day}: Ca ${shiftId}`);
  }

  // Lấy danh sách ca để hiển thị trong dropdown
  getAvailableShifts(): (number | null)[] {
    return [null, 1, 2, 3, 4];
  }

  // Lấy tên ca từ ID
  getShiftName(shiftId: number | null): string {
    if (!shiftId) return '';
    const shift = this.shiftTypes.find(s => s.id === shiftId);
    return shift ? shift.tenCa : '';
  }

  private filterShifts(shifts: ShiftSchedule[]): ShiftSchedule[] {
    const { keyword, status, fromDate, toDate } = this.shiftFilters;
    const keywordLower = keyword.trim().toLowerCase();
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;

    return shifts.filter((shift) => {
      const shiftDate = new Date(shift.date);
      const matchesKeyword =
        !keywordLower ||
        shift.employee.toLowerCase().includes(keywordLower) ||
        shift.id.toLowerCase().includes(keywordLower) ||
        shift.role.toLowerCase().includes(keywordLower);

      const matchesStatus = status === 'all' || shift.status === status;

      const matchesFrom = !from || shiftDate >= from;
      const matchesTo = !to || shiftDate <= to;

      return matchesKeyword && matchesStatus && matchesFrom && matchesTo;
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Đang chờ':
        return 'status-pending';
      case 'Đã xác nhận':
        return 'status-confirmed';
      case 'Hoàn thành':
        return 'status-success';
      case 'Vắng mặt':
        return 'status-warning';
      default:
        return 'status-default';
    }
  }
}

