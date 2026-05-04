const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const config = require("./config");
const { reportError } = require("./lib/logger");
const {
  getActorSnapshot,
  requestContext
} = require("./middleware/requestContext");
const { requireTrustedMutation } = require("./middleware/mutationProtection");
const adminRoutes = require("./routes/admin.routes");
const authRoutes = require("./routes/auth.routes");
const publicRoutes = require("./routes/public.routes");
const { buildHealthSnapshot } = require("./services/operationsService");
const uploadRoutes = require("./routes/upload.routes");

const app = express();

app.disable("x-powered-by");
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true
  })
);
app.use(requestContext);
app.use(cookieParser());
app.use(express.json());
app.use(requireTrustedMutation);

app.use("/api/uploads", uploadRoutes);
app.use("/api", authRoutes);
app.use("/api", publicRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.redirect("/api/posts");
});

app.get("/api/health", (req, res) => {
  res.json(buildHealthSnapshot());
});

app.use((error, req, res, _next) => {
  const statusCode =
    Number.isInteger(error.statusCode) && error.statusCode >= 400 && error.statusCode < 600
      ? error.statusCode
      : 500;
  reportError(error, {
    event: "http.unhandled_error",
    actor: getActorSnapshot(req),
    method: req.method,
    path: req.originalUrl || req.url,
    requestId: req.requestId || ""
  }).catch(() => {});
  res.status(statusCode).json({
    message: statusCode >= 500 ? error.message || "Internal server error." : error.message,
    requestId: req.requestId || ""
  });
});

module.exports = app;
