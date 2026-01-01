import { TreeNode } from '../services/workspace/repoIndexer';
import { applyDiff } from './diffApplier';
import { generateDiff } from './diffGenerator';
import { readFilesContent } from './fileReader';
import { selectFilesForCoding } from './fileSelector';

export interface CoderAgentResult {
  success: boolean;
  filesChanged?: string[];
  error?: string;
  iteration?: number;
}

/**
 * Main coding agent orchestrator
 * Coordinates files selection, reading, diff generation, and application
 */

export const runCoderAgent = async (
  taskId: string,
  plan: { summary: string; steps: string[] },
  repoTree: TreeNode[],
  workspacePath: string,
  maxRetries: number = 3
): Promise<CoderAgentResult> => {
  let iteration = 0;
  let previousFilesTried: string[] = [];
  let previousErrors: string | undefined;

  try {
    // validate inputs
    if (!taskId || typeof taskId !== 'string') {
      throw new Error('Invalid taskId');
    }

    if (!plan.summary || !plan.steps.length) {
      throw new Error('Invalid plan: missing summary or steps');
    }

    if (!repoTree || repoTree.length === 0) {
      throw new Error('Invalid repoTree: empty or undefined');
    }

    if (!workspacePath || typeof workspacePath !== 'string') {
      throw new Error('Invalid workspace path');
    }

    console.log(`[${taskId}] ----------------------------------`);
    console.log(`[${taskId}] Starting Coding Agent`);
    console.log(`[${taskId}] Plan: ${plan.summary}`);
    console.log(`[${taskId}] Max retries: ${maxRetries}`);
    console.log(`[${taskId}] ----------------------------------`);

    // retry loop for iterative refinement
    while (iteration < maxRetries) {
      iteration++;
      console.log(`\n[${taskId}] ---------------------------------`);
      console.log(`[${taskId}] Iteration ${iteration}/${maxRetries}`);
      console.log(`[${taskId}] ---------------------------------\n`);

      try {
        // step 1: select files
        console.log(`[${taskId}] Step 1: Selecting relevant files...`);

        const selectionResult = await selectFilesForCoding(
          plan,
          repoTree,
          previousFilesTried,
          previousErrors
        );

        if (!selectionResult.success || !selectionResult.data) {
          throw new Error(`File selection failed: ${selectionResult.error}`);
        }

        const { files: selectedFiles, reasoning } = selectionResult.data;

        // add files to tried files list
        previousFilesTried = [...new Set([...previousFilesTried, ...selectedFiles])];

        // step 2: Read file contents
        console.log(`\n[${taskId}] Step 2: Reading file contents...`);

        const readResult = await readFilesContent(workspacePath, selectedFiles);

        if (!readResult.success || !readResult.files) {
          throw new Error(`File reading failed: ${readResult.error}`);
        }

        console.log(`Successfully read ${readResult.files.length} file(s)`);

        // step3: generate diff
        console.log(`\n[${taskId}] Step 3: Generating code changes...`);

        const diffResult = await generateDiff(plan, readResult.files);

        if (!diffResult.success || !diffResult.diff) {
          throw new Error(`Diff generation failed: ${diffResult.error}`);
        }

        console.log('Generated diff...: ', diffResult.diff.length);

        // step 4: apply diff

        console.log(`\n[${taskId}] Step 4: Applying changes to repo...`);

        const applyResult = await applyDiff(workspacePath, diffResult.diff);

        if (!applyResult.success) {
          // store error for next iteration
          previousErrors = applyResult.error;

          throw new Error(
            `Diff application failed: ${applyResult.error}\n${applyResult.gitError || ''}`
          );
        }

        console.log('Diff applied successfully... ');

        return {
          success: true,
          filesChanged: applyResult.filesChanged,
          iteration,
        };
      } catch (iterationError) {
        const errorMessage =
          iterationError instanceof Error ? iterationError.message : String(iterationError);

        console.error(`[${taskId}] ✗ Iteration ${iteration} failed: ${errorMessage}`);

        // store error for next iteration
        previousErrors = errorMessage;

        // if this was the last retry, throw to outer catch
        if (iteration >= maxRetries) {
          throw new Error(`All ${maxRetries} attempts failed. Last error: ${errorMessage}`);
        }
      }
    }

    // If all retries exhausted without success, return failure
    return {
      success: false,
      error: 'Failed to complete coding task after all retries',
      iteration,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    console.error(`\n[${taskId}] -------------------------------------`);
    console.error(`[${taskId}] ✗ Coding Agent failed`);
    console.error(`[${taskId}] Error: ${errorMessage}`);
    console.error(`[${taskId}] Iterations attempted: ${iteration}/${maxRetries}`);
    console.error(`[${taskId}] --------------------------------------\n`);

    return {
      success: false,
      error: errorMessage,
      iteration,
    };
  }
};
