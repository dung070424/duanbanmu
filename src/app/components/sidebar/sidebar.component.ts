import { Component, OnInit, ViewEncapsulation, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class SidebarComponent implements OnInit {
  @Input() isCollapsed = false;
  isHovered = false; // Thêm state để track hover
  filteredMenuItems: any[] = [];
  menuItems: any[] = []; // Reference for template
  
  allMenuItems = [
    {
      icon: 'bi-clipboard-data',
      label: 'Thống kê',
      route: '/dashboard',
      active: true,
      hasSubmenu: false,
      isExpanded: false,
      submenu: [],
      roles: ['ADMIN'], // Chỉ ADMIN
    },
    {
      icon: 'bi-receipt',
      label: 'Hóa Đơn',
      route: '/invoices',
      active: false,
      hasSubmenu: false,
      isExpanded: false,
      submenu: [],
      roles: ['ADMIN', 'STAFF'], // ADMIN và STAFF
    },
    {
      icon: 'bi-cart',
      label: 'Bán Tại Quầy',
      route: '/counter-sales',
      active: false,
      hasSubmenu: false,
      isExpanded: false,
      submenu: [],
      roles: ['ADMIN', 'STAFF'], // ADMIN và STAFF
    },
    {
      icon: 'bi-box-seam',
      label: 'Quản lý sản phẩm',
      route: '/products',
      active: false,
      hasSubmenu: true,
      isExpanded: false,
      roles: ['ADMIN'], // Chỉ ADMIN
      submenu: [
        {
          label: 'Sản phẩm mũ bảo hiểm',
          route: '/products/helmets',
          active: false,
        },
        {
          label: 'Quản lý thuộc tính sản phẩm',
          route: '/products/attributes',
          active: false,
          hasSubmenu: true,
          isExpanded: false,
          submenu: [
            {
              label: 'Màu sắc',
              route: '/products/colors',
              active: false,
            },
            {
              label: 'Kích thước',
              route: '/products/sizes',
              active: false,
            },
            {
              label: 'Chất liệu vỏ',
              route: '/products/materials',
              active: false,
            },
            {
              label: 'Xuất xứ',
              route: '/products/origins',
              active: false,
            },
            {
              label: 'Trọng lượng',
              route: '/products/trong-luong',
              active: false,
            },
            {
              label: 'Loại mũ bảo hiểm',
              route: '/products/loai-mu-bao-hiem',
              active: false,
            },
            {
              label: 'Nhà sản xuất',
              route: '/products/manufacturers',
              active: false,
            },
            {
              label: 'Kiểu dáng mũ',
              route: '/products/helmet-styles',
              active: false,
            },
            {
              label: 'Công nghệ an toàn',
              route: '/products/cong-nghe-an-toan',
              active: false,
            },
          ],
        },
      ],
    },
    {
      icon: 'bi-person',
      label: 'Quản lý tài khoản',
      route: null,
      active: false,
      hasSubmenu: true,
      isExpanded: false,
      roles: ['ADMIN'], // Chỉ ADMIN
      submenu: [
        {
          icon: 'bi-person-workspace',
          label: 'Quản lý nhân viên',
          route: '/staff',
          active: false,
          hasSubmenu: false,
          isExpanded: false,
          submenu: [],
        },
        {
          icon: 'bi-people',
          label: 'Quản lý khách hàng',
          route: '/customers',
          active: false,
          hasSubmenu: false,
          isExpanded: false,
          submenu: [],
        },
      ],
    },
    {
      icon: 'bi-percent',
      label: 'Quản Lý Giảm Giá',
      route: null,
      active: false,
      hasSubmenu: true,
      isExpanded: false,
      roles: ['ADMIN'], // Chỉ ADMIN
      submenu: [
        {
          icon: 'bi-megaphone',
          label: 'Đợt Giảm Giá',
          route: '/promotions',
          active: false,
          hasSubmenu: false,
          isExpanded: false,
          submenu: [],
        },
        {
          icon: 'bi-ticket-perforated',
          label: 'Phiếu Giảm Giá',
          route: '/phieu-giam-gia',
          active: false,
          hasSubmenu: false,
          isExpanded: false,
          submenu: [],
        },
      ],
    },
  ];

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit() {
    // Filter menu items based on user role
    this.filterMenuByRole();
    
    // Update active menu on initial load
    this.updateActiveMenuItem(this.router.url);
    
    // Update active menu on route changes
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateActiveMenuItem(event.url);
      });
    
    // Re-filter menu when user changes
    this.authService.currentUser$.subscribe(() => {
      this.filterMenuByRole();
    });
  }

  filterMenuByRole(): void {
    const user = this.authService.getCurrentUser();
    const userRoles = user?.roles || [];

    this.filteredMenuItems = this.allMenuItems.filter(item => {
      // Nếu không có roles requirement, hiển thị cho tất cả
      if (!item.roles || item.roles.length === 0) {
        return true;
      }
      
      // Kiểm tra user có role phù hợp không
      const hasRequiredRole = item.roles.some((role: string) => 
        userRoles.includes(role)
      );
      
      // Nếu có submenu, filter submenu items
      if (hasRequiredRole && item.hasSubmenu && item.submenu) {
        item.submenu = item.submenu.filter((subItem: any) => {
          if (!subItem.roles || subItem.roles.length === 0) {
            return true;
          }
          return subItem.roles.some((role: string) => userRoles.includes(role));
        });
      }
      
      return hasRequiredRole;
    });
    
    // Update menuItems reference
    this.menuItems = this.filteredMenuItems;
  }

  updateActiveMenuItem(currentUrl: string) {
    this.filteredMenuItems.forEach((item) => {
      item.active = currentUrl === item.route;

      // Check submenu items
      if (item.hasSubmenu && item.submenu) {
        item.submenu.forEach((subItem: any) => {
          subItem.active = currentUrl === subItem.route;

          // Check nested submenu items
          if (subItem.hasSubmenu && subItem.submenu) {
            subItem.submenu.forEach((nestedItem: any) => {
              nestedItem.active = currentUrl === nestedItem.route;
            });
          }
        });

        // Auto-expand parent if any submenu item is active
        if (item.submenu.some((subItem: any) => subItem.active || (subItem.hasSubmenu && subItem.submenu && subItem.submenu.some((nestedItem: any) => nestedItem.active)))) {
          item.isExpanded = true;
        }
      }
    });
  }

  toggleSubmenu(item: any) {
    if (item.hasSubmenu) {
      item.isExpanded = !item.isExpanded;
    }
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Hover events để mở/đóng sidebar
  onMouseEnter() {
    this.isHovered = true;
  }

  onMouseLeave() {
    this.isHovered = false;
  }
}
