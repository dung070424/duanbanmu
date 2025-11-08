import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CustomerService } from '../../services/customer.service';
import { CustomerAddressService } from '../../services/customer-address.service';
import { AuthService } from '../../services/auth';
import { Customer } from '../../interfaces/customer.interface';
import { CustomerAddress, CustomerAddressCreateRequest } from '../../interfaces/customer-address.interface';

@Component({
  selector: 'app-customer-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './customer-profile.component.html',
  styleUrls: ['./customer-profile.component.scss']
})
export class CustomerProfileComponent implements OnInit {
  customer: Customer | null = null;
  customerId: number | null = null;
  isLoading = false;
  isEditing = false;
  isSaving = false;
  error = '';
  successMessage = '';

  // Form data
  formData = {
    tenKhachHang: '',
    email: '',
    soDienThoai: '',
    ngaySinh: '',
    gioiTinh: true,
    diemTichLuy: 0
  };

  // Address management
  addresses: CustomerAddress[] = [];
  showAddAddressForm = false;
  editingAddressId: number | null = null;
  newAddress: CustomerAddressCreateRequest = {
    khachHangId: 0,
    tenNguoiNhan: '',
    soDienThoai: '',
    diaChi: '',
    tinhThanh: '',
    quanHuyen: '',
    phuongXa: '',
    macDinh: false
  };

