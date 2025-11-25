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
  private initialPathname: string = ''; // Lưu pathname ban đầu khi component init

  constructor(
    public router: Router, 
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // QUAN TRỌNG: Khi refresh trang, cần đợi router sẵn sàng
    // Lấy URL từ window.location.pathname trước (luôn có sẵn)
    const pathname = window.location.pathname;
    this.initialPathname = pathname; // Lưu pathname ban đầu
    console.log('🔍 AppComponent ngOnInit - Pathname:', pathname);
    console.log('🔍 AppComponent ngOnInit - Router URL:', this.router.url);
    
    // QUAN TRỌNG: Set layout flags ngay lập tức dựa trên URL hiện tại
    // Điều này đảm bảo view được hiển thị đúng ngay từ đầu, không bị flash hoặc nhảy
    if (pathname === '/' || pathname === '') {
      // Nếu là root path, giả định sẽ redirect đến /shop
      this.isShopPage = true;
      this.isLoginPage = false;
      this.showAdminLayout = false;
      console.log('🔍 Root path detected, setting shop layout');
    } else {
      // QUAN TRỌNG: Cập nhật layout flags dựa trên URL thực tế
      // Điều này đảm bảo khi refresh trang admin, layout được set đúng ngay từ đầu
      this.updateLayoutFlags(pathname);
    }
    
    // Force change detection để đảm bảo view được cập nhật ngay
    this.cdr.detectChanges();

    // Lắng nghe NavigationEnd để cập nhật layout flags sau khi navigation hoàn tất
    // QUAN TRỌNG: Chỉ cập nhật nếu URL thực sự thay đổi (user navigate), không phải khi refresh
    this.routerSubscription.add(
      this.router.events
        .pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe((event: NavigationEnd) => {
          // Sử dụng urlAfterRedirects để lấy URL sau khi redirect (nếu có)
          const finalUrl = event.urlAfterRedirects || event.url;
          const normalizedFinalUrl = finalUrl.split('?')[0].split('#')[0];
          const normalizedInitialUrl = this.initialPathname.split('?')[0].split('#')[0];
          
          console.log('🔍 NavigationEnd - Final URL:', normalizedFinalUrl);
          console.log('🔍 NavigationEnd - Initial Pathname:', normalizedInitialUrl);
          console.log('🔍 NavigationEnd - URL After Redirects:', event.urlAfterRedirects);
          
          // QUAN TRỌNG: Khi refresh trang, URL không thay đổi
          // Chỉ cập nhật layout flags nếu URL thực sự thay đổi (user navigate)
          // Điều này tránh việc reset layout flags khi refresh trang admin
          if (normalizedFinalUrl !== normalizedInitialUrl) {
            console.log('🔍 NavigationEnd - URL changed (user navigation), updating layout flags');
            this.updateLayoutFlags(normalizedFinalUrl);
            // Cập nhật initialPathname để lần sau so sánh đúng
            this.initialPathname = normalizedFinalUrl;
          } else {
            console.log('🔍 NavigationEnd - URL unchanged (page refresh), keeping current layout flags');
            // Khi refresh, chỉ đảm bảo layout flags vẫn đúng với URL hiện tại
            // Không cần update vì đã set đúng trong ngOnInit
          }
        })
    );
  }

  updateLayoutFlags(url: string): void {
    // Normalize URL - loại bỏ query params và hash
    const normalizedUrl = url.split('?')[0].split('#')[0];
    
    console.log('🔍 updateLayoutFlags called with URL:', normalizedUrl);
    
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
    // QUAN TRỌNG: Mặc định là admin layout nếu không phải các trang đặc biệt
    this.showAdminLayout = !this.isLoginPage && !this.isShopPage;

    console.log('✅ updateLayoutFlags result:', { 
      url: normalizedUrl, 
      isLoginPage: this.isLoginPage, 
      isShopPage: this.isShopPage, 
      showAdminLayout: this.showAdminLayout,
      isShopRoute,
      isCustomerWebsiteRoute,
      layoutType: this.getLayoutType()
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
