import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth';
import { EmployeeService } from '../../services/employee.service';
import { Conversation, ChatMessage, SendMessageRequest } from '../../interfaces/chat.interface';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-chat-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-management.component.html',
  styleUrls: ['./chat-management.component.scss']
})
export class ChatManagementComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer', { static: false }) messagesContainer!: ElementRef;
  @ViewChild('messageInput', { static: false }) messageInput!: ElementRef;

  conversations: Conversation[] = [];
  selectedConversation: Conversation | null = null;
  messages: ChatMessage[] = [];
  newMessage = '';
  isLoading = false;
  nhanVienId: number | null = null;
  nhanVienTen: string = '';
  
  // Filters
  filterType: 'waiting' | 'assigned' | 'all' = 'waiting';
  
  private pollingSubscription?: Subscription;
  private conversationsPollingSubscription?: Subscription;

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private employeeService: EmployeeService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadStaffInfo();
    this.loadConversations();
  }

  ngOnDestroy(): void {
    this.stopPolling();
    if (this.conversationsPollingSubscription) {
      this.conversationsPollingSubscription.unsubscribe();
    }
  }

  /**
   * Load thông tin nhân viên
   */
  loadStaffInfo(): void {
    const user = this.authService.getCurrentUser();
    if (user && user.id) {
      // Lấy danh sách nhân viên và tìm theo userId
      this.employeeService.getAllEmployees().subscribe({
        next: (employees) => {
          // Tìm nhân viên có userId trùng với user.id
          const employee = employees.find(emp => (emp as any).userId === user.id);
          if (employee && employee.id) {
            this.nhanVienId = employee.id;
            this.nhanVienTen = employee.tenNhanVien || (employee as any).hoTen || 'Nhân viên';
          } else {
            // Fallback: thử dùng user.id làm nhanVienId
            console.warn('Employee not found for user, using user.id as fallback');
            this.nhanVienId = user.id;
            this.nhanVienTen = user.username || 'Nhân viên';
          }
        },
        error: (error) => {
          console.error('Error loading staff info:', error);
          // Fallback: sử dụng user ID
          if (user.id) {
            this.nhanVienId = user.id;
            this.nhanVienTen = user.username || 'Nhân viên';
          }
        }
      });
    }
  }

  /**
   * Load danh sách conversations
   */
  loadConversations(): void {
    this.isLoading = true;

    let conversationObservable;
    if (this.filterType === 'waiting') {
      conversationObservable = this.chatService.getWaitingConversations();
    } else if (this.filterType === 'assigned' && this.nhanVienId) {
      conversationObservable = this.chatService.getStaffConversations(this.nhanVienId);
    } else {
      // Load cả waiting và assigned
      conversationObservable = this.chatService.getWaitingConversations();
    }

    conversationObservable.subscribe({
      next: (conversations) => {
        this.conversations = conversations;
        this.isLoading = false;
        this.cdr.detectChanges();

        // Nếu có conversation được chọn, reload nó
        if (this.selectedConversation) {
          const updatedConversation = conversations.find(c => c.id === this.selectedConversation?.id);
          if (updatedConversation) {
            this.selectConversation(updatedConversation);
          }
        }

        // Bắt đầu polling để cập nhật danh sách conversations
        this.startConversationsPolling();
      },
      error: (error) => {
        console.error('Error loading conversations:', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * Chọn conversation
   */
  selectConversation(conversation: Conversation): void {
    this.selectedConversation = conversation;
    this.messages = conversation.messages || [];
    this.scrollToBottom();

    // Đánh dấu tin nhắn đã đọc nếu có nhân viên ID
    if (conversation.id && this.nhanVienId) {
      this.chatService.markMessagesAsRead(conversation.id, this.nhanVienId).subscribe({
        next: () => {
          // Cập nhật conversation
          conversation.soTinNhanChuaDoc = 0;
        },
        error: (error) => {
          console.error('Error marking messages as read:', error);
        }
      });
    }

    // Bắt đầu polling để lấy tin nhắn mới
    if (conversation.id) {
      this.startPolling(conversation.id);
    }

    // Nhận conversation nếu chưa có nhân viên
    if (conversation.id && !conversation.nhanVienId && this.nhanVienId) {
      this.assignConversation(conversation.id);
    }
  }

  /**
   * Nhận conversation
   */
  assignConversation(conversationId: number): void {
    if (!this.nhanVienId) {
      return;
    }

    this.chatService.assignConversationToStaff(conversationId, this.nhanVienId).subscribe({
      next: (conversation) => {
        this.selectedConversation = conversation;
        // Reload conversations để cập nhật danh sách
        this.loadConversations();
      },
      error: (error) => {
        console.error('Error assigning conversation:', error);
      }
    });
  }

  /**
   * Gửi tin nhắn từ nhân viên
   */
  sendMessage(): void {
    if (!this.newMessage.trim() || !this.selectedConversation || !this.nhanVienId) {
      return;
    }

    const messageText = this.newMessage.trim();
    this.newMessage = '';

    // Thêm tin nhắn vào UI ngay lập tức (optimistic update)
    const staffMessage: ChatMessage = {
      id: Date.now(), // Temporary ID
      conversationId: this.selectedConversation.id,
      loaiNguoiGui: 'NHAN_VIEN',
      nhanVienId: this.nhanVienId,
      nhanVienTen: this.nhanVienTen,
      noiDung: messageText,
      thoiGianGui: new Date().toISOString(),
      tuDongTraLoi: false,
      daDoc: true
    };
    this.messages.push(staffMessage);
    this.scrollToBottom();

    // Gửi tin nhắn đến server
    const request: SendMessageRequest = {
      conversationId: this.selectedConversation.id,
      noiDung: messageText,
      nhanVienId: this.nhanVienId
    };

    this.isLoading = true;
    this.chatService.sendStaffMessage(request).subscribe({
      next: (sentMessage) => {
        // Cập nhật tin nhắn với ID từ server
        const index = this.messages.findIndex(m => m.id === staffMessage.id);
        if (index !== -1) {
          this.messages[index] = sentMessage;
        } else {
          this.messages.push(sentMessage);
        }
        this.isLoading = false;
        this.scrollToBottom();

        // Reload conversation để cập nhật trạng thái
        if (this.selectedConversation?.id) {
          this.chatService.getConversationById(this.selectedConversation.id).subscribe({
            next: (updatedConversation) => {
              this.selectedConversation = updatedConversation;
              this.messages = updatedConversation.messages || [];
              this.scrollToBottom();
            }
          });
        }

        // Reload danh sách conversations
        this.loadConversations();
      },
      error: (error) => {
        console.error('Error sending message:', error);
        this.isLoading = false;
        // Xóa tin nhắn lỗi
        this.messages = this.messages.filter(m => m.id !== staffMessage.id);
      }
    });
  }

  /**
   * Xử lý phím Enter
   */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /**
   * Bắt đầu polling để lấy tin nhắn mới
   */
  startPolling(conversationId: number): void {
    this.stopPolling();
    this.pollingSubscription = this.chatService.startPollingMessages(conversationId, 2000)
      .subscribe({
        next: (conversation) => {
          if (conversation && conversation.messages) {
            // Chỉ cập nhật nếu có tin nhắn mới
            if (conversation.messages.length > this.messages.length) {
              this.messages = conversation.messages;
              this.scrollToBottom();
              
              // Đánh dấu tin nhắn đã đọc
              if (this.nhanVienId) {
                this.chatService.markMessagesAsRead(conversationId, this.nhanVienId).subscribe();
              }
            }
          }
        },
        error: (error) => {
          console.error('Error polling messages:', error);
        }
      });
  }

  /**
   * Bắt đầu polling để cập nhật danh sách conversations
   */
  startConversationsPolling(): void {
    if (this.conversationsPollingSubscription) {
      this.conversationsPollingSubscription.unsubscribe();
    }

    this.conversationsPollingSubscription = interval(5000).subscribe(() => {
      this.loadConversations();
    });
  }

  /**
   * Dừng polling
   */
  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
  }

  /**
   * Scroll đến tin nhắn cuối cùng
   */
  scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    }, 100);
  }

  /**
   * Format thời gian hiển thị
   */
  formatTime(dateString: string): string {
    return this.chatService.formatMessageTime(dateString);
  }

  /**
   * Kiểm tra xem có phải tin nhắn từ khách hàng không
   */
  isCustomerMessage(message: ChatMessage): boolean {
    return message.loaiNguoiGui === 'KHACH_HANG';
  }

  /**
   * Kiểm tra xem có phải tin nhắn từ nhân viên không
   */
  isStaffMessage(message: ChatMessage): boolean {
    return message.loaiNguoiGui === 'NHAN_VIEN';
  }

  /**
   * Kiểm tra xem có phải tin nhắn từ chatbot không
   */
  isChatbotMessage(message: ChatMessage): boolean {
    return message.loaiNguoiGui === 'CHATBOT';
  }

  /**
   * Thay đổi filter
   */
  changeFilter(filterType: 'waiting' | 'assigned' | 'all'): void {
    this.filterType = filterType;
    this.selectedConversation = null;
    this.messages = [];
    this.loadConversations();
  }

  /**
   * Đếm số conversation chờ phản hồi
   */
  getWaitingCount(): number {
    return this.conversations.filter(c => c.dangChoPhanHoi && c.trangThai === 'DANG_CHO').length;
  }

  /**
   * Đếm số tin nhắn chưa đọc
   */
  getUnreadCount(conversation: Conversation): number {
    return conversation.soTinNhanChuaDoc || 0;
  }

  /**
   * Lấy label cho trạng thái
   */
  getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'DANG_CHO': 'Đang chờ',
      'DANG_XU_LY': 'Đang xử lý',
      'DA_HOAN_THANH': 'Đã hoàn thành',
      'DA_DONG': 'Đã đóng'
    };
    return statusMap[status] || status;
  }

  /**
   * Đóng conversation
   */
  closeConversation(conversationId: number): void {
    if (!confirm('Bạn có chắc chắn muốn đóng cuộc trò chuyện này?')) {
      return;
    }

    this.chatService.closeConversation(conversationId).subscribe({
      next: (conversation: Conversation) => {
        this.selectedConversation = conversation;
        // Reload conversations để cập nhật danh sách
        this.loadConversations();
      },
      error: (error: any) => {
        console.error('Error closing conversation:', error);
        alert('Không thể đóng cuộc trò chuyện. Vui lòng thử lại.');
      }
    });
  }
}

