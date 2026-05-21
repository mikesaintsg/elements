<script lang="ts" setup>
/**
 * AuthExample — split-screen sign-in page port of mailbox's AuthExample.
 *
 * Layout intent:
 *   - Fixed-viewport two-column split: brand panel (left, hidden <1024px)
 *     + form panel (right, fills remaining; full-width on mobile).
 *   - No body-shell <nav>, <header>, <aside>, or <footer> — just <main>.
 *   - The <aside class="auth-brand"> is a scoped grid child INSIDE <main>,
 *     NOT at body-shell position. It won't pick up body-shell aside chrome.
 *   - <main> gets zero padding tokens so the auth-shell grid owns layout.
 *
 * Body-shell pattern: Vue fragment renders <main> only (no wrapping element).
 * ExamplesShell renders a fragment too, so <main> sits as an effective
 * grandchild of <body> via the #app `display: contents` hop.
 *
 * Translation rules (per the spec):
 *   - `<div class="auth d-flex">` → <main class="auth-shell"> (CSS grid)
 *   - `<aside class="auth-brand">` → scoped <aside> inside <main> (not body-shell)
 *   - `bg-gradient-spotlight, bg-gradient-brand` → scoped gradient CSS (flagged below)
 *   - `<form class="needs-validation">` → <form> wired with useForm
 *   - `.form-label` + `.form-control` → <label> + <input> (framework form chrome)
 *   - `.form-check` + `.form-check-input` → <label><input type="checkbox">…</label>
 *   - `<button class="btn btn-secondary">` (OAuth) → <button class="secondary">
 *   - `<button class="btn btn-primary w-100">` → <button class="primary w-full">
 *   - `.spinner-border` → <span class="spinner"> (framework spinner primitive)
 *   - `.divider` → scoped .auth-divider (framework-gap: see below)
 *   - Rounded-circle avatar → <span class="avatar"> (framework .avatar component)
 *
 * Framework gaps flagged:
 *   1. .auth-divider (labelled "or" separator) — high-value universal auth
 *      pattern; no framework .divider primitive. Scoped only for now.
 *   2. Gradient panel backgrounds — scoped; Marketing also needed this.
 *      Two examples → stronger signal for a framework gradient utility/token.
 *   3. OAuth button rows — provider icons (Google/GitHub) have no framework
 *      tokens. Using external as stand-in + TODO comments below.
 */
import { ref, useTemplateRef } from 'vue'
import { useForm } from '@elements/browser'

// ── useForm wiring ─────────────────────────────────────────────────────────
// email + password are required; useForm's submit-gated validation lights up
// invalid chrome after the first submission attempt.
const formRef = useTemplateRef<HTMLFormElement>('formRef')
const form = useForm(formRef)

// Loading state for the submit button. useForm's API surfaces valid/validated
// but doesn't own an async-loading concept, so a local ref is the right tool.
// Pattern mirrors mailbox's `submitted` ref + setTimeout approach.
const loading = ref(false)

const remember = ref(true)

const handleSubmit = (): void => {
	// Trigger form validation chrome before the loading state.
	if (!form.check()) return
	loading.value = true
	setTimeout(() => {
		loading.value = false
	}, 1500)
}
</script>

