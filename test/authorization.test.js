import { describe, expect, it, vi } from 'vitest';

import LibraryClientConstants from '@thzero/library_client/constants';

import FirebaseAuthService from '../service/index';

const service = ({ authenticated, completed }) => {
	const auth = new FirebaseAuthService();
	auth._logger = { debug() {}, info2() {}, warn2() {} };
	auth._serviceStore = { get userAuthCompleted() { return completed(); } };
	auth._serviceUser = { user: {} };
	auth.isAuthenticated = vi.fn(async () => authenticated());
	auth.sleep = vi.fn(async () => {});
	return auth;
};

describe('resolveAuthorization', () => {
	it('waits for sign-in to settle before deciding', async () => {
		// Firebase restores the user after the first check on a page load
		let checks = 0;
		let waits = 0;
		const auth = service({ authenticated: () => ++checks > 1, completed: () => ++waits >= 2 });

		const result = await auth.resolveAuthorization('id');

		// while (await this.sleep(150)) never ran its body: sleep resolves to undefined
		expect(auth.sleep).toHaveBeenCalledTimes(2);
		expect(result).toBe(true);
	});

	it('gives up after six waits', async () => {
		const auth = service({ authenticated: () => false, completed: () => false });

		const result = await auth.resolveAuthorization('id');

		expect(auth.sleep).toHaveBeenCalledTimes(6);
		expect(result).toBe(false);
	});

	it('does not wait when already signed in', async () => {
		const auth = service({ authenticated: () => true, completed: () => true });

		expect(await auth.resolveAuthorization('id')).toBe(true);
		expect(auth.sleep).not.toHaveBeenCalled();
	});

	it('gets the store and security services in init', async () => {
		// neither was ever assigned: the wait loop would have thrown on _serviceStore once it ran
		const services = {
			[LibraryClientConstants.InjectorKeys.SERVICE_LOGGER]: { debug() {}, info2() {}, warn2() {} },
			[LibraryClientConstants.InjectorKeys.SERVICE_SECURITY]: { name: 'security' },
			[LibraryClientConstants.InjectorKeys.SERVICE_STORE]: { name: 'store', userAuthCompleted: true }
		};
		const auth = new FirebaseAuthService();
		await auth.init({ getService: (key) => services[key] ?? null });

		expect(auth._serviceStore).toBe(services[LibraryClientConstants.InjectorKeys.SERVICE_STORE]);
		expect(auth._serviceSecurity).toBe(services[LibraryClientConstants.InjectorKeys.SERVICE_SECURITY]);

		let checks = 0;
		auth.isAuthenticated = async () => ++checks > 1;
		auth.sleep = async () => {};
		auth._serviceUser = { user: {} };
		expect(await auth.resolveAuthorization('id')).toBe(true);
	});
});
