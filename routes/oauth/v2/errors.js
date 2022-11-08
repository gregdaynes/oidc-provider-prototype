export class ResponseTypeNotValid extends Error {
	constructor (message) {
		super(message)
		this.name = 'ErrorResponseTypeNotValid'
	}
}

export class ScopeNotValid extends Error {
	constructor (message) {
		super(message)
		this.name = 'ErrorScopeNotValid'
	}
}

export class ClientNotFound extends Error {
	constructor (message) {
		super(message)
		this.name = 'ErrorClientNotFound'
	}
}

export class CodeChallengeNotPresent extends Error {
	constructor (message) {
		super(message)
		this.name = 'ErrorCodeChallengeNotPreset'
	}
}

export class RedirectUriNotPresent extends Error {
	constructor (message) {
		super(message)
		this.name = 'ErrorRedirectUriNotPresent'
	}
}

export class RedirectUriNotValid extends Error {
	constructor (message) {
		super(message)
		this.name = 'ErrorRedirectUriNotValid'
	}
}

export class CodeChallengeMethodNotAccepted extends Error {
	constructor (message) {
		super(message)
		this.name = 'ErrorCodeChallengeMethodNotAccepted'
	}
}

export class AccountCredentialsDoNotMatch extends Error {
	constructor (message) {
		super(message)
		this.name = 'ErrorAccountCredentialsDoNotMatch'
	}
}

export class CodeNotValid extends Error {
	constructor (message) {
		super(message)
		this.name = 'ErrorCodeNotValid'
	}
}

export class GrantTypeNotValid extends Error {
	constructor (message) {
		super(message)
		this.name = 'ErrorGrantTypeNotValid'
	}
}

export class ClientSecretNotValid extends Error {
	constructor (message) {
		super(message)
		this.name = 'ErrorClientSecretNotValid'
	}
}

export class ExchangePayloadNotFound extends Error {
	constructor (message) {
		super(message)
		this.name = 'ErrorExchangePayloadNotFound'
	}
}

export class ExchangeCodeNotValid extends Error {
	constructor (message) {
		super(message)
		this.name = 'ErrorExchangeCodeNotValid'
	}
}
