import {Router} from "express";
import {createOfficer,reviewDoc, getAllOfficers, updateOfficer, getAllOfficersByOfficeType, deleteOfficer, getAssignedReports} from "@controllers/officerController"
import { authenticateToken, requireUserType } from "@middlewares/authMiddleware"
import {OfficerFromJSON,OfficerToJSON} from "@dto/Officer";
import { OfficerRole } from "@models/enums/OfficerRole";
import { assignReportToMaintainer } from "@controllers/maintainerController";
const router = Router({mergeParams : true});

//? REFACTORING
// ===================== ADMIN CRUD OFFICERS (NEW PATHS) =====================

// Create officer (era POST /admin)
router.post("/", authenticateToken, requireUserType([OfficerRole.MUNICIPAL_ADMINISTRATOR]), async (req, res, next) => {
  try {
    const officerData = OfficerFromJSON(req.body);
    if (!officerData.email) return res.status(400).json({ error: "email is required" });
    const result = await createOfficer(officerData);
    res.status(200).json(OfficerToJSON(result));
  } catch (error) {
    next(error);
  }
});

// List officers (era GET /admin/admin)
router.get("/", authenticateToken, requireUserType([OfficerRole.MUNICIPAL_ADMINISTRATOR]), async (req, res, next) => {
  try {
    const all = await getAllOfficers();
    res.status(200).json(all.map(OfficerToJSON));
  } catch (error) {
    next(error);
  }
});

// Update officer (era PATCH /admin)
router.patch("/:id", authenticateToken, requireUserType([OfficerRole.MUNICIPAL_ADMINISTRATOR]), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "id is required" });

    const officerData = OfficerFromJSON(req.body);
    officerData.id = id;

    const result = await updateOfficer(officerData);
    res.status(200).json(OfficerToJSON(result));
  } catch (error) {
    next(error);
  }
});

// Delete officer (era DELETE /admin/officers/:id)
router.delete("/:id", authenticateToken, requireUserType([OfficerRole.MUNICIPAL_ADMINISTRATOR]), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "id is required" });
    await deleteOfficer(id);
    res.status(200).json({ message: `Officer with id '${id}' deleted successfully` });
  } catch (error) {
    next(error);
  }
});


// ===================== OFFICER OPERATIONS =====================


// Retrieve documents assigned to officer
router.get("/assigned", authenticateToken, requireUserType([OfficerRole.TECHNICAL_OFFICE_STAFF, OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER]), async (req, res, next) => {
    try {
        const officerId = (req as any).user?.id;
        const result = await getAssignedReports(officerId);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});


// Get officers by office type
router.get("/OfficerByOfficeType/:officeType", authenticateToken, requireUserType([OfficerRole.MUNICIPAL_ADMINISTRATOR, OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER]), async(req, res, next) =>{
    try{
        const officeType = req.params.officeType;
        if(!officeType){
            return res.status(400).json({error: "officeType query parameter is required"});
        }
        const alloff = await getAllOfficersByOfficeType(officeType);
        const result = alloff.map(OfficerToJSON);
        res.status(200).json(result);
    }
    catch(error)
    {
        next(error);
    }
});


// Review report
router.patch("/reviewdocs/:id", authenticateToken, requireUserType([OfficerRole.TECHNICAL_OFFICE_STAFF, OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER]), async(req, res, next) =>{
    try{
        const officerId = (req as any).user?.id;
        const{state,reason} = req.body;
        const result = await reviewDoc(officerId, Number(req.params.id), state, reason);
        res.status(200).json(result);
    }
    catch(error)
    {
        next(error);
    }
});



// Assign report to a maintainer (coerente con OfficerRoutes)
router.post("/assign-report", authenticateToken, requireUserType([OfficerRole.TECHNICAL_OFFICE_STAFF]), async (req, res, next) => {
    try {
    const { reportId, maintainerId } = req.body;
    await assignReportToMaintainer(Number(reportId), Number(maintainerId));
    res.status(200).json({ message: "Report assigned to maintainer" });
  } catch (err) {
    next(err);
  }
});
export {router as officerRouter};
