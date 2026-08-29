import json
from fastapi import WebSocket
from collections import defaultdict


class ConnectionManager:
    """Manages WebSocket connections per user for real-time updates."""

    def __init__(self):
        # Map user_id -> list of active WebSocket connections
        self.active_connections: dict[int, list[WebSocket]] = defaultdict(list)

    async def connect(self, websocket: WebSocket, user_id: int):
        """Accept a WebSocket connection and register it for the user."""
        await websocket.accept()
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        """Remove a WebSocket connection for the user."""
        if user_id in self.active_connections:
            self.active_connections[user_id] = [
                ws for ws in self.active_connections[user_id] if ws != websocket
            ]
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_location_update(self, user_id: int, data: dict):
        """Send a location update to all connections for a specific user."""
        if user_id not in self.active_connections:
            return

        message = json.dumps(data)
        disconnected = []
        for ws in self.active_connections[user_id]:
            try:
                await ws.send_text(message)
            except Exception:
                disconnected.append(ws)

        # Clean up disconnected sockets
        for ws in disconnected:
            self.disconnect(ws, user_id)


# Global singleton
manager = ConnectionManager()
