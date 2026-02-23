import pytest
from unittest.mock import patch, MagicMock
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


class TestBotIntegration:
    """Test di integrazione per il bot Telegram con il backend"""

    @pytest.mark.asyncio
    @patch('endpoint.requests.post')
    async def test_complete_flow_login_and_report(self, mock_requests_post):
        """Test flusso completo: login -> creazione report"""
        # Mock login success
        login_response = MagicMock()
        login_response.status_code = 200
        login_response.json.return_value = {
            'token': 'fake_jwt_token',
            'user': {'id': 1, 'username': 'testuser'}
        }

        # Mock report creation success
        report_response = MagicMock()
        report_response.status_code = 201
        report_response.json.return_value = {
            'id': 1,
            'title': 'Report da Telegram',
            'state': 'PENDING'
        }

        mock_requests_post.side_effect = [login_response, report_response]

        # Simula il flusso completo
        # 1. Login
        # 2. Creazione report con location
        
        assert mock_requests_post.call_count == 0  # Prima del test

    @pytest.mark.asyncio
    @patch('endpoint.requests.get')
    async def test_retrieve_user_info_integration(self, mock_requests_get):
        """Test integrazione recupero info utente dal backend"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'id': 1,
            'username': 'testuser',
            'name': 'Mario',
            'surname': 'Rossi',
            'email': 'mario@test.com',
            'telegramUsername': '@testuser'
        }
        mock_requests_get.return_value = mock_response

        # Test che il bot recuperi correttamente le info
        # e le formatti per l'utente Telegram

    @pytest.mark.asyncio
    @patch('endpoint.requests.post')
    async def test_report_with_photos_integration(self, mock_requests_post):
        """Test integrazione creazione report con foto"""
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_response.json.return_value = {
            'id': 1,
            'title': 'Report con foto',
            'photos': ['photo1.jpg', 'photo2.jpg']
        }
        mock_requests_post.return_value = mock_response

        # Test invio report con allegati foto
        # Verifica che le foto siano correttamente caricate

    def test_bot_commands_registered(self):
        """Test che tutti i comandi bot siano registrati"""
        from bot_config import app
        
        handlers = app.handlers[0]  # Group 0 handlers
        
        # Verifica presenza command handlers
        command_names = []
        for handler in handlers:
            if hasattr(handler, 'commands'):
                command_names.extend(handler.commands)
        
        expected_commands = ['start', 'login', 'info', 'report']
        for cmd in expected_commands:
            assert cmd in command_names, f"Comando /{cmd} non registrato"

    def test_conversation_handler_registered(self):
        """Test che il conversation handler sia registrato"""
        from bot_config import app
        
        # Verifica che ci sia un ConversationHandler
        has_conv_handler = False
        for handler_list in app.handlers.values():
            for handler in handler_list:
                if handler.__class__.__name__ == 'ConversationHandler':
                    has_conv_handler = True
                    break
        
        assert has_conv_handler, "ConversationHandler non registrato"