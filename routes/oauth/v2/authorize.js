import S from 'fluent-json-schema'
import { stringify } from 'node:querystring'
import { sql } from '@databases/sqlite'
import { createHash } from 'node:crypto'

// Recieve data
// state needs to be stored in the session
// client_id should be validated against a registered client id
// redirect_uri should be validated against a registerd client redirect uri
// scopes xxx
// response_type xxx

export default async function authorize (fastify) {
	await fastify.route({
		method: 'GET',
		url: '/authorize',
		handler: onRequest,
		schema: {
			query: S.object()
				.prop('client_id', S.string().required())
				.prop('response_type', S.string().required())
				.prop('redirect_uri', S.string().required())
				.prop('state', S.string().required())
				.prop('scope', S.string().required())
				.prop('code_challenge', S.string())
				.prop('code_challenge_method', S.string()),
		},
	})
}

async function onRequest (request, reply) {
	// oidc requires at least scope of openid
	if (!request.query.scope.split(' ').includes('openid')) {
		return this.httpErrors.notAcceptable()
	}

	if (request.query.code_challenge) {
		if (!request.query.code_challenge_method) {
			return this.httpErrors.notAcceptable()
		}

		if (!['S256'].includes(request.query.code_challenge_method)) {
			return this.httpErrors.notAcceptable()
		}
	}

	let {
		client_id: clientID,
		redirect_uri: redirectURI,
		state,
		code_challenge: codeChallenge,
		code_challenge_method: alg,
	} = request.query

	// search client_id against registered clients database
	// reject if not found
	const [client] = await this.OIDCDB.query(sql`
		SELECT *
		FROM oidc_clients
		WHERE id = ${clientID}
	`)
	if (!client) return this.httpErrors.notFound()

	// compare redirect_uri against registered clients callback uri
	// reject if not found
	if (client.callback_url !== redirectURI) {
		return this.httpErrors.notAcceptable()
	}

	// generate a code
	const salt = Math.random().toString(36).slice(2)
	const code = createHash('sha256')
		.update(`${clientID}-${state}-${salt}`)
		.digest('base64url')

	// convert alg to known Node alg
	if (alg && alg === 'S256') {
		alg = 'sha256'
	}

	// store challenge in table with alg
	if (codeChallenge) {
		await this.OIDCDB.query(sql`
		INSERT INTO oidc_code_challenges (code, code_challenge, alg)
		VALUES (${code}, ${codeChallenge}, ${alg})
	`)
	}

	// store state in session
	request.session.oauth = {
		state,
		code,
	}

	const queryString = stringify({ code, state })
	const redirectURL = `${client.callback_url}?${queryString}`

	return reply.redirect(redirectURL)
}
