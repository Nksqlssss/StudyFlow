export type AsyncGateToken = {
	session: number;
	version: number;
};

export function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
	return error instanceof Error ? error.message : fallback;
}

export function createAsyncGate() {
	let sessionVersion = 0;
	let loadVersion = 0;
	let mutationVersion = 0;

	return {
		nextLoad(): AsyncGateToken {
			return {
				session: sessionVersion,
				version: ++loadVersion
			};
		},

		nextMutation(): AsyncGateToken {
			return {
				session: sessionVersion,
				version: ++mutationVersion
			};
		},

		invalidateLoads() {
			loadVersion++;
		},

		reset() {
			sessionVersion++;
			loadVersion++;
			mutationVersion++;
		},

		isCurrentLoad(token: AsyncGateToken) {
			return token.session === sessionVersion && token.version === loadVersion;
		},

		isCurrentMutation(token: AsyncGateToken) {
			return token.session === sessionVersion && token.version === mutationVersion;
		}
	};
}