<template>
	<!-- Auth shell — <main> only (no body-shell nav/header/aside/footer).
	     Token overrides collapse the framework's default main padding to zero
	     so the auth-shell grid owns all layout. The ExamplesShell toolbar
	     can't overlap content: `body:has(.examples-toolbar)` reserves a bottom
	     safe-area (see `styles/examples.css`). -->
	<main
		class="auth-shell"
		style="--set-main-padding-inline: 0; --set-main-padding-block: 0; --set-main-gap: 0"
	>
		<!-- ── Brand panel ──────────────────────────────────────────────── -->
		<!-- NOTE: this <aside> is a scoped grid child inside <main>, NOT at
		     body-shell position — it won't pick up the framework's body-shell
		     aside chrome. Hidden below 1024px via .auth-brand scoped CSS. -->
		<aside class="auth-brand" aria-label="Brand">
			<!-- Brand logo -->
			<a href="#" class="auth-brand-link">
				<!-- TODO icon swap — external stands in for missing 'box' (brand icon) -->
				<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-external)"></i>
				<strong>elements</strong>
			</a>

			<!-- Testimonial blockquote -->
			<div class="auth-brand-body">
				<blockquote class="auth-blockquote">
					<p>
						"We removed three component libraries the week we adopted elements. Onboarding now reads
						like the platform's own docs — because that's what it is."
					</p>
					<footer class="auth-blockquote-footer">
						<span class="avatar" aria-hidden="true">ML</span>
						<div class="auth-blockquote-attribution">
							<strong>Margaret Liang</strong>
							<small>VP Engineering, Stratus</small>
						</div>
					</footer>
				</blockquote>
			</div>

			<!-- Trust badges -->
			<ul class="auth-trust-badges" role="list">
				<li>
					<!-- TODO icon swap — success stands in for missing 'shield-check' -->
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-success)"></i>
					SOC 2 Type II
				</li>
				<li>
					<!-- TODO icon swap — external stands in for missing 'globe' (network icon) -->
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-external)"></i>
					WCAG 2.2 AA
				</li>
				<li>
					<!-- TODO icon swap — warning stands in for missing 'lock' (security icon) -->
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-warning)"></i>
					Encrypted at rest
				</li>
			</ul>
		</aside>

		<!-- ── Form panel ───────────────────────────────────────────────── -->
		<div class="auth-form">
			<!-- Header row — mobile-only brand + "Create account" link -->
			<header class="auth-form-header">
				<!-- Brand shown only on mobile (hidden at lg via scoped CSS) -->
				<a href="#" class="auth-brand-link auth-mobile-brand">
					<!-- TODO icon swap — external stands in for missing 'box' (brand icon) -->
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-external)"></i>
					<strong>elements</strong>
				</a>
				<span class="auth-form-header-cta">
					New here?
					<a href="#" class="font-semibold">Create an account</a>
				</span>
			</header>

			<!-- Centered form card -->
			<div class="auth-form-body">
				<div class="auth-card">
					<!-- Heading -->
					<h1>Welcome back</h1>
					<p class="auth-card-subhead">Sign in to continue to your workspace.</p>

					<!-- OAuth buttons -->
					<menu class="auth-oauth-buttons" role="list">
						<li>
							<button type="button" class="secondary w-full">
								<!-- TODO icon swap — external stands in for missing 'google' (brand icon) -->
								<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-external)"></i>
								Continue with Google
							</button>
						</li>
						<li>
							<button type="button" class="secondary w-full">
								<!-- TODO icon swap — sort stands in for missing 'github' (brand icon) -->
								<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-sort)"></i>
								Continue with GitHub
							</button>
						</li>
					</menu>

					<!-- Labelled "or" divider — scoped .auth-divider.
					     Framework-gap: the labelled divider is a universal auth pattern.
					     The framework's <hr> is void and can't host inline text.
					     There is no .divider primitive. Implemented as scoped CSS for
					     now; RECOMMENDED for a framework .divider component class
					     (same class-root pattern as .badge / .tag / .dot).
					     Estimate: COMPONENT_CONTRACTS entry + components.md doc +
					     showcase demo + tests — ~1 day of work. -->
					<p class="auth-divider">or</p>

					<!-- Sign-in form wired with useForm -->
					<form ref="formRef" @submit.prevent="handleSubmit">
						<label>
							<span>Email address</span>
							<input
								type="email"
								name="email"
								autocomplete="email"
								required
								placeholder="you@company.com"
							/>
						</label>

						<div class="auth-password-row">
							<label class="auth-password-label">
								<span>Password</span>
								<input
									type="password"
									name="password"
									autocomplete="current-password"
									required
									placeholder="••••••••"
								/>
							</label>
							<a href="#" class="auth-forgot-link">Forgot?</a>
						</div>

						<label class="auth-remember-label">
							<input v-model="remember" type="checkbox" name="remember" />
							<span>Keep me signed in for 30 days</span>
						</label>

						<!-- Submit button — the framework `.loading` state auto-shrinks the
						     child `.spinner` to 1em + contrast color (button.loading > .spinner),
						     so the inline spinner is proportioned to the label out of the box. -->
						<button type="submit" class="primary w-full" :class="{ loading }" :disabled="loading">
							<template v-if="!loading">
								<!-- TODO icon swap — chevron-right stands in for missing 'box-arrow-in-right' -->
								<i
									class="icon"
									aria-hidden="true"
									style="--icon: var(--set-icon-chevron-right)"
								></i>
								Sign in
							</template>
							<template v-else>
								<span class="spinner" role="status" aria-label="Signing in"></span>
								Signing in…
							</template>
						</button>

						<!-- Terms text -->
						<p class="auth-terms">
							By continuing you agree to the
							<a href="#">Terms</a> and acknowledge the <a href="#">Privacy notice</a>.
						</p>
					</form>
				</div>
			</div>

			<!-- Footer row -->
			<footer class="auth-form-footer">
				<a href="#">
					<!-- TODO icon swap — information stands in for missing 'shield' (trust center icon) -->
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-information)"></i>
					Trust center
				</a>
				<a href="#">
					<!-- TODO icon swap — warning stands in for missing 'life-preserver' (help icon) -->
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-warning)"></i>
					Help
				</a>
				<a href="#">
					<!-- TODO icon swap — sort stands in for missing 'translate' (language icon) -->
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-sort)"></i>
					English (US)
				</a>
			</footer>
		</div>
	</main>
