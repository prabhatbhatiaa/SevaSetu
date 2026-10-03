/**
 * SevaSetu Demo & Production Database Seeder
 *
 * Usage:
 *   node src/seeds/seedData.js              -> Seeds realistic Indian community volunteers, requests, assignments & reviews from seed.json
 *   node src/seeds/seedData.js --clean      -> Completely wipes all collections (Production reset)
 *   node src/seeds/seedData.js --admin-only -> Bootstraps only the Super Admin account (Production init)
 */

const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const {
  User,
  VolunteerProfile,
  ServiceRequest,
  Assignment,
  Review,
} = require('../models');

const { calculateMatchScore } = require('../algorithms/volunteerMatcher');

// Import structured mock data
const seedData = require('./seed.json');

// Colors for terminal output
const cyan = '\x1b[36m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';
const reset = '\x1b[0m';
const bold = '\x1b[1m';

/**
 * Connect to MongoDB database
 */
const connect = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sevasetu';
  console.log(`${cyan}Connecting to MongoDB database...${reset}`);
  await mongoose.connect(uri);
  console.log(`${green}MongoDB Connected successfully: ${mongoose.connection.host} / ${mongoose.connection.name}${reset}`);
};

/**
 * Wipe all SevaSetu collections
 */
const cleanDatabase = async () => {
  console.log(`${yellow}Purging existing database collections...${reset}`);
  await Promise.all([
    User.deleteMany({}),
    VolunteerProfile.deleteMany({}),
    ServiceRequest.deleteMany({}),
    Assignment.deleteMany({}),
    Review.deleteMany({}),
  ]);
  console.log(`${green}✔ All collections wiped clean.${reset}`);
};

/**
 * Seed Super Admin account from seed.json
 */
const seedAdmin = async () => {
  const admin = await User.create(seedData.admin);
  console.log(`${green}✔ Super Admin created: ${bold}${admin.email}${reset} (password: ${seedData.admin.password})`);
  return admin;
};

/**
 * Seed full demo dataset from seed.json (Admin, Volunteers, Community Members, Requests, Assignments, Reviews)
 */
