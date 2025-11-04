import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

interface CartItem {
  id: number;
  tenSanPham: string;
  soLuong: number;
  donGia: number;
  anhSanPham?: string;
}

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss']
})
export class CartComponent {
  items: CartItem[] = [];

  constructor(private router: Router) {
    this.loadCart();
  }

  loadCart(): void {
    try {
      const raw = localStorage.getItem('shop_cart');
      this.items = raw ? JSON.parse(raw) : [];
    } catch {
      this.items = [];
    }
  }

  get total(): number {
    return this.items.reduce((sum, p) => sum + (p.soLuong * p.donGia), 0);
  }

  inc(i: number): void {
    this.items[i].soLuong += 1;
    this.save();
  }

  dec(i: number): void {
    if (this.items[i].soLuong > 1) {
      this.items[i].soLuong -= 1;
      this.save();
    }
  }

  remove(i: number): void {
    this.items.splice(i, 1);
    this.save();
  }

  clear(): void {
    this.items = [];
    this.save();
  }

  checkout(): void {
    // Placeholder: chuyển hướng đăng nhập nếu cần
    this.router.navigate(['/login'], { queryParams: { next: '/customer/orders' } });
  }

  private save(): void {
    localStorage.setItem('shop_cart', JSON.stringify(this.items));
  }
}

