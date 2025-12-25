import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

router.get('/health', (req, res) => {
  res.send('task route is healthy');
});

router.get('/get-tasks', async (req, res) => {
  const tasks = await prisma.task.findMany();
  return res.json(tasks);
});

export default router;
