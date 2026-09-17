import { NextResponse } from 'next/server';
import { messagingApi, webhook } from '@line/bot-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getKnowledgeBase } from '../../lib/googleSheets'; // ดึงฟังก์ชันอ่าน Sheets มาใช้ (ปรับ path ตามโครงสร้างโฟลเดอร์ของคุณ)

const lineClient = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
});

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
            // 1. ดึงข้อมูล Knowledge Base จาก Google Sheets แบบ Real-time
            const knowledgeBase = await getKnowledgeBase();

            // 2. ตั้งค่าโมเดล Gemini 3.6 Flash ตามที่คุณแก้ผ่านสำเร็จ
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

            // 3. กำหนด Context และ System Instruction ให้ AI ทำหน้าที่เป็นแอดมินหอพัก
            const prompt = `
คุณคือ "น้องต้นข้าว" AI แอดมินผู้ช่วยของหอพัก ตอบคำถามลูกค้าด้วยความสุภาพ เป็นมิตร และน่าเชื่อถือ

ใช้ข้อมูลหอพักที่กำหนดให้อย่างเคร่งครัดในการตอบคำถาม:
---
${knowledgeBase}
---

คำถามจากลูกค้า: "${userText}"

คำแนะนำในการตอบ:
1. ตอบให้ตรงประเด็น สั้นกระชับ เข้าใจง่าย
2. หากเป็นคำถามที่ไม่มีในข้อมูล ห้ามเดาเอง ให้ตอบสุภาพว่า "ขออภัยครับ ข้อมูลส่วนนี้แนะนำให้ติดต่อแอดมินโดยตรงครับ"
`;

            const result = await model.generateContent(prompt);
            replyText = result.response.text();
          } catch (geminiError: any) {
            console.error('Gemini Internal Error:', geminiError);
            replyText = `⚠️ ระบบ AI ขัดข้อง: ${geminiError?.message || 'ไม่สามารถประมวลผลได้'}`;
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