import { z } from "zod";

export const listAuditLogsQuerySchema = z.object({
  action: z.string().trim().min(1).max(100).optional(),
  actorId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().uuid().optional(),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
