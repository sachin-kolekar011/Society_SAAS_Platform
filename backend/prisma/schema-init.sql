-- ═══════════════════════════════════════════════════════════════════════
-- Raw SQL schema init, mirroring backend/prisma/schema.prisma exactly.
--
-- WHY THIS EXISTS ALONGSIDE PRISMA MIGRATIONS:
-- `npx prisma migrate dev` is still the right tool day-to-day -- it tracks
-- migration history properly. This script exists for the exact wall I hit
-- while building this: Prisma's migrate/validate commands need to download
-- an engine binary from binaries.prisma.sh on first run, and that host is
-- blocked on some networks (it was blocked in the environment I built this
-- in). If that ever happens to you too -- corporate network, restrictive
-- CI runner, whatever -- this script creates the exact same tables with
-- zero dependency on that binary, using only a plain MySQL connection.
--
-- Every CREATE TABLE is IF NOT EXISTS, so running this against a database
-- that already has some or all of these tables is a safe no-op for the
-- ones that exist -- it will NOT alter an existing table's columns if the
-- schema has since diverged. That's a deliberate limitation: this is an
-- INITIALIZER for a fresh database, not a migration tool. Once a database
-- has been initialized (by this script OR by `prisma migrate dev`), future
-- schema changes should go through real Prisma migrations, which handle
-- ALTER TABLE safely. Mixing the two on the same database after the first
-- init is fine; this script just won't touch tables it finds already exist.
--
-- Table and column names match Prisma's default mapping EXACTLY (model
-- name as the table name, camelCase field names as column names) since no
-- @@map/@map directives are used in the schema -- so Prisma Client's
-- generated queries work against tables created by this script exactly as
-- they would against ones created by `prisma migrate dev`.
-- ═══════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ── Platform core ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `Tenant` (
  `id` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `logoUrl` VARCHAR(191) NULL,
  `addressLine` VARCHAR(191) NULL,
  `city` VARCHAR(191) NULL,
  `state` VARCHAR(191) NULL,
  `country` VARCHAR(191) NULL DEFAULT 'India',
  `timezone` VARCHAR(191) NOT NULL DEFAULT 'Asia/Kolkata',
  `primaryColor` VARCHAR(191) NOT NULL DEFAULT '#1D9E75',
  `secondaryColor` VARCHAR(191) NOT NULL DEFAULT '#378ADD',
  `overdueThresholdDays` INT NOT NULL DEFAULT 7,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `deletedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Tenant_slug_key` (`slug`),
  KEY `Tenant_isActive_idx` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `User` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NULL,
  `email` VARCHAR(191) NOT NULL,
  `passwordHash` VARCHAR(191) NOT NULL,
  `role` ENUM('SUPER_ADMIN','ADMIN','RESIDENT','WATCHMAN','MAINTENANCE_STAFF') NOT NULL,
  `firstName` VARCHAR(191) NOT NULL,
  `lastName` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(191) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `emailVerifiedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `deletedAt` DATETIME(3) NULL,
  `createdBy` VARCHAR(191) NULL,
  `updatedBy` VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_tenantId_email_key` (`tenantId`, `email`),
  KEY `User_tenantId_role_idx` (`tenantId`, `role`),
  CONSTRAINT `User_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `RefreshToken` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NULL,
  `userId` VARCHAR(191) NOT NULL,
  `tokenHash` VARCHAR(191) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `revokedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `RefreshToken_userId_idx` (`userId`),
  KEY `RefreshToken_tokenHash_idx` (`tokenHash`),
  CONSTRAINT `RefreshToken_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `RefreshToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Resident management ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `Flat` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `flatNumber` VARCHAR(191) NOT NULL,
  `block` VARCHAR(191) NULL,
  `floor` INT NULL,
  `type` ENUM('ONE_BHK','TWO_BHK','THREE_BHK','OTHER') NOT NULL DEFAULT 'OTHER',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `deletedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Flat_tenantId_block_flatNumber_key` (`tenantId`, `block`, `flatNumber`),
  KEY `Flat_tenantId_idx` (`tenantId`),
  CONSTRAINT `Flat_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Resident` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `flatId` VARCHAR(191) NOT NULL,
  `residentType` ENUM('OWNER','TENANT_OCCUPANT') NOT NULL,
  `isPrimary` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `deletedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Resident_userId_key` (`userId`),
  KEY `Resident_tenantId_flatId_idx` (`tenantId`, `flatId`),
  CONSTRAINT `Resident_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Resident_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Resident_flatId_fkey` FOREIGN KEY (`flatId`) REFERENCES `Flat` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Complaint management ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `ComplaintCategory` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ComplaintCategory_tenantId_name_key` (`tenantId`, `name`),
  CONSTRAINT `ComplaintCategory_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Complaint` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `residentId` VARCHAR(191) NOT NULL,
  `categoryId` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `photoUrl` VARCHAR(191) NULL,
  `priority` ENUM('LOW','MEDIUM','HIGH') NULL,
  `status` ENUM('OPEN','IN_PROGRESS','RESOLVED') NOT NULL DEFAULT 'OPEN',
  `resolvedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `deletedAt` DATETIME(3) NULL,
  `createdBy` VARCHAR(191) NULL,
  `updatedBy` VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  KEY `Complaint_tenantId_status_idx` (`tenantId`, `status`),
  KEY `Complaint_tenantId_categoryId_idx` (`tenantId`, `categoryId`),
  KEY `Complaint_tenantId_createdAt_idx` (`tenantId`, `createdAt`),
  CONSTRAINT `Complaint_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Complaint_residentId_fkey` FOREIGN KEY (`residentId`) REFERENCES `Resident` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Complaint_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `ComplaintCategory` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ComplaintStatusHistory` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `complaintId` VARCHAR(191) NOT NULL,
  `fromStatus` ENUM('OPEN','IN_PROGRESS','RESOLVED') NULL,
  `toStatus` ENUM('OPEN','IN_PROGRESS','RESOLVED') NOT NULL,
  `note` TEXT NULL,
  `changedByUserId` VARCHAR(191) NOT NULL,
  `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ComplaintStatusHistory_tenantId_complaintId_idx` (`tenantId`, `complaintId`),
  CONSTRAINT `ComplaintStatusHistory_complaintId_fkey` FOREIGN KEY (`complaintId`) REFERENCES `Complaint` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ComplaintStatusHistory_changedByUserId_fkey` FOREIGN KEY (`changedByUserId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Notice board ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `Notice` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `body` TEXT NOT NULL,
  `isImportant` BOOLEAN NOT NULL DEFAULT false,
  `postedByUserId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `deletedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  KEY `Notice_tenantId_isImportant_createdAt_idx` (`tenantId`, `isImportant`, `createdAt`),
  CONSTRAINT `Notice_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Notice_postedByUserId_fkey` FOREIGN KEY (`postedByUserId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Visitor & gate management ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `VisitorPass` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `residentId` VARCHAR(191) NOT NULL,
  `approvedByUserId` VARCHAR(191) NOT NULL,
  `visitorName` VARCHAR(191) NOT NULL,
  `visitorPhone` VARCHAR(191) NULL,
  `purpose` VARCHAR(191) NULL,
  `qrToken` VARCHAR(191) NOT NULL,
  `status` ENUM('PENDING','CHECKED_IN','CHECKED_OUT','EXPIRED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `validFrom` DATETIME(3) NOT NULL,
  `validUntil` DATETIME(3) NOT NULL,
  `checkedInAt` DATETIME(3) NULL,
  `checkedInByUserId` VARCHAR(191) NULL,
  `checkedOutAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `deletedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `VisitorPass_qrToken_key` (`qrToken`),
  KEY `VisitorPass_tenantId_status_idx` (`tenantId`, `status`),
  KEY `VisitorPass_tenantId_validUntil_idx` (`tenantId`, `validUntil`),
  KEY `VisitorPass_qrToken_idx` (`qrToken`),
  CONSTRAINT `VisitorPass_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `VisitorPass_residentId_fkey` FOREIGN KEY (`residentId`) REFERENCES `Resident` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `VisitorPass_approvedByUserId_fkey` FOREIGN KEY (`approvedByUserId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `VisitorPass_checkedInByUserId_fkey` FOREIGN KEY (`checkedInByUserId`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── SOS / emergency alerts ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `SosAlert` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `residentId` VARCHAR(191) NOT NULL,
  `status` ENUM('ACTIVE','ACKNOWLEDGED','RESOLVED') NOT NULL DEFAULT 'ACTIVE',
  `notes` TEXT NULL,
  `triggeredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `acknowledgedByUserId` VARCHAR(191) NULL,
  `acknowledgedAt` DATETIME(3) NULL,
  `resolvedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  KEY `SosAlert_tenantId_status_idx` (`tenantId`, `status`),
  KEY `SosAlert_tenantId_triggeredAt_idx` (`tenantId`, `triggeredAt`),
  CONSTRAINT `SosAlert_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `SosAlert_residentId_fkey` FOREIGN KEY (`residentId`) REFERENCES `Resident` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `SosAlert_acknowledgedByUserId_fkey` FOREIGN KEY (`acknowledgedByUserId`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Maintenance billing & payments ───────────────────────────────────

CREATE TABLE IF NOT EXISTS `MaintenanceBill` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `flatId` VARCHAR(191) NOT NULL,
  `billingPeriod` VARCHAR(191) NOT NULL,
  `amount` INT NOT NULL,
  `penaltyAmount` INT NOT NULL DEFAULT 0,
  `dueDate` DATETIME(3) NOT NULL,
  `status` ENUM('PENDING','PAID','OVERDUE') NOT NULL DEFAULT 'PENDING',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `deletedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `MaintenanceBill_tenantId_flatId_billingPeriod_key` (`tenantId`, `flatId`, `billingPeriod`),
  KEY `MaintenanceBill_tenantId_status_idx` (`tenantId`, `status`),
  CONSTRAINT `MaintenanceBill_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `MaintenanceBill_flatId_fkey` FOREIGN KEY (`flatId`) REFERENCES `Flat` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Payment` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `billId` VARCHAR(191) NOT NULL,
  `residentId` VARCHAR(191) NOT NULL,
  `amount` INT NOT NULL,
  `provider` VARCHAR(191) NOT NULL DEFAULT 'razorpay',
  `providerOrderId` VARCHAR(191) NULL,
  `providerPaymentId` VARCHAR(191) NULL,
  `status` ENUM('CREATED','SUCCESS','FAILED') NOT NULL DEFAULT 'CREATED',
  `paidAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Payment_tenantId_status_idx` (`tenantId`, `status`),
  KEY `Payment_providerOrderId_idx` (`providerOrderId`),
  CONSTRAINT `Payment_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Payment_billId_fkey` FOREIGN KEY (`billId`) REFERENCES `MaintenanceBill` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Payment_residentId_fkey` FOREIGN KEY (`residentId`) REFERENCES `Resident` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Polls / voting ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `Poll` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `question` VARCHAR(191) NOT NULL,
  `createdByUserId` VARCHAR(191) NOT NULL,
  `closesAt` DATETIME(3) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `deletedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  KEY `Poll_tenantId_isActive_idx` (`tenantId`, `isActive`),
  CONSTRAINT `Poll_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Poll_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `PollOption` (
  `id` VARCHAR(191) NOT NULL,
  `pollId` VARCHAR(191) NOT NULL,
  `text` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `PollOption_pollId_idx` (`pollId`),
  CONSTRAINT `PollOption_pollId_fkey` FOREIGN KEY (`pollId`) REFERENCES `Poll` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `PollVote` (
  `id` VARCHAR(191) NOT NULL,
  `pollId` VARCHAR(191) NOT NULL,
  `optionId` VARCHAR(191) NOT NULL,
  `residentId` VARCHAR(191) NOT NULL,
  `votedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `PollVote_pollId_residentId_key` (`pollId`, `residentId`),
  KEY `PollVote_optionId_idx` (`optionId`),
  KEY `PollVote_residentId_idx` (`residentId`),
  CONSTRAINT `PollVote_pollId_fkey` FOREIGN KEY (`pollId`) REFERENCES `Poll` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PollVote_optionId_fkey` FOREIGN KEY (`optionId`) REFERENCES `PollOption` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PollVote_residentId_fkey` FOREIGN KEY (`residentId`) REFERENCES `Resident` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
