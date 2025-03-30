"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const linkedInController_1 = require("../controllers/linkedInController");
const router = (0, express_1.Router)();
const linkedInController = new linkedInController_1.LinkedInController();
router.get("/auth/linkedin", (req, res) => linkedInController.getAuthUrl(req, res));
router.get("/auth/linkedin/callback", (req, res) => linkedInController.handleCallback(req, res));
exports.default = router;
