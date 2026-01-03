// 1. gets task id as input
// 2. fetches github issue content
// 3. calls LLM to generate a plan
// 4. saves the plan into the db

import { fetchGithubIssue } from '../github/fetchIssue';
import prisma from '../lib/prisma';
import { geminiModel } from '../llm/geminiClient';
import { buildPlanningPrompt } from '../llm/promptBuilder';
import { buildRepoSkeleton } from './repoSkeleton';
import { listDirectory } from './tools/listDirectory';

const MAX_EXPLORATION_STEPS = 5;

export type TaskPlan = {
  success: boolean;
  summary?: string;
  steps?: string[];
  error?: string;
}

type PlannerResponse = {
  summary: string;
  steps: string[]
}

type MessageBody = {
  role: string;
  content: string;
}

type PlannerToolRequest =  {
  action: "list_directory";
  path: string;
}

type PlannerFinalOutput = {
  summary: string;
  steps: string[];
};

export const planTask = async (taskId: string, repoPath: string): Promise<TaskPlan> => {
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

    // 1. parse the github url to get repo details 
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

    // 3.1 Before building the prompt , 
    // build the repo skeleton which is to be passed into
    // the prompt

    const repoSkeleton = buildRepoSkeleton(repoPath);

    console.log("GENERATED repo skeleton: ", repoSkeleton);

    // 3.2 Build initial prompt
    const initialPrompt = buildPlanningPrompt(
      issue.title,
      issue.body,
      parsedRepo.owner,
      parsedRepo.repo,
      repoSkeleton
    );

    // Conversation state ("agent memory")
    // This stores the conversation b/w backend and LLM 
    // role -> who owns the conversation 
    // content -> what is the conversation/response 

    // Add first value to message, which is the initial prompt sent by the backend 
    const messages: MessageBody[] = [
      {
        role: "user",
        content: initialPrompt
      }
    ];

    // 3.3 Agent exploration loop
    // This loop enables the LLM to recursively find the most appropriate files/folders 
    // from the codebase. 
    // we can set the MAX_EXPLORATION_STEPS according to token limit

    // keep a plan variable which we expect to be filled by the LLM response in the loop
    let plan: PlannerResponse | null = null;

    for(let step = 0; step < MAX_EXPLORATION_STEPS; step++) {
      // get response form LLM by sending the prompt 
      // In first iteration we send the initial prompt stores in messages []
      // In next iterations we send the previous conversations as context 
      console.log(`-----------------RUNNING EXPLORATION LOOP: ${step}--------------------`);
      const llmResponse = await geminiModel(
        messages.map(m => m.content).join("\n\n")
      );

      if(!llmResponse || !llmResponse.text) {
        throw new Error("Invalid LLM response generated");
      }
      // this llm response contains either the request for tool , or final plan 
      // always store the LLM response 
      messages.push({
        role: "assistant",
        content: llmResponse.text
      });

      // parse the llm response to find out the request type 
      const parsedLlmResponse: PlannerToolRequest | PlannerResponse = JSON.parse(llmResponse.text);

      // the type of parsedLlmResponse should be either PlannerResponse or PlannerToolRequest

      // Tool request 
      if("action" in parsedLlmResponse && "path" in parsedLlmResponse) {
        // we know its of type PlannerToolRequest

        const toolRequest = parsedLlmResponse as PlannerToolRequest;
        console.log("LLM Requested for a tool: ", toolRequest);

        const result = listDirectory(repoPath, toolRequest.path);

        if(!result || !result.success){
          throw new Error("Unable to list directories...");
        }

        console.log("Received result from listDirectory: ", result.list);

        // push this result.list (it contains the list of files/folders asked by the LLM) 
        // to the message so that on next iteration its passed into the LLM 
        messages.push({
          role: "tool",
          content: JSON.stringify({
            action: "list_directory",
            path: toolRequest.path,
            response: result.list
          })
        })
      }
      else {
        // Any other response structure from LLM ->
        // It should be of type PlannerResponse 
        // means we got the plan from the LLM. 
        if("summary" in parsedLlmResponse && "steps" in parsedLlmResponse){
          if(!Array.isArray(parsedLlmResponse.steps)){
            throw new Error("Steps returned from LLM is not an array...");
          }

          // store the summary and steps in plan variable and break from the loop;
          plan = {
            summary: parsedLlmResponse.summary,
            steps: parsedLlmResponse.steps
          }
          break;
        }
      };
    }
    // Check if we have the plan is null , means LLM could not generate the plan 
    // within max exploration steps 
    if(plan == null){
      throw new Error(`Could not generate plan within ${MAX_EXPLORATION_STEPS} steps`);
    }

    // Now we have the plan which we can return 
    // Update the DB to store the plan
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

// const generatePlan = async (prompt: string): Promise<PlannerToolRequest | PlannerResponse | TaskPlan> => {
//   /**
//    * The planning LLM can generate two types of result 
//    * 1. Its working iteratively and needs more files/content -> 
//    * Available tool:
//       {
//         "action": "list_directory",
//         "path": "<relative path from repo root>"
//       }
//      2. Its has finalized the plan and ready to share it / max iterations reached 
//      PlanL: 
//      {
//         "summary": string,
//         "steps": string[]
//      }
//    */
//   const response = await geminiModel(prompt);

//   if (response && response.text) {
//     const parsedResponse: PlannerToolRequest | PlannerResponse = JSON.parse(response.text);

//     if('summary' in parsedResponse && parsedResponse.summary) {
//        return parsedResponse as PlannerResponse;
//     }
//     return parsedResponse as PlannerToolRequest;
//   };

//     return {
//       success: false,
//       error: "Invalid LLM response"
//     }
//   }
  

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
