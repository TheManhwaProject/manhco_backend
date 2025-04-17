import { Request, Response, NextFunction } from "express";
import { prisma } from "@libs/prisma";
import { AppError, ErrorAppCode } from "@utils/errorHandler";
import { getUserBand } from "@utils/contentFilter";

/**
 * Returns the user's NSFW status
 */
export const getUserNSFWStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user as any;
  const nsfwStatus = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!nsfwStatus || !nsfwStatus.nsfwEnabled) {
    throw new AppError("User not found", 404, ErrorAppCode.UserNotFound);
  }

  res.status(200).json({
    nsfwEnabled: nsfwStatus.nsfwEnabled,
  });
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
  const user = req.user as any;
  const userModel = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!userModel) {
    throw new AppError("User not found", 404, ErrorAppCode.UserNotFound);
  }

  // get user band
  const band = await getUserBand(userModel);

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
      case ErrorAppCode.MissingNSFWPolicy:
        message = "NSFW policy not found";
        break;
      case ErrorAppCode.CountryBanned:
        message = "This feature is not available in your country";
        break;
      case ErrorAppCode.CountryLimited:
        // this will only occur if band 2 is disabled
        message = "This feature is not available in your country";
        break;
      case ErrorAppCode.BirthdayRequired:
        message = "You must provide your birthday to use this feature";
        break;
      case ErrorAppCode.Underage:
        message = "You must be at least 18 years old to use this feature";
        break;
      default:
        message = "This feature is not available in your country";
    }

    throw new AppError(message, 403, band.reason);
  } else if (band.band === 2) {
    // if band 2 is enabled, but user is not verified, return error
    if (!userModel.verifiedForNSFW) {
      throw new AppError(
        "You must verify your age to use this feature",
        403,
        ErrorAppCode.CountryLimited
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
};

/**
 * Get admin settings for NSFW policy
 *
 * Returns the nsfw policy and band 1/2 countries
 */
export const getNSFWPolicy = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const nsfwPolicy = await prisma.nSFWPolicy.findUnique({ where: { id: 1 } });
    const restrictedCountries = await prisma.nSFWRestrictedCountry.findMany();

    res.status(200).json({
      nsfwPolicy,
      restrictedCountries,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Adds a new restricted country to the NSFW policy
 */
export const addRestrictedCountry = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const country = req.body.country;
    const band = req.body.band;

    if (!country || !band) {
      throw new AppError(
        "Missing country or band",
        400,
        ErrorAppCode.ValidationFailed
      );
    }

    await prisma.nSFWRestrictedCountry.create({
      data: {
        countryCode: country,
        band,
      },
    });

    res.status(200).json({
      message: "Country added successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Removes a restricted country from the NSFW policy
 */
export const removeRestrictedCountry = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const country = req.body.country;

    if (!country) {
      throw new AppError("Missing country", 400, ErrorAppCode.ValidationFailed);
    }

    await prisma.nSFWRestrictedCountry.delete({
      where: {
        countryCode: country,
      },
    });

    res.status(200).json({
      message: "Country removed successfully",
    });
  } catch (error) {
    next(error);
  }
};
