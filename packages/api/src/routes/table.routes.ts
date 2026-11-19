import { Router } from 'express'
import { TableController } from '@controllers/table.controller.js'
import { dbConfig } from '@config/database.js'
import { SqliteTableRepository } from '@repositories/table.repository.js'
import { SqliteEmployeeRepository } from '@employee/infrastructure/SqliteEmployeeRepository.js'
import { TableService } from '@services/table.service.js'
import { authenticate, authorize } from '@shared/infrastructure/http/middlewares.js'

const tableRepository = new SqliteTableRepository(dbConfig)
const employeeRepository = new SqliteEmployeeRepository(dbConfig)
const tableService = new TableService(tableRepository, employeeRepository)
const tableController = new TableController(tableService)

const router = Router({ mergeParams: true })

router.post('/', authenticate, authorize(['admin']), tableController.create)
router.get('/', authenticate, authorize(['admin', 'manager', 'camarero']), tableController.getAll)
router.get('/:id', authenticate, authorize(['admin', 'manager', 'camarero']), tableController.getById)
router.put('/:id', authenticate, authorize(['admin']), tableController.update)
router.delete('/:id', authenticate, authorize(['admin']), tableController.delete)

export default router
