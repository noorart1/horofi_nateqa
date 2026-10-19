<?php
// Admin tool: hear and tune the games' synthesized sound effects (sfx.js). The settings here are for listening only;
// a change worth keeping goes into the effect in sfx.js (or the game's defaults).
require __DIR__ . '/../lib.php';

$me = current_user();
if (!$me || !$me['is_admin']) {
    http_response_code(404);
    exit;
}
?>
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>المؤثّرات الصوتية</title>
<link rel="stylesheet" href="fonts/vazirmatn.css?v=<?= filemtime(__DIR__ . '/fonts/vazirmatn.css') ?>">
<link rel="stylesheet" href="style.css?v=<?= filemtime(__DIR__ . '/style.css') ?>">
<style>
.admin { width:100%; max-width:1000px; }
.bar-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
.bar-top h1 { font-size:1.3rem; margin:0; }
.bar-top a { color:var(--accent); text-decoration:none; }
.knobs { display:grid; grid-template-columns:repeat(auto-fill, minmax(190px, 1fr)); gap:10px 18px; background:var(--card); border:1px solid var(--line); border-radius:14px; padding:14px 16px; }
.knobs label { margin:0; display:flex; justify-content:space-between; }
.knobs input[type=range] { padding:0; border:0; box-shadow:none; accent-color:var(--blue); direction:ltr; }
.tools { display:flex; flex-wrap:wrap; gap:8px; margin:12px 0 18px; }
.tools button { width:auto; margin:0; padding:10px 18px; }
.tools .alt { background:var(--card); color:var(--blue); box-shadow:0 4px 0 var(--line); }
.tools .on { background:#fde8e6; color:var(--err); box-shadow:0 4px 0 #f3c4bf; }
.sfx-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(170px, 1fr)); gap:10px; }
.sfx-grid button { display:flex; align-items:center; gap:10px; text-align:start; border:1px solid var(--line); background:var(--card); border-radius:14px; padding:12px; font:inherit;
  color:var(--ink); cursor:pointer; transition:transform .1s, border-color .1s; }
.sfx-grid button:active { transform:scale(.97); }
.sfx-grid button.now { border-color:var(--blue); outline:2px solid var(--blue); }
.sfx-grid svg { flex:none; width:34px; height:34px; border-radius:50%; background:var(--blue); fill:#fff; padding:9px 8px 9px 10px; }
.sfx-grid b { display:block; }
.sfx-grid small { color:var(--muted); font-size:.8rem; direction:ltr; display:block; text-align:end; }
</style>
</head>
<body>
<main class="admin">
  <div class="bar-top"><h1>المؤثّرات الصوتية للألعاب</h1><a href="admin.php">العودة إلى لوحة الإدارة</a></div>
  <p class="hint">كلّ الأصوات تُصنع في المتصفّح (sfx.js): لا كلام ولا ملفّات صوتية. الإعدادات هنا للاستماع فقط.</p>
  <div class="knobs">
    <label>الصوت العامّ <output id="o-volume"></output></label><input type="range" id="volume" min="0" max="1" step="0.05">
    <label>طبقة الصوت (نصف نغمة) <output id="o-pitch"></output></label><input type="range" id="pitch" min="-7" max="7" step="1">
    <label>السرعة <output id="o-speed"></output></label><input type="range" id="speed" min="0.5" max="1.6" step="0.05">
    <label>الصفاء <output id="o-bright"></output></label><input type="range" id="bright" min="0" max="1" step="0.05">
    <label>الصدى <output id="o-space"></output></label><input type="range" id="space" min="0" max="0.6" step="0.05">
  </div>
  <div class="tools">
    <button id="again" class="btn">إعادة آخر صوت</button>
    <button id="all" class="btn alt">تشغيل الكلّ بالتتابع</button>
    <button id="mute" class="btn alt">كتم</button>
    <button id="stop" class="btn alt">إيقاف كلّ الأصوات</button>
    <button id="reset" class="btn alt">الإعدادات الأصلية</button>
  </div>
  <div class="sfx-grid" id="fx"></div>
</main>
<script src="sfx.js?v=<?= filemtime(__DIR__ . '/sfx.js') ?>"></script>
<script>
const $ = id => document.getElementById(id);
const FIRST = AudioManager.get(), knobs = ['volume', 'pitch', 'speed', 'bright', 'space'];
let lastFx = 'correct', timers = [];
const show = () => { const p = AudioManager.get(); knobs.forEach(k => { $(k).value = p[k]; $('o-' + k).textContent = (+p[k]).toLocaleString('ar'); }); $('mute').classList.toggle('on', p.muted); $('mute').textContent = p.muted ? 'إلغاء الكتم' : 'كتم'; };
const play = id => {
  lastFx = id;
  AudioManager.play(id);
  document.querySelectorAll('.sfx-grid button').forEach(b => b.classList.toggle('now', b.dataset.id === id));
};
$('fx').innerHTML = AudioManager.list().map(f => `<button data-id="${f.id}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg><span><b>${f.ar}</b><small>${f.en}</small></span></button>`).join('');
$('fx').onclick = e => { const b = e.target.closest('button'); if (b) play(b.dataset.id); };
knobs.forEach(k => $(k).oninput = () => { AudioManager.set({ [k]: +$(k).value }); show(); });
knobs.forEach(k => $(k).onchange = () => play(lastFx)); // hear the change
$('again').onclick = () => play(lastFx);
$('all').onclick = () => { timers.forEach(clearTimeout); timers = AudioManager.list().map((f, i) => setTimeout(() => play(f.id), i * 1400)); };
$('mute').onclick = () => { AudioManager.set({ muted: !AudioManager.get().muted }); show(); };
$('stop').onclick = () => { timers.forEach(clearTimeout); timers = []; AudioManager.stopAll(); };
$('reset').onclick = () => { AudioManager.set(FIRST); show(); };
show();
</script>
</body>
</html>
