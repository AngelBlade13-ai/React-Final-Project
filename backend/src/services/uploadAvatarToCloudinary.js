const streamifier = require("streamifier");
const config = require("../config");
const { cloudinary, assertCloudinaryConfig } = require("../lib/cloudinary");

async function uploadAvatarToCloudinary(fileBuffer, options = {}) {
  assertCloudinaryConfig();

  if (!fileBuffer) {
    throw new Error("A profile picture file is required.");
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder: options.folder || `${config.cloudinaryFolder}/avatars`,
        transformation: [
          {
            width: 512,
            height: 512,
            crop: "fill",
            gravity: "auto",
            quality: "auto",
            fetch_format: "auto"
          }
        ]
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({
          avatarUrl: result.secure_url,
          publicId: result.public_id,
          format: result.format
        });
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
}

module.exports = {
  uploadAvatarToCloudinary
};
