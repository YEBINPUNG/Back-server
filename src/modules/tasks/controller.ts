import { NextFunction, Request, Response } from "express";
import * as tasksService from "./service";

export async function createTask(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await tasksService.createTask(req.params.id, req.body);
    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
}

export async function listTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const tasks = await tasksService.listTasks(req.params.id, req.query as any);
    res.status(200).json({ tasks });
  } catch (err) {
    next(err);
  }
}

export async function getTask(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await tasksService.getTask(req.params.id);
    res.status(200).json({ task });
  } catch (err) {
    next(err);
  }
}

export async function updateTask(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await tasksService.updateTask(req.params.id, req.user!.userId, req.body);
    res.status(200).json({ task });
  } catch (err) {
    next(err);
  }
}

export async function deleteTask(req: Request, res: Response, next: NextFunction) {
  try {
    await tasksService.softDeleteTask(req.params.id, req.user!.userId, req.projectMembership!.role);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
