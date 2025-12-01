import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HoaDonService } from '../../services/hoa-don.service';

@Component({
  selector: 'app-refund-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './refund-form.component.html',
  styleUrls: ['./refund-form.component.scss']
})
export class RefundFormComponent implements OnInit {
  invoiceCode: string = '';
  bankAccount: string = '';
  bankName: string = '';
  accountHolder: string = '';
  isSubmitting: boolean = false;
  submitted: boolean = false;
  error: string = '';
  successMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private hoaDonService: HoaDonService
  ) {}

  ngOnInit(): void {
    // Lấy mã hóa đơn từ query params
    this.route.queryParams.subscribe(params => {
      if (params['invoice']) {
        this.invoiceCode = params['invoice'];
      }
    });
  }

  submitRefundInfo(): void {
    // Validation
    if (!this.invoiceCode || this.invoiceCode.trim() === '') {
      this.error = 'Vui lòng nhập mã hóa đơn';
      return;
    }

    if (!this.bankAccount || this.bankAccount.trim() === '') {
      this.error = 'Vui lòng nhập số tài khoản ngân hàng';
      return;
    }

    if (!this.bankName || this.bankName.trim() === '') {
      this.error = 'Vui lòng nhập tên ngân hàng';
      return;
    }

    if (!this.accountHolder || this.accountHolder.trim() === '') {
      this.error = 'Vui lòng nhập tên chủ tài khoản';
      return;
    }

    this.isSubmitting = true;
    this.error = '';

    const refundData = {
      maHoaDon: this.invoiceCode.trim(),
      bankAccount: this.bankAccount.trim(),
      bankName: this.bankName.trim(),
      accountHolder: this.accountHolder.trim()
    };

    this.hoaDonService.submitRefundInfo(refundData).subscribe({
      next: (response) => {
        console.log('✅ Refund info submitted successfully:', response);
        this.isSubmitting = false;
        this.submitted = true;
        this.successMessage = response.message || 'Đã nhận được thông tin tài khoản. Tiền sẽ được hoàn trả trong vòng 3-5 ngày làm việc.';
      },
      error: (error) => {
        console.error('❌ Error submitting refund info:', error);
        this.isSubmitting = false;
        this.error = error.error?.message || error.message || 'Có lỗi xảy ra khi gửi thông tin. Vui lòng thử lại.';
      }
    });
  }

  goToShop(): void {
    this.router.navigate(['/shop']);
  }
}

