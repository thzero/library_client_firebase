import { beforeEach, describe, expect, it, vi } from 'vitest';

// Firebase itself stands in: the app, and the popup sign-in.
const firebase = vi.hoisted(() => ({
	apps: [],
	popup: null,
	signedOut: 0
}));

vi.mock('firebase/app', () => ({
	getApp: () => firebase.apps[0],
	getApps: () => firebase.apps,
	initializeApp: (config) => {
		const app = { config };
		firebase.apps.push(app);
		return app;
	}
}));

vi.mock('firebase/auth', () => ({
	getAuth: (app) => ({ app }),
	GoogleAuthProvider: class { constructor() { this.providerId = 'google.com'; } },
	OAuthProvider: class { constructor(providerId) { this.providerId = providerId; } },
	signInWithPopup: async (auth, provider) => firebase.popup(auth, provider),
	signOut: async () => { firebase.signedOut++; }
}));

import FirebaseProofService from '../service/proof';

const config = { apiKey: 'key', authDomain: 'example.firebaseapp.com', projectId: 'example' };

let service;

beforeEach(() => {
	firebase.apps.length = 0;
	firebase.signedOut = 0;
	firebase.popup = async (auth, provider) => ({ user: { getIdToken: async () => `token:${provider.providerId}` } });
	service = new FirebaseProofService();
	service._logger = { debug() {}, error() {}, exception: vi.fn() };
	service._config = { getExternal: () => ({ firebase: config }) };
});

describe('FirebaseProofService', () => {
	it('answers the ID token from a Google popup, and signs Firebase out again', async () => {
		const response = await service.idToken('cid');

		expect(response.success).toBe(true);
		expect(response.results).toBe('token:google.com');
		expect(firebase.signedOut).toBe(1);
		expect(firebase.apps[0].config).toBe(config);
	});

	it('signs in through another Firebase provider', async () => {
		expect((await service.idToken('cid', 'github.com')).results).toBe('token:github.com');
	});

	it('shares the Firebase app FirebaseAuthService started', async () => {
		firebase.apps.push({ config: 'existing' });

		await service.idToken('cid');

		expect(firebase.apps).toHaveLength(1);
	});

	it('says nothing when the player closes the popup', async () => {
		firebase.popup = async () => { throw Object.assign(new Error('closed'), { code: 'auth/popup-closed-by-user' }); };

		const response = await service.idToken('cid');

		expect(response.success).toBe(false);
		expect(response.message).toBe('');
	});

	it('says why when the sign-in fails', async () => {
		firebase.popup = async () => { throw Object.assign(new Error('blocked'), { code: 'auth/popup-blocked' }); };

		expect((await service.idToken('cid')).message).toBe('Sign-in didn\'t go through (auth/popup-blocked).');
	});

	it('loads Firebase once, and preload() starts it before the click', async () => {
		service.preload();
		const loading = service._firebase;
		expect(loading).not.toBeNull();

		await service.idToken('cid');
		await service.idToken('cid');

		expect(service._firebase).toBe(loading);
	});

	it('preloads nothing without a Firebase config', () => {
		service._config = { getExternal: () => ({}) };

		service.preload();

		expect(service._firebase).toBeNull();
	});

	it('is not available, and refuses, without a Firebase config', async () => {
		service._config = { getExternal: () => ({}) };

		expect(service.available).toBe(false);
		expect((await service.idToken('cid')).success).toBe(false);
	});
});
