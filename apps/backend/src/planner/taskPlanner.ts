// 1. gets task id as input
// 2. fetches github issue content
// 3. calls LLM to generate a plan
// 4. saves the plan into the db

import { fetchGithubIssue } from '../github/fetchIssue';
import prisma from '../lib/prisma';
import { geminiModel } from '../llm/geminiClient';
import { buildPlanningPrompt } from '../llm/promptBuilder';

export type TaskPlan = {
  summary: string;
  steps: string[];
};

export const planTask = async (taskId: string) => {
  try {
    // get task from db
    const task = await prisma.task.findUnique({
      where: {
        id: taskId,
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // 1. parse the github url 
    const match = task.githubIssueUrl.match(
      /github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/
    )

    if(!match){
      throw new Error("Invalid github url format")
    }

    const [, owner, repo, issueNumber] = match;

    // 2. Fetch issue 
    // this returns us the title and body of the issue 
    const issue = await fetchGithubIssue(owner, repo, issueNumber);

    // 3. build the prompt
    const prompt = buildPlanningPrompt(issue.title, issue.body, `${owner}/${repo}`);

    // 4. Call Gemini
    const plan = await generatePlan(prompt);

    await prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        plan,
      },
    });

    return plan;
  } catch (err) {
    console.log(err);
  }
};

const generatePlan = async (prompt: string): Promise<TaskPlan> => {
  /**
   * Replace this with real LLM call later.
   * This stub lets you test end-to-end flow.
   */
  const response = await geminiModel(prompt);
  
  if(response && response.text){
    const parsedResponse: TaskPlan = JSON.parse(response.text);
    return {
      summary: parsedResponse.summary,
      steps: parsedResponse.steps
    };
  }
  return {
    summary: 'Analyze the issue and implement the required fix',
    steps: [
      'Understand the reported problem',
      'Locate relevant files in the codebase',
      'Apply the fix',
      'Add or update tests',
      'Verify the solution',
    ],
  };
};
