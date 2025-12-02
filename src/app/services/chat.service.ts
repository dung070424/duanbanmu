import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, interval } from 'rxjs';
import { map, catchError, switchMap, startWith } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Conversation, ChatMessage, SendMessageRequest } from '../interfaces/chat.interface';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = `${environment.apiUrl}/chat`;
  private currentConversationSubject = new BehaviorSubject<Conversation | null>(null);
  public currentConversation$ = this.currentConversationSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
  }

  /**
   * Lấy hoặc tạo conversation cho khách hàng
   */
  getOrCreateConversation(khachHangId: number): Observable<Conversation> {
    return this.http.get<Conversation>(
      `${this.apiUrl}/customer/conversation?khachHangId=${khachHangId}`,
      { headers: this.getHeaders() }
    ).pipe(
      map(conversation => {
        console.log('✅ Successfully got conversation:', conversation);
        this.currentConversationSubject.next(conversation);
        return conversation;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Error getting conversation:', error);
        let errorMessage = 'Lỗi khi tải cuộc trò chuyện';
        
        if (error.error) {
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          } else if (error.error.error) {
            errorMessage = error.error.error;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        console.error('Error message:', errorMessage);
        console.error('Status:', error.status);
        console.error('Status text:', error.statusText);
        
        // Tạo error object với message rõ ràng
        const customError = new Error(errorMessage);
        (customError as any).status = error.status;
        (customError as any).originalError = error;
        return throwError(() => customError);
      })
    );
  }

  /**
   * Gửi tin nhắn từ khách hàng
   */
  sendCustomerMessage(request: SendMessageRequest): Observable<ChatMessage> {
    console.log('📤 Sending customer message:', JSON.stringify(request, null, 2));
    
    // Validate request trước khi gửi
    if (!request.khachHangId) {
      console.error('❌ khachHangId is missing');
      return throwError(() => new Error('khachHangId không được để trống'));
    }
    
    if (!request.noiDung || !request.noiDung.trim()) {
      console.error('❌ noiDung is missing or empty');
      return throwError(() => new Error('Nội dung tin nhắn không được để trống'));
    }
    
    return this.http.post<any>(
      `${this.apiUrl}/customer/message`,
      request,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => {
        console.log('✅ Raw response:', response);
        
        // Backend có thể trả về object trực tiếp hoặc trong wrapper
        const message = response?.data || response;
        
        if (!message) {
          console.error('❌ Response does not contain message data');
          throw new Error('Response không chứa message data');
        }
        
        console.log('✅ Message sent successfully:', message);
        
        // Cập nhật conversation với tin nhắn mới
        const currentConversation = this.currentConversationSubject.value;
        if (currentConversation && currentConversation.id === message.conversationId) {
          if (!currentConversation.messages) {
            currentConversation.messages = [];
          }
          currentConversation.messages.push(message);
          this.currentConversationSubject.next(currentConversation);
        }
        
        return message as ChatMessage;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Error sending customer message:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error statusText:', error.statusText);
        console.error('❌ Error error:', error.error);
        console.error('❌ Full error:', JSON.stringify(error, null, 2));
        
        let errorMessage = 'Lỗi khi gửi tin nhắn';
        
        if (error.error) {
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error.error) {
            errorMessage = error.error.error;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        console.error('Parsed error message:', errorMessage);
        
        // Tạo error object với message rõ ràng
        const customError = new Error(errorMessage);
        (customError as any).status = error.status;
        (customError as any).originalError = error;
        return throwError(() => customError);
      })
    );
  }

  /**
   * Lấy conversation theo ID
   */
  getConversationById(conversationId: number): Observable<Conversation> {
    console.log('📥 Fetching conversation:', conversationId);
    return this.http.get<Conversation>(
      `${this.apiUrl}/conversation/${conversationId}`,
      { headers: this.getHeaders() }
    ).pipe(
      map(conversation => {
        console.log('📥 Raw conversation response:', conversation);
        
        // Debug: Log suggestedProducts trong messages
        if (conversation.messages) {
          conversation.messages.forEach((msg, index) => {
            if (msg.suggestedProducts) {
              console.log(`✅ Message ${index} has suggestedProducts:`, msg.suggestedProducts.length, 'products');
              msg.suggestedProducts.forEach((p, pIndex) => {
                console.log(`  Product ${pIndex}:`, {
                  id: p.id,
                  name: p.tenSanPham,
                  hasImage: !!p.anhSanPham,
                  imageLength: p.anhSanPham ? p.anhSanPham.length : 0
                });
              });
            }
          });
        }
        
        if (conversation.id === this.currentConversationSubject.value?.id) {
          this.currentConversationSubject.next(conversation);
        }
        return conversation;
      }),
      catchError(error => {
        console.error('Error getting conversation:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Lấy danh sách conversation chờ phản hồi (cho staff/admin)
   */
  getWaitingConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(
      `${this.apiUrl}/staff/conversations/waiting`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => {
        console.error('Error getting waiting conversations:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Lấy danh sách conversation của nhân viên
   */
  getStaffConversations(nhanVienId: number): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(
      `${this.apiUrl}/staff/conversations?nhanVienId=${nhanVienId}`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => {
        console.error('Error getting staff conversations:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Gửi tin nhắn từ nhân viên
   */
  sendStaffMessage(request: SendMessageRequest): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(
      `${this.apiUrl}/staff/message`,
      request,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => {
        console.error('Error sending staff message:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Nhân viên nhận conversation
   */
  assignConversationToStaff(conversationId: number, nhanVienId: number): Observable<Conversation> {
    return this.http.post<Conversation>(
      `${this.apiUrl}/staff/conversation/${conversationId}/assign?nhanVienId=${nhanVienId}`,
      {},
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => {
        console.error('Error assigning conversation:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Đánh dấu tin nhắn đã đọc
   */
  markMessagesAsRead(conversationId: number, nhanVienId: number): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/conversation/${conversationId}/mark-read?nhanVienId=${nhanVienId}`,
      {},
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => {
        console.error('Error marking messages as read:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Đóng conversation
   */
  closeConversation(conversationId: number): Observable<Conversation> {
    return this.http.post<Conversation>(
      `${this.apiUrl}/conversation/${conversationId}/close`,
      {},
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => {
        console.error('Error closing conversation:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Polling để lấy tin nhắn mới (cho real-time updates)
   */
  startPollingMessages(conversationId: number, intervalMs: number = 3000): Observable<Conversation> {
    return interval(intervalMs).pipe(
      startWith(0),
      switchMap(() => this.getConversationById(conversationId))
    );
  }

  /**
   * Format thời gian hiển thị
   */
  formatMessageTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Vừa xong';
    } else if (diffMins < 60) {
      return `${diffMins} phút trước`;
    } else if (diffHours < 24) {
      return `${diffHours} giờ trước`;
    } else if (diffDays < 7) {
      return `${diffDays} ngày trước`;
    } else {
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }
}

