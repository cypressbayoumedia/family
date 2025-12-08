import { Component, inject, input, output, signal, effect, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, ChatChannel, ChatMessage } from '../../../core/chat';
import { AuthService } from '../../../core/auth';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { switchMap, of } from 'rxjs';
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { LiveAnnouncer } from '@angular/cdk/a11y';

@Component({
  selector: 'app-message-thread',
  standalone: true,
  imports: [CommonModule, FormsModule, ScrollingModule],
  template: `
    <div class="header">
      <button class="back-btn" (click)="back.emit()">
        <span class="material-symbols-rounded">arrow_back</span>
      </button>
      <div class="channel-info">
        <h3>{{ channelName() }}</h3>
      </div>
    </div>

    <div class="messages-area">
      <cdk-virtual-scroll-viewport itemSize="60" class="viewport">
        <div *cdkVirtualFor="let msg of messages(); trackBy: trackById" class="message-row-wrapper">
          <div class="message-row" [class.own-message]="isOwnMessage(msg)">
            @if (!isOwnMessage(msg) && showSenderName(msg)) {
              <div class="sender-name">{{ msg.senderName }}</div>
            }
            <div class="message-bubble">
              {{ msg.text }}
            </div>
            <div class="message-time">
               {{ msg.createdAt.toDate() | date:'shortTime' }}
            </div>
          </div>
        </div>
      </cdk-virtual-scroll-viewport>
    </div>

    <div class="input-area">
      <input 
        type="text" 
        [(ngModel)]="messageInput" 
        (keyup.enter)="sendMessage()"
        placeholder="Type a message..."
      >
      <button (click)="sendMessage()" [disabled]="!messageInput.trim()">
        <span class="material-symbols-rounded">send</span>
      </button>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .header {
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid var(--border-color);
      background: var(--surface-color);

      h3 { margin: 0; font-size: 16px; }
    }
    
    .back-btn {
      background: none;
      border: none;
      cursor: pointer;
      display: none; /* Hidden on desktop */
      padding: 4px;
    }

    @media (max-width: 768px) {
      .back-btn { display: block; }
    }

    .messages-area {
      flex: 1;
      overflow: hidden; /* Important for virtual scroll */
      background: var(--bg-secondary);
      display: flex;
      flex-direction: column;
    }

    .viewport {
      height: 100%;
      width: 100%;
    }
    
    .message-row-wrapper {
        padding: 4px 16px; /* Moved padding here for consistant item size/spacing */
    }

    .message-row {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      max-width: 70%;
      align-self: flex-start;
    }

    .message-row.own-message {
      align-self: flex-end;
      align-items: flex-end;
      margin-left: auto; /* Required for self alignment in flex column inside block wrapper */
      
      .message-bubble {
        background: var(--primary-color);
        color: white;
        border-bottom-right-radius: 4px;
      }
    }

    .sender-name {
      font-size: 11px;
      color: var(--text-secondary);
      margin-left: 12px;
      margin-bottom: 2px;
    }

    .message-bubble {
      padding: 10px 14px;
      background: white;
      border-radius: 18px;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      font-size: 15px;
      line-height: 1.4;
    }
    
    .own-message .message-bubble {
      border-bottom-left-radius: 18px;
      border-bottom-right-radius: 4px;
    }

    .message-time {
      font-size: 10px;
      color: var(--text-tertiary);
      margin-top: 2px;
      margin: 2px 4px;
    }

    .input-area {
      padding: 12px 16px;
      background: var(--surface-color);
      display: flex;
      gap: 8px;
      border-top: 1px solid var(--border-color);

      input {
        flex: 1;
        padding: 10px 16px;
        border-radius: 20px;
        border: 1px solid var(--border-color);
        background: var(--input-bg);
        
        &:focus { outline: none; border-color: var(--primary-color); }
      }

      button {
        background: var(--primary-color);
        color: white;
        border: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.1s;
        
        &:active { transform: scale(0.95); }
        &:disabled { opacity: 0.5; cursor: default; }
      }
    }
  `]
})
export class MessageThreadComponent {
  channel = input.required<ChatChannel>();
  back = output<void>();

  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private announcer = inject(LiveAnnouncer);

  currentUser = this.authService.currentUser;

  messageInput = '';
  @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;

  // Derive messages from channel input
  private messages$ = toObservable(this.channel).pipe(
    switchMap(c => c ? this.chatService.getMessages(c.id) : of([]))
  );
  messages = toSignal(this.messages$, { initialValue: [] as ChatMessage[] });

  constructor() {
    // Auto-scroll to bottom when messages change & Announce
    effect(() => {
      const msgs = this.messages();
      if (msgs.length > 0) {
        setTimeout(() => this.scrollToBottom(), 100);

        // Announce new messages (A11y)
        const lastMsg = msgs[msgs.length - 1];
        if (!this.isOwnMessage(lastMsg)) {
          const sender = lastMsg.senderName || 'Someone';
          this.announcer.announce(`New message from ${sender}: ${lastMsg.text}`);
        }
      }
    });
  }

  isOwnMessage(msg: ChatMessage): boolean {
    return msg.senderId === this.currentUser()?.uid;
  }

  showSenderName(msg: ChatMessage): boolean {
    return this.channel().type !== 'direct';
  }

  trackById(index: number, item: ChatMessage): string {
    return item.id;
  }

  channelName = () => {
    const c = this.channel();
    if (c.type === 'direct') {
      return c.memberIds.length === 2 ? 'Direct Message' : 'Chat';
    }
    return c.name || 'Group Chat';
  }

  async sendMessage() {
    if (!this.messageInput.trim()) return;

    const text = this.messageInput;
    this.messageInput = ''; // Optimistic clear

    try {
      await this.chatService.sendMessage(this.channel().id, text);
      this.scrollToBottom();
    } catch (err) {
      console.error('Failed to send', err);
    }
  }

  scrollToBottom() {
    if (this.viewport) {
      this.viewport.scrollToIndex(this.messages().length);
    }
  }
}

