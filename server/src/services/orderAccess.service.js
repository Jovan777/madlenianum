const crypto = require("crypto");

const generatePublicAccessToken = () => crypto.randomBytes(32).toString("base64url");

const hashPublicAccessToken = (token) => crypto
  .createHash("sha256")
  .update(String(token || ""), "utf8")
  .digest("hex");

const tokenMatchesHash = (token, expectedHash) => {
  if (!token || !expectedHash) return false;
  const actual = Buffer.from(hashPublicAccessToken(token), "hex");
  const expected = Buffer.from(String(expectedHash), "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
};

const assignNewPublicAccessToken = (order) => {
  const token = generatePublicAccessToken();
  order.publicAccessTokenHash = hashPublicAccessToken(token);
  return token;
};

module.exports = {
  assignNewPublicAccessToken,
  generatePublicAccessToken,
  hashPublicAccessToken,
  tokenMatchesHash,
};
