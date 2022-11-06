import { sql } from '@databases/sqlite'
import S from 'fluent-json-schema'
import Formbody from '@fastify/formbody'
import crypto from 'node:crypto'

export default async function token (fastify) {
	await fastify.register(Formbody)

	await fastify.route({
		method: 'POST',
		url: '/token',
		handler: onRequest,
		schema: {
			body: S.object()
				.prop('grant_type', S.string().required())
				.prop('redirect_uri', S.string().required())
				.prop('code', S.string().required())
				.prop('client_id', S.string().required())
				.prop('client_secret', S.string().required())
				.prop('code_verifier', S.string()),
		},
	})
}

async function onRequest (request) {
	const {
		code,
		code_verifier: codeVerifier,
	} = request.body

	if (codeVerifier) {
		let [{
			code_challenge: codeChallenge,
			alg,
		}] = await this.OIDCDB.query(sql`
			SELECT *
			FROM oidc_code_challenges
			WHERE code = ${code}
		`)

		// only support sha256
		if (alg === 'S256') {
			alg = 'sha256'
		} else {
			alg = 'sha256'
		}

		// compare the verifier by...
		// compute verifier with base64(hash_alg(code_verifier))
		// no match - tampered with
		const calculatedCodeVerifier = crypto
			.createHash(alg)
			.update(codeVerifier)
			.digest('base64url')

		if (codeChallenge !== calculatedCodeVerifier) {
			return this.httpErrors.notAcceptable()
		}
	}

	return {
		token_type: 'Bearer',
		expires_in: 3600,
		scope: 'photo offline_access',
		access_token: 'MTQ0NjJkZmQ5OTM2NDE1ZTZjNGZmZjI3',
		refresh_token: 'IwOGYzYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
		id_token: 'abc123',
	}

	// id_token =
	// {
	//  "sub": "clever-curlew@example.com",
	//  "name": "Clever Curlew",
	//  "email": "clever-curlew@example.com",
	//  "iss": "https://pk-demo.okta.com/oauth2/default",
	//  "aud": "QdyYWn_LocewZYgArhk3GtDQ",
	//  "iat": 1667695445,
	//  "exp": 1670287445,
	//  "amr": [
	//    "pwd"
	//  ]
	// }
}
