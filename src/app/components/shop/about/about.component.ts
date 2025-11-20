import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { ChatbotComponent } from '../chatbot/chatbot.component';
import { ShopHeaderComponent } from '../shared/shop-header.component';
import { ShopFooterComponent } from '../shared/shop-footer.component';

interface AboutInfo {
  heroTitle: string;
  heroSubtitle: string;
  description: string;
  stats: StatItem[];
  sections: AboutSection[];
  coreValues: CoreValue[];
  commitments: CommitmentItem[];
}

interface StatItem {
  label: string;
  value: string;
  description: string;
  icon: string;
}

interface AboutSection {
  title: string;
  icon: string;
  body: string;
  bulletPoints?: string[];
}

interface CoreValue {
  title: string;
  description: string;
}

interface CommitmentItem {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterModule, ChatbotComponent, ShopHeaderComponent, ShopFooterComponent],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
})
export class AboutComponent implements OnInit {
  customerName: string = '';
  cartCount = 0;
  aboutInfo: AboutInfo = this.createAboutInfo();

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

  private createAboutInfo(): AboutInfo {
    return {
      heroTitle: 'Giới thiệu về TDK Store',
      heroSubtitle: 'Chuyên gia trong lĩnh vực mũ bảo hiểm cao cấp và an toàn giao thông',
      description:
        'TDK Store được thành lập năm 2019 với sứ mệnh mang đến những chiếc mũ bảo hiểm chất lượng cao, an toàn và thời trang cho cộng đồng người Việt. Từ một cửa hàng nhỏ tại Hà Nội, chúng tôi đã phát triển thành hệ thống phân phối mũ bảo hiểm hàng đầu với hơn 120 đại lý trên toàn quốc. Với đội ngũ chuyên nghiệp và đam mê, TDK Store cam kết mang đến trải nghiệm mua sắm tốt nhất và sản phẩm đạt tiêu chuẩn quốc tế.',
      stats: [
        {
          label: 'Showroom',
          value: '12+',
          description: 'Tại Hà Nội, Đà Nẵng và TP. Hồ Chí Minh',
          icon: 'fa-store',
        },
        {
          label: 'Đại lý',
          value: '120+',
          description: 'Đối tác chiến lược trên toàn quốc',
          icon: 'fa-map-marker-alt',
        },
        {
          label: 'Khách hàng',
          value: '950K+',
          description: 'Đã tin tưởng TDK trong 5 năm qua',
          icon: 'fa-users',
        },
        {
          label: 'Sản phẩm',
          value: '200+',
          description: 'Mẫu mũ bảo hiểm đa dạng',
          icon: 'fa-helmet-safety',
        },
      ],
      sections: [
        {
          title: 'Sứ mệnh',
          icon: 'fa-bullseye',
          body: 'Bảo vệ người dùng trên mọi hành trình bằng những chiếc mũ đạt chuẩn an toàn quốc tế, thời trang và thoải mái.',
        },
        {
          title: 'Tầm nhìn',
          icon: 'fa-eye',
          body: 'Trở thành hệ sinh thái mũ bảo hiểm hàng đầu Đông Nam Á, kết hợp bán lẻ, studio thiết kế và dịch vụ hậu mãi.',
        },
      ],
      coreValues: [
        { title: 'Chất lượng', description: '100% sản phẩm vượt qua 42 bước kiểm định nội bộ.' },
        {
          title: 'An toàn',
          description: 'Ưu tiên cấu trúc vỏ và hệ thống khóa đạt chuẩn DOT & ECE.',
        },
        { title: 'Uy tín', description: 'Minh bạch thông tin, bảo hành điện tử tra cứu được.' },
        { title: 'Dịch vụ', description: 'Đội ngũ cố vấn đồng hành 24/7 với từng khách hàng.' },
        {
          title: 'Đổi mới',
          description: 'Luôn cập nhật công nghệ sợi carbon, sơn phủ và kính lọc UV.',
        },
      ],
      commitments: [
        {
          icon: 'fa-shield-alt',
          title: 'Bảo hành 24 tháng',
          description: 'Tự hào tiên phong áp dụng bảo hành điện tử cho mũ bảo hiểm tại Việt Nam.',
        },
        {
          icon: 'fa-truck',
          title: 'Giao nhanh toàn quốc',
          description:
            'Đặt hàng trước 15h, giao hỏa tốc nội thành trong 3 giờ, miễn phí vận chuyển toàn quốc.',
        },
        {
          icon: 'fa-undo-alt',
          title: 'Đổi size miễn phí',
          description:
            'Hỗ trợ đổi size hoặc kiểu mũ trong 7 ngày nếu chưa sử dụng hoặc phát sinh lỗi kỹ thuật.',
        },
        {
          icon: 'fa-headset',
          title: 'Cố vấn cá nhân',
          description:
            'Mỗi khách hàng được gán một cố vấn cá nhân để theo dõi lịch bảo dưỡng và làm mới mũ.',
        },
      ],
    };
  }
}
