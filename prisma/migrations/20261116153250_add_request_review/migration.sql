-- CreateTable
CREATE TABLE "RequestReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "feedback" TEXT,
    "startedAt" DATETIME,
    "reviewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeReviewSeconds" INTEGER,
    CONSTRAINT "RequestReview_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RequestReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Request" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "currentDepartmentId" TEXT,
    "serviceName" TEXT NOT NULL,
    "serviceId" TEXT,
    "serviceVariantId" TEXT,
    "customerType" TEXT NOT NULL DEFAULT 'NEW',
    "proposedCompanyName" TEXT,
    "companyAlreadyEstablished" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" DATETIME,
    "serviceStartedAt" DATETIME,
    "deadlineAt" DATETIME,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Request_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Request_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Request_currentDepartmentId_fkey" FOREIGN KEY ("currentDepartmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Request_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Request_serviceVariantId_fkey" FOREIGN KEY ("serviceVariantId") REFERENCES "ServiceVariant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Request" ("closedAt", "createdAt", "createdById", "currentDepartmentId", "customerId", "description", "id", "priority", "receivedAt", "requestNumber", "serviceId", "serviceName", "serviceVariantId", "status", "updatedAt") SELECT "closedAt", "createdAt", "createdById", "currentDepartmentId", "customerId", "description", "id", "priority", "receivedAt", "requestNumber", "serviceId", "serviceName", "serviceVariantId", "status", "updatedAt" FROM "Request";
DROP TABLE "Request";
ALTER TABLE "new_Request" RENAME TO "Request";
CREATE UNIQUE INDEX "Request_requestNumber_key" ON "Request"("requestNumber");
CREATE INDEX "Request_serviceId_idx" ON "Request"("serviceId");
CREATE INDEX "Request_serviceVariantId_idx" ON "Request"("serviceVariantId");
CREATE INDEX "Request_customerId_idx" ON "Request"("customerId");
CREATE INDEX "Request_requestNumber_idx" ON "Request"("requestNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "RequestReview_requestId_idx" ON "RequestReview"("requestId");

-- CreateIndex
CREATE INDEX "RequestReview_reviewerId_idx" ON "RequestReview"("reviewerId");

-- CreateIndex
CREATE INDEX "RequestReview_reviewedAt_idx" ON "RequestReview"("reviewedAt");
