import { initializeApp } from 'firebase/app';
// import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";

import LibraryClientConstants from '@thzero/library_client/constants';

import LibraryClientUtility from '@thzero/library_client/utility/index';
import LibraryCommonUtility from '@thzero/library_common/utility';

import UserAuthService from '@thzero/library_client/service/auth/user';

class FirebaseAuthService extends UserAuthService {
	constructor() {
		super();

		this._auth = null;

		// this._lock = false
		this._polling = null;

		this._serviceRouter = null;
	}

	async init(injector) {
		await super.init(injector);

		this._serviceRouter = this._injector.getService(LibraryClientConstants.InjectorKeys.SERVICE_ROUTER);
	}

	async deleteUser(correlationId) {
		try {
			const user = await this.getExternalUser();
			if (!user)
				return;

			await user.delete();
			await this._serviceUser.resetUser(correlationId);
		}
		catch (err) {
			this._logger.exception('FirebaseAuthService', 'deleteUser', err, correlationId);
			throw err;
		}
	}

	async getExternalUser() {
		if (this._auth) {
			this._logger.debug('FirebaseAuthService', 'tokenUser', 'user', this._auth.currentUser);
			return this._auth.currentUser;
		}
		return null;
	}

	async initialize(correlationId, router) {
		const configExternal = this._config.getExternal();
		if (!configExternal)
			throw Error('Invalid external config.');
		const configFirebase = configExternal.firebase;
		if (!configFirebase)
			throw Error('Invalid firebase config.');
		// initializeApp(configFirebase);
		// if (configFirebase.measurementId)
		// 	getAnalytics();
		this._initializeFirebase(correlationId, configExternal, configFirebase);

		let outsideResolve;
		let outsideReject;
		const promiseAuth = new Promise(function(resolve, reject) {
			outsideResolve = resolve;
			outsideReject = reject;
		});

		this._initializeAuth(correlationId, configExternal, configFirebase, outsideResolve, outsideReject);

		this._initializeAnalytics(correlationId, configExternal, configFirebase);

		return promiseAuth;
	}

	async isAuthenticated() {
		const user = await this.getExternalUser();
		this._logger.debug('FirebaseAuthService', 'isAuthenticated', 'user', user);
		return LibraryCommonUtility.isNotNull(user);
	}

	async onAuthStateChanged(user) {
		const correlationId = LibraryCommonUtility.correlationId();
		try {
			await this.updateExternalUser(correlationId, user, true);
			// if (!user)
			// 	return

			await this._serviceUser.setAuthCompleted(correlationId, true);
			this._serviceEvent.emit(LibraryClientConstants.EventKeys.Auth.Refresh, user);
		}
		catch (err) {
			this._logger.exception('FirebaseAuthService', 'onAuthStateChanged', err, correlationId);
		}

		// try {
		// 	if (!user) {
		// 		if (this._polling)
		// 			clearInterval(this._polling)
		// 		return
		// 	}

		// 	const self = this
		// 	this._polling = setInterval(async () => {
		// 		await self.refreshToken(self.user, true).then()
		// 	}, 60 * 1000)
		// }
		// catch (err) {
		// 	this._logger.exception('FirebaseAuthService', 'onAuthStateChanged', err, correlationId)
		// }
	}

	async refreshToken(correlationId, user, forceRefresh) {
		forceRefresh = forceRefresh !== null ? forceRefresh : false;
		this._logger.debug('FirebaseAuthService', 'refreshToken', 'forceRefresh', forceRefresh, correlationId);

		try {
			this._logger.debug('FirebaseAuthService', 'refreshToken', 'user', user, correlationId);
			if (!user) {
				await this._serviceUser.setTokenResult(correlationId, null);
				await this._serviceUser.setClaims(correlationId, null);
				this.announceToken(correlationId, user, null);

				return;
			}

			this._logger.debug('FirebaseAuthService', 'refreshToken', 'forceRefresh', forceRefresh, correlationId);
			const currentUser = await this.getExternalUser();
			this._logger.debug('FirebaseAuthService', 'refreshToken', 'currentUser', currentUser, correlationId);
			if (!currentUser)
				return;

			if (this._polling)
				clearInterval(this._polling);

			let token = null;

			const tokenResult = await this.refreshTokenResult(correlationId, forceRefresh);
			if (tokenResult) {
				await this._serviceUser.setTokenResult(correlationId, tokenResult);
				token = tokenResult.token;
				let claims = token != null ? tokenResult.claims : null;
				this._logger.debug('FirebaseAuthService', 'refreshToken', 'claims', claims, correlationId);
				claims = claims != null ? claims.custom : null;
				this._logger.debug('FirebaseAuthService', 'refreshToken', 'claims.custom', claims, correlationId);
				await this._serviceUser.setClaims(correlationId, claims);

				this.refreshTokenExpiration(correlationId, tokenResult, user);
			}
			else {
				await this._serviceUser.setTokenResult(correlationId, null);
				await this._serviceUser.setClaims(correlationId, null);
			}

			await this.announceToken(correlationId, user, token);
		}
		catch (err) {
			this._logger.exception('FirebaseAuthService', 'refreshToken', err, correlationId);
			throw err;
		}
	}

