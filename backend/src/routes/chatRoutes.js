import express from "express";
import { authenticate } from "../middleware/auth.js";
import { sendMessage, getChats, getMessages } from "../controllers/chatController.js";
import { deleteChat } from "../controllers/chatController.js";

const router = express.Router();

router.post("/chat", authenticate, sendMessage);
router.get("/chats", authenticate, getChats);
router.get("/chat/:chatId", authenticate, getMessages);
router.delete("/chat/:chatId", authenticate, deleteChat);
export default router;
