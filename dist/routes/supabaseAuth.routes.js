"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabaseAuth_controller_1 = __importDefault(require("../controllers/supabaseAuth.controller"));
const supabaseAuth_1 = require("../middleware/supabaseAuth");
const router = express_1.default.Router();
// Supabase kullanıcısını senkronize et - token doğrulama ile
router.post('/auth/supabase/sync', supabaseAuth_1.verifySupabaseToken, supabaseAuth_controller_1.default.syncSupabaseUser);
exports.default = router;
