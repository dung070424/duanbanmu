import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { HoaDonService } from './hoa-don.service';
import { HoaDonDTO } from '../interfaces/hoa-don.interface';
import { MasterDataService } from './master-data.service';

export interface Promotion {
  id: string;
  code: string;
  name: string;
  discountType: string;
  discountValue: string;
  startDate: string;
  endDate: string;
  condition: string;
  status: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  image: string;
  description: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  totalOrders: number;
  totalSpent: number;
}

export interface Invoice {
  id: string;
  customerId: string;
  customerName: string;
  total: number;
  status: string;
  date: string;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private promotionsSubject = new BehaviorSubject<Promotion[]>(this.getInitialPromotions());
  private productsSubject = new BehaviorSubject<Product[]>(this.getInitialProducts());
  private customersSubject = new BehaviorSubject<Customer[]>(this.getInitialCustomers());
  private invoicesSubject = new BehaviorSubject<Invoice[]>(this.getInitialInvoices());

  public promotions$ = this.promotionsSubject.asObservable();
  public products$ = this.productsSubject.asObservable();
  public customers$ = this.customersSubject.asObservable();
  public invoices$ = this.invoicesSubject.asObservable();

  constructor(
    private hoaDonService: HoaDonService,
    private masterDataService: MasterDataService
  ) {}

  // Promotions
  getPromotions(): Observable<Promotion[]> {
    return this.promotions$;
  }

  addPromotion(promotion: Promotion): void {
    const current = this.promotionsSubject.value;
    this.promotionsSubject.next([...current, promotion]);
  }

  updatePromotion(id: string, promotion: Promotion): void {
    const current = this.promotionsSubject.value;
    const index = current.findIndex((p) => p.id === id);
    if (index !== -1) {
      current[index] = promotion;
      this.promotionsSubject.next([...current]);
    }
  }

  deletePromotion(id: string): void {
    const current = this.promotionsSubject.value;
    this.promotionsSubject.next(current.filter((p) => p.id !== id));
  }

  // Products
  getProducts(): Observable<Product[]> {
    return this.products$;
  }

  addProduct(product: Product): void {
    const current = this.productsSubject.value;
    this.productsSubject.next([...current, product]);
  }

  updateProduct(id: string, product: Product): void {
    const current = this.productsSubject.value;
    const index = current.findIndex((p) => p.id === id);
    if (index !== -1) {
      current[index] = product;
      this.productsSubject.next([...current]);
    }
  }

  deleteProduct(id: string): void {
    const current = this.productsSubject.value;
    this.productsSubject.next(current.filter((p) => p.id !== id));
  }

  // Customers
  getCustomers(): Observable<Customer[]> {
    return this.customers$;
  }

  addCustomer(customer: Customer): void {
    const current = this.customersSubject.value;
    this.customersSubject.next([...current, customer]);
  }

  updateCustomer(id: string, customer: Customer): void {
    const current = this.customersSubject.value;
    const index = current.findIndex((c) => c.id === id);
    if (index !== -1) {
      current[index] = customer;
      this.customersSubject.next([...current]);
    }
  }

  deleteCustomer(id: string): void {
    const current = this.customersSubject.value;
    this.customersSubject.next(current.filter((c) => c.id !== id));
  }

  // Invoices - Kết nối với API thực tế
  getInvoices(): Observable<Invoice[]> {
    return this.invoices$;
  }

  // Lấy hóa đơn từ API
  getInvoicesFromAPI(): Observable<HoaDonDTO[]> {
    return this.hoaDonService.getAllHoaDon();
  }

  addInvoice(invoice: Invoice): void {
    const current = this.invoicesSubject.value;
    this.invoicesSubject.next([...current, invoice]);
  }

  // Thêm hóa đơn mới qua API
  addInvoiceToAPI(hoaDonDTO: HoaDonDTO): Observable<HoaDonDTO> {
    return this.hoaDonService.createHoaDon(hoaDonDTO);
  }

  updateInvoice(id: string, invoice: Invoice): void {
    const current = this.invoicesSubject.value;
    const index = current.findIndex((i) => i.id === id);
    if (index !== -1) {
      current[index] = invoice;
      this.invoicesSubject.next([...current]);
    }
  }

  // Cập nhật hóa đơn qua API
  updateInvoiceInAPI(id: number, hoaDonDTO: HoaDonDTO): Observable<HoaDonDTO> {
    return this.hoaDonService.updateHoaDonNew(id, hoaDonDTO);
  }

