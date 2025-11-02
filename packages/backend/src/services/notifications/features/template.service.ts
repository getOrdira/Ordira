import { templateRegistry } from '../templates/templateRegistry';
import { TemplateContext } from '../types/templateContext';
import { TemplateOutput } from '../templates/templateTypes';

interface TemplateDefinition {
  render: (context: TemplateContext) => TemplateOutput;
}

export class TemplateService {
  resolve(type: string): TemplateDefinition | undefined {
    return templateRegistry.get(type);
  }

  render(type: string, context: TemplateContext) {
    const template = this.resolve(type);
    return template?.render(context) ?? null;
  }
}

export const templateService = new TemplateService();
