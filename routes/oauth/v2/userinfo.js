export default async function userinfo (fastify) {
	await fastify.route({
		method: 'GET',
		url: '/userinfo',
		handler: () => ({ message: 'not implemented' }),
	})
}
