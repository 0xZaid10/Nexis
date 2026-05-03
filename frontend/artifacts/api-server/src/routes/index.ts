import { Router, type IRouter } from "express";
import healthRouter from "./health";
import nexisRouter from "./nexis";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/nexis", nexisRouter);

export default router;
