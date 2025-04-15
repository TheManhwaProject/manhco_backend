import { Request, Response, NextFunction } from "express";
import { prisma } from "@libs/prisma";
import { AppError } from "@utils/errorHandler";
import { getUserBand } from "@utils/contentFilter";

/**
 * Returns the user's NSFW status
 */
export const getUserNSFWStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user as any;
    const nsfwStatus = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!nsfwStatus || !nsfwStatus.nsfwEnabled) {
      throw new AppError("User not found", 404);
    }

    res.status(200).json({
      nsfwEnabled: nsfwStatus.nsfwEnabled,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Attempts to toggle the user's NSFW status
 *
 * Adheres to NSFW policy;
 * - Band 1: Disallowed
 * - Band 2: Allowed if user is verified for NSFW
 * - Band 3: Allowed
 *
 * You must provide `nsfwEnabled`, representing the
 * new status of the user's NSFW status.
 */
export const toggleUserNSFWStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user as any;
    const nsfwStatus = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!nsfwStatus || !nsfwStatus.nsfwEnabled) {
      throw new AppError("User not found", 404);
    }

    // get user band
    const band = await getUserBand(nsfwStatus);

    // if user is trying to disable it, allow it
    if (req.body.nsfwEnabled === false) {
      res.status(200).json({
        nsfwEnabled: false,
      });
      return;
    }

    if (band.band === 1) {
      // band.reason appcode, also return a human readable message
      let message;
      switch (band.reason) {
        case "missing_nsfw_policy":
          message = "NSFW policy not found";
          break;
        case "country_banned":
          message = "This feature is not available in your country";
          break;
        case "country_limited":
          // this will only occur if band 2 is disabled
          message = "This feature is not available in your country";
          break;
        case "birthday_required":
          message = "You must provide your birthday to use this feature";
          break;
        case "underage":
          message = "You must be at least 18 years old to use this feature";
          break;
        default:
          message = "This feature is not available in your country";
      }

      return new AppError(message, 403, band.reason);
    } else if (band.band === 2) {
      // if band 2 is enabled, but user is not verified, return error
      if (!nsfwStatus.verifiedForNSFW) {
        return new AppError(
          "You must verify your age to use this feature",
          403,
          "country_limited"
        );
      }
      // if band 2 is enabled and user is verified, toggle nsfw status
      await prisma.user.update({
        where: { id: user.id },
        data: { nsfwEnabled: true },
      });

      res.status(200).json({
        nsfwEnabled: true,
      });
    } else {
      // if band 3 is enabled, toggle nsfw status
      await prisma.user.update({
        where: { id: user.id },
        data: { nsfwEnabled: true },
      });

      res.status(200).json({
        nsfwEnabled: true,
      });
    }
  } catch (error) {
    next(error);
  }
};
