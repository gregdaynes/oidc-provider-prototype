import Fastify from 'fastify'
import fp from 'fastify-plugin'
import App from '../index.js'

process.env.NODE_ENV = 'test'

const config = {
	TRUST_PROXY: true,
	SESSION_SECRET: ['testsessionsecret'],
}

export async function build (opts = {}) {
	const app = Fastify()

	await app.register(fp(App), {
		testing: true,
		...config,
		...opts,
	})

	return app
}
