/*
  Warnings:

  - Added the required column `githubIssueUrl` to the `Task` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TaskStep" AS ENUM ('NONE', 'PLANNING', 'CODING', 'TESTING', 'FIXING', 'DONE');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "currentStep" "TaskStep" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "githubIssueUrl" TEXT NOT NULL;
