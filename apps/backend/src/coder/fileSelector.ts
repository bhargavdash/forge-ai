import { geminiModel } from '../llm/geminiClient';
import { buildFileSelectionPrompt } from '../llm/promptBuilder';
import { TreeNode } from '../services/workspace/repoIndexer';

export type SelectedFiles = {
  files: string[];
  reasoning: string;
};

interface FileSectionResult {
  success: boolean;
  data?: SelectedFiles;
  error?: string;
}

export const selectFilesForCoding = async (
  plan: { summary: string; steps: string[] },
  repoTree: TreeNode[],
  previousFilesTried?: string[],
  previousErrors?: string
): Promise<FileSectionResult> => {
  try {
    // validate inputs
    if (!plan.summary || !plan.steps.length) {
      throw new Error('Invalid plan: missing summary or steps');
    }

    if (!repoTree || repoTree.length === 0) {
      throw new Error('Invalid repoTree: empty or undefined');
    }

    // We are using LLM to investigate and select relevant files
    // based on planner's recommendation and repoTree

    // build prompt
    const prompt = buildFileSelectionPrompt(plan, repoTree, previousFilesTried, previousErrors);

    if (!prompt) {
      throw new Error('Unable to create file selection prompt');
    }

    console.log('Requesting file selection from LLM...');

    // get llm response
    const selectedFiles = await generateSelectedFiles(prompt);

    // validate selected files exist in repoTree
    const validFiles = validateFilesExist(selectedFiles.files, repoTree);

    if (validFiles.length === 0) {
      throw new Error("LLM selected files that don't exist in repository");
    }

    // warn if some files were invalid
    if (validFiles.length < selectedFiles.files.length) {
      const invalidFiles = selectedFiles.files.filter((f) => !validFiles.includes(f));

      console.warn(`Warning: Some selected files don't exist: ${invalidFiles.join(', ')}`);
    }

    console.log(`Successfully selected ${validFiles.length} files`);

    return {
      success: true,
      data: {
        files: validFiles,
        reasoning: selectedFiles.reasoning,
      },
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('File selection failed:', errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
};

const generateSelectedFiles = async (prompt: string): Promise<SelectedFiles> => {
  try {
    const response = await geminiModel(prompt);

    if (!response?.text) {
      throw new Error('Empty response from LLM');
    }

    // Clean response - remove markdown code blocks if present

    let cleanedText = response.text.trim();
    cleanedText = cleanedText.replace(/```json\n?/g, '');
    cleanedText = cleanedText.replace(/```\n?/g, '');
    cleanedText = cleanedText.trim();

    // parse json
    const parsedResponse = JSON.parse(cleanedText);

    // validate structure
    if (!parsedResponse.files || !Array.isArray(parsedResponse.files)) {
      throw new Error("Invalid response: 'files' must be an array");
    }

    if (!parsedResponse.reasoning || typeof parsedResponse.reasoning !== 'string') {
      throw new Error("Invalid response: 'reasoning' must be a string");
    }

    // validate file count
    if (parsedResponse.files.length === 0) {
      throw new Error('LLM returned empty file list');
    }

    if (parsedResponse.files.length > 3) {
      console.warn(`LLM returned ${parsedResponse.files.length} files, limiting to 3`);
      parsedResponse.files = parsedResponse.files.slice(0, 3);
    }

    // Ensure all files are strings
    const validFiles = parsedResponse.files.filter(
      (f: any) => typeof f === 'string' && f.trim().length > 0
    );

    return {
      files: validFiles,
      reasoning: parsedResponse.reasoning,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Failed to parse LLM response:', errorMessage);
    throw new Error(`LLM response parsing failed: ${errorMessage}`);
  }
};

/**
 * Validates that selected files actually exist in the repo tree
 */

const validateFilesExist = (selectedFiles: string[], repoTree: TreeNode[]): string[] => {
  // build a set of all file paths in the tree for O(1) lookup

  const allFilePaths = new Set<string>();

  const traverse = (nodes: TreeNode[], currentPath: string = '') => {
    for (const node of nodes) {
      const nodePath = currentPath ? `${currentPath}/${node.name}` : node.name;

      if (node.type === 'file') {
        allFilePaths.add(nodePath);
      } else if (node.type === 'directory' && 'children' in node) {
        traverse(node.children, nodePath);
      }
    }
  };

  traverse(repoTree);

  // filter selected files to only those that exist
  return selectedFiles.filter((file) => allFilePaths.has(file));
};
