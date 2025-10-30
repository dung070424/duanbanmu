import { Injectable } from '@angular/core';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FieldValidation {
  field: string;
  isValid: boolean;
  errorMessage: string;
}

@Injectable({
  providedIn: 'root'
})
export class InvoiceValidationService {

  constructor() { }

  /**
   * Validate customer name
   */
  validateCustomerName(name: string): FieldValidation {
    // Rule 1: not empty
    if (!name || name.trim().length === 0) {
      return {
        field: 'tenKhachHang',
        isValid: false,
        errorMessage: 'Tên khách hàng không được để trống'
      };
    }

    // Rule 2: no special characters (letters and spaces only, including Vietnamese)
    const vietnameseLettersAndSpaces = /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƯưăâêô\s]+$/;
    if (!vietnameseLettersAndSpaces.test(name.trim())) {
      return {
        field: 'tenKhachHang',
        isValid: false,
        errorMessage: 'Tên khách hàng không được chứa ký tự đặc biệt'
      };
    }

    return {
      field: 'tenKhachHang',
      isValid: true,
      errorMessage: ''
    };
  }

  /**
   * Validate phone number
   */
  validatePhoneNumber(phone: string): FieldValidation {
    if (!phone || phone.trim().length === 0) {
      return {
        field: 'soDienThoaiKhachHang',
        isValid: true, // Phone is optional
        errorMessage: ''
      };
    }

    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length < 10) {
      return {
        field: 'soDienThoaiKhachHang',
        isValid: false,
        errorMessage: 'Số điện thoại phải có ít nhất 10 chữ số'
      };
    }

    if (cleanPhone.length > 11) {
      return {
        field: 'soDienThoaiKhachHang',
        isValid: false,
        errorMessage: 'Số điện thoại không được vượt quá 11 chữ số'
      };
    }

    // Vietnamese phone number patterns
    const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return {
        field: 'soDienThoaiKhachHang',
        isValid: false,
        errorMessage: 'Số điện thoại không đúng định dạng Việt Nam'
      };
    }

    return {
      field: 'soDienThoaiKhachHang',
      isValid: true,
      errorMessage: ''
    };
  }

  /**
   * Validate email
   */
  validateEmail(email: string): FieldValidation {
    if (!email || email.trim().length === 0) {
      return {
        field: 'emailKhachHang',
        isValid: true, // Email is optional
        errorMessage: ''
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return {
        field: 'emailKhachHang',
        isValid: false,
        errorMessage: 'Email không đúng định dạng'
      };
    }

    if (email.trim().length > 100) {
      return {
        field: 'emailKhachHang',
        isValid: false,
        errorMessage: 'Email không được vượt quá 100 ký tự'
      };
    }

    return {
      field: 'emailKhachHang',
      isValid: true,
      errorMessage: ''
    };
  }

  /**
   * Validate invoice code
   */
  validateInvoiceCode(code: string): FieldValidation {
    if (!code || code.trim().length === 0) {
      return {
        field: 'maHoaDon',
        isValid: false,
        errorMessage: 'Mã hóa đơn không được để trống'
      };
    }

    if (code.trim().length < 3) {
      return {
        field: 'maHoaDon',
        isValid: false,
        errorMessage: 'Mã hóa đơn phải có ít nhất 3 ký tự'
      };
    }

    if (code.trim().length > 20) {
      return {
        field: 'maHoaDon',
        isValid: false,
        errorMessage: 'Mã hóa đơn không được vượt quá 20 ký tự'
      };
    }

    // Allow alphanumeric characters, hyphens, and underscores
    const codeRegex = /^[A-Za-z0-9\-_]+$/;
    if (!codeRegex.test(code.trim())) {
      return {
        field: 'maHoaDon',
        isValid: false,
        errorMessage: 'Mã hóa đơn chỉ được chứa chữ cái, số, dấu gạch ngang và gạch dưới'
      };
    }

    return {
      field: 'maHoaDon',
      isValid: true,
      errorMessage: ''
    };
  }

  /**
   * Validate total amount
   */
  validateTotalAmount(amount: number): FieldValidation {
    if (amount === null || amount === undefined) {
      return {
        field: 'tongTien',
        isValid: false,
        errorMessage: 'Tổng tiền không được để trống'
      };
    }

    if (amount < 0) {
      return {
        field: 'tongTien',
        isValid: false,
        errorMessage: 'Tổng tiền không được âm'
      };
    }

    if (amount > 999999999) {
      return {
        field: 'tongTien',
        isValid: false,
        errorMessage: 'Tổng tiền không được vượt quá 999,999,999 VNĐ'
      };
    }

    return {
      field: 'tongTien',
      isValid: true,
      errorMessage: ''
    };
  }

  /**
   * Validate discount amount
   */
  validateDiscountAmount(discount: number, totalAmount: number): FieldValidation {
    if (discount === null || discount === undefined) {
      return {
        field: 'tienGiamGia',
        isValid: true, // Discount is optional
        errorMessage: ''
      };
    }

    if (discount < 0) {
      return {
        field: 'tienGiamGia',
        isValid: false,
        errorMessage: 'Tiền giảm giá không được âm'
      };
    }

    if (discount > totalAmount) {
      return {
        field: 'tienGiamGia',
        isValid: false,
        errorMessage: 'Tiền giảm giá không được lớn hơn tổng tiền'
      };
    }

    return {
      field: 'tienGiamGia',
      isValid: true,
      errorMessage: ''
    };
  }

  /**
   * Validate notes
   */
  validateNotes(notes: string): FieldValidation {
    if (!notes || notes.trim().length === 0) {
      return {
        field: 'ghiChu',
        isValid: true, // Notes are optional
        errorMessage: ''
      };
    }

    if (notes.trim().length > 500) {
      return {
        field: 'ghiChu',
        isValid: false,
        errorMessage: 'Ghi chú không được vượt quá 500 ký tự'
      };
    }

    return {
      field: 'ghiChu',
      isValid: true,
      errorMessage: ''
    };
  }

  /**
   * Validate payment method
   */
  validatePaymentMethod(paymentMethod: string): FieldValidation {
    if (!paymentMethod || paymentMethod.trim().length === 0) {
      return {
        field: 'phuongThucThanhToan',
        isValid: false,
        errorMessage: '❌ Phương thức thanh toán là bắt buộc'
      };
    }

    const validMethods = ['cash', 'transfer', 'card', 'other'];
    if (!validMethods.includes(paymentMethod)) {
      return {
        field: 'phuongThucThanhToan',
        isValid: false,
        errorMessage: '❌ Phương thức thanh toán không hợp lệ'
      };
    }

    return {
      field: 'phuongThucThanhToan',
      isValid: true,
      errorMessage: ''
    };
  }

  /**
   * Validate employee selection
   */
  validateEmployee(employeeId: any): FieldValidation {
    if (!employeeId || employeeId === '' || employeeId === null || employeeId === undefined) {
      return {
        field: 'nhanVienId',
        isValid: false,
        errorMessage: '❌ Vui lòng chọn nhân viên'
      };
    }

    if (isNaN(Number(employeeId)) || Number(employeeId) <= 0) {
      return {
        field: 'nhanVienId',
        isValid: false,
        errorMessage: '❌ Nhân viên không hợp lệ'
      };
    }

    return {
      field: 'nhanVienId',
      isValid: true,
      errorMessage: ''
    };
  }

  /**
   * Validate search term
   */
  validateSearchTerm(searchTerm: string): FieldValidation {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return {
        field: 'searchTerm',
        isValid: true, // Empty search is valid
        errorMessage: ''
      };
    }

    if (searchTerm.trim().length > 100) {
      return {
        field: 'searchTerm',
        isValid: false,
        errorMessage: 'Từ khóa tìm kiếm không được vượt quá 100 ký tự'
      };
    }

    return {
      field: 'searchTerm',
      isValid: true,
      errorMessage: ''
    };
  }

  /**
   * Strict validation for product quantity against stock
   */
  validateProductQuantityStrict(quantity: number, stockQuantity: number): FieldValidation {
    if (quantity === null || quantity === undefined) {
      return {
        field: 'soLuong',
        isValid: false,
        errorMessage: '❌ Số lượng không được để trống'
      };
    }

    if (quantity <= 0) {
      return {
        field: 'soLuong',
        isValid: false,
        errorMessage: '❌ Số lượng phải lớn hơn 0'
      };
    }

    if (!Number.isInteger(quantity)) {
      return {
        field: 'soLuong',
        isValid: false,
        errorMessage: '❌ Số lượng phải là số nguyên'
      };
    }

    // Kiểm tra nghiêm ngặt: số lượng không được vượt quá tồn kho
    if (quantity > stockQuantity) {
      return {
        field: 'soLuong',
        isValid: false,
        errorMessage: `⚠️ Số lượng vượt quá tồn kho! Chỉ còn ${stockQuantity} sản phẩm`
      };
    }

    // Kiểm tra sản phẩm đã hết hàng
    if (stockQuantity <= 0) {
      return {
        field: 'soLuong',
        isValid: false,
        errorMessage: '🚫 Sản phẩm đã hết hàng'
      };
    }

    return {
      field: 'soLuong',
      isValid: true,
      errorMessage: ''
    };
  }

  /**
   * Auto-adjust quantity to maximum available stock
   */
  adjustQuantityToMaxStock(quantity: number, stockQuantity: number): number {
    if (stockQuantity <= 0) {
      return 0;
    }
    
    if (quantity > stockQuantity) {
      return stockQuantity;
    }
    
    return quantity;
  }

  /**
   * Validate product quantity (backward compatibility)
   */
  validateProductQuantity(quantity: number, stockQuantity?: number): FieldValidation {
    if (stockQuantity !== undefined) {
      return this.validateProductQuantityStrict(quantity, stockQuantity);
    }
    
    // Fallback validation without stock check
    if (quantity === null || quantity === undefined) {
      return {
        field: 'soLuong',
        isValid: false,
        errorMessage: 'Số lượng không được để trống'
      };
    }

    if (quantity <= 0) {
      return {
        field: 'soLuong',
        isValid: false,
        errorMessage: 'Số lượng phải lớn hơn 0'
      };
    }

    if (quantity > 9999) {
      return {
        field: 'soLuong',
        isValid: false,
        errorMessage: 'Số lượng không được vượt quá 9999'
      };
    }

    if (!Number.isInteger(quantity)) {
      return {
        field: 'soLuong',
        isValid: false,
        errorMessage: 'Số lượng phải là số nguyên'
      };
    }

    return {
      field: 'soLuong',
      isValid: true,
      errorMessage: ''
    };
  }

  /**
   * Validate product price
   */
  validateProductPrice(price: number): FieldValidation {
    if (price === null || price === undefined) {
      return {
        field: 'donGia',
        isValid: false,
        errorMessage: 'Đơn giá không được để trống'
      };
    }

    if (price < 0) {
      return {
        field: 'donGia',
        isValid: false,
        errorMessage: 'Đơn giá không được âm'
      };
    }

    if (price > 999999999) {
      return {
        field: 'donGia',
        isValid: false,
        errorMessage: 'Đơn giá không được vượt quá 999,999,999 VNĐ'
      };
    }

    return {
      field: 'donGia',
      isValid: true,
      errorMessage: ''
    };
  }

  /**
   * Validate complete invoice form with strict requirements
   */
  validateInvoiceFormStrict(invoice: any): ValidationResult {
    const errors: string[] = [];
    const fieldValidations: FieldValidation[] = [];

    // Validate customer name (REQUIRED)
    const customerNameValidation = this.validateCustomerName(invoice.tenKhachHang);
    fieldValidations.push(customerNameValidation);
    if (!customerNameValidation.isValid) {
      errors.push(customerNameValidation.errorMessage);
    }

    // Validate phone number (REQUIRED for strict validation)
    const phoneValidation = this.validatePhoneNumber(invoice.soDienThoaiKhachHang);
    if (!phoneValidation.isValid) {
      errors.push('Số điện thoại khách hàng là bắt buộc và phải đúng định dạng');
    }

    // Validate email (REQUIRED for strict validation)
    const emailValidation = this.validateEmail(invoice.emailKhachHang);
    if (!emailValidation.isValid) {
      errors.push('Email khách hàng là bắt buộc và phải đúng định dạng');
    }

    // Validate invoice code
    const codeValidation = this.validateInvoiceCode(invoice.maHoaDon);
    fieldValidations.push(codeValidation);
    if (!codeValidation.isValid) {
      errors.push(codeValidation.errorMessage);
    }

    // Validate total amount (REQUIRED and must be > 0)
    const totalValidation = this.validateTotalAmount(invoice.tongTien);
    fieldValidations.push(totalValidation);
    if (!totalValidation.isValid) {
      errors.push(totalValidation.errorMessage);
    }
    if (invoice.tongTien <= 0) {
      errors.push('Tổng tiền phải lớn hơn 0');
    }

    // Validate employee selection (REQUIRED)
    const employeeValidation = this.validateEmployee(invoice.nhanVienId);
    fieldValidations.push(employeeValidation);
    if (!employeeValidation.isValid) {
      errors.push(employeeValidation.errorMessage);
    }

    // Validate discount amount
    const discountValidation = this.validateDiscountAmount(invoice.tienGiamGia, invoice.tongTien);
    fieldValidations.push(discountValidation);
    if (!discountValidation.isValid) {
      errors.push(discountValidation.errorMessage);
    }

    // Validate notes
    const notesValidation = this.validateNotes(invoice.ghiChu);
    fieldValidations.push(notesValidation);
    if (!notesValidation.isValid) {
      errors.push(notesValidation.errorMessage);
    }

    // Validate payment method (REQUIRED)
    const paymentMethodValidation = this.validatePaymentMethod(invoice.phuongThucThanhToan);
    fieldValidations.push(paymentMethodValidation);
    if (!paymentMethodValidation.isValid) {
      errors.push(paymentMethodValidation.errorMessage);
    }

    // Validate products (REQUIRED - must have at least one product)
    if (!invoice.danhSachSanPham || invoice.danhSachSanPham.length === 0) {
      errors.push('Hóa đơn phải có ít nhất một sản phẩm');
    } else {
      invoice.danhSachSanPham.forEach((product: any, index: number) => {
        const quantityValidation = this.validateProductQuantity(product.soLuong);
        if (!quantityValidation.isValid) {
          errors.push(`Sản phẩm ${index + 1}: ${quantityValidation.errorMessage}`);
        }

        const priceValidation = this.validateProductPrice(product.donGia);
        if (!priceValidation.isValid) {
          errors.push(`Sản phẩm ${index + 1}: ${priceValidation.errorMessage}`);
        }

        // Validate product name
        if (!product.tenSanPham || product.tenSanPham.trim().length === 0) {
          errors.push(`Sản phẩm ${index + 1}: Tên sản phẩm không được để trống`);
        }
      });
    }

    // Validate employee information
    if (!invoice.nhanVienId || invoice.nhanVienId <= 0) {
      errors.push('Phải chọn nhân viên bán hàng');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Get field validation by field name
   */
  getFieldValidation(fieldName: string, value: any, additionalData?: any): FieldValidation {
    switch (fieldName) {
      case 'tenKhachHang':
        return this.validateCustomerName(value);
      case 'soDienThoaiKhachHang':
        return this.validatePhoneNumber(value);
      case 'emailKhachHang':
        return this.validateEmail(value);
      case 'maHoaDon':
        return this.validateInvoiceCode(value);
      case 'tongTien':
        return this.validateTotalAmount(value);
      case 'tienGiamGia':
        return this.validateDiscountAmount(value, additionalData?.tongTien || 0);
      case 'ghiChu':
        return this.validateNotes(value);
      case 'phuongThucThanhToan':
        return this.validatePaymentMethod(value);
      case 'nhanVienId':
        return this.validateEmployee(value);
      case 'searchTerm':
        return this.validateSearchTerm(value);
      case 'soLuong':
        return this.validateProductQuantityStrict(value, additionalData?.stockQuantity || 9999);
      case 'donGia':
        return this.validateProductPrice(value);
      default:
        return {
          field: fieldName,
          isValid: true,
          errorMessage: ''
        };
    }
  }

  /**
   * Check if product should be marked as out of stock
   */
  checkProductStockStatus(stockQuantity: number): boolean {
    return stockQuantity <= 0;
  }

  /**
   * Validate and update product stock status
   */
  validateAndUpdateProductStock(product: any, requestedQuantity: number): { isValid: boolean; shouldUpdateStatus: boolean; errorMessage: string } {
    const currentStock = product.soLuongTon || 0;
    const remainingStock = currentStock - requestedQuantity;
    
    // Check if requested quantity exceeds current stock
    if (requestedQuantity > currentStock) {
      return {
        isValid: false,
        shouldUpdateStatus: false,
        errorMessage: `Số lượng không được vượt quá số lượng tồn (${currentStock})`
      };
    }
    
    // Check if product will be out of stock after this transaction
    const willBeOutOfStock = remainingStock <= 0;
    
    return {
      isValid: true,
      shouldUpdateStatus: willBeOutOfStock,
      errorMessage: ''
    };
  }
}
