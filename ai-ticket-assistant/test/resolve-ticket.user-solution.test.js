import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTicket } from '../controllers/ticket.js';
import Ticket from '../models/ticket.js';
import { inngest } from '../inngest/client.js';

const originalFindById = Ticket.findById;
const originalFindByIdAndUpdate = Ticket.findByIdAndUpdate;
const originalInngestSend = inngest.send;

test('resolveTicket writes moderator notes into the user-visible suggestedSolution field', async () => {
  const mockTicket = {
    _id: 'ticket-123',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    status: 'assigned',
    title: 'Test ticket',
    description: 'Failing test',
  };

  let updated = null;

  Ticket.findById = async () => mockTicket;
  Ticket.findByIdAndUpdate = async (_id, update) => {
    updated = update;
    return { _id, ...update };
  };
  inngest.send = async () => ({ ok: true });

  const req = {
    params: { id: 'ticket-123' },
    body: { moderatorNotes: 'Use this final solution for the user.', userRating: 5 },
    user: { _id: 'moderator-123' },
  };
  const res = {
    json(payload) {
      this.payload = payload;
      return this;
    },
    status(code) {
      this.code = code;
      return this;
    },
  };

  await resolveTicket(req, res);

  assert.equal(updated.suggestedSolution, 'Use this final solution for the user.');
  assert.equal(updated.resolutionNotes, 'Use this final solution for the user.');

  Ticket.findById = originalFindById;
  Ticket.findByIdAndUpdate = originalFindByIdAndUpdate;
  inngest.send = originalInngestSend;
});
