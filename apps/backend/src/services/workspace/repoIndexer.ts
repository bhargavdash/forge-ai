import fs from 'fs';
import path from 'path';

export const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.vscode',
  '.cache',
  '.idea',
  'coverage',
]);

interface FileNode {
  type: 'file';
  name: string;
  path?: string; // optional: full path
  extension?: string; // optional: file extension
}

interface DirectoryNode {
  type: 'directory';
  name: string;
  path?: string; // optional: full path
  children: TreeNode[];
}

export type TreeNode = FileNode | DirectoryNode;
export const indexRepo = (rootPath: string, includeRelPath = false): TreeNode[] => {
  const walk = (dir: string, relativePath = ''): TreeNode[] => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      return entries
        .filter((e) => !IGNORED_DIRS.has(e.name))
        .map((entry) => {
          const fullPath = path.join(dir, entry.name);
          const relPath = path.join(relativePath, entry.name);
          if (entry.isDirectory()) {
            const node: DirectoryNode = {
              type: 'directory',
              name: entry.name,
              children: walk(fullPath, relPath),
            };
            if (includeRelPath) {
              node.path = relPath;
            }
            return node;
          }
          const node: FileNode = {
            type: 'file',
            name: entry.name,
          };
          if (includeRelPath) {
            node.path = relPath;
            node.extension = path.extname(entry.name);
          }
          return node;
        });
    } catch (error) {
      console.log(`Error reading directory ${dir}: `, error);
      return [];
    }
  };

  return walk(rootPath);
};
