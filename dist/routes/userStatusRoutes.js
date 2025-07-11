"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userStatusController_1 = require("../controllers/userStatusController");
const router = express_1.default.Router();
// Get online users list
router.get('/online', userStatusController_1.getOnlineUsers);
// Get online users count
router.get('/online/count', userStatusController_1.getOnlineUsersCount);
// Get specific user status
router.get('/:userId', userStatusController_1.getUserStatus);
// Get multiple users status
router.post('/batch', userStatusController_1.getUsersStatus);
// Update current user's last seen (requires authentication)
router.put('/last-seen', userStatusController_1.updateLastSeen);
exports.default = router;
