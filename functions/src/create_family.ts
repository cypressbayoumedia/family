import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

export const createFamily = onCall(async (request) => {
    // 1. Authentication Check
    if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "You must be logged in to create a family."
        );
    }

    const { familyName } = request.data;
    const uid = request.auth.uid;

    // 2. Validation
    if (!familyName || typeof familyName !== 'string' || familyName.trim() === '') {
        throw new HttpsError(
            "invalid-argument",
            "The function must be called with a valid 'familyName'."
        );
    }

    const userRef = db.collection("users").doc(uid);
    const familyRef = db.collection("families").doc(); // Auto-ID

    try {
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new HttpsError("not-found", "User profile not found.");
            }

            // 3. Create Family Document
            // Enforce secure defaults here (server-side)
            transaction.set(familyRef, {
                name: familyName.trim(),
                members: [{ uid: uid, role: 'admin' }],
                subscription: { type: 'free' },
                capsuleCount: 0,
                createdAt: FieldValue.serverTimestamp() // Good practice to have creation time
            });

            // 4. Update User Profile
            transaction.update(userRef, {
                activeFamilyId: familyRef.id,
                familyMemberships: FieldValue.arrayUnion({
                    familyId: familyRef.id,
                    role: 'admin'
                })
            });
        });

        logger.info(`User ${uid} successfully created family ${familyRef.id}`);

        // Return the new ID so the client can navigate
        return { success: true, familyId: familyRef.id };

    } catch (error) {
        logger.error(`Error creating family for user ${uid}:`, error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "An unexpected error occurred while creating the family.");
    }
});
