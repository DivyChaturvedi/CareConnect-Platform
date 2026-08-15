import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.alert_id = self.scope['url_route']['kwargs']['alert_id']
        self.room_group_name = f'chat_{self.alert_id}'

        import urllib.parse
        query_string = self.scope['query_string'].decode()
        token = None
        for part in query_string.split('&'):
            if part.startswith('token='):
                token = urllib.parse.unquote(part.split('=', 1)[1])

        if not token:
            await self.close()
            return

        if token.startswith('Bearer '):
            token = token[7:]

        try:
            access_token = AccessToken(token)
            self.user = await database_sync_to_async(User.objects.get)(id=access_token['user_id'])
        except Exception as e:
            print(f"[WS AUTH ERROR] {e}")
            await self.close()
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name') and hasattr(self, 'channel_name'):
            try:
                await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
            except Exception as e:
                print(f"[WS DISCONNECT EXCEPTION] {e}")

    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get('type', 'message')

        if msg_type == 'typing':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing_event',
                    'sender_id': self.user.id,
                    'sender_name': f"{self.user.first_name}",
                    'is_typing': data.get('is_typing', False),
                }
            )
            return

        if msg_type == 'read':
            await self.mark_read()
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'read_event',
                    'reader_id': self.user.id,
                    'reader_name': f"{self.user.first_name}",
                }
            )
            return

        # Normal text/image message
        message_text = data.get('message', '').strip()
        message_type = data.get('message_type', 'text')
        image_url = data.get('image_url')

        if message_type == 'text' and not message_text:
            return

        chat_message = await self.save_message(message_text, message_type, image_url)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'id': chat_message.id,
                'message': chat_message.message,
                'message_type': chat_message.message_type,
                'image_url': chat_message.image_url,
                'sender_id': self.user.id,
                'sender_name': f"{self.user.first_name} {self.user.last_name}".strip(),
                'sender_role': self.user.role,
                'created_at': chat_message.created_at.isoformat(),
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message',
            'id': event['id'],
            'message': event['message'],
            'message_type': event['message_type'],
            'image_url': event['image_url'],
            'sender_id': event['sender_id'],
            'sender_name': event['sender_name'],
            'sender_role': event.get('sender_role', 'USER'),
            'created_at': event['created_at'],
        }))


    async def typing_event(self, event):
        if event['sender_id'] == self.user.id:
            return  # apna khud ka typing event nahi bhejna
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'sender_id': event['sender_id'],
            'sender_name': event['sender_name'],
            'is_typing': event['is_typing'],
        }))

    async def read_event(self, event):
        if event['reader_id'] == self.user.id:
            return
        await self.send(text_data=json.dumps({
            'type': 'read',
            'reader_id': event['reader_id'],
            'reader_name': event['reader_name'],
        }))

    @database_sync_to_async
    def save_message(self, message_text, message_type, image_url):
        from .models import ChatMessage, SOSAlert
        alert = SOSAlert.objects.get(id=self.alert_id)
        return ChatMessage.objects.create(
            alert=alert, sender=self.user, message=message_text,
            message_type=message_type, image_url=image_url,
        )

    @database_sync_to_async
    def mark_read(self):
        from .models import ChatReadStatus, SOSAlert
        alert = SOSAlert.objects.get(id=self.alert_id)
        ChatReadStatus.objects.update_or_create(alert=alert, user=self.user)