  deleteInvoice(id: string): void {
    const current = this.invoicesSubject.value;
    this.invoicesSubject.next(current.filter((i) => i.id !== id));
  }

  // Xóa hóa đơn qua API
  deleteInvoiceFromAPI(id: number): Observable<void> {
    return this.hoaDonService.deleteHoaDon(id);
  }

  // Test kết nối API
  testAPIConnection(): Observable<string> {
    return this.hoaDonService.testApi();
  }

  // Tạo dữ liệu mẫu
  createSampleData(): Observable<string> {
    return this.hoaDonService.createSampleData();
  }

  private getInitialPromotions(): Promotion[] {
    return [
      {
        id: '1',
        code: 'KM001',
        name: 'Giảm giá mùa hè',
        discountType: 'Phần trăm',
        discountValue: '15%',
        startDate: '2024-06-01',
        endDate: '2024-08-31',
        condition: 'Đơn hàng từ 500.000₫',
        status: 'Đang hoạt động',
      },
      {
        id: '2',
        code: 'KM002',
        name: 'Khuyến mãi sinh viên',
        discountType: 'Số tiền cố định',
        discountValue: '100.000 ₫',
        startDate: '2024-09-01',
        endDate: '2024-12-31',
        condition: 'Có thẻ sinh viên',
        status: 'Sắp diễn ra',
      },
      {
        id: '3',
        code: 'KM003',
        name: 'Black Friday 2024',
        discountType: 'Phần trăm',
        discountValue: '30%',
        startDate: '2024-11-29',
        endDate: '2024-11-29',
        condition: 'Không giới hạn',
        status: 'Chưa bắt đầu',
      },
      {
        id: '4',
        code: 'KM004',
        name: 'Mua 2 tặng 1',
        discountType: 'Sản phẩm tặng',
        discountValue: '1 sản phẩm',
        startDate: '2024-03-01',
        endDate: '2024-03-31',
        condition: 'Mua ít nhất 2 sản phẩm',
        status: 'Đã kết thúc',
      },
      {
        id: '5',
        code: 'KM005',
        name: 'Khách hàng VIP',
        discountType: 'Phần trăm',
        discountValue: '20%',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        condition: 'Khách hàng VIP',
        status: 'Đang hoạt động',
      },
    ];
  }

  private getInitialProducts(): Product[] {
    return [
      {
        id: '1',
        name: 'Mũ bảo hiểm AGV K1',
        category: 'Mũ thể thao',
        price: 2500000,
        stock: 15,
        image: '/assets/images/agv-k1.jpg',
        description: 'Mũ bảo hiểm thể thao cao cấp',
      },
      {
        id: '2',
        name: 'Mũ bảo hiểm Shoei X-14',
        category: 'Mũ thể thao',
        price: 3200000,
        stock: 8,
        image: '/assets/images/shoei-x14.jpg',
        description: 'Mũ bảo hiểm racing chuyên nghiệp',
      },
      {
        id: '3',
        name: 'Mũ bảo hiểm Arai RX-7V',
        category: 'Mũ touring',
        price: 2800000,
        stock: 12,
        image: '/assets/images/arai-rx7v.jpg',
        description: 'Mũ bảo hiểm touring tiện nghi',
      },
    ];
  }

  private getInitialCustomers(): Customer[] {
    return [
      {
        id: '1',
        name: 'Nguyễn Văn A',
        email: 'nguyenvana@email.com',
        phone: '0123456789',
        address: 'Hà Nội',
        totalOrders: 5,
        totalSpent: 12500000,
      },
      {
        id: '2',
        name: 'Trần Thị B',
        email: 'tranthib@email.com',
        phone: '0987654321',
        address: 'TP.HCM',
        totalOrders: 3,
        totalSpent: 8500000,
      },
    ];
  }

  private getInitialInvoices(): Invoice[] {
    return [
      {
        id: '1',
        customerId: '1',
        customerName: 'Nguyễn Văn A',
        total: 2500000,
        status: 'Hoàn thành',
        date: '2024-01-15',
        items: [
          {
            productId: '1',
            productName: 'Mũ bảo hiểm AGV K1',
            quantity: 1,
            price: 2500000,
            total: 2500000,
          },
        ],
      },
    ];
  }
}
