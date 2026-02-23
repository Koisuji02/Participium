import { Router } from "express";
import { authenticateToken, requireUserType } from "@middlewares/authMiddleware";
import { OfficerRole } from "@models/enums/OfficerRole";
import { listConversation, sendInternalMessage } from "@controllers/internalMessageController";

const router = Router({ mergeParams: true });

// GET /api/v1/reports/:reportId/internal-messages
router.get("/:reportId/internal-messages", authenticateToken, requireUserType([OfficerRole.TECHNICAL_OFFICE_STAFF, OfficerRole.MAINTAINER, "external_maintainer"]), async (req, res, next) => {
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

// POST /api/v1/reports/:reportId/internal-messages
router.post("/:reportId/internal-messages", authenticateToken, requireUserType([OfficerRole.TECHNICAL_OFFICE_STAFF, OfficerRole.MAINTAINER, "external_maintainer"]), async (req, res, next) => {
  try {
    const reportId = Number(req.params.reportId);
    if (Number.isNaN(reportId)) {
      return res.status(400).json({ error: "Invalid report ID" });
    }

    const user = (req as any).user;
    const { message } = req.body;

    // console.log('User from token:', user);

    if (!message) {
      return res.status(400).json({ error: "Missing required field: message" });
    }

    // Get report to determine receiver
    const ReportRepository = require('@repositories/ReportRepository').ReportRepository;
    const reportRepo = new ReportRepository();
    const report = await reportRepo.getReportById(reportId);
    
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    // Check user type - it's an array in JWT
    const userTypes = Array.isArray(user.type) ? user.type : [user.type];
    const isMaintainer = userTypes.some((t: string) => t === OfficerRole.MAINTAINER || t === "external_maintainer");

    const sender: { type: OfficerRole.TECHNICAL_OFFICE_STAFF | OfficerRole.MAINTAINER; id: number } = {
      type: isMaintainer ? OfficerRole.MAINTAINER : OfficerRole.TECHNICAL_OFFICE_STAFF,
      id: user.id
    };

    // Receiver is automatically determined from report assignment
    const receiver: { type: OfficerRole.TECHNICAL_OFFICE_STAFF | OfficerRole.MAINTAINER; id: number } = 
      sender.type === OfficerRole.TECHNICAL_OFFICE_STAFF
        ? { type: OfficerRole.MAINTAINER, id: report.assignedMaintainerId }
        : { type: OfficerRole.TECHNICAL_OFFICE_STAFF, id: report.assignedOfficerId };

    const saved = await sendInternalMessage(reportId, sender, receiver, message);
    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
});

export { router as internalMessageRouter };
