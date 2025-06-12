from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from typing import List, Dict, Any, Optional
import json
import random
from pydantic import BaseModel
import asyncio
from datetime import datetime

router = APIRouter()

# --- Models ---
class Player(BaseModel):
    id: str
    name: str
    score: int = 0
    is_drawing: bool = False

class Room(BaseModel):
    id: str
    name: str
    players: List[Player] = []
    current_word: Optional[str] = None
    round_time: int = 60  # seconds
    max_rounds: int = 3
    current_round: int = 0
    status: str = "waiting"  # waiting, playing, finished

# --- In-memory storage ---
rooms: Dict[str, Room] = {}
player_connections: Dict[str, WebSocket] = {}
room_connections: Dict[str, List[str]] = {}

# --- Word list ---
WORDS = [
    "apple", "banana", "cat", "dog", "elephant", "fish", "giraffe", "house", 
    "island", "jacket", "king", "lion", "mountain", "notebook", "orange", 
    "penguin", "queen", "robot", "sun", "tree", "umbrella", "violin", 
    "watermelon", "xylophone", "yacht", "zebra", "airplane", "beach", 
    "castle", "dolphin", "eagle", "forest", "guitar", "hamburger", "igloo"
]

# --- WebSocket connection manager ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str, player_id: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = {}
        self.active_connections[room_id][player_id] = websocket
        player_connections[player_id] = websocket
        if room_id not in room_connections:
            room_connections[room_id] = []
        room_connections[room_id].append(player_id)

    def disconnect(self, room_id: str, player_id: str):
        if room_id in self.active_connections and player_id in self.active_connections[room_id]:
            del self.active_connections[room_id][player_id]
            if player_id in player_connections:
                del player_connections[player_id]
            if room_id in room_connections and player_id in room_connections[room_id]:
                room_connections[room_id].remove(player_id)

    async def broadcast(self, room_id: str, message: Dict[str, Any]):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id].values():
                await connection.send_json(message)

manager = ConnectionManager()

# --- API Routes ---
@router.get("/rooms", response_model=List[Room])
async def get_rooms():
    return list(rooms.values())

@router.post("/rooms", response_model=Room)
async def create_room(name: str):
    room_id = f"room_{len(rooms) + 1}_{int(datetime.now().timestamp())}"
    new_room = Room(id=room_id, name=name)
    rooms[room_id] = new_room
    return new_room

@router.get("/rooms/{room_id}", response_model=Room)
async def get_room(room_id: str):
    if room_id not in rooms:
        raise HTTPException(status_code=404, detail="Room not found")
    return rooms[room_id]

@router.post("/rooms/{room_id}/join")
async def join_room(room_id: str, player_name: str):
    if room_id not in rooms:
        raise HTTPException(status_code=404, detail="Room not found")
    
    room = rooms[room_id]
    
    # Check if player name already exists in the room
    for player in room.players:
        if player.name == player_name:
            raise HTTPException(status_code=400, detail="Player name already taken")
    
    player_id = f"player_{len(room.players) + 1}_{int(datetime.now().timestamp())}"
    new_player = Player(id=player_id, name=player_name)
    
    # First player becomes the drawer
    if not room.players:
        new_player.is_drawing = True
    
    room.players.append(new_player)
    return {"player_id": player_id, "room": room}

@router.post("/rooms/{room_id}/start")
async def start_game(room_id: str):
    if room_id not in rooms:
        raise HTTPException(status_code=404, detail="Room not found")
    
    room = rooms[room_id]
    # Allow solo play: remove the minimum player check
    # if len(room.players) < 2:
    #     raise HTTPException(status_code=400, detail="Need at least 2 players to start")
    
    room.status = "playing"
    room.current_round = 1
    room.current_word = random.choice(WORDS)
    
    # Notify all players that the game has started
    if room_id in manager.active_connections:
        await manager.broadcast(room_id, {
            "type": "game_started",
            "current_round": room.current_round,
            "max_rounds": room.max_rounds,
            "drawer": next((p.name for p in room.players if p.is_drawing), None)
        })
        
        # Send the word only to the drawer
        drawer = next((p for p in room.players if p.is_drawing), None)
        if drawer and drawer.id in player_connections:
            await player_connections[drawer.id].send_json({
                "type": "word_to_draw",
                "word": room.current_word
            })
    
    return {"status": "started", "current_round": room.current_round}

