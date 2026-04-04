# GrowthLog Backend

FastAPI + MongoDB backend for GrowthLog.

## Setup

```bash
pip install -r requirements.txt
```

## Run

```bash
# Make sure MongoDB is running on localhost:27017
uvicorn main:app --reload --port 8000
```

## Environment Variables

```
MONGO_URL=mongodb://localhost:27017
JWT_SECRET=your_secret_key
```

## API Docs

Visit http://localhost:8000/docs for Swagger UI.
