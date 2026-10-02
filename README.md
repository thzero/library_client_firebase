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
* Setup **Authentication**, enabled Google in the **Sign-in method**.
  * If not already completed when setting up the server application
* Get the Firebase SDK configuration
  * Go to Project Overview->Settings->General
  * Click **Add App** and select **Web**
    * Click *Firebase SDK snippet*, select **Config*
    * Select the JSON object and store it
    * The contents of the JSON object will be stored as key/value pairs in the external/firebase confib object (below)
* Supports Firebase Analytics.
  * Go to Project Overview->Settings->Integrations
    * Enable the Google Analytics.
    * Copy the 'measurementId' key//value pair into the external/firebase config object (below)

### Application Configuration

* In the configuration files (development.json and production.json) of the application
  * Add the following onfiguration block to contain the firebase key.

```
	,
	"external": {
		"firebase": <firebase key JSON object from above goes here>
	}
```

### Locales

Merge the following to the 'src/locals/en/index.json' file:

```
{
	"admin": {
		"users": "Users"
	},
	"forms": {
		"externalId": "External Id",
		"news": {
		  "requiresAuth": "Requires Authentication",
		},
		"role": "Role",
		"roles": "Roles",
	},
	"news": {
		"requiresAuth": "Authenticated",
	},
	"users": {
		"actions": "Actions",
		"externalId": "External Id",
		"id": "Id",
		"name": "Name",
		"role": "Role",
		"roles": "Roles"
	}
 }
```

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

* Add the following import statement to the 'main.js' file.

```
import bootStarter from '@thzero/library_client_firebase/boot/starter';
```

* Adjust the start method of the 'main.js' file to iclude 'bootAuth' as the last parameter.

```
start(app, router, store, vuetify, [ ... ], bootStarter);
```


### Route authorization

`resolveAuthorization(correlationId, roles, logical)` decides whether the current user may open a route:

* The user must be signed in. On a fresh page load it waits briefly for Firebase to restore the user before deciding.
* If `roles` is not empty, the user's roles are checked through the security service. `logical` is `'or'` (any of the roles, the default) or `'and'` (all of them).

The framework packages call it from their route guards.

### Route.js

Routes can be denoted as not requiring authentication.  To do so, tag on the route the following in the 'meta node'.

```
    requiresAuth: false
```

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
