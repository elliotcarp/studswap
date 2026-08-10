/*
  Warnings:

  - You are about to drop the column `bio` on the `Profile` table. All the data in the column will be lost.
  - Added the required column `pets` to the `Profile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `program` to the `Profile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `prompts` to the `Profile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `smoker` to the `Profile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `swapType` to the `Profile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `university` to the `Profile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `yearOfStudy` to the `Profile` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "university" TEXT NOT NULL,
    "program" TEXT NOT NULL,
    "yearOfStudy" TEXT NOT NULL,
    "homeCity" TEXT NOT NULL,
    "availableFrom" DATETIME NOT NULL,
    "availableTo" DATETIME NOT NULL,
    "swapType" TEXT NOT NULL,
    "smoker" TEXT NOT NULL,
    "pets" TEXT NOT NULL,
    "photoUrls" TEXT NOT NULL,
    "prompts" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Profile" ("availableFrom", "availableTo", "createdAt", "homeCity", "id", "name", "photoUrls", "updatedAt", "userId") SELECT "availableFrom", "availableTo", "createdAt", "homeCity", "id", "name", "photoUrls", "updatedAt", "userId" FROM "Profile";
DROP TABLE "Profile";
ALTER TABLE "new_Profile" RENAME TO "Profile";
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
