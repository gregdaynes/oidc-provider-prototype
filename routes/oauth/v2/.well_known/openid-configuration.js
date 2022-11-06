export default async function openidConfugration (fastify) {
	await fastify.route({
		method: 'GET',
		url: '/openid-configuration',
		handler: () => ({ message: 'not implemented' }),
	})
}
