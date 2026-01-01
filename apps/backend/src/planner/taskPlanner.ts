// 1. gets task id as input
// 2. fetches github issue content
// 3. calls LLM to generate a plan
// 4. saves the plan into the db

import { fetchGithubIssue } from '../github/fetchIssue';
import prisma from '../lib/prisma';
import { geminiModel } from '../llm/geminiClient';
import { buildPlanningPrompt } from '../llm/promptBuilder';

export type TaskPlan = {
  success: boolean;
  summary?: string;
  steps?: string[];
  error?: string;
};

export const planTask = async (taskId: string): Promise<TaskPlan> => {
  try {
    // validate input
    if (!taskId) {
      throw new Error('TaskId not available in plan task');
    }

    // get task from db (now it contains the index tree written by repoIndexer inside setupWorkspace)
    const task = await prisma.task.findUnique({
      where: {
        id: taskId,
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    if (!task) {
      throw new Error("Couldn't get task from DB for planTask");
    }

    // 1. parse the github url
    const parsedRepo = parseRepoUrl(task.issueUrl);

    if (!parsedRepo) {
      throw new Error('Could not parse repo url');
    }
    // 2. Fetch issue
    // this returns us the title and body of the issue
    const issue = await fetchGithubIssue(parsedRepo.owner, parsedRepo.repo, parsedRepo.issueNumber);

    if (!issue) {
      throw new Error('Could not fetch issue details from github API');
    }
    // 3. build the prompt
    const prompt = buildPlanningPrompt(
      issue.title,
      issue.body,
      parsedRepo.owner,
      parsedRepo.repo,
      task.repoTree
    );

    // 4. Call Gemini
    const plan = await generatePlan(prompt);

    if (!plan) {
      throw new Error('Could not generate plan from LLM');
    }

    await prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        plan,
      },
    });

    return {
      success: true,
      summary: plan.summary,
      steps: plan.steps,
    };
  } catch (planningError) {
    const errorMessage =
      planningError instanceof Error ? planningError.message : String(planningError);

    console.log('Failed to plan task');

    return {
      success: false,
      error: errorMessage,
    };
  }
};

const generatePlan = async (prompt: string): Promise<TaskPlan> => {
  /**
   * Replace this with real LLM call later.
   * This stub lets you test end-to-end flow.
   */
  const response = await geminiModel(prompt);

  if (response && response.text) {
    const parsedResponse: TaskPlan = JSON.parse(response.text);
    return {
      success: true,
      summary: parsedResponse.summary,
      steps: parsedResponse.steps,
    };
  }
  return {
    success: false,
    error: 'LLM did not generate correct format',
  };
};

export const parseRepoUrl = (issueUrl: string) => {
  try {
    const match = issueUrl.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);

    if (!match) {
      throw new Error('Invalid github url format');
    }

    const [, owner, repo, issueNumber] = match;

    return { owner, repo, issueNumber };
  } catch (err) {
    console.log('Could not parse repo url');
    return;
  }
};
