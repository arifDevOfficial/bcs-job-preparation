// ===== Supabase সেটিং (শুধু URL ও Publishable/Anon Key বসান) =====
// সতর্কতা: এখানে কখনো Service Role Key বা Database Password বসাবেন না।
const SUPABASE_URL = 'https://ufjqlqagbdxakmtwoxnv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_9G0e5NL80Z57lWF0PmxacQ_X8eI08TL';

const greeting = document.getElementById('greeting');
const nameInput = document.getElementById('nameInput');
const countEl = document.getElementById('count');
let count = 0;

document.getElementById('greetBtn').addEventListener('click', () => {
  const name = nameInput.value.trim();
  greeting.textContent = name ? `হ্যালো, ${name}! 👋` : 'অনুগ্রহ করে নাম লিখুন।';
});

document.getElementById('plus').addEventListener('click', () => { count++; countEl.textContent = count; });
document.getElementById('minus').addEventListener('click', () => { count--; countEl.textContent = count; });
document.getElementById('resetBtn').addEventListener('click', () => { count = 0; countEl.textContent = count; });

document.getElementById('themeBtn').addEventListener('click', () => {
  document.body.classList.toggle('dark');
});

// ===== Supabase: মেসেজ Insert ও Fetch =====
const messageInput = document.getElementById('messageInput');
const msgStatus = document.getElementById('msgStatus');
const messageList = document.getElementById('messageList');

const isConfigured = !SUPABASE_URL.startsWith('YOUR_') && !SUPABASE_KEY.startsWith('YOUR_');
const db = (isConfigured && window.supabase) ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

async function loadMessages() {
  if (!db) { msgStatus.textContent = 'Supabase URL ও Key এখনো সেট করা হয়নি।'; return; }
  const { data, error } = await db
    .from('demo_messages')
    .select('id, message, created_at')
    .order('id', { ascending: false })
    .limit(10);
  if (error) { msgStatus.textContent = 'মেসেজ লোড করা যায়নি।'; return; }
  messageList.innerHTML = '';
  data.forEach((row) => {
    const li = document.createElement('li');
    li.textContent = row.message;
    const time = document.createElement('small');
    time.textContent = new Date(row.created_at).toLocaleString('bn-BD');
    li.appendChild(time);
    messageList.appendChild(li);
  });
  msgStatus.textContent = data.length ? '' : 'এখনো কোনো মেসেজ নেই।';
}

document.getElementById('saveMsgBtn').addEventListener('click', async () => {
  const message = messageInput.value.trim();
  if (!db) { msgStatus.textContent = 'Supabase URL ও Key এখনো সেট করা হয়নি।'; return; }
  if (!message) { msgStatus.textContent = 'অনুগ্রহ করে একটি মেসেজ লিখুন।'; return; }
  const { error } = await db.from('demo_messages').insert({ message });
  if (error) { msgStatus.textContent = 'মেসেজ সেভ করা যায়নি।'; return; }
  messageInput.value = '';
  await loadMessages();
  msgStatus.textContent = 'মেসেজ সেভ হয়েছে ✅';
});

loadMessages();

// ===== Supabase Auth: Sign Up / Login / Logout / Session =====
const authForm = document.getElementById('authForm');
const userInfo = document.getElementById('userInfo');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authStatus = document.getElementById('authStatus');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const logoutBtn = document.getElementById('logoutBtn');

function showAuthUI(session) {
  if (session && session.user) {
    document.getElementById('userEmail').textContent = session.user.email;
    document.getElementById('userId').textContent = session.user.id;
    authForm.hidden = true;
    userInfo.hidden = false;
  } else {
    userInfo.hidden = true;
    authForm.hidden = false;
  }
}

function authErrorMessage(error) {
  const code = (error.code || '').toLowerCase();
  const msg = (error.message || '').toLowerCase();
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) return 'ইমেইল বা পাসওয়ার্ড ভুল।';
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) return 'আগে আপনার ইমেইল যাচাই (Confirm) করুন।';
  if (code === 'user_already_exists' || msg.includes('already registered')) return 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে।';
  if (code === 'weak_password' || msg.includes('password should be')) return 'পাসওয়ার্ড দুর্বল। কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন।';
  if (code === 'validation_failed' || msg.includes('invalid email') || msg.includes('unable to validate email')) return 'ইমেইল ঠিকানাটি সঠিক নয়।';
  if (error.status === 429 || msg.includes('rate limit')) return 'অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।';
  if (msg.includes('fetch') || msg.includes('network')) return 'নেটওয়ার্ক সমস্যা। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।';
  return 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।';
}

function readAuthInputs(isSignup) {
  const email = authEmail.value.trim();
  const password = authPassword.value;
  if (!email || !password) { authStatus.textContent = 'ইমেইল ও পাসওয়ার্ড দুটোই লিখুন।'; return null; }
  if (isSignup && password.length < 6) { authStatus.textContent = 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।'; return null; }
  return { email, password };
}

function setAuthBusy(busy) { loginBtn.disabled = busy; signupBtn.disabled = busy; }

if (!db) {
  authStatus.textContent = 'Supabase সেট করা হয়নি, তাই লগইন করা যাবে না।';
} else {
  // Page Refresh করলে সংরক্ষিত Session ফিরিয়ে আনা
  db.auth.getSession().then(({ data }) => showAuthUI(data.session));
  // Login / Logout / Token Refresh হলে UI আপডেট (এখানে শুধু DOM আপডেট করা হয়)
  db.auth.onAuthStateChange((_event, session) => showAuthUI(session));

  loginBtn.addEventListener('click', async () => {
    const input = readAuthInputs(false);
    if (!input) return;
    setAuthBusy(true);
    authStatus.textContent = 'লগইন হচ্ছে...';
    const { error } = await db.auth.signInWithPassword(input);
    setAuthBusy(false);
    if (error) { authStatus.textContent = authErrorMessage(error); return; }
    authPassword.value = '';
    authStatus.textContent = 'লগইন সফল হয়েছে ✅';
  });

  signupBtn.addEventListener('click', async () => {
    const input = readAuthInputs(true);
    if (!input) return;
    setAuthBusy(true);
    authStatus.textContent = 'অ্যাকাউন্ট তৈরি হচ্ছে...';
    const { data, error } = await db.auth.signUp(input);
    setAuthBusy(false);
    if (error) { authStatus.textContent = authErrorMessage(error); return; }
    authPassword.value = '';
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      authStatus.textContent = 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে।';
    } else if (data.session) {
      authStatus.textContent = 'সাইন আপ সফল হয়েছে ✅';
    } else {
      authStatus.textContent = 'সাইন আপ হয়েছে। আপনার ইমেইলে পাঠানো লিংকে ক্লিক করে যাচাই করুন, তারপর লগইন করুন।';
    }
  });

  logoutBtn.addEventListener('click', async () => {
    const { error } = await db.auth.signOut();
    authStatus.textContent = error ? 'লগআউট করা যায়নি। আবার চেষ্টা করুন।' : 'লগআউট হয়েছে।';
  });
}
