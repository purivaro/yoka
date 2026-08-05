const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const TMP_FILE = '/tmp/yoka_members.json';
const REPO_FILE = path.join(__dirname, '../data/members.json');

// Helper to load members (reads /tmp first, then repo file)
function loadMembers() {
  try {
    if (fs.existsSync(TMP_FILE)) {
      const data = fs.readFileSync(TMP_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading /tmp/yoka_members.json:', err);
  }

  try {
    if (fs.existsSync(REPO_FILE)) {
      const data = fs.readFileSync(REPO_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading data/members.json:', err);
  }

  return [];
}

// Helper to save members to /tmp
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

// Calculate Stats
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
