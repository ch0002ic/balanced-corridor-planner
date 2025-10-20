"""
WebSocket server for streaming simulation updates to the web UI
"""
import asyncio
import json
from typing import Any, Dict, Set
import websockets
from websockets.server import WebSocketServerProtocol


class SimulationWebSocketServer:
    """Manages WebSocket connections and broadcasts simulation updates"""
    
    def __init__(self, host: str = "localhost", port: int = 8765):
        self.host = host
        self.port = port
        self.clients: Set[WebSocketServerProtocol] = set()
        self.server = None
        
    async def register(self, websocket: WebSocketServerProtocol):
        """Register a new client connection"""
        self.clients.add(websocket)
        print(f"✓ Client connected. Total clients: {len(self.clients)}")
        
    async def unregister(self, websocket: WebSocketServerProtocol):
        """Unregister a client connection"""
        self.clients.discard(websocket)
        print(f"✗ Client disconnected. Total clients: {len(self.clients)}")
        
    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast message to all connected clients"""
        if not self.clients:
            return
            
        message_json = json.dumps(message)
        disconnected = set()
        
        for client in self.clients:
            try:
                await client.send(message_json)
            except websockets.exceptions.ConnectionClosed:
                disconnected.add(client)
                
        # Clean up disconnected clients
        for client in disconnected:
            await self.unregister(client)
    
    async def handler(self, websocket: WebSocketServerProtocol):
        """Handle individual client connections"""
        await self.register(websocket)
        try:
            async for message in websocket:
                # Echo back for connection testing
                await websocket.send(json.dumps({"type": "pong"}))
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            await self.unregister(websocket)
    
    async def start(self):
        """Start the WebSocket server"""
        self.server = await websockets.serve(
            self.handler,
            self.host,
            self.port
        )
        print(f"🚀 WebSocket server started on ws://{self.host}:{self.port}")
        
    async def stop(self):
        """Stop the WebSocket server"""
        if self.server:
            self.server.close()
            await self.server.wait_closed()
            print("🛑 WebSocket server stopped")


# Global server instance
_server_instance: SimulationWebSocketServer | None = None


def get_server() -> SimulationWebSocketServer:
    """Get or create the global server instance"""
    global _server_instance
    if _server_instance is None:
        _server_instance = SimulationWebSocketServer()
    return _server_instance


async def broadcast_update(update_type: str, data: Dict[str, Any]):
    """Convenience function to broadcast updates"""
    server = get_server()
    message = {
        "type": update_type,
        "data": data,
        "timestamp": asyncio.get_event_loop().time()
    }
    await server.broadcast(message)
