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
	})

	// database plugin
	const oidcdb = connect()
	fastify.decorate('OIDCDB', oidcdb)

	// migrations
	await oidcdb.query(sql`
		CREATE TABLE IF NOT EXISTS oidc_clients
		(
			id TEXT NOT NULL,
			secret TEXT NOT NULL,
			name TEXT NOT NULL,
			callback_url NOT NULL
		)
	`)

	await oidcdb.query(sql`
		CREATE TABLE IF NOT EXISTS oidc_code_challenges
		(
			code TEXT NOT NULL,
			code_challenge TEXT NOT NULL,
			alg TEXT NOT NULL
		)
	`)

	// seeds
	const clientID = 'demo-web-client'
	const clientSecret = '6koyn9KpRuofYt2U'
	const clientName = 'OAuth Tools Demo Code Flow'
	const clientCallbackURL = 'https://oauth.tools/callback/code'

	await oidcdb.query(sql`
		INSERT INTO oidc_clients (id, secret, name, callback_url)
		VALUES (${clientID}, ${clientSecret}, ${clientName}, ${clientCallbackURL})
	`)
})
