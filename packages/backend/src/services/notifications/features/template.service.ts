import { templateRegistry } from '../templates/templateRegistry';
import { TemplateContext } from '../types/templateContext';

export class TemplateService {
  resolve(type: string) {
    return templateRegistry.get(type);
  }

  render(type: string, context: TemplateContext) {
    const template = this.resolve(type);
    return template?.render(context) ?? null;
  }
}

export const templateService = new TemplateService();
