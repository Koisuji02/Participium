import {Router} from "express";
import {uploadReport, getReports, getReport } from "@controllers/reportController"
import { getMacroStatistics, getStatistics } from "@controllers/statisticsController";

import { authenticateToken, requireUserType } from "@middlewares/authMiddleware"
import { uploadPhotos } from "@middlewares/uploadMiddleware";
import { OfficerRole } from "@models/enums/OfficerRole";
import { OfficeType } from "@models/enums/OfficeType";
import { ReportRepository } from "@repositories/ReportRepository";
import { NotificationRepository } from "@repositories/NotificationRepository";
import { ReviewStatus } from "@models/enums/ReviewStatus";
import { FollowRepository } from "@repositories/FollowRepository";
import { mapUserDAOToDTO } from "@services/mapperService";

const router = Router({mergeParams : true});

router.post("/", authenticateToken, requireUserType(["user"]), uploadPhotos, async(req, res, next) =>{
    try{
        // Build DTO from multipart/form-data fields directly to avoid mismatches
        const lat = req.body.latitude ? Number.parseFloat(req.body.latitude as string) : undefined;
        const lng = req.body.longitude ? Number.parseFloat(req.body.longitude as string) : undefined;

        const reportData: any = {
            title: req.body.title || undefined,
            anonymity: req.body.anonymity === '1' || req.body.anonymity === 'true' || req.body.anonymity === true,
            category: req.body.category || undefined,
            document: {
                description: req.body.description || undefined
            },
            location: (lat !== undefined && lng !== undefined) ? { Coordinates: { latitude: lat, longitude: lng } } : undefined
        };

                const files = req.files as Express.Multer.File[];
                const userId = (req as any).user?.id;
                        // debug logging removed: debug file writing was temporary for troubleshooting
                const result = await uploadReport(reportData, files, userId);

        res.status(200).json(result);
    }
    catch(error) {
        next(error);
    }
});

router.get("/", async(req, res, next) =>{
    try{
        // Check if user is authenticated
        // const authHeader = req.headers.authorization; //No Auht needed for PT-28
        let result;

        result = await getReports();
        res.status(200).json(result);
    }
    catch(error)
    {
        next(error);
    }
});

/**
 * GET /stats
 * Get statistics about reports (no authentication required)
 * Query params:
 *   - fromDate: Start date for filtering (ISO 8601 format, optional)
 *   - toDate: End date for filtering (ISO 8601 format, optional)
 *   - period: 'daily' | 'weekly' | 'monthly' | 'yearly' (optional)
 *   - category: Office type category (optional)
 * 
 * Returns: Array of { date, totalReports, approvedReports, rejectedReports }
 * 
 * Examples:
 *   - /stats - Get all statistics
 *   - /stats?period=weekly - Get statistics grouped by week
 *   - /stats?category=WASTE - Get statistics for waste category
 *   - /stats?fromDate=2026-01-01&toDate=2026-01-31&period=daily - Get daily stats for January
 */
