import { Component, inject, output, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ChatService, ChatChannel } from '../../../core/chat';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService, UserProfile } from '../../../core/auth';
import { Families } from '../../../core/families';
import { NewChatModalComponent } from '../new-chat-modal/new-chat-modal';

@Component({
  selector: 'app-channel-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NewChatModalComponent, RouterLink],
  template: `
    <div class="header">
      <div class="title-row">
        <div class="left-actions">
            <button class="icon-btn" routerLink="/" title="Back to Family">
                <span class="material-symbols-rounded">arrow_back</span>
            </button>
            <h2>Messages</h2>
        </div>
        <button class="new-chat-btn" (click)="showNewChat.set(true)">
          <span class="material-symbols-rounded">edit_square</span>
        </button>
      </div>
      <div class="search-bar">
        <span class="material-symbols-rounded search-icon">search</span>
        <input 
          type="text" 
          [(ngModel)]="searchQuery"
          placeholder="Search conversations..."
        >
      </div>
    </div>

    <div class="channel-list">
      @for (channel of filteredChannels(); track channel.id) {
        <div class="channel-item" (click)="channelSelected.emit(channel)" tabindex="0">
          <div class="avatar" [style.background-color]="getChannelColor(channel)">
            {{ getChannelInitials(channel) }}
          </div>
          <div class="info">
            <div class="top-row">
              <span class="name">{{ getChannelName(channel) }}</span>
              <span class="time">{{ channel.lastMessage?.sentAt?.toDate() | date:'shortTime' }}</span>
            </div>
            <div class="last-message">
              {{ channel.lastMessage?.text || 'No messages yet' }}
            </div>
          </div>
        </div>
      }
      
      @if (filteredChannels().length === 0) {
        <div class="empty-search">
            <p>No conversations found.</p>
        </div>
      }
    </div>

    @if (showNewChat()) {
      <app-new-chat-modal 
        (close)="showNewChat.set(false)"
        (chatCreated)="handleChatCreated($event)">
      </app-new-chat-modal>
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--surface-bg);
    }
    .header {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: white; /* Make header sticky/distinct */
      /* border-bottom: 1px solid var(--border-color-light); Remove border if blending */
    }
    
    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .left-actions {
          display: flex;
          align-items: center;
          gap: 12px;
      }

      h2 { 
        margin: 0; 
        font-size: 24px; 
        font-weight: 800; 
        letter-spacing: -0.5px;
        color: var(--text-primary);
      }
    }
    
    .icon-btn, .new-chat-btn {
      background: var(--bg-secondary);
      border: none;
      color: var(--text-primary);
      cursor: pointer;
      width: 36px; height: 36px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
      
      &:hover { background: var(--border-color); }
    }
    
    .search-bar {
      position: relative;
      display: flex;
      align-items: center;
      
      .search-icon {
        position: absolute;
        left: 12px;
        color: var(--text-tertiary);
        font-size: 20px;
        pointer-events: none;
      }
      
      input {
        width: 100%;
        padding: 10px 12px 10px 40px;
        border-radius: 12px;
        border: 1px solid var(--border-color);
        background: var(--bg-secondary);
        font-size: 14px;
        transition: all 0.2s;
        box-sizing: border-box; /* Fix for overflow */

        &:focus {
            outline: none;
            background: white;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px var(--primary-light-dim);
        }
      }
    }

    .channel-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .channel-item {
      padding: 12px;
      display: flex;
      gap: 12px;
      cursor: pointer;
      border-radius: 12px;
      transition: all 0.2s;
      margin-bottom: 2px;
      border: 1px solid transparent;

      &:hover {
        background: white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.03);
      }
      
      &:focus {
          outline: none;
          background: white;
          border-color: var(--primary-color);
      }
    }

    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 16px; /* Squircle */
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 18px;
      flex-shrink: 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 2px;
    }

    .top-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }

    .name {
      font-weight: 700;
      font-size: 15px;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .time {
      font-size: 11px;
      font-weight: 500;
      color: var(--text-tertiary);
    }

    .last-message {
      font-size: 13px;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .empty-search {
        text-align: center;
        padding: 40px 20px;
        color: var(--text-tertiary);
        font-size: 14px;
    }
  `]
})
export class ChannelListComponent {
  channelSelected = output<ChatChannel>();

  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private familiesService = inject(Families);

  channels$ = this.chatService.getMyChannels();
  channels = toSignal(this.channels$, { initialValue: [] });
  currentUser = this.authService.currentUser;

  showNewChat = signal(false);
  searchQuery = signal('');

  // Local cache for users not in active family
  resolvedUsers = signal<Record<string, UserProfile>>({});

  constructor() {
    effect(() => {
      const channels = this.channels();
      const myId = this.currentUser()?.uid;
      const activeMembers = this.familiesService.activeFamilyMembers();

      // Identify member IDs that are NOT in the active family and NOT yet resolved
      const missingIds = new Set<string>();

      channels.forEach(ch => {
        if (ch.type === 'direct') {
          const otherId = ch.memberIds.find(id => id !== myId);
          if (otherId) {
            const inFamily = activeMembers.some(m => m.uid === otherId);
            const alreadyResolved = this.resolvedUsers()[otherId];
            if (!inFamily && !alreadyResolved) {
              missingIds.add(otherId);
            }
          }
        }
      });

      // Fetch profiles for missing IDs
      missingIds.forEach(uid => {
        this.authService.getUserProfile(uid).subscribe(profile => {
          if (profile) {
            this.resolvedUsers.update(current => ({
              ...current,
              [uid]: profile
            }));
          }
        });
      });
    });
  }

  filteredChannels = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const all = this.channels();

    if (!query) return all;

    return all.filter(c => this.getChannelName(c).toLowerCase().includes(query));
  });

  handleChatCreated(channelId: string) {
    this.showNewChat.set(false);
  }

  getChannelName(channel: ChatChannel): string {
    if (channel.type === 'direct') {
      const myId = this.currentUser()?.uid;
      const otherId = channel.memberIds.find(id => id !== myId);

      if (!otherId) return 'Unknown User';

      // 1. Check Active Family
      const member = this.familiesService.activeFamilyMembers().find(m => m.uid === otherId);
      if (member) return member.name;

      // 2. Check Resolved Users (friends/other families)
      const resolved = this.resolvedUsers()[otherId];
      if (resolved && resolved.name) return resolved.name;

      return 'Unknown User';
    }
    return channel.name || 'Group Chat';
  }

  getChannelInitials(channel: ChatChannel): string {
    const name = this.getChannelName(channel);
    return name.substring(0, 2).toUpperCase();
  }

  getChannelColor(channel: ChatChannel): string {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'];
    let hash = 0;
    for (let i = 0; i < channel.id.length; i++) {
      hash = channel.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }
}


