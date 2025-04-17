import { Request, Response, NextFunction } from "express";
import { prisma } from "@libs/prisma";
import { AppError, ErrorAppCode } from "@utils/errorHandler";
import { ZodError } from "zod";
import { userProfileSetupSchema } from "@root/types/userProfileSetup";

// Sets up a profile
export const profileSetupHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.id;

  try {
    const data = userProfileSetupSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { username: true, updatedAt: true },
      });

      if (!user) {
        throw new AppError("User not found", 404, ErrorAppCode.UserNotFound);
      }

      // Check if username is taken by someone else
      if (data.username !== user.username) {
        const exists = await tx.user.findUnique({
          where: { username: data.username },
        });
        if (exists) {
          throw new AppError(
            "Username already taken",
            409,
            ErrorAppCode.BadInput
          );
        }
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          username: data.username,
          bio: data.bio,
          newUser: true,
        },
      });

      return updated;
    });

    if (!result || (typeof result === "object" && "status" in result)) {
      return;
    }

    return res.status(200).json({ user: result });
  } catch (err) {
    if (err instanceof ZodError) {
      throw new AppError(
        "Validation failed",
        400,
        ErrorAppCode.ValidationFailed,
        err.flatten()
      );
    }

    return res.status(500).json({ error: "Internal server error" });
  }
};
