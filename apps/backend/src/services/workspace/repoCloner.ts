import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';

const execAsync = util.promisify(exec);

interface CloneResult {
  success: boolean;
  path?: string;
  error?: string;
}

export const cloneRepo = async (repoUrl: string, targetPath: string): Promise<CloneResult> => {
  try {
    // Validate inputs
    if (!repoUrl || !repoUrl.includes('github.com')) {
      throw new Error('Invalid Github repository URL');
    }

    // Check if the directory already exists and is a valid git repo
    if (fs.existsSync(targetPath)) {
      const gitDir = path.join(targetPath, '.git');
      if (fs.existsSync(gitDir)) {
        console.log(`Repository already exists at ${targetPath}`);
        return { success: true, path: targetPath };
      } else {
        // Directory exists but is not a git repo - clean it up
        console.log(`Removing invalid directory at ${targetPath}`);
        fs.rmSync(targetPath, { recursive: true, force: true });
      }
    }

    // Ensure parent directory exists
    const parentDir = path.dirname(targetPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    console.log(`Cloning ${repoUrl} into ${targetPath}`);

    // clone with depth 1 for faster cloning (shallow clone)
    const { stdout, stderr } = await execAsync(`git clone --depth 1 "${repoUrl}" "${targetPath}"`, {
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      timeout: 600000, // 10 minute timeout
    });

    if (stderr && !stderr.includes('Cloning into')) {
      console.warn('Git clone warnings: ', stderr);
    }

    console.log(`Successfully cloned repository to ${targetPath}`);
    return { success: true, path: targetPath };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error cloning repo ${repoUrl}: `, errorMessage);

    // cleanup on failure
    if (fs.existsSync(targetPath)) {
      try {
        fs.rmSync(targetPath, { recursive: true, force: true });
        console.log(`Cleaned up failure clone at ${targetPath}`);
      } catch (cleanupError) {
        console.error(`Failed to cleanup ${targetPath}: `, cleanupError);
      }
    }

    return { success: false, error: errorMessage };
  }
};
