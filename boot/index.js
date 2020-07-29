import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/analytics';

import LibraryConstants from '@thzero/library_client/constants';

import config from 'local-config';

//export default async ({
export default ({
	Vue,
	router,
	// eslint-disable-next-line
	vueApp
}) => {
	const configExternal = config['external'];
	if (!configExternal)
		throw Error('Invalid external config.');
	const configFirebase = configExternal['firebase'];
	if (!configFirebase)
		throw Error('Invalid firebase config.');
	firebase.initializeApp(configFirebase);
	if (configFirebase.measurementId)
		firebase.analytics();

	let outsideResolve;
	let outsideReject;
	const promiseAuth = new Promise(function(resolve, reject) {
		outsideResolve = resolve;
		outsideReject = reject;
	})

	// if (firebase.auth().currentUser) {
	//	 const timer = setInterval(async () => {
	//			 clearInterval(timer)
	//			 const auth = Vue.prototype.$injector.getService(LibraryConstants.InjectorKeys.SERVICE_AUTH)
	//			 await auth.onAuthStateChanged(null)
	// 		}, 50)
	// }
	// eslint-disable-next-line
	let init = false;
	firebase.auth().onAuthStateChanged(async function(user) {
		// if (user == null) {
		//	 // Vue.prototype.$navRouter.push('/auth')
		//	 return
		// }

		const auth = Vue.prototype.$injector.getService(LibraryConstants.InjectorKeys.SERVICE_AUTH);
		// await auth.onAuthStateChanged(user)
		// const timer = setInterval(async () => {
		//		 clearInterval(timer)
		//		 await auth.onAuthStateChanged(user)
		// 	}, 50)
		await auth.onAuthStateChanged(user);
		// if (test)
		if (!init) {
			// init = new Vue(vueApp)
			// init.$mount('#app')
			init = true;
			outsideResolve(true);
		}

		outsideReject();
	})

	// setInterval(async () => {
	//	 const logger = Vue.prototype.$injector.getService(LibraryConstants.InjectorKeys.SERVICE_LOGGER)
	//	 const auth = Vue.prototype.$injector.getService(LibraryConstants.InjectorKeys.SERVICE_AUTH)
	//	 try {
	//		 await auth.tokenUser(auth.user, true).then()
	//	 }
	//	 catch (err) {
	//		 logger.error(err)
	//	 }
	// }, 60 * 1000)

	// firebase.auth().onIdTokenChanged(async function(user) {
	//	 const logger = Vue.prototype.$injector.getService(LibraryConstants.InjectorKeys.SERVICE_LOGGER)
	//	 try {
	//		 const auth = Vue.prototype.$injector.getService(LibraryConstants.InjectorKeys.SERVICE_AUTH)

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

	router.beforeResolve((to, from, next) => {
		const auth = Vue.prototype.$injector.getService(LibraryConstants.InjectorKeys.SERVICE_AUTH);
		const logger = Vue.prototype.$injector.getService(LibraryConstants.InjectorKeys.SERVICE_LOGGER);
		logger.debug('router.beforeResolve', to);
		if (to.matched.some(record => record.meta.requiresAuth)) {
			const isLoggedIn = auth.isAuthenticated;
			if (!isLoggedIn) {
				// Vue.prototype.$EventBus.$on('auth-refresh', (user) => {
				//	 logger.debug('auth-refresh', user)
				//	 next()
				// })
				// return
				Vue.prototype.$navRouter.push('/', null, () => {
					// Vue.prototype.$navRouter.push('/')
					//window.location.href = '/'
				})
				return;
			}

			next()

			// eslint-disable-next-line no-unused-vars
			//	 auth.isAuthenticated().then(async (data) => {
			//		 logger.debug('router.beforeResolve.matched')

			//		 //const isLoggedIn = Vue.prototype.$store.state.user.isLoggedIn
			//		 const isLoggedIn = await auth.isAuthenticated()
			//		 if (!isLoggedIn) {
			//			 Vue.prototype.$EventBus.$on('auth-refresh', (user) => {
			//				 logger.debug('auth-refresh', user)
			//				 next()
			//			 })
			//			 return
			//		 }

			//		 // if (Vue.prototype.$store.state.user.token) {
			//		 //	 next()
			//		 //	 return
			//		 // }

			//		 // Vue.prototype.$EventBus.$on('auth-refresh', (user) => {
			//		 //	 logger.debug('auth-refresh', user)
			//		 //	 next()
			//		 // })

			//		 next()
			//	 }).catch((e) => {
			//		 logger.error('router.beforeResolve.error', e)
			//		 logger.error('to', to)
			//		 logger.error('from', from)
			//		 if (to.name == 'auth') {
			//			 next()
			//			 return
			//		 }
			//		 next({ path: '/auth' })
			//	 })

			return;
		}
		next();
	})

	return promiseAuth;
}
