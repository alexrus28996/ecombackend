import { Router } from 'express';
import { locationsRouter } from './locations.routes.js';
import { stockRouter } from './stock.routes.js';
import { transferRouter } from './transfer.routes.js';
import { pickingRouter } from './picking.routes.js';

export const inventoryRouter = Router();

inventoryRouter.use('/locations', locationsRouter);
inventoryRouter.use('/stock/transfer-orders', transferRouter);
inventoryRouter.use('/stock/transfer-orders', transferRouter);
inventoryRouter.use('/stock', stockRouter);
inventoryRouter.use('/picking', pickingRouter);
