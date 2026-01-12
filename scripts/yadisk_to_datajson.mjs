#!/usr/bin/env node

/*
Utility: Generate photo entries for js/data.json from a public Yandex.Disk folder

Usage:
  node scripts/yadisk_to_datajson.mjs "https://disk.yandex.ru/d/XXXXXXXX" [--write] [--default-coords="60.617597,56.903951"] [--common=false]

Notes:
- Traverses all subfolders; for each folder that contains image files directly, creates a photo entry.
- Date is parsed from folder name (dd.mm.yyyy or yyyy-mm-dd, etc.) or inferred from the newest file's modified date.
- Link points to the exact subfolder using the viewer query (?path=...).
- Coordinates default to the provided default-coords; adjust later as needed.
*/

import fs from 'fs';
import path from 'path';
import https from 'https';
import { URL } from 'url';

const YA_PUBLIC_API = 'https://cloud-api.yandex.net/v1/disk/public/resources';

function parseArgs() {
	const args = process.argv.slice(2);
	if (args.length === 0) {
		console.error('Missing public folder link.');
		process.exit(1);
	}
	const publicKey = args[0];
	const opts = { write: false, defaultCoords: [60.617597, 56.903951], common: false };
	for (const arg of args.slice(1)) {
		if (arg === '--write') opts.write = true;
		else if (arg.startsWith('--default-coords=')) {
			const val = arg.split('=')[1] ?? '';
			const parts = val.split(',').map(s => s.trim()).map(Number);
			if (parts.length === 2 && parts.every(n => Number.isFinite(n))) opts.defaultCoords = parts;
		}
		else if (arg.startsWith('--common=')) {
			const val = (arg.split('=')[1] ?? '').toLowerCase();
			opts.common = val === 'true' || val === '1' || val === 'yes';
		}
	}
	return { publicKey, opts };
}

function httpGetJson(url) {
	return new Promise((resolve, reject) => {
		https.get(url, res => {
			let data = '';
			res.on('data', chunk => (data += chunk));
			res.on('end', () => {
				try {
					const json = JSON.parse(data);
					if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
						resolve(json);
					} else {
						reject(new Error(`HTTP ${res.statusCode}: ${data}`));
					}
				} catch (e) {
					reject(e);
				}
			});
		}).on('error', reject);
	});
}

function buildApiUrl(publicKey, params = {}) {
	const u = new URL(YA_PUBLIC_API);
	u.searchParams.set('public_key', publicKey);
	for (const [k, v] of Object.entries(params)) {
		if (v === undefined || v === null) continue;
		u.searchParams.set(k, String(v));
	}
	return u.toString();
}

