import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { ChatbotComponent } from '../chatbot/chatbot.component';

interface NewsArticle {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  category: string;
  author: string;
  publishedAt: string;
}

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [CommonModule, RouterModule, ChatbotComponent],
  templateUrl: './news.component.html',
  styleUrls: ['./news.component.scss']
})

export class NewsComponent implements OnInit {
  customerName: string = '';
  cartCount = 0;
  newsItems: NewsArticle[] = this.createNewsItems();

  constructor(public authService: AuthService) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      const user = this.authService.getCurrentUser();
      this.customerName = user?.username || '';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  navigateToProfile(event: Event): void {
    event.preventDefault();
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

  private createNewsItems(): NewsArticle[] {
    return [
      {
        id: 1,
        title: 'TDK ra mắt bộ sưu tập Royal Carbon 2025',
        excerpt:
          'Phiên bản Royal Carbon sử dụng vật liệu T700 kết hợp phủ gốm giúp giảm 12% khối lượng nhưng tăng 18% khả năng hấp thụ lực.',
        content: '',
        imageUrl: 'https://images.unsplash.com/photo-1529429617124-aee711a7041c?auto=format&fit=crop&w=900&q=80',
        category: 'Sản phẩm mới',
        author: 'TDK Studio',
        publishedAt: '2024-02-15'
      },
      {
        id: 2,
        title: 'Kinh nghiệm chọn size mũ chuẩn form đầu người Việt',
        excerpt: 'Chỉ số vòng đầu không phải yếu tố duy nhất. Hãy chú ý đến tỷ lệ má, gáy và độ mềm của lớp foam.',
        content: '',
        imageUrl: 'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=900&q=80',
        category: 'Kinh nghiệm',
        author: 'Helmets Academy',
        publishedAt: '2024-02-10'
      },
      {
        id: 3,
        title: 'Workshop Build Your Helmet trở lại Hà Nội',
        excerpt:
          'Sau TP.HCM và Đà Nẵng, workshop cá nhân hóa mũ tiếp tục dừng chân tại TDK Studio Hà Nội vào 28/11.',
        content: '',
        imageUrl: 'https://images.unsplash.com/photo-1516632664305-eda5b02f2c49?auto=format&fit=crop&w=900&q=80',
        category: 'Sự kiện',
        author: 'TDK Events',
        publishedAt: '2024-02-05'
      },
      {
        id: 4,
        title: 'Giải mã tiêu chuẩn ECE 22.06 dành cho biker Việt',
        excerpt:
          'Từ 2024, hầu hết model cao cấp đã chuyển sang chuẩn ECE 22.06. TDK giải thích chi tiết để người dùng dễ lựa chọn.',
        content: '',
        imageUrl: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?auto=format&fit=crop&w=900&q=80',
        category: 'Kiến thức',
        author: 'Safety Lab',
        publishedAt: '2024-02-01'
      }
    ];
  }
}

