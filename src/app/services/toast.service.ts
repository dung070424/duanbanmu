import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  showConfirm?: boolean;
  confirmCallback?: () => void;
  cancelCallback?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<ToastMessage[]>([]);
  public toasts$: Observable<ToastMessage[]> = this.toastsSubject.asObservable();

  private toastIdCounter = 0;

  show(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration: number = 3000): string {
    const id = `toast-${++this.toastIdCounter}`;
    const toast: ToastMessage = {
      id,
      message,
      type,
      duration
    };
    
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next([...currentToasts, toast]);

    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }

    return id;
  }

  showConfirm(
    message: string,
    confirmCallback: () => void,
    cancelCallback?: () => void,
    type: 'success' | 'error' | 'warning' | 'info' = 'warning'
  ): string {
    const id = `toast-${++this.toastIdCounter}`;
    const toast: ToastMessage = {
      id,
      message,
      type,
      showConfirm: true,
      confirmCallback,
      cancelCallback,
      duration: 0 // Không tự động đóng
    };
    
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next([...currentToasts, toast]);

    return id;
  }

  remove(id: string): void {
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next(currentToasts.filter(toast => toast.id !== id));
  }

  clear(): void {
    this.toastsSubject.next([]);
  }
}

