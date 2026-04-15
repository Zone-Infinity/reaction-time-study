import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json().catch(() => null);
		const { avg } = (body ?? {}) as { avg?: unknown };

		if (typeof avg !== 'number' || avg < 100 || avg > 1500) {
			return json({ ok: false, error: 'Invalid avg' }, { status: 400 });
		}

		// Data collection disabled: do not persist or forward submissions anywhere.
		return json(
			{ ok: false, error: 'Data collection is currently paused.' },
			{ status: 503, headers: { 'Cache-Control': 'no-store' } }
		);
	} catch {
		return json({ ok: false, error: 'Server error' }, { status: 500 });
	}
};
