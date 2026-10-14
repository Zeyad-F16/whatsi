/**
 * auth-service.js
 * نظام المصادقة والصلاحيات وإدارة المستخدمين لتطبيق Whatsi Z-ray
 * يدعم دورين رئيسيين:
 * 1. عضو مجلس إدارة (BOARD_MEMBER) - كامل الصلاحيات لجميع المستخدمين والتقارير
 * 2. مدير مبيعات ومراقب جودة (SALES_MANAGER_QC) - محدد بالحسابات المخصصة له أو الكل حسب الإذن
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./database');

const ROLES = {
  BOARD_MEMBER: 'BOARD_MEMBER',
  SALES_MANAGER_QC: 'SALES_MANAGER_QC'
};

const ROLE_LABELS = {
  BOARD_MEMBER: 'عضو مجلس إدارة',
  SALES_MANAGER_QC: 'مدير مبيعات ومراقب جودة'
};

/**
 * توحيد مسمى الرتبة حتى لو أُدخلت بالعربية في pgAdmin
 */
function normalizeRole(role) {
  if (!role) return ROLES.SALES_MANAGER_QC;
  const str = String(role).trim().toLowerCase();
  if (
    str === 'board_member' ||
    str === 'board' ||
    str === 'admin' ||
    str.includes('مجلس') ||
    str.includes('ادارة') ||
    str.includes('إدارة')
  ) {
    return ROLES.BOARD_MEMBER;
  }
  return ROLES.SALES_MANAGER_QC;
}

function getRoleLabel(role) {
  const norm = normalizeRole(role);
  return ROLE_LABELS[norm] || 'مستخدم';
}

function hashPassword(plainPassword) {
  return bcrypt.hashSync(String(plainPassword), 10);
}

function verifyPassword(inputPassword, storedPassword) {
  if (!storedPassword || inputPassword === undefined || inputPassword === null) return false;
  const inputStr = String(inputPassword);
  // فحص ما إذا كانت كلمة المرور مشفرة بواسطة bcrypt ($2a$, $2b$, $2y$)
  if (/^\$2[aby]\$\d{2}\$/.test(storedPassword)) {
    try {
      return bcrypt.compareSync(inputStr, storedPassword);
    } catch (e) {
      return false;
    }
  }
  // التوافق المباشر مع كلمات المرور المدخلة يدوياً كنص عادي عبر pgAdmin
  return storedPassword === inputStr;
}

function formatUser(user) {
  if (!user) return null;
  const normRole = normalizeRole(user.role);
  const isBoard = normRole === ROLES.BOARD_MEMBER;
  let allowed = [];
  if (Array.isArray(user.allowedAccounts)) {
    allowed = user.allowedAccounts;
  } else if (typeof user.allowedAccounts === 'string') {
    try {
      allowed = JSON.parse(user.allowedAccounts);
    } catch (e) {
      allowed = [];
    }
  }

  return {
    id: user.id,
    username: user.username,
    name: user.name || user.username,
    role: normRole,
    roleLabel: getRoleLabel(normRole),
    isBoardMember: isBoard,
    allAccounts: isBoard ? true : Boolean(user.allAccounts),
    allowedAccounts: isBoard ? [] : allowed,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

/**
 * تسجيل الدخول
 */
async function login(username, password) {
  if (!username || password === undefined || password === null) {
    throw new Error('اسم المستخدم وكلمة السر مطلوبان');
  }

  const prisma = db.getPrisma();
  const cleanUsername = String(username).trim();

  // البحث عن المستخدم بدون حساسية لحالة الأحرف
  const user = await prisma.user.findFirst({
    where: {
      username: {
        equals: cleanUsername,
        mode: 'insensitive'
      }
    }
  });

  if (!user) {
    throw new Error('اسم المستخدم أو كلمة السر غير صحيحة');
  }

  const isValid = verifyPassword(password, user.password);
  if (!isValid) {
    throw new Error('اسم المستخدم أو كلمة السر غير صحيحة');
  }

  // إذا كانت كلمة المرور محفوظة كنص صريح (مثل إدخالها من pgAdmin)، نقوم بترقيتها تلقائياً إلى تشفير bcrypt
  if (!/^\$2[aby]\$\d{2}\$/.test(user.password)) {
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashPassword(password) }
      });
    } catch (e) {
      console.warn('[Auth] Failed to auto-upgrade password hash:', e.message);
    }
  }

  // إنشاء توكن الجلسة (صالح لمدة 30 يوماً)
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.userSession.create({
    data: {
      token,
      userId: user.id,
      expiresAt
    }
  });

  return {
    token,
    user: formatUser(user)
  };
}

/**
 * إنهاء الجلسة
 */
async function logout(token) {
  if (!token) return true;
  try {
    const prisma = db.getPrisma();
    await prisma.userSession.deleteMany({
      where: { token: String(token).trim() }
    });
  } catch (e) {}
  return true;
}

/**
 * التحقق من التوكن واستخراج المستخدم
 */
async function getUserFromToken(token) {
  if (!token) return null;
  const prisma = db.getPrisma();
  const cleanToken = String(token).trim();

  const session = await prisma.userSession.findFirst({
    where: {
      token: cleanToken,
      expiresAt: { gt: new Date() }
    },
    include: {
      user: true
    }
  });

  if (!session || !session.user) return null;
  return formatUser(session.user);
}

