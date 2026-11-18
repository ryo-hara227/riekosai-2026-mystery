(() => {
  'use strict';
  const COURSES = { prologue:window.HERO_PROLOGUE, easy: window.HERO_EASY, normal: window.HERO_NORMAL, hard: window.HERO_HARD, extra: window.HERO_EXTRA };
  if (Object.values(COURSES).some(c => !c || !Array.isArray(c.pages))) {
    document.body.textContent = '問題データを読み込めませんでした。dataフォルダとスクリプトを確認してください。';
    return;
  }
  // EASYの保存キーは旧試作と共通のまま維持しています。
  const STORAGE_KEYS = { prologue:'hero_prologue_progress_v1', easy: 'hero_easy_progress_v1', normal: 'hero_normal_progress_v1', hard: 'hero_hard_progress_v1', extra:'hero_extra_progress_v1' };
  const gated = p => ['puzzle','flow','hardcode','extra','tutorial','contact'].includes(p.type);
  const memorySaves={};
  let pendingCourse=null;
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
  const defaultSave = id => ({ version:4,...(id==='normal'?{normalCodesVersion:2}:{}), started:false, currentPageId:COURSES[id].pages[0].id, completedPuzzleIds:[], answerEntries:{}, notifications:[],journal:[],cleared:false });
  function loadSave(id) {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS[id])||'null')||memorySaves[id];
      if (!raw || typeof raw !== 'object') return defaultSave(id);
      const record={ ...defaultSave(id), ...raw,
        completedPuzzleIds: Array.isArray(raw.completedPuzzleIds) ? raw.completedPuzzleIds : [],
        notifications:Array.isArray(raw.notifications)?raw.notifications:[],journal:Array.isArray(raw.journal)?raw.journal:[],
        answerEntries: raw.answerEntries && typeof raw.answerEntries === 'object' && !Array.isArray(raw.answerEntries) ? raw.answerEntries : {}
      };
      if(id==='easy')record.notifications=record.notifications.map(n=>n.id==='e-after-01'?{...n,title:HERO_STORY.notices['e-after-01'].message,body:HERO_STORY.notices['e-after-01'].body}:n);
      if(id==='normal'){
        record.journal=record.journal.map(a=>a.src==='assets/normal/n-last.png'?{...a,src:'assets/normal/n-log-revision02.svg'}:a.src==='assets/normal/n-02.png'?{...a,src:'assets/normal/n-02-revision02.png'}:a);
        if(raw.normalCodesVersion!==2&&Array.isArray(record.answerEntries['n-02'])){const old=record.answerEntries['n-02'];record.answerEntries['n-02']=[old[3]||'',old[1]||'',old[0]||'',old[2]||''];}
        record.normalCodesVersion=2;
      }
      if(id==='extra'&&raw.version!==4){record.completedPuzzleIds=record.completedPuzzleIds.filter(x=>!['x-last','x-last-reason'].includes(x));record.extra={...(record.extra||{}),patchApplied:false,location:null,dispatched:false,repairVersion:2};if(raw.cleared||['x-last','x-rescue','x-clear'].includes(raw.currentPageId)){record.currentPageId='x-confront';record.cleared=false;}record.updatedLast=true;}record.version=4;return record;
    } catch { return memorySaves[id]||defaultSave(id); }
  }
  save = loadSave('easy');
  function persist() { memorySaves[courseId]=save;try { localStorage.setItem(STORAGE_KEYS[courseId], JSON.stringify(save)); } catch {} updateUnread(); }
  function updateUnread(){const count=Object.keys(COURSES).reduce((sum,id)=>sum+(id===courseId?save:loadSave(id)).notifications.filter(n=>!n.read).length,0);const badge=get('unreadBadge');badge.hidden=!count;badge.textContent=count;get('heroLinkBtn').setAttribute('aria-label','HERO LINKを開く'+(count?' 未読'+count+'件':''));}
  function indexForId(id) { const i = pages().findIndex(p => p.id === id); return i >= 0 ? i : 0; }
  function goTop() { try { window.scrollTo({ top:0, behavior:'instant' }); } catch {} }
  function navigateHome() {
    window.HERO_EXTRA_UI.cleanup();
    document.body.classList.remove('is-extra');
    playScreen.hidden = true;
    homeScreen.hidden = false;
    renderHome(); goTop();
  }
  function navigatePage(index) {
    currentIndex = Math.min(Math.max(index,0), pages().length-1);
    save.started = true;
    save.currentPageId = pages()[currentIndex].id;
    if (pages()[currentIndex].type === 'clear') save.cleared = true;
    const page=pages()[currentIndex];
    if(page.notification&&!save.notifications.some(n=>n.id===page.id))save.notifications.push({id:page.id,title:page.notification.message,body:page.notification.body||page.notification.message,read:false});
    if(page.image&&page.type!=='flow'&&!save.journal.some(a=>a.src===page.image))save.journal.push({src:page.image,title:page.imageLabel||page.title});
    if(page.id==='p-03'&&!save.notifications.some(n=>n.id==='p-welcome'))save.notifications.push({id:'p-welcome',title:'マネージャーより：ようこそ、響ヶ丘学園祭へ',body:'通知はこの一覧に残ります。連絡先を確認しました。',read:false});
    persist();
    homeScreen.hidden = true;
    playScreen.hidden = false;
    renderPage(); goTop();
  }
  function renderHomeCourse(id, progressId, resumeId) {
    const record = loadSave(id);
    const count = COURSES[id].pages.filter(gated).length;
    const done = record.completedPuzzleIds.filter(pid => COURSES[id].pages.some(p=>p.id===pid && gated(p))).length;
    get(progressId).textContent = record.cleared ? '★ CLEAR!' : record.started ? `進捗：謎 ${done} / ${count} 問クリア` : '未挑戦';
    get(resumeId).hidden = !record.started;
    get(resumeId).textContent = record.cleared ? 'クリア画面を開く →' : '続きから再開 →';
  }
  function renderHome() {
    renderHomeCourse('easy','homeProgress','resumeBtn');
    renderHomeCourse('normal','normalHomeProgress','normalResumeBtn');
    renderHomeCourse('hard','hardHomeProgress','hardResumeBtn');
    renderHomeCourse('extra','extraHomeProgress','extraResumeBtn');
    get('prologueHomeProgress').textContent=loadSave('prologue').cleared?'プロローグ読了 ✓':'はじめての方は、ここから';updateUnread();
  }
  function enterCourse(id, restart) {
    if(id!=='prologue'&&!loadSave('prologue').cleared){pendingCourse={id,restart};enterCourse('prologue',false);return;}
    const record=loadSave(id);
    if(restart&&record.started&&!window.confirm(`${id.toUpperCase()}を最初から遊び直しますか？ このコースの解答済み記録もリセットされます。`))return;
    courseId = id;
    save = record;
    if (restart) {
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
    img.src = `./${src}?v=5-rev02`;
    img.alt = `${label}の画像`;
    img.loading = 'eager';
    img.addEventListener('error',()=>{ frame.textContent = `画像が見つかりません：${src}`; });
    frame.appendChild(img); frag.appendChild(frame);
    if(src.endsWith('.svg')){frame.classList.add('vector-scroll');img.style.width='1200px';img.style.maxWidth='none';const fit=el('button','btn btn--outline','地図を全体表示／原寸表示');fit.type='button';fit.addEventListener('click',()=>{const full=img.style.width==='100%';img.style.width=full?'1200px':'100%';});frag.append(fit,el('p','asset-note','地図は左右・上下に動かせます。原寸表示では文字を大きく読めます。'));}
    const zoom = el('button','image-zoom-btn','⤢ 画像を拡大して見る');
    zoom.type = 'button';
    zoom.addEventListener('click',()=>openImage(src,label));
    frag.appendChild(zoom); return frag;
  }
  function openImage(src,label) {
    get('enlargedImage').src = `./${src}?v=5-rev02`;
    get('enlargedImage').alt = `${label}・拡大表示`;
    if (typeof imageDialog.showModal === 'function') imageDialog.showModal();
    else window.open(`./${src}`,'_blank','noopener');
  }
  function renderStory(page,target) {
    const copy = el('div','story-copy');
    appendParagraphs(copy,page.paragraphs);
    if (page.image) copy.appendChild(makeImage(page.image,page.imageLabel||page.title));
    if (page.note) copy.append(el('p','asset-note',page.note));
    if (page.notification) copy.append(window.HERO_UI.button(extraContext(),'HERO LINKの通知を確認する',()=>showHeroLink('notifications')));
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
    inputs.forEach(input=>input.addEventListener('input',()=>{if(solved)return;save.answerEntries[page.id]=page.choices?[inputs.find(x=>x.checked)?.value||'']:inputs.map(x=>x.value);persist();}));
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
  // HARD：小問を2択で切り替え、到着した目的地を最後に報告します。
  function renderHardMap(page,target) { window.HERO_UI.flow(page,target,extraContext()); }
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
    const leads={easy:'ミッションクリア！ エコーのバッジを取り戻し、ショーを無事に開催できました。',normal:'ミッションクリア！ 壊れた通信ログを読み解き、最新のSOSをエコーへ届けました。',hard:'ミッションクリア！ 情報の色の異常に気づき、子どもたちの救助につなげました。',extra:'ミッションクリア！ 届かなかった声を受け取り、ヒーローたちの救出につなげました。'};
    wrap.append(el('p','clear-view__lead',leads[courseId]));
    const award=el('div','award-placeholder');
    award.append(el('div','award-placeholder__title','MISSION AWARD / 達成の証'));
    const picture=el('img');picture.src=`./assets/rewards/${courseId}-badge.png`;picture.alt=`${courseId.toUpperCase()} クリアバッジ`;picture.hidden=true;
    picture.addEventListener('load',()=>{picture.hidden=false;fallback.hidden=true;});
    picture.addEventListener('error',()=>{picture.hidden=true;fallback.hidden=false;});
    const fallback=el('div','award-placeholder__fallback',`${courseId.toUpperCase()} BADGE
デザイン画像を差し替え予定`);
    award.append(picture,fallback);wrap.append(award);
    if(courseId!=='extra') {const all=['easy','normal','hard'].every(id=>id===courseId?save.cleared:loadSave(id).cleared);wrap.append(el('p','',all?'3つのミッションをクリアしました。EXTRAが解放されました！':'EASY・NORMAL・HARDをすべてクリアすると、EXTRAが解放されます。'));}
    else wrap.append(el('p','prototype-note','調整中の謎は、ページ内で仮実装と示しています。物語は現実への帰還まで収録しています。'));
    const actions=el('div','clear-view__actions');
    const home=el('button','btn btn--red','ミッション一覧へ →');home.type='button';home.addEventListener('click',navigateHome);
    actions.append(home);wrap.appendChild(actions);target.appendChild(wrap);
  }
  function renderPage() {
    window.HERO_EXTRA_UI.cleanup();
    const page=pages()[currentIndex];
    document.body.classList.toggle('is-extra',courseId==='extra');
    get('courseBadge').textContent=courseId==='prologue'?'PROLOGUE / TUTORIAL':courseId==='extra'?'EXTRA / PROTOTYPE':`${courseId.toUpperCase()} / 15 MIN`;
    get('courseMini').textContent=`HERO MISSION ${({prologue:'00',easy:'01',normal:'02',hard:'03',extra:'04 / AFTER DARK'})[courseId]}`;
    get('playTitle').textContent=course().title;
    get('logBtn').hidden=courseId!=='normal';
    get('stepLabel').textContent=`${page.label} / ${currentIndex+1}・全${pages().length}ページ`;
    const percent=Math.round(((currentIndex+1)/pages().length)*100);
    get('stepPercent').textContent=`${percent}%`;
    get('progressBar').style.width=`${percent}%`;
    pagePanel.replaceChildren();
    pagePanel.append(el('span','page-overline',gated(page)?'PUZZLE! / 謎を解こう':page.type==='clear'?'MISSION COMPLETE':'STORY / 物語'));
    pagePanel.append(el('h2','page-title',page.title));
    if(page.prototype) pagePanel.append(el('p','prototype-note','仮実装：'+page.prototype));
    if (page.type==='story') renderStory(page,pagePanel);
    if (page.type==='puzzle') {if(page.id==='n-last')window.HERO_UI.normalMission(page,pagePanel,extraContext());else renderPuzzle(page,pagePanel);}
    if (page.type==='flow') renderHardMap(page,pagePanel);
    if (page.type==='hardcode') renderHardCode(page,pagePanel);
    if (page.type==='clear') renderClear(pagePanel);
    if (page.type==='extra') window.HERO_EXTRA_UI.render(page,pagePanel,extraContext());
    if(page.type==='tutorial')window.HERO_UI.tutorial(page,pagePanel,extraContext());
    if(page.type==='contact')window.HERO_UI.contact(page,pagePanel,extraContext());
    if(page.type==='introDone')window.HERO_UI.introDone(pagePanel,extraContext());
    prevBtn.disabled=currentIndex===0;
    const allowed=!gated(page)||save.completedPuzzleIds.includes(page.id);
    nextBtn.disabled=!allowed||currentIndex===pages().length-1;
    nextBtn.textContent=currentIndex===pages().length-1?'クリア済み ✓':allowed?'次へ →':'正解すると進めます';
  }
  get('startBtn').addEventListener('click',()=>enterCourse('easy',true));
  get('resumeBtn').addEventListener('click',()=>enterCourse('easy',false));
  get('normalStartBtn').addEventListener('click',()=>enterCourse('normal',true));
  get('normalResumeBtn').addEventListener('click',()=>enterCourse('normal',false));
  get('hardStartBtn').addEventListener('click',()=>enterCourse('hard',true));
  get('hardResumeBtn').addEventListener('click',()=>enterCourse('hard',false));
  get('extraStartBtn').addEventListener('click',()=>enterCourse('extra',true));
  get('extraResumeBtn').addEventListener('click',()=>enterCourse('extra',false));
  get('prologueStartBtn').addEventListener('click',()=>enterCourse('prologue',false));
  get('homeBtn').addEventListener('click',navigateHome);
  get('logBtn').addEventListener('click',()=>openImage('assets/normal/n-log-revision02.svg','緊急通信ログ'));
  prevBtn.addEventListener('click',()=>{ if(courseId==='hard'&&pages()[currentIndex].id==='h-rescue'&&(save.answerEntries['h-map-first']||[])[0]==='old'&&(save.answerEntries['h-code-first']||[])[0]==='1129') navigatePage(indexForId('h-code-first')); else navigatePage(currentIndex-1); });
  nextBtn.addEventListener('click',()=>{ if (!nextBtn.disabled&&currentIndex<pages().length-1) navigatePage(courseId==='hard'?nextHardIndex(pages()[currentIndex]):currentIndex+1); });
  get('resetBtn').addEventListener('click',()=>{
    if (!window.confirm('この端末のEASY・NORMAL・HARD・EXTRAすべてのテスト進捗を消去しますか？')) return;
    Object.values(STORAGE_KEYS).forEach(key=>{ try { localStorage.removeItem(key); } catch {} });Object.keys(memorySaves).forEach(k=>delete memorySaves[k]);
    save=defaultSave(courseId); navigateHome();
  });
  // 作中人物との連絡と、実際の参加者向け掲示板を共通の入口にまとめます。
  const linkDialog=get('heroLinkDialog');
  function extraContext() {
    return {el,save,persist,makeImage,normalizeText,goodAnswer,loadSave,courseId,courses:COURSES,page:pages()[currentIndex],index:currentIndex,renderPuzzle,renderHints,
      complete(id,entries=[]) {
        if(!save.completedPuzzleIds.includes(id)) save.completedPuzzleIds.push(id);
        save.answerEntries[id]=entries;persist();
        if(pages()[currentIndex].id===id) { nextBtn.disabled=false;nextBtn.textContent='完了！ 次へ →'; }
      },
      openLink:showHeroLink,closeLink:()=>linkDialog.close(),openImage,navigatePage,navigateHome,
      finishIntro(){save.cleared=true;persist();const next=pendingCourse;pendingCourse=null;if(next)enterCourse(next.id,next.restart);else navigateHome();},
      writeSave(id,record){memorySaves[id]=record;try{localStorage.setItem(STORAGE_KEYS[id],JSON.stringify(record));}catch{}if(id===courseId)save=record;updateUnread();},
      refresh:renderPage
    };
  }
  function showHeroLink(tab) {
    const contents=get('heroLinkContents');contents.replaceChildren();
    window.HERO_UI.link(contents,extraContext(),playScreen.hidden?null:pages()[currentIndex],typeof tab==='string'?tab:null);
    linkDialog.classList.add('hero-link-dialog--v4');if(!linkDialog.open)linkDialog.showModal();
  }
  get('heroLinkBtn').addEventListener('click',showHeroLink);
  get('heroLinkClose').addEventListener('click',()=>linkDialog.close());
  linkDialog.addEventListener('click',ev=>{if(ev.target===linkDialog)linkDialog.close();});
  get('closeImageBtn').addEventListener('click',()=>imageDialog.close());
  imageDialog.addEventListener('click',e=>{ if(e.target===imageDialog) imageDialog.close(); });
  window.HERO_UI.bind(extraContext);
  navigateHome();
})();
