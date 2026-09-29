/**
 * SevaSetu Core Multi-Factor Volunteer Matching Engine
 *
 * Computes explainable compatibility scores between Service Requests and Volunteer Profiles
 * using a multi-factor weighted algorithm:
 *   Match Score = (Skill Score * 0.35)
 *               + (Distance Score * 0.25)
 *               + (Availability Score * 0.20)
 *               + (Category Score * 0.10)
 *               + (Rating Score * 0.10)
 */

const { DAYS_OF_WEEK } = require('../models/constants');

// Algorithm Weights configuration
const DEFAULT_WEIGHTS = {
  SKILL: 0.35,
  DISTANCE: 0.25,
  AVAILABILITY: 0.20,
  CATEGORY: 0.10,
  RATING: 0.10,
};

/**
 * Calculates the great-circle distance between two GeoJSON points using the Haversine formula.
 *
 * @param {Array<number>} coords1 - [longitude, latitude] of point 1
 * @param {Array<number>} coords2 - [longitude, latitude] of point 2
 * @returns {number} Distance in kilometers, rounded to 2 decimal places.
 */
function haversineDistance(coords1, coords2) {
  if (!coords1 || !coords2 || coords1.length < 2 || coords2.length < 2) {
    return Infinity;
  }

  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;

  // Exact same location
  if (lon1 === lon2 && lat1 === lat2) {
    return 0;
  }

  const toRad = (angle) => (angle * Math.PI) / 180;
  const R = 6371; // Earth's mean radius in kilometers

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100;
}

/**
 * Calculates distance decay score (0 - 100) based on volunteer's service radius.
 * Matches project specification: 2.1km with 10km radius yields ~85 score.
 *
 * @param {number} distanceKm - Distance in kilometers
 * @param {number} serviceRadiusKm - Maximum radius volunteer is willing to travel
 * @param {object} options - Optional parameters (e.g. strict radius enforcement)
 * @returns {number} Score from 0 to 100
 */
function calculateDistanceScore(distanceKm, serviceRadiusKm = 10, options = {}) {
  const { strictRadius = false } = options;

  if (distanceKm <= 0) {
    return 100;
  }

  const radius = Math.max(1, serviceRadiusKm);

  // If outside service radius
  if (distanceKm > radius) {
    if (strictRadius) {
      return 0;
    }
    // Smooth exponential decay outside the preferred radius
    const excess = distanceKm - radius;
    const decayedScore = Math.max(0, 30 * Math.exp(-excess / (radius * 0.5)));
    return Math.round(decayedScore * 10) / 10;
  }

  // Linear decay within radius: 100 at 0km down to 30 at radius boundary
  // Formula: 100 - (distance / radius) * 70
  // e.g., at 2.1km / 10km: 100 - 0.21 * 70 = 85.3
  const normalizedScore = 100 - (distanceKm / radius) * 70;
  return Math.round(Math.max(0, Math.min(100, normalizedScore)) * 10) / 10;
}

/**
 * Calculates skill compatibility score (0 - 100) and details.
 *
 * @param {Array<string>} requiredSkills - Skills requested by community member
 * @param {Array<string>} volunteerSkills - Skills possessed by volunteer
 * @returns {object} { score: number, matchedSkills: string[], missingSkills: string[] }
 */
function calculateSkillScore(requiredSkills = [], volunteerSkills = []) {
  // If request has no specific skills required, any volunteer is suitable
  if (!requiredSkills || requiredSkills.length === 0) {
    return {
      score: 100,
      matchedSkills: [],
      missingSkills: [],
      matchRatio: 1,
    };
  }

  const cleanReq = requiredSkills.map((s) => s.trim().toLowerCase());
  const cleanVol = (volunteerSkills || []).map((s) => s.trim().toLowerCase());

  const matchedSkills = [];
  const missingSkills = [];

  cleanReq.forEach((req, idx) => {
    // Check direct match or substring overlap (e.g., "computer" matches "computer repair")
    const isMatched = cleanVol.some(
      (vol) => vol === req || vol.includes(req) || req.includes(vol)
    );

    if (isMatched) {
      matchedSkills.push(requiredSkills[idx]);
    } else {
      missingSkills.push(requiredSkills[idx]);
    }
  });

  const matchRatio = matchedSkills.length / requiredSkills.length;
  const score = Math.round(matchRatio * 100 * 10) / 10;

  return {
    score,
    matchedSkills,
    missingSkills,
    matchRatio,
  };
}

