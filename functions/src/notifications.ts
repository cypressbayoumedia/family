import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

// Helper to create a notification
async function createNotification(userId: string, notification: any) {
    try {
        await db.collection(`users/${userId}/notifications`).add({
            ...notification,
            read: false,
            createdAt: FieldValue.serverTimestamp(),
        });
    } catch (error) {
        logger.error(`Error creating notification for user ${userId}:`, error);
    }
}

// 1. New Post Notification
export const notifyOnPostCreated = onDocumentCreated("families/{familyId}/posts/{postId}", async (event) => {
    const post = event.data?.data();
    const familyId = event.params.familyId;
    const postId = event.params.postId;

    if (!post) return;

    const authorId = post.authorId;
    const authorName = post.authorName || "Someone";

    // Get all family members
    const familyDoc = await db.doc(`families/${familyId}`).get();
    const familyData = familyDoc.data();
    if (!familyData) return;

    const members = familyData.members || [];

    const promises = members.map(async (member: any) => {
        if (member.uid === authorId) return; // Don't notify author

        await createNotification(member.uid, {
            type: 'post',
            title: 'New Memory',
            body: `${authorName} added a new post.`,
            link: `/post/${postId}`,
            familyId,
            icon: 'photo_library'
        });
    });

    await Promise.all(promises);
});

// 2. New Comment Notification
export const notifyOnCommentCreated = onDocumentCreated("families/{familyId}/posts/{postId}/comments/{commentId}", async (event) => {
    const comment = event.data?.data();
    const familyId = event.params.familyId;
    const postId = event.params.postId;

    if (!comment) return;

    const authorId = comment.authorId;
    const authorName = comment.authorName || "Someone";

    // Get the post to find the author
    const postDoc = await db.doc(`families/${familyId}/posts/${postId}`).get();
    const postData = postDoc.data();
    if (!postData) return;

    const postAuthorId = postData.authorId;

    // Notify post author if they are not the commenter
    if (postAuthorId && postAuthorId !== authorId) {
        await createNotification(postAuthorId, {
            type: 'comment',
            title: 'New Comment',
            body: `${authorName} commented on your post.`,
            link: `/post/${postId}`,
            familyId,
            icon: 'chat_bubble'
        });
    }
});

// 3. New Event Notification
export const notifyOnEventCreated = onDocumentCreated("families/{familyId}/events/{eventId}", async (event) => {
    const calendarEvent = event.data?.data();
    const familyId = event.params.familyId;


    if (!calendarEvent) return;

    const authorId = calendarEvent.createdBy;
    const authorName = calendarEvent.creatorName || "Someone";

    // Get all family members
    const familyDoc = await db.doc(`families/${familyId}`).get();
    const familyData = familyDoc.data();
    if (!familyData) return;

    const members = familyData.members || [];

    const promises = members.map(async (member: any) => {
        if (member.uid === authorId) return; // Don't notify author

        await createNotification(member.uid, {
            type: 'event',
            title: 'New Event',
            body: `${authorName} planned "${calendarEvent.title}".`,
            link: `/calendar`, // Or deep link to event if possible
            familyId,
            icon: 'event'
        });
    });

    await Promise.all(promises);
});
