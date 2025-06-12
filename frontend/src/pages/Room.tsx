import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Room as RoomType, Player, DrawData, WebSocketMessage } from '../types';
import DrawingCanvas from '../components/DrawingCanvas';
import PlayerList from '../components/PlayerList';
import ChatBox from '../components/ChatBox';

const Room: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<{ player: string; text: string; isGuess?: boolean }[]>([]);
  const [currentWord, setCurrentWord] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [timer, setTimer] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const playerId = localStorage.getItem('playerId');
  const playerName = localStorage.getItem('playerName');

  // Always join the room and only connect WebSocket after joining
  useEffect(() => {
    const fetchRoomAndJoinIfNeeded = async () => {
      try {
        if (!roomId) {
          setError('Invalid room ID');
          return;
        }
        const playerName = localStorage.getItem('playerName');
        if (!playerName) {
          setError('No player name found. Please go back and enter your name.');
          setLoading(false);
          return;
        }
        // Fetch room details
        const response = await axios.get(`/api/rooms/${roomId}`);
        setRoom(response.data);
        let playerId = localStorage.getItem('playerId');
        // Check if player is already in the room
        const existingPlayer = response.data.players.find((p: any) => p.name === playerName);
        if (existingPlayer) {
          playerId = existingPlayer.id;
          localStorage.setItem('playerId', playerId);
        } else {
          // Join the room
          const joinResponse = await axios.post(
            `/api/rooms/${roomId}/join?player_name=${encodeURIComponent(playerName)}`
          );
          playerId = joinResponse.data.player_id;
          localStorage.setItem('playerId', playerId);
          setRoom(joinResponse.data.room);
        }
        if (!playerId || typeof playerId !== 'string' || !roomId || typeof roomId !== 'string' || roomId === undefined) {
          setError('Failed to determine player or room ID.');
          setLoading(false);
          return;
        }
        const playerIdStr = playerId as string;
        const roomIdStr = roomId as string;
        setLoading(false);
        // Now connect the WebSocket
        connectWebSocket(roomIdStr, playerIdStr);
      } catch (err) {
        console.error('Error joining room:', err);
        setError('Failed to join room. It may not exist.');
        setLoading(false);
      }
    };
    fetchRoomAndJoinIfNeeded();
    // eslint-disable-next-line
  }, [roomId]);

  // Refactor connectWebSocket to take roomId and playerId as arguments
  const connectWebSocket = (roomId: string, playerId: string) => {
    const wsBase = import.meta.env.VITE_BACKEND_WS_URL || 'ws://localhost:8000';
    const ws = new WebSocket(`${wsBase}/api/ws/${roomId}/${playerId}`);
    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };
    ws.onmessage = (event) => {
      const message: WebSocketMessage = JSON.parse(event.data);
      console.log('Received message:', message);
      
      switch (message.type) {
        case 'game_state':
          setRoom(message.room);
          setIsDrawing(message.is_drawer);
          break;
          
        case 'player_joined':
          setMessages(prev => [...prev, { player: 'System', text: `${message.player} joined the room` }]);
          break;
          
        case 'player_left':
          setMessages(prev => [...prev, { player: 'System', text: `${message.player} left the room` }]);
          if (message.new_drawer) {
            setMessages(prev => [...prev, { player: 'System', text: `${message.new_drawer} is now drawing` }]);
          }
          break;
          
        case 'game_started':
          setGameStarted(true);
          setMessages(prev => [...prev, { 
            player: 'System', 
            text: `Game started! Round ${message.current_round} of ${message.max_rounds}. ${message.drawer} is drawing.` 
          }]);
          setTimer(60); // Default timer value
          break;
          
        case 'word_to_draw':
          setCurrentWord(message.word);
          setIsDrawing(true);
          break;
          
        case 'player_guess':
          setMessages(prev => [...prev, { 
            player: message.player, 
            text: message.guess,
            isGuess: true
          }]);
          break;
          
        case 'word_guessed':
          setMessages(prev => [...prev, { 
            player: 'System', 
            text: `${message.player} guessed the word: ${message.word}!` 
          }]);
          
          // Update scores in room state
          if (room) {
            const updatedPlayers = room.players.map(player => ({
              ...player,
              score: message.scores[player.name] || player.score
            }));
            
            setRoom({
              ...room,
              players: updatedPlayers
            });
          }
          break;
          
        case 'new_round':
          setMessages(prev => [...prev, { 
            player: 'System', 
            text: `Round ${message.round} started. ${message.drawer} is drawing.` 
          }]);
          setCurrentWord(null);
          setIsDrawing(false);
          setTimer(60); // Reset timer
          break;
          
        case 'game_over':
          setGameStarted(false);
          setMessages(prev => [...prev, { 
            player: 'System', 
            text: `Game over! Winner: ${message.winner}` 
          }]);
          setCurrentWord(null);
          setIsDrawing(false);
          break;
          
        case 'draw_data':
          // This is handled by the DrawingCanvas component
          break;
          
        case 'clear_canvas':
          // This is handled by the DrawingCanvas component
          break;
      }
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      
      // Try to reconnect after a delay
      setTimeout(() => {
        if (wsRef.current === ws) { // Only reconnect if this is still the current ws
          connectWebSocket(roomId, playerId);
        }
      }, 3000);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    wsRef.current = ws;
  };

  // Timer countdown effect
  useEffect(() => {
    if (!gameStarted || timer <= 0) return;
    
    const interval = setInterval(() => {
      setTimer(prev => prev - 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [gameStarted, timer]);

  const handleSendMessage = (text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'guess',
      guess: text
    }));
  };

  const handleDrawingChange = (drawData: DrawData) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !isDrawing) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'draw',
      data: drawData
    }));
  };

  const handleClearCanvas = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !isDrawing) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'clear_canvas'
    }));
  };

  const handleStartGame = async () => {
    try {
      await axios.post(`/api/rooms/${roomId}/start`);
      // The WebSocket will handle the game started event
    } catch (err) {
      console.error('Error starting game:', err);
      setError('Failed to start the game. Need at least 2 players.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-semibold">Loading room...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
          {error}
        </div>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          Go Home
        </button>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-semibold">Room not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Room: {room.name}
            </h1>
            <div className="text-sm text-gray-500 mt-1">
              Room ID: <span className="font-mono">{room.id}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {!gameStarted && (
              <button
                onClick={handleStartGame}
                className={`px-4 py-2 rounded-md text-white ${
                  isConnected
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
                disabled={!isConnected}
                title={isConnected ? '' : 'Connecting... please wait'}
              >
                Start Game
              </button>
            )}
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Leave Room
            </button>
          </div>
        </div>
        
        {gameStarted && (
          <div className="bg-white p-3 rounded-lg shadow mb-4 flex justify-between items-center">
            <div className="text-lg font-medium">
              Round: {room.current_round}/{room.max_rounds}
            </div>
            <div className="text-lg font-medium">
              Time: {timer}s
            </div>
            {currentWord && (
              <div className="text-lg font-bold text-primary-700">
                Word: {currentWord}
              </div>
            )}
            {!currentWord && isDrawing && (
              <div className="text-lg font-bold text-red-600">
                Waiting for word...
              </div>
            )}
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow p-4">
              <DrawingCanvas 
                isDrawer={isDrawing} 
                onDrawingChange={handleDrawingChange} 
                onClearCanvas={handleClearCanvas}
                wsRef={wsRef}
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-2">Players</h2>
              <PlayerList players={room.players} />
            </div>
            
            <div className="bg-white rounded-lg shadow p-4 flex-grow">
              <h2 className="text-lg font-semibold mb-2">Chat</h2>
              <ChatBox 
                messages={messages} 
                onSendMessage={handleSendMessage}
                disabled={isDrawing || !gameStarted}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Room; 