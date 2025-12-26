import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, NotificationConfig, ConfirmConfig } from './notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss']
})
export class NotificationComponent implements OnInit, OnDestroy {
  notification: NotificationConfig | null = null;
  confirmDialog: { config: ConfirmConfig; resolve: (value: boolean) => void } | null = null;
  private notificationSub?: Subscription;
  private confirmSub?: Subscription;
  private timeoutId?: number;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    // Subscribe to notifications
    this.notificationSub = this.notificationService.notification$.subscribe((config) => {
      this.notification = config;
      
      // Auto close after duration
      if (config && config.duration && config.duration > 0) {
        if (this.timeoutId) {
          clearTimeout(this.timeoutId);
        }
        this.timeoutId = window.setTimeout(() => {
          this.closeNotification();
        }, config.duration);
      }
    });

    // Subscribe to confirm dialogs
    this.confirmSub = this.notificationService.confirm$.subscribe((dialog) => {
      this.confirmDialog = dialog;
    });
  }

  ngOnDestroy(): void {
    this.notificationSub?.unsubscribe();
    this.confirmSub?.unsubscribe();
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  closeNotification(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
    this.notification = null;
    this.notificationService.closeNotification();
  }

  handleConfirm(confirmed: boolean): void {
    if (this.confirmDialog) {
      this.confirmDialog.resolve(confirmed);
      this.confirmDialog = null;
    }
  }

  getNotificationIcon(): string {
    if (!this.notification) return '';
    switch (this.notification.type) {
      case 'success':
        return 'fa-check-circle';
      case 'error':
        return 'fa-exclamation-circle';
      case 'warning':
        return 'fa-exclamation-triangle';
      case 'info':
      default:
        return 'fa-info-circle';
    }
  }
}

