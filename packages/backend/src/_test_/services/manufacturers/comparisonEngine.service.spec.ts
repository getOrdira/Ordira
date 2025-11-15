/**
 * Comparison Engine Service Unit Tests
 * 
 * Tests manufacturer comparison and matching logic.
 */

import { ComparisonEngineService } from '../../../services/manufacturers/utils/comparisonEngine.service';

describe('ComparisonEngineService', () => {
  let comparisonEngineService: ComparisonEngineService;

  beforeEach(() => {
    comparisonEngineService = new ComparisonEngineService();
  });

  describe('compareManufacturers', () => {
    const manufacturer1 = {
      industry: 'Technology',
      servicesOffered: ['Production', 'Assembly'],
      moq: 100,
      headquarters: {
        country: 'US',
      },
      certifications: [
        { name: 'ISO 9001' },
        { name: 'ISO 14001' },
      ],
    };

    const manufacturer2 = {
      industry: 'Technology',
      servicesOffered: ['Production', 'Assembly', 'Quality Control'],
      moq: 120,
      headquarters: {
        country: 'US',
      },
      certifications: [
        { name: 'ISO 9001' },
      ],
    };

    it('should calculate similarity score between two manufacturers', () => {
      const score = comparisonEngineService.compareManufacturers(manufacturer1, manufacturer2);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should award points for matching industry', () => {
      const sameIndustry = {
        ...manufacturer1,
        industry: 'Technology',
      };
      const differentIndustry = {
        ...manufacturer1,
        industry: 'Electronics',
      };

      const sameScore = comparisonEngineService.compareManufacturers(
        manufacturer1,
        sameIndustry
      );
      const diffScore = comparisonEngineService.compareManufacturers(
        manufacturer1,
        differentIndustry
      );

      expect(sameScore).toBeGreaterThan(diffScore);
    });

    it('should calculate services overlap', () => {
      const highOverlap = {
        ...manufacturer2,
        servicesOffered: ['Production', 'Assembly'],
      };
      const lowOverlap = {
        ...manufacturer2,
        servicesOffered: ['Packaging', 'Shipping'],
      };

      const highScore = comparisonEngineService.compareManufacturers(manufacturer1, highOverlap);
      const lowScore = comparisonEngineService.compareManufacturers(manufacturer1, lowOverlap);

      expect(highScore).toBeGreaterThan(lowScore);
    });

    it('should calculate MOQ similarity', () => {
      const similarMoq = {
        ...manufacturer2,
        moq: 105,
      };
      const differentMoq = {
        ...manufacturer2,
        moq: 1000,
      };

      const similarScore = comparisonEngineService.compareManufacturers(manufacturer1, similarMoq);
      const differentScore = comparisonEngineService.compareManufacturers(
        manufacturer1,
        differentMoq
      );

      expect(similarScore).toBeGreaterThan(differentScore);
    });

    it('should award points for matching location', () => {
      const sameLocation = {
        ...manufacturer2,
        headquarters: {
          country: 'US',
        },
      };
      const differentLocation = {
        ...manufacturer2,
        headquarters: {
          country: 'UK',
        },
      };

      const sameScore = comparisonEngineService.compareManufacturers(
        manufacturer1,
        sameLocation
      );
      const diffScore = comparisonEngineService.compareManufacturers(
        manufacturer1,
        differentLocation
      );

      expect(sameScore).toBeGreaterThan(diffScore);
    });

    it('should calculate certifications overlap', () => {
      const highCertOverlap = {
        ...manufacturer2,
        certifications: [
          { name: 'ISO 9001' },
          { name: 'ISO 14001' },
        ],
      };
      const lowCertOverlap = {
        ...manufacturer2,
        certifications: [
          { name: 'CE Mark' },
        ],
      };

      const highScore = comparisonEngineService.compareManufacturers(
        manufacturer1,
        highCertOverlap
      );
      const lowScore = comparisonEngineService.compareManufacturers(
        manufacturer1,
        lowCertOverlap
      );

      expect(highScore).toBeGreaterThan(lowScore);
    });

    it('should return 0 when no data available', () => {
      const empty1 = {};
      const empty2 = {};

      const score = comparisonEngineService.compareManufacturers(empty1, empty2);

      expect(score).toBe(0);
    });
  });

  describe('findSimilarManufacturers', () => {
    const sourceManufacturer = {
      _id: 'source-id',
      industry: 'Technology',
      servicesOffered: ['Production', 'Assembly'],
      moq: 100,
      headquarters: {
        country: 'US',
      },
    };

    const candidates = [
      {
        _id: 'candidate-1',
        name: 'Similar Manufacturer',
        industry: 'Technology',
        servicesOffered: ['Production', 'Assembly'],
        moq: 110,
        headquarters: {
          country: 'US',
        },
      },
      {
        _id: 'candidate-2',
        name: 'Different Manufacturer',
        industry: 'Electronics',
        servicesOffered: ['Packaging'],
        moq: 500,
        headquarters: {
          country: 'UK',
        },
      },
      {
        _id: 'candidate-3',
        name: 'Very Similar Manufacturer',
        industry: 'Technology',
        servicesOffered: ['Production', 'Assembly', 'Quality Control'],
        moq: 100,
        headquarters: {
          country: 'US',
        },
      },
    ];

    it('should find similar manufacturers above threshold', () => {
      const results = comparisonEngineService.findSimilarManufacturers(
        sourceManufacturer,
        candidates,
        50
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.matchScore >= 50)).toBe(true);
    });

    it('should filter out manufacturers below threshold', () => {
      const results = comparisonEngineService.findSimilarManufacturers(
        sourceManufacturer,
        candidates,
        80
      );

      expect(results.every(r => r.matchScore >= 80)).toBe(true);
    });

    it('should sort results by match score descending', () => {
      const results = comparisonEngineService.findSimilarManufacturers(
        sourceManufacturer,
        candidates,
        0
      );

      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].matchScore).toBeGreaterThanOrEqual(results[i + 1].matchScore);
      }
    });

    it('should include match reasons', () => {
      const results = comparisonEngineService.findSimilarManufacturers(
        sourceManufacturer,
        candidates,
        0
      );

      expect(results.every(r => Array.isArray(r.matchReasons))).toBe(true);
      expect(results[0].matchReasons.length).toBeGreaterThan(0);
    });

    it('should include differences', () => {
      const results = comparisonEngineService.findSimilarManufacturers(
        sourceManufacturer,
        candidates,
        0
      );

      expect(results.every(r => Array.isArray(r.differences))).toBe(true);
    });

    it('should use id field when _id is not available', () => {
      const candidatesWithId = candidates.map(c => ({
        ...c,
        id: c._id,
        _id: undefined,
      }));

      const results = comparisonEngineService.findSimilarManufacturers(
        sourceManufacturer,
        candidatesWithId,
        0
      );

      expect(results.every(r => r.manufacturerId)).toBe(true);
    });
  });

  describe('matchAgainstCriteria', () => {
    const manufacturer = {
      industry: 'Technology',
      servicesOffered: ['Production', 'Assembly'],
      moq: 100,
      headquarters: {
        country: 'US',
      },
      certifications: [
        { name: 'ISO 9001' },
      ],
    };

    it('should match manufacturer against criteria', () => {
      const criteria = {
        industry: 'Technology',
        services: ['Production'],
        moqRange: { min: 50, max: 200 },
        location: 'US',
        certifications: ['ISO 9001'],
      };

      const score = comparisonEngineService.matchAgainstCriteria(manufacturer, criteria);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should award points for industry match', () => {
      const matchingCriteria = {
        industry: 'Technology',
      };
      const nonMatchingCriteria = {
        industry: 'Electronics',
      };

      const matchScore = comparisonEngineService.matchAgainstCriteria(
        manufacturer,
        matchingCriteria
      );
      const nonMatchScore = comparisonEngineService.matchAgainstCriteria(
        manufacturer,
        nonMatchingCriteria
      );

      expect(matchScore).toBeGreaterThan(nonMatchScore);
    });

    it('should calculate services overlap', () => {
      const criteria = {
        services: ['Production', 'Assembly'],
      };

      const score = comparisonEngineService.matchAgainstCriteria(manufacturer, criteria);

      expect(score).toBeGreaterThan(0);
    });

    it('should check MOQ range', () => {
      const inRangeCriteria = {
        moqRange: { min: 50, max: 200 },
      };
      const outOfRangeCriteria = {
        moqRange: { min: 500, max: 1000 },
      };

      const inRangeScore = comparisonEngineService.matchAgainstCriteria(
        manufacturer,
        inRangeCriteria
      );
      const outOfRangeScore = comparisonEngineService.matchAgainstCriteria(
        manufacturer,
        outOfRangeCriteria
      );

      expect(inRangeScore).toBeGreaterThan(outOfRangeScore);
    });

    it('should match location', () => {
      const matchingCriteria = {
        location: 'US',
      };
      const nonMatchingCriteria = {
        location: 'UK',
      };

      const matchScore = comparisonEngineService.matchAgainstCriteria(
        manufacturer,
        matchingCriteria
      );
      const nonMatchScore = comparisonEngineService.matchAgainstCriteria(
        manufacturer,
        nonMatchingCriteria
      );

      expect(matchScore).toBeGreaterThan(nonMatchScore);
    });

    it('should calculate certifications overlap', () => {
      const criteria = {
        certifications: ['ISO 9001'],
      };

      const score = comparisonEngineService.matchAgainstCriteria(manufacturer, criteria);

      expect(score).toBeGreaterThan(0);
    });

    it('should return 0 when no criteria match', () => {
      const emptyCriteria = {};

      const score = comparisonEngineService.matchAgainstCriteria(manufacturer, emptyCriteria);

      expect(score).toBe(0);
    });
  });

  describe('rankManufacturers', () => {
    const manufacturers = [
      {
        _id: 'mfg-1',
        name: 'Manufacturer 1',
        profileScore: 90,
        matchScore: 85,
        certifications: [
          { name: 'ISO 9001' },
          { name: 'ISO 14001' },
        ],
        servicesOffered: ['Production', 'Assembly'],
      },
      {
        _id: 'mfg-2',
        name: 'Manufacturer 2',
        profileScore: 80,
        matchScore: 90,
        certifications: [
          { name: 'ISO 9001' },
        ],
        servicesOffered: ['Production'],
      },
      {
        _id: 'mfg-3',
        name: 'Manufacturer 3',
        profileScore: 85,
        matchScore: 75,
        certifications: [],
        servicesOffered: ['Packaging'],
      },
    ];

    it('should rank manufacturers by default weights', () => {
      const ranked = comparisonEngineService.rankManufacturers(manufacturers);

      expect(ranked.length).toBe(manufacturers.length);
      expect(ranked[0].rankingScore).toBeGreaterThanOrEqual(ranked[1].rankingScore);
    });

    it('should apply custom weights', () => {
      const customWeights = {
        profileScore: 0.6,
        matchScore: 0.2,
        certificationCount: 0.1,
        servicesCount: 0.1,
      };

      const ranked = comparisonEngineService.rankManufacturers(manufacturers, customWeights);

      expect(ranked.every(m => m.rankingScore !== undefined)).toBe(true);
    });

    it('should prioritize profile score when weight is high', () => {
      const highProfileWeight = {
        profileScore: 1.0,
        matchScore: 0,
        certificationCount: 0,
        servicesCount: 0,
      };

      const ranked = comparisonEngineService.rankManufacturers(manufacturers, highProfileWeight);

      expect(ranked[0].profileScore).toBeGreaterThanOrEqual(ranked[1].profileScore);
    });

    it('should prioritize match score when weight is high', () => {
      const highMatchWeight = {
        profileScore: 0,
        matchScore: 1.0,
        certificationCount: 0,
        servicesCount: 0,
      };

      const ranked = comparisonEngineService.rankManufacturers(manufacturers, highMatchWeight);

      expect(ranked[0].matchScore).toBeGreaterThanOrEqual(ranked[1].matchScore);
    });

    it('should handle missing optional scores', () => {
      const manufacturersWithMissingData = [
        {
          _id: 'mfg-1',
          name: 'Manufacturer 1',
          profileScore: 90,
        },
        {
          _id: 'mfg-2',
          name: 'Manufacturer 2',
          matchScore: 85,
        },
      ];

      const ranked = comparisonEngineService.rankManufacturers(manufacturersWithMissingData);

      expect(ranked.every(m => m.rankingScore !== undefined)).toBe(true);
    });

    it('should sort by ranking score descending', () => {
      const ranked = comparisonEngineService.rankManufacturers(manufacturers);

      for (let i = 0; i < ranked.length - 1; i++) {
        expect(ranked[i].rankingScore).toBeGreaterThanOrEqual(ranked[i + 1].rankingScore);
      }
    });

    it('should cap certification and services count contributions', () => {
      const manufacturerWithManyCerts = {
        _id: 'mfg-4',
        name: 'Manufacturer 4',
        profileScore: 50,
        certifications: Array(20).fill({ name: 'Cert' }),
        servicesOffered: Array(20).fill('Service'),
      };

      const ranked = comparisonEngineService.rankManufacturers([
        ...manufacturers,
        manufacturerWithManyCerts,
      ]);

      // Should not exceed reasonable score limits
      expect(ranked[0].rankingScore).toBeLessThan(200);
    });
  });
});

