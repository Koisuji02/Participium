import {Router} from "express";
import {loginOfficer, loginUser,loginMaintainer, getUserByTelegramUsername} from "@controllers/authController"
import { authenticateToken } from "@middlewares/authMiddleware";
import { deleteSession } from "@services/authService";
const router = Router({mergeParams : true});

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

//login user
router.post("/users", async(req, res, next) =>{
    try{
        let identifier = req.body["username"];
        let password = req.body["password"];
        
        if (!identifier || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        }
        
        const isEmail = emailRegex.test(identifier);
        const result = await loginUser(identifier, password, isEmail);
            
        res.status(200).json(result);
    }
    catch(error)
    {
        next(error);
    }
});

//login staff, both officers and admins
router.post("/officers", async(req, res, next) =>{
    try{
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }
        
        const isEmail = emailRegex.test(email);
        const result = await loginOfficer(email, password, isEmail);
            
        res.status(200).json(result);
    }
    catch(error)
    {
        next(error);
    }
});

router.post("/telegram", async(req, res, next) =>{
    try{
        let identifier = req.body["username"];
        const chatId = req.body["chatId"];

        if (!chatId) {
            return res.status(400).json({ error: "Telegram chat ID is required" });
        }
        if(identifier === undefined || identifier === null || identifier === "null" || identifier === ""){
            return res.status(400).json({ error: "Telegram username is required" });
        }
        const user = await getUserByTelegramUsername(identifier, chatId);
        res.status(200).json(user);
    }
    catch(error)
    {
        next(error);
    }
});

router.post("/maintainers", async(req, res, next) =>{
    try{
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }
        
        const isEmail = emailRegex.test(email);
        const result = await loginMaintainer(email, password, isEmail);
            
        res.status(200).json(result);
    }
    catch(error)
    {
        next(error);
    }
});

// Logout endpoint - removes session from Redis
router.post("/logout", authenticateToken, async(req, res, next) => {
    try {
        const user = (req as any).user;
        const sessionType = user.sessionType || "web";
        await deleteSession(user.id, sessionType);
        res.status(200).json({ message: "Logged out successfully" });
    } catch(error) {
        next(error);
    }
});

export {router as authRouter};