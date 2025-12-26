import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { processTask } from '../orchestrator/taskOrchestrator';

const router = Router();

router.get('/health', (req, res) => {
  res.send('task route is healthy');
});

router.get('/get-tasks', async (req, res) => {
  const tasks = await prisma.task.findMany();
  return res.json(tasks);
});


// -------------------------------------------------------------

// route to post new task
router.post('/post-task', async(req: Request, res: Response) => {
  try{
    // get github url from req body
    const { githubIssueUrl } = req.body;

    if(!githubIssueUrl){
      return res.status(400).json({
        error: 'Github issue url is required'
      })
    }

    // create a new task in db and return the task id along with status
    const task = await prisma.task.create({
      data: {
        githubIssueUrl,
        status: 'QUEUED',
        currentStep: 'NONE',
      }
    })

    processTask(task.id);

    return res.status(200).json({taskId: task.id})
  }catch(err){
    console.log(err);
    return res.status(500).json({
      message: 'Internal server error',
    })
  }
})

// route to get task by id and metadata
router.get('/get-task/:id', async(req, res) => {
  try{
    // extract id from req params
    const taskId = req.params.id;

    const task = await prisma.task.findUnique({
      where: {
        id: taskId
      }
    })

    if(!task){
      return res.status(400).json({
        error: `Task with id ${taskId} not found!!`
      })
    }

    return res.status(200).json(task);
    
  } catch(err){
    console.log(err);
  }
} )

export default router;
