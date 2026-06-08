import json
from channels.generic.websocket import AsyncWebsocketConsumer

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Todo: Obtener el usuario del scope (self.scope['user']) tras añadir el middleware de Auth
        # Por ahora, usamos un grupo general para el MVP
        self.group_name = "notifications_group"

        # Unirse al grupo
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Salir del grupo
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        mensaje = text_data_json.get('mensaje', '')
        modulo = text_data_json.get('modulo', 'general')
        url_destino = text_data_json.get('url_destino', '#')
        tipo = text_data_json.get('tipo', 'Informativa')

        # Enviar mensaje al grupo
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'notification_message',
                'mensaje': mensaje,
                'modulo': modulo,
                'url_destino': url_destino,
                'tipo': tipo
            }
        )

    # Handler para enviar mensaje al cliente (evento interno de channels)
    async def notification_message(self, event):
        mensaje = event['mensaje']
        modulo = event.get('modulo', 'general')
        url_destino = event.get('url_destino', '#')
        tipo = event.get('tipo', 'Informativa')

        # Enviar mensaje al WebSocket
        await self.send(text_data=json.dumps({
            'mensaje': mensaje,
            'modulo': modulo,
            'url_destino': url_destino,
            'tipo': tipo
        }))
