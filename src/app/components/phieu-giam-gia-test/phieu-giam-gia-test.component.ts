import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhieuGiamGiaService } from '../../services/phieu-giam-gia.service';
import { PhieuGiamGiaRequest } from '../../interfaces/phieu-giam-gia.interface';

@Component({
  selector: 'app-phieu-giam-gia-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mt-4">
      <div class="row">
        <div class="col-12">
          <h2>PhieuGiamGia API Test</h2>
          
          <div class="card mb-3">
            <div class="card-header">
              <h5>API Connection Status</h5>
            </div>
            <div class="card-body">
              <div *ngIf="connectionStatus === 'testing'" class="alert alert-info">
                <i class="bi bi-hourglass-split"></i> Testing connection...
              </div>
              <div *ngIf="connectionStatus === 'success'" class="alert alert-success">
                <i class="bi bi-check-circle"></i> Connection successful!
              </div>
              <div *ngIf="connectionStatus === 'error'" class="alert alert-danger">
                <i class="bi bi-x-circle"></i> Connection failed: {{ errorMessage }}
              </div>
              
              <button class="btn btn-primary" (click)="testConnection()" [disabled]="connectionStatus === 'testing'">
                Test Connection
              </button>
            </div>
          </div>

          <div class="card mb-3">
            <div class="card-header">
              <h5>Sample Data</h5>
            </div>
            <div class="card-body">
              <div *ngIf="sampleDataStatus === 'creating'" class="alert alert-info">
                <i class="bi bi-hourglass-split"></i> Creating sample data...
              </div>
              <div *ngIf="sampleDataStatus === 'success'" class="alert alert-success">
                <i class="bi bi-check-circle"></i> Sample data created successfully!
              </div>
              <div *ngIf="sampleDataStatus === 'error'" class="alert alert-danger">
                <i class="bi bi-x-circle"></i> Failed to create sample data: {{ sampleDataMessage }}
              </div>
              
              <button class="btn btn-success" (click)="createSampleData()" [disabled]="sampleDataStatus === 'creating'">
                Create Sample Data
              </button>
            </div>
          </div>

          <div class="card mb-3">
            <div class="card-header">
              <h5>PhieuGiamGia Data</h5>
            </div>
            <div class="card-body">
              <div *ngIf="dataStatus === 'loading'" class="alert alert-info">
                <i class="bi bi-hourglass-split"></i> Loading data...
              </div>
              <div *ngIf="dataStatus === 'success'" class="alert alert-success">
                <i class="bi bi-check-circle"></i> Loaded {{ dataCount }} records
              </div>
              <div *ngIf="dataStatus === 'error'" class="alert alert-danger">
                <i class="bi bi-x-circle"></i> Failed to load data: {{ dataMessage }}
              </div>
              
              <button class="btn btn-info" (click)="loadData()" [disabled]="dataStatus === 'loading'">
                Load Data
              </button>
            </div>
          </div>

          <div class="card mb-3">
            <div class="card-header">
              <h5>Create New PhieuGiamGia</h5>
            </div>
            <div class="card-body">
              <div *ngIf="createStatus === 'creating'" class="alert alert-info">
                <i class="bi bi-hourglass-split"></i> Creating new record...
              </div>
              <div *ngIf="createStatus === 'success'" class="alert alert-success">
                <i class="bi bi-check-circle"></i> Record created successfully!
              </div>
              <div *ngIf="createStatus === 'error'" class="alert alert-danger">
                <i class="bi bi-x-circle"></i> Failed to create record: {{ createMessage }}
              </div>
              
              <button class="btn btn-warning" (click)="createNewRecord()" [disabled]="createStatus === 'creating'">
                Create New Record
              </button>
            </div>
          </div>

          <div class="card mb-3" *ngIf="phieuGiamGiaList.length > 0">
            <div class="card-header">
              <h5>PhieuGiamGia List</h5>
            </div>
            <div class="card-body">
              <div class="table-responsive">
                <table class="table table-striped">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Mã Phiếu</th>
                      <th>Tên Phiếu</th>
                      <th>Loại</th>
                      <th>Giá Trị Giảm</th>
                      <th>Số Lượng</th>
                      <th>Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let item of phieuGiamGiaList">
                      <td>{{ item.id }}</td>
                      <td>{{ item.maPhieu }}</td>
                      <td>{{ item.tenPhieu }}</td>
                      <td>{{ item.loaiGiamGiaText }}</td>
                      <td>{{ item.giaTriGiam }}</td>
                      <td>{{ item.soLuong }}</td>
                      <td>
                        <span [class]="item.trangThai ? 'badge bg-success' : 'badge bg-danger'">
                          {{ item.trangThaiText }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card {
      margin-bottom: 1rem;
    }
    .btn {
      margin-right: 0.5rem;
    }
  `]
})
export class PhieuGiamGiaTestComponent implements OnInit {
  private phieuGiamGiaService = inject(PhieuGiamGiaService);

  connectionStatus: 'idle' | 'testing' | 'success' | 'error' = 'idle';
  errorMessage: string = '';
  
  sampleDataStatus: 'idle' | 'creating' | 'success' | 'error' = 'idle';
  sampleDataMessage: string = '';
  
  dataStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  dataMessage: string = '';
  dataCount: number = 0;
  phieuGiamGiaList: any[] = [];
  
  createStatus: 'idle' | 'creating' | 'success' | 'error' = 'idle';
  createMessage: string = '';

  ngOnInit(): void {
    this.testConnection();
  }

  testConnection(): void {
    this.connectionStatus = 'testing';
    this.errorMessage = '';
    
    this.phieuGiamGiaService.testApi().subscribe({
      next: (response: any) => {
        console.log('API Test Response:', response);
        this.connectionStatus = 'success';
      },
      error: (error: any) => {
        console.error('API Test Error:', error);
        this.connectionStatus = 'error';
        this.errorMessage = error.message || 'Unknown error occurred';
      }
    });
  }

  createSampleData(): void {
    this.sampleDataStatus = 'creating';
    this.sampleDataMessage = '';
    
    this.phieuGiamGiaService.createSampleData().subscribe({
      next: (response: any) => {
        console.log('Sample Data Response:', response);
        this.sampleDataStatus = 'success';
        this.sampleDataMessage = response.message || 'Sample data created successfully';
      },
      error: (error: any) => {
        console.error('Sample Data Error:', error);
        this.sampleDataStatus = 'error';
        this.sampleDataMessage = error.message || 'Unknown error occurred';
      }
    });
  }

  loadData(): void {
    this.dataStatus = 'loading';
    this.dataMessage = '';
    
    this.phieuGiamGiaService.searchPhieuGiamGia('').subscribe({
      next: (response: any) => {
        console.log('Data Response:', response);
        this.dataStatus = 'success';
        this.phieuGiamGiaList = response.content || [];
        this.dataCount = this.phieuGiamGiaList.length;
      },
      error: (error: any) => {
        console.error('Data Error:', error);
        this.dataStatus = 'error';
        this.dataMessage = error.message || 'Unknown error occurred';
      }
    });
  }

  createNewRecord(): void {
    this.createStatus = 'creating';
    this.createMessage = '';
    
    const now = new Date();
    const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    
    const request: PhieuGiamGiaRequest = {
      maPhieu: `PGG_TEST_${Date.now()}`,
      tenPhieuGiamGia: 'Test Voucher',
      loaiPhieuGiamGia: false, // false = phần trăm
      giaTriGiam: 10,
      giaTriToiThieu: 100000,
      soTienToiDa: 50000,
      hoaDonToiThieu: 100000,
      soLuongDung: 50,
      ngayBatDau: startDate.toISOString().split('T')[0],
      ngayKetThuc: endDate.toISOString().split('T')[0],
      trangThai: true,
      isPublic: true // Mặc định là công khai cho test
    };
    
    this.phieuGiamGiaService.createPhieuGiamGia(request).subscribe({
      next: (response: any) => {
        console.log('Create Response:', response);
        this.createStatus = 'success';
        this.createMessage = 'Record created successfully!';
        // Reload data to show new record
        this.loadData();
      },
      error: (error: any) => {
        console.error('Create Error:', error);
        this.createStatus = 'error';
        this.createMessage = error.message || 'Unknown error occurred';
      }
    });
  }
}
