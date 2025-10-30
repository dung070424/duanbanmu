import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { InvoiceManagementComponent } from './components/invoice-management/invoice-management.component';
import { InvoiceDetailComponent } from './components/invoice-detail/invoice-detail.component';
import { CounterSalesComponent } from './components/counter-sales/counter-sales.component';
import { CustomerManagementComponent } from './components/customer-management/customer-management.component';
import { ImportManagementComponent } from './components/import-management/import-management.component';
import { PromotionManagementComponent } from './components/promotion-management/promotion-management.component';
import { PromotionFormComponent } from './components/promotion-form/promotion-form.component';
import { PhieuGiamGiaFormComponent } from './components/phieu-giam-gia-form/phieu-giam-gia-form.component';
import { PhieuGiamGiaListComponent } from './components/phieu-giam-gia-list/phieu-giam-gia-list.component';
import { AccountManagementComponent } from './components/account-management/account-management.component';
import { StaffManagementComponent } from './components/staff-management/staff-management.component';
import { OrderDetailsComponent } from './components/order-details/order-details.component';
import { OrdersComponent } from './components/orders/orders.component';
import { PaymentsComponent } from './components/payments/payments.component';
import { DeliveryComponent } from './components/delivery/delivery.component';
import { HelmetsComponent } from './components/helmets/helmets.component';
import { ManufacturersComponent } from './components/manufacturers/manufacturers.component';
// import { ProductDetailsComponent } from './components/product-details/product-details.component';
import { LoginComponent } from './components/login/login';
import { AuthGuard } from './guards/auth-guard';
import { ColorsComponent } from './components/colors/colors.component';
import { HelmetStylesComponent } from './components/helmet-styles/helmet-styles.component';
import { SizesComponent } from './components/sizes/sizes.component';
import { MaterialsComponent } from './components/materials/materials.component';
import { OriginsComponent } from './components/origins/origins.component';
import { TrongLuongComponent } from './components/trong-luong/trong-luong.component';
import { LoaiMuBaoHiemComponent } from './components/loai-mu-bao-hiem/loai-mu-bao-hiem.component';
import { CongNgheAnToanComponent } from './components/cong-nghe-an-toan/cong-nghe-an-toan.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'invoices',
    component: InvoiceManagementComponent,
    // canActivate: [AuthGuard], // Tạm thời bỏ để test
  },
  {
    path: 'invoices/:id',
    component: InvoiceDetailComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'counter-sales',
    component: CounterSalesComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'invoices/orders',
    component: OrdersComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'invoices/order-details',
    component: OrderDetailsComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'invoices/payments',
    component: PaymentsComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'invoices/delivery',
    component: DeliveryComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'promotions',
    component: PromotionManagementComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'promotions/new',
    component: PromotionFormComponent,
    // canActivate: [AuthGuard], // Tạm thời bỏ để test
  },
  {
    path: 'phieu-giam-gia',
    component: PhieuGiamGiaListComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'phieu-giam-gia-form',
    component: PhieuGiamGiaFormComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'products/helmets',
    component: HelmetsComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'products/manufacturers',
    component: ManufacturersComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'products/colors',
    component: ColorsComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'products/helmet-styles',
    component: HelmetStylesComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'products/sizes',
    component: SizesComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'products/materials',
    component: MaterialsComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'products/origins',
    component: OriginsComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'products/trong-luong',
    component: TrongLuongComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'products/loai-mu-bao-hiem',
    component: LoaiMuBaoHiemComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'products/cong-nghe-an-toan',
    component: CongNgheAnToanComponent,
    canActivate: [AuthGuard],
  },
  // { path: 'products/inventory', component: InventoryComponent, canActivate: [AuthGuard] },
  {
    path: 'customers',
    component: CustomerManagementComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'test-customers',
    component: CustomerManagementComponent,
    // canActivate: [AuthGuard], // Tạm thời bỏ AuthGuard để test
  },
  {
    path: 'import',
    component: ImportManagementComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'management',
    component: AccountManagementComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'staff',
    component: StaffManagementComponent,
    canActivate: [AuthGuard],
  },

  { path: '**', redirectTo: '/dashboard' },
];
