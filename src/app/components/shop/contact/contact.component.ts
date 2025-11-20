import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { ChatbotComponent } from '../chatbot/chatbot.component';
import { ShopHeaderComponent } from '../shared/shop-header.component';
import { ShopFooterComponent } from '../shared/shop-footer.component';

interface ContactInfo {
  hotline: string;
  supportEmail: string;
  businessEmail: string;
  channels: ContactChannel[];
  showrooms: ShowroomInfo[];
  businessHours: Record<string, string>;
  socialLinks: SocialLink[];
  bankInfo: BankInfo;
}

interface ContactChannel {
  label: string;
  value: string;
  link?: string;
  icon: string;
}

interface ShowroomInfo {
  city: string;
  address: string;
  phone: string;
  mapUrl: string;
}

interface SocialLink {
  platform: string;
  icon: string;
  url: string;
}

interface BankInfo {
  bankName: string;
  accountName: string;
  accountNumber: string;
  qrImageUrl: string;
  branch: string;
  note: string;
}

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, RouterModule, ChatbotComponent, ShopHeaderComponent, ShopFooterComponent],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss']
})
export class ContactComponent implements OnInit {
  customerName: string = '';
  cartCount = 0;
  contactInfo: ContactInfo = this.createContactInfo();
  readonly currentYear: number = new Date().getFullYear();

  constructor(public authService: AuthService) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      const user = this.authService.getCurrentUser();
      this.customerName = user?.username || '';
    }
  }

  navigateToProfile(event: Event): void {
    event.preventDefault();
    if (this.authService.isLoggedIn()) {
      window.location.href = '/customer/profile';
    } else {
      window.location.href = '/shop/login';
    }
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

  openLink(target: string): void {
    if (!target) {
      return;
    }
    if (target.startsWith('http')) {
      window.open(target, '_blank');
      return;
    }
    if (target.startsWith('m.me') || target.startsWith('zalo.me')) {
      window.open(`https://${target}`, '_blank');
      return;
    }
    if (target.includes('@')) {
      window.location.href = `mailto:${target}`;
      return;
    }
    window.location.href = `tel:${target.replace(/\s+/g, '')}`;
  }

  private createContactInfo(): ContactInfo {
    return {
      hotline: '1900 63 66 48',
      supportEmail: 'support@tdkstore.com',
      businessEmail: 'partnership@tdkstore.com',
      channels: [
        { label: 'Messenger', value: 'm.me/tdkstore', link: 'https://m.me/tdkstore', icon: 'fab fa-facebook-messenger' },
        { label: 'Zalo', value: 'zalo.me/tdkstore', link: 'https://zalo.me/tdkstore', icon: 'fas fa-comment-dots' },
        { label: 'Hotline 24/7', value: '1900 63 66 48', link: 'tel:1900636648', icon: 'fas fa-headset' }
      ],
      showrooms: [
        { city: 'TP. Hồ Chí Minh', address: '147 Đồng Đen, Tân Bình', phone: '0903 89 14 99', mapUrl: 'https://goo.gl/maps/xyz' },
        { city: 'Hà Nội', address: '466 Đ. Bưởi, Ba Đình', phone: '08 38 38 44 66', mapUrl: 'https://goo.gl/maps/abc' },
        { city: 'Đà Nẵng', address: '58 Nguyễn Văn Linh, Hải Châu', phone: '0931 88 55 11', mapUrl: 'https://goo.gl/maps/def' }
      ],
      businessHours: {
        'Thứ 2 - Thứ 6': '08:30 - 21:30',
        'Thứ 7': '08:00 - 22:00',
        'Chủ nhật': '09:00 - 21:00'
      },
      socialLinks: [
        { platform: 'Facebook', icon: 'fab fa-facebook', url: 'https://facebook.com/tdkstore' },
        { platform: 'Instagram', icon: 'fab fa-instagram', url: 'https://instagram.com/tdkstore' },
        { platform: 'YouTube', icon: 'fab fa-youtube', url: 'https://youtube.com/@tdkstore' }
      ],
      bankInfo: {
        bankName: 'MB Bank - Ngân hàng Quân đội',
        accountName: 'CÔNG TY TDK STUDIO',
        accountNumber: '987 654 321',
        branch: 'Chi nhánh Sài Gòn',
        qrImageUrl: 'https://i.imgur.com/3y0Q3xX.png',
        note: 'Nội dung: Tên + SĐT để hệ thống tự động khớp đơn'
      }
    };
  }
}

