// src/services/platform/features/votingPlatformTemplates.service.ts
import { votingPlatformValidationService } from '../validation/votingPlatformValidation.service';

export interface Template {
  id: string;
  name: string;
  description: string;
  preview: string;
  category: string;
  layout: 'single-page' | 'multi-step' | 'wizard';
  features: string[];
  planRequired: 'foundation' | 'growth' | 'premium' | 'enterprise';

  // Default styling
  defaultColors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };

  // Sample questions for demo
  sampleQuestions: Array<{
    questionText: string;
    questionType: string;
    order: number;
  }>;
}

/**
 * Service for managing voting platform templates
 */
export class VotingPlatformTemplatesService {
  private readonly validation = votingPlatformValidationService;

  /**
   * Get all available templates
   */
  getTemplates(planLevel?: string): Template[] {
    const allTemplates = this.getAllTemplates();

    if (!planLevel) {
      return allTemplates;
    }

    // Filter by plan level
    const planOrder = ['foundation', 'growth', 'premium', 'enterprise'];
    const userPlanIndex = planOrder.indexOf(planLevel);

    return allTemplates.filter(template => {
      const templatePlanIndex = planOrder.indexOf(template.planRequired);
      return templatePlanIndex <= userPlanIndex;
    });
  }

  /**
   * Get template by ID
   */
  getTemplateById(templateId: string): Template | null {
    const validatedId = this.validation.validateTemplateId(templateId);
    const templates = this.getAllTemplates();
    return templates.find(t => t.id === validatedId) || null;
  }

  /**
   * Get template categories
   */
  getCategories(): string[] {
    return [
      'Professional',
      'Creative',
      'Minimalist',
      'Modern',
      'Corporate'
    ];
  }

  /**
   * Get template preview HTML
   */
  getTemplatePreviewHTML(templateId: string): string {
    const template = this.getTemplateById(templateId);
    if (!template) {
      return '<p>Template not found</p>';
    }

    // Generate preview HTML based on template
    return this.generateTemplateHTML(template);
  }

  /**
   * Apply template to platform
   */
  applyTemplateSettings(template: Template): any {
    return {
      templateId: template.id,
      branding: {
        primaryColor: template.defaultColors.primary,
        secondaryColor: template.defaultColors.secondary,
        backgroundColor: template.defaultColors.background,
        textColor: template.defaultColors.text
      },
      customTemplateConfig: {
        layout: template.layout,
        progressBarStyle: 'linear',
        buttonStyle: 'rounded',
        animationsEnabled: true
      }
    };
  }

  // ============================================
  // TEMPLATE DEFINITIONS
  // ============================================

