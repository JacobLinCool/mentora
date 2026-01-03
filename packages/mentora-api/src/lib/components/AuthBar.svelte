<script lang="ts">
	import {
		subscribeToAuth,
		signInWithGoogle,
		signOutUser,
		type AuthState
	} from '$lib/explorer/firebase';
	import { onMount, onDestroy } from 'svelte';

	// Auth state
	let authState = $state<AuthState>({
		user: null,
		token: null,
		loading: true,
		error: null
	});

	let unsubscribe: (() => void) | null = null;

	onMount(() => {
		unsubscribe = subscribeToAuth((state) => {
			authState = state;
		});
	});

	onDestroy(() => {
		unsubscribe?.();
	});

	async function handleSignIn() {
		try {
			await signInWithGoogle();
		} catch {
			// Error already in authState
		}
	}

	async function handleSignOut() {
		try {
			await signOutUser();
		} catch {
			// Error already in authState
		}
	}

	function copyToken() {
		if (authState.token) {
			navigator.clipboard.writeText(authState.token);
		}
	}
</script>

<div class="auth-bar">
	{#if authState.loading}
		<div class="auth-status loading">
			<span class="status-dot loading"></span>
			<span>載入中...</span>
		</div>
	{:else if authState.user}
		<div class="auth-status authenticated">
			<span class="status-dot success"></span>
			<img
				src={authState.user.photoURL || ''}
				alt={authState.user.displayName || 'User'}
				class="user-avatar"
			/>
			<span class="user-name">{authState.user.displayName || authState.user.email}</span>
			<button class="token-btn" onclick={copyToken} title="Copy Token"> 🔑 </button>
			<button class="sign-out-btn" onclick={handleSignOut}>登出</button>
		</div>
	{:else}
		<div class="auth-status unauthenticated">
			<span class="status-dot"></span>
			<span>未登入</span>
			<button class="sign-in-btn" onclick={handleSignIn}>
				<svg class="google-icon" viewBox="0 0 24 24" width="16" height="16">
					<path
						fill="currentColor"
						d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
					/>
					<path
						fill="currentColor"
						d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
					/>
					<path
						fill="currentColor"
						d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
					/>
					<path
						fill="currentColor"
						d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
					/>
				</svg>
				Google 登入
			</button>
		</div>
	{/if}

	{#if authState.error}
		<div class="auth-error">
			<span class="error-icon">⚠️</span>
			{authState.error}
		</div>
	{/if}
</div>

<style>
	.auth-bar {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1rem;
		background: #1e293b;
		border-radius: 8px;
		border: 1px solid #334155;
	}

	.auth-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #64748b;
	}

	.status-dot.success {
		background: #22c55e;
	}

	.status-dot.loading {
		background: #f59e0b;
		animation: pulse 1s infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.user-avatar {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 1px solid #334155;
	}

	.user-name {
		color: #e2e8f0;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.token-btn {
		background: #334155;
		border: none;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.75rem;
	}

	.token-btn:hover {
		background: #475569;
	}

	.sign-in-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: #3b82f6;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.sign-in-btn:hover {
		background: #2563eb;
	}

	.google-icon {
		flex-shrink: 0;
	}

	.sign-out-btn {
		background: transparent;
		color: #94a3b8;
		border: 1px solid #334155;
		padding: 0.375rem 0.75rem;
		border-radius: 4px;
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.sign-out-btn:hover {
		border-color: #ef4444;
		color: #ef4444;
	}

	.auth-error {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		color: #ef4444;
		font-size: 0.75rem;
	}

	.error-icon {
		font-size: 0.875rem;
	}
</style>
