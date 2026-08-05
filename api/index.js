const express = require('express');
const line = require('@line/bot-sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || ''
};

const TMP_MEMBERS_FILE = '/tmp/yoka_members.json';
const TMP_SESSIONS_FILE = '/tmp/yoka_user_sessions.json';
const REPO_MEMBERS_FILE = path.join(__dirname, '../data/members.json');

// --- Helper Functions for Data Persistence ---

function loadMembers() {
  try {
    if (fs.existsSync(TMP_MEMBERS_FILE)) {
      const data = fs.readFileSync(TMP_MEMBERS_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading /tmp/yoka_members.json:', err);
  }

  try {
    if (fs.existsSync(REPO_MEMBERS_FILE)) {
      const data = fs.readFileSync(REPO_MEMBERS_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading data/members.json:', err);
  }

  return [];
}

function saveMembers(members) {
  try {
    fs.writeFileSync(TMP_MEMBERS_FILE, JSON.stringify(members, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing /tmp/yoka_members.json:', err);
  }
}

function loadSessions() {
  try {
    if (fs.existsSync(TMP_SESSIONS_FILE)) {
      const raw = fs.readFileSync(TMP_SESSIONS_FILE, 'utf8');
      const arr = JSON.parse(raw);
      return new Map(arr);
    }
  } catch (err) {
    console.error('Error reading sessions file:', err);
  }
  return new Map();
}

function saveSessions(sessionsMap) {
  try {
    const arr = Array.from(sessionsMap.entries());
    fs.writeFileSync(TMP_SESSIONS_FILE, JSON.stringify(arr, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing sessions file:', err);
  }
}

// Global In-Memory Stores
let membersStore = loadMembers();
let userSessions = loadSessions();

function addMemberToStore(memberData) {
  membersStore = loadMembers();

  const newMember = {
    id: `mem_${Date.now()}`,
    lineUserId: memberData.lineUserId || `user_${Date.now()}`,
    username: memberData.username ? memberData.username.trim() : 'yoka_user',
    fullName: memberData.fullName ? memberData.fullName.trim() : 'ผู้สมัครสมาชิก',
    phone: memberData.phone ? memberData.phone.trim() : 'ไม่ระบุ',
    country: memberData.country ? memberData.country.trim() : 'ไทย',
    province: memberData.province ? memberData.province.trim() : 'กรุงเทพมหานคร',
    avatarUrl: memberData.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(memberData.fullName || 'YOKA')}&background=ffa929&color=0E121A&size=200&font-size=0.45`,
    createdAt: new Date().toISOString()
  };

  membersStore.unshift(newMember);
  saveMembers(membersStore);
  return newMember;
}

function calculateStats(members) {
  const total = members.length;
  const countryCount = {};
  const provinceCount = {};

  members.forEach(m => {
    const country = m.country || 'ไม่ระบุ';
    const province = m.province || 'ไม่ระบุ';
    countryCount[country] = (countryCount[country] || 0) + 1;
    provinceCount[province] = (provinceCount[province] || 0) + 1;
  });

  return {
    total,
    byCountry: countryCount,
    byProvince: provinceCount
  };
}

// Fetch REAL LINE Profile picture
async function getLineProfilePic(userId, fallbackName) {
  if (config.channelAccessToken && userId && userId !== 'default_user' && !userId.startsWith('test_')) {
    try {
      if (line.messagingApi && line.messagingApi.MessagingApiClient) {
        const client = new line.messagingApi.MessagingApiClient({ channelAccessToken: config.channelAccessToken });
        const profile = await client.getProfile(userId);
        if (profile && profile.pictureUrl) {
          return profile.pictureUrl;
        }
      } else {
        const client = new line.Client(config);
        const profile = await client.getProfile(userId);
        if (profile && profile.pictureUrl) {
          return profile.pictureUrl;
        }
      }
    } catch (err) {
      console.warn('Could not fetch LINE profile photo:', err.message);
    }
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName || 'YOKA')}&background=ffa929&color=0E121A&size=200&font-size=0.45`;
}

// --- Express App Setup ---

const app = express();

// CORS Headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-line-signature');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Safe Body Parser
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

// --- API Routes for Members ---

// GET /api/members
app.get('/api/members', (req, res) => {
  membersStore = loadMembers();
  const stats = calculateStats(membersStore);
  res.status(200).json({
    success: true,
    stats,
    members: membersStore
  });
});

// POST /api/members
app.post('/api/members', (req, res) => {
  const { lineUserId, username, fullName, phone, country, province, avatarUrl } = req.body || {};

  if (!username || !fullName) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const newMember = addMemberToStore({ lineUserId, username, fullName, phone, country, province, avatarUrl });
  const stats = calculateStats(membersStore);

  res.status(201).json({
    success: true,
    member: newMember,
    stats
  });
});

// DELETE /api/members/:id or DELETE /api/members (with query ?id=...)
app.delete(['/api/members/:id', '/api/members'], (req, res) => {
  const id = req.params.id || req.query.id;
  if (!id) {
    return res.status(400).json({ success: false, message: 'Missing member ID' });
  }

  membersStore = loadMembers();
  const initialCount = membersStore.length;
  membersStore = membersStore.filter(m => m.id !== id);

  if (membersStore.length === initialCount) {
    return res.status(404).json({ success: false, message: 'Member not found' });
  }

  saveMembers(membersStore);
  const stats = calculateStats(membersStore);

  res.status(200).json({
    success: true,
    message: 'Member deleted successfully',
    stats,
    members: membersStore
  });
});

// --- API Routes for LINE Webhook ---

// GET /api/webhook (Health Check)
app.get('/api/webhook', (req, res) => {
  res.status(200).send('YOKA Yoga Studio - LINE OA Webhook & Members API is active!');
});

// POST /api/webhook (LINE Event Listener)
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

// Handle Individual LINE Events
async function handleEvent(event) {
  const userId = (event.source && event.source.userId) ? event.source.userId : 'default_user';
  userSessions = loadSessions();

  if (event.type === 'message' && event.message.type === 'image') {
    const session = userSessions.get(userId);
    if (session && session.step === 'AWAITING_PHOTO') {
      const realAvatar = await getLineProfilePic(userId, session.data.fullName);
      session.data.avatarUrl = realAvatar;
      session.step = 'CONFIRMATION';
      userSessions.set(userId, session);
      saveSessions(userSessions);

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

  // 1. Cancel command
  if (lowerText === 'ยกเลิก' || lowerText === 'cancel') {
    userSessions.delete(userId);
    saveSessions(userSessions);
    return sendReply(event, '❌ ยกเลิกขั้นตอนการสมัครสมาชิกเรียบร้อยแล้วครับ คุณสามารถเลือกดูข้อมูลคลาสหรือพิมพ์ "สมัครสมาชิก" เพื่อเริ่มต้นใหม่ได้ตลอดเวลาครับ');
  }

  // 2. One-Shot Quick Registration Command
  if ((lowerText.startsWith('สมัครสมาชิก') || lowerText.startsWith('สมัคร')) && userText.includes(',')) {
    const content = userText.replace(/^(สมัครสมาชิก|สมัคร)\s*/i, '');
    const parts = content.split(',').map(s => s.trim());

    if (parts.length >= 2) {
      const username = parts[0] || 'yoka_user';
      const fullName = parts[1] || 'ผู้สมัครสมาชิก';
      const phone = parts[2] || 'ไม่ระบุ';
      const country = parts[3] || 'ไทย';
      const province = parts[4] || 'กรุงเทพมหานคร';

      const avatarUrl = await getLineProfilePic(userId, fullName);

      const newMember = addMemberToStore({
        lineUserId: userId,
        username,
        fullName,
        phone,
        country,
        province,
        avatarUrl
      });

      userSessions.delete(userId);
      saveSessions(userSessions);

      const successText = `🎉 ยินดีต้อนรับคุณ ${newMember.fullName} สู่ YOKA Yoga Studio!\n\n` +
        `การสมัครสมาชิกของคุณเสร็จสมบูรณ์เรียบร้อยแล้วครับ 🟢\n` +
        `• Username: ${newMember.username}\n` +
        `• รหัสสมาชิก: ${newMember.id}\n\n` +
        `คุณสามารถเข้าดูคลาสเรียน และหน้า Admin สรุปรายชื่อสมาชิกเรียลไทม์ได้ที่ลิงก์นี้ครับ:\n` +
        `https://purivaro.github.io/yoka/admin.html`;

      return sendReply(event, successText);
    }
  }

  // 3. Trigger new registration flow
  if (
    lowerText === 'สมัครสมาชิก' ||
    lowerText === 'สมัคร' ||
    lowerText === 'register' ||
    lowerText === 'join'
  ) {
    userSessions.set(userId, {
      step: 'AWAITING_USERNAME',
      data: { username: '', fullName: '', phone: '', country: '', province: '', avatarUrl: '' }
    });
    saveSessions(userSessions);

    const startText = `📝 ยินดีต้อนรับสู่ระบบสมัครสมาชิก YOKA Yoga Studio!\n\n` +
      `ขั้นตอนที่ 1/5:\n` +
      `กรุณาพิมพ์ Username ที่คุณต้องการใช้ (เช่น yoka_member1)\n\n` +
      `(พิมพ์ "ยกเลิก" ได้ตลอดเวลาหากต้องการยกเลิกการสมัคร)`;

    return sendReply(event, startText);
  }

  // 4. Continue existing interactive registration session
  const session = userSessions.get(userId);

  if (session) {
    if (session.step === 'AWAITING_USERNAME') {
      session.data.username = userText;
      session.step = 'AWAITING_FULLNAME';
      userSessions.set(userId, session);
      saveSessions(userSessions);
      return sendReply(event, `✅ บันทึก Username: "${userText}" เรียบร้อยครับ\n\nขั้นตอนที่ 2/5:\nกรุณาระบุ ชื่อ-นามสกุล ของคุณ (เช่น สมชาย ใจดี)`);

    } else if (session.step === 'AWAITING_FULLNAME') {
      session.data.fullName = userText;
      session.step = 'AWAITING_PHONE';
      userSessions.set(userId, session);
      saveSessions(userSessions);
      return sendReply(event, `✅ บันทึกชื่อ: "${userText}" เรียบร้อยครับ\n\nขั้นตอนที่ 3/5:\nกรุณาระบุ เบอร์โทรศัพท์ สำหรับติดต่อ (เช่น 081-234-5678)`);

    } else if (session.step === 'AWAITING_PHONE') {
      session.data.phone = userText;
      session.step = 'AWAITING_LOCATION';
      userSessions.set(userId, session);
      saveSessions(userSessions);
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
      userSessions.set(userId, session);
      saveSessions(userSessions);

      return sendReply(event, `✅ บันทึกสถานที่: ${country} (${province}) เรียบร้อยครับ\n\nขั้นตอนที่ 5/5:\nกรุณาส่ง รูปถ่าย ของคุณในแชทนี้\nหรือพิมพ์ "ใช้รูปโปรไฟล์" เพื่อใช้รูปจากบัญชี LINE ของคุณ`);

    } else if (session.step === 'AWAITING_PHOTO') {
      const realAvatar = await getLineProfilePic(userId, session.data.fullName);
      session.data.avatarUrl = realAvatar;
      session.step = 'CONFIRMATION';
      userSessions.set(userId, session);
      saveSessions(userSessions);

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
        const realAvatar = await getLineProfilePic(userId, session.data.fullName);
        const newMember = addMemberToStore({
          lineUserId: userId,
          username: session.data.username,
          fullName: session.data.fullName,
          phone: session.data.phone,
          country: session.data.country,
          province: session.data.province,
          avatarUrl: realAvatar
        });

        userSessions.delete(userId);
        saveSessions(userSessions);

        const successText = `🎉 ยินดีต้อนรับคุณ ${newMember.fullName} สู่ YOKA Yoga Studio!\n\n` +
          `การสมัครสมาชิกของคุณเสร็จสมบูรณ์เรียบร้อยแล้วครับ 🟢\n` +
          `• Username: ${newMember.username}\n` +
          `• รหัสสมาชิก: ${newMember.id}\n\n` +
          `คุณสามารถเข้าดูคลาสเรียน และหน้า Admin สรุปรายชื่อสมาชิกเรียลไทม์ได้ที่ลิงก์นี้ครับ:\n` +
          `https://purivaro.github.io/yoka/admin.html`;

        return sendReply(event, successText);
      }
    }
  }

  // 5. General Q&A Intent Handlers
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
module.exports.addMemberToStore = addMemberToStore;
module.exports.loadMembers = loadMembers;
