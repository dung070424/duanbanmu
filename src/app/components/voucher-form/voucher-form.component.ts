import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface Customer {
  id: string;
  code: string;
  name: string;
  phoneNumber: string;
  loyaltyPoints: number;
  status: string;
}

@Component({
  selector: 'app-voucher-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './voucher-form.component.html',
  styleUrls: ['./voucher-form.component.scss'],
})
export class VoucherFormComponent {
  voucherCode = 'PGG_0ITmsBUY';
  voucherName = '';
  voucherType = '';
  minOrder = 0;
  quantity = 0;
  startDate = '';
  endDate = '';
  description = '';
  
  searchTerm = '';
  selectedCustomers: Customer[] = [];
  
  customers: Customer[] = [
    {
      id: '1',
      code: 'KH00001',
      name: 'Nguyễn Văn A',
      phoneNumber: '0123456789',
      loyaltyPoints: 150,
      status: 'Hoạt động'
    },
    {
      id: '2',
      code: 'KH00002',
      name: 'Đình Thế Mạnh',
      phoneNumber: '0987654321',
      loyaltyPoints: 200,
      status: 'Hoạt động'
    },
    {
      id: '3',
      code: 'KH00003',
      name: 'Trịnh Châu Anh',
      phoneNumber: '0369258147',
      loyaltyPoints: 75,
      status: 'Hoạt động'
    },
    {
      id: '4',
      code: 'KH00004',
      name: 'Nguyễn Hoàng',
      phoneNumber: '0912345678',
      loyaltyPoints: 300,
      status: 'Hoạt động'
    },
    {
      id: '5',
      code: 'KH00005',
      name: 'Nguyễn Minh',
      phoneNumber: '0923456789',
      loyaltyPoints: 50,
      status: 'Tạm khóa'
    }
  ];

  filteredCustomers: Customer[] = this.customers;

  constructor(private router: Router) {}

  ngOnInit() {
    this.filterCustomers();
  }

  goBack() {
    this.router.navigate(['/vouchers']);
  }

  navigateToHome() {
    this.router.navigate(['/dashboard']);
  }

  navigateToVouchers() {
    this.router.navigate(['/vouchers']);
  }

  onSearch() {
    this.filterCustomers();
  }

  filterCustomers() {
    if (!this.searchTerm.trim()) {
      this.filteredCustomers = this.customers;
    } else {
      this.filteredCustomers = this.customers.filter(customer =>
        customer.code.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        customer.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        customer.phoneNumber.includes(this.searchTerm)
      );
    }
  }

  selectCustomer(customer: Customer) {
    if (!this.selectedCustomers.find(c => c.id === customer.id)) {
      this.selectedCustomers.push(customer);
    }
  }

  removeCustomer(customerId: string) {
    this.selectedCustomers = this.selectedCustomers.filter(c => c.id !== customerId);
  }

  saveVoucher() {
    // Logic to save voucher
    console.log('Saving voucher:', {
      code: this.voucherCode,
      name: this.voucherName,
      type: this.voucherType,
      minOrder: this.minOrder,
      quantity: this.quantity,
      startDate: this.startDate,
      endDate: this.endDate,
      description: this.description,
      customers: this.selectedCustomers
    });
    
    // Navigate back to voucher list
    this.router.navigate(['/vouchers']);
  }
}
