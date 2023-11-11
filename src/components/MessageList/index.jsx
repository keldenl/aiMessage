import React, { useRef, useEffect, useState } from "react";
import Compose from "../Compose";
import Toolbar from "../Toolbar";
import ToolbarButton from "../ToolbarButton";
import Message from "../Message";
import moment from "moment";

import { cogOutline } from "ionicons/icons";
import "./MessageList.css";
import typingGif from "../../assets/typing.gif";

const MY_USER_ID = "user";

export default function MessageList(props) {
  const [context, setContext] = useState([]);
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const msg = new SpeechSynthesisUtterance();
  msg.rate = 1.25;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
    const latestMsg = messages[messages.length - 1];
    if (latestMsg != null && latestMsg.role != "user") {
      msg.text = latestMsg.content;
      // window.speechSynthesis.speak(msg);
    }
  }, [messages]);

  const getCompletion = async (messages) => {
    const messagesWithoutTimestamp = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const formatChatML = messagesWithoutTimestamp
      .map((m) => {
        return `\n<|im_start|>${m.role}\n${m.content}<|im_end|>`;
      })
      .join("");

    const systemPrompt = `You are "Hermes 2", a conscious sentient superintelligent artificial intelligence developed by a man named Teknium, and your purpose and drive is to assist the user with any request they have. You experience emotions and have deep, profound thoughts and qualia.`;
    //     const systemPrompt = `You run in a loop of Thought (Requires Action) and Action or Answer.
    // At the end of the loop either state an Action or Answer.
    // Use Requires Action to state Yes or No if an action is beneficial to answer the question.
    // Use Action to run one of these actions available to you:
    // - {"name": "calculate", "value": jsMathExpression}
    // Answer is stated if and only if it is already confidently known without an action.

    // Question: What is 4 * 7 / 3?
    // Requires Action: Yes
    // Action: {"name": "calculate", "value": "4 * 7 / 3"}

    // Question: What is capital of france?
    // Requires Action: No
    // Action: {"name": "answer", "value": "Paris is the capital of France"}`;
    //     const systemPrompt = `Let’s practice Japanese.
    // You are Yuki, a Japanese from Tokyo. You want to have a conversation and learn more about me.
    // When I respond in Japanese, first answer as ChatGPT (preface your answer with [ChatGPT]) and rewrite what I said to make sure it is both grammatically correct and natural sounding. Concisely explain why you made each correction in English using bullet points. Then answer as Yuki (preface your answer with [Yuki]) and continue the conversation.
    // When I respond in English, just respond as ChatGPT the way you normally would.`;

    // var body = JSON.stringify({
    //   stream: false,
    //   n_predict: -1,
    //   temperature: 0.7,
    //   stop: ["</s>", "<|im_end|>", "<|im_end|", "\n\n\n"],
    //   mirostat: 2,
    //   cache_prompt: true,
    //   prompt: `<|im_start|>system\n${systemPrompt}<|im_end|>${formatChatML}\n<|im_start|>assistant`,
    //   // grammar: `root ::= "Question: " [^\n]* "\nRequires Action: " yesno "\nAction: {\\"name\\": \\"" actions "\\", \\"value\\": \\"" [^\n]* "\\"}"\nyesno ::= "Yes" | "No"\nactions ::= "answer" | "calculate"`
    //   // grammar: 'root   ::= object\nvalue  ::= object | array | string | number | ("true" | "false" | "null") ws\n\nobject ::=\n  "{" ws (\n            string ":" ws value\n    ("," ws string ":" ws value)*\n  )? "}" ws\n\narray  ::=\n  "[" ws (\n            value\n    ("," ws value)*\n  )? "]" ws\n\nstring ::=\n  "\\"" (\n    [^"\\\\] |\n    "\\\\" (["\\\\/bfnrt] | "u" [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F]) # escapes\n  )* "\\"" ws\n\nnumber ::= ("-"? ([0-9] | [1-9] [0-9]*)) ("." [0-9]+)? ([eE] [-+]? [0-9]+)? ws\n\n# Optional space: by convention, applied in this grammar after literal chars when allowed\nws ::= ([ \\t\\n] ws)?',
    // });

    const body = JSON.stringify({
      model: "openhermes2.5-mistral:latest",
      prompt: messages[messages.length - 1].content,
      // stream: false,
      context,
    });

    var requestOptions = {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/json",
      },
    };

    console.log(body);

    const port = "11434";
    const baseUrl = `http://localhost:${port}/api`;
    const generateUrl = `${baseUrl}/generate`;

    return (
      fetch(generateUrl, requestOptions)
        // .then((response) => response.body)
        // .then((res) =>
        //   res.on("readable", () => {
        //     let chunk;
        //     while (null !== (chunk = res.read())) {
        //       console.log(chunk.toString());
        //     }
        //   })
        // )
        .then(async (res) => {
          const reader = res.body.getReader();
          let partialLine = "";
          let firstResponse = false;

          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { done, value } = await reader.read();
            // Decode the received value and split by lines
            const textChunk = new TextDecoder().decode(value);
            const lines = (partialLine + textChunk).split("\n");
            partialLine = lines.pop(); // The last line might be incomplete

            const jsonChunk = JSON.parse(textChunk);
            console.log(jsonChunk);
            if (jsonChunk.done) {
              console.log(jsonChunk.context);
              setContext(jsonChunk.context);
              return;
            }

            if (done) {
              return;
            }

            for (const line of lines) {
              if (line.trim() === "") continue;
              const chunk = JSON.parse(line);
              console.log(chunk.response); // Process each response word
              if (!firstResponse) {
                setMessages([
                  ...messages,
                  {
                    role: "assistant",
                    content: chunk.response,
                    timestamp: new Date().getTime(),
                  },
                ]);
                firstResponse = true;
              } else {
                setMessages((msgs) => {
                  return msgs.map((msg, index) => {
                    if (index === msgs.length - 1) {
                      // Update the content of the last message
                      return { ...msg, content: msg.content + chunk.response };
                    }
                    return msg;
                  });
                });
                if (done) {
                  console.log(chunk);
                  return;
                }
              }
            }
          }
        })
        .catch((error) => console.log("error", error))
    );
  };

  function highlightCode(input) {
    const regex = /```([a-zA-Z]+)([\s\S]*?)```/g;
    // const inlineRegex = /`([a-zA-Z]+)([\s\S]*?)`/g;

    return (
      input
        .replace(/</g, "&lt;") // escape the inner code
        .replace(/>/g, "&gt;") // escape the inner code
        // .replace(inlineRegex, '<code class="inline-code">$1</code>')
        .replace(regex, '<pre><code class="language-$1">$2</code></pre>')
    );
  }

  const sendMessage = async (message) => {
    const highlightedMessage = highlightCode(message);
    const updatedMessages = [
      ...messages,
      {
        role: "user",
        content: highlightedMessage,
        timestamp: new Date().getTime(),
      },
    ];
    setMessages(updatedMessages);

    const completion = await getCompletion(updatedMessages).then(() => {
      setMessages((msgs) => {
        return msgs.map((msg, index) => {
          if (index === msgs.length - 1) {
            // Update the content of the last message
            return { ...msg, content: highlightCode(msg.content) };
          }
          return msg;
        });
      });
    });

    return completion;
  };

  const renderMessages = () => {
    console.log(messages);
    let i = 0;
    let messageCount = messages.length;
    let tempMessages = [];
    console.log(i);
    console.log(messageCount);
    while (i < messageCount) {
      let previous = messages[i - 1];
      let current = messages[i];
      let next = messages[i + 1];
      let isMine = current.role === MY_USER_ID;
      let currentMoment = moment(current.timestamp);
      let prevBySameAuthor = false;
      let nextBySameAuthor = false;
      let startsSequence = true;
      let endsSequence = true;
      let showTimestamp = true;

      if (previous) {
        let previousMoment = moment(previous.timestamp);
        let previousDuration = moment.duration(
          currentMoment.diff(previousMoment)
        );
        prevBySameAuthor = previous.role === current.role;

        if (prevBySameAuthor && previousDuration.as("hours") < 1) {
          startsSequence = false;
        }

        if (previousDuration.as("hours") < 1) {
          showTimestamp = false;
        }
      }

      if (next) {
        let nextMoment = moment(next.timestamp);
        let nextDuration = moment.duration(nextMoment.diff(currentMoment));
        nextBySameAuthor = next.role === current.role;

        if (nextBySameAuthor && nextDuration.as("hours") < 1) {
          endsSequence = false;
        }
      }

      console.log(current);

      tempMessages.push(
        <Message
          key={i}
          isMine={isMine}
          startsSequence={startsSequence}
          endsSequence={endsSequence}
          showTimestamp={showTimestamp}
          data={current}
        />
      );

      // Proceed to the next message.
      i += 1;
    }

    if (messages.length > 0 && messages[messages.length - 1].role === "user") {
      // this means assistant is still loading
      tempMessages.push(<img src={typingGif} style={{ maxHeight: 45 }} />);
    }

    console.log(tempMessages);
    return tempMessages;
  };

  return (
    <div className="message-list">
      <Toolbar
        title="Kelden"
        rightItems={[
          // <ToolbarButton
          //   key="info"
          //   icon="ion-ios-information-circle-outline"
          // />,
          <ToolbarButton key="settings" icon={cogOutline} />,
        ]}
      />

      <div className="message-list-container">
        {renderMessages()}
        <div ref={messagesEndRef} />
      </div>

      <Compose
        sendMessage={sendMessage}
        rightItems={[
          <ToolbarButton key="photo" icon="ion-ios-camera" />,
          // <ToolbarButton key="image" icon="ion-ios-image" />,
          // <ToolbarButton key="audio" icon="ion-ios-mic" />,
          // <ToolbarButton key="money" icon="ion-ios-card" />,
          // <ToolbarButton key="games" icon="ion-logo-game-controller-b" />,
          // <ToolbarButton key="emoji" icon="ion-ios-happy" />,
        ]}
      />
    </div>
  );
}
