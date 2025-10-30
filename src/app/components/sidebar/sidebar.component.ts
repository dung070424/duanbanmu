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
  menuItems = [
    {
      icon: 'bi-clipboard-data',
      label: 'Thống kê',
      route: '/dashboard',
      active: true,
      hasSubmenu: false,
      isExpanded: false,
      submenu: [],
    },
    {
      icon: 'bi-receipt',
      label: 'Hóa Đơn',
      route: '/invoices',
      active: false,
      hasSubmenu: false,
      isExpanded: false,
      submenu: [],
    },
    {
      icon: 'bi-cart',
      label: 'Bán Tại Quầy',
      route: '/counter-sales',
      active: false,
      hasSubmenu: false,
      isExpanded: false,
      submenu: [],
    },
    {
      icon: 'bi-box-seam',
      label: 'Quản lý sản phẩm',
      route: '/products',
      active: false,
      hasSubmenu: true,
      isExpanded: false,
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
      route: '/management',
      active: false,
      hasSubmenu: false,
      isExpanded: false,
      submenu: [],
    },
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
    {
      icon: 'bi-percent',
      label: 'Quản Lý Giảm Giá',
      route: null,
      active: false,
      hasSubmenu: true,
      isExpanded: false,
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
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateActiveMenuItem(event.url);
      });
  }

  updateActiveMenuItem(currentUrl: string) {
    this.menuItems.forEach((item) => {
      item.active = currentUrl === item.route;

      // Check submenu items
      if (item.hasSubmenu && item.submenu) {
        item.submenu.forEach((subItem) => {
          subItem.active = currentUrl === subItem.route;

          // Check nested submenu items
          if (subItem.hasSubmenu && subItem.submenu) {
            subItem.submenu.forEach((nestedItem) => {
              nestedItem.active = currentUrl === nestedItem.route;
            });
          }
        });

        // Don't auto-expand parent - let user manually toggle
        // if (item.submenu.some((subItem) => subItem.active)) {
        //   item.isExpanded = true;
        // }
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