/**
 * Maps arbitrary preferred time strings (e.g. "5:00 PM - 7:00 PM", "17:00-19:00", "morning")
 * into normalized slot buckets.
 *
 * @param {string} timeStr
 * @returns {string} One of 'morning', 'afternoon', 'evening', 'night', 'flexible'
 */
function normalizeTimeSlot(timeStr) {
  if (!timeStr) return 'flexible';

  const lower = timeStr.toLowerCase().trim();

  if (lower.includes('morn') || lower.includes('am')) return 'morning';
  if (lower.includes('afternoon') || lower.includes('noon')) return 'afternoon';
  if (lower.includes('eve') || lower.includes('pm') || lower.includes('17:') || lower.includes('18:') || lower.includes('19:')) return 'evening';
  if (lower.includes('night')) return 'night';
  if (lower.includes('flex')) return 'flexible';

  // Check 24-hr hour format if present (e.g. "17:00")
  const hourMatch = lower.match(/(\d{1,2}):\d{2}/);
  if (hourMatch) {
    const hour = parseInt(hourMatch[1], 10);
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 16) return 'afternoon';
    if (hour >= 16 && hour < 20) return 'evening';
    return 'night';
  }

  return 'flexible';
}

/**
 * Calculates availability score (0 - 100) based on day of week and time slot overlap.
 *
 * @param {Date|string} preferredDate - Target date requested
 * @param {string} preferredTime - Preferred time window
 * @param {Array<object>} volunteerAvailability - [{ day: 'Saturday', slots: ['morning'] }]
 * @returns {object} { score: number, matchedDay: string, matchedSlot: string }
 */
function calculateAvailabilityScore(preferredDate, preferredTime, volunteerAvailability = []) {
  if (!volunteerAvailability || volunteerAvailability.length === 0) {
    return { score: 50, matchedDay: null, matchedSlot: null, reason: 'No availability schedule listed' };
  }

  // If no date or time was requested, request is fully open
  if (!preferredDate && !preferredTime) {
    return { score: 100, matchedDay: 'Any', matchedSlot: 'Flexible', reason: 'Open scheduling' };
  }

  let targetDay = null;
  if (preferredDate) {
    const dateObj = new Date(preferredDate);
    if (!isNaN(dateObj.getTime())) {
      const dayIndex = dateObj.getDay(); // 0 is Sunday, 1 is Monday ...
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      targetDay = days[dayIndex];
    }
  }

  const targetSlot = normalizeTimeSlot(preferredTime);

  // Check if volunteer has slots for target day
  let bestDayMatch = null;
  let hasExactSlot = false;
  let hasFlexibleSlot = false;

  for (const avail of volunteerAvailability) {
    // If target day specified, match day; if not specified, consider any available day
    const dayMatches = !targetDay || avail.day === targetDay;

    if (dayMatches) {
      bestDayMatch = avail.day;
      const slots = (avail.slots || []).map((s) => s.toLowerCase());

      if (slots.includes(targetSlot) || targetSlot === 'flexible') {
        hasExactSlot = true;
        break;
      }
      if (slots.includes('flexible')) {
        hasFlexibleSlot = true;
      }
    }
  }

  if (targetDay && !bestDayMatch) {
    // Target day does not match volunteer's listed active days
    return {
      score: 20,
      matchedDay: null,
      matchedSlot: null,
      reason: `Volunteer is not scheduled for ${targetDay}`,
    };
  }

  if (hasExactSlot) {
    return {
      score: 100,
      matchedDay: bestDayMatch || targetDay,
      matchedSlot: targetSlot,
      reason: 'Perfect day and time slot alignment',
    };
  }

  if (hasFlexibleSlot) {
    return {
      score: 95,
      matchedDay: bestDayMatch || targetDay,
      matchedSlot: 'flexible',
      reason: 'Volunteer is flexible on requested day',
    };
  }

  // Day matches but time slot differed
  return {
    score: 75,
    matchedDay: bestDayMatch || targetDay,
    matchedSlot: 'other_slot',
    reason: `Available on ${bestDayMatch || targetDay} with different time window`,
  };
}

