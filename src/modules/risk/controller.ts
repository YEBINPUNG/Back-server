import { NextFunction, Request, Response } from "express";
import * as riskService from "./service";

export async function scanProjectRisks(req: Request, res: Response, next: NextFunction) {
  try {
    const risks = await riskService.scanProjectRisks(req.params.id);
    res.status(200).json({ risks });
  } catch (err) {
    next(err);
  }
}

export async function listProjectRisks(req: Request, res: Response, next: NextFunction) {
  try {
    const risks = await riskService.listProjectRisks(req.params.id);
    res.status(200).json({ risks });
  } catch (err) {
    next(err);
  }
}

export async function listTaskRisks(req: Request, res: Response, next: NextFunction) {
  try {
    const risks = await riskService.listTaskRisks(req.params.id);
    res.status(200).json({ risks });
  } catch (err) {
    next(err);
  }
}
