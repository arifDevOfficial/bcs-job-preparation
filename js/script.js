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
