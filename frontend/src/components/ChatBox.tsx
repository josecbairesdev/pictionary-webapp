import React, { useState, useRef, useEffect } from 'react';

interface ChatBoxProps {
  messages: { player: string; text: string; isGuess?: boolean }[];
  onSendMessage: (text: string) => void;
  disabled?: boolean;
}

const ChatBox: React.FC<ChatBoxProps> = ({ messages, onSendMessage, disabled = false }) => {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) return;
    
    onSendMessage(message);
    setMessage('');
  };
  
  return (
    <div className="flex flex-col h-[400px]">
      <div className="flex-grow overflow-y-auto mb-4 space-y-2 p-2">
        {messages.length === 0 ? (
          <div className="text-gray-500 text-center py-4">
            No messages yet
          </div>
        ) : (
          messages.map((msg, index) => (
            <div 
              key={index} 
              className={`p-2 rounded-md ${
                msg.player === 'System' 
                  ? 'bg-gray-100 text-gray-700' 
                  : msg.isGuess 
                    ? 'bg-white border border-gray-200' 
                    : 'bg-primary-100 text-primary-800'
              }`}
            >
              <span className="font-semibold">{msg.player}: </span>
              <span>{msg.text}</span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSendMessage} className="flex">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={disabled ? "You can't guess while drawing" : "Type your guess..."}
          className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          disabled={disabled}
        />
        <button
          type="submit"
          className={`px-4 py-2 rounded-r-md ${
            disabled
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700'
          } text-white`}
          disabled={disabled}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatBox; 