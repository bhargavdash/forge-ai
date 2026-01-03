// this is the orchestrator code
// takes taskId as input and periodically updates the status in the db

import { runCoderAgent } from '../coder/coderAgent';
import prisma from '../lib/prisma';
import { planTask } from '../planner/taskPlanner';
import { setupWorkspace } from '../services/workspace/workspace.service';
import path from 'path';

export const processTask = async (taskId: string, issueUrl: string) => {
  try {
    // update the task in the db for different steps

    // 1. Take up the new task and put it from queued to running
    const task = await prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        status: 'RUNNING',
        currentStep: 'PLANNING',
      },
    });

    // 2. Next is planning state which will be done with AI
    console.log(`[TASK ${taskId}] planning step started ...`);

    // 2.1 Setup workspace before calling planner agent

    const workspace = await setupWorkspace(task.id, task.workspaceId, issueUrl);

    if (!workspace.success || !workspace.repoTree || !workspace.workspacePath) {
      // throw error that step has failed
      throw new Error('Workspace setup failed');
    }

    const { workspacePath, repoTree } = workspace;
    // this workspacePath is forge-ai/apps/backend/workspaces/[taskId] 
    // inside this we have a repo folder which is the root folder of the cloned project. 
    const repoPath = path.join(workspacePath, 'repo');
    console.log(`THIS IS THE REPO PATH FOR TASK[${taskId}]: ${repoPath}`);

    // 2.2 call the planner agent
    console.log("[TASK ORCHESTRATOR]: CALLING PLAN TASK WITH REPO PATH: ", repoPath);
    const plan = await planTask(taskId, repoPath);

    if (!plan.success || !plan.summary || !plan.steps?.length) {
      throw new Error('Could not plan task using LLM');
    }
    // 3. Move to coding step
    await prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        currentStep: 'CODING',
      },
    });

    console.log(`[TASK ${taskId}] coding step started ...`);

    const coderAgentResult = await runCoderAgent(
      taskId,
      {
        summary: plan.summary,
        steps: plan.steps,
      },
      repoTree,
      repoPath
    );

    if (!coderAgentResult.success) {
      throw new Error('Coding stage failed');
    }

    // 3. Mark step as completed
    await prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        status: 'COMPLETED',
        currentStep: 'DONE',
      },
    });

    console.log(`[TASK ${taskId}] completed successfully !!!`);
  } catch (err: any) {
    await prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        status: 'FAILED',
        errorMessage: err.message ?? 'Unknown error',
      },
    });
    console.error(`[Task ${taskId}] Failed..`, err);
  }
};
