import S from 'fluent-json-schema'
import FormBody from '@fastify/formbody'
import * as Err from './errors.js'
import { sql } from '@databases/sqlite'
import camelcaseKeys from 'camelcase-keys'
import { stringify } from 'node:querystring'

export default async function grant (fastify) {
	await fastify.register(FormBody)

	await fastify.route({
		method: 'POST',
		url: '/grant',
		preHandler: fastify.csrfProtection,
		handler: onRequest,
		schema: {
			body: S.object()
				.prop('grant', S.string().required()),
		},
	})
}

async function onRequest (request, reply) {
	const ctx = {
		dbConnection: this.OIDCDB,

		account: request.session.account,
		oauth: request.session.oauth,
		client: request.session.client,
		user: request.session.user,

		attributes: {
			...request.body,
		},
	}

	try {
		await fetchCodeFromExchange(ctx)

		const redirectUrl = ctx.payload.callbackUrl + '?' + stringify({
			code: ctx.payload.code,
			state: ctx.payload.state,
		})

		return reply.redirect(redirectUrl)
	} catch (err) {
		request.log.error(ctx, err)

		if ([
		].includes(err.name)) {
			return this.httpErrors.badRequest()
		}

		throw new Error(err)
	}
}

async function fetchCodeFromExchange (ctx) {
	const db = ctx.dbConnection
	const code = ctx.oauth.code

	let [payload] = await db.query(sql`
		SELECT *
		FROM oidc_exchange
		WHERE code = ${code}
	`)

	if (!payload) throw new Err.CodeNotValid()

	payload = camelcaseKeys(payload)
	payload.callbackUrl = payload.callbackUrl

	ctx.payload = payload

	return ctx
}
