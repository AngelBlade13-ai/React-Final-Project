const multer = require("multer");

const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (_req, file, callback) => {
    if (!file?.mimetype || !file.mimetype.startsWith("image/")) {
      callback(new Error("Profile picture must be an image file."));
      return;
    }

    callback(null, true);
  }
});

module.exports = {
  uploadAvatar
};
