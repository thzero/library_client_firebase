import firebase from 'firebase/app';
import 'firebase/auth';

import LibraryConstants from '@thzero/library_client/constants';

import LibraryUtility from '@thzero/library_common/utility';

import UserAuthService from '@thzero/library_client/service/auth/user';

class FirebaseAuthService extends UserAuthService {
	constructor() {
		super();

		// this._lock = false
		this._polling = null;

		this._serviceRouter = null;
	}

	async deleteUser(correlationId) {
		try {
			const user = await firebase.auth().currentUser;
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

	async init(injector) {
		await super.init(injector);

		this._serviceRouter = this._injector.getService(LibraryConstants.InjectorKeys.SERVICE_ROUTER);
	}

	get externalUser() {
		const user = firebase.auth().currentUser;
		this._logger.debug('FirebaseAuthService', 'tokenUser', 'user', user, LibraryUtility.generateId());
		return user;
	}

	get isAuthenticated() {
		const user = this.user;
		this._logger.debug('FirebaseAuthService', 'isAuthenticated', 'user', user);
		return user != null;
	}

	async onAuthStateChanged(user) {
		const correlationId = LibraryUtility.generateId();
		try {
			await this.updateExternalUser(correlationId, user, true);
			// if (!user)
			// 	return

			await this._serviceUser.setAuthCompleted(correlationId, true);
			this._serviceEvent.emit(LibraryConstants.EventKeys.Auth.Refresh, user);
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

	async signIn(correlationId) {
		if (this.isAuthenticated)
			return false;

		try {
			const result = await firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider());
			if (result && result.user) {
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
		// firebase.auth().getRedirectResult().then(function (result) {
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
			// await firebase.auth().signOut()
			// await this._serviceUser.dispatcher.user.setTokenResult(correlationId, null)
			// await this._serviceUser.dispatcher.user.setClaims(correlationId, null)
			// await this._serviceUser.dispatcher.user.setUser(correlationId, null)
			// await this._serviceUser.dispatcher.user.setLoggedIn(correlationId, false)

			const list = [];
			list.push(firebase.auth().signOut());
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

	async refreshToken(correlationId, user, forceRefresh) {
		forceRefresh = forceRefresh !== null ? forceRefresh : false;

		try {
			this._logger.debug('FirebaseAuthService', 'tokenUser', 'user', user, correlationId);
			if (!user) {
				await this._serviceUser.setTokenResult(correlationId, null);
				await this._serviceUser.setClaims(correlationId, null);
				this.announceToken(correlationId, user, token);

				return;
			}

			this._logger.debug('FirebaseAuthService', 'tokenUser', 'forceRefresh', forceRefresh, correlationId);
			const currentUser = await firebase.auth().currentUser;
			this._logger.debug('FirebaseAuthService', 'tokenUser', 'currentUser', currentUser, correlationId);
			if (!currentUser)
				return;

			const tokenResult = await currentUser.getIdTokenResult(forceRefresh);
			if (tokenResult) {
				await this._serviceUser.setTokenResult(correlationId, tokenResult);
				const token = tokenResult.token;
				let claims = token != null ? tokenResult.claims : null;
				this._logger.debug('FirebaseAuthService', 'tokenUser', 'claims', claims, correlationId);
				claims = claims != null ? claims.custom : null;
				this._logger.debug('FirebaseAuthService', 'tokenUser', 'claims.custom', claims, correlationId);
				await this._serviceUser.setClaims(correlationId, claims);

				this.announceToken(correlationId, user, token);

				const expired = LibraryUtility.getDateParse(tokenResult.expirationTime);
				const now = LibraryUtility.getDate();
				const diff = expired.diff(now);
				const min = 5 * 60 * 1000;
				if (diff <= min) {
					await this.refreshToken(correlationId, this.user, true).then();
					return;
				}

				if (this._polling)
					clearInterval(this._polling);

				const self = this;
				this._polling = setInterval(async () => {
					await self.refreshToken(correlationId, self.user, true).then();
				}, diff); // 60 * 1000)
			}
			else {
				await this._serviceUser.setTokenResult(correlationId, null);
				await this._serviceUser.setClaims(correlationId, null);

				this.announceToken(correlationId, user, token);

				if (this._polling)
					clearInterval(this._polling);
			}
		}
		catch (err) {
			this._logger.exception('FirebaseAuthService', 'tokenUser', err, correlationId);
			throw err;
		}
	}

	async updateExternalUser(correlationId, user) {
		// if (this._lock)
		// 	return

		try {
			// if (this._lock)
			// 	return

			// this._lock = true

			user = this._convert(correlationId, user);

			await this._serviceUser.setUser(correlationId, null);
			await this._serviceUser.setLoggedIn(correlationId, false);

			if (!user)
				return;

			await this.refreshToken(correlationId, user);
			const service = this._injector.getService(LibraryConstants.InjectorKeys.SERVICE_USER);
			const response = await service.updateExternal(correlationId, user);
			if (response && response.success) {
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
}

export default FirebaseAuthService;
