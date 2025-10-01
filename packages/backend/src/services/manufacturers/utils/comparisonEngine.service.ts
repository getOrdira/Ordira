/**
 * Comparison Engine Service
 *
 * Handles comparison logic for manufacturers, including
 * similarity scoring, ranking, and matching algorithms
 */

export interface ManufacturerComparisonResult {
  manufacturerId: string;
  name: string;
  matchScore: number;
  matchReasons: string[];
  differences: string[];
}

export interface ComparisonCriteria {
  industry?: string;
  services?: string[];
  moqRange?: { min?: number; max?: number };
  location?: string;
  certifications?: string[];
}

export class ComparisonEngineService {
  /**
   * Compare two manufacturers and return similarity score
   */
  compareManufacturers(manufacturer1: any, manufacturer2: any): number {
    let score = 0;
    let maxScore = 0;

    // Industry match (20 points)
    maxScore += 20;
    if (manufacturer1.industry && manufacturer2.industry) {
      if (manufacturer1.industry === manufacturer2.industry) {
        score += 20;
      }
    }

    // Services overlap (30 points)
    maxScore += 30;
    if (manufacturer1.servicesOffered && manufacturer2.servicesOffered) {
      const overlap = this.calculateArrayOverlap(
        manufacturer1.servicesOffered,
        manufacturer2.servicesOffered
      );
      score += overlap * 30;
    }

    // MOQ similarity (15 points)
    maxScore += 15;
    if (manufacturer1.moq !== undefined && manufacturer2.moq !== undefined) {
      const moqSimilarity = this.calculateNumericSimilarity(
        manufacturer1.moq,
        manufacturer2.moq
      );
      score += moqSimilarity * 15;
    }

    // Location match (15 points)
    maxScore += 15;
    if (manufacturer1.headquarters?.country && manufacturer2.headquarters?.country) {
      if (manufacturer1.headquarters.country === manufacturer2.headquarters.country) {
        score += 15;
      }
    }

    // Certifications overlap (20 points)
    maxScore += 20;
    if (manufacturer1.certifications && manufacturer2.certifications) {
      const certNames1 = manufacturer1.certifications.map((c: any) => c.name);
      const certNames2 = manufacturer2.certifications.map((c: any) => c.name);
      const overlap = this.calculateArrayOverlap(certNames1, certNames2);
      score += overlap * 20;
    }

    // Return normalized score (0-100)
    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  }

