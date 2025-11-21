import {onDocumentCreated, onDocumentDeleted} from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

const db = getFirestore();

export const onCapsuleCreated = onDocumentCreated("families/{familyId}/capsules/{capsuleId}", async (event) => {
  const familyId = event.params.familyId;
  const familyRef = db.collection("families").doc(familyId);

  try {
    await familyRef.update({
      capsuleCount: FieldValue.increment(1),
    });
    logger.info(`Incremented capsule count for family ${familyId}`);
  } catch (error) {
    logger.error(`Failed to increment capsule count for family ${familyId}`, error);
  }
});

/**
 * Triggered when a Story Capsule is deleted.
 * It atomically decrements the `capsuleCount` on the parent family document.
 */
export const onCapsuleDeleted = onDocumentDeleted("families/{familyId}/capsules/{capsuleId}", async (event) => {
  const familyId = event.params.familyId;
  const familyRef = db.collection("families").doc(familyId);

  try {
    await familyRef.update({
      capsuleCount: FieldValue.increment(-1),
    });
    logger.info(`Decremented capsule count for family ${familyId}`);
  } catch (error) {
    logger.error(`Failed to decrement capsule count for family ${familyId}`, error);
  }
});