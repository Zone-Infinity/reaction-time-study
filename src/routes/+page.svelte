<script lang="ts">
	type Phase = 'idle' | 'waiting' | 'ready' | 'finished';

	const TRIALS_TOTAL = 3;

	let phase = $state<Phase>('idle');
	let trialIndex = $state(0); // 0..2
	let trials = $state<number[]>([]);

	let delayMs = 0;
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	let greenAt = 0;
	let tooSoon = $state(false);

	let avg = $state<number | null>(null);

	let age = $state('');
	let student = $state('');
	let consent = $state(false);

	let submitting = $state(false);
	let submitOk = $state<boolean | null>(null);
	let submitError = $state('');

	function clearTimers() {
		if (timeoutId) clearTimeout(timeoutId);
		timeoutId = null;
	}

	function resetTest() {
		clearTimers();
		greenAt = 0;
		delayMs = 0;
		tooSoon = false;
		phase = 'idle';
		trialIndex = 0;
		trials = [];
		avg = null;
	}

	function beginTrial() {
		submitOk = null;
		submitError = '';

		clearTimers();

		phase = 'waiting';
		tooSoon = false;
		greenAt = 0;
		delayMs = 1000 + Math.floor(Math.random() * 2000); // 1000..2999

		timeoutId = setTimeout(() => {
			phase = 'ready';
			greenAt = performance.now();
			timeoutId = null;
		}, delayMs);
	}

	function startTest() {
		resetTest();
		beginTrial();
	}

	function recordReactionAndAdvance() {
		const t = Math.round(performance.now() - greenAt);
		trials = [...trials, t];

		if (trials.length >= TRIALS_TOTAL) {
			const a = Math.round(trials.reduce((s, x) => s + x, 0) / TRIALS_TOTAL);
			avg = a;
			phase = 'finished';
			return;
		}

		trialIndex = trials.length;
		clearTimers();
		phase = 'waiting';
		timeoutId = setTimeout(() => {
			timeoutId = null;
			beginTrial();
		}, 500);
	}

	function onPadClick() {
		if (phase === 'idle') {
			startTest();
			return;
		}

		if (phase === 'ready') {
			recordReactionAndAdvance();
			return;
		}

		if (phase === 'waiting') {
			// Early click: retry SAME trial
			tooSoon = true;
			clearTimers();
			timeoutId = setTimeout(() => {
				timeoutId = null;
				beginTrial();
			}, 1000);
		}
	}

	async function submit() {
		if (avg == null) return;

		submitting = true;
		submitOk = null;
		submitError = '';

		try {
			const res = await fetch('/api/submit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					avg,
					t1: trials[0],
					t2: trials[1],
					t3: trials[2],
					age,
					student
				})
			});

			const data = await res.json().catch(() => null);
			if (!res.ok || !data?.ok) {
				submitOk = false;
				submitError = data?.error ?? 'Submission failed';
				return;
			}

			submitOk = true;
		} catch {
			submitOk = false;
			submitError = 'Network error';
		} finally {
			submitting = false;
		}
	}

	const canSubmit = $derived(
		phase === 'finished' && avg != null && !!age && !!student && consent && !submitting
	);
</script>

