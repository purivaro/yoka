const express = require('express');
const line = require('@line/bot-sdk');
require('dotenv').config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || ''
};

const app = express();

// Middleware to safely handle body on both local Express and Vercel Serverless environment
app.use((req, res, next) => {
  if (req.body !== undefined) {
    return next();
  }
  let data = '';
  req.on('data', chunk => { data += chunk; });
  req.on('end', () => {
    try {
      req.body = data ? JSON.parse(data) : {};
    } catch (e) {
      req.body = {};
    }
    next();
  });
});

// GET endpoint to quickly check server health
app.get('/api/webhook', (req, res) => {
  res.status(200).send('YOKA Yoga Studio - LINE OA Webhook is active!');
});

// POST endpoint for receiving LINE events
app.post('/api/webhook', async (req, res) => {
  // If LINE Channel Secret is set, validate signature
  if (config.channelSecret) {
    const signature = req.headers['x-line-signature'];
    if (!signature) {
      return res.status(401).json({ status: 'error', message: 'Missing x-line-signature header' });
    }

    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const isValid = line.validateSignature(rawBody, config.channelSecret, signature);

    if (!isValid) {
      return res.status(403).json({ status: 'error', message: 'Invalid x-line-signature' });
    }
  }

  // Handle events
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const events = body.events || [];
    const results = await Promise.all(events.map(handleEvent));
    return res.status(200).json(results);
  } catch (err) {
    console.error('Error handling LINE Webhook event:', err);
    return res.status(500).json({ status: 'error', message: err.message });
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
