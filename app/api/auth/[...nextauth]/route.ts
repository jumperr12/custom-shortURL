// auth.js v5 ships GET+POST handlers; next mounts them at /api/auth/*
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
