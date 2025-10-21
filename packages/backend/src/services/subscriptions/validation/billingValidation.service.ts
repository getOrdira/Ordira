import { PLAN_DEFINITIONS, PlanKey } from '../../../constants/plans';
import { billingPlanUtils } from '../utils/billingPlan.utils';

interface DowngradeValidationDependencies {
  fromPlan: PlanKey;
  toPlan: PlanKey;
  businessId: string;
  getCurrentUsage: () => Promise<any>;
  getCurrentUsageForType: (type: 'certificates' | 'votes' | 'apiCalls' | 'storage') => Promise<number>;
}

export class BillingValidationService {
  constructor(private readonly planUtils = billingPlanUtils) {}

  async validateDowngrade({
    fromPlan,
    toPlan,
    businessId,
    getCurrentUsage,
    getCurrentUsageForType
  }: DowngradeValidationDependencies) {
    const currentUsage = await getCurrentUsage();
    const fromPlanLimits = PLAN_DEFINITIONS[fromPlan];
    const toPlanLimits = PLAN_DEFINITIONS[toPlan];

    const issues: string[] = [];
    const recommendations: string[] = [];
    const impact = {
      features: [] as string[],
      limits: {} as Record<string, { current: number; new: number; change: string }>
    };

    if (fromPlanLimits.features.hasWeb3 && !toPlanLimits.features.hasWeb3) {
      impact.features.push('Web3 features will be disabled');
      recommendations.push('Consider keeping Premium plan to retain Web3 capabilities');
    }

    if (fromPlanLimits.features.allowOverage && !toPlanLimits.features.allowOverage) {
      impact.features.push('Overage billing will be disabled');
      recommendations.push('Monitor usage closely as overages will not be allowed');
    }

    const limitTypes: Array<'certificates' | 'votes' | 'apiCalls' | 'storage'> = [
      'certificates',
      'votes',
      'apiCalls',
      'storage'
    ];

    for (const limitType of limitTypes) {
      const currentLimit = fromPlanLimits[limitType];
      const newLimit = toPlanLimits[limitType];
      const resourceUsage = await getCurrentUsageForType(limitType);

      impact.limits[limitType] = {
        current: currentLimit,
        new: newLimit,
        change: newLimit < currentLimit ? 'decreased' : 'increased'
      };

      if (resourceUsage > newLimit) {
        issues.push(`Current ${limitType} usage exceeds ${this.planUtils.formatPlanName(toPlan)} limit`);
        recommendations.push(`Reduce ${limitType} usage below ${newLimit} before downgrading`);
      }
    }

    const allowed = issues.length === 0;

    return {
      allowed,
      issues: allowed ? undefined : issues,
      recommendations: recommendations.length ? recommendations : undefined,
      impact,
      usageSnapshot: {
        businessId,
        currentPlan: fromPlan,
        requestedPlan: toPlan,
        currentUsage
      }
    };
  }
}

export const billingValidationService = new BillingValidationService();
