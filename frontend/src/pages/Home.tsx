import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Home: React.FC = () => {
  const [roomName, setRoomName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || !playerName.trim()) {
      setError('Please enter both room name and your name');
      return;
    }

    try {
      const response = await axios.post(`/api/rooms?name=${encodeURIComponent(roomName)}`);
      const newRoomId = response.data.id;
      
      const joinResponse = await axios.post(
        `/api/rooms/${newRoomId}/join?player_name=${encodeURIComponent(playerName)}`
      );
      
      localStorage.setItem('playerId', joinResponse.data.player_id);
      localStorage.setItem('playerName', playerName);
      
      navigate(`/room/${newRoomId}`);
    } catch (err) {
      console.error('Error creating room:', err);
      setError('Failed to create room. Please try again.');
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim() || !playerName.trim()) {
      setError('Please enter both room ID and your name');
      return;
    }

    try {
      const joinResponse = await axios.post(
        `/api/rooms/${roomId}/join?player_name=${encodeURIComponent(playerName)}`
      );
      
      localStorage.setItem('playerId', joinResponse.data.player_id);
      localStorage.setItem('playerName', playerName);
      
      navigate(`/room/${roomId}`);
    } catch (err: any) {
      console.error('Error joining room:', err);
      setError(err.response?.data?.detail || 'Failed to join room. Please check the room ID.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-primary-100 to-primary-300 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-4xl font-bold text-center text-primary-700 mb-8">Pictionary</h1>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Your Name
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Enter your name"
          />
        </div>

        {!isJoining ? (
          <>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Room Name
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter room name"
              />
            </div>
            
            <button
              onClick={handleCreateRoom}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 mb-4"
            >
              Create Room
            </button>
            
            <div className="text-center">
              <button
                onClick={() => setIsJoining(true)}
                className="text-primary-600 hover:text-primary-800 font-medium"
              >
                Join an existing room
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Room ID
              </label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter room ID"
              />
            </div>
            
            <button
              onClick={handleJoinRoom}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 mb-4"
            >
              Join Room
            </button>
            
            <div className="text-center">
              <button
                onClick={() => setIsJoining(false)}
                className="text-primary-600 hover:text-primary-800 font-medium"
              >
                Create a new room
              </button>
            </div>
          </>
        )}
        
        {error && (
          <div className="mt-4 p-2 bg-red-100 text-red-700 rounded-md text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home; 