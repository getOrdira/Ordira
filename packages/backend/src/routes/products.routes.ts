// Updated src/routes/products.routes.ts
import { Router } from 'express';
import * as productCtrl from '../controllers/product.controller';
import { validateBody } from '../middleware/validation.middleware';
import { createProductSchema, updateProductSchema } from '../validation/product.validation';

const productsRouter = Router();
productsRouter.get('/',    productCtrl.listProducts);
productsRouter.get('/:id', productCtrl.getProduct);
productsRouter.post('/',   validateBody(createProductSchema), productCtrl.createProduct);
productsRouter.put('/:id', validateBody(updateProductSchema), productCtrl.updateProduct);
productsRouter.delete('/:id', productCtrl.deleteProduct);
export default productsRouter;