/**
 * قائمة جميع المستخدمين (لمجلس الإدارة فقط)
 */
async function listUsers() {
  const prisma = db.getPrisma();
  const users = await prisma.user.findMany({
    orderBy: { id: 'asc' }
  });
  return users.map(formatUser);
}

/**
 * إنشاء مستخدم جديد
 */
async function createUser({ username, password, name = '', role = ROLES.SALES_MANAGER_QC, allAccounts = false, allowedAccounts = [] }) {
  if (!username || !String(username).trim()) {
    throw new Error('اسم المستخدم مطلوب');
  }
  if (!password || String(password).length < 4) {
    throw new Error('كلمة السر يجب ألا تقل عن 4 أحرف');
  }

  const cleanUsername = String(username).trim();
  const prisma = db.getPrisma();

  const existing = await prisma.user.findFirst({
    where: {
      username: {
        equals: cleanUsername,
        mode: 'insensitive'
      }
    }
  });

  if (existing) {
    throw new Error('اسم المستخدم مستخدم بالفعل، اختر اسماً آخر');
  }

  const normRole = normalizeRole(role);
  const isBoard = normRole === ROLES.BOARD_MEMBER;

  const newUser = await prisma.user.create({
    data: {
      username: cleanUsername,
      password: hashPassword(password),
      name: name ? String(name).trim() : cleanUsername,
      role: normRole,
      allAccounts: isBoard ? true : Boolean(allAccounts),
      allowedAccounts: isBoard ? [] : (Array.isArray(allowedAccounts) ? allowedAccounts : [])
    }
  });

  return formatUser(newUser);
}

/**
 * تعديل مستخدم
 */
async function updateUser(id, { password, name, role, allAccounts, allowedAccounts }) {
  const userId = Number(id);
  if (!userId) throw new Error('معرف المستخدم غير صالح');

  const prisma = db.getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) throw new Error('المستخدم غير موجود');

  const dataToUpdate = {};

  if (name !== undefined) {
    dataToUpdate.name = String(name).trim() || user.username;
  }

  if (role !== undefined) {
    dataToUpdate.role = normalizeRole(role);
  }

  const effectiveRole = dataToUpdate.role || normalizeRole(user.role);
  const isBoard = effectiveRole === ROLES.BOARD_MEMBER;

  if (isBoard) {
    dataToUpdate.allAccounts = true;
    dataToUpdate.allowedAccounts = [];
  } else {
    if (allAccounts !== undefined) {
      dataToUpdate.allAccounts = Boolean(allAccounts);
    }
    if (allowedAccounts !== undefined) {
      dataToUpdate.allowedAccounts = Array.isArray(allowedAccounts) ? allowedAccounts : [];
    }
  }

  if (password && String(password).trim().length >= 4) {
    dataToUpdate.password = hashPassword(password);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: dataToUpdate
  });

  return formatUser(updated);
}

/**
 * حذف مستخدم
 */
async function deleteUser(id, currentUserId) {
  const userId = Number(id);
  if (!userId) throw new Error('معرف المستخدم غير صالح');

  if (userId === Number(currentUserId)) {
    throw new Error('لا يمكنك حذف حسابك الحالي');
  }

  const prisma = db.getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) throw new Error('المستخدم غير موجود');

  // التأكد من عدم حذف آخر عضو مجلس إدارة
  if (normalizeRole(user.role) === ROLES.BOARD_MEMBER) {
    const boardCount = await prisma.user.count({
      where: {
        role: {
          in: ['BOARD_MEMBER', 'عضو مجلس إدارة', 'board_member', 'admin']
        }
      }
    });
    if (boardCount <= 1) {
      throw new Error('لا يمكن حذف آخر عضو مجلس إدارة في النظام');
    }
  }

  await prisma.user.delete({
    where: { id: userId }
  });

  return { success: true };
}

/**
 * التحقق مما إذا كان المستخدم مسموحاً له بالوصول إلى حساب سيلز معين
 */
function isAccountAllowedForUser(user, accountId) {
  if (!user) return false;
  if (user.isBoardMember || user.allAccounts) return true;
  if (!accountId) return false;
  const list = Array.isArray(user.allowedAccounts) ? user.allowedAccounts : [];
  return list.includes(String(accountId));
}

/**
 * فلترة قائمة الحسابات للمستخدم
 */
function filterAccountsForUser(user, allAccountsList) {
  if (!user) return [];
  if (user.isBoardMember || user.allAccounts) return allAccountsList;
  const allowed = new Set(Array.isArray(user.allowedAccounts) ? user.allowedAccounts : []);
  return (allAccountsList || []).filter(acc => allowed.has(String(acc.id)) || allowed.has(String(acc.name)));
}

module.exports = {
  ROLES,
  ROLE_LABELS,
  normalizeRole,
  getRoleLabel,
  hashPassword,
  verifyPassword,
  login,
  logout,
  getUserFromToken,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  isAccountAllowedForUser,
  filterAccountsForUser,
  formatUser
};
