import { Router } from "express";
import usersRouter from "./users";
import classTypesRouter from "./classTypes";
import eventsRouter from "./events";
import makeupCreditsRouter from "./makeupCredits";
import reservationsRouter from "./reservations";

const adminRouter = Router();

adminRouter.use(usersRouter);
adminRouter.use(classTypesRouter);
adminRouter.use("/events", eventsRouter);
adminRouter.use(makeupCreditsRouter);
adminRouter.use(reservationsRouter);

export default adminRouter;
