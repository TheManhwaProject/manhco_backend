import { Request, Response, NextFunction } from "express";
import { ProfilePictureProcessor } from "@root/services/ProfilePictureProcessor";
import { s3 } from "@libs/s3";
import { prisma } from "@libs/prisma";
import { randomUUID } from "crypto";
import { AppError, ErrorAppCode } from "@utils/errorHandler";
import { makeSingleUploadMiddleware } from "@utils/upload";

export const uploadProfilePictureMiddleware = makeSingleUploadMiddleware(
  "profilePicture",
  {
    maxSizeMB: 2,
    allowedMimeTypes: ["image/jpeg", "image/png"],
  }
);

export const uploadProfilePicture = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user as any;
  if (!user?.id) {
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
      if (err instanceof AppError) throw err;
      throw new AppError(
        "Failed to process image",
        500,
        ErrorAppCode.InternalServerError
      );
    }

    // Get the current pfp if any
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { profilePic: true },
    });
    if (userRecord?.profilePic) {
      const url = new URL(userRecord.profilePic);
      const key = decodeURIComponent(url.pathname.slice(1));

      await s3
        .deleteObject({
          Bucket: process.env.AWS_S3_BUCKET!,
          Key: key,
        })
        .promise();
    }

    const key = `profile-pictures/${user.id}/${randomUUID()}.jpeg`;

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
      where: { id: user.id },
      data: { profilePic: url },
    });

    res.status(200).json({ url });
  } catch (err: any) {
    next(err);
  }
};
