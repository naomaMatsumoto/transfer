import { Router } from "express";
import usersRouter from "./users";
import classTypesRouter from "./classTypes";
import eventsRouter from "./events";
import staffRouter from "./staff";
import makeupCreditsRouter from "./makeupCredits";
import reservationsRouter from "./reservations";
import settingsRouter from "./settings";
import { asyncHandler } from "../../middleware/asyncHandler";
import reportSummary from "../../controllers/admin/reports/summary";
import reportCsvExport from "../../controllers/admin/reports/csvExport";
import listAuditLogs from "../../controllers/admin/auditLogs/list";
import getStoreSettings from "../../controllers/admin/storeSettings/get";
import updateStoreSettings from "../../controllers/admin/storeSettings/update";

const adminRouter = Router();

adminRouter.use(usersRouter);
adminRouter.use(classTypesRouter);
adminRouter.use("/events", eventsRouter);
adminRouter.use(staffRouter);
adminRouter.use(makeupCreditsRouter);
adminRouter.use(reservationsRouter);
adminRouter.use("/settings", settingsRouter);

adminRouter.get("/reports/summary", asyncHandler(reportSummary));
adminRouter.get("/reports/csv", asyncHandler(reportCsvExport));
adminRouter.get("/audit-logs", asyncHandler(listAuditLogs));
adminRouter.get("/store-settings", asyncHandler(getStoreSettings));
adminRouter.patch("/store-settings", asyncHandler(updateStoreSettings));

export default adminRouter;
