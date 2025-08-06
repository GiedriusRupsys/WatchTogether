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

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, "0");
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
    const s = Math.floor(secs % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const init = () => {
    console.log("[WatchTogether] Initializing Firebase...");
    const app = firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

    const actionsRef = db.ref(`${room}/actions`);
    const presenceRef = db.ref(`${room}/presence/${username}`);
    const presenceListRef = db.ref(`${room}/presence`);
    const roomMetaRef = db.ref(`${room}/meta`);

    const joinedAt = Date.now();

    roomMetaRef.update({ lastActive: joinedAt });
    roomMetaRef.onDisconnect().remove();

    presenceRef.set(true);
    presenceRef.onDisconnect().remove();

    const video = document.querySelector("video");
    if (!video) {
      console.warn("[WatchTogether] No video element found.");
      return;
    }

    // Seek to room's current time
    roomMetaRef.child("currentTime").once("value").then(snap => {
      const time = snap.val();
      if (typeof time === "number") {
        video.currentTime = time;
        console.log("[WatchTogether] Synced to room time:", formatTime(time));
      }
    });

    const log = (msg) => {
      console.log("[WatchTogether]", msg);
    };

    presenceListRef.on("value", snap => {
      const users = snap.val() || {};
      log(`Current users: ${Object.keys(users).join(", ")}`);
    });

    let lastAction = { type: null, time: null };

    actionsRef.on("child_added", snap => {
      const action = snap.val();
      if (!action || action.timestamp < joinedAt) return;
      if (action.username === username) return;

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
    };

    video.addEventListener("play", () => {
      if (lastAction.type !== "play") {
        pushAction("play");
        log("You played");
        lastAction = { type: "play" };
      }
    });

    video.addEventListener("pause", () => {
      if (lastAction.type !== "pause") {
        pushAction("pause");
        log("You paused");
        lastAction = { type: "pause" };
      }
    });

    video.addEventListener("seeked", () => {
      const time = video.currentTime;
      if (lastAction.type !== "seek" || Math.abs(lastAction.time - time) > 1) {
        pushAction("seek", { time });
        roomMetaRef.update({ currentTime: time });
        log(`You seeked to ${formatTime(time)}`);
        lastAction = { type: "seek", time };
      }
    });

    firebase.database().ref(".info/connected").on("value", (snap) => {
      const connected = snap.val() === true;
      console.log("[Firebase] Connection status:", connected);
    });

    log(`Joined as ${username}`);
  };

  if (!window.firebase) {
    const load = (src, cb) => loadScript(src, cb);
    load("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js", () => {
      load("https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js", init);
    });
  } else {
    init();
  }
})();