/**
 * Calculates category relevance score (0 - 100).
 *
 * @param {string} requestCategory - Category of the request
 * @param {Array<string>} volunteerCategories - Categories volunteer opted into
 * @returns {number} Score from 0 to 100
 */
function calculateCategoryScore(requestCategory, volunteerCategories = []) {
  if (!requestCategory) return 50;

  const categories = volunteerCategories || [];

  // Exact category match
  if (categories.includes(requestCategory)) {
    return 100;
  }

  // General assistance categories provide broad cross-category support
  if (
    categories.includes('Basic Community Assistance') ||
    categories.includes('Other')
  ) {
    return 75;
  }

  // Partial match fallback
  return 15;
}

/**
 * Normalizes volunteer rating (0 - 5.0 scale) and historical completed tasks into 0 - 100 score.
 *
 * @param {number} rating - Average star rating (0 - 5)
 * @param {number} completedTasks - Total tasks completed
 * @returns {number} Score from 0 to 100
 */
function calculateRatingScore(rating = 5.0, completedTasks = 0) {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 5.0));

  // Normalized base rating: 4.8 / 5.0 * 100 = 96
  const baseRatingScore = (safeRating / 5) * 100;

  // Completed tasks small reliability stabilizer (up to +5% capped at 100)
  const experienceBonus = Math.min(5, Math.floor(completedTasks / 5));
  const finalScore = Math.min(100, baseRatingScore + (completedTasks > 0 ? experienceBonus : 0));

  return Math.round(finalScore * 10) / 10;
}

/**
 * Generates clear, human-readable explanations of why this volunteer matched.
 *
 * @param {object} breakdown - Calculated score breakdown
 * @param {object} skillResult - Skill match details
 * @param {number} distanceKm - Distance in km
 * @param {number} serviceRadius - Volunteer's radius
 * @returns {Array<string>} List of concise explanation bullets
 */
function generateMatchExplanation(breakdown, skillResult, distanceKm, serviceRadius) {
  const reasons = [];

  // Distance reason
  if (distanceKm <= 1) {
    reasons.push(`In your immediate neighborhood (${distanceKm} km away)`);
  } else if (distanceKm <= serviceRadius) {
    reasons.push(`Located ${distanceKm} km away (within ${serviceRadius} km service radius)`);
  } else {
    reasons.push(`${distanceKm} km away (exceeds preferred ${serviceRadius} km radius)`);
  }

  // Skill reason
  if (skillResult.matchedSkills && skillResult.matchedSkills.length > 0) {
    reasons.push(`Matches ${skillResult.matchedSkills.length} required skill(s): ${skillResult.matchedSkills.join(', ')}`);
  } else if (skillResult.score === 100) {
    reasons.push('General community request (no specialized skills required)');
  } else {
    reasons.push('Does not have all requested skills, but general category aligns');
  }

  // Category reason
  if (breakdown.categoryScore === 100) {
    reasons.push('Registered specialist in this exact service category');
  } else if (breakdown.categoryScore >= 75) {
    reasons.push('Active in general community assistance');
  }

  // Availability reason
  if (breakdown.availabilityScore >= 95) {
    reasons.push('Available during requested schedule window');
  }

  // Rating reason
  if (breakdown.ratingScore >= 90) {
    reasons.push('High community trust rating');
  }

  return reasons;
}

/**
 * Computes composite match score and full breakdown for a single volunteer profile against a request.
 *
 * @param {object} request - ServiceRequest document or object
 * @param {object} volunteerProfile - VolunteerProfile document or object
 * @param {object} options - Weights and strictness options
 * @returns {object} { matchScore, breakdown, explanation }
 */
