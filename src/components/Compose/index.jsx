import React, { useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import "./Compose.css";

export default function Compose({ rightItems, sendMessage }) {
  const [message, setMessage] = useState("");

  const onKeyDown = (e) => {
    console.log(e);
    if (e.key === "Enter") {
      e.preventDefault();
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        console.log("submit!");
        sendMessage(message);
        setMessage("");
      } else {
        setMessage(`${message}\n`);
      }
    }
  };
  return (
    <div className="compose">
      <TextareaAutosize
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={onKeyDown}
        className="compose-input"
        placeholder="Type a message, @name"
        rows={1}
      />

      {rightItems}
    </div>
  );
}
