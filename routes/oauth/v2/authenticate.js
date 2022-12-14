import S from 'fluent-json-schema'
import FormBody from '@fastify/formbody'
import { sql } from '@databases/sqlite'
import camelcaseKeys from 'camelcase-keys'
import * as Err from './errors.js'

export default async function authenticate (fastify) {
	await fastify.register(FormBody)

	await fastify.route({
		method: 'POST',
		url: '/authenticate',
		preHandler: fastify.csrfProtection,
		handler: onRequest,
		schema: {
			body: S.object()
				.prop('username', S.string().required())
				.prop('password', S.string().required()),
		},
	})
}

async function onRequest (request, reply) {
	const ctx = {
		dbConnection: this.OIDCDB,

		account: request.session.account,
		oauth: request.session.oauth,
		client: request.session.client,

		csrfToken: reply.generateCsrf(),

		attributes: {
			username: request.body.username,
			password: request.body.password,
		},
	}

	try {
		await fetchAccountByUsername(ctx)
		ensureAccountCredentialsMatch(ctx)
		maybeRenderGrantForm(ctx)

		request.session.user = ctx.account
		request.session.user.isAuthenticated = true

		if (ctx.response && ctx.response.type) {
			reply.type(ctx.response.type)
			return reply.send(ctx.response.payload)
		}
	} catch (err) {
		request.log.error(ctx, err)

		if ([
			'ErrorAccountCredentialsDoNotMatch',
		].includes(err.name)) {
			return this.httpErrors.badRequest()
		}

		throw new Error(err)
	}
}

async function fetchAccountByUsername (ctx) {
	const db = ctx.dbConnection
	const username = ctx.attributes.username

	const [account] = await db.query(sql`
		SELECT *
		FROM accounts
		WHERE username = ${username}
	`)

	ctx.account = camelcaseKeys(account)

	return ctx
}

function ensureAccountCredentialsMatch (ctx) {
	const password = ctx.attributes.password
	const accountPassword = ctx.account.password

	if (accountPassword !== password) {
		throw new Err.AccountCredentialsDoNotMatch()
	}

	return ctx
}

function maybeRenderGrantForm (ctx) {
	const csrfToken = ctx.csrfToken
	const name = ctx.client.name

	ctx.response = {
		type: 'text/html; charset=UTF-8',
		payload: `
				<!doctype html>
				<html>
				<body>
					<form method="post" action="/oauth/v2/grant">
						<p>Are you sure you want to grant ${name}, --scope-- privileges to your account?
						<button type="submit" name="grant" value="decline">no</button>
						<button type="submit" name="grant" value="accept">yes</button>
						<input type="hidden" name="_csrf" value="${csrfToken}" />
					</form>
				</body>
				</html>
			`,
	}

	return ctx
}
