import { NextFunction, Request, Response } from "express";
import * as projectsService from "./service";

export async function createProject(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await projectsService.createProject(req.user!.userId, req.body);
    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
}

export async function listMyProjects(req: Request, res: Response, next: NextFunction) {
  try {
    const projects = await projectsService.listMyProjects(req.user!.userId);
    res.status(200).json({ projects });
  } catch (err) {
    next(err);
  }
}

export async function getProject(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await projectsService.getProject(req.params.id);
    res.status(200).json({ project });
  } catch (err) {
    next(err);
  }
}

export async function updateProject(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await projectsService.updateProject(req.params.id, req.body);
    res.status(200).json({ project });
  } catch (err) {
    next(err);
  }
}

export async function deleteProject(req: Request, res: Response, next: NextFunction) {
  try {
    await projectsService.softDeleteProject(req.params.id, req.user!.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function inviteMember(req: Request, res: Response, next: NextFunction) {
  try {
    const member = await projectsService.inviteMember(req.params.id, req.user!.userId, req.body);
    res.status(201).json({ member });
  } catch (err) {
    next(err);
  }
}

export async function updateMemberRole(req: Request, res: Response, next: NextFunction) {
  try {
    const member = await projectsService.updateMemberRole(
      req.params.id,
      req.user!.userId,
      req.params.userId,
      req.body.role
    );
    res.status(200).json({ member });
  } catch (err) {
    next(err);
  }
}

export async function removeMember(req: Request, res: Response, next: NextFunction) {
  try {
    await projectsService.removeMember(req.params.id, req.user!.userId, req.params.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
