import express from 'express';
import taskRoute from './routes/taskRoute';
const app = express();

app.get('/health', (req, res) => {
  res.send('ok');
});
app.use('/tasks', taskRoute);
app.listen(3000, () => {
  console.log('Server running on port 3000');
});
