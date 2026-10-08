import api from './api';

// The assignment lifecycle, as the server exposes it.

/** A volunteer takes an open request themselves (it goes straight to in progress). */
export const claimRequest = (requestId) => api.post('/assignments', { requestId });

/** A requester or admin offers a request to a specific volunteer. */
export const offerRequest = (requestId, volunteerId, notes) =>
  api.post('/assignments', { requestId, volunteerId, notes });

export const acceptOffer = (assignmentId) => api.put(`/assignments/${assignmentId}/respond`, { action: 'accept' });

export const declineOffer = (assignmentId) => api.put(`/assignments/${assignmentId}/respond`, { action: 'decline' });

export const completeAssignment = (assignmentId) => api.put(`/assignments/${assignmentId}/complete`, {});

export const cancelRequest = (requestId, reason) =>
  api.delete(`/requests/${requestId}`, { data: reason ? { reason } : {} });
