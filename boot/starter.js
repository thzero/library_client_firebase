import { initializeApp } from 'firebase/app';
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

import LibraryConstants from '@thzero/library_client/constants';

import GlobalUtility from '@thzero/library_client/utility/global';

import config from 'local-config';

// export default async ({
export default (setup) => {
	const configExternal = config.external;
	if (!configExternal)
		throw Error('Invalid external config.');
	const configFirebase = configExternal.firebase;
	if (!configFirebase)
		throw Error('Invalid firebase config.');
	const firebaseApp = initializeApp(configFirebase);
	if (configFirebase.measurementId)
		getAnalytics();

	let outsideResolve;
	let outsideReject;
	const promiseAuth = new Promise(function(resolve, reject) {
		outsideResolve = resolve;
		outsideReject = reject;
	});

	const firebaseAuth = getAuth();
	// if (firebaseAuth.currentUser) {
	//	 const timer = setInterval(async () => {
	//			 clearInterval(timer)
	//			 const auth = GlobalUtility.$injector.getService(LibraryConstants.InjectorKeys.SERVICE_AUTH)
	//			 await auth.onAuthStateChanged(null)
	// 		}, 50)
	// }
	// eslint-disable-next-line
	let init = false;
	firebaseAuth.onAuthStateChanged(async function(user) {
		// if (user == null) {
		//	 // GlobalUtility.$navRouter.push('/auth')
		//	 return
		// }

		const auth = GlobalUtility.$injector.getService(LibraryConstants.InjectorKeys.SERVICE_AUTH);
		// await auth.onAuthStateChanged(user)
		// const timer = setInterval(async () => {
		//		 clearInterval(timer)
		//		 await auth.onAuthStateChanged(user)
		// 	}, 50)
		await auth.onAuthStateChanged(user);
		// if (test)
		if (!init) {
			init = true;
			outsideResolve(true);
			return;
		}

		outsideReject();
	});

	// setInterval(async () => {
	//	 const logger = GlobalUtility.$injector.getService(LibraryConstants.InjectorKeys.SERVICE_LOGGER)
	//	 const auth = GlobalUtility.$injector.getService(LibraryConstants.InjectorKeys.SERVICE_AUTH)
	//	 try {
	//		 await auth.refreshToken(correlationId, auth.externalUser, true).then()
	//	 }
	//	 catch (err) {
	//		 logger.error(err)
	//	 }
	// }, 60 * 1000)

	// firebase.auth().onIdTokenChanged(async function(user) {
	//	 const logger = GlobalUtility.$injector.getService(LibraryConstants.InjectorKeys.SERVICE_LOGGER)
	//	 try {
	//		 const auth = GlobalUtility.$injector.getService(LibraryConstants.InjectorKeys.SERVICE_AUTH)

	//		 // const interval = 500 // 10 * 1000
	//		 // const timer = setInterval(async () => {
	//		 //	 await auth.onRefresh(user)
	//		 //	 clearInterval(timer)
	// 		// }, interval)
	//		 await auth.onRefresh(user)
	//	 }
	//	 catch (err) {
	//		 logger.error(err)
	//	 }
	// })

	setup();
	// router.beforeResolve((to, from, next) => {
	// 	const auth = GlobalUtility.$injector.getService(LibraryConstants.InjectorKeys.SERVICE_AUTH);
	// 	const logger = GlobalUtility.$injector.getService(LibraryConstants.InjectorKeys.SERVICE_LOGGER);
	// 	logger.debug('router.beforeResolve', to);
	// 	if (to.matched.some(record => record.meta.requiresAuth)) {
	// 		const isLoggedIn = auth.isAuthenticated;
	// 		if (!isLoggedIn) {
	// 			// GlobalUtility.$EventBus.on('auth-refresh', (user) => {
	// 			//	 logger.debug('auth-refresh', user)
	// 			//	 next()
	// 			// })
	// 			// return
	// 			GlobalUtility.$navRouter.push('/', null, () => {
	// 				// GlobalUtility.$navRouter.push('/')
	// 				// window.location.href = '/'
	// 			});
	// 			return;
	// 		}

	// 		next();

	// 		// eslint-disable-next-line no-unused-vars
	// 		//	 auth.isAuthenticated().then(async (data) => {
	// 		//		 logger.debug('router.beforeResolve.matched')

	// 		//		 //const isLoggedIn = GlobalUtility.$store.state.user.isLoggedIn
	// 		//		 const isLoggedIn = await auth.isAuthenticated()
	// 		//		 if (!isLoggedIn) {
	// 		//			 GlobalUtility.$EventBus.on('auth-refresh', (user) => {
	// 		//				 logger.debug('auth-refresh', user)
	// 		//				 next()
	// 		//			 })
	// 		//			 return
	// 		//		 }

	// 		//		 // if (GlobalUtility.$store.state.user.token) {
	// 		//		 //	 next()
	// 		//		 //	 return
	// 		//		 // }

	// 		//		 // GlobalUtility.$EventBus.on('auth-refresh', (user) => {
	// 		//		 //	 logger.debug('auth-refresh', user)
	// 		//		 //	 next()
	// 		//		 // })

	// 		//		 next()
	// 		//	 }).catch((e) => {
	// 		//		 logger.error('router.beforeResolve.error', e)
	// 		//		 logger.error('to', to)
	// 		//		 logger.error('from', from)
	// 		//		 if (to.name == 'auth') {
	// 		//			 next()
	// 		//			 return
	// 		//		 }
	// 		//		 next({ path: '/auth' })
	// 		//	 })

	// 		return;
	// 	}
	// 	next();
	// });

	return promiseAuth;
};
