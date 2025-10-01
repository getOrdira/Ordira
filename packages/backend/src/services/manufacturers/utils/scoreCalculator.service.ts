/**
 * Score Calculator Service
 *
 * Handles profile score calculations for manufacturers based on
 * profile completeness and data quality.
 */

import { RegisterManufacturerData, UpdateManufacturerData } from '../core/manufacturerData.service';

export class ScoreCalculatorService {
  /**
   * Calculate initial profile score for new manufacturer registration
   */
  calculateInitialProfileScore(data: RegisterManufacturerData): number {
    let score = 0;

    if (data.name) score += 10;
    if (data.description) score += 15;
    if (data.industry) score += 10;
    if (data.contactEmail) score += 5;
    if (data.servicesOffered && data.servicesOffered.length > 0) score += 20;
    if (data.moq !== undefined) score += 10;
    if (data.headquarters?.country) score += 10;

    return score;
  }

  /**
   * Calculate comprehensive profile score for existing manufacturer
   */
  calculateProfileScore(manufacturerData: any): number {
    let score = 0;

    if (manufacturerData.name) score += 10;
    if (manufacturerData.description && manufacturerData.description.length > 50) score += 15;
    if (manufacturerData.industry) score += 10;
    if (manufacturerData.contactEmail) score += 5;
    if (manufacturerData.servicesOffered && manufacturerData.servicesOffered.length > 0) score += 20;
    if (manufacturerData.moq !== undefined) score += 10;
    if (manufacturerData.headquarters?.country) score += 10;
    if (manufacturerData.certifications && manufacturerData.certifications.length > 0) score += 15;
    if (manufacturerData.isEmailVerified) score += 5;

    return score;
  }

  /**
   * Calculate profile completeness percentage
   */
  calculateProfileCompleteness(manufacturerData: any): number {
    const maxScore = 100; // Maximum possible score
    const currentScore = this.calculateProfileScore(manufacturerData);
    return Math.round((currentScore / maxScore) * 100);
  }
}

export const scoreCalculatorService = new ScoreCalculatorService();
