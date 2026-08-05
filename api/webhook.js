const express = require('express');
const line = require('@line/bot-sdk');
require('dotenv').config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || ''
};

const app = express();

// Helper middleware for LINE signature verification
const lineMiddleware = (req, res, next) => {
  if (!config.channelSecret || !config.channelAccessToken) {
    console.warn('LINE_CHANNEL_SECRET or LINE_CHANNEL_ACCESS_TOKEN is missing in environment variables.');
  }

  // If credentials are present, use official middleware
  if (config.channelSecret && config.channelAccessToken) {
    return line.middleware(config)(req, res, next);
  }

  // Fallback if testing without keys locally
  express.json()(req, res, next);
};

// GET endpoint to quickly check server health
app.get('/api/webhook', (req, res) => {
  res.status(200).send('YOKA Yoga Studio - LINE OA Webhook is active!');
});

// POST endpoint for receiving LINE events
app.post('/api/webhook', lineMiddleware, async (req, res) => {
  try {
    const events = req.body.events || [];
    const results = await Promise.all(events.map(handleEvent));
    res.status(200).json(results);
  } catch (err) {
    console.error('Error handling LINE Webhook event:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Handle individual LINE events
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userText = event.message.text.trim();
  let replyText = '';

  if (userText.includes('โยคะ') || userText.includes('คลาส') || userText.includes('ตาราง')) {
    replyText = `🧘‍♀️ สตูดิโอโยคะ YOKA ยินดีต้อนรับครับ!\n\nเรามีคลาสโยคะหลากหลายสไตล์ให้คุณเลือก:\n• Hatha Yoga (ผ่อนคลาย เหมาะสำหรับผู้เริ่มต้น)\n• Vinyasa Yoga (สร้างความแข็งแกร่งและลื่นไหล)\n• Yin Yoga (ยืดเหยียดลึก คลายความเครียด)\n• Ashtanga Yoga (ท้าทายสรีระขั้นสูงสุด)\n\nดูรายละเอียดเพิ่มเติมและทำแบบทดสอบได้ที่เว็บไซต์ของเราครับ ✨`;
  } else if (userText.includes('จอง') || userText.includes('สมัคร') || userText.includes('ราคา')) {
    replyText = `💳 สมาชิก YOKA Studio\n\n• Free Tier: ทดลองเล่นฟรี เข้าถึงคลาสเบื้องต้น\n• Premium Tier: เข้าถึงคลาสกว่า 100+ คลาส พร้อมระบบบันทึกความก้าวหน้า\n\nสนใจสมัครสมาชิก สมัครได้ทางเว็บไซต์ YOKA ครับ 🙏`;
  } else if (userText.includes('ติดต่อ') || userText.includes('ที่อยู่') || userText.includes('แผนที่')) {
    replyText = `📍 YOKA Yoga Studio\nสัมผัสบรรยากาศความสงบระดับพรีเมียมในสถานที่ธรรมชาติ\n\nเว็บไซต์: https://purivaro.github.io/yoka/\nสอบถามข้อมูลเพิ่มเติมพิมพ์ข้อความไว้ได้เลยครับ`;
  } else {
    replyText = `สวัสดีครับ 🙏 ยินดีต้อนรับสู่ YOKA Yoga Studio!\n\nคุณสามารถพิมพ์คำเพื่อสอบถามข้อมูลเพิ่มเติมได้เลยครับ:\n- พิมพ์ "คลาส" เพื่อดูประเภทโยคะที่เปิดสอน\n- พิมพ์ "ราคา" หรือ "สมัคร" เพื่อดูแพ็กเกจสมาชิก\n- พิมพ์ "ติดต่อ" เพื่อดูช่องทางติดต่อและเว็บไซต์ของเรา`;
  }

  // If Client Access Token is available, reply via Messaging API
  if (config.channelAccessToken) {
    const client = new line.messagingApi.MessagingApiClient({
      channelAccessToken: config.channelAccessToken
    });

    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: replyText }]
    });
  } else {
    console.log(`[Simulation Reply to ${event.replyToken}]:`, replyText);
    return Promise.resolve({ replyToken: event.replyToken, replyText });
  }
}

module.exports = app;
