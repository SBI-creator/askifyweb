// ================== Firebase Imports ==================
import { auth, isAuthenticated } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ================== Firebase Init ==================
const db = getFirestore(auth.app);

// ================== DOM Elements ==================
const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");
const logoutBtn = document.getElementById("logout");
const newChatBtn = document.getElementById("new-chat");
const voiceBtn = document.getElementById("voice-btn");
const stopBtn = document.getElementById("stop-btn");
const hamburgerMenu = document.getElementById("hamburger-menu");
const sidebar = document.getElementById("sidebar");
const userProfile = document.getElementById("user-profile");
const settingsModal = document.getElementById("settings-modal");
const closeModal = document.getElementById("close-modal");
const clearHistoryBtn = document.getElementById("clear-history-btn");
const deleteChatBtn = document.getElementById("delete-chat-btn");
const searchToggle = document.getElementById("search-mode-toggle");

const modalUserName = document.getElementById("modal-user-name");
const modalUserEmail = document.getElementById("modal-user-email");
const userNameDisplay = document.getElementById("user-name-display");

let lastMessageWasVoice = false;

// ================== Check Login & UI Init ==================
if (!isAuthenticated()) {
  window.location.href = "login.html";
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    if (!isAuthenticated()) {
      window.location.href = "login.html";
    }
  } else {
    // Populate UI with user data
    const email = user.email || "User";
    const name = user.displayName || email.split('@')[0];
    const initial = name.charAt(0).toUpperCase();

    document.getElementById("user-initials").textContent = initial;
    userNameDisplay.textContent = name;
    modalUserName.textContent = name;
    modalUserEmail.textContent = email;

    loadChatHistory(user.uid);
  }
});

// ================== Mobile Hamburger Toggle ==================
hamburgerMenu.addEventListener("click", () => {
  sidebar.classList.toggle("active");
});

// Close sidebar when clicking outside on mobile
document.addEventListener("click", (e) => {
  if (window.innerWidth <= 768 &&
    sidebar.classList.contains("active") &&
    !sidebar.contains(e.target) &&
    !hamburgerMenu.contains(e.target)) {
    sidebar.classList.remove("active");
  }
});

// Close sidebar when clicking a history item on mobile
document.getElementById("chat-history").addEventListener("click", (e) => {
  if (window.innerWidth <= 768 && e.target.closest(".history-item")) {
    sidebar.classList.remove("active");
  }
});

// ================== Settings Modal Logic ==================
userProfile.addEventListener("click", () => {
  settingsModal.style.display = "flex";
});

closeModal.addEventListener("click", () => {
  settingsModal.style.display = "none";
});

window.addEventListener("click", (e) => {
  if (e.target === settingsModal) settingsModal.style.display = "none";
});

clearHistoryBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;
  if (confirm("Are you sure you want to clear your entire chat history?")) {
    const q = query(collection(db, "chats"), where("userId", "==", user.uid));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    chatBox.innerHTML = "";
    appendMessage("ai", "Chat history cleared.");
    settingsModal.style.display = "none";
  }
});

deleteChatBtn.addEventListener("click", () => {
  chatBox.innerHTML = `
        <div class="message ai-message">
            <div class="avatar"><img src="Logo.png" alt="AI" /></div>
            <div class="content">Conversation cleared. How can I help you now?</div>
        </div>
    `;
  settingsModal.style.display = "none";
});

// ================== Logout ==================
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  localStorage.removeItem('askifyUser');
  window.location.href = "login.html";
});

// ================== New Chat ==================
newChatBtn.addEventListener("click", () => {
  chatBox.innerHTML = `
        <div class="message ai-message">
            <div class="avatar"><img src="Logo.png" alt="AI" /></div>
            <div class="content">How can I help you today?</div>
        </div>
    `;
  if (window.innerWidth <= 768) sidebar.classList.remove("active");
});

// ================== Enter to Send ==================
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.dispatchEvent(new Event("submit"));
  }
});

// ================== Auto-resize Textarea ==================
input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = (input.scrollHeight) + 'px';
});

