import { Injectable } from '@angular/core';

export interface TempCartItem {
  productId: number;
  chiTietSanPhamId: number;
  productName: string;
  quantity: number;
  price: number;
  totalItemPrice: number;
  imageUrl?: string;
  mauSac?: string;
  kichThuoc?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TempCartService {
  private readonly STORAGE_KEY = 'temp_cart';
  private readonly SESSION_ID_KEY = 'session_id';

  constructor() {
    // Tạo sessionId nếu chưa có
    if (!this.getSessionId()) {
      this.generateSessionId();
    }
  }

  /**
   * Tạo sessionId duy nhất
   */
  private generateSessionId(): void {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(this.SESSION_ID_KEY, sessionId);
  }

  /**
   * Lấy sessionId
   */
  getSessionId(): string | null {
    return localStorage.getItem(this.SESSION_ID_KEY);
  }

  /**
   * Lấy giỏ hàng tạm từ localStorage
   */
  getTempCart(): TempCartItem[] {
    try {
      const cartData = localStorage.getItem(this.STORAGE_KEY);
      if (cartData) {
        return JSON.parse(cartData);
      }
    } catch (error) {
      console.error('Error reading temp cart from localStorage:', error);
    }
    return [];
  }

  /**
   * Lưu giỏ hàng tạm vào localStorage
   */
  saveTempCart(cart: TempCartItem[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      console.error('Error saving temp cart to localStorage:', error);
    }
  }

  /**
   * Thêm sản phẩm vào giỏ hàng tạm
   */
  addItem(item: TempCartItem): void {
    const cart = this.getTempCart();
    const existingIndex = cart.findIndex(
      i => i.chiTietSanPhamId === item.chiTietSanPhamId
    );

    if (existingIndex >= 0) {
      // Cập nhật số lượng nếu sản phẩm đã có
      cart[existingIndex].quantity += item.quantity;
      cart[existingIndex].totalItemPrice = cart[existingIndex].quantity * cart[existingIndex].price;
    } else {
      // Thêm sản phẩm mới
      cart.push(item);
    }

    this.saveTempCart(cart);
  }

  /**
   * Cập nhật số lượng sản phẩm
   */
  updateQuantity(chiTietSanPhamId: number, quantity: number): void {
    const cart = this.getTempCart();
    const item = cart.find(i => i.chiTietSanPhamId === chiTietSanPhamId);
    
    if (item) {
      item.quantity = quantity;
      item.totalItemPrice = item.quantity * item.price;
      this.saveTempCart(cart);
    }
  }

  /**
   * Xóa sản phẩm khỏi giỏ hàng tạm
   */
  removeItem(chiTietSanPhamId: number): void {
    const cart = this.getTempCart();
    const filtered = cart.filter(i => i.chiTietSanPhamId !== chiTietSanPhamId);
    this.saveTempCart(filtered);
  }

  /**
   * Xóa toàn bộ giỏ hàng tạm
   */
  clearTempCart(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Lấy tổng số lượng sản phẩm trong giỏ hàng tạm
   */
  getTotalItems(): number {
    const cart = this.getTempCart();
    return cart.reduce((total, item) => total + item.quantity, 0);
  }

  /**
   * Lấy tổng tiền trong giỏ hàng tạm
   */
  getTotalPrice(): number {
    const cart = this.getTempCart();
    return cart.reduce((total, item) => total + item.totalItemPrice, 0);
  }
}

