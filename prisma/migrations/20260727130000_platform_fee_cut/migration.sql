-- StudSwap's permanent cut of each side's confirmation fee, retained at
-- charge time regardless of outcome (see cancellationPolicy.ts). The held/
-- refundable/forfeitable amount is confirmationFeeUserA/B minus these.
ALTER TABLE "Match" ADD COLUMN "platformFeeUserA" INTEGER;
ALTER TABLE "Match" ADD COLUMN "platformFeeUserB" INTEGER;
