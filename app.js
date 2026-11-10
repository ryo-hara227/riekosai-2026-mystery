(() => {
  'use strict';
  const COURSES = { easy: window.HERO_EASY, normal: window.HERO_NORMAL, hard: window.HERO_HARD };
  if (Object.values(COURSES).some(c => !c || !Array.isArray(c.pages))) {
    document.body.textContent = '問題データを読み込めませんでした。data/easy.js・data/normal.js・data/hard.js を確認してください。';
    return;
  }
  // EASYの保存キーは旧試作と共通のまま維持しています。
  const STORAGE_KEYS = { easy: 'hero_easy_progress_v1', normal: 'hero_normal_progress_v1', hard: 'hero_hard_progress_v1' };
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
    const count = COURSES[id].pages.filter(p=>['puzzle','map','hardcode'].includes(p.type)).length;
    const done = record.completedPuzzleIds.filter(pid => COURSES[id].pages.some(p=>p.id===pid && ['puzzle','map','hardcode'].includes(p.type))).length;
    get(progressId).textContent = record.cleared ? '★ CLEAR!' : record.started ? `進捗：謎 ${done} / ${count} 問クリア` : '未挑戦';
    get(resumeId).hidden = !record.started;
    get(resumeId).textContent = record.cleared ? 'クリア画面を開く →' : '続きから再開 →';
  }
  function renderHome() {
    renderHomeCourse('easy','homeProgress','resumeBtn');
    renderHomeCourse('normal','normalHomeProgress','normalResumeBtn');
    renderHomeCourse('hard','hardHomeProgress','hardResumeBtn');
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
    const legend = el('legend','',page.choiceLegend || '誰に連絡する？ ひとつ選択してください');
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
    if (page.image) target.appendChild(makeImage(page.image,page.title));
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
  // HARD専用：マップは一枚絵で、途中の小謎を個別採点しません。
  // 解いた結果の「目的地」を最後に一度だけ選びます。
  function renderHardMap(page,target) {
    target.append(el('p','puzzle-instruction',page.prompt));
    const controls = el('div','hard-map-controls');
    const small = el('button','btn btn--outline','－ 縮小'); small.type='button';
    const large = el('button','btn btn--outline','＋ 拡大'); large.type='button';
    const reset = el('button','btn btn--subtle','標準倍率'); reset.type='button';
    controls.append(small,large,reset);
    target.appendChild(controls);
    const viewport=el('div','hard-map-viewport');
    viewport.tabIndex=0;viewport.setAttribute('aria-label','H-01 探索マップ。上下左右にスクロールして各問題を確認してください');
    const img=el('img','hard-map-img');img.src='./'+page.image;img.alt='H1-01〜H1-08の全問題をつないだ探索マップ';img.loading='eager';
    viewport.appendChild(img);target.appendChild(viewport);
    let pixels=1420;
    function setMapWidth(px,center=false) {
      const oldW=viewport.scrollWidth||1, oldH=viewport.scrollHeight||1;
      const midX=(viewport.scrollLeft+viewport.clientWidth/2)/oldW;
      const midY=(viewport.scrollTop+viewport.clientHeight/2)/oldH;
      pixels=Math.min(3100,Math.max(750,px));img.style.width=pixels+'px';
      requestAnimationFrame(()=>{
        if (center) {viewport.scrollLeft=Math.max(0,(viewport.scrollWidth-viewport.clientWidth)/2);viewport.scrollTop=0;}
        else {viewport.scrollLeft=midX*viewport.scrollWidth-viewport.clientWidth/2;viewport.scrollTop=midY*viewport.scrollHeight-viewport.clientHeight/2;}
      });
    }
    img.addEventListener('load',()=>setMapWidth(pixels,true),{once:true});
    small.addEventListener('click',()=>setMapWidth(Math.round(pixels/1.28)));
    large.addEventListener('click',()=>setMapWidth(Math.round(pixels*1.28)));
    reset.addEventListener('click',()=>setMapWidth(1420,true));
    target.append(el('p','asset-note','左右・上下にスクロールして読めます。拡大ボタンは画像の中心付近を維持します。解いた経路は端末内に記録しません。'));
    const form=el('form','answer-form');form.noValidate=true;
    const fieldset=el('fieldset','answer-choice-group');
    fieldset.append(el('legend','','最後に着いた建物を選んでください'));
    const opts=[['gym','体育館'],['old','旧校舎'],['lab','研究棟'],['storage','資材倉庫'],['hall','放送室'],['library','図書室'],['dining','食堂'],['admin','管理棟'],['greenhouse','温室']];
    const selectedPreviously=(save.answerEntries[page.id]||[])[0];
    const solved=save.completedPuzzleIds.includes(page.id);
    const inputs=[];
    for (const [key,labelText] of opts) {
      const label=el('label','choice-item');const radio=el('input');radio.type='radio';radio.name='hard-place-'+page.id;radio.value=key;
      radio.checked=key===selectedPreviously;radio.disabled=solved;
      label.append(radio,el('span','choice-name',labelText));fieldset.append(label);inputs.push(radio);
    }
    form.appendChild(fieldset);
    const submit=el('button','btn btn--red',solved?'報告済み ✓':'この場所を報告する →');submit.type='submit';submit.disabled=solved;
    const feedback=el('p','answer-feedback',solved?'場所を報告しました。次へ進んでください。':'');feedback.setAttribute('role','status');
    form.append(submit,feedback);
    form.addEventListener('submit',ev=>{
      ev.preventDefault(); if(save.completedPuzzleIds.includes(page.id))return;
      const choice=inputs.find(i=>i.checked)?.value;
      if(!choice){feedback.textContent='場所をひとつ選択してください。';return;}
      if((page.stage==='second' && choice!=='old') || (page.stage==='first' && choice!=='gym' && choice!=='old')){
        feedback.textContent='この場所では子どもたちを確認できませんでした。マップの分岐をもう一度確かめてください。';return;
      }
      save.completedPuzzleIds.push(page.id);save.answerEntries[page.id]=[choice];persist();
      navigatePage(currentIndex+1);
    });
    target.appendChild(form);
    renderHints(page,target);
  }
  function renderHints(page,target){
    if(!page.hints?.length)return;
    const hints=el('div','hints');
    page.hints.forEach((hint,i)=>{const details=el('details');details.append(el('summary','',page.hints.length===1?'ヒント':`ヒント${i+1}`),el('p','',hint));hints.append(details);});
    target.append(hints);
  }
  function renderHardCode(page,target) {
    target.append(el('div','puzzle-instruction',page.prompt));
    target.append(makeImage(page.image,'解錠コードの問題'));
    const form=el('form','answer-form');form.noValidate=true;
    const field=el('div','answer-field'); const label=el('label','','解錠コード（数字4桁）'); const input=el('input');
    input.id='hard-code-entry';input.type='text';input.inputMode='numeric';input.maxLength=8;input.autocomplete='off';input.placeholder='4桁の数字を入力';input.value=(save.answerEntries[page.id]||[])[0]||'';
    label.htmlFor=input.id;input.disabled=save.completedPuzzleIds.includes(page.id);
    field.append(label,input); form.append(field);
    const done=save.completedPuzzleIds.includes(page.id);
    const send=el('button','btn btn--red',done?'送信済み ✓':'救助班へコードを送る →');send.type='submit';send.disabled=done;
    const feedback=el('p','answer-feedback',done?'コードを送信済みです。次へ進んでください。':'');feedback.setAttribute('role','status');
    form.append(send,feedback);target.append(form);
    form.addEventListener('submit',ev=>{
      ev.preventDefault();if(save.completedPuzzleIds.includes(page.id))return;
      const val=String(input.value).normalize('NFKC').replace(/[^0-9]/g,'');
      if(page.stage==='first' ? !['1108','1129'].includes(val) : val!=='1129'){
        feedback.textContent=page.stage==='first'?'カレンダーを確認し、赤が示す4桁を入力しましょう。':'そのコードでは開きません。色の対応を補正して考えましょう。';return;
      }
      save.completedPuzzleIds.push(page.id);save.answerEntries[page.id]=[val];persist();
      navigatePage(nextHardIndex(page));
    });
    renderHints(page,target);
  }
  function nextHardIndex(page) {
    if(page.id==='h-code-first') {
      const loc=(save.answerEntries['h-map-first']||[])[0];
      const pass=(save.answerEntries['h-code-first']||[])[0];
      return indexForId(loc==='old'&&pass==='1129'?'h-rescue':'h-failure');
    }
    return Math.min(currentIndex+1,pages().length-1);
  }
  function renderClear(target) {
    const wrap=el('div','clear-view');
    wrap.append(el('div','clear-burst','★'));
    wrap.append(el('h2','',`${courseId.toUpperCase()} CLEAR!`));
    const leads={easy:'ミッションクリア！ エコーのバッジを取り戻し、ショーを無事に開催できました。',normal:'ミッションクリア！ 壊れた通信ログを読み解き、最新のSOSをエコーへ届けました。',hard:'ミッションクリア！ 情報の色の異常に気づき、子どもたちの救助につなげました。'};
    wrap.append(el('p','clear-view__lead',leads[courseId]));
    const award=el('div','award-placeholder');
    award.append(el('div','award-placeholder__title','MISSION AWARD / 達成の証'));
    const picture=el('img');picture.src=`./assets/rewards/${courseId}-badge.png`;picture.alt=`${courseId.toUpperCase()} クリアバッジ`;picture.hidden=true;
    picture.addEventListener('load',()=>{picture.hidden=false;fallback.hidden=true;});
    picture.addEventListener('error',()=>{picture.hidden=true;fallback.hidden=false;});
    const fallback=el('div','award-placeholder__fallback',`${courseId.toUpperCase()} BADGE
デザイン画像を差し替え予定`);
    award.append(picture,fallback);wrap.append(award);
    wrap.append(el('p','','最後のミッションで使う合言葉をひとつ贈ります。'));
    const keyword=el('div','keyword-box');
    keyword.append(el('div','keyword-box__caption',`EXTRA解禁用の合言葉${({easy:'A',normal:'B',hard:'C'})[courseId]}`));
    keyword.append(el('div','keyword-box__word',course().extraKeyword));
    keyword.append(el('div','keyword-box__caution','※ 現在は仮の合言葉です。正式なEXTRA実装時に変更する予定です。'));
    wrap.append(keyword,el('p','','EASY・NORMAL・HARDの3つの合言葉を集めると、EXTRAへ挑戦できます。'));
    const actions=el('div','clear-view__actions');
    const home=el('button','btn btn--red','ミッション一覧へ →');home.type='button';home.addEventListener('click',navigateHome);
    actions.append(home);wrap.appendChild(actions);target.appendChild(wrap);
  }
  function renderPage() {
    const page=pages()[currentIndex];
    get('courseBadge').textContent=`${courseId.toUpperCase()} / 15 MIN`;
    get('courseMini').textContent=`HERO MISSION ${({easy:'01',normal:'02',hard:'03'})[courseId]}`;
    get('playTitle').textContent=course().title;
    get('logBtn').hidden=courseId!=='normal';
    get('stepLabel').textContent=`${page.label} / ${currentIndex+1}・全${pages().length}ページ`;
    const percent=Math.round(((currentIndex+1)/pages().length)*100);
    get('stepPercent').textContent=`${percent}%`;
    get('progressBar').style.width=`${percent}%`;
    pagePanel.replaceChildren();
    pagePanel.append(el('span','page-overline',['puzzle','map','hardcode'].includes(page.type)?'PUZZLE! / 謎を解こう':page.type==='clear'?'MISSION COMPLETE':'STORY / 物語'));
    pagePanel.append(el('h2','page-title',page.title));
    if (page.type==='story') renderStory(page,pagePanel);
    if (page.type==='puzzle') renderPuzzle(page,pagePanel);
    if (page.type==='map') renderHardMap(page,pagePanel);
    if (page.type==='hardcode') renderHardCode(page,pagePanel);
    if (page.type==='clear') renderClear(pagePanel);
    prevBtn.disabled=currentIndex===0;
    const allowed=!['puzzle','map','hardcode'].includes(page.type)||save.completedPuzzleIds.includes(page.id);
    nextBtn.disabled=!allowed||currentIndex===pages().length-1;
    nextBtn.textContent=currentIndex===pages().length-1?'クリア済み ✓':allowed?'次へ →':'正解すると進めます';
  }
  get('startBtn').addEventListener('click',()=>enterCourse('easy',true));
  get('resumeBtn').addEventListener('click',()=>enterCourse('easy',false));
  get('normalStartBtn').addEventListener('click',()=>enterCourse('normal',true));
  get('normalResumeBtn').addEventListener('click',()=>enterCourse('normal',false));
  get('hardStartBtn').addEventListener('click',()=>enterCourse('hard',true));
  get('hardResumeBtn').addEventListener('click',()=>enterCourse('hard',false));
  get('homeBtn').addEventListener('click',navigateHome);
  get('logBtn').addEventListener('click',()=>openImage('assets/normal/n-last.png','緊急通信ログ'));
  prevBtn.addEventListener('click',()=>{ if(courseId==='hard'&&pages()[currentIndex].id==='h-rescue'&&(save.answerEntries['h-map-first']||[])[0]==='old'&&(save.answerEntries['h-code-first']||[])[0]==='1129') navigatePage(indexForId('h-code-first')); else navigatePage(currentIndex-1); });
  nextBtn.addEventListener('click',()=>{ if (!nextBtn.disabled&&currentIndex<pages().length-1) navigatePage(courseId==='hard'?nextHardIndex(pages()[currentIndex]):currentIndex+1); });
  get('resetBtn').addEventListener('click',()=>{
    if (!window.confirm('この端末のEASY・NORMAL・HARDすべてのテスト進捗を消去しますか？')) return;
    Object.values(STORAGE_KEYS).forEach(key=>{ try { localStorage.removeItem(key); } catch {} });
    save=defaultSave(courseId); navigateHome();
  });
  // HERO LINKの共通UI試作。隊員チャット用のバックエンドは未接続です。
  const linkDialog=get('heroLinkDialog');
  function showHeroLink(){
    const contents=get('heroLinkContents');contents.replaceChildren();
    const active=playScreen.hidden?null:COURSES[courseId];
    const mission=el('section','hero-link-section');
    mission.append(el('h3','','受信した指令'));
    mission.append(el('p','',active?`${courseId.toUpperCase()}：${active.title}`:'ミッションを選択すると、ここに指令が届きます。'));
    if(active) mission.append(el('p','','現在の任務：'+(pages()[currentIndex].label||'')));
    contents.append(mission);
    const help=el('section','hero-link-section');
    help.append(el('h3','','隊員通信'));
    help.append(el('p','','この試作版では他の隊員との通信はまだ接続されていません。既存の掲示板機能を統合する予定です。'));
    contents.append(help);
    const record=el('section','hero-link-section');record.append(el('h3','','活動記録'));
    ['easy','normal','hard'].forEach(id=>{const s=loadSave(id);record.append(el('p','',`${id.toUpperCase()}：${s.cleared?'CLEAR':s.started?'挑戦中':'未挑戦'}`));});
    contents.append(record);
    if(typeof linkDialog.showModal==='function')linkDialog.showModal();
  }
  get('heroLinkBtn').addEventListener('click',showHeroLink);
  get('heroLinkClose').addEventListener('click',()=>linkDialog.close());
  linkDialog.addEventListener('click',ev=>{if(ev.target===linkDialog)linkDialog.close();});
  get('closeImageBtn').addEventListener('click',()=>imageDialog.close());
  imageDialog.addEventListener('click',e=>{ if(e.target===imageDialog) imageDialog.close(); });
  navigateHome();
})();
