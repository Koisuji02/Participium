import { Router } from "express";
import { authenticateToken, requireUserType } from "@middlewares/authMiddleware";
import { OfficerRole } from "@models/enums/OfficerRole";
import { OfficeType } from "@models/enums/OfficeType";
import { createMaintainer, getAllMaintainers, getMaintainersByCategory, updateMaintainer, updateReportStatusByMaintainer, getAssignedReportsForMaintainer, deleteMaintainer } from "@controllers/maintainerController";

const router = Router({ mergeParams: true });


// ===================== ADMIN CRUD MAINTAINERS (NEW PATHS) =====================

// Create maintainer (era POST /admin/maintainers)
router.post("/", authenticateToken, requireUserType([OfficerRole.MUNICIPAL_ADMINISTRATOR]), async (req, res, next) => {
  try {
    const { name, email, password, categories, active } = req.body;
    if (!name || !email || !password || !categories) {
      return res.status(400).json({ error: "name, email, password, categories are required" });
    }
    const result = await createMaintainer(name, email, password, categories as OfficeType[], active ?? true);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});


// Get all maintainers (era GET /list)
router.get("/", authenticateToken, requireUserType([OfficerRole.MUNICIPAL_ADMINISTRATOR, OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER, OfficerRole.TECHNICAL_OFFICE_STAFF]),  async (req, res, next) => {
  try {
    const result = await getAllMaintainers();
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Update maintainer (era PATCH /admin/maintainers/:id)
router.patch("/:id", authenticateToken, requireUserType([OfficerRole.MUNICIPAL_ADMINISTRATOR]), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "id is required" });
    // req.body è passato come Partial<MaintainerDAO> nel controller
    const result = await updateMaintainer(id, req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});


// Delete maintainer (era già qua, ma in fondo)
router.delete("/:id", authenticateToken, requireUserType([OfficerRole.MUNICIPAL_ADMINISTRATOR]), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "id is required" });
    await deleteMaintainer(id);
    res.status(200).json({ message: `Maintainer with id '${id}' deleted successfully` });
  } catch (err) {
    next(err);
  }
});



// ===================== MAINTAINER OPERATIONS =====================

// Get maintainers by category
router.get("/by-category/:officeType", authenticateToken, requireUserType([OfficerRole.MUNICIPAL_ADMINISTRATOR, OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER, OfficerRole.TECHNICAL_OFFICE_STAFF]), async (req, res, next) => {
  try {
    const officeType = req.params.officeType as OfficeType;
    if (!officeType) {
      return res.status(400).json({ error: "officeType query parameter is required" });
    }
    const result = await getMaintainersByCategory(officeType);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Get assigned reports for maintainer
router.get("/assigned", authenticateToken, requireUserType([OfficerRole.MAINTAINER]), async (req, res, next) => {
  try {
    const maintainerId = (req as any).user?.id;
    if (!maintainerId) return res.status(401).json({ error: "Unauthorized" });
    
    const result = await getAssignedReportsForMaintainer(maintainerId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Update report status
router.patch("/reports/:id/status", authenticateToken, requireUserType([OfficerRole.MAINTAINER]), async (req, res, next) => {
  try {
    const reportId = Number(req.params.id);
    const maintainerId = (req as any).user?.id;
    const { state, reason } = req.body;

    if (!maintainerId) return res.status(401).json({ error: "Unauthorized" });
    if (!state) return res.status(400).json({ error: "state is required" });

    const updated = await updateReportStatusByMaintainer(maintainerId, reportId, state, reason);
    
    res.status(200).json({
      id: updated.id,
      state: updated.state
    });
  } catch (err) {
    next(err);
  }
});


export { router as maintainerRouter };
