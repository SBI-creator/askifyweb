
// ================== Firebase Imports ==================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
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
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ================== Firebase Config ==================
const firebaseConfig = {
  apiKey: "AIzaSyB2ICEhJa2wdwLEpjAmiubsKD5h_qz4rsw",
  authDomain: "askify-c1734.firebaseapp.com",
  projectId: "askify-c1734",
  storageBucket: "askify-c1734.appspot.com",
  messagingSenderId: "598567539886",
  appId: "1:598567539886:web:5dc5c2f1b0196f4ddc493f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ================== Check Login ==================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    document.querySelector(".chat-header p").textContent = user.email;
    loadChatHistory(user.uid);
  }
});

// ================== DOM Elements ==================
const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");
const logoutBtn = document.getElementById("logout");
const newChatBtn = document.querySelector(".new-chat");
let lastMessageWasVoice = false;

// ================== Logout ==================
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// ================== New Chat ==================
newChatBtn.addEventListener("click", () => {
  chatBox.innerHTML = "";
});

// ================== Typing + Immediate Voice ==================
function typeWriterWithVoice(text, element, isVoiceMessage) {
  let i = 0;
  const speed = 20;
  let buffer = "";

  function type() {
    if (i < text.length) {
      const char = text.charAt(i);
      element.innerHTML += char;
      buffer += char;
      i++;

      if (isVoiceMessage && (/[.!?]/.test(char) || buffer.length > 50)) {
        speakResponse(buffer.trim());
        buffer = "";
      }

      setTimeout(type, speed);
    } else {
      if (isVoiceMessage && buffer.length > 0) {
        speakResponse(buffer.trim());
      }
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
    console.log(`✅ Message saved: ${sender} - ${text}`);
  } catch (error) {
    console.error("❌ Error saving message:", error);
  }
}

// ================== Keys ==================
const openaiKey = "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";
const tavilyKey = "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";

// ================== Local date/time helpers ==================
function getLocalDateTime({ timeZone = "Africa/Lagos" } = {}) {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone
  }).format(now);
  const timeStr = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone
  }).format(now);
  return { dateStr, timeStr, full: `${dateStr} ${timeStr}` };
}

function isLocalDateOrTimeQuestion(q) {
  return /\b(today|what('?s| is) the date|date today|what day|current date|what time|time now|now)\b/i.test(q);
}

// ================== Tavily Search ==================
async function askTavily(query) {
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tavilyKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query, max_results: 5 })
    });

    if (!response.ok) {
      console.error("❌ Tavily API error:", await response.text());
      return null;
    }

    const data = await response.json();
    if (!data.results) return null;
    return data.results.map(r => r.content).join("\n\n") || null;
  } catch (err) {
    console.error("❌ Tavily Fetch Error:", err);
    return null;
  }
}

// ================== OpenAI Chat ==================
async function askOpenAI(question, extraContext) {
  try {
    const { full } = getLocalDateTime({ timeZone: "Africa/Lagos" });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are Askify, an AI assistant that gives clear, accurate, and concise answers." },
          { role: "system", content: `Current date/time (Africa/Lagos): ${full}` },
          {
            role: "user",
            content: extraContext && extraContext.length > 0
              ? `${question}\n\nUse the following web search results to inform your answer (not user-provided context):\n${extraContext}`
              : question
          }
        ],
        max_tokens: 400
      })
    });

    if (!response.ok) {
      console.error("❌ OpenAI API error:", await response.text());
      return "AI could not answer.";
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      return "AI could not answer.";
    }

    return data.choices[0].message.content.trim();
  } catch (err) {
    console.error("❌ OpenAI Fetch Error:", err);
    return "AI could not answer.";
  }
}

// ================== Decide Fresh Info ==================
function needsFreshInfo(question) {
  const keywords = ["yesterday", "this week", "latest", "2024", "2025", "news", "score", "match", "update"];
  const lower = question.toLowerCase();
  for (let i = 0; i < keywords.length; i++) {
    if (lower.includes(keywords[i])) return true;
  }
  return false;
}

// ================== Form Submit ==================
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  const question = input.value.trim();
  if (!question || !user) return;
  input.value = "";

  // User message
  const userMsg = document.createElement("div");
  userMsg.className = "user-msg";
  userMsg.textContent = question;
  chatBox.appendChild(userMsg);
  await saveMessage(user.uid, "user", question);

  // Handle local date/time questions
  if (isLocalDateOrTimeQuestion(question)) {
    const { dateStr, timeStr } = getLocalDateTime({ timeZone: "Africa/Lagos" });
    let responseText = /\btime\b/i.test(question) || /\bnow\b/i.test(question)
      ? `Current time in Lagos: ${timeStr}`
      : `Today is ${dateStr}`;

    const aiMsg = document.createElement("div");
    aiMsg.className = "ai-msg";
    chatBox.appendChild(aiMsg);

    typeWriterWithVoice(responseText, aiMsg, lastMessageWasVoice);
    await saveMessage(user.uid, "ai", responseText);
    lastMessageWasVoice = false;
    return;
  }

  // AI typing
  const aiMsg = document.createElement("div");
  aiMsg.className = "ai-msg typing";
  chatBox.appendChild(aiMsg);

  let response;
  if (needsFreshInfo(question)) {
    const tavilyResults = await askTavily(question);
    response = await askOpenAI(question, tavilyResults || "");
  } else {
    response = await askOpenAI(question);
  }

  aiMsg.classList.remove("typing");
  typeWriterWithVoice(response, aiMsg, lastMessageWasVoice);
  await saveMessage(user.uid, "ai", response);
  lastMessageWasVoice = false;
});

// ================== Load Chat History ==================
async function loadChatHistory(userId) {
  try {
    const q = query(collection(db, "chats"), orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.userId === userId) {
        const msg = document.createElement("div");
        msg.className = data.sender === "user" ? "user-msg" : "ai-msg";
        msg.textContent = data.text;
        chatBox.appendChild(msg);
      }
    });
  } catch (e) {
    console.error("History load error:", e);
  }
}

// ================== Voice Output ==================
function speakResponse(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.pitch = 1;
  utterance.rate = 1;
  speechSynthesis.speak(utterance);
}

// ================== Voice Input ==================
const voiceBtn = document.getElementById("voice-btn");
const stopBtn =


document.getElementById("stop-btn");
let recognition;

// Start voice recognition
voiceBtn.addEventListener("click", () => {
  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = "en-US";
  recognition.interimResults = false;

  recognition.start();
  voiceBtn.style.display = "none";
  stopBtn.style.display = "inline-block";
  voiceBtn.classList.add("listening");

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    input.value = transcript;
    lastMessageWasVoice = true;
  };

  recognition.onend = () => {
    voiceBtn.style.display = "inline-block";
    stopBtn.style.display = "none";
    voiceBtn.classList.remove("listening");

    if (input.value.trim()) {
      form.dispatchEvent(new Event("submit"));
    }
  };

  recognition.onerror = (err) => {
    console.error("🎤 Error:", err);
    voiceBtn.style.display = "inline-block";
    stopBtn.style.display = "none";
    voiceBtn.classList.remove("listening");
  };
});

// Manual stop button
stopBtn.addEventListener("click", () => {
  if (recognition) recognition.stop();
});