  private getAllTemplates(): Template[] {
    return [
      {
        id: 'modern',
        name: 'Modern',
        description: 'Clean, contemporary design with smooth animations',
        preview: '/templates/modern-preview.png',
        category: 'Modern',
        layout: 'multi-step',
        features: [
          'Progress bar',
          'Smooth transitions',
          'Mobile responsive',
          'Card-based layout'
        ],
        planRequired: 'foundation',
        defaultColors: {
          primary: '#3B82F6',
          secondary: '#10B981',
          background: '#FFFFFF',
          text: '#1F2937'
        },
        sampleQuestions: [
          {
            questionText: 'What is your overall satisfaction?',
            questionType: 'rating',
            order: 0
          },
          {
            questionText: 'What can we improve?',
            questionType: 'textarea',
            order: 1
          },
          {
            questionText: 'Would you recommend us?',
            questionType: 'yes_no',
            order: 2
          }
        ]
      },
      {
        id: 'minimal',
        name: 'Minimal',
        description: 'Simple, distraction-free interface focused on content',
        preview: '/templates/minimal-preview.png',
        category: 'Minimalist',
        layout: 'single-page',
        features: [
          'Clean typography',
          'Ample whitespace',
          'Focus on content',
          'Fast loading'
        ],
        planRequired: 'foundation',
        defaultColors: {
          primary: '#000000',
          secondary: '#6B7280',
          background: '#FFFFFF',
          text: '#111827'
        },
        sampleQuestions: [
          {
            questionText: 'How would you rate your experience?',
            questionType: 'scale',
            order: 0
          },
          {
            questionText: 'Any additional feedback?',
            questionType: 'textarea',
            order: 1
          }
        ]
      },
      {
        id: 'classic',
        name: 'Classic',
        description: 'Traditional form layout with professional styling',
        preview: '/templates/classic-preview.png',
        category: 'Professional',
        layout: 'single-page',
        features: [
          'Traditional layout',
          'Clear labels',
          'Professional appearance',
          'Easy navigation'
        ],
        planRequired: 'foundation',
        defaultColors: {
          primary: '#1E40AF',
          secondary: '#059669',
          background: '#F9FAFB',
          text: '#374151'
        },
        sampleQuestions: [
          {
            questionText: 'Please select an option',
            questionType: 'multiple_choice',
            order: 0
          },
          {
            questionText: 'Provide your feedback',
            questionType: 'textarea',
            order: 1
          }
        ]
      },
      {
        id: 'vibrant',
        name: 'Vibrant',
        description: 'Colorful, energetic design with bold elements',
        preview: '/templates/vibrant-preview.png',
        category: 'Creative',
        layout: 'wizard',
        features: [
          'Bold colors',
          'Animated elements',
          'Engaging visuals',
          'Interactive feedback'
        ],
        planRequired: 'growth',
        defaultColors: {
          primary: '#EC4899',
          secondary: '#F59E0B',
          background: '#FFFFFF',
          text: '#1F2937'
        },
        sampleQuestions: [
          {
            questionText: 'Rate your experience',
            questionType: 'rating',
            order: 0
          },
          {
            questionText: 'Choose your favorite',
            questionType: 'image_selection',
            order: 1
          },
          {
            questionText: 'Share your thoughts',
            questionType: 'textarea',
            order: 2
          }
        ]
      },
      {
        id: 'professional',
        name: 'Professional',
        description: 'Enterprise-grade design with advanced features',
        preview: '/templates/professional-preview.png',
        category: 'Corporate',
        layout: 'multi-step',
        features: [
          'Corporate styling',
          'Advanced validation',
          'Conditional logic',
          'Progress tracking',
          'Save & resume'
        ],
        planRequired: 'premium',
        defaultColors: {
          primary: '#0F172A',
          secondary: '#0EA5E9',
          background: '#FFFFFF',
          text: '#1E293B'
        },
        sampleQuestions: [
          {
            questionText: 'Company information',
            questionType: 'text',
            order: 0
          },
          {
            questionText: 'Industry sector',
            questionType: 'multiple_choice',
            order: 1
          },
          {
            questionText: 'Feedback and suggestions',
            questionType: 'textarea',
            order: 2
          },
          {
            questionText: 'Satisfaction rating',
            questionType: 'scale',
            order: 3
          }
        ]
      }
    ];
  }

  /**
   * Generate template HTML for preview
   */
  private generateTemplateHTML(template: Template): string {
    const { defaultColors } = template;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
              background: ${defaultColors.background};
              color: ${defaultColors.text};
              padding: 40px 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            h1 {
              color: ${defaultColors.primary};
              font-size: 28px;
              margin-bottom: 16px;
            }
            .question {
              margin-bottom: 32px;
            }
            .question-label {
              font-weight: 600;
              margin-bottom: 12px;
              display: block;
            }
            button {
              background: ${defaultColors.primary};
              color: white;
              padding: 12px 24px;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              cursor: pointer;
              transition: all 0.2s;
            }
            button:hover {
              opacity: 0.9;
              transform: translateY(-1px);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${template.name} Template</h1>
            <p style="color: #6B7280; margin-bottom: 32px;">${template.description}</p>
            ${template.sampleQuestions.map((q, i) => `
              <div class="question">
                <label class="question-label">${i + 1}. ${q.questionText}</label>
                <div style="color: #9CA3AF; font-size: 14px;">[${q.questionType} question]</div>
              </div>
            `).join('')}
            <button>Submit Response</button>
          </div>
        </body>
      </html>
    `;
  }
}

export const votingPlatformTemplatesService = new VotingPlatformTemplatesService();
