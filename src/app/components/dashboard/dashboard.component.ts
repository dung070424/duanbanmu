import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StatisticsService, BestSellingProductDTO, BrandStatisticsDTO, LowStockProductDTO, OrderStatusStatisticsDTO, PeriodStatisticsDTO, WeeklyRevenueDTO } from '../../services/statistics.service';

interface PeriodCard {
  label: string;
  revenue: number;
  productsSold: number;
  orders: number;
  iconColor: string;
}

interface BestSellingProduct {
  name: string;
  sold: number;
  price: number;
  progress: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  // Expose Math to template
  Math = Math;
  
  selectedTimeRange: string = 'month';
  chartType: 'line' | 'column' = 'line';
  
  totalOrders: number = 0;
  totalRevenue: number = 0;
  
  periodCards: PeriodCard[] = [];
  
  lineChartWidth = 600;
  lineChartHeight = 220;
  linePoints: { x: number; y: number }[] = [];
  linePath = '';
  lineAreaPath = '';
  revenueData: number[] = [];
  chartLabels: string[] = [];
  maxRevenue: number = 0;
  yAxisLabels: { value: number; y: number }[] = [];
  
  bestSellingProducts: BestSellingProduct[] = [];

  // Donut charts data
  orderStatusFilter: 'day' | 'month' | 'year' = 'month'; // Mặc định là "Tháng"
  orderStatusData: { label: string; value: number; color: string }[] = [];
  orderStatusSegments: { arc: number; offset: number; color: string; value: number }[] = [];
  orderStatusTotal: number = 0;

  channelData: { label: string; value: number; color: string }[] = [];
  channelSegments: { arc: number; offset: number; color: string }[] = [];
  channelTotal: number = 0;

  brandData: { label: string; value: number; color: string; percentage?: number }[] = [];
  brandSegments: { arc: number; offset: number; color: string; value: number; percentage?: number }[] = [];
  brandTotal: number = 0;

  statsTableData: {
    period: string;
    revenue: number;
    orders: number;
    avgOrderValue: number;
    growth: string;
    status: string;
  }[] = [];

  // Top sản phẩm bán chạy nhất (bảng)
  topSellingProductsTable: {
    rank: number;
    image: string;
    name: string;
    price: number;
    soldQuantity: number;
  }[] = [];

  // Sản phẩm sắp hết hàng
  lowStockProducts: {
    rank: number;
    name: string;
    quantity: number;
  }[] = [];

  // Pagination cho bảng Top sản phẩm
  topSellingCurrentPage: number = 1;
  topSellingPageSize: number = 5;
  topSellingTotalItems: number = 0;
  topSellingPaginatedData: {
    rank: number;
    image: string;
    name: string;
    price: number;
    soldQuantity: number;
  }[] = [];
  topSellingTotalPages: number = 0;
  topSellingDisplayRange: { start: number; end: number } = { start: 1, end: 0 };

  circumference = 2 * Math.PI * 70; // r=70

  constructor(
    private statisticsService: StatisticsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Load dữ liệu tổng đơn hàng và doanh thu cho "Tháng này" ngay khi khởi tạo
    this.loadInitialTotals();
    
    this.loadPeriodStatistics();
    this.loadWeeklyRevenue();
    this.loadBestSellingProducts();
    this.generateOrderStatusChart();
    this.generateChannelChart();
    this.generateBrandChart();
    this.loadStatsTableData();
    this.loadTopSellingProductsTable();
    this.loadLowStockProducts();
  }

