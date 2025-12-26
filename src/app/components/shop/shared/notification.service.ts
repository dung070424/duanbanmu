 import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface NotificationConfig {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number; // milliseconds, 0 = không tự đóng
  title?: string;
}

export interface ConfirmConfig {
  message: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationSubject = new Subject<NotificationConfig | null>();
  private confirmSubject = new Subject<{ config: ConfirmConfig; resolve: (value: boolean) => void }>();

  notification$ = this.notificationSubject.asObservable();
  confirm$ = this.confirmSubject.asObservable();

  /**
   * Hiển thị thông báo
   */
  showNotification(config: NotificationConfig): void {
    this.notificationSubject.next(config);
  }

  /**
   * Hiển thị thông báo thành công
   */
  success(message: string, title?: string, duration: number = 3000): void {
    this.showNotification({ message, type: 'success', title, duration });
  }

  /**
   * Hiển thị thông báo lỗi
   */
  error(message: string, title?: string, duration: number = 4000): void {
    this.showNotification({ message, type: 'error', title, duration });
  }

  /**
   * Hiển thị thông báo cảnh báo
   */
  warning(message: string, title?: string, duration: number = 4000): void {
    this.showNotification({ message, type: 'warning', title, duration });
  }

  /**
   * Hiển thị thông báo thông tin
   */
  info(message: string, title?: string, duration: number = 3000): void {
    this.showNotification({ message, type: 'info', title, duration });
  }

  /**
   * Đóng thông báo
   */
  closeNotification(): void {
    this.notificationSubject.next(null);
  }

  /**
   * Hiển thị dialog xác nhận
   * @returns Promise<boolean> - true nếu user chọn confirm, false nếu cancel
   */
  confirm(config: ConfirmConfig): Promise<boolean> {
    return new Promise((resolve) => {
      this.confirmSubject.next({ config, resolve });
    });
  }
}

