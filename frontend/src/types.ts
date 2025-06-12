export interface Player {
  id: string;
  name: string;
  score: number;
  is_drawing: boolean;
}

export interface Room {
  id: string;
  name: string;
  players: Player[];
  current_word?: string;
  round_time: number;
  max_rounds: number;
  current_round: number;
  status: 'waiting' | 'playing' | 'finished';
}

export interface DrawData {
  prevX: number;
  prevY: number;
  currX: number;
  currY: number;
  color: string;
  size: number;
}

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
} 