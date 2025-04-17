import { Request, Response, NextFunction } from "express";
import { prisma } from "@libs/prisma";
import { AppError, ErrorAppCode } from "@utils/errorHandler";
import { usernameSchema } from "@root/types/username";

// TODO: Improve
function generateSuggestions(base: string): string[] {
  const suffixes = [
    "_",
    "123",
    "001",
    "_dev",
    "me",
    Math.floor(Math.random() * 999),
  ];
  return suffixes.map((suffix) => `${base}${suffix}`).slice(0, 5);
}

/**
 * Checks whether a username is available
 *
 * Requires a username query parameter.
 * Returns a JSON object with the following properties:
 * - available: boolean indicating whether the username is available
 * - suggestions: array of suggested alternative usernames
 */
export const checkUsernameHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { username } = req.query;

  if (typeof username !== "string") {
    res.status(400).json({
      error: "Username must be provided",
      code: ErrorAppCode.ValidationFailed,
    });
  } else {
    try {
      // Format validation
      const validatedUsername = usernameSchema.parse(username);

      // Case-insensitive availability check
      const existing = await prisma.user.findFirst({
        where: {
          username: validatedUsername,
        },
        select: { id: true },
      });

      const available = !existing;
      const suggestions = available
        ? []
        : generateSuggestions(validatedUsername);

      res.status(200).json({
        available,
        suggestions,
      });
    } catch (err) {
      if (err instanceof Error && "errors" in err) {
        res.status(400).json({
          error: "Invalid username",
          code: ErrorAppCode.ValidationFailed,
          details: (err as any).errors ?? {},
        });
      }

      next(err);
    }
  }
};
