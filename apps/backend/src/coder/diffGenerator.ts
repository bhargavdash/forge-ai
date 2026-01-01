import { geminiModel } from '../llm/geminiClient';
import { buildDiffGenerationPrompt } from '../llm/promptBuilder';

export interface DiffGenerationResult {
  success: boolean;
  diff?: string;
  error?: string;
}

export const generateDiff = async (
  plan: { summary: string; steps: string[] },
  files: { path: string; content: string }[]
): Promise<DiffGenerationResult> => {
  try {
    // validate inputs
    if (!plan.summary || !plan.steps.length) {
      throw new Error('Invalid plan: missing summary or steps');
    }

    if (!files || files.length === 0) {
      throw new Error('No files provided for diff generation');
    }

    // Validate each file has path and content
    for (const file of files) {
      if (!file.path || !file.content) {
        throw new Error('Invalid file: missing path or content');
      }
    }

    console.log(`Generating diff for ${files.length} file(s)...`);

    const prompt = buildDiffGenerationPrompt(plan, files);
    const diff = await generateDiffContent(prompt);

    // validate diff format
    if (!isValidDiff(diff)) {
      throw new Error('LLM generated invalid diff format');
    }

    console.log(`Successfully generated diff (${diff.length} characters)`);

    return {
      success: true,
      diff: diff,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Diff generation failed:', errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
};

const generateDiffContent = async (prompt: string): Promise<string> => {
  try {
    const response = await geminiModel(prompt);

    if (!response?.text) {
      throw new Error('Empty response from LLM');
    }

    // clean the response - remove markdown code blocks if present
    let cleanedDiff = response.text.trim();

    // Remove ```diff or ``` wrappers
    cleanedDiff = cleanedDiff.replace(/```diff\n?/g, '');
    cleanedDiff = cleanedDiff.replace(/```\n?/g, '');
    cleanedDiff = cleanedDiff.trim();

    if (!cleanedDiff) {
      throw new Error('LLM returned empty diff');
    }

    return cleanedDiff;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Failed to generate diff content:', errorMessage);
    throw new Error(`Diff generation failed: ${errorMessage}`);
  }
};

/**
 * Basic validation to check if string looks like a unified diff
 */

const isValidDiff = (diff: string): boolean => {
  if (!diff || typeof diff !== 'string') {
    return false;
  }

  // A valid unified diff should have:
  // 1. File headers (--- and +++)
  // 2. At least one hunk header (@@)
  const hasFileHeaders = /^---\s+.*\n\+\+\+\s+.*/m.test(diff);
  const hasHunkHeaders = /^@@\s+-\d+,?\d*\s+\+\d+,?\d*\s+@@/m.test(diff);

  return hasFileHeaders && hasHunkHeaders;
};
