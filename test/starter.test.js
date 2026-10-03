import { describe, expect, it, vi } from 'vitest';

import LibraryClientConstants from '@thzero/library_client/constants';
import LibraryClientUtility from '@thzero/library_client/utility/index';

import starter from '../boot/starter';

describe('starter', () => {
	it('initializes the auth service with the router', async () => {
		const auth = { initialize: vi.fn(async () => true) };
		LibraryClientUtility.$injector = { getService: (key) => (key === LibraryClientConstants.InjectorKeys.SERVICE_AUTH ? auth : null) };
		const router = { name: 'router' };

		await starter({ router });

		expect(auth.initialize).toHaveBeenCalledWith(expect.any(String), router);
	});
});
