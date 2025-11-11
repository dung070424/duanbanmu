import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { HeaderComponent } from './components/header/header.component';
import { AuthService } from './services/auth';
import { Subscription, filter } from 'rxjs';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Helmet Store';
  sidebarHidden = false;
  isLoginPage = false;
  isShopPage = false; // Trang shop (customer website)
  showAdminLayout = false; // Không hiển thị admin layout mặc định, sẽ được cập nhật dựa trên route
  private routerSubscription: Subscription = new Subscription();

  constructor(
    public router: Router, 
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Kiểm tra route hiện tại để xác định layout ngay từ đầu
    // Nếu URL là '/' (root), sẽ được redirect đến '/shop', nên set isShopPage = true ngay từ đầu
    const currentUrl = this.router.url || window.location.pathname;
    if (currentUrl === '/' || currentUrl === '') {
      // Nếu là root path, giả định sẽ redirect đến /shop
      this.isShopPage = true;
      this.isLoginPage = false;
      this.showAdminLayout = false;
    } else {
      this.updateLayoutFlags(currentUrl);
    }

    // Lắng nghe NavigationEnd để cập nhật layout flags sau khi navigation hoàn tất
    // Sử dụng NavigationEnd thay vì NavigationStart để đảm bảo redirect đã hoàn tất
    this.routerSubscription.add(
      this.router.events
        .pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe((event: NavigationEnd) => {
          // Sử dụng urlAfterRedirects để lấy URL sau khi redirect (nếu có)
          // Điều này đảm bảo layout flags được cập nhật đúng với URL cuối cùng
          const finalUrl = event.urlAfterRedirects || event.url;
          this.updateLayoutFlags(finalUrl);
        })
    );
  }

  updateLayoutFlags(url: string): void {
    // Normalize URL - loại bỏ query params và hash
    const normalizedUrl = url.split('?')[0].split('#')[0];
    
    // Trang login, register, forgot-password (Admin/Staff) - không có sidebar/header
    this.isLoginPage = normalizedUrl === '/login' || normalizedUrl === '/register' || normalizedUrl === '/forgot-password';

    // Trang shop - không có sidebar/header (customer website)
    // Bao gồm cả /shop/login, /shop/register, /shop/forgot-password, /shop/cart, /shop/checkout
    // VÀ các route /customer/* (số ít) như /customer/profile, /customer/orders - đây là customer website pages
    // KHÔNG BAO GỒM /customers (số nhiều) - đây là admin management page, cần có sidebar
    const isShopRoute = normalizedUrl.startsWith('/shop');
    
    // Kiểm tra /customer/* (số ít) nhưng KHÔNG phải /customers (số nhiều)
    // /customer/profile, /customer/orders -> shop layout (không có sidebar)
    // /customers, /customers/* -> admin layout (có sidebar)
    // Logic: chỉ match /customer/ (có dấu / sau customer) và KHÔNG match /customers (số nhiều)
    const isCustomerWebsiteRoute = normalizedUrl.startsWith('/customer/') && 
                                   !normalizedUrl.startsWith('/customers');
    
    this.isShopPage = isShopRoute || isCustomerWebsiteRoute;

    // Hiển thị admin layout nếu không phải login/shop/customer website pages
    this.showAdminLayout = !this.isLoginPage && !this.isShopPage;

    console.log('updateLayoutFlags:', { 
      url: normalizedUrl, 
      isLoginPage: this.isLoginPage, 
      isShopPage: this.isShopPage, 
      showAdminLayout: this.showAdminLayout,
      isShopRoute,
      isCustomerWebsiteRoute
    });
    
    // Force change detection để đảm bảo view được cập nhật ngay lập tức
    this.cdr.detectChanges();
  }

  /**
   * Trả về loại layout dựa trên route hiện tại
   * Sử dụng trong ngSwitch để đảm bảo chỉ một layout được hiển thị
   */
  getLayoutType(): 'auth' | 'shop' | 'admin' {
    if (this.isLoginPage) {
      return 'auth';
    }
    if (this.isShopPage) {
      return 'shop';
    }
    return 'admin';
  }

  ngOnDestroy() {
    this.routerSubscription.unsubscribe();
  }

  toggleSidebar() {
    console.log('Toggle sidebar called, current state:', this.sidebarHidden);
    this.sidebarHidden = !this.sidebarHidden;
    console.log('New state:', this.sidebarHidden);
  }
}
