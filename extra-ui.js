/* EXTRA画面処理。通信・生体情報・測位・救援送信は物語内のシミュレーション。 */
(() => {
  'use strict';
  const D = window.HERO_EXTRA.config;
  let serial = 0;
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
    const email=HERO_STORY.ex.echoEmail;
    const mail=c.el('section','extra-mail');const head=c.el('header');head.append(c.el('strong','','差出人：エコー → マネージャー'),c.el('span','','件名：'+email.subject));
    const body=c.el('blockquote');
    email.body.forEach(paragraph=>body.append(c.el('p','',paragraph)));
    mail.append(head,body);target.append(mail);
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
    const loc=field(c,f,'place','向かう場所');const color=field(c,f,'color','調べる扉の実物の色',[{value:'red',label:'赤い扉'},{value:'green',label:'緑の扉'},{value:'blue',label:'青い扉'},{value:'yellow',label:'黄色の扉'}]);grid.append(loc.box,color.box);f.append(grid);submitButton(c,f,'行き先を報告する →');const fb=feedback(c);f.append(fb);
    f.addEventListener('submit',e=>{e.preventDefault();if(good(c,loc.input.value,['旧校舎地下機械室','旧校舎の地下の機械室','旧校舎地下の機械室'])&&color.input.value==='red'){c.complete(page.id,[loc.input.value,color.input.value]);lockForm(c,page,f,fb,'行き先と扉の色を特定しました。');}else fb.textContent='File-1・3・2・4の順で指示を読み直してください。場所は建物名から、色は実物の色で答えます。';});lockForm(c,page,f,fb);
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
  function renderEvidence(target,c){
    tabs(c,target,[
      {id:'directives',label:'指令履歴',render:p=>directivePanel(c,p)},
      {id:'doors',label:'扉の開閉時刻',render:p=>doorPanel(c,p)},
      {id:'routes',label:'通信経路・地下図',render:p=>routePanel(c,p)}
    ],'evidenceTab');
  }

  function unlock(page,target,c){
    page.paragraphs.forEach(t=>target.append(c.el('p','',t)));
    target.append(c.makeImage(page.image,page.imageLabel));
    target.append(button(c,'HERO LINKで過去の資料を開く',()=>c.openLink('materials'),'btn btn--outline'));

    const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const size=D.unlockCode.length;
    const step=360/alphabet.length;
    const wrap=index=>((index%alphabet.length)+alphabet.length)%alphabet.length;
    const progress=draft(c,page.id);
    let selected=Number.isInteger(progress.selected)?wrap(progress.selected):0;
    let letters=Array.isArray(progress.letters)?progress.letters.filter(x=>/^[A-Z]$/.test(x)).slice(0,size):[];
    let solved=completed(c,page);
    if(solved)letters=[...D.unlockCode];

    const f=formBase(c,target,page.id);
    f.classList.add('unlock-form');
    const slots=c.el('output','unlock-slots');
    slots.setAttribute('aria-label','確定した文字');
    slots.setAttribute('aria-live','polite');
    const position=c.el('p','unlock-position');
    position.setAttribute('aria-live','polite');
    const controls=c.el('div','unlock-controls');
    const lower=button(c,'前の文字',()=>change(selected-1),'btn btn--outline');
    const higher=button(c,'次の文字',()=>change(selected+1),'btn btn--outline');
    const confirm=button(c,'文字を確定',()=>{
      if(solved||letters.length>=size)return;
      letters.push(alphabet[selected]);fb.textContent='';persist();paint();
    });
    const back=button(c,'1文字戻す',()=>{
      if(solved||!letters.length)return;
      selected=alphabet.indexOf(letters.pop());fb.textContent='';persist();paint();
    },'btn btn--outline');
    const submit=submitButton(c,controls,'扉を解錠する');
    controls.prepend(lower,higher,confirm,back);
    const fb=feedback(c);
    if(solved){fb.textContent='解錠済みです。扉が開きました。';fb.classList.add('is-ok');}

    const ns='http://www.w3.org/2000/svg';
    function shape(tag,attrs,parent){
      const item=document.createElementNS(ns,tag);
      Object.entries(attrs).forEach(([name,value])=>item.setAttribute(name,String(value)));
      parent.append(item);
      return item;
    }
    const svg=c.el('div','unlock-dial');
    const face=shape('svg',{viewBox:'0 0 260 260','aria-hidden':'true'},svg);
    shape('circle',{cx:130,cy:130,r:111,class:'unlock-dial-base'},face);
    const wheel=shape('g',{},face);
    [...alphabet].forEach((letter,i)=>{
      const radians=i*step*Math.PI/180;
      const x=130+91*Math.sin(radians),y=130-91*Math.cos(radians);
      const label=shape('text',{x,y,transform:'rotate('+i*step+' '+x+' '+y+')'},wheel);
      label.textContent=letter;
    });
    shape('circle',{cx:130,cy:130,r:56,class:'unlock-dial-hub'},face);
    const current=shape('text',{x:130,y:132,class:'unlock-dial-letter'},face);
    shape('path',{d:'M 130,32 L 122,16 L 138,16 Z',class:'unlock-dial-marker'},face);

    f.prepend(c.el('h3','','英字のダイヤル'),c.el('p','','ダイヤルを回し、上の目印に合わせた文字を1つずつ確定してください。'),slots,svg,position);
    f.append(controls,fb);
    function persist(){progress.selected=selected;progress.letters=letters.slice();c.persist();}
    function change(index){
      if(solved)return;
      selected=wrap(index);fb.textContent='';persist();paint();
    }
    function paint(){
      wheel.setAttribute('transform','rotate('+(-selected*step)+' 130 130)');
      current.textContent=alphabet[selected];
      position.textContent='目印の文字：'+alphabet[selected]+' ／ 確定 '+letters.length+' / '+size;
      slots.replaceChildren(...Array.from({length:size},(_,i)=>c.el('span','',letters[i]||'–')));
      lower.disabled=higher.disabled=solved;
      confirm.disabled=solved||letters.length>=size;
      back.disabled=solved||letters.length===0;
      submit.disabled=solved||letters.length!==size;
      if(solved)submit.textContent='解錠済み ✓';
    }
    let drag=null;
    function pointerAngle(event){
      const rect=svg.getBoundingClientRect();
      const x=event.clientX-rect.left-rect.width/2;
      const y=event.clientY-rect.top-rect.height/2;
      return Math.hypot(x,y)<rect.width*.14?null:Math.atan2(x,-y)*180/Math.PI;
    }
    svg.addEventListener('pointerdown',event=>{
      if(solved||drag||event.button!==0)return;
      const angle=pointerAngle(event);
      if(angle===null)return;
      drag={id:event.pointerId,angle,start:selected,total:0,moved:false};
      svg.setPointerCapture?.(event.pointerId);
    });
    svg.addEventListener('pointermove',event=>{
      if(event.pointerId!==drag?.id)return;
      const angle=pointerAngle(event);
      if(angle===null)return;
      drag.total+=((angle-drag.angle+540)%360)-180;
      drag.angle=angle;
      drag.moved ||= Math.abs(drag.total)>4;
      selected=wrap(drag.start-Math.round(drag.total/step));
      paint();
    });
    function finish(event){
      if(event.pointerId!==drag?.id)return;
      const angle=pointerAngle(event);
      if(event.type==='pointerup'&&!drag.moved&&angle!==null)selected=wrap(drag.start+Math.round(angle/step));
      drag=null;
      persist();paint();
    }
    ['pointerup','pointercancel','lostpointercapture'].forEach(type=>svg.addEventListener(type,finish));
    f.addEventListener('submit',event=>{
      event.preventDefault();
      if(solved||letters.length!==size)return;
      const answer=letters.join('');
      if(answer!==D.unlockCode){
        fb.textContent='扉は開きません。文字の読み方と順番を見直してください。';
        return;
      }
      solved=true;
      persist();
      c.complete(page.id,[answer]);
      fb.classList.add('is-ok');
      fb.textContent='解錠。目の前の扉が開きました。';
      paint();
    });
    paint();
    hints(c,target,[
      '時計と、四角い表示。それぞれと同じ形が、これまでのミッションにも出てきました。',
      '時計はHARDのH1-07を見返しましょう。針が指す数字を、あの文字盤の同じ位置にある文字へ置き換えます。一つの時計の針は、どれも同じ文字を指します。',
      '四角い表示はNORMALの表示エラーと同じです。黒い部分と白い部分を入れ替え、見えた形を英字として読んでみましょう。',
      '時計、四角い表示、時計、四角い表示。用紙の左から順に並べます。'
    ]);
  }
  function render(page,target,c){
    const scenes={first,firstDoor,maze,documents,unlock};
    scenes[page.scene](page,target,c);
  }
  window.HERO_EXTRA_UI={render,renderEvidence};
})();
