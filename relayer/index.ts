import express from 'express';
import ordersRouter from './routes/orders';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use('/orders', ordersRouter);

app.listen(port, () => {
  console.log(`Relayer backend running at http://localhost:${port}`);
});
