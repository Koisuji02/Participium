# How to run tests for Telegram Bot

## 🚀 First Time Setup (New Machine)

### 1. Clone the repository
```bash
git clone <repo-url>
cd Participium/telegram
```

### create virtual enviroment
```
    python -m venv venv
```

###
# Windows
```
venv\Scripts\activate
```
# Linux/Mac
```
source venv/bin/activate
```

### install dependencies
```
pip install -r requirements-test.txt
```

```
python -m pytest tests/ -v
```

## Test command

### Run all tests
```
python -m pytest tests/ -v
```
### Run specific test file
```
python -m pytest tests/test_bot_commands.py -v
```

# Run with coverage
```
python -m pytest tests/ --cov=. --cov-report=html -v
```

# Run tests matching a pattern
```
python -m pytest tests/ -k "test_start" -v
```