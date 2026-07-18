(() => {
  'use strict';

  const VERSION = '3.2.5', PANEL_ID = 'cd-exporter-v3';
  if (document.getElementById(PANEL_ID)) return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const localText = value => {
    if (typeof value === 'string') return value.trim();
    if (!value || typeof value !== 'object') return '';
    for (const key of ['zh-hant', 'zh-Hant', 'zh-TW', 'zh', 'en', 'ko', 'ja']) {
      if (typeof value[key] === 'string' && value[key].trim()) return value[key].trim();
    }
    return '';
  };
  const plainText = value => {
    const box = document.createElement('div');
    box.innerHTML = String(value || '');
    return (box.textContent || box.innerText || '').replace(/\u00a0/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  };
  function formatDate(value) {
    const raw = arguments.length ? value : Date.now();
    if (raw === undefined || raw === null || raw === '') return '';
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? String(raw) : date.toLocaleString('zh-TW');
  }
  const formatDateFor = (value, language) => {
    if (value === undefined || value === null || value === '') return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(language === 'en' ? 'en-US' : 'zh-TW');
  };
  const safeGet = (key, fallback = '') => { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } };
  const safeSet = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  const download = (text, name, type) => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement('a');
    link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const sessionId = () => location.pathname.match(/\/talk\/([0-9a-f-]{16,})/i)?.[1]
    || new URLSearchParams(location.search).get('session_id') || '';

  const panel = document.createElement('aside');
  panel.id = PANEL_ID; panel.dataset.exporterVersion = VERSION; panel.title = `Caveduck Exporter v${VERSION}`;
  panel.innerHTML = `<header><b id="cd-title">✦ Caveduck 匯出器</b><span><button id="cd-ui-lang" type="button">EN</button><button id="cd-close" type="button" aria-label="關閉">×</button></span></header><main><div class="progress"><div><span id="cd-status">準備讀取…</span><b id="cd-count">0 則</b></div><i><i id="cd-bar"></i></i></div><details open><summary id="cd-settings-title">匯出設定</summary><label><input id="cd-user" type="checkbox" checked><span id="cd-user-label">包含玩家對話</span></label><label><input id="cd-env" type="checkbox" checked><span id="cd-env-label">場景分隔與狀態</span></label><label><input id="cd-images" type="checkbox" checked><span id="cd-images-label">場景圖片背景</span></label><section class="range"><b id="cd-range-title">匯出回合範圍</b><label><span id="cd-from-label">從</span><select id="cd-start" disabled></select></label><label><span id="cd-to-label">到</span><select id="cd-end" disabled></select></label><button id="cd-pick" type="button" disabled>直接點選起訖回合</button><small id="cd-range-note">讀取完成後可選擇範圍</small></section><label><span id="cd-layout-label">預設閱讀模式</span><select id="cd-layout"><option value="novel">小說頁面</option><option value="chat">對話頁面</option></select></label></details><p id="cd-note">HTML 內可搜尋、切換閱讀模式與翻譯。</p><div class="actions"><button id="cd-txt" disabled>TXT</button><button id="cd-md" disabled>MD</button><button id="cd-html" class="primary" disabled>HTML</button></div></main>`;
  document.body.append(panel);

  const panelStyle = document.createElement('style');
  panelStyle.textContent = `#${PANEL_ID}{position:fixed;right:16px;bottom:16px;z-index:2147483647;width:min(360px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;border:1px solid #374355;border-radius:15px;background:#151922f5;color:#e9edf4;box-shadow:0 18px 55px #000a;font:13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}#${PANEL_ID} header{position:sticky;top:0;z-index:1;display:flex;justify-content:space-between;align-items:center;padding:13px 15px;border-bottom:1px solid #303946;background:#151922f5;font-size:15px}#${PANEL_ID} header span{display:flex;align-items:center;gap:7px}#${PANEL_ID} header button{min-width:36px;min-height:32px;border:1px solid #425066;border-radius:7px;background:#202936;color:#e9edf4;cursor:pointer}#${PANEL_ID} #cd-close{border:0;background:none;color:#b8c4d3;font-size:24px}#${PANEL_ID} main{padding:13px 15px}.progress>div{display:flex;justify-content:space-between;margin-bottom:7px;color:#c7d0dc}.progress>i{display:block;height:4px;border-radius:5px;background:#2b3440;overflow:hidden}.progress>i>i{display:block;width:0;height:100%;background:#62d3a4;transition:.2s}#${PANEL_ID} details{margin:13px 0;border:1px solid #34404e;border-radius:10px;padding:9px 11px;background:#11172280}#${PANEL_ID} summary{cursor:pointer;font-weight:700}#${PANEL_ID} label{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px;color:#cdd5df}#${PANEL_ID} label:has(input){justify-content:flex-start;padding:7px 8px;margin-top:6px;border-radius:7px;background:#20293670}#${PANEL_ID} input{accent-color:#55c99a}#${PANEL_ID} select{max-width:190px;border:1px solid #3b4655;border-radius:6px;background:#212936;color:#e9edf4;padding:5px}.range{margin-top:13px;padding:10px;border:1px solid #34404e;border-radius:9px;background:#151e2a}.range b{display:block;font-size:12px}.range button{width:100%;margin-top:9px;border:1px solid #4c6076;border-radius:7px;background:#202c3c;color:#d9e7f5;padding:8px;cursor:pointer}.range button:disabled{opacity:.4}.range small{display:block;margin-top:7px;color:#8fa0b4;font-size:11px}#${PANEL_ID} p{color:#95a2b4;font-size:11px;line-height:1.45}.actions{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.actions button{border:0;border-radius:8px;background:#2a3340;color:#fff;padding:10px;font-weight:700;cursor:pointer}.actions button:disabled{opacity:.4}.actions .primary{background:#259b70}@media(max-width:430px){#${PANEL_ID}{right:10px;bottom:10px;width:calc(100vw - 20px);max-height:calc(100vh - 20px)}}`;
  document.head.append(panelStyle);

  const copy = {
    'zh-Hant': { title: '✦ Caveduck 匯出器', settings: '匯出設定', user: '包含玩家對話', env: '場景分隔與狀態', images: '場景圖片背景', range: '匯出回合範圍', from: '從', to: '到', pick: '直接點選起訖回合', note: 'HTML 內可搜尋、切換閱讀模式與翻譯。', layout: '預設閱讀模式', novel: '小說頁面', chat: '對話頁面', preparing: '準備讀取…', loading: '正在讀取完整歷史…', ready: '準備完成', empty: '沒有可辨識的對話', turns: '回合', messages: '則' },
    en: { title: '✦ Caveduck Exporter', settings: 'Export settings', user: 'Include player messages', env: 'Scene separators and status', images: 'Use scene images as backgrounds', range: 'Export range', from: 'From', to: 'To', pick: 'Pick start and end turns', note: 'HTML includes search, reading layouts, and translation.', layout: 'Default reading layout', novel: 'Novel', chat: 'Chat', preparing: 'Preparing…', loading: 'Loading full history…', ready: 'Ready', empty: 'No recognizable messages', turns: 'turns', messages: 'messages' }
  };
  let uiLanguage = safeGet('cd-exporter-ui-language', 'zh-Hant');
  let chats = [], currentStatus = 'preparing', currentCount = 0;
  const words = () => copy[uiLanguage] || copy['zh-Hant'];
  const settings = () => ({ includeUser: $('#cd-user').checked, environment: $('#cd-env').checked, images: $('#cd-images').checked, layout: $('#cd-layout').value, start: Number($('#cd-start').value || 0), end: Number($('#cd-end').value || 0) });

  const storyTimeFromMemory = value => {
    const matches = [...localText(value).matchAll(/\[(\d{4}-\d{2}-\d{2}(?:\s*[~～]\s*\d{2}-\d{2})?)\]/g)];
    return matches.length ? matches.at(-1)[1].replace(/\s+/g, '') : '';
  };
  const stateFrom = data => {
    const env = data?.environment_state || data?.inline_scene_context || {};
    const characters = Array.isArray(env.characters) ? env.characters : [];
    const character = characters.find(item => !/^(protagonist|user|player)$/i.test(String(item.role || ''))) || characters[0] || {};
    const storyTime = storyTimeFromMemory(data?.inline_long_term_memory);
    const gameTime = storyTime || env.time || '';
    return { gameTime, environmentTime: env.time || '', storyTime, place: env.place || '', weather: env.weather || '', scene: [gameTime, env.place, env.weather].filter(Boolean).join(' · '), name: character.name || '', emotion: character.emotion || '', relation: character.relation && typeof character.relation === 'object' ? character.relation : {} };
  };
  const normalize = chat => {
    const data = chat?.content?.data || {}, state = stateFrom(data);
    const query = plainText(localText(data.query)), answer = plainText(localText(data.answer));
    const time = formatDate(chat.created_at);
    const image = typeof data.imagePath === 'string' && /^https?:\/\//.test(data.imagePath) ? data.imagePath : '';
    const deep = { longTermMemory: localText(data.inline_long_term_memory), shortTermMemory: localText(data.inline_short_term_memory), sceneContext: localText(data.inline_scene_context) };
    return [
      query && { id: `${chat.id}-q`, turnId: chat.id, order: 0, user: true, name: '玩家', text: query, createdAt: chat.created_at || '', time, state, image, deep },
      answer && { id: `${chat.id}-a`, turnId: chat.id, order: 1, user: false, name: state.name || '角色', text: answer, createdAt: chat.created_at || '', time, state, image, deep }
    ].filter(Boolean);
  };
  const messages = () => chats.flatMap(normalize).sort((a, b) => a.turnId - b.turnId || a.order - b.order);
  const turns = () => [...new Map(messages().map(message => [message.turnId, message])).values()];
  const selectedMessages = () => {
    const all = messages(), option = settings(), low = Math.min(option.start, option.end), high = Math.max(option.start, option.end);
    const selected = all.filter(message => !low || (message.turnId >= low && message.turnId <= high));
    return selected.length ? selected : all;
  };
  const setStatus = (status, count, progress) => {
    currentStatus = status; currentCount = count;
    const t = words();
    $('#cd-status').textContent = t[status] || status;
    $('#cd-count').textContent = `${count} ${t.messages}`;
    if (progress != null) $('#cd-bar').style.width = `${Math.max(0, Math.min(100, progress))}%`;
  };
  const rangeLabel = (message, index) => {
    const time = formatDateFor(message.createdAt, uiLanguage) || message.time;
    return uiLanguage === 'en' ? `Turn ${index + 1} · ${time}` : `第 ${index + 1} 回合 · ${time}`;
  };
  const updateRangeNote = () => {
    const option = settings(), low = Math.min(option.start, option.end), high = Math.max(option.start, option.end);
    const count = turns().filter(turn => !low || (turn.turnId >= low && turn.turnId <= high)).length;
    $('#cd-range-note').textContent = uiLanguage === 'en' ? `Exporting ${count} turns` : `將輸出 ${count} 回合`;
  };
  const populateRange = (preserve = false) => {
    const list = turns(), start = $('#cd-start'), end = $('#cd-end'), oldStart = start.value, oldEnd = end.value;
    const options = list.map((message, index) => `<option value="${message.turnId}">${escapeHtml(rangeLabel(message, index))}</option>`).join('');
    start.innerHTML = options; end.innerHTML = options;
    if (list.length) {
      start.value = preserve && list.some(item => String(item.turnId) === oldStart) ? oldStart : String(list[0].turnId);
      end.value = preserve && list.some(item => String(item.turnId) === oldEnd) ? oldEnd : String(list.at(-1).turnId);
      start.disabled = end.disabled = $('#cd-pick').disabled = false;
    }
    updateRangeNote();
  };
  const applyPanelLanguage = () => {
    const t = words();
    $('#cd-title').textContent = `${t.title} · v${VERSION}`; $('#cd-settings-title').textContent = t.settings;
    $('#cd-user-label').textContent = t.user; $('#cd-env-label').textContent = t.env; $('#cd-images-label').textContent = t.images;
    $('#cd-range-title').textContent = t.range; $('#cd-from-label').textContent = t.from; $('#cd-to-label').textContent = t.to;
    $('#cd-pick').textContent = t.pick; $('#cd-note').textContent = t.note; $('#cd-layout-label').textContent = t.layout;
    $('#cd-layout').options[0].textContent = t.novel; $('#cd-layout').options[1].textContent = t.chat;
    $('#cd-ui-lang').textContent = uiLanguage === 'en' ? '繁中' : 'EN';
    if (chats.length) populateRange(true); else updateRangeNote();
    setStatus(currentStatus, currentCount, null);
  };

  const fileDate = value => {
    const match = String(value || '').match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    return match ? `${match[1].slice(-2)}${match[2].padStart(2, '0')}${match[3].padStart(2, '0')}` : '';
  };
  const exportStamp = () => { const d = new Date(), pad = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}_${pad(d.getMinutes())}_${pad(d.getSeconds())}`; };
  const exportName = (list, extension) => {
    const character = String(list.find(message => !message.user)?.name || 'Caveduck').replace(/[\\/:*?"<>|]/g, '_').trim() || 'Caveduck';
    const dates = list.map(message => fileDate(message.state.gameTime)).filter(Boolean), fallback = fileDate(exportStamp()) || '000000';
    return `${character}_export_${dates[0] || fallback}-${dates.at(-1) || fallback}_${exportStamp()}.${extension}`;
  };

  $('#cd-close').onclick = () => { panel.remove(); panelStyle.remove(); };
  $('#cd-ui-lang').onclick = () => { uiLanguage = uiLanguage === 'en' ? 'zh-Hant' : 'en'; safeSet('cd-exporter-ui-language', uiLanguage); applyPanelLanguage(); };
  $('#cd-start').onchange = updateRangeNote; $('#cd-end').onchange = updateRangeNote;
  $('#cd-pick').onclick = () => openRangePicker();
  $('#cd-txt').onclick = () => exportText('txt');
  $('#cd-md').onclick = () => exportText('md');
  $('#cd-html').onclick = () => exportHtml(selectedMessages(), settings());

  function openRangePicker() {
    const list = turns(), overlay = document.createElement('div'), dialog = document.createElement('section'); let first = null, last = null;
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483648;background:#000a;display:grid;place-items:center;padding:16px;font:13px -apple-system,sans-serif';
    dialog.style.cssText = 'width:min(620px,100%);max-height:80vh;display:flex;flex-direction:column;background:#151b25;color:#eef4fb;border:1px solid #43526a;border-radius:14px;overflow:hidden';
    dialog.innerHTML = `<header style="padding:14px 16px;border-bottom:1px solid #344155"><b>${uiLanguage === 'en' ? 'Select export range' : '選擇匯出範圍'}</b><p style="margin:4px 0 0;color:#9cabbc">${uiLanguage === 'en' ? 'Choose a start and an end turn.' : '依序選擇起點與終點。'}</p></header>`;
    const body = document.createElement('div'); body.style.cssText = 'overflow:auto;padding:8px';
    const footer = document.createElement('footer'); footer.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;padding:12px;border-top:1px solid #344155';
    const cancel = document.createElement('button'), apply = document.createElement('button');
    cancel.textContent = uiLanguage === 'en' ? 'Cancel' : '取消'; apply.textContent = uiLanguage === 'en' ? 'Apply' : '套用'; apply.disabled = true;
    [cancel, apply].forEach(button => button.style.cssText = 'border:0;border-radius:8px;padding:9px 13px;background:#2b3749;color:white;cursor:pointer'); apply.style.background = '#259b70';
    const paint = () => { const low = Math.min(first ?? Infinity, last ?? Infinity), high = Math.max(first ?? -Infinity, last ?? -Infinity); body.querySelectorAll('button').forEach(button => { const id = Number(button.dataset.id), selected = id === first || id === last, middle = first != null && last != null && id >= low && id <= high; button.style.background = selected ? '#267d61' : middle ? '#254639' : '#1c2532'; }); apply.disabled = first == null || last == null; };
    list.forEach((message, index) => { const button = document.createElement('button'); button.dataset.id = message.turnId; button.style.cssText = 'display:grid;grid-template-columns:58px 1fr;gap:10px;width:100%;margin:3px 0;padding:10px;border:1px solid #334155;border-radius:9px;background:#1c2532;color:#edf3fa;text-align:left;cursor:pointer'; button.innerHTML = `<b style="font-size:11px;color:#79dfb2">${uiLanguage === 'en' ? `Turn ${index + 1}` : `第 ${index + 1} 回`}</b><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(`${message.time}　${message.text.replace(/\s+/g, ' ').slice(0, 74)}`)}</span>`; button.onclick = () => { if (first == null || last != null) { first = message.turnId; last = null; } else if (message.turnId !== first) last = message.turnId; paint(); }; body.append(button); });
    cancel.onclick = () => overlay.remove(); apply.onclick = () => { $('#cd-start').value = Math.min(first, last); $('#cd-end').value = Math.max(first, last); updateRangeNote(); overlay.remove(); };
    footer.append(cancel, apply); dialog.append(body, footer); overlay.append(dialog); document.body.append(overlay);
  }

  function exportText(type) {
    const option = settings(), list = selectedMessages().filter(message => option.includeUser || !message.user);
    if (type === 'txt') {
      let output = `\ufeffCaveduck 對話紀錄\n匯出時間：${formatDate()}\n\n`;
      list.forEach(message => { output += `[${message.time}] ${message.name}\n${message.text}\n\n`; });
      download(output, exportName(list, 'txt'), 'text/plain;charset=utf-8'); return;
    }
    let scene = '', output = '\ufeff# Caveduck 對話紀錄\n\n';
    list.forEach(message => { if (option.environment && message.state.scene && message.state.scene !== scene) { scene = message.state.scene; output += `---\n\n## ${scene}\n\n`; } output += `### ${message.name}\n\n_${message.time}_\n\n${message.text}\n\n`; });
    if (!list.length) output += '> 此範圍沒有符合的對話。\n';
    download(output, exportName(list, 'md'), 'text/markdown;charset=utf-8');
  }

  async function fetchAll() {
    const id = sessionId();
    if (!id) { setStatus('empty', 0, 100); return; }
    const seen = new Set(); let cursor = null, hasNext = true, pages = 0, failures = 0;
    setStatus('loading', 0, 4);
    while (hasNext && pages < 500 && failures < 3) {
      try {
        const url = new URL(`/api/chat/sessions/${id}/chats`, location.origin);
        url.searchParams.set('page_size', '100');
        if (cursor) { url.searchParams.set('chat_id', cursor); url.searchParams.set('direction', 'older'); }
        const response = await fetch(url, { credentials: 'same-origin' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json(), batch = Array.isArray(payload.chats) ? payload.chats : [];
        if (!batch.length) break;
        let added = 0;
        for (const chat of batch) if (chat?.id != null && !seen.has(chat.id)) { seen.add(chat.id); chats.push(chat); added++; }
        pages++; hasNext = payload.has_next === true; cursor = batch.at(-1)?.id || null;
        setStatus('loading', chats.length, Math.min(94, 4 + pages * 7));
        if (!added || !cursor || !hasNext) break;
        await new Promise(resolve => setTimeout(resolve, 220));
      } catch (error) {
        failures++; console.warn('[Caveduck exporter]', error);
        await new Promise(resolve => setTimeout(resolve, 800 * failures));
      }
    }
    const count = messages().length; populateRange(); setStatus(count ? 'ready' : 'empty', count, 100);
    ['#cd-txt', '#cd-md', '#cd-html'].forEach(selector => $(selector).disabled = !count);
  }

  function exportHtml(all, option) {
    const list = all.filter(message => option.includeUser || !message.user), content = [], states = {}, chapterData = [], characterRecords = [], mediaByUrl = new Map();
    let scene = '', background = '', chapterCount = 0;
    for (const message of list) {
      if (option.images && message.image) {
        background = message.image;
        if (!mediaByUrl.has(message.image)) mediaByUrl.set(message.image, { url: message.image, target: message.id, label: [message.state.gameTime, message.state.place].filter(Boolean).join(' · ') || message.time });
      }
      if (option.environment && message.state.scene && message.state.scene !== scene) {
        const id = `chapter-${++chapterCount}`, label = [message.state.gameTime, message.state.place, message.state.weather].filter(Boolean).join(' · ');
        content.push(`<section id="${id}" class="scene" style="--scene:url('${escapeHtml(background)}')"><span title="遊戲內時間・地點・天氣">${escapeHtml(label)}</span></section>`);
        chapterData.push({ id, target: message.id, label, time: message.state.gameTime, place: message.state.place, weather: message.state.weather, emotion: message.state.emotion, image: background });
        scene = message.state.scene;
      }
      states[message.id] = { ...message.state, image: background };
      content.push(`<article id="${message.id}" class="entry ${message.user ? 'player' : 'character'}" data-search="${escapeHtml(`${message.name} ${message.text} ${message.state.scene} ${message.state.emotion}`.toLowerCase())}"><header><b>${escapeHtml(message.name)}</b><time title="對話建立時間" data-created-at="${escapeHtml(message.createdAt)}">${escapeHtml(message.time)}</time></header><div class="prose">${escapeHtml(message.text).replace(/\n/g, '<br>')}</div><div class="original-copy" hidden></div></article>`);
      if (!message.user) characterRecords.push({ ...message, effectiveImage: background });
    }
    const firstImage = Object.values(states).find(value => value.image)?.image || '';
    const dashboard = renderDashboard(list, characterRecords, chapterData, [...mediaByUrl.values()]);
    const runtime = `(${outputRuntime.toString()})(${JSON.stringify(states).replace(/</g, '\\u003c')},${JSON.stringify(option.layout)})`;
    const html = `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="caveduck-exporter-version" content="${VERSION}">
  <title>Caveduck 對話紀錄</title>
  <style>${outputCss(firstImage)}${outputSearchCss()}${outputChapterCss()}${outputNavigationCss()}${outputDashboardCss()}${outputLightboxCss()}</style>
</head>
<body>
  <div id="reading-progress"></div>
  <div class="backdrop"></div>
  <div class="shell">
    <main id="reader" class="reader">${content.join('')}</main>
    <section id="audit" class="audit" hidden>
      ${dashboard}
    </section>
    <aside id="right" class="right">
      <header class="sidebar-header">
        <nav class="views"><button class="active" data-view="reader">閱讀</button><button data-view="audit">資料頁</button></nav>
        <button id="drawer-close" class="drawer-close" type="button">×</button>
      </header>
      <section class="search-panel" aria-label="搜尋對話">
        <input id="search" class="search" type="search" autocomplete="off" placeholder="搜尋對話…">
        <div id="search-tools" class="search-tools" hidden>
          <small id="search-meta" aria-live="polite"></small>
          <div class="search-actions">
            <button id="search-prev" type="button" title="上一筆" aria-label="上一筆">↑</button>
            <button id="search-next" type="button" title="下一筆" aria-label="下一筆">↓</button>
          </div>
        </div>
      </section>
      <details id="chapters" class="chapters" open>
        <summary><span id="chapters-title">章節導覽</span><small id="chapters-count"></small></summary>
        <nav id="chapter-list" class="chapter-list" aria-label="章節導覽"></nav>
      </details>
      <details class="settings" open>
        <summary id="settings-title">閱讀與翻譯設定</summary>
        <label id="mode-label">閱讀模式</label>
        <select id="mode"><option value="novel">小說頁面</option><option value="chat">對話頁面</option></select>
        <label id="target-label">翻譯目標語言</label>
        <select id="language"><option value="en">English</option><option value="ja">日本語</option><option value="ko">한국어</option><option value="zh-TW">繁體中文</option></select>
        <label class="check"><input id="show-original-copy" type="checkbox" checked><span id="show-original-label">翻譯後顯示原文</span></label>
        <details>
          <summary id="api-summary">自然翻譯 API（選填）</summary>
          <label>API URL</label><input id="api-url" type="url" placeholder="https://…/v1/chat/completions">
          <label id="model-label">模型名稱</label><input id="api-model" placeholder="僅使用自己的 API 時需要">
          <label id="key-label">API 金鑰</label><input id="api-key" type="password" placeholder="只留在此分頁">
        </details>
        <button id="translate-all" type="button">翻譯所有段落</button>
        <button id="translation-view" class="secondary" type="button" hidden>只顯示原文</button>
        <button id="cancel-translation" class="secondary" type="button" hidden>取消翻譯</button>
        <p id="translation-note">未填 API 時會直接在本頁使用 Google 翻譯。</p>
      </details>
      <section class="state"><h2 id="state-title">當前狀態</h2><div id="state"></div></section>
      <div class="interface-language">
        <button id="ui-language" type="button" title="Switch interface language" aria-label="Switch interface language">EN</button>
      </div>
    </aside>
  </div>
  <button id="drawer-toggle" class="drawer-toggle" type="button">狀態</button>
  <div id="mobile-shade" hidden></div>
  <div id="image-lightbox" class="image-lightbox" role="dialog" aria-modal="true" aria-label="Image preview" hidden>
    <button id="image-lightbox-close" class="image-lightbox-close" type="button" aria-label="Close image preview">×</button>
    <figure><img id="image-lightbox-image" alt=""><figcaption id="image-lightbox-caption"></figcaption></figure>
  </div>
  <script>${runtime}<\/script>
</body>
</html>`;
    download(html, exportName(list, 'html'), 'text/html;charset=utf-8');
  }

  const dashboardLabel = record => [record.state.gameTime, record.state.place, record.state.weather].filter(Boolean).join(' · ') || record.time || '—';
  const changedMemories = (records, key) => {
    const output = []; let previous = '';
    for (const record of records) {
      const value = String(record.deep?.[key] || '').trim();
      if (value && value !== previous) output.push({ value, record });
      if (value) previous = value;
    }
    return output;
  };
  const sparklinePoints = values => {
    const width = 260, height = 72, pad = 5, numbers = values.map(item => item.value), min = Math.min(...numbers), max = Math.max(...numbers), span = max - min || 1;
    return values.map((item, index) => {
      const x = values.length === 1 ? width / 2 : pad + index / (values.length - 1) * (width - pad * 2);
      const y = max === min ? height / 2 : pad + (max - item.value) / span * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  };

  function renderDashboard(list, records, chapterData, media) {
    const gameTimes = list.map(message => message.state.gameTime).filter(Boolean), compactDate = value => String(value).match(/\d{4}-\d{2}-\d{2}/)?.[0] || value, firstTime = compactDate(gameTimes[0] || '—'), lastTime = compactDate(gameTimes.at(-1) || firstTime);
    const dateRange = firstTime === lastTime ? firstTime : `${firstTime} → ${lastTime}`;
    const turnCount = new Set(list.map(message => message.turnId)).size;
    const longVersions = changedMemories(records, 'longTermMemory'), shortVersions = changedMemories(records, 'shortTermMemory');
    const shortGroups = [];
    for (const item of shortVersions) {
      const key = item.record.state.scene || item.record.state.gameTime || item.record.time || '其他';
      let group = shortGroups.at(-1);
      if (!group || group.key !== key) { group = { key, label: dashboardLabel(item.record), items: [] }; shortGroups.push(group); }
      group.items.push(item);
    }

    const relationSeries = new Map();
    for (const record of records) for (const [key, value] of Object.entries(record.state.relation || {})) {
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;
      if (!relationSeries.has(key)) relationSeries.set(key, []);
      relationSeries.get(key).push({ value, target: record.id, label: dashboardLabel(record) });
    }
    const emotionScenes = [];
    for (const record of records) {
      const emotion = String(record.state.emotion || '').trim(); if (!emotion) continue;
      const key = record.state.scene || record.id;
      let group = emotionScenes.at(-1);
      if (!group || group.key !== key) { group = { key, label: dashboardLabel(record), target: record.id, first: emotion, last: emotion }; emotionScenes.push(group); }
      else group.last = emotion;
    }

    const rawRecords = records.map(record => ({
      id: record.id,
      turn_id: record.turnId,
      created_at: record.createdAt,
      answer: record.text,
      imagePath: record.image || '',
      environment_state: { time: record.state.environmentTime, story_time: record.state.storyTime, place: record.state.place, weather: record.state.weather, character: record.state.name, emotion: record.state.emotion, relation: record.state.relation },
      inline_long_term_memory: record.deep.longTermMemory,
      inline_short_term_memory: record.deep.shortTermMemory,
      inline_scene_context: record.deep.sceneContext
    }));
    const rawJson = JSON.stringify(rawRecords, null, 2), rawPreview = JSON.stringify(rawRecords.at(-1) || {}, null, 2);

    const sceneHtml = chapterData.map(item => `<button class="timeline-card scene-timeline-card audit-searchable" type="button" data-jump="${escapeHtml(item.target)}"><b>${escapeHtml(item.time || item.label)}</b><span>${escapeHtml([item.place, item.weather, item.emotion].filter(Boolean).join(' · '))}</span></button>`).join('');
    const longHtml = longVersions.map(item => `<details class="memory-card audit-searchable"><summary><span>${escapeHtml(dashboardLabel(item.record))}</span><small>⌄</small></summary><button class="inline-jump" type="button" data-audit-jump data-jump="${escapeHtml(item.record.id)}">↗</button><pre>${escapeHtml(item.value)}</pre></details>`).join('');
    const shortHtml = shortGroups.map(group => `<details class="memory-group"><summary><span>${escapeHtml(group.label)}</span><small>${group.items.length}</small></summary><div>${group.items.map(item => `<details class="memory-card audit-searchable"><summary><span>${escapeHtml(item.record.time || dashboardLabel(item.record))}</span><small>⌄</small></summary><button class="inline-jump" type="button" data-audit-jump data-jump="${escapeHtml(item.record.id)}">↗</button><pre>${escapeHtml(item.value)}</pre></details>`).join('')}</div></details>`).join('');
    const relationHtml = [...relationSeries].map(([key, values]) => { const first = values[0], last = values.at(-1); return `<article class="trend-card audit-searchable"><header><b>${escapeHtml(key)}</b><span>${escapeHtml(first.value)} → ${escapeHtml(last.value)}</span></header><svg viewBox="0 0 260 72" role="img" aria-label="${escapeHtml(`${key}: ${first.value} → ${last.value}`)}"><polyline points="${sparklinePoints(values)}"></polyline></svg><footer><span>${escapeHtml(Math.min(...values.map(item => item.value)))}–${escapeHtml(Math.max(...values.map(item => item.value)))}</span><button type="button" data-audit-jump data-jump="${escapeHtml(last.target)}">↗</button></footer></article>`; }).join('');
    const emotionHtml = emotionScenes.map(item => `<button class="timeline-card emotion-scene-card audit-searchable" type="button" data-jump="${escapeHtml(item.target)}"><b>${escapeHtml(item.label)}</b><span>${escapeHtml(item.first === item.last ? item.first : `${item.first} → ${item.last}`)}</span></button>`).join('');
    const mediaHtml = media.map(item => `<button class="media-card audit-searchable" type="button" data-image-view data-image-url="${escapeHtml(item.url)}" data-image-label="${escapeHtml(item.label)}" title="${escapeHtml(item.label)}"><img loading="lazy" referrerpolicy="no-referrer" src="${escapeHtml(item.url)}" alt="${escapeHtml(item.label)}"><span>${escapeHtml(item.label)}</span></button>`).join('');

    return `<div class="dashboard">
      <header class="dashboard-heading"><h1 id="audit-title">對話資料儀表板</h1><p id="audit-intro">整理 API 已確認回傳的狀態、記憶與圖片。</p></header>
      <section class="dashboard-overview" aria-label="總覽">
        <article class="metric"><span id="metric-date-label">日期範圍</span><b>${escapeHtml(dateRange)}</b></article>
        <article class="metric"><span id="metric-turn-label">回合</span><b>${turnCount}</b></article>
        <article class="metric"><span id="metric-scene-label">場景</span><b>${chapterData.length}</b></article>
        <article class="metric"><span id="metric-image-label">圖片</span><b>${media.length}</b></article>
      </section>
      <div class="audit-toolbar"><input id="audit-search" type="search" autocomplete="off" placeholder="搜尋記憶、情緒與場景…"><small id="audit-search-meta" aria-live="polite"></small></div>
      <details class="dashboard-module" data-dashboard-section open><summary><span id="timeline-title">場景時間軸</span><small>${chapterData.length}</small></summary><div class="timeline-grid">${sceneHtml || '<p class="empty-state" id="timeline-empty">沒有場景資料。</p>'}</div></details>
      <details class="dashboard-module" data-dashboard-section><summary><span id="long-memory-title">長期記憶版本</span><small>${longVersions.length}</small></summary><div class="memory-list">${longHtml || '<p class="empty-state" id="long-memory-empty">沒有長期記憶。</p>'}</div></details>
      <details class="dashboard-module" data-dashboard-section><summary><span id="short-memory-title">短期記憶</span><small>${shortVersions.length}</small></summary><div class="memory-list">${shortHtml || '<p class="empty-state" id="short-memory-empty">沒有短期記憶。</p>'}</div></details>
      ${relationSeries.size ? `<details class="dashboard-module" data-dashboard-section open><summary><span id="relation-title">關係變化</span><small>${relationSeries.size}</small></summary><div class="trend-grid">${relationHtml}</div></details>` : ''}
      ${emotionScenes.length ? `<details class="dashboard-module" data-dashboard-section><summary><span id="emotion-title">情緒時間軸</span><small>${emotionScenes.length}</small></summary><div class="timeline-grid">${emotionHtml}</div></details>` : ''}
      <details class="dashboard-module" data-dashboard-section><summary><span id="gallery-title">圖片集</span><small>${media.length}</small></summary><div class="media-grid">${mediaHtml || '<p class="empty-state" id="gallery-empty">沒有匯出的圖片。</p>'}</div></details>
      <details class="dashboard-module raw-module"><summary><span id="raw-title">原始／已解析資料</span><small>${rawRecords.length}</small></summary><p id="raw-note">僅包含匯出器已確認解析的欄位。</p><button id="download-audit-json" type="button">下載 JSON</button><details class="raw-preview"><summary id="raw-preview-title">預覽最新一筆</summary><pre>${escapeHtml(rawPreview)}</pre></details><script id="audit-raw-data" type="application/json">${rawJson.replace(/</g, '\\u003c')}</script></details>
    </div>`;
  }

  function outputCss(firstImage) {
    return `:root{--ink:#e9edf3;--muted:#a6b1c1;--line:#344154;--accent:#62d3a4;--background:url('${escapeHtml(firstImage)}')}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#0d1117;color:var(--ink);font:16px/1.9 Georgia,"Noto Serif TC","Times New Roman",serif;overflow-x:hidden}.backdrop{position:fixed;inset:0;z-index:-1;background:linear-gradient(#0d1117eb,#0d1117f5),var(--background);background-position:center;background-size:cover;transition:.3s}.shell{display:grid;grid-template-columns:minmax(0,1fr) 310px;min-height:100vh}.reader,.audit{grid-column:1;max-width:920px;width:100%;margin:auto;padding:76px clamp(24px,6vw,80px) 100px}.audit h1{margin:0;text-align:center;font:600 24px/1.3 -apple-system,sans-serif}.audit-intro{text-align:center;color:var(--muted);font:12px -apple-system,sans-serif;margin:8px 0 34px}.right{grid-column:2;position:sticky;top:0;height:100vh;overflow:auto;padding:18px 14px;background:#121721ed;border-left:1px solid var(--line);backdrop-filter:blur(12px);font:13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:flex;flex-direction:column}.search{width:100%;padding:10px;border:1px solid #3a4657;border-radius:8px;background:#0d121a;color:var(--ink);font:14px -apple-system,sans-serif}#search-meta{display:block;min-height:20px;margin:4px 0 8px;color:#8f9cad;font:11px -apple-system,sans-serif}.settings{margin:0 0 15px;padding:10px;border:1px solid var(--line);border-radius:10px}.settings summary{cursor:pointer;font-weight:700}.settings label{display:block;margin:10px 0 4px;color:var(--muted)}.settings label.check{display:flex;align-items:center;gap:8px}.settings label.check input{width:auto}.settings input,.settings select{width:100%;border:1px solid #3b4657;border-radius:7px;background:#0d121a;color:var(--ink);padding:8px}.settings button{width:100%;margin-top:10px;border:0;border-radius:7px;background:#259b70;color:white;padding:10px;font-weight:700;cursor:pointer}.settings button.secondary{background:#263548}.settings button[hidden]{display:none}.settings button:disabled{opacity:.55}.settings p{margin:8px 0 0;color:var(--muted)}.state h2{font:700 15px -apple-system,sans-serif}.card{padding:10px;border:1px solid #354153;border-radius:10px;background:#19212de8}.card div{display:grid;grid-template-columns:68px minmax(0,1fr);gap:8px;padding:5px 0;border-top:1px solid #303b4a}.card div:first-child{border-top:0}.card dt{color:var(--muted)}.card dd{margin:0;overflow-wrap:anywhere}.interface-language{margin-top:auto;padding-top:14px;border-top:1px solid var(--line)}.interface-language label{display:block;margin-bottom:5px;color:var(--muted)}.interface-language select{width:100%;border:1px solid #3b4657;border-radius:7px;background:#0d121a;color:var(--ink);padding:8px}.scene{display:flex;align-items:center;justify-content:center;min-height:108px;margin:40px 0 28px;padding:16px;border:1px solid #566176;border-radius:13px;background:linear-gradient(90deg,#111824e8,#11182470),var(--scene);background-position:center;background-size:cover}.scene span{padding:5px 13px;border:1px solid #657187;border-radius:999px;background:#111824d9;text-align:center;color:#dce5f1;font:12px -apple-system,sans-serif}.entry{margin:0 0 36px;scroll-margin-top:70px}.entry header{display:flex;justify-content:space-between;gap:14px;margin-bottom:10px;color:var(--muted);font:12px -apple-system,sans-serif}.entry header b{color:var(--accent);font-size:13px}.entry.player header b{color:#94b1ff}.prose{font-size:17px;overflow-wrap:anywhere}.character .prose{padding-left:18px;border-left:2px solid #526075}.player{max-width:88%;margin-left:auto}.player .prose{padding:13px 16px;border-radius:13px;background:#315fc444;font:15px/1.9 -apple-system,"Noto Sans TC",sans-serif}.chat .character .prose{padding:14px 17px;border:1px solid #3b4657;border-radius:15px 15px 15px 4px;background:#1a2230ed}.chat .player .prose{border-radius:15px 15px 4px 15px;background:#315fc4d9}.original-copy{margin-top:10px;padding:12px 14px;border:1px solid #46536a;border-radius:10px;background:#152033e8;font:14px/1.8 -apple-system,"Noto Sans TC",sans-serif;white-space:pre-wrap}.views{position:fixed;z-index:30;top:14px;left:calc((100vw - 310px)/2);display:flex;gap:7px;transform:translateX(-50%);padding:5px;border:1px solid #34445c;border-radius:999px;background:#111925f2;backdrop-filter:blur(10px)}.views button{min-height:34px;border:1px solid #45536a;border-radius:999px;background:#17202d;color:#d7e0ec;padding:5px 11px;cursor:pointer}.views button.active{border-color:var(--accent);color:var(--accent)}.audit[hidden],.reader[hidden]{display:none}.audit-card{margin-bottom:13px;padding:15px;border:1px solid #3a4657;border-radius:12px;background:#121a26db;font-family:-apple-system,"Noto Sans TC",sans-serif}.audit-card h2{margin:0;font-size:14px;color:#74d9ad}.audit-card p{color:var(--muted);font-size:12px}.audit-card pre{white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.75 Georgia,"Noto Serif TC",serif}.drawer-toggle,.drawer-close{display:none}#reading-progress{position:fixed;z-index:50;top:0;left:0;width:0;height:3px;background:var(--accent)}#mobile-shade{position:fixed;z-index:19;inset:0;background:#0008}#translation-progress{position:fixed;z-index:60;left:50%;bottom:24px;transform:translateX(-50%);padding:10px 16px;border:1px solid #496177;border-radius:999px;background:#101925f5;font:13px -apple-system,sans-serif}@media(max-width:700px){.shell{display:block}.reader{padding:28px 16px calc(104px + env(safe-area-inset-bottom))}.audit{padding:68px 16px calc(104px + env(safe-area-inset-bottom))}.entry header{flex-direction:column;gap:4px}.prose{font-size:17px;line-height:2.05}.character .prose{padding-left:13px}.player{max-width:100%}.right{display:none;position:fixed;z-index:20;right:0;top:0;width:min(88vw,360px);height:100vh;padding:15px 12px calc(18px + env(safe-area-inset-bottom));box-shadow:-10px 0 30px #0008}.right.open{display:flex}.settings input,.settings select,.settings button,.interface-language select{min-height:44px;font-size:16px}.views{top:auto;bottom:max(12px,env(safe-area-inset-bottom));left:50%}.views button{min-height:42px}.drawer-toggle{display:block;position:fixed;z-index:21;right:0;bottom:max(16px,env(safe-area-inset-bottom));min-width:44px;min-height:44px;border:1px solid #40516a;border-radius:9px 0 0 9px;background:#162130;color:#dfe9f5}.drawer-close{display:block;float:right;width:36px;height:36px;border:0;border-radius:7px;background:#29384b;color:#e7eff9;font-size:21px}}@media(min-width:701px){#mobile-shade{display:none!important}}@media print{.right,.views,.drawer-toggle,#mobile-shade,#reading-progress,#translation-progress{display:none!important}.shell{display:block}.reader,.audit{max-width:none;padding:20px}.backdrop{display:none}body{background:white;color:#111}}`;
  }

  function outputSearchCss() {
    return `.search-panel{position:sticky;z-index:4;top:-18px;margin:0 0 10px;padding:18px 0 6px;background:linear-gradient(#121721 82%,transparent)}.search-tools{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:34px;padding:4px 1px 0}.search-tools[hidden]{display:none}#search-meta{min-width:0;margin:0;color:#9cabbc;font:12px -apple-system,sans-serif}.search-actions{display:flex;flex:0 0 auto;gap:5px}.search-actions button{display:grid;place-items:center;width:30px;height:30px;padding:0;border:1px solid #40506a;border-radius:7px;background:#1a2636;color:#dce8f4;font-size:15px;cursor:pointer}.search-actions button:hover,.search-actions button:focus-visible{border-color:var(--accent);color:var(--accent)}.search-actions button:disabled{opacity:.35;cursor:default}.entry.search-current{outline:2px solid #62d3a488;outline-offset:10px;border-radius:8px;background:#62d3a40c}::highlight(cd-search){background:#e8c45a;color:#111}@media(max-width:700px){.search-panel{top:-15px;padding-top:15px}.search-actions button{width:44px;height:44px}}`;
  }

  function outputChapterCss() {
    return `.chapters{margin:0 0 12px;padding:9px 10px;border:1px solid var(--line);border-radius:10px;background:#101722a8}.chapters summary{display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;font-weight:700}.chapters summary small{color:var(--muted);font-weight:400}.chapter-list{max-height:230px;margin-top:8px;overflow:auto;overscroll-behavior:contain}.chapter-list button{display:block;width:100%;margin:2px 0;padding:7px 9px;border:0;border-left:2px solid transparent;border-radius:5px;background:transparent;color:#aeb9c8;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}.chapter-list button:hover,.chapter-list button:focus-visible{background:#1d2938;color:#eef5fc}.chapter-list button.active{border-left-color:var(--accent);background:#21352f;color:#8be6bd}@media(max-width:700px){.chapter-list{max-height:34vh}.chapter-list button{min-height:44px;padding:10px}}`;
  }

  function outputNavigationCss() {
    return `.right{scrollbar-width:none;-ms-overflow-style:none}.right::-webkit-scrollbar{width:0;height:0}.sidebar-header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 10px}.sidebar-header .views{position:static;z-index:auto;left:auto;top:auto;bottom:auto;transform:none;flex:0 1 auto;padding:4px}.sidebar-header .views button{min-height:32px;padding:4px 10px}.sidebar-header .drawer-close{flex:0 0 36px;margin:0}.interface-language{display:flex;justify-content:flex-end;align-items:center}.interface-language #ui-language{min-width:64px;min-height:34px;margin:0;border:1px solid #4b627b;border-radius:8px;background:#1b2a3c;color:#e8f1fa;font-weight:700;cursor:pointer}.interface-language #ui-language:hover,.interface-language #ui-language:focus-visible{border-color:var(--accent);color:var(--accent)}@media(min-width:701px){.shell{grid-template-columns:minmax(0,1fr) 290px}.right{padding-left:12px;padding-right:10px}}@media(max-width:700px){.sidebar-header{margin-bottom:10px}.sidebar-header .views{display:flex;position:static;left:auto;top:auto;bottom:auto;transform:none}.sidebar-header .views button{min-height:40px}.sidebar-header .drawer-close{display:block;float:none;margin-left:auto}.interface-language #ui-language{min-width:72px;min-height:44px;font-size:15px}}`;
  }

  function outputDashboardCss() {
    return `.dashboard{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans TC",sans-serif}.dashboard-heading{margin:0 0 22px}.dashboard-heading h1{margin:0;text-align:left;font-size:25px}.dashboard-heading p{margin:5px 0 0;color:var(--muted);font-size:13px}.dashboard-overview{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:18px}.metric{min-width:0;padding:13px;border:1px solid #39475a;border-radius:12px;background:#141d29d9}.metric span{display:block;color:var(--muted);font-size:11px}.metric b{display:block;margin-top:5px;color:#edf4fb;font-size:14px;line-height:1.45;overflow-wrap:anywhere}.audit-toolbar{margin:0 0 14px}.audit-toolbar input{width:100%;min-height:42px;padding:9px 11px;border:1px solid #40506a;border-radius:9px;background:#0d131c;color:var(--ink);font-size:14px}.audit-toolbar small{display:block;min-height:18px;margin-top:4px;color:var(--muted)}.dashboard-module{margin:0 0 12px;border:1px solid #38475a;border-radius:12px;background:#121a26dc;overflow:hidden}.dashboard-module>summary{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 15px;cursor:pointer;font-weight:750;list-style-position:inside}.dashboard-module>summary small{color:var(--muted);font-weight:500}.dashboard-module[open]>summary{border-bottom:1px solid #303d4f}.timeline-grid,.trend-grid,.media-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:12px}.timeline-card{display:flex;flex-direction:column;gap:3px;min-width:0;padding:11px;border:1px solid #334358;border-radius:9px;background:#162130;color:#e8f0f8;text-align:left;cursor:pointer}.timeline-card:hover,.timeline-card:focus-visible{border-color:var(--accent);background:#1d302c}.timeline-card b,.timeline-card span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.timeline-card b{font-size:12px}.timeline-card span{color:var(--muted);font-size:11px}.memory-list{padding:10px}.memory-group{margin:5px 0;border:1px solid #303e50;border-radius:9px;background:#101721}.memory-group>summary,.memory-card>summary{display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer}.memory-group>summary{padding:10px 12px;color:#dce6f1;font-weight:650}.memory-group>summary small,.memory-card>summary small{color:var(--muted)}.memory-group>div{padding:0 7px 7px}.memory-card{position:relative;margin:5px 0;border:1px solid #344357;border-radius:8px;background:#151f2c}.memory-card>summary{padding:9px 42px 9px 10px;color:#bfcbd9;font-size:12px}.memory-card pre,.raw-preview pre{max-height:360px;margin:0;padding:12px;overflow:auto;border-top:1px solid #303d4d;color:#e2e8f0;white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.75 Georgia,"Noto Serif TC",serif}.inline-jump{position:absolute;z-index:1;top:5px;right:7px;width:32px;height:32px;border:0;border-radius:7px;background:#25364b;color:#83e0b7;cursor:pointer}.trend-card{padding:12px;border:1px solid #334358;border-radius:10px;background:#111a26}.trend-card:only-child{grid-column:1/-1}.trend-card header,.trend-card footer{display:flex;justify-content:space-between;align-items:center;gap:8px}.trend-card header span,.trend-card footer{color:var(--muted);font-size:11px}.trend-card svg{display:block;width:100%;height:72px;margin:8px 0}.trend-card polyline{fill:none;stroke:var(--accent);stroke-width:2.5;vector-effect:non-scaling-stroke}.trend-card footer button{width:30px;height:30px;border:0;border-radius:7px;background:#25364b;color:#83e0b7;cursor:pointer}.emotion-list{display:flex;flex-wrap:wrap;gap:7px;padding:12px}.emotion-chip{display:flex;align-items:center;gap:6px;min-height:36px;padding:7px 10px;border:1px solid #3a4a5d;border-radius:999px;background:#172230;color:#e5edf6;cursor:pointer}.emotion-chip:hover,.emotion-chip:focus-visible{border-color:var(--accent)}.emotion-chip small{color:var(--accent)}.media-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.media-card{min-width:0;padding:0;border:1px solid #37475b;border-radius:10px;background:#111923;color:#dce5ee;overflow:hidden;cursor:pointer}.media-card img{display:block;width:100%;aspect-ratio:1/1;object-fit:cover;background:#0c1118}.media-card span{display:block;padding:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}.raw-module>p{margin:12px 14px;color:var(--muted);font-size:12px}.raw-module>#download-audit-json{margin:0 14px 12px;padding:9px 12px;border:0;border-radius:8px;background:#259b70;color:white;font-weight:700;cursor:pointer}.raw-preview{margin:0 12px 12px;border:1px solid #334155;border-radius:8px}.raw-preview>summary{padding:9px;cursor:pointer}.empty-state{grid-column:1/-1;margin:0;padding:16px;color:var(--muted);text-align:center}.dashboard [hidden]{display:none!important}@media(max-width:700px){.audit{padding-top:28px}.dashboard-overview{grid-template-columns:repeat(2,minmax(0,1fr))}.timeline-grid,.trend-grid{grid-template-columns:1fr}.media-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.dashboard-module>summary{min-height:48px}.timeline-card,.emotion-chip{min-height:44px}}`;
  }

  function outputLightboxCss() {
    return `body.image-lightbox-open{overflow:hidden}.image-lightbox{position:fixed;z-index:80;inset:0;display:grid;place-items:center;padding:clamp(18px,4vw,48px);background:#05080bea;backdrop-filter:blur(10px)}.image-lightbox[hidden]{display:none}.image-lightbox figure{display:grid;grid-template-rows:minmax(0,1fr) auto;max-width:min(100%,1100px);max-height:100%;margin:0}.image-lightbox img{display:block;max-width:100%;max-height:calc(100vh - 130px);margin:auto;border:1px solid #55667c;border-radius:12px;background:#0b1119;object-fit:contain;box-shadow:0 22px 70px #000b}.image-lightbox figcaption{padding:12px 8px 0;color:#dce6f1;text-align:center;font:13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.image-lightbox-close{position:absolute;top:18px;right:18px;width:44px;height:44px;border:1px solid #52657c;border-radius:50%;background:#142131;color:#eef6ff;font-size:28px;line-height:1;cursor:pointer}.image-lightbox-close:hover,.image-lightbox-close:focus-visible{border-color:var(--accent);color:var(--accent)}@media(max-width:700px){.image-lightbox{padding:16px}.image-lightbox img{max-height:calc(100vh - 100px);border-radius:10px}.image-lightbox-close{top:12px;right:12px}}`;
  }

  function outputRuntime(states, defaultLayout) {
    'use strict';
    const get = id => document.getElementById(id), entries = [...document.querySelectorAll('.entry')], scenes = [...document.querySelectorAll('.scene[id]')];
    const reader = get('reader'), audit = get('audit'), right = get('right'), shell = document.querySelector('.shell'), stateBox = get('state'), backdrop = document.querySelector('.backdrop');
    const search = get('search'), searchTools = get('search-tools'), searchMeta = get('search-meta'), searchPrevious = get('search-prev'), searchNext = get('search-next'), chapters = get('chapters'), chapterList = get('chapter-list'), auditSearch = get('audit-search'), auditSearchMeta = get('audit-search-meta'), downloadAuditJson = get('download-audit-json'), rawAuditData = get('audit-raw-data'), mode = get('mode'), target = get('language'), uiLanguageToggle = get('ui-language'), showOriginalCopy = get('show-original-copy'), translateButton = get('translate-all'), viewButton = get('translation-view'), cancelButton = get('cancel-translation'), note = get('translation-note'), imageLightbox = get('image-lightbox'), imageLightboxImage = get('image-lightbox-image'), imageLightboxCaption = get('image-lightbox-caption'), imageLightboxClose = get('image-lightbox-close');
    const safeGet = (key, fallback) => { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } }, safeSet = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
    const text = {
      'zh-Hant': { search: '搜尋對話…', previous: '上一筆', next: '下一筆', chapters: '章節導覽', chapterCount: count => `${count} 個場景`, settings: '閱讀與翻譯設定', mode: '閱讀模式', novel: '小說頁面', chat: '對話頁面', target: '翻譯目標語言', showOriginal: '翻譯後顯示原文', ui: '介面語言', collapse: '收合側邊欄', status: '狀態', api: '自然翻譯 API（選填）', model: '模型名稱', key: 'API 金鑰', translate: '翻譯所有段落', original: '只顯示原文', translated: '顯示翻譯', cancel: '取消翻譯', state: '當前狀態', time: '遊戲時間', place: '地點', weather: '天氣', character: '角色', emotion: '情緒', read: '閱讀', data: '資料頁', dash: { title: '對話資料儀表板', intro: '整理 API 已確認回傳的狀態、記憶與圖片。', search: '搜尋記憶、情緒與場景…', date: '日期範圍', turns: '回合', scenes: '場景', images: '圖片', timeline: '場景時間軸', long: '長期記憶版本', short: '短期記憶', relation: '關係變化', emotions: '情緒時間軸', gallery: '圖片集', raw: '原始／已解析資料', rawNote: '僅包含匯出器已確認解析的欄位。', download: '下載 JSON', preview: '預覽最新一筆', jump: '回到對話', found: count => `找到 ${count} 項資料`, emptyTimeline: '沒有場景資料。', emptyLong: '沒有長期記憶。', emptyShort: '沒有短期記憶。', emptyRelation: '沒有 API 數值資料。', emptyEmotion: '沒有情緒資料。', emptyGallery: '沒有匯出的圖片。' }, free: '未填 API 時會直接在本頁使用 Google 翻譯。', position: (now, total) => !total ? '沒有符合的對話' : now ? `第 ${now} / ${total} 筆` : `找到 ${total} 筆`, progress: (now, total) => `翻譯中 ${now} / ${total}`, done: (ok, fail) => `翻譯完成：成功 ${ok} 則，失敗 ${fail} 則。`, changed: '目標語言已變更，請重新翻譯。' },
      en: { search: 'Search conversation…', previous: 'Previous result', next: 'Next result', chapters: 'Chapters', chapterCount: count => `${count} scenes`, settings: 'Reading and translation', mode: 'Reading layout', novel: 'Novel', chat: 'Chat', target: 'Translation language', showOriginal: 'Show original below translation', ui: 'Interface language', collapse: 'Collapse sidebar', status: 'Status', api: 'Natural translation API (optional)', model: 'Model', key: 'API key', translate: 'Translate all passages', original: 'Show original only', translated: 'Show translation', cancel: 'Cancel translation', state: 'Current status', time: 'Game time', place: 'Location', weather: 'Weather', character: 'Character', emotion: 'Emotion', read: 'Read', data: 'Data', dash: { title: 'Conversation dashboard', intro: 'Confirmed API states, memories, and images.', search: 'Search memories, emotions, and scenes…', date: 'Date range', turns: 'Turns', scenes: 'Scenes', images: 'Images', timeline: 'Scene timeline', long: 'Long-term memory versions', short: 'Short-term memories', relation: 'Relationship trends', emotions: 'Emotion timeline', gallery: 'Gallery', raw: 'Raw / parsed data', rawNote: 'Contains only fields confirmed and parsed by the exporter.', download: 'Download JSON', preview: 'Preview latest record', jump: 'Go to conversation', found: count => `${count} data items found`, emptyTimeline: 'No scene data.', emptyLong: 'No long-term memory.', emptyShort: 'No short-term memory.', emptyRelation: 'No numeric API data.', emptyEmotion: 'No emotion data.', emptyGallery: 'No exported images.' }, free: 'Without an API, Google Translate is used in this page.', position: (now, total) => !total ? 'No matching conversation' : now ? `${now} / ${total}` : `${total} results`, progress: (now, total) => `Translating ${now} / ${total}`, done: (ok, fail) => `Done: ${ok} translated, ${fail} failed.`, changed: 'Target language changed. Translate again.' }
    };
    let uiLanguage = safeGet('caveduck-exporter-output-language', 'zh-Hant'), translationsVisible = false, cancelled = false;
    const words = () => text[uiLanguage] || text['zh-Hant'];
    const chapterButtons = scenes.map(scene => {
      const button = document.createElement('button'), label = scene.querySelector('span')?.textContent?.trim() || scene.id;
      button.type = 'button'; button.dataset.target = scene.id; button.textContent = label; button.title = label;
      chapterList.append(button); return button;
    });
    chapters.hidden = scenes.length === 0;
    const escape = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const rows = relation => Object.entries(relation || {}).filter(([, value]) => value !== null && value !== '' && typeof value !== 'object').map(([key, value]) => `<div><dt>${escape(key)}</dt><dd>${escape(value)}</dd></div>`).join('');
    const activate = entry => { const value = states[entry.id]; if (!value) return; const t = words(); stateBox.innerHTML = `<div class="card"><div><dt>${t.time}</dt><dd>${escape(value.gameTime || '—')}</dd></div><div><dt>${t.place}</dt><dd>${escape(value.place || '—')}</dd></div><div><dt>${t.weather}</dt><dd>${escape(value.weather || '—')}</dd></div><div><dt>${t.character}</dt><dd>${escape(value.name || '—')}</dd></div><div><dt>${t.emotion}</dt><dd>${escape(value.emotion || '—')}</dd></div>${rows(value.relation)}</div>`; if (value.image) backdrop.style.backgroundImage = `linear-gradient(#0d1117eb,#0d1117f5),url("${String(value.image).replace(/"/g, '')}")`; };
    const markChapterForEntry = entry => {
      let active = scenes[0];
      for (const scene of scenes) { if (scene.compareDocumentPosition(entry) & Node.DOCUMENT_POSITION_FOLLOWING) active = scene; else break; }
      chapterButtons.forEach(button => button.classList.toggle('active', button.dataset.target === active?.id));
    };
    const syncChapter = () => {
      if (!scenes.length || reader.hidden) return;
      let active = scenes[0];
      for (const scene of scenes) { if (scene.getBoundingClientRect().top <= innerHeight * .5) active = scene; else break; }
      chapterButtons.forEach(button => button.classList.toggle('active', button.dataset.target === active.id));
    };
    let frame = 0;
    const sync = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { let best, distance = Infinity; for (const entry of entries) { if (entry.hidden) continue; const rect = entry.getBoundingClientRect(), current = Math.abs((rect.top + rect.bottom) / 2 - innerHeight / 2); if (current < distance) { distance = current; best = entry; } } if (best) activate(best); syncChapter(); const max = Math.max(1, document.documentElement.scrollHeight - innerHeight); get('reading-progress').style.width = `${Math.max(0, Math.min(100, scrollY / max * 100))}%`; }); };
    let searchMatches = [], searchIndex = -1;
    const searchableText = entry => `${entry.dataset.search || ''} ${entry.querySelector('.prose')?.innerText || ''} ${entry.querySelector('.original-copy')?.innerText || ''}`.toLocaleLowerCase();
    const clearTextHighlights = () => { if (globalThis.CSS?.highlights) CSS.highlights.delete('cd-search'); };
    const highlightSearchText = (query, entry) => {
      clearTextHighlights();
      if (!query || !entry || !globalThis.CSS?.highlights || typeof globalThis.Highlight !== 'function') return;
      const ranges = [];
      const walker = document.createTreeWalker(entry, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.parentElement?.closest('.original-copy[hidden]')) continue;
        const value = node.data.toLocaleLowerCase();
        let start = 0;
        while ((start = value.indexOf(query, start)) >= 0) {
          const range = new Range(); range.setStart(node, start); range.setEnd(node, start + query.length); ranges.push(range); start += query.length || 1;
        }
      }
      if (ranges.length) CSS.highlights.set('cd-search', new Highlight(...ranges));
    };
    const renderSearchStatus = () => {
      const total = searchMatches.length, current = total ? searchIndex + 1 : 0;
      searchTools.hidden = !search.value.trim();
      searchMeta.textContent = searchTools.hidden ? '' : words().position(current, total);
      searchPrevious.disabled = searchNext.disabled = total === 0;
    };
    const focusSearchResult = index => {
      if (!searchMatches.length) return;
      searchIndex = (index + searchMatches.length) % searchMatches.length;
      entries.forEach(entry => entry.classList.remove('search-current'));
      const entry = searchMatches[searchIndex]; entry.classList.add('search-current');
      highlightSearchText(search.value.trim().toLocaleLowerCase(), entry);
      renderSearchStatus(); activate(entry); markChapterForEntry(entry);
      if (isMobile()) closeDrawer();
      requestAnimationFrame(() => entry.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    };
    const updateSearch = () => {
      const query = search.value.trim().toLocaleLowerCase();
      entries.forEach(entry => entry.classList.remove('search-match', 'search-current'));
      searchMatches = query ? entries.filter(entry => searchableText(entry).includes(query)) : [];
      searchMatches.forEach(entry => entry.classList.add('search-match'));
      searchIndex = -1;
      clearTextHighlights(); renderSearchStatus(); sync();
    };
    const auditSearchables = [...audit.querySelectorAll('.audit-searchable')], auditSections = [...audit.querySelectorAll('[data-dashboard-section]')], auditDetails = [...audit.querySelectorAll('details')];
    const updateAuditSearch = () => {
      const query = auditSearch.value.trim().toLocaleLowerCase(), starting = query && !auditSearch.dataset.active;
      if (starting) { auditSearch.dataset.active = '1'; auditDetails.forEach(details => details.dataset.beforeSearchOpen = details.open ? '1' : '0'); }
      if (!query) {
        auditSearchables.forEach(node => node.hidden = false);
        auditSections.forEach(section => section.hidden = false);
        audit.querySelectorAll('.memory-group').forEach(group => group.hidden = false);
        if (auditSearch.dataset.active) auditDetails.forEach(details => { details.open = details.dataset.beforeSearchOpen === '1'; delete details.dataset.beforeSearchOpen; });
        delete auditSearch.dataset.active; auditSearchMeta.textContent = ''; return;
      }
      let matches = 0;
      for (const node of auditSearchables) { const match = node.textContent.toLocaleLowerCase().includes(query); node.hidden = !match; if (match) { matches++; if (node instanceof HTMLDetailsElement) node.open = true; } }
      audit.querySelectorAll('.memory-group').forEach(group => { const visible = [...group.querySelectorAll('.audit-searchable')].some(node => !node.hidden); group.hidden = !visible; if (visible) group.open = true; });
      auditSections.forEach(section => { const items = [...section.querySelectorAll('.audit-searchable')], visible = items.some(node => !node.hidden); section.hidden = !visible; if (visible) section.open = true; });
      auditSearchMeta.textContent = words().dash.found(matches);
    };
    const setTranslationView = show => { translationsVisible = show; let available = false; for (const entry of entries) { const prose = entry.querySelector('.prose'), originalBox = entry.querySelector('.original-copy'), original = entry.dataset.original, translated = entry.dataset.translated; if (!original || !translated) continue; available = true; prose.textContent = show ? translated : original; originalBox.textContent = original; originalBox.hidden = !(show && showOriginalCopy.checked); } viewButton.hidden = !available; viewButton.textContent = show ? words().original : words().translated; if (search.value.trim()) updateSearch(); };
    const applyLanguage = () => {
      const t = words();
      document.documentElement.lang = uiLanguage;
      search.placeholder = t.search;
      searchPrevious.title = t.previous; searchPrevious.setAttribute('aria-label', t.previous);
      searchNext.title = t.next; searchNext.setAttribute('aria-label', t.next);
      get('chapters-title').textContent = t.chapters; get('chapters-count').textContent = t.chapterCount(scenes.length); chapterList.setAttribute('aria-label', t.chapters);
      const d = t.dash, put = (id, value) => { const node = get(id); if (node) node.textContent = value; };
      auditSearch.placeholder = d.search;
      [['audit-title', d.title], ['audit-intro', d.intro], ['metric-date-label', d.date], ['metric-turn-label', d.turns], ['metric-scene-label', d.scenes], ['metric-image-label', d.images], ['timeline-title', d.timeline], ['long-memory-title', d.long], ['short-memory-title', d.short], ['relation-title', d.relation], ['emotion-title', d.emotions], ['gallery-title', d.gallery], ['raw-title', d.raw], ['raw-note', d.rawNote], ['download-audit-json', d.download], ['raw-preview-title', d.preview], ['timeline-empty', d.emptyTimeline], ['long-memory-empty', d.emptyLong], ['short-memory-empty', d.emptyShort], ['relation-empty', d.emptyRelation], ['emotion-empty', d.emptyEmotion], ['gallery-empty', d.emptyGallery]].forEach(([id, value]) => put(id, value));
      audit.querySelectorAll('[data-audit-jump]').forEach(button => { button.title = d.jump; button.setAttribute('aria-label', d.jump); });
      get('settings-title').textContent = t.settings; get('mode-label').textContent = t.mode;
      mode.options[0].textContent = t.novel; mode.options[1].textContent = t.chat;
      get('target-label').textContent = t.target; get('show-original-label').textContent = t.showOriginal;
      const nextLanguage = uiLanguage === 'en' ? '繁中' : 'EN', languageAction = uiLanguage === 'en' ? '切換為繁體中文' : 'Switch to English';
      uiLanguageToggle.textContent = nextLanguage; uiLanguageToggle.title = languageAction; uiLanguageToggle.setAttribute('aria-label', languageAction); get('api-summary').textContent = t.api;
      get('model-label').textContent = t.model; get('key-label').textContent = t.key;
      translateButton.textContent = t.translate; cancelButton.textContent = t.cancel;
      get('state-title').textContent = t.state; get('drawer-toggle').textContent = t.status; get('drawer-close').title = t.collapse;
      document.querySelector('[data-view="reader"]').textContent = t.read; document.querySelector('[data-view="audit"]').textContent = t.data;
      document.querySelectorAll('time[data-created-at]').forEach(node => { const date = new Date(node.dataset.createdAt); if (!Number.isNaN(date.getTime())) node.textContent = date.toLocaleString(uiLanguage === 'en' ? 'en-US' : 'zh-TW'); });
      if (!note.dataset.result) note.textContent = t.free;
      setTranslationView(translationsVisible); renderSearchStatus(); if (auditSearch.value) updateAuditSearch(); sync();
    };
    const splitText = (value, limit = 900) => { const output = []; let rest = String(value || ''); while (rest.length > limit) { let cut = Math.max(rest.lastIndexOf('\n', limit), rest.lastIndexOf('。', limit), rest.lastIndexOf('！', limit), rest.lastIndexOf('？', limit), rest.lastIndexOf(' ', limit)); if (cut < limit * .45) cut = limit; else cut++; output.push(rest.slice(0, cut)); rest = rest.slice(cut); } if (rest) output.push(rest); return output; };
    const wait = delay => new Promise(resolve => setTimeout(resolve, delay));
    const googleChunk = async (value, language) => { let lastError; for (let attempt = 0; attempt < 3; attempt++) { const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 25000); try { const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(language)}&dt=t&q=${encodeURIComponent(value)}`; const response = await fetch(url, { signal: controller.signal, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' }); if (!response.ok) throw new Error(`Google HTTP ${response.status}`); const data = await response.json(), result = Array.isArray(data?.[0]) ? data[0].map(item => item?.[0]).filter(Boolean).join('') : ''; if (!result) throw new Error('Google returned no translation'); return result; } catch (error) { lastError = error; if (attempt < 2) await wait(700 * (attempt + 1)); } finally { clearTimeout(timer); } } throw lastError; };
    const translateGoogle = async source => { const output = []; for (const part of splitText(source)) { output.push(await googleChunk(part, target.value)); if (cancelled) break; await wait(150); } return output.join(''); };
    const translateNatural = async source => { const apiUrl = get('api-url').value.trim(), apiKey = get('api-key').value.trim(), model = get('api-model').value.trim(); const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model, messages: [{ role: 'system', content: 'Translate faithfully and naturally. Return only the translation.' }, { role: 'user', content: `Target language: ${target.value}\n\n${source}` }] }) }); if (!response.ok) throw new Error(`API HTTP ${response.status}`); const data = await response.json(), result = data?.choices?.[0]?.message?.content; if (!result) throw new Error('API returned no translation'); return result; };
    const translateEntry = async entry => { const prose = entry.querySelector('.prose'), originalBox = entry.querySelector('.original-copy'), source = entry.dataset.original || prose.innerText; entry.dataset.original = source; const useApi = get('api-url').value.trim() && get('api-key').value.trim(); const result = useApi ? await translateNatural(source) : await translateGoogle(source); if (!result) throw new Error('Empty translation'); entry.dataset.translated = result; entry.dataset.translationTarget = target.value; prose.textContent = result; originalBox.textContent = source; originalBox.hidden = !showOriginalCopy.checked; };

    search.oninput = updateSearch;
    search.onkeydown = event => {
      if (event.key === 'Enter') { event.preventDefault(); focusSearchResult(event.shiftKey && searchIndex < 0 ? searchMatches.length - 1 : searchIndex + (event.shiftKey ? -1 : 1)); }
      if (event.key === 'Escape' && search.value) { event.preventDefault(); search.value = ''; updateSearch(); }
    };
    searchPrevious.onclick = () => focusSearchResult(searchIndex < 0 ? searchMatches.length - 1 : searchIndex - 1);
    searchNext.onclick = () => focusSearchResult(searchIndex + 1);
    auditSearch.oninput = updateAuditSearch;
    auditSearch.onkeydown = event => { if (event.key === 'Escape' && auditSearch.value) { event.preventDefault(); auditSearch.value = ''; updateAuditSearch(); } };
    downloadAuditJson.onclick = () => {
      const blob = new Blob([rawAuditData.textContent], { type: 'application/json;charset=utf-8' }), url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = 'caveduck_dashboard_data.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    mode.value = defaultLayout === 'chat' ? 'chat' : 'novel'; reader.classList.toggle('chat', mode.value === 'chat'); mode.onchange = () => reader.classList.toggle('chat', mode.value === 'chat');
    uiLanguageToggle.onclick = () => { uiLanguage = uiLanguage === 'en' ? 'zh-Hant' : 'en'; safeSet('caveduck-exporter-output-language', uiLanguage); applyLanguage(); };
    showOriginalCopy.onchange = () => setTranslationView(translationsVisible);
    viewButton.onclick = () => setTranslationView(!translationsVisible);
    target.onchange = () => { if (entries.some(entry => entry.dataset.translated)) { setTranslationView(false); for (const entry of entries) delete entry.dataset.translated; viewButton.hidden = true; note.dataset.result = ''; note.textContent = words().changed; } };
    cancelButton.onclick = () => { cancelled = true; };
    translateButton.onclick = async () => { const visible = entries.filter(entry => !entry.hidden), originalLabel = translateButton.textContent; cancelled = false; translateButton.disabled = true; cancelButton.hidden = false; let ok = 0, failed = 0; try { for (let index = 0; index < visible.length && !cancelled; index++) { const progress = words().progress(index + 1, visible.length); translateButton.textContent = progress; try { await translateEntry(visible[index]); ok++; } catch (error) { failed++; const box = visible[index].querySelector('.original-copy'); box.textContent = `${uiLanguage === 'en' ? 'Translation failed' : '翻譯失敗'}：${error.message}`; box.hidden = false; } } translationsVisible = true; setTranslationView(true); note.dataset.result = '1'; note.textContent = words().done(ok, failed); } finally { translateButton.disabled = false; translateButton.textContent = originalLabel; cancelButton.hidden = true; } };
    const showView = name => {
      const showAudit = name === 'audit'; reader.hidden = showAudit; audit.hidden = !showAudit;
      document.querySelectorAll('.views button').forEach(item => item.classList.toggle('active', item.dataset.view === name));
      closeDrawer(); sync();
    };
    document.querySelectorAll('.views button').forEach(button => button.onclick = () => showView(button.dataset.view));
    let lightboxOpener = null;
    const closeImageLightbox = () => { imageLightbox.hidden = true; imageLightboxImage.removeAttribute('src'); document.body.classList.remove('image-lightbox-open'); lightboxOpener?.focus(); };
    const openImageLightbox = button => { lightboxOpener = button; imageLightboxImage.src = button.dataset.imageUrl; imageLightboxImage.alt = button.dataset.imageLabel || ''; imageLightboxCaption.textContent = button.dataset.imageLabel || ''; imageLightbox.hidden = false; document.body.classList.add('image-lightbox-open'); imageLightboxClose.focus(); };
    audit.onclick = event => {
      const image = event.target.closest('[data-image-view]'); if (image) { openImageLightbox(image); return; }
      const jump = event.target.closest('[data-jump]'); if (!jump) return;
      const entry = get(jump.dataset.jump); if (!entry) return;
      showView('reader'); activate(entry); markChapterForEntry(entry);
      requestAnimationFrame(() => entry.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    };
    imageLightboxClose.onclick = closeImageLightbox;
    imageLightbox.onclick = event => { if (event.target === imageLightbox) closeImageLightbox(); };
    chapterList.onclick = event => {
      const button = event.target.closest('button[data-target]'); if (!button) return;
      const scene = get(button.dataset.target); if (!scene) return;
      chapterButtons.forEach(item => item.classList.toggle('active', item === button));
      showView('reader');
      requestAnimationFrame(() => scene.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    };
    const shade = get('mobile-shade'), drawerToggle = get('drawer-toggle'), drawerClose = get('drawer-close');
    let desktopCollapsed = false;
    const isMobile = () => matchMedia('(max-width:700px)').matches;
    function openDrawer() { right.classList.add('open'); shade.hidden = false; document.body.style.overflow = 'hidden'; drawerToggle.style.display = 'none'; }
    function closeDrawer() { right.classList.remove('open'); shade.hidden = true; document.body.style.overflow = ''; if (!desktopCollapsed) drawerToggle.style.removeProperty('display'); }
    function collapseSidebar() {
      desktopCollapsed = true;
      right.style.display = 'none';
      shell.style.gridTemplateColumns = 'minmax(0,1fr)';
      drawerToggle.classList.add('desktop-reopen');
      drawerToggle.style.cssText = 'display:block;position:fixed;z-index:31;right:0;top:16px;bottom:auto;min-width:44px;min-height:44px;border:1px solid #40516a;border-radius:9px 0 0 9px;background:#162130;color:#dfe9f5;cursor:pointer';
    }
    function expandSidebar() {
      desktopCollapsed = false;
      right.style.removeProperty('display');
      shell.style.removeProperty('grid-template-columns');
      drawerToggle.classList.remove('desktop-reopen');
      drawerToggle.removeAttribute('style');
    }
    function applySidebarLayout() {
      if (isMobile()) {
        if (desktopCollapsed) expandSidebar();
        drawerClose.textContent = '×';
        drawerClose.removeAttribute('style');
      } else {
        closeDrawer();
        drawerClose.textContent = '›';
        drawerClose.style.cssText = 'display:block;flex:0 0 36px;width:36px;height:36px;margin:0 0 0 auto;border:0;border-radius:7px;background:#29384b;color:#e7eff9;font-size:24px;line-height:1;cursor:pointer';
      }
    }
    drawerToggle.onclick = () => isMobile() ? openDrawer() : expandSidebar();
    drawerClose.onclick = () => isMobile() ? closeDrawer() : collapseSidebar();
    shade.onclick = closeDrawer;
    addEventListener('keydown', event => { if (event.key !== 'Escape') return; if (!imageLightbox.hidden) { closeImageLightbox(); return; } isMobile() ? closeDrawer() : collapseSidebar(); }); addEventListener('scroll', sync, { passive: true }); addEventListener('resize', () => { applySidebarLayout(); sync(); });
    applySidebarLayout();
    applyLanguage(); if (entries[0]) activate(entries[0]); sync();
  }

  applyPanelLanguage();
  fetchAll();
})();
