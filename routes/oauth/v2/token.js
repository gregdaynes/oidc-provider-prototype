import { sql } from '@databases/sqlite'
import S from 'fluent-json-schema'
import Formbody from '@fastify/formbody'
import crypto from 'node:crypto'
import camelcaseKeys from 'camelcase-keys'
import * as Err from './errors.js'

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
	const ctx = {
		dbConnection: this.OIDCDB,
		grantTypes: this.config.GRANT_TYPES,

		attributes: {
			...camelcaseKeys(request.body),
		},
	}

	ensureGrantTypeIsValid(ctx)
	await loadClientByRegisteredId(ctx)
	ensureClientSecretMatches(ctx)
	await loadPayloadFromExchangeByCode(ctx)
	calculateHashFromCodeVerifier(ctx)
	ensureCodeVerifierMatches(ctx)

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

function ensureGrantTypeIsValid (ctx) {
	const grantTypes = ctx.grantTypes
	const grantType = ctx.attributes.grantType

	if (!grantTypes.includes(grantType)) {
		throw new Err.GrantTypeNotValid()
	}

	return ctx
}

async function loadClientByRegisteredId (ctx) {
	const db = ctx.dbConnection
	const clientId = ctx.attributes.clientId

	let [client] = await db.query(sql`
		SELECT *
		FROM oidc_clients
		WHERE registered_id = ${clientId}
	`)

	if (!client) throw new Err.ClientNotFound()

	client = camelcaseKeys(client)
	client.callbackUrl = client.callbackUrl.split(',')
	delete client.callbackUrl

	ctx.client = client

	return ctx
}

function ensureClientSecretMatches (ctx) {
	const client = ctx.client
	const secret = ctx.attributes.clientSecret

	if (client.secret !== secret) {
		throw new Err.ClientSecretNotValid()
	}

	return ctx
}

async function loadPayloadFromExchangeByCode (ctx) {
	const db = ctx.dbConnection
	const code = ctx.attributes.code
	const grantType = ctx.attributes.grantType

	const [payload] = await db.query(sql`
		SELECT *
		FROM oidc_exchange
		WHERE code = ${code}
			AND grant_type = ${grantType}
	`)

	if (!payload) throw new Err.ExchangePayloadNotFound()

	ctx.payload = camelcaseKeys(payload)

	return ctx
}

function calculateHashFromCodeVerifier (ctx) {
	const challengeAlgorithm = ctx.attributes.challengeAlg
	const codeVerifier = ctx.attributes.codeVerifier

	if (challengeAlgorithm !== 'S256') {
		ctx.calculateCodeVerifier = ctx.attributes.codeVerifier
		return ctx
	}

	ctx.calculateCodeVerifier = crypto
		.createHash(challengeAlgorithm)
		.update(codeVerifier)
		.digest('base64url')

	return ctx
}

function ensureCodeVerifierMatches (ctx) {
	const challenge = ctx.attributes.challenge
	const calculatedCodeVerifier = ctx.calculatedCodeVerifier

	if (challenge !== calculatedCodeVerifier) {
		throw new Err.ExchangeCodeNotValid()
	}

	return ctx
}
