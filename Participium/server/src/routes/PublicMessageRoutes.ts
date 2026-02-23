import { Router } from "express";
import { authenticateToken } from "@middlewares/authMiddleware";
import { OfficerRole } from "@models/enums/OfficerRole";
import { listConversation, sendPublicMessage } from "@controllers/publicMessageController";

const router = Router({ mergeParams: true });

// GET /api/v1/reports/:reportId/public-messages
// Accessible by citizens (report author) and all officers
router.get("/:reportId/public-messages", authenticateToken, async (req, res, next) => {
  try {
    const reportId = Number(req.params.reportId);
    if (Number.isNaN(reportId)) {
      return res.status(400).json({ error: "Invalid report ID" });
    }

    const messages = await listConversation(reportId);
    res.json(messages);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/reports/:reportId/public-messages
// Accessible by citizens (report author) and all officers
router.post("/:reportId/public-messages", authenticateToken, async (req, res, next) => {
  try {
    const reportId = Number(req.params.reportId);
    if (Number.isNaN(reportId)) {
      return res.status(400).json({ error: "Invalid report ID" });
    }

    const user = (req as any).user;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Missing required field: message" });
    }

    // Determine sender type based on user role
    const userTypes = Array.isArray(user.type) ? user.type : [user.type];
    const isOfficer = userTypes.some((t: string) => 
      t === OfficerRole.TECHNICAL_OFFICE_STAFF || 
      t === OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER || 
      t === OfficerRole.MUNICIPAL_ADMINISTRATOR ||
      t === OfficerRole.MAINTAINER ||
      t === "external_maintainer"
    );

    const senderType: 'citizen' | 'officer' = isOfficer ? 'officer' : 'citizen';

    const saved = await sendPublicMessage(reportId, senderType, user.id, message);
    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
});

export { router as publicMessageRouter };
