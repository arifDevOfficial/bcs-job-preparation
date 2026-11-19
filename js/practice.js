// ===== MCQ Practice (শুধু Supabase থেকে পড়া হয়; কোনো INSERT/UPDATE/DELETE নেই) =====
// শুধু Project URL ও Publishable/Anon Key (js/script.js-এর একই মান)।
// সতর্কতা: এখানে কখনো Service Role Key বা Database Password বসাবেন না।
const SUPABASE_URL = 'https://ufjqlqagbdxakmtwoxnv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_9G0e5NL80Z57lWF0PmxacQ_X8eI08TL';

// এই পেজ শুধু পড়ে, তাই Login Session সংরক্ষণ বা Token Refresh করা হয় না (সবসময় anon Role)।
const db = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    })
  : null;

const $ = (id) => document.getElementById(id);
const screens = { subject: $('subjectScreen'), chapter: $('chapterScreen'), quiz: $('quizScreen'), result: $('resultScreen') };
const bn = (n) => Number(n).toLocaleString('bn-BD');

let currentSubject = null;
let currentChapter = null;
let chapters = [];
let questions = [];
let qIndex = 0;
let score = 0;
let answered = false;
let reqId = 0;          // পুরোনো Request-এর দেরিতে আসা ফল বাতিল করতে
let retryAction = null;

function show(name) {
  Object.keys(screens).forEach((k) => { screens[k].hidden = k !== name; });
}
function setStatus(text) { $('status').textContent = text || ''; }
function clearError() { $('errorBox').hidden = true; retryAction = null; }
function showError(message, retry) {
  setStatus('');
  $('errorText').textContent = message;
  retryAction = retry;
  $('errorBox').hidden = false;
}
function errorMessage(error, fallback) {
  const msg = (error.message || '').toLowerCase();
  if (error.code === '42501' || msg.includes('permission denied')) return 'ডেটা পড়ার অনুমতি নেই। Database-এর SELECT Policy ও Permission দেখে নিন।';
  if (msg.includes('fetch') || msg.includes('network')) return 'নেটওয়ার্ক সমস্যা। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।';
  return fallback;
}

// বিষয়/অধ্যায়ের তালিকা বোতাম আকারে দেখানো
function renderChoices(container, rows, onPick, emptyText) {
  container.innerHTML = '';
  if (!rows.length) {
    const p = document.createElement('p');
    p.className = 'empty-msg';
    p.textContent = emptyText;
    container.appendChild(p);
    return;
  }
  rows.forEach((row) => {
    const b = document.createElement('button');
    b.className = 'choice-btn';
    b.textContent = row.name;
    b.addEventListener('click', () => onPick(row));
    container.appendChild(b);
  });
}

// ১) বিষয় লোড
async function loadSubjects() {
  const id = ++reqId;
  clearError();
  currentSubject = null;
  show('subject');
  $('subjectList').innerHTML = '';
  setStatus('বিষয় লোড হচ্ছে...');
  const { data, error } = await db.from('demo_subjects').select('id, name').order('id');
  if (id !== reqId) return;
  if (error) { showError(errorMessage(error, 'বিষয় লোড করা যায়নি।'), loadSubjects); return; }
  setStatus('');
  renderChoices($('subjectList'), data, loadChapters, 'কোনো বিষয় পাওয়া যায়নি।');
}

// ২) অধ্যায় লোড
async function loadChapters(subject) {
  const id = ++reqId;
  clearError();
  currentSubject = subject;
  show('chapter');
  $('chapterTitle').textContent = subject.name + ' — অধ্যায় বেছে নিন';
  $('chapterList').innerHTML = '';
  setStatus('অধ্যায় লোড হচ্ছে...');
  const { data, error } = await db.from('demo_chapters').select('id, name').eq('subject_id', subject.id).order('id');
  if (id !== reqId) return;
  if (error) { showError(errorMessage(error, 'অধ্যায় লোড করা যায়নি।'), () => loadChapters(subject)); return; }
  chapters = data;
  setStatus('');
  renderChapterList();
}
function renderChapterList() {
  show('chapter');
  $('chapterTitle').textContent = currentSubject.name + ' — অধ্যায় বেছে নিন';
  renderChoices($('chapterList'), chapters, loadQuestions, 'এই বিষয়ে কোনো অধ্যায় নেই।');
}

