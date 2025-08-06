(function () {
  const thisScript = [...document.scripts].find(s => s.src.includes("inject.js"));
  const params = new URL(thisScript.src).searchParams;

  const room = params.get("room");
  const username = params.get("user") || "Anon";

  if (!room) {
    alert("No room specified in inject.js");
    return;
  }

  const firebaseConfig = {
    apiKey: "AIzaSyB0mhn8-HiDZviiIXVNIFmmgbfGcg7m-MI",
    authDomain: "watch-together-8f006.firebaseapp.com",
    projectId: "watch-together-8f006",
    storageBucket: "watch-together-8f006.appspot.com",
    messagingSenderId: "1050874568804",
    appId: "1:1050874568804:web:d87ddaeaa0112e3399bf71",
    databaseURL: "https://watch-together-8f006-default-rtdb.europe-west1.firebasedatabase.app/"
  };

  const loadScript = (src, cb) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = cb;
    document.head.appendChild(s);
  };

  const loadTailwind = () => {
    if (!document.getElementById("tailwind-cdn")) {
      const l = document.createElement("link");
      l.href = "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css";
      l.rel = "stylesheet";
      l.id = "tailwind-cdn";
      document.head.appendChild(l);
    }
  };

  const init = () => {
    const app = firebase.initializeApp(firebaseConfig);
    const db = firebase.database();
    const actionsRef = db.ref(room + "/actions");
    const chatRef = db.ref(room + "/chat");

    const video = document.querySelector("video");
    if (!video) {
      alert("No video element found.");
      return;
    }

    const container = document.createElement("div");
    container.innerHTML = `
      <div id="watchUI" class="fixed top-0 right-0 z-[99999] flex items-center h-screen pointer-events-none">
        <button id="togglePanel" class="pointer-events-auto transition-opacity duration-300 opacity-0 mr-2 bg-gray-800 text-white font-semibold px-4 py-2 rounded-full shadow hover:bg-gray-700 focus:outline-none">
          ⬅ Chat
        </button>
        <div id="panel" class="hidden pointer-events-auto w-96 h-full bg-gray-900 text-white rounded-l-xl shadow-lg flex flex-col overflow-hidden">
          <div class="bg-gray-800 px-5 py-4 border-b border-gray-700 text-lg font-semibold flex justify-between items-center">
            Room: ${room}
            <button id="closePanel" class="text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
          </div>
          <div id="log" class="flex-1 overflow-y-auto px-4 py-3 space-y-2 text-base font-mono bg-gray-900"></div>
          <form id="chatForm" class="border-t border-gray-800 flex bg-gray-800">
            <input id="chatInput" type="text" placeholder="Message..."
              class="flex-1 px-4 py-4 text-base bg-gray-800 text-white placeholder-gray-400 focus:outline-none" />
            <button class="px-5 text-cyan-400 hover:text-white font-semibold">Send</button>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(container);

    const toggleBtn = document.getElementById("togglePanel");
    const panel = document.getElementById("panel");
    const closePanel = document.getElementById("closePanel");
    const logBox = document.getElementById("log");

    toggleBtn.onclick = () => panel.classList.toggle("hidden");
    closePanel.onclick = () => panel.classList.add("hidden");

    let hideTimeout;
    const showToggle = () => {
      toggleBtn.classList.remove("opacity-0");
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => toggleBtn.classList.add("opacity-0"), 3000);
    };
    document.addEventListener("mousemove", showToggle);

    const log = (msg, type = "normal") => {
      const div = document.createElement("div");
      div.textContent = msg;
      div.className = "bg-gray-800 text-white px-4 py-2 rounded-md";
      logBox.appendChild(div);
      logBox.scrollTop = logBox.scrollHeight;
    };

    // Firebase listeners
    actionsRef.on("child_added", snap => {
      const action = snap.val();
      if (action.username === username) return;

      const now = new Date().toLocaleTimeString();
      if (action.type === "play") {
        video.play();
        log(`▶️ ${now} - ${action.username} played the video`);
      }
      if (action.type === "pause") {
        video.pause();
        log(`⏸️ ${now} - ${action.username} paused the video`);
      }
      if (action.type === "seek") {
        video.currentTime = action.time;
        log(`⏩ ${now} - ${action.username} seeked to ${action.time.toFixed(1)}s`);
      }
    });

    video.addEventListener("play", () => actionsRef.push({ type: "play", username }));
    video.addEventListener("pause", () => actionsRef.push({ type: "pause", username }));
    video.addEventListener("seeked", () => actionsRef.push({ type: "seek", time: video.currentTime, username }));

    document.getElementById("chatForm").addEventListener("submit", e => {
      e.preventDefault();
      const input = document.getElementById("chatInput");
      const text = input.value.trim();
      if (text) {
        chatRef.push({ text, username });
        input.value = "";
      }
    });

    chatRef.on("child_added", snap => {
      const msg = snap.val();
      const now = new Date().toLocaleTimeString();
      log(`💬 ${now} - ${msg.username}: ${msg.text}`);
    });

    log("✅ Joined room as " + username);
  };

  loadTailwind();
  if (!window.firebase) {
    loadScript("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js", () => {
      loadScript("https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js", init);
    });
  } else {
    init();
  }
})();
