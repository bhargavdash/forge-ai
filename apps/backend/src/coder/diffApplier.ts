import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export interface DiffApplyResult {
  success: boolean;
  filesChanged?: string[];
  error?: string;
  gitError?: string;
}

/**
 * Applies a unified diff to the repository using git apply
 * @param workspacePath - Root workspace directory
 * @param diff - Unified doff string to apply
 * @returns Result indicating success or failure with details
 */

export const applyDiff = async (workspacePath: string, diff: string): Promise<DiffApplyResult> => {
  let diffPath: string | null = null;

  try {
    // validate inputs
    if (!workspacePath || typeof workspacePath !== 'string') {
      throw new Error('Invalid workspace path');
    }

    if (!diff || typeof diff !== 'string' || diff.trim().length === 0) {
      throw new Error('Invalid or empty diff provided');
    }

    const repoPath = path.join(workspacePath, 'repo');

    // Check if repo directory exists
    if (!fs.existsSync(repoPath)) {
      throw new Error(`Repository directory not found: ${repoPath}`);
    }

    // create temp path file with timestamp to avoid collisions
    const timestamp = Date.now();
    diffPath = path.join(workspacePath, `temp_${timestamp}.patch`);

    console.log(`Writing diff to temporary file: ${diffPath}`);
    fs.writeFileSync(diffPath, diff, 'utf-8');

    // verify patch file was created
    if (!fs.existsSync(diffPath)) {
      throw new Error('Failed to create temporary patch file');
    }

    console.log(`Checking if diff can be applied...`);

    // first check if diff can be applied (dry run)
    try {
      execSync(`git apply --check "${diffPath}"`, {
        cwd: repoPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      console.log('DIFF VALIDATION PASSED');
    } catch (checkError: any) {
      const gitOutput = checkError.stderr || checkError.stdout || '';
      throw new Error(
        `Diff validation failed. Git error: ${gitOutput.trim() || checkError.message}`
      );
    }

    // apply the diff
    console.log('Applying diff to repository...');

    try {
      const output = execSync(`git apply "${diffPath}"`, {
        cwd: repoPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      console.log('DIFF APPLIED SUCCESSFULLY');

      if (output) {
        console.log('Git output: ', output);
      }
    } catch (applyError: any) {
      const gitOutput = applyError.stderr || applyError.stdout || '';
      throw new Error(
        `Diff application failed. Git error: ${gitOutput.trim() || applyError.message}`
      );
    }

    // extract changed files from diff
    const filesChanged = extractChangedFiles(diff);
    console.log(`Modified ${filesChanged.length} file(s):`, filesChanged);

    return {
      success: true,
      filesChanged,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.log('Diff application failed: ', errorMessage);

    return {
      success: false,
      error: errorMessage,
      gitError: errorMessage.includes('Git error:') ? errorMessage : undefined,
    };
  } finally {
    // cleanup temp file
    if (diffPath && fs.existsSync(diffPath)) {
      try {
        fs.unlinkSync(diffPath);
        console.log(`Cleaned up temporary patch file: ${diffPath}`);
      } catch (cleanupError) {
        console.warn(`Warning: Failed to cleanup temp file ${diffPath}:`, cleanupError);
        // Don't throw - cleanup failure shouldn't fail the whole operation
      }
    }
  }
};

/**
 * Extract list of changed files from a unified diff
 */

const extractChangedFiles = (diff: string): string[] => {
  const filePattern = /^---\s+a\/(.+)$/gm;
  const files: string[] = [];

  let match;

  while ((match = filePattern.exec(diff)) !== null) {
    files.push(match[1]);
  }

  return files;
};
