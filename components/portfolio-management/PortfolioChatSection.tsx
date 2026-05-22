'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Bot, Send, User } from 'lucide-react';

const makeChatId = (prefix = 'chat') => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const PortfolioChatSection = () => {
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'System ready. Ask anything about this portfolio workspace.',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendChatMessage = () => {
    const text = chatInput.trim();
    if (!text) return;

    setChatMessages((prev) => [
      ...prev,
      { id: makeChatId('chat-user'), role: 'user', content: text },
      {
        id: makeChatId('chat-assistant'),
        role: 'assistant',
        content: 'Noted. This chat UI is ready for assistant wiring; the portfolio workspace remains available on the right.',
      },
    ]);
    setChatInput('');
  };

  return (
    <aside className="portfolioChatPanel">
      <div className="portfolioChatHeader">
        <div className="portfolioChatIcon"><Bot size={18} /></div>
        <div>
          <h2>AI Assistant</h2>
          <span>Portfolio chat</span>
        </div>
      </div>

      <div className="portfolioChatMessages">
        {chatMessages.map((message) => {
          const isUser = message.role === 'user';
          return (
            <div className={`portfolioChatMessage ${isUser ? 'user' : 'assistant'}`} key={message.id}>
              <div className="portfolioChatAvatar">
                {isUser ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className="portfolioChatBubble">{message.content}</div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      <div className="portfolioChatInputWrap">
        <textarea
          rows={1}
          value={chatInput}
          onChange={(event) => setChatInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              sendChatMessage();
            }
          }}
          placeholder="Type your instruction..."
        />
        <button
          type="button"
          onClick={sendChatMessage}
          disabled={!chatInput.trim()}
          title="Send message"
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </div>
    </aside>
  );
};

export default PortfolioChatSection;
