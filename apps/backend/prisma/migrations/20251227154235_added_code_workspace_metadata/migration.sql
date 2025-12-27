/*
  Warnings:

  - You are about to drop the column `githubIssueUrl` on the `Task` table. All the data in the column will be lost.
  - Added the required column `issueUrl` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `repoName` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `repoOwner` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `repoUrl` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workspacePath` to the `Task` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Task" DROP COLUMN "githubIssueUrl",
ADD COLUMN     "issueUrl" TEXT NOT NULL,
ADD COLUMN     "repoName" TEXT NOT NULL,
ADD COLUMN     "repoOwner" TEXT NOT NULL,
ADD COLUMN     "repoTree" JSONB,
ADD COLUMN     "repoUrl" TEXT NOT NULL,
ADD COLUMN     "workspacePath" TEXT NOT NULL;
