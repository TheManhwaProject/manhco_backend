-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "manhco";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "waiting_list";

-- CreateTable
CREATE TABLE "waiting_list"."waitlist_entry" (
    "id" SERIAL NOT NULL,
    "firstName" VARCHAR(50) NOT NULL,
    "secondName" VARCHAR(50),
    "email" VARCHAR(255) NOT NULL,
    "message" VARCHAR(255),

    CONSTRAINT "waitlist_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manhco"."users" (
    "id" SERIAL NOT NULL,
    "firstName" VARCHAR(50) NOT NULL,
    "secondName" VARCHAR(50),
    "email" VARCHAR(255) NOT NULL,
    "googleId" VARCHAR(255) NOT NULL,
    "profilePic" VARCHAR(255),
    "bannerPic" VARCHAR(255),
    "colorTheme" VARCHAR(255),
    "bio" VARCHAR(255),
    "gender" VARCHAR(255),
    "birthday" DATE,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entry_email_key" ON "waiting_list"."waitlist_entry"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "manhco"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "manhco"."users"("googleId");