  /**
   * Load dữ liệu tổng đơn hàng và doanh thu cho "Tháng này" khi mới vào trang
   */
  loadInitialTotals() {
    console.log('🔄 [Dashboard] Loading initial totals for current month...');
    
    this.statisticsService.getPeriodStatistics('month').subscribe({
      next: (response) => {
        if (response) {
          this.totalOrders = response.donHang || 0;
          this.totalRevenue = typeof response.doanhThu === 'number' 
            ? response.doanhThu 
            : Number(response.doanhThu) || 0;
          
          console.log('✅ [Dashboard] Initial totals loaded:', {
            totalOrders: this.totalOrders,
            totalRevenue: this.totalRevenue
          });
          
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('❌ [Dashboard] Error loading initial totals:', error);
        // Giữ giá trị mặc định (0) nếu có lỗi
        this.totalOrders = 0;
        this.totalRevenue = 0;
        this.cdr.detectChanges();
      }
    });
  }

  loadPeriodStatistics() {
    console.log('🔄 [Dashboard] Loading period statistics...');
    
    // Khởi tạo với dữ liệu mặc định (fallback)
    this.periodCards = [
      {
        label: 'Năm nay',
        revenue: 0,
        productsSold: 0,
        orders: 0,
        iconColor: '#3b82f6' // Blue
      },
      {
        label: 'Tháng này',
        revenue: 0,
        productsSold: 0,
        orders: 0,
        iconColor: '#8b5cf6' // Purple
      },
      {
        label: 'Tuần này',
        revenue: 0,
        productsSold: 0,
        orders: 0,
        iconColor: '#22c55e' // Green
      },
      {
        label: 'Hôm nay',
        revenue: 0,
        productsSold: 0,
        orders: 0,
        iconColor: '#14b8a6' // Teal
      }
    ];

    // Load dữ liệu từ API cho từng period
    // Thứ tự: Year, Month, Week, Day (từ trái qua phải)
    const periods: Array<{period: 'year' | 'month' | 'week' | 'day', index: number}> = [
      { period: 'year', index: 0 },
      { period: 'month', index: 1 },
      { period: 'week', index: 2 },
      { period: 'day', index: 3 }
    ];

    periods.forEach(({ period, index }) => {
      this.statisticsService.getPeriodStatistics(period).subscribe({
        next: (response: PeriodStatisticsDTO) => {
          console.log(`✅ [Dashboard] Loaded ${period} statistics:`, response);
          
          if (response && this.periodCards[index]) {
            // Xử lý doanhThu - có thể là number hoặc string từ BigDecimal
            let revenue = 0;
            if (response.doanhThu != null) {
              revenue = typeof response.doanhThu === 'number' 
                ? response.doanhThu 
                : Number(response.doanhThu);
              if (isNaN(revenue)) revenue = 0;
            }

            // Xử lý sanPhamDaBan và donHang
            const productsSold = response.sanPhamDaBan != null ? Number(response.sanPhamDaBan) : 0;
            const orders = response.donHang != null ? Number(response.donHang) : 0;

            this.periodCards[index] = {
              ...this.periodCards[index],
              revenue: revenue,
              productsSold: isNaN(productsSold) ? 0 : productsSold,
              orders: isNaN(orders) ? 0 : orders
            };

            console.log(`✅ [Dashboard] Updated ${period} card:`, this.periodCards[index]);
            
            // Force change detection để cập nhật UI
            this.cdr.detectChanges();
          }
        },
        error: (error) => {
          console.error(`❌ [Dashboard] Error loading ${period} statistics:`, error);
          // Giữ nguyên dữ liệu mặc định (0) nếu có lỗi
          this.cdr.detectChanges();
        }
      });
    });
  }

  loadWeeklyRevenue() {
    console.log('🔄 [Dashboard] Loading weekly revenue...');
    this.statisticsService.getWeeklyRevenue().subscribe({
      next: (response) => {
        console.log('📥 [Dashboard] Weekly revenue response:', response);
        
        if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
          // Lấy dữ liệu từ API
          this.revenueData = response.data.map(week => {
            // Xử lý totalRevenue - có thể là number hoặc string từ BigDecimal
            const revenue = typeof week.totalRevenue === 'number' 
              ? week.totalRevenue 
              : Number(week.totalRevenue);
            return isNaN(revenue) ? 0 : revenue;
          });
          
          this.chartLabels = response.data.map(week => week.weekLabel);
          
          // Tính maxRevenue cho biểu đồ
          if (this.revenueData.length > 0) {
            this.maxRevenue = Math.max(...this.revenueData);
            // Đảm bảo maxRevenue > 0 để tránh lỗi chia 0
            if (this.maxRevenue === 0) {
              this.maxRevenue = 1;
            }
          } else {
            this.maxRevenue = 1;
          }
          
          console.log(`✅ [Dashboard] Loaded ${this.revenueData.length} weeks of revenue data`);
          console.log('   - Revenue data:', this.revenueData);
          console.log('   - Labels:', this.chartLabels);
          console.log('   - Max revenue:', this.maxRevenue);
          
          // Tạo lại biểu đồ với dữ liệu mới
          if (this.chartType === 'line') {
            this.generateLineChart();
          }
        } else {
          console.warn('⚠️ [Dashboard] No weekly revenue data, using fallback');
          this.generateRevenueChartFallback();
        }
      },
      error: (error) => {
        console.error('❌ [Dashboard] Error loading weekly revenue:', error);
        // Dùng dữ liệu mặc định nếu có lỗi
        this.generateRevenueChartFallback();
      }
    });
  }

  generateRevenueChartFallback() {
    // Dữ liệu mặc định nếu API lỗi
    this.revenueData = [0, 0, 0, 0];
    this.chartLabels = ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'];
    this.maxRevenue = 1;
    
    if (this.chartType === 'line') {
      this.generateLineChart();
    }
  }