router.get("/stats", async (req, res, next) => {
  try {
    const fromDate = req.query.fromDate as string | undefined;
    const toDate = req.query.toDate as string | undefined;
    const period = req.query.period as 'daily' | 'weekly' | 'monthly' | 'yearly' | undefined;
    const category = req.query.category as OfficeType | undefined;
    
    // Validation is handled in the controller
    const result = await getStatistics(fromDate, toDate, period, category);
    
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/macrostats", async (req, res, next) => {
  try {
    const period = req.query.period as 'daily' | 'weekly' | 'monthly' | undefined;
    const statistics = await getMacroStatistics(period);
    res.status(200).json(statistics);
  } catch (error) {
    next(error);
  }
});

//? Get single report by ID (for officers and authenticated users)
router.get("/:id", authenticateToken, async (req, res, next) => {
    try {
        const reportId = Number(req.params.id);
        
        if (Number.isNaN(reportId)) {
            return res.status(400).json({ error: "Invalid report ID" });
        }

        const reportRepo = new ReportRepository();
        const report = await reportRepo.getReportById(reportId);
        
        if (!report) {
            return res.status(404).json({ error: "Report not found" });
        }

        // Map the report DAO to DTO
        const result = await getReport(reportId);
        res.status(200).json(result);
    } catch (error: any) {
        console.error(`Error fetching report ${req.params.id}:`, error);
        if (error.message?.includes('not found')) {
            return res.status(404).json({ error: "Report not found" });
        }
        next(error);
    }
});

//? Approve report (Public Relations Officer only)
router.patch("/:id/approve", authenticateToken, requireUserType([OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER]), async (req, res, next) => {
    try {
        const reportId = Number(req.params.id);
        const explanation = req.body.explanation;

        const reportRepo = new ReportRepository();
        const report = await reportRepo.getReportById(reportId);

        if (!report) {
            return res.status(404).json({ error: "Report not found" });
        }

        report.reviewStatus = ReviewStatus.APPROVED;
        if (explanation) {
            report.explanation = explanation;
        }

        await reportRepo.updateReport(report);

        res.status(200).json({ message: "Report approved successfully", report });
    } catch (error) {
        next(error);
    }
});

//? Decline report (Public Relations Officer only)
router.patch("/:id/decline", authenticateToken, requireUserType([OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER]), async (req, res, next) => {
    try {
        const reportId = Number(req.params.id);
        const explanation = req.body.explanation;

        if (!explanation || explanation.trim().length === 0) {
            return res.status(400).json({ error: "Explanation is required when declining a report" });
        }

        const reportRepo = new ReportRepository();
        const report = await reportRepo.getReportById(reportId);

        if (!report) {
            return res.status(404).json({ error: "Report not found" });
        }

        report.reviewStatus = ReviewStatus.DECLINED;
        report.explanation = explanation.trim();

        await reportRepo.updateReport(report);

        res.status(200).json({ message: "Report declined successfully", report });
    } catch (error) {
        next(error);
    }
});

//? PT-11 (officer manda messaggio all'autore del report [1-way only, guarda su Telegram])
router.post("/:id/message", authenticateToken, requireUserType([OfficerRole.TECHNICAL_OFFICE_STAFF, OfficerRole.MUNICIPAL_ADMINISTRATOR]), async (req, res, next) => {
    try {
        const reportId = Number(req.params.id);
        const text: string = req.body.message;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: "message is required" });
        }

        const reportRepo = new ReportRepository();
        const notificationRepo = new NotificationRepository();

        const report = await reportRepo.getReportById(reportId);
        const officerId = (req as any).user.id;

        const created = await notificationRepo.createOfficerMessageNotification(report as any, officerId, text.trim());

        if (!created) {
            return res.status(200).json({
                info: "No notification created (anonymous report)."
            });
        }

        res.status(201).json({ id: created.id, type: created.type, message: created.message, reportId: created.reportId });
    } catch (err) {
        next(err);
    }
});

//? PT-16: FOLLOW endpoints
// GET follower user di un report (chiamata da un Officer)
router.get("/:id/followers", authenticateToken, requireUserType([OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER, OfficerRole.MUNICIPAL_ADMINISTRATOR, OfficerRole.TECHNICAL_OFFICE_STAFF, OfficerRole.MAINTAINER]), async (req, res, next) => {
    try {
        const reportId = Number(req.params.id);
        const repo = new FollowRepository();
        const users = await repo.getFollowersOfReport(reportId);
        const dto = users.map(u => mapUserDAOToDTO(u));
        res.status(200).json(dto);
    } catch (err) {
        next(err);
    }
});

// POST (follow di un report) (chiamata da uno User autenticato)
router.post("/:id/follow", authenticateToken, requireUserType(["user"]), async (req, res, next) => {
    try {
        const userId = (req as any).user?.id;
        const reportId = Number(req.params.id);
        const repo = new FollowRepository();
        const created = await repo.follow(Number(userId), reportId);
        res.status(201).json({ id: created.id, userId: created.user.id, reportId: created.report.id, createdAt: created.createdAt });
    } catch (err) {
        next(err);
    }
});

// DELETE (unfollow di un report) (chiamata da uno User autenticato)
router.delete("/:id/follow", authenticateToken, requireUserType(["user"]), async (req, res, next) => {
    try {
        const userId = (req as any).user?.id;
        const reportId = Number(req.params.id);
        const repo = new FollowRepository();
        await repo.unfollow(Number(userId), reportId);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
});

export {router as reportRouter};