	async refreshTokenExpiration(correlationId, tokenResult, user) {
		const expired = LibraryCommonUtility.getDateParse(tokenResult.expirationTime);
		const now = LibraryCommonUtility.getDate();
		const diff = expired.diff(now);
		const min = 5 * 60 * 1000;
		if (diff <= min) {
			await this.refreshToken(correlationId, await this.getExternalUser(), true).then();
			return;
		}

		if (this._polling)
			clearInterval(this._polling);

		const self = this;
		this._polling = setInterval(async () => {
			await self.refreshToken(correlationId, user, true).then();
		}, diff); // 60 * 1000);
	}

	async refreshTokenResult(correlationId, forceRefresh) {
		const currentUser = await this.getExternalUser();
		if (!currentUser)
			return null;
		return await currentUser.getIdTokenResult(forceRefresh);
	}

	async resolveAuthorization(correlationId, requiresAuthRoles, requiresAuthLogical) {
		// const serviceAuth = LibraryClientUtility.$injector.getService(LibraryClientConstants.InjectorKeys.SERVICE_AUTH);
		// const serviceLogger = LibraryClientUtility.$injector.getService(LibraryClientConstants.InjectorKeys.SERVICE_LOGGER);
		// const serviceSecurity = LibraryClientUtility.$injector.getService(LibraryClientConstants.InjectorKeys.SERVICE_SECURITY);
		// const serviceStore = LibraryClientUtility.$injector.getService(LibraryClientConstants.InjectorKeys.SERVICE_STORE);
		this._logger.info2('requiresAuth');
		let isLoggedIn = await this.isAuthenticated();
		this._logger.info2('authorization.isLoggedIn', isLoggedIn);
		console.log('authorization.isLoggedIn', isLoggedIn);
		if (!isLoggedIn) {
			// Briefly wait for authentication to settle...
			let i = 0;
			while (await this.sleep(150)) {
				if (this._serviceStore.userAuthCompleted) {
					this._logger.info2('authorization.userAuthCompleted', userAuthCompleted);
					console.log('authorization.userAuthCompleted', userAuthCompleted);
					break;
				}
				i++;
				this._logger.info2('waiting... ' + i);
				if (i > 5) {
					this._logger.warn2('authorization.userAuthCompleted failed');
					break;
				}
			}
			const isLoggedInAuthCompleted = await this.isAuthenticated();
			this._logger.info2('authorization.isLoggedIn.userAuthCompleted', isLoggedInAuthCompleted);
			console.log('authorization.isLoggedIn.userAuthCompleted', isLoggedInAuthCompleted);
			isLoggedIn = isLoggedInAuthCompleted;
		}
		this._logger.info2('authorization.isLoggedIn.final', isLoggedIn);
		console.log('authorization.isLoggedIn.final', isLoggedIn);
		if (!isLoggedIn) {
			this._logger.warn2('authorization.isLoggedIn - failed');
			console.log('authorization.isLoggedIn - failed');
			// LibraryClientUtility.$EventBus.on('auth-refresh', (user) => {
			//	 this._logger.debug('auth-refresh', user)
			//	 this._logger.debug('middleware', 'auth-refresh', null, user, correlationId);
			//	 next()
			// })
			// return
			return false;
		}

		this._logger.info2('authorization.isLoggedIn - success');
		console.log('authorization.isLoggedIn - success');

		const user = this._serviceUser.user;
		let success = true;
		this._logger.info2('authorization.requiresAuthRoles', requiresAuthRoles);
		console.log('authorization.requiresAuthRoles', requiresAuthRoles);
		this._logger.info2('authorization.requiresAuthLogical', requiresAuthLogical);
		console.log('authorization.requiresAuthLogical', requiresAuthLogical);

		if (requiresAuthRoles) {
			success = await this._serviceSecurity.authorizationCheckRoles(correlationId, user, requiresAuthRoles, requiresAuthLogical);
			this._logger.info2('authorization.roles.success', success);
			console.log('authorization.roles.success', success);
		}

		this._logger.debug('middleware', 'authorization', 'success', success, correlationId);
		console.log('authorization.roles.success', success);
		this._logger.info2('authorization.roles.success', success);
		if (!success) {
			this._logger.warn2('authorization.roles - failed');
			console.log('authorization.roles - failed');
			LibraryClientUtility.$navRouter.push('/', null, () => {
				// LibraryClientUtility.$navRouter.push('/')
				// window.location.href = '/'
			});
			return false;
		}

		this._logger.info2('authorization.roles - success');
		console.log('authorization.roles - success');

		return true;
	}

	async signIn(correlationId) {
		if (await this.isAuthenticated())
			return false;

		try {
			const provider = new GoogleAuthProvider();
			const result = await signInWithPopup(this._auth, provider);
			if (result && result.user) {
				//const credential = GoogleAuthProvider.credentialFromResult(result);
				// const token = credential.accessToken;
				this.updateExternalUser(correlationId, result.user);
				// this._serviceRouter.route('/')
				window.location.href = '/';
				return true;
			}

			this.updateExternalUser(correlationId, null);
		}
		catch (err) {
			this._logger.exception('FirebaseAuthService', 'signIn', err, correlationId);
			this.updateExternalUser(correlationId, null);
		}

		return true;
	}

