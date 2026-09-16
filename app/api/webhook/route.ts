import { NextResponse } from 'next/server';
import { messagingApi, webhook } from '@line/bot-sdk'; // <-- นำเข้าแค่ 2 หมวดหมู่หลัก

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 1. ระบุว่า events คือ Event ของ webhook
    const events: webhook.Event[] = body.events;
    
    if (events && events.length > 0) {
      for (const event of events) {
        
        if (event.type === 'message' && event.message && event.message.type === 'text') {
          // 2. แปลงชนิดข้อความให้ชัดเจนว่าเป็น TextMessageContent
          const messageContent = event.message as webhook.TextMessageContent;
          const userText = messageContent.text;
          
          // 3. ระบุว่ากล่องข้อความตอบกลับคือ TextMessage ของ messagingApi
          const replyMessage: messagingApi.TextMessage = {
            type: 'text',
            text: `ระบบแอดมินหอพักได้รับข้อความ: "${userText}" เรียบร้อยแล้วครับ!`
          };
          
          if (event.replyToken) {
            await client.replyMessage({
              replyToken: event.replyToken,
              messages: [replyMessage]
            });
          }
        }
      }
    }
    
    return NextResponse.json({ status: 'success' }, { status: 200 });
    
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}