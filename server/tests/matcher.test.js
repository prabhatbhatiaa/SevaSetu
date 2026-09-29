const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const {
  haversineDistance,
  calculateDistanceScore,
  calculateSkillScore,
  calculateAvailabilityScore,
  calculateCategoryScore,
  calculateRatingScore,
  calculateMatchScore,
  rankVolunteers,
  findMatchesForRequest,
} = require('../src/algorithms/volunteerMatcher');

const {
  User,
  VolunteerProfile,
  ServiceRequest,
  USER_ROLES,
  REQUEST_URGENCY,
} = require('../src/models');

describe('Task 3: Core Multi-Factor Matching Engine Unit & Integration Tests', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe('3.1 & 3.2 Geospatial Distance & Haversine Calculation', () => {
    test('Should return 0 km for identical coordinates', () => {
      const coords = [77.0266, 28.4595];
      expect(haversineDistance(coords, coords)).toBe(0);
    });

    test('Should calculate accurate distance between two Delhi-NCR locations', () => {
      // Gurugram IFFCO Chowk: [77.0725, 28.4720]
      // Cyber City: [77.0878, 28.4950]
      const d = haversineDistance([77.0725, 28.4720], [77.0878, 28.4950]);
      expect(d).toBeGreaterThan(2.5);
      expect(d).toBeLessThan(3.5);
    });

    test('Distance score: 0 km distance should yield 100 score', () => {
      expect(calculateDistanceScore(0, 10)).toBe(100);
    });

    test('Distance score: 2.1 km distance with 10 km service radius should yield approx 85', () => {
      const score = calculateDistanceScore(2.1, 10);
      // Expected formula: 100 - (2.1 / 10) * 70 = 85.3
      expect(score).toBeCloseTo(85.3, 0);
    });

    test('Distance score: Distance beyond service radius decays gracefully', () => {
      const withinScore = calculateDistanceScore(8, 10);
      const outsideScore = calculateDistanceScore(15, 10);
      const farOutsideScore = calculateDistanceScore(30, 10);

      expect(withinScore).toBeGreaterThan(outsideScore);
      expect(outsideScore).toBeGreaterThan(farOutsideScore);
      expect(farOutsideScore).toBeGreaterThanOrEqual(0);
    });

    test('Distance score: Strict radius option yields 0 outside boundary', () => {
      expect(calculateDistanceScore(12, 10, { strictRadius: true })).toBe(0);
    });
  });

  describe('3.3 Skill Match Scoring', () => {
    test('Should return 100 when all requested skills match', () => {
      const req = ['Computer Repair', 'Hardware'];
      const vol = ['computer repair', 'hardware', 'troubleshooting'];
      const result = calculateSkillScore(req, vol);

      expect(result.score).toBe(100);
      expect(result.matchedSkills.length).toBe(2);
      expect(result.missingSkills.length).toBe(0);
    });

    test('Should calculate partial ratio when only some skills match', () => {
      const req = ['Computer Repair', 'Hindi Translation'];
      const vol = ['Computer Repair', 'Tech Support'];
      const result = calculateSkillScore(req, vol);

      expect(result.score).toBe(50);
      expect(result.matchedSkills).toEqual(['Computer Repair']);
      expect(result.missingSkills).toEqual(['Hindi Translation']);
    });

    test('Should return 100 if request requires no specific skills (general request)', () => {
      const result = calculateSkillScore([], ['Cooking', 'Driving']);
      expect(result.score).toBe(100);
    });

    test('Should return 0 when no skills match', () => {
      const req = ['Electrician'];
      const vol = ['Gardening', 'Painting'];
      const result = calculateSkillScore(req, vol);
      expect(result.score).toBe(0);
      expect(result.missingSkills).toEqual(['Electrician']);
    });
  });

  describe('3.4 Availability Matching', () => {
    const volunteerAvail = [
      { day: 'Saturday', slots: ['morning', 'afternoon'] },
      { day: 'Sunday', slots: ['evening'] },
    ];

    test('Should score 100 for exact day and time slot match', () => {
      // 2026-10-04 is a Sunday
      const sundayDate = '2026-10-04';
      const result = calculateAvailabilityScore(sundayDate, '5:00 PM - 7:00 PM', volunteerAvail);
      expect(result.score).toBe(100);
      expect(result.matchedDay).toBe('Sunday');
    });

    test('Should score 100 when request has open/flexible scheduling', () => {
      const result = calculateAvailabilityScore(null, null, volunteerAvail);
      expect(result.score).toBe(100);
    });

    test('Should score 20 when volunteer is not available on requested day', () => {
      // 2026-09-30 is a Wednesday
      const wednesdayDate = '2026-09-30';
      const result = calculateAvailabilityScore(wednesdayDate, 'morning', volunteerAvail);
      expect(result.score).toBe(20);
    });
  });

  describe('3.5 Category Relevance Scoring', () => {
    test('Should score 100 for exact category match', () => {
      expect(calculateCategoryScore('Technical Support', ['Technical Support', 'Elderly Assistance'])).toBe(100);
    });

    test('Should score 75 for general community assistance volunteer fallback', () => {
      expect(calculateCategoryScore('Environmental Activities', ['Basic Community Assistance'])).toBe(75);
    });

    test('Should score low (15) for unrelated category', () => {
      expect(calculateCategoryScore('Technical Support', ['Elderly Assistance'])).toBe(15);
    });
  });

  describe('3.6 Volunteer Rating Normalization', () => {
    test('Should normalize 4.8 / 5.0 to 96', () => {
      const score = calculateRatingScore(4.8, 0);
      expect(score).toBe(96);
    });

    test('Should give full 100 for 5.0 rating', () => {
      expect(calculateRatingScore(5.0, 10)).toBe(100);
    });
  });

  describe('3.7 Composite Multi-Factor Score & Explainable Breakdown', () => {
    test('Calculates multi-factor score matching project specification formula', () => {
      const request = {
        category: 'Technical Support',
        requiredSkills: ['Computer Repair'],
        location: { coordinates: [77.0266, 28.4595] },
        preferredDate: '2026-10-04', // Sunday
        preferredTime: '5 PM – 7 PM', // Evening
      };

      // Volunteer located ~2.1 km away
      // Latitude difference of ~0.0189 degrees is ~2.1 km
      const volunteerProfile = {
        skills: ['Computer Repair', 'Technical Support'],
        categories: ['Technical Support'],
        serviceRadius: 10,
        rating: 4.8,
        completedTasks: 0,
        availability: [{ day: 'Sunday', slots: ['evening'] }],
        location: { coordinates: [77.0266, 28.4784] },
      };

      const result = calculateMatchScore(request, volunteerProfile);

      expect(result.matchScore).toBeGreaterThan(90);
      expect(result.breakdown.skillScore).toBe(100);
      expect(result.breakdown.availabilityScore).toBe(100);
      expect(result.breakdown.categoryScore).toBe(100);
      expect(result.breakdown.ratingScore).toBe(96);
      expect(result.breakdown.calculatedDistanceKm).toBeCloseTo(2.1, 0);
      expect(result.explanation.length).toBeGreaterThan(2);
    });
  });

  describe('3.8 Ranking & Database Candidate Query (findMatchesForRequest)', () => {
    test('Ranks multiple volunteers in descending order of match quality', async () => {
      await VolunteerProfile.ensureIndexes();

      const u1 = await User.create({ name: 'Aarav (Top Match)', email: 'aarav@ex.com', password: 'password123', role: USER_ROLES.VOLUNTEER });
      const u2 = await User.create({ name: 'Bhavna (Moderate Match)', email: 'bhavna@ex.com', password: 'password123', role: USER_ROLES.VOLUNTEER });
      const u3 = await User.create({ name: 'Chirag (Weak Match)', email: 'chirag@ex.com', password: 'password123', role: USER_ROLES.VOLUNTEER });

      // Profile 1: Near, has skills, matches category, matches availability
      await VolunteerProfile.create({
        user: u1._id,
        skills: ['Smartphone Setup', 'Document Assistance'],
        categories: ['Technical Support', 'Document Assistance'],
        serviceRadius: 10,
        rating: 4.9,
        location: { type: 'Point', coordinates: [77.027, 28.460] }, // ~0.1 km away
        availability: [{ day: 'Sunday', slots: ['morning'] }],
      });

      // Profile 2: 5km away, general skills
      await VolunteerProfile.create({
        user: u2._id,
        skills: ['Basic Help'],
        categories: ['Basic Community Assistance'],
        serviceRadius: 10,
        rating: 4.5,
        location: { type: 'Point', coordinates: [77.060, 28.480] }, // ~5 km away
        availability: [{ day: 'Sunday', slots: ['flexible'] }],
      });

      // Profile 3: 20km away, completely different category
      await VolunteerProfile.create({
        user: u3._id,
        skills: ['Gardening'],
        categories: ['Environmental Activities'],
        serviceRadius: 5,
        rating: 4.0,
        location: { type: 'Point', coordinates: [77.200, 28.600] }, // ~20 km away
        availability: [{ day: 'Monday', slots: ['night'] }],
      });

      const requester = await User.create({ name: 'Requester', email: 'req@ex.com', password: 'password123' });

      const request = await ServiceRequest.create({
        requester: requester._id,
        title: 'Smartphone setup for senior citizen',
        description: 'Need assistance setting up smartphone apps and contacts.',
        category: 'Technical Support',
        requiredSkills: ['Smartphone Setup'],
        urgency: REQUEST_URGENCY.HIGH,
        preferredDate: '2026-10-04', // Sunday
        preferredTime: 'morning',
        location: { type: 'Point', coordinates: [77.0266, 28.4595] },
      });

      const matches = await findMatchesForRequest(request._id);

      expect(matches.length).toBeGreaterThanOrEqual(2);
      expect(matches[0].volunteerProfile.user._id.toString()).toBe(u1._id.toString());
      expect(matches[0].matchScore).toBeGreaterThan(matches[1].matchScore);
      expect(matches[0].breakdown.skillScore).toBe(100);
    });
  });
});
