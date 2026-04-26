import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  sendSubAppMessage,
  getSubAppChats,
  getSubAppMessages,
  deleteSubAppChat
} from '../controllers/subAppController.js';

const router = express.Router();

router.post('/message', authenticate, sendSubAppMessage);
router.get('/chats', authenticate, getSubAppChats);
router.get('/messages/:subChatId', authenticate, getSubAppMessages);
router.delete('/chat/:subChatId', authenticate, deleteSubAppChat);

export default router;