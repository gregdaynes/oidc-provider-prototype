import { build } from './helper.js'
import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * 3.1.2.3 Authorization Server Authenticates End-User
 *
 * If the request is valid, the Authorization Server attempts to Authenticate
 * the End-User or determines whether the End-User is Authenticated, depending
 * upon the request parameter values used. The methods used by the Authorization
 * Server to Authenticate the End-User (e.g. username and password, session
 * cookies, etc.) are beyond the scope of this specification. An Authentication
 * user interface MAY be displayed by the Authorization Server, depending upon
 * the request parameter values used and the authentication methods used.
 *
 * The Authorization Server MUST attempt to Authenticate the End-User in the
 * following cases:
 *
 *   The End-User is not already Authenticated.
 *
 *   The Authentication Request contains the prompt parameter with the value
 *   login. In this case, the Authorization Server MUST reauthenticate the
 *   End-User even if the End-User is already authenticated.
 *
 * The Authorization Server MUST NOT interact with the End-User in the following
 * case:
 *
 *   The Authentication Request contains the prompt parameter with the value
 *   none. In this case, the Authorization Server MUST return an error if an
 *   End-User is not already Authenticated or could not be silently
 *   Authenticated.
 *
 * When interacting with the End-User, the Authorization Server MUST employ
 * appropriate measures against Cross-Site Request Forgery and Clickjacking as,
 * described in Sections 10.12 and 10.13 of OAuth 2.0 [RFC6749].
 */

test('3.1.2.3 Authorization Server Authenticates End-User', async function (t) {
	t.beforeEach(async function () {
		this.app = await build()
		this.uri = '/oauth/v2/authorize'

		this.encode = (arr) => {
			return encodeURI(arr.join('&'))
		}
	})

	t.afterEach(function () {
		this.app.close()
	})

	await t.todo('when the user is not authenticated, attempt to authenticate by redirecting to a authentication form', async function (t) {
		const { app, uri, encode } = this

		const qs = [
			'client_id=test-client_123',
			'response_type=code',
			'scope=openid',
			'code_challenge=abc123',
			'redirect_uri=https://test.com/callback',
			'code_challenge_method=S256',
		]

		const response = await app.inject({
			method: 'GET',
			url: [uri, encode(qs)].join('?'),
		})

		assert.equal(response.statusCode, 200)
	})
})
