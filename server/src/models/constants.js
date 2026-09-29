/**
 * SevaSetu Core Platform Enums & Constants
 * Single source of truth for database schemas, validation, and matching logic.
 */

const USER_ROLES = {
  COMMUNITY_MEMBER: 'community_member',
  VOLUNTEER: 'volunteer',
  ADMIN: 'admin',
};

const SERVICE_CATEGORIES = [
  'Document Assistance',
  'Elderly Assistance',
  'Education & Tutoring',
  'Technical Support',
  'Essential Item Delivery',
  'Basic Community Assistance',
  'Accessibility Assistance',
  'Local Household Help',
  'Environmental Activities',
  'Other',
];

const REQUEST_URGENCY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

const REQUEST_STATUS = {
  PENDING: 'PENDING',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

const ASSIGNMENT_STATUS = {
  OFFERED: 'OFFERED',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  EXPIRED: 'EXPIRED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const TIME_SLOTS = [
  'morning',    // ~ 08:00 - 12:00
  'afternoon',  // ~ 12:00 - 16:00
  'evening',    // ~ 16:00 - 20:00
  'night',      // ~ 20:00 - 23:00
  'flexible',
];

module.exports = {
  USER_ROLES,
  SERVICE_CATEGORIES,
  REQUEST_URGENCY,
  REQUEST_STATUS,
  ASSIGNMENT_STATUS,
  DAYS_OF_WEEK,
  TIME_SLOTS,
};
