import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const db = getFirestore();

export const calendarFeed = onRequest(async (req, res) => {
    const familyId = req.query.familyId as string;

    if (!familyId) {
        res.status(400).send("Missing familyId");
        return;
    }

    try {
        const familyRef = db.collection("families").doc(familyId);
        const familyDoc = await familyRef.get();

        if (!familyDoc.exists) {
            res.status(404).send("Family not found");
            return;
        }

        const familyData = familyDoc.data();
        const isPremium = familyData?.subscription?.type === "paid";

        let icsContent = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//The Familee App//NONSGML v1.0//EN",
            `X-WR-CALNAME:${familyData?.name} Circle`,
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
        ];

        if (!isPremium) {
            // FREE TIER: Placeholder Event
            const now = new Date();
            const end = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

            icsContent.push(
                "BEGIN:VEVENT",
                `UID:upgrade-reminder-${familyId}`,
                `DTSTAMP:${formatDate(now)}`,
                `DTSTART:${formatDate(now)}`,
                `DTEND:${formatDate(end)}`,
                "SUMMARY:Upgrade to Sync your Family Calendar",
                "DESCRIPTION:Unlock full calendar sync and more by upgrading to Family Hub Plus in the app.",
                "URL:https://thefamilee.app/pricing",
                "END:VEVENT"
            );
        } else {
            // PREMIUM TIER: Fetch Events
            // Get events from last 30 days and future
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const eventsSnapshot = await familyRef.collection("events")
                .where("start", ">=", Timestamp.fromDate(thirtyDaysAgo))
                .get();

            eventsSnapshot.forEach(doc => {
                const data = doc.data();
                const start = data.start.toDate();
                const end = data.end.toDate();
                const created = data.createdAt ? data.createdAt.toDate() : new Date();

                icsContent.push(
                    "BEGIN:VEVENT",
                    `UID:${doc.id}`,
                    `DTSTAMP:${formatDate(created)}`,
                    `DTSTART:${formatDate(start)}`,
                    `DTEND:${formatDate(end)}`,
                    `SUMMARY:${escapeText(data.title)}`,
                    `DESCRIPTION:${escapeText(data.description || "")}`,
                    `LOCATION:${escapeText(data.location || "")}`,
                    "END:VEVENT"
                );
            });
        }

        icsContent.push("END:VCALENDAR");

        res.set("Content-Type", "text/calendar; charset=utf-8");
        res.set("Content-Disposition", `attachment; filename="family-calendar.ics"`);
        res.send(icsContent.join("\r\n"));

    } catch (error) {
        logger.error("Error generating calendar feed:", error);
        res.status(500).send("Internal Server Error");
    }
});

// Helper: Format Date to YYYYMMDDTHHmmSSZ
function formatDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

// Helper: Escape special characters for ICS
function escapeText(text: string): string {
    return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}
