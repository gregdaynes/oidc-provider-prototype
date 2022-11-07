import { build } from './helper.js'
import test from 'node:test'
import assert from 'node:assert/strict'

/**
 *
 * 3.1.2.  Authorization Endpoint
 *
 * The Authorization Endpoint performs Authentication of the End-User. This is
 * done by sending the User Agent to the Authorization Server's Authorization
 * Endpoint for Authentication and Authorization, using request parameters
 * defined by OAuth 2.0 and additional parameters and parameter values defined
 * by OpenID Connect.
 *
 * Communication with the Authorization Endpoint MUST utilize TLS. See Section
 * 16.17 for more information on using TLS.
 */

test('3.1.2. Authorization endpoint', async (t) => {
	await t.test('ensures requests use TLS/HTTPS', async () => {
		// Fastify inject does not have a protocol option
		// instead set the option of the plugin to not trust (be behind) a proxy
		// validating that the protocol used is https. In development and test
		// this should be set to true.
		const app = await build({
			TRUST_PROXY: false,
		})

		const response = await app.inject({
			method: 'GET',
			url: '/oauth/v2/authorize',
		})

		assert.equal(response.statusCode, 406, 'returns a status code of 406')

		app.close()
	})

	await t.test('skips check with TRUST_PROXY set to true', async () => {
		const app = await build({
			TRUST_PROXY: true,
		})

		const response = await app.inject({
			method: 'GET',
			url: '/oauth/v2/authorize',
		})

		assert.notEqual(response.statusCode, 406, 'returns a status code other than 406')

		app.close()
	})
})
