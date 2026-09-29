const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const { User, VolunteerProfile, ServiceRequest, USER_ROLES } = require('../src/models');

describe('Task 5: Service Requests & Volunteer Profile APIs Integration Tests', () => {
  let mongoServer;
  let memberToken;
  let memberUser;
  let volunteerToken;
  let volunteerUser;
  let volunteerProfile;

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
        name: 'Sunil Kumar',
        email: 'sunil@example.com',
        password: 'Password123!',
        role: USER_ROLES.COMMUNITY_MEMBER,
        location: {
          type: 'Point',
          coordinates: [77.0266, 28.4595],
          city: 'Gurugram',
        },
      });

    memberToken = memberRes.body.token;
    memberUser = memberRes.body.user;

    // Register a volunteer
    const volRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Meera Nambiar',
        email: 'meera@example.com',
        password: 'Password123!',
        role: USER_ROLES.VOLUNTEER,
        skills: ['English Tutoring', 'Mathematics'],
        categories: ['Education & Tutoring'],
        location: {
          type: 'Point',
          coordinates: [77.0366, 28.4695],
          city: 'Gurugram',
        },
      });

    volunteerToken = volRes.body.token;
    volunteerUser = volRes.body.user;
    volunteerProfile = await VolunteerProfile.findOne({ user: volunteerUser._id });
  });

  describe('5.1 Volunteer Profile APIs', () => {
    test('GET /api/volunteers/me: Should return current logged in volunteer profile', async () => {
      const res = await request(app)
        .get('/api/volunteers/me')
        .set('Authorization', `Bearer ${volunteerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.skills).toContain('English Tutoring');
      expect(res.body.data.categories).toContain('Education & Tutoring');
    });

    test('GET /api/volunteers/me: Community member should be forbidden (403)', async () => {
      const res = await request(app)
        .get('/api/volunteers/me')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('PUT /api/volunteers/profile: Should update skills, availability, and bio', async () => {
      const res = await request(app)
        .put('/api/volunteers/profile')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          skills: ['English Tutoring', 'Science', 'Basic Coding'],
          bio: 'Passionate volunteer teacher with 3 years experience.',
          serviceRadius: 15,
          availability: [
            { day: 'Saturday', slots: ['morning', 'afternoon'] },
            { day: 'Sunday', slots: ['morning'] },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.skills.length).toBe(3);
      expect(res.body.data.serviceRadius).toBe(15);
      expect(res.body.data.bio).toContain('Passionate volunteer teacher');
    });

    test('GET /api/volunteers: Should list public volunteers and support category filtering', async () => {
      const res = await request(app)
        .get('/api/volunteers')
        .query({ category: 'Education & Tutoring' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].categories).toContain('Education & Tutoring');
    });

    test('GET /api/volunteers/:id: Should retrieve volunteer profile by ID', async () => {
      const res = await request(app).get(`/api/volunteers/${volunteerProfile._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.name).toBe('Meera Nambiar');
    });
  });

  describe('5.2 Service Request CRUD APIs', () => {
    let createdRequestId;

    test('POST /api/requests: Should create a new service request successfully', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Math tutoring for 8th grade student',
          description: 'Need in-person guidance on algebra and geometry twice a week.',
          category: 'Education & Tutoring',
          requiredSkills: ['Mathematics'],
          urgency: 'medium',
          location: {
            coordinates: [77.0266, 28.4595],
            address: 'Sector 14',
            city: 'Gurugram',
          },
          preferredDate: '2026-10-10',
          preferredTime: 'morning',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Math tutoring for 8th grade student');
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.requester.name).toBe('Sunil Kumar');

      createdRequestId = res.body.data._id;
    });

    test('POST /api/requests: Should reject request with invalid category', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Invalid category test',
          description: 'Valid description with sufficient characters.',
          category: 'NonExistentCategory',
          location: { coordinates: [77.0266, 28.4595] },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    test('GET /api/requests: Should list requests and support my-requests filter', async () => {
      // Create request first
      await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Help with grocery delivery for elderly neighbor',
          description: 'Delivery of fresh vegetables and essential medicines.',
          category: 'Essential Item Delivery',
          location: { coordinates: [77.0266, 28.4595] },
        });

      const res = await request(app)
        .get('/api/requests?mine=true')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBeGreaterThanOrEqual(1);
    });

    test('GET /api/requests/:id: Should return full details of a specific request', async () => {
      const createRes = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Help filling online application form',
          description: 'Assistance needed with government portal document upload.',
          category: 'Document Assistance',
          location: { coordinates: [77.0266, 28.4595] },
        });

      const reqId = createRes.body.data._id;

      const res = await request(app).get(`/api/requests/${reqId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Help filling online application form');
    });

    test('PUT /api/requests/:id: Should update request when called by owner', async () => {
      const createRes = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Original Request Title',
          description: 'Original request description content.',
          category: 'Other',
          location: { coordinates: [77.0266, 28.4595] },
        });

      const reqId = createRes.body.data._id;

      const updateRes = await request(app)
        .put(`/api/requests/${reqId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Updated Request Title with 5+ chars',
          urgency: 'high',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.data.title).toBe('Updated Request Title with 5+ chars');
      expect(updateRes.body.data.urgency).toBe('high');
    });

    test('PUT /api/requests/:id: Should reject update from a different user (403)', async () => {
      const createRes = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Owner Request Title',
          description: 'Original request description content.',
          category: 'Other',
          location: { coordinates: [77.0266, 28.4595] },
        });

      const reqId = createRes.body.data._id;

      const updateRes = await request(app)
        .put(`/api/requests/${reqId}`)
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          title: 'Unauthorized Modification Attempt',
        });

      expect(updateRes.status).toBe(403);
      expect(updateRes.body.success).toBe(false);
    });

    test('DELETE /api/requests/:id: Should cancel the request', async () => {
      const createRes = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Request to be cancelled',
          description: 'Testing cancellation lifecycle status transition.',
          category: 'Local Household Help',
          location: { coordinates: [77.0266, 28.4595] },
        });

      const reqId = createRes.body.data._id;

      const delRes = await request(app)
        .delete(`/api/requests/${reqId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ reason: 'Issue resolved independently' });

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);
      expect(delRes.body.data.status).toBe('CANCELLED');
    });
  });

  describe('5.3 Match Recommendations Endpoint', () => {
    test('GET /api/requests/:id/matches: Should return ranked volunteer matches with score breakdowns', async () => {
      // Create request matching Meera's skills and category
      const createRes = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Need 10th grade Mathematics and English tutoring',
          description: 'Weekly tutoring sessions for high school board exams preparation.',
          category: 'Education & Tutoring',
          requiredSkills: ['Mathematics', 'English Tutoring'],
          urgency: 'medium',
          location: {
            coordinates: [77.0300, 28.4650], // ~1km from Meera
          },
        });

      const reqId = createRes.body.data._id;

      const matchRes = await request(app)
        .get(`/api/requests/${reqId}/matches`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(matchRes.status).toBe(200);
      expect(matchRes.body.success).toBe(true);
      expect(matchRes.body.matches.length).toBeGreaterThanOrEqual(1);

      const topMatch = matchRes.body.matches[0];
      expect(topMatch.matchScore).toBeGreaterThan(80);
      expect(topMatch.breakdown.skillScore).toBe(100);
      expect(topMatch.breakdown.categoryScore).toBe(100);
      expect(topMatch.explanation.length).toBeGreaterThan(0);
    });

    test('POST /api/requests/preview-matches: Should preview matches for draft form parameters', async () => {
      const previewRes = await request(app)
        .post('/api/requests/preview-matches')
        .send({
          category: 'Education & Tutoring',
          requiredSkills: ['English Tutoring'],
          location: {
            coordinates: [77.0350, 28.4680],
          },
        });

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.success).toBe(true);
      expect(previewRes.body.matches.length).toBeGreaterThanOrEqual(1);
    });
  });
});
