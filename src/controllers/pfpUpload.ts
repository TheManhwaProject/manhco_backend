import express from "express";
import multer from "multer";
import { ProfilePictureProcessor } from "@root/services/ProfilePictureProcessor";
import { s3 } from "@libs/s3";
import { prisma } from "@libs/prisma";
import { randomUUID } from "crypto";
import { AppError, ErrorAppCode } from "@utils/errorHandler";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/upload-profile-picture",
  upload.single("picture"),
  async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Unauthorised", 401, ErrorAppCode.Unauthorised);
    }

    const file = req.file;
    if (!file) {
      throw new AppError("No file uploaded", 400, ErrorAppCode.BadInput);
    }

    try {
      const processor = new ProfilePictureProcessor();
      let processedImage: Buffer;
      try {
        processedImage = await processor.process(file.buffer);
      } catch (err: any) {
        if (err instanceof AppError) {
          throw err;
        }
        // Generic error
        throw new AppError(
          "Failed to process image",
          500,
          ErrorAppCode.InternalServerError
        );
      }

      const key = `profile-pictures/${userId}/${randomUUID()}.jpeg`;

      await s3
        .putObject({
          Bucket: process.env.AWS_S3_BUCKET!,
          Key: key,
          Body: processedImage,
          ContentType: "image/jpeg",
          ACL: "public-read",
        })
        .promise();

      const url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

      await prisma.user.update({
        where: { id: userId },
        data: { profilePic: url },
      });

      res.status(200).json({ url });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message ?? "Internal server error" });
    }
  }
);

export default router;
