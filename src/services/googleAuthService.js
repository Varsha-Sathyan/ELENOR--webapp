const { randomBytes } = require('node:crypto');
const { OAuth2Client } = require('google-auth-library');
const randomToken = () => randomBytes(32).toString('base64url');

function googleClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) return null;
  return new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}
module.exports = { randomToken, googleClient };
