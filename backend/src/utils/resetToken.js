const crypto = require('crypto');

/**
 * Generate a cryptographically secure random reset token
 * @returns {string} 64-character hex string
 */
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Hash a reset token using SHA-256
 * @param {string} token 
 * @returns {string} Hex encoded hash
 */
const hashResetToken = (token) => {
  if (!token || typeof token !== 'string') return '';
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
};

/**
 * Constant-time comparison between candidate token and stored hash
 * @param {string} candidateToken 
 * @param {string} storedHash 
 * @returns {boolean}
 */
const verifyResetTokenHash = (candidateToken, storedHash) => {
  if (!candidateToken || !storedHash) return false;
  const candidateHash = hashResetToken(candidateToken);

  try {
    const bufA = Buffer.from(candidateHash, 'hex');
    const bufB = Buffer.from(storedHash, 'hex');

    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (_) {
    return false;
  }
};

module.exports = {
  generateResetToken,
  hashResetToken,
  verifyResetTokenHash,
};
