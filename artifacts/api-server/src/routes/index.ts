import { Router, type IRouter } from "express";
import healthRouter from "./health";
import roomsRouter from "./rooms";
import bookingsRouter from "./bookings";
import authRouter from "./auth";
import adminRouter from "./admin";
import adminRoomsRouter from "./admin-rooms";
import adminStaffRouter from "./admin-staff";

const router: IRouter = Router();

router.use(healthRouter);
router.use(roomsRouter);
router.use(bookingsRouter);
router.use(authRouter);
router.use(adminRouter);
router.use(adminRoomsRouter);
router.use(adminStaffRouter);

export default router;
