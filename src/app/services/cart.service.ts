import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CartItem {
  id: number;
  user: any;
  sanPham: any;
  soLuong: number;
  gia: number;
  ngayTao?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private apiUrl = `${environment.apiUrl}/cart`;

  constructor(private http: HttpClient) { }

  getCart(userId: number): Observable<CartItem[]> {
    return this.http.get<CartItem[]>(`${this.apiUrl}/user/${userId}`);
  }

  addToCart(userId: number, productId: number, quantity: number): Observable<CartItem> {
    return this.http.post<CartItem>(`${this.apiUrl}/add`, null, {
      params: {
        userId: userId.toString(),
        productId: productId.toString(),
        quantity: quantity.toString()
      }
    });
  }

  updateCartItem(cartId: number, quantity: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/update/${cartId}`, null, {
      params: { quantity: quantity.toString() }
    });
  }

  removeFromCart(cartId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/remove/${cartId}`);
  }

  clearCart(userId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/clear/${userId}`);
  }

  getCartTotal(userId: number): Observable<{total: number}> {
    return this.http.get<{total: number}>(`${this.apiUrl}/total/${userId}`);
  }
}




