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
      <div id="infoBox" class="fixed top-4 right-4 z-[99999] bg-gray-900/90 text-white text-sm rounded-xl shadow-2xl p-4 space-y-2 w-80 font-sans backdrop-blur-md border border-gray-700 opacity-0 transition-opacity duration-500">
        <div><span class="text-gray-400">Room</span>: <span id="roomName" class="text-gray-200">${room}</span></div>
        <div><span class="text-gray-400">Users</span> (<span id="userCount">1</span>): <span id="userList" class="text-gray-300"></span></div>
        <ul id="logBox" class="list-none space-y-1 text-xs text-gray-300 mt-1"></ul>
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
        log(`⏩ ${action.username} seeked to ${Math.round(action.time)}s`);
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
      log(`⏩ You seeked to ${Math.round(video.currentTime)}s`);
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
