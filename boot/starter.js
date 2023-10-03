// import { initializeApp } from 'firebase/app';
// import { getAuth } from "firebase/auth";
// import { getAnalytics } from "firebase/analytics";

import LibraryClientConstants from '@thzero/library_client/constants';

import LibraryClientUtility from '@thzero/library_client/utility/index';
import LibraryCommonUtility from '@thzero/library_common/utility/index';

// import config from 'local-config';

// export default async ({
export default async ({router}) => {
	const auth = LibraryClientUtility.$injector.getService(LibraryClientConstants.InjectorKeys.SERVICE_AUTH);
	return await auth.initialize(LibraryCommonUtility.correlationId(), router);
	// const configExternal = config.external;
	// if (!configExternal)
	// 	throw Error('Invalid external config.');
	// const configFirebase = configExternal.firebase;
	// if (!configFirebase)
	// 	throw Error('Invalid firebase config.');
	// initializeApp(configFirebase);
	// if (configFirebase.measurementId)
	// 	getAnalytics();

	// let outsideResolve;
	// let outsideReject;
	// const promiseAuth = new Promise(function(resolve, reject) {
	// 	outsideResolve = resolve;
	// 	outsideReject = reject;
	// });

	// const firebaseAuth = getAuth();
	// // eslint-disable-next-line
	// let init = false;
	// firebaseAuth.onAuthStateChanged(async function(user) {
	// 	const auth = LibraryClientUtility.$injector.getService(LibraryClientConstants.InjectorKeys.SERVICE_AUTH);
	// 	await auth.onAuthStateChanged(user);
	// 	if (!init) {
	// 		init = true;
	// 		outsideResolve(true);
	// 		return;
	// 	}

	// 	outsideReject();
	// });

	// setup();

	// return promiseAuth;
};