</template>

<style scoped>
/* ── Auth shell — outer grid ────────────────────────────────────────────────
 *
 * Brand panel left (28rem fixed) | form panel right (fills remaining).
 * min-block-size: 100dvh so the panel fills the viewport without overflow.
 * On mobile (<1024px) collapses to single column (form only; brand hidden).
 * ────────────────────────────────────────────────────────────────────────── */
.auth-shell {
	display: grid;
	grid-template-columns: 28rem minmax(0, 1fr);
	/* Fill the body-shell main cell (`100%`), not the raw viewport
	 * (`100dvh`): the example shell reserves a bottom safe-area for the
	 * floating toolbar (see `styles/examples.css`), so the main cell is
	 * shorter than the viewport. `100dvh` would overflow that reserve and
	 * push the form footer under the toolbar. */
	min-block-size: 100%;
}

/* ── Brand panel ────────────────────────────────────────────────────────────
 *
 * Gradient background with light foreground text. The brand gradient uses
 * a radial spotlight over a primary-tinted linear gradient — same approach
 * as Marketing's hero gradient (two examples now want gradient chrome →
 * framework-gap signal for a gradient utility/token).
 *
 * NOTE: this <aside> is inside <main>, not at body-shell position.
 * It's a scoped grid child. It gets NO framework body-shell aside chrome.
 * ────────────────────────────────────────────────────────────────────────── */
.auth-brand {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	padding: 2.5rem;
	/* Gradient: radial spotlight + linear brand gradient — scoped.
	 * Framework-gap: Marketing also has a hero gradient. Two examples now
	 * want gradient backgrounds → signal for a framework gradient token. */
	background:
		radial-gradient(
			ellipse at 30% 20%,
			color-mix(in oklab, var(--color-primary) 30%, transparent),
			transparent 60%
		),
		linear-gradient(
			135deg,
			color-mix(in oklab, var(--color-primary) 80%, black),
			color-mix(in oklab, var(--color-primary) 60%, black)
		);
	color: #fff;
}

/* ── Brand link (shared by both panels) ─────────────────────────────────── */
.auth-brand-link {
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	text-decoration: none;
	font-weight: 700;
	color: inherit;
}

.auth-brand-link:hover {
	color: inherit;
	text-decoration: none;
}

/* ── Brand body (blockquote area) ───────────────────────────────────────── */
.auth-brand-body {
	flex: 1;
	display: flex;
	align-items: center;
}

/* ── Testimonial blockquote ─────────────────────────────────────────────── */
.auth-blockquote {
	margin: 0;
}

.auth-blockquote p {
	font-size: 1.25rem;
	font-weight: 600;
	line-height: 1.5;
	margin-block-end: 1.25rem;
	color: inherit;
}

.auth-blockquote-footer {
	display: flex;
	align-items: center;
	gap: 0.875rem;
}

.auth-blockquote-attribution {
	display: flex;
	flex-direction: column;
	gap: 0.125rem;
}

.auth-blockquote-attribution strong {
	font-size: 0.9375rem;
	color: inherit;
}

.auth-blockquote-attribution small {
	font-size: 0.8125rem;
	opacity: 0.75;
	color: inherit;
}

/* ── Trust badges ───────────────────────────────────────────────────────── */
.auth-trust-badges {
	display: flex;
	gap: 1.25rem;
	list-style: none;
	margin: 0;
	padding: 0;
	font-size: 0.8125rem;
	opacity: 0.8;
}

.auth-trust-badges li {
	display: flex;
	align-items: center;
	gap: 0.375rem;
}

/* ── Form panel ─────────────────────────────────────────────────────────── */
.auth-form {
	display: flex;
	flex-direction: column;
	min-block-size: 0;
	background-color: var(--color-surface);
}

/* ── Form header row ────────────────────────────────────────────────────── */
.auth-form-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 1rem 1.5rem;
	border-block-end: 1px solid var(--color-border);
	/* Override body-shell <header> band-height chrome if this element somehow
	 * picks up the selector — kept scoped to this component. */
	min-block-size: unset;
}

/* Mobile-only brand mark — hidden at desktop (brand panel is visible) */
.auth-mobile-brand {
	color: var(--color-text);
}

@media (min-width: 1024px) {
	.auth-mobile-brand {
		display: none;
	}
}

.auth-form-header-cta {
	margin-inline-start: auto;
	font-size: 0.875rem;
	color: var(--color-text-subtle);
}

/* ── Centered form body ─────────────────────────────────────────────────── */
.auth-form-body {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 2rem 1.5rem;
}

/* ── Form card ──────────────────────────────────────────────────────────── */
.auth-card {
	inline-size: 100%;
	max-inline-size: 26rem;
}

.auth-card h1 {
	font-size: 1.5rem;
	font-weight: 700;
	margin-block-end: 0.25rem;
}

.auth-card-subhead {
	color: var(--color-text-subtle);
	font-size: 0.9375rem;
	margin-block-end: 1.5rem;
}

/* ── OAuth button list ──────────────────────────────────────────────────── */
.auth-oauth-buttons {
	display: flex;
	flex-direction: column;
	gap: 0.625rem;
	list-style: none;
	margin: 0;
	margin-block-end: 1.25rem;
	padding: 0;
}

.auth-oauth-buttons li {
	display: contents;
}

/* ── Labelled "or" divider ──────────────────────────────────────────────────
 *
 * Framework-gap: the labelled divider (horizontal rule broken by centered
 * "or" text) is a universal auth/form pattern. The framework's <hr> is void
 * and cannot hold inline text. There is NO framework .divider primitive.
 *
 * Recommendation: add a framework `.divider` component class following the
 * same class-root fallback pattern as `.badge` / `.tag` / `.dot`. Scope:
 * COMPONENT_CONTRACTS entry + components.md doc + showcase demo + tests
 * (~1 day). Until then, this scoped rule handles Auth's use case.
 * ────────────────────────────────────────────────────────────────────────── */
.auth-divider {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	color: var(--color-text-subtle);
	font-size: 0.8125rem;
	margin-block: 1.25rem;
}

.auth-divider::before,
.auth-divider::after {
	content: '';
	flex: 1;
	border-block-start: 1px solid var(--color-border);
}

/* ── Password row (label + forgot link) ─────────────────────────────────── */
.auth-password-row {
	position: relative;
}

.auth-password-label {
	display: flex;
	flex-direction: column;
}

.auth-forgot-link {
	position: absolute;
	inset-block-start: 0;
	inset-inline-end: 0;
	font-size: 0.8125rem;
}

/* ── Remember-me checkbox label ─────────────────────────────────────────── */
.auth-remember-label {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 0.5rem;
}

.auth-remember-label span {
	font-size: 0.875rem;
}

/* ── Terms text ─────────────────────────────────────────────────────────── */
.auth-terms {
	font-size: 0.8125rem;
	color: var(--color-text-subtle);
	margin-block-start: 0.875rem;
	margin-block-end: 0;
}

/* ── Form footer row ────────────────────────────────────────────────────── */
.auth-form-footer {
	display: flex;
	justify-content: center;
	gap: 1.5rem;
	padding: 0.875rem 1.5rem;
	border-block-start: 1px solid var(--color-border);
	font-size: 0.8125rem;
}

.auth-form-footer a {
	display: inline-flex;
	align-items: center;
	gap: 0.375rem;
	color: var(--color-text-subtle);
	text-decoration: none;
}

.auth-form-footer a:hover {
	color: var(--color-text);
}

/* ── Responsive — mobile collapse (must be last to win over base rules) ─────
 *
 * The @media block must come AFTER all base rules in source order so the
 * media-query overrides win at equal specificity (same scoped attribute
 * selector weight). At ≤1024px: single-column grid, brand panel hidden.
 * ────────────────────────────────────────────────────────────────────────── */
@media (max-width: 1024px) {
	.auth-shell {
		grid-template-columns: minmax(0, 1fr);
	}

	.auth-brand {
		display: none;
	}
}
</style>
