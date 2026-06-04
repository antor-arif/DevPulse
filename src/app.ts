import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { StatusCodes } from "http-status-codes";
import authRoutes from "./modules/auth/auth.routes";
import issuesRoutes from "./modules/issues/issues.routes";
import { sendError } from "./utils/response";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/issues', issuesRoutes);

app.use((_req: Request, res: Response) => {
  sendError(res, StatusCodes.NOT_FOUND, "Route not found");
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  sendError(
    res,
    StatusCodes.INTERNAL_SERVER_ERROR,
    "Internal server error",
    err.message,
  );
});

export default app;