const seedDemoData = async () => {
  await cleanDatabase();

  console.log(`\n${cyan}${bold}--- [1/5] Bootstrapping Admin Account ---${reset}`);
  await seedAdmin();

  console.log(`\n${cyan}${bold}--- [2/5] Creating Community Members ---${reset}`);
  const members = await User.create(seedData.communityMembers);
  console.log(`${green}✔ Created ${members.length} community members (password: Password123!)${reset}`);

  console.log(`\n${cyan}${bold}--- [3/5] Creating Volunteers & Profiles ---${reset}`);
  const createdVolunteers = [];
  for (const item of seedData.volunteers) {
    const userDoc = await User.create(item.user);
    const profileDoc = await VolunteerProfile.create({
      user: userDoc._id,
      location: item.user.location,
      ...item.profile,
    });
    createdVolunteers.push({ user: userDoc, profile: profileDoc });
  }
  console.log(`${green}✔ Created ${createdVolunteers.length} volunteer accounts & profiles (password: Password123!)${reset}`);

  console.log(`\n${cyan}${bold}--- [4/5] Creating Diverse Community Service Requests ---${reset}`);
  const createdRequests = [];
  for (const reqItem of seedData.requests) {
    const requester = members[reqItem.requesterIndex];
    const assignedVolunteer = reqItem.assignedVolunteerIndex !== undefined
      ? createdVolunteers[reqItem.assignedVolunteerIndex].user._id
      : undefined;

    const requestDoc = await ServiceRequest.create({
      requester: requester._id,
      title: reqItem.title,
      description: reqItem.description,
      category: reqItem.category,
      requiredSkills: reqItem.requiredSkills,
      urgency: reqItem.urgency,
      preferredDate: reqItem.relativeDaysPreferred
        ? new Date(Date.now() + 86400000 * reqItem.relativeDaysPreferred)
        : undefined,
      preferredTime: reqItem.preferredTime,
      location: requester.location,
      status: reqItem.status,
      assignedVolunteer,
      assignedAt: reqItem.relativeHoursAssignedAgo
        ? new Date(Date.now() - 3600000 * reqItem.relativeHoursAssignedAgo)
        : reqItem.relativeDaysAssignedAgo
        ? new Date(Date.now() - 86400000 * reqItem.relativeDaysAssignedAgo)
        : undefined,
      completedAt: reqItem.relativeDaysCompletedAgo
        ? new Date(Date.now() - 86400000 * reqItem.relativeDaysCompletedAgo)
        : undefined,
    });
    createdRequests.push(requestDoc);
  }
  console.log(`${green}✔ Created ${createdRequests.length} service requests across lifecycle states (Pending, Assigned, In Progress, Completed)${reset}`);

  console.log(`\n${cyan}${bold}--- [5/5] Creating Assignments & Reviews ---${reset}`);
  // Create assignments defined on requests
  for (let i = 0; i < seedData.requests.length; i++) {
    const reqItem = seedData.requests[i];
    if (reqItem.assignedVolunteerIndex !== undefined && reqItem.assignmentStatus) {
      const vol = createdVolunteers[reqItem.assignedVolunteerIndex];
      const matchCalc = calculateMatchScore(createdRequests[i], vol.profile);

      await Assignment.create({
        request: createdRequests[i]._id,
        volunteer: vol.user._id,
        matchScore: matchCalc.matchScore,
        scoreBreakdown: matchCalc.breakdown,
        status: reqItem.assignmentStatus,
        offeredAt: createdRequests[i].assignedAt || new Date(),
        respondedAt: reqItem.relativeHoursRespondedAgo
          ? new Date(Date.now() - 3600000 * reqItem.relativeHoursRespondedAgo)
          : reqItem.relativeDaysAssignedAgo
          ? new Date(Date.now() - 86400000 * reqItem.relativeDaysAssignedAgo)
          : undefined,
        completedAt: createdRequests[i].completedAt,
        notes: reqItem.assignmentNotes || 'Assignment generated during seeding.',
      });
    }
  }

  // Create reviews
  const reviewsToCreate = seedData.reviews.map((rev) => ({
    request: createdRequests[rev.requestIndex]._id,
    volunteer: createdVolunteers[rev.volunteerIndex].user._id,
    requester: members[rev.requesterIndex]._id,
    rating: rev.rating,
    feedback: rev.feedback,
  }));

  await Review.create(reviewsToCreate);
  console.log(`${green}✔ Created assignments & verified reviews with automatic rating synchronization.${reset}`);

  console.log(`\n${green}${bold}========================================================================${reset}`);
  console.log(`${green}${bold}  SevaSetu Demo Seeding Completed Successfully!${reset}`);
  console.log(`${green}${bold}========================================================================${reset}`);
  console.log(`
  ${bold}Demo Credentials for Testing:${reset}
  -------------------------------------------------------------
  👑 ${bold}Administrator:${reset}       admin@sevasetu.org         (pass: AdminPassword123!)
  🙋 ${bold}Volunteer (Tech):${reset}     rahul.volunteer@example.com (pass: Password123!)
  🙋 ${bold}Volunteer (Tutor):${reset}    ananya.volunteer@example.com (pass: Password123!)
  🙋 ${bold}Volunteer (Elderly):${reset}  vikram.volunteer@example.com (pass: Password123!)
  🤝 ${bold}Community Member:${reset}    sunita.mehra@example.com    (pass: Password123!)
  🤝 ${bold}Community Member:${reset}    aarav.sharma@example.com    (pass: Password123!)
  -------------------------------------------------------------
  `);
};

/**
 * Main execution handler with CLI argument router
 */
const run = async () => {
  try {
    await connect();

    const args = process.argv.slice(2);
    const isCleanOnly = args.includes('--clean') || args.includes('-c');
    const isAdminOnly = args.includes('--admin-only') || args.includes('-a');
    const isForce = args.includes('--force');

    // Production safety check
    if (process.env.NODE_ENV === 'production' && !isForce) {
      console.warn(`${red}${bold}CAUTION: Running in PRODUCTION mode!${reset}`);
      console.warn(`${yellow}To proceed with resetting database in production, pass '--force'.${reset}`);
      process.exit(1);
    }

    if (isCleanOnly) {
      await cleanDatabase();
      console.log(`\n${green}${bold}Database successfully wiped clean for production.${reset}\n`);
    } else if (isAdminOnly) {
      await cleanDatabase();
      await seedAdmin();
      console.log(`\n${green}${bold}Database bootstrapped with Super Admin only for production launch.${reset}\n`);
    } else {
      await seedDemoData();
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(`\n${red}${bold}Seeding Error: ${err.message}${reset}`);
    console.error(err.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
};

run();
