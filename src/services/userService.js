const User = require('../models/User');

// Blocking revokes every existing customer session and outstanding recovery code.
async function setUserBlocked(id, blocked) {
  const update = { $set: { isBlocked: blocked } };
  if (blocked) {
    update.$inc = { sessionVersion: 1 };
    update.$unset = { passwordReset: 1, emailChange: 1 };
  }
  return User.updateOne({ _id: id }, update);
}

module.exports = { setUserBlocked };