function toRelativePath(itemPath) {
	// API returns paths like 'public:/', 'public:/Subdir', 'public:/Subdir/Nested'
	return (itemPath || '').replace(/^public:\//, '/');
}

function isImageItem(item) {
	if (!item) return false;
	if (item.media_type === 'image') return true;
	const name = (item.name || '').toLowerCase();
	return /\.(jpe?g|png|gif|webp|heic|bmp|tiff?)$/.test(name);
}

function pad2(n) {
	return String(n).padStart(2, '0');
}

function parseDateFromName(name) {
	// Try patterns: dd.mm.yyyy, dd.mm.yy, yyyy-mm-dd, dd-mm-yyyy, etc.
	const n = name.toLowerCase();
	let m = n.match(/\b(\d{2})[._-](\d{2})[._-](\d{4})\b/);
	if (m) {
		const [_, d, mo, y] = m;
		return { y: Number(y), mo: Number(mo), d: Number(d) };
	}
	m = n.match(/\b(\d{4})[._-](\d{2})[._-](\d{2})\b/);
	if (m) {
		const [_, y, mo, d] = m;
		return { y: Number(y), mo: Number(mo), d: Number(d) };
	}
	m = n.match(/\b(\d{2})[._-](\d{2})\b/);
	if (m) {
		const [_, d, mo] = m;
		// Year unknown -> will be filled from files
		return { y: undefined, mo: Number(mo), d: Number(d) };
	}
	return undefined;
}

function toDatePartsFromIso(iso) {
	const dt = new Date(iso);
	if (isNaN(dt.getTime())) return undefined;
	return { y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

async function listDir(publicKey, relPath = '/', limit = 1000) {
	// Fetch directory listing for a given path (root or subdir)
	const params = { path: relPath === '/' ? undefined : relPath, limit };
	const url = buildApiUrl(publicKey, params);
	const json = await httpGetJson(url);
	const items = (json._embedded && Array.isArray(json._embedded.items)) ? json._embedded.items : [];
	return items;
}

async function crawlAllDirs(publicKey) {
	const stack = ['/'];
	const dirToItems = new Map();
	const seen = new Set();
	while (stack.length > 0) {
		const current = stack.pop();
		if (seen.has(current)) continue;
		seen.add(current);
		let items;
		try {
			items = await listDir(publicKey, current);
		} catch (e) {
			console.error(`Failed to list ${current}:`, e.message);
			continue;
		}
		dirToItems.set(current, items);
		for (const it of items) {
			if (it && it.type === 'dir') {
				const p = toRelativePath(it.path);
				stack.push(p);
			}
		}
	}
	return dirToItems;
}

function chooseDateForDir(dirName, files) {
	// Prefer date from dir name; fill missing year from newest file
	let parts = parseDateFromName(dirName);
	if (parts && parts.y && parts.mo && parts.d) return parts;
	const newest = files
		.map(f => f.modified)
		.filter(Boolean)
		.sort((a, b) => new Date(b) - new Date(a))[0];
	const fromNewest = newest ? toDatePartsFromIso(newest) : undefined;
	if (!parts && fromNewest) return fromNewest;
	if (parts && !parts.y && fromNewest) return { y: fromNewest.y, mo: parts.mo, d: parts.d };
	return parts || fromNewest;
}

function buildViewerLink(basePublicKey, relPath) {
	// Ensure basePublicKey is a disk.yandex.ru link
	let base = basePublicKey;
	if (/yadi\.sk\/d\//i.test(base)) {
		// old short link works the same for viewer
		// keep as is
	}
	// Append ?path for subfolders
	if (!relPath || relPath === '/' || relPath === '/root') return base;
	const sep = base.includes('?') ? '&' : '?';
	return `${base}${sep}path=${encodeURIComponent(relPath)}`;
}

function nextId(existing) {
	if (!Array.isArray(existing) || existing.length === 0) return 0;
	return existing.reduce((m, it) => Math.max(m, typeof it.id === 'number' ? it.id : -Infinity), -1) + 1;
}

function loadExistingDataJson() {
	const dataPath = path.join(process.cwd(), 'js', 'data.json');
	if (!fs.existsSync(dataPath)) return { dataPath, json: { photo: [], video: [] } };
	const text = fs.readFileSync(dataPath, 'utf8');
	const json = JSON.parse(text);
	if (!json.photo) json.photo = [];
	return { dataPath, json };
}

function dedupeCandidates(existing, candidates) {
	const seenLinks = new Set(existing.map(it => String(it.link || '').trim()));
	const seenNamesDates = new Set(existing.map(it => `${(it.name||'').trim()}|${it.date||''}`));
	const result = [];
	for (const c of candidates) {
		const key1 = String(c.link || '').trim();
		const key2 = `${(c.name||'').trim()}|${c.date||''}`;
		if (seenLinks.has(key1) || seenNamesDates.has(key2)) continue;
		result.push(c);
	}
	return result;
}

async function main() {
	const { publicKey, opts } = parseArgs();
	console.error('Scanning Yandex.Disk public folder:', publicKey);
	const dirToItems = await crawlAllDirs(publicKey);

	// Build candidates: any directory with direct image files
	const candidates = [];
	for (const [relDir, items] of dirToItems.entries()) {
		if (relDir === '/') continue; // skip root as an album
		const dirName = relDir.split('/').filter(Boolean).slice(-1)[0] || 'Untitled';
		const imageFiles = items.filter(it => it.type === 'file' && isImageItem(it));
		if (imageFiles.length === 0) continue;
		const dateParts = chooseDateForDir(dirName, imageFiles);
		const y = dateParts?.y ?? new Date().getFullYear();
		const mo = dateParts?.mo ?? 1;
		const d = dateParts?.d ?? 1;
		const entry = {
			// id will be assigned later
			year: String(y),
			month: pad2(mo),
			day: pad2(d),
			name: dirName,
			link: buildViewerLink(publicKey, relDir),
			date: `${pad2(d)}.${pad2(mo)}.${String(y)}`,
			common: Boolean(opts.common),
			coordinates: opts.defaultCoords,
		};
		candidates.push({ relDir, entry });
	}
	// Sort by date ascending
	candidates.sort((a, b) => {
		const [da, ma, ya] = a.entry.date.split('.').map(Number);
		const [db, mb, yb] = b.entry.date.split('.').map(Number);
		return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db);
	});

	const { dataPath, json } = loadExistingDataJson();
	const existing = Array.isArray(json.photo) ? json.photo : [];
	const newEntries = dedupeCandidates(existing, candidates.map(c => c.entry));

	let idCounter = nextId(existing);
	for (const e of newEntries) {
		e.id = idCounter++;
	}

	if (newEntries.length === 0) {
		console.log('Нет новых альбомов для добавления.');
		return;
	}

	if (opts.write) {
		const updated = { ...json, photo: [...existing, ...newEntries] };
		// Keep formatting similar (2 spaces)
		fs.writeFileSync(dataPath, JSON.stringify(updated, null, 2) + '\n', 'utf8');
		console.log(`Добавлено записей: ${newEntries.length} в ${path.relative(process.cwd(), dataPath)}`);
	} else {
		console.log('Новые записи (dry-run):');
		console.log(JSON.stringify(newEntries, null, 2));
		console.log('\nЗапустите с флагом --write для записи в js/data.json');
	}
}

main().catch(err => {
	console.error('Ошибка:', err.message);
	process.exit(1);
}); 