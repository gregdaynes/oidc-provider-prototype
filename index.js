import AutoLoad from '@fastify/autoload'
import Sensible from '@fastify/sensible'
import Env from '@fastify/env'
import Cors from '@fastify/cors'
import UnderPressure from '@fastify/under-pressure'
import S from 'fluent-json-schema'
import { join } from 'desm'
import Helmet from '@fastify/helmet'

export default async function app (fastify, opts) {
	await fastify.register(Helmet, {
		global: true,
		contentSecurityPolicy: false,
		crossOriginEmbedderPolicy: false,
	})

	await fastify.register(Env, {
		schema: S.object()
			.prop('NODE_ENV', S.string().default('production'))
			.prop('PORT', S.number().default(3000))
			.prop('SESSION_SECRET', S.array().default(['averylogphrasebiggerthanthirtytwochars']))
			.valueOf(),
	})

	await fastify.register(Sensible)

	await fastify.register(UnderPressure, {
		maxEventLoopDelay: 1000,
		maxHeapUsedBytes: 1000000000,
		maxRssBytes: 1000000000,
		maxEventLoopUtilization: 0.98,
	})

	await fastify.register(Cors, {
		origin: false,
	})

	await fastify.register(AutoLoad, {
		dir: join(import.meta.url, 'plugins'),
		options: Object.assign({}, opts),
	})

	await fastify.register(AutoLoad, {
		dir: join(import.meta.url, 'routes'),
		dirNameRoutePrefix: true,
		options: Object.assign({}, opts),
	})
}
