import { Request, Response, NextFunction } from "express";
import { prisma } from "@libs/prisma";
import { parsePrismaError, AppError } from "@utils/errorHandler";
import { waitlistEntrySchema } from "@schemas/waitlistEntrySchema";

export const createWaitlistEntry = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // parse with zod
    const parsed = waitlistEntrySchema.parse(req.body);

    // create entry
    const waitlistEntry = await prisma.waitlistEntry.create({
      data: parsed,
    });

    res.status(201).json(waitlistEntry);
  } catch (err) {
    next(parsePrismaError(err));
  }
};
