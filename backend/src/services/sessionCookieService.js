const config = require("../config");

const ADMIN_SESSION_COOKIE = "suno_blog_admin_session";
const USER_SESSION_COOKIE = "suno_blog_user_session";

function getBaseCookieOptions() {
  const isProduction = config.nodeEnv === "production";

  return {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    path: "/"
  };
}

function setAdminSessionCookie(res, token) {
  res.cookie(ADMIN_SESSION_COOKIE, token, {
    ...getBaseCookieOptions(),
    maxAge: 2 * 60 * 60 * 1000
  });
}

function clearAdminSessionCookie(res) {
  res.clearCookie(ADMIN_SESSION_COOKIE, getBaseCookieOptions());
}

function setUserSessionCookie(res, token) {
  res.cookie(USER_SESSION_COOKIE, token, {
    ...getBaseCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function clearUserSessionCookie(res) {
  res.clearCookie(USER_SESSION_COOKIE, getBaseCookieOptions());
}

module.exports = {
  ADMIN_SESSION_COOKIE,
  USER_SESSION_COOKIE,
  clearAdminSessionCookie,
  clearUserSessionCookie,
  setAdminSessionCookie,
  setUserSessionCookie
};
