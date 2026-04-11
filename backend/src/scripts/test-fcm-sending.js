import pushNotificationService from '../services/pushNotification.service.js';
import { isFirebaseAdminConfigured } from '../config/firebaseAdmin.js';

async function testFcm() {
    console.log("Starting FCM sending test...");
    console.log("Firebase Admin Configured:", isFirebaseAdminConfigured);

    const testData = {
        customer_id: '59bb11b6-76c6-46d4-aaf3-ff0b5e28c2ea',
        title: 'Test Notification',
        message: 'This is a test notification from the backend fix.',
        type: 'test',
        reference_id: '59bb11b6-76c6-46d4-aaf3-ff0b5e28c2ea'
    };

    try {
        console.log("Attempting to send push notification...");
        const result = await pushNotificationService.sendPushNotification(testData);
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("Test failed with error:", error);
    }
}

testFcm();