  /**
   * Find similar manufacturers based on criteria
   */
  findSimilarManufacturers(
    sourceManufacturer: any,
    candidates: any[],
    threshold: number = 50
  ): ManufacturerComparisonResult[] {
    return candidates
      .map(candidate => {
        const matchScore = this.compareManufacturers(sourceManufacturer, candidate);
        const matchReasons = this.getMatchReasons(sourceManufacturer, candidate);
        const differences = this.getDifferences(sourceManufacturer, candidate);

        return {
          manufacturerId: candidate._id || candidate.id,
          name: candidate.name,
          matchScore,
          matchReasons,
          differences
        };
      })
      .filter(result => result.matchScore >= threshold)
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Match manufacturers against search criteria
   */
  matchAgainstCriteria(manufacturer: any, criteria: ComparisonCriteria): number {
    let score = 0;
    let maxScore = 0;

    // Industry match
    if (criteria.industry) {
      maxScore += 25;
      if (manufacturer.industry === criteria.industry) {
        score += 25;
      }
    }

    // Services match
    if (criteria.services && criteria.services.length > 0) {
      maxScore += 30;
      const overlap = this.calculateArrayOverlap(
        manufacturer.servicesOffered || [],
        criteria.services
      );
      score += overlap * 30;
    }

    // MOQ range match
    if (criteria.moqRange) {
      maxScore += 20;
      if (manufacturer.moq !== undefined) {
        const { min, max } = criteria.moqRange;
        const inRange =
          (min === undefined || manufacturer.moq >= min) &&
          (max === undefined || manufacturer.moq <= max);

        if (inRange) {
          score += 20;
        }
      }
    }

    // Location match
    if (criteria.location) {
      maxScore += 15;
      if (
        manufacturer.headquarters?.country?.toLowerCase() ===
        criteria.location.toLowerCase()
      ) {
        score += 15;
      }
    }

    // Certifications match
    if (criteria.certifications && criteria.certifications.length > 0) {
      maxScore += 10;
      const manufacturerCerts = (manufacturer.certifications || []).map((c: any) => c.name);
      const overlap = this.calculateArrayOverlap(manufacturerCerts, criteria.certifications);
      score += overlap * 10;
    }

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  }

  /**
   * Rank manufacturers by multiple criteria
   */
  rankManufacturers(
    manufacturers: any[],
    weights: {
      profileScore?: number;
      matchScore?: number;
      certificationCount?: number;
      servicesCount?: number;
    } = {}
  ): any[] {
    const defaultWeights = {
      profileScore: 0.4,
      matchScore: 0.3,
      certificationCount: 0.15,
      servicesCount: 0.15,
      ...weights
    };

    return manufacturers
      .map(manufacturer => {
        let totalScore = 0;

        if (defaultWeights.profileScore) {
          totalScore += (manufacturer.profileScore || 0) * defaultWeights.profileScore;
        }

        if (defaultWeights.matchScore && manufacturer.matchScore !== undefined) {
          totalScore += manufacturer.matchScore * defaultWeights.matchScore;
        }

        if (defaultWeights.certificationCount) {
          const certCount = (manufacturer.certifications || []).length;
          totalScore += Math.min(certCount * 10, 100) * defaultWeights.certificationCount;
        }

        if (defaultWeights.servicesCount) {
          const serviceCount = (manufacturer.servicesOffered || []).length;
          totalScore += Math.min(serviceCount * 10, 100) * defaultWeights.servicesCount;
        }

        return {
          ...manufacturer,
          rankingScore: Math.round(totalScore)
        };
      })
      .sort((a, b) => b.rankingScore - a.rankingScore);
  }

  /**
   * Private helper methods
   */

  private calculateArrayOverlap(arr1: string[], arr2: string[]): number {
    if (!arr1 || !arr2 || arr1.length === 0 || arr2.length === 0) {
      return 0;
    }

    const set1 = new Set(arr1.map(item => item.toLowerCase()));
    const set2 = new Set(arr2.map(item => item.toLowerCase()));
    const intersection = new Set([...set1].filter(x => set2.has(x)));

    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }

  private calculateNumericSimilarity(num1: number, num2: number): number {
    if (num1 === num2) return 1;

    const max = Math.max(num1, num2);
    const min = Math.min(num1, num2);

    if (max === 0) return 0;

    return min / max;
  }

  private getMatchReasons(manufacturer1: any, manufacturer2: any): string[] {
    const reasons: string[] = [];

    if (manufacturer1.industry === manufacturer2.industry) {
      reasons.push(`Same industry: ${manufacturer1.industry}`);
    }

    if (manufacturer1.servicesOffered && manufacturer2.servicesOffered) {
      const commonServices = manufacturer1.servicesOffered.filter((s: string) =>
        manufacturer2.servicesOffered.includes(s)
      );
      if (commonServices.length > 0) {
        reasons.push(`Common services: ${commonServices.join(', ')}`);
      }
    }

    if (
      manufacturer1.headquarters?.country &&
      manufacturer2.headquarters?.country &&
      manufacturer1.headquarters.country === manufacturer2.headquarters.country
    ) {
      reasons.push(`Same country: ${manufacturer1.headquarters.country}`);
    }

    return reasons;
  }

  private getDifferences(manufacturer1: any, manufacturer2: any): string[] {
    const differences: string[] = [];

    if (manufacturer1.industry !== manufacturer2.industry) {
      differences.push(
        `Different industries: ${manufacturer1.industry} vs ${manufacturer2.industry}`
      );
    }

    if (manufacturer1.moq !== undefined && manufacturer2.moq !== undefined) {
      const moqDiff = Math.abs(manufacturer1.moq - manufacturer2.moq);
      if (moqDiff > 0) {
        differences.push(`MOQ difference: ${moqDiff} units`);
      }
    }

    if (
      manufacturer1.headquarters?.country !== manufacturer2.headquarters?.country
    ) {
      differences.push(
        `Different locations: ${manufacturer1.headquarters?.country || 'Unknown'} vs ${manufacturer2.headquarters?.country || 'Unknown'}`
      );
    }

    return differences;
  }
}

export const comparisonEngineService = new ComparisonEngineService();
