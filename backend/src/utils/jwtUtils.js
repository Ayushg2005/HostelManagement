const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'fallback_access_secret_12345';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_12345';

// Generate Access Token (short lived - e.g. 15m)
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );
};

// Generate Refresh Token (long lived - e.g. 7d)
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

// Verify Access Token
const verifyAccessToken = (token) => {
  return jwt.verify(token, ACCESS_TOKEN_SECRET);
};

// Verify Refresh Token
const verifyRefreshToken = (token) => {
  return jwt.verify(token, REFRESH_TOKEN_SECRET);
};

// Cookie options for Refresh Token
const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true, // Prevents XSS script access
    secure: isProduction, // HTTPS only in production
    sameSite: isProduction ? 'none' : 'lax', // Must be 'none' for cross-domain cookies (Vercel -> Render)
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getCookieOptions,
};
