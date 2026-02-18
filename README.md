# Enhanced Multi-PDF Document Summarizer

A sophisticated web application that processes multiple PDF documents simultaneously, generates AI-powered summaries using Azure PromptFlow, evaluates summary quality, and presents results in an interactive React interface.

## 🚀 Features

### Core Functionality
- **Multi-PDF Upload**: Process up to 10 PDF files simultaneously with drag-and-drop interface
- **AI Summarization**: Generate short, medium, and long summaries using Azure PromptFlow
- **Individual & Aggregate**: Per-file summaries plus combined analysis across all documents
- **Real-time Processing**: Background processing with live progress updates

### Quality Evaluation System
- **Readability Analysis**: Using textstat library for Flesch-Kincaid, Gunning Fog, and other metrics
- **Consistency Scoring**: Semantic similarity between original text and summaries
- **Composite Scoring**: Overall quality ratings with detailed breakdown
- **Interactive Reports**: DataGrid tables with sortable evaluation metrics

### Technical Architecture
- **Backend**: FastAPI with async processing, SQLAlchemy ORM, SQLite database
- **Frontend**: React TypeScript with Material-UI components and responsive design
- **Processing**: Concurrent file processing with semaphore-controlled resource management
- **Storage**: Persistent storage of results, summaries, and evaluation data

## 📁 Project Structure

```
SUMMARIZER/
├── backend/                    # FastAPI Application
│   ├── main.py                # Enhanced API with multi-PDF endpoints
│   ├── flow_runner.py         # PromptFlow integration
│   ├── models.py              # SQLAlchemy database models
│   ├── database.py            # Database setup and operations
│   ├── evaluation_service.py  # Quality evaluation engine
│   ├── requirements.txt       # Python dependencies
│   ├── .env                   # Environment configuration
│   └── uploads/               # Temporary file storage
└── frontend/                   # React TypeScript Application
    ├── src/
    │   ├── components/
    │   │   ├── UploadPage.tsx  # Multi-file upload interface
    │   │   └── ResultsPage.tsx # Results display with evaluation tables
    │   ├── services/
    │   │   └── api.ts          # API integration layer
    │   ├── types/
    │   │   └── api.ts          # TypeScript type definitions
    │   ├── App.tsx             # Main React application
    │   └── main.tsx            # React entry point
    ├── package.json            # Node.js dependencies
    ├── vite.config.ts          # Vite configuration
    └── index.html              # HTML template
```

## 🛠️ Setup Instructions

### Prerequisites
- **Python 3.8+**: For backend API and processing
- **Node.js 18+**: For React frontend development
- **Azure PromptFlow**: Deployed endpoint with API key

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables** (`.env` file):
   ```env
   PROMPTFLOW_ENDPOINT=https://your-endpoint.azureml.net/score
   PROMPTFLOW_KEY=your-api-key-here
   PROMPTFLOW_DEPLOYMENT=your-deployment-name
   DATABASE_URL=sqlite:///./summarizer.db
   ```

4. **Initialize database**:
   ```bash
   python -c "from database import init_db; init_db()"
   ```

5. **Start backend server**:
   ```bash
   python main.py
   ```
   Backend runs on: http://localhost:8000

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```
   Frontend runs on: http://localhost:3000

## 🔄 API Endpoints

### Multi-PDF Processing
- `POST /upload-multiple` - Upload multiple PDFs, returns session ID
- `GET /session/{session_id}` - Get processing results and evaluations
- `POST /upload` - Single PDF upload (backward compatibility)

### System
- `GET /health` - Health check
- `POST /test-connection` - Test PromptFlow connectivity

## 📊 Evaluation Metrics

### Readability Assessment
- **Flesch-Kincaid Grade Level**: Educational level required to understand text
- **Flesch Reading Ease**: 0-100 scale of reading difficulty  
- **Gunning Fog Index**: Years of education needed to comprehend text
- **Average Sentence Length**: Sentence complexity indicator
- **Composite Readability Score**: Weighted overall readability (0-100)

### Consistency Evaluation  
- **Semantic Similarity**: Vector similarity between original and summary
- **Factual Consistency**: Keyword and entity overlap analysis
- **Coherence Score**: Internal consistency within summary text
- **Composite Consistency Score**: Weighted overall consistency (0-100)

### Overall Quality
- **Weighted Scoring**: Combines readability and consistency with summary-type weighting
- **Quality Ratings**: Excellent (80+), Good (70+), Fair (60+), Poor (<60)

## 🏗️ Architecture Details

### Database Schema
- **UploadSession**: Manages multi-file upload sessions
- **UploadedFile**: Stores file metadata and extracted text
- **Summary**: Individual summaries (short/medium/long)
- **Evaluation**: Quality metrics for each summary
- **AggregateSummary**: Combined analysis across multiple files

### Processing Pipeline
1. **File Upload**: Validate and queue PDF files
2. **Text Extraction**: PyPDF2 text extraction with error handling
3. **Concurrent Processing**: Semaphore-controlled async processing
4. **Summarization**: PromptFlow API calls for each document
5. **Quality Evaluation**: textstat + sentence-transformers analysis
6. **Database Storage**: Persist all results and metrics
7. **Real-time Updates**: WebSocket-like polling for progress

### Frontend Architecture
- **Component Library**: Material-UI with TypeScript interfaces
- **State Management**: React hooks with proper error boundaries
- **API Integration**: Axios with retry logic and error handling
- **Responsive Design**: Mobile-friendly interface with progressive enhancement

## 🔧 Development

### Backend Development
```bash
cd backend
pip install -r requirements.txt
python main.py  # Development server with auto-reload
```

### Frontend Development  
```bash
cd frontend
npm install
npm run dev  # Vite dev server with hot reload
```

### Production Build
```bash
cd frontend
npm run build  # Creates optimized production build
```

## 🐛 Troubleshooting

### Common Issues

**Backend won't start**: Check Python dependencies and .env configuration

**PromptFlow connection failed**: Verify endpoint URL and API key in .env

**Database errors**: Run database initialization: `python -c "from database import init_db; init_db()"`

**Frontend API errors**: Ensure backend is running on port 8000, check CORS settings

**File upload failures**: Verify file size limits (5MB per file, 10 files max)

### Debug Mode
Set environment variables for enhanced logging:
```bash
export PYTHONPATH="."
export DEBUG=1
```

## 🚀 Deployment

### Production Considerations
- **Environment Variables**: Store secrets securely (Azure Key Vault, etc.)
- **Database**: Migrate from SQLite to PostgreSQL/SQL Server for production
- **File Storage**: Use Azure Blob Storage for uploaded files
- **Scaling**: Implement Redis for session management and task queuing
- **Monitoring**: Add Application Insights integration
- **Security**: Implement authentication, rate limiting, input validation

### Docker Deployment (Future Enhancement)
```dockerfile
# Example Dockerfile structure for future containerization
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 📈 Performance

- **Concurrent Processing**: Up to 3 simultaneous PDF processing jobs
- **File Size Limits**: 5MB per PDF, 10 files per session
- **Timeout Handling**: 2-minute timeout for PromptFlow calls
- **Database**: SQLite for development, scalable to enterprise databases
- **Frontend**: Optimized React build with code splitting and lazy loading

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/enhancement`)
3. Commit changes (`git commit -am 'Add enhancement'`)
4. Push to branch (`git push origin feature/enhancement`)
5. Create Pull Request

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

---

**Built with**: FastAPI, React, TypeScript, Material-UI, Azure PromptFlow, SQLAlchemy, textstat, sentence-transformers