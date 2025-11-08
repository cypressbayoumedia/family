import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

import { getFirestore, FieldValue } from "firebase-admin/firestore";



const db = getFirestore();

export const joinFamily = onCall(async (request) => {
  // 1. Authentication Check
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be logged in to join a family."
    );
  }

  const { familyId} = request.data;
  const uid = request.auth.uid;

  if (!familyId) {
    throw new HttpsError(
      "invalid-argument",
      "The function must be called with a 'familyId'."
    );
  }

  // 2. Update User's Display Name (if provided)
  // This part of your original logic can remain on the frontend
  // as it pertains to the user's own profile.

  const familyRef = db.collection("families").doc(familyId);
  const userRef = db.collection("users").doc(uid);

  try {
    const familyDoc = await familyRef.get();

    if (!familyDoc.exists) {
      throw new HttpsError("not-found", "No family found with that ID.");
    }

    const familyData = familyDoc.data();

    // 3. Check Family Tier and Member Count
    if (familyData?.subscription?.type === "free") {
      const members = familyData.members || [];
      if (members.length >= 10) {
        throw new HttpsError(
          "failed-precondition",
          "This family is on a free tier and has reached the maximum number of members (10)."
        );
      }
    }

    // 4. Use a transaction to safely add the user
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new HttpsError("not-found", "User profile not found.");
      }

      transaction.update(familyRef, {
        members: FieldValue.arrayUnion({ uid: uid, role: "member" }),
      });

      transaction.update(userRef, {
        activeFamilyId: familyId,
        familyMemberships: FieldValue.arrayUnion({
          familyId: familyId,
          role: "member",
        }),
      });
    });

    logger.info(`User ${uid} successfully joined family ${familyId}`);
    return { success: true, familyId: familyId };
  } catch (error) {
    logger.error(`Error joining family for user ${uid}:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "An unexpected error occurred.");
  }
});