import fp from 'fastify-plugin'
import connect, { sql } from '@databases/sqlite'
import Session from '@fastify/session'
import Cookie from '@fastify/cookie'
import CSRF from '@fastify/csrf-protection'

export default fp(async function oauthAuthorize (fastify) {
	await fastify.register(Cookie)

	await fastify.register(Session, {
		secret: fastify.config.SESSION_SECRET,
		cookie: {
			httpOnly: true,
		},
	})

	await fastify.register(CSRF, {
		sessionPlugin: '@fastify/session',
		getToken (req) {
			return req.body && req.body._csrf
		},
	})

	fastify.addHook('onRequest', async function (request) {
		if (!this.config.TRUST_PROXY && request.protocol !== 'https') {
			request.log.info({ protocol: request.protocol }, 'protocol not allowed')

			throw this.httpErrors.notAcceptable()
		}
	})

	// database plugin
	const oidcdb = connect()
	fastify.decorate('OIDCDB', oidcdb)

	// migrations
	await oidcdb.query(sql`
		CREATE TABLE IF NOT EXISTS oidc_clients
		(
			id INTEGER NOT NULL
				constraint oidc_clients_pk
				primary key autoincrement,
			registered_id TEXT NOT NULL,
			secret TEXT NOT NULL,
			name TEXT NOT NULL,
			callback_url TEXT NOT NULL,
			pkce_enabled INTEGER NOT NULL DEFAULT 1
		)
	`)

	await oidcdb.query(sql`
		CREATE TABLE IF NOT EXISTS oidc_exchange
		(
			code TEXT NOT NULL,
			state TEXT NOT NULL,
			challenge TEXT NOT NULL,
			challenge_alg TEXT NOT NULL,
			client_id INTEGER NOT NULL,
			callback_url TEXT NOT NULL,
			grant_type TEXT NOT NULL
		)
	`)

	await oidcdb.query(sql`
		CREATE TABLE IF NOT EXISTS accounts
		(
			username TEXT NOT NULL,
			password TEXT NOT NULL
		)
	`)

	// seeds
	const clientId = 'test-client_123'
	const clientSecret = '6koyn9KpRuofYt2U'
	const clientName = 'Test Code Flow'
	const clientCallbackUrl = 'https://oauth.tools/callback/code,https://test.com/callback,https://example.com/callback'

	await oidcdb.query(sql`
		INSERT INTO oidc_clients (registered_id, secret, name, callback_url)
		VALUES (${clientId}, ${clientSecret}, ${clientName}, ${clientCallbackUrl})
	`)

	const username = 'test'
	const password = 'test'

	await oidcdb.query(sql`
		INSERT INTO accounts (username, password)
		VALUES (${username}, ${password})
	`)
})
