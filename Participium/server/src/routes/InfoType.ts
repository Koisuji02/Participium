import {Router} from "express";
import {OfficeType} from "@models/enums/OfficeType"
import {OfficerRole} from "@models/enums/OfficerRole"
import {ReportState} from "@models/enums/ReportState"
const router = Router({mergeParams : true});


router.get("/", async(req, res, next) =>{
    try{
        res.status(200).json({
            officeTypes: Object.values(OfficeType),
            officerRoles: Object.values(OfficerRole),
            reportStates: Object.values(ReportState)
        });
    }
    catch(error)
    {
        next(error);
    }
});


export {router as infoTypeRouter};