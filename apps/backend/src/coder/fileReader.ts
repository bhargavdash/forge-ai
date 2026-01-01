import fs from 'fs';
import path from 'path';

export interface FileContent {
  path: string;
  content: string;
}

interface FileReadResult {
  success: boolean;
  files?: FileContent[];
  error?: string;
}

/**
 * Reads the content of multiple files from the workspace
 * @param workspacePath - Root workspace directory
 * @param relativePaths - Array of relative file paths from repo root
 * @returns Result with file contents or error
 */

export const readFilesContent = async (
  workspacePath: string,
  relativePaths: string[]
): Promise<FileReadResult> => {
  try {
    // validate inputs
    if (!workspacePath || typeof workspacePath !== 'string') {
      throw new Error('Invalid workspace path');
    }

    if (!relativePaths || !Array.isArray(relativePaths) || relativePaths.length === 0) {
      throw new Error('No file paths provided');
    }

    const repoPath = path.join(workspacePath, 'repo');

    // check if repo directory exists
    if (!fs.existsSync(repoPath)) {
      throw new Error(`Repository directory not found: ${repoPath}`);
    }

    console.log(`Reading ${relativePaths.length} file(s) from workspace...`);

    const fileContents: FileContent[] = [];
    const errors: string[] = [];

    for (const relativePath of relativePaths) {
      try {
        // construct absolute path
        const absolutePath = path.join(repoPath, relativePath);

        // security - ensure path doesn't escape repo directory
        const normalizedPath = path.normalize(absolutePath);
        if (!normalizedPath.startsWith(repoPath)) {
          throw new Error(`Invalid path: ${relativePath} (path traversal detected)`);
        }

        // check if file exists
        if (!fs.existsSync(absolutePath)) {
          throw new Error(`File not found: ${relativePath}`);
        }

        // check if it's actually a file (not directory)
        const stats = fs.statSync(absolutePath);
        if (!stats.isFile()) {
          throw new Error(`Path is not a file: ${relativePath}`);
        }

        // read file content
        const content = fs.readFileSync(absolutePath, 'utf-8');

        fileContents.push({
          path: relativePath,
          content,
        });

        console.log(`Read ${relativePath} (${content.length} chars)`);
      } catch (fileError) {
        const errorMsg = fileError instanceof Error ? fileError.message : String(fileError);
        errors.push(`${relativePath}: ${errorMsg}`);
        console.error(`✗ Failed to read ${relativePath}: ${errorMsg}`);
      }
    }

    // if no files were successfully read, return error
    if (fileContents.length === 0) {
      throw new Error(`Failed to read any files. Errors: ${errors.join('; ')}`);
    }

    console.log(`Successfully read ${fileContents.length}/${relativePaths.length} file(s)`);

    return {
      success: true,
      files: fileContents,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('File reading failed:', errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
};
