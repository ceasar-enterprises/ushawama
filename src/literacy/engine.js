/**
 * Literacy Engine — Trade-Functional Literacy
 * Teaches reading/writing THROUGH trade context, not abstract ABCs
 * Based on World Bank/IIZ/DVV research: livelihood-led beats literacy-led
 *
 * 5 Levels (260 hours total):
 * 1. Jina Langu (My Name) — 20h
 * 2. Bei ya Bidhaa (Product Price) — 40h
 * 3. Fomu ya Forodha (Customs Form) — 60h
 * 4. Soko (Market) — 80h
 * 5. Biashara Yangu (My Business) — 60h
 */

const path = require('path');
const fs = require('fs');

const LEVELS_PATH = path.join(__dirname, '../../data/literacy-levels.json');
const PROGRESS_PATH = path.join(__dirname, '../../data/literacy-progress.json');

// Multilingual word banks (trade-relevant vocabulary)
const WORD_BANKS = {
  en: {
    products: ['maize', 'beans', 'rice', 'coffee', 'fish', 'matooke', 'cassava', 'sugar', 'salt', 'oil', 'soap', 'tomatoes', 'onions', 'potatoes', 'meat'],
    numbers: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'twenty', 'fifty', 'hundred', 'thousand'],
    currencies: ['USD', 'UGX', 'KES', 'TZS', 'RWF'],
    forms: ['name', 'address', 'phone', 'signature', 'date', 'amount', 'quantity', 'product', 'origin', 'destination'],
    trade: ['buyer', 'seller', 'price', 'receipt', 'invoice', 'customs', 'border', 'duty', 'tax', 'trade', 'market'],
    greetings: ['hello', 'good morning', 'thank you', 'how much', 'where', 'when'],
  },
  sw: {
    products: ['mahindi', 'maharage', 'mpunga', 'kahawa', 'samaki', 'matooke', 'muhogo', 'sukari', 'chumvi', 'mafuta', 'sabuni', 'nyanya', 'vibungu', 'viazi', 'nyama'],
    numbers: ['sifuri', 'moja', 'mbili', 'tatu', 'nne', 'tano', 'sita', 'saba', 'nane', 'tisa', 'kumi', 'ishirini', 'hamsini', 'mia', 'elfu'],
    currencies: ['USD', 'KES', 'TZS', 'UGX', 'RWF'],
    forms: ['jina', 'anwani', 'simu', 'sahihi', 'tarehe', 'kiasi', 'idadi', 'bidhaa', 'asili', 'adingo'],
    trade: ['mnunuzi', 'muuzaji', 'bei', 'risiti', 'hati', 'forodha', 'mpaka', 'kodi', 'kodi', 'biashara', 'soko'],
    greetings: ['habari', 'habari za asubuhi', 'asante', 'bei gani', 'wapi', 'lini'],
  },
  lg: {
    products: ['emaali', 'nkuuku', 'mpozi', 'kawaawa', 'emigga', 'matooke', 'muwogo', 'sukali', 'ENNAMU', 'amafuta', 'sabuni', 'nnaanaanyi', 'tumbulii', 'dayi', 'nyama'],
    numbers: ['zeero', 'emu', 'bbiri', 'ssatu', 'nnya', 'ttaano', 'mukaaga', 'musaanvu', 'munaana', 'mwenda', 'kumi', 'makumi', 'bikumi', 'kikumi', 'kikumi ekimu'],
    currencies: ['USD', 'UGX', 'KES', 'TZS', 'RWF'],
    forms: ['erinnya', 'address', 'telefono', 'akabonero', 'olunaku', 'ekiwendo', 'eebbina', 'kintu', 'ano', 'ano'],
    trade: ['omuguzi', 'omulimu', 'ensimu', 'resiti', 'hati', 'forodha', 'mpaka', 'kaddu', 'kaddu', 'obudde', 'soko'],
    greetings: ['oiyoo', 'oyoota', 'webale', 'ensi ziri', 'li', 'ka'],
  },
  rw: {
    products: ['ibigori', 'ibishyimbo', 'umuceri', 'ikawa', 'ingurube', 'igitoki', 'imboga', 'isukari', 'umunyu', 'ibivumbi', 'isabuni', 'itamatisi', 'ibijumba', 'ibirayi', 'inyama'],
    numbers: ['zero', 'rimwe', 'kabiri', 'gatatu', 'kane', 'gatanu', 'gatandatu', 'karindwi', 'umunani', 'icumi', 'magumi', 'mirongoro', 'igihumbi', 'ibihumbi'],
    currencies: ['USD', 'RWF', 'UGX', 'KES', 'TZS'],
    forms: ['izina', 'adereysi', 'telefoni', 'ibonero', 'itariki', 'igiciro', 'igitigiri', 'ikintu', 'kuva', 'kuja'],
    trade: ['umuguzi', 'umuruzi', 'igiciro', 'risiti', 'rideri', 'ubwisungane', 'uburingeri', 'imfunguzo', 'amavu', 'ubucuruzi', 'isoko'],
    greetings: ['muraho', 'mwaramutse', 'murakoze', 'ni amasezerano', 'hehe', 'ryari'],
  },
};

