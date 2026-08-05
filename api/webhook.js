const express = require('express');
const line = require('@line/bot-sdk');
const { addMemberStore } = require('./members');
require('dotenv').config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || ''
};

const app = express();

// In-memory conversation state for LINE OA user registration
const userSessions = new Map();

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
  const userId = (event.source && event.source.userId) ? event.source.userId : 'default_user';

  // Handle Image messages for registration photo step
  if (event.type === 'message' && event.message.type === 'image') {
    const session = userSessions.get(userId);
    if (session && session.step === 'AWAITING_PHOTO') {
      session.data.avatarUrl = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80';
      session.step = 'CONFIRMATION';

      const replyText = `📋 สรุปข้อมูลการสมัครสมาชิก YOKA Studio:\n\n` +
        `👤 Username: ${session.data.username}\n` +
        `📛 ชื่อ-นามสกุล: ${session.data.fullName}\n` +
        `📞 เบอร์โทรศัพท์: ${session.data.phone}\n` +
        `📍 สถานที่: ${session.data.country} (${session.data.province})\n` +
        `🖼️ รูปโปรไฟล์: บันทึกรูปถ่ายเรียบร้อย ✅\n\n` +
        `กรุณาพิมพ์ "ยืนยัน" เพื่อเสร็จสิ้นการสมัครสมาชิก\n` +
        `(หรือพิมพ์ "ยกเลิก" หากต้องการยกเลิก)`;

      return sendReply(event, replyText);
    }
  }

  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userText = event.message.text.trim();
  const lowerText = userText.toLowerCase();

  // Cancel command anytime
  if (lowerText === 'ยกเลิก' || lowerText === 'cancel') {
    userSessions.delete(userId);
    return sendReply(event, '❌ ยกเลิกขั้นตอนการสมัครสมาชิกเรียบร้อยแล้วครับ คุณสามารถเลือกดูข้อมูลคลาสหรือพิมพ์ "สมัครสมาชิก" เพื่อเริ่มต้นใหม่ได้ตลอดเวลาครับ');
  }

  // Check if user is currently in a registration state machine
  const session = userSessions.get(userId);

  if (session) {
    if (session.step === 'AWAITING_USERNAME') {
      session.data.username = userText;
      session.step = 'AWAITING_FULLNAME';
      return sendReply(event, `✅ บันทึก Username: "${userText}" เรียบร้อยครับ\n\nขั้นตอนที่ 2/5:\nกรุณาระบุ ชื่อ-นามสกุล ของคุณ (เช่น สมชาย ใจดี)`);

    } else if (session.step === 'AWAITING_FULLNAME') {
      session.data.fullName = userText;
      session.step = 'AWAITING_PHONE';
      return sendReply(event, `✅ บันทึกชื่อ: "${userText}" เรียบร้อยครับ\n\nขั้นตอนที่ 3/5:\nกรุณาระบุ เบอร์โทรศัพท์ สำหรับติดต่อ (เช่น 081-234-5678)`);

    } else if (session.step === 'AWAITING_PHONE') {
      session.data.phone = userText;
      session.step = 'AWAITING_LOCATION';
      return sendReply(event, `✅ บันทึกเบอร์โทรศัพท์เรียบร้อยครับ\n\nขั้นตอนที่ 4/5:\nกรุณาระบุ ประเทศ และ จังหวัด ของคุณ\n(ตัวอย่าง: "ไทย, กรุงเทพมหานคร" หรือ "ไทย, เชียงใหม่" หรือ "ญี่ปุ่น, โตเกียว")`);

    } else if (session.step === 'AWAITING_LOCATION') {
      let country = 'ไทย';
      let province = userText;

      if (userText.includes(',') || userText.includes(' ')) {
        const parts = userText.split(/[, ]+/);
        country = parts[0].trim();
        province = parts.slice(1).join(' ').trim() || parts[0].trim();
      }

      session.data.country = country;
      session.data.province = province;
      session.step = 'AWAITING_PHOTO';

      return sendReply(event, `✅ บันทึกสถานที่: ${country} (${province}) เรียบร้อยครับ\n\nขั้นตอนที่ 5/5:\nกรุณาส่ง รูปถ่าย ของคุณในแชทนี้\nหรือพิมพ์ "ใช้รูปโปรไฟล์" เพื่อใช้รูปจากบัญชี LINE ของคุณ`);

    } else if (session.step === 'AWAITING_PHOTO') {
      session.data.avatarUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
      session.step = 'CONFIRMATION';

      const replyText = `📋 สรุปข้อมูลการสมัครสมาชิก YOKA Studio:\n\n` +
        `👤 Username: ${session.data.username}\n` +
        `📛 ชื่อ-นามสกุล: ${session.data.fullName}\n` +
        `📞 เบอร์โทรศัพท์: ${session.data.phone}\n` +
        `📍 สถานที่: ${session.data.country} (${session.data.province})\n` +
        `🖼️ รูปโปรไฟล์: บันทึกรูปภาพเรียบร้อย ✅\n\n` +
        `กรุณาพิมพ์ "ยืนยัน" เพื่อยืนยันการสมัคร\n` +
        `(หรือพิมพ์ "ยกเลิก" หากต้องการเริ่มใหม่)`;

      return sendReply(event, replyText);

    } else if (session.step === 'CONFIRMATION') {
      if (lowerText.includes('ยืนยัน') || lowerText.includes('confirm') || lowerText.includes('ok') || lowerText === 'yes') {
        const newMember = addMemberStore({
          lineUserId: userId,
          username: session.data.username,
          fullName: session.data.fullName,
          phone: session.data.phone,
          country: session.data.country,
          province: session.data.province,
          avatarUrl: session.data.avatarUrl
        });

        userSessions.delete(userId);

        const successText = `🎉 ยินดีต้อนรับคุณ ${newMember.fullName} สู่ YOKA Yoga Studio!\n\n` +
          `การสมัครสมาชิกของคุณเสร็จสมบูรณ์เรียบร้อยแล้วครับ 🟢\n` +
          `• Username: ${newMember.username}\n` +
          `• รหัสสมาชิก: ${newMember.id}\n\n` +
          `คุณสามารถเข้าดูคลาสเรียน ตารางฝึก และหน้า Admin สรุปรายชื่อสมาชิกได้ที่เว็บไซต์หลัก:\n` +
          `https://purivaro.github.io/yoka/admin.html`;

        return sendReply(event, successText);
      }
    }
  }

  // Trigger to start registration flow
  if (
    lowerText.includes('สมัครสมาชิก') ||
    lowerText.includes('สมัคร') ||
    lowerText === 'register' ||
    lowerText === 'join'
  ) {
    userSessions.set(userId, {
      step: 'AWAITING_USERNAME',
      data: { username: '', fullName: '', phone: '', country: '', province: '', avatarUrl: '' }
    });

    const startText = `📝 ยินดีต้อนรับสู่ระบบสมัครสมาชิก YOKA Yoga Studio!\n\n` +
      `ขั้นตอนที่ 1/5:\n` +
      `กรุณาพิมพ์ Username ที่คุณต้องการใช้ (เช่น yoka_member1)\n\n` +
      `(พิมพ์ "ยกเลิก" ได้ตลอดเวลาหากต้องการยกเลิกการสมัคร)`;

    return sendReply(event, startText);
  }

  // 1. ถามเรื่องประเภท/จำนวนรูปแบบโยคะ
  if (
    lowerText.includes('มีกี่แบบ') ||
    lowerText.includes('กี่ประเภท') ||
    lowerText.includes('ประเภท') ||
    lowerText.includes('สไตล์') ||
    lowerText.includes('มีคลาสอะไรบ้าง') ||
    lowerText.includes('มีโยคะอะไรบ้าง') ||
    lowerText.includes('คลาสโยคะ')
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
      `🌐 ทำแบบทดสอบค้นหาโยคะที่ใช่หรือพิมพ์ "สมัครสมาชิก" เพื่อลงทะเบียนได้เลยครับ!\nhttps://purivaro.github.io/yoka/`;

  // 2. ถามเรื่องสอนวิธีฝึกโยคะเบื้องต้น / ท่าโยคะ
  } else if (
    lowerText.includes('ท่าโยคะ') ||
    lowerText.includes('ท่าเบื้องต้น') ||
    lowerText.includes('เริ่มต้น') ||
    lowerText.includes('สอนวิธี') ||
    lowerText.includes('dog') ||
    lowerText.includes('cobra') ||
    lowerText.includes('child')
  ) {
    replyText = `🧘‍♂️ สอนวิธีฝึกโยคะเบื้องต้น (Beginner Guide จาก YOKA):\n\n` +
      `1️⃣ Downward Dog (ท่าสุนัขก้มหน้า)\n` +
      `• จุดเน้น: ยกสะโพกสูงเป็นรูปตัว V คว่ำ, หลังตรง, ส้นเท้าพยายามกดลงพื้น\n\n` +
      `2️⃣ Child's Pose (ท่าเด็ก)\n` +
      `• จุดเน้น: สะโพกทับส้นเท้า, ยืดแขนไปด้านหน้า, หน้าผากผ่อนคลายบนพื้น ช่วยผ่อนคลายหลัง\n\n` +
      `3️⃣ Cobra Pose (ท่างูเห่า)\n` +
      `• จุดเน้น: เปิดหน้าอกขึ้น, กดไหล่ห่างจากหู, สะโพกแนบพื้น ช่วยสร้างความแข็งแรงให้กระดูกสันหลัง\n\n` +
      `💡 พิมพ์ "สมัครสมาชิก" เพื่อลงทะเบียนเรียนโยคะกับเราได้เลยครับ`;

  // 3. ประโยชน์ของโยคะ
  } else if (
    lowerText.includes('ประโยชน์') ||
    lowerText.includes('ช่วยอะไร') ||
    lowerText.includes('ดีอย่างไร') ||
    lowerText.includes('ออฟฟิศซินโดรม') ||
    lowerText.includes('ปวดหลัง')
  ) {
    replyText = `✨ 4 ประโยชน์หลักของการฝึกโยคะ (YOKA Studio):\n\n` +
      `1. Physical (ร่างกาย): เพิ่มความยืดหยุ่น สร้างแกนกลางลำตัว แก้ปวดหลังและออฟฟิศซินโดรม\n` +
      `2. Mental (จิตใจ): ลดระดับความเครียด (Cortisol) ฝึกสมาธิให้อยู่กับปัจจุบัน\n` +
      `3. Spiritual (พลังงาน): ปรับสมดุลลมหายใจ (Pranayama) เพิ่มพลังงานชีวิต\n` +
      `4. Lifestyle (การใช้ชีวิต): ช่วยให้หลับลึกขึ้นและปรับบุคลิกภาพให้ดีขึ้น\n\n` +
      `ฝึกเพียง 15 นาทีต่อวัน ก็เห็นผลลัพธ์ที่ดีขึ้นได้แล้วครับ!`;

  // 4. ราคา / สมาชิก
  } else if (
    lowerText.includes('ราคา') ||
    lowerText.includes('สมาชิก') ||
    lowerText.includes('ค่าเรียน') ||
    lowerText.includes('แพ็กเกจ')
  ) {
    replyText = `💳 แพ็กเกจสมาชิก YOKA Studio\n\n` +
      `🟢 Free Tier (ทดลองเล่นฟรี)\n` +
      `• เข้าถึงคลาสโยคะเบื้องต้น\n` +
      `• ทำแบบทดสอบค้นหาโยคะที่ใช่ฟรี!\n\n` +
      `🟡 Premium Tier (พรีเมียม)\n` +
      `• เข้าถึงคลาสสอนโยคะฉบับเต็มกว่า 100+ คลาส\n` +
      `• ระบบบันทึกวันและชั่วโมงการฝึกส่วนตัว (Progress Tracker)\n` +
      `• พูดคุยและถามตอบกับครูผู้สอนโดยตรง\n\n` +
      `👉 พิมพ์คำว่า "สมัครสมาชิก" ในแชทนี้เพื่อกรอกข้อมูลสมัครได้ทันทีครับ!`;

  // 5. ติดต่อ / ที่อยู่ / เว็บไซต์
  } else if (
    lowerText.includes('ติดต่อ') ||
    lowerText.includes('เว็บ') ||
    lowerText.includes('ที่อยู่') ||
    lowerText.includes('แผนที่')
  ) {
    replyText = `📍 YOKA Yoga Studio\nสัมผัสบรรยากาศความสงบระดับพรีเมียมในสถานที่ธรรมชาติ\n\n` +
      `🌐 เว็บไซต์หลัก: https://purivaro.github.io/yoka/\n` +
      `📊 หน้า Admin ดูรายชื่อสมาชิก: https://purivaro.github.io/yoka/admin.html\n\n` +
      `💬 พิมพ์ "สมัครสมาชิก" เพื่อสมัครสมาชิกผ่าน LINE OA ได้ทันทีครับ`;

  // 6. ข้อความต้อนรับเริ่มต้น
  } else {
    replyText = `สวัสดีครับ 🙏 ยินดีต้อนรับสู่ YOKA Yoga Studio!\n\n` +
      `คุณสามารถสมัครสมาชิกผ่าน LINE OA หรือสอบถามข้อมูลได้เลยครับ:\n` +
      `📝 พิมพ์ "สมัครสมาชิก" - เพื่อเริ่มสมัครสมาชิกแบบถามตอบผ่านแชทนี้\n` +
      `1️⃣ พิมพ์ "โยคะมีกี่แบบ" - ดูรายละเอียด 4 ประเภทโยคะ\n` +
      `2️⃣ พิมพ์ "ท่าเบื้องต้น" - ดูวิธีฝึก 3 ท่าพื้นฐาน\n` +
      `3️⃣ พิมพ์ "ประโยชน์" - ดูประโยชน์ 4 ด้านของโยคะ\n` +
      `4️⃣ พิมพ์ "ราคา" - ดูแพ็กเกจสมาชิก`;
  }

  return sendReply(event, replyText);
}

// Helper to send reply message to LINE API or log locally
async function sendReply(event, text) {
  if (config.channelAccessToken) {
    try {
      if (line.messagingApi && line.messagingApi.MessagingApiClient) {
        const client = new line.messagingApi.MessagingApiClient({
          channelAccessToken: config.channelAccessToken
        });
        return await client.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: 'text', text: text }]
        });
      } else {
        const client = new line.Client(config);
        return await client.replyMessage(event.replyToken, [{ type: 'text', text: text }]);
      }
    } catch (err) {
      console.error('Failed to send reply to LINE API:', err);
      return Promise.resolve(null);
    }
  } else {
    console.log(`[Simulated Reply for ${event.replyToken}]:\n${text}`);
    return Promise.resolve({ replyToken: event.replyToken, replyText: text });
  }
}

module.exports = app;
