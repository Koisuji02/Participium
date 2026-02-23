import { Router } from "express";
import {
  addRoleToOfficer,
  removeRoleFromOfficer,
} from "@controllers/officerController";
import { authenticateToken, requireUserType } from "@middlewares/authMiddleware";
import { OfficerToJSON } from "@dto/Officer";
import { OfficerRole } from "@models/enums/OfficerRole";
import { OfficeType } from "@models/enums/OfficeType";

const router = Router({ mergeParams: true });

router.patch("/role/add", authenticateToken, requireUserType([OfficerRole.MUNICIPAL_ADMINISTRATOR]), async (req, res, next) => {
  try {
    const { officerId, role, officeType } = req.body;
    if (!officerId || !role || !officeType) {
      return res.status(400).json({ error: "officerId, role and officeType are required" });
    }
    const result = await addRoleToOfficer(officerId, role as OfficerRole, officeType as OfficeType);
    res.status(200).json(OfficerToJSON(result));
  } catch (error) {
    next(error);
  }
}
);

router.patch("/role/remove", authenticateToken, requireUserType([OfficerRole.MUNICIPAL_ADMINISTRATOR]), async (req, res, next) => {
  try {
    const { officerId, role, officeType } = req.body;
    if (!officerId || !role || !officeType) {
      return res.status(400).json({ error: "officerId, role and officeType are required" });
    }
    const result = await removeRoleFromOfficer(officerId, role as OfficerRole, officeType as OfficeType);
    res.status(200).json(OfficerToJSON(result));
  } catch (error) {
    next(error);
  }
}
);


export { router as AdminRouter };