// ৩) প্রশ্ন ও Option একসঙ্গে লোড (Foreign Key ধরে)
async function loadQuestions(chapter) {
  const id = ++reqId;
  clearError();
  currentChapter = chapter;
  show('quiz');
  $('progress').textContent = chapter.name;
  $('questionText').textContent = '';
  $('optionList').innerHTML = '';
  $('feedback').textContent = '';
  $('nextBtn').hidden = true;
  setStatus('প্রশ্ন লোড হচ্ছে...');
  const { data, error } = await db
    .from('demo_questions')
    .select('id, question_text, demo_options(id, option_label, option_text, is_correct)')
    .eq('chapter_id', chapter.id)
    .order('id');
  if (id !== reqId) return;
  if (error) { showError(errorMessage(error, 'প্রশ্ন লোড করা যায়নি।'), () => loadQuestions(chapter)); return; }
  setStatus('');
  // Option নেই এমন প্রশ্ন বাদ; Option A, B, C, D ক্রমে সাজানো
  questions = data
    .map((q) => ({ ...q, options: (q.demo_options || []).slice().sort((a, b) => a.option_label.localeCompare(b.option_label)) }))
    .filter((q) => q.options.length > 0);
  if (!questions.length) {
    $('questionText').textContent = '';
    const p = document.createElement('p');
    p.className = 'empty-msg';
    p.textContent = 'এই অধ্যায়ে কোনো প্রশ্ন নেই।';
    $('optionList').appendChild(p);
    return;
  }
  startQuiz();
}

function startQuiz() {
  qIndex = 0;
  score = 0;
  show('quiz');
  renderQuestion();
}

function renderQuestion() {
  const q = questions[qIndex];
  answered = false;
  $('progress').textContent = `${currentChapter.name} · প্রশ্ন ${bn(qIndex + 1)} / ${bn(questions.length)}`;
  $('questionText').textContent = q.question_text;
  $('feedback').textContent = '';
  $('nextBtn').hidden = true;
  const list = $('optionList');
  list.innerHTML = '';
  q.options.forEach((opt) => {
    const b = document.createElement('button');
    b.className = 'option-btn';
    b.textContent = `${opt.option_label}. ${opt.option_text}`;
    b.addEventListener('click', () => answer(b, opt));
    list.appendChild(b);
  });
}

// উত্তর দেওয়া: সঠিক Option সবুজ, ভুল নির্বাচিত Option লাল
function answer(button, chosen) {
  if (answered) return;
  answered = true;
  const q = questions[qIndex];
  const buttons = Array.from($('optionList').children);
  q.options.forEach((opt, i) => {
    buttons[i].disabled = true;
    if (opt.is_correct) buttons[i].classList.add('correct');
    else if (opt === chosen) buttons[i].classList.add('wrong');
  });
  const correct = q.options.find((o) => o.is_correct);
  if (!correct) {
    $('feedback').textContent = 'এই প্রশ্নের সঠিক উত্তর সেট করা নেই।';
  } else if (chosen.is_correct) {
    score++;
    $('feedback').textContent = 'সঠিক উত্তর! ✅';
  } else {
    $('feedback').textContent = `ভুল উত্তর। সঠিক উত্তর: ${correct.option_label} ❌`;
  }
  $('nextBtn').textContent = qIndex === questions.length - 1 ? 'ফলাফল দেখো' : 'পরের প্রশ্ন';
  $('nextBtn').hidden = false;
}

function nextQuestion() {
  if (qIndex < questions.length - 1) { qIndex++; renderQuestion(); } else { showResult(); }
}

function showResult() {
  const total = questions.length;
  const percent = Math.round((score / total) * 100);
  $('scoreText').textContent = `${bn(score)} / ${bn(total)}`;
  $('scoreMsg').textContent = percent >= 80 ? `চমৎকার! (${bn(percent)}%)`
    : percent >= 50 ? `ভালো হয়েছে, আরও অনুশীলন করুন। (${bn(percent)}%)`
    : `আরও অনুশীলন দরকার। (${bn(percent)}%)`;
  show('result');
}

// বোতামের কাজ
$('nextBtn').addEventListener('click', nextQuestion);
$('retryBtn').addEventListener('click', () => { if (retryAction) { const f = retryAction; f(); } });
$('backToSubjects').addEventListener('click', loadSubjects);
$('backToChapters').addEventListener('click', () => { reqId++; clearError(); setStatus(''); renderChapterList(); });
$('retryQuizBtn').addEventListener('click', startQuiz);
$('otherChapterBtn').addEventListener('click', renderChapterList);
$('otherSubjectBtn').addEventListener('click', loadSubjects);

if (!db) {
  showError('Supabase লোড করা যায়নি। ইন্টারনেট সংযোগ দেখে পেজ রিফ্রেশ করুন।', null);
} else {
  loadSubjects();
}
