// 收藏同步 API（Cloudflare Pages Functions + KV）
// GET  /api/favs?user=admin  -> { favs: [...] }
// PUT  /api/favs {user,pass,favs} -> { ok: true }
// 需在 Pages 项目 Settings -> Bindings 中绑定名为 FAVS 的 KV namespace

var USER = 'admin';
var PASS = 'admin';

export async function onRequestGet(context) {
  var env = context.env;
  if (!env.FAVS) return json({ error: 'KV 未绑定：请在 Pages 项目 Settings -> Bindings 中添加名为 FAVS 的 KV namespace 并重新部署' }, 500);
  var user = new URL(context.request.url).searchParams.get('user') || USER;
  var val = await env.FAVS.get('favs:' + user);
  return json({ favs: val ? JSON.parse(val) : [] });
}

export async function onRequestPut(context) {
  var env = context.env;
  if (!env.FAVS) return json({ error: 'KV 未绑定：请在 Pages 项目 Settings -> Bindings 中添加名为 FAVS 的 KV namespace 并重新部署' }, 500);
  var body;
  try { body = await context.request.json(); } catch (e) {
    return json({ error: '请求体不是合法 JSON' }, 400);
  }
  if (body.user !== USER || body.pass !== PASS) return json({ error: '账号或密码不正确' }, 401);
  if (!Array.isArray(body.favs)) return json({ error: 'favs 必须是数组' }, 400);
  await env.FAVS.put('favs:' + USER, JSON.stringify(body.favs));
  return json({ ok: true });
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
