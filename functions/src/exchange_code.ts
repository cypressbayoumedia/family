
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
    if (!loginCodeData) {
      throw new HttpsError("not-found", "Code data is missing.");
    }

    // 3. Check for Expiration
    if (loginCodeData.expiresAt) {
      const now = new Date();
      // Ensure specific timestamp conversion, assuming Firestore Timestamp
      const expiresAt = loginCodeData.expiresAt.toDate ? loginCodeData.expiresAt.toDate() : new Date(loginCodeData.expiresAt);

      if (now > expiresAt) {
        await loginCodeRef.delete(); // Clean up expired code
        throw new HttpsError("deadline-exceeded", "Login code has expired.");
      }
    } else {
      // Fallback for legacy codes or errors
      await loginCodeRef.delete();
      throw new HttpsError("permission-denied", "Invalid code format.");
    }

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

