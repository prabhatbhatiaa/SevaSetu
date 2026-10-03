const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const {
  User,
  VolunteerProfile,
  ServiceRequest,
  Assignment,
  Review,
  USER_ROLES,
  REQUEST_STATUS,
  ASSIGNMENT_STATUS,
} = require('../src/models');

describe('Task 7: Reviews, Ratings and Community Impact Analytics Integration Tests', () => {
  let mongoServer;
  let memberToken;
  let memberUser;
  let volunteerToken;
  let volunteerUser;
  let volunteerProfile;
  let otherMemberToken;
  let adminToken;
  let adminUser;

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

  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }

    // Register a community member
    const memberRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Anita Roy',
        email: 'anita@example.com',
        password: 'Password123!',
        role: USER_ROLES.COMMUNITY_MEMBER,
        location: { type: 'Point', coordinates: [77.0266, 28.4595] },
      });
    memberToken = memberRes.body.token;
    memberUser = memberRes.body.user;

    // Register another community member
    const otherMemberRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Rajesh Khanna',
        email: 'rajesh@example.com',
        password: 'Password123!',
        role: USER_ROLES.COMMUNITY_MEMBER,
      });
    otherMemberToken = otherMemberRes.body.token;

    // Register a volunteer
    const volRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Devansh Joshi',
        email: 'devansh@example.com',
        password: 'Password123!',
        role: USER_ROLES.VOLUNTEER,
        skills: ['Elderly Care', 'Walking Assistance'],
        categories: ['Elderly Assistance'],
        location: { type: 'Point', coordinates: [77.0280, 28.4600] },
      });
    volunteerToken = volRes.body.token;
    volunteerUser = volRes.body.user;
    volunteerProfile = await VolunteerProfile.findOne({ user: volunteerUser._id });

    // Register an admin
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'System Admin',
        email: 'admin@sevasetu.org',
        password: 'Password123!',
        role: USER_ROLES.ADMIN,
      });
    adminToken = adminRes.body.token;
    adminUser = adminRes.body.user;
  });

  describe('7.1 Review Submission & Auto-Rating Recalculation (POST /api/reviews)', () => {
    let completedRequest;

    beforeEach(async () => {
      completedRequest = await ServiceRequest.create({
        requester: memberUser._id,
        assignedVolunteer: volunteerUser._id,
        title: 'Companion walk for elderly resident',
        description: 'Morning walk assistance around local neighborhood park.',
        category: 'Elderly Assistance',
        urgency: 'medium',
        location: { type: 'Point', coordinates: [77.0266, 28.4595] },
        status: REQUEST_STATUS.COMPLETED,
        assignedAt: new Date(Date.now() - 3600000 * 2),
        completedAt: new Date(),
      });
    });

    test('Requester can submit rating and review for completed request', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          requestId: completedRequest._id,
          rating: 5,
          feedback: 'Devansh was very polite, punctual, and helpful during the walk!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rating).toBe(5);
      expect(res.body.data.feedback).toContain('Devansh was very polite');
      expect(res.body.volunteerStats.newRating).toBe(5.0);
      expect(res.body.volunteerStats.totalReviews).toBe(1);

      // Verify VolunteerProfile rating updated in DB
      const updatedProfile = await VolunteerProfile.findOne({ user: volunteerUser._id });
      expect(updatedProfile.rating).toBe(5.0);
      expect(updatedProfile.ratingCount).toBe(1);
    });

    test('Should reject review on non-completed service request', async () => {
      completedRequest.status = REQUEST_STATUS.IN_PROGRESS;
      await completedRequest.save();

      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          requestId: completedRequest._id,
          rating: 5,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('must be COMPLETED');
    });

    test('Should reject review submission by a different community member (403)', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${otherMemberToken}`)
        .send({
          requestId: completedRequest._id,
          rating: 4,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('Should reject duplicate review for the same request', async () => {
      // First review
      await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          requestId: completedRequest._id,
          rating: 5,
        });

      // Second review attempt
      const duplicateRes = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          requestId: completedRequest._id,
          rating: 4,
        });

      expect(duplicateRes.status).toBe(400);
      expect(duplicateRes.body.success).toBe(false);
      expect(duplicateRes.body.message).toContain('already been submitted');
    });

    test('Should reject invalid rating values (e.g. 0 or 6)', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          requestId: completedRequest._id,
          rating: 6,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('7.2 Review Queries & Rating Distribution Breakdown', () => {
    beforeEach(async () => {
      // Create two completed requests and two reviews for volunteer
      const req1 = await ServiceRequest.create({
        requester: memberUser._id,
        assignedVolunteer: volunteerUser._id,
        title: 'First task',
        description: 'First completed task description.',
        category: 'Elderly Assistance',
        location: { type: 'Point', coordinates: [77.0266, 28.4595] },
        status: REQUEST_STATUS.COMPLETED,
      });

      const req2 = await ServiceRequest.create({
        requester: memberUser._id,
        assignedVolunteer: volunteerUser._id,
        title: 'Second task',
        description: 'Second completed task description.',
        category: 'Elderly Assistance',
        location: { type: 'Point', coordinates: [77.0266, 28.4595] },
        status: REQUEST_STATUS.COMPLETED,
      });

      await Review.create({
        request: req1._id,
        volunteer: volunteerUser._id,
        requester: memberUser._id,
        rating: 4,
        feedback: 'Good service.',
      });

      await Review.create({
        request: req2._id,
        volunteer: volunteerUser._id,
        requester: memberUser._id,
        rating: 5,
        feedback: 'Excellent service!',
      });
    });

    test('GET /api/reviews/volunteer/:volunteerId: Returns reviews and 1-5 star distribution', async () => {
      const res = await request(app).get(`/api/reviews/volunteer/${volunteerUser._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2);
      expect(res.body.ratingSummary.averageRating).toBe(4.5);
      expect(res.body.ratingSummary.totalReviews).toBe(2);
      expect(res.body.ratingSummary.distribution['4']).toBe(1);
      expect(res.body.ratingSummary.distribution['5']).toBe(1);
    });
  });

  describe('7.3 Community Impact & Admin Statistics APIs', () => {
    beforeEach(async () => {
      await ServiceRequest.create({
        requester: memberUser._id,
        title: 'Completed Document Help',
        description: 'Completed document task.',
        category: 'Document Assistance',
        urgency: 'high',
        location: { type: 'Point', coordinates: [77.0266, 28.4595], city: 'Gurugram' },
        status: REQUEST_STATUS.COMPLETED,
        createdAt: new Date(Date.now() - 3600000 * 4), // 4 hours ago
        completedAt: new Date(),
      });

      await ServiceRequest.create({
        requester: memberUser._id,
        title: 'Active Technical Support Request',
        description: 'Still active request.',
        category: 'Technical Support',
        urgency: 'medium',
        location: { type: 'Point', coordinates: [77.0266, 28.4595], city: 'Gurugram' },
        status: REQUEST_STATUS.PENDING,
      });
    });

    test('GET /api/impact/statistics: Should return public community impact statistics', async () => {
      const res = await request(app).get('/api/impact/statistics');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary.totalRequests).toBeGreaterThanOrEqual(2);
      expect(res.body.data.summary.completedServices).toBeGreaterThanOrEqual(1);
      expect(res.body.data.summary.activeRequests).toBeGreaterThanOrEqual(1);
      expect(res.body.data.summary.totalVolunteers).toBeGreaterThanOrEqual(1);
      expect(res.body.data.categories.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.urgencyDistribution.high).toBeGreaterThanOrEqual(1);
      expect(res.body.data.recentImpactFeed.length).toBeGreaterThanOrEqual(1);
    });

    test('GET /api/public/impact: Alias should also return public impact metrics', async () => {
      const res = await request(app).get('/api/public/impact');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary.totalRequests).toBeDefined();
    });

    test('GET /api/impact/admin/statistics: Admin can access detailed platform analytics', async () => {
      const res = await request(app)
        .get('/api/impact/admin/statistics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.overview.totalRequests).toBeGreaterThanOrEqual(2);
      expect(res.body.data.requestsByStatus.COMPLETED).toBeGreaterThanOrEqual(1);
      expect(res.body.data.requestsByStatus.PENDING).toBeGreaterThanOrEqual(1);
    });

    test('GET /api/impact/admin/statistics: Non-admin users are denied access (403)', async () => {
      const res = await request(app)
        .get('/api/impact/admin/statistics')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
