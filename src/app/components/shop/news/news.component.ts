import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { ChatbotComponent } from '../chatbot/chatbot.component';

interface NewsItem {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  image?: string;
  date: string;
  category: string;
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
  newsItems: NewsItem[] = [];

  constructor(public authService: AuthService) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      const user = this.authService.getCurrentUser();
      this.customerName = user?.username || '';
    }
    this.loadNews();
  }

  loadNews(): void {
    // Dữ liệu tin tức mẫu
    this.newsItems = [
      {
        id: 1,
        title: 'Cách chọn mũ bảo hiểm phù hợp với từng loại xe',
        excerpt: 'Việc chọn mũ bảo hiểm phù hợp không chỉ đảm bảo an toàn mà còn mang lại sự thoải mái khi sử dụng. Hãy cùng tìm hiểu cách chọn mũ bảo hiểm phù hợp với từng loại xe.',
        content: 'Mũ bảo hiểm là thiết bị bảo vệ quan trọng nhất khi tham gia giao thông. Tuy nhiên, không phải tất cả các loại mũ đều phù hợp với mọi loại xe. Mũ bảo hiểm nón 3/4 thường phù hợp với xe số, xe tay ga, trong khi mũ full face lại phù hợp với xe phân khối lớn, xe thể thao. Việc chọn đúng loại mũ sẽ giúp bạn cảm thấy thoải mái hơn và an toàn hơn khi tham gia giao thông.',
        date: '2024-01-15',
        category: 'An toàn giao thông',
        image: '/assets/images/news-1.jpg'
      },
      {
        id: 2,
        title: 'Tiêu chuẩn chất lượng mũ bảo hiểm quốc tế bạn cần biết',
        excerpt: 'Các tiêu chuẩn chất lượng như DOT, ECE, Snell là những tiêu chuẩn quan trọng để đánh giá chất lượng mũ bảo hiểm. Hãy cùng tìm hiểu về các tiêu chuẩn này.',
        content: 'Khi mua mũ bảo hiểm, việc kiểm tra các tiêu chuẩn chất lượng là rất quan trọng. Tiêu chuẩn DOT (Department of Transportation) là tiêu chuẩn của Mỹ, ECE (Economic Commission for Europe) là tiêu chuẩn của Châu Âu, còn Snell là tiêu chuẩn cao cấp hơn được nhiều người đua xe chuyên nghiệp sử dụng. Mỗi tiêu chuẩn đều có những yêu cầu khác nhau về độ bền, khả năng hấp thụ lực và khả năng bảo vệ.',
        date: '2024-01-10',
        category: 'Kiến thức',
        image: '/assets/images/news-2.jpg'
      },
      {
        id: 3,
        title: 'Bảo quản và vệ sinh mũ bảo hiểm đúng cách',
        excerpt: 'Việc bảo quản và vệ sinh mũ bảo hiểm đúng cách sẽ giúp kéo dài tuổi thọ của mũ và đảm bảo an toàn khi sử dụng.',
        content: 'Mũ bảo hiểm cần được bảo quản ở nơi khô ráo, thoáng mát, tránh ánh nắng trực tiếp. Khi vệ sinh, bạn nên sử dụng nước ấm và xà phòng nhẹ, tránh sử dụng các chất tẩy mạnh. Lớp lót bên trong mũ cần được giặt thường xuyên để tránh vi khuẩn và mùi hôi. Ngoài ra, bạn cũng nên thay mũ sau 3-5 năm sử dụng hoặc sau khi bị va đập mạnh.',
        date: '2024-01-05',
        category: 'Hướng dẫn',
        image: '/assets/images/news-3.jpg'
      },
      {
        id: 4,
        title: 'Xu hướng mũ bảo hiểm năm 2024: Thiết kế hiện đại và công nghệ thông minh',
        excerpt: 'Năm 2024 chứng kiến sự phát triển mạnh mẽ của các mũ bảo hiểm tích hợp công nghệ thông minh như Bluetooth, GPS, và hệ thống thông gió tiên tiến.',
        content: 'Các nhà sản xuất mũ bảo hiểm đang không ngừng cải tiến sản phẩm với các tính năng công nghệ mới. Mũ bảo hiểm thông minh tích hợp Bluetooth cho phép người dùng nghe nhạc, trả lời cuộc gọi mà không cần tháo mũ. Hệ thống thông gió tiên tiến giúp mũ luôn thoáng mát, đặc biệt trong thời tiết nóng. Ngoài ra, một số mũ còn được tích hợp GPS và cảm biến để theo dõi vị trí và phát hiện tai nạn.',
        date: '2024-01-01',
        category: 'Công nghệ',
        image: '/assets/images/news-4.jpg'
      },
      {
        id: 5,
        title: 'Tầm quan trọng của việc đội mũ bảo hiểm khi tham gia giao thông',
        excerpt: 'Theo thống kê, việc đội mũ bảo hiểm có thể giảm nguy cơ tử vong khi xảy ra tai nạn lên tới 40%. Hãy cùng tìm hiểu về tầm quan trọng của việc này.',
        content: 'Mũ bảo hiểm là thiết bị bảo vệ quan trọng nhất khi tham gia giao thông bằng xe máy. Nó có thể bảo vệ đầu và não của bạn khỏi các chấn thương nghiêm trọng khi xảy ra tai nạn. Theo nghiên cứu, việc đội mũ bảo hiểm có thể giảm nguy cơ tử vong lên tới 40% và giảm nguy cơ chấn thương nghiêm trọng lên tới 70%. Do đó, việc đội mũ bảo hiểm không chỉ là tuân thủ pháp luật mà còn là bảo vệ chính bản thân và người thân của bạn.',
        date: '2023-12-28',
        category: 'An toàn giao thông',
        image: '/assets/images/news-5.jpg'
      },
      {
        id: 6,
        title: 'Các loại mũ bảo hiểm phổ biến và đặc điểm của từng loại',
        excerpt: 'Có nhiều loại mũ bảo hiểm khác nhau trên thị trường. Hãy cùng tìm hiểu về các loại mũ bảo hiểm phổ biến và đặc điểm của từng loại.',
        content: 'Mũ bảo hiểm nón 3/4 là loại mũ phổ biến nhất, che phủ phần đỉnh và hai bên đầu, để hở mặt. Mũ full face che phủ toàn bộ đầu và mặt, cung cấp bảo vệ tối đa. Mũ modular (flip-up) có thể mở phần cằm lên, kết hợp ưu điểm của cả hai loại. Mũ off-road được thiết kế đặc biệt cho địa hình, có kính che nắng dài và thông gió tốt. Mỗi loại mũ đều có ưu và nhược điểm riêng, tùy thuộc vào nhu cầu sử dụng của bạn.',
        date: '2023-12-25',
        category: 'Kiến thức',
        image: '/assets/images/news-6.jpg'
      }
    ];
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
}

