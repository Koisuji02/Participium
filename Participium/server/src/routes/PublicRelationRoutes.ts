import {Router} from "express";
import {retrieveDocs, assignReportToOfficer} from "@controllers/officerController"
import { authenticateToken, requireUserType } from "@middlewares/authMiddleware"
import { OfficerRole } from "@models/enums/OfficerRole";
const router = Router({mergeParams : true});


router.get("/retrievedocs", authenticateToken, requireUserType([OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER]), async(req, res, next) =>{
    try{
        // Prendi l'ID dell'officer dal token JWT
        const officerId = (req as any).user?.id;
        const result = await retrieveDocs(officerId);
        res.status(200).json(result);
    }
    catch(error)
    {
        next(error);
    }
});
router.post("/assign-report", authenticateToken, requireUserType([OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER]), async (req, res, next) => {
    try {
        const { reportId, officerId } = req.body;
        await assignReportToOfficer(reportId, officerId);
        res.status(200).json({ message: "Report assigned successfully" });
    } catch (error) {
        next(error);
    }
});



export {router as PublicRelationRoutes};
