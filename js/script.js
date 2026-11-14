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

document.getElementById('themeBtn').addEventListener('click', () => {
  document.body.classList.toggle('dark');
});
