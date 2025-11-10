import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {getAuth} from "firebase-admin/auth"; 


const db = getFirestore();
const auth = getAuth(); 


export const createWelcomePost = onDocumentCreated("families/{familyId}", async (event) => {

  const familyId = event.params.familyId;
  const familyData = event.data?.data();

  if (!familyData) {
    logger.error(`No data found for new family: ${familyId}`);
    return;
  }
  
  logger.info(`New family created: ${familyId}, Name: ${familyData.name}`);

  try {
    // 2. Identify the creator of the family.
    const creator = familyData.members[0];
    if (!creator || !creator.uid) {
      logger.error(`Creator UID not found for family: ${familyId}`);
      return;
    }
    const creatorUid = creator.uid;

    const authUserRecord = await auth.getUser(creatorUid);
    const creatorName = authUserRecord.displayName || "The Family Admin";
    const creatorPhotoURL = authUserRecord.photoURL || null; 

    const familyName = familyData.name;
    const welcomeMessage = `Welcome to the ${familyName} Hub! This is our new private space to share updates, stay connected, and celebrate together. I'll be inviting everyone to join us here shortly!`;
    
    const welcomePost = {
      authorId: creatorUid,
      authorName: creatorName,
      authorPhotoURL: creatorPhotoURL, 
      familyId: familyId,
      content: welcomeMessage,
      createdAt: FieldValue.serverTimestamp(),
      imageUrl: null,
      audioUrl: null,
    };

    const postsCollectionRef = db.collection(`families/${familyId}/posts`);
    await postsCollectionRef.add(welcomePost);

    logger.info(`Successfully created welcome post for family: ${familyId}`);
  } catch (error) {
    logger.error(`Error creating welcome post for family ${familyId}:`, error);
  }
});