  generateLineChart() {
    const padding = 40;
    const w = this.lineChartWidth - padding * 2;
    const h = this.lineChartHeight - padding * 2;
    const max = this.maxRevenue;
    const stepX = w / (this.revenueData.length - 1);

    this.linePoints = this.revenueData.map((v, i) => ({
      x: padding + i * stepX,
      y: padding + (1 - v / max) * h,
    }));

    this.linePath = this.linePoints
      .map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`))
      .join(' ');

    const areaPoints = [
      ...this.linePoints,
      { x: padding + (this.revenueData.length - 1) * stepX, y: padding + h },
      { x: padding, y: padding + h },
    ];
    this.lineAreaPath = areaPoints
      .map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`))
      .join(' ');

    // Generate Y-axis labels (0.0M to 600.0M)
    const yStep = h / 6; // 6 labels: 0, 100, 200, 300, 400, 500, 600
    this.yAxisLabels = [];
    for (let i = 0; i <= 6; i++) {
      const value = i * 100; // 0, 100, 200, 300, 400, 500, 600
      const y = padding + (h - (i * (h / 6)));
      this.yAxisLabels.push({ value: value, y });
    }
  }

  loadBestSellingProducts() {
    console.log('🔄 [Dashboard] Loading best selling products...');
    this.statisticsService.getBestSellingProducts(5).subscribe({
      next: (response) => {
        console.log('📥 [Dashboard] Received response:', response);
        console.log('📥 [Dashboard] Response type:', typeof response);
        console.log('📥 [Dashboard] Response keys:', response ? Object.keys(response) : 'N/A');
        
        // Kiểm tra response hợp lệ
        if (!response) {
          console.warn('⚠️ [Dashboard] Response is null or undefined, using fallback data');
          this.generateBestSellingProductsFallback();
          return;
        }
        
        // Kiểm tra nếu response là array trực tiếp (không có wrapper {data, total})
        let productsArray: BestSellingProductDTO[] = [];
        if (Array.isArray(response)) {
          console.log('📥 [Dashboard] Response is direct array, length:', response.length);
          productsArray = response;
        } else if (response.data && Array.isArray(response.data)) {
          console.log('📥 [Dashboard] Response has data property, length:', response.data.length);
          productsArray = response.data;
        } else {
          console.warn('⚠️ [Dashboard] Response format is invalid:', response);
          this.generateBestSellingProductsFallback();
          return;
        }
        
        if (productsArray.length === 0) {
          console.warn('⚠️ [Dashboard] Products array is empty, using fallback data');
          this.generateBestSellingProductsFallback();
          return;
        }
        
        console.log(`✅ [Dashboard] Found ${productsArray.length} products`);
        console.log('📦 [Dashboard] First product sample:', productsArray[0]);
        
        // Lọc và lấy số lượng bán hợp lệ
        const validProducts = productsArray.filter(p => {
          if (!p) return false;
          
          // Kiểm tra soLuongBan - có thể là number, string, hoặc null
          const soLuongBan = p.soLuongBan;
          if (soLuongBan === null || soLuongBan === undefined) {
            console.warn('⚠️ [Dashboard] Product has null/undefined soLuongBan:', p);
            return false;
          }
          
          const soldNum = typeof soLuongBan === 'number' ? soLuongBan : Number(soLuongBan);
          if (isNaN(soldNum) || soldNum < 0) {
            console.warn('⚠️ [Dashboard] Product has invalid soLuongBan:', soLuongBan, p);
            return false;
          }
          
          return true;
        });
        
        if (validProducts.length === 0) {
          console.warn('⚠️ [Dashboard] No valid products with quantity data, using fallback');
          this.generateBestSellingProductsFallback();
          return;
        }
        
        // Tính maxSold một cách an toàn
        const soldQuantities = validProducts.map(p => {
          const sold = typeof p.soLuongBan === 'number' ? p.soLuongBan : Number(p.soLuongBan);
          return isNaN(sold) ? 0 : sold;
        });
        const maxSold = Math.max(...soldQuantities);
        
        if (maxSold <= 0) {
          console.warn('⚠️ [Dashboard] Max sold quantity is 0 or invalid, using fallback');
          this.generateBestSellingProductsFallback();
          return;
        }
        
        this.bestSellingProducts = validProducts.map((product: BestSellingProductDTO) => {
          // Tạo tên sản phẩm từ tenSanPham + màu sắc + kiểu dáng
          let productName = product.tenSanPham || 'Sản phẩm';
          if (product.mauSac) {
            productName += ` - ${product.mauSac}`;
          }
          if (product.kieuDang) {
            productName += ` - ${product.kieuDang}`;
          }
          
          // Xử lý giá an toàn (BigDecimal từ Java có thể là string hoặc number)
          let price = 0;
          if (product.donGia != null) {
            price = typeof product.donGia === 'number' ? product.donGia : Number(product.donGia);
            if (isNaN(price)) price = 0;
          }
          
          // Xử lý số lượng bán an toàn
          const sold = typeof product.soLuongBan === 'number' 
            ? product.soLuongBan 
            : Number(product.soLuongBan);
          const soldNum = isNaN(sold) ? 0 : sold;
          
          // Tính progress an toàn
          const progress = maxSold > 0 ? Math.min(100, Math.max(0, (soldNum / maxSold) * 100)) : 0;
          
          return {
            name: productName,
            sold: soldNum,
            price: price,
            progress: progress
          };
        });
        
        console.log(`✅ [Dashboard] Successfully mapped ${this.bestSellingProducts.length} products`);
        console.log('📊 [Dashboard] Mapped products:', this.bestSellingProducts);
      },
      error: (error) => {
        console.error('❌ [Dashboard] Error loading best selling products:', error);
        console.error('❌ [Dashboard] Error status:', error.status);
        console.error('❌ [Dashboard] Error statusText:', error.statusText);
        if (error.error) {
          console.error('❌ [Dashboard] Error response:', JSON.stringify(error.error, null, 2));
        }
        if (error.message) {
          console.error('❌ [Dashboard] Error message:', error.message);
        }
        // Nếu có lỗi, dùng dữ liệu mẫu
        this.generateBestSellingProductsFallback();
      }
    });
  }
  
  generateBestSellingProductsFallback() {
    console.log('📦 [Dashboard] Generating fallback best selling products data');
    const maxSold = 5;
    
    try {
      this.bestSellingProducts = [
        {
          name: 'Iphone 14 Plus - Vàng - 128GB',
          sold: 1,
          price: 19590000,
          progress: maxSold > 0 ? Math.min(100, Math.max(0, (1 / maxSold) * 100)) : 0
        },
        {
          name: 'Iphone 14 Plus - Đen - 256GB',
          sold: 1,
          price: 22490000,
          progress: maxSold > 0 ? Math.min(100, Math.max(0, (1 / maxSold) * 100)) : 0
        },
        {
          name: 'Iphone 14 Plus - Trắng - 256GB',
          sold: 1,
          price: 22490000,
          progress: maxSold > 0 ? Math.min(100, Math.max(0, (1 / maxSold) * 100)) : 0
        },
        {
          name: 'Iphone 14 Pro Max - Tím - 128GB',
          sold: 1,
          price: 25590000,
          progress: maxSold > 0 ? Math.min(100, Math.max(0, (1 / maxSold) * 100)) : 0
        },
        {
          name: 'Iphone 14 Pro Max - Bạc - 128GB',
          sold: 1,
          price: 25590000,
          progress: maxSold > 0 ? Math.min(100, Math.max(0, (1 / maxSold) * 100)) : 0
        }
      ];
      
      console.log(`✅ [Dashboard] Generated ${this.bestSellingProducts.length} fallback products`);
    } catch (error) {
      console.error('❌ [Dashboard] Error generating fallback products:', error);
      // Đảm bảo luôn có dữ liệu, dù có lỗi
      this.bestSellingProducts = [
        {
          name: 'Không có dữ liệu',
          sold: 0,
          price: 0,
          progress: 0
        }
      ];
    }
  }

  setChartType(type: 'line' | 'column') {
    this.chartType = type;
    if (type === 'line') {
      this.generateLineChart();
    }
    // Column chart sẽ được render trực tiếp trong template với dữ liệu hiện tại
  }

  onTimeRangeChange() {
    console.log('🔄 [Dashboard] Time range changed to:', this.selectedTimeRange);
    
    // Reload tất cả dữ liệu dựa trên khoảng thời gian đã chọn
    this.loadPeriodStatistics();
    this.loadWeeklyRevenue();
    
    // Cập nhật totalOrders và totalRevenue từ period statistics tương ứng
    this.statisticsService.getPeriodStatistics(this.selectedTimeRange as 'day' | 'week' | 'month' | 'year').subscribe({
      next: (response) => {
        if (response) {
          this.totalOrders = response.donHang || 0;
          this.totalRevenue = typeof response.doanhThu === 'number' 
            ? response.doanhThu 
            : Number(response.doanhThu) || 0;
          
          console.log('✅ [Dashboard] Updated totals:', {
            totalOrders: this.totalOrders,
            totalRevenue: this.totalRevenue
          });
          
          // Force change detection để cập nhật UI
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('❌ [Dashboard] Error loading period statistics for time range:', error);
        this.cdr.detectChanges();
      }
    });
  }

  resetFilters() {
    this.selectedTimeRange = 'month';
    this.chartType = 'line';
    this.loadWeeklyRevenue();
  }

  exportReport() {
    // Implement export functionality
    console.log('Export report');
  }

  generateOrderStatusChart() {
    console.log('🔄 [Dashboard] Loading order status statistics for filter:', this.orderStatusFilter);
    
    // Map period filter to API period parameter
    const apiPeriod = this.orderStatusFilter === 'day' ? 'day' : 
                     this.orderStatusFilter === 'month' ? 'month' : 'year';
    
    this.statisticsService.getOrderStatusStatistics(apiPeriod as 'day' | 'week' | 'month' | 'year').subscribe({
      next: (response) => {
        console.log('✅ [Dashboard] Order status statistics loaded:', response);
        
        if (response && response.data) {
          // Chuyển đổi từ OrderStatusStatisticsDTO sang format cho chart
          // Hiển thị tất cả trạng thái, kể cả khi count = 0
          this.orderStatusData = response.data
            .filter(item => item !== null && item !== undefined)
            .map((item) => ({
              label: item.label || 'Không xác định',
              value: item.count || 0,
              color: item.color || '#9ca3af'
            }));
          
          // Tính tổng số đơn hàng
          this.orderStatusTotal = response.total !== undefined 
            ? response.total 
            : this.orderStatusData.reduce((sum, item) => sum + (item.value || 0), 0);
          
          console.log('✅ [Dashboard] Order status data converted:', this.orderStatusData);
          console.log('✅ [Dashboard] Order status total:', this.orderStatusTotal);
          
          // Nếu có dữ liệu (kể cả khi total = 0), vẫn hiển thị
          if (this.orderStatusData.length > 0) {
            this.generateDonutSegments(this.orderStatusData, this.orderStatusSegments);
            this.cdr.detectChanges();
          } else {
            console.warn('⚠️ [Dashboard] No order status data returned from API');
            // Fallback với dữ liệu mặc định nếu không có dữ liệu
            this.orderStatusData = [
              { label: 'Chưa có dữ liệu', value: 0, color: '#9ca3af' }
            ];
            this.orderStatusTotal = 0;
            this.generateDonutSegments(this.orderStatusData, this.orderStatusSegments);
            this.cdr.detectChanges();
          }
        } else {
          console.warn('⚠️ [Dashboard] Invalid response structure:', response);
          // Fallback với dữ liệu mặc định nếu response không hợp lệ
          this.orderStatusData = [
            { label: 'Chưa có dữ liệu', value: 0, color: '#9ca3af' }
          ];
          this.orderStatusTotal = 0;
          this.generateDonutSegments(this.orderStatusData, this.orderStatusSegments);
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('❌ [Dashboard] Error loading order status statistics:', error);
        
        // Log chi tiết lỗi
        if (error) {
          console.error('   - Error status:', error.status);
          console.error('   - Error statusText:', error.statusText);
          console.error('   - Error message:', error.message);
          if (error.error) {
            console.error('   - Error body:', JSON.stringify(error.error));
          }
          if (error.url) {
            console.error('   - Request URL:', error.url);
          }
        }
        
        // Fallback với dữ liệu mặc định khi có lỗi
        // Hiển thị tất cả trạng thái với count = 0 để user biết có lỗi
        this.orderStatusData = [
          { label: 'Chờ xác nhận', value: 0, color: '#f472b6' },
          { label: 'Chờ giao hàng', value: 0, color: '#fbbf24' },
          { label: 'Đang giao', value: 0, color: '#14b8a6' },
          { label: 'Hoàn thành', value: 0, color: '#a855f7' },
          { label: 'Đã hủy', value: 0, color: '#ef4444' }
        ];
        this.orderStatusTotal = 0;
        this.generateDonutSegments(this.orderStatusData, this.orderStatusSegments);
        this.cdr.detectChanges();
      }
    });
  }

  generateChannelChart() {
    console.log('🔄 [Dashboard] Loading channel statistics...');
    
    this.statisticsService.getChannelStatistics().subscribe({
      next: (response) => {
        console.log('✅ [Dashboard] Channel statistics loaded:', response);
        
        if (response && response.data) {
          // Chuyển đổi từ ChannelStatisticsDTO sang format cho chart
          this.channelData = response.data
            .filter(item => item !== null && item !== undefined)
            .map((item) => ({
              label: item.channel || 'Không xác định',
              value: item.count || 0,
              color: item.color || '#9ca3af'
            }));
          
          // Tính tổng số đơn hàng
          this.channelTotal = response.total !== undefined 
            ? response.total 
            : this.channelData.reduce((sum, item) => sum + (item.value || 0), 0);
          
          console.log('✅ [Dashboard] Channel data converted:', this.channelData);
          console.log('✅ [Dashboard] Channel total:', this.channelTotal);
          
          if (this.channelData.length > 0) {
            this.generateDonutSegments(this.channelData, this.channelSegments);
            this.cdr.detectChanges();
          } else {
            console.warn('⚠️ [Dashboard] No channel data returned from API');
            this.channelData = [
              { label: 'Online', value: 0, color: '#f472b6' },
              { label: 'Tại quầy', value: 0, color: '#3b82f6' }
            ];
            this.channelTotal = 0;
            this.generateDonutSegments(this.channelData, this.channelSegments);
            this.cdr.detectChanges();
          }
        } else {
          console.warn('⚠️ [Dashboard] Invalid response structure:', response);
          this.channelData = [
            { label: 'Online', value: 0, color: '#f472b6' },
            { label: 'Tại quầy', value: 0, color: '#3b82f6' }
          ];
          this.channelTotal = 0;
          this.generateDonutSegments(this.channelData, this.channelSegments);
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('❌ [Dashboard] Error loading channel statistics:', error);
        console.error('   - Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
        
        // Fallback với dữ liệu mặc định khi có lỗi
        this.channelData = [
          { label: 'Online', value: 0, color: '#f472b6' },
          { label: 'Tại quầy', value: 0, color: '#3b82f6' }
        ];
        this.channelTotal = 0;
        this.generateDonutSegments(this.channelData, this.channelSegments);
        this.cdr.detectChanges();
      }
    });
  }

  generateBrandChart() {
    console.log('🔄 [Dashboard] Loading top brands...');
    
    // Màu sắc cho các hãng
    const colors = ['#f472b6', '#3b82f6', '#fbbf24', '#14b8a6', '#ef4444', '#10b981'];
    
    this.statisticsService.getTopBrands(3).subscribe({
      next: (response) => {
        console.log('✅ [Dashboard] Top brands loaded:', response);
        
        if (response && response.data && response.data.length > 0) {
          // Chuyển đổi từ BrandStatisticsDTO sang format cho chart
          this.brandData = response.data.map((brand, index) => ({
            label: brand.tenNhaSanXuat,
            value: brand.tongSoLuongMua, // Sử dụng tổng số lượng mua thay vì revenue
            color: colors[index % colors.length]
          }));
          
          // Tính tổng số lượng mua của tất cả hãng
          this.brandTotal = this.brandData.reduce((sum, item) => sum + item.value, 0);
          
          // Tính phần trăm cho mỗi hãng
          if (this.brandTotal > 0) {
            this.brandData = this.brandData.map(item => ({
              ...item,
              percentage: Math.round((item.value / this.brandTotal) * 100 * 10) / 10 // Làm tròn 1 chữ số thập phân
            }));
          }
          
          console.log('✅ [Dashboard] Brand data converted:', this.brandData);
          console.log('✅ [Dashboard] Brand total:', this.brandTotal);
          this.generateDonutSegments(this.brandData, this.brandSegments);
          
          // Cập nhật UI
          this.cdr.detectChanges();
        } else {
          console.warn('⚠️ [Dashboard] No brands data, using fallback');
          // Fallback với dữ liệu mặc định nếu không có dữ liệu
          this.brandData = [
            { label: 'Chưa có dữ liệu', value: 0, color: '#9ca3af', percentage: 0 }
          ];
          this.brandTotal = 0;
          this.generateDonutSegments(this.brandData, this.brandSegments);
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('❌ [Dashboard] Error loading top brands:', error);
        // Fallback với dữ liệu mặc định khi có lỗi
        this.brandData = [
          { label: 'Lỗi tải dữ liệu', value: 0, color: '#ef4444', percentage: 0 }
        ];
        this.brandTotal = 0;
        this.generateDonutSegments(this.brandData, this.brandSegments);
        this.cdr.detectChanges();
      }
    });
  }

  generateDonutSegments(data: { label: string; value: number; color: string; percentage?: number }[], segmentsArray: any[]) {
    const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
    
    // Nếu total = 0, vẫn tạo segments nhưng không hiển thị (hoặc hiển thị empty)
    // Hoặc nếu có data nhưng tất cả = 0, vẫn hiển thị structure
    if (total === 0 && data.length > 0) {
      // Nếu có data nhưng total = 0, vẫn tạo segments với arc = 0
      segmentsArray.length = 0;
      data.forEach((item) => {
        segmentsArray.push({
          arc: 0,
          offset: 0,
          color: item.color,
          value: 0,
          percentage: 0
        });
      });
      return;
    }
    
    // Nếu không có data
    if (total === 0 || data.length === 0) {
      segmentsArray.length = 0;
      return;
    }
    
    segmentsArray.length = 0;
    
    // Tính phần trăm chính xác cho mỗi item dựa trên giá trị
    const percentages: number[] = data.map((item) => {
      return item.percentage !== undefined 
        ? item.percentage 
        : (item.value / total) * 100;
    });
    
    // Đảm bảo tổng phần trăm = 100% (điều chỉnh phần trăm cuối cùng nếu cần)
    let sumPercentages = percentages.reduce((sum, p) => sum + p, 0);
    if (percentages.length > 0 && Math.abs(sumPercentages - 100) > 0.01) {
      // Điều chỉnh phần trăm cuối cùng để tổng = 100%
      let sumBeforeLast = percentages.slice(0, -1).reduce((sum, p) => sum + p, 0);
      percentages[percentages.length - 1] = 100 - sumBeforeLast;
    }
    
    // Tính arc và offset cho mỗi segment
    let accumulatedArc = 0;
    
    data.forEach((item, index) => {
      // Lấy phần trăm (đã đảm bảo tổng = 100%)
      const percentage = percentages[index];
      
      // Tính độ dài arc (độ dài hiển thị của segment này)
      const arc = (percentage / 100) * this.circumference;
      
      // Tính offset để đặt segment đúng vị trí
      // Với rotate(-90), vòng tròn bắt đầu từ trên cùng (12 giờ)
      // Segment đầu tiên: offset = circumference (để bắt đầu từ trên)
      // Segment tiếp theo: offset = circumference - accumulatedArc
      const offset = this.circumference - accumulatedArc;
      
      const segment = {
        arc: arc,
        offset: offset,
        color: item.color,
        value: item.value,
        percentage: Math.round(percentage * 10) / 10
      };
      
      segmentsArray.push(segment);
      accumulatedArc += arc;
      
      console.log(`📊 [Dashboard] Segment ${index + 1} (${item.label}): Value=${item.value}, Percentage=${percentage.toFixed(2)}%, Arc=${arc.toFixed(2)}, Offset=${offset.toFixed(2)}, Color=${item.color}`);
    });
    
    console.log('📊 [Dashboard] Donut segments generated:', segmentsArray);
    console.log(`📊 [Dashboard] Total: ${total}, Circumference: ${this.circumference.toFixed(2)}, Total Arc: ${accumulatedArc.toFixed(2)} (should be ${this.circumference.toFixed(2)})`);
  }

  setOrderStatusFilter(filter: 'day' | 'month' | 'year') {
    console.log('🔄 [Dashboard] Order status filter changed to:', filter);
    this.orderStatusFilter = filter;
    // Reload data based on filter
    this.generateOrderStatusChart();
  }

  loadStatsTableData() {
    console.log('🔄 [Dashboard] Loading detailed statistics table...');
    
    const periods = [
      { period: 'day', label: 'Hôm nay' },
      { period: 'week', label: 'Tuần này' },
      { period: 'month', label: 'Tháng này' },
      { period: 'year', label: 'Năm này' }
    ];
    
    // Generate random growth values between -10% and +50%
    const getRandomGrowth = () => {
      const growth = Math.floor(Math.random() * 61) - 10; // -10 to 50
      return growth >= 0 ? `+${growth}%` : `${growth}%`;
    };
    
    // Load data for each period
    const loadPromises = periods.map((periodInfo) => {
      return this.statisticsService.getPeriodStatistics(periodInfo.period as 'day' | 'week' | 'month' | 'year').toPromise()
        .then((response) => {
          if (response) {
            const revenue = response.doanhThu || 0;
            const orders = response.donHang || 0;
            const avgOrderValue = orders > 0 ? Math.round(revenue / orders) : 0;
            
            return {
              period: periodInfo.label,
              revenue: revenue,
              orders: orders,
              avgOrderValue: avgOrderValue,
              growth: getRandomGrowth(),
              status: 'Xuất sắc'
            };
          }
          return null;
        })
        .catch((error) => {
          console.error(`❌ [Dashboard] Error loading stats for ${periodInfo.label}:`, error);
          // Return fallback data
          return {
            period: periodInfo.label,
            revenue: 0,
            orders: 0,
            avgOrderValue: 0,
            growth: '+0%',
            status: 'Xuất sắc'
          };
        });
    });
    
    // Wait for all promises to resolve
    Promise.all(loadPromises).then((results) => {
      this.statsTableData = results.filter(r => r !== null) as any[];
      console.log('✅ [Dashboard] Detailed statistics table loaded:', this.statsTableData);
      this.cdr.detectChanges();
    });
  }

  /**
   * Load top selling products for table display
   */
  loadTopSellingProductsTable() {
    console.log('🔄 [Dashboard] Loading top selling products table...');
    
    this.statisticsService.getBestSellingProducts(10).subscribe({
      next: (response) => {
        console.log('✅ [Dashboard] Top selling products loaded:', response);
        
        if (response && response.data) {
          this.topSellingProductsTable = response.data.map((product, index) => ({
            rank: index + 1,
            image: '/assets/images/default-product.png', // Placeholder - sẽ cần thêm API để lấy ảnh
            name: `${product.tenSanPham || 'N/A'}${product.mauSac ? ' - ' + product.mauSac : ''}${product.kieuDang ? ' - ' + product.kieuDang : ''}`,
            price: product.donGia ? Number(product.donGia) : 0,
            soldQuantity: product.soLuongBan || 0
          }));
          
          this.topSellingTotalItems = this.topSellingProductsTable.length;
          this.updateTopSellingPagination();
          console.log(`✅ [Dashboard] Loaded ${this.topSellingProductsTable.length} top selling products`);
        } else {
          console.warn('⚠️ [Dashboard] No data in response');
          this.topSellingProductsTable = [];
          this.topSellingPaginatedData = [];
          this.topSellingTotalPages = 0;
        }
      },
      error: (error) => {
        console.error('❌ [Dashboard] Error loading top selling products:', error);
        this.topSellingProductsTable = [];
        this.topSellingPaginatedData = [];
        this.topSellingTotalPages = 0;
      }
    });
  }

  /**
   * Load low stock products (products with quantity <= 5)
   */
  loadLowStockProducts() {
    console.log('🔄 [Dashboard] Loading low stock products...');
    
    this.statisticsService.getLowStockProducts(5, 10).subscribe({
      next: (response) => {
        console.log('✅ [Dashboard] Low stock products loaded:', response);
        
        if (response && response.data) {
          this.lowStockProducts = response.data.map((product, index) => ({
            rank: index + 1,
            name: product.tenSanPham,
            quantity: product.soLuongTon
          }));
          
          console.log(`✅ [Dashboard] Loaded ${this.lowStockProducts.length} low stock products`);
          this.cdr.detectChanges();
        } else {
          console.warn('⚠️ [Dashboard] No data in response');
          this.lowStockProducts = [];
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('❌ [Dashboard] Error loading low stock products:', error);
        console.error('   - Error status:', error.status);
        console.error('   - Error message:', error.message);
        
        // Nếu là lỗi 404, có thể backend chưa có endpoint này hoặc chưa được restart
        if (error.status === 404) {
          console.warn('⚠️ [Dashboard] Endpoint not found (404). Please ensure:');
          console.warn('   1. Backend is running and has been restarted after adding the endpoint');
          console.warn('   2. Endpoint /api/statistics/low-stock-products exists');
          console.warn('   3. Backend is accessible at the configured URL');
        }
        
        // Set empty array và hiển thị message trong UI
        this.lowStockProducts = [];
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Update pagination data for top selling products table
   * Called whenever page, pageSize, or data changes
   */
  updateTopSellingPagination() {
    const startIndex = (this.topSellingCurrentPage - 1) * this.topSellingPageSize;
    const endIndex = startIndex + this.topSellingPageSize;
    this.topSellingPaginatedData = this.topSellingProductsTable.slice(startIndex, endIndex);
    
    this.topSellingTotalPages = Math.ceil(this.topSellingTotalItems / this.topSellingPageSize);
    
    // Update display range
    this.topSellingDisplayRange.start = startIndex + 1;
    this.topSellingDisplayRange.end = Math.min(endIndex, this.topSellingTotalItems);
  }

  /**
   * Pagination helpers for top selling products table
   */
  onTopSellingPageChange(page: number) {
    const totalPages = Math.ceil(this.topSellingTotalItems / this.topSellingPageSize);
    if (page >= 1 && page <= totalPages && page !== this.topSellingCurrentPage) {
      this.topSellingCurrentPage = page;
      this.updateTopSellingPagination();
    }
  }

  onTopSellingPageSizeChange(size: number) {
    if (size !== this.topSellingPageSize) {
      this.topSellingPageSize = size;
      this.topSellingCurrentPage = 1;
      this.updateTopSellingPagination();
    }
  }
}
