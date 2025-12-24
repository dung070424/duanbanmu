import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SanPhamResponse } from '../../../../services/product-api.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-chatbot-product-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './chatbot-product-card.component.html',
  styleUrls: ['./chatbot-product-card.component.scss']
})
export class ChatbotProductCardComponent {
  @Input() product!: SanPhamResponse;

  // Placeholder image URL
  private readonly PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x400?text=No+Image';

  getProductImageUrl(): string {
    if (!this.product || !this.product.anhSanPham) {
      return this.PLACEHOLDER_IMAGE;
    }

    return this.normalizeImagePath(this.product.anhSanPham);
  }

  private normalizeImagePath(src?: string | null): string {
    if (!src) {
      return this.PLACEHOLDER_IMAGE;
    }

    const trimmed = src.trim();
    if (!trimmed) {
      return this.PLACEHOLDER_IMAGE;
    }

    // Nếu là data URL đầy đủ (data:image/...)
    if (/^data:image\//i.test(trimmed)) {
      return trimmed;
    }

    // Nếu là URL đầy đủ (http/https)
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }

    // Kiểm tra xem có phải là base64 không có prefix
    if (this.looksLikeBase64(trimmed)) {
      // Cố gắng detect loại ảnh dựa trên ký tự đầu của base64
      let mimeType = 'image/jpeg'; // default
      const cleanBase64 = trimmed.replace(/^\/+/, ''); // Loại bỏ leading slashes
      
      // PNG base64 thường bắt đầu bằng iVBORw0KG
      if (cleanBase64.startsWith('iVBORw0KG')) {
        mimeType = 'image/png';
      } 
      // WebP base64 thường bắt đầu bằng UklGR
      else if (cleanBase64.startsWith('UklGR')) {
        mimeType = 'image/webp';
      } 
      // JPEG base64 có thể bắt đầu bằng /9j/ (base64 của FF D8 FF E0 - JPEG header)
      // hoặc các ký tự base64 khác
      else if (cleanBase64.startsWith('/9j/')) {
        mimeType = 'image/jpeg';
      }
      // Nếu không match, mặc định là JPEG
      
      return `data:${mimeType};base64,${cleanBase64}`;
    }

    // Nếu là đường dẫn tương đối bắt đầu bằng /
    if (trimmed.startsWith('/')) {
      // Kiểm tra xem có phải là đường dẫn file upload không
      const isFilePath = trimmed.startsWith('/uploads/') || 
                        trimmed.startsWith('/images/') || 
                        trimmed.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i);
      
      if (isFilePath) {
        // Nếu có base URL từ environment, sử dụng nó để tạo full URL
        const baseUrl = environment.apiBaseUrl || environment.apiUrl || '';
        if (baseUrl) {
          // Loại bỏ trailing slash từ baseUrl nếu có
          const cleanBaseUrl = baseUrl.replace(/\/$/, '');
          // Đảm bảo trimmed không bắt đầu bằng baseUrl
          if (!trimmed.startsWith(cleanBaseUrl)) {
            return `${cleanBaseUrl}${trimmed}`;
          }
        }
      }
      // Nếu không phải file path hoặc không có baseUrl, trả về như cũ
      return trimmed;
    }

    // Nếu không có prefix, có thể là:
    // 1. Base64 (đã được check ở trên)
    // 2. Đường dẫn file tương đối (cần thêm /)
    // 3. Tên file đơn giản
    
    // Kiểm tra xem có phải là tên file với extension không
    if (trimmed.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)) {
      // Có thể là tên file, thử thêm base URL hoặc đường dẫn uploads
      const baseUrl = environment.apiBaseUrl || environment.apiUrl || '';
      if (baseUrl) {
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');
        return `${cleanBaseUrl}/uploads/${trimmed}`;
      }
      return `/uploads/${trimmed}`;
    }

    // Mặc định: thêm / để trở thành đường dẫn tương đối
    return `/${trimmed}`;
  }

  private looksLikeBase64(value: string): boolean {
    if (!value) return false;
    const cleaned = value.replace(/\s+/g, '');
    // Base64 thường có độ dài > 40 và chỉ chứa các ký tự base64
    return cleaned.length > 40 && /^[A-Za-z0-9+/]+=*$/.test(cleaned);
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
    // Nếu ảnh lỗi, dùng placeholder
    if (event && event.target) {
      const img = event.target as HTMLImageElement;
      if (img.src && !img.src.includes('placeholder.com') && !img.src.includes('via.placeholder')) {
        img.src = this.PLACEHOLDER_IMAGE;
      }
    }
  }
}


