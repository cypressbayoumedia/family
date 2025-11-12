import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, serverTimestamp, query, orderBy, collectionData, where, doc, getDoc, setDoc, updateDoc, writeBatch } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from './auth';
import { toObservable } from '@angular/core/rxjs-interop';

// Interfaces for our chat data
export interface Chat {
  id: string;
  members: string[];
  type: 'direct' | 'group';
  lastMessage?: { text: string; createdAt: any };
  // Add other fields you might want for display, like names and photos of members
}
export interface Message {
  id?: string;
  text: string;
  senderId: string;
  senderName: string;
  senderPhotoURL?: string | null;
  createdAt: any;
}

@Injectable({
  providedIn: 'root'
})
export class Chat {
  private afs = inject(Firestore);
  private authService = inject(AuthService);

  private currentUser$ = toObservable(this.authService.currentUser);

  /**
   * Gets a real-time stream of all chat rooms the current user is a member of.
   */
  getUserChats(): Observable<Chat[]> {
    return this.currentUser$.pipe(
      switchMap(user => {
        if (!user) return of([]);
        const chatsCollection = collection(this.afs, 'chats');
        const q = query(chatsCollection, where('members', 'array-contains', user.uid));
        return collectionData(q, { idField: 'id' }) as Observable<Chat[]>;
      })
    );
  }

  /**
   * Gets a real-time stream of messages for a specific chat room.
   */
  getChatMessages(chatId: string): Observable<Message[]> {
    if (!chatId) return of([]);
    const messagesCollection = collection(this.afs, `chats/${chatId}/messages`);
    const q = query(messagesCollection, orderBy('createdAt', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Message[]>;
  }

  /**
   * Sends a new message and atomically updates the `lastMessage` on the parent chat.
   */
  async sendMessage(chatId: string, text: string): Promise<void> {
    const user = this.authService.currentUser();
    if (!user || !text.trim()) return;

    const messagesCollection = collection(this.afs, `chats/${chatId}/messages`);
    const chatDoc = doc(this.afs, `chats/${chatId}`);
    
    const newMessage: Omit<Message, 'id'> = {
      text,
      senderId: user.uid,
      senderName: user.displayName || 'Unknown User',
      senderPhotoURL: user.photoURL || null,
      createdAt: serverTimestamp()
    };
    
    // Use a batch write to do both operations at once
    const batch = writeBatch(this.afs);
    const newMessageRef = doc(messagesCollection); // Create a new doc reference
    
    batch.set(newMessageRef, newMessage);
    batch.update(chatDoc, { 
      lastMessage: { text, createdAt: serverTimestamp() }
    });
    
    await batch.commit();
  }

  /**
   * Creates a new 1-to-1 chat if one doesn't already exist between the two users.
   * Returns the ID of the new or existing chat.
   */
  async createDirectChat(otherUserId: string): Promise<string> {
    const user = this.authService.currentUser();
    if (!user) throw new Error("User not logged in.");

    // Create a canonical ID to prevent duplicate chat rooms.
    // The ID is always "lowerUID_higherUID".
    const chatId = user.uid < otherUserId 
      ? `${user.uid}_${otherUserId}` 
      : `${otherUserId}_${user.uid}`;
      
    const chatDoc = doc(this.afs, `chats/${chatId}`);
    const chatSnap = await getDoc(chatDoc);

    // If the chat doesn't exist, create it.
    if (!chatSnap.exists()) {
      await setDoc(chatDoc, {
        members: [user.uid, otherUserId],
        type: 'direct'
      });
    }
    
    return chatId;
  }
}