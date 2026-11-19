import { Router } from 'express'
import { clientController } from '@employee/infrastructure/http/dependencies.js'
import { authenticate, authorize } from '@shared/infrastructure/http/middlewares.js'

const router = Router()

router.get('/', authenticate, authorize(['admin', 'manager', 'camarero']), clientController.listClients)

export default router
