import { NextResponse } from 'next/server';
import { messagingApi, webhook } from '@line/bot-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

const lineClient = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
});

// ตัดช่องว่างเว้นวรรคออกป้องกัน Error
const apiKey = (process.env.GEMINI_API_KEY || '').trim();
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const events: webhook.Event[] = body.events;

    if (events && events.length > 0) {
      for (const event of events) {
        if (event.type === 'message' && event.message && event.message.type === 'text') {
          const messageContent = event.message as webhook.TextMessageContent;
          const userText = messageContent.text;

          let replyText = '';

          try {
            // เรียกใช้โมเดล gemini-1.5-flash
            const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
            
            const prompt = `คุณคือ AI แอดมินหอพักชื่อ "น้องต้นข้าว" ให้ตอบคำถามนี้แบบสุภาพและเป็นมิตร: ${userText}`;
            const result = await model.generateContent(prompt);
            replyText = result.response.text();
          } catch (geminiError: any) {
            // ถ้า Gemini มีปัญหา ให้พ่น Error ออกมาให้เราเห็นทาง Line แชทเลย!
            console.error('Gemini Internal Error:', geminiError);
            replyText = `⚠️ ระบบ AI ขัดข้อง: ${geminiError?.message || 'ไม่สามารถดึงข้อมูลจาก Gemini ได้'}`;
          }

          const replyMessage: messagingApi.TextMessage = {
            type: 'text',
            text: replyText,
          };

          if (event.replyToken) {
            await lineClient.replyMessage({
              replyToken: event.replyToken,
              messages: [replyMessage],
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