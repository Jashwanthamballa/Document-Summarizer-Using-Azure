"""
Database Setup and Connection Management
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./summarizer.db")

# Create engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_tables():
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)

def get_db():
    """Get database session - FastAPI dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize database with default settings"""
    create_tables()
    
    # Add default evaluation settings
    db = SessionLocal()
    try:
        from models import EvaluationSettings
        
        # Check if settings already exist
        existing_settings = db.query(EvaluationSettings).first()
        if not existing_settings:
            default_settings = [
                EvaluationSettings(
                    setting_name="readability_weight",
                    setting_value="0.4",
                    description="Weight for readability in overall quality score"
                ),
                EvaluationSettings(
                    setting_name="consistency_weight", 
                    setting_value="0.6",
                    description="Weight for consistency in overall quality score"
                ),
                EvaluationSettings(
                    setting_name="target_reading_level",
                    setting_value="12",
                    description="Target grade level for readability (Flesch-Kincaid)"
                ),
                EvaluationSettings(
                    setting_name="min_similarity_threshold",
                    setting_value="0.7",
                    description="Minimum semantic similarity threshold for good summaries"
                )
            ]
            
            db.add_all(default_settings)
            db.commit()
            
    except Exception as e:
        print(f"Error initializing database: {e}")
        db.rollback()
    finally:
        db.close()

class DatabaseManager:
    """Database operations manager"""
    
    def __init__(self):
        self.engine = engine
        self.SessionLocal = SessionLocal
    
    def get_session(self):
        """Get a new database session"""
        return self.SessionLocal()
    
    def create_upload_session(self, total_files: int):
        """Create a new upload session"""
        from models import UploadSession
        
        db = self.get_session()
        try:
            session = UploadSession(total_files=total_files)
            db.add(session)
            db.commit()
            db.refresh(session)
            return session
        finally:
            db.close()
    
    def get_upload_session(self, session_id: str):
        """Get upload session by ID"""
        from models import UploadSession
        
        db = self.get_session()
        try:
            return db.query(UploadSession).filter(UploadSession.id == session_id).first()
        finally:
            db.close()
    
    def update_session_status(self, session_id: str, status: str, processed_files: int = None):
        """Update session status"""
        from models import UploadSession
        
        db = self.get_session()
        try:
            session = db.query(UploadSession).filter(UploadSession.id == session_id).first()
            if session:
                session.status = status
                if processed_files is not None:
                    session.processed_files = processed_files
                db.commit()
        finally:
            db.close()
    
    def update_file_status(self, file_id: str, status: str):
        """Update file processing status"""
        from models import UploadedFile
        
        db = self.get_session()
        try:
            file = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
            if file:
                file.processing_status = status
                db.commit()
        finally:
            db.close()
    
    def save_uploaded_file(self, session_id: str, filename: str, file_size: int, extracted_text: str):
        """Save uploaded file information"""
        from models import UploadedFile
        
        db = self.get_session()
        try:
            uploaded_file = UploadedFile(
                session_id=session_id,
                filename=filename,
                file_size=file_size,
                extracted_text=extracted_text,
                text_length=len(extracted_text) if extracted_text else 0
            )
            db.add(uploaded_file)
            db.commit()
            db.refresh(uploaded_file)
            return uploaded_file
        finally:
            db.close()
    
    def save_summary(self, file_id: str, summary_type: str, content: str):
        """Save summary for a file"""
        from models import Summary
        
        db = self.get_session()
        try:
            summary = Summary(
                file_id=file_id,
                summary_type=summary_type,
                content=content
            )
            db.add(summary)
            db.commit()
            db.refresh(summary)
            return summary
        finally:
            db.close()
    
    def save_evaluation(self, file_id: str, summary_id: str, evaluation_data: dict):
        """Save evaluation results"""
        from models import Evaluation
        
        db = self.get_session()
        try:
            evaluation = Evaluation(
                file_id=file_id,
                summary_id=summary_id,
                **evaluation_data
            )
            db.add(evaluation)
            db.commit()
            db.refresh(evaluation)
            return evaluation
        finally:
            db.close()
    
    def get_session_results(self, session_id: str):
        """Get all results for a session"""
        from models import UploadSession, UploadedFile, Summary, Evaluation
        
        db = self.get_session()
        try:
            session = db.query(UploadSession).filter(UploadSession.id == session_id).first()
            if not session:
                return None
            
            files_with_results = []
            for file in session.files:
                summaries = {}
                evaluations = {}
                
                for summary in file.summaries:
                    summaries[summary.summary_type] = summary.content
                    
                    # Get evaluations for this summary
                    for eval in summary.evaluations:
                        evaluations[summary.summary_type] = {
                            'readability_score': eval.readability_score,
                            'consistency_score': eval.consistency_score,
                            'overall_quality_score': eval.overall_quality_score,
                            'flesch_reading_ease': eval.flesch_reading_ease,
                            'flesch_kincaid_grade': eval.flesch_kincaid_grade,
                            'semantic_similarity_score': eval.semantic_similarity_score
                        }
                        break  # Only need the first evaluation per summary
                
                files_with_results.append({
                    'file_id': file.id,
                    'filename': file.filename,
                    'summaries': summaries,
                    'evaluations': evaluations,
                    'status': file.processing_status
                })
            
            return {
                'session_id': session.id,
                'status': session.status,
                'total_files': session.total_files,
                'processed_files': session.processed_files,
                'files': files_with_results
            }
        finally:
            db.close()
    
    def get_recent_sessions(self, limit: int = 10):
        """Get recent upload sessions with basic info"""
        from models import UploadSession
        
        db = self.get_session()
        try:
            sessions = db.query(UploadSession).order_by(
                UploadSession.created_at.desc()
            ).limit(limit).all()
            
            return [{
                'session_id': session.id,
                'status': session.status,
                'total_files': session.total_files,
                'processed_files': session.processed_files,
                'created_at': session.created_at.isoformat(),
                'file_names': [file.filename for file in session.files[:3]]  # Show first 3 filenames
            } for session in sessions]
        finally:
            db.close()

# Global database manager instance
db_manager = DatabaseManager()