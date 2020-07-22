import firebase from 'firebase/app'
import 'firebase/auth'

import LibraryConstants from '@thzero/library/constants'

import Utility from '@thzero/library_common/utility'

import Service from '@thzero/library/service/index'

class FirebaseAuthService extends Service {
	constructor() {
		super()

		// this._lock = false
		this._polling = null

		this._serviceEvent = null
		this._serviceRouter = null
		this._serviceStore = null
	}

	async deleteUser() {
		try {
			const user = await firebase.auth().currentUser
			if (!user) {
				return
			}

			await user.delete()
			await this._serviceStore.dispatcher.user.resetUser()
		}
		catch (err) {
			this._logger.exception(err)
			throw err
		}
	}

	async init(injector) {
		await super.init(injector);

		this._serviceEvent = this._injector.getService(LibraryConstants.InjectorKeys.SERVICE_EVENT);
		this._serviceRouter = this._injector.getService(LibraryConstants.InjectorKeys.SERVICE_ROUTER);
		this._serviceStore = this._injector.getService(LibraryConstants.InjectorKeys.SERVICE_STORE);
	}

	get isAuthenticated() {
		const user = this.user;
		this._logger.debug('isAuthenticated.user', user);
		return user != null;
	}

	async onAuthStateChanged(user) {
		try {
			await this.updateExternalUser(user, true);
			// if (!user)
			// 	return

			this._serviceStore.dispatcher.user.setAuthCompleted(true);
			this._serviceEvent.emit('auth-refresh', user);
		}
		catch (err) {
			this._logger.exception(err);
		}

		// try {
		// 	if (!user) {
		// 		if (this._polling)
		// 			clearInterval(this._polling)
		// 		return
		// 	}

		// 	const self = this
		// 	this._polling = setInterval(async () => {
		// 		await self.tokenUser(self.user, true).then()
		// 	}, 60 * 1000)
		// }
		// catch (err) {
		// 	this._logger.exception(err)
		// }
	}

	async signIn() {
		if (this.isAuthenticated)
			return false;

		try {
			const result = await firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider());
			if (result && result.user) {
				this.updateExternalUser(result.user);
				// this._serviceRouter.route('/')
				window.location.href = '/';
				return true;
			}

			this.updateExternalUser(null);
		}
		catch (err) {
			this._logger.exception(err);
			this.updateExternalUser(null);
		}

		return true;
	}

	async signInCompleted() {
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

	async signOut() {
		try {
			// await firebase.auth().signOut()
			// await this._serviceStore.dispatcher.user.setTokenResult(null)
			// await this._serviceStore.dispatcher.user.setClaims(null)
			// await this._serviceStore.dispatcher.user.setUser(null)
			// await this._serviceStore.dispatcher.user.setLoggedIn(false)

			const list = [];
			list.push(firebase.auth().signOut());
			// list.push(this._serviceStore.dispatcher.user.setTokenResult(null))
			// list.push(this._serviceStore.dispatcher.user.setClaims(null))
			// list.push(this._serviceStore.dispatcher.user.setUser(null))
			// list.push(this._serviceStore.dispatcher.user.setLoggedIn(false))
			list.push(this._serviceStore.dispatcher.user.resetUser());
			list.push(this._serviceStore.dispatcher.user.setAuthCompleted(false));

			await Promise.all(list);

			// this._serviceRouter.route('/')
			window.location.href = '/';
		}
		catch (e) {
			this._logger.exception(e);
		}
	}

	// async token(forceRefresh) {
	// 	if (!forceRefresh)
	// 		forceRefresh = false

	// 	const user = this.user
	// 	this._logger.debug('auth.token.user', user)
	// 	if (!user)
	// 		return null

	// 	this._logger.debug('auth.token.forceRefresh', forceRefresh)
	// 	return this.tokenUser(user, forceRefresh)
	// }

	async tokenUser(user, forceRefresh) {
		forceRefresh = forceRefresh !== null ? forceRefresh : false;

		try {
			this._logger.debug('auth.tokenUser.user', user);
			if (!user) {
				await this._serviceStore.dispatcher.user.setTokenResult(null);
				await this._serviceStore.dispatcher.user.setClaims(null);
				return;
			}

			this._logger.debug('auth.tokenUser.forceRefresh', forceRefresh);
			const tokenResult = await firebase.auth().currentUser.getIdTokenResult(forceRefresh);
			if (tokenResult) {
				await this._serviceStore.dispatcher.user.setTokenResult(tokenResult);
				const token = tokenResult.token;
				let claims = token != null ? tokenResult.claims : null;
				this._logger.debug('auth.tokenUser.claims', claims);
				claims = claims != null ? claims.custom : null;
				this._logger.debug('auth.tokenUser.claims.custom', claims);
				await this._serviceStore.dispatcher.user.setClaims(claims);

				const expired = Utility.getDateParse(tokenResult.expirationTime);
				const now = Utility.getDate();
				const diff = expired.diff(now);
				const min = 5 * 60 * 1000;
				if (diff <= min) {
					await this.tokenUser(this.user, true).then();
					return;
				}

				if (this._polling)
					clearInterval(this._polling);

				const self = this;
				this._polling = setInterval(async () => {
					await self.tokenUser(self.user, true).then();
				}, diff) //60 * 1000)
			}
			else {
				await this._serviceStore.dispatcher.user.setTokenResult(null);
				await this._serviceStore.dispatcher.user.setClaims(null);
				if (this._polling)
					clearInterval(this._polling);
			}
		}
		catch (err) {
			this._logger.exception(err);
			throw err;
		}
	}

	async updateExternalUser(user) {
		// if (this._lock)
		// 	return

		try {
			// if (this._lock)
			// 	return

			// this._lock = true

			user = this._convert(user);

			await this._serviceStore.dispatcher.user.setUser(null);
			await this._serviceStore.dispatcher.user.setLoggedIn(false);

			if (!user)
				return;

			await this.tokenUser(user);
			const service = this._injector.getService(LibraryConstants.InjectorKeys.SERVICE_USER);
			const response = await service.updateExternal(user);
			if (response && response.success) {
				await this._serviceStore.dispatcher.user.setUser(response.results);
				await this._serviceStore.dispatcher.user.setLoggedIn(true);
			}
		}
		finally {
			// this._lock = false
		}
	}

	get user() {
		const user = firebase.auth().currentUser;
		this._logger.debug('auth.user', user);
		return user;
	}

	_convert(requestedUser) {
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
