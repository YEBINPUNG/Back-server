import { NextFunction, Request, Response } from "express";
import * as uploadsService from "./service";

export async function presignUpload(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await uploadsService.createUploadPresign(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function presignDownload(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await uploadsService.createDownloadPresign((req.query as any).key);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