  constructor(
    private customerService: CustomerService,
    private customerAddressService: CustomerAddressService,
    private authService: AuthService,
    private router: Router,
    private location: Location,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('👤 CustomerProfileComponent ngOnInit - Starting...');
    const currentUser = this.authService.getCurrentUser();
    console.log('👤 Current user:', currentUser);
    console.log('👤 Is logged in:', this.authService.isLoggedIn());
    console.log('👤 User roles:', currentUser?.roles);
    
    if (!currentUser || !currentUser.id) {
      console.warn('⚠️ No current user found, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    // QUAN TRỌNG: Cho phép truy cập ngay cả khi không có role CUSTOMER (để test)
    // Backend sẽ tự động tạo KhachHang record nếu chưa có
    if (!this.authService.hasRole('CUSTOMER')) {
      console.warn('⚠️ User does not have CUSTOMER role, but allowing access for testing');
      // Không redirect, cho phép truy cập để test
    }

    // QUAN TRỌNG: Sử dụng User ID để tìm KhachHang, không phải dùng User ID như KhachHang ID
    const userId = currentUser.id;
    console.log('👤 User ID:', userId);
    this.loadCustomerInfoByUserId(userId);
    // Note: customerId sẽ được set sau khi load thành công
  }

  /**
   * Load thông tin khách hàng theo User ID
   */
  loadCustomerInfoByUserId(userId: number): void {
    this.isLoading = true;
    this.error = '';
    
    console.log('📡 Loading customer by User ID:', userId);
    this.customerService.getCustomerByUserId(userId).subscribe({
      next: (customer) => {
        console.log('✅ Customer info loaded by User ID:', customer);
        this.customer = customer;
        this.customerId = customer.id || null;
        console.log('👤 Customer ID set to:', this.customerId);
        
        // Map dữ liệu vào form
        this.formData = {
          tenKhachHang: customer.tenKhachHang || '',
          email: customer.email || '',
          soDienThoai: customer.soDienThoai || '',
          ngaySinh: (customer as any).ngaySinh || '',
          gioiTinh: (customer as any).gioiTinh !== undefined ? (customer as any).gioiTinh : true,
          diemTichLuy: (customer as any).diemTichLuy || 0
        };
        
        this.isLoading = false;
        // Load addresses sau khi đã có customerId
        if (this.customerId) {
          this.loadAddresses();
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error loading customer info by User ID:', error);
        if (error.status === 404) {
          this.error = 'Không tìm thấy thông tin khách hàng. Vui lòng liên hệ quản trị viên.';
        } else {
          this.error = 'Không thể tải thông tin khách hàng. Vui lòng thử lại!';
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Load thông tin khách hàng theo KhachHang ID (fallback)
   */
  loadCustomerInfo(): void {
    if (!this.customerId) return;

    this.isLoading = true;
    this.error = '';
    
    this.customerService.getCustomerById(this.customerId).subscribe({
      next: (customer) => {
        console.log('✅ Customer info loaded:', customer);
        this.customer = customer;
        
        // Map dữ liệu vào form
        this.formData = {
          tenKhachHang: customer.tenKhachHang || '',
          email: customer.email || '',
          soDienThoai: customer.soDienThoai || '',
          ngaySinh: (customer as any).ngaySinh || '',
          gioiTinh: (customer as any).gioiTinh !== undefined ? (customer as any).gioiTinh : true,
          diemTichLuy: (customer as any).diemTichLuy || 0
        };
        
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error loading customer info:', error);
        this.error = 'Không thể tải thông tin khách hàng. Vui lòng thử lại!';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Load danh sách địa chỉ
   */
  loadAddresses(): void {
    if (!this.customerId) return;

    this.customerAddressService.getAddressesByCustomerId(this.customerId).subscribe({
      next: (addresses) => {
        console.log('✅ Addresses loaded:', addresses);
        this.addresses = addresses;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error loading addresses:', error);
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Bật/tắt chế độ chỉnh sửa
   */
  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    this.error = '';
    this.successMessage = '';
    
    // Nếu đang tắt edit, reset form về giá trị ban đầu
    if (!this.isEditing && this.customer) {
      this.formData = {
        tenKhachHang: this.customer.tenKhachHang || '',
        email: this.customer.email || '',
        soDienThoai: this.customer.soDienThoai || '',
        ngaySinh: (this.customer as any).ngaySinh || '',
        gioiTinh: (this.customer as any).gioiTinh !== undefined ? (this.customer as any).gioiTinh : true,
        diemTichLuy: (this.customer as any).diemTichLuy || 0
      };
    }
    
    this.cdr.detectChanges();
  }

  /**
   * Lưu thông tin khách hàng
   */
  saveCustomerInfo(): void {
    if (!this.customerId || !this.customer) return;

    // Validate form
    if (!this.formData.tenKhachHang || this.formData.tenKhachHang.trim() === '') {
      this.error = 'Vui lòng nhập họ và tên!';
      return;
    }

    if (!this.formData.email || this.formData.email.trim() === '') {
      this.error = 'Vui lòng nhập email!';
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.formData.email)) {
      this.error = 'Email không hợp lệ!';
      return;
    }

    if (!this.formData.soDienThoai || this.formData.soDienThoai.trim() === '') {
      this.error = 'Vui lòng nhập số điện thoại!';
      return;
    }

    // Validate phone format (10-11 số)
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(this.formData.soDienThoai.replace(/\s+/g, ''))) {
      this.error = 'Số điện thoại không hợp lệ! Vui lòng nhập 10-11 chữ số.';
      return;
    }

    this.isSaving = true;
    this.error = '';
    this.successMessage = '';

    // Map to backend format
    const updateData: any = {
      tenKhachHang: this.formData.tenKhachHang.trim(),
      email: this.formData.email.trim(),
      soDienThoai: this.formData.soDienThoai.trim()
    };

    // Add optional fields if they exist
    if (this.formData.ngaySinh && this.formData.ngaySinh.trim() !== '') {
      updateData.ngaySinh = this.formData.ngaySinh;
    }
    
    if (this.formData.gioiTinh !== undefined) {
      updateData.gioiTinh = this.formData.gioiTinh;
    }
    
    // Note: diemTichLuy không nên cho phép update từ frontend (chỉ hệ thống mới được cập nhật)
    // Nếu cần, có thể giữ lại nhưng không khuyến khích

    console.log('💾 Saving customer info:', updateData);

    this.customerService.updateCustomer(this.customerId, updateData).subscribe({
      next: (updatedCustomer) => {
        console.log('✅ Customer info updated:', updatedCustomer);
        this.customer = updatedCustomer;
        this.isEditing = false;
        this.isSaving = false;
        this.successMessage = 'Cập nhật thông tin thành công!';
        
        // Update current user in auth service if needed
        const currentUser = this.authService.getCurrentUser();
        if (currentUser) {
          currentUser.fullName = updatedCustomer.tenKhachHang;
          currentUser.email = updatedCustomer.email;
        }
        
        this.cdr.detectChanges();
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage = '';
          this.cdr.detectChanges();
        }, 3000);
      },
      error: (error) => {
        console.error('❌ Error updating customer info:', error);
        this.error = error.error?.message || 'Không thể cập nhật thông tin. Vui lòng thử lại!';
        this.isSaving = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Hủy chỉnh sửa
   */
  cancelEdit(): void {
    this.toggleEdit();
  }

  /**
   * Hiển thị form thêm địa chỉ
   */
  showAddAddress(): void {
    this.newAddress = {
      khachHangId: this.customerId || 0,
      tenNguoiNhan: this.customer?.tenKhachHang || '',
      soDienThoai: this.customer?.soDienThoai || '',
      diaChi: '',
      tinhThanh: '',
      quanHuyen: '',
      phuongXa: '',
      macDinh: this.addresses.length === 0 // Mặc định nếu chưa có địa chỉ nào
    };
    this.showAddAddressForm = true;
    this.editingAddressId = null;
    this.error = '';
    this.cdr.detectChanges();
  }

  /**
   * Hủy form thêm/sửa địa chỉ
   */
  cancelAddressForm(): void {
    this.showAddAddressForm = false;
    this.editingAddressId = null;
    this.newAddress = {
      khachHangId: this.customerId || 0,
      tenNguoiNhan: '',
      soDienThoai: '',
      diaChi: '',
      tinhThanh: '',
      quanHuyen: '',
      phuongXa: '',
      macDinh: false
    };
    this.error = '';
    this.cdr.detectChanges();
  }

  /**
   * Lưu địa chỉ mới hoặc cập nhật địa chỉ
   */
  saveAddress(): void {
    if (!this.customerId) return;

    // Validate
    if (!this.newAddress.tenNguoiNhan || this.newAddress.tenNguoiNhan.trim() === '') {
      this.error = 'Vui lòng nhập tên người nhận!';
      return;
    }

    if (!this.newAddress.soDienThoai || this.newAddress.soDienThoai.trim() === '') {
      this.error = 'Vui lòng nhập số điện thoại!';
      return;
    }

    if (!this.newAddress.diaChi || this.newAddress.diaChi.trim() === '') {
      this.error = 'Vui lòng nhập địa chỉ chi tiết!';
      return;
    }

    if (!this.newAddress.tinhThanh || this.newAddress.tinhThanh.trim() === '') {
      this.error = 'Vui lòng nhập tỉnh/thành phố!';
      return;
    }

    this.newAddress.khachHangId = this.customerId;
    this.isSaving = true;
    this.error = '';
    this.successMessage = '';

    if (this.editingAddressId) {
      // Update existing address
      this.customerAddressService.updateAddress(this.editingAddressId, this.newAddress).subscribe({
        next: (updatedAddress) => {
          console.log('✅ Address updated:', updatedAddress);
          this.loadAddresses();
          this.cancelAddressForm();
          this.isSaving = false;
          this.successMessage = 'Cập nhật địa chỉ thành công!';
          this.cdr.detectChanges();
          
          setTimeout(() => {
            this.successMessage = '';
            this.cdr.detectChanges();
          }, 3000);
        },
        error: (error) => {
          console.error('❌ Error updating address:', error);
          this.error = 'Không thể cập nhật địa chỉ. Vui lòng thử lại!';
          this.isSaving = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      // Create new address
      this.customerAddressService.createAddress(this.newAddress).subscribe({
        next: (newAddress) => {
          console.log('✅ Address created:', newAddress);
          this.loadAddresses();
          this.cancelAddressForm();
          this.isSaving = false;
          this.successMessage = 'Thêm địa chỉ thành công!';
          this.cdr.detectChanges();
          
          setTimeout(() => {
            this.successMessage = '';
            this.cdr.detectChanges();
          }, 3000);
        },
        error: (error) => {
          console.error('❌ Error creating address:', error);
          this.error = 'Không thể thêm địa chỉ. Vui lòng thử lại!';
          this.isSaving = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  /**
   * Chỉnh sửa địa chỉ
   */
  editAddress(address: CustomerAddress): void {
    this.editingAddressId = address.id;
    this.newAddress = {
      khachHangId: address.khachHangId || this.customerId || 0,
      tenNguoiNhan: address.tenNguoiNhan || '',
      soDienThoai: address.soDienThoai || '',
      diaChi: address.diaChi || '',
      tinhThanh: address.tinhThanh || '',
      quanHuyen: address.quanHuyen || '',
      phuongXa: address.phuongXa || '',
      macDinh: address.macDinh || false
    };
    this.showAddAddressForm = true;
    this.error = '';
    this.cdr.detectChanges();
  }

  /**
   * Xóa địa chỉ
   */
  deleteAddress(addressId: number): void {
    if (!confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')) {
      return;
    }

    if (!this.customerId) {
      this.error = 'Không tìm thấy ID khách hàng!';
      return;
    }

    this.customerAddressService.deleteAddress(addressId, this.customerId).subscribe({
      next: () => {
        console.log('✅ Address deleted');
        this.loadAddresses();
        this.successMessage = 'Xóa địa chỉ thành công!';
        this.cdr.detectChanges();
        
        setTimeout(() => {
          this.successMessage = '';
          this.cdr.detectChanges();
        }, 3000);
      },
      error: (error) => {
        console.error('❌ Error deleting address:', error);
        this.error = 'Không thể xóa địa chỉ. Vui lòng thử lại!';
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Đặt địa chỉ làm mặc định
   */
  setDefaultAddress(addressId: number): void {
    if (!this.customerId) return;

    this.customerAddressService.setDefaultAddress(this.customerId, addressId).subscribe({
      next: (updatedAddress) => {
        console.log('✅ Default address set:', updatedAddress);
        this.loadAddresses();
        this.successMessage = 'Đặt địa chỉ mặc định thành công!';
        this.cdr.detectChanges();
        
        setTimeout(() => {
          this.successMessage = '';
          this.cdr.detectChanges();
        }, 3000);
      },
      error: (error) => {
        console.error('❌ Error setting default address:', error);
        this.error = 'Không thể đặt địa chỉ mặc định. Vui lòng thử lại!';
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Quay lại
   */
  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/shop']);
    }
  }

  /**
   * Format ngày
   */
  formatDate(date: string | undefined): string {
    if (!date) return '';
    try {
      const d = new Date(date);
      return d.toLocaleDateString('vi-VN');
    } catch {
      return date;
    }
  }
}

