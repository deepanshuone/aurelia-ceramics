-- Turn on "Show sample ratings" for the store (owner's request, 2026-10-08).
-- It can still be switched off any time in Admin → Settings.
INSERT INTO "StoreSetting" ("id", "showSampleRatings", "updatedAt")
VALUES ('store', true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET "showSampleRatings" = true, "updatedAt" = CURRENT_TIMESTAMP;
