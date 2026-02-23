import express from "express";
import path from "node:path";
import cors from "cors";
import { CONFIG } from "@config";
import { authRouter } from "@routes/AuthRoutes";
import { userRouter } from "@routes/UserRoutes";
import { reportRouter } from "@routes/ReportRoutes";
import {AdminRouter} from "@routes/AdminRoutes";
import {PublicRelationRoutes} from "@routes/PublicRelationRoutes";
import {officerRouter} from "@routes/OfficerRoutes";
import { infoTypeRouter } from "@routes/InfoType";
import { notificationRouter } from "@routes/NotificationRoutes";
import { maintainerRouter } from "@routes/MaintainerRoutes";
import { telegramRouter } from "@routes/TelegramRoutes";
import { internalMessageRouter } from "@routes/InternalMessageRoutes";
import { publicMessageRouter } from "@routes/PublicMessageRoutes";
import { faqRouter } from "@routes/FaqRoutes";
import { errorHandler } from "@middlewares/errorMiddleware";

export const app = express();
let routes = CONFIG.ROUTES;

app.use(cors({
        origin: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:1574",
            "http://127.0.0.1:1574",
            "http://localhost:5174",
            "http://127.0.0.1:5174"
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(routes.V1_AUTH, authRouter);
app.use(routes.V1_USERS, userRouter);
app.use(routes.V1_REPORTS, reportRouter);
app.use(routes.V1_REPORTS, internalMessageRouter);
app.use(routes.V1_REPORTS, publicMessageRouter);
app.use(routes.V1_OFFICERS, officerRouter);
app.use(routes.V1_MAINTAINERS, maintainerRouter);
app.use(routes.V1_INFO_TYPES, infoTypeRouter);
app.use(routes.V1_NOTIFICATIONS, notificationRouter);
app.use(routes.V1_ADMIN, AdminRouter);
app.use(routes.V1_PUBLICS, PublicRelationRoutes);
app.use(routes.V1_INTERNAL_MESSAGES, internalMessageRouter);
app.use(routes.V1_TELEGRAM, telegramRouter);
app.use(routes.V1_FAQ, faqRouter);
// static files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Error handler middleware
app.use(errorHandler);

export default app;