// Level definitions
const LEVELS = [
  {
    id: 1,
    name: { en: 'My Name', sw: 'Jina Langu', lg: 'Jina Langu', rw: 'Izina Ryanu' },
    hours: 20,
    lessons: [
      {
        id: 'l1w1',
        title: { en: 'My Name', sw: 'Jina Langu', lg: 'Jina Langu', rw: 'Izina Ryanu' },
        words: ['name', 'phone', 'village', 'signature'],
        activities: [
          { type: 'listen_repeat', instruction: 'Listen to the word, then say it', words: ['name', 'phone', 'village'] },
          { type: 'trace', instruction: 'Trace the letters of your name', word: 'name' },
          { type: 'match', instruction: 'Match the picture to the word', pairs: [['name', '📛'], ['phone', '📱'], ['village', '🏘️']] },
          { type: 'write', instruction: 'Write your full name', field: 'full_name' },
          { type: 'voice_quiz', instruction: 'What is your name? Say it clearly', answer_field: 'name' },
        ]
      },
      {
        id: 'l1w2',
        title: { en: 'My Phone Number', sw: 'Nambari Yangu ya Simu', lg: 'Enamba Yange ya Tilefono', rw: 'Numero YaTelefone' },
        words: ['phone', 'number', 'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'],
        activities: [
          { type: 'listen_repeat', instruction: 'Listen to each number and repeat', words: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'] },
          { type: 'sequence', instruction: 'Put these numbers in order', numbers: [1, 2, 3, 4, 5] },
          { type: 'write', instruction: 'Write your phone number', field: 'phone_number' },
          { type: 'voice_quiz', instruction: 'Say your phone number slowly', answer_field: 'phone' },
        ]
      },
      {
        id: 'l1w3',
        title: { en: 'My Village', sw: 'Kijiji Changu', lg: 'Ekibuga Kyange', rw: 'Igisagara Cyanu' },
        words: ['village', 'road', 'market', 'school', 'hospital'],
        activities: [
          { type: 'listen_repeat', instruction: 'Listen and repeat these place names', words: ['village', 'road', 'market', 'school', 'hospital'] },
          { type: 'match', instruction: 'Match the place to the picture', pairs: [['village', '🏘️'], ['road', '🛤️'], ['market', '🏪']] },
          { type: 'write', instruction: 'Write the name of your village', field: 'village' },
          { type: 'voice_quiz', instruction: 'What village do you live in?', answer_field: 'village' },
        ]
      },
    ]
  },
  {
    id: 2,
    name: { en: 'Product Price', sw: 'Bei ya Bidhaa', lg: 'Ensimu Y\'ebintu', rw: 'Igiciro Cy\'ibintu' },
    hours: 40,
    lessons: [
      {
        id: 'l2w1',
        title: { en: 'Numbers and Money', sw: 'Nambari na Pesa', lg: 'Namba n\'esimuu', rw: 'Imibare n\'Amahera' },
        words: ['one', 'two', 'three', 'four', 'five', 'ten', 'twenty', 'fifty', 'hundred', 'thousand'],
        activities: [
          { type: 'listen_repeat', instruction: 'Listen to each number and repeat', words: ['one', 'two', 'three', 'five', 'ten', 'hundred'] },
          { type: 'math_voice', instruction: 'What is five plus three?', question: '5+3', answer: 'eight' },
          { type: 'write', instruction: 'Write the price of your product', field: 'price' },
          { type: 'voice_quiz', instruction: 'How much does one kilo of maize cost?', answer_field: 'price' },
        ]
      },
      {
        id: 'l2w2',
        title: { en: 'Reading Receipts', sw: 'Kusoma Risiti', lg: 'Okusoma Resiti', rw: 'Gusoma Risiti' },
        words: ['receipt', 'amount', 'date', 'total', 'paid'],
        activities: [
          { type: 'listen_repeat', instruction: 'These are words you will see on receipts', words: ['receipt', 'amount', 'date', 'total', 'paid'] },
          { type: 'fill_blank', instruction: 'Fill in the missing word on this receipt', template: 'PAID: UGX [___] ON [DATE]' },
          { type: 'voice_quiz', instruction: 'What does RECEIPT mean?', answer_field: 'definition' },
        ]
      },
      {
        id: 'l2w3',
        title: { en: 'Product Names', sw: 'Majina ya Bidhaa', lg: 'Amannya g\'ebintu', rw: 'Amazina y\'ibintu' },
        words: ['maize', 'beans', 'rice', 'coffee', 'fish', 'matooke'],
        activities: [
          { type: 'listen_repeat', instruction: 'Learn the names of common products', words: ['maize', 'beans', 'rice', 'coffee', 'fish'] },
          { type: 'match', instruction: 'Match the product to its picture', pairs: [['maize', '🌽'], ['beans', '🫘'], ['rice', '🍚'], ['fish', '🐟']] },
          { type: 'voice_quiz', instruction: 'Point to the picture of MAIZE', answer_field: 'maize' },
        ]
      },
    ]
  },
  {
    id: 3,
    name: { en: 'Customs Form', sw: 'Fomu ya Forodha', lg: 'Fomu ya Forodha', rw: 'Ikarata y\'Ubuyobozi' },
    hours: 60,
    lessons: [
      {
        id: 'l3w1',
        title: { en: 'What is Customs?', sw: 'Forodha ni Nini?', lg: 'Forodha ki?', rw: 'Ubuyobozi ni iki?' },
        words: ['customs', 'border', 'declaration', 'duty', 'tax', 'officer'],
        activities: [
          { type: 'listen_repeat', instruction: 'These words are used at the border', words: ['customs', 'border', 'declaration', 'duty', 'tax'] },
          { type: 'match', instruction: 'Match the word to its meaning', pairs: [['customs', 'Border control office'], ['duty', 'Tax on goods'], ['declaration', 'Official form']] },
          { type: 'voice_quiz', instruction: 'What is the name of the office at the border?', answer_field: 'customs' },
        ]
      },
      {
        id: 'l3w2',
        title: { en: 'Reading a Declaration Form', sw: 'Kusoma Fomu ya Tamshi', lg: 'Okusoma Fomu', rw: 'Gusoma Ikarata' },
        words: ['name', 'address', 'phone', 'product', 'quantity', 'value', 'origin', 'destination'],
        activities: [
          { type: 'listen_repeat', instruction: 'These fields appear on customs forms', words: ['name', 'address', 'phone', 'product', 'quantity', 'value'] },
          { type: 'fill_blank', instruction: 'Fill in your details on this form', template: 'NAME: ___\nPRODUCT: ___\nQUANTITY: ___\nVALUE: UGX ___' },
          { type: 'voice_quiz', instruction: 'What field asks for how many items you have?', answer_field: 'quantity' },
        ]
      },
    ]
  },
  {
    id: 4,
    name: { en: 'Market', sw: 'Soko', lg: 'Soko', rw: 'Isoko' },
    hours: 80,
    lessons: [
      {
        id: 'l4w1',
        title: { en: 'Market Signs', sw: 'Alama za Soko', lg: 'Akabonero ka Soko', rw: 'Ikimenyetso cy\'Isoko' },
        words: ['open', 'closed', 'price', 'sale', 'buy', 'sell', 'fresh', 'discount'],
        activities: [
          { type: 'listen_repeat', instruction: 'Common market words', words: ['open', 'closed', 'price', 'sale', 'buy', 'sell'] },
          { type: 'match', instruction: 'Match the sign to the word', pairs: [['open', '🟢'], ['closed', '🔴'], ['sale', '🏷️'], ['fresh', '✨']] },
          { type: 'voice_quiz', instruction: 'What does PRICE mean?', answer_field: 'price' },
        ]
      },
    ]
  },
  {
    id: 5,
    name: { en: 'My Business', sw: 'Biashara Yangu', lg: 'Obudde Bwange', rw: 'Ubucuruzi Bwanje' },
    hours: 60,
    lessons: [
      {
        id: 'l5w1',
        title: { en: 'Writing Receipts', sw: 'Kuandika Risiti', lg: 'Okuandika Resiti', rw: 'Kwandika Risiti' },
        words: ['receipt', 'seller', 'buyer', 'product', 'amount', 'date', 'total'],
        activities: [
          { type: 'listen_repeat', instruction: 'Words for writing receipts', words: ['receipt', 'seller', 'buyer', 'product', 'amount', 'date'] },
          { type: 'write', instruction: 'Write a receipt for selling 10kg of beans at UGX 5,000', template: 'receipt' },
          { type: 'voice_quiz', instruction: 'What information goes on a receipt?', answer_field: 'receipt' },
        ]
      },
    ]
  },
];

class LiteracyEngine {
  constructor(userId) {
    this.userId = userId;
    this.progress = this._loadProgress();
  }

  _loadProgress() {
    try {
      const all = fs.existsSync(PROGRESS_PATH)
        ? JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'))
        : {};
      return all[this.userId] || { currentLevel: 1, completedLessons: [], totalHours: 0 };
    } catch {
      return { currentLevel: 1, completedLessons: [], totalHours: 0 };
    }
  }

  _saveProgress() {
    try {
      const all = fs.existsSync(PROGRESS_PATH)
        ? JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'))
        : {};
      all[this.userId] = this.progress;
      const dir = path.dirname(PROGRESS_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(PROGRESS_PATH, JSON.stringify(all, null, 2));
    } catch (e) {
      console.error('[Literacy] Failed to save progress:', e.message);
    }
  }

  /**
   * Get the current level for this user
   */
  getCurrentLevel() {
    return LEVELS.find(l => l.id === this.progress.currentLevel) || LEVELS[0];
  }

  /**
   * Get all available levels with progress
   */
  getLevels() {
    return LEVELS.map(level => ({
      id: level.id,
      name: level.name,
      hours: level.hours,
      lessonCount: level.lessons.length,
      completedLessons: level.lessons.filter(l =>
        this.progress.completedLessons.includes(l.id)
      ).length,
      unlocked: level.id <= this.progress.currentLevel,
      completed: level.lessons.every(l =>
        this.progress.completedLessons.includes(l.id)
      ),
    }));
  }

  /**
   * Get the next lesson for this user
   */
  getNextLesson() {
    const level = this.getCurrentLevel();
    const nextLesson = level.lessons.find(l =>
      !this.progress.completedLessons.includes(l.id)
    );
    return nextLesson || null;
  }

  /**
   * Get a specific lesson
   */
  getLesson(lessonId) {
    for (const level of LEVELS) {
      const lesson = level.lessons.find(l => l.id === lessonId);
      if (lesson) return { ...lesson, levelId: level.id, levelName: level.name };
    }
    return null;
  }

  /**
   * Complete a lesson
   */
  completeLesson(lessonId, score = 100) {
    if (!this.progress.completedLessons.includes(lessonId)) {
      this.progress.completedLessons.push(lessonId);
    }

    // Calculate hours earned (simplified: each lesson ~2-4 hours)
    const lesson = this.getLesson(lessonId);
    if (lesson) {
      this.progress.totalHours += Math.round(lesson.activities.length * 2.5);
    }

    // Check if level is complete
    const level = LEVELS.find(l => l.lessons.some(l2 => l2.id === lessonId));
    if (level && level.lessons.every(l => this.progress.completedLessons.includes(l.id))) {
      // Level complete — unlock next
      if (level.id < LEVELS.length) {
        this.progress.currentLevel = level.id + 1;
      }
    }

    this._saveProgress();
    return {
      completed: true,
      score,
      currentLevel: this.progress.currentLevel,
      totalHours: this.progress.totalHours,
      nextLesson: this.getNextLesson(),
      levelComplete: level && level.lessons.every(l => this.progress.completedLessons.includes(l.id)),
    };
  }

  /**
   * Get voice instructions for an activity
   * Returns the text to be spoken by TTS
   */
  getVoicePrompt(activity, lang = 'en') {
    // Each entry is a builder so that only the requested activity's template is
    // interpolated. Building the whole table eagerly would evaluate
    // `activity.words.join()` / `activity.numbers.join()` for activities that
    // have neither field, and throw before the lookup ever happens.
    const prompts = {
      listen_repeat: (a) => ({
        en: `Listen carefully. I will say: ${a.words.join(', ')}. Now repeat after me.`,
        sw: `Sikiliza kwa makini. Nitasema: ${a.words.join(', ')}. Sasa rudia baada yangu.`,
        lg: `Nuwulire obulungi. Njogera: ${a.words.join(', ')}. Noweewa egenda kunnya.`,
        rw: `Wumva neza. Ndavuga: ${a.words.join(', ')}. Ubu subira inyuma yanje.`,
      }),
      trace: () => ({
        en: `Now trace the letters. Use your finger to follow the lines.`,
        sw: `Sasa fuata herufi. Tumia kidole chako kufuata mistari.`,
        lg: `Nowa onotera ebigambo. Kozesa oluleero kulandira ebizibu.`,
        rw: `Ubu kurikiza ibyandiko. Koresha umudoni wawe gukurikiza imizongo.`,
      }),
      match: () => ({
        en: `Match each picture to its word. Tap the picture, then the word.`,
        sw: `Linganisha kila picha na neno lake. Gusa picha, kisha neno.`,
        lg: `Binganisa buli picha n\'omubonero gw\'ewa. Konya picha, n\'akatabo.`,
        rw: `Huza ishusho n\'ijambo ryayo. Kanda ishusho, hanyuma ijambo.`,
      }),
      write: () => ({
        en: `Now write. Take your time and write clearly.`,
        sw: `Sasa andika. Chukua muda wako na andika wazi.`,
        lg: `Nowa kandika. Nnyonnyola essente eyo ne nnyo.`,
        rw: `Ubu andika. Turuhuko noneho andika neza.`,
      }),
      voice_quiz: (a) => ({
        en: `Question: ${a.instruction}. Speak clearly into the phone.`,
        sw: `Swali: ${a.instruction}. Ongea wazi kwa simu.`,
        lg: `Kibuuzo: ${a.instruction}. Jogera obulungi ku tilefono.`,
        rw: `Ibumoso: ${a.instruction}. Vuga neza kuri telefone.`,
      }),
      math_voice: (a) => ({
        en: `Math question: ${a.instruction}. Say the answer.`,
        sw: `Swali la hesabu: ${a.instruction}. Sema jibu.`,
        lg: `Kibuuzo ky\'ebisano: ${a.instruction}. Jogerera kibuufo.`,
        rw: `Ibumoso ry\'ibiharuro: ${a.instruction}. Vuga igisubizo.`,
      }),
      fill_blank: (a) => ({
        en: `Fill in the blank. ${a.template}`,
        sw: `Jaza nafaka. ${a.template}`,
        lg: `Jjako olwatuula. ${a.template}`,
        rw: `Uzuza aho hasigarara. ${a.template}`,
      }),
      sequence: (a) => ({
        en: `Put these numbers in the right order: ${a.numbers.join(', ')}.`,
        sw: `Weka nambari hizi kwa utaratibu sahihi: ${a.numbers.join(', ')}.`,
        lg: `Teeka namba ezino mu kibaawo ky\'olunaku: ${a.numbers.join(', ')}.`,
        rw: `Tegura imibare ibi mu buryo bujyanye: ${a.numbers.join(', ')}.`,
      }),
    };

    const build = prompts[activity.type];
    if (!build) return activity.instruction;

    const byLang = build(activity);
    return byLang[lang] || byLang.en || activity.instruction;
  }

  /**
   * Get vocabulary for the current level
   */
  getVocabulary(lang = 'en') {
    const level = this.getCurrentLevel();
    const bank = WORD_BANKS[lang] || WORD_BANKS.en;
    const allWords = level.lessons.flatMap(l => l.words);
    const vocab = {};
    for (const category of Object.keys(bank)) {
      const matching = bank[category].filter(w =>
        allWords.some(aw => aw.toLowerCase() === w.toLowerCase())
      );
      if (matching.length > 0) vocab[category] = matching;
    }
    return vocab;
  }

  /**
   * Get progress summary
   */
  getProgress() {
    const totalLessons = LEVELS.reduce((a, l) => a + l.lessons.length, 0);
    return {
      currentLevel: this.progress.currentLevel,
      completedLessons: this.progress.completedLessons.length,
      totalLessons,
      totalHours: this.progress.totalHours,
      percentComplete: Math.round((this.progress.completedLessons.length / totalLessons) * 100),
      levels: this.getLevels(),
    };
  }
}

module.exports = { LiteracyEngine, LEVELS, WORD_BANKS };
