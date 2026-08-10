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
    "smoker" TEXT NOT NULL,
    "pets" TEXT NOT NULL,
    "photoUrls" TEXT NOT NULL,
    "prompts" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Profile" ("availableFrom", "availableTo", "createdAt", "homeCity", "id", "name", "pets", "photoUrls", "program", "prompts", "smoker", "university", "updatedAt", "userId", "yearOfStudy") SELECT "availableFrom", "availableTo", "createdAt", "homeCity", "id", "name", "pets", "photoUrls", "program", "prompts", "smoker", "university", "updatedAt", "userId", "yearOfStudy" FROM "Profile";
DROP TABLE "Profile";
ALTER TABLE "new_Profile" RENAME TO "Profile";
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
