import { Request, Response, NextFunction } from "express";
import { prisma } from "@libs/prisma";
import { AppError, ErrorAppCode } from "@utils/errorHandler";
import { ZodError } from "zod";
import {
  userProfileSetupSchema,
  userProfileSchema,
} from "@root/types/userProfileSetup";

// Sets up a profile
export const profileSetupHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.id;

  // Validate request body with Zod
  const data = userProfileSetupSchema.parse(req.body);

  // Begin transaction for database operations
  const result = await prisma.$transaction(async (tx) => {
    // Find the user by ID
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { username: true, updatedAt: true },
    });

    // If user not found, throw custom error
    if (!user) {
      throw new AppError("User not found", 404, ErrorAppCode.UserNotFound);
    }

    // Check if the username is taken by someone else
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

    // Update the user profile with new data
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

  // If we have a valid result, send back the updated user profile
  if (result && typeof result === "object" && "username" in result) {
    res.status(200).json({ user: result });
  } else {
    // If result is invalid, send an internal server error
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Returns the user's profile data
 */
export const getUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.id;

  // Find the user by ID
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      username: true,
      firstName: true,
      secondName: true,
      email: true,
      profilePic: true,
      bannerPic: true,
      colorTheme: true,
      bio: true,
      gender: true,
      birthday: true,
      newUser: true,
      nsfwEnabled: true,
      verifiedForNSFW: true,
      country: true,
    },
  });

  if (!user) {
    throw new AppError("User not found", 404, ErrorAppCode.UserNotFound);
  }

  res.status(200).json({ user });
};

/**
 * Edits any part of the user's profile
 * Fields:
 * - username (optional)
 * - bio (optional)
 * - profilePic (optional)
 * - bannerPic (optional)
 * - colorTheme (optional)
 */
export const editUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.id;
  const data = userProfileSchema.parse(req.body);

  const result = await prisma.$transaction(async (tx) => {
    // Find the user by ID
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { username: true, updatedAt: true },
    });

    // If user not found, throw custom error
    if (!user) {
      throw new AppError("User not found", 404, ErrorAppCode.UserNotFound);
    }

    // Update the user profile with new data
    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        username: data.username,
        bio: data.bio,
        profilePic: data.profilePic,
        bannerPic: data.bannerPic,
        colorTheme: data.colorTheme,
        newUser: true,
      },
    });

    return updated;
  });

  // If we have a valid result, send back the updated user profile
  if (result && typeof result === "object" && "username" in result) {
    res.status(200).json({ user: result });
  } else {
    // If result is invalid, send an internal server error
    res.status(500).json({ error: "Internal server error" });
  }
};
