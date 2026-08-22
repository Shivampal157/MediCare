import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

const configured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

if (configured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export async function uploadToCloudinary(filePath, folder = "medicare") {
  if (!filePath) return null;
  if (!configured) {
    return { secure_url: null, public_id: null, url: null };
  }
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: "image",
    });
    return result;
  } finally {
    fs.promises.unlink(filePath).catch(() => {});
  }
}

export async function deleteFromCloudinary(publicId) {
  if (!configured || !publicId) return;
  return cloudinary.uploader.destroy(publicId);
}
