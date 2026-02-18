"""
Database Models for Document Summarization System
"""
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Float, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import uuid

Base = declarative_base()

class UploadSession(Base):
    """Represents a single upload session with multiple files"""
    __tablename__ = "upload_sessions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime, default=datetime.utcnow)
    total_files = Column(Integer, default=0)
    processed_files = Column(Integer, default=0)
    status = Column(String, default="processing")  # processing, completed, failed
    
    # Relationships
    files = relationship("UploadedFile", back_populates="session")
    aggregate_summary = relationship("AggregateSummary", back_populates="session", uselist=False)

class UploadedFile(Base):
    """Represents an uploaded PDF file"""
    __tablename__ = "uploaded_files"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("upload_sessions.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)  # Size in bytes
    extracted_text = Column(Text)
    text_length = Column(Integer)  # Length of extracted text
    upload_time = Column(DateTime, default=datetime.utcnow)
    processing_status = Column(String, default="pending")  # pending, processing, completed, failed
    error_message = Column(Text)
    
    # Relationships
    session = relationship("UploadSession", back_populates="files")
    summaries = relationship("Summary", back_populates="file")
    evaluations = relationship("Evaluation", back_populates="file")

class Summary(Base):
    """Represents summaries generated for a file"""
    __tablename__ = "summaries"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    file_id = Column(String, ForeignKey("uploaded_files.id"), nullable=False)
    summary_type = Column(String, nullable=False)  # short, medium, long
    content = Column(Text, nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    file = relationship("UploadedFile", back_populates="summaries")
    evaluations = relationship("Evaluation", back_populates="summary")

class AggregateSummary(Base):
    """Represents aggregate summaries across multiple files in a session"""
    __tablename__ = "aggregate_summaries"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("upload_sessions.id"), nullable=False)
    summary_type = Column(String, nullable=False)  # short, medium, long
    content = Column(Text, nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship("UploadSession", back_populates="aggregate_summary")

class Evaluation(Base):
    """Represents evaluation metrics for summaries"""
    __tablename__ = "evaluations"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    file_id = Column(String, ForeignKey("uploaded_files.id"), nullable=False)
    summary_id = Column(String, ForeignKey("summaries.id"), nullable=False)
    
    # Readability metrics from textstat
    flesch_kincaid_grade = Column(Float)
    flesch_reading_ease = Column(Float)
    gunning_fog = Column(Float)
    automated_readability_index = Column(Float)
    coleman_liau_index = Column(Float)
    average_sentence_length = Column(Float)
    syllable_count = Column(Integer)
    word_count = Column(Integer)
    
    # Consistency metrics
    semantic_similarity_score = Column(Float)  # Similarity between original text and summary
    factual_consistency_score = Column(Float)  # How well summary maintains facts
    coherence_score = Column(Float)  # Internal consistency of summary
    
    # Overall scores
    readability_score = Column(Float)  # Composite readability score (0-100)
    consistency_score = Column(Float)  # Composite consistency score (0-100)
    overall_quality_score = Column(Float)  # Overall quality score (0-100)
    
    evaluated_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    file = relationship("UploadedFile", back_populates="evaluations")
    summary = relationship("Summary", back_populates="evaluations")

class EvaluationSettings(Base):
    """Configuration settings for evaluation criteria"""
    __tablename__ = "evaluation_settings"
    
    id = Column(Integer, primary_key=True)
    setting_name = Column(String, unique=True, nullable=False)
    setting_value = Column(String, nullable=False)
    description = Column(Text)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)