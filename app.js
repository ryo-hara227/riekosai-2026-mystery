(() => {
  'use strict';

  const COURSE = window.HERO_EASY;
  if (!COURSE || !Array.isArray(COURSE.pages)) {
    document.body.textContent = '問題データを読み込めませんでした。data/easy.js を確認してください。';
    return;
  }

  // 【編集箇所】このキーを公開後に変更すると、以前の進捗を読み込めません。
  const STORAGE_KEY = 'hero_easy_progress_v1';
  const get = id => document.getElementById(id);
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const pages = COURSE.pages;
  const homeScreen = get('homeScreen');
  const playScreen = get('playScreen');
  const pagePanel = get('pagePanel');
  const prevBtn = get('prevBtn');
  const nextBtn = get('nextBtn');
  const imageDialog = get('imageDialog');

  const createEmptySave = () => ({
    version: 1,
    started: false,
    currentPageId: pages[0].id,
    completedPuzzleIds: [],
    answerEntries: {},
    cleared: false
  });

  function loadSave() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!stored || typeof stored !== 'object') return createEmptySave();
      return {
        ...createEmptySave(),
        ...stored,
        completedPuzzleIds: Array.isArray(stored.completedPuzzleIds) ? stored.completedPuzzleIds : [],
        answerEntries: stored.answerEntries && typeof stored.answerEntries === 'object' ? stored.answerEntries : {}
      };
    } catch { return createEmptySave(); }
  }
  let save = loadSave();
  let currentIndex = 0;

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(save)); }
    catch { /* private mode: play still works, but may not persist */ }
  }

  function indexForId(id) {
    const index = pages.findIndex(p => p.id === id);
    return index < 0 ? 0 : index;
  }
  function navigateHome() {
    playScreen.hidden = true;
    homeScreen.hidden = false;
    renderHome();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function navigatePage(index) {
    currentIndex = Math.min(Math.max(index, 0), pages.length - 1);
    save.started = true;
    save.currentPageId = pages[currentIndex].id;
    if (pages[currentIndex].type === 'clear') save.cleared = true;
    persist();
    homeScreen.hidden = true;
    playScreen.hidden = false;
    renderPage();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function renderHome() {
    const done = save.completedPuzzleIds.length;
    const progress = get('homeProgress');
    progress.textContent = save.cleared ? '★ CLEAR!' : (save.started ? `進捗：謎 ${done} / 4 問クリア` : '未挑戦');
    get('resumeBtn').hidden = !save.started;
    get('resumeBtn').textContent = save.cleared ? 'クリア画面を開く →' : '続きから再開 →';
  }
  function normalAnswer(s) {
    return String(s || '')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60))
      .replace(/[\s\u3000・･、。，．.／/‐-‒–—―_＿「」『』（）()！!？?'’"“”]/g, '');
  }
  function goodAnswer(input, accepted) {
    const normalized = normalAnswer(input);
    return normalized.length > 0 && accepted.some(a => normalAnswer(a) === normalized);
  }
  function appendParagraphs(target, texts) {
    (texts || []).forEach(line => {
      const p = el('p', line.trim().startsWith('「') ? 'is-dialogue' : '', line);
      target.appendChild(p);
    });
  }
  function makeImage(src, label) {
    const frag = document.createDocumentFragment();
    const frame = el('div', 'puzzle-image-frame');
    const image = el('img');
    image.src = `./${src}`;
    image.alt = `${label}の問題画像`;
    image.loading = 'eager';
    image.addEventListener('error', () => {
      frame.textContent = `画像が見つかりません：${src}`;
    });
    frame.appendChild(image);
    frag.appendChild(frame);
    const zoom = el('button', 'image-zoom-btn', '⤢ 画像を拡大して見る');
    zoom.type = 'button';
    zoom.addEventListener('click', () => openImage(src, label));
    frag.appendChild(zoom);
    return frag;
  }
  function openImage(src, label) {
    const img = get('enlargedImage');
    img.src = `./${src}`;
    img.alt = `${label}の問題画像・拡大表示`;
    if (typeof imageDialog.showModal === 'function') imageDialog.showModal();
    else window.open(`./${src}`, '_blank', 'noopener');
  }
  function renderStory(page, target) {
    const copy = el('div', 'story-copy');
    appendParagraphs(copy, page.paragraphs);
    if (page.notification) {
      const box = el('div', 'system-notification');
      box.append(el('div', 'system-notification__system', page.notification.system));
      box.append(el('div', 'system-notification__text', page.notification.message));
      box.append(el('div', 'notification-label', 'HERO LINK SYSTEM / NOTIFICATION'));
      copy.appendChild(box);
    }
    appendParagraphs(copy, page.afterAlert);
    target.appendChild(copy);
  }
  function renderPuzzle(page, target) {
    const instruction = el('div', 'puzzle-instruction', page.prompt);
    target.appendChild(instruction);

    if (page.quote) {
      const quote = el('div', 'question-quote');
      appendParagraphs(quote, page.quote);
      target.appendChild(quote);
    }
    target.appendChild(makeImage(page.image, page.title));
    if (page.note) target.appendChild(el('div', 'asset-note', page.note));

    const solved = save.completedPuzzleIds.includes(page.id);
    const form = el('form', 'answer-form');
    form.noValidate = true;
    const inputs = [];
    (page.fields || []).forEach((field, i) => {
      const container = el('div', 'answer-field');
      const label = el('label', '', field.label);
      const input = el('input');
      input.type = 'text';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.inputMode = 'text';
      input.placeholder = field.placeholder || '';
      input.id = `answer-${i}`;
      label.htmlFor = input.id;
      input.disabled = solved;
      input.value = (save.answerEntries[page.id] || [])[i] || '';
      container.append(label, input);
      form.appendChild(container);
      inputs.push(input);
    });
    const buttons = el('div', 'answer-actions');
    const submit = el('button', 'btn btn--red', solved ? '正解済み ✓' : '解答する →');
    submit.type = 'submit';
    submit.disabled = solved;
    buttons.appendChild(submit);
    const feedback = el('p', 'answer-feedback' + (solved ? ' is-ok' : ''), solved ? '正解！「次へ」から物語を進めてください。' : '');
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    form.append(buttons, feedback);

    form.addEventListener('submit', event => {
      event.preventDefault();
      if (solved) return;
      const correct = page.fields.every((field, i) => goodAnswer(inputs[i].value, field.answers));
      if (!correct) {
        feedback.textContent = '……違うみたい。もう一度、手掛かりを確認してみよう。';
        feedback.classList.remove('is-ok');
        return;
      }
      if (!save.completedPuzzleIds.includes(page.id)) save.completedPuzzleIds.push(page.id);
      save.answerEntries[page.id] = inputs.map(x => x.value);
      persist();
      inputs.forEach(x => x.disabled = true);
      submit.textContent = '正解済み ✓';
      submit.disabled = true;
      feedback.textContent = '正解！「次へ」から物語を進めてください。';
      feedback.classList.add('is-ok');
      nextBtn.disabled = false;
      nextBtn.textContent = '正解！ 次へ →';
    });
    target.appendChild(form);

    if (page.hints && page.hints.length) {
      const hints = el('div', 'hints');
      page.hints.forEach((hint, idx) => {
        const details = el('details');
        const summary = el('summary', '', page.hints.length === 1 ? 'ヒント' : `ヒント${idx + 1}`);
        details.append(summary, el('p', '', hint));
        hints.appendChild(details);
      });
      target.appendChild(hints);
    }
  }
  function renderClear(target) {
    const wrap = el('div', 'clear-view');
    wrap.append(el('div', 'clear-burst', '★'));
    wrap.append(el('h2', '', 'EASY CLEAR!'));
    wrap.append(el('p', 'clear-view__lead', 'ミッションクリア！ エコーのバッジを取り戻し、ショーを無事に開催できました。'));
    wrap.append(el('p', '', '最後のミッションで使う合言葉をひとつ贈ります。'));
    const keyword = el('div', 'keyword-box');
    keyword.append(el('div', 'keyword-box__caption', 'EXTRA解禁用の合言葉A')); 
    keyword.append(el('div', 'keyword-box__word', COURSE.extraKeyword));
    keyword.append(el('div', 'keyword-box__caution', '※ 現在は仮の合言葉です。正式なEXTRA実装時に変更する予定です。'));
    wrap.appendChild(keyword);
    wrap.append(el('p', '', 'NORMAL・HARDとあわせて3つの合言葉を集めると、EXTRAへ挑戦できます。'));
    const actions = el('div', 'clear-view__actions');
    const home = el('button', 'btn btn--red', 'ミッション一覧へ →');
    home.type = 'button';
    home.addEventListener('click', navigateHome);
    actions.appendChild(home);
    wrap.appendChild(actions);
    target.appendChild(wrap);
  }
  function renderPage() {
    const page = pages[currentIndex];
    get('stepLabel').textContent = `${page.label} / ${currentIndex + 1}・全${pages.length}ページ`;
    const percent = Math.round(((currentIndex + 1) / pages.length) * 100);
    get('stepPercent').textContent = `${percent}%`;
    get('progressBar').style.width = `${percent}%`;
    pagePanel.replaceChildren();
    pagePanel.append(el('span', 'page-overline', page.type === 'puzzle' ? 'PUZZLE! / 謎を解こう' : page.type === 'clear' ? 'MISSION COMPLETE' : 'STORY / 物語'));
    pagePanel.append(el('h2', 'page-title', page.title));
    if (page.type === 'story') renderStory(page, pagePanel);
    if (page.type === 'puzzle') renderPuzzle(page, pagePanel);
    if (page.type === 'clear') renderClear(pagePanel);
    prevBtn.disabled = currentIndex === 0;
    const solved = page.type !== 'puzzle' || save.completedPuzzleIds.includes(page.id);
    nextBtn.disabled = !solved || currentIndex === pages.length - 1;
    nextBtn.textContent = currentIndex === pages.length - 1 ? 'クリア済み ✓' : (solved ? '次へ →' : '正解すると進めます');
    get('playTitle').focus?.({ preventScroll: true });
  }

  get('startBtn').addEventListener('click', () => {
    if (save.started && !window.confirm('EASYを最初から遊び直しますか？ 解答済みの記録もリセットされます。')) return;
    save = createEmptySave();
    persist();
    navigatePage(0);
  });
  get('resumeBtn').addEventListener('click', () => navigatePage(indexForId(save.currentPageId)));
  get('homeBtn').addEventListener('click', navigateHome);
  prevBtn.addEventListener('click', () => navigatePage(currentIndex - 1));
  nextBtn.addEventListener('click', () => {
    if (nextBtn.disabled || currentIndex >= pages.length - 1) return;
    navigatePage(currentIndex + 1);
  });
  get('resetBtn').addEventListener('click', () => {
    if (!window.confirm('この端末のEASY編の進捗を消去しますか？')) return;
    save = createEmptySave();
    localStorage.removeItem(STORAGE_KEY);
    navigateHome();
  });
  get('closeImageBtn').addEventListener('click', () => imageDialog.close());
  imageDialog.addEventListener('click', e => { if (e.target === imageDialog) imageDialog.close(); });

  // 安全のため、再開の保存先IDが削除されていた場合は先頭に戻す。
  renderHome();
  navigateHome();
})();
