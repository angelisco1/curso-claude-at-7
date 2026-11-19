import type { Request, Response, NextFunction } from 'express'
import type { ListClientsUseCase } from '@employee/application/ListClientsUseCase.js'

export class ClientController {
    constructor(private readonly listClientsUseCase: ListClientsUseCase) {}

    listClients = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const clients = await this.listClientsUseCase.execute()
            // Solo datos de presentación: nunca se expone passwordHash
            res.status(200).json(clients.map(c => ({
                id: c.id,
                firstName: c.firstName,
                lastName: c.lastName,
                email: c.email
            })))
        } catch (error) {
            next(error)
        }
    }
}
