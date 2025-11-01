import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StatisticsService, BestSellingProductDTO, PeriodStatisticsDTO, WeeklyRevenueDTO } from '../../services/statistics.service';

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
  selectedTimeRange: string = 'month';
  chartType: 'line' | 'column' = 'line';
  
  totalOrders: number = 73;
  totalRevenue: number = 2058210000;
  
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

  brandData: { label: string; value: number; color: string }[] = [];
  brandSegments: { arc: number; offset: number; color: string }[] = [];

  statsTableData: {
    period: string;
    revenue: number;
    orders: number;
    avgOrderValue: number;
    growth: string;
    status: string;
  }[] = [];

  circumference = 2 * Math.PI * 70; // r=70

  constructor(private statisticsService: StatisticsService) {}

  ngOnInit() {
    this.loadPeriodStatistics();
    this.loadWeeklyRevenue();
    this.loadBestSellingProducts();
    this.generateOrderStatusChart();
    this.generateChannelChart();
    this.generateBrandChart();
    this.generateStatsTable();
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
          }
        },
        error: (error) => {
          console.error(`❌ [Dashboard] Error loading ${period} statistics:`, error);
          // Giữ nguyên dữ liệu mặc định (0) nếu có lỗi
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
    // Reload data based on selected time range
    this.loadWeeklyRevenue();
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
    // Dữ liệu theo ảnh với filter "Tháng"
    if (this.orderStatusFilter === 'month') {
      this.orderStatusData = [
        { label: 'Chờ xác nhận', value: 2, color: '#f472b6' }, // Pink
        { label: 'Chờ giao hàng', value: 3, color: '#fbbf24' }, // Yellow
        { label: 'Đang giao', value: 1, color: '#14b8a6' }, // Teal
        { label: 'Hoàn thành', value: 120, color: '#a855f7' }, // Purple
        { label: 'Đã hủy', value: 14, color: '#ef4444' } // Red
      ];
    } else {
      // Dữ liệu cho Day hoặc Year
      this.orderStatusData = [
        { label: 'Chờ xác nhận', value: 5, color: '#f472b6' }, // Pink
        { label: 'Chờ giao hàng', value: 36, color: '#fbbf24' }, // Yellow
        { label: 'Đang giao', value: 3, color: '#14b8a6' }, // Teal
        { label: 'Hoàn thành', value: 120, color: '#a855f7' }, // Purple
        { label: 'Đã hủy', value: 14, color: '#ef4444' } // Red
      ];
    }
    this.orderStatusTotal = this.orderStatusData.reduce((sum, item) => sum + item.value, 0);
    this.generateDonutSegments(this.orderStatusData, this.orderStatusSegments);
  }

  generateChannelChart() {
    this.channelData = [
      { label: 'Online', value: 88, color: '#f472b6' }, // Pink
      { label: 'Tại quầy', value: 55, color: '#3b82f6' }, // Blue
      { label: 'trực tiếp', value: 33, color: '#f472b6' } // Pink
    ];
    this.channelTotal = this.channelData.reduce((sum, item) => sum + item.value, 0);
    this.generateDonutSegments(this.channelData, this.channelSegments);
  }

  generateBrandChart() {
    this.brandData = [
      { label: 'Apple', value: 4712900000, color: '#f472b6' }, // Pink
      { label: 'Samsung', value: 245090000, color: '#3b82f6' }, // Blue
      { label: 'Xiaomi', value: 150000000, color: '#fbbf24' }, // Yellow
      { label: 'Oppo', value: 80000000, color: '#14b8a6' } // Teal
    ];
    this.generateDonutSegments(this.brandData, this.brandSegments);
  }

  generateDonutSegments(data: { label: string; value: number; color: string }[], segmentsArray: any[]) {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let acc = 0;
    segmentsArray.length = 0;
    
    data.forEach((item) => {
      const arc = (item.value / total) * this.circumference;
      const segment = {
        arc,
        offset: this.circumference - acc,
        color: item.color,
        value: item.value
      };
      segmentsArray.push(segment);
      acc += arc;
    });
  }

  setOrderStatusFilter(filter: 'day' | 'month' | 'year') {
    this.orderStatusFilter = filter;
    // Reload data based on filter
    this.generateOrderStatusChart();
  }

  generateStatsTable() {
    this.statsTableData = [
      {
        period: 'Hôm nay',
        revenue: 28880000,
        orders: 2,
        avgOrderValue: 14440000,
        growth: '+0%',
        status: 'Xuất sắc'
      },
      {
        period: 'Tuần này',
        revenue: 111890000,
        orders: 4,
        avgOrderValue: 27972500,
        growth: '+0%',
        status: 'Xuất sắc'
      },
      {
        period: 'Tháng này',
        revenue: 2058210000,
        orders: 73,
        avgOrderValue: 28194658,
        growth: '+0%',
        status: 'Xuất sắc'
      }
    ];
  }
}
