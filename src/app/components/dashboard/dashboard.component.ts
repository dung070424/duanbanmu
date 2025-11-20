import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StatisticsService, BestSellingProductDTO, BrandStatisticsDTO, LowStockProductDTO, OrderStatusStatisticsDTO, PeriodStatisticsDTO, WeeklyRevenueDTO, DetailedStatisticsDTO, PeriodDetailDTO } from '../../services/statistics.service';
import { KhachHangService } from '../../services/khach-hang.service';
import { KhachHang } from '../../interfaces/khach-hang.interface';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface PeriodCard {
  label: string;
  periodLabel: string; // Label ngắn: "Ngày", "Tuần", "Tháng", "Năm"
  revenue: number;
  actualRevenue: number; // Doanh thu thực tế (đã thanh toán)
  debtRevenue: number; // Công nợ (doanh số - thực tế)
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
  
  // Custom date range
  customStartDate: string = '';
  customEndDate: string = '';
  
  totalOrders: number = 0;
  totalRevenue: number = 0;
  totalActualRevenue: number = 0;
  totalDebtRevenue: number = 0;
  
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
  bestSellingMessage: string | null = null;
  private readonly bestSellingLimit = 5;

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

  // Sản phẩm hết hàng
  outOfStockProducts: {
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

  // Khách hàng mới
  newCustomers: KhachHang[] = [];
  newCustomersFilter: 'today' | 'week' | 'month' | 'custom' = 'today'; // Mặc định là hôm nay
  newCustomersCustomStartDate: string = '';
  newCustomersCustomEndDate: string = '';

  constructor(
    private statisticsService: StatisticsService,
    private khachHangService: KhachHangService,
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
    this.loadOutOfStockProducts();
    this.loadNewCustomers();
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
          this.totalActualRevenue = response.actualRevenue != null ? Number(response.actualRevenue) : 0;
          this.totalDebtRevenue = response.debtRevenue != null ? Number(response.debtRevenue) : 0;
          
          console.log('✅ [Dashboard] Initial totals loaded:', {
            totalOrders: this.totalOrders,
            totalRevenue: this.totalRevenue,
            totalActualRevenue: this.totalActualRevenue,
            totalDebtRevenue: this.totalDebtRevenue
          });
          
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('❌ [Dashboard] Error loading initial totals:', error);
        // Giữ giá trị mặc định (0) nếu có lỗi
        this.totalOrders = 0;
        this.totalRevenue = 0;
        this.totalActualRevenue = 0;
        this.totalDebtRevenue = 0;
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
        periodLabel: 'Năm',
        revenue: 0,
        actualRevenue: 0,
        debtRevenue: 0,
        productsSold: 0,
        orders: 0,
        iconColor: '#fbb544' // Orange/Yellow
      },
      {
        label: 'Tháng này',
        periodLabel: 'Tháng',
        revenue: 0,
        actualRevenue: 0,
        debtRevenue: 0,
        productsSold: 0,
        orders: 0,
        iconColor: '#f3c57a' // Light Orange/Yellow
      },
      {
        label: 'Tuần này',
        periodLabel: 'Tuần',
        revenue: 0,
        actualRevenue: 0,
        debtRevenue: 0,
        productsSold: 0,
        orders: 0,
        iconColor: '#f0d9b6' // Beige/Light Tan
      },
      {
        label: 'Hôm nay',
        periodLabel: 'Ngày',
        revenue: 0,
        actualRevenue: 0,
        debtRevenue: 0,
        productsSold: 0,
        orders: 0,
        iconColor: '#f5e8d3' // Light Beige/Cream
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

    // Tạo array các observables với error handling
    const periodObservables = periods.map(({ period, index }) => 
      this.statisticsService.getPeriodStatistics(period).pipe(
        catchError((error) => {
          console.error(`❌ [Dashboard] Error loading ${period} statistics:`, error);
          // Trả về null nếu có lỗi để không làm gián đoạn forkJoin
          return of(null);
        })
      )
    );

    // Sử dụng forkJoin để load tất cả cùng lúc và chỉ gọi detectChanges một lần
    forkJoin(periodObservables).subscribe({
      next: (responses) => {
        responses.forEach((response: PeriodStatisticsDTO | null, index) => {
          if (response && this.periodCards[index]) {
            const periodInfo = periods[index];
            console.log(`✅ [Dashboard] Loaded ${periodInfo.period} statistics:`, response);
            
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
            
            // Xử lý actualRevenue và debtRevenue
            const actualRevenue = response.actualRevenue != null ? Number(response.actualRevenue) : 0;
            const debtRevenue = response.debtRevenue != null ? Number(response.debtRevenue) : 0;

            this.periodCards[index] = {
              ...this.periodCards[index],
              revenue: revenue,
              actualRevenue: isNaN(actualRevenue) ? 0 : actualRevenue,
              debtRevenue: isNaN(debtRevenue) ? 0 : debtRevenue,
              productsSold: isNaN(productsSold) ? 0 : productsSold,
              orders: isNaN(orders) ? 0 : orders
            };

            console.log(`✅ [Dashboard] Updated ${periodInfo.period} card:`, this.periodCards[index]);
          }
        });
        
        // Chỉ gọi detectChanges một lần sau khi tất cả responses đã được xử lý
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ [Dashboard] Error loading period statistics:', error);
        // Giữ nguyên dữ liệu mặc định (0) nếu có lỗi
        this.cdr.detectChanges();
      }
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
    console.log('🔄 [Dashboard] Loading best selling products with filter:', {
      selectedTimeRange: this.selectedTimeRange,
      customStartDate: this.customStartDate,
      customEndDate: this.customEndDate
    });

    let request$;
    const supportedPeriods = ['day', 'week', 'month', 'year'];
    this.bestSellingMessage = null;
    this.bestSellingProducts = [];

    if (this.selectedTimeRange === 'custom') {
      if (this.customStartDate && this.customEndDate) {
        request$ = this.statisticsService.getBestSellingProductsByDateRange(
          this.customStartDate,
          this.customEndDate,
          this.bestSellingLimit
        );
      } else {
        console.warn('⚠️ [Dashboard] Custom date range not set yet, fallback to default best sellers');
        request$ = this.statisticsService.getBestSellingProducts(this.bestSellingLimit);
      }
    } else if (supportedPeriods.includes(this.selectedTimeRange)) {
      request$ = this.statisticsService.getBestSellingProductsByPeriod(
        this.selectedTimeRange as 'day' | 'week' | 'month' | 'year',
        this.bestSellingLimit
      );
    } else {
      console.warn('⚠️ [Dashboard] Unsupported time range, fallback to default best sellers');
      request$ = this.statisticsService.getBestSellingProducts(this.bestSellingLimit);
    }

    if (!request$) {
      this.bestSellingMessage = 'Không thể tải dữ liệu sản phẩm bán chạy.';
      return;
    }

    request$.subscribe({
      next: (response) => {
        console.log('📥 [Dashboard] Received response:', response);
        console.log('📥 [Dashboard] Response type:', typeof response);
        console.log('📥 [Dashboard] Response keys:', response ? Object.keys(response) : 'N/A');
        
        // Kiểm tra response hợp lệ
        if (!response) {
          console.warn('⚠️ [Dashboard] Response is null hoặc undefined');
          this.bestSellingMessage = 'Không thể tải dữ liệu sản phẩm bán chạy.';
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
          this.bestSellingMessage = 'Dữ liệu sản phẩm bán chạy không hợp lệ.';
          return;
        }
        
        if (productsArray.length === 0) {
          console.warn('⚠️ [Dashboard] Products array is empty');
          this.bestSellingMessage = 'Chưa có dữ liệu sản phẩm bán chạy cho khoảng thời gian này.';
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
          console.warn('⚠️ [Dashboard] No valid products with quantity data');
          this.bestSellingMessage = 'Dữ liệu sản phẩm bán chạy không hợp lệ.';
          return;
        }
        
        // Tính maxSold một cách an toàn
        const soldQuantities = validProducts.map(p => {
          const sold = typeof p.soLuongBan === 'number' ? p.soLuongBan : Number(p.soLuongBan);
          return isNaN(sold) ? 0 : sold;
        });
        const maxSold = Math.max(...soldQuantities);
        
        if (maxSold <= 0) {
          console.warn('⚠️ [Dashboard] Max sold quantity is 0 or invalid');
          this.bestSellingMessage = 'Chưa có sản phẩm bán chạy trong khoảng thời gian này.';
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
        this.bestSellingMessage = null;
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
        this.bestSellingMessage = 'Không thể tải dữ liệu sản phẩm bán chạy. Vui lòng thử lại.';
        this.bestSellingProducts = [];
      }
    });
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
    
    // Nếu chọn custom, khởi tạo date range mặc định (30 ngày gần nhất)
    if (this.selectedTimeRange === 'custom') {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      this.customEndDate = this.formatDateForInput(today);
      this.customStartDate = this.formatDateForInput(thirtyDaysAgo);
      
      // Load dữ liệu với date range mặc định
      if (this.customStartDate && this.customEndDate) {
        this.loadCustomDateRange();
      }
    } else {
      // Reload tất cả dữ liệu dựa trên khoảng thời gian đã chọn
      this.loadPeriodStatistics();
      this.loadWeeklyRevenue();
      this.loadBestSellingProducts();
      
      // Cập nhật totalOrders, totalRevenue, totalActualRevenue, totalDebtRevenue từ period statistics tương ứng
      this.statisticsService.getPeriodStatistics(this.selectedTimeRange as 'day' | 'week' | 'month' | 'year').subscribe({
        next: (response) => {
          if (response) {
            this.totalOrders = response.donHang || 0;
            this.totalRevenue = typeof response.doanhThu === 'number' 
              ? response.doanhThu 
              : Number(response.doanhThu) || 0;
            this.totalActualRevenue = response.actualRevenue != null ? Number(response.actualRevenue) : 0;
            this.totalDebtRevenue = response.debtRevenue != null ? Number(response.debtRevenue) : 0;
            
            console.log('✅ [Dashboard] Updated totals:', {
              totalOrders: this.totalOrders,
              totalRevenue: this.totalRevenue,
              totalActualRevenue: this.totalActualRevenue,
              totalDebtRevenue: this.totalDebtRevenue
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
  }
  
  onCustomDateChange() {
    console.log('🔄 [Dashboard] Custom date changed:', {
      startDate: this.customStartDate,
      endDate: this.customEndDate
    });
    
    // Validate dates
    if (this.customStartDate && this.customEndDate) {
      if (new Date(this.customStartDate) > new Date(this.customEndDate)) {
        console.warn('⚠️ Start date is after end date');
        return;
      }
      this.loadCustomDateRange();
    }
  }
  
  loadCustomDateRange() {
    if (!this.customStartDate || !this.customEndDate) {
      console.warn('⚠️ [Dashboard] Custom date range is incomplete');
      return;
    }
    
    console.log('🔄 [Dashboard] Loading custom date range statistics:', {
      startDate: this.customStartDate,
      endDate: this.customEndDate
    });
    
    this.statisticsService.getPeriodStatisticsByDateRange(this.customStartDate, this.customEndDate).subscribe({
      next: (response) => {
        if (response) {
          this.totalOrders = response.donHang || 0;
          this.totalRevenue = typeof response.doanhThu === 'number' 
            ? response.doanhThu 
            : Number(response.doanhThu) || 0;
          this.totalActualRevenue = response.actualRevenue != null ? Number(response.actualRevenue) : 0;
          this.totalDebtRevenue = response.debtRevenue != null ? Number(response.debtRevenue) : 0;
          
          console.log('✅ [Dashboard] Custom date range statistics loaded:', {
            totalOrders: this.totalOrders,
            totalRevenue: this.totalRevenue,
            totalActualRevenue: this.totalActualRevenue,
            totalDebtRevenue: this.totalDebtRevenue
          });
          
          // Reload period statistics và weekly revenue (có thể cần điều chỉnh)
          this.loadPeriodStatistics();
          this.loadWeeklyRevenue();
          this.loadBestSellingProducts();
          
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('❌ [Dashboard] Error loading custom date range statistics:', error);
        this.cdr.detectChanges();
      }
    });
  }
  
  getTodayDate(): string {
    return this.formatDateForInput(new Date());
  }
  
  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  resetFilters() {
    this.selectedTimeRange = 'month';
    this.chartType = 'line';
    this.customStartDate = '';
    this.customEndDate = '';
    this.onTimeRangeChange();
    this.loadWeeklyRevenue();
  }

  // Modal state cho báo cáo
  showReportModal: boolean = false;
  
  // Filter riêng cho modal báo cáo (không ảnh hưởng đến filter chính)
  reportTimeRange: string = 'month';
  reportCustomStartDate: string = '';
  reportCustomEndDate: string = '';
  
  // Dữ liệu báo cáo riêng (để không ảnh hưởng đến dữ liệu chính)
  reportDetailedStats: DetailedStatisticsDTO | null = null;
  reportReportTableData: Array<{
    period: string;
    totalOrders: number;
    onlineOrders: number;
    offlineOrders: number;
    successfulOrders: number;
    failedOrders: number;
    productsSold: number;
    newCustomers: number;
    returningCustomers: number;
    discountsUsed: number;
    totalRevenue: number;
    discountAmount: number;
    actualRevenue: number;
    actualCollected: number;
    outstandingDebt: number;
    growth: string;
  }> = [];

  exportReport() {
    // Mở modal hiển thị thông tin báo cáo
    console.log('🔄 [Dashboard] Opening report information modal...');
    console.log('   - Current selectedTimeRange:', this.selectedTimeRange);
    
    // Khởi tạo filter báo cáo từ filter hiện tại
    // Map selectedTimeRange sang reportTimeRange (có thể khác nhau)
    if (this.selectedTimeRange === 'custom') {
      this.reportTimeRange = 'custom';
      this.reportCustomStartDate = this.customStartDate || '';
      this.reportCustomEndDate = this.customEndDate || '';
    } else {
      // Map các giá trị: 'day', 'week', 'month', 'quarter', 'year'
      // Đảm bảo luôn có giá trị hợp lệ
      const validPeriods = ['day', 'week', 'month', 'quarter', 'year'];
      if (validPeriods.includes(this.selectedTimeRange)) {
        this.reportTimeRange = this.selectedTimeRange;
      } else {
        // Nếu không khớp, mặc định là 'month'
        this.reportTimeRange = 'month';
      }
      this.reportCustomStartDate = '';
      this.reportCustomEndDate = '';
    }
    
    console.log('   - Set reportTimeRange to:', this.reportTimeRange);
    
    // Reset dữ liệu trước khi load
    this.reportDetailedStats = null;
    this.reportReportTableData = [];
    
    // Load dữ liệu cho báo cáo
    this.loadReportData();
    
    this.showReportModal = true;
  }

  closeReportModal() {
    this.showReportModal = false;
  }

  onReportTimeRangeChange() {
    console.log('🔄 [Dashboard] Report time range changed to:', this.reportTimeRange);
    
    // Nếu chọn custom, khởi tạo date range mặc định
    if (this.reportTimeRange === 'custom') {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      this.reportCustomEndDate = this.formatDateForInput(today);
      this.reportCustomStartDate = this.formatDateForInput(thirtyDaysAgo);
    } else {
      // Reset custom dates khi chọn filter khác
      this.reportCustomStartDate = '';
      this.reportCustomEndDate = '';
    }
    
    // Reload dữ liệu báo cáo
    this.loadReportData();
  }

  onReportCustomDateChange() {
    console.log('🔄 [Dashboard] Report custom date changed:', {
      startDate: this.reportCustomStartDate,
      endDate: this.reportCustomEndDate
    });
    
    // Validate dates
    if (this.reportCustomStartDate && this.reportCustomEndDate) {
      if (new Date(this.reportCustomStartDate) > new Date(this.reportCustomEndDate)) {
        console.warn('⚠️ Start date is after end date');
        return;
      }
      this.loadReportData();
    }
  }

  loadReportData() {
    console.log('🔄 [Dashboard] Loading report data for filter:', this.reportTimeRange);
    
    // Load dữ liệu theo filter đã chọn trong modal
    if (this.reportTimeRange === 'custom') {
      if (this.reportCustomStartDate && this.reportCustomEndDate) {
        this.loadReportDataByDateRange(this.reportCustomStartDate, this.reportCustomEndDate);
      }
    } else {
      this.loadReportDataByPeriod(this.reportTimeRange as 'day' | 'week' | 'month' | 'quarter' | 'year');
    }
  }

  loadReportDataByPeriod(period: 'day' | 'week' | 'month' | 'quarter' | 'year') {
    console.log('🔄 [Dashboard] Loading report data for period:', period);
    
    // Load detailed statistics từ API mới
    this.statisticsService.getDetailedStatistics(period).subscribe({
      next: (response) => {
        console.log('✅ [Dashboard] Detailed statistics received:', response);
        if (response) {
          this.reportDetailedStats = response;
          console.log('📊 [Dashboard] Report detailed stats:', {
            tongDonHang: response.tongDonHang,
            donOnline: response.donOnline,
            donOffline: response.donOffline,
            donThanhCong: response.donThanhCong,
            donThatBai: response.donThatBai,
            khachHangMoi: response.khachHangMoi,
            khachHangQuayLai: response.khachHangQuayLai,
            tongSoKhachHang: response.tongSoKhachHang,
            luotGiamGia: response.luotGiamGia,
            tong: response.tong,
            thucThu: response.thucThu,
            duNo: response.duNo
          });
          this.generateReportTableData(period);
          console.log('📋 [Dashboard] Generated table data rows:', this.reportReportTableData.length);
        } else {
          console.warn('⚠️ [Dashboard] Response is null or undefined');
          this.reportDetailedStats = null;
          this.reportReportTableData = [];
        }
      },
      error: (error) => {
        console.error('❌ [Dashboard] Error loading detailed statistics:', error);
        console.error('   - Error details:', error.error);
        console.error('   - Status:', error.status);
        this.reportDetailedStats = null;
        this.reportReportTableData = [];
      }
    });
  }

  generateReportTableData(period: 'day' | 'week' | 'month' | 'quarter' | 'year') {
    this.reportReportTableData = [];
    
    if (!this.reportDetailedStats) {
      return;
    }
    
    // Sử dụng dữ liệu từ backend nếu có
    if (this.reportDetailedStats.chiTietTheoPeriod && this.reportDetailedStats.chiTietTheoPeriod.length > 0) {
      this.reportReportTableData = this.reportDetailedStats.chiTietTheoPeriod.map((item, index) => ({
        period: item.period,
        totalOrders: item.tongDonHang,
        onlineOrders: item.donOnline,
        offlineOrders: item.donOffline,
        successfulOrders: item.donThanhCong,
        failedOrders: item.donThatBai,
        productsSold: item.soSanPhamDaBan,
        newCustomers: item.khachHangMoi,
        returningCustomers: item.khachHangQuayLai,
        discountsUsed: item.luotGiamGia,
        totalRevenue: Number(item.tong),
        discountAmount: Number(item.tienGiam),
        actualRevenue: Number(item.thucThu),
        actualCollected: Number(item.thuThucTe || 0),
        outstandingDebt: Number(item.duNo),
        growth: item.tangTruong || '0.0%'
      }));
      console.log('📋 [Dashboard] Using backend period details:', this.reportReportTableData.length, 'rows');
      return;
    }
    
    // Fallback: Generate data based on period (nếu backend chưa có dữ liệu)
    const today = new Date();
    const stats = this.reportDetailedStats;
    
    // Generate data based on period
    if (period === 'day') {
      // Hôm nay: hiển thị thông tin hôm nay
      this.reportReportTableData.push({
        period: `Ngày ${today.getDate()}/${today.getMonth() + 1}`,
        totalOrders: stats.tongDonHang,
        onlineOrders: stats.donOnline,
        offlineOrders: stats.donOffline,
        successfulOrders: stats.donThanhCong,
        failedOrders: stats.donThatBai,
        productsSold: stats.soSanPhamDaBan,
        newCustomers: stats.khachHangMoi,
        returningCustomers: stats.khachHangQuayLai,
        discountsUsed: stats.luotGiamGia,
        totalRevenue: Number(stats.tong),
        discountAmount: Number(stats.tienGiam),
        actualRevenue: Number(stats.thucThu),
        actualCollected: Number(stats.thuThucTe || 0),
        outstandingDebt: Number(stats.duNo),
        growth: '0.0'
      });
    } else if (period === 'week') {
      // Tuần: hiển thị 7 ngày trong tuần hiện tại
      const dayOfWeek = today.getDay();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - dayOfWeek);
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        this.reportReportTableData.push({
          period: `Ngày ${date.getDate()}/${date.getMonth() + 1}`,
          totalOrders: Math.floor(stats.tongDonHang / 7),
          onlineOrders: Math.floor(stats.donOnline / 7),
          offlineOrders: Math.floor(stats.donOffline / 7),
          successfulOrders: Math.floor(stats.donThanhCong / 7),
          failedOrders: Math.floor(stats.donThatBai / 7),
          productsSold: Math.floor(stats.soSanPhamDaBan / 7),
          newCustomers: Math.floor(stats.khachHangMoi / 7),
          returningCustomers: Math.floor(stats.khachHangQuayLai / 7),
          discountsUsed: Math.floor(stats.luotGiamGia / 7),
          totalRevenue: Math.floor(Number(stats.tong) / 7),
          discountAmount: Math.floor(Number(stats.tienGiam) / 7),
          actualRevenue: Math.floor(Number(stats.thucThu) / 7),
          actualCollected: Math.floor(Number(stats.thucThu) / 7),
          outstandingDebt: Math.floor(Number(stats.duNo) / 7),
          growth: '0.0'
        });
      }
    } else if (period === 'month') {
      // Tháng: hiển thị các tuần trong tháng hiện tại
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
      const firstDayWeek = firstDayOfMonth.getDay();
      const daysInMonth = lastDayOfMonth.getDate();
      const weeksInMonth = Math.ceil((daysInMonth + firstDayWeek) / 7);
      
      for (let week = 0; week < weeksInMonth; week++) {
        this.reportReportTableData.push({
          period: `Tuần ${week + 1}`,
          totalOrders: Math.floor(stats.tongDonHang / weeksInMonth),
          onlineOrders: Math.floor(stats.donOnline / weeksInMonth),
          offlineOrders: Math.floor(stats.donOffline / weeksInMonth),
          successfulOrders: Math.floor(stats.donThanhCong / weeksInMonth),
          failedOrders: Math.floor(stats.donThatBai / weeksInMonth),
          productsSold: Math.floor(stats.soSanPhamDaBan / weeksInMonth),
          newCustomers: Math.floor(stats.khachHangMoi / weeksInMonth),
          returningCustomers: Math.floor(stats.khachHangQuayLai / weeksInMonth),
          discountsUsed: Math.floor(stats.luotGiamGia / weeksInMonth),
          totalRevenue: Math.floor(Number(stats.tong) / weeksInMonth),
          discountAmount: Math.floor(Number(stats.tienGiam) / weeksInMonth),
          actualRevenue: Math.floor(Number(stats.thucThu) / weeksInMonth),
          actualCollected: Math.floor(Number(stats.thucThu) / weeksInMonth),
          outstandingDebt: Math.floor(Number(stats.duNo) / weeksInMonth),
          growth: '0.0'
        });
      }
    } else if (period === 'quarter') {
      // Quý: hiển thị các tháng trong quý hiện tại
      const currentMonth = today.getMonth() + 1;
      let quarterStartMonth: number;
      
      if (currentMonth >= 1 && currentMonth <= 3) {
        quarterStartMonth = 1;
      } else if (currentMonth >= 4 && currentMonth <= 6) {
        quarterStartMonth = 4;
      } else if (currentMonth >= 7 && currentMonth <= 9) {
        quarterStartMonth = 7;
      } else {
        quarterStartMonth = 10;
      }
      
      for (let i = 0; i < 3; i++) {
        const month = quarterStartMonth + i;
        this.reportReportTableData.push({
          period: `Tháng ${month}`,
          totalOrders: Math.floor(stats.tongDonHang / 3),
          onlineOrders: Math.floor(stats.donOnline / 3),
          offlineOrders: Math.floor(stats.donOffline / 3),
          successfulOrders: Math.floor(stats.donThanhCong / 3),
          failedOrders: Math.floor(stats.donThatBai / 3),
          productsSold: Math.floor(stats.soSanPhamDaBan / 3),
          newCustomers: Math.floor(stats.khachHangMoi / 3),
          returningCustomers: Math.floor(stats.khachHangQuayLai / 3),
          discountsUsed: Math.floor(stats.luotGiamGia / 3),
          totalRevenue: Math.floor(Number(stats.tong) / 3),
          discountAmount: Math.floor(Number(stats.tienGiam) / 3),
          actualRevenue: Math.floor(Number(stats.thucThu) / 3),
          actualCollected: Math.floor(Number(stats.thucThu) / 3),
          outstandingDebt: Math.floor(Number(stats.duNo) / 3),
          growth: '0.0'
        });
      }
    } else if (period === 'year') {
      // Năm: hiển thị các quý trong năm (4 quý)
      for (let quarter = 1; quarter <= 4; quarter++) {
        this.reportReportTableData.push({
          period: `Quý ${quarter}`,
          totalOrders: Math.floor(stats.tongDonHang / 4),
          onlineOrders: Math.floor(stats.donOnline / 4),
          offlineOrders: Math.floor(stats.donOffline / 4),
          successfulOrders: Math.floor(stats.donThanhCong / 4),
          failedOrders: Math.floor(stats.donThatBai / 4),
          productsSold: Math.floor(stats.soSanPhamDaBan / 4),
          newCustomers: Math.floor(stats.khachHangMoi / 4),
          returningCustomers: Math.floor(stats.khachHangQuayLai / 4),
          discountsUsed: Math.floor(stats.luotGiamGia / 4),
          totalRevenue: Math.floor(Number(stats.tong) / 4),
          discountAmount: Math.floor(Number(stats.tienGiam) / 4),
          actualRevenue: Math.floor(Number(stats.thucThu) / 4),
          actualCollected: Math.floor(Number(stats.thucThu) / 4),
          outstandingDebt: Math.floor(Number(stats.duNo) / 4),
          growth: '0.0'
        });
      }
    }
  }

  loadReportDataByDateRange(startDate: string, endDate: string) {
    // Load detailed statistics từ API mới
    this.statisticsService.getDetailedStatisticsByDateRange(startDate, endDate).subscribe({
      next: (response) => {
        if (response) {
          this.reportDetailedStats = response;
          this.generateReportTableDataForDateRange(startDate, endDate);
        }
      },
      error: (error) => {
        console.error('❌ [Dashboard] Error loading detailed statistics by date range:', error);
        this.reportDetailedStats = null;
        this.reportReportTableData = [];
      }
    });
  }

  generateReportTableDataForDateRange(startDate: string, endDate: string) {
    this.reportReportTableData = [];
    
    if (!this.reportDetailedStats) {
      return;
    }
    
    const stats = this.reportDetailedStats;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    // If range is less than 30 days, show daily data
    if (diffDays <= 30) {
      for (let i = 0; i < diffDays; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        const dateLabel = `Ngày ${date.getDate()}/${date.getMonth() + 1}`;
        
        this.reportReportTableData.push({
          period: dateLabel,
          totalOrders: Math.floor(stats.tongDonHang / diffDays),
          onlineOrders: Math.floor(stats.donOnline / diffDays),
          offlineOrders: Math.floor(stats.donOffline / diffDays),
          successfulOrders: Math.floor(stats.donThanhCong / diffDays),
          failedOrders: Math.floor(stats.donThatBai / diffDays),
          productsSold: Math.floor(stats.soSanPhamDaBan / diffDays),
          newCustomers: Math.floor(stats.khachHangMoi / diffDays),
          returningCustomers: Math.floor(stats.khachHangQuayLai / diffDays),
          discountsUsed: Math.floor(stats.luotGiamGia / diffDays),
          totalRevenue: Math.floor(Number(stats.tong) / diffDays),
          discountAmount: Math.floor(Number(stats.tienGiam) / diffDays),
          actualRevenue: Math.floor(Number(stats.thucThu) / diffDays),
          actualCollected: Math.floor(Number(stats.thucThu) / diffDays),
          outstandingDebt: Math.floor(Number(stats.duNo) / diffDays),
          growth: '0.0'
        });
      }
    } else {
      // If range is more than 30 days, show monthly data
      const startMonth = start.getMonth() + 1;
      const startYear = start.getFullYear();
      const endMonth = end.getMonth() + 1;
      const endYear = end.getFullYear();
      
      let monthCount = 0;
      let currentMonth = startMonth;
      let currentYear = startYear;
      
      while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
        monthCount++;
        this.reportReportTableData.push({
          period: `Tháng ${currentMonth}`,
          totalOrders: Math.floor(stats.tongDonHang / monthCount),
          onlineOrders: Math.floor(stats.donOnline / monthCount),
          offlineOrders: Math.floor(stats.donOffline / monthCount),
          successfulOrders: Math.floor(stats.donThanhCong / monthCount),
          failedOrders: Math.floor(stats.donThatBai / monthCount),
          productsSold: Math.floor(stats.soSanPhamDaBan / monthCount),
          newCustomers: Math.floor(stats.khachHangMoi / monthCount),
          returningCustomers: Math.floor(stats.khachHangQuayLai / monthCount),
          discountsUsed: Math.floor(stats.luotGiamGia / monthCount),
          totalRevenue: Math.floor(Number(stats.tong) / monthCount),
          discountAmount: Math.floor(Number(stats.tienGiam) / monthCount),
          actualRevenue: Math.floor(Number(stats.thucThu) / monthCount),
          actualCollected: Math.floor(Number(stats.thucThu) / monthCount),
          outstandingDebt: Math.floor(Number(stats.duNo) / monthCount),
          growth: '0.0'
        });
        
        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
      }
    }
  }

  getPeriodLabel(period: string): string {
    const labels: { [key: string]: string } = {
      'day': 'Hôm nay',
      'week': 'Tuần',
      'month': 'Tháng',
      'quarter': 'Quý',
      'year': 'Năm',
      'custom': 'Tùy chọn'
    };
    return labels[period] || period;
  }


  getTimeRangeLabel(): string {
    const labels: { [key: string]: string } = {
      'day': 'Hôm nay',
      'week': 'Tuần này',
      'month': 'Tháng này',
      'year': 'Năm nay',
      'custom': 'Tùy chọn'
    };
    return labels[this.selectedTimeRange] || 'Không xác định';
  }

  getReportTimeRangeLabel(): string {
    return this.getPeriodLabel(this.reportTimeRange);
  }

  getCurrentDate(): string {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  }

  formatDateDisplay(dateString: string): string {
    if (!dateString) return 'N/A';
    // dateString format: yyyy-MM-dd
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  }

  // Hàm tính toán dữ liệu cho bảng báo cáo (sử dụng dữ liệu riêng của modal)
  getReportTableData(): Array<{
    period: string;
    totalOrders: number;
    onlineOrders: number;
    offlineOrders: number;
    successfulOrders: number;
    failedOrders: number;
    productsSold: number;
    newCustomers: number;
    returningCustomers: number;
    discountsUsed: number;
    totalRevenue: number;
    discountAmount: number;
    actualRevenue: number;
    actualCollected: number;
    outstandingDebt: number;
    growth: string;
  }> {
    return this.reportReportTableData;
  }

  // New calculation methods for the updated table structure
  getTotalOrders(): number {
    if (this.reportDetailedStats) {
      return this.reportDetailedStats.tongDonHang;
    }
    const data = this.getReportTableData();
    if (data.length === 0) return 0;
    return data.reduce((sum, item) => sum + item.totalOrders, 0);
  }

  getTotalOnlineOrders(): number {
    if (this.reportDetailedStats) {
      return this.reportDetailedStats.donOnline;
    }
    const data = this.getReportTableData();
    if (data.length === 0) return 0;
    return data.reduce((sum, item) => sum + item.onlineOrders, 0);
  }

  getTotalOfflineOrders(): number {
    if (this.reportDetailedStats) {
      return this.reportDetailedStats.donOffline;
    }
    const data = this.getReportTableData();
    if (data.length === 0) return 0;
    return data.reduce((sum, item) => sum + item.offlineOrders, 0);
  }

  getTotalSuccessfulOrders(): number {
    if (this.reportDetailedStats) {
      return this.reportDetailedStats.donThanhCong;
    }
    const data = this.getReportTableData();
    if (data.length === 0) return 0;
    return data.reduce((sum, item) => sum + item.successfulOrders, 0);
  }

  getTotalFailedOrders(): number {
    if (this.reportDetailedStats) {
      return this.reportDetailedStats.donThatBai;
    }
    const data = this.getReportTableData();
    if (data.length === 0) return 0;
    return data.reduce((sum, item) => sum + item.failedOrders, 0);
  }

  getTotalProductsSold(): number {
    if (this.reportDetailedStats) {
      return this.reportDetailedStats.soSanPhamDaBan;
    }
    const data = this.getReportTableData();
    if (data.length === 0) return 0;
    return data.reduce((sum, item) => sum + item.productsSold, 0);
  }

  getTotalNewCustomers(): number {
    if (this.reportDetailedStats) {
      return this.reportDetailedStats.khachHangMoi;
    }
    const data = this.getReportTableData();
    if (data.length === 0) return 0;
    return data.reduce((sum, item) => sum + item.newCustomers, 0);
  }

  getTotalReturningCustomers(): number {
    if (this.reportDetailedStats) {
      return this.reportDetailedStats.khachHangQuayLai;
    }
    const data = this.getReportTableData();
    if (data.length === 0) return 0;
    return data.reduce((sum, item) => sum + item.returningCustomers, 0);
  }

  getTotalDiscountsUsed(): number {
    if (this.reportDetailedStats) {
      return this.reportDetailedStats.luotGiamGia;
    }
    const data = this.getReportTableData();
    if (data.length === 0) return 0;
    return data.reduce((sum, item) => sum + item.discountsUsed, 0);
  }

  getTotalDiscountAmount(): number {
    if (this.reportDetailedStats) {
      return Number(this.reportDetailedStats.tienGiam);
    }
    const data = this.getReportTableData();
    if (data.length === 0) return 0;
    return data.reduce((sum, item) => sum + item.discountAmount, 0);
  }

  getAverageOrders(): number {
    const data = this.getReportTableData();
    if (data.length === 0) return 0;
    const total = data.reduce((sum, item) => sum + item.totalOrders, 0);
    return Math.round(total / data.length);
  }

  getAverageOnlineOrders(): number {
    const data = this.getReportTableData();
    if (data.length === 0) return 0;
    const total = data.reduce((sum, item) => sum + item.onlineOrders, 0);
    return Math.round(total / data.length);
  }

  getAverageOfflineOrders(): number {
    const data = this.getReportTableData();
    if (data.length === 0) return 0;
    const total = data.reduce((sum, item) => sum + item.offlineOrders, 0);
    return Math.round(total / data.length);
  }

  getAverageSuccessfulOrders(): number {
    const data = this.getReportTableData();
    if (data.length === 0) return 0;
    const total = data.reduce((sum, item) => sum + item.successfulOrders, 0);
    return Math.round(total / data.length);
  }

  getAverageFailedOrders(): number {
    const data = this.getReportTableData();
    if (data.length === 0) return 0;
    const total = data.reduce((sum, item) => sum + item.failedOrders, 0);
    return Math.round(total / data.length);
  }

  getAverageProductsSold(): number {
    const data = this.getReportTableData();
    if (data.length === 0) return 0;
    const total = data.reduce((sum, item) => sum + item.productsSold, 0);
    return Math.round(total / data.length);
  }

  getAverageNewCustomers(): number {
    const data = this.getReportTableData();
    if (data.length === 0) return 0;
    const total = data.reduce((sum, item) => sum + item.newCustomers, 0);
    return Math.round(total / data.length);
  }

  getAverageReturningCustomers(): number {
    const data = this.getReportTableData();
    if (data.length === 0) return 0;
    const total = data.reduce((sum, item) => sum + item.returningCustomers, 0);
    return Math.round(total / data.length);
  }

  getAverageDiscountsUsed(): number {
    const data = this.getReportTableData();
    if (data.length === 0) return 0;
    const total = data.reduce((sum, item) => sum + item.discountsUsed, 0);
    return Math.round(total / data.length);
  }

  getAverageDiscountAmount(): number {
    if (this.reportDetailedStats) {
      const data = this.getReportTableData();
      if (data.length === 0) return Number(this.reportDetailedStats.tienGiam);
      const total = data.reduce((sum, item) => sum + item.discountAmount, 0);
      return Math.round(total / data.length);
    }
    const data = this.getReportTableData();
    if (data.length === 0) return 0;
    const total = data.reduce((sum, item) => sum + item.discountAmount, 0);
    return Math.round(total / data.length);
  }

  getAverageRevenue(): number {
    if (this.reportDetailedStats) {
      const data = this.getReportTableData();
      if (data.length === 0) return Number(this.reportDetailedStats.tong);
      const total = data.reduce((sum, item) => sum + item.totalRevenue, 0);
      return Math.round(total / data.length);
    }
    const data = this.getReportTableData();
    if (data.length === 0) return 0;
    const total = data.reduce((sum, item) => sum + item.totalRevenue, 0);
    return Math.round(total / data.length);
  }

  getAverageActualRevenue(): number {
    // Trung bình Thực Thu (tổng tất cả)
    if (this.reportDetailedStats) {
      const data = this.getReportTableData();
      if (data.length === 0) return Number(this.reportDetailedStats.thucThu);
      const total = data.reduce((sum, item) => sum + item.actualRevenue, 0);
      return Math.round(total / data.length);
    }
    const data = this.getReportTableData();
    if (data.length === 0) return 0;
    const total = data.reduce((sum, item) => sum + item.actualRevenue, 0);
    return Math.round(total / data.length);
  }

  getAverageThuThucTe(): number {
    // Trung bình Thu Thực tế (đã hoàn thành)
    if (this.reportDetailedStats) {
      const data = this.getReportTableData();
      if (data.length === 0) return Number(this.reportDetailedStats.thuThucTe || 0);
      const total = data.reduce((sum, item) => sum + item.actualCollected, 0);
      return Math.round(total / data.length);
    }
    const data = this.getReportTableData();
    if (data.length === 0) return 0;
    const total = data.reduce((sum, item) => sum + item.actualCollected, 0);
    return Math.round(total / data.length);
  }

  getAverageDebtRevenue(): number {
    if (this.reportDetailedStats) {
      const data = this.getReportTableData();
      if (data.length === 0) return Number(this.reportDetailedStats.duNo);
      const total = data.reduce((sum, item) => sum + item.outstandingDebt, 0);
      return Math.round(total / data.length);
    }
    const data = this.getReportTableData();
    if (data.length === 0) return 0;
    const total = data.reduce((sum, item) => sum + item.outstandingDebt, 0);
    return Math.round(total / data.length);
  }

  // Percentage methods
  getOnlineOrdersPercentage(): number {
    const total = this.getTotalOrders();
    if (total === 0) return 0;
    return Math.round((this.getTotalOnlineOrders() / total) * 100);
  }

  getOfflineOrdersPercentage(): number {
    const total = this.getTotalOrders();
    if (total === 0) return 0;
    return Math.round((this.getTotalOfflineOrders() / total) * 100);
  }

  getSuccessfulOrdersPercentage(): number {
    const total = this.getTotalOrders();
    if (total === 0) return 0;
    return Math.round((this.getTotalSuccessfulOrders() / total) * 100);
  }

  getFailedOrdersPercentage(): number {
    const total = this.getTotalOrders();
    if (total === 0) return 0;
    return Math.round((this.getTotalFailedOrders() / total) * 100);
  }

  getProductsSoldPercentage(): number {
    // Tỷ lệ / tổng của trường số sản phẩm đã bán là 100%
    return 100;
  }

  getNewCustomersPercentage(): number {
    // Tỷ lệ / tổng của khách hàng mới = (tổng khách hàng mới / tổng khách hàng của các hóa đơn) x 100%
    if (this.reportDetailedStats) {
      const tongSoKhachHang = this.reportDetailedStats.tongSoKhachHang || 0;
      const khachHangMoi = this.getTotalNewCustomers();
      
      console.log('📊 [Dashboard] getNewCustomersPercentage:', {
        khachHangMoi,
        tongSoKhachHang,
        percentage: tongSoKhachHang === 0 ? 0 : Math.round((khachHangMoi / tongSoKhachHang) * 100)
      });
      
      if (tongSoKhachHang === 0) return 0;
      return Math.round((khachHangMoi / tongSoKhachHang) * 100);
    }
    return 0;
  }

  getReturningCustomersPercentage(): number {
    // Tỷ lệ / tổng của khách hàng quay lại = (tổng khách hàng quay lại / tổng khách hàng của các hóa đơn) x 100%
    if (this.reportDetailedStats) {
      const tongSoKhachHang = this.reportDetailedStats.tongSoKhachHang || 0;
      const khachHangQuayLai = this.getTotalReturningCustomers();
      
      console.log('📊 [Dashboard] getReturningCustomersPercentage:', {
        khachHangQuayLai,
        tongSoKhachHang,
        percentage: tongSoKhachHang === 0 ? 0 : Math.round((khachHangQuayLai / tongSoKhachHang) * 100)
      });
      
      if (tongSoKhachHang === 0) return 0;
      return Math.round((khachHangQuayLai / tongSoKhachHang) * 100);
    }
    return 0;
  }

  getDiscountsUsedPercentage(): number {
    // Tỷ lệ / tổng của trường lượt giảm giá = (tổng số lượt giảm giá / số hóa đơn) x 100%
    const total = this.getTotalOrders();
    if (total === 0) return 0;
    return Math.round((this.getTotalDiscountsUsed() / total) * 100);
  }

  getDiscountAmountPercentage(): number {
    if (this.reportDetailedStats) {
      const tong = Number(this.reportDetailedStats.tong);
      const tienGiam = Number(this.reportDetailedStats.tienGiam);
      if (tong === 0) return 0;
      return Math.round((tienGiam / tong) * 100 * 10) / 10;
    }
    return 0;
  }

  getTotalRevenue(): number {
    if (this.reportDetailedStats) {
      return Number(this.reportDetailedStats.tong);
    }
    const data = this.getReportTableData();
    if (data.length === 0) return 0;
    return data.reduce((sum, item) => sum + item.totalRevenue, 0);
  }

  getThucThu(): number {
    // Tổng Thực Thu: Tổng thành tiền của TẤT CẢ các hóa đơn (không phân biệt trạng thái)
    if (this.reportDetailedStats) {
      return Number(this.reportDetailedStats.thucThu);
    }
    const data = this.getReportTableData();
    if (data.length === 0) return 0;
    return data.reduce((sum, item) => sum + item.actualRevenue, 0);
  }

  getThuThucTe(): number {
    // Tổng Thu Thực tế: Tổng thành tiền của các hóa đơn có trạng thái DA_GIAO_HANG (đã hoàn thành)
    if (this.reportDetailedStats) {
      return Number(this.reportDetailedStats.thuThucTe || 0);
    }
    const data = this.getReportTableData();
    if (data.length === 0) return 0;
    return data.reduce((sum, item) => sum + item.actualCollected, 0);
  }

  getDuNo(): number {
    if (this.reportDetailedStats) {
      return Number(this.reportDetailedStats.duNo);
    }
    const data = this.getReportTableData();
    if (data.length === 0) return 0;
    return data.reduce((sum, item) => sum + item.outstandingDebt, 0);
  }

  getActualRevenuePercentage(): number {
    // Tỷ lệ Thực Thu / Tổng
    if (this.reportDetailedStats) {
      const tong = Number(this.reportDetailedStats.tong);
      const thucThu = Number(this.reportDetailedStats.thucThu);
      if (tong === 0) return 0;
      return Math.round((thucThu / tong) * 100 * 10) / 10;
    }
    return 0;
  }

  getThuThucTePercentage(): number {
    // Tỷ lệ Thu Thực tế / Tổng
    if (this.reportDetailedStats) {
      const tong = Number(this.reportDetailedStats.tong);
      const thuThucTe = Number(this.reportDetailedStats.thuThucTe || 0);
      if (tong === 0) return 0;
      return Math.round((thuThucTe / tong) * 100 * 10) / 10;
    }
    return 0;
  }

  getDebtPercentage(): number {
    if (this.reportDetailedStats) {
      const tong = Number(this.reportDetailedStats.tong);
      const duNo = Number(this.reportDetailedStats.duNo);
      if (tong === 0) return 0;
      return Math.round((duNo / tong) * 100 * 10) / 10;
    }
    return 0;
  }

  // Modal state cho chỉnh sửa mẫu
  showTemplateModal: boolean = false;
  templateFile: File | null = null;
  templateFileName: string = '';
  isUploading: boolean = false;

  editReportTemplate() {
    // Mở modal chỉnh sửa mẫu
    console.log('🔄 [Dashboard] Opening report template editor modal...');
    this.showTemplateModal = true;
  }

  closeTemplateModal() {
    this.showTemplateModal = false;
    this.templateFile = null;
    this.templateFileName = '';
  }

  downloadTemplate() {
    // Tải mẫu Word template
    console.log('📥 [Dashboard] Downloading Word template...');
    
    // Tạo nội dung Word template đơn giản (HTML format có thể convert sang Word)
    const templateContent = this.generateWordTemplate();
    
    // Tạo Blob từ HTML content
    const blob = new Blob([templateContent], { type: 'application/msword' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Mau_Bao_Cao_Thong_Ke_TDK_Store.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log('✅ [Dashboard] Word template downloaded');
    alert('Đã tải mẫu Word thành công! Bạn có thể mở file và chỉnh sửa.');
  }

  private generateWordTemplate(): string {
    // Tạo nội dung HTML cho Word template
    const template = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Mẫu Báo Cáo Thống Kê TDK Store</title>
    <style>
        body { font-family: 'Times New Roman', serif; font-size: 12pt; margin: 20px; }
        h1 { color: #febc49; text-align: center; }
        h2 { color: #495057; border-bottom: 2px solid #febc49; padding-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #febc49; color: white; }
        .summary { background-color: #f8f9fa; padding: 10px; margin: 10px 0; border-left: 4px solid #febc49; }
    </style>
</head>
<body>
    <h1>BÁO CÁO THỐNG KÊ TDK STORE</h1>
    
    <div class="summary">
        <p><strong>Khoảng thời gian:</strong> {{timeRange}}</p>
        <p><strong>Ngày tạo báo cáo:</strong> {{currentDate}}</p>
    </div>
    
    <h2>1. TỔNG QUAN DOANH THU</h2>
    <table>
        <tr>
            <th>Chỉ tiêu</th>
            <th>Giá trị</th>
        </tr>
        <tr>
            <td>Tổng doanh thu</td>
            <td>{{totalRevenue}} ₫</td>
        </tr>
        <tr>
            <td>Số đơn hàng</td>
            <td>{{totalOrders}}</td>
        </tr>
    </table>
    
    <h2>2. SẢN PHẨM BÁN CHẠY</h2>
    <table>
        <tr>
            <th>STT</th>
            <th>Tên sản phẩm</th>
            <th>Số lượng đã bán</th>
            <th>Giá bán</th>
        </tr>
        {{bestSellingProducts}}
    </table>
    
    <h2>3. GHI CHÚ</h2>
    <p>Bạn có thể chỉnh sửa nội dung này trực tiếp trong file Word.</p>
    <p>Các placeholder như {{timeRange}}, {{totalRevenue}} sẽ được thay thế tự động khi xuất báo cáo.</p>
    
    <p style="margin-top: 30px; text-align: right;">
        <em>Được tạo bởi hệ thống TDK Store</em>
    </p>
</body>
</html>`;
    
    return template;
  }

  onTemplateFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Kiểm tra định dạng file
      if (!file.name.toLowerCase().endsWith('.doc') && 
          !file.name.toLowerCase().endsWith('.docx') &&
          !file.name.toLowerCase().endsWith('.html')) {
        alert('Vui lòng chọn file Word (.doc, .docx) hoặc HTML (.html)!');
        return;
      }
      
      this.templateFile = file;
      this.templateFileName = file.name;
      console.log('✅ [Dashboard] Template file selected:', file.name);
    }
  }

  openFileDialog() {
    const input = document.getElementById('templateFileInput') as HTMLInputElement;
    if (input) {
      input.click();
    }
  }

  uploadTemplate() {
    if (!this.templateFile) {
      alert('Vui lòng chọn file mẫu trước khi tải lên!');
      return;
    }
    
    this.isUploading = true;
    console.log('📤 [Dashboard] Uploading template file:', this.templateFileName);
    
    // Tạo FormData để upload file
    const formData = new FormData();
    formData.append('template', this.templateFile);
    formData.append('type', 'report_template');
    
    // Lưu vào localStorage (trong thực tế có thể upload lên server)
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // Lưu thông tin file vào localStorage
        const fileInfo = {
          name: this.templateFileName,
          size: this.templateFile!.size,
          type: this.templateFile!.type,
          lastModified: this.templateFile!.lastModified,
          content: e.target?.result // Lưu base64 hoặc text content
        };
        
        localStorage.setItem('reportTemplateFile', JSON.stringify(fileInfo));
        
        console.log('✅ [Dashboard] Template file saved to localStorage');
        alert('Đã tải lên và lưu mẫu thành công!\n\nFile: ' + this.templateFileName + '\nKhi xuất báo cáo, mẫu này sẽ được sử dụng.');
        
        this.isUploading = false;
        this.closeTemplateModal();
      } catch (error) {
        console.error('❌ [Dashboard] Error saving template:', error);
        alert('Lỗi khi lưu mẫu file!');
        this.isUploading = false;
      }
    };
    
    // Đọc file dạng text để lưu vào localStorage
    reader.readAsText(this.templateFile);
  }

  private getReportTemplateConfig() {
    // Lấy cấu hình mẫu từ localStorage hoặc default
    const savedConfig = localStorage.getItem('reportTemplateConfig');
    if (savedConfig) {
      try {
        return JSON.parse(savedConfig);
      } catch (e) {
        console.error('Error parsing report template config:', e);
      }
    }
    
    // Cấu hình mặc định
    return {
      format: 'Excel',
      title: 'Báo Cáo Thống Kê TDK Store',
      includeChart: true,
      includeTable: true,
      includeSummary: true,
      dateRange: this.selectedTimeRange
    };
  }

  saveReportTemplateConfig(config: any) {
    // Lưu cấu hình mẫu vào localStorage
    try {
      localStorage.setItem('reportTemplateConfig', JSON.stringify(config));
      console.log('✅ [Dashboard] Report template config saved:', config);
      alert('Đã lưu cấu hình mẫu báo cáo thành công!');
    } catch (e) {
      console.error('❌ [Dashboard] Error saving report template config:', e);
      alert('Lỗi khi lưu cấu hình mẫu báo cáo!');
    }
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
          // Đổi tất cả màu thành #d0875a như yêu cầu
          this.channelData = response.data
            .filter(item => item !== null && item !== undefined)
            .map((item) => ({
              label: item.channel || 'Không xác định',
              value: item.count || 0,
              color: '#d0875a' // Màu đồng nhất cho tất cả kênh
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
              { label: 'Online', value: 0, color: '#d0875a' },
              { label: 'Tại quầy', value: 0, color: '#d0875a' }
            ];
            this.channelTotal = 0;
            this.generateDonutSegments(this.channelData, this.channelSegments);
            this.cdr.detectChanges();
          }
        } else {
          console.warn('⚠️ [Dashboard] Invalid response structure:', response);
          this.channelData = [
            { label: 'Online', value: 0, color: '#d0875a' },
            { label: 'Tại quầy', value: 0, color: '#d0875a' }
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
          // Filter loại bỏ sản phẩm hết hàng (quantity = 0) vì đã có bảng riêng
          this.lowStockProducts = response.data
            .filter(product => product.soLuongTon > 0) // Chỉ lấy sản phẩm còn hàng (> 0)
            .map((product, index) => ({
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
   * Load out of stock products (products with quantity = 0)
   */
  loadOutOfStockProducts() {
    console.log('🔄 [Dashboard] Loading out of stock products...');
    
    // Gọi API với threshold = 0 để lấy sản phẩm hết hàng
    this.statisticsService.getLowStockProducts(0, 10).subscribe({
      next: (response) => {
        console.log('✅ [Dashboard] Out of stock products loaded:', response);
        
        if (response && response.data) {
          // Filter chỉ lấy sản phẩm có quantity = 0
          this.outOfStockProducts = response.data
            .filter(product => product.soLuongTon === 0)
            .map((product, index) => ({
              rank: index + 1,
              name: product.tenSanPham,
              quantity: product.soLuongTon
            }));
          
          console.log(`✅ [Dashboard] Loaded ${this.outOfStockProducts.length} out of stock products`);
          this.cdr.detectChanges();
        } else {
          console.warn('⚠️ [Dashboard] No data in response');
          this.outOfStockProducts = [];
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('❌ [Dashboard] Error loading out of stock products:', error);
        this.outOfStockProducts = [];
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

  /**
   * Load danh sách khách hàng mới (5 khách hàng mới nhất) theo filter thời gian
   */
  loadNewCustomers() {
    console.log('🔄 [Dashboard] Loading new customers with filter:', this.newCustomersFilter);
    
    this.khachHangService.getAllKhachHang(0, 50, 'id', 'desc').subscribe({
      next: (response) => {
        console.log('✅ [Dashboard] New customers loaded:', response);
        
        if (response && response.content) {
          // Filter khách hàng theo thời gian
          const filteredCustomers = this.filterCustomersByTime(response.content, this.newCustomersFilter);
          // Lấy 5 khách hàng mới nhất sau khi filter
          this.newCustomers = filteredCustomers.slice(0, 5);
          console.log(`✅ [Dashboard] Loaded ${this.newCustomers.length} new customers (filter: ${this.newCustomersFilter})`);
          this.cdr.detectChanges();
        } else {
          console.warn('⚠️ [Dashboard] No customers data in response');
          this.newCustomers = [];
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('❌ [Dashboard] Error loading new customers:', error);
        this.newCustomers = [];
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Filter khách hàng theo thời gian (hôm nay, tuần này, tháng này, custom)
   */
  filterCustomersByTime(customers: KhachHang[], filter: 'today' | 'week' | 'month' | 'custom'): KhachHang[] {
    if (!customers || customers.length === 0) {
      return [];
    }

    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (filter) {
      case 'today':
        // Hôm nay: từ 00:00:00 hôm nay đến hiện tại
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        break;
      case 'week':
        // Tuần này: từ đầu tuần (Thứ 2) đến hiện tại
        const dayOfWeek = now.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ...
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Nếu là Chủ nhật thì lùi 6 ngày, còn lại lùi (dayOfWeek - 1) ngày
        startDate = new Date(now);
        startDate.setDate(now.getDate() - daysToMonday);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        // Tháng này: từ ngày 1 tháng hiện tại đến hiện tại
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        break;
      case 'custom':
        // Tùy chọn: sử dụng ngày từ custom date range
        if (this.newCustomersCustomStartDate && this.newCustomersCustomEndDate) {
          startDate = new Date(this.newCustomersCustomStartDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(this.newCustomersCustomEndDate);
          endDate.setHours(23, 59, 59, 999);
        } else {
          // Nếu chưa chọn ngày, return empty array
          return [];
        }
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    }

    return customers.filter(customer => {
      if (!customer.ngayTao) {
        return false;
      }

      const customerDate = new Date(customer.ngayTao);
      return customerDate >= startDate && customerDate <= endDate;
    });
  }

  /**
   * Thay đổi filter thời gian cho khách hàng mới
   */
  onNewCustomersFilterChange(filter: 'today' | 'week' | 'month' | 'custom') {
    console.log('🔄 [Dashboard] New customers filter changed to:', filter);
    this.newCustomersFilter = filter;
    
    // Nếu chọn custom, khởi tạo date range mặc định (30 ngày gần nhất)
    if (filter === 'custom') {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      this.newCustomersCustomEndDate = this.formatDateForInput(today);
      this.newCustomersCustomStartDate = this.formatDateForInput(thirtyDaysAgo);
      
      // Load dữ liệu với date range mặc định
      this.loadNewCustomers();
    } else {
      // Reset custom dates khi chọn filter khác
      this.newCustomersCustomStartDate = '';
      this.newCustomersCustomEndDate = '';
      this.loadNewCustomers();
    }
  }

  /**
   * Xử lý khi thay đổi custom date range cho khách hàng mới
   */
  onNewCustomersCustomDateChange() {
    console.log('🔄 [Dashboard] New customers custom date changed:', {
      startDate: this.newCustomersCustomStartDate,
      endDate: this.newCustomersCustomEndDate
    });
    
    // Validate dates
    if (this.newCustomersCustomStartDate && this.newCustomersCustomEndDate) {
      if (new Date(this.newCustomersCustomStartDate) > new Date(this.newCustomersCustomEndDate)) {
        console.warn('⚠️ Start date is after end date');
        return;
      }
      this.loadNewCustomers();
    }
  }
}
