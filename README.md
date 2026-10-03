![GitHub package.json version](https://img.shields.io/github/package-json/v/thzero/library_client_firebase)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# library_client_firebase

Google Firebase authentication for [library_client](https://github.com/thzero/library_client): sign in and out with a Google account, token refresh, and route authorization by role. Optional Firebase Analytics.

This package is framework independent. A Vue 3 application uses [library_client_firebase_vue](https://github.com/thzero/library_client_firebase_vue), which adds the router guard; a Svelte application uses [library_client_firebase_svelte](https://github.com/thzero/library_client_firebase_svelte).

## Requirements

### NodeJs

[NodeJs](https://nodejs.org) version 22+.

## Installation

[![NPM](https://nodei.co/npm/@thzero/library_client_firebase.png?compact=true)](https://npmjs.org/package/@thzero/library_client_firebase)

```
npm install @thzero/library_client_firebase
```

It requires `@thzero/library_client` and `@thzero/library_common` as peers.

## Configuration

### Firebase

Google Firebase (https://firebase.google.com) provides the social based authentication; currently only Google social accounts are supported.

* Add a new project
  * If not already completed when setting up the server application
* Setup **Authentication**, enable Google in the **Sign-in method**.
  * If not already completed when setting up the server application
* Get the Firebase SDK configuration
  * Go to Project Overview->Settings->General
  * Click **Add App** and select **Web**
    * Click **Firebase SDK snippet**, select **Config**
    * Select the JSON object and store it
    * The contents of the JSON object will be stored as key/value pairs in the external/firebase config object (below)
* Supports Firebase Analytics.
  * Go to Project Overview->Settings->Integrations
    * Enable the Google Analytics.
    * Copy the 'measurementId' key/value pair into the external/firebase config object (below)

### Application Configuration

* In the configuration files (development.json and production.json) of the application
  * Add the following configuration block to contain the firebase key, with the values from the JSON object above.

```json
	"external": {
		"firebase": {
			"apiKey": "...",
			"authDomain": "...",
			"projectId": "...",
			"storageBucket": "...",
			"messagingSenderId": "...",
			"appId": "...",
			"measurementId": "..."
		}
	}
```

`measurementId` is only needed for Firebase Analytics.

### Locales

This package has no text of its own to translate. The admin users and news pages that go with it use keys from [library_client_vue3_vuetify3](https://github.com/thzero/library_client_vue3_vuetify3); the full list, with English text, is in [library_client_vue3](https://github.com/thzero/library_client_vue3#locales). Add them to `src/locales/en.json`.

## Usage

Register the authentication service in the application's services boot:

```js
import authService from '@thzero/library_client_firebase/service';

class ServiceBoot extends RootServicesBoot {
	_initializeAuth() {
		return new authService();
	}
}
```

Then pass a starter to the framework's `start`. The framework packages provide one: `@thzero/library_client_firebase_vue/boot/starter` or `@thzero/library_client_firebase_svelte/boot/starter`. Each calls this package's `boot/starter`, which initializes Firebase and waits for the signed-in user to be restored.

### Main.js

* Add the following import statement to the 'main.js' file. For a Vue application, use the starter from [library_client_firebase_vue](https://github.com/thzero/library_client_firebase_vue), which also installs the route guard; this package's own `boot/starter` signs the user in but protects no routes.

```js
import bootStarter from '@thzero/library_client_firebase_vue/boot/starter';
```

* Pass it to the start method of the 'main.js' file as the starter, after the boot files.

```js
start(App, router, store, [ /* boot files */ ], bootStarter, options);
```

A Svelte application uses `@thzero/library_client_firebase_svelte/boot/starter` instead; see [library_client_firebase_svelte](https://github.com/thzero/library_client_firebase_svelte).


### Route authorization

`resolveAuthorization(correlationId, roles, logical)` decides whether the current user may open a route:

* The user must be signed in. On a fresh page load it waits briefly for Firebase to restore the user before deciding.
* If `roles` is not empty, the user's roles are checked through the security service. `logical` is `'or'` (any of the roles, the default) or `'and'` (all of them).

The framework packages call it from their route guards.

### Route.js

A route requires authentication only when its 'meta' node says so. Any route without it is public.

```js
    meta: {
        requiresAuth: true
    }
```

To also require roles, add them; `requiresAuthLogical` is `'or'` (any of the roles, the default) or `'and'` (all of them).

```js
    meta: {
        requiresAuth: true,
        requiresAuthRoles: [ 'admin' ],
        requiresAuthLogical: 'or'
    }
```

Marking a public route `requiresAuth: false` is optional; it documents the choice but changes nothing.

It is advised that the following routes should have authentication turned off.

* Home
* About
* Open Source
* Auth
* Not Found
* Blank

It is advised that the following routes should have authentication turned on.

* Admin
* Settings
* Support
* Any application routes that require authenticated users.

## Development

```
npm install
npm test
npm run lint
```

Tests use [Vitest](https://vitest.dev); the `test` folder and the configuration files are not published.

## License

[MIT](license.md)
