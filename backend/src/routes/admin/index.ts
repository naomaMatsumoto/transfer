import { Router } from "express";
import usersRouter from "./users";
import classTypesRouter from "./classTypes";
import eventsRouter from "./events";
import staffRouter from "./staff";
import makeupCreditsRouter from "./makeupCredits";
import reservationsRouter from "./reservations";
import settingsRouter from "./settings";

const adminRouter = Router();

adminRouter.use(usersRouter);
adminRouter.use(classTypesRouter);
adminRouter.use("/events", eventsRouter);
adminRouter.use(staffRouter);
adminRouter.use(makeupCreditsRouter);
adminRouter.use(reservationsRouter);
adminRouter.use("/settings", settingsRouter);

export default adminRouter;
