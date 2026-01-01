import path from 'path';
import fs from 'fs';
import { cloneRepo } from './repoCloner';
import { indexRepo, TreeNode } from './repoIndexer';
import prisma from '../../lib/prisma';
import { parseRepoUrl } from '../../planner/taskPlanner';
import { Prisma } from '@prisma/client';

interface SetupWorkspaceResult {
  success: boolean;
  workspacePath?: string;
  repoTree?: TreeNode[];
  error?: string;
}

export const setupWorkspace = async (
  taskId: string,
  issueUrl: string
): Promise<SetupWorkspaceResult> => {
  const workspaceRoot = path.join(process.cwd(), 'workspaces', taskId);
  const repoPath = path.join(workspaceRoot, 'repo');
  try {
    // 1. parse the repo url
    const parsedUrl = parseRepoUrl(issueUrl);

    if (!parsedUrl) {
      throw new Error(`Invalid issue URL: ${issueUrl}`);
    }

    console.log(`[${taskId}] Setting up workspace for ${parsedUrl.owner}/${parsedUrl.repo}`);

    // 2. Clone repository
    // Create repo url
    const repoUrl = `https://github.com/${parsedUrl.owner}/${parsedUrl.repo}.git`;

    console.log(`[${taskId}] Cloning repository...`);
    const cloneResult = await cloneRepo(repoUrl, repoPath);

    if (!cloneResult.success) {
      throw new Error(`Failed to clone repository: ${cloneResult.error}`);
    }

    // 3. index repository
    console.log(`[${taskId}] Indexing repository...`);
    const repoTree = indexRepo(repoPath, true);

    if (!repoTree || repoTree.length === 0) {
      throw new Error('Repository indexing produced empty tree');
    }

    // 4. Update database
    console.log(`[${taskId}] Updating database...`);
    await prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        workspacePath: workspaceRoot,
        repoUrl,
        repoOwner: parsedUrl.owner,
        repoName: parsedUrl.repo,
        repoTree: repoTree as unknown as Prisma.InputJsonValue,
      },
    });

    console.log(`[${taskId}] Workspace setup completed successfully`);
    return {
      success: true,
      workspacePath: workspaceRoot,
      repoTree: repoTree,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[${taskId}] Workspace setup failed:`, errorMessage);

    // Update task status to FAILED
    try {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'FAILED',
          errorMessage: errorMessage,
        },
      });
    } catch (dbError) {
      console.error(`[${taskId}] Failed to update task status:`, dbError);
    }

    // Cleanup workspace on failure
    try {
      if (fs.existsSync(workspaceRoot)) {
        console.log(`[${taskId}] Cleaning up failed workspace...`);
        fs.rmSync(workspaceRoot, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      console.error(`[${taskId}] Failed to cleanup workspace:`, cleanupError);
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
};
