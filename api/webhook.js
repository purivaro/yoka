const express = require('express');
const line = require('@line/bot-sdk');
require('dotenv').config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || ''
};

const app = express();

// Safe body parser for Express & Vercel Serverless environment
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

// GET endpoint for health check
app.get('/api/webhook', (req, res) => {
  res.status(200).send('YOKA Yoga Studio - LINE OA Webhook is active!');
});

// POST endpoint for LINE Events
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

  // Handle incoming events
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

// Handle individual LINE events with dynamic website data
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userText = event.message.text.trim().toLowerCase();
  let replyText = '';

  // 1. ถามเรื่องประเภท/จำนวนรูปแบบโยคะ
  if (
    userText.includes('มีกี่แบบ') ||
    userText.includes('กี่ประเภท') ||
    userText.includes('ประเภท') ||
    userText.includes('สไตล์') ||
    userText.includes('มีคลาสอะไรบ้าง') ||
    userText.includes('มีโยคะอะไรบ้าง') ||
    userText.includes('คลาสโยคะ')
  ) {
    replyText = `🧘‍♀️ สตูดิโอโยคะ YOKA มีการฝึกโยคะทั้งหมด 4 ประเภทหลัก ตามเว็บไซต์ของเราครับ:\n\n` +
      `1️⃣ Hatha Yoga (อ่อนโยน ★☆☆☆☆)\n` +
      `• ระยะเวลา: 60 นาที | เผาผลาญต่ำ\n` +
      `• เน้นจัดระเบียบสรีระและลมหายใจแบบช้าๆ ค้างแต่ละท่าในระยะพอเหมาะ ปลอดภัย เหมาะสำหรับผู้เริ่มต้น\n\n` +
      `2️⃣ Vinyasa Yoga (ท้าทายปานกลาง ★★★☆☆)\n` +
      `• ระยะเวลา: 75 นาที | เผาผลาญสูง\n` +
      `• ฝึกการเคลื่อนไหวที่ประสานสัมพันธ์กับลมหายใจอย่างต่อเนื่อง ได้เหงื่อ ช่วยสร้างความแข็งแกร่งและคาร์ดิโอ\n\n` +
      `3️⃣ Yin Yoga (ผ่อนคลาย ★★☆☆☆)\n` +
      `• ระยะเวลา: 60 นาที | เผาผลาญต่ำมาก\n` +
      `• ค้างท่า 3-5 นาที ยืดเหยียดลึกถึงเนื้อเยื่อเกี่ยวพันและพังผืด เหมาะสำหรับคลายเครียด\n\n` +
      `4️⃣ Ashtanga Yoga (ท้าทายสูงสุด ★★★★★)\n` +
      `• ระยะเวลา: 90 นาที | เผาผลาญสูงมาก\n` +
      `• การฝึกแบบดั้งเดิมที่มีระเบียบแบบแผนและลำดับท่าตายตัว ท้าทายสมาธิและร่างกายขั้นสูงสุด\n\n` +
      `🌐 ทำแบบทดสอบค้นหาโยคะที่ใช่สำหรับคุณได้ที่:\nhttps://purivaro.github.io/yoka/`;

  // 2. ถามเรื่องสอนวิธีฝึกโยคะเบื้องต้น / ท่าโยคะ
  } else if (
    userText.includes('ท่าโยคะ') ||
    userText.includes('ท่าเบื้องต้น') ||
    userText.includes('เริ่มต้น') ||
    userText.includes('สอนวิธี') ||
    userText.includes('dog') ||
    userText.includes('cobra') ||
    userText.includes('child')
  ) {
    replyText = `🧘‍♂️ สอนวิธีฝึกโยคะเบื้องต้น (Beginner Guide จาก YOKA):\n\n` +
      `1️⃣ Downward Dog (ท่าสุนัขก้มหน้า)\n` +
      `• จุดเน้น: ยกสะโพกสูงเป็นรูปตัว V คว่ำ, หลังตรง, ส้นเท้าพยายามกดลงพื้น\n\n` +
      `2️⃣ Child's Pose (ท่าเด็ก)\n` +
      `• จุดเน้น: สะโพกทับส้นเท้า, ยืดแขนไปด้านหน้า, หน้าผากผ่อนคลายบนพื้น ช่วยผ่อนคลายหลัง\n\n` +
      `3️⃣ Cobra Pose (ท่างูเห่า)\n` +
      `• จุดเน้น: เปิดหน้าอกขึ้น, กดไหล่ห่างจากหู, สะโพกแนบพื้น ช่วยสร้างความแข็งแรงให้กระดูกสันหลัง\n\n` +
      `💡 ข้อแนะนำ: ไม่ควรฝืนสรีระ ให้ค่อยๆ ยืดเหยียดตามจังหวะลมหายใจครับ`;

  // 3. ประโยชน์ของโยคะ
  } else if (
    userText.includes('ประโยชน์') ||
    userText.includes('ช่วยอะไร') ||
    userText.includes('ดีอย่างไร') ||
    userText.includes('ออฟฟิศซินโดรม') ||
    userText.includes('ปวดหลัง')
  ) {
    replyText = `✨ 4 ประโยชน์หลักของการฝึกโยคะ (YOKA Studio):\n\n` +
      `1. Physical (ร่างกาย): เพิ่มความยืดหยุ่น สร้างแกนกลางลำตัว แก้ปวดหลังและออฟฟิศซินโดรม\n` +
      `2. Mental (จิตใจ): ลดระดับความเครียด (Cortisol) ฝึกสมาธิให้อยู่กับปัจจุบัน\n` +
      `3. Spiritual (พลังงาน): ปรับสมดุลลมหายใจ (Pranayama) เพิ่มพลังงานชีวิต\n` +
      `4. Lifestyle (การใช้ชีวิต): ช่วยให้หลับลึกขึ้นและปรับบุคลิกภาพให้ดีขึ้น\n\n` +
      `ฝึกเพียง 15 นาทีต่อวัน ก็เห็นผลลัพธ์ที่ดีขึ้นได้แล้วครับ!`;

  // 4. ราคา / สมาชิก
  } else if (
    userText.includes('ราคา') ||
    userText.includes('สมัคร') ||
    userText.includes('สมาชิก') ||
    userText.includes('ค่าเรียน') ||
    userText.includes('แพ็กเกจ')
  ) {
    replyText = `💳 แพ็กเกจสมาชิก YOKA Studio\n\n` +
      `🟢 Free Tier (ทดลองเล่นฟรี)\n` +
      `• เข้าถึงคลาสโยคะเบื้องต้น\n` +
      `• ทำแบบทดสอบค้นหาโยคะที่ใช่ฟรี!\n\n` +
      `🟡 Premium Tier (พรีเมียม)\n` +
      `• เข้าถึงคลาสสอนโยคะฉบับเต็มกว่า 100+ คลาส\n` +
      `• ระบบบันทึกวันและชั่วโมงการฝึกส่วนตัว (Progress Tracker)\n` +
      `• พูดคุยและถามตอบกับครูผู้สอนโดยตรง\n\n` +
      `👉 สมัครสมาชิกได้ที่: https://purivaro.github.io/yoka/`;

  // 5. ติดต่อ / ที่อยู่ / เว็บไซต์
  } else if (
    userText.includes('ติดต่อ') ||
    userText.includes('เว็บ') ||
    userText.includes('ที่อยู่') ||
    userText.includes('แผนที่')
  ) {
    replyText = `📍 YOKA Yoga Studio\nสัมผัสบรรยากาศความสงบระดับพรีเมียมในสถานที่ธรรมชาติ\n\n` +
      `🌐 เว็บไซต์หลัก: https://purivaro.github.io/yoka/\n` +
      `💬 สอบถามข้อมูลเพิ่มเติม พิมพ์ข้อความสอบถามได้ตลอดเวลาครับ`;

  // 6. ข้อความต้อนรับเริ่มต้น / คำตอบทั่วไป
  } else {
    replyText = `สวัสดีครับ 🙏 ยินดีต้อนรับสู่ YOKA Yoga Studio!\n\n` +
      `คุณสามารถพิมพ์คำถามสอบถามข้อมูลจากเว็บไซต์ของเราได้เลยครับ:\n` +
      `1️⃣ พิมพ์ "โยคะมีกี่แบบ" - ดูรายละเอียด 4 ประเภทโยคะ\n` +
      `2️⃣ พิมพ์ "ท่าเบื้องต้น" - ดูวิธีฝึก 3 ท่าพื้นฐาน\n` +
      `3️⃣ พิมพ์ "ประโยชน์" - ดูประโยชน์ 4 ด้านของโยคะ\n` +
      `4️⃣ พิมพ์ "ราคา" หรือ "สมัคร" - ดูแพ็กเกจสมาชิก\n` +
      `5️⃣ พิมพ์ "ติดต่อ" - ดูลิงก์เว็บไซต์และข้อมูลสตูดิโอ`;
  }

  // If LINE Access Token is available, reply via Messaging API
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
