export const API_BASE = process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

export const isProd = process.env.NODE_ENV === "production";
