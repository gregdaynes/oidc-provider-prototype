import S from 'fluent-json-schema'
import { sql } from '@databases/sqlite'
import { createHash } from 'node:crypto'
import * as Err from './errors.js'
import camelcaseKeys from 'camelcase-keys'

export default async function authorize (fastify) {
	await fastify.route({
		method: 'GET',
		url: '/authorize',
		handler: onRequest,
		schema: {
			query: S.object()
				.prop('client_id', S.string().required())
				.prop('response_type', S.string().required())
				.prop('scope', S.string())
				.prop('state', S.string())
				.prop('redirect_uri', S.string())
				.prop('code_challenge', S.string())
				.prop('code_challenge_method', S.string())
				.prop('prompt', S.string()),
		},
	})
}

async function onRequest (request, reply) {
	const ctx = {
		dbConnection: this.OIDCDB,
		responseTypes: this.config.RESPONSE_TYPES,
		codeChallengeMethods: this.config.CODE_CHALLENGE_METHODS,

		account: request.session.account,
		oauth: request.session.oauth,
		client: request.session.client,

		attributes: {
			...camelcaseKeys(request.query),
		},
	}

	try {
		ensureResponseTypeValid(ctx)
		ensureScopeValid(ctx)
		await fetchClient(ctx)
		ensureCodeChallengeMatchesClientParams(ctx)
		ensureRedirectUriMatchesClientParams(ctx)
		ensureCodeChallengeMethodAcceptable(ctx)
		ensurePromptAndUserAuthStatus(ctx)

		generateCodeResponse(ctx)
		await storeCodes(ctx)

		maybeRenderAuthenticationForm(ctx)
		// TODO maybe already authenticated
		// TODO maybe already authorized

		request.session.oauth = {
			state: ctx.attributes.state,
			code: ctx.code,
		}

		request.session.client = ctx.client

		if (ctx.response && ctx.response.type) {
			reply.type(ctx.response.type)
			return reply.send(ctx.response.payload)
		}
	} catch (err) {
		request.log.error(ctx, err)

		if ([
			'ErrorResponseTypeNotValid',
			'ErrorScopeNotValid',
			'ErrorClientNotFound',
			'ErrorCodeChallengeNotPreset',
			'ErrorRedirectUriNotPresent',
			'ErrorRedirectUriNotValid',
			'ErrorCodeChallengeMethodNotAccepted',
		].includes(err.name)) {
			return this.httpErrors.badRequest()
		}

		throw new Error(err)
	}
}

function ensureResponseTypeValid (ctx) {
	const responseTypes = ctx.responseTypes
	const responseType = ctx.attributes.responseType

	if (!responseTypes.includes(responseType)) {
		throw new Err.ResponseTypeNotValid()
	}

	return ctx
}

function ensureScopeValid (ctx) {
	const scope = ctx.attributes.scope

	if (!scope) throw new Err.ScopeNotValid()

	if (!scope.split(',').includes('openid')) {
		throw new Err.ScopeNotValid()
	}

	return ctx
}

async function fetchClient (ctx) {
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
	ctx.client = client

	return ctx
}

function ensureCodeChallengeMatchesClientParams (ctx) {
	const client = ctx.client

	if (client.pkceEnabled) {
		if (!ctx.attributes.codeChallenge) {
			throw new Err.CodeChallengeNotPresent()
		}
	}

	return ctx
}

function ensureRedirectUriMatchesClientParams (ctx) {
	const client = ctx.client

	if (client.callbackUrl.length > 1) {
		if (!ctx.attributes.redirectUri) {
			throw new Err.RedirectUriNotPresent()
		}

		if (!client.callbackUrl.includes(ctx.attributes.redirectUri)) {
			throw new Err.RedirectUriNotValid()
		}
	}

	return ctx
}

function ensureCodeChallengeMethodAcceptable (ctx) {
	const challengeMethod = ctx.attributes.codeChallengeMethod
	const acceptableMethods = ctx.codeChallengeMethods

	if (!challengeMethod) return ctx

	if (!acceptableMethods.includes(challengeMethod)) {
		throw new Err.CodeChallengeMethodNotAccepted()
	}
}

function ensurePromptAndUserAuthStatus (ctx) {
	if (!ctx.user || !ctx.user?.isAuthenticated) {
		if (ctx.attributes.prompt === 'none') {
			throw new Error('not implemented')
		}
	}

	if (ctx.user || ctx.user?.isAuthenticated) {
		if (!ctx.attributes.prompt === 'none') {
			throw new Error('not implemented')
		}
	}

	return ctx
}

function generateCodeResponse (ctx) {
	const clientId = ctx.attributes.clientId
	const state = ctx.attributes.state

	const salt = Math.random().toString(36).slice(2)
	const code = createHash('sha256')
		.update(`${clientId}-${state}-${salt}`)
		.digest('base64url')

	ctx.code = code

	return ctx
}

async function storeCodes (ctx) {
	const db = ctx.dbConnection
	const code = ctx.code
	const challenge = ctx.attributes.codeChallenge
	const challengeAlg = ctx.attributes.codeChallengeMethod || 'plain'
	const state = ctx.attributes.state
	const callbackUrl = ctx.attributes.redirectUri
	const grantType = 'authorization_code'
	// TODO this needs to be an internal id
	const clientId = ctx.client.id

	await db.query(sql`
		INSERT INTO oidc_exchange (code, state, challenge, challenge_alg, client_id, callback_url, grant_type)
		VALUES (${code}, ${state}, ${challenge}, ${challengeAlg}, ${clientId}, ${callbackUrl}, ${grantType})
	`)

	return ctx
}

function maybeRenderAuthenticationForm (ctx) {
	const user = ctx.user
	const prompt = ctx.attributes.prompt

	if (!user || !user.isAuthenticated || prompt === 'login') {
		ctx.response = {
			type: 'text/html; charset=UTF-8',
			payload: `
				<!doctype html>
				<html>
				<body>
					<form method="post" action="/oauth/v2/authenticate">
						<input type="text" name="username" placeholder="username" />
						<input type="password" name="password" placeholder="password" />
						<button type="submit">Authenticate</button>
					</form>
				</body>
				</html>
			`,
		}
	}

	return ctx
}