@router.websocket("/ws/{room_id}/{player_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, player_id: str):
    if room_id not in rooms:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    room = rooms[room_id]
    player = next((p for p in room.players if p.id == player_id), None)
    if not player:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    await manager.connect(websocket, room_id, player_id)
    
    try:
        # Notify others that player joined
        await manager.broadcast(room_id, {
            "type": "player_joined",
            "player": player.name
        })
        
        # Send current game state to the new player
        await websocket.send_json({
            "type": "game_state",
            "room": room.dict(),
            "is_drawer": player.is_drawing
        })
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "draw":
                if player.is_drawing:
                    # Broadcast drawing data to all players except the drawer
                    for pid, conn in manager.active_connections[room_id].items():
                        if pid != player_id:
                            await conn.send_json({
                                "type": "draw_data",
                                "data": message["data"]
                            })
            
            elif message["type"] == "guess":
                if not player.is_drawing and room.status == "playing":
                    guess = message["guess"].lower().strip()
                    
                    # Broadcast the guess to all players
                    await manager.broadcast(room_id, {
                        "type": "player_guess",
                        "player": player.name,
                        "guess": guess
                    })
                    
                    # Check if the guess is correct
                    if guess == room.current_word.lower():
                        # Update scores
                        drawer = next((p for p in room.players if p.is_drawing), None)
                        if drawer:
                            drawer.score += 5  # Points for the drawer
                        player.score += 10  # Points for correct guess
                        
                        # Broadcast that the word was guessed
                        await manager.broadcast(room_id, {
                            "type": "word_guessed",
                            "player": player.name,
                            "word": room.current_word,
                            "scores": {p.name: p.score for p in room.players}
                        })
                        
                        # Move to next round or end game
                        if room.current_round < room.max_rounds:
                            room.current_round += 1
                            
                            # Rotate drawer
                            current_drawer_index = next((i for i, p in enumerate(room.players) if p.is_drawing), -1)
                            for p in room.players:
                                p.is_drawing = False
                            next_drawer_index = (current_drawer_index + 1) % len(room.players)
                            room.players[next_drawer_index].is_drawing = True
                            
                            # Select new word
                            room.current_word = random.choice(WORDS)
                            
                            # Broadcast new round info
                            await manager.broadcast(room_id, {
                                "type": "new_round",
                                "round": room.current_round,
                                "drawer": room.players[next_drawer_index].name
                            })
                            
                            # Send word to new drawer
                            new_drawer = room.players[next_drawer_index]
                            if new_drawer.id in player_connections:
                                await player_connections[new_drawer.id].send_json({
                                    "type": "word_to_draw",
                                    "word": room.current_word
                                })
                        else:
                            # End game
                            room.status = "finished"
                            await manager.broadcast(room_id, {
                                "type": "game_over",
                                "final_scores": {p.name: p.score for p in room.players},
                                "winner": max(room.players, key=lambda p: p.score).name
                            })
            
            elif message["type"] == "clear_canvas":
                if player.is_drawing:
                    await manager.broadcast(room_id, {
                        "type": "clear_canvas"
                    })
    
    except WebSocketDisconnect:
        manager.disconnect(room_id, player_id)
        
        # Remove player from room
        room.players = [p for p in room.players if p.id != player_id]
        
        # If room is empty, delete it
        if not room.players:
            if room_id in rooms:
                del rooms[room_id]
        else:
            # If the drawer disconnected, assign a new drawer
            if player.is_drawing and room.players:
                room.players[0].is_drawing = True
                
                # Notify remaining players
                await manager.broadcast(room_id, {
                    "type": "player_left",
                    "player": player.name,
                    "new_drawer": room.players[0].name if player.is_drawing else None
                })
                
                # If game was in progress, restart the round
                if room.status == "playing":
                    room.current_word = random.choice(WORDS)
                    if room.players[0].id in player_connections:
                        await player_connections[room.players[0].id].send_json({
                            "type": "word_to_draw",
                            "word": room.current_word
                        })
            else:
                # Notify remaining players
                await manager.broadcast(room_id, {
                    "type": "player_left",
                    "player": player.name
                }) 