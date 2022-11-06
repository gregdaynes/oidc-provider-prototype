export default async function introspect (fastify) {
	await fastify.route({
		method: 'GET',
		url: '/introspect',
		handler: () => ({ message: 'not implemented' }),
	})
}
