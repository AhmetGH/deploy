var express = require("express");
var router = express.Router();
const authMiddleware = require("../middlewares");
var authController = require("../controllers/authController");

router.get("/", authMiddleware, authController.verifyToken);

router.post("/admin/register", authController.adminRegister);

router.post("/user/register/:teamName", authController.userRegister);

router.get("/verify", authController.verify);

router.post("/forgot-password", authController.forgotPassword);

router.get("/verify-forget", authController.verifyForget);

router.post("/reset-password", authController.resetPassword);

router.get("/role", authMiddleware, authController.getAuthRole);

router.post("/refresh", authController.authRefreshToken);

router.post("/login", authController.authLogin);

module.exports = router;
