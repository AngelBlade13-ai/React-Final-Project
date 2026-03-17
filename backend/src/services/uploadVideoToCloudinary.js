const streamifier = require("streamifier");
const config = require("../config");
const { cloudinary, assertCloudinaryConfig } = require("../lib/cloudinary");

async function uploadVideoToCloudinary(fileBuffer, options = {}) {
  assertCloudinaryConfig();

  if (!fileBuffer) {
    throw new Error("A video file buffer is required.");
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video",
        folder: options.folder || config.cloudinaryFolder
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({
          videoUrl: result.secure_url,
          publicId: result.public_id,
          duration: result.duration,
          format: result.format
        });
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
}

module.exports = {
  uploadVideoToCloudinary
};
