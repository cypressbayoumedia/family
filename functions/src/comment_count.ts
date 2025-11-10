import {onDocumentCreated, onDocumentDeleted} from "firebase-functions/v2/firestore"; // Import onDocumentDeleted
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

const db = getFirestore();
export const onCommentCreated = onDocumentCreated("families/{familyId}/posts/{postId}/comments/{commentId}", async (event) => {
  const postId = event.params.postId;
  const familyId = event.params.familyId;

  const postRef = db.collection(`families/${familyId}/posts`).doc(postId);

  try {
    
    await postRef.update({
      commentCount: FieldValue.increment(1),
    });
    logger.info(`Incremented comment count for post ${postId}`);
  } catch (error) {
    logger.error(`Failed to increment comment count for post ${postId}`, error);
  }
});

/**
 * Triggered when a comment is deleted.
 * It atomically decrements the `commentCount` on the parent post.
 */
export const onCommentDeleted = onDocumentDeleted("families/{familyId}/posts/{postId}/comments/{commentId}", async (event) => {
  const postId = event.params.postId;
  const familyId = event.params.familyId;
  const postRef = db.collection(`families/${familyId}/posts`).doc(postId);

  try {
    await postRef.update({
      commentCount: FieldValue.increment(-1),
    });
    logger.info(`Decremented comment count for post ${postId}`);
  } catch (error) {
    logger.error(`Failed to decrement comment count for post ${postId}`, error);
  }
});