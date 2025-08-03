// Updated src/routes/collections.routes.ts
import { Router } from 'express';
import * as collectionCtrl from '../controllers/collection.controller';
import { validateBody } from '../middleware/validation.middleware';
import { createCollectionSchema, updateCollectionSchema } from '../validation/collection.validation';

const collectionsRouter = Router();
collectionsRouter.get('/',    collectionCtrl.listCollections);
collectionsRouter.get('/:id', collectionCtrl.getCollection);
collectionsRouter.post('/',   validateBody(createCollectionSchema), collectionCtrl.createCollection);
collectionsRouter.put('/:id', validateBody(updateCollectionSchema), collectionCtrl.updateCollection);
collectionsRouter.delete('/:id', collectionCtrl.deleteCollection);
export default collectionsRouter;