function calculateMatchScore(request, volunteerProfile, options = {}) {
  const weights = { ...DEFAULT_WEIGHTS, ...(options.weights || {}) };

  // 1. Distance Calculation
  const reqCoords = request.location?.coordinates || [77.0266, 28.4595];
  const volCoords = volunteerProfile.location?.coordinates || [77.0266, 28.4595];
  const distanceKm = haversineDistance(reqCoords, volCoords);
  const serviceRadius = volunteerProfile.serviceRadius || 10;
  const distanceScore = calculateDistanceScore(distanceKm, serviceRadius, options);

  // 2. Skill Compatibility
  const skillResult = calculateSkillScore(request.requiredSkills, volunteerProfile.skills);

  // 3. Availability
  const availResult = calculateAvailabilityScore(
    request.preferredDate,
    request.preferredTime,
    volunteerProfile.availability
  );

  // 4. Category Relevance
  const categoryScore = calculateCategoryScore(request.category, volunteerProfile.categories);

  // 5. Rating & Experience
  const ratingScore = calculateRatingScore(
    volunteerProfile.rating,
    volunteerProfile.completedTasks
  );

  // Composite Weighted Sum
  const compositeScore =
    skillResult.score * weights.SKILL +
    distanceScore * weights.DISTANCE +
    availResult.score * weights.AVAILABILITY +
    categoryScore * weights.CATEGORY +
    ratingScore * weights.RATING;

  const matchScore = Math.round(Math.max(0, Math.min(100, compositeScore)) * 10) / 10;

  const breakdown = {
    skillScore: skillResult.score,
    distanceScore,
    availabilityScore: availResult.score,
    categoryScore,
    ratingScore,
    calculatedDistanceKm: distanceKm,
    matchedSkills: skillResult.matchedSkills,
    missingSkills: skillResult.missingSkills,
  };

  const explanation = generateMatchExplanation(breakdown, skillResult, distanceKm, serviceRadius);

  return {
    matchScore,
    breakdown,
    explanation,
  };
}

/**
 * Ranks an array of volunteer profiles for a given request.
 *
 * @param {object} request - ServiceRequest object
 * @param {Array<object>} volunteerProfiles - Array of VolunteerProfile objects
 * @param {object} options - Options including weights and limit
 * @returns {Array<object>} Sorted array of matches with scores and explanations
 */
function rankVolunteers(request, volunteerProfiles = [], options = {}) {
  const { minScore = 0, limit = null } = options;

  const results = volunteerProfiles
    .map((profile) => {
      const { matchScore, breakdown, explanation } = calculateMatchScore(request, profile, options);
      return {
        volunteerProfile: profile,
        user: profile.user,
        matchScore,
        breakdown,
        explanation,
      };
    })
    .filter((match) => match.matchScore >= minScore)
    .sort((a, b) => b.matchScore - a.matchScore);

  if (limit && limit > 0) {
    return results.slice(0, limit);
  }

  return results;
}

/**
 * Queries MongoDB for candidate volunteers and ranks them for a request.
 *
 * @param {object|string} requestOrId - ServiceRequest document or ObjectId
 * @param {object} options - Query & ranking options
 * @returns {Promise<Array<object>>} Ranked list of matching volunteers
 */
async function findMatchesForRequest(requestOrId, options = {}) {
  const mongoose = require('mongoose');
  const ServiceRequest = mongoose.model('ServiceRequest');
  const VolunteerProfile = mongoose.model('VolunteerProfile');

  let request = requestOrId;
  if (typeof requestOrId === 'string' || requestOrId instanceof mongoose.Types.ObjectId) {
    request = await ServiceRequest.findById(requestOrId);
    if (!request) {
      throw new Error(`ServiceRequest ${requestOrId} not found`);
    }
  }

  const {
    maxSearchRadiusMeters = 50000, // 50 km initial search window
    limit = 10,
    minScore = 20,
  } = options;

  // Find candidate active volunteers
  const query = {
    isActive: true,
  };

  // If request has valid coordinates, leverage geospatial index
  if (
    request.location?.coordinates &&
    Array.isArray(request.location.coordinates) &&
    request.location.coordinates.length === 2
  ) {
    query.location = {
      $nearSphere: {
        $geometry: {
          type: 'Point',
          coordinates: request.location.coordinates,
        },
        $maxDistance: maxSearchRadiusMeters,
      },
    };
  }

  const candidates = await VolunteerProfile.find(query).populate('user');

  return rankVolunteers(request, candidates, { minScore, limit, ...options });
}

module.exports = {
  DEFAULT_WEIGHTS,
  haversineDistance,
  calculateDistanceScore,
  calculateSkillScore,
  calculateAvailabilityScore,
  calculateCategoryScore,
  calculateRatingScore,
  calculateMatchScore,
  rankVolunteers,
  findMatchesForRequest,
  normalizeTimeSlot,
  generateMatchExplanation,
};
