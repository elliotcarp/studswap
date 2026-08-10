-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'MUTUAL',
    "paidByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Match_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Match_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Match" ("createdAt", "id", "userAId", "userBId") SELECT "createdAt", "id", "userAId", "userBId" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
CREATE UNIQUE INDEX "Match_userAId_userBId_key" ON "Match"("userAId", "userBId");
CREATE TABLE "new_Profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "university" TEXT NOT NULL,
    "program" TEXT NOT NULL,
    "yearOfStudy" TEXT NOT NULL,
    "homeCity" TEXT NOT NULL,
    "availableFrom" DATETIME NOT NULL,
    "availableTo" DATETIME NOT NULL,
    "accommodates" INTEGER NOT NULL,
    "priceCredits" INTEGER NOT NULL,
    "smoker" TEXT NOT NULL,
    "pets" TEXT NOT NULL,
    "photoUrls" TEXT NOT NULL,
    "prompts" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Existing rows (pre-dating the price question) get a placeholder value;
-- every app-level write from here on always supplies a real one, and the
-- demo profiles get overwritten immediately by the next reseed anyway.
INSERT INTO "new_Profile" ("accommodates", "age", "availableFrom", "availableTo", "createdAt", "homeCity", "id", "name", "priceCredits", "pets", "photoUrls", "program", "prompts", "smoker", "university", "updatedAt", "userId", "yearOfStudy") SELECT "accommodates", "age", "availableFrom", "availableTo", "createdAt", "homeCity", "id", "name", 300, "pets", "photoUrls", "program", "prompts", "smoker", "university", "updatedAt", "userId", "yearOfStudy" FROM "Profile";
DROP TABLE "Profile";
ALTER TABLE "new_Profile" RENAME TO "Profile";
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creditBalance" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_User" ("createdAt", "email", "emailVerified", "id") SELECT "createdAt", "email", "emailVerified", "id" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
