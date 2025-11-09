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
    diemTichLuy: 0,
    soLanMua: 0,
    lanMuaGanNhat: '',
    maKhachHang: '',
    username: ''
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

    // QUAN TRỌNG: Sử dụng endpoint /me để lấy thông tin từ JWT token
    // Backend sẽ tự động lấy username từ JWT → tìm user → tìm khach_hang
    this.loadCurrentCustomerInfo();
  }

  /**
   * Load thông tin khách hàng hiện tại từ JWT token
   * Backend sẽ tự động lấy username từ JWT token và tìm khach_hang tương ứng
   */
  loadCurrentCustomerInfo(): void {
    this.isLoading = true;
    this.error = '';
    
    console.log('📡 Loading current customer info from JWT token...');
    this.customerService.getCurrentCustomer().subscribe({
      next: (customer) => {
        console.log('✅ Customer info loaded from JWT token:', customer);
        this.customer = customer;
        this.customerId = customer.id || null;
        console.log('👤 Customer ID set to:', this.customerId);
        
        // Map dữ liệu vào form - đảm bảo mapping đầy đủ từ API response
        // Format ngaySinh từ ISO string sang format YYYY-MM-DD cho input date
        let ngaySinhFormatted = '';
        if (customer.ngaySinh) {
          try {
            const date = new Date(customer.ngaySinh);
            if (!isNaN(date.getTime())) {
              ngaySinhFormatted = date.toISOString().split('T')[0];
            }
          } catch (e) {
            console.warn('⚠️ Cannot parse ngaySinh:', customer.ngaySinh);
          }
        }
        
        // Format lanMuaGanNhat từ ISO string
        let lanMuaGanNhatFormatted = '';
        if (customer.lanMuaGanNhat) {
          try {
            const date = new Date(customer.lanMuaGanNhat);
            if (!isNaN(date.getTime())) {
              lanMuaGanNhatFormatted = date.toISOString().split('T')[0];
            }
          } catch (e) {
            console.warn('⚠️ Cannot parse lanMuaGanNhat:', customer.lanMuaGanNhat);
          }
        }
        
        this.formData = {
          tenKhachHang: customer.tenKhachHang || '',
          email: customer.email || '',
          soDienThoai: customer.soDienThoai || '',
          ngaySinh: ngaySinhFormatted,
          gioiTinh: customer.gioiTinh !== undefined && customer.gioiTinh !== null ? customer.gioiTinh : true,
          diemTichLuy: customer.diemTichLuy || 0,
          soLanMua: customer.soLanMua || 0,
          lanMuaGanNhat: lanMuaGanNhatFormatted,
          maKhachHang: customer.maKhachHang || '',
          username: customer.username || ''
        };
        
        // Log để debug
        console.log('📋 Mapped form data:', this.formData);
        console.log('📋 Customer object from API:', customer);
        
        this.isLoading = false;
        // Load addresses sau khi đã có customerId
        if (this.customerId) {
          this.loadAddresses();
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error loading customer info from JWT token:', error);
        console.error('   - Error status:', error.status);
        console.error('   - Error message:', error.error?.message || error.message);
        console.error('   - Error body:', error.error);
        
        if (error.status === 401) {
          this.error = 'Bạn cần đăng nhập để xem thông tin cá nhân.';
          // Redirect to login
          setTimeout(() => {
            this.router.navigate(['/shop/login'], { queryParams: { returnUrl: '/customer/profile' } });
          }, 2000);
        } else if (error.status === 404) {
          this.error = 'Không tìm thấy thông tin khách hàng. Vui lòng liên hệ quản trị viên.';
        } else if (error.status === 400) {
          const errorMessage = error.error?.message || error.message || 'Lỗi khi tải thông tin khách hàng';
          this.error = `Lỗi: ${errorMessage}. Vui lòng thử lại hoặc liên hệ quản trị viên.`;
        } else {
          const errorMessage = error.error?.message || error.message || 'Không thể tải thông tin khách hàng';
          this.error = `${errorMessage}. Vui lòng thử lại!`;
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
        
        // Map dữ liệu vào form - đảm bảo mapping đầy đủ
        let ngaySinhFormatted = '';
        if (customer.ngaySinh) {
          try {
            const date = new Date(customer.ngaySinh);
            if (!isNaN(date.getTime())) {
              ngaySinhFormatted = date.toISOString().split('T')[0];
            }
          } catch (e) {
            console.warn('⚠️ Cannot parse ngaySinh:', customer.ngaySinh);
          }
        }
        
        let lanMuaGanNhatFormatted = '';
        if (customer.lanMuaGanNhat) {
          try {
            const date = new Date(customer.lanMuaGanNhat);
            if (!isNaN(date.getTime())) {
              lanMuaGanNhatFormatted = date.toISOString().split('T')[0];
            }
          } catch (e) {
            console.warn('⚠️ Cannot parse lanMuaGanNhat:', customer.lanMuaGanNhat);
          }
        }
        
        this.formData = {
          tenKhachHang: customer.tenKhachHang || '',
          email: customer.email || '',
          soDienThoai: customer.soDienThoai || '',
          ngaySinh: ngaySinhFormatted,
          gioiTinh: customer.gioiTinh !== undefined && customer.gioiTinh !== null ? customer.gioiTinh : true,
          diemTichLuy: customer.diemTichLuy || 0,
          soLanMua: customer.soLanMua || 0,
          lanMuaGanNhat: lanMuaGanNhatFormatted,
          maKhachHang: customer.maKhachHang || '',
          username: customer.username || ''
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
      let ngaySinhFormatted = '';
      if (this.customer.ngaySinh) {
        try {
          const date = new Date(this.customer.ngaySinh);
          if (!isNaN(date.getTime())) {
            ngaySinhFormatted = date.toISOString().split('T')[0];
          }
        } catch (e) {
          console.warn('⚠️ Cannot parse ngaySinh:', this.customer.ngaySinh);
        }
      }
      
      let lanMuaGanNhatFormatted = '';
      if (this.customer.lanMuaGanNhat) {
        try {
          const date = new Date(this.customer.lanMuaGanNhat);
          if (!isNaN(date.getTime())) {
            lanMuaGanNhatFormatted = date.toISOString().split('T')[0];
          }
        } catch (e) {
          console.warn('⚠️ Cannot parse lanMuaGanNhat:', this.customer.lanMuaGanNhat);
        }
      }
      
      this.formData = {
        tenKhachHang: this.customer.tenKhachHang || '',
        email: this.customer.email || '',
        soDienThoai: this.customer.soDienThoai || '',
        ngaySinh: ngaySinhFormatted,
        gioiTinh: this.customer.gioiTinh !== undefined && this.customer.gioiTinh !== null ? this.customer.gioiTinh : true,
        diemTichLuy: this.customer.diemTichLuy || 0,
        soLanMua: this.customer.soLanMua || 0,
        lanMuaGanNhat: lanMuaGanNhatFormatted,
        maKhachHang: this.customer.maKhachHang || '',
        username: this.customer.username || ''
      };
    }
    
    this.cdr.detectChanges();
  }

  /**
   * Kiểm tra có trường nào chưa được điền không
   */
  hasMissingFields(): boolean {
    return !this.formData.soDienThoai || 
           !this.formData.ngaySinh || 
           this.formData.gioiTinh === undefined || 
           this.formData.gioiTinh === null;
  }

  /**
   * Đếm số trường chưa được điền
   */
  getMissingFieldsCount(): number {
    let count = 0;
    if (!this.formData.soDienThoai) count++;
    if (!this.formData.ngaySinh) count++;
    if (this.formData.gioiTinh === undefined || this.formData.gioiTinh === null) count++;
    return count;
  }

  /**
   * Lấy ngày tối đa cho date picker (ngày hiện tại)
   */
  getMaxDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }


  /**
   * Lưu thông tin khách hàng
   */
  saveCustomerInfo(): void {
    if (!this.customerId || !this.customer) return;

    // Validate form
    if (!this.formData.tenKhachHang || this.formData.tenKhachHang.trim() === '') {
      this.error = 'Vui lòng nhập họ và tên!';
      this.cdr.detectChanges();
      return;
    }

    if (!this.formData.email || this.formData.email.trim() === '') {
      this.error = 'Vui lòng nhập email!';
      this.cdr.detectChanges();
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.formData.email)) {
      this.error = 'Email không hợp lệ!';
      this.cdr.detectChanges();
      return;
    }

    if (!this.formData.soDienThoai || this.formData.soDienThoai.trim() === '') {
      this.error = 'Vui lòng nhập số điện thoại!';
      this.cdr.detectChanges();
      return;
    }

    // Validate phone format (10-11 số)
    const phoneRegex = /^[0-9]{10,11}$/;
    const phoneNumber = this.formData.soDienThoai.replace(/\s+/g, '').replace(/[-\/]/g, '');
    if (!phoneRegex.test(phoneNumber)) {
      this.error = 'Số điện thoại không hợp lệ! Vui lòng nhập 10-11 chữ số.';
      this.cdr.detectChanges();
      return;
    }

    // Validate ngày sinh nếu có
    if (this.formData.ngaySinh) {
      const birthDate = new Date(this.formData.ngaySinh);
      const today = new Date();
      if (birthDate > today) {
        this.error = 'Ngày sinh không thể lớn hơn ngày hiện tại!';
        this.cdr.detectChanges();
        return;
      }
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 0 || age > 150) {
        this.error = 'Ngày sinh không hợp lệ!';
        this.cdr.detectChanges();
        return;
      }
    }

    this.isSaving = true;
    this.error = '';
    this.successMessage = '';

    // Map to backend format
    const updateData: any = {
      tenKhachHang: this.formData.tenKhachHang.trim(),
      email: this.formData.email.trim(),
      soDienThoai: phoneNumber // Đã được chuẩn hóa
    };

    // Add optional fields - luôn gửi nếu có giá trị
    if (this.formData.ngaySinh && this.formData.ngaySinh.trim() !== '') {
      updateData.ngaySinh = this.formData.ngaySinh;
    }
    
    // Gửi giới tính nếu đã chọn
    if (this.formData.gioiTinh !== undefined && this.formData.gioiTinh !== null) {
      updateData.gioiTinh = this.formData.gioiTinh;
    }

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
          if (updatedCustomer.email) {
            currentUser.email = updatedCustomer.email;
          }
        }
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          this.successMessage = '';
          this.cdr.detectChanges();
        }, 5000);
        
        this.cdr.detectChanges();
        
        // Reload customer info to get latest data
        this.loadCurrentCustomerInfo();
      },
      error: (error) => {
        console.error('❌ Error updating customer info:', error);
        this.error = error.error?.message || error.message || 'Không thể cập nhật thông tin. Vui lòng thử lại!';
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
    this.editingAddressId = address.id ?? null;
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
   * Format date từ ISO string sang dd/MM/yyyy
   */
  formatDate(date: string | undefined): string {
    if (!date) return '';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return date;
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return date;
    }
  }
}

