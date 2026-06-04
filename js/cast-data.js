window.FEATURE_CONFIG = { mode: "daily", count: 3 };

window.allCasts = [
  {
    name: "圖圖",
    image: "images/staff-01.jpg",
    desc: "",
    shortDesc: "",
    quote: "若您願意，我會把今晚的月光，輕輕留在您的杯中。",
    tags: ["店長", "俏皮可愛", "香檳 CALL"],
    filterTags: ["chat", "cute", "champagne"],
    status: "unbookable",
    statusLabel: "不接受指名",
    workDays: [5, 6],
    recommended: "陪酒聊天、輕 RP",
    extraServices: [ "小遊戲", "按摩 RP"],
  },
  {
    name: "咕嚕小貓",
    image: "images/staff-02.jpg",
    desc: "擅長安靜聆聽，也能陪您玩一場輕鬆的小遊戲。適合第一次來店、想慢慢熟悉氣氛的客人。",
    shortDesc: "小遊戲、陪酒、輕 RP 互動。",
    quote: "願您推開門時，正好遇見一場不必醒來的美夢。",
    tags: ["小遊戲", "陪酒", "輕 RP"],
    filterTags: ["chat", "game"],
    status: "available",
    statusLabel: "接受指名",
    workDays: [6],
    recommended: "猜數字、射龍門、陪聊",
    extraServices: ["真心話", "射龍門", "猜數字"]
  },
  {
    name: "傑傑諾利",
    image: "images/staff-03.jpg",
    desc: "日式會館風格，適合想要儀式感、高級感與沉浸式接待的客人。互動節奏偏穩重細膩。",
    shortDesc: "日式會館、高級感、儀式感。",
    quote: "燈火已候，酒盞已溫，只待您入席。",
    tags: ["日式會館", "高級感", "指名推薦"],
    filterTags: ["chat", "japanese", "champagne"],
    status: "available",
    statusLabel: "接受指名",
    workDays: [5],
    recommended: "日式陪席、香檳 CALL、儀式感 RP",
    extraServices: ["日式迎賓", "儀式感陪席", "香檳祝詞"]
  },
  {
    name: "阿希Axi",
    image: "images/staff-04.jpg",
    desc: "如果今晚想把煩惱丟掉，阿希 Axi 會用一場小小的夢接住您。擅長陪聊、通靈系 RP 與歡愉感互動，適合喜歡新奇服務、怪奇氣氛與輕鬆玩鬧的客人。",
    shortDesc: "陪聊、罵倒、通靈。",
    quote: "今晚要不要把煩惱丟掉，跟我一起玩一場小小的夢？",
    tags: ["通靈 RP", "特殊互動"],
    filterTags: ["rp", "chat", "game"],
    status: "available",
    statusLabel: "接受指名",
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
    desc: "夢境裡的貓魅公關，語尾偶爾會悄悄落下一聲喵。適合想被溫柔陪伴，也想要一點可愛互動的客人。",
    shortDesc: "安靜陪伴、日式茶席、談心。",
    quote: "不必急著說話，今晚的燈會替您慢慢沉澱。",
    tags: ["輕RP","安靜陪伴", "香檳CALL", "聊天談心", "小遊戲", "演奏", "上車舞"],
    filterTags: ["rp","chat", "champagne","game","music"],
    status: "pending",
    statusLabel: "排班確認中",
    workDays: [5, 6],
    recommended: "香檳CALL、小遊戲",
    extraServices: ["香檳CALL", "小遊戲", "上車舞", "演奏"],
    personalMenu: [
      {
        title: "🍾單人香檳CALL ",
        desc: "每一位主人都有可能會有不同的香檳CALL，微醺登場，氣氛直接拉滿。",
        price: "一次10萬"
      },
      {
        title: "🪭 上車舞",
        desc: "上車的不只是節奏，是今晚的浪漫。",
        price: "一次10萬"
      },
      {
        title: "🎻 演奏",
        desc: "一段旋律，一場不願醒來的夜晚。(歌曲隨機暫時不開放點歌)",
        price: "思考中"
      },
      {
        title: "🌮 小故事",
        desc: "在某次因緣際會之下聽到主訴說著故事，因而學到了該技能。",
        price: "陪伴中無料"
      },
      {
        title: "🕹️ 小遊戲",
        desc: "有些相遇，從一場遊戲開始。",
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
    tags: ["談心交流", "成熟陪聊", "微醺氛圍"],
    filterTags: ["chat"],
    status: "available",
    statusLabel: "接受指名",
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
    name: "月澄雪兔",
    image: "images/staff-07.jpg",
    desc: "月澄雪兔像忘川邊的擺渡人，不替您決定去向，只在您遲遲無法前行時，遞上一支槳。適合情感諮商、談心交流，以及想從混亂關係中慢慢清醒的客人。",
    shortDesc: "情感諮商、清醒談心、忘川擺渡。",
    quote: "我也不是蒙娜麗莎，沒必要對誰都微笑。",
    tags: ["情感諮商", "談心交流", "清醒系"],
    filterTags: ["chat"],
    status: "available",
    statusLabel: "不接受指名",
    workDays: [5, 6],
    recommended: "談心交流",
    extraServices: ["談心交流"],
    personalMenu: [
      {
        title: "🛶｜忘川擺渡人  (情感諮商)",
        desc: "關於此服務：1.您是否還在原地駐足？是否還在為情所困？是否還深陷泥沼無法自拔......？讓雪兔來拉您一把，送您一程。2.服務期間，所提供的看法、建議、方法僅供參考，唯有您自身能做出抉擇，最終結果，唯有渡河之人方能承擔。",
        price: "30分鐘 30萬"
      },
    ]
  },
  {
    name: "賽伊",
    image: "images/staff-08.jpg",
    desc: "夜色會讓人誤以為那是浪漫，而賽伊擅長在這份曖昧之中，陪您慢慢分辨心情。適合輕 RP、談心交流，以及喜歡成熟氛圍陪伴的客人。",
    shortDesc: "成熟陪聊、輕 RP、談心交流。",
    quote: "夜色會讓人誤以為那是浪漫。",
    tags: ["輕RP", "成熟陪聊", "談心交流"],
    filterTags: ["rp","chat"],
    status: "available",
    statusLabel: "接受指名",
    workDays: [5, 6],
    recommended: "輕 RP、談心交流",
    extraServices: []
  },
  {
    name: "露娜弗蕾亞",
    image: "images/staff-09.jpg",
    desc: "她調的不是酒，是撫慰靈魂的解藥。露娜弗蕾亞以調酒師的身份守在吧檯後，為每位來客調製屬於今晚的味道。",
    shortDesc: "熱場、香檳 CALL、活動主持。",
    quote: "我調的不是酒，是撫慰靈魂的解藥。",
    tags: ["調酒師", "吧檯服務", "酒館氛圍"],
    filterTags: ["bar", "chat"],
    status: "unbookable",
    statusLabel: "不接受指名",
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
    tags: ["輕RP", "溫柔陪聊", "談心交流"],
    filterTags: ["rp","chat"],
    status: "available",
    statusLabel: "接受指名",
    workDays: [5, 6],
    recommended: "輕 RP、談心交流",
    extraServices: []
  },
  {
    name: "兔紙不吃紙",
    image: "images/staff-11.jpg",
    desc: "不吃紙，但很會吃掉冷場的氣氛。活潑、親切、反應快，適合想找人聊天、玩鬧、輕鬆互動，或讓包廂氣氛更熱鬧的客人。",
    shortDesc: "熱場、香檳 CALL、活動主持。",
    quote: "嗨!要一起玩嗎?玩誰都行。",
    tags: ["服裝店員", "服裝穿搭", "談心交流"],
    filterTags: ["ootd", "game", "chat"],
    status: "available",
    statusLabel: "接受指名",
    workDays: [5, 6],
    recommended: "談心交流、服裝搭配",
    extraServices: []
  },
  {
    name: "千反田",
    image: "images/staff-12.jpg",
    desc: "服裝搭配:「深宵換裝，讓夜晚成為你的時裳」。",
    shortDesc: "熱場、香檳 CALL、活動主持。",
    quote: "你是我的月神嗎。",
    tags: ["服裝店員", "服裝穿搭", "談心交流"],
    filterTags: ["ootd", "game", "chat"],
    status: "available",
    statusLabel: "接受指名",
    workDays: [5, 6],
    recommended: "談心交流、服裝搭配",
    extraServices: ["服裝搭配", "談心交流"]
  },
  {
    name: "權順榮",
    image: "images/staff-13.jpg",
    desc: "自稱最後一隻老虎，卻意外適合替人帶路。擅長青魔技能、深層迷宮帶隊，能在挑戰與閒聊之間找到剛好的節奏，陪你把今晚變成一段值得記住的旅程。",
    shortDesc: "深沉迷宮、死宮、天宮。",
    quote: "大韓民國最後一隻老虎。",
    tags: ["輕RP", "迷宮討罰", "青魔傳授"],
    filterTags: ["dung", "chat"],
    status: "available",
    statusLabel: "接受指名",
    workDays: [5, 6],
    recommended: "迷宮討罰、青魔傳授",
    extraServices: ["迷宮討罰", "青魔傳授"],
    personalMenu: [
      {
        title: "🎩青魔傳授",
        desc: "看過一次，就變成我的技能。",
        price: "一個技能10萬"
      },
      {
        title: "💀迷宮討伐",
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
    tags: ["輕RP", "溫柔陪聊", "談心交流"],
    filterTags: ["rp","chat"],
    status: "available",
    statusLabel: "接受指名",
    workDays: [5, 6],
    recommended: "輕 RP、談心交流",
    extraServices: []
  },
  {
    name: "夜店點牛奶",
    image: "images/staff-15.jpg",
    desc: "像深夜裡一杯溫柔的牛奶，安靜卻能讓人慢慢放下疲憊。擅長談心交流與輕 RP 陪伴，適合想找個人安靜聊天、整理心情，或在夜色中稍微休息一下的客人。",
    shortDesc: "熱場、香檳 CALL、活動主持。",
    quote: "願此處的夜色能撫平你片刻的疲憊。",
    tags: ["輕RP", "談心交流"],
    filterTags: ["chat", "rp"],
    status: "available",
    statusLabel: "接受指名",
    workDays: [5, 6],
    recommended: "談心交流",
    extraServices: []
  },
  {
    name: "山茶花",
    image: "images/staff-16.jpg",
    desc: "像一朵靜靜盛開在夜裡的山茶花，溫柔卻有自己的審美。擅長服裝穿搭、氣質調整與談心陪伴，讓每一套衣裝都成為今晚的另一種心情。",
    shortDesc: "穿搭、談心、活動主持。",
    quote: "你是我的月神嗎。",
    tags: ["服裝店員", "服裝穿搭", "談心交流"],
    filterTags: ["ootd", "chat"],
    status: "unbookable",
    statusLabel: "不接受指名",
    workDays: [5, 6],
    recommended: "談心交流、服裝搭配",
    extraServices: ["服裝搭配", "談心交流"],
    personalMenu: [
      {
        title: "👗服裝搭配 ",
        desc: "深宵換裝，讓夜晚成為你的時裳。配到滿意!",
        price: "一套20萬"
      },
      {
        title: "♥️談心交流",
        desc: "夜色深處，安放未曾言說的情緒。一次30分鐘",
        price: "免費"
        }
    ]
  },
  {
    name: "Mmaru",
    image: "images/staff-17.jpg",
    desc: "今晚的快樂，就由 Mmaru 來調製。以調酒師的身份守在吧檯後，為每位來客添上一點微醺、一點熱鬧，也添上一點屬於第十二夜的夢境味道。",
    shortDesc: "調酒師、吧檯服務、歡樂氛圍。",
    quote: "今晚的快樂就由我來調製吧。",
    tags: ["調酒師", "吧檯服務", "歡樂氛圍"],
    filterTags: ["bar"],
    status: "unbookable",
    statusLabel: "不接受指名",
    workDays: [5, 6],
    recommended: "調酒、吧檯服務",
    extraServices: ["調酒"]
  },
  {
    name: "酒館玲阿桃",
    image: "images/staff-18.jpg",
    desc: "帶著酒館般的溫度與一點讓人暈船的柔軟，擅長陪您聊天、聽您說話，也能在夜色裡給您剛剛好的依靠。適合想放鬆、談心，或想被溫柔對待的客人。",
    shortDesc: "談心交流、情緒陪伴、輕 RP。",
    quote: "十二夜的今晚，因為你的蒞臨而完美。",
    tags: [ "輕RP","暈船擔當", "談心交流"],
    filterTags: ["rp", "chat"],
    status: "available",
    statusLabel: "接受指名",
    workDays: [5, 6],
    recommended: "談心交流、情緒價值",
    extraServices: ["情緒價值", "談心交流"]
  },
  {
    name: "長腿木木",
    image: "images/staff-19.jpg",
    desc: "每一套搭配，都是另一種靈魂；每一次談心，也都是靠近自己的方式。長腿木木擅長服裝推薦、感情諮商與輕鬆陪伴，適合想整理造型，也想整理心情的客人。",
    shortDesc: "服裝推薦、感情諮商、陪釣放鬆。",
    quote: "今晚來點甜的。",
    tags: ["服裝店員", "服裝穿搭", "談心交流"],
    filterTags: ["ootd", "chat", "fishing"],
    status: "available",
    statusLabel: "接受指名",
    workDays: [5, 6],
    recommended: "談心交流、服裝搭配",
    extraServices: ["服裝搭配", "感情諮商"],
    personalMenu: [
      {
        title: "♥️感情諮商 ",
        desc: "在燈光與酒杯之間，聽見內心的答案。",
        price: "10萬/10分鐘"
      },
      {
        title: "👗服裝推薦",
        desc: "每一套搭配，都是另一種靈魂。配到滿意!",
        price: "一套 30萬"
      },
      {
        title: "🎣釣魚教學/陪釣",
        desc: "願者上鉤，陪伴是你的動力。",
        price: "30萬/30分鐘"
      }
    ]
  },
  {
    name: "怜奈",
    image: "images/staff-20.jpg",
    desc: "願你有一個甜美的夢境。怜奈擅長用柔和的話語與安靜的陪伴，讓疲憊的心情慢慢放鬆，適合想談心、陪坐，或享受溫柔氛圍的客人。",
    shortDesc: "溫柔陪聊、談心交流、夢境陪伴。",
    quote: "願你有一個甜美的夢境。",
    tags: ["談心交流", "溫柔陪聊", "夢境陪伴"],
    filterTags: ["chat"],
    status: "available",
    statusLabel: "接受指名",
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
    image: "images/staff-21.jpg",
    desc: "服裝搭配:「深宵換裝，讓夜晚成為你的時裳」。",
    shortDesc: "熱場、香檳 CALL、活動主持。",
    quote: "你是我的月神嗎。",
    tags: ["服裝店員", "服裝穿搭", "談心交流"],
    filterTags: ["ootd", "game", "chat"],
    status: "available",
    statusLabel: "接受指名",
    workDays: [5, 6],
    recommended: "談心交流、服裝搭配",
    extraServices: ["服裝搭配", "談心交流"]
  },
  {
    name: "咪幾馬麻",
    image: "images/staff-22.jpg",
    desc: "她的陪伴像剛洗好的浴巾，柔軟、溫暖，還帶著一點讓人忍不住笑出來的香氣。適合談心交流、輕鬆陪聊，以及想在第十二夜找點安心感的客人。",
    shortDesc: "談心交流、親切陪聊、搞笑療癒。",
    quote: "鬱金香都沒我的浴巾香。",
    tags: ["談心交流", "親切陪聊", "搞笑療癒"],
    filterTags: ["chat"],
    status: "available",
    statusLabel: "接受指名",
    workDays: [5, 6],
    recommended: "談心交流、輕鬆陪聊",
    extraServices: ["談心交流"]
  },
];
