import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-shop-tabs',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './shop-tabs.component.html',
  styleUrls: ['./shop-tabs.component.scss']
})
export class ShopTabsComponent implements OnInit {
  activeTab: 'best-selling' | 'featured' | 'best-price' = 'best-selling';

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Kiểm tra query params để set active tab
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        if (['best-selling', 'featured', 'best-price'].includes(params['tab'])) {
          this.activeTab = params['tab'] as 'best-selling' | 'featured' | 'best-price';
        }
      }
    });
  }

  setActiveTab(tab: 'best-selling' | 'featured' | 'best-price'): void {
    this.activeTab = tab;
    // Luôn navigate về shop/products với tab được chọn
    this.router.navigate(['/shop/products'], {
      queryParams: { tab: tab }
    });
  }
}

