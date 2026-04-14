import { json } from '@sveltejs/kit';
import { SHEETDB_URL } from '$env/static/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { avg, t1, t2, t3, age, student } = body ?? {};

		if (typeof avg !== 'number' || avg < 100 || avg > 1500) {
			return json({ ok: false, error: 'Invalid avg' }, { status: 400 });
		}

		if (!SHEETDB_URL) {
			throw new Error('Missing SHEETDB_URL');
		}

		const resp = await fetch(SHEETDB_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				data: [
					{
						Timestamp: new Date().toISOString(),
						Avg: avg,
						T1: t1,
						T2: t2,
						T3: t3,
						Age: age,
						Student: student
					}
				]
			})
		});

		if (!resp.ok) {
			return json({ ok: false, error: 'SheetDB error' }, { status: 502 });
		}

		return json({ ok: true });
	} catch {
		return json({ ok: false, error: 'Server error' }, { status: 500 });
	}
};

