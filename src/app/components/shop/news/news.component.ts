import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { ChatbotComponent } from '../chatbot/chatbot.component';
import { ShopHeaderComponent } from '../shared/shop-header.component';
import { ShopFooterComponent } from '../shared/shop-footer.component';

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
  imports: [CommonModule, RouterModule, ChatbotComponent, ShopHeaderComponent, ShopFooterComponent],
  templateUrl: './news.component.html',
  styleUrls: ['./news.component.scss'],
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
      day: 'numeric',
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

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'https://img.websosanh.vn/v10/users/review/images/upwqa7ggsjfov/mu-bao-hiem-co-ket-cau-thoang-khi.jpg?compress=85';
  }

  private createNewsItems(): NewsArticle[] {
    return [
      {
        id: 1,
        title: 'TDK ra mắt bộ sưu tập Royal Carbon 2025',
        excerpt:
          'Phiên bản Royal Carbon sử dụng vật liệu T700 kết hợp phủ gốm giúp giảm 12% khối lượng nhưng tăng 18% khả năng hấp thụ lực. Thiết kế khí động học tối ưu cho tốc độ cao.',
        content: '',
        imageUrl:
          'https://img.websosanh.vn/v10/users/review/images/upwqa7ggsjfov/mu-bao-hiem-co-ket-cau-thoang-khi.jpg?compress=85',
        category: 'Sản phẩm mới',
        author: 'TDK Studio',
        publishedAt: '2024-02-15',
      },
      {
        id: 2,
        title: 'Hướng dẫn chọn mũ fullface đạt chuẩn track-day',
        excerpt:
          'Checklist kiểm tra lực nén, padding và góc nhìn trước khi xuống đường đua. Chỉ số vòng đầu không phải yếu tố duy nhất, hãy chú ý đến tỷ lệ má, gáy và độ mềm của lớp foam.',
        content: '',
        imageUrl:
          'https://bigbike.vn/wp-content/uploads/2024/06/CABERG-AVALON-X-BLACK-WHITE-09.jpg',
        category: 'Kinh nghiệm',
        author: 'Helmets Academy',
        publishedAt: '2024-02-10',
      },
      {
        id: 3,
        title: 'Workshop "Build Your Carbon Helmet" tại HCM',
        excerpt:
          'Trải nghiệm tự tay lắp ráp mũ carbon, khắc tên laser, tùy biến tem. Sau TP.HCM và Đà Nẵng, workshop cá nhân hóa mũ tiếp tục dừng chân tại TDK Studio Hà Nội.',
        content: '',
        imageUrl:
          'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRsDzNcBmVRGLFkFqk8hGqNP4lB3iy0ETZVZA&s',
        category: 'Sự kiện',
        author: 'TDK Events',
        publishedAt: '2024-02-05',
      },
      {
        id: 4,
        title: 'Giải mã tiêu chuẩn ECE 22.06 dành cho biker Việt',
        excerpt:
          'Từ 2024, hầu hết model cao cấp đã chuyển sang chuẩn ECE 22.06. TDK giải thích chi tiết về các tiêu chuẩn an toàn để người dùng dễ lựa chọn sản phẩm phù hợp.',
        content: '',
        imageUrl:
          'https://img.websosanh.vn/v10/users/review/images/upwqa7ggsjfov/mu-bao-hiem-co-ket-cau-thoang-khi.jpg?compress=85',
        category: 'Kiến thức',
        author: 'Safety Lab',
        publishedAt: '2024-02-01',
      },
      {
        id: 5,
        title: 'Bảo dưỡng mũ bảo hiểm đúng cách để tăng tuổi thọ',
        excerpt:
          'Hướng dẫn chi tiết cách vệ sinh, bảo quản và bảo dưỡng mũ bảo hiểm để đảm bảo an toàn và kéo dài tuổi thọ sử dụng. Những lưu ý quan trọng khi sử dụng mũ hàng ngày.',
        content: '',
        imageUrl:
          'https://nonbaohiemdep.vn/wp-content/uploads/2020/12/mu-bao-hiem-cao-cao.png',
        category: 'Kinh nghiệm',
        author: 'TDK Care',
        publishedAt: '2024-01-28',
      },
      {
        id: 6,
        title: 'So sánh mũ bảo hiểm fullface vs modular',
        excerpt:
          'Phân tích chi tiết ưu nhược điểm của mũ fullface và modular. Giúp bạn lựa chọn loại mũ phù hợp với nhu cầu sử dụng và phong cách lái xe của mình.',
        content: '',
        imageUrl:
          'https://fado.vn/blog/wp-content/uploads/2021/09/top-10-mu-bao-hiem-phan-khoi-lon-nhap-khau-chinh-hang-duoi-10tr-3-min.jpg',
        category: 'Kiến thức',
        author: 'TDK Review',
        publishedAt: '2024-01-25',
      },
    ];
  }
}
