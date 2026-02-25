import { Router } from 'express';
import {
  getAuditLogs,
  getEntityHistory,
  getUserActivity,
  getAuditSummary
} from '../controllers/audit.controller';
import { authenticate, requireSuperAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Super admin sees all, company admins see their company only
router.get('/', getAuditLogs);
router.get('/summary', getAuditSummary);
router.get('/entity/:entityType/:entityId', getEntityHistory);
router.get('/user/:userId', getUserActivity);

export default router;