// Vercel serverless entry point: exposes the Express api-server app
// (artifacts/api-server) under /api/* without running app.listen(),
// which only works for a long-lived process and not a serverless function.
import app from "../artifacts/api-server/src/app.js"

export default app
