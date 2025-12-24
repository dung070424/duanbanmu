import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from '../../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-overlay" *ngIf="toasts.length > 0">
      <div class="toast-container">
        <div
          *ngFor="let toast of toasts"
          class="toast toast-{{ toast.type }}"
          [@slideIn]="toast"
        >
          <div class="toast-content">
            <div class="toast-icon">
              <i
                class="fas"
                [ngClass]="{
                  'fa-check-circle': toast.type === 'success',
                  'fa-exclamation-circle': toast.type === 'error',
                  'fa-exclamation-triangle': toast.type === 'warning',
                  'fa-info-circle': toast.type === 'info'
                }"
              ></i>
            </div>
            <div class="toast-message">{{ toast.message }}</div>
          </div>
          <div class="toast-actions" *ngIf="toast.showConfirm; else closeButton">
            <button
              class="toast-btn toast-btn-cancel"
              (click)="onCancel(toast)"
            >
              Hủy
            </button>
            <button
              class="toast-btn toast-btn-confirm"
              (click)="onConfirm(toast)"
            >
              Xác nhận
            </button>
          </div>
          <ng-template #closeButton>
            <button
              class="toast-close"
              (click)="onClose(toast)"
              *ngIf="!toast.showConfirm"
            >
              <i class="fas fa-times"></i>
            </button>
          </ng-template>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .toast-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      pointer-events: none;
    }

    .toast-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      pointer-events: auto;
      max-width: 90%;
      width: 400px;
    }

    .toast {
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      padding: 20px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      min-width: 300px;
      max-width: 500px;
      animation: slideInDown 0.3s ease-out;
      border-left: 4px solid;
    }

    .toast-success {
      border-left-color: #28a745;
    }

    .toast-error {
      border-left-color: #dc3545;
    }

    .toast-warning {
      border-left-color: #ffc107;
    }

    .toast-info {
      border-left-color: #17a2b8;
    }

    .toast-content {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }

    .toast-icon {
      font-size: 24px;
      flex-shrink: 0;
    }

    .toast-success .toast-icon {
      color: #28a745;
    }

    .toast-error .toast-icon {
      color: #dc3545;
    }

    .toast-warning .toast-icon {
      color: #ffc107;
    }

    .toast-info .toast-icon {
      color: #17a2b8;
    }

    .toast-message {
      font-size: 15px;
      font-weight: 500;
      color: #2c3e50;
      line-height: 1.5;
    }

    .toast-actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }

    .toast-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .toast-btn-cancel {
      background: #f8f9fa;
      color: #6c757d;
    }

    .toast-btn-cancel:hover {
      background: #e9ecef;
    }

    .toast-btn-confirm {
      background: #007bff;
      color: white;
    }

    .toast-btn-confirm:hover {
      background: #0056b3;
    }

    .toast-close {
      background: transparent;
      border: none;
      color: #6c757d;
      font-size: 18px;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s;
      flex-shrink: 0;
    }

    .toast-close:hover {
      color: #2c3e50;
    }

    @keyframes slideInDown {
      from {
        transform: translateY(-100px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @media (max-width: 768px) {
      .toast-container {
        width: 95%;
      }

      .toast {
        min-width: auto;
        max-width: 100%;
        padding: 16px 20px;
      }

      .toast-message {
        font-size: 14px;
      }
    }
  `]
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: ToastMessage[] = [];
  private subscription?: Subscription;

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.subscription = this.toastService.toasts$.subscribe(toasts => {
      this.toasts = toasts;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  onClose(toast: ToastMessage): void {
    this.toastService.remove(toast.id);
  }

  onConfirm(toast: ToastMessage): void {
    if (toast.confirmCallback) {
      toast.confirmCallback();
    }
    this.toastService.remove(toast.id);
  }

  onCancel(toast: ToastMessage): void {
    if (toast.cancelCallback) {
      toast.cancelCallback();
    }
    this.toastService.remove(toast.id);
  }
}

