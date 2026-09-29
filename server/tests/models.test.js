const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const {
  User,
  VolunteerProfile,
  ServiceRequest,
  Assignment,
  Review,
  USER_ROLES,
  SERVICE_CATEGORIES,
  REQUEST_STATUS,
  REQUEST_URGENCY,
} = require('../src/models');

describe('Task 2: Database Schemas & Models Verification', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  test('2.1 User Model: Should hash password, match password, generate token, and hide password', async () => {
    const user = new User({
      name: 'Aarav Sharma',
      email: 'aarav.sharma@example.com',
      password: 'SecurePassword123!',
      role: USER_ROLES.VOLUNTEER,
      location: {
        type: 'Point',
        coordinates: [77.0266, 28.4595],
        city: 'Gurugram',
      },
    });

    await user.save();
    expect(user._id).toBeDefined();
    expect(user.password).not.toBe('SecurePassword123!'); // Hashed

    const isMatch = await user.matchPassword('SecurePassword123!');
    expect(isMatch).toBe(true);

    const isWrongMatch = await user.matchPassword('WrongPassword');
    expect(isWrongMatch).toBe(false);

    const token = user.generateAuthToken();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);

    const json = user.toJSON();
    expect(json.password).toBeUndefined();
  });

  test('2.2 VolunteerProfile Model: Should enforce 2dsphere coordinates and valid categories', async () => {
    const user = await User.create({
      name: 'Priya Patel',
      email: 'priya@example.com',
      password: 'password123',
      role: USER_ROLES.VOLUNTEER,
    });

    const profile = await VolunteerProfile.create({
      user: user._id,
      skills: ['Document Verification', 'English Tutoring'],
      categories: ['Document Assistance', 'Education & Tutoring'],
      serviceRadius: 15,
      location: {
        type: 'Point',
        coordinates: [77.0366, 28.4695],
        city: 'Gurugram',
      },
    });

    expect(profile._id).toBeDefined();
    expect(profile.rating).toBe(5.0);
    expect(profile.serviceRadius).toBe(15);
    expect(profile.categories).toContain('Document Assistance');
  });

  test('2.3 ServiceRequest Model: Should enforce title, category, status lifecycle and GeoJSON coordinates', async () => {
    const requester = await User.create({
      name: 'Rohan Gupta',
      email: 'rohan@example.com',
      password: 'password123',
      role: USER_ROLES.COMMUNITY_MEMBER,
    });

    const request = await ServiceRequest.create({
      requester: requester._id,
      title: 'Assistance with pension paperwork',
      description: 'Need help preparing and organizing document submissions for local authority.',
      category: 'Document Assistance',
      requiredSkills: ['Document Verification'],
      urgency: REQUEST_URGENCY.HIGH,
      location: {
        type: 'Point',
        coordinates: [77.028, 28.455],
        city: 'Gurugram',
      },
    });

    expect(request._id).toBeDefined();
    expect(request.status).toBe(REQUEST_STATUS.PENDING);
    expect(request.urgency).toBe('high');
    expect(request.location.type).toBe('Point');
  });

  test('2.4 Assignment Model: Should store match score and full breakdown', async () => {
    const requester = await User.create({
      name: 'Sunita Mehra',
      email: 'sunita@example.com',
      password: 'password123',
    });

    const volunteer = await User.create({
      name: 'Karan Verma',
      email: 'karan@example.com',
      password: 'password123',
      role: USER_ROLES.VOLUNTEER,
    });

    const request = await ServiceRequest.create({
      requester: requester._id,
      title: 'Help with basic smartphone setup',
      description: 'Senior citizen needs help configuring banking and messaging app.',
      category: 'Technical Support',
      location: {
        type: 'Point',
        coordinates: [77.0266, 28.4595],
      },
    });

    const assignment = await Assignment.create({
      request: request._id,
      volunteer: volunteer._id,
      matchScore: 92.5,
      scoreBreakdown: {
        skillScore: 95,
        distanceScore: 90,
        availabilityScore: 100,
        categoryScore: 100,
        ratingScore: 90,
        calculatedDistanceKm: 1.8,
      },
    });

    expect(assignment._id).toBeDefined();
    expect(assignment.matchScore).toBe(92.5);
    expect(assignment.status).toBe('OFFERED');
    expect(assignment.scoreBreakdown.calculatedDistanceKm).toBe(1.8);
  });

  test('2.5 Review Model: Should automatically recalculate VolunteerProfile rating and ratingCount', async () => {
    const requester1 = await User.create({
      name: 'Member 1',
      email: 'm1@example.com',
      password: 'password123',
    });

    const requester2 = await User.create({
      name: 'Member 2',
      email: 'm2@example.com',
      password: 'password123',
    });

    const volunteer = await User.create({
      name: 'Volunteer Deepak',
      email: 'deepak@example.com',
      password: 'password123',
      role: USER_ROLES.VOLUNTEER,
    });

    const profile = await VolunteerProfile.create({
      user: volunteer._id,
      location: {
        type: 'Point',
        coordinates: [77.0266, 28.4595],
      },
    });

    const req1 = await ServiceRequest.create({
      requester: requester1._id,
      title: 'First completed assistance request',
      description: 'Task completed successfully',
      category: 'Elderly Assistance',
      location: { type: 'Point', coordinates: [77.0266, 28.4595] },
    });

    const req2 = await ServiceRequest.create({
      requester: requester2._id,
      title: 'Second completed assistance request',
      description: 'Second task completed successfully',
      category: 'Elderly Assistance',
      location: { type: 'Point', coordinates: [77.0266, 28.4595] },
    });

    // Add first review: rating 4
    await Review.create({
      request: req1._id,
      volunteer: volunteer._id,
      requester: requester1._id,
      rating: 4,
      feedback: 'Very kind and punctual.',
    });

    let updatedProfile = await VolunteerProfile.findOne({ user: volunteer._id });
    expect(updatedProfile.rating).toBe(4.0);
    expect(updatedProfile.ratingCount).toBe(1);

    // Add second review: rating 5 -> average should become 4.5
    await Review.create({
      request: req2._id,
      volunteer: volunteer._id,
      requester: requester2._id,
      rating: 5,
      feedback: 'Exceptional help, thank you!',
    });

    updatedProfile = await VolunteerProfile.findOne({ user: volunteer._id });
    expect(updatedProfile.rating).toBe(4.5);
    expect(updatedProfile.ratingCount).toBe(2);
  });

  test('2.6 Geospatial 2dsphere: Should query volunteers within distance radius using $nearSphere', async () => {
    // Ensure 2dsphere indexes are built
    await VolunteerProfile.ensureIndexes();

    const u1 = await User.create({ name: 'Near Volunteer', email: 'near@example.com', password: 'password123' });
    const u2 = await User.create({ name: 'Far Volunteer', email: 'far@example.com', password: 'password123' });

    // u1 is ~2km away (Sector 29 Gurugram: 77.062, 28.468)
    await VolunteerProfile.create({
      user: u1._id,
      categories: ['Technical Support'],
      location: { type: 'Point', coordinates: [77.062, 28.468] },
      serviceRadius: 10,
    });

    // u2 is ~30km away (Noida: 77.391, 28.535)
    await VolunteerProfile.create({
      user: u2._id,
      categories: ['Technical Support'],
      location: { type: 'Point', coordinates: [77.391, 28.535] },
      serviceRadius: 10,
    });

    // Query from Cyber City Gurugram: [77.0878, 28.4950] within 10km (10000 meters)
    const nearbyVolunteers = await VolunteerProfile.find({
      location: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [77.0878, 28.4950],
          },
          $maxDistance: 10000, // 10km in meters
        },
      },
    });

    expect(nearbyVolunteers.length).toBe(1);
    expect(nearbyVolunteers[0].user.toString()).toBe(u1._id.toString());
  });
});

