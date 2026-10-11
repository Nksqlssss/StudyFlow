import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createAsyncGate, getErrorMessage } from './store-utils';

describe('store-utils', () => {
	it('returns Error messages and fallback messages consistently', () => {
		assert.equal(getErrorMessage(new Error('Network failed')), 'Network failed');
		assert.equal(getErrorMessage('plain string error'), 'Something went wrong');
		assert.equal(getErrorMessage(null, 'Fallback'), 'Fallback');
	});

	it('invalidates stale load tokens when a newer load starts', () => {
		const gate = createAsyncGate();
		const firstLoad = gate.nextLoad();
		const secondLoad = gate.nextLoad();

		assert.equal(gate.isCurrentLoad(firstLoad), false);
		assert.equal(gate.isCurrentLoad(secondLoad), true);
	});

	it('invalidates stale load tokens without invalidating the current mutation', () => {
		const gate = createAsyncGate();
		const mutation = gate.nextMutation();
		const load = gate.nextLoad();

		gate.invalidateLoads();

		assert.equal(gate.isCurrentLoad(load), false);
		assert.equal(gate.isCurrentMutation(mutation), true);
	});

	it('invalidates every pending token on reset', () => {
		const gate = createAsyncGate();
		const load = gate.nextLoad();
		const mutation = gate.nextMutation();

		gate.reset();

		assert.equal(gate.isCurrentLoad(load), false);
		assert.equal(gate.isCurrentMutation(mutation), false);
	});
});
