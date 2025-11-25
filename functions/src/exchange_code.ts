
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const db = getFirestore();
const auth = getAuth();

export const exchangeCodeForToken = onCall(async (request) => {
  const { code } = request.data;

  // 1. Data Validation: Check for required fields.
  if (!code) {
    throw new HttpsError(
      "invalid-argument",
      "The function must be called with a 'code'."
    );
  }

  try {
    // 2. Retrieve and Verify the One-Time Code
    const loginCodeRef = db.collection("loginCodes").doc(code);
    const loginCodeDoc = await loginCodeRef.get();

    if (!loginCodeDoc.exists) {
      throw new HttpsError("not-found", "Invalid or expired login code.");
    }

    const loginCodeData = loginCodeDoc.data();

    // 3. Check for Expiration (optional but recommended)
    // This example assumes you have a `createdAt` timestamp.
    // A more robust solution would be a `expiresAt` field.
    // const now = new Date();
    // const createdAt = loginCodeData.createdAt.toDate();
    // const expiresIn = 48 * 60 * 60 * 1000; // 48 hours
    // if (now.getTime() - createdAt.getTime() > expiresIn) {
    //   await loginCodeRef.delete(); // Clean up expired code
    //   throw new HttpsError("deadline-exceeded", "Login code has expired.");
    // }

    const uid = loginCodeData?.uid;

    // 4. Mark the Code as Used (by deleting it)
    await loginCodeRef.delete();

    // 5. Generate Custom Authentication Token
    const customToken = await auth.createCustomToken(uid);

    logger.info(`Custom token generated for user: ${uid}`);

    // 6. Return the Token
    return { customToken };
  } catch (error: any) {
    logger.error("Error exchanging code for token:", error);
    throw new HttpsError("internal", "An unexpected error occurred.");
  }
});

