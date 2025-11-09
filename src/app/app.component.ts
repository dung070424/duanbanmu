import { Component, OnInit, OnDestroy } from '@angular/core';
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
  showAdminLayout = true; // Hiển thị sidebar/header cho admin/staff pages
  private routerSubscription: Subscription = new Subscription();

  constructor(public router: Router, private authService: AuthService) {}

  ngOnInit() {
    // Kiểm tra route hiện tại để xác định layout
    this.updateLayoutFlags(this.router.url);
    
    this.routerSubscription.add(
      this.router.events
        .pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe((event: NavigationEnd) => {
          this.updateLayoutFlags(event.url);
        })
    );
  }

  updateLayoutFlags(url: string): void {
    // Trang login, register, forgot-password (Admin/Staff) - không có sidebar/header
    this.isLoginPage = url === '/login' || url === '/register' || url === '/forgot-password';
    
    // Trang shop và customer pages - không có sidebar/header (customer website)
    // Bao gồm cả /shop/login, /shop/register, /shop/forgot-password, /shop/cart, /shop/checkout, /customer/profile, /customer/orders
    this.isShopPage = url.startsWith('/shop') || url.startsWith('/customer');
    
    // Hiển thị admin layout nếu không phải login/shop/customer pages
    this.showAdminLayout = !this.isLoginPage && !this.isShopPage;
    
    console.log('updateLayoutFlags:', { url, isLoginPage: this.isLoginPage, isShopPage: this.isShopPage, showAdminLayout: this.showAdminLayout });
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
