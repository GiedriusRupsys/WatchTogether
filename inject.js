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
    databaseURL: "https://watch-together-8f006-default-rtdb.firebaseio.com",
    projectId: "watch-together-8f006",
    storageBucket: "watch-together-8f006.firebasestorage.app",
    messagingSenderId: "1050874568804",
    appId: "1:1050874568804:web:d87ddaeaa0112e3399bf71"
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

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, "0");
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
    const s = Math.floor(secs % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const init = () => {
    const app = firebase.initializeApp(firebaseConfig);
    const db = firebase.database();
    const actionsRef = db.ref(`${room}/actions`);
    const chatRef = db.ref(`${room}/chat`);
    const presenceRef = db.ref(`${room}/presence/${username}`);
    const presenceListRef = db.ref(`${room}/presence`);

    presenceRef.set(true);
    presenceRef.onDisconnect().remove();

    const video = document.querySelector("video");
    if (!video) {
      alert("No video element found.");
      return;
    }

    const container = document.createElement("div");
    container.innerHTML = `
      <div id="infoBox" class="fixed top-1/2 -translate-y-1/2 right-4 z-[99999] text-white text-sm rounded-xl shadow-2xl p-4 space-y-2 w-80 font-sans transition-opacity duration-500 opacity-0"
        style="background-color: rgba(28, 28, 30, 0.6); backdrop-filter: blur(8px); border: 1px solid #444;">
        <div><span style="color:#ccc;">Room</span>: <span id="roomName">${room}</span></div>
        <div><span style="color:#ccc;">Users</span> (<span id="userCount">1</span>): <span id="userList"></span></div>
        <ul id="logBox" class="list-none space-y-1 text-xs mt-1 text-gray-100"></ul>
      </div>
    `;
    document.body.appendChild(container);

    const infoBox = document.getElementById("infoBox");
    const logBox = document.getElementById("logBox");
    const userList = document.getElementById("userList");
    const userCount = document.getElementById("userCount");

    const log = (msg) => {
      const li = document.createElement("li");
      li.textContent = msg;
      logBox.appendChild(li);
      while (logBox.children.length > 3) {
        logBox.removeChild(logBox.firstChild);
      }
    };

    let hideTimeout;
    const showBox = () => {
      infoBox.classList.remove("opacity-0");
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        if (!video.paused) infoBox.classList.add("opacity-0");
      }, 3000);
    };
    document.addEventListener("mousemove", showBox);
    video.addEventListener("play", () => infoBox.classList.add("opacity-0"));
    video.addEventListener("pause", () => infoBox.classList.remove("opacity-0"));

    presenceListRef.on("value", snapshot => {
      const users = snapshot.val() || {};
      const names = Object.keys(users);
      userList.textContent = names.join(", ");
      userCount.textContent = names.length;
    });

    actionsRef.on("child_added", snap => {
      const action = snap.val();
      if (action.username === username) return;

      if (action.type === "play") {
        video.play();
        log(`▶ ${action.username} played`);
      }
      if (action.type === "pause") {
        video.pause();
        log(`⏸ ${action.username} paused`);
      }
      if (action.type === "seek") {
        video.currentTime = action.time;
        log(`⏩ ${action.username} seeked to ${formatTime(action.time)}`);
      }
    });

    video.addEventListener("play", () => {
      actionsRef.push({ type: "play", username });
      log(`▶ You played`);
    });

    video.addEventListener("pause", () => {
      actionsRef.push({ type: "pause", username });
      log(`⏸ You paused`);
    });

    video.addEventListener("seeked", () => {
      actionsRef.push({ type: "seek", time: video.currentTime, username });
      log(`⏩ You seeked to ${formatTime(video.currentTime)}`);
    });

    chatRef.on("child_added", snap => {
      const msg = snap.val();
      log(`💬 ${msg.username}: ${msg.text}`);
    });

    log(`👋 Joined as ${username}`);
    showBox();
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
