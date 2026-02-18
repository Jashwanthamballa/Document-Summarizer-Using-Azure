import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  CircularProgress,
  Chip,
  LinearProgress,
  Card,
  CardContent,
  Grid,
  Divider,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Delete as DeleteIcon,
  PictureAsPdf as PdfIcon,
  CloudUpload as CloudUploadIcon,
  History as HistoryIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import { ApiService } from '../services/api';
import { UploadedFileWithPreview, SessionInfo } from '../types/api';

const MAX_FILES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function UploadPage() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<UploadedFileWithPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSessions, setRecentSessions] = useState<SessionInfo[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null);

    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const reasons = rejectedFiles.map((f: any) => f.errors.map((e: any) => e.message).join(', ')).join('; ');
      setError(`Some files were rejected: ${reasons}`);
    }

    // Add accepted files
    const newFiles: UploadedFileWithPreview[] = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
    }));

    setFiles((prev: UploadedFileWithPreview[]) => {
      const combined = [...prev, ...newFiles];
      if (combined.length > MAX_FILES) {
        setError(`Maximum ${MAX_FILES} files allowed. Only the first ${MAX_FILES} will be kept.`);
        return combined.slice(0, MAX_FILES);
      }
      return combined;
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  });

  const loadRecentSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const response = await ApiService.listRecentSessions(5);
      setRecentSessions(response.sessions);
    } catch (error) {
      console.error('Failed to load recent sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    loadRecentSessions();
  }, [loadRecentSessions]);

  const removeFile = (fileId: string) => {
    setFiles((prev: UploadedFileWithPreview[]) => prev.filter((f: UploadedFileWithPreview) => f.id !== fileId));
    setError(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffHours * 60);
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      const hours = Math.floor(diffHours);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleSessionClick = (sessionId: string) => {
    navigate(`/results/${sessionId}`);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one PDF file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const fileList = files.map((f: UploadedFileWithPreview) => f.file);
      const response = await ApiService.uploadMultiplePDFs(fileList);
      
      // Navigate to results page with session ID
      navigate(`/results/${response.session_id}`);
      
    } catch (error: any) {
      console.error('Upload error:', error);
      setError(error.response?.data?.detail || error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const clearAll = () => {
    setFiles([]);
    setError(null);
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom align="center">
        Multi-PDF Document Summarizer
      </Typography>
      
      <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
        Upload multiple PDF documents to generate summaries with quality evaluation
      </Typography>

      {/* Upload Section */}
      <Paper 
        {...getRootProps()} 
        sx={{ 
          p: 4, 
          mb: 3, 
          border: `2px dashed ${isDragActive ? '#1976d2' : '#ccc'}`,
          backgroundColor: isDragActive ? '#f3f7ff' : '#fafafa',
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: '#f5f5f5',
            borderColor: '#1976d2'
          }
        }}
      >
        <input {...getInputProps()} />
        <Box display="flex" flexDirection="column" alignItems="center">
          <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          {isDragActive ? (
            <Typography variant="h6" color="primary">
              Drop your PDF files here...
            </Typography>
          ) : (
            <>
              <Typography variant="h6" gutterBottom>
                Drag & drop PDF files here, or click to select
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Maximum {MAX_FILES} files, up to {formatFileSize(MAX_FILE_SIZE)} each
              </Typography>
            </>
          )}
        </Box>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* File List */}
      {files.length > 0 && (
        <Paper sx={{ mb: 3 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">
                Selected Files ({files.length}/{MAX_FILES})
              </Typography>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={clearAll}
                disabled={uploading}
              >
                Clear All
              </Button>
            </Box>
          </Box>
          
          <List>
            {files.map((file: UploadedFileWithPreview) => (
              <ListItem key={file.id} divider>
                <Box sx={{ mr: 2 }}>
                  <PdfIcon color="error" />
                </Box>
                <ListItemText
                  primary={file.name}
                  secondary={formatFileSize(file.size)}
                />
                <Chip 
                  label="PDF" 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                  sx={{ mr: 1 }}
                />
                <ListItemSecondaryAction>
                  <IconButton 
                    edge="end" 
                    onClick={() => removeFile(file.id)}
                    disabled={uploading}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Upload Button */}
      <Box display="flex" justifyContent="center">
        <Button
          variant="contained"
          size="large"
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
          startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
          sx={{ minWidth: 200 }}
        >
          {uploading ? 'Processing...' : `Process ${files.length} Files`}
        </Button>
      </Box>

      {/* Upload Progress */}
      {uploading && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" align="center" gutterBottom>
            Uploading files and generating summaries...
          </Typography>
          <LinearProgress />
        </Box>
      )}

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Divider sx={{ mb: 3 }} />
          <Box display="flex" alignItems="center" mb={2}>
            <HistoryIcon sx={{ mr: 1, color: 'text.secondary' }} />
            <Typography variant="h6">Recent Sessions</Typography>
          </Box>
          
          {loadingSessions ? (
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Grid container spacing={2}>
              {recentSessions.map((session) => (
                <Grid item xs={12} sm={6} md={4} key={session.session_id}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 2
                      }
                    }}
                    onClick={() => handleSessionClick(session.session_id)}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={1}>
                        <AccessTimeIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(session.created_at)}
                        </Typography>
                        <Chip 
                          label={session.status}
                          size="small"
                          color={session.status === 'completed' ? 'success' : session.status === 'failed' ? 'error' : 'primary'}
                          sx={{ ml: 'auto' }}
                        />
                      </Box>
                      
                      <Typography variant="body2" gutterBottom>
                        {session.total_files} file{session.total_files !== 1 ? 's' : ''} processed
                      </Typography>
                      
                      {session.file_names.length > 0 && (
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {session.file_names.join(', ')}
                          {session.total_files > session.file_names.length && ` (+${session.total_files - session.file_names.length} more)`}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}
    </Box>
  );
}

export default UploadPage;