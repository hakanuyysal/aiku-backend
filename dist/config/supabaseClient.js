"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Supabase bağlantı bilgileri
const supabaseUrl = process.env.SUPABASE_URL || 'https://bevakpqfycmxnpzrkecv.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJldmFrcHFmeWNteG5wenJrZWN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzMDI5NzQsImV4cCI6MjA1Nzg3ODk3NH0.TQ6yWAkQXJuzDyZiaNX-J_kbtAqrF6aIn2mABe0n3NY';
// Supabase istemcisini oluştur
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
exports.default = supabase;