// =================| Message Rendering |=================
function appendMessage(sender, text) {
  const isAi = sender === "ai";
  const msgDiv = document.createElement("div");
  msgDiv.className = `message ${isAi ? "ai-message" : "user-message"}`;

  const userInitial = document.getElementById("user-initials").textContent || "U";

  if (isAi) {
    msgDiv.innerHTML = `
        <div class="avatar"><img src="Logo.png" alt="AI" /></div>
        <div class="content">${marked.parse(text)}</div>
      `;
    // Enhance highlight
    msgDiv.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block);
    });
  } else {
    msgDiv.innerHTML = `
        <div class="avatar">${userInitial}</div>
        <div class="content">${text}</div>
      `;
  }

  chatBox.appendChild(msgDiv);

  const container = document.querySelector(".main-content");
  container.scrollTop = container.scrollHeight;
  return msgDiv;
}

// ================== Typing Control ==================
function typeWriter(text, element) {
  const contentEl = element.querySelector(".content");
  let i = 0;
  const speed = 10;
  let buffer = "";

  function type() {
    if (i < text.length) {
      buffer += text.charAt(i);
      contentEl.innerHTML = marked.parse(buffer);
      contentEl.querySelectorAll('pre code').forEach((block) => hljs.highlightElement(block));
      i++;
      setTimeout(type, speed);
      const container = document.querySelector(".main-content");
      container.scrollTop = container.scrollHeight;
    }
  }
  type();
}

// ================== Save Message ==================
async function saveMessage(userId, sender, text) {
  try {
    await addDoc(collection(db, "chats"), {
      userId,
      sender,
      text,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error("❌ Error saving message:", error);
  }
}

// ================== API Keys ==================
// [IMPORTANT]: Add your API keys here or use environment variables
const groqKey = "";
const tavilyKey = "";


// ================== API Helpers ==================
async function askTavily(query) {
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Authorization": `Bearer ${tavilyKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, max_results: 5, search_depth: "advanced" })
    });
    const data = await response.json();
    return data.results ? data.results.map(r => `Source: ${r.url}\nContent: ${r.content}`).join("\n\n") : null;
  } catch (err) { return null; }
}

async function askGroq(question, extraContext) {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are Askify, a helpful and direct AI assistant, similar to Gemini. Provide clear, professional, and concise answers. Use Markdown with beautiful structure (bold, headers, lists, and code blocks) where appropriate. Be helpful but get straight to the point." },
          { role: "user", content: extraContext ? `User Question: ${question}\n\nLatest Web Info (use this as context):\n${extraContext}` : question }
        ],
        temperature: 0.7,
        max_tokens: 2048
      })
    });

    if (!response.ok) return "I'm having trouble with my brain right now. Please try again.";

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (err) {
    return "Connection error. Please check your internet.";
  }
}

// ================== Form Submit ==================
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  const question = input.value.trim();
  if (!question || !user) return;

  input.value = "";
  input.style.height = 'auto';

  appendMessage("user", question);
  await saveMessage(user.uid, "user", question);

  const aiMsgDiv = appendMessage("ai", "Thinking...");
  const contentEl = aiMsgDiv.querySelector(".content");

  let searchResults = null;
  if (searchToggle.checked) {
    contentEl.textContent = "Searching the web...";
    searchResults = await askTavily(question);
    contentEl.textContent = "Processing findings...";
  }

  const response = await askGroq(question, searchResults);
  contentEl.innerHTML = "";
  typeWriter(response, aiMsgDiv);
  await saveMessage(user.uid, "ai", response);
});

// ================== Load Chat History ==================
async function loadChatHistory(userId) {
  try {
    const q = query(collection(db, "chats"), orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);
    chatBox.innerHTML = "";
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.userId === userId) {
        appendMessage(data.sender, data.text);
      }
    });
    if (chatBox.innerHTML === "") {
      appendMessage("ai", "How can I help you today?");
    }
    const container = document.querySelector(".main-content");
    container.scrollTop = container.scrollHeight;
  } catch (e) {
    console.error("History load error:", e);
  }
}

// ================== Voice Logic ==================
function speakResponse(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  speechSynthesis.speak(utterance);
}

let recognition;
voiceBtn.addEventListener("click", () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return alert("Voice recognition not supported in this browser.");

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.start();
  voiceBtn.style.display = "none";
  stopBtn.style.display = "flex";

  recognition.onresult = (e) => {
    input.value = e.results[0][0].transcript;
    lastMessageWasVoice = true;
  };
  recognition.onend = () => {
    voiceBtn.style.display = "flex";
    stopBtn.style.display = "none";
    if (input.value.trim()) form.dispatchEvent(new Event("submit"));
  };
});

stopBtn.addEventListener("click", () => { if (recognition) recognition.stop(); });