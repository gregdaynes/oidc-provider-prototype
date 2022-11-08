import FormBody from '@fastify/formbody'
import { sql } from '@databases/sqlite'
import camelcaseKeys from 'camelcase-keys'

export default async function authenticate (fastify) {
	await fastify.register(FormBody)

	await fastify.route({
		method: 'GET',
		url: '/authenticate',
		handler: onRequest,
	})
}

async function onRequest (request, reply) {
	const ctx = {
		dbConnection: this.OIDCDB,

		account: request.session.account,
		oauth: request.session.oauth,
		client: request.session.client,

		csrfToken: reply.generateCsrf(),
	}

	try {
		maybeRenderGrantForm(ctx)

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
