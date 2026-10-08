import {
  Accessibility,
  FileText,
  GraduationCap,
  HeartHandshake,
  Home,
  Laptop,
  PackageCheck,
  Sparkles,
  Trees,
  Users,
} from 'lucide-react';

// Mirrors server/src/models/constants.js — keep the two in sync.
export const CATEGORIES = [
  {
    name: 'Document Assistance',
    icon: FileText,
    blurb: 'Forms, pensions, certificates and the paperwork that gets stuck.',
  },
  {
    name: 'Elderly Assistance',
    icon: HeartHandshake,
    blurb: 'Company, errands and a steady hand for older neighbours.',
  },
  {
    name: 'Education & Tutoring',
    icon: GraduationCap,
    blurb: 'Homework help, exam prep and patient explanations.',
  },
  {
    name: 'Technical Support',
    icon: Laptop,
    blurb: 'Phones, banking apps, UPI and everyday tech made simple.',
  },
  {
    name: 'Essential Item Delivery',
    icon: PackageCheck,
    blurb: 'Medicines and groceries picked up and dropped home.',
  },
  {
    name: 'Basic Community Assistance',
    icon: Users,
    blurb: 'The small favours that keep a neighbourhood running.',
  },
  {
    name: 'Accessibility Assistance',
    icon: Accessibility,
    blurb: 'Support for differently-abled residents, on their terms.',
  },
  {
    name: 'Local Household Help',
    icon: Home,
    blurb: 'Light repairs, moving a cupboard, fixing a fuse.',
  },
  {
    name: 'Environmental Activities',
    icon: Trees,
    blurb: 'Plantation drives, clean-ups and greener streets.',
  },
  {
    name: 'Other',
    icon: Sparkles,
    blurb: 'Anything else your community needs a hand with.',
  },
];

export const CATEGORY_NAMES = CATEGORIES.map((category) => category.name);

export function getCategory(name) {
  return CATEGORIES.find((category) => category.name === name) ?? CATEGORIES.at(-1);
}

export const URGENCIES = ['low', 'medium', 'high', 'critical'];

// `tone` maps to a colour token in tailwind.config.js
export const URGENCY_TONE = {
  low: 'muted',
  medium: 'progress',
  high: 'open',
  critical: 'danger',
};

export const STATUS = {
  // Service requests
  PENDING: { label: 'Open', tone: 'open' },
  ASSIGNED: { label: 'Offered', tone: 'offered' },
  IN_PROGRESS: { label: 'In progress', tone: 'progress' },
  COMPLETED: { label: 'Completed', tone: 'done' },
  CANCELLED: { label: 'Cancelled', tone: 'muted' },
  // Assignments
  OFFERED: { label: 'Offered', tone: 'offered' },
  ACCEPTED: { label: 'Accepted', tone: 'progress' },
  DECLINED: { label: 'Declined', tone: 'danger' },
  EXPIRED: { label: 'Expired', tone: 'muted' },
};

export const TIME_SLOTS = [
  { value: 'morning', label: 'Morning', short: 'AM', hours: '8–12' },
  { value: 'afternoon', label: 'Afternoon', short: 'Noon', hours: '12–4' },
  { value: 'evening', label: 'Evening', short: 'Eve', hours: '4–8' },
  { value: 'night', label: 'Night', short: 'Night', hours: '8–11' },
  { value: 'flexible', label: 'Flexible', short: 'Any', hours: 'Any time' },
];

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Weights match DEFAULT_WEIGHTS in server/src/algorithms/volunteerMatcher.js
export const MATCH_FACTORS = [
  { key: 'skillScore', label: 'Skills', weight: 35 },
  { key: 'distanceScore', label: 'Distance', weight: 25 },
  { key: 'availabilityScore', label: 'Availability', weight: 20 },
  { key: 'categoryScore', label: 'Category', weight: 10 },
  { key: 'ratingScore', label: 'Reputation', weight: 10 },
];

export const ROLE_LABELS = {
  community_member: 'Community member',
  volunteer: 'Volunteer',
  admin: 'Administrator',
};

// Gurugram, as [lat, lng] for Leaflet
export const DEFAULT_CENTER = [28.4595, 77.0266];
