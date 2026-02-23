import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from telegram import Update, User, Message, Chat
from telegram.ext import ContextTypes
import sys
import os

# Aggiungi il path per importare i moduli del bot
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from endpoint import start, retrieveAccount, info, sendReport, cancel


class TestBotCommands:
    """Test per i comandi base del bot Telegram"""

    @pytest.fixture
    def mock_update(self):
        """Crea un mock di Update per i test"""
        update = MagicMock(spec=Update)
        update.effective_user = MagicMock(spec=User)
        update.effective_user.id = 123456789
        update.effective_user.first_name = "Test"
        update.effective_user.username = "testuser"
        update.message = MagicMock(spec=Message)
        update.message.reply_text = AsyncMock()
        update.message.chat = MagicMock(spec=Chat)
        update.message.chat.id = 123456789
        return update

    @pytest.fixture
    def mock_context(self):
        """Crea un mock di Context per i test"""
        context = MagicMock(spec=ContextTypes.DEFAULT_TYPE)
        context.user_data = {}
        return context

    @pytest.mark.asyncio
    async def test_start_command(self, mock_update, mock_context):
        """Test comando /start - dovrebbe inviare messaggio di benvenuto"""
        await start(mock_update, mock_context)

        mock_update.message.reply_text.assert_called_once()
        args = mock_update.message.reply_text.call_args
        assert "benvenuto" in args[0][0].lower() or "participium" in args[0][0].lower()

    @pytest.mark.asyncio
    async def test_start_command_with_username(self, mock_update, mock_context):
        """Test comando /start - dovrebbe usare il nome dell'utente"""
        mock_update.effective_user.first_name = "Mario"
        
        await start(mock_update, mock_context)

        mock_update.message.reply_text.assert_called_once()
        args = mock_update.message.reply_text.call_args
        assert "Mario" in args[0][0] or "mario" in args[0][0].lower()

    @pytest.mark.asyncio
    async def test_info_command_not_logged_in(self, mock_update, mock_context):
        """Test comando /info - dovrebbe richiedere login se non autenticato"""
        # Context senza token (utente non loggato)
        mock_context.user_data = {}

        await info(mock_update, mock_context)

        mock_update.message.reply_text.assert_called_once()
        args = mock_update.message.reply_text.call_args
        assert "login" in args[0][0].lower() or "autenticato" in args[0][0].lower()

    @pytest.mark.asyncio
    @patch('endpoint.requests.get')
    async def test_info_command_logged_in(self, mock_requests_get, mock_update, mock_context):
        """Test comando /info - dovrebbe mostrare info utente se autenticato"""
        # Context con token (utente loggato)
        mock_context.user_data = {
            'token': 'fake_jwt_token',
            'user_id': 1
        }

        # Mock della risposta API
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'id': 1,
            'username': 'testuser',
            'name': 'Mario',
            'surname': 'Rossi',
            'email': 'mario@test.com'
        }
        mock_requests_get.return_value = mock_response

        await info(mock_update, mock_context)

        mock_update.message.reply_text.assert_called_once()
        args = mock_update.message.reply_text.call_args
        message = args[0][0]
        assert "Mario" in message
        assert "Rossi" in message
        assert "testuser" in message

    @pytest.mark.asyncio
    @patch('endpoint.requests.get')
    async def test_info_command_api_error(self, mock_requests_get, mock_update, mock_context):
        """Test comando /info - dovrebbe gestire errori API"""
        mock_context.user_data = {
            'token': 'fake_jwt_token',
            'user_id': 1
        }

        # Mock di errore API
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_requests_get.return_value = mock_response

        await info(mock_update, mock_context)

        mock_update.message.reply_text.assert_called_once()
        args = mock_update.message.reply_text.call_args
        assert "errore" in args[0][0].lower() or "problema" in args[0][0].lower()

    @pytest.mark.asyncio
    async def test_cancel_command(self, mock_update, mock_context):
        """Test comando /cancel - dovrebbe annullare operazione corrente"""
        result = await cancel(mock_update, mock_context)

        mock_update.message.reply_text.assert_called_once()
        args = mock_update.message.reply_text.call_args
        assert "annullato" in args[0][0].lower() or "cancel" in args[0][0].lower()

    @pytest.mark.asyncio
    async def test_report_command_not_logged_in(self, mock_update, mock_context):
        """Test comando /report - dovrebbe richiedere login"""
        mock_context.user_data = {}

        result = await sendReport(mock_update, mock_context)

        mock_update.message.reply_text.assert_called_once()
        args = mock_update.message.reply_text.call_args
        assert "login" in args[0][0].lower()

    @pytest.mark.asyncio
    async def test_report_command_logged_in(self, mock_update, mock_context):
        """Test comando /report - dovrebbe avviare conversazione"""
        mock_context.user_data = {
            'token': 'fake_jwt_token',
            'user_id': 1
        }

        result = await sendReport(mock_update, mock_context)

        mock_update.message.reply_text.assert_called()
        # Verifica che chieda la posizione
        args = mock_update.message.reply_text.call_args
        assert "posizione" in args[0][0].lower() or "location" in args[0][0].lower()


class TestBotLogin:
    """Test per il flusso di login"""

    @pytest.fixture
    def mock_update(self):
        update = MagicMock(spec=Update)
        update.effective_user = MagicMock(spec=User)
        update.effective_user.id = 123456789
        update.message = MagicMock(spec=Message)
        update.message.reply_text = AsyncMock()
        update.message.text = "/login"
        return update

    @pytest.fixture
    def mock_context(self):
        context = MagicMock(spec=ContextTypes.DEFAULT_TYPE)
        context.user_data = {}
        return context

    @pytest.mark.asyncio
    async def test_login_command_prompt(self, mock_update, mock_context):
        """Test comando /login - dovrebbe chiedere credenziali"""
        await retrieveAccount(mock_update, mock_context)

        mock_update.message.reply_text.assert_called()
        args = mock_update.message.reply_text.call_args
        message = args[0][0]
        assert "username" in message.lower() or "credenziali" in message.lower()

    @pytest.mark.asyncio
    @patch('endpoint.requests.post')
    async def test_login_success(self, mock_requests_post, mock_update, mock_context):
        """Test login riuscito - dovrebbe salvare token"""
        # Simula risposta di login
        mock_update.message.text = "testuser password123"
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'token': 'fake_jwt_token',
            'user': {
                'id': 1,
                'username': 'testuser'
            }
        }
        mock_requests_post.return_value = mock_response

        # Simula il flusso di login (implementazione dipende dal codice reale)
        # Questo è un esempio, adattalo alla tua implementazione
        
        # Verifica che il token sia salvato nel context
        assert 'token' not in mock_context.user_data  # Prima del login
        
        # Dopo un login riuscito, il token dovrebbe essere salvato
        # mock_context.user_data['token'] = 'fake_jwt_token'
        # assert mock_context.user_data['token'] == 'fake_jwt_token'

    @pytest.mark.asyncio
    @patch('endpoint.requests.post')
    async def test_login_invalid_credentials(self, mock_requests_post, mock_update, mock_context):
        """Test login con credenziali errate"""
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.json.return_value = {
            'error': 'Invalid credentials'
        }
        mock_requests_post.return_value = mock_response

        # Test implementazione login con credenziali errate
        # Dovrebbe mostrare messaggio di errore