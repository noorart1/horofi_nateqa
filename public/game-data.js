// «دنياي السعيدة»: the games' central data. Edit here, not in game.js.
// Pictures come from public/img/game (made by tools/game_cards.php). The games have no sound.
const GAME_WORDS = [
  ['01', 'أَرْنَبٌ', 'animal'], ['02', 'بَقَرَةٌ', 'animal'], ['03', 'تِمْسَاحٌ', 'animal'], ['04', 'ثَعْلَبٌ', 'animal'],
  ['05', 'جَمَلٌ', 'animal'], ['06', 'حِمَارٌ', 'animal'], ['07', 'خَوْخٌ', 'thing'], ['08', 'دُبٌّ', 'animal'],
  ['09', 'ذُرَةٌ', 'thing'], ['10', 'رِيفٌ', 'thing'], ['11', 'زَوْرَقٌ', 'thing'], ['12', 'سَمَكَةٌ', 'animal'],
  ['13', 'شَاةٌ', 'animal'], ['14', 'صَقْرٌ', 'animal'], ['15', 'ضِفْدَعَةٌ', 'animal'], ['16', 'طَائِرَةٌ وَرَقِيَّةٌ', 'thing'],
  ['17', 'ظَبْيٌ', 'animal'], ['18', 'عُصْفُورٌ', 'animal'], ['19', 'غَزَالَةٌ', 'animal'], ['20', 'فِيلٌ', 'animal'],
  ['21', 'قِرْدٌ', 'animal'], ['22', 'كَنْغَرٌ', 'animal'], ['23', 'لُعْبَةٌ', 'thing'], ['24', 'مَرْكَبَةٌ', 'thing'],
  ['25', 'نَحْلَةٌ', 'animal'], ['26', 'هُدْهُدٌ', 'animal'], ['27', 'وَزَّةٌ', 'animal'], ['28', 'يَمَامَةٌ', 'animal'],
].map(([n, word, kind]) => ({
  n, word, kind,
  card: `img/game/${n}.webp`,   // the word card (its first letter in red)
  pic: `img/game/${n}p.webp`,   // the picture in its coloured disc
  cut: `img/game/${n}c.webp`,   // the picture alone (shadows, dragging)
}));

// Difficulty by level (0 very easy … 3 advanced). An age group starts at its level; the game then moves one level at a
// time: up after 3 right answers in a row (at most one above the age's level), down after 3 wrong ones in a row.
const GAME_LEVELS = [
  { name: 'سهل جدًا', options: 2, items: 3, view: 6, rounds: 3, pairs: 2, drag: 2, missing: 1, hintAfter: 1 },
  { name: 'سهل',      options: 3, items: 4, view: 5, rounds: 4, pairs: 3, drag: 3, missing: 1, hintAfter: 1 },
  { name: 'متوسط',    options: 4, items: 5, view: 4, rounds: 5, pairs: 4, drag: 4, missing: 1, hintAfter: 2 },
  { name: 'متقدم',    options: 5, items: 6, view: 3, rounds: 6, pairs: 6, drag: 5, missing: 2, hintAfter: 3 },
];
// options: answer pictures · items: pictures to remember · view: seconds to look · pairs: memory pairs
// drag: shadows to fill · missing: pictures that vanish · hintAfter: wrong tries before the right answer glows
// (memory plays half as many boards as rounds; from level 2 its pairs are a picture and its shadow)

const GAME_AGES = [
  { label: 'ثلاث سنوات', level: 0, pic: '01' },
  { label: 'أربع سنوات', level: 1, pic: '08' },
  { label: 'خمس وستّ سنوات', level: 2, pic: '04' },
  { label: 'سبع سنوات فأكثر', level: 3, pic: '20' },
];

const GAME_STATIONS = [
  { id: 'word', place: 'أرض الكلمات', name: 'الكلمة وصورتها' },
  { id: 'memory', place: 'حديقة الأزواج', name: 'أين زوجي؟' },
  { id: 'shadow', place: 'بيت الظلال', name: 'ضعه في مكانه' },
  { id: 'letter', place: 'غابة الحروف', name: 'بأيّ حرف تبدأ؟' },
  { id: 'missing', place: 'الأرض السحرية', name: 'من اختفى؟' },
];

const GAME_BADGES = [
  { id: 'first', name: 'النجمة الأولى', about: 'أنهيت لعبتك الأولى.' },
  { id: 'animals', name: 'صديق الحيوانات', about: 'عرفت خمسة حيوانات مختلفة.' },
  { id: 'memory', name: 'الذاكرة القويّة', about: 'أنهيت لعبة الأزواج بلا خطأ.' },
  { id: 'letters', name: 'صديق الحروف', about: 'خمس إجابات صحيحة في لعبة الحروف.' },
  { id: 'puzzle', name: 'بطل الظلال', about: 'وضعت عشر صور في أماكنها.' },
  { id: 'explorer', name: 'المستكشف الصغير', about: 'وجدت خمس صور مختفية.' },
  { id: 'champion', name: 'بطل دنياي السعيدة', about: 'أنهيت كلّ الألعاب.' },
];
