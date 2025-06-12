import React from 'react';
import { Player } from '../types';

interface PlayerListProps {
  players: Player[];
}

const PlayerList: React.FC<PlayerListProps> = ({ players }) => {
  // Sort players by score (descending)
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  
  return (
    <div className="space-y-2">
      {sortedPlayers.map((player) => (
        <div 
          key={player.id} 
          className={`flex justify-between items-center p-2 rounded-md ${
            player.is_drawing ? 'bg-primary-100 border-l-4 border-primary-500' : 'bg-gray-50'
          }`}
        >
          <div className="flex items-center">
            <span className="font-medium">{player.name}</span>
            {player.is_drawing && (
              <span className="ml-2 text-xs bg-primary-500 text-white px-2 py-0.5 rounded-full">
                Drawing
              </span>
            )}
          </div>
          <span className="font-bold">{player.score}</span>
        </div>
      ))}
      
      {players.length === 0 && (
        <div className="text-gray-500 text-center py-2">
          No players in the room
        </div>
      )}
    </div>
  );
};

export default PlayerList; 