import { Router } from 'express';

import {
  CreateTransfer,
  InvalidTransferError,
} from '../../application/createTransfer.js';
import type { TransferRepository } from '../../domain/transferRepository.js';

export function createTransferRouter(repository: TransferRepository) {
  const router = Router();
  const createTransfer = new CreateTransfer(repository);

  router.post('/', async (request, response, next) => {
    try {
      const transfer = await createTransfer.execute(request.body);
      response.status(201).json(transfer);
    } catch (error) {
      if (error instanceof InvalidTransferError) {
        response.status(400).json({ error: error.message });
        return;
      }

      next(error);
    }
  });

  return router;
}
