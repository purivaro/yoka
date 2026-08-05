const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const TMP_FILE = '/tmp/yoka_members.json';

// Initial seed data
const initialSeed = [
  {
    id: 'mem_1001',
    lineUserId: 'U99112233',
    username: 'mindful_somchai',
    fullName: 'สมชาย วงศ์สว่าง',
    phone: '081-987-6543',
    country: 'ไทย',
    province: 'กรุงเทพมหานคร',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    createdAt: '2026-08-05T08:30:00.000Z'
  },
  {
    id: 'mem_1002',
    lineUserId: 'U88223344',
    username: 'nicha_yoga',
    fullName: 'นิชาภา กิจเจริญ',
    phone: '089-456-7890',
    country: 'ไทย',
    province: 'เชียงใหม่',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    createdAt: '2026-08-05T09:15:00.000Z'
  },
  {
    id: 'mem_1003',
    lineUserId: 'U77334455',
    username: 'phuket_zen',
    fullName: 'อนุชา รัตนเพชร',
    phone: '086-111-2233',
    country: 'ไทย',
    province: 'ภูเก็ต',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    createdAt: '2026-08-05T10:05:00.000Z'
  },
  {
    id: 'mem_1004',
    lineUserId: 'U66445566',
    username: 'sarah_uk',
    fullName: 'Sarah Jenkins',
    phone: '+44 7700 900077',
    country: 'สหราชอาณาจักร',
    province: 'ลอนดอน',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    createdAt: '2026-08-05T11:20:00.000Z'
  },
  {
    id: 'mem_1005',
    lineUserId: 'U55556677',
    username: 'kenji_tokyo',
    fullName: 'Kenji Sato',
    phone: '+81 90 1234 5678',
    country: 'ญี่ปุ่น',
    province: 'โตเกียว',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    createdAt: '2026-08-05T12:00:00.000Z'
  },
  {
    id: 'mem_1006',
    lineUserId: 'U44667788',
    username: 'chonburi_flow',
    fullName: 'กมลวรรณ สุขเสริฐ',
    phone: '082-333-4455',
    country: 'ไทย',
    province: 'ชลบุรี',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    createdAt: '2026-08-05T13:10:00.000Z'
  },
  {
    id: 'mem_1007',
    lineUserId: 'U33778899',
    username: 'korat_yogi',
    fullName: 'ธนากร ศรีสมบูรณ์',
    phone: '085-777-8899',
    country: 'ไทย',
    province: 'นครราชสีมา',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
    createdAt: '2026-08-05T13:45:00.000Z'
  }
];

// Helper to load members
function loadMembers() {
  try {
    if (fs.existsSync(TMP_FILE)) {
      const data = fs.readFileSync(TMP_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading /tmp/yoka_members.json:', err);
  }
  return [...initialSeed];
}

// Helper to save members
function saveMembers(members) {
  try {
    fs.writeFileSync(TMP_FILE, JSON.stringify(members, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing /tmp/yoka_members.json:', err);
  }
}

const membersStore = loadMembers();

const app = express();

// CORS Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-line-signature');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(express.json());

// Helper function to calculate stats
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

// GET /api/members
app.get('/api/members', (req, res) => {
  const currentMembers = loadMembers();
  membersStore.length = 0;
  membersStore.push(...currentMembers);
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

  const currentMembers = loadMembers();

  const newMember = {
    id: `mem_${Date.now()}`,
    lineUserId: lineUserId || `user_${Date.now()}`,
    username: username.trim(),
    fullName: fullName.trim(),
    phone: phone ? phone.trim() : 'ไม่ระบุ',
    country: country ? country.trim() : 'ไทย',
    province: province ? province.trim() : 'กรุงเทพมหานคร',
    avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    createdAt: new Date().toISOString()
  };

  currentMembers.unshift(newMember);
  saveMembers(currentMembers);

  membersStore.length = 0;
  membersStore.push(...currentMembers);

  res.status(201).json({
    success: true,
    member: newMember,
    stats: calculateStats(membersStore)
  });
});

// Programmatic helper from Webhook
function addMemberStore(memberData) {
  const currentMembers = loadMembers();

  const newMember = {
    id: `mem_${Date.now()}`,
    lineUserId: memberData.lineUserId || `user_${Date.now()}`,
    username: memberData.username ? memberData.username.trim() : 'yoka_user',
    fullName: memberData.fullName ? memberData.fullName.trim() : 'ผู้สมัครสมาชิก',
    phone: memberData.phone ? memberData.phone.trim() : 'ไม่ระบุ',
    country: memberData.country ? memberData.country.trim() : 'ไทย',
    province: memberData.province ? memberData.province.trim() : 'กรุงเทพมหานคร',
    avatarUrl: memberData.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    createdAt: new Date().toISOString()
  };

  currentMembers.unshift(newMember);
  saveMembers(currentMembers);

  membersStore.length = 0;
  membersStore.push(...currentMembers);

  return newMember;
}

module.exports = app;
module.exports.addMemberStore = addMemberStore;
module.exports.membersStore = membersStore;
