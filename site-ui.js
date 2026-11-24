(() => {
 'use strict';
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const button=(c,text,fn,cls='btn btn--night')=>{const n=el('button',cls,text);n.type='button';n.addEventListener('click',fn);return n;};
 const copy=(target,texts)=>texts.forEach(t=>target.append(el('p','',t)));
 let activeLinkTab='mission';
 function resetImageZoom(){
  const img=document.getElementById('enlargedImage');
  img.style.width='100%';
  img.parentElement.scrollLeft=0;
  img.parentElement.scrollTop=0;
 }
 function bind(context){
  const guide=document.getElementById('guideDialog');
  document.querySelectorAll('[data-guide]').forEach(b=>b.addEventListener('click',()=>{const data=HERO_SITE.guides[b.dataset.guide];document.getElementById('guideTitle').textContent=data.title;const body=document.getElementById('guideContents');body.replaceChildren();copy(body,data.text.split('\n\n'));guide.showModal();}));
  document.getElementById('guideClose').addEventListener('click',()=>guide.close());guide.addEventListener('click',e=>{if(e.target===guide)guide.close();});
  const img=document.getElementById('enlargedImage');
  function resize(factor){
   const viewport=img.parentElement;
   const oldWidth=img.clientWidth||viewport.clientWidth||300;
   const width=Math.min(4000,Math.max(viewport.clientWidth,oldWidth*factor));
   const focusX=(viewport.scrollLeft+viewport.clientWidth/2)/oldWidth;
   const focusY=(viewport.scrollTop+viewport.clientHeight/2)/oldWidth;
   img.style.width=`${width}px`;
   viewport.scrollLeft=focusX*width-viewport.clientWidth/2;
   viewport.scrollTop=focusY*width-viewport.clientHeight/2;
  }
  document.getElementById('imageFit').addEventListener('click',resetImageZoom);
  document.getElementById('imageZoomIn').addEventListener('click',()=>resize(1.42));
  document.getElementById('imageZoomOut').addEventListener('click',()=>resize(1/1.42));
 }
 const hardQuestion=node=>({src:`assets/hard/h1-${node}.png`,title:'H1-'+node});
 function rememberHardQuestion(record,node){
  const asset=hardQuestion(node);
  if(record.journal.some(a=>a.src===asset.src))return false;
  record.journal.push(asset);
  return true;
 }
 function flow(page,target,c){
  c.save.flows||={};const solved=c.save.completedPuzzleIds.includes(page.id);const prior=c.save.flows[page.id]||{path:[{node:'01'}],end:null};const f=solved?JSON.parse(JSON.stringify(prior)):prior;if(!solved)c.save.flows[page.id]=f;
  const area=el('section','flip-area');const status=el('p','answer-feedback');status.setAttribute('role','status');target.append(el('p','puzzle-instruction',page.prompt),area,status);
  function render(){area.replaceChildren();const node=f.path[f.path.length-1].node;const history=el('nav','flow-history');history.setAttribute('aria-label','選択した小問の履歴');f.path.forEach((p,i)=>history.append(button(c,'H1-'+p.node,()=>{f.path=f.path.slice(0,i+1);f.end=null;c.persist();render();},'btn btn--subtle')));area.append(history);
   if(rememberHardQuestion(c.save,node))c.persist();
   const asset=hardQuestion(node);
   const meta=el('p','flow-step',`${asset.title} / ${f.path.length}問目`);area.append(meta,c.makeImage(asset.src,asset.title));
   if(!f.end){const group=el('div','flow-choices');for(const choice of HERO_SITE.flow[node].choices){const b=button(c,choice.label,()=>{if(solved)return;f.path[f.path.length-1].choice=choice.label;if(choice.next)f.path.push({node:choice.next});else f.end=choice.place;c.persist();status.textContent='';render();});b.disabled=solved;if(choice.image){const i=el('img');i.src='./'+choice.image;i.alt='';b.prepend(i);}if(choice.place)b.append(el('small','',HERO_SITE.places.find(p=>p[0]===choice.place)[1]+'へ'));group.append(b);}area.append(group);}
   else {const name=HERO_SITE.places.find(p=>p[0]===f.end)?.[1];area.append(el('p','route-arrival','到着地点：'+name));const form=el('form','answer-form');const set=el('fieldset','answer-choice-group');set.append(el('legend','','最後に着いた建物を報告してください'));HERO_SITE.places.forEach(([v,label])=>{const item=el('label','choice-item');const r=el('input');r.type='radio';r.name='flow-place';r.value=v;r.disabled=solved;r.checked=(c.save.answerEntries[page.id]||[])[0]===v;item.append(r,el('span','choice-name',label));set.append(item);});form.append(set);const send=el('button','btn btn--night',solved?'報告済み ✓':'この場所を報告する →');send.type='submit';send.disabled=solved;form.append(send);form.addEventListener('submit',e=>{e.preventDefault();const v=form.querySelector('input:checked')?.value;if(!v){status.textContent='場所を選択してください。';return;}if(v!==f.end){status.textContent='選んだ経路の到着地点と、報告する場所が一致しません。';return;}if(!['gym','old'].includes(v)||(page.stage==='second'&&v!=='old')){status.textContent='この場所では子どもたちを確認できませんでした。履歴から戻って別の道を確認してください。';return;}c.complete(page.id,[v]);c.navigatePage(c.index+1);});area.append(form);}
   if(f.path.length>1)area.append(button(c,'← ひとつ前の小問へ',()=>{f.end=null;f.path.pop();c.persist();status.textContent='';render();},'btn btn--outline'));
   if(f.end||f.path.length>1)area.append(button(c,'H1-01から見直す',()=>{if(solved)return;f.path=[{node:'01'}];f.end=null;c.persist();render();},'btn btn--subtle'));
  }render();c.renderHints(page,target);
 }
 function task(c,key){c.save.tutorialTasks||={};c.save.tutorialTasks[c.page.id]||={};c.save.tutorialTasks[c.page.id][key]=true;c.persist();const t=c.save.tutorialTasks[c.page.id];if(t.notifications&&t.materials)c.complete(c.page.id,['notifications','materials']);const feedback=document.getElementById('tutorialStatus');if(feedback)feedback.textContent=c.save.completedPuzzleIds.includes(c.page.id)?'操作を確認しました。次へ進めます。':'通知と資料の両方を確認してください。';}
 function tutorial(page,target,c){copy(target,page.paragraphs);const box=el('div','tutorial-box');box.append(el('h3','','HERO LINKを使ってみよう'),button(c,'1．通知・指令を開く',()=>c.openLink('notifications')),button(c,'2．資料を開く',()=>c.openLink('materials')));const fb=el('p','answer-feedback',c.save.completedPuzzleIds.includes(page.id)?'確認済みです。次へ進めます。':'通知と資料を開くと、次へ進めます。');fb.id='tutorialStatus';fb.setAttribute('role','status');box.append(fb);target.append(box);}
 function introDone(target,c){target.append(el('p','','共通プロローグはここまでです。EASY・NORMAL・HARDは同じ一日の出来事を、好きな順でプレイできます。'),button(c,'ミッションへ進む →',()=>c.finishIntro()));}
 function normalMission(page,target,c){target.append(el('p','puzzle-instruction',page.prompt),c.makeImage(page.image,page.title),button(c,'HERO LINKで連絡相手を選ぶ →',()=>c.openLink('mission')));if(c.save.completedPuzzleIds.includes(page.id))target.append(el('p','answer-feedback is-ok','連絡先を確認済みです。次へ進めます。'));}
 function contact(page,target,c){
  copy(target,page.paragraphs.slice(0,2));const done=c.save.completedPuzzleIds.includes(page.id);
  target.append(el('p','',done?'エコーが指令を受信し、対応を開始しました。HERO LINKから通信記録を読み返せます。':'HERO LINKを開いてエコーへ連絡し、応答を確認しましょう。'),button(c,done?'HERO LINKで通信記録を開く':'HERO LINKでエコーへ連絡する',()=>c.openLink('mission')));
 }
 function contactPanel(page,target,c){
  const done=c.save.completedPuzzleIds.includes(page.id);c.save.contactChannel||={stage:done?6:Math.min(c.save.contactStep||0,2)};const channel=c.save.contactChannel;if(done)channel.stage=6;
  const wrap=el('section','contact-channel');target.append(wrap);let timer;
  const live=()=>wrap.isConnected&&document.getElementById('heroLinkDialog').open&&c.save.currentPageId===page.id;
  function setStage(stage){channel.stage=stage;if(stage===6){c.save.contactStep=3;c.complete(page.id,['sent','received','responded']);if(!c.save.notifications.some(n=>n.id==='n-response'))c.save.notifications.push({id:'n-response',title:'エコーより：指令を受信、対応開始',body:'通常の隊員通信でエコーの受信・応答を確認。会場付近の安全確認に向かっています。',read:false});}c.persist();draw();}
  function bubble(who,text,side){const item=el('article','contact-bubble contact-bubble--'+side);item.append(el('small','',who),el('p','',text));wrap.append(item);}
  function draw(){clearTimeout(timer);wrap.replaceChildren();const stage=channel.stage;const header=el('div','contact-channel-head');header.append(el('strong','','エコー／響ヶ丘学園担当'),el('span','',stage===6?'対応開始':stage?'通信中':'待機中'));wrap.append(header);const status=el('p','contact-channel-status');status.setAttribute('role','status');status.textContent=['送信先を確認しました。','指令を送信しました。受信を確認しています…','エコーが受信しました。','応答を待っています…','エコーから応答がありました。','位置と通報内容を送信しました。','応答あり：対応開始。'][stage];wrap.append(status);
   if(stage>=1)wrap.append(el('p','contact-system','✓ 指令を送信しました。'));
   if(stage>=2){wrap.append(el('p','contact-system','✓ エコーが受信しました。'));bubble('あなた',page.paragraphs[6],'self');bubble('エコー',page.paragraphs[7],'echo');}
   if(stage>=3)bubble('あなた',page.paragraphs[8],'self');
   if(stage>=4)bubble('エコー',page.paragraphs[10],'echo');
   if(stage>=5)bubble('あなた','響ヶ丘学園の会場付近です。15時30分、不審者の目撃情報。危険物を持っている可能性があります。','self');
   if(stage>=6){bubble('エコー',page.paragraphs[12],'echo');wrap.append(el('p','contact-system','✓ 受信・応答を確認。エコーが警備担当と合流し、対応を開始します。'),button(c,'活動記録を確認する',()=>c.openLink('activity'),'btn btn--outline'),button(c,'通信を閉じる',()=>{c.closeLink();c.refresh();}));}
   const actions={0:['エコーへ指令を送る',1],2:['状況を伝える',3],4:['場所と通報内容を送る',5]};if(actions[stage])wrap.append(button(c,actions[stage][0],()=>setStage(actions[stage][1])));
   if([1,3,5].includes(stage))timer=setTimeout(()=>{if(live())setStage(stage+1);},650);
  }draw();
 }
 function rescueRecordCard(record,open){
  const card=el('details','notification-card rescue-record');card.open=open;
  card.append(el('summary','','救援受付記録 '+record.id));
  const fields=el('dl','rescue-record-fields');
  const entries=[['発信者区分',record.sender],['信号',record.signal],['通報内容',record.message],
   ['分類先',record.classification],['受理番号',record.id],['担当',record.hero]];
  entries.forEach(([label,value])=>fields.append(el('dt','',label),el('dd','',value)));
  const history=el('ol','rescue-record-history');
  record.history.forEach(([clock,message])=>{
   const step=el('li');const time=el('time','',clock);time.dateTime=clock;
   step.append(time,el('span','',message));history.append(step);
  });
  card.append(fields,el('h4','','対応履歴'),history);
  return card;
 }
 function hardQuestionArchive(target,c,record){
  const nodes=Object.keys(HERO_SITE.flow).sort();
  const viewed=nodes.filter(node=>record.journal.some(a=>a.src===hardQuestion(node).src));
  if(!viewed.length&&!record.cleared)return false;
  const section=el('section','hard-question-archive');
  const saved=el('div','hard-question-list');
  const makeButton=(node,show)=>button(c,hardQuestion(node).title,show,'btn btn--outline');
  const addSaved=node=>saved.append(makeButton(node,()=>open(node)));
  function open(node){
   const asset=hardQuestion(node);
   c.openImage(asset.src,asset.title);
   if(rememberHardQuestion(record,node))c.writeSave('hard',record);
  }
  viewed.forEach(addSaved);
  section.append(el('h4','','HARD-01の小問'),saved);
  const unseen=nodes.filter(node=>!viewed.includes(node));
  if(record.cleared&&unseen.length){
   const review=el('details','hard-question-review');
   const choices=el('div','hard-question-list');
   review.append(el('summary','','未閲覧の分岐を見直す'),choices);
   unseen.forEach(node=>{
    const entry=makeButton(node,()=>{
     open(node);
     entry.remove();
     addSaved(node);
     if(!choices.children.length)review.remove();
    });
    choices.append(entry);
   });
   section.append(review);
  }
  target.append(section);
  return true;
 }
 function materials(target,c,page){
  target.append(el('h3','','入手した資料'));
  const normal=c.courseId==='normal'?c.save:c.loadSave('normal');
  const viewingTutorial=page?.tutorial==='normal';
  let count=0;
  if(viewingTutorial||normal.cleared||normal.tutorialTasks?.['n-tutorial']?.materials||normal.completedPuzzleIds.includes('n-tutorial')){
   target.append(rescueRecordCard(c.courses.normal.rescueRecord,viewingTutorial));
   count++;
  }
  Object.entries(c.courses).forEach(([id,course])=>{
   const record=id===c.courseId?c.save:c.loadSave(id);
   if(id==='hard'&&hardQuestionArchive(target,c,record))count++;
   const assets=record.journal.filter(asset=>id!=='hard'||!/^assets\/hard\/h1-0[1-8]\.png$/.test(asset.src));
   if(record.cleared)course.pages.forEach(page=>{
    if(page.image&&page.type!=='flow'&&!assets.some(asset=>asset.src===page.image)){
     assets.push({src:page.image,title:page.imageLabel||page.title});
    }
   });
   assets.forEach(asset=>{
    count++;
    target.append(button(c,id.toUpperCase()+'：'+asset.title,()=>c.openImage(asset.src,asset.title),'btn btn--outline material-button'));
   });
  });
  if(page?.tutorial==='intro'){
   const demo=el('article','notification-card');
   demo.append(el('h4','','学園祭・協力メンバー向けの案内'),el('p','','通知は履歴に残ります。入手した資料は、この一覧から再確認できます。'));
   target.prepend(demo);
  }else if(!count)target.append(el('p','','物語で資料を入手すると、この一覧に追加されます。'));
 }
 function tabs(target,items,selected,onSelect){const bar=el('nav','extra-tabs');bar.setAttribute('aria-label','HERO LINKの機能');const panel=el('section','link-panel');const controls=[];items.forEach(item=>{const b=button(null,item.label,()=>open(item.id),'');controls.push([item,b]);bar.append(b);});target.append(bar,panel);function open(id){const item=items.find(x=>x.id===id)||items[0];controls.forEach(([a,b])=>b.setAttribute('aria-pressed',String(a.id===item.id)));panel.replaceChildren();activeLinkTab=item.id;onSelect?.(item.id);item.render(panel);}open(selected);}
 function link(target,c,page,requested){
  const active=page&&c.courseId;const items=[{id:'mission',label:'通知・指令',render:p=>{p.append(el('h3','','現在の任務'),el('p','',active?c.courses[active].title+'／'+page.title:'ミッションを選択してください。'));if(page?.id==='n-last')c.renderPuzzle(page,p);if(page?.type==='contact')contactPanel(page,p,c);}},
   {id:'notifications',label:'通知履歴',render:p=>{p.append(el('h3','','届いた通知'));let count=0;Object.keys(c.courses).forEach(id=>{const r=id===c.courseId?c.save:c.loadSave(id);r.notifications.forEach(n=>{count++;const card=el('article','notification-card');card.append(el('small','',id.toUpperCase()),el('h4','',n.title),el('p','',n.body));if(!n.read)card.append(button(c,'既読にする',()=>{n.read=true;c.writeSave(id,r);card.classList.add('is-read');},'btn btn--outline'));p.append(card);});});if(!count)p.append(el('p','','まだ通知はありません。'));}},
   {id:'materials',label:'資料',render:p=>materials(p,c,page)},
   {id:'activity',label:'活動記録',render:p=>{p.append(el('h3','','ミッションの進捗'));Object.keys(c.courses).forEach(id=>{const r=id===c.courseId?c.save:c.loadSave(id);p.append(el('p','',id.toUpperCase()+'：'+(r.cleared?'CLEAR':r.started?'挑戦中':'未挑戦')));});}},
   {id:'board',label:'掲示板',render:p=>window.HERO_BOARD.render(p)}];
  if(c.courseId==='extra'&&c.save.completedPuzzleIds.includes('x-documents'))items.push({id:'investigate',label:'記録調査',render:p=>HERO_EXTRA_UI.renderEvidence(p,c)});
  tabs(target,items,requested||activeLinkTab,id=>{if(page?.type==='tutorial'&&['notifications','materials'].includes(id))task(c,id);});
 }
 window.HERO_UI={bind,resetImageZoom,button,flow,tutorial,introDone,normalMission,contact,link};
})();
