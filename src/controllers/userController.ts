import { Request, Response, NextFunction } from "express";
import { prisma } from "@libs/prisma";
import { AppError, ErrorAppCode } from "@utils/errorHandler";

/**
 * Checks whether a username is available
 */
