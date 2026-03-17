const express = require("express");
const { requireAdmin } = require("../middleware/auth");
const { uploadVideo } = require("../middleware/uploadVideo");
const { uploadVideoToCloudinary } = require("../services/uploadVideoToCloudinary");

const router = express.Router();

router.post("/", requireAdmin, uploadVideo.single("video"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No video file uploaded." });
    }

    const result = await uploadVideoToCloudinary(req.file.buffer);

    return res.status(200).json(result);
  } catch (error) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "Video file is too large." });
    }

    next(error);
  }
});

module.exports = router;
