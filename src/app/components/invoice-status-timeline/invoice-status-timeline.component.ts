import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ElementRef, Renderer2, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface StatusStep {
  id: string;
  label: string;
  icon: string;
  iconColor: string; // Màu icon (purple, orange, blue-grey, red)
  isCompleted: boolean;
  isCurrent: boolean;
  isFuture: boolean;
  actualTime?: string; // Thời gian thực tế (format: YYYY/MM/DD HH:mm:ss)
  estimatedTime?: string; // Thời gian dự kiến (format: YYYY/MM/DD HH:mm:ss)
}

@Component({
  selector: 'app-invoice-status-timeline',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invoice-status-timeline.component.html',
  styleUrls: ['./invoice-status-timeline.component.scss']
})
export class InvoiceStatusTimelineComponent implements OnInit, OnChanges {
  @Input() currentStatus: string | undefined = '';
  @Input() invoiceCreatedAt?: string; // Ngày đặt hàng
  @Input() invoicePaymentDate?: string; // Ngày thanh toán
  @Input() invoiceEstimatedDelivery?: string; // Ngày dự kiến giao
  @Input() invoiceId?: number; // ID của hóa đơn để cập nhật
  @Input() enableClick: boolean = true; // Cho phép click để thay đổi trạng thái
  @Output() statusChange = new EventEmitter<string>(); // Emit khi click vào step
  
  currentStep: StatusStep | null = null;
  
  constructor(
    private el: ElementRef,
    private renderer: Renderer2
  ) {}
  
  // Timeline steps theo hình ảnh: Ngày đã đặt, Ngày đã thanh toán, Đã giao cho ĐVVC, Đã nhận được hàng, Đánh giá
  statusSteps: StatusStep[] = [
    {
      id: 'NGAY_DA_DAT',
      label: 'Ngày đã đặt',
      icon: 'fa-solid fa-wallet',
      iconColor: 'purple',
      isCompleted: false,
      isCurrent: false,
      isFuture: false,
      actualTime: undefined,
      estimatedTime: undefined
    },
    {
      id: 'NGAY_DA_THANH_TOAN',
      label: 'Ngày đã thanh toán',
      icon: 'fa-solid fa-camera',
      iconColor: 'purple',
      isCompleted: false,
      isCurrent: false,
      isFuture: false,
      actualTime: undefined,
      estimatedTime: undefined
    },
    {
      id: 'DA_GIAO_CHO_DVVC',
      label: 'Đã giao cho ĐVVC',
      icon: 'fa-solid fa-truck',
      iconColor: 'orange',
      isCompleted: false,
      isCurrent: false,
      isFuture: false,
      actualTime: undefined,
      estimatedTime: undefined
    },
    {
      id: 'DA_NHAN_DUOC_HANG',
      label: 'Đã nhận được hàng',
      icon: 'fa-solid fa-box',
      iconColor: 'blue-grey',
      isCompleted: false,
      isCurrent: false,
      isFuture: false,
      actualTime: undefined,
      estimatedTime: undefined
    },
    {
      id: 'DANH_GIA',
      label: 'Đánh giá',
      icon: 'fa-solid fa-star',
      iconColor: 'red',
      isCompleted: false,
      isCurrent: false,
      isFuture: false,
      actualTime: undefined,
      estimatedTime: undefined
    }
  ];

