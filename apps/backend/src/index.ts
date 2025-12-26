import express from 'express';
import taskRoute from './routes/taskRoute';
import cors from 'cors';
const app = express();

app.use(express.json());
app.use(cors());
app.get('/health', (req, res) => {
  res.send('ok');
});
app.use('/tasks', taskRoute);
app.listen(3000, () => {
  console.log('Server running on port 3000');
});
