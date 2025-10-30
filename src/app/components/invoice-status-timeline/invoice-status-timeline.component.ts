import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
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
  
  statusSteps: StatusStep[] = [
    {
      id: 'CHO_XAC_NHAN',
      label: 'Chờ xác nhận',
      icon: 'fas fa-clock',
      isCompleted: false,
      isCurrent: false,
      isFuture: false
    },
    {
      id: 'DA_XAC_NHAN',
      label: 'Đã xác nhận',
      icon: 'fas fa-check-circle',
      isCompleted: false,
      isCurrent: false,
      isFuture: false
    },
    {
      id: 'DANG_GIAO_HANG',
      label: 'Đang giao hàng',
      icon: 'fas fa-truck',
      isCompleted: false,
      isCurrent: false,
      isFuture: false
    },
    {
      id: 'DA_GIAO_HANG',
      label: 'Đã giao hàng',
      icon: 'fas fa-check-double',
      isCompleted: false,
      isCurrent: false,
      isFuture: false
    },
    {
      id: 'HUY',
      label: 'Hủy',
      icon: 'fas fa-times-circle',
      isCompleted: false,
      isCurrent: false,
      isFuture: false
    }
  ];

  ngOnInit(): void {
    this.updateStatusSteps();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.updateStatusSteps();
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
}
