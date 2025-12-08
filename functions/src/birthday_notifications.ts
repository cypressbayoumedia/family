import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();



// Note: Composite index required for 'users' collection:
// - birthdayMonthDay (Ascending)
// - activeFamilyId (Ascending) (If using compound queries)
export const checkBirthdays = onSchedule("every day 09:00", async (event) => {
    const today = new Date();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const todayString = `${month}-${day}`;

    logger.info(`Checking birthdays for ${todayString}`);

    try {
        const usersSnapshot = await db.collection("users")
            .where("birthdayMonthDay", "==", todayString)
            .get();

        if (usersSnapshot.empty) {
            logger.info("No birthdays found today.");
            return;
        }

        // Use a batch for writes (max 500 ops per batch)
        let batch = db.batch();
        let opCount = 0;

        // Process all users concurrently for reads, but batch writes
        // We will fetch all families first to avoid N+1 reads if multiple users same family

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const birthdayUserUid = userDoc.id;
            const userName = userData.name || "A family member";

            const memberships = userData.familyMemberships || [];

            // Legacy support for activeFamilyId
            if (userData.activeFamilyId && !memberships.some((m: any) => m.familyId === userData.activeFamilyId)) {
                memberships.push({ familyId: userData.activeFamilyId });
            }

            for (const membership of memberships) {
                const familyId = membership.familyId;
                if (!familyId) continue;

                const familyDoc = await db.doc(`families/${familyId}`).get();
                if (!familyDoc.exists) continue;

                const familyData = familyDoc.data();
                const members = familyData?.members || [];

                for (const member of members) {
                    if (member.uid === birthdayUserUid) continue;

                    const ref = db.collection(`users/${member.uid}/notifications`).doc();
                    batch.set(ref, {
                        type: 'birthday',
                        title: 'Birthdays',
                        body: `It's ${userName}'s birthday today! 🎂`,
                        link: `/calendar`,
                        familyId: familyId,
                        icon: 'cake',
                        read: false,
                        createdAt: FieldValue.serverTimestamp(),
                    });
                    opCount++;

                    // Commit batch if limit reached
                    if (opCount >= 500) {
                        await batch.commit();
                        batch = db.batch(); // New batch
                        opCount = 0;
                    }
                }
            }
        }

        if (opCount > 0) {
            await batch.commit();
        }

        logger.info(`Birthday checks completed. Processed ${usersSnapshot.size} birthdays.`);

    } catch (error) {
        logger.error("Error checking birthdays:", error);
    }
});
