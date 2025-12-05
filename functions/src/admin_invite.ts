
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import * as crypto from "crypto";

const db = getFirestore();
const auth = getAuth();

export const createAdminInvite = onCall(async (request) => {
  // 1. Authentication Check: Ensure the caller is a logged-in user.
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be logged in to create an invite."
    );
  }

  const { email, name, familyId } = request.data;
  const adminUid = request.auth.uid;

  // 2. Data Validation: Check for required fields.
  if (!email || !name || !familyId) {
    throw new HttpsError(
      "invalid-argument",
      "The function must be called with 'email', 'name', and 'familyId'."
    );
  }

  try {
    // 3. Authorization Check: Verify the caller is an admin of the family.
    const familyRef = db.collection("families").doc(familyId);
    const familyDoc = await familyRef.get();

    if (!familyDoc.exists) {
      throw new HttpsError("not-found", "Family does not exist.");
    }

    const familyData = familyDoc.data();
    const adminMember = familyData?.members.find(
      (member: any) => member.uid === adminUid && member.role === "admin"
    );

    if (!adminMember) {
      throw new HttpsError(
        "permission-denied",
        "You must be an admin of this family to invite users."
      );
    }

    // Check Free Tier Limits (Max 1 invited member via Admin Invite)
    if (familyData?.subscription?.type === 'free') {
      const adminInviteCount = familyData.members?.filter((m: any) => m.joinedVia === 'admin_invite').length || 0;

      // If count is already 1 (or more), block new invites.
      if (adminInviteCount >= 1) {
        throw new HttpsError(
          "failed-precondition",
          "Free tier is limited to 1 Admin Invite (though you can have up to 10 members via other methods). Please upgrade to invite more family members via this secure method."
        );
      }
    }

    // 4. Create User in Firebase Auth
    const userRecord = await auth.createUser({
      email: email,
      displayName: name,
    });

    const batch = db.batch();

    // 5. Create User Document in Firestore
    const userRef = db.collection("users").doc(userRecord.uid);
    batch.set(userRef, {
      uid: userRecord.uid,
      email: email,
      name: name,
      activeFamilyId: familyId, // Set the new family as active
      familyMemberships: [{ familyId: familyId, role: "member" }],
    });

    // 6. Add User to Family's members subcollection with joinedVia tag
    batch.update(familyRef, {
      members: FieldValue.arrayUnion({ uid: userRecord.uid, role: "member", joinedVia: "admin_invite" }),
    });

    // 7. Generate and Store One-Time Login Code
    const code = crypto.randomBytes(20).toString("hex");
    const loginCodeRef = db.collection("loginCodes").doc(code);

    // Set expiration for 48 hours from now
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    batch.set(loginCodeRef, {
      uid: userRecord.uid,
      expiresAt: expiresAt, // Firestore Admin SDK handles Date objects automatically
    });

    await batch.commit();

    // 8. Return the Invite URL
    const inviteUrl = `https://thefamilee.app/join?code=${code}`;
    logger.info(`Invite link created for ${email}: ${inviteUrl}`);

    return { inviteUrl };
  } catch (error: any) {
    logger.error("Error creating admin invite:", error);
    if (error.codePrefix === "auth") {
      throw new HttpsError("already-exists", "A user with this email already exists.");
    }
    throw new HttpsError("internal", "An unexpected error occurred.");
  }
});
