import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Service quản lý state của giỏ hàng để các components có thể subscribe và cập nhật
 */
@Injectable({
  providedIn: 'root'
})
export class CartStateService {
  private cartCountSubject = new BehaviorSubject<number>(0);
  public cartCount$: Observable<number> = this.cartCountSubject.asObservable();

  constructor() {
    // Load cart count ban đầu từ localStorage hoặc backend
    this.refreshCartCount();
  }

  /**
   * Cập nhật cart count
   */
  updateCartCount(count: number): void {
    this.cartCountSubject.next(count);
  }

  /**
   * Refresh cart count từ localStorage hoặc backend
   */
  refreshCartCount(): void {
    try {
      // Load từ localStorage (temp cart)
      const tempCart = JSON.parse(localStorage.getItem('temp_cart') || '[]');
      if (Array.isArray(tempCart) && tempCart.length > 0) {
        const count = tempCart.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
        this.cartCountSubject.next(count);
        return;
      }
    } catch (error) {
      console.error('Error loading temp cart:', error);
    }
    
    // Nếu không có temp cart, reset về 0
    this.cartCountSubject.next(0);
  }

  /**
   * Tăng cart count thêm 1
   */
  incrementCartCount(): void {
    const current = this.cartCountSubject.value;
    this.cartCountSubject.next(current + 1);
  }

  /**
   * Reset cart count về 0
   */
  resetCartCount(): void {
    this.cartCountSubject.next(0);
  }

  /**
   * Lấy giá trị hiện tại của cart count
   */
  getCurrentCartCount(): number {
    return this.cartCountSubject.value;
  }
}

