export const buildPlanningPrompt = (
  issueTitle: string,
  issueBody: string | null,
  repoFullName: string
) => `
You are an expert senior software engineer and system designer.

Your task is to create a clear, step-by-step implementation plan to resolve a GitHub issue.

Repository: ${repoFullName}

GitHub Issue Title:
${issueTitle}

GitHub Issue Description:
${issueBody ?? 'No description provided.'}

Rules:
- Do NOT write code
- Do NOT mention specific line numbers
- Do NOT assume access to the full codebase
- Focus on high-level implementation steps
- Be concise but complete

Output format:
Return ONLY valid JSON in the following format:

{
  "summary": "One sentence summary of the fix",
  "steps": [
    "Step 1 description",
    "Step 2 description",
    "Step 3 description"
  ]
}
`;
