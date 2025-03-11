import { Router } from "express";
import { LinkedInController } from "../controllers/linkedInController";

const router = Router();
const linkedInController = new LinkedInController();

router.get("/auth/linkedin", (req, res) =>
  linkedInController.getAuthUrl(req, res)
);

router.get("/auth/linkedin/callback", (req, res) =>
  linkedInController.handleCallback(req, res)
);

export default router;
