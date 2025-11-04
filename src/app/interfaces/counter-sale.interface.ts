export interface CounterSaleItem {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount: number;
  discountAmount: number;
  stockQuantity: number;
}

export interface CounterSale {
  id: number;
  saleNumber: string;
  customerId?: number;
  customerName?: string;
  customerPhone?: string;
  staffId: number;
  staffName: string;
  items: CounterSaleItem[];
  subtotal: number;
  discount: number;
  discountAmount: number;
  tax: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'other';
  paymentStatus: 'pending' | 'paid' | 'partial' | 'refunded';
  status: 'draft' | 'processing' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number;
  updatedBy: number;
}

export interface CounterSaleFilter {
  searchTerm: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  dateFrom?: Date;
  dateTo?: Date;
  staffId?: number;
  customerId?: number;
}

export interface CartItem {
  productId: number;
  productCode: string;
  productName: string;
  category: string;
  imageUrl?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount: number;
  discountAmount: number;
  stockQuantity: number;
}
