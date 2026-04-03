/**
 * Scout AI Analyst Widget
 *
 * Handles chat interaction with live Gemini API streaming via SSE,
 * freemium message counting, suggested queries, and file upload.
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

  // Conversation history (kept in memory)
  let conversation = [];

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
      // Format bot messages: **bold** -> <strong>, \n -> <br>
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

  // Stream response from SSE endpoint
  async function streamResponse(userMessage) {
    const typing = addTyping();
    let botMessageDiv = null;
    let fullText = "";

    try {
      const response = await fetch("/analyse/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: userMessage,
          conversation: conversation
        })
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Remove typing indicator on first chunk
      let firstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6); // Remove "data: " prefix

            if (data === "[DONE]") {
              // Stream complete - add to conversation history
              conversation.push({ role: "user", content: userMessage });
              conversation.push({ role: "model", content: fullText });
              return;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.error) {
                // Handle error
                if (firstChunk && typing) {
                  typing.remove();
                  firstChunk = false;
                }
                addMessage(parsed.error, false);
                return;
              }

              if (parsed.text) {
                // Remove typing indicator on first chunk
                if (firstChunk && typing) {
                  typing.remove();
                  firstChunk = false;
                  botMessageDiv = addMessage("", false);
                }

                // Append text chunk
                fullText += parsed.text;

                if (botMessageDiv) {
                  // Format and display
                  botMessageDiv.innerHTML = fullText
                    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                    .replace(/\n/g, "<br>");
                  messages.scrollTop = messages.scrollHeight;
                }
              }
            } catch (e) {
              // Ignore parse errors for malformed chunks
              console.warn("Failed to parse SSE data:", data);
            }
          }
        }
      }
    } catch (error) {
      if (typing) typing.remove();
      addMessage(
        "Sorry, I couldn't connect to the AI. Try again in a moment, or DM us on Instagram @scoutvideoja.",
        false
      );
      console.error("Stream error:", error);
    }
  }

  // Handle send message
  async function handleSend() {
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

    // Stream response from API
    await streamResponse(text);
  }

  // Event listeners
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
      addMessage(
        "Sorry, I can only accept video files (MP4, MOV, AVI) and data files (CSV, JSON). Please try a different file.",
        false
      );
      return;
    }

    if (file.size > maxSize) {
      addMessage(
        "That file is too large (max 500MB). Try compressing the video or splitting it into smaller clips.",
        false
      );
      return;
    }

    // Show friendly message that file analysis is coming soon
    addMessage("Uploaded: " + file.name, true);
    addMessage(
      "I've received **" + file.name + "** (" + (file.size / (1024 * 1024)).toFixed(1) + "MB).\n\n" +
      "File upload and analysis is **coming soon** — when live, I'll be able to:\n" +
      "- Parse your Rezzil CSV/JSON data and extract performance metrics\n" +
      "- Analyse your match footage metadata for tactical patterns\n" +
      "- Generate a full performance report with training recommendations\n\n" +
      "For now, **book a VR session** or **match recording** to start building your Scout profile.",
      false
    );
  }

  // Initialize counter
  updateCounter();
});