	async signInCompleted(correlationId) {
		// if (await auth.isAuthenticated())
		//   return
		// this._auth.getRedirectResult().then(function (result) {
		// 	if (result.credential) {
		// 		// This gives you a Google Access Token. You can use it to access the Google API.
		// 		// eslint-disable-next-line
		// 		var token = result.credential.accessToken
		// 		// ...
		// 	}
		// 	// The signed-in user info.
		// 	// eslint-disable-next-line
		// 	var user = result.user
		// }).catch(function (error) {
		// 	// Handle Errors here.
		// 	// eslint-disable-next-line
		// 	var errorCode = error.code
		// 	// eslint-disable-next-line
		// 	var errorMessage = error.message
		// 	// The email of the user's account used.
		// 	// eslint-disable-next-line
		// 	var email = error.email
		// 	// The firebase.auth.AuthCredential type that was used.
		// 	// eslint-disable-next-line
		// 	var credential = error.credential
		// 	// ...
		// })
	}

	async signOut(correlationId) {
		try {
			// await this._auth.signOut()
			// await this._serviceUser.dispatcher.user.setTokenResult(correlationId, null)
			// await this._serviceUser.dispatcher.user.setClaims(correlationId, null)
			// await this._serviceUser.dispatcher.user.setUser(correlationId, null)
			// await this._serviceUser.dispatcher.user.setLoggedIn(correlationId, false)

			const list = [];
			list.push(this._auth.signOut());
			// list.push(this._serviceUser.dispatcher.user.setTokenResult(correlationId, null))
			// list.push(this._serviceUser.dispatcher.user.setClaims(correlationId, null))
			// list.push(this._serviceUser.dispatcher.user.setUser(correlationId, null))
			// list.push(this._serviceUser.dispatcher.user.setLoggedIn(correlationId, false))
			list.push(this._serviceUser.resetUser(correlationId));
			list.push(this._serviceUser.setAuthCompleted(correlationId, false));

			await Promise.all(list);

			// this._serviceRouter.route('/')
			window.location.href = '/';
		}
		catch (err) {
			this._logger.exception('FirebaseAuthService', 'signOut', err, correlationId);
		}
	}

	sleep(ms) {
	  return new Promise((resolve) => {
		setTimeout(resolve, ms);
	  });
	}

	get token() {
		return this._serviceUser.token;
	}

	get user() {
		return this._serviceUser.user;
	}

	// async token(forceRefresh) {
	// 	if (!forceRefresh)
	// 		forceRefresh = false

	// 	const user = this.user
	// 	this._logger.debug('FirebaseAuthService', 'token', 'user', user, correlationId);
	// 	if (!user)
	// 		return null

	// 	this._logger.debug('FirebaseAuthService', 'token', 'forceRefresh', forceRefresh, correlationId)
	// 	return this.refreshToken'FirebaseAuthService', 'token', user, forceRefresh)
	// }

	async updateExternalUser(correlationId, user) {
		// if (this._lock)
		// 	return

		try {
			// if (this._lock)
			// 	return

			// this._lock = true

			user = this._convert(correlationId, user);
			if (!user) {
				await this._serviceUser.setUser(correlationId, null);
				await this._serviceUser.setLoggedIn(correlationId, false);
				return;
			}

			await this.refreshToken(correlationId, user);
			const response = await this._serviceUser.updateExternal(correlationId, user);
			if (this._hasSucceeded(response)) {
				await this._serviceUser.setUser(correlationId, response.results);
				await this._serviceUser.setLoggedIn(correlationId, true);
			}
		}
		finally {
			// this._lock = false
		}
	}

	_convert(correlationId, requestedUser) {
		if (requestedUser) {
			const user = {};
			user.id = requestedUser.uid;
			user.name = requestedUser.displayName;
			user.picture = requestedUser.photoURL;
			user.email = requestedUser.email;
			return user;
		}

		return null;
	}

	_initializeAnalytics(correlationId, configExternal, configFirebase) {
		if (configFirebase.measurementId)
			getAnalytics();
	}

	_initializeAuth(correlationId, configExternal, configFirebase, outsideResolve, outsideReject) {
		this._auth = getAuth();

		const self = this;
		const firebaseAuth = this._auth;
		// eslint-disable-next-line
		let init = false;
		firebaseAuth.onAuthStateChanged(async function(user) {
			// const auth = LibraryClientUtility.$injector.getService(LibraryClientConstants.InjectorKeys.SERVICE_AUTH);
			// await auth.onAuthStateChanged(user);
			await self.onAuthStateChanged(user);
			if (!init) {
				init = true;
				outsideResolve(true);
				return;
			}

			outsideReject();
		});
	}

	_initializeFirebase(correlationId, configExternal, configFirebase) {
		initializeApp(configFirebase);
	}
}

export default FirebaseAuthService;
