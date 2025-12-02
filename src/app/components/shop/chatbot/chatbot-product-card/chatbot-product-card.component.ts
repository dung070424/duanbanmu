import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SanPhamResponse } from '../../../../services/product-api.service';

@Component({
  selector: 'app-chatbot-product-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './chatbot-product-card.component.html',
  styleUrls: ['./chatbot-product-card.component.scss']
})
export class ChatbotProductCardComponent {
  @Input() product!: SanPhamResponse;

  // Base64 placeholder: 1x1 transparent PNG
  private readonly PLACEHOLDER_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  getProductImageUrl(): string {
    if (!this.product || !this.product.anhSanPham) {
      return this.PLACEHOLDER_IMAGE;
    }

    

    const imageUrl = this.product.anhSanPham.trim();
    
    // Nếu empty sau khi trim, dùng placeholder
    if (imageUrl.length === 0) {
      return this.PLACEHOLDER_IMAGE;
    }

    // Kiểm tra xem có phải là base64 với prefix đầy đủ không
    if (imageUrl.startsWith('data:image')) {
      return imageUrl;
    }

    // Kiểm tra xem có phải là base64 không có prefix (bắt đầu bằng /9j/ cho JPEG hoặc iVBORw0KG cho PNG)
    if (imageUrl.startsWith('/9j/') || imageUrl.startsWith('iVBORw0KG') || imageUrl.startsWith('UklGR')) {
      // Cố gắng detect loại ảnh
      let mimeType = 'image/jpeg';
      if (imageUrl.startsWith('iVBORw0KG')) {
        mimeType = 'image/png';
      } else if (imageUrl.startsWith('UklGR')) {
        mimeType = 'image/webp';
      }
      return `data:${mimeType};base64,${imageUrl}`;
    }

    // Kiểm tra xem có phải là URL đầy đủ không
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }

    // Nếu là đường dẫn tương đối, thêm base URL
    if (imageUrl.startsWith('/')) {
      return imageUrl;
    }

    // Nếu không có prefix, thử thêm /
    return `/${imageUrl}`;
  }

  formatCurrency(price: number | null | undefined): string {
    if (!price) return '0 VNĐ';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  }

  viewProductDetail(): void {
    // Navigation sẽ được xử lý bởi routerLink trong template
  }

  handleImageError(event: any): void {
    // Nếu ảnh lỗi, dùng placeholder base64
    if (event && event.target) {
      event.target.src = this.PLACEHOLDER_IMAGE;
    }
  }
}

