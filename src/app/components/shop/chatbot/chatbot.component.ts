import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ChatService } from '../../../services/chat.service';
import { AuthService } from '../../../services/auth';
import { CustomerService } from '../../../services/customer.service';
import { Conversation, ChatMessage, SendMessageRequest } from '../../../interfaces/chat.interface';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss']
})
export class ChatbotComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer', { static: false }) messagesContainer!: ElementRef;
  @ViewChild('messageInput', { static: false }) messageInput!: ElementRef;

  private readonly GUEST_CHAT_ID_KEY = 'tdk_guest_chat_id';

  isOpen = false;
  isLoading = false;
  isSendingMessage = false; // Tách riêng trạng thái đang gửi tin nhắn
  currentConversation: Conversation | null = null;
  messages: ChatMessage[] = [];
  newMessage = '';
  khachHangId: number | null = null;
  customerName: string = '';
  isGuestSession = false;
  autoScrollEnabled = true;
  private pollingSubscription?: Subscription;
  private conversationSubscription?: Subscription;

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private customerService: CustomerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeCustomerContext();
  }

  ngOnDestroy(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
    if (this.conversationSubscription) {
      this.conversationSubscription.unsubscribe();
    }
  }

  private initializeCustomerContext(): void {
    if (this.authService.isLoggedIn()) {
      this.isGuestSession = false;
      this.loadCustomerInfo();
    } else {
      this.initializeGuestSession();
    }
  }

  /**
   * Load thông tin khách hàng
   */
  loadCustomerInfo(): void {
    this.customerService.getCurrentCustomer().subscribe({
      next: (customer) => {
        if (customer && customer.id) {
          this.khachHangId = customer.id;
          this.customerName = customer.tenKhachHang || customer.username || 'Khách hàng';
          // Tự động load conversation khi mở chatbot và đã có khachHangId
          if (this.isOpen && this.khachHangId) {
            this.loadConversation();
          }
        }
      },
      error: (error) => {
        console.error('Error loading customer info:', error);
        // Không block input nếu lỗi load customer info
        // Vẫn cho phép người dùng thử gửi tin nhắn
      }
    });
  }

  /**
   * Toggle chatbot (mở/đóng)
   */
  toggleChatbot(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.autoScrollEnabled = true;
      // Đảm bảo có danh tính khách hàng trước khi load conversation
      if (!this.khachHangId) {
        this.initializeCustomerContext();
      }

      if (this.khachHangId) {
        this.loadConversation();
      }

      // Focus vào input sau khi mở (đợi một chút để đảm bảo DOM đã render)
      setTimeout(() => {
        if (this.messageInput && this.messageInput.nativeElement) {
          this.messageInput.nativeElement.focus();
        }
        this.scrollToBottom(true);
      }, 300);
    } else {
      // Dừng polling khi đóng
      this.stopPolling();
    }
  }

  /**
   * Load conversation
   */
  loadConversation(): void {
    if (!this.khachHangId) {
      console.warn('⚠️ Cannot load conversation: khachHangId is null');
      return;
    }

    console.log('🔄 Loading conversation for khachHangId:', this.khachHangId);

    // Chỉ set loading khi chưa có conversation, không block input
    if (!this.currentConversation) {
      this.isLoading = true;
    }
    
    this.chatService.getOrCreateConversation(this.khachHangId).subscribe({
      next: (conversation) => {
        console.log('✅ Conversation loaded successfully:', conversation);
        this.currentConversation = conversation;
        this.messages = conversation.messages || [];
        this.isLoading = false;
        this.scrollToBottom();
        
        // Bắt đầu polling để lấy tin nhắn mới
        if (conversation.id) {
          this.startPolling(conversation.id);
        }

        // Subscribe để nhận updates
        if (this.conversationSubscription) {
          this.conversationSubscription.unsubscribe();
        }
        this.conversationSubscription = this.chatService.currentConversation$.subscribe(
          (updatedConversation) => {
            if (updatedConversation && updatedConversation.id === conversation.id) {
              this.currentConversation = updatedConversation;
              this.messages = updatedConversation.messages || [];
              this.scrollToBottom();
            }
          }
        );
      },
      error: (error) => {
        console.error('❌ Error loading conversation:', error);
        console.error('Error details:', {
          status: (error as any).status,
          message: error.message,
          error: (error as any).originalError?.error || error
        });
        this.isLoading = false;
        
        // Hiển thị thông báo lỗi chi tiết hơn
        let errorMessage = error.message || 'Xin lỗi, có lỗi xảy ra khi tải cuộc trò chuyện.';
        
        // Parse error từ backend
        const originalError = (error as any).originalError;
        if (originalError) {
          if (typeof originalError.error === 'string') {
            errorMessage = originalError.error;
          } else if (originalError.error?.message) {
            errorMessage = originalError.error.message;
          }
        } else if ((error as any).error) {
          if (typeof (error as any).error === 'string') {
            errorMessage = (error as any).error;
          } else if ((error as any).error?.message) {
            errorMessage = (error as any).error.message;
          }
        }
        
        // Chỉ hiển thị lỗi warning, không block input
        // Người dùng vẫn có thể gửi tin nhắn và conversation sẽ được tạo tự động
        if (this.messages.length === 0) {
          this.messages.push({
            id: 0,
            loaiNguoiGui: 'CHATBOT',
            noiDung: 'Xin chào! Bạn có thể bắt đầu trò chuyện bằng cách gửi tin nhắn. Hãy thử hỏi về sản phẩm, giá cả, hoặc thời gian hoạt động của shop.',
            thoiGianGui: new Date().toISOString(),
            tuDongTraLoi: true
          });
        }
        
        // Vẫn cho phép người dùng nhập tin nhắn (conversation sẽ được tạo khi gửi)
        this.scrollToBottom();
      }
    });
  }

  /**
   * Gửi tin nhắn
   */
  sendMessage(): void {
    if (!this.newMessage.trim() || !this.khachHangId || this.isSendingMessage) {
      if (!this.khachHangId) {
        console.warn('⚠️ Cannot send message: khachHangId is null');
      }
      return;
    }

    // Luôn gọi sendMessageInternal - nó sẽ tự động tạo conversation nếu cần
    this.sendMessageInternal();
  }

  /**
   * Internal method để gửi tin nhắn
   */
  private sendMessageInternal(): void {
    if (!this.newMessage.trim() || !this.khachHangId) {
      return;
    }

    const messageText = this.newMessage.trim();
    this.newMessage = '';

    // Thêm tin nhắn vào UI ngay lập tức (optimistic update)
    const userMessage: ChatMessage = {
      id: Date.now(), // Temporary ID
      conversationId: this.currentConversation?.id,
      loaiNguoiGui: 'KHACH_HANG',
      khachHangId: this.khachHangId!,
      noiDung: messageText,
      thoiGianGui: new Date().toISOString(),
      tuDongTraLoi: false,
      daDoc: true
    };
    this.messages.push(userMessage);

    // Hiển thị phản hồi AI ngay lập tức (optimistic auto-reply) thay vì 3 dấu chấm
    const autoReplyText = this.isProductRelated(messageText)
      ? this.buildProductHighlightMessage()
      : (this.isGreeting(messageText)
          ? 'Xin chào bạn! Rất vui được hỗ trợ. Bạn cần tư vấn sản phẩm hay thông tin gì không?'
          : 'Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi trong thời gian sớm nhất.');
    const optimisticBotMessage: ChatMessage = {
      id: -Date.now(), // id tạm âm để phân biệt
      conversationId: this.currentConversation?.id,
      loaiNguoiGui: 'CHATBOT',
      noiDung: autoReplyText,
      thoiGianGui: new Date().toISOString(),
      tuDongTraLoi: true,
      daDoc: false
    };
    this.messages.push(optimisticBotMessage);
    this.scrollToBottom();

    // Gửi tin nhắn đến server (backend sẽ tự động tạo conversation nếu chưa có)
    const request: SendMessageRequest = {
      conversationId: this.currentConversation?.id, // Có thể null, backend sẽ tự tạo
      noiDung: messageText,
      khachHangId: this.khachHangId!
    };

    // Không hiển thị "typing" vì đã có phản hồi optimistic
    this.isSendingMessage = false;
    console.log('📤 Sending message to server:', request);
    this.chatService.sendCustomerMessage(request).subscribe({
      next: (sentMessage) => {
        console.log('✅ Message sent successfully:', sentMessage);
        
        // Cập nhật conversation ID nếu đã được tạo
        if (sentMessage.conversationId && !this.currentConversation) {
          // Load conversation mới được tạo
          this.chatService.getConversationById(sentMessage.conversationId).subscribe({
            next: (conversation) => {
              this.currentConversation = conversation;
              this.messages = conversation.messages || [];
              this.scrollToBottom();
              
              // Bắt đầu polling
              if (conversation.id) {
                this.startPolling(conversation.id);
              }
            }
          });
        } else {
          // Cập nhật tin nhắn với ID từ server
          const index = this.messages.findIndex(m => m.id === userMessage.id);
          if (index !== -1) {
            this.messages[index] = sentMessage;
          } else {
            this.messages.push(sentMessage);
          }
        }
        
        this.isSendingMessage = false;
        this.scrollToBottom();

        // Reload conversation để lấy phản hồi từ chatbot
        const conversationId = sentMessage.conversationId || this.currentConversation?.id;
        if (conversationId) {
          setTimeout(() => {
            this.chatService.getConversationById(conversationId).subscribe({
              next: (updatedConversation) => {
                console.log('✅ Conversation updated with chatbot response:', updatedConversation);
                this.currentConversation = updatedConversation;
                // Thay thế list messages bằng dữ liệu từ server (tự loại bỏ message optimistic id âm)
                this.messages = (updatedConversation.messages || []);
                this.scrollToBottom();
                
                // Bắt đầu polling nếu chưa có
                if (updatedConversation.id && !this.pollingSubscription) {
                  this.startPolling(updatedConversation.id);
                }
              },
              error: (err) => {
                console.error('Error reloading conversation:', err);
              }
            });
          }, 1500); // Tăng thời gian chờ để chatbot có thời gian xử lý
        }
      },
      error: (error) => {
        console.error('❌ Error sending message:', error);
        console.error('Error details:', {
          status: (error as any).status,
          message: error.message,
          error: (error as any).originalError?.error || error
        });
        this.isSendingMessage = false;
        // Xóa tin nhắn lỗi
        this.messages = this.messages.filter(m => m.id !== userMessage.id);
        
        // Hiển thị thông báo lỗi chi tiết
        let errorMessage = error.message || 'Xin lỗi, có lỗi xảy ra khi gửi tin nhắn.';
        
        // Parse error từ backend
        const originalError = (error as any).originalError;
        if (originalError) {
          if (typeof originalError.error === 'string') {
            errorMessage = originalError.error;
          } else if (originalError.error?.message) {
            errorMessage = originalError.error.message;
          } else if (originalError.error?.error) {
            errorMessage = originalError.error.error;
          }
        } else if ((error as any).error) {
          if (typeof (error as any).error === 'string') {
            errorMessage = (error as any).error;
          } else if ((error as any).error?.message) {
            errorMessage = (error as any).error.message;
          } else if ((error as any).error?.error) {
            errorMessage = (error as any).error.error;
          }
        }
        
        this.messages.push({
          id: 0,
          loaiNguoiGui: 'CHATBOT',
          noiDung: errorMessage + ' Vui lòng thử lại.',
          thoiGianGui: new Date().toISOString(),
          tuDongTraLoi: true
        });
        this.scrollToBottom();
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
    this.pollingSubscription = this.chatService.startPollingMessages(conversationId, 3000)
      .subscribe({
        next: (conversation) => {
          if (conversation && conversation.messages) {
            // Chỉ cập nhật nếu có tin nhắn mới
            if (conversation.messages.length > this.messages.length) {
              this.messages = conversation.messages;
              this.scrollToBottom();
            }
          }
        },
        error: (error) => {
          console.error('Error polling messages:', error);
        }
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
  scrollToBottom(force: boolean = false): void {
    if (!force && !this.autoScrollEnabled) {
      return;
    }
    setTimeout(() => {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
        if (force) {
          this.autoScrollEnabled = true;
        }
      }
    }, 100);
  }

  onMessagesScroll(): void {
    if (!this.messagesContainer) {
      return;
    }
    const element = this.messagesContainer.nativeElement;
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    this.autoScrollEnabled = distanceFromBottom <= 80;
  }

  /**
   * Format thời gian hiển thị
   */
  formatTime(dateString: string): string {
    return this.chatService.formatMessageTime(dateString);
  }

  /**
   * Kiểm tra xem có phải tin nhắn từ chatbot không
   */
  isChatbotMessage(message: ChatMessage): boolean {
    return message.loaiNguoiGui === 'CHATBOT';
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
   * Phát hiện câu hỏi liên quan sản phẩm (đồng bộ với BE)
   */
  private isProductRelated(message: string): boolean {
    if (!message) return false;
    const lower = message.toLowerCase().trim();
    const sanitized = this.sanitizeText(lower);
    const keywords = [
      'sản phẩm', 'san pham', 'product',
      'mũ', 'mu', 'helmet', 'nón',
      'giá', 'gia', 'price', 'giá cả', 'gia ca',
      'mua', 'buy', 'purchase', 'đặt hàng', 'dat hang', 'order',
      'bán', 'ban', 'sell', 'có bán', 'co ban',
      'hàng', 'hang', 'item', 'goods',
      'kích thước', 'kich thuoc', 'size',
      'màu', 'mau', 'color', 'colour',
      'chất liệu', 'chat lieu', 'material',
      'thương hiệu', 'thuong hieu', 'brand',
      'model', 'mẫu', 'mau',
      'tồn kho', 'ton kho', 'stock', 'còn hàng', 'con hang',
      'giao hàng', 'giao hang', 'delivery', 'ship',
      'thanh toán', 'thanh toan', 'payment',
      'muốn mua', 'muon mua', 'want to buy', 'cần mua', 'can mua',
      'trẻ em', 'tre em', 'children', 'kid',
      'người lớn', 'nguoi lon', 'adult',
      'bán chạy', 'ban chay', 'best seller', 'nổi bật', 'noi bat'
    ];
    return keywords.some(k => lower.includes(k) || sanitized.includes(this.sanitizeText(k)));
  }

  private isGreeting(message: string): boolean {
    if (!message) return false;
    const lower = message.toLowerCase().trim();
    const sanitized = this.sanitizeText(lower);
    const greetings = [
      'xin chào', 'chào', 'chao', 'hello', 'hi', 'hey',
      'alo', 'good morning', 'good afternoon', 'good evening'
    ];
    return greetings.some(g => lower.includes(g) || sanitized.includes(this.sanitizeText(g)));
  }

  private buildProductHighlightMessage(): string {
    // FE hiển thị gợi ý tạm thời; backend sẽ trả gợi ý chính xác dựa dữ liệu
    return 'Bạn đợi nhân viên trả lời.';
  }

  private sanitizeText(text: string): string {
    if (!text) return '';
    return text
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, '')
      .toLowerCase();
  }

  /**
   * Tạo mã khách tạm (guest) và lưu localStorage để chat không cần đăng nhập
   */
  private initializeGuestSession(): void {
    this.isGuestSession = true;
    this.customerName = 'Khách vãng lai';
    const guestId = this.getOrCreateGuestId();
    if (guestId) {
      this.khachHangId = guestId;
    }
  }

  private getOrCreateGuestId(): number | null {
    if (typeof window === 'undefined' || !window?.localStorage) {
      return null;
    }

    const existing = window.localStorage.getItem(this.GUEST_CHAT_ID_KEY);
    if (existing) {
      const parsed = Number(existing);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    // Sử dụng ID âm để tránh đụng với ID khách hàng thực tế trong DB
    const newGuestId = -Math.abs(Date.now());
    window.localStorage.setItem(this.GUEST_CHAT_ID_KEY, newGuestId.toString());
    return newGuestId;
  }
}

