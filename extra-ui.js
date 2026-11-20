/* EXTRA画面処理。通信・生体情報・測位・救援送信は物語内のシミュレーション。 */
(() => {
  'use strict';
  const D = window.HERO_EXTRA.config;
  let timers = [], serial = 0;
  function cleanup(){ timers.forEach(clearInterval);timers=[]; }
  function state(c){return c.save.extra||(c.save.extra={drafts:{}});}
  function draft(c,key){const s=state(c);s.drafts||={};return s.drafts[key]||(s.drafts[key]={});}
  function button(c,label,action,cls='btn btn--night'){
    const b=c.el('button',cls,label);b.type='button';b.addEventListener('click',action);return b;
  }
  function feedback(c,text=''){const p=c.el('p','answer-feedback',text);p.setAttribute('role','status');return p;}
  function good(c,value,answers){return c.goodAnswer(value,{answers});}
  function field(c,form,key,label,options){
    const box=c.el('div','answer-field');const lab=c.el('label','',label);
    const input=c.el(options?'select':'input');input.id='extra-field-'+(++serial);lab.htmlFor=input.id;
    if(options){input.append(new Option('選択してください',''));options.forEach(o=>input.append(new Option(o.label,o.value)));}
    else {input.type='text';input.autocomplete='off';input.spellcheck=false;}
    const v=draft(c,form.dataset.key);input.value=v[key]||'';
    input.addEventListener('input',()=>{v[key]=input.value;c.persist();});
    box.append(lab,input);return {box,input};
  }
  function formBase(c,target,key){const f=c.el('form','answer-form extra-form');f.dataset.key=key;f.noValidate=true;target.append(f);return f;}
  function submitButton(c,form,label){const b=c.el('button','btn btn--night',label);b.type='submit';form.append(b);return b;}
  function table(c,target,headers,rows,caption){
    const wrap=c.el('div','extra-table-scroll');wrap.tabIndex=0;wrap.setAttribute('aria-label',caption+'。横にスクロールできます');
    const t=c.el('table','extra-table');const cap=c.el('caption','skip-link',caption);t.append(cap);
    const thead=c.el('thead'),tr=c.el('tr');headers.forEach(x=>{const h=c.el('th','',x);h.scope='col';tr.append(h);});thead.append(tr);t.append(thead);
    const body=c.el('tbody');rows.forEach((row,i)=>{const r=c.el('tr');row.forEach(x=>r.append(c.el('td','',x)));body.append(r);});t.append(body);wrap.append(t);target.append(wrap);return body;
  }
  function tabs(c,target,items,storageKey){
    const s=state(c);const bar=c.el('div','extra-tabs');bar.setAttribute('role','group');bar.setAttribute('aria-label','調査資料の切り替え');
    const panel=c.el('section','extra-evidence');const buttons=[];
    items.forEach(item=>{const b=button(c,item.label,()=>open(item.id),'');buttons.push([item,b]);bar.append(b);});target.append(bar,panel);
    function open(id){const item=items.find(x=>x.id===id)||items[0];s[storageKey]=item.id;c.persist();buttons.forEach(([a,b])=>b.setAttribute('aria-pressed',String(a.id===item.id)));panel.replaceChildren();item.render(panel);}
    open(s[storageKey]);
  }
  function completed(c,page){return c.save.completedPuzzleIds.includes(page.id);}
  function lockForm(c,page,form,fb,label='確認済み ✓'){
    if(completed(c,page)){form.querySelectorAll('input,select,button').forEach(x=>x.disabled=true);fb.textContent=label;fb.classList.add('is-ok');}
  }
  function hints(c,target,entries){const box=c.el('div','hints');entries.forEach((text,i)=>{const d=c.el('details');d.append(c.el('summary','',`ヒント${i+1}`),c.el('p','',text));box.append(d);});target.append(box);}
  function first(page,target,c){
    page.paragraphs.slice(0,3).forEach(p=>target.append(c.el('p','',p)));
    const mail=c.el('section','extra-mail');const head=c.el('header');head.append(c.el('strong','','差出人：エコー → マネージャー'),c.el('span','','件名：もし、私と連絡が取れなくなったら'));
    mail.append(head,c.el('blockquote','','「変な指令が続いてる。もし私と連絡が取れなくなったら、添付の資料を調べて。調べた感じ、File番号と同じ数字が資料から消されてるみたい。今日、手伝ってくれたあの人なら、きっと気づいてくれると思う」'));target.append(mail);
    page.paragraphs.slice(3).forEach(p=>target.append(c.el('p','',p)));
    const assets=[{id:'A',files:['ex01_1.png']},{id:'B',files:['ex01_2-1.png','ex01_2-2.png']},{id:'C',files:['ex01_3-1.png','ex01_3-2.png']},{id:'D',files:['ex01_4.png']}];
    tabs(c,target,assets.map(a=>({id:a.id,label:'資料 '+a.id,render:panel=>{panel.append(c.el('h3','','添付資料 '+a.id));const stack=c.el('div','extra-image-stack');a.files.forEach((src,i)=>stack.append(c.makeImage('assets/extra/'+src,`資料${a.id} ${i+1}`)));panel.append(stack);}})),'firstTab');
    const entries=draft(c,page.id),previous=c.save.answerEntries[page.id]||[];
    assets.forEach((a,i)=>{const number=Number(D.cardOrder[i]);if(entries['answer'+a.id]===undefined)entries['answer'+a.id]=entries['hint'+number]||previous[3+number]||'';});c.persist();
    const f=formBase(c,target,page.id);f.append(c.el('h3','','1．各資料の答えを解く'),c.el('p','extra-footer-note','資料A〜Dを解き、その資料から得られた答えを入力してください。'));
    const answers=c.el('div','extra-answers');const words=assets.map(a=>{const x=field(c,f,'answer'+a.id,'資料'+a.id+'の答え');answers.append(x.box);return x.input;});f.append(answers);
    f.append(c.el('h3','','2．File番号を復元する'),c.el('p','extra-footer-note','各資料に対応するFile番号を選んでください。'));
    const grid=c.el('div','extra-restore-grid');const order=assets.map(a=>{const x=field(c,f,'order'+a.id,'資料'+a.id+'のFile番号',[1,2,3,4].map(n=>({value:String(n),label:'File-'+n})));grid.append(x.box);return x.input;});f.append(grid);submitButton(c,f,'4つのFileを復元する →');const fb=feedback(c);f.append(fb);
    f.addEventListener('submit',e=>{e.preventDefault();const mapping=order.every((x,i)=>x.value===D.cardOrder[i]);const valid=words.every((x,i)=>good(c,x.value,D.firstAnswers[Number(D.cardOrder[i])-1]));if(!mapping||!valid){fb.textContent='File番号と答えの組み合わせが一致しません。各資料で消えている数字と、過去の事件を見直しましょう。';return;}const fileAnswers=[1,2,3,4].map(n=>words[D.cardOrder.indexOf(String(n))].value);c.complete(page.id,[...order.map(x=>x.value),...fileAnswers]);lockForm(c,page,f,fb,'4つのFileを復元しました！ 次へ進めます。');});
    lockForm(c,page,f,fb);
    hints(c,target,[
      'どの数字が消えているかが、File番号の手掛かりです。欠けたFile番号と画像の掲載順は、同じとは限りません。',
      'まずは資料Bから見ていきましょう。3文字の言葉は①②③となるはずですが、立方体には②がありません。なので、この資料はFile2とわかります。',
      '資料Bの1枚目は50音表になっています。',
      '赤い枠は2枚目に描かれた立方体の展開図です。ヒント3と合わせて、「し」「ち」「つ」以外の文字が何か、その順番も解読してみましょう。',
      '次は資料Cを見ます。「た」が表すイラストはタニシです。',
      '「た」は向かって左側にあります。上には「あ」。File番号でまだ使っていないものを当てはめて考えると……。',
      '4を中央の大きい余白に書いてみます。すると、4そのものが方位を表す記号に見えます。西にある「た」がタニシでした。ということは上側、つまり北にある「あ」は？',
      '1枚目の答えは「あきた」です。これを使って2枚目の謎を解きましょう。色や数字にも注目してください。',
      '四角の中の数字は50音順でどれだけずらすかを示しているようです。ここでも4が抜けているので補いましょう。上2つの法則を参考にして、最後に出てくる言葉を答えればOKです。',
      '資料Dについて。子どもがさらわれたのはHARDのMissionでした。この事件は1つ前の事件なので、この資料がFile1になります。子どもたちが閉じ込められていたのはどこだったでしょうか？',
      'ここまでで、資料AはFile3であることが確定します。抜けている数字も3です。',
      '8つの丸は太陽系の惑星を表しているようです。2番目が「きん」、8番目が「かい」なので「きんかい」になっています。では、3番目と4番目を合わせると何になるでしょうか？'
    ]);
  }
  function firstDoor(page,target,c){
    const instruction=c.el('section','extra-file-instruction');instruction.append(c.el('h3','','First Mission'),c.el('p','','File-1の File-3の\nFile-2室の File-4扉を開けろ'));target.append(instruction);
    target.append(c.el('p','extra-lead','復元した4つの答えを、指示文へ当てはめよう。'));
    const f=formBase(c,target,page.id);const grid=c.el('div','extra-answers');
    const loc=field(c,f,'place','向かう場所');const color=field(c,f,'color','開ける扉の実物の色',[{value:'red',label:'赤い扉'},{value:'green',label:'緑の扉'},{value:'blue',label:'青い扉'},{value:'yellow',label:'黄色の扉'}]);grid.append(loc.box,color.box);f.append(grid);submitButton(c,f,'この場所の扉を開ける →');const fb=feedback(c);f.append(fb);
    f.addEventListener('submit',e=>{e.preventDefault();if(good(c,loc.input.value,['旧校舎地下機械室','旧校舎の地下の機械室','旧校舎地下の機械室'])&&color.input.value==='red'){c.complete(page.id,[loc.input.value,color.input.value]);lockForm(c,page,f,fb,'赤い扉が開いた。図面にない制御室へ進めます。');}else fb.textContent='File-1・3・2・4の順で指示を読み直してください。場所は建物名から、色は実物の色で答えます。';});lockForm(c,page,f,fb);
  }
  function maze(page,target,c){
    target.append(c.el('p','extra-lead','白い入口から出発。同じ色の扉を使い、壁を越えずに出口を探そう。'));
    target.append(c.el('p','extra-footer-note','「なぞる」で経路を描き、「地図を動かす」で表示する範囲を移動できます。↪の扉をタップすると、対の扉へマーカーが移動します。'));
    const s=state(c);s.maze||={lines:[],marker:[228,970]};const m=s.maze;const bar=c.el('div','extra-maze-toolbar');const scroll=c.el('div','extra-maze-scroll');scroll.tabIndex=0;scroll.setAttribute('aria-label','制御室の迷路。横スクロール可能');
    const stage=c.el('div','extra-maze-stage');const img=c.el('img');img.src='./assets/extra/control-maze.svg?v=6';img.alt='エコーが残したワープ付き制御室フロアマップ。色は映像エラーの影響を受けない。';stage.append(img);
    const ns='http://www.w3.org/2000/svg';const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 2000 1125');svg.classList.add('extra-maze-ink');svg.setAttribute('aria-label','経路メモ描画領域');stage.append(svg);
    const status=feedback(c,'現在地メモ：白い入口');status.classList.add('extra-footer-note');
    function paint(){svg.replaceChildren();m.lines.forEach(line=>{const p=document.createElementNS(ns,'path');p.setAttribute('d',line.map((v,i)=>(i?'L':'M')+v.join(',')).join(' '));svg.append(p);});const dot=document.createElementNS(ns,'circle');dot.setAttribute('cx',m.marker[0]);dot.setAttribute('cy',m.marker[1]);dot.setAttribute('r','14');svg.append(dot);}
    let active=null;
    const point=e=>{const b=svg.getBoundingClientRect();return [Math.round((e.clientX-b.left)*2000/b.width),Math.round((e.clientY-b.top)*1125/b.height)];};
    svg.addEventListener('pointerdown',e=>{if(e.button!==0||stage.classList.contains('is-panning'))return;svg.setPointerCapture?.(e.pointerId);active=[point(e)];m.lines.push(active);paint();});
    svg.addEventListener('pointermove',e=>{if(!active)return;if(active.length<1200){active.push(point(e));m.marker=active[active.length-1];paint();}});
    function finish(){if(!active)return;active=null;m.lines=m.lines.slice(-50);c.persist();}
    svg.addEventListener('pointerup',finish);svg.addEventListener('pointercancel',finish);
    const doors=[['white','白・左下',[228,970]],['red','赤・左上',[228,270]],['green-a','緑・左下',[400,970],[1600,970]],['green-b','緑・右下',[1600,970],[400,970]],['blue-a','青・中央',[1080,740],[1770,270]],['blue-b','青・右上',[1770,270],[1080,740]],['yellow-a','黄・中央',[1080,500],[1770,970]],['yellow-b','黄・右下',[1770,970],[1080,500]]];
    doors.forEach(([id,label,xy,to])=>{const b=button(c,label,()=>{m.marker=to||xy;status.textContent=to?label+' → 対の扉にワープしました。':'現在地メモ：'+label;c.persist();paint();},to?'extra-warp is-paired':'extra-warp');b.style.left=(xy[0]/20)+'%';b.style.top=(xy[1]/11.25)+'%';b.title=label+(to?'からワープ':'へマーカーを移動');b.setAttribute('aria-label',b.title);stage.append(b);});
    const drawMode=button(c,'なぞる',()=>changeMode(false),'btn btn--outline');
    const panMode=button(c,'地図を動かす',()=>changeMode(true),'btn btn--outline');
    function changeMode(panning){
      finish();
      stage.classList.toggle('is-panning',panning);
      drawMode.setAttribute('aria-pressed',String(!panning));
      panMode.setAttribute('aria-pressed',String(panning));
    }
    changeMode(false);
    const magnify=button(c,'拡大',()=>{
      const zoomed=stage.classList.toggle('is-zoomed');
      magnify.textContent=zoomed?'全体に戻す':'拡大';
      magnify.setAttribute('aria-pressed',String(zoomed));
      if(zoomed)changeMode(true);
      else scroll.scrollTo?.({left:0,top:0});
    },'btn btn--outline');
    magnify.setAttribute('aria-pressed','false');
    bar.append(drawMode,panMode,magnify,button(c,'ひとつ戻す',()=>{m.lines.pop();c.persist();paint();},'btn btn--outline'),button(c,'経路メモを消す',()=>{m.lines=[];m.marker=[228,970];c.persist();paint();},'btn btn--outline'));
    scroll.append(stage);target.append(bar,scroll,status);paint();
    const codebox=c.el('details','home-guidance');codebox.append(c.el('summary','','扉コード対応表'));
    table(c,codebox,['コード','作品名','扉の色'],D.doors.map(d=>[d.code,d.work,d.label]),'扉コード対応表');target.append(codebox);
    const f=formBase(c,target,page.id);
    f.append(c.el('p','extra-footer-note','出口までワープが最も少ない経路で、使う扉の色を順番に答えよう。'));
    const colors=[{value:'green',label:'緑'},{value:'blue',label:'青'},{value:'yellow',label:'黄'}];
    const firstWarp=field(c,f,'warp1','最初のワープ扉',colors);
    const secondWarp=field(c,f,'warp2','次のワープ扉',colors);
    const sel=field(c,f,'door','最後に入る扉のコード',D.doors.map(d=>({value:d.code,label:d.code+' / '+d.label})));
    f.append(firstWarp.box,secondWarp.box,sel.box);submitButton(c,f,'この扉を開ける →');const fb=feedback(c);f.append(fb);
    f.addEventListener('submit',e=>{
      e.preventDefault();
      if(firstWarp.input.value!=='blue'||secondWarp.input.value!=='yellow'||sel.input.value!==D.secondDoor){
        fb.textContent='白い入口から、壁に沿って出られる道をたどり直そう。ワープした先の扉から続きを探してみて。';return;
      }
      c.complete(page.id,[sel.input.value,firstWarp.input.value,secondWarp.input.value]);
      lockForm(c,page,f,fb,'扉の奥で、計画書と日記を発見しました。');
    });lockForm(c,page,f,fb);
  }
  function documents(page,target,c){
    HERO_STORY.ex.documentsIntro.forEach(t=>target.append(c.el('p','',t)));
    const grid=c.el('div','extra-paper-grid');const plan=c.el('article','extra-paper');plan.append(c.el('h3','','ヒーロー消滅計画'));const list=c.el('ul');D.plan.forEach(item=>{const li=c.el('li');li.append(c.el(item.done?'s':'span','',item.text));list.append(li);});plan.append(list);
    const diary=c.el('article','extra-paper');diary.append(c.el('h3','','日付のない日記'));D.diary.forEach(t=>diary.append(c.el('p','',t)));grid.append(plan,diary);target.append(grid);
    HERO_STORY.ex.documentsAfter.concat(HERO_STORY.ex.diaryAfter).forEach(t=>target.append(c.el('p','',t)));
    const rec=c.el('section','extra-transcript');rec.append(c.el('h3','','制御室・音声記録'),c.el('small','','REC-UNKNOWN / 一部破損 / 文字起こし'),c.el('p','',D.recording.join('\n')));target.append(rec,c.el('p','extra-footer-note','この記録は制御室の端末に残ったローカル録音です。HERO LINKで受信した音声ではありません。'));
    HERO_STORY.ex.recordAfter.forEach(t=>target.append(c.el('p','',t)));
    const fb=feedback(c);target.append(button(c,'資料を確認し、調査を始める →',()=>{c.complete(page.id,['read']);fb.textContent='資料を保存しました。次へ進めます。';fb.classList.add('is-ok');}),fb);if(completed(c,page)){fb.textContent='資料は確認済みです。次へ進めます。';fb.classList.add('is-ok');}
  }
  function directivePanel(c,p){
    p.append(c.el('h3','','指令履歴と受付原簿'));
    const controls=c.el('div','extra-filter');const category=c.el('select');category.setAttribute('aria-label','受付種別で絞り込む');['すべて','緊急','正式依頼'].forEach(x=>category.append(new Option(x,x)));const label=c.el('label');const missing=c.el('input');missing.type='checkbox';label.append(missing,c.el('span','','応答無しのみ'));controls.append(category,label);p.append(controls);const results=c.el('div');p.append(results);
    function draw(){results.replaceChildren();const rows=D.directives.filter(r=>(category.value==='すべて'||r[1]===category.value)&&(!missing.checked||r[4].includes('応答無し')));const body=table(c,results,['指令番号','送信時刻','受付種別','対象','内容','対処状況','受付原簿'],rows.map(([id,type,hero,contents,status,receipt,time])=>[id,time,type,hero,contents,status,receipt]),'指令履歴');Array.from(body.children).forEach((tr,i)=>{if(rows[i][5]==='—')tr.classList.add('is-missing');});}
    category.addEventListener('change',draw);missing.addEventListener('change',draw);draw();
  }
  function doorPanel(c,p){
    p.append(c.el('h3','','扉の開閉記録'),c.el('p','','指令室で見た数字の表示エラーが残っている。エコーの最後の接続時刻と、どの扉の記録が一致するだろう。'));
    p.append(c.makeImage('assets/extra/door-log-original.png','扉の開閉時刻ログ'));
  }
  function routePanel(c,p){
    p.append(c.el('h3','','最後に通信できた場所'),c.el('p','extra-footer-note','接続履歴の矢印は、装備が中継器に接続した順です。地下図で経路を確認できます。'));
    table(c,p,['対象','旧校舎へ入った時刻','中継器の順','最終接続時刻'],D.routes,'装備接続の記録');
    p.append(c.makeImage('assets/extra/basement-map.svg','旧校舎地下・設備通信図'));
  }
  function investigation(page,target,c,inLink=false){
    if(!inLink)target.append(c.el('p','extra-lead','通信ログ、扉の記録、地下の図面を照合して、エコーの足取りを報告しよう。'));
    tabs(c,target,[{id:'directives',label:'指令履歴',render:p=>directivePanel(c,p)},{id:'doors',label:'扉の開閉時刻',render:p=>doorPanel(c,p)},{id:'routes',label:'通信経路・地下図',render:p=>routePanel(c,p)}],'evidenceTab');
    if(inLink)return;
    const f=formBase(c,target,page.id);f.append(c.el('h3','','3つの記録を統合する'));const grid=c.el('div','extra-answers');
    const a=field(c,f,'command','エコーへの最後の指令番号');const b=field(c,f,'relay','全員に共通する最後の中継器番号');const d=field(c,f,'door','エコーの最終接続時刻と一致する扉',D.doors.map(x=>({value:x.code,label:x.code})));grid.append(a.box,b.box,d.box);f.append(grid);
    const finding=field(c,f,'finding','記録から読み取れること',[{value:'false',label:'未受付の旧校舎要請が繰り返され、応答が途絶えた'},{value:'normal',label:'正式な要請だけが記録されている'},{value:'dead',label:'応答がないので生存していないと断定できる'}]);f.append(finding.box);submitButton(c,f,'調査結果を報告する →');const fb=feedback(c);f.append(fb);
    f.addEventListener('submit',e=>{e.preventDefault();if(good(c,a.input.value,[D.lastCommand,D.lastCommand.replace('H-','')])&&good(c,b.input.value,[D.finalRelay,'9'])&&d.input.value===D.lastDoor&&finding.input.value==='false'){c.complete(page.id,[a.input.value,b.input.value,d.input.value,finding.input.value]);lockForm(c,page,f,fb,'旧校舎地下の同じ設備系統に集まっていた。次は、現在の生存を確認しよう。');}else fb.textContent='照合結果に一致しない項目があります。最後の指令、共通の中継器、最終接続時刻をそれぞれ確認してください。';});lockForm(c,page,f,fb);
    hints(c,target,[
      'エコーへ送られた指令は一つではありません。送信時刻を比べてください。',
      '接続履歴の矢印を最後まで追い、共通する中継器を設備図で確認しましょう。',
      '扉ログの数字は指令室で見た表示と同じです。各桁の黒い部分と空白を入れ替えましょう。空白の桁も数えます。読みづらいときは、まず分の部分を照合してみましょう。'
    ]);
  }
  function survival(page,target,c){
    const s=state(c);target.append(c.el('p','','制御室には、装備点検用の近距離信号を受信する端末がある。HERO LINKに、一時的な受信拡張を追加できそうだ。'));
    target.append(c.el('p','extra-footer-note','受信機は1台。点検信号は装備ID・生体情報・更新番号を含みますが、距離・方向・正確な位置情報は含みません。'));
    const term=c.el('section','extra-terminal');term.append(c.el('h3','','EQUIPMENT MONITOR / LOCAL RX'));
    const install=button(c,s.extensionInstalled?'受信拡張は導入済み ✓':'近距離通信拡張を導入する',()=>{s.extensionInstalled=true;c.persist();install.disabled=true;install.textContent='受信拡張を導入しました ✓';start.disabled=false;});install.disabled=Boolean(s.extensionInstalled);term.append(install);
    const start=button(c,'近距離信号の受信を開始',()=>{start.disabled=true;sample();const timer=setInterval(sample,1800);timers.push(timer);});start.disabled=!s.extensionInstalled;term.append(start);
    const samples=c.el('div');term.append(samples);const stat=c.el('p','extra-signal-status','待機中 / 位置情報：取得不可');term.append(stat);const fb=feedback(c);const confirm=button(c,'更新された生体信号を確認する',()=>{if(!s.extensionInstalled||sessionSamples<2)return;s.bioConfirmed=true;c.complete(page.id,['current-bio-confirmed']);fb.textContent='……生きてる！ エコーも、ほかのみんなも。次へ進めます。';fb.classList.add('is-ok');confirm.disabled=true;});confirm.disabled=true;
    let sessionSamples=0;
    function draw(){samples.replaceChildren();const seq=s.signalSequence||0;const seconds=20*3600+40*60+seq*2;const clock=[Math.floor(seconds/3600)%24,Math.floor(seconds/60)%60,seconds%60].map(n=>String(n).padStart(2,'0')).join(':');table(c,samples,['装備ID','対応するヒーロー','心拍','更新番号'],D.heartbeats.map((h,i)=>[h.id,h.hero,String(h.bpm+(seq+i)%3-1)+' bpm','#'+seq]),'現在の装備点検信号');stat.textContent='● 受信時刻 '+clock+' / 位置情報：取得不可';}
    function sample(){if(!term.isConnected)return;s.signalSequence=(s.signalSequence||0)+1;sessionSamples++;c.persist();draw();confirm.disabled=sessionSamples<2||completed(c,page);}
    if(s.signalSequence)draw();target.append(term,c.el('p','extra-footer-note','受信を始めると約2秒ごとに更新番号が進みます。2回の更新で、保存済みの記録ではないことを確認してください。'),confirm,fb);
    if(completed(c,page)){confirm.disabled=true;fb.textContent='現在の生体信号を確認済みです。正確な位置はまだ取得できていません。';fb.classList.add('is-ok');}
  }
  function repair(page,target,c){
    const s=state(c);(page.paragraphs||[]).forEach(t=>target.append(c.el('p','',t)));
    const log=c.el('section','extra-terminal');log.append(c.el('h3','','SOS分類の診断ログ'),c.el('output','','送信元：EQ-01（エコー）\n発信者区分：ヒーロー\n信号：非常用SOS\n現在の分類先：装備異常の記録\n救援受付：未受理\n通常の隊員通信：動作中'));target.append(log);
    const f=formBase(c,target,page.id);const fields=c.el('div','extra-settings');
    const policy=field(c,f,'policy','非常用SOSを救援として扱う発信者',[{value:'citizen',label:'市民だけを対象にする'},{value:'all',label:'市民・ヒーローの両方を対象にする'},{value:'hero',label:'ヒーローだけを対象にする'}]);
    const dest=field(c,f,'dest','ヒーローの非常用SOSの分類先',[{value:'equipment',label:'装備異常の記録だけに残す'},{value:'rescue',label:'救援受付で受理し、担当者へ通知する'},{value:'none',label:'記録を削除する'}]);
    const reply=field(c,f,'reply','救援受付後の位置照会をどうする？',[{value:'request',label:'元の送信装備へ返信し、位置情報を要求する'},{value:'guess',label:'最後の中継器から現在地を推定して確定する'},{value:'off',label:'位置照会を行わない'}]);fields.append(policy.box,dest.box,reply.box);f.append(fields);const apply=submitButton(c,f,'修正案を検証して適用する');const fb=feedback(c);f.append(fb);
    const result=c.el('section');target.append(result);
    f.addEventListener('submit',e=>{e.preventDefault();if(s.patchApplied)return;if(!c.save.completedPuzzleIds.includes('x-last-reason')){fb.textContent='先に、前のページで過去と現在の記録を比較してください。';return;}if(policy.input.value!=='all'||dest.input.value!=='rescue'||reply.input.value!=='request'){fb.textContent='助ける側も、助けを必要とします。ヒーローの非常用SOSが救援として受理される扱いにしてください。';return;}s.patchApplied=true;s.repairVersion=2;c.persist();showState();});
    function showState(){result.replaceChildren();if(!s.patchApplied)return;f.querySelectorAll('input,select,button').forEach(x=>x.disabled=true);apply.textContent='修正を適用済み ✓';fb.textContent='ヒーローの非常用SOSが救援受付に現れ、受理番号が発行されました。';fb.classList.add('is-ok');
      const box=c.el('div','extra-receipt');box.append(c.el('h3','','救援受付 / 受理済み'),c.el('p','','EQ-01：非常用SOS → 救援受付 → 受理番号発行 → 担当者へ通知'));
      HERO_STORY.ex.receiptReady.forEach(t=>box.append(c.el('p','',t)));
      if(!s.location){const request=button(c,'送信元装備へ正式な位置情報を要求する',()=>{request.disabled=true;HERO_STORY.ex.receiptRequest.forEach(t=>box.append(c.el('p','',t)));status.textContent='受付完了 → 位置照会を返信 → 応答を照合中…';const timer=setTimeout(()=>{if(!box.isConnected)return;s.location={...D.rescueLocation,receivedAt:'20:45:12',source:'EQ-01 / 返信された設備位置ID'};c.persist();showState();},700);timers.push(timer);});const status=c.el('p','extra-footer-note','近距離点検信号ではなく、救援通信への返信経路を使います。');box.append(request,status);}
      else {box.append(c.el('p','location-code',s.location.code),c.el('p','',s.location.name),c.el('p','','到達経路：'+s.location.route),c.el('p','extra-footer-note','取得元：'+s.location.source+' / 受信時刻 '+s.location.receivedAt));
        if(!s.dispatched)box.append(button(c,'位置情報と救出経路を救助班へ送る',()=>{s.dispatched=true;c.complete(page.id,[s.location.code,'rescue-dispatched']);showState();}));
        else box.append(c.el('p','','✓ 救助班が位置情報を受領しました。次へ進めます。'));
      }
      const narrative=s.dispatched?HERO_STORY.ex.receiptLocation.concat(HERO_STORY.ex.receiptDispatch):s.location?HERO_STORY.ex.receiptLocation:HERO_STORY.ex.receiptRequest;
      if(s.location)narrative.forEach(t=>box.append(c.el('p','',t)));
      result.append(box);
    }showState();
    hints(c,target,['通信そのものは動いています。市民とヒーローでSOSの分類先が異なることが問題です。','ヒーローのSOSも救援受付で受理し、担当者へ通知します。そのあとで正式な位置照会を行います。']);
  }
  function render(page,target,c){
    const scenes={first,firstDoor,maze,documents,investigation,survival,repair,reason:(p,t,c)=>HERO_UI.reason(p,t,c)};
    scenes[page.scene](page,target,c);
  }
  window.HERO_EXTRA_UI={render,cleanup,renderEvidence:(target,c)=>investigation({id:'x-third'},target,c,true)};
})();
