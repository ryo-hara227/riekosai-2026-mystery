(() => {
  'use strict';
  const COURSES = { easy: window.HERO_EASY, normal: window.HERO_NORMAL };
  if (Object.values(COURSES).some(c => !c || !Array.isArray(c.pages))) {
    document.body.textContent = '問題データを読み込めませんでした。data/easy.js・data/normal.js を確認してください。';
    return;
  }
  // EASYの保存キーは旧試作と共通のまま維持しています。
  const STORAGE_KEYS = { easy: 'hero_easy_progress_v1', normal: 'hero_normal_progress_v1' };
  const get = id => document.getElementById(id);
  const el = (tag, className, content) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  };
  const homeScreen = get('homeScreen');
  const playScreen = get('playScreen');
  const pagePanel = get('pagePanel');
  const prevBtn = get('prevBtn');
  const nextBtn = get('nextBtn');
  const imageDialog = get('imageDialog');
  let courseId = 'easy';
  let currentIndex = 0;
  let save = null;
  const course = () => COURSES[courseId];
  const pages = () => course().pages;
  const defaultSave = id => ({ version:1, started:false, currentPageId:COURSES[id].pages[0].id, completedPuzzleIds:[], answerEntries:{}, cleared:false });
  function loadSave(id) {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS[id]));
      if (!raw || typeof raw !== 'object') return defaultSave(id);
      return { ...defaultSave(id), ...raw,
        completedPuzzleIds: Array.isArray(raw.completedPuzzleIds) ? raw.completedPuzzleIds : [],
        answerEntries: raw.answerEntries && typeof raw.answerEntries === 'object' && !Array.isArray(raw.answerEntries) ? raw.answerEntries : {}
      };
    } catch { return defaultSave(id); }
  }
  save = loadSave('easy');
  function persist() { try { localStorage.setItem(STORAGE_KEYS[courseId], JSON.stringify(save)); } catch { /* 保存が許可されないブラウザでもプレイ可能 */ } }
  function indexForId(id) { const i = pages().findIndex(p => p.id === id); return i >= 0 ? i : 0; }
  function goTop() { try { window.scrollTo({ top:0, behavior:'instant' }); } catch {} }
  function navigateHome() {
    playScreen.hidden = true;
    homeScreen.hidden = false;
    renderHome(); goTop();
  }
  function navigatePage(index) {
    currentIndex = Math.min(Math.max(index,0), pages().length-1);
    save.started = true;
    save.currentPageId = pages()[currentIndex].id;
    if (pages()[currentIndex].type === 'clear') save.cleared = true;
    persist();
    homeScreen.hidden = true;
    playScreen.hidden = false;
    renderPage(); goTop();
  }
  function renderHomeCourse(id, progressId, resumeId) {
    const record = loadSave(id);
    const count = COURSES[id].pages.filter(p=>p.type==='puzzle').length;
    const done = record.completedPuzzleIds.filter(pid => COURSES[id].pages.some(p=>p.id===pid && p.type==='puzzle')).length;
    get(progressId).textContent = record.cleared ? '★ CLEAR!' : record.started ? `進捗：謎 ${done} / ${count} 問クリア` : '未挑戦';
    get(resumeId).hidden = !record.started;
    get(resumeId).textContent = record.cleared ? 'クリア画面を開く →' : '続きから再開 →';
  }
  function renderHome() {
    renderHomeCourse('easy','homeProgress','resumeBtn');
    renderHomeCourse('normal','normalHomeProgress','normalResumeBtn');
  }
  function enterCourse(id, restart) {
    courseId = id;
    save = loadSave(id);
    if (restart) {
      if (save.started && !window.confirm(`${id.toUpperCase()}を最初から遊び直しますか？ このコースの解答済み記録もリセットされます。`)) return;
      save = defaultSave(id);
      persist(); navigatePage(0);
    } else navigatePage(indexForId(save.currentPageId));
  }
  function normalizeText(s) {
    return String(s ?? '').normalize('NFKC').toLowerCase()
      .replace(/[ァ-ヶ]/g, ch=>String.fromCharCode(ch.charCodeAt(0)-0x60))
      .replace(/[\s\u3000・･、。，．.／/‐-‒–—―_＿「」『』（）()！!？?'’"“”]/g, '');
  }
  function goodAnswer(input, field) {
    if (field.mode === 'digits') {
      const clean = s => String(s ?? '').normalize('NFKC').replace(/[^0-9]/g,'');
      return clean(input).length > 0 && field.answers.some(a=>clean(a)===clean(input));
    }
    const given = normalizeText(input);
    return given.length > 0 && field.answers.some(a=>normalizeText(a)===given);
  }
  function appendParagraphs(target, texts) {
    (texts||[]).forEach(t => target.append(el('p',t.trim().startsWith('「')||t.trim().startsWith('『')?'is-dialogue':'',t)));
  }
  function makeImage(src,label) {
    const frag = document.createDocumentFragment();
    const frame = el('div','puzzle-image-frame');
    const img = el('img');
    img.src = `./${src}`;
    img.alt = `${label}の画像`;
    img.loading = 'eager';
    img.addEventListener('error',()=>{ frame.textContent = `画像が見つかりません：${src}`; });
    frame.appendChild(img); frag.appendChild(frame);
    const zoom = el('button','image-zoom-btn','⤢ 画像を拡大して見る');
    zoom.type = 'button';
    zoom.addEventListener('click',()=>openImage(src,label));
    frag.appendChild(zoom); return frag;
  }
  function openImage(src,label) {
    get('enlargedImage').src = `./${src}`;
    get('enlargedImage').alt = `${label}・拡大表示`;
    if (typeof imageDialog.showModal === 'function') imageDialog.showModal();
    else window.open(`./${src}`,'_blank','noopener');
  }
  function renderStory(page,target) {
    const copy = el('div','story-copy');
    appendParagraphs(copy,page.paragraphs);
    if (page.image) copy.appendChild(makeImage(page.image,page.imageLabel||page.title));
    if (page.note) copy.append(el('p','asset-note',page.note));
    if (page.notification) {
      const alert = el('div','system-notification');
      alert.append(el('div','system-notification__system',page.notification.system));
      alert.append(el('div','system-notification__text',page.notification.message));
      alert.append(el('div','notification-label','HERO LINK SYSTEM / NOTIFICATION'));
      copy.appendChild(alert);
    }
    appendParagraphs(copy,page.afterAlert);
    target.appendChild(copy);
  }
  function makeChoiceForm(page,form,inputs,solved) {
    const fieldset = el('fieldset','answer-choice-group');
    const legend = el('legend','','誰に連絡する？ ひとつ選択してください');
    fieldset.appendChild(legend);
    const previous = (save.answerEntries[page.id]||[])[0];
    page.choices.forEach(ch => {
      const label = el('label','choice-item');
      const radio = el('input');
      radio.type='radio'; radio.name=`choice-${page.id}`; radio.value=ch.value;
      radio.checked=previous===ch.value; radio.disabled=solved;
      label.append(radio,el('span','choice-name',ch.label),el('span','choice-description',ch.description));
      fieldset.appendChild(label);
      inputs.push(radio);
    });
    form.appendChild(fieldset);
  }
  function renderPuzzle(page,target) {
    target.append(el('div','puzzle-instruction',page.prompt));
    if (page.quote) { const q=el('div','question-quote'); appendParagraphs(q,page.quote); target.appendChild(q); }
    target.appendChild(makeImage(page.image,page.title));
    if (page.note) target.appendChild(el('div','asset-note',page.note));
    const solved = save.completedPuzzleIds.includes(page.id);
    const form = el('form','answer-form'); form.noValidate=true;
    const inputs=[];
    if (page.choices) makeChoiceForm(page,form,inputs,solved);
    else (page.fields||[]).forEach((field,i)=>{
      const block=el('div','answer-field'); const label=el('label','',field.label); const input=el('input');
      input.type='text'; input.autocomplete='off'; input.spellcheck=false;
      input.inputMode=field.mode==='digits'?'numeric':'text';
      input.placeholder=field.placeholder||'';
      input.id=`answer-${i}`; label.htmlFor=input.id; input.disabled=solved;
      input.value=(save.answerEntries[page.id]||[])[i]||'';
      block.append(label,input); form.appendChild(block); inputs.push(input);
    });
    const buttons=el('div','answer-actions');
    const submit=el('button','btn btn--red',solved?'正解済み ✓': '解答する →');
    submit.type='submit'; submit.disabled=solved;
    buttons.appendChild(submit);
    const feedback=el('p','answer-feedback'+(solved?' is-ok':''),solved?'正解！「次へ」から物語を進めてください。':'');
    feedback.setAttribute('role','status'); feedback.setAttribute('aria-live','polite');
    form.append(buttons,feedback);
    form.addEventListener('submit',ev=>{
      ev.preventDefault(); if (solved || save.completedPuzzleIds.includes(page.id)) return;
      const selected = page.choices ? inputs.find(x=>x.checked)?.value : null;
      const correct = page.choices ? selected===page.correctChoice : page.fields.every((field,i)=>goodAnswer(inputs[i].value,field));
      if (!correct) { feedback.textContent=page.wrongFeedback||'……違うみたい。もう一度、手掛かりを確認してみよう。'; feedback.classList.remove('is-ok'); return; }
      save.completedPuzzleIds.push(page.id);
      save.answerEntries[page.id]=page.choices?[selected]:inputs.map(x=>x.value);
      persist(); inputs.forEach(x=>x.disabled=true);
      submit.textContent='正解済み ✓'; submit.disabled=true;
      feedback.textContent='正解！「次へ」から物語を進めてください。'; feedback.classList.add('is-ok');
      nextBtn.disabled=false; nextBtn.textContent='正解！ 次へ →';
    });
    target.appendChild(form);
    if (page.hints?.length) {
      const hints=el('div','hints');
      page.hints.forEach((hint,i)=>{
        const details=el('details');
        details.append(el('summary','',page.hints.length===1?'ヒント':`ヒント${i+1}`),el('p','',hint));
        hints.appendChild(details);
      });
      target.appendChild(hints);
    }
  }
  function renderClear(target) {
    const wrap=el('div','clear-view');
    wrap.append(el('div','clear-burst','★'));
    wrap.append(el('h2','',`${courseId.toUpperCase()} CLEAR!`));
    wrap.append(el('p','clear-view__lead',courseId==='easy'?'ミッションクリア！ エコーのバッジを取り戻し、ショーを無事に開催できました。':'ミッションクリア！ 壊れた通信ログを読み解き、最新のSOSをエコーへ届けました。'));
    wrap.append(el('p','','最後のミッションで使う合言葉をひとつ贈ります。'));
    const keyword=el('div','keyword-box');
    keyword.append(el('div','keyword-box__caption',`EXTRA解禁用の合言葉${courseId==='easy'?'A':'B'}`));
    keyword.append(el('div','keyword-box__word',course().extraKeyword));
    keyword.append(el('div','keyword-box__caution','※ 現在は仮の合言葉です。正式なEXTRA実装時に変更する予定です。'));
    wrap.append(keyword,el('p','','EASY・NORMAL・HARDとあわせて3つの合言葉を集めると、EXTRAへ挑戦できます。'));
    const actions=el('div','clear-view__actions');
    const home=el('button','btn btn--red','ミッション一覧へ →');home.type='button';home.addEventListener('click',navigateHome);
    actions.append(home);wrap.appendChild(actions);target.appendChild(wrap);
  }
  function renderPage() {
    const page=pages()[currentIndex];
    get('courseBadge').textContent=`${courseId.toUpperCase()} / 15 MIN`;
    get('courseMini').textContent=`HERO MISSION ${courseId==='easy'?'01':'02'}`;
    get('playTitle').textContent=course().title;
    get('logBtn').hidden=courseId!=='normal';
    get('stepLabel').textContent=`${page.label} / ${currentIndex+1}・全${pages().length}ページ`;
    const percent=Math.round(((currentIndex+1)/pages().length)*100);
    get('stepPercent').textContent=`${percent}%`;
    get('progressBar').style.width=`${percent}%`;
    pagePanel.replaceChildren();
    pagePanel.append(el('span','page-overline',page.type==='puzzle'?'PUZZLE! / 謎を解こう':page.type==='clear'?'MISSION COMPLETE':'STORY / 物語'));
    pagePanel.append(el('h2','page-title',page.title));
    if (page.type==='story') renderStory(page,pagePanel);
    if (page.type==='puzzle') renderPuzzle(page,pagePanel);
    if (page.type==='clear') renderClear(pagePanel);
    prevBtn.disabled=currentIndex===0;
    const allowed=page.type!=='puzzle'||save.completedPuzzleIds.includes(page.id);
    nextBtn.disabled=!allowed||currentIndex===pages().length-1;
    nextBtn.textContent=currentIndex===pages().length-1?'クリア済み ✓':allowed?'次へ →':'正解すると進めます';
  }
  get('startBtn').addEventListener('click',()=>enterCourse('easy',true));
  get('resumeBtn').addEventListener('click',()=>enterCourse('easy',false));
  get('normalStartBtn').addEventListener('click',()=>enterCourse('normal',true));
  get('normalResumeBtn').addEventListener('click',()=>enterCourse('normal',false));
  get('homeBtn').addEventListener('click',navigateHome);
  get('logBtn').addEventListener('click',()=>openImage('assets/normal/n-last.png','緊急通信ログ'));
  prevBtn.addEventListener('click',()=>navigatePage(currentIndex-1));
  nextBtn.addEventListener('click',()=>{ if (!nextBtn.disabled&&currentIndex<pages().length-1) navigatePage(currentIndex+1); });
  get('resetBtn').addEventListener('click',()=>{
    if (!window.confirm('この端末のEASY・NORMAL両方のテスト進捗を消去しますか？')) return;
    Object.values(STORAGE_KEYS).forEach(key=>{ try { localStorage.removeItem(key); } catch {} });
    save=defaultSave(courseId); navigateHome();
  });
  get('closeImageBtn').addEventListener('click',()=>imageDialog.close());
  imageDialog.addEventListener('click',e=>{ if(e.target===imageDialog) imageDialog.close(); });
  navigateHome();
})();
