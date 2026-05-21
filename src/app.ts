import express, { Request, Response, NextFunction } from 'express';

const app = express();

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "Hello World!"
  })
}) 

export default app;