const crypto = require('crypto');

/**
 * Generate a cryptographically secure 6-digit numeric OTP
 * @returns {string} 6-digit string
 */
const generateNumericOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Hash an OTP using SHA-256
 * @param {string} otp 
 * @returns {string} Hex encoded hash
 */
const hashOtp = (otp) => {
  return crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
};

/**
 * Constant-time comparison between candidate OTP and stored hash
 * @param {string} candidateOtp 
 * @param {string} storedHash 
 * @returns {boolean}
 */
const verifyOtpHash = (candidateOtp, storedHash) => {
  if (!candidateOtp || !storedHash) return false;
  const candidateHash = hashOtp(candidateOtp);

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
  generateNumericOtp,
  hashOtp,
  verifyOtpHash,
};
