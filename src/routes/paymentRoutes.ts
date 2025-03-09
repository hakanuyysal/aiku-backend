import express from "express";
import { processPayment } from "../controllers/paymentController";
const router = express.Router();

router.post("/pay", processPayment);

export default router;
