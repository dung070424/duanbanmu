import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ElementRef, Renderer2, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface StatusStep {
  id: string;
  label: string;
  icon: string;
  isCompleted: boolean;
  isCurrent: boolean;
  isFuture: boolean;
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
  @Input() invoiceCreatedAt?: string;
  @Input() invoiceId?: number; // ID của hóa đơn để cập nhật
  @Input() enableClick: boolean = true; // Cho phép click để thay đổi trạng thái
  @Output() statusChange = new EventEmitter<string>(); // Emit khi click vào step
  
  constructor(
    private el: ElementRef,
    private renderer: Renderer2
  ) {}
  
  statusSteps: StatusStep[] = [
    {
      id: 'CHO_XAC_NHAN',
      label: 'Chờ xác nhận',
      icon: 'fa-solid fa-hourglass-half text-warning',
      isCompleted: false,
      isCurrent: false,
      isFuture: false
    },
    {
      id: 'DA_XAC_NHAN',
      label: 'Đã xác nhận',
      icon: 'fa-solid fa-circle-check text-success',
      isCompleted: false,
      isCurrent: false,
      isFuture: false
    },
    {
      id: 'DANG_GIAO_HANG',
      label: 'Đang giao hàng',
      icon: 'fa-solid fa-truck-fast text-primary',
      isCompleted: false,
      isCurrent: false,
      isFuture: false
    },
    {
      id: 'DA_GIAO_HANG',
      label: 'Đã giao hàng',
      icon: 'fa-solid fa-box-open text-info',
      isCompleted: false,
      isCurrent: false,
      isFuture: false
    },
    {
      id: 'HUY',
      label: 'Hủy',
      icon: 'fa-solid fa-circle-xmark text-danger',
      isCompleted: false,
      isCurrent: false,
      isFuture: false
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
    if (changes['currentStatus']) {
      console.log('🔄 Timeline: Status changed from', changes['currentStatus'].previousValue, 'to', changes['currentStatus'].currentValue);
      this.updateStatusSteps();
    }
  }

  private updateStatusSteps(): void {
    if (!this.currentStatus) return;

    const statusOrder = ['CHO_XAC_NHAN', 'DA_XAC_NHAN', 'DANG_GIAO_HANG', 'DA_GIAO_HANG'];
    const currentIndex = statusOrder.indexOf(this.currentStatus);
    
    // Reset all steps
    this.statusSteps.forEach(step => {
      step.isCompleted = false;
      step.isCurrent = false;
      step.isFuture = false;
    });

    if (this.currentStatus === 'HUY') {
      // Special case for cancelled invoices
      this.statusSteps.forEach(step => {
        if (step.id === 'HUY') {
          step.isCurrent = true;
        } else {
          step.isFuture = true;
        }
      });
    } else {
      // Normal flow
      this.statusSteps.forEach((step, index) => {
        const stepIndex = statusOrder.indexOf(step.id);
        
        if (stepIndex !== -1) {
          if (stepIndex < currentIndex) {
            step.isCompleted = true;
          } else if (stepIndex === currentIndex) {
            step.isCurrent = true;
          } else {
            step.isFuture = true;
          }
        }
      });
    }
  }

  getStepClass(step: StatusStep): string {
    if (step.isCurrent) {
      return 'step-current';
    } else if (step.isCompleted) {
      return 'step-completed';
    } else if (step.isFuture) {
      return 'step-future';
    } else if (this.currentStatus === 'HUY' && step.id === 'HUY') {
      return 'step-cancelled';
    }
    return '';
  }

  getStepIconClass(step: StatusStep): string {
    let baseClass = step.icon;
    
    if (step.isCurrent) {
      baseClass += ' step-icon-current';
    } else if (step.isCompleted) {
      baseClass += ' step-icon-completed';
    } else if (step.isFuture) {
      baseClass += ' step-icon-future';
    }
    
    return baseClass;
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
