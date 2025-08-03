// src/routes/integrations.routes.ts
import { Router } from 'express';
import shopifyRouter from './integrations/shopify.routes';
import wooRouter     from './integrations/woocommerce.routes';
import wixRouter     from './integrations/wix.routes';

const integrationsRouter = Router();

integrationsRouter.use('/shopify',     shopifyRouter);
integrationsRouter.use('/woocommerce',  wooRouter);
integrationsRouter.use('/wix',          wixRouter);

export default integrationsRouter;
