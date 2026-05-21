<script lang="ts" setup>
/**
 * SigninExample — the framework's focused-form + overlay pillar.
 *
 * A split-screen sign-in: a solid brand panel (hidden on mobile) beside
 * a sign-in card. Three composables compose the interactivity:
 *
 *   useForm    submit-gated validation on the sign-in fields
 *   useDialog  the "Reset password" modal (top-layer, ::backdrop, trap)
 *   useToast   the confirmation <div role="status" popover>
 *
 * The submit button shows the framework `.loading` spinner state while
 * "signing in". Everything visual — card, OAuth buttons, inputs, dialog,
 * toast — is a bare element + modifier.
 */
import { ref, useTemplateRef } from 'vue'
import { useDialog, useForm, useToast } from '../../../src/browser'

const loading = ref(false)
const toastMsg = ref('')

const toastRef = useTemplateRef<HTMLDivElement>('toastRef')
const toast = useToast(toastRef)
const notify = (message: string): void => {
	toastMsg.value = message
	toast.show()
}

const formRef = useTemplateRef<HTMLFormElement>('formRef')
useForm(formRef, {
	on: {
		submit: (event: Event) => {
			event.preventDefault()
			loading.value = true
			setTimeout(() => {
				loading.value = false
				notify('Signed in — welcome back, Mike.')
			}, 1100)
		},
	},
})

const resetRef = useTemplateRef<HTMLDialogElement>('resetRef')
const reset = useDialog(resetRef, { modal: true })
const sendReset = (): void => {
	reset.hide()
	notify('Reset link sent — check your inbox.')
}
</script>

<template>
	<main>
		<div class="grid lg:grid-cols-2 gap-8 w-full max-w-5xl mx-auto my-auto items-center">
			<!-- Brand panel — solid identity surface, hidden on mobile. -->
			<article class="primary filled hidden lg:flex">
				<header>
					<span class="avatar square" aria-hidden="true">E</span>
				</header>
				<h2 class="text-3xl">Build with the grain of the web.</h2>
				<p>The semantic-first framework where the HTML element is the component.</p>
				<ul class="list-none flex flex-col gap-2">
					<li class="flex items-center gap-2">
						<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-check)"></i>
						Zero config, all semantics
					</li>
					<li class="flex items-center gap-2">
						<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-check)"></i>
						Themed in a single knob
					</li>
					<li class="flex items-center gap-2">
						<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-check)"></i>
						Accessible by default
					</li>
				</ul>
				<footer>
					<small>Trusted by teams at Acme, Globex, and Initech.</small>
				</footer>
			</article>

			<!-- Sign-in card. -->
			<div class="w-full max-w-sm mx-auto flex flex-col gap-6">
				<hgroup>
					<h1>Welcome back</h1>
					<p>Sign in to your Elements account.</p>
				</hgroup>

				<div class="flex flex-col gap-2">
					<button type="button" class="secondary subtle w-full">
						<i class="icon examples-icon-github" aria-hidden="true"></i>
						Continue with GitHub
					</button>
					<button type="button" class="secondary subtle w-full">
						<i class="icon examples-icon-google" aria-hidden="true"></i>
						Continue with Google
					</button>
				</div>

				<p class="text-center m-0">
					<small style="color: var(--color-text-subtle)">or sign in with email</small>
				</p>

				<form ref="formRef" class="stack">
					<label>
						Email
						<input
							type="email"
							name="email"
							placeholder="you@example.com"
							required
							autocomplete="email"
						/>
					</label>
					<label>
						Password
						<input
							type="password"
							name="password"
							placeholder="••••••••"
							required
							minlength="8"
							autocomplete="current-password"
						/>
					</label>

					<div class="flex items-center justify-between gap-2">
						<div class="flex items-center gap-2">
							<input id="remember" type="checkbox" name="remember" checked />
							<label for="remember">Remember me</label>
						</div>
						<a href="#" @click.prevent="reset.show()">Forgot password?</a>
					</div>

					<button type="submit" class="primary w-full" :class="{ loading }" :disabled="loading">
						<span v-if="loading" class="spinner" aria-hidden="true"></span>
						{{ loading ? 'Signing in…' : 'Sign in' }}
					</button>
				</form>

				<p class="text-center m-0">
					<small style="color: var(--color-text-subtle)">
						Don't have an account? <a href="#">Sign up</a>
					</small>
				</p>
			</div>
		</div>
	</main>

	<!-- Reset-password modal. -->
	<dialog ref="resetRef" aria-labelledby="reset-title">
		<header>
			<h2 id="reset-title">Reset password</h2>
			<button type="button" class="subtle compact" aria-label="Close" @click="reset.hide()">
				<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-close)"></i>
			</button>
		</header>
		<form class="stack" @submit.prevent="sendReset">
			<p>Enter your email and we'll send a reset link.</p>
			<label>
				Email
				<input type="email" name="reset-email" placeholder="you@example.com" required />
			</label>
			<footer class="flex justify-end gap-2">
				<button type="button" class="subtle" @click="reset.hide()">Cancel</button>
				<button type="submit" class="primary">Send reset link</button>
			</footer>
		</form>
	</dialog>

	<!-- Confirmation toast — the framework's <div role="status" popover>
	     toast surface driven by useToast. -->
	<div ref="toastRef" role="status" popover class="success">{{ toastMsg }}</div>
</template>
