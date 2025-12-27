// this is the orchestrator code
// takes taskId as input and periodically updates the status in the db

import prisma from '../lib/prisma';
import { planTask } from '../planner/taskPlanner';
import { setupWorkspace } from '../services/workspace/workspace.service';

export const processTask = async (taskId: string, issueUrl: string) => {
  try {
    // update the task in the db for different steps

    // 1. Take up the new task and put it from queued to running
    await prisma.task.update({
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
    
    await setupWorkspace(taskId, issueUrl);

    // call the planner agent 
    await planTask(taskId);

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

    await fakeDelay();

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

// Set a delay of 1 second in execution flow
const fakeDelay = () => new Promise((resolve) => setTimeout(resolve, 1000));
