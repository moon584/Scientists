import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'scientist-website-jwt-secret';
const TOKEN_EXPIRY = '7d';

/** 生成 JWT */
export function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

/** 验证 JWT 中间件 —— 将用户信息挂载到 req.user */
export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录，请先登录' });
  }
  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

/** 管理员权限中间件 */
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: '权限不足，仅管理员可访问' });
  }
  next();
}

export { JWT_SECRET };
