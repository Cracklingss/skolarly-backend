import express, { Request, Response, NextFunction } from 'express';
import routes from '@/routes';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ENV } from '@/config/env';

const app = express();

app.use(cors({
  origin: ENV.FRONTEND_URL,
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

app.use('/api', routes);

export default app;