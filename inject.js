(function () {
  console.log("📦 Inject script starting...");

  const currentScript = document.currentScript || [...document.querySelectorAll("script")].find(s => s.src.includes("inject.js"));
  const urlParams = new URLSearchParams(currentScript?.src.split("?")[1] || "");
  const room = urlParams.get("room");
  const username = urlParams.get("user") || "Anon";

  if (!room) {
    alert("❗ No room specified in inject.js");
    return;
  }

  console.log("✅ Room:", room, "| User:", username);

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
    s.onload = () => {
      console.log("✅ Loaded script:", src);
      cb();
    };
    s.onerror = () => console.error("❌ Failed to load script:", src);
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
    console.log("⚙️ Firebase initializing...");
    try {
      const app = firebase.initializeApp(firebaseConfig);
      const db = firebase.database();
      const actionsRef = db.ref(room + "/actions");
      const chatRef = db.ref(room + "/chat");

      const video = document.querySelector("video");
      if (!video) {
        alert("❗ No video element found.");
        console.error("❌ No video element found.");
        return;
      }

      console.log("🎥 Video element found");

      // UI container
      const container = document.createElement("div");
      container.innerHTML = `
        <div id="watchUI" class="fixed bottom-5 right-5 z-[99999] flex flex-col items-end gap-2 font-sans">
          <button id="togglePanel" class="bg-cyan-400 text-black px-4 py-2 rounded shadow font-bold hover:bg-cyan-300 transition hidden">Toggle Panel</button>
          <div id="panel" class="hidden w-80 max-h-[60vh] bg-gray-800 text-white rounded shadow overflow-hidden text-sm flex flex-col">
            <div class="bg-gray-900 text-cyan-300 font-semibold px-4 py-2">🎬 Room: ${room}</div>
            <div id="log" class="flex-1 overflow-y-auto px-4 py-2 space-y-1 text-sm"></div>
            <form id="chatForm" class="flex border-t border-gray-700">
              <input id="chatInput" type="text" placeholder="Type a message..." class="flex-1 px-3 py-2 bg-gray-700 text-white outline-none">
              <button class="bg-cyan-400 text-black px-4 py-2 font-bold hover:bg-cyan-300">Send</button>
            </form>
          </div>
        </div>
      `;
      document.body.appendChild(container);
      console.log("✅ UI injected");

      const panel = document.getElementById("panel");
      const toggleBtn = document.getElementById("togglePanel");
      const logBox = document.getElementById("log");

      // Mouse movement toggle visibility
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
        console.log(msg);
        const div = document.createElement("div");
        div.textContent = msg;
        logBox.appendChild(div);
        logBox.scrollTop = logBox.scrollHeight;
      };

      actionsRef.on("child_added", snap => {
        const action = snap.val();
        if (action.username === username) return;

        if (action.type === "play") {
          video.play();
          log(`▶ [${action.username}] played`);
        }
        if (action.type === "pause") {
          video.pause();
          log(`⏸ [${action.username}] paused`);
        }
        if (action.type === "seek") {
          video.currentTime = action.time;
          log(`⏩ [${action.username}] seeked to ${action.time}`);
        }
      });

      video.addEventListener("play", () => {
        log("🔊 You played the video");
        actionsRef.push({ type: "play", username });
      });

      video.addEventListener("pause", () => {
        log("🔇 You paused the video");
        actionsRef.push({ type: "pause", username });
      });

      video.addEventListener("seeked", () => {
        log(`⏩ You seeked to ${video.currentTime.toFixed(1)}`);
        actionsRef.push({ type: "seek", time: video.currentTime, username });
      });

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
        log(`💬 [${msg.username}]: ${msg.text}`);
      });

      log("👋 Joined room as " + username);
    } catch (e) {
      console.error("🔥 Firebase init failed:", e);
    }
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
