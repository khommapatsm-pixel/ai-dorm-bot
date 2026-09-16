import { NextResponse } from 'next/server';
import { messagingApi, webhook } from '@line/bot-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai'; // นำเข้า Gemini

// 1. ตั้งค่าการเชื่อมต่อ
const lineClient = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
});
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const events: webhook.Event[] = body.events;

    if (events && events.length > 0) {
      for (const event of events) {
        if (event.type === 'message' && event.message && event.message.type === 'text') {
          const messageContent = event.message as webhook.TextMessageContent;
          const userText = messageContent.text;

          // 2. ให้ Gemini คิดคำตอบแทนเรา
          // ใช้รุ่น flash เพราะประมวลผลเร็วและอยู่ในโควต้าใช้ฟรี
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          
          // สั่ง Persona พื้นฐานให้ AI
          const prompt = `คุณคือ AI แอดมินหอพักชื่อ "น้องบอท" ให้ตอบคำถามนี้แบบสุภาพและเป็นมิตร: ${userText}`;
          
          const result = await model.generateContent(prompt);
          const geminiReply = result.response.text(); 

          // 3. ส่งคำตอบจาก Gemini กลับไปหาลูกค้าผ่าน Line
          const replyMessage: messagingApi.TextMessage = {
            type: 'text',
            text: geminiReply
          };

          if (event.replyToken) {
            await lineClient.replyMessage({
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