<main>
	<section class="card">
		<header class="header">
			<h1>Reaction Time Study</h1>
			<p class="sub">Academic Project – IIT Kharagpur (Statistical Inference)</p>
			<p class="micro">This test takes ~15 seconds.</p>
		</header>

		{#if phase !== 'finished'}
			<div class="meta">
				<div class="pill">Trial {trialIndex + 1} / {TRIALS_TOTAL}</div>
				{#if trials.length > 0}
					<div class="pill">Recorded: {trials.join(', ')} ms</div>
				{/if}
			</div>

			<div
				class="pad"
				role="button"
				tabindex="0"
				aria-label="Reaction test area"
				data-state={phase === 'ready' ? 'green' : 'red'}
				onclick={onPadClick}
				onkeydown={(e) => e.key === 'Enter' && onPadClick()}
			>
				{#if phase === 'idle'}
					<div class="padText">
						<div class="big">Click anywhere to start</div>
						<div class="small">Then click as soon as it turns green (3 trials).</div>
					</div>
				{:else if phase === 'waiting'}
					<div class="padText">
						{#if tooSoon}
							<div class="big">Too soon!</div>
							<div class="small">Retrying the same trial…</div>
						{:else}
							<div class="big">Wait…</div>
							<div class="small">Don’t click until it turns green.</div>
						{/if}
					</div>
				{:else if phase === 'ready'}
					<div class="padText">
						<div class="big">CLICK!</div>
						<div class="small">Now</div>
					</div>
				{/if}
			</div>
		{:else}
			<div class="results">
				<h2 class="sectionTitle">Your Results</h2>

				<div class="resultGrid">
					<div class="result">
						<div class="k">T1</div>
						<div class="v">{trials[0]} ms</div>
					</div>
					<div class="result">
						<div class="k">T2</div>
						<div class="v">{trials[1]} ms</div>
					</div>
					<div class="result">
						<div class="k">T3</div>
						<div class="v">{trials[2]} ms</div>
					</div>
				</div>

				<div class="avgCard" aria-label="Average reaction time">
					<div class="k">Average</div>
					<div class="avgValue">{avg} ms</div>
					<div class="hint">Average human reaction time ≈ 250 ms</div>
				</div>

				<form class="form" onsubmit={(e) => (e.preventDefault(), canSubmit && submit())}>
					<div class="formSection">
						<div class="sectionTitleSm">About you</div>
						<div class="fields2">
							<label class="field">
								<span>Age group</span>
								<select bind:value={age}>
									<option value="" disabled selected>Select…</option>
									<option value="18–20">18–20</option>
									<option value="20–22">20–22</option>
									<option value="22+">22+</option>
								</select>
							</label>

							<label class="field">
								<span>Student</span>
								<select bind:value={student}>
									<option value="" disabled selected>Select…</option>
									<option value="Yes">Yes</option>
									<option value="No">No</option>
								</select>
							</label>
						</div>
					</div>

					<div class="formSection">
						<div class="sectionTitleSm">Consent</div>
						<label class="consent">
							<input type="checkbox" bind:checked={consent} />
							<span>I consent to submit my anonymized data for this academic study.</span>
						</label>
					</div>

					<div class="actions">
						<button class="btn primary" type="submit" disabled={!canSubmit || submitOk === true}>
							{#if submitting}
								<span class="spinner" aria-hidden="true"></span>
								<span>Submitting…</span>
							{:else}
								<span>{submitOk === true ? 'Submitted' : 'Submit'}</span>
							{/if}
						</button>
						<button
							class="btn ghost"
							type="button"
							disabled={submitting}
							onclick={() => {
								age = '';
								student = '';
								consent = false;
								submitOk = null;
								submitError = '';
								resetTest();
							}}
						>
							Restart
						</button>
					</div>

					{#if submitOk === true}
						<p class="status ok">✅ Response recorded. Thank you!</p>
					{:else if submitOk === false}
						<p class="status err">Error: {submitError}</p>
					{/if}
				</form>
			</div>
		{/if}
	</section>
</main>

<style>
	main {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		background: radial-gradient(1200px 500px at 50% -10%, rgba(64, 120, 255, 0.18), transparent 60%),
			#0b0f19;
		color: rgba(255, 255, 255, 0.92);
		font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji',
			'Segoe UI Emoji';
	}

	.card {
		width: min(720px, 100%);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 16px;
		background: rgba(255, 255, 255, 0.04);
		backdrop-filter: blur(8px);
		padding: 20px;
		margin: 16px;
		box-shadow: 0 20px 70px rgba(0, 0, 0, 0.4);
	}

	.header h1 {
		margin: 0;
		font-size: 28px;
		letter-spacing: -0.02em;
	}

	.sub {
		margin: 6px 0 0;
		color: rgba(255, 255, 255, 0.7);
		font-size: 13px;
	}

	.micro {
		margin: 10px 0 0;
		font-size: 12px;
		color: rgba(255, 255, 255, 0.72);
	}

	.meta {
		margin-top: 14px;
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.pill {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.8);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 999px;
		padding: 6px 10px;
		background: rgba(0, 0, 0, 0.2);
	}

	.pad {
		margin-top: 16px;
		border-radius: 16px;
		height: 260px;
		display: grid;
		place-items: center;
		user-select: none;
		cursor: pointer;
		border: 1px solid rgba(255, 255, 255, 0.08);
		transition: transform 90ms ease, filter 90ms ease;
		outline: none;
	}

	.pad:active {
		transform: scale(0.99);
	}

	.pad[data-state='red'] {
		background: linear-gradient(180deg, rgba(255, 60, 60, 0.18), rgba(255, 60, 60, 0.08));
	}

	.pad[data-state='green'] {
		background: linear-gradient(180deg, rgba(64, 255, 128, 0.22), rgba(64, 255, 128, 0.1));
	}

	.padText {
		text-align: center;
		padding: 0 16px;
	}

	.big {
		font-size: 30px;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.small {
		margin-top: 8px;
		font-size: 13px;
		color: rgba(255, 255, 255, 0.72);
	}

	.actions {
		margin-top: 14px;
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	.btn {
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.92);
		padding: 10px 12px;
		border-radius: 12px;
		font-weight: 600;
		cursor: pointer;
		transition: filter 120ms ease, transform 90ms ease;
	}

	.btn:hover:enabled {
		filter: brightness(1.1);
	}

	.btn:active:enabled {
		transform: translateY(1px);
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.ghost {
		background: transparent;
	}

	.results {
		margin-top: 16px;
	}

	.sectionTitle {
		margin: 0 0 10px;
		font-size: 16px;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: rgba(255, 255, 255, 0.9);
	}

	.sectionTitleSm {
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.65);
	}

	.resultGrid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
	}

	.result {
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 14px;
		padding: 12px;
		background: rgba(0, 0, 0, 0.25);
	}

	.avgCard {
		margin-top: 12px;
		border: 1px solid rgba(64, 120, 255, 0.22);
		border-radius: 16px;
		padding: 14px 14px 12px;
		background: linear-gradient(180deg, rgba(64, 120, 255, 0.18), rgba(0, 0, 0, 0.18));
		box-shadow: 0 0 0 1px rgba(64, 120, 255, 0.1) inset, 0 0 28px rgba(64, 120, 255, 0.12);
	}

	.k {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.7);
	}

	.v {
		margin-top: 6px;
		font-size: 18px;
		font-weight: 700;
	}

	.avgValue {
		margin-top: 6px;
		font-size: 30px;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: rgba(210, 230, 255, 0.98);
		text-shadow: 0 0 14px rgba(64, 120, 255, 0.35);
	}

	.hint {
		margin-top: 6px;
		font-size: 12px;
		color: rgba(255, 255, 255, 0.7);
	}

	.form {
		margin-top: 18px;
		display: grid;
		gap: 14px;
	}

	.formSection {
		display: grid;
		gap: 10px;
		padding-top: 2px;
	}

	.fields2 {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
	}

	.field {
		display: grid;
		gap: 6px;
	}

	.field span {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.75);
	}

	select {
		width: 100%;
		border-radius: 12px;
		padding: 10px 12px;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.12);
		color: rgba(255, 255, 255, 0.92);
		appearance: none;
	}

	select:focus {
		outline: none;
		border-color: rgba(64, 120, 255, 0.6);
	}

	.consent {
		display: flex;
		gap: 10px;
		align-items: flex-start;
		font-size: 13px;
		color: rgba(255, 255, 255, 0.8);
		line-height: 1.35;
	}

	.primary {
		border-color: rgba(64, 120, 255, 0.35);
		background: rgba(64, 120, 255, 0.18);
	}

	.spinner {
		width: 14px;
		height: 14px;
		border-radius: 999px;
		border: 2px solid rgba(255, 255, 255, 0.35);
		border-top-color: rgba(255, 255, 255, 0.95);
		animation: spin 700ms linear infinite;
		display: inline-block;
	}

	.primary {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.status {
		margin: 0;
		font-size: 13px;
	}

	.ok {
		color: rgba(128, 255, 170, 0.9);
	}

	.err {
		color: rgba(255, 140, 140, 0.95);
	}

	@media (max-width: 520px) {
		main {
			padding: 0;
		}

		.card {
			padding: 16px;
			margin: 12px;
		}

		.pad {
			height: 220px;
		}

		.resultGrid {
			gap: 8px;
		}

		.fields2 {
			grid-template-columns: 1fr;
		}

		.actions {
			gap: 8px;
		}

		.btn {
			width: 100%;
			justify-content: center;
		}
	}
 </style>
