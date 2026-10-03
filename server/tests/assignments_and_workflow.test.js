const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const {
  User,
  VolunteerProfile,
  ServiceRequest,
  Assignment,
  USER_ROLES,
  REQUEST_STATUS,
  ASSIGNMENT_STATUS,
} = require('../src/models');

describe('Task 6: Assignment Workflow & Lifecycle State Engine Integration Tests', () => {
  let mongoServer;
  let memberToken;
  let memberUser;
  let volunteerToken;
  let volunteerUser;
  let volunteerProfile;
  let otherVolunteerToken;
  let otherVolunteerUser;

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
        name: 'Sunita Sharma',
        email: 'sunita@example.com',
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

    // Register primary volunteer
    const volRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Karan Mehra',
        email: 'karan@example.com',
        password: 'Password123!',
        role: USER_ROLES.VOLUNTEER,
        skills: ['Computer Repair', 'Hardware Setup'],
        categories: ['Technical Support'],
        location: {
          type: 'Point',
          coordinates: [77.0280, 28.4610], // ~200m away
          city: 'Gurugram',
        },
      });

    volunteerToken = volRes.body.token;
    volunteerUser = volRes.body.user;
    volunteerProfile = await VolunteerProfile.findOne({ user: volunteerUser._id });

    // Register secondary volunteer
    const otherVolRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Ritu Jain',
        email: 'ritu@example.com',
        password: 'Password123!',
        role: USER_ROLES.VOLUNTEER,
        skills: ['Gardening'],
        categories: ['Environmental Activities'],
        location: {
          type: 'Point',
          coordinates: [77.0300, 28.4600],
          city: 'Gurugram',
        },
      });

    otherVolunteerToken = otherVolRes.body.token;
    otherVolunteerUser = otherVolRes.body.user;
  });

  describe('6.1 POST /api/assignments (Creation & Offer / Self-claim)', () => {
    let serviceRequest;

    beforeEach(async () => {
      serviceRequest = await ServiceRequest.create({
        requester: memberUser._id,
        title: 'Desktop PC not booting up',
        description: 'Need help diagnosing power supply issue on desktop computer.',
        category: 'Technical Support',
        requiredSkills: ['Computer Repair'],
        urgency: 'high',
        location: {
          type: 'Point',
          coordinates: [77.0266, 28.4595],
          city: 'Gurugram',
        },
        status: REQUEST_STATUS.PENDING,
      });
    });

    test('Requester can offer assignment to a matched volunteer', async () => {
      const res = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          requestId: serviceRequest._id,
          volunteerId: volunteerUser._id,
          notes: 'Please let us know if you can assist this evening.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ASSIGNMENT_STATUS.OFFERED);
      expect(res.body.data.matchScore).toBeGreaterThan(70);
      expect(res.body.data.scoreBreakdown.skillScore).toBe(100);

      // Verify ServiceRequest transitioned to ASSIGNED
      const updatedReq = await ServiceRequest.findById(serviceRequest._id);
      expect(updatedReq.status).toBe(REQUEST_STATUS.ASSIGNED);
      expect(updatedReq.assignedVolunteer.toString()).toBe(volunteerUser._id.toString());
      expect(updatedReq.assignedAt).toBeDefined();
    });

    test('Volunteer can self-claim an open pending request directly', async () => {
      const res = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          requestId: serviceRequest._id,
          notes: 'I am nearby and can help right away!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ASSIGNMENT_STATUS.ACCEPTED);

      // Verify ServiceRequest transitioned directly to IN_PROGRESS
      const updatedReq = await ServiceRequest.findById(serviceRequest._id);
      expect(updatedReq.status).toBe(REQUEST_STATUS.IN_PROGRESS);
      expect(updatedReq.assignedVolunteer.toString()).toBe(volunteerUser._id.toString());
    });

    test('Should reject assignment creation if request is not PENDING', async () => {
      serviceRequest.status = REQUEST_STATUS.IN_PROGRESS;
      await serviceRequest.save();

      const res = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          requestId: serviceRequest._id,
          volunteerId: volunteerUser._id,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not open for assignment');
    });

    test('Should reject duplicate active assignment for the same volunteer and request', async () => {
      // Create first assignment
      await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          requestId: serviceRequest._id,
          volunteerId: volunteerUser._id,
        });

      // Reset request status to pending directly in DB for testing duplicate check
      await ServiceRequest.findByIdAndUpdate(serviceRequest._id, { status: REQUEST_STATUS.PENDING });

      const duplicateRes = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          requestId: serviceRequest._id,
          volunteerId: volunteerUser._id,
        });

      expect(duplicateRes.status).toBe(400);
      expect(duplicateRes.body.success).toBe(false);
      expect(duplicateRes.body.message).toContain('active assignment already exists');
    });
  });

  describe('6.2 PUT /api/assignments/:id/respond (Accept or Decline Lifecycle)', () => {
    let serviceRequest;
    let assignment;

    beforeEach(async () => {
      serviceRequest = await ServiceRequest.create({
        requester: memberUser._id,
        title: 'Help troubleshooting home wifi router',
        description: 'Wifi router not assigning IP addresses.',
        category: 'Technical Support',
        location: { type: 'Point', coordinates: [77.0266, 28.4595] },
        status: REQUEST_STATUS.ASSIGNED,
        assignedVolunteer: volunteerUser._id,
      });

      assignment = await Assignment.create({
        request: serviceRequest._id,
        volunteer: volunteerUser._id,
        matchScore: 90,
        status: ASSIGNMENT_STATUS.OFFERED,
      });
    });

    test('Volunteer accepts offered assignment: transitions to ACCEPTED & IN_PROGRESS', async () => {
      const res = await request(app)
        .put(`/api/assignments/${assignment._id}/respond`)
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({ action: 'accept', notes: 'Accepted, heading over soon.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ASSIGNMENT_STATUS.ACCEPTED);

      const updatedReq = await ServiceRequest.findById(serviceRequest._id);
      expect(updatedReq.status).toBe(REQUEST_STATUS.IN_PROGRESS);
    });

    test('Volunteer declines offered assignment: reverts ServiceRequest to PENDING', async () => {
      const res = await request(app)
        .put(`/api/assignments/${assignment._id}/respond`)
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({ action: 'decline', notes: 'Sorry, unavailable at this hour.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ASSIGNMENT_STATUS.DECLINED);

      const updatedReq = await ServiceRequest.findById(serviceRequest._id);
      expect(updatedReq.status).toBe(REQUEST_STATUS.PENDING);
      expect(updatedReq.assignedVolunteer).toBeNull();
      expect(updatedReq.assignedAt).toBeNull();
    });

    test('Unauthorized user cannot respond to assignment (403)', async () => {
      const res = await request(app)
        .put(`/api/assignments/${assignment._id}/respond`)
        .set('Authorization', `Bearer ${otherVolunteerToken}`)
        .send({ action: 'accept' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('6.3 PUT /api/assignments/:id/complete (Task Completion & Stats Increment)', () => {
    let serviceRequest;
    let assignment;

    beforeEach(async () => {
      serviceRequest = await ServiceRequest.create({
        requester: memberUser._id,
        title: 'Printer setup assistance',
        description: 'Need assistance connecting wireless printer.',
        category: 'Technical Support',
        location: { type: 'Point', coordinates: [77.0266, 28.4595] },
        status: REQUEST_STATUS.IN_PROGRESS,
        assignedVolunteer: volunteerUser._id,
      });

      assignment = await Assignment.create({
        request: serviceRequest._id,
        volunteer: volunteerUser._id,
        matchScore: 92,
        status: ASSIGNMENT_STATUS.ACCEPTED,
      });
    });

    test('Marks assignment and request COMPLETED, and increments volunteer completedTasks count', async () => {
      const initialProfile = await VolunteerProfile.findOne({ user: volunteerUser._id });
      const initialCount = initialProfile.completedTasks || 0;

      const res = await request(app)
        .put(`/api/assignments/${assignment._id}/complete`)
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({ notes: 'Printer driver installed and test page printed.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ASSIGNMENT_STATUS.COMPLETED);
      expect(res.body.data.completedAt).toBeDefined();

      const updatedReq = await ServiceRequest.findById(serviceRequest._id);
      expect(updatedReq.status).toBe(REQUEST_STATUS.COMPLETED);
      expect(updatedReq.completedAt).toBeDefined();

      const updatedProfile = await VolunteerProfile.findOne({ user: volunteerUser._id });
      expect(updatedProfile.completedTasks).toBe(initialCount + 1);
    });

    test('Cannot complete task if assignment is not ACCEPTED', async () => {
      assignment.status = ASSIGNMENT_STATUS.OFFERED;
      await assignment.save();

      const res = await request(app)
        .put(`/api/assignments/${assignment._id}/complete`)
        .set('Authorization', `Bearer ${volunteerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('6.4 Volunteer Matched Requests Feed (GET /api/volunteers/matched-requests)', () => {
    beforeEach(async () => {
      // Create a high-matching technical support request nearby
      await ServiceRequest.create({
        requester: memberUser._id,
        title: 'Laptop screen replacement guidance',
        description: 'Need help installing replacement screen on laptop.',
        category: 'Technical Support',
        requiredSkills: ['Computer Repair'],
        location: { type: 'Point', coordinates: [77.0270, 28.4600] },
        status: REQUEST_STATUS.PENDING,
      });

      // Create an unrelated request far away
      await ServiceRequest.create({
        requester: memberUser._id,
        title: 'Tree planting in community park',
        description: 'Help needed planting saplings.',
        category: 'Environmental Activities',
        location: { type: 'Point', coordinates: [77.2000, 28.6000] },
        status: REQUEST_STATUS.PENDING,
      });
    });

    test('Returns pending requests ranked by match score for calling volunteer', async () => {
      const res = await request(app)
        .get('/api/volunteers/matched-requests')
        .set('Authorization', `Bearer ${volunteerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBeGreaterThanOrEqual(1);

      const topMatch = res.body.data[0];
      expect(topMatch.request.title).toBe('Laptop screen replacement guidance');
      expect(topMatch.matchScore).toBeGreaterThan(80);
      expect(topMatch.breakdown.skillScore).toBe(100);
      expect(topMatch.explanation.length).toBeGreaterThan(0);
    });
  });

  describe('6.5 Assignment Queries (GET /api/assignments & GET /api/assignments/:id)', () => {
    let assignment;

    beforeEach(async () => {
      const reqDoc = await ServiceRequest.create({
        requester: memberUser._id,
        title: 'Smartphone tutoring for senior',
        description: 'Need patient guidance on messaging app.',
        category: 'Technical Support',
        location: { type: 'Point', coordinates: [77.0266, 28.4595] },
        status: REQUEST_STATUS.ASSIGNED,
      });

      assignment = await Assignment.create({
        request: reqDoc._id,
        volunteer: volunteerUser._id,
        matchScore: 88,
        status: ASSIGNMENT_STATUS.OFFERED,
      });
    });

    test('Volunteer can retrieve their assignments list', async () => {
      const res = await request(app)
        .get('/api/assignments')
        .set('Authorization', `Bearer ${volunteerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0]._id.toString()).toBe(assignment._id.toString());
    });

    test('Requester can view assignment details for their request', async () => {
      const res = await request(app)
        .get(`/api/assignments/${assignment._id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.volunteer.name).toBe('Karan Mehra');
    });

    test('Unrelated volunteer cannot view assignment details (403)', async () => {
      const res = await request(app)
        .get(`/api/assignments/${assignment._id}`)
        .set('Authorization', `Bearer ${otherVolunteerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
