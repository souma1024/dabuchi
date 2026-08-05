import { Router } from 'express';

import { CreateTransfer } from '../../application/createTransfer.js';
import type { TransferRepository } from '../../domain/transferRepository.js';

export function createTransferRouter(repository: TransferRepository) {
  const router = Router();
  const createTransfer = new CreateTransfer(repository);

  router.post('/', async (request, response, next) => {
    try {
      const transfer = await createTransfer.execute(request.body);
      response.status(201).json(transfer);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
