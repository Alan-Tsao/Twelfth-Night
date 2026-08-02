window.FEATURE_CONFIG = { mode: "daily", count: 3 };

window.allCasts = [
  {
    name: "圖圖",
    image: "images/staff-01.jpg",
    desc: "第十二夜的店長，掌管夢境入口與今夜的燈火。擅長以溫柔而帶有儀式感的節奏，引導客人沉入會館氛圍；雖不接受一般指名，仍會在特別的夜晚，以香檳 CALL 與輕 RP 為夢境添上一筆華麗的光。",
    shortDesc: "夢境店長、香檳 CALL、輕 RP。",
    quote: "我與你的距離，只有一場夢。",
    tags: ["店長","輕 RP","香檳CALL"],
    filterTags: ["chat", "rp", "champagne","bar"],
    status: "unbookable",
    statusLabel: "不接受指名",
    role: "店長",
    workDays: [5, 6],
    recommended: "",
    extraServices: [],
  },
  {
    name: "咕嚕小貓",
    image: "images/staff-02.jpg",
    desc: "像午夜裡露出尾巴的小惡魔，咕嚕小貓帶著一點調皮、一點誘惑，也帶著讓人放鬆下來的陪伴感。適合輕中 RP、陪聊互動，以及喜歡曖昧夜色氛圍的客人。",
    shortDesc: "輕/中 RP、陪聊互動、小惡魔氛圍。",
    quote: "午夜的惡魔，把手放在我身上吧。",
    tags: ["輕/中 RP", "陪聊互動", "小惡魔氛圍"],
    filterTags: ["chat","rp","champagne"],
    status: "available",
    statusLabel: "接受指名",
    role: "公關",
    workDays: [6],
    recommended: "陪聊",
    extraServices: [ ],
  },
  {
    name: "傑傑諾利",
    image: "images/staff-03.jpg",
    desc: "擅長以細膩而不急不徐的節奏陪您度過夜晚。無論是談話、留影，或是一段只獻給您的歌，都願為這場相遇留下值得珍藏的回憶。",
    shortDesc: "溫柔陪席、拍立得、獻唱錄音。",
    quote: "今晚的月色真美呢。",
    tags: ["輕 RP","調酒師","攝影師", "陪聊互動", "拍立得", "獻唱錄音"],
    filterTags: ["chat","rp","champagne","bar","masaji","personal"],
    status: "available",
    statusLabel: "接受指名",
    role: "攝影師",
    workDays: [5,6],
    recommended: "",
    extraServices: ["拍立得", "唱歌錄音"],
        personalMenu: [
      {
        title: "🔲｜拍立得 ",
        desc: "為精彩的回憶...留下點印記吧？",
        price: "無簽 3萬G、有簽 8萬G"
      },
      {
        title: "🎙️｜唱歌 (錄音)",
        desc: "這首曲子，只獻給你。",
        price: "副歌一段 70萬"
      },
    ]
  },
  {
    name: "阿希Axi",
    image: "images/staff-04.jpg",
    desc: "阿希 Axi 隨時都可能在喝酒……但他喝完酒後就是個陪聊與互動的天才，能在談笑和豪飲中替夜晚召來一點不可思議的歡愉。甚至在喝醉酒後，還會現場表演「假裝通靈」。若您想聽故事，或親眼見識〈海都麻醉師〉的獨特氣場，他會用帶點胡鬧且充滿個人氣息的節奏，陪您進入一場不太正經、卻絕對難忘的美夢。 ",
    shortDesc: "陪聊、通靈、特殊互動。",
    quote: "今晚獻給你，希望你能從中得到少許歡愉",
    tags: ["輕 RP", "特殊互動"],
    filterTags: ["rp", "chat", "game","champagne"],
    status: "available",
    statusLabel: "接受指名",
    role: "公關",
    workDays: [6],
    recommended: "陪聊、通靈 RP、特殊互動",
    extraServices: ["通靈", "臭罵倒", "陪酒", "說故事"],
    personalMenu: [
      {
        title: "👻 通靈",
        desc: "幫你把〈海都麻醉師〉給通靈過來。通靈過後解鎖更多項目：陪酒、臭罵倒、聽故事。",
        price: "一次 8千G"
      },
      {
        title: "🤬 臭罵倒",
        desc: "通靈後解鎖。讓你見識一下什麼叫做真男人！",
        price: "一次 2萬G"
      },
      {
        title: "🍻 陪酒",
        desc: "通靈期時段內可體驗。麻醉師先生很喜歡喝酒，所以基本上不需要特別要求。",
        price: "通靈期間免費"
      },
      {
        title: "🌮 聽故事",
        desc: "來聽聽海都麻醉師的冒險故事。想完整體驗歡愉，聽故事也是其中一環。",
        price: "通靈期間隨意給小費"
      }
    ]
  },
  {
    name: "花形",
    image: "images/staff-05.jpg",
    desc: "夢境裡的貓魅公關，平時溫柔安靜，語尾偶爾會悄悄落下一聲喵。擅長陪客人慢慢聊天、玩小遊戲，也能在香檳 CALL、演奏與上車舞中替夜晚點亮氣氛。適合想被細膩陪伴，也想偶爾熱鬧一下的客人。",
    shortDesc: "安靜陪伴、小遊戲、香檳 CALL。",
    quote: "不必急著說話，今晚的燈會替您慢慢沉澱。",
    tags: ["輕 RP", "安靜陪伴", "聊天談心", "小遊戲", "香檳 CALL", "演奏", "上車舞"],
    filterTags: ["rp", "chat", "cute", "champagne", "game", "music","personal"],
    status: "pending",
    statusLabel: "排班確認中",
    role: "公關",
    workDays: [5],
    recommended: "聊天談心、小遊戲、香檳 CALL",
    extraServices: ["香檳 CALL", "小遊戲", "上車舞", "演奏", "小故事"],
    personalMenu: [
      {
        title: "🍾｜單人香檳CALL ",
        desc: "每一位主人都值得擁有專屬的登場時刻。微醺開場，讓今晚的氣氛一口氣升溫。",
        price: "依店家報價"
      },
      {
        title: "🪭｜上車舞",
        desc: "上車的不只是節奏，也是今晚悄悄靠近的浪漫。",
        price: "一次10萬 G"
      },
      {
        title: "🎻｜演奏",
        desc: "一段旋律，一場不願醒來的夜晚。歌曲目前採隨機演奏，暫不開放指定曲目。",
        price: "依現場狀況"
      },
      {
        title: "🌮｜小故事",
        desc: "從某次因緣際會下，學會了把奇妙、溫柔或有點無厘頭的故事，說給願意停下來的客人聽。",
        price: "陪伴中無料"
      },
      {
        title: "🕹️｜小遊戲",
        desc: "有些相遇，從一場遊戲開始。適合想放鬆互動、炒熱氣氛，或不知道該聊什麼的夜晚。",
        price: "陪伴中無料"
      },
      {
        title: "🌙｜靜夢席",
        desc: "今晚不用努力說話也沒關係。我會在這裡，替您把杯子添滿。若您想開口，我就聽；若您想安靜，我就陪您安靜。",
        price: "陪伴中無料"
      }
    ]
  },
  {
    name: "系塔",
    image: "images/staff-06.jpg",
    desc: "今晚醉人的不一定是酒，也可能是一段剛剛好的談話。系塔擅長用沉穩又帶點曖昧的節奏陪伴客人，適合想聊天、放鬆，或尋找夜色氛圍的人。",
    shortDesc: "成熟陪聊、談心交流、微醺氛圍。",
    quote: "不喝酒，因為今晚要醉的人是你。",
    tags: ["輕 RP","談心交流", "成熟陪聊", "微醺氛圍"],
    filterTags: ["rp","chat","champagne","personal"],
    status: "available",
    statusLabel: "接受指名",
    role: "公關",
    workDays: [5, 6],
    recommended: "談心交流、成熟陪聊",
    extraServices: ["談心交流"],
    personalMenu: [
      {
        title: "🎤｜親名語音",
        desc: "60秒只屬於你的點歌機。",
        price: "一首 100萬"
      },
    ]
  },
  {
    name: "露娜弗蕾亞",
    image: "images/staff-09.jpg",
    desc: "她調的不是酒，是撫慰靈魂的解藥。露娜弗蕾亞以調酒師的身份守在吧檯後，為每位來客調製屬於今晚的味道。",
    shortDesc: "調酒、吧檯服務、靈魂療癒。",
    quote: "我調的不是酒，是撫慰靈魂的解藥。",
    tags: ["輕 RP","調酒師","吧檯服務", "酒館氛圍"],
    filterTags: ["rp","bar","chat","champagne","masaji"],
    status: "unbookable",
    statusLabel: "不接受指名",
    role: "調酒師",
    workDays: [5, 6],
    recommended: "調酒、吧檯服務、酒館氛圍",
    extraServices: ["調酒"]
  },
  {
    name: "柔夜",
    image: "images/staff-10.jpg",
    desc: "她像夜裡輕輕落下的柔光，不急著靠近，卻讓人慢慢安心。擅長談心交流、輕 RP 與溫柔陪伴，願陪您在盛會中留下一場好夢。",
    shortDesc: "溫柔陪聊、輕 RP、談心交流。",
    quote: "希望您在盛會獲得一個美好的夢境。",
    tags: ["輕 RP", "溫柔陪聊", "談心交流"],
    filterTags: ["rp","chat","personal"],
    status: "available",
    statusLabel: "接受指名",
    role: "公關",
    workDays: [5, 6],
    recommended: "輕 RP、談心交流",
    extraServices: [],
    personalMenu: [
      {
        title: "⚔️｜紛爭前線歡樂陪打",
        desc: "勝負交給戰場，快樂交給我們。不能保證第一，但會陪您一起衝、一起笑，把每一場紛爭都打成不孤單的回憶。",
        price: "25萬/一場"
      },
      {
        title: "🗡️｜極本陪打(除6.0極本)",
        desc: "若今晚想挑戰更高難度的夢，就讓我陪您一同前往。無論是練習、通關，還是把獎勵帶回家，都願陪您穩穩走完這場戰鬥。",
        price: "一飯/30萬"
      },
    ]
  },
  {
    name: "兔紙不吃紙",
    image: "images/staff-11.jpg",
    desc: " 點名前請詳閱公開說明書：偶爾製造冷空氣，可使全球暖化速度減緩。活潑、親切、反應快，適合想找人聊天、玩鬧、輕鬆互動，或讓包廂氣氛更熱鬧的客人。",
    shortDesc: "冷笑話、隨性、混沌系。",
    quote: "嗨！要一起玩嗎？玩誰都行。",
    tags: ["輕 RP", "談心交流", "冷笑話", "隨性", "混沌系"],
    filterTags: ["rp", "chat","champagne"],
    status: "available",
    statusLabel: "接受指名",
    role: "公關",
    workDays: [6],
    recommended: "談心交流",
    extraServices: []
  },
  {
    name: "千反田",
    image: "images/staff-12.jpg",
    desc: "第十二夜的經理，擅長以沉穩細膩的語調，引導客人在夢境之中慢慢說出心裡的話。比起熱鬧喧嘩，更適合安靜談心、情緒整理與深度交流；雖不接受一般指名，仍會在需要時，為迷路的旅人點亮一盞溫柔的燈。",
    shortDesc: "夢境經理、談心交流、溫柔引導。",
    quote: "在這個夢境當中，您渴望看見什麼呢？",
    tags: ["經理","輕 RP","談心交流", "溫柔引導", "沉穩", "夢境系"],
    filterTags: ["rp","chat","bar"],
    status: "unbookable",
    statusLabel: "不接受指名",
    role: "經理",
    workDays: [5, 6],
    recommended: "談心交流",
    extraServices: ["談心交流"]
  },
  {
    name: "權順榮",
    image: "images/staff-13.jpg",
    desc: "自稱最後一隻老虎，卻意外適合替人帶路。擅長青魔技能、深層迷宮帶隊，能在挑戰與閒聊之間找到剛好的節奏，陪你把今晚變成一段值得記住的旅程。",
    shortDesc: "深沉迷宮、死宮、天宮。",
    quote: "大韓民國最後一隻老虎。",
    tags: ["輕 RP", "迷宮討伐", "青魔傳授"],
    filterTags: ["rp","dung","chat","champagne","personal"],
    status: "available",
    statusLabel: "接受指名",
    role: "公關",
    workDays: [5, 6],
    recommended: "迷宮討伐、青魔傳授",
    extraServices: ["迷宮討伐", "青魔傳授"],
    personalMenu: [
      {
        title: "🎩｜青魔傳授",
        desc: "看過一次，就變成我的技能。",
        price: "一個技能10萬"
      },
      {
        title: "💀｜迷宮討伐",
        desc: "今晚的目標：登上第100層。✦ 深層100層過關：沒過不用錢!!!",
        price: "死宮100萬、天宮150萬、優宮200萬"
      },
    ]
  },
  {
    name: "夏末微涼",
    image: "images/staff-14.jpg",
    desc: "願今晚與夢一般香甜。夏末微涼擅長用溫柔的節奏陪伴客人，無論是談心、輕 RP，或只是安靜坐一會兒，都能讓夜色變得柔和。",
    shortDesc: "溫柔陪聊、輕 RP、談心交流。",
    quote: "願今晚與夢一般香甜",
    tags: ["輕 RP", "溫柔陪聊", "談心交流"],
    filterTags: ["rp","chat","masaji"],
    status: "available",
    statusLabel: "接受指名",
    role: "公關",
    workDays: [5, 6],
    recommended: "輕 RP、談心交流",
    extraServices: [],
    personalMenu: [
      {
        title: "👂｜夢語寄存",
        desc: "「將那些不願被他人知曉的話語，悄悄留在夢境之中」「無論是黑歷史、戀慕、遺憾，或是埋藏已久的秘密，都歡迎向我傾訴」※此服務以單向告解為主，我將作為夢境的收納者靜靜聆聽，不給予評價，只會嗯恩的回應※採用雙重保密機制：職業道德，以及我金魚等級的記憶力",
        price: "20分鐘 12萬 指名中免費 "
      },
      {
        title: "🗣️｜夢間夜談",
        desc: "「若您不只是想傾訴，而是希望有人陪伴著整理思緒，那麼請在此稍作停留」「我將以溫柔且真誠的方式與您交談，傾聽您的故事、煩惱與心事」「或許無法給出完美答案，但願能成為您漫長夜晚中的一盞小燈」「當夢醒之後，希望您能帶著比來時更加輕鬆的心情離開」※本服務包含互動對談與回應，適合想聊聊天或尋求陪伴的旅人",
        price: "20分鐘 20萬 指名中免費"
      },
    ]
  },
  {
    name: "夜店點牛奶",
    image: "images/staff-15.jpg",
    desc: "像深夜裡一杯溫柔的牛奶，安靜卻能讓人慢慢放下疲憊。擅長談心交流與輕 RP 陪伴，適合想找個人安靜聊天、整理心情，或在夜色中稍微休息一下的客人。",
    shortDesc: "談心交流、輕 RP、夢境同行。",
    quote: "願此處的夜色能撫平你片刻的疲憊。",
    tags: ["輕 RP", "談心交流"],
    filterTags: ["chat", "rp","champagne","personal"],
    status: "available",
    statusLabel: "接受指名",
    role: "公關",
    workDays: [5, 6],
    recommended: "談心交流",
    extraServices: [],
    personalMenu: [
      {
        title: "🌐｜夢中夢",
        desc: "不想只停留在此刻的夢境嗎？那就讓我陪您沉入更深一層的世界。可外出同行至 6.0 初期地圖，陪您日隨、閒聊、散步、拍照，或只是一起在夜色裡慢慢走一段路。※ 拍照與 PVP 非專精項目，歡迎先與本人確認後再體驗。",
        price: "30分鐘 25萬"
      },
    ]
  },
  {
    name: "山茶花",
    image: "images/staff-16.jpg",
    desc: "像一朵靜靜盛開在夜裡的山茶花，溫柔卻有自己的審美。擅長服裝穿搭、氣質調整與談心陪伴，讓每一套衣裝都成為今晚的另一種心情。",
    shortDesc: "穿搭、談心、活動主持。",
    quote: "你是我的月神嗎。",
    tags: ["服裝店員","輕 RP","服裝穿搭", "談心交流"],
    filterTags: ["rp","ootd", "chat","personal"],
    status: "unbookable",
    statusLabel: "不接受指名",
    role: "服裝店員",
    workDays: [5, 6],
    recommended: "談心交流、服裝搭配",
    extraServices: ["服裝搭配", "談心交流"],
    personalMenu: [
      {
        title: "👗｜服裝搭配 ",
        desc: "深宵換裝，讓夜晚成為你的時裳。配到滿意!",
        price: "一套20萬"
      },
      {
        title: "♥️｜談心交流",
        desc: "夜色深處，安放未曾言說的情緒。一次30分鐘",
        price: "免費"
        }
    ]
  },
  {
    name: "怜奈",
    image: "images/staff-20.jpg",
    desc: "願你有一個甜美的夢境。怜奈擅長用柔和的話語與安靜的陪伴，讓疲憊的心情慢慢放鬆，適合想談心、陪坐，或享受溫柔氛圍的客人。",
    shortDesc: "溫柔陪聊、談心交流、夢境陪伴。",
    quote: "願你有一個甜美的夢境。",
    tags: ["輕 RP","談心交流", "溫柔陪聊", "夢境陪伴"],
    filterTags: ["rp","chat","champagne","personal"],
    status: "available",
    statusLabel: "接受指名",
    role: "公關",
    workDays: [5, 6],
    recommended: "談心交流、溫柔陪聊",
    extraServices: ["談心交流"],
    personalMenu: [
      {
        title: "🃏｜占卜 ",
        desc: "你願意把你的心交給我， 我就可以幫你排憂解難。",
        price: " 一條問題 15萬"
      },
      {
        title: "🔲｜拍立得 ",
        desc: "要跟可愛又帥氣的兔兔拍照嗎𖦹' ‐ '𖦹？",
        price: " 簡單(單色) 3萬、複雜 8萬"
      },
      {
        title: "🎤｜哄睡錄音",
        desc: "睡不著嗎..? 那 我來哄哄你吧 ♥",
        price: "15秒 30萬"
      },
      {
        title: "🎙️｜清唱錄音",
        desc: "咳咳.. 這是只為你而唱的歌喔..",
        price: "15秒 30萬"
      }
    ]
  },
  {
    name: "參參",
    image: "images/staff-21.png",
    desc: "帶著貓系撒嬌感的陪聊公關，擅長用輕鬆可愛的節奏陪客人聊天、互動與放鬆。喜歡被稱讚，也很容易因為客人的小費與關心而充滿幹勁；適合想要可愛陪伴、輕鬆談話與一點俏皮感的客人。",
    shortDesc: "貓系陪聊、可愛撒嬌、小費動力。",
    quote: "客人給的小費，是我的動力喵。",
    tags: ["輕 RP","貓系", "可愛", "陪聊", "撒嬌", "輕鬆互動"],
    filterTags: ["rp","chat", "cute","personal"],
    status: "available",
    statusLabel: "接受指名",
    role: "公關",
    workDays: [5, 6],
    recommended: "陪聊互動、可愛陪席",
    extraServices: ["輕 RP", "陪聊"],
    personalMenu: [
      {
        title: "❤️｜黑貓撒嬌陪聊 ",
        desc: "想知道是什麼？點看看就知道喵ෆ",
        price: "20分鐘20萬"
      },
      {
        title: "⚔️｜黑貓陪打",
        desc: "雖然不喜歡打打殺殺..但如果有錢賺好像不錯ෆ但不要指望會打多好就是了喵..( 日隨or戰場都行 ! 不要嫌我爛就好了:3 )",
        price: " 一把30萬"
      },
      {
        title: "🎈｜黑貓陪玩",
        desc: "快花錢帶我出去玩喵ෆ看要逛街拍照都可以喵！",
        price: "20分鐘20萬"
      },
    ]
  },
  {
    name: "咪幾馬麻",
    image: "images/staff-22.jpg",
    desc: "她的陪伴像剛洗好的浴巾，柔軟、溫暖，還帶著一點讓人忍不住笑出來的香氣。適合談心交流、輕鬆陪聊，以及想在第十二夜找點安心感的客人。",
    shortDesc: "談心交流、親切陪聊、搞笑療癒。",
    quote: "鬱金香都沒我的浴巾香。",
    tags: ["輕 RP","談心交流", "親切陪聊", "搞笑療癒"],
    filterTags: ["rp","chat","masaji","champagne"],
    status: "available",
    statusLabel: "接受指名",
    role: "公關",
    workDays: [5, 6],
    recommended: "談心交流、輕鬆陪聊",
    extraServices: ["談心交流"]
  },
  {
    name: "打喵帕尼尼堡",
    image: "images/staff-23.jpg",
    desc: "他的陪伴像夜裡端上的一杯特調，入口是幽默，餘韻是溫柔。適合談心交流、輕中 RP，以及想在酒館氣氛裡享受一點被重視感的客人。",
    shortDesc: "輕/中RP,調酒師,談心交流",
    quote: "今夜，我的酒能襯托你的美。",
    tags: ["輕/中RP","調酒師","談心交流", "酒館氛圍"],
    filterTags: ["chat","rp","bar"],
    status: "unbookable",
    statusLabel: "不接受指名",
    role: "公關",
    workDays: [5, 6],
    recommended: "輕/中RP、談心交流",
    extraServices: ["談心交流"]
  },
  {
    name: "陪陪",
    image: "images/staff-24.jpg",
    desc: "總是以溫柔的距離陪在客人身旁，擅長談心交流與曖昧氛圍的鋪陳。無論是深夜裡想找人安放情緒，還是想留下一張帶有故事感的拍立得，她都能以細膩的節奏，陪您走進一場微醺而心動的夜。",
    shortDesc: "溫柔相談、輕 RP、曖昧攝影。",
    quote: "溫柔是我的習慣，心動是你的問題。",
    tags: ["輕RP","談心交流"],
    filterTags: ["chat","rp","champagne","personal"],
    status: "available",
    statusLabel: "接受指名",
    role: "公關",
    workDays: [5, 6],
    recommended: "輕/中RP、談心交流",
    extraServices: ["談心交流"],
    personalMenu: [
      {
        title: "🌙｜相談",
        desc: "深夜裡無處安放的情緒，歡迎你放在我心裡。",
        price: "20分鐘 20萬"
      },
      {
        title: "📸｜拍立得",
        desc: "此時此刻，相遇的證明。你不會想忘記。",
        price: " 單人拍立得 3萬、雙人拍立得 5萬"
      },
      {
        title: "🖋️｜拍立得簽繪",
        desc: "今晚的夢會醒來，但我的筆跡不會消失。",
        price: "拍立得簽繪 15萬(含拍照)"
      },
      {
        title: "🥀｜沉淪之域",
        desc: "有些靠近不需要理由，只需要一點點失控。你想要與我親密，而我想要留下你愛我的證明。一個親吻、一次擁抱、一場戀愛，甜的讓你不想醒來。",
        price: "曖昧情境攝影 1張 20萬"
      },
      {
        title: "🔐｜禁忌收藏",
        desc: "只是拍照而已⋯⋯對吧？你不會當真，我不會沉淪，但⋯⋯今晚，我只為你破例。專屬親筆文案+簽名，解鎖只對你開放的深夜篇章",
        price: " 私密戀人劇照*2 + 親筆文案  100萬"
      },
    ]
  },
  {
    name: "瑪萩",
    image: "images/staff-26.png",
    desc: "瑪萩擅長以輕柔的節奏陪伴來訪者，無論是想安靜談心、分享近況，或只是找一個能放鬆停留的夜晚，他都會用恰到好處的距離與溫度，陪你走過今夜的夢。",
    shortDesc: "輕 RP・談心交流。",
    quote: "今夜的主角不是我，是你。",
    tags: ["輕RP","談心交流",],
    filterTags: ["chat","rp","personal"],
    status: "available",
    statusLabel: "接受指名",
    role: "公關",
    workDays: [5, 6],
    recommended: "輕RP、談心交流",
    extraServices: ["談心交流"],
  },
  {
    name: "偌佈津楓",
    image: "images/staff-27.png",
    desc: "如同靜靜流淌的河水，偌佈津楓不急著追問你的來處，也不催促你決定前行的方向。他擅長以沉穩而溫柔的方式陪伴，傾聽旅途中未曾說出口的心情。無論今夜想談談命運、分享故事，或只是尋找一位能並肩而坐的人，他都願與你同舟，陪你度過這段柔和的夜色。",
    shortDesc: "輕 RP。",
    quote: "命運若是河流，願我們同舟而行。",
    tags: ["輕RP","談心交流",],
    filterTags: ["chat","rp","personal"],
    status: "available",
    statusLabel: "接受指名",
    role: "公關",
    workDays: [5, 6],
    recommended: "輕RP、談心交流",
    extraServices: ["談心交流"],
  },
  {
    name: "夏遠星",
    image: "images/staff-28.png",
    desc: "如同夜空中安靜守候的星光，夏遠星不刻意製造熱鬧，卻總能在恰好的時候接住你的話語。無論是分享旅途中的心情、聊聊近日的故事，或只想找個人陪你度過一段平靜時光，他都會以自然從容的步調，讓今夜不再只是匆匆經過。",
    shortDesc: "輕 RP。",
    quote: "最好的夜晚，不只是熱鬧，而是有人願意陪伴。",
    tags: ["輕RP","談心交流",],
    filterTags: ["chat","rp","personal"],
    status: "available",
    statusLabel: "接受指名",
    role: "公關",
    workDays: [5],
    recommended: "輕RP、談心交流",
    extraServices: ["談心交流"],
    personalMenu: [
      {
        title: "🌙｜桌游",
        desc: "國王遊戲、誰是臥底、滾雪球、狼人殺。",
        price: "指名中可服務"
      },
    ]
  },
  {
    name: "時達艾詡",
    image: "images/staff-29.png",
    desc: "時達艾詡擅長以溫雅而從容的方式迎接每一次相遇，不刻意追逐熱鬧，也不讓片刻沉默變得疏遠。他會細心聆聽旅人帶來的故事，陪你談笑、分享心情，讓原本偶然經過的夜晚，慢慢成為值得珍藏的回憶。願今夜留下的溫度，成為你日後再次駐足的理由。",
    shortDesc: "輕 RP。",
    quote: "願今晚的相遇，成為您再次駐足的理由。",
    tags: ["輕RP","談心交流",],
    filterTags: ["chat","rp","personal"],
    status: "available",
    statusLabel: "接受指名",
    role: "公關",
    workDays: [5, 6],
    recommended: "輕RP、談心交流",
    extraServices: ["談心交流"],
  },
];