  ngOnInit(): void {
    this.updateStatusSteps();
    
    // Debug: Log để kiểm tra component được khởi tạo
    console.log('🔵 Timeline component initialized');
    console.log('🔵 enableClick:', this.enableClick);
    console.log('🔵 statusChange emitter:', this.statusChange);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentStatus'] || changes['invoiceCreatedAt'] || changes['invoicePaymentDate'] || changes['invoiceEstimatedDelivery']) {
      console.log('🔄 Timeline: Status or dates changed');
      this.updateStatusSteps();
    }
  }

  private updateStatusSteps(): void {
    // Reset tất cả steps về trạng thái ban đầu
    this.statusSteps.forEach(step => {
      step.isCompleted = false;
      step.isCurrent = false;
      step.isFuture = false;
      step.actualTime = undefined;
      step.estimatedTime = undefined;
    });

    // Ngày đã đặt - luôn completed nếu có invoiceCreatedAt
    const step1 = this.statusSteps.find(s => s.id === 'NGAY_DA_DAT');
    if (step1 && this.invoiceCreatedAt) {
      step1.isCompleted = true;
      step1.actualTime = this.formatDateTime(this.invoiceCreatedAt);
    }

    // Ngày đã thanh toán - completed nếu có paymentDate
    const step2 = this.statusSteps.find(s => s.id === 'NGAY_DA_THANH_TOAN');
    if (step2 && this.invoicePaymentDate) {
      step2.isCompleted = true;
      step2.actualTime = this.formatDateTime(this.invoicePaymentDate);
    }

    // Đã giao cho ĐVVC - completed khi status là DA_XAC_NHAN trở lên
    const step3 = this.statusSteps.find(s => s.id === 'DA_GIAO_CHO_DVVC');
    if (step3) {
      if (this.currentStatus === 'DA_XAC_NHAN' || this.currentStatus === 'DANG_GIAO_HANG' || this.currentStatus === 'DA_GIAO_HANG') {
        step3.isCompleted = true;
        // Nếu có ngày dự kiến giao, dùng ngày đó - 1 ngày (giả sử giao cho ĐVVC 1 ngày trước)
        if (this.invoiceEstimatedDelivery) {
          const date = new Date(this.invoiceEstimatedDelivery);
          date.setDate(date.getDate() - 1);
          step3.actualTime = this.formatDateTime(date.toISOString());
        } else if (this.invoiceCreatedAt) {
          // Nếu không có ngày dự kiến, tính từ ngày tạo + 2 ngày
          const date = new Date(this.invoiceCreatedAt);
          date.setDate(date.getDate() + 2);
          step3.actualTime = this.formatDateTime(date.toISOString());
        }
        // Hiển thị thời gian dự kiến nếu có
        if (this.invoiceEstimatedDelivery) {
          step3.estimatedTime = this.formatDateTime(this.invoiceEstimatedDelivery);
        }
      }
    }

    // Đã nhận được hàng - completed khi status là DA_GIAO_HANG
    const step4 = this.statusSteps.find(s => s.id === 'DA_NHAN_DUOC_HANG');
    if (step4) {
      if (this.currentStatus === 'DA_GIAO_HANG') {
        step4.isCompleted = true;
        // Nếu có ngày dự kiến giao, dùng ngày đó (hoặc + 1 ngày)
        if (this.invoiceEstimatedDelivery) {
          const date = new Date(this.invoiceEstimatedDelivery);
          // Có thể nhận đúng ngày dự kiến hoặc sau 1 ngày
          date.setDate(date.getDate() + 1);
          step4.actualTime = this.formatDateTime(date.toISOString());
        } else if (this.invoiceCreatedAt) {
          const date = new Date(this.invoiceCreatedAt);
          date.setDate(date.getDate() + 3);
          step4.actualTime = this.formatDateTime(date.toISOString());
        }
      }
    }

    // Đánh giá - luôn là future nếu chưa hoàn thành
    const step5 = this.statusSteps.find(s => s.id === 'DANH_GIA');
    if (step5) {
      if (this.currentStatus !== 'DA_GIAO_HANG') {
        step5.isFuture = true;
      } else {
        // Nếu đã hoàn thành, có thể đánh giá (không phải future)
        step5.isFuture = false;
      }
    }

    // Set current step dựa trên status
    let currentStepId = '';
    if (this.currentStatus === 'CHO_XAC_NHAN') {
      currentStepId = 'NGAY_DA_DAT';
    } else if (this.currentStatus === 'DA_XAC_NHAN') {
      currentStepId = 'DA_GIAO_CHO_DVVC';
    } else if (this.currentStatus === 'DANG_GIAO_HANG') {
      currentStepId = 'DA_GIAO_CHO_DVVC';
    } else if (this.currentStatus === 'DA_GIAO_HANG') {
      currentStepId = 'DA_NHAN_DUOC_HANG';
    } else if (this.currentStatus === 'HUY') {
      // Không có current step nếu bị hủy
      currentStepId = '';
    }

    // Update isCurrent cho step hiện tại
    this.statusSteps.forEach(step => {
      step.isCurrent = step.id === currentStepId;
    });
  }

  /**
   * Format datetime từ ISO string sang format YYYY/MM/DD HH:mm:ss
   */
  private formatDateTime(dateString: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
    } catch (e) {
      return '';
    }
  }

  getStepClass(step: StatusStep): string {
    const classes: string[] = [];
    if (step.isCompleted) {
      classes.push('step-completed');
    }
    if (step.isCurrent) {
      classes.push('step-current');
    }
    if (step.isFuture) {
      classes.push('step-future');
    }
    return classes.join(' ');
  }


  getProgressPercentage(): number {
    if (!this.currentStatus) return 0;
    
    const statusOrder = ['CHO_XAC_NHAN', 'DA_XAC_NHAN', 'DANG_GIAO_HANG', 'DA_GIAO_HANG'];
    const currentIndex = statusOrder.indexOf(this.currentStatus);
    
    if (this.currentStatus === 'HUY') {
      return 0; // Không có thanh tiến độ cho hóa đơn bị hủy
    }
    
    if (currentIndex === -1) return 0;
    
    // Tính phần trăm để thanh dừng tại vị trí của trạng thái hiện tại
    // Chia thanh thành các đoạn bằng nhau và dừng tại vị trí hiện tại
    const totalSteps = statusOrder.length;
    const progressPerStep = 100 / totalSteps;
    
    // Dừng tại vị trí của trạng thái hiện tại (không đi qua)
    return (currentIndex * progressPerStep) + (progressPerStep / 2);
  }

  getCurrentStepIndex(): number {
    if (!this.currentStatus) return -1;
    
    const statusOrder = ['CHO_XAC_NHAN', 'DA_XAC_NHAN', 'DANG_GIAO_HANG', 'DA_GIAO_HANG'];
    return statusOrder.indexOf(this.currentStatus);
  }

  /**
   * Xử lý khi click vào step để thay đổi trạng thái
   */
  onStepClick(step: StatusStep, event?: Event): void {
    // Prevent default và stop propagation để tránh conflict
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    console.log('🖱️ ========== STEP CLICKED ==========');
    console.log('🖱️ Step object:', step);
    console.log('🖱️ Step ID:', step?.id);
    console.log('🖱️ Step Label:', step?.label);
    console.log('🖱️ Enable Click:', this.enableClick);
    console.log('🖱️ Current Status:', this.currentStatus);
    console.log('🖱️ Invoice ID:', this.invoiceId);
    console.log('🖱️ Event:', event);
    console.log('🖱️ ====================================');

    if (!this.enableClick) {
      console.warn('⚠️ Click disabled: enableClick =', this.enableClick);
      alert('Click đã bị tắt. Vui lòng kiểm tra enableClick property.');
      return;
    }

    if (!step || !step.id) {
      console.warn('⚠️ Invalid step:', step);
      alert('Step không hợp lệ: ' + JSON.stringify(step));
      return;
    }

    // Kiểm tra xem trạng thái mới có khác trạng thái hiện tại không
    if (this.currentStatus === step.id) {
      console.log('ℹ️ Clicked on current status:', step.id, '- No change needed');
      alert(`Trạng thái hiện tại đã là "${step.label}"`);
      return;
    }

    // Xác nhận với user
    const confirmed = window.confirm(`Bạn có chắc chắn muốn đổi trạng thái từ "${this.getCurrentStatusLabel()}" sang "${step.label}"?`);
    
    if (!confirmed) {
      console.log('❌ User cancelled status change');
      return;
    }

    // Emit event để parent component xử lý
    console.log('✅ ========== EMITTING EVENT ==========');
    console.log('✅ From status:', this.currentStatus);
    console.log('✅ To status:', step.id);
    console.log('✅ StatusChange emitter exists:', !!this.statusChange);
    console.log('✅ StatusChange emitter type:', typeof this.statusChange);
    
    try {
      this.statusChange.emit(step.id);
      console.log('✅ Event emitted successfully!');
      console.log('✅ ====================================');
    } catch (error) {
      console.error('❌ Error emitting event:', error);
      alert('Lỗi khi emit event: ' + error);
    }
  }

  /**
   * Lấy label của trạng thái hiện tại
   */
  private getCurrentStatusLabel(): string {
    const currentStep = this.statusSteps.find(s => s.id === this.currentStatus);
    return currentStep ? currentStep.label : this.currentStatus || 'Chưa xác định';
  }

  /**
   * Hiển thị thông báo thông tin
   */
  private showInfoMessage(message: string): void {
    // Có thể dùng toast service sau này
    console.info('ℹ️', message);
  }

  /**
   * Kiểm tra xem step có thể click được không
   */
  canClickStep(step: StatusStep): boolean {
    if (!this.enableClick) return false;
    
    // Cho phép click vào tất cả các step (trừ khi bị disable)
    // Có thể thêm logic phức tạp hơn nếu cần
    return true;
  }
}
