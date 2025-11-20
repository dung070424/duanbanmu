import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-shop-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './shop-footer.component.html',
  styleUrls: ['./shop-footer.component.scss'],
})
export class ShopFooterComponent {
  currentYear = new Date().getFullYear();
}
