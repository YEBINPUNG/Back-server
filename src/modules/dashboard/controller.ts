import { NextFunction, Request, Response } from "express";
import * as dashboardService from "./service";

export async function getDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const dashboard = await dashboardService.getDashboard(req.params.id);
    res.status(200).json({ dashboard });
  } catch (err) {
    next(err);
  }
}
