export default async function revoke (fastify) {
	await fastify.route({
		method: 'GET',
		url: '/revoke',
		handler: () => ({ message: 'not implemented' }),
	})
}
