import { NextFunction, Request, Response } from "express";
import * as auditService from "./service";

export async function listAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await auditService.listProjectAuditLogs(req.params.id, req.query as any);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
