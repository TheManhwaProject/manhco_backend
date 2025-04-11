/*
  Warnings:

  - Added the required column `roleId` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "auth";

-- AlterTable
ALTER TABLE "manhco"."users" ADD COLUMN     "newUser" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "roleId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "auth"."roles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "priority" INTEGER NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."refresh_tokens" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "auth"."roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "roles_priority_key" ON "auth"."roles"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "auth"."refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "auth"."refresh_tokens"("userId");

-- AddForeignKey
ALTER TABLE "manhco"."users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "auth"."roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "manhco"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
