const express = require("express");
const { requireAdmin } = require("../middleware/auth");
const { uploadVideo } = require("../middleware/uploadVideo");
const { recordAdminAuditEvent } = require("../services/adminAuditService");
const {
  uploadVideoToCloudinary
} = require("../services/uploadVideoToCloudinary");

const router = express.Router();

router.post(
  "/",
  requireAdmin,
  uploadVideo.single("video"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No video file uploaded." });
      }

      const result = await uploadVideoToCloudinary(req.file.buffer);
      await recordAdminAuditEvent(req, {
        action: "asset.video_uploaded",
        entityType: "upload",
        entityId: result.publicId || req.file.originalname,
        entityLabel: req.file.originalname,
        details: {
          duration: result.duration,
          format: result.format,
          mimeType: req.file.mimetype,
          size: req.file.size,
          videoUrl: result.videoUrl
        }
      });

      return res.status(200).json(result);
    } catch (error) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Video file is too large." });
      }

      if (error.http_code === 413) {
        return res.status(400).json({
          message:
            "Video upload exceeded the current provider limit. Large videos now use chunked upload, but your file may still be above the account allowance."
        });
      }

      next(error);
    }
  }
);

module.exports = router;
