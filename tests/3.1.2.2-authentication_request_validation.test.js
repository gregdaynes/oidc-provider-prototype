import { build } from './helper.js'
import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * 3.1.2.2.  Authentication Request Validation
 *
 * The Authorization Server MUST validate the request received as follows:
 *
 * 1. The Authorization Server MUST validate all the OAuth 2.0 parameters
 *    according to the OAuth 2.0 specification.
 *
 * 2. Verify that a scope parameter is present and contains the openid scope
 *    value. (If no openid scope value is present, the request may still be a
 *    valid OAuth 2.0 request, but is not an OpenID Connect request).
 *
 * 3. The Authorization Server MUST verify that all the REQUIRED parameters are
 *    present and their usage conforms to this specification.
 *
 * 4. If the sub (subject) Claim is requested with a specific value for the ID
 *    Token, the Authorization Server MUST only send a positive response if the
 *    End-User identified by that sub value has an active session with the
 *    Authorization Server or has been Authenticated as a result of the request.
 *    The Authorization Server MUST NOT reply with an ID Token or Access Token
 *    for a different user, even if they have an active session with the
 *    Authorization Server. Such a request can be made either using an
 *    id_token_hint parameter or by requesting a specific Claim Value as
 *    described in Section 5.5.1, if the claims parameter is supported by the
 *    implementation.
 *
 * As specified in OAuth 2.0 [RFC6749], Authorization Servers SHOULD ignore
 * unrecognized request parameters.
 *
 * If the Authorization Server encounters any error, it MUST return an error
 * response, per Section 3.1.2.6.
 *
 *
 *
 * Parameter list from - Curity
 * https://curity.io/resources/learn/openid-code-flow/
 * https://web.archive.org/web/20220522133954/https://curity.io/resources/learn
 * /openid-code-flow/
 *
 * Parameter             Description             (* required, ** conditional)
 * ----------------------------------------------------------------------------
 * client_id*            The Client ID - The ID of the requesting client
 *
 * response_type*        `code` - Defines the flow type: authorization code flow
 *
 * scope*                Space separated string of scopes - List the scopes the
 *                       client is requesting access to. OpenID Connect requests
 *                       MUST contain the openid scope.
 *
 * state                 A random value -  Will be provided back to the client
 *                       in (4). Useful to keep track of the session in the
 *                       client or to prevent unsolicited flows.
 *
 * redirect_uri**        The client callback URL - The redirect_uri the client
 *                       wants (4) to redirect to. *Mandatory if multiple
 *                       redirect URIs are configured on the client.
 *
 * code_challenge**      A high entropy random challenge - A challenge generated
 *                       by the client, if sent, the code_verfier must be sent
 *                       on the token call. *Required when client must do PKCE
 *                       (RFC7636).
 *
 * code_challenge_method “plain” (default) or “S256” - Can be used if
 *                       code_challenge is sent. Defaults to “plain”. Needs to
 *                       be sent if S256 is used as code_challenge method.
 *
 * response_mode         String defining the response mode - Informs the
 *                       Authorization Server how to return the Authorization
 *                       Response parameters. Possible values are query or
 *                       fragment. The draft extension — JWT Secured
 *                       Authorization Response Mode for OAuth 2.0 defines
 *                       additional response modes, query.jwt, fragment. jwt,
 *                       form_post.jwt or jwt.
 *
 * nonce                 A random value - A String value used to mitigate replay
 *                       attacks by associating the client session with the ID
 *                       token.
 *
 * display               "page", "popup", "touch" or "wap" - String specifying
 *                       how user authentication and consent screens are
 *                       presented to the end user.
 *
 * prompt                "none", "login", "consent" or "select_account" - Space
 *                       separated string specifying user prompts for
 *                       reauthentication and consent.
 *
 * max_age               Allowable elapsed time in seconds - If the elapsed time
 *                       since user authentication is greater than this value
 *                       the Authorization Server will re-authenticate the user.
 *
 * ui_locales            Space separated list of language tag values - The
 *                       preferred languages of the end user interface. A list
 *                       of language tag values in a prioritized order.
 *                       Ex. sv en ge
 *
 * id_token_hint         An ID token - A previous ID token passed as a hint
 *                       about the user's past or current authenticated
 *                       sessions. If the user is already logged in or being
 *                       logged in by the request, the Authorization Server
 *                       returns a positive response. Otherwise, an error is
 *                       returned.
 *
 * login_hint            User’s login identifier - Hint passed to the
 *                       Authorization Server about the identifier the user is
 *                       logging in with. This can be used if the Relaying Party
 *                       first asks for the user identifier (ex. email or phone
 *                       number).
 *
 * acr_values            Requested acr values - Space separated string of
 *                       requested Authentication Context Class Reference (ACR)
 *                       values in order of preference.
 *
 * claims_locales        Space separated list of language tag values - The
 *                       user's preferred language of returned claims. A list of
 *                       language tag values in a prioritized order.
 *                       Ex. sv en ge
 *
 * claims                A JSON object listing the requested claims - List the
 *                       claims the client is requesting.
 *
 * request               A Request Object - The parameter enables the request to
 *                       be passed as a Request Object. The Request Object is an
 *                       optionally signed and/or encrypted JWT where the claims
 *                       are the request parameters.
 *
 * request_uri           A URL using the https scheme Allows the request to be
 *                       passed as a reference instead of by value (request).
 *                       The value is a URL referencing a or the Request Object
 *                       that is a JWT containing the request parameters as
 *                       claims.
 */

test('3.1.2.2 Authentication Request Validation', async (t) => {
	t.todo('1. Validate all Oauth 2.0 parameters')
	t.todo('2. Scope is allowed to not be present, but is not an oidc request')

	await t.test('3. Validate all required parameters ', async function (t) {
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

		await t.test('`client_id` is required', async function () {
			const { app, uri, encode } = this

			const qs = []

			const response = await app.inject({
				method: 'GET',
				url: [uri, encode(qs)].join('?'),
			})

			assert.equal(response.statusCode, 400)
		})

		await t.test('`response_type` is required', async function () {
			const { app, uri, encode } = this

			const qs = [
				'client_id=test-client_123',
			]

			const response = await app.inject({
				method: 'GET',
				url: [uri, encode(qs)].join('?'),
			})

			assert.equal(response.statusCode, 400)
		})

		await t.test('scope requires `openid` in space separated list', async function () {
			const { app, uri, encode } = this

			const qs = [
				'client_id=test-client_123',
				'response_type=code',
				'scope=test',
			]

			const response = await app.inject({
				method: 'GET',
				url: [uri, encode(qs)].join('?'),
			})

			assert.equal(response.statusCode, 400)
		})

		await t.test('`code_challenge` is present when pkce is enabled for client', async function () {
			const { app, uri, encode } = this

			const qs = [
				'client_id=test-client_123',
				'response_type=code',
				'scope=test openid',
			]

			const response = await app.inject({
				method: 'GET',
				url: [uri, encode(qs)].join('?'),
			})

			assert.equal(response.statusCode, 400)
		})

		await t.test('`redirect_uri` is present when client has multiple registered callbacks', async function () {
			const { app, uri, encode } = this

			const qs = [
				'client_id=test-client_123',
				'response_type=code',
				'scope=openid',
				'code_challenge=abc123',
			]

			const response = await app.inject({
				method: 'GET',
				url: [uri, encode(qs)].join('?'),
			})

			assert.equal(response.statusCode, 400)
		})
	})

	t.todo('4. Validate sub claims')
})
