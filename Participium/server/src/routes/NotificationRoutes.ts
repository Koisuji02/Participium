import { Router } from "express";
import { authenticateToken, requireUserType } from "@middlewares/authMiddleware";
import { NotificationRepository } from "@repositories/NotificationRepository";
import { OfficerRole } from "@models/enums/OfficerRole";

const router = Router({ mergeParams: true });

//? prendo solo le notifiche non lette perchè l'utente generalmente vuole essere avvisato solo di quelle nuove
// GET /notifications?unreadOnly=true
router.get("/", authenticateToken, requireUserType(["user", OfficerRole.TECHNICAL_OFFICE_STAFF, OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER, OfficerRole.MUNICIPAL_ADMINISTRATOR, OfficerRole.MAINTAINER]), async (req, res, next) => {
  try {
    const userId = (req as any).user.id;
    const unreadOnly = req.query.unreadOnly === "true";

    const repo = new NotificationRepository();
    const list = await repo.listByUser(userId, unreadOnly);

    res.status(200).json(list.map(n => ({
      id: n.id,
      userId: n.userId,
      reportId: n.reportId || undefined,
      type: n.type,
      message: n.message,
      createdAt: n.createdAt,
      read: n.read
    })));

  } catch (err) {
    next(err);
  }
});

//? segno come letta una notifica specifica
// PATCH /notifications/:id/read
router.patch("/:id/read", authenticateToken, requireUserType(["user", OfficerRole.TECHNICAL_OFFICE_STAFF, OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER, OfficerRole.MUNICIPAL_ADMINISTRATOR, OfficerRole.MAINTAINER]), async (req, res, next) => {
  try {
    const userId = (req as any).user.id;
    const id = Number(req.params.id);

    const repo = new NotificationRepository();
    const updated = await repo.markRead(id, userId);
    
    res.status(200).json({ id: updated.id, read: updated.read });
  } catch (err) {
    next(err);
  }
});

export { router as notificationRouter };
