/* V4 integration. NORMAL n-02 remains replaceable in data/normal.js. */
(() => {
 const S=window.HERO_STORY;
 for(const c of [HERO_EASY,HERO_NORMAL,HERO_HARD]) c.pages=c.pages.map(p=>{
   const script=S.scripts[p.id];const out={...p};
   if(script){out.title=script.title;out.paragraphs=script.paragraphs;delete out.afterAlert;delete out.notification;}
   if(S.notices[p.id])out.notification={system:'HERO LINK',...S.notices[p.id]};
   return out;
 });
 window.HERO_PROLOGUE={id:'prologue',title:'もうひとつの学園祭',pages:S.intro};
 const n=HERO_NORMAL.pages.find(p=>p.id==='n-opening');
 const at=n.paragraphs.findIndex(t=>t.includes('担当者が、HERO LINKの画面を開いた'));
 const alarm=n.paragraphs.findIndex(t=>t.includes('その言葉を遮るように'));
 const tutorial=n.paragraphs.slice(at,alarm-1);
 const rest=['案内を閉じたところで、警告音が鳴った。',...n.paragraphs.slice(alarm+1)];
 n.paragraphs=n.paragraphs.slice(0,at);delete n.image;
 HERO_NORMAL.pages.splice(1,0,{id:'n-tutorial',type:'tutorial',tutorial:'normal',label:'N-00 / HERO LINK',title:'声を届ける準備',paragraphs:tutorial},{id:'n-alert',type:'story',label:'N-00 / 緊急通信',title:'読めない通信ログ',paragraphs:rest,image:'assets/normal/n-log-revision02.svg'});
 HERO_NORMAL.pages.find(p=>p.id==='n-dispatch').type='contact';
 const comparison={image:'assets/hard/corridor-camera-comparison.png',imageLabel:'通路の標識と監視カメラの比較'};
 const hardReady=HERO_HARD.pages.find(p=>p.id==='h-ready');
 Object.assign(hardReady,comparison,{note:'小問は同じページで切り替わります。選択履歴から前の小問を見直せます。'});
 Object.assign(HERO_HARD.pages.find(p=>p.id==='h-failure'),comparison);
 HERO_HARD.pages.find(p=>p.id==='h-retry-intro').note='同じ小問を、赤と緑を補正してもう一度たどってください。';
 HERO_HARD.pages.filter(p=>p.type==='map').forEach(p=>{p.type='flow';p.prompt='小問の答えを2択から選び、最後に着いた建物を報告してください。選択した経路は保存されます。';p.hints=['赤から緑の向きで読み、意味が通る方を選びます。監視画像の色と、実際に見た色の関係も確認しましょう。','H1-08では、直前の問題画像のインク汚れに戻って確かめてください。前の小問へ戻ることができます。'];});
 const story=(id,title,paras,label='EXTRA / STORY')=>({id,type:'story',title,paragraphs:paras,label});
 const old=Object.fromEntries(HERO_EXTRA.pages.map(p=>[p.id,{...p}]));
 old['x-first'].paragraphs=S.ex.mail;old['x-first'].title='消えた数字、4つのFile';
 old['x-last'].paragraphs=S.ex.unlock;
 HERO_EXTRA.pages=[
  {...story('x-opening','後夜祭を前に',S.ex.opening),notification:{system:'HERO LINK',...S.notices['x-opening']}},
  old['x-first'],old['x-first-door'],story('x-door-story','赤い扉の向こう',S.ex.door),
  story('x-control','制御室の地図',S.ex.control),old['x-second'],old['x-documents'],
  story('x-third','装備保管室へ',S.ex.investigation,'EX-03 / Third Mission'),
  story('x-confront','かつてのヒーロー',S.ex.confrontation),
  old['x-last'],
  {...story('x-rescue','今度は、届いた',S.ex.rescue),notification:{system:'HERO LINK',...S.notices['x-rescue']}},
  story('x-thanks','あなたのヒーロー',S.ex.thanks),story('x-return','帰り道',S.ex.return),
  story('x-epilogue','もうひとつの学園祭へ',S.ex.epilogue),old['x-clear']
 ];
 HERO_EXTRA.pages.find(p=>p.id==='x-door-story').paragraphs=S.ex.firstResult.concat(S.ex.door);
 window.HERO_SITE={version:6,
  flow:{
   '01':{choices:[{label:'機械',image:'assets/hard/machine.png',next:'02'},{label:'離島',image:'assets/hard/island.png',next:'05'}]},
   '02':{choices:[{label:'50',next:'03'},{label:'100',place:'library'}]},
   '03':{choices:[{label:'P',next:'04'},{label:'H',place:'dining'}]},
   '04':{choices:[{label:'N',next:'08'},{label:'S',place:'admin'}]},
   '05':{choices:[{label:'12',next:'06'},{label:'17',place:'hall'}]},
   '06':{choices:[{label:'43',next:'07'},{label:'45',place:'storage'}]},
   '07':{choices:[{label:'M',next:'08'},{label:'R',place:'lab'}]},
   '08':{choices:[{label:'S',place:'gym'},{label:'T',place:'old'}]}
  },
  places:[['gym','体育館'],['old','旧校舎'],['lab','研究棟'],['storage','資材倉庫'],['hall','放送室'],['library','図書室'],['dining','食堂'],['admin','管理棟'],['greenhouse','温室']],
  guides:{
   synopsis:{title:'あらすじ',text:'誰かのヒーローに、なりたい。\n\n今日は、待ちに待ったりえ高祭。\n会場へ向かうあなたのスマートフォンに、見知らぬ通知が届く。\n\n画面に触れた次の瞬間、目の前に広がっていたのは、知らない学園の風景だった。\n\nここ、響ヶ丘学園では、年に一度の学園祭が開かれていた。\n\n昔からヒーローたちに守られてきたこの街では、毎年この時期になると、たくさんのヒーローたちが学園に集まる。\n\nヒーローが大好きな子どもたち。\nヒーローに憧れる学生たち。\n誰もが、幸せな一日を過ごしていた――はずだった。\n\n帰り道を探すあなたが出会ったのは、どこか聞き覚えのある声のヒーロー、エコー。\n\n彼女の困り事を、少しだけ手伝うつもりだった。\n始まりは、ほんの些細な出来事。\nしかし、それをきっかけに、次々と事件が巻き起こる。\n\nやがて、子どもたちが。\nそして、ヒーローたちまでもが姿を消してしまった。\n\n平和な学園祭の裏で、何が起きているのか。\nあなたは謎を解き明かし、元の世界へ帰れるのか。\n\nすべての謎を解き明かした先で、あなたを待つものとは――。'},
   how:{title:'遊び方',text:'EASY・NORMAL・HARDは、どのミッションからでも始められます。\n初めての方は、EASYからのプレイがおすすめです。\n\n物語を読み、画面の指示に従って謎を解き、解答を入力してください。\n\nEASY・NORMAL・HARDの3つのミッションをクリアすると、EXTRAミッションが解放されます。\n\n画面の「HERO LINK」ボタンから、ミッションの進捗や届いた通知、入手した重要な資料を確認できます。\n\nほかのプレイヤーと協力して進めることもできます。\nHERO LINKの掲示板では、解答や物語の核心に触れない範囲で、声を掛け合ってみてください。\n\n進捗は現在のブラウザに保存されます。作中人物への連絡は物語上の演出です。掲示板の投稿は実際の参加者と共有されます。'},
   caution:{title:'注意事項',text:'本プログラムは、開催期間中、同じ内容で実施します。\n\nSNSやブログなどで、謎の解答・解法や物語の重要な展開を公開することはお控えください。\nHERO LINKの掲示板でも、同様にネタバレとなる投稿はおやめください。\n\n本プログラムは、すべてスマートフォンなどの端末上で完結します。\n実際のりえ高祭の進行とは関係ありません。会場内の物を使ったり、出演者・スタッフ・関係者の皆さまに接触したりする必要のある問題は、一切ありません。\n\n本プログラムは、ファン有志による非公式企画です。りえ高祭の主催者・出演者・関係者へのお問い合わせはお控えください。\n\n後半のミッションは難易度が高めです。\n新米ヒーローの皆さまは、ぜひ、ほかの新米ヒーローの皆さまと協力しながらお楽しみください。\n\nRIEを守って、楽しくご参加ください。'}
  }
 };
})();
