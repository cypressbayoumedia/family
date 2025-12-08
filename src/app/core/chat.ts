import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import { Firestore, collection, addDoc, query, where, orderBy, collectionData, doc, setDoc, updateDoc, Timestamp, FirestoreDataConverter, DocumentData, QueryDocumentSnapshot, SnapshotOptions, serverTimestamp } from '@angular/fire/firestore';
import { Observable, of, combineLatest } from 'rxjs';
import { switchMap, map, take } from 'rxjs/operators';
import { AuthService } from './auth';

export interface ChatChannel {
  id: string;
  type: 'direct' | 'group' | 'family';
  memberIds: string[];
  familyId?: string;
  name?: string; // For groups or family chats
  photoURL?: string; // For groups
  lastMessage?: {
    text: string;
    senderId: string;
    sentAt: Timestamp;
    senderName?: string;
  };
  updatedAt: Timestamp;
  createdBy: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName?: string; // Denormalized for ease
  createdAt: Timestamp;
  readBy?: string[];
}

// --- Converters ---
const channelConverter: FirestoreDataConverter<ChatChannel> = {
  toFirestore: (data: ChatChannel): DocumentData => ({ ...data }),
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): ChatChannel => {
    const data = snapshot.data(options)!;
    return { id: snapshot.id, ...data } as ChatChannel;
  }
};

const messageConverter: FirestoreDataConverter<ChatMessage> = {
  toFirestore: (data: ChatMessage): DocumentData => ({ ...data }),
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): ChatMessage => {
    const data = snapshot.data(options)!;
    return { id: snapshot.id, ...data } as ChatMessage;
  }
};

@Injectable({ providedIn: 'root' })
export class ChatService {
  private afs = inject(Firestore);
  private auth = inject(AuthService);
  private injector = inject(Injector);

  // --- Channels ---

  // Get all channels for current user
  getMyChannels(): Observable<ChatChannel[]> {
    return this.auth.user$.pipe(
      switchMap(user => {
        if (!user) return of([]);
        return runInInjectionContext(this.injector, () => {
          const channelsRef = collection(this.afs, 'channels').withConverter(channelConverter);
          // Query channels where memberIds contains my UID
          const q = query(
            channelsRef,
            where('memberIds', 'array-contains', user.uid),
            orderBy('updatedAt', 'desc')
          );
          return collectionData(q);
        });
      })
    );
  }

  // Get messages for a channel
  getMessages(channelId: string): Observable<ChatMessage[]> {
    if (!channelId) return of([]);
    const messagesRef = collection(this.afs, `channels/${channelId}/messages`).withConverter(messageConverter);
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    return collectionData(q);
  }

  // --- Actions ---

  async createDirectChat(otherUserId: string): Promise<string> {
    const currentUser = this.auth.currentUser();
    if (!currentUser) throw new Error('Must be logged in');

    // Use sorted UIDs for canonical ID
    const uids = [currentUser.uid, otherUserId].sort();
    const channelId = `dm_${uids[0]}_${uids[1]}`;

    const docRef = doc(this.afs, `channels/${channelId}`).withConverter(channelConverter);

    // We use setDoc with merge = true so if it exists we just update it (or do nothing if we change nothing)
    // But we want to ensure memberIds are set.

    await setDoc(docRef, {
      id: channelId,
      type: 'direct',
      memberIds: uids,
      updatedAt: serverTimestamp() as Timestamp,
      createdBy: currentUser.uid
    } as ChatChannel, { merge: true });

    return channelId;
  }

  async createGroupChat(memberIds: string[], name: string): Promise<string> {
    const currentUser = this.auth.currentUser();
    if (!currentUser) throw new Error('Must be logged in');

    const allMembers = [...new Set([...memberIds, currentUser.uid])];

    // Create new doc with auto-ID
    const colRef = collection(this.afs, 'channels');
    const docRef = await addDoc(colRef, {
      type: 'group',
      memberIds: allMembers,
      name,
      updatedAt: serverTimestamp(),
      createdBy: currentUser.uid
    });

    return docRef.id;
  }

  async createFamilyChannel(familyId: string, familyName: string, memberIds: string[]): Promise<string> {
    const channelId = `family_${familyId}`;
    const docRef = doc(this.afs, `channels/${channelId}`);

    // Always ensure all members are in the list
    await setDoc(docRef, {
      id: channelId,
      type: 'family',
      familyId,
      name: familyName,
      memberIds: memberIds,
      updatedAt: serverTimestamp(),
      createdBy: 'system'
    }, { merge: true });

    return channelId;
  }

  async sendMessage(channelId: string, text: string): Promise<void> {
    const currentUser = this.auth.currentUser();
    const userProfile = this.auth.userProfile();
    if (!currentUser) throw new Error('Must be logged in');

    const messagesRef = collection(this.afs, `channels/${channelId}/messages`);
    const channelRef = doc(this.afs, `channels/${channelId}`);

    const now = serverTimestamp();

    // 1. Add message
    await addDoc(messagesRef, {
      text,
      senderId: currentUser.uid,
      senderName: userProfile?.name || currentUser.displayName || 'User',
      createdAt: now,
      readBy: [currentUser.uid]
    });

    // 2. Update channel lastMessage
    await updateDoc(channelRef, {
      lastMessage: {
        text,
        senderId: currentUser.uid,
        senderName: userProfile?.name || currentUser.displayName || 'User',
        sentAt: now
      },
      updatedAt: now
    });
  }
}