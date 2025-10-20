import type { UsageLimits, UsageTrends, UsageProjections } from './types';

class UsageForecastService {
  generateTrends(current: UsageLimits, days: number): UsageTrends {
    const normalizedDays = Math.max(7, Math.min(days, 90));

    const buildTrend = (value: number): number[] => {
      if (value <= 0) {
        return Array.from({ length: normalizedDays }, () => 0);
      }

      const result: number[] = [];
      for (let dayIndex = normalizedDays - 1; dayIndex >= 0; dayIndex--) {
        const progress = (normalizedDays - dayIndex) / normalizedDays;
        const growthFactor = 0.55 + (progress * 0.35);
        const projected = Math.max(0, Math.round(value * growthFactor));
        result.push(projected);
      }
      return result;
    };

    return {
      certificates: buildTrend(current.certificates.used),
      votes: buildTrend(current.votes.used),
      apiCalls: buildTrend(current.apiCalls.used),
      storage: buildTrend(current.storage.used)
    };
  }

  generateRecommendations(usage: UsageLimits): string[] {
    const advice: string[] = [];

    const addMessage = (category: string, percentage: number, message: string) => {
      advice.push(`${category}: ${message} (${percentage}% used)`);
    };

    const highUsageCategories: string[] = [];

    (['certificates', 'votes', 'apiCalls', 'storage'] as const).forEach(category => {
      const entry = usage[category];
      const percent = entry.percentage;

      if (percent >= 98) {
        addMessage(category, percent, 'critical threshold reached – upgrade required');
        highUsageCategories.push(category);
      } else if (percent >= 90) {
        addMessage(category, percent, 'approaching maximum capacity – plan upgrade recommended');
        highUsageCategories.push(category);
      } else if (percent >= 75) {
        addMessage(category, percent, 'heavy consumption detected – monitor closely');
      } else if (percent >= 50) {
        addMessage(category, percent, 'usage trending upward – maintain current monitoring cadence');
      }
    });

    if (highUsageCategories.length >= 2) {
      advice.push(`Multiple limits under pressure: ${highUsageCategories.join(', ')}. Evaluate bundle upgrade options.`);
    }

    if (advice.length === 0) {
      advice.push('Usage is within healthy ranges across all quotas. No immediate action required.');
    }

    return advice;
  }

  calculateProjectedExhaustion(usage: UsageLimits, trends: UsageTrends): UsageProjections {
    const projections: UsageProjections = {};

    (['certificates', 'votes', 'apiCalls', 'storage'] as const).forEach(category => {
      const limit = usage[category].limit;
      const used = usage[category].used;
      const trend = trends[category];

      if (!Number.isFinite(limit) || limit <= 0 || trend.length < 2) {
        return;
      }

      const recentWindow = trend.slice(-7);
      let delta = 0;
      for (let index = 1; index < recentWindow.length; index++) {
        delta += Math.max(0, recentWindow[index] - recentWindow[index - 1]);
      }

      const averageDailyGrowth = delta / Math.max(1, recentWindow.length - 1);
      if (averageDailyGrowth <= 0) {
        return;
      }

      const remaining = Math.max(0, limit - used);
      const daysRemaining = Math.ceil(remaining / averageDailyGrowth);

      if (daysRemaining > 0 && daysRemaining <= 60) {
        const exhaustionDate = new Date();
        exhaustionDate.setDate(exhaustionDate.getDate() + daysRemaining);
        projections[category] = `${daysRemaining} days (${exhaustionDate.toLocaleDateString()})`;
      }
    });

    return projections;
  }
}

export const usageForecastService = new UsageForecastService();