import { supabase } from './src/config/supabaseClient.js';
import admin from './src/config/firebaseAdmin.js';

async function verifyDelivery() {
    console.log("Fetching latest FCM token from DB...");
    const { data, error } = await supabase
        .from('notification_tokens')
        .select('fcm_token, customer_id, shop_id')
        .order('updated_at', { ascending: false })
        .limit(1);

    if (error || !data || data.length === 0) {
        console.error("No tokens found in DB:", error);
        return;
    }

    const token = data[0].fcm_token;
    console.log("Found token:", token.substring(0, 20) + '...');
    
    const payload = {
      tokens: [token],
      notification: {
        title: "Test Output",
        body: "Delivery Verification",
      },
      data: {
        type: "test",
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'default_channel',
        },
      },
    };

    try {
        console.log("Sending...");
        const response = await admin.messaging().sendEachForMulticast(payload);
        console.log("Success Count:", response.successCount);
        console.log("Failure Count:", response.failureCount);
        if (response.failureCount > 0) {
            console.log("Error:", response.responses[0].error);
        } else {
            console.log("Message ID:", response.responses[0].messageId);
        }
    } catch (e) {
        console.error("Fatal Error:", e);
    }
}

verifyDelivery().then(() => process.exit(0));
