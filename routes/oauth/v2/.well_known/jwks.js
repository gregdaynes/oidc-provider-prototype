export default async function jwks (fastify) {
	await fastify.route({
		method: 'GET',
		url: '/jwks',
		handler: () => ({ message: 'not implemented' }),
	})
}
