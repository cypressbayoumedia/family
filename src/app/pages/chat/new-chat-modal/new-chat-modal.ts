import { Component, inject, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Families } from '../../../core/families';
import { ChatService } from '../../../core/chat';
import { AuthService } from '../../../core/auth';

@Component({
  selector: 'app-new-chat-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>New Message</h3>
          <button class="close-btn" (click)="close.emit()">
            <span class="material-symbols-rounded">close</span>
          </button>
        </div>
        
        <div class="group-setup" *ngIf="selectedMemberIds().length > 1">
          <input 
            type="text" 
            [(ngModel)]="groupName" 
            placeholder="Group Name (Optional)"
            class="group-name-input"
          >
        </div>

        <div class="user-list">
          <div class="list-header">Select Members:</div>
          @for (member of members(); track member.uid) {
            @if (member.uid !== currentUser()?.uid) {
              <div 
                class="user-row" 
                [class.selected]="isSelected(member.uid)"
                (click)="toggleSelection(member.uid)"
              >
                <div class="check-circle">
                  @if (isSelected(member.uid)) {
                    <span class="material-symbols-rounded">check</span>
                  }
                </div>
                <div class="avatar">{{ member.name.charAt(0) }}</div>
                <span>{{ member.name }}</span>
              </div>
            }
          }
        </div>

        <div class="modal-footer">
          <button 
            class="action-btn" 
            [disabled]="selectedMemberIds().length === 0"
            (click)="createChat()"
          >
            {{ actionButtonText() }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      top: 0; left: 0; 
      width: 100%; height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .modal-content {
      background: white;
      width: 90%;
      max-width: 400px;
      border-radius: 12px;
      padding: 0;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .modal-header {
      padding: 16px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
      h3 { margin: 0; }
    }
    .close-btn {
      background: none; border: none; cursor: pointer;
    }
    
    .group-setup {
      padding: 16px;
      background: var(--surface-color);
      border-bottom: 1px solid var(--border-color);
    }
    .group-name-input {
      width: 100%;
      box-sizing: border-box; /* Fix for overflow */
      padding: 10px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
    }


    .user-list {
      overflow-y: auto;
      flex: 1;
      padding: 8px;
    }
    .list-header {
      padding: 8px;
      font-size: 12px;
      color: var(--text-secondary);
      font-weight: 600;
      text-transform: uppercase;
    }

    .user-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.1s;
      
      &:hover { background: var(--surface-hover); }
      &.selected { background: var(--primary-light-dim); }
    }

    .check-circle {
      width: 20px;
      height: 20px;
      border: 2px solid var(--border-color);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      
      .selected & {
        background: var(--primary-color);
        border-color: var(--primary-color);
        color: white;
        
        span { font-size: 14px; font-weight: bold; }
      }
    }

    .avatar {
      width: 32px; height: 32px;
      background: #ddd;
      border-radius: 50%;
      display: flex; 
      align-items: center; 
      justify-content: center;
      font-weight: 600;
      color: #555;
    }

    .modal-footer {
      padding: 16px;
      border-top: 1px solid var(--border-color);
      display: flex;
      justify-content: flex-end;
    }
    .action-btn {
      background: var(--primary-color);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 20px;
      font-weight: 600;
      cursor: pointer;
      
      &:disabled { opacity: 0.5; cursor: default; }
    }
  `]
})
export class NewChatModalComponent {
  close = output<void>();
  chatCreated = output<string>();

  private families = inject(Families);
  private chatService = inject(ChatService);
  private auth = inject(AuthService);

  members = this.families.activeFamilyMembers;
  currentUser = this.auth.currentUser;

  selectedMemberIds = signal<string[]>([]);
  groupName = signal('');

  actionButtonText = computed(() => {
    const count = this.selectedMemberIds().length;
    if (count === 0) return 'Select Members';
    if (count === 1) return 'Start Chat';
    return `Create Group (${count})`;
  });

  isSelected(uid: string) {
    return this.selectedMemberIds().includes(uid);
  }

  toggleSelection(uid: string) {
    const current = this.selectedMemberIds();
    if (current.includes(uid)) {
      this.selectedMemberIds.set(current.filter(id => id !== uid));
    } else {
      this.selectedMemberIds.set([...current, uid]);
    }
  }

  async createChat() {
    const selected = this.selectedMemberIds();
    if (selected.length === 0) return;

    let chatId: string;

    if (selected.length === 1) {
      // Direct Chat
      chatId = await this.chatService.createDirectChat(selected[0]);
    } else {
      // Group Chat
      const name = this.groupName() || 'Group Chat';
      chatId = await this.chatService.createGroupChat(selected, name);
    }

    this.chatCreated.emit(chatId);
  }
}
