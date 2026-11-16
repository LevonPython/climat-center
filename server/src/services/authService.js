const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { httpError } = require('../config/httpError');
const { userRepository } = require('../repositories/userRepository');

// Tokens carry this, so changing a password signs out every session made with the old one.
function passwordStamp(passwordHash) {
  return crypto.createHash('sha256').update(passwordHash).digest('base64url').slice(0, 16);
}

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required');
  return jwt.sign({ username: user.username, role: user.role, pwd: passwordStamp(user.password_hash) }, secret, {
    subject: user.id,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

async function changeOwnPassword(userId, currentPassword, newPassword) {
  const user = await userRepository.findWithPasswordHash(userId);
  if (!user) throw httpError(401, 'Invalid token');
  if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
    throw httpError(403, 'Current password is incorrect');
  }
  const updated = await userRepository.setPasswordHash(userId, await bcrypt.hash(newPassword, 10));
  return signToken(updated);
}

async function setUserPassword(actorId, targetId, newPassword) {
  // Postgres matches a UUID written in any case, so compare them the same way.
  if (actorId.toLowerCase() === targetId.toLowerCase()) throw httpError(400, 'Use your own password page');
  const updated = await userRepository.setPasswordHash(targetId, await bcrypt.hash(newPassword, 10));
  if (!updated) throw httpError(404, 'Not found');
}

module.exports = { changeOwnPassword, passwordStamp, setUserPassword, signToken };
