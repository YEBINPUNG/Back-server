import { NextFunction, Request, Response } from "express";
import * as meetingsService from "./service";

export async function createMeeting(req: Request, res: Response, next: NextFunction) {
  try {
    const meeting = await meetingsService.createMeeting(req.params.id, req.user!.userId, req.body);
    res.status(201).json({ meeting });
  } catch (err) {
    next(err);
  }
}

export async function listMeetings(req: Request, res: Response, next: NextFunction) {
  try {
    const meetings = await meetingsService.listMeetings(req.params.id);
    res.status(200).json({ meetings });
  } catch (err) {
    next(err);
  }
}

export async function getMeeting(req: Request, res: Response, next: NextFunction) {
  try {
    const meeting = await meetingsService.getMeeting(req.params.id);
    res.status(200).json({ meeting });
  } catch (err) {
    next(err);
  }
}

export async function updateMeeting(req: Request, res: Response, next: NextFunction) {
  try {
    const meeting = await meetingsService.updateMeeting(req.params.id, req.body);
    res.status(200).json({ meeting });
  } catch (err) {
    next(err);
  }
}

export async function deleteMeeting(req: Request, res: Response, next: NextFunction) {
  try {
    await meetingsService.softDeleteMeeting(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function summarizeMeeting(req: Request, res: Response, next: NextFunction) {
  try {
    const meeting = await meetingsService.summarizeMeeting(req.params.id);
    res.status(200).json({ meeting });
  } catch (err) {
    next(err);
  }
}

export async function extractTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const extractedTasks = await meetingsService.extractTasks(req.params.id);
    res.status(200).json({ extractedTasks });
  } catch (err) {
    next(err);
  }
}

export async function approveExtractedTask(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await meetingsService.approveExtractedTask(req.params.id, req.user!.userId, req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function rejectExtractedTask(req: Request, res: Response, next: NextFunction) {
  try {
    const extractedTask = await meetingsService.rejectExtractedTask(req.params.id, req.user!.userId);
    res.status(200).json({ extractedTask });
  } catch (err) {
    next(err);
  }
}
