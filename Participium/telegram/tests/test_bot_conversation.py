import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from telegram import Update, Location, Message
from telegram.ext import ContextTypes, ConversationHandler
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from endpoint import sendReport, receiveLocation, WAITING_LOCATION


class TestReportConversation:
    """Test per il flusso di conversazione della creazione report"""

    @pytest.fixture
    def mock_update_with_location(self):
        """Mock Update con location"""
        update = MagicMock(spec=Update)
        update.effective_user = MagicMock()
        update.effective_user.id = 123456789
        update.message = MagicMock(spec=Message)
        update.message.reply_text = AsyncMock()
        update.message.location = MagicMock(spec=Location)
        update.message.location.latitude = 45.4642
        update.message.location.longitude = 9.1900
        return update

    @pytest.fixture
    def mock_context_logged_in(self):
        """Context con utente loggato"""
        context = MagicMock(spec=ContextTypes.DEFAULT_TYPE)
        context.user_data = {
            'token': 'fake_jwt_token',
            'user_id': 1,
            'username': 'testuser'
        }
        return context

    @pytest.mark.asyncio
    async def test_report_conversation_start(self, mock_update_with_location, mock_context_logged_in):
        """Test inizio conversazione report"""
        mock_update = MagicMock(spec=Update)
        mock_update.message = MagicMock()
        mock_update.message.reply_text = AsyncMock()
        
        result = await sendReport(mock_update, mock_context_logged_in)

        # Dovrebbe chiedere la posizione
        mock_update.message.reply_text.assert_called()
        assert result == WAITING_LOCATION

    @pytest.mark.asyncio
    @patch('endpoint.requests.post')
    async def test_receive_location(self, mock_requests_post, mock_update_with_location, mock_context_logged_in):
        """Test ricezione location dall'utente"""
        # Mock risposta API di creazione report
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_response.json.return_value = {
            'id': 1,
            'title': 'Report da Telegram',
            'state': 'PENDING'
        }
        mock_requests_post.return_value = mock_response

        result = await receiveLocation(mock_update_with_location, mock_context_logged_in)

        # Verifica chiamata API
        mock_requests_post.assert_called_once()
        call_args = mock_requests_post.call_args
        
        # Verifica che latitude e longitude siano nel payload
        assert call_args is not None
        
        # Verifica messaggio di conferma
        mock_update_with_location.message.reply_text.assert_called()
        
        # Dovrebbe terminare la conversazione
        assert result == ConversationHandler.END

    @pytest.mark.asyncio
    async def test_receive_location_no_coordinates(self, mock_context_logged_in):
        """Test ricezione location senza coordinate valide"""
        mock_update = MagicMock(spec=Update)
        mock_update.message = MagicMock()
        mock_update.message.reply_text = AsyncMock()
        mock_update.message.location = None

        result = await receiveLocation(mock_update, mock_context_logged_in)

        # Dovrebbe mostrare errore
        mock_update.message.reply_text.assert_called()
        args = mock_update.message.reply_text.call_args
        assert "errore" in args[0][0].lower() or "posizione" in args[0][0].lower()

    @pytest.mark.asyncio
    @patch('endpoint.requests.post')
    async def test_receive_location_api_error(self, mock_requests_post, mock_update_with_location, mock_context_logged_in):
        """Test gestione errore API durante creazione report"""
        # Mock errore API
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.json.return_value = {
            'error': 'Invalid data'
        }
        mock_requests_post.return_value = mock_response

        result = await receiveLocation(mock_update_with_location, mock_context_logged_in)

        # Dovrebbe mostrare messaggio di errore
        mock_update_with_location.message.reply_text.assert_called()
        args = mock_update_with_location.message.reply_text.call_args
        assert "errore" in args[0][0].lower() or "problema" in args[0][0].lower()