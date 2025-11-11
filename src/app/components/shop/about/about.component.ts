import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { ChatbotComponent } from '../chatbot/chatbot.component';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterModule, ChatbotComponent],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent implements OnInit {
  customerName: string = '';
  cartCount = 0;

  constructor(public authService: AuthService) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      const user = this.authService.getCurrentUser();
      this.customerName = user?.username || '';
    }
  }

  navigateToProfile(event: Event): void {
    event.preventDefault();
    // Navigation sẽ được xử lý bởi routerLink trong template
  }

  logout(): void {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      this.authService.logout();
      this.customerName = '';
      this.cartCount = 0;
      localStorage.removeItem('temp_cart');
      localStorage.removeItem('current_cart_id');
      window.location.href = '/shop';
    }
  }

  goToCart(): void {
    window.location.href = '/shop/cart';
  }
}


