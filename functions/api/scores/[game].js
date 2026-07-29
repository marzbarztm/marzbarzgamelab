const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function validGameId(value) {
  return typeof value === 'string' && /^[a-z0-9-]{1,50}$/.test(value);
}

async function topScores(db, gameId) {
  const { results } = await db.prepare(
    'SELECT player_name AS playerName, score, updated_at AS updatedAt FROM scores WHERE game_id = ? ORDER BY score DESC, updated_at ASC LIMIT 10'
  ).bind(gameId).all();
  return results || [];
}

export async function onRequestGet({ env, params }) {
  const gameId = params.game;
  if (!validGameId(gameId)) return json({ error: 'Invalid game' }, 400);
  if (!env.DB) return json({ error: 'Leaderboard database is not configured' }, 503);

  try {
    return json({ gameId, scores: await topScores(env.DB, gameId) });
  } catch (error) {
    console.error('Leaderboard read failed', error);
    return json({ error: 'Leaderboard unavailable' }, 500);
  }
}

export async function onRequestPost({ env, params, request }) {
  const gameId = params.game;
  if (!validGameId(gameId)) return json({ error: 'Invalid game' }, 400);
  if (!env.DB) return json({ error: 'Leaderboard database is not configured' }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const playerId = typeof body.playerId === 'string' ? body.playerId.trim() : '';
  const playerName = typeof body.playerName === 'string'
    ? body.playerName.replace(/[^a-z0-9 _-]/gi, '').trim().slice(0, 18)
    : '';
  const score = Number(body.score);

  if (!playerId || playerId.length > 80 || !playerName || !Number.isInteger(score) || score < 0 || score > 10000000) {
    return json({ error: 'Invalid score submission' }, 400);
  }

  try {
    const statement = 'INSERT INTO scores (game_id, player_id, player_name, score) VALUES (?, ?, ?, ?) ' +
      'ON CONFLICT(game_id, player_id) DO UPDATE SET player_name = excluded.player_name, ' +
      'score = MAX(scores.score, excluded.score), updated_at = CURRENT_TIMESTAMP';
    await env.DB.prepare(statement).bind(gameId, playerId, playerName, score).run();
    return json({ ok: true, gameId, scores: await topScores(env.DB, gameId) });
  } catch (error) {
    console.error('Leaderboard write failed', error);
    return json({ error: 'Score could not be saved' }, 500);
  }
}

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: { 'Allow': 'GET, POST, OPTIONS' } });
}
