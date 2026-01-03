import express from 'express';
import taskRoute from './routes/taskRoute';
import testRoute from './routes/testRoute'
import cors from 'cors';
const app = express();

app.use(express.json());
app.use(cors());


app.get('/health', (req, res) => {
  res.send('ok');
});


app.use('/tasks', taskRoute);
app.use('/test', testRoute);


app.listen(3000, () => {
  console.log('Server running on port 3000');
});
