import Swagger from '@fastify/swagger'
import SwaggerUI from '@fastify/swagger-ui'
import fp from 'fastify-plugin'
import { readFileSync } from 'fs'
import { join } from 'desm'
const { version } = JSON.parse(readFileSync(join(import.meta.url, '../package.json')))

async function swaggerGenerator (fastify) {
	await fastify.register(Swagger, {
		swagger: {
			info: {
				title: 'Fastify OIDC Provider',
				description: 'Fastify OIDC Provider',
				version,
			},
			externalDocs: {
				url: 'https://github.com/gregdaynes/oidc',
				description: 'Find more info here',
			},
			host: `localhost:${fastify.config.PORT}`, // and your deployed url
			schemes: ['http', 'https'],
			consumes: ['application/json'],
			produces: ['application/json', 'text/html'],
			securityDefinitions: {
				Bearer: {
					type: 'apiKey',
					name: 'Bearer',
					in: 'header',
				},
				Csrf: {
					type: 'apiKey',
					name: 'x-csrf-token',
					in: 'header',
				},
			},
		},

		exposeRoute: fastify.config.NODE_ENV !== 'production',
	})

	if (fastify.config.NODE_ENV !== 'production') {
		await fastify.register(SwaggerUI, {
			routePrefix: '/documentation',
		})
	}
}

export default fp(swaggerGenerator, {
	name: 'swaggerGenerator',
})
