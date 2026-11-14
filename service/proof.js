import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

import Service from '@thzero/library_client/service/index';

const GOOGLE = 'google.com';

// Firebase Auth as a one-time proof of who the player is, for an app whose session is its own auth
// server's token rather than Firebase's (FirebaseAuthService is the one for a Firebase session).
// idToken() signs in through a provider's popup (Google, or another Firebase provider such as
// apple.com, microsoft.com or github.com), answers the Firebase ID token for the app to hand to its
// auth server, and signs out of Firebase again. The auth server checks the token
// (@thzero/library_server_auth_providers, FirebaseIdTokenService) and issues its own.
// Reads the same config as FirebaseAuthService (external.firebase), and shares its Firebase app
// when both run. Don't use both in one app: idToken signs Firebase out.
class FirebaseProofService extends Service {
	constructor() {
		super();

		this._auth = null;
	}

	// Whether the config has a Firebase project to sign in with.
	get available() {
		return !!this._configFirebase()?.apiKey;
	}

	// Signs in through [providerId]'s popup and answers the Firebase ID token. Closing the popup
	// answers an error with no message (nothing to tell the player).
	async idToken(correlationId, providerId = GOOGLE) {
		const config = this._configFirebase();
		if (!config?.apiKey)
			return this._error('FirebaseProofService', 'idToken', 'No external.firebase in the config.', null, null, null, correlationId);

		try {
			const auth = this._firebaseAuth(config);
			const provider = (providerId === GOOGLE) ? new GoogleAuthProvider() : new OAuthProvider(providerId);
			const result = await signInWithPopup(auth, provider);
			const idToken = await result.user.getIdToken();
			await signOut(auth);
			return this._successResponse(idToken, correlationId);
		}
		catch (err) {
			if ((err?.code === 'auth/popup-closed-by-user') || (err?.code === 'auth/cancelled-popup-request'))
				return this._error('FirebaseProofService', 'idToken', '', null, null, null, correlationId);
			return this._error('FirebaseProofService', 'idToken', `Sign-in didn't go through${err?.code ? ` (${err.code})` : ''}.`, err, null, null, correlationId);
		}
	}

	_configFirebase() {
		return this._config.getExternal()?.firebase ?? null;
	}

	// The Firebase app's auth: the app FirebaseAuthService started, or a new one.
	_firebaseAuth(config) {
		if (!this._auth)
			this._auth = getAuth(getApps().length ? getApp() : initializeApp(config));
		return this._auth;
	}
}

export default FirebaseProofService;
