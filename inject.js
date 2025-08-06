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

  const init = async () => {
    console.log("[WatchTogether] Initializing Firebase...");
    const app = firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

    const actionsRef = db.ref(`${room}/actions`);
    const presenceRef = db.ref(`${room}/presence/${username}`);
    const presenceListRef = db.ref(`${room}/presence`);
    const roomMetaRef = db.ref(`${room}/meta`);

    const joinedAt = Date.now();
    roomMetaRef.update({ lastActive: joinedAt });
    presenceRef.set(true);
    presenceRef.onDisconnect().remove();
    roomMetaRef.onDisconnect().remove();

    const video = document.querySelector("video");
    if (!video) {
      console.warn("[WatchTogether] No video element found.");
      return;
    }

    // UI
    const container = document.createElement("div");
    container.innerHTML = `
      <div id="infoBox" class="fixed top-1/2 -translate-y-1/2 right-4 z-[99999] text-white text-sm rounded-xl shadow-2xl p-4 space-y-2 w-80 font-sans transition-opacity duration-500"
        style="background-color: rgba(28, 28, 30, 0.6); backdrop-filter: blur(8px); border: 1px solid #444;">
        <div class="flex justify-between">
          <div><span class="text-gray-400">Room</span>: <span id="roomName">${room}</span></div>
          <div id="connectionStatus" class="text-green-400">Connected</div>
        </div>
        <div><span class="text-gray-400">Users</span> (<span id="userCount">1</span>): <span id="userList"></span></div>
        <ul id="logBox" class="list-none space-y-1 text-xs mt-1 text-gray-200"></ul>
      </div>
    `;
    document.body.appendChild(container);

    const infoBox = document.getElementById("infoBox");
    const logBox = document.getElementById("logBox");
    const userList = document.getElementById("userList");
    const userCount = document.getElementById("userCount");
    const connectionStatus = document.getElementById("connectionStatus");

    const log = (msg) => {
      console.log("[WatchTogether]", msg);
      const li = document.createElement("li");
      li.textContent = msg;
      logBox.appendChild(li);
      while (logBox.children.length > 5) {
        logBox.removeChild(logBox.firstChild);
      }
    };

    // Show/auto-hide info box
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

    presenceListRef.on("value", snap => {
      const users = snap.val() || {};
      const names = Object.keys(users);
      userList.textContent = names.join(", ");
      userCount.textContent = names.length;
    });

    // Sync on join
    const metaSnap = await roomMetaRef.once("value");
    const meta = metaSnap.val();
    if (meta && typeof meta.currentTime === "number") {
      video.currentTime = meta.currentTime;
      log(`Synced to ${formatTime(meta.currentTime)}`);
    }
    if (meta && meta.lastAction === "play") {
      video.play().catch(e => console.warn("[WatchTogether] Autoplay failed", e));
    } else {
      video.pause();
    }

    let lastAction = { type: null, time: null };

    // Only listen to new actions
    actionsRef
      .orderByChild("timestamp")
      .startAt(joinedAt)
      .on("child_added", snap => {
        const action = snap.val();
        if (!action || action.username === username) return;

        if (action.type === "play" && video.paused) {
          log(`${action.username} played`);
          video.play().catch(e => console.warn("Play error:", e));
          lastAction = action;
        }
        if (action.type === "pause" && !video.paused) {
          log(`${action.username} paused`);
          video.pause();
          lastAction = action;
        }
        if (action.type === "seek" && Math.abs(video.currentTime - action.time) > 1) {
          log(`${action.username} seeked to ${formatTime(action.time)}`);
          video.currentTime = action.time;
          lastAction = action;
        }
      });

    const pushAction = (type, extra = {}) => {
      const action = { type, username, timestamp: Date.now(), ...extra };
      actionsRef.push(action);
      roomMetaRef.update({ lastActive: Date.now(), lastAction: type });
    };

    video.addEventListener("play", () => {
      if (lastAction.type !== "play") {
        pushAction("play");
        log("▶ You played");
        lastAction = { type: "play" };
      }
    });

    video.addEventListener("pause", () => {
      if (lastAction.type !== "pause") {
        pushAction("pause");
        log("⏸ You paused");
        lastAction = { type: "pause" };
      }
    });

    video.addEventListener("seeked", () => {
      const time = video.currentTime;
      if (lastAction.type !== "seek" || Math.abs(lastAction.time - time) > 1) {
        pushAction("seek", { time });
        roomMetaRef.update({ currentTime: time });
        log(`⏩ You seeked to ${formatTime(time)}`);
        lastAction = { type: "seek", time };
      }
    });

    firebase.database().ref(".info/connected").on("value", snap => {
      const connected = snap.val() === true;
      connectionStatus.textContent = connected ? "Connected" : "Disconnected";
      connectionStatus.classList.toggle("text-green-400", connected);
      connectionStatus.classList.toggle("text-red-400", !connected);
      log("Connection status: " + (connected ? "Connected" : "Disconnected"));
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
