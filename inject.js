
(function() {
  const urlParams = new URLSearchParams(window.location.search);
  const room = urlParams.get("room");
  const username = urlParams.get("user") || "Anon";

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
    container.innerHTML = \`
      <div id="watchUI" class="fixed top-1/2 right-0 z-[99999] flex flex-col items-end transform -translate-y-1/2 font-sans">
        <button id="togglePanel" class="bg-cyan-500 text-black px-3 py-2 rounded-l shadow font-bold hover:bg-cyan-400 transition hidden">▶</button>
        <div id="panel" class="hidden w-96 h-[70vh] bg-gray-900 text-white rounded-l shadow-lg overflow-hidden flex flex-col">
          <div class="bg-gray-800 text-cyan-300 font-semibold px-4 py-2">🎬 Room: \${room}</div>
          <div id="log" class="flex-1 overflow-y-auto px-4 py-2 space-y-1 text-sm"></div>
          <form id="chatForm" class="flex border-t border-gray-700">
            <input id="chatInput" type="text" placeholder="Type a message..." class="flex-1 px-3 py-2 bg-gray-700 text-white outline-none">
            <button class="bg-cyan-500 text-black px-4 py-2 font-bold hover:bg-cyan-400">Send</button>
          </form>
        </div>
      </div>
    \`;
    document.body.appendChild(container);

    const panel = document.getElementById("panel");
    const toggleBtn = document.getElementById("togglePanel");
    const logBox = document.getElementById("log");

    // Show toggle button on mouse move
    let hideTimeout;
    const showToggle = () => {
      toggleBtn.classList.remove("hidden");
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => toggleBtn.classList.add("hidden"), 3000);
    };
    document.addEventListener("mousemove", showToggle);

    toggleBtn.onclick = () => {
      panel.classList.toggle("hidden");
    };

    const log = (msg) => {
      const div = document.createElement("div");
      div.textContent = msg;
      logBox.appendChild(div);
      logBox.scrollTop = logBox.scrollHeight;
    };

    actionsRef.on("child_added", snap => {
      const action = snap.val();
      if (action.username === username) return;

      if (action.type === "play") video.play();
      if (action.type === "pause") video.pause();
      if (action.type === "seek") video.currentTime = action.time;

      log(\`▶ [\${action.username}] \${action.type} @ \${action.time || ""}\`);
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
      log(\`💬 [\${msg.username}]: \${msg.text}\`);
    });

    log("👋 Joined room as " + username);
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
