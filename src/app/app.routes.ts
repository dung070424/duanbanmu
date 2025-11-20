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
import { HelmetFormComponent } from './components/helmet-form/helmet-form.component';
import { ManufacturersComponent } from './components/manufacturers/manufacturers.component';
// import { ProductDetailsComponent } from './components/product-details/product-details.component';
import { LoginComponent } from './components/login/login';
import { RegisterComponent } from './components/register/register';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password';
import { CustomerLoginComponent } from './components/shop/customer-login/customer-login';
import { CustomerRegisterComponent } from './components/shop/customer-register/customer-register';
import { CustomerForgotPasswordComponent } from './components/shop/customer-forgot-password/customer-forgot-password';
import { ShopComponent } from './components/shop/shop.component';
import { CustomerOrdersComponent } from './components/customer-orders/customer-orders.component';
import { CustomerProfileComponent } from './components/customer-profile/customer-profile.component';
import { CartComponent } from './components/shop/cart/cart';
import { CheckoutComponent } from './components/shop/checkout/checkout';
import { ProductDetailComponent } from './components/shop/product-detail/product-detail';
import { roleGuard } from './guards/role-guard';
import { AuthGuard } from './guards/auth-guard';
import { ColorsComponent } from './components/colors/colors.component';
import { HelmetStylesComponent } from './components/helmet-styles/helmet-styles.component';
import { SizesComponent } from './components/sizes/sizes.component';
import { MaterialsComponent } from './components/materials/materials.component';
import { OriginsComponent } from './components/origins/origins.component';
import { TrongLuongComponent } from './components/trong-luong/trong-luong.component';
import { LoaiMuBaoHiemComponent } from './components/loai-mu-bao-hiem/loai-mu-bao-hiem.component';
import { CongNgheAnToanComponent } from './components/cong-nghe-an-toan/cong-nghe-an-toan.component';
import { ChatManagementComponent } from './components/chat-management/chat-management.component';
import { AboutComponent } from './components/shop/about/about.component';
import { NewsComponent } from './components/shop/news/news.component';
import { ContactComponent } from './components/shop/contact/contact.component';
import { CategoriesComponent } from './components/shop/categories/categories';

export const routes: Routes = [
  // Public routes (Admin/Staff)
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },

  // Customer shop routes - public access
  // QUAN TRỌNG: Đặt routes cụ thể trước route chung để tránh conflict
  { path: 'shop/login', component: CustomerLoginComponent },
  { path: 'shop/register', component: CustomerRegisterComponent },
  { path: 'shop/forgot-password', component: CustomerForgotPasswordComponent },
  { path: 'shop/cart', component: CartComponent },
  { path: 'shop/checkout', component: CheckoutComponent },
  { path: 'shop/product/:id', component: ProductDetailComponent },
  { path: 'shop/products', component: ShopComponent },
  { path: 'shop/categories', component: CategoriesComponent },
  { path: 'shop/about', component: AboutComponent },
  { path: 'shop/news', component: NewsComponent },
  { path: 'shop/contact', component: ContactComponent },
  { path: 'shop', component: ShopComponent },

  // Customer routes
  {
    path: 'customer/profile',
    component: CustomerProfileComponent,
    canActivate: [AuthGuard], // Tạm thời bỏ roleGuard để test, có thể thêm lại sau
    // data: { roles: ['CUSTOMER'] } // Tạm thời comment để test
  },
  {
    path: 'customer/orders',
    component: CustomerOrdersComponent,
    canActivate: [AuthGuard, roleGuard],
    data: { roles: ['CUSTOMER'] }
  },
  {
    path: 'customer/orders/:id',
    component: InvoiceDetailComponent,
    canActivate: [AuthGuard, roleGuard],
    data: { roles: ['CUSTOMER'] }
  },


  {
    path: '',
    redirectTo: '/shop',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard, roleGuard],
    data: { roles: ['ADMIN', 'STAFF'] },
  },
  {
    path: 'chat-management',
    component: ChatManagementComponent,
    canActivate: [AuthGuard, roleGuard],
    data: { roles: ['ADMIN', 'STAFF'] },
  },
  {
    path: 'invoices',
    component: InvoiceManagementComponent,
    // canActivate: [AuthGuard], // Tạm thời bỏ để test
  },
  // Đặt các route cụ thể trước route động để tránh conflict
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
  // Route động phải đặt sau các route cụ thể
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
    path: 'products/helmets/new',
    component: HelmetFormComponent,
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
