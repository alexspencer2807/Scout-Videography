/**
 * Scout AI Analyst Widget
 * 
 * Handles chat interaction, suggested queries, file upload,
 * freemium message counting, and SSE streaming from the backend.
 * 
 * Phase 1: Runs in demo mode (canned responses)
 * Phase 2: Connects to /analyse/api/chat via SSE
 */

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("chatInput");
  const sendBtn = document.getElementById("chatSend");
  const messages = document.getElementById("chatMessages");
  const pills = document.querySelectorAll(".chat-pill");
  const uploadZone = document.getElementById("uploadZone");
  const uploadInput = document.getElementById("uploadInput");
  const msgCounter = document.getElementById("msgCounter");

  // Freemium config
  const FREE_LIMIT = 5;
  const STORAGE_KEY = "scout_analyst_msgs";

  // Get today's message count from localStorage
  function getMsgCount() {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const today = new Date().toISOString().split("T")[0];
    if (data.date !== today) return 0;
    return data.count || 0;
  }

  function incrementMsgCount() {
    const today = new Date().toISOString().split("T")[0];
    const count = getMsgCount() + 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, count }));
    updateCounter();
    return count;
  }

  function updateCounter() {
    if (!msgCounter) return;
    const used = getMsgCount();
    const remaining = Math.max(0, FREE_LIMIT - used);
    msgCounter.textContent = remaining + " free messages remaining today";
    if (remaining <= 1) {
      msgCounter.style.color = "#E11D48";
    } else {
      msgCounter.style.color = "";
    }
  }

  // Add a message bubble to the chat
  function addMessage(text, isUser) {
    const div = document.createElement("div");
    div.className = "chat-msg " + (isUser ? "chat-msg-user" : "chat-msg-bot");

    if (!isUser) {
      // Format bot messages with basic markdown-like rendering
      div.innerHTML = text
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>");
    } else {
      div.textContent = text;
    }

    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  // Create a typing indicator
  function addTyping() {
    const div = document.createElement("div");
    div.className = "chat-msg chat-msg-bot chat-typing";
    div.innerHTML = '<span class="typing-dots"><span></span><span></span><span></span></span>';
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  // ── DEMO RESPONSES (Phase 1 — no API) ──
  const demoResponses = {
    "What should I work on?": 
      "Great question! Without your match data loaded yet, here are the **three areas** most young footballers in Kingston should focus on:\n\n" +
      "**1. Decision speed in the final third** — The difference between a goal and a missed chance is often less than a second. Rezzil's cognitive drills can cut your decision time from 2+ seconds down to under 1.4s.\n\n" +
      "**2. First touch under pressure** — When you receive the ball with a defender closing, your first touch decides everything. The VR technical drills let you practise 200+ first-touch scenarios per session.\n\n" +
      "**3. Peripheral awareness** — Can you see the run your teammate is making without looking directly at them? Rezzil's peripheral vision drills train exactly this.\n\n" +
      "Want to know which one to prioritise? **Book a Veo recording session** and I can analyse your actual match footage to give you a personalised recommendation.",

    "Analyse my reaction time":
      "I'd love to dig into your reaction data! Here's what I'd need:\n\n" +
      "**Option 1: Upload Rezzil data** — If you've done a VR session with us, I can pull your reaction time scores and compare them against benchmarks for your age and position.\n\n" +
      "**Option 2: Book a VR session** — In a single 45-minute Rezzil session, we'll measure your reaction time across 50+ scenarios. The average for U-18 midfielders in our system is **340ms**. Let's see where you land.\n\n" +
      "Once I have your data, I can show you:\n" +
      "- Your average reaction time vs. the target for your position\n" +
      "- Which drill types improve it fastest\n" +
      "- A 6-session training plan to bring it down\n\n" +
      "Ready to find out? Upload your data above or book a session.",

    "Suggest Rezzil drills for me":
      "Here are the **top Rezzil drills** I'd recommend based on common development areas for Jamaican youth players:\n\n" +
      "**For decision-making:**\n" +
      "- **Fast Pass Decision** — You see 3 passing options flash on screen. Pick the right one before the window closes. Starts at 2s, works down to 0.8s.\n" +
      "- **Colour React** — Targets appear in different colours. You only strike the correct colour. Trains filtering under pressure.\n\n" +
      "**For technique:**\n" +
      "- **First Touch Challenge** — Balls arrive from different angles and speeds. Control and redirect to a target zone. Tracks accuracy %.\n" +
      "- **Finishing Drill** — Goalkeeper reacts. You pick your corner. Measures shot placement and decision speed.\n\n" +
      "**For tactical awareness:**\n" +
      "- **Pitch Scan** — You must identify the positions of teammates before receiving the ball. Measures how quickly you check your surroundings.\n\n" +
      "For a **personalised drill programme**, I'd need your match footage or previous VR session data. Upload it above and I'll build a plan specific to your game.",

    "How do I improve my positioning?":
      "Positioning is one of the hardest skills to teach on the training ground — but it's one of the **easiest to train in VR**. Here's why:\n\n" +
      "On a real pitch, a coach can shout \"check your shoulder\" but you can't pause the game and see the full picture. In VR, we can:\n\n" +
      "**1. Freeze the moment** — Rezzil's tactical drills pause the action and ask: where should you be? You choose, then the game shows you what happens.\n\n" +
      "**2. Repeat the same scenario 50 times** — On a real pitch, a specific game situation might happen twice in 90 minutes. In VR, you face it 50 times in 20 minutes.\n\n" +
      "**3. Measure your improvement** — Your spatial awareness score tracks across sessions. Most players see a **15-20% improvement** within their first 6-session training block.\n\n" +
      "The best approach? **Record your next match with Veo**, then I'll identify the specific positioning errors. We'll build a Rezzil drill programme that targets those exact moments. That's the Scout development loop in action.\n\n" +
      "Ready to start? Book a combination package (Veo + VR) for the best results.",

    "default":
      "Thanks for your question! The AI Analyst is currently in **preview mode** — I'm showing you what the experience will look like when fully connected.\n\n" +
      "When live, I'll be able to:\n" +
      "- **Analyse your Veo match footage** and identify specific improvement areas\n" +
      "- **Review your Rezzil VR training scores** and track progress over time\n" +
      "- **Recommend specific drills** based on your actual performance data\n" +
      "- **Generate full performance reports** you can share with coaches\n\n" +
      "In the meantime, try asking me one of the suggested questions, or **book a session** to start building your performance profile.\n\n" +
      "You can also reach us on WhatsApp for any questions about our services."
  };

  function getDemoResponse(userText) {
    const lower = userText.toLowerCase();

    // Match against known queries
    if (lower.includes("work on") || lower.includes("focus on") || lower.includes("improve")) {
      if (lower.includes("position")) return demoResponses["How do I improve my positioning?"];
      return demoResponses["What should I work on?"];
    }
    if (lower.includes("reaction") || lower.includes("speed") || lower.includes("reaction time")) {
      return demoResponses["Analyse my reaction time"];
    }
    if (lower.includes("drill") || lower.includes("rezzil") || lower.includes("suggest") || lower.includes("recommend")) {
      return demoResponses["Suggest Rezzil drills for me"];
    }
    if (lower.includes("position") || lower.includes("tactical") || lower.includes("spatial")) {
      return demoResponses["How do I improve my positioning?"];
    }

    // Exact pill matches
    if (demoResponses[userText]) return demoResponses[userText];

    return demoResponses["default"];
  }

  // ── SEND MESSAGE ──
  function handleSend() {
    const text = input.value.trim();
    if (!text) return;

    // Check freemium limit
    const count = getMsgCount();
    if (count >= FREE_LIMIT) {
      addMessage(
        "You've used all **" + FREE_LIMIT + " free messages** for today. " +
        "Sign up for a Scout account to unlock more messages, footage upload, and full performance reports.\n\n" +
        "Or reach out on **WhatsApp** — we're always happy to chat about your development.",
        false
      );
      input.value = "";
      return;
    }

    addMessage(text, true);
    input.value = "";
    incrementMsgCount();

    const typing = addTyping();

    // Phase 1: Demo mode with delayed response
    // Phase 2: Replace with SSE fetch to /analyse/api/chat
    const response = getDemoResponse(text);
    const delay = 600 + Math.random() * 800;

    setTimeout(() => {
      typing.remove();
      addMessage(response, false);
    }, delay);
  }

  // ── EVENT LISTENERS ──
  sendBtn.addEventListener("click", handleSend);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Suggested query pills
  pills.forEach((pill) => {
    pill.addEventListener("click", () => {
      input.value = pill.textContent;
      handleSend();
    });
  });

  // File upload zone
  if (uploadZone && uploadInput) {
    uploadZone.addEventListener("click", () => uploadInput.click());

    uploadZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadZone.style.borderColor = "#3B82F6";
      uploadZone.style.background = "#EFF6FF";
    });

    uploadZone.addEventListener("dragleave", () => {
      uploadZone.style.borderColor = "#CBD5E1";
      uploadZone.style.background = "";
    });

    uploadZone.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadZone.style.borderColor = "#CBD5E1";
      uploadZone.style.background = "";
      const files = e.dataTransfer.files;
      if (files.length > 0) handleFileUpload(files[0]);
    });

    uploadInput.addEventListener("change", () => {
      if (uploadInput.files.length > 0) handleFileUpload(uploadInput.files[0]);
    });
  }

  function handleFileUpload(file) {
    const maxSize = 500 * 1024 * 1024; // 500MB
    const allowed = [".mp4", ".csv", ".json", ".mov", ".avi"];
    const ext = "." + file.name.split(".").pop().toLowerCase();

    if (!allowed.includes(ext)) {
      addMessage("Sorry, I can only accept video files (MP4, MOV, AVI) and data files (CSV, JSON). Please try a different file.", false);
      return;
    }

    if (file.size > maxSize) {
      addMessage("That file is too large (max 500MB). Try compressing the video or splitting it into smaller clips.", false);
      return;
    }

    // Phase 1: Demo response
    addMessage("Uploaded: " + file.name, true);
    const typing = addTyping();

    setTimeout(() => {
      typing.remove();
      addMessage(
        "I've received **" + file.name + "** (" + (file.size / (1024 * 1024)).toFixed(1) + "MB).\n\n" +
        "File upload and analysis is a **Phase 2 feature** — when live, I'll be able to:\n" +
        "- Parse your Rezzil CSV/JSON data and extract performance metrics\n" +
        "- Analyse your match footage metadata for tactical patterns\n" +
        "- Generate a full performance report with training recommendations\n\n" +
        "For now, **book a VR session** or **match recording** to start building your Scout profile. Your data will be ready for analysis when the AI goes live.",
        false
      );
    }, 1200);
  }

  // Initialise counter
  updateCounter();
});
