import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ChatService, ChatChannel } from '../../core/chat';
import { ChannelListComponent } from './channel-list/channel-list';
import { MessageThreadComponent } from './message-thread/message-thread';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [CommonModule, ChannelListComponent, MessageThreadComponent],
  template: `
    <div class="chat-container">
      <!-- Sidebar / Channel List -->
      <div class="sidebar" [class.hidden-mobile]="activeChannel()">
        <app-channel-list 
          (channelSelected)="selectChannel($event)"/>
      </div>

      <!-- Main / Message Thread -->
      <div class="main-content" [class.visible-mobile]="activeChannel()">
        @if (activeChannel()) {
          <app-message-thread 
            [channel]="activeChannel()!" 
            (back)="activeChannel.set(null)">
          </app-message-thread>
        } @else {
          <div class="empty-state">
            <span class="material-symbols-rounded icon">chat</span>
            <h3>Select a conversation</h3>
            <p>Choose a chat from the left to start messaging.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .chat-container {
      display: flex;
      height: 100vh;
      overflow: hidden;
      background: #F8F9FA; /* Slightly off-white background for depth */
    }
    
    .sidebar {
      width: 380px; /* Slightly wider */
      border-right: 1px solid rgba(0,0,0,0.05); /* Softer border */
      background: #F8F9FA; /* Match container */
      display: flex;
      flex-direction: column;
    }

    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: white; /* Main content stands out as "card" */
      box-shadow: -5px 0 20px rgba(0,0,0,0.02); /* Very subtle elevation */
      z-index: 1;
    }

    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      background-image: radial-gradient(#F0F0F0 1px, transparent 1px);
      background-size: 20px 20px;
      
      .icon {
        font-size: 64px;
        margin-bottom: 24px;
        color: var(--primary-light);
        opacity: 1;
        background: var(--primary-light-dim);
        padding: 24px;
        border-radius: 50%;
      }
      
      h3 {
          font-size: 24px;
          margin-bottom: 8px;
          color: var(--text-primary);
      }
      
      p { max-width: 300px; text-align: center; line-height: 1.5; }
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .sidebar {
        width: 100%;
        height: 100%;
        background: white;
      }
      
      .main-content {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        transform: translateX(100%);
        transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
        z-index: 10;
      }
      
      .main-content.visible-mobile {
        transform: translateX(0);
      }
      
      .sidebar.hidden-mobile {
        /* Optional */
      }
    }
  `]
})
export class ChatPage {
  activeChannel = signal<ChatChannel | null>(null);

  selectChannel(channel: ChatChannel) {
    this.activeChannel.set(channel);
  }
}
