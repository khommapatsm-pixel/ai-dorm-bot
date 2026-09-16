import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

// 1. ตั้งค่าการยืนยันตัวตนด้วย Service Account
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

export async function getKnowledgeBase(): Promise<string> {
  try {
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID || '', serviceAccountAuth);
    await doc.loadInfo();
    
    // ดึงชีทแรก หรือชีทที่ชื่อ KB
    const sheet = doc.sheetsByTitle['KB'] || doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    let kbText = "ข้อมูลหอพักฉบับอัปเดตล่าสุด:\n";
    rows.forEach((row) => {
      // แปลงข้อมูลแถวให้อยู่ในรูป Object สาธารณะเพื่อหลีกเลี่ยง private property error
      const rowData = row.toObject();
      const keys = Object.keys(rowData);

      // ดึงข้อมูลจากคอลัมน์แรก (A) และคอลัมน์ที่สอง (B)
      const topic = rowData['หมวดหมู่'] || rowData['A'] || (keys[0] ? rowData[keys[0]] : '');
      const detail = rowData['รายละเอียด'] || rowData['B'] || (keys[1] ? rowData[keys[1]] : '');

      if (topic && detail) {
        kbText += `- ${topic}: ${detail}\n`;
      }
    });

    return kbText;
  } catch (error) {
    console.error('Error loading Google Sheet KB:', error);
    return "ไม่สามารถดึงข้อมูลหอพักได้ในขณะนี้";
  }
}