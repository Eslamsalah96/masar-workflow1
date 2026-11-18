-- CreateTable
CREATE TABLE "ServiceQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'YES_NO',
    "optionsJson" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "sourcePage" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceQuestion_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceRequirementCondition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requirementId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "expectedValue" TEXT NOT NULL,
    "groupKey" TEXT NOT NULL DEFAULT 'DEFAULT',
    CONSTRAINT "ServiceRequirementCondition_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "ServiceDocumentRequirement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceRequirementCondition_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ServiceQuestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RequestQuestionAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "questionId" TEXT,
    "questionCode" TEXT NOT NULL,
    "questionLabel" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RequestQuestionAnswer_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RequestQuestionAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ServiceQuestion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RequestDocumentRequirement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "requirementId" TEXT,
    "requirementCode" TEXT,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "condition" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'NOT_RECEIVED',
    "notes" TEXT,
    "filePath" TEXT,
    "receivedAt" DATETIME,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'DOCUMENT',
    "applicability" TEXT NOT NULL DEFAULT 'ALL',
    "fileName" TEXT,
    "fileMimeType" TEXT,
    "fileSize" INTEGER,
    CONSTRAINT "RequestDocumentRequirement_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RequestDocumentRequirement_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "ServiceDocumentRequirement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RequestDocumentRequirement" ("applicability", "condition", "createdAt", "details", "fileMimeType", "fileName", "filePath", "fileSize", "id", "isRequired", "notes", "receivedAt", "requestId", "requirementCode", "requirementId", "sortOrder", "status", "title", "updatedAt") SELECT "applicability", "condition", "createdAt", "details", "fileMimeType", "fileName", "filePath", "fileSize", "id", "isRequired", "notes", "receivedAt", "requestId", "requirementCode", "requirementId", "sortOrder", "status", "title", "updatedAt" FROM "RequestDocumentRequirement";
DROP TABLE "RequestDocumentRequirement";
ALTER TABLE "new_RequestDocumentRequirement" RENAME TO "RequestDocumentRequirement";
CREATE INDEX "RequestDocumentRequirement_requestId_idx" ON "RequestDocumentRequirement"("requestId");
CREATE INDEX "RequestDocumentRequirement_requirementId_idx" ON "RequestDocumentRequirement"("requirementId");
CREATE TABLE "new_ServiceDocumentRequirement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "variantId" TEXT,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "condition" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "sourcePage" INTEGER,
    "sourceNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "applicability" TEXT NOT NULL DEFAULT 'ALL',
    "kind" TEXT NOT NULL DEFAULT 'DOCUMENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ServiceDocumentRequirement_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceDocumentRequirement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ServiceVariant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ServiceDocumentRequirement" ("applicability", "code", "condition", "createdAt", "details", "id", "isRequired", "serviceId", "sortOrder", "sourceNote", "sourcePage", "title", "updatedAt", "variantId") SELECT "applicability", "code", "condition", "createdAt", "details", "id", "isRequired", "serviceId", "sortOrder", "sourceNote", "sourcePage", "title", "updatedAt", "variantId" FROM "ServiceDocumentRequirement";
DROP TABLE "ServiceDocumentRequirement";
ALTER TABLE "new_ServiceDocumentRequirement" RENAME TO "ServiceDocumentRequirement";
CREATE UNIQUE INDEX "ServiceDocumentRequirement_code_key" ON "ServiceDocumentRequirement"("code");
CREATE INDEX "ServiceDocumentRequirement_serviceId_idx" ON "ServiceDocumentRequirement"("serviceId");
CREATE INDEX "ServiceDocumentRequirement_variantId_idx" ON "ServiceDocumentRequirement"("variantId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ServiceQuestion_code_key" ON "ServiceQuestion"("code");

-- CreateIndex
CREATE INDEX "ServiceQuestion_serviceId_idx" ON "ServiceQuestion"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceRequirementCondition_requirementId_idx" ON "ServiceRequirementCondition"("requirementId");

-- CreateIndex
CREATE INDEX "ServiceRequirementCondition_questionId_idx" ON "ServiceRequirementCondition"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRequirementCondition_requirementId_questionId_expectedValue_groupKey_key" ON "ServiceRequirementCondition"("requirementId", "questionId", "expectedValue", "groupKey");

-- CreateIndex
CREATE INDEX "RequestQuestionAnswer_requestId_idx" ON "RequestQuestionAnswer"("requestId");

-- CreateIndex
CREATE INDEX "RequestQuestionAnswer_questionId_idx" ON "RequestQuestionAnswer"("questionId");
