const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const { User, VolunteerProfile, USER_ROLES } = require('../src/models');

describe('Task 4: Authentication and User Management APIs', () => {
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

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe('4.2 POST /api/auth/register', () => {
    test('Should register a new community member successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Pooja Verma',
          email: 'pooja.verma@example.com',
          password: 'Password123!',
          role: USER_ROLES.COMMUNITY_MEMBER,
          phone: '+919876543210',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('pooja.verma@example.com');
      expect(res.body.user.password).toBeUndefined(); // ensure password never exposed
      expect(res.body.user.role).toBe(USER_ROLES.COMMUNITY_MEMBER);
    });

    test('Should register volunteer and automatically create linked VolunteerProfile', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Amitabh Sen',
          email: 'amitabh@example.com',
          password: 'Password123!',
          role: USER_ROLES.VOLUNTEER,
          skills: ['Document Verification', 'Elderly Care'],
          categories: ['Document Assistance', 'Elderly Assistance'],
          location: {
            type: 'Point',
            coordinates: [77.0266, 28.4595],
            city: 'Gurugram',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.volunteerProfile).toBeDefined();

      const profile = await VolunteerProfile.findOne({ user: res.body.user._id });
      expect(profile).not.toBeNull();
      expect(profile.skills).toContain('Document Verification');
      expect(profile.categories).toContain('Document Assistance');
      expect(profile.rating).toBe(5.0);
    });

    test('Should reject registration with duplicate email address', async () => {
      await User.create({
        name: 'Existing User',
        email: 'duplicate@example.com',
        password: 'Password123!',
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Another User',
          email: 'duplicate@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    test('Should fail validation with weak password or malformed email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'A',
          email: 'not-an-email',
          password: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('4.3 POST /api/auth/login', () => {
    beforeEach(async () => {
      await User.create({
        name: 'Vikram Seth',
        email: 'vikram@example.com',
        password: 'ValidPassword123',
        role: USER_ROLES.COMMUNITY_MEMBER,
      });
    });

    test('Should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'vikram@example.com',
          password: 'ValidPassword123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.name).toBe('Vikram Seth');
    });

    test('Should reject login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'vikram@example.com',
          password: 'WrongPassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });

    test('Should reject login for non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'ValidPassword123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('4.4 Current User Profile & Password Updates (GET /me, PUT /profile, PUT /change-password)', () => {
    let token;
    let userId;

    beforeEach(async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Neha Roy',
          email: 'neha@example.com',
          password: 'InitialPassword123',
          role: USER_ROLES.VOLUNTEER,
          phone: '+919999988888',
        });

      token = regRes.body.token;
      userId = regRes.body.user._id;
    });

    test('GET /api/auth/me: Should return current user profile and linked volunteer profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('neha@example.com');
      expect(res.body.volunteerProfile).toBeDefined();
    });

    test('GET /api/auth/me: Should deny access without Bearer token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('PUT /api/auth/profile: Should update profile and sync volunteer location', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Neha Roy Kapoor',
          phone: '+918888877777',
          location: {
            coordinates: [77.0878, 28.4950],
            city: 'DLF Cyber City, Gurugram',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Neha Roy Kapoor');
      expect(res.body.data.phone).toBe('+918888877777');
      expect(res.body.data.location.city).toBe('DLF Cyber City, Gurugram');

      // Check VolunteerProfile location synced
      const profile = await VolunteerProfile.findOne({ user: userId });
      expect(profile.location.coordinates).toEqual([77.0878, 28.4950]);
    });

    test('PUT /api/auth/change-password: Should change password and allow login with new password', async () => {
      // First change password
      const changeRes = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'InitialPassword123',
          newPassword: 'BrandNewSecurePassword456',
        });

      expect(changeRes.status).toBe(200);
      expect(changeRes.body.success).toBe(true);

      // Verify old password no longer works
      const oldLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'neha@example.com',
          password: 'InitialPassword123',
        });
      expect(oldLogin.status).toBe(401);

      // Verify new password logs in successfully
      const newLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'neha@example.com',
          password: 'BrandNewSecurePassword456',
        });
      expect(newLogin.status).toBe(200);
      expect(newLogin.body.token).toBeDefined();
    });
  });

  describe('4.5 Security & Hardening Verification', () => {
    test('Should return security headers (Helmet)', async () => {
      const res = await request(app).get('/');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    });

    test('Should reject tampered or invalid JWT signature', async () => {
      const tamperedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYwYzcyYjJmOWIwYjExMDAxNThjMTExMSIsInJvbGUiOiJ2b2x1bnRlZXIifQ.tampered_signature_string';
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid authentication token');
    });

    test('Should reject JWT issued with mismatched audience or issuer', async () => {
      const jwt = require('jsonwebtoken');
      const fakeToken = jwt.sign(
        { id: new mongoose.Types.ObjectId(), role: USER_ROLES.VOLUNTEER },
        process.env.JWT_SECRET || 'sevasetu_super_secure_jwt_secret_dev_key_2026_sdg',
        { issuer: 'untrusted-issuer', audience: 'wrong-audience', expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${fakeToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
