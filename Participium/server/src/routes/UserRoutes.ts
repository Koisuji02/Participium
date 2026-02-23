import {Router} from "express";
import {createUser,logoutUser, getMyProfile, updateMyProfile, activateAccount, isActive} from "@controllers/userController"
import { authenticateToken, requireUserType } from "@middlewares/authMiddleware"
import { UserFromJSON } from "@dto/User";
import { uploadAvatar } from "@middlewares/uploadMiddleware";
import { sendMail } from "@services/mailService";
import { generateOtp, verifyOtp } from "@services/otpService";
import { FollowRepository } from "@repositories/FollowRepository";
import { getReport, getMyReports } from "@controllers/reportController";

const router = Router({mergeParams : true});


router.get("/logout",authenticateToken, async(req, res, next) =>{
    try{
        console.log("Logging out user");
        await logoutUser();
        res.status(200).json()
    }
    catch(error)
    {
        next(error);
    }
});
router.post("/", async(req, res, next) =>{
    try{
        const userData = UserFromJSON(req.body);
        const result = await createUser(userData);
        res.status(200).json(result);
    }
    catch(error)
    {
        next(error);
    }
});

//? GET /users/me (retrieve personal account info story 9)
router.get("/me", authenticateToken, async (req, res, next) => {
  try {
    const userId = (req as any).user?.id;
    // se la query include contiene "followedReports", allora includi i report seguiti; altrimenti stringa vuota in include (vuol dire false)
    const include = (req.query.include as string) || "";
    const includeFollowedReports = include.split(",").map(s => s.trim()).includes("followedReports");
    // se non è specificato, includeFollowedReports sarà false (retrocompatibilità)
    const profile = await getMyProfile(userId, { includeFollowedReports });
    res.status(200).json(profile);
  } catch (err) {
    next(err);
  }
});

//? PATCH /users/me (update personal account info story 9)
router.patch("/me", authenticateToken, uploadAvatar, async (req, res, next) => {
  try {
    const userId = (req as any).user?.id;
    // body may come in req.body (fields) and req.file (avatar)
    const telegramUsername = req.body.telegramUsername ?? undefined;
    const emailNotificationsRaw = req.body.emailNotifications;
    const emailNotifications = emailNotificationsRaw === undefined ? undefined : (emailNotificationsRaw === "true" || emailNotificationsRaw === true);
    const avatarPath = req.file ? `/uploads/avatars/${(req.file as any).filename}` : undefined;
    
    const updated = await updateMyProfile(userId, {
      telegramUsername,
      emailNotifications,
      avatarPath,
    });
    
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});

router.get("/me/info", authenticateToken, async (req, res, next) => {
  try {
    const user = (req as any).user;
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
});

router.post("/generateotp", async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Provide email" });
    }
    const active = await isActive(email);
    if (active) {
      return res.status(400).json({ error: "Account is already active" });
    }
    const code = await generateOtp(email);
    await sendMail({
      to: email,
      subject: "Your Participium OTP code",
      text: `OTP code: ${code} (valid for 30 minutes)`,
      html: `<p>OTP code: <b>${code}</b></p><p>Valid for 30 minutes.</p>`,
    });

    return res.status(200).json({ sent: true });
  } catch (err) {
    next(err);
  }
});

router.post("/verifyotp", async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "Provide email and code" });
    }

    const ok = await verifyOtp(email, code);
    if (!ok) return res.status(401).json({ valid: false, error: "Invalid or expired OTP" });
    await activateAccount(email);
    return res.status(200).json({ valid: true });
  } catch (err) {
    next(err);
  }
});


export {router as userRouter};

//? PT-16: GET sui report seguiti dallo user autenticato
router.get("/me/followed-reports", authenticateToken, requireUserType(["user"]), async (req, res, next) => {
  try {
    const userId = (req as any).user?.id;
    const repo = new FollowRepository();
    const reports = await repo.getFollowedReportsByUser(Number(userId));
    const mapped = await Promise.all(reports.map(async (r) => await getReport(r.id)));
    res.status(200).json(mapped);
  } catch (err) {
    next(err);
  }
});

//? PT-18: GET /users/my-reports - Get citizen's own submitted reports
router.get("/my-reports", authenticateToken, requireUserType(["user"]), async (req, res, next) => {
  try {
    const userId = (req as any).user?.id;
    const reports = await getMyReports(userId);
    res.status(200).json(reports);
  } catch (err) {
    next(err);
  }
});