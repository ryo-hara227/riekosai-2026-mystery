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
  function note(c,target,text){target.append(c.el('p','prototype-note','仮実装：'+text));}
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
  function unlock(page,target,c){
    target.append(c.el('p','extra-lead','EASY・NORMAL・HARDで集めた3つの合言葉を入力してください。'));
    const f=formBase(c,target,page.id);const grid=c.el('div','extra-answers');const inputs=['EASYの合言葉','NORMALの合言葉','HARDの合言葉'].map((label,i)=>{const x=field(c,f,'word'+i,label);grid.append(x.box);return x.input;});f.append(grid);submitButton(c,f,'合言葉を照合する →');const fb=feedback(c);f.append(fb);
    f.addEventListener('submit',e=>{e.preventDefault();if(inputs.every((x,i)=>good(c,x.value,[D.unlock[i]]))){c.complete(page.id,inputs.map(x=>x.value));lockForm(c,page,f,fb,'EXTRA解禁！ 次へ進めます。');}else fb.textContent='合言葉をもう一度確認してください。E/N/Hのクリア画面に表示されています。';});
    const all=['easy','normal','hard'].every(id=>c.loadSave(id).cleared);
    if(all&&!completed(c,page)){inputs.forEach((x,i)=>x.value=D.unlock[i]);c.complete(page.id,D.unlock);}
    lockForm(c,page,f,fb,'EXTRA解禁済み。次へ進めます。');
    const dev=c.el('details','home-guidance');dev.append(c.el('summary','','試作版をすぐに確認したい方へ'));
    dev.append(c.el('p','','試遊のため、合言葉を入力せずEXTRAを解禁できます。E/N/Hのクリア記録には影響しません。'));
    dev.append(button(c,'試遊用にEXTRAを解禁する',()=>{c.complete(page.id,['prototype-unlock']);state(c).trialUnlock=true;c.persist();lockForm(c,page,f,fb,'試遊用に解禁しました。次へ進めます。');}));target.append(dev);
  }
  function first(page,target,c){
    const mail=c.el('section','extra-mail');const head=c.el('header');head.append(c.el('strong','','差出人：エコー → マネージャー'),c.el('span','','件名：もし、私と連絡が取れなくなったら'));
    mail.append(head,c.el('blockquote','','「HERO LINKには載せられない。4つのヒントを残す。番号も、番号と同じ数字も消えている。前の事件で見つけたエラーは、まだ直っていない。どうか、私たちを見つけて」'));target.append(mail);
    const assets=[{id:'A',files:['ex01_1.png']},{id:'B',files:['ex01_2-1.png','ex01_2-2.png']},{id:'C',files:['ex01_3-1.png','ex01_3-2.png']},{id:'D',files:['ex01_4.png']}];
    tabs(c,target,assets.map(a=>({id:a.id,label:'資料 '+a.id,render:panel=>{panel.append(c.el('h3','','添付資料 '+a.id));const stack=c.el('div','extra-image-stack');a.files.forEach((src,i)=>stack.append(c.makeImage('assets/extra/'+src,`資料${a.id} ${i+1}`)));panel.append(stack);}})),'firstTab');
    const f=formBase(c,target,page.id);f.append(c.el('h3','','消えた番号を戻す'),c.el('p','extra-footer-note','資料A〜Dは掲載順です。ヒント番号の順ではありません。'));
    const grid=c.el('div','extra-restore-grid');const order=assets.map(a=>{const x=field(c,f,'order'+a.id,'資料'+a.id+'のヒント番号',[1,2,3,4].map(n=>({value:String(n),label:'ヒント '+n})));grid.append(x.box);return x.input;});f.append(grid);
    const answers=c.el('div','extra-answers');const words=[1,2,3,4].map(n=>{const x=field(c,f,'hint'+n,'ヒント'+n+'の答え');answers.append(x.box);return x.input;});f.append(answers);submitButton(c,f,'4つのヒントを復元する →');const fb=feedback(c);f.append(fb);
    f.addEventListener('submit',e=>{e.preventDefault();const mapping=order.every((x,i)=>x.value===D.cardOrder[i]);const valid=words.every((x,i)=>good(c,x.value,D.firstAnswers[i]));if(!mapping||!valid){fb.textContent='番号と答えの組み合わせが一致しません。各資料で消えている数字と、過去の事件を見直しましょう。';return;}c.complete(page.id,[...order.map(x=>x.value),...words.map(x=>x.value)]);lockForm(c,page,f,fb,'4つのヒントを復元しました！ 次へ進めます。');});
    lockForm(c,page,f,fb);
    hints(c,target,['どの数字が消えているかが、ヒント番号の手掛かりです。問題画像のファイル名や掲載順で判断しないでください。','資料Aの丸には太陽系の8惑星を入れます。「2・8」が金・海なら、消えた数字を戻した「3・4」は？','資料Bは五十音表。赤枠を立方体の展開図として組み立てます。向きが変わった文字に注意。','資料Cの大きな空白に「4」を戻し、方角を示すものとして見立てます。色付きの文字は五十音順で前後へ。赤と緑のエラーにも注意。','資料DはHARDで救出した子どもたちの場所です。問題文から消えた「1」が番号の手掛かりになります。']);
  }
  function firstDoor(page,target,c){
    target.append(c.makeImage('assets/extra/ex01_last.png','First Missionの最終指示'));
    target.append(c.el('p','extra-lead','復元した4つの答えを、指示文へ当てはめよう。'));
    const f=formBase(c,target,page.id);const grid=c.el('div','extra-answers');
    const loc=field(c,f,'place','向かう場所');const color=field(c,f,'color','開ける扉の実物の色',[{value:'red',label:'赤い扉'},{value:'green',label:'緑の扉'},{value:'blue',label:'青い扉'},{value:'yellow',label:'黄色の扉'}]);grid.append(loc.box,color.box);f.append(grid);submitButton(c,f,'この場所の扉を開ける →');const fb=feedback(c);f.append(fb);
    f.addEventListener('submit',e=>{e.preventDefault();if(good(c,loc.input.value,['旧校舎地下機械室','旧校舎の地下の機械室','旧校舎地下の機械室'])&&color.input.value==='red'){c.complete(page.id,[loc.input.value,color.input.value]);lockForm(c,page,f,fb,'赤い扉が開いた。図面にない制御室へ進めます。');}else fb.textContent='ヒント1・3・2・4の順で指示を読み直してください。場所は建物名から、色は実物の色で答えます。';});lockForm(c,page,f,fb);
  }
  function maze(page,target,c){
    target.append(c.el('p','extra-lead','白い入口から進み、同じ色の扉をワープして文字をたどろう。'));
    target.append(c.el('p','extra-footer-note','経路メモ：指やマウスで線を描けます。↪のある扉を押すと対の扉へマーカーが移動します。壁の通行判定・通過文字の自動採点は仮実装です。スマホでは図を横にスクロールできます。'));
    const s=state(c);s.maze||={lines:[],marker:[228,970]};const m=s.maze;const bar=c.el('div','extra-maze-toolbar');const scroll=c.el('div','extra-maze-scroll');scroll.tabIndex=0;scroll.setAttribute('aria-label','制御室の迷路。横スクロール可能');
    const stage=c.el('div','extra-maze-stage');const img=c.el('img');img.src='./assets/extra/ex02-2.png';img.alt='エコーが残したワープ付き制御室フロアマップ。色は映像エラーの影響を受けない。';stage.append(img);
    const ns='http://www.w3.org/2000/svg';const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 2000 1125');svg.classList.add('extra-maze-ink');svg.setAttribute('aria-label','経路メモ描画領域');stage.append(svg);
    const status=feedback(c,'現在地メモ：白い入口');status.classList.add('extra-footer-note');
    function paint(){svg.replaceChildren();m.lines.forEach(line=>{const p=document.createElementNS(ns,'path');p.setAttribute('d',line.map((v,i)=>(i?'L':'M')+v.join(',')).join(' '));svg.append(p);});const dot=document.createElementNS(ns,'circle');dot.setAttribute('cx',m.marker[0]);dot.setAttribute('cy',m.marker[1]);dot.setAttribute('r','14');svg.append(dot);}
    let active=null;
    const point=e=>{const b=svg.getBoundingClientRect();return [Math.round((e.clientX-b.left)*2000/b.width),Math.round((e.clientY-b.top)*1125/b.height)];};
    svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;svg.setPointerCapture(e.pointerId);active=[point(e)];m.lines.push(active);paint();});
    svg.addEventListener('pointermove',e=>{if(!active)return;if(active.length<1200){active.push(point(e));m.marker=active[active.length-1];paint();}});
    function finish(){if(!active)return;active=null;m.lines=m.lines.slice(-50);c.persist();}
    svg.addEventListener('pointerup',finish);svg.addEventListener('pointercancel',finish);
    const doors=[['white','白い入口',[228,970]],['red','赤い最終扉',[228,270]],['green-a','緑・左下',[400,970],[1600,970]],['green-b','緑・右下',[1600,970],[400,970]],['blue-a','青・中央',[1080,740],[1770,270]],['blue-b','青・右上',[1770,270],[1080,740]],['yellow-a','黄・中央',[1080,500],[1770,970]],['yellow-b','黄・右下',[1770,970],[1080,500]]];
    doors.forEach(([id,label,xy,to])=>{const b=button(c,label,()=>{m.marker=to||xy;status.textContent=to?label+' → 対の扉にワープしました。':'現在地メモ：'+label;c.persist();paint();},'extra-warp');b.style.left=(xy[0]/20)+'%';b.style.top=(xy[1]/11.25)+'%';b.title=label+(to?'からワープ':'へマーカーを移動');b.setAttribute('aria-label',b.title);stage.append(b);});
    bar.append(button(c,'ひとつ戻す',()=>{m.lines.pop();c.persist();paint();},'btn btn--outline'),button(c,'経路メモを消す',()=>{m.lines=[];m.marker=[228,970];c.persist();paint();},'btn btn--outline'),button(c,'全体画像を拡大',()=>{const d=document.getElementById('imageDialog');document.getElementById('enlargedImage').src=img.src;document.getElementById('enlargedImage').alt=img.alt;d.showModal();},'btn btn--outline'));
    scroll.append(stage);target.append(bar,scroll,status);paint();
    const codebox=c.el('details','home-guidance');codebox.append(c.el('summary','','扉コード対応表（試作用）'));codebox.append(c.el('p','extra-footer-note','作品名に着想を得た試作用の対応です。公式略称ではありません。緑はワープ専用でコードはありません。'));
    table(c,codebox,['コード','作品名','扉の色'],D.doors.map(d=>[d.code,d.work,d.label]),'扉コードの試作対応表');target.append(codebox);
    const f=formBase(c,target,page.id);const sel=field(c,f,'door','最後に入る扉のコード',D.doors.map(d=>({value:d.code,label:d.code+' / '+d.label})));f.append(sel.box);submitButton(c,f,'この扉を開ける →');const fb=feedback(c);f.append(fb);
    f.addEventListener('submit',e=>{e.preventDefault();if(sel.input.value!==D.secondDoor){fb.textContent='試作用の最終扉とは一致しません。下の「試遊補助」で仮の正解条件を確認できます。';return;}c.complete(page.id,[sel.input.value]);lockForm(c,page,f,fb,'扉の奥で、計画書と日記を発見しました。');});lockForm(c,page,f,fb);
    const help=c.el('details','hints');help.append(c.el('summary','','試遊補助：未確定の採点条件を見る'));help.append(c.el('p','',`この版では最終扉を ${D.secondDoor}（赤）として通過できます。これは確定解法の代用ではありません。迷路原図の最終解答が確定したらdata/extra.jsのsecondDoorを差し替えます。`));target.append(help);
  }
  function documents(page,target,c){
    target.append(c.el('p','','扉の奥で見つけたのは、書きかけの計画書と、日付のない日記だった。'));
    const grid=c.el('div','extra-paper-grid');const plan=c.el('article','extra-paper');plan.append(c.el('h3','','ヒーロー消滅計画'));const list=c.el('ul');D.plan.forEach(item=>{const li=c.el('li');li.append(c.el(item.done?'s':'span','',item.text));list.append(li);});plan.append(list,c.el('small','','取り消し線：実行済み'));
    const diary=c.el('article','extra-paper');diary.append(c.el('h3','','日付のない日記'));D.diary.forEach(t=>diary.append(c.el('p','',t)));grid.append(plan,diary);target.append(grid);
    const rec=c.el('section','extra-transcript');rec.append(c.el('h3','','制御室・音声記録'),c.el('small','','REC-UNKNOWN / 一部破損 / 文字起こし・仮稿'),c.el('p','',D.recording.join('\n')));target.append(rec,c.el('p','extra-footer-note','この記録は制御室の端末に残ったローカル録音です。HERO LINKで受信した音声ではありません。'));
    const fb=feedback(c);target.append(button(c,'資料を確認し、調査を始める →',()=>{c.complete(page.id,['read']);fb.textContent='資料を保存しました。次へ進めます。';fb.classList.add('is-ok');}),fb);if(completed(c,page)){fb.textContent='資料は確認済みです。次へ進めます。';fb.classList.add('is-ok');}
  }
  function directivePanel(c,p){
    p.append(c.el('h3','','指令履歴と受付原簿'),c.el('p','extra-footer-note','H-101〜104は提供表を文章化。H-105以降は試作用の追加です。「受付原簿」のIDは照合用の仮資料です。'));
    const controls=c.el('div','extra-filter');const category=c.el('select');category.setAttribute('aria-label','受付種別で絞り込む');['すべて','緊急','正式依頼'].forEach(x=>category.append(new Option(x,x)));const label=c.el('label');const missing=c.el('input');missing.type='checkbox';label.append(missing,c.el('span','','応答無しのみ'));controls.append(category,label);p.append(controls);const results=c.el('div');p.append(results);
    function draw(){results.replaceChildren();const rows=D.directives.filter(r=>(category.value==='すべて'||r[1]===category.value)&&(!missing.checked||r[4].includes('応答無し')));const body=table(c,results,['指令番号','受付種別','対象','内容','対処状況','受付原簿'],rows,'指令履歴');Array.from(body.children).forEach((tr,i)=>{if(rows[i][5]==='—')tr.classList.add('is-missing');if(rows[i][0]===D.lastCommand)tr.classList.add('is-last');});}
    category.addEventListener('change',draw);missing.addEventListener('change',draw);draw();
    const original=c.el('details');original.append(c.el('summary','','提供されたログ表の原図を見る'));original.append(c.makeImage('assets/extra/directive-original.png','指令履歴原図・画像7'));p.append(original);
  }
  function doorPanel(c,p){
    p.append(c.el('h3','','扉の開閉記録'),c.el('p','','NORMALで見た数字の表示エラーが残っている。エコーの最後の接続時刻と、どの扉の記録が一致するだろう。'));
    p.append(c.makeImage('assets/extra/door-log-original.png','扉の開閉時刻ログ原図・画像8'));
    note(c,p,'原図の時刻復号は未確定です。この試作では、下の「試作用の復元時刻」を調査に使用します。');
    table(c,p,['扉','試作用の復元時刻','対応色'],D.doors.map(d=>[d.code,d.time,d.label]),'試作用の復元時刻');
  }
  function routePanel(c,p){
    p.append(c.el('h3','','最後に通信できた場所'),c.el('p','extra-footer-note','仮資料：接続履歴は過去の経路です。今もそこにいるとは限りません。中継器09の区画内の部屋は未登録です。'));
    table(c,p,['対象','旧校舎へ入った時刻','中継器の順','最終接続時刻'],D.routes,'装備接続の記録');
    p.append(c.makeImage('assets/extra/basement-map.svg','旧校舎地下・設備通信図（仮図面）'));
  }
  function investigation(page,target,c,inLink=false){
    if(!inLink)target.append(c.el('p','extra-lead','通信ログ、扉の記録、地下の図面を照合して、エコーの足取りを報告しよう。'));
    tabs(c,target,[{id:'directives',label:'指令履歴',render:p=>directivePanel(c,p)},{id:'doors',label:'扉の開閉時刻',render:p=>doorPanel(c,p)},{id:'routes',label:'通信経路・地下図',render:p=>routePanel(c,p)}],'evidenceTab');
    if(inLink)return;
    const f=formBase(c,target,page.id);f.append(c.el('h3','','3つの記録を統合する'));const grid=c.el('div','extra-answers');
    const a=field(c,f,'command','エコーへの最後の指令番号');const b=field(c,f,'relay','全員に共通する最後の中継器番号');const d=field(c,f,'door','エコーの最終接続時刻と一致する扉',D.doors.map(x=>({value:x.code,label:x.code})));grid.append(a.box,b.box,d.box);f.append(grid);
    const finding=field(c,f,'finding','記録から読み取れること',[{value:'false',label:'未受付の旧校舎要請が繰り返され、応答が途絶えた'},{value:'normal',label:'正式な要請だけが記録されている'},{value:'dead',label:'応答がないので生存していないと断定できる'}]);f.append(finding.box);submitButton(c,f,'調査結果を報告する →');const fb=feedback(c);f.append(fb);
    f.addEventListener('submit',e=>{e.preventDefault();if(good(c,a.input.value,[D.lastCommand,D.lastCommand.replace('H-','')])&&good(c,b.input.value,[D.finalRelay,'9'])&&d.input.value===D.lastDoor&&finding.input.value==='false'){c.complete(page.id,[a.input.value,b.input.value,d.input.value,finding.input.value]);lockForm(c,page,f,fb,'旧校舎地下の同じ設備系統に集まっていた。次は、現在の生存を確認しよう。');}else fb.textContent='照合結果に一致しない項目があります。最後の指令、共通の中継器、最終接続時刻をそれぞれ確認してください。';});lockForm(c,page,f,fb);
    hints(c,target,['指令履歴の最後まで見てください。正常な依頼は受付原簿にも番号があります。','3つの経路が異なっていても、最後の番号は共通しています。図面の丸数字と照合します。','エコーの最終接続は20:16です。この版では「試作用の復元時刻」の表を使って照合します。応答なしだけでは、生死を判断できません。']);
  }
  function survival(page,target,c){
    const s=state(c);target.append(c.el('p','','制御室には、装備点検用の近距離信号を受信する端末がある。HERO LINKに、一時的な受信拡張を追加できそうだ。'));
    target.append(c.el('p','extra-footer-note','受信機は1台。点検信号は装備ID・生体情報・更新番号を含みますが、距離・方向・正確な位置情報は含みません。'));
    const term=c.el('section','extra-terminal');term.append(c.el('h3','','EQUIPMENT MONITOR / LOCAL RX'));
    const install=button(c,s.extensionInstalled?'受信拡張は導入済み ✓':'近距離通信拡張を導入する',()=>{s.extensionInstalled=true;c.persist();install.disabled=true;install.textContent='受信拡張を導入しました ✓';start.disabled=false;});install.disabled=Boolean(s.extensionInstalled);term.append(install);
    const start=button(c,'近距離信号の受信を開始',()=>{start.disabled=true;sample();const timer=setInterval(sample,1800);timers.push(timer);});start.disabled=!s.extensionInstalled;term.append(start);
    const samples=c.el('div');term.append(samples);const stat=c.el('p','extra-signal-status','待機中 / 位置情報：取得不可');term.append(stat);const fb=feedback(c);const confirm=button(c,'更新された生体信号を確認する',()=>{if(!s.extensionInstalled||sessionSamples<2)return;s.bioConfirmed=true;c.complete(page.id,['current-bio-confirmed']);fb.textContent='……生きてる！ エコーも、ほかのみんなも。次へ進めます。';fb.classList.add('is-ok');confirm.disabled=true;});confirm.disabled=true;
    let sessionSamples=0;
    function draw(){samples.replaceChildren();const seq=s.signalSequence||0;const seconds=20*3600+40*60+seq*2;const clock=[Math.floor(seconds/3600)%24,Math.floor(seconds/60)%60,seconds%60].map(n=>String(n).padStart(2,'0')).join(':');table(c,samples,['装備ID','対応するヒーロー','心拍（模擬値）','更新番号'],D.heartbeats.map((h,i)=>[h.id,h.hero,String(h.bpm+(seq+i)%3-1)+' bpm','#'+seq]),'現在の装備点検信号');stat.textContent='● ゲーム内受信時刻 '+clock+' / 位置情報：取得不可';}
    function sample(){if(!term.isConnected)return;s.signalSequence=(s.signalSequence||0)+1;sessionSamples++;c.persist();draw();confirm.disabled=sessionSamples<2||completed(c,page);}
    if(s.signalSequence)draw();target.append(term,c.el('p','extra-footer-note','受信を始めると約2秒ごとに更新番号が進みます。2回の更新で、保存済みの記録ではないことを確認してください。'),confirm,fb);
    if(completed(c,page)){confirm.disabled=true;fb.textContent='現在の生体信号を確認済みです。正確な位置はまだ取得できていません。';fb.classList.add('is-ok');}
  }
  function repair(page,target,c){
    const s=state(c);target.append(c.el('p','extra-lead','HERO LINKは「助けて」の宛先を必須にしていた。誰に頼ればいいかわからない声は、どこへ行く？'));
    const log=c.el('section','extra-terminal');log.append(c.el('h3','','未処理の救援要請 / 試作用の診断ログ'),c.el('output','','送信元：EQ-01（エコー）\n本文：誰か……みんなを助けて\n宛先：未指定\n旧設定：宛先未指定 → 破棄\nエラー：DESTINATION_REQUIRED\n位置返信：受付未成立のため未要求'));target.append(log);
    const f=formBase(c,target,page.id);const fields=c.el('div','extra-settings');
    const policy=field(c,f,'policy','宛先が空白のSOSを受信したら',[{value:'drop',label:'従来どおり破棄する'},{value:'queue',label:'保留キューに保存し、受付へ回す'},{value:'ignore',label:'エラー表示だけ消す'}]);
    const dest=field(c,f,'dest','宛先未指定の場合の受付先',[{value:'echo',label:'エコー個人の受信箱'},{value:'rescue',label:'救援受付（受信可能な窓口）'},{value:'none',label:'未指定のままにする'}]);
    const reply=field(c,f,'reply','救援受付後の位置照会をどうする？',[{value:'request',label:'元の送信装備へ返信し、位置情報を要求する'},{value:'guess',label:'最後の中継器から現在地を推定して確定する'},{value:'off',label:'位置照会を行わない'}]);fields.append(policy.box,dest.box,reply.box);f.append(fields);const apply=submitButton(c,f,'修正案を検証して適用する');const fb=feedback(c);f.append(fb);
    const result=c.el('section');target.append(result);
    f.addEventListener('submit',e=>{e.preventDefault();if(s.patchApplied)return;if(policy.input.value!=='queue'||dest.input.value!=='rescue'||reply.input.value!=='request'){fb.textContent='救援要請を保持し、受付が受け取り、送信元へ返信できる経路にしてください。表示だけを直しても、声は届きません。';return;}s.patchApplied=true;c.persist();showState();});
    function showState(){result.replaceChildren();if(!s.patchApplied)return;f.querySelectorAll('input,select,button').forEach(x=>x.disabled=true);apply.textContent='修正を適用済み ✓';fb.textContent='宛先未指定のSOSが保留キューに戻り、救援受付で受理されました。';fb.classList.add('is-ok');
      const box=c.el('div','extra-receipt');box.append(c.el('h3','','救援受付 / 受理済み'),c.el('p','','EQ-01 → 保留キュー → 救援受付 → EQ-01へ返信可能'));
      if(!s.location){const request=button(c,'送信元装備へ正式な位置情報を要求する',()=>{request.disabled=true;status.textContent='受付完了 → 位置照会を返信 → 応答を照合中…';const timer=setTimeout(()=>{if(!box.isConnected)return;s.location={...D.rescueLocation,receivedAt:'20:45:12',source:'EQ-01 / 返信された設備位置ID'};c.persist();showState();},700);timers.push(timer);});const status=c.el('p','extra-footer-note','近距離点検信号ではなく、救援通信への返信経路を使います。');box.append(request,status);}
      else {box.append(c.el('p','location-code',s.location.code),c.el('p','',s.location.name),c.el('p','','到達経路：'+s.location.route),c.el('p','extra-footer-note','取得元：'+s.location.source+' / ゲーム内受信時刻 '+s.location.receivedAt));
        if(!s.dispatched)box.append(button(c,'位置情報と救出経路を救助班へ送る',()=>{s.dispatched=true;c.complete(page.id,[s.location.code,'rescue-dispatched']);showState();}));
        else box.append(c.el('p','','✓ 救助班が位置情報を受領しました。次へ進めます。'));
      }result.append(box);
    }showState();
    hints(c,target,['日記の送り主もエコーも「誰か」に助けを求めています。個人名を知っていないとSOSを出せない仕組みを変えましょう。','宛先がない通信も保持し、救援受付へ届けます。受付後に初めて、元の装備へ位置情報を問い合わせます。']);
  }
  function render(page,target,c){
    const scenes={unlock,first,firstDoor,maze,documents,investigation,survival,repair};
    scenes[page.scene](page,target,c);
  }
  function renderLink(target,c,page){
    const s=state(c);target.append(c.el('p','extra-link-status','EXTRA / '+page.label));
    const ready=c.save.completedPuzzleIds.includes('x-documents');
    const items=[{id:'mission',label:'受信した指令',render:p=>{p.append(c.el('h3','','ヒーローが消えた夜'),c.el('p','','現在の任務：'+page.title));p.append(c.el('p','extra-footer-note','HERO LINKを閉じると、問題画面と入力内容に戻ります。'));}}];
    if(ready){items.push({id:'evidence',label:'記録調査',render:p=>{note(c,p,'追加した調査資料・時刻復元値は試作用です。');investigation({id:'x-third'},p,c,true);}});items.push({id:'equipment',label:'装備受信',render:p=>{p.append(c.el('h3','','近距離通信拡張'));p.append(c.el('p','',s.extensionInstalled?'受信拡張：導入済み':'受信拡張：未導入。Third Missionで制御室の端末を調べてください。'));if(s.extensionInstalled){table(c,p,['ヒーロー','信号'],D.heartbeats.map(h=>[h.hero,s.bioConfirmed?'更新中・生存確認済み':'未確認']),'装備点検受信状態');p.append(c.el('p','','位置情報：近距離点検信号には含まれません。'));}}});}
    if(s.bioConfirmed)items.push({id:'rescue',label:'救援通信',render:p=>{p.append(c.el('h3','','宛先未指定のSOS'));p.append(c.el('p','',s.patchApplied?'修正済み：保留キュー → 救援受付':'送信失敗：DESTINATION_REQUIRED'));p.append(c.el('p','',s.location?s.location.name:'正式な位置情報は未取得'));if(s.dispatched)p.append(c.el('p','','救助班へ送信済み。'));}});
    items.push({id:'activity',label:'活動記録',render:p=>{p.append(c.el('h3','','活動記録'));['easy','normal','hard','extra'].forEach(id=>{const r=c.loadSave(id);p.append(c.el('p','',id.toUpperCase()+'：'+(r.cleared?'CLEAR':r.started?'挑戦中':'未挑戦')));});p.append(c.el('p','prototype-note','隊員同士の実通信・掲示板連携は未接続です。'));}});
    tabs(c,target,items,'linkTab');
    if(!ready)target.append(c.el('p','extra-link-locked','記録調査と装備受信は、制御室の資料を発見した後に追加されます。'));
  }
  window.HERO_EXTRA_UI={render,renderLink,cleanup};
})();
