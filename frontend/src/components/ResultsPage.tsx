import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon,
  Assessment as AssessmentIcon,
  Description as DescriptionIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { ApiService } from '../services/api';
import { MultiPDFResponse, SummaryType } from '../types/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function ResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [results, setResults] = useState<MultiPDFResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [polling, setPolling] = useState(false);

  const fetchResults = async (showPolling: boolean = false) => {
    if (!sessionId) return;

    if (showPolling) setPolling(true);
    
    try {
      const response = await ApiService.getSessionResults(sessionId);
      setResults(response);
      setError(null);
      
      // If still processing, continue polling
      if (response.status === 'processing' && !showPolling) {
        setTimeout(() => fetchResults(), 3000);
      }
    } catch (error: any) {
      console.error('Error fetching results:', error);
      setError(error.response?.data?.detail || error.message || 'Failed to fetch results');
    } finally {
      setLoading(false);
      if (showPolling) setPolling(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [sessionId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'warning';
      case 'failed': return 'error';
      case 'partial': return 'info';
      default: return 'default';
    }
  };

  const getQualityRating = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'success' as const };
    if (score >= 70) return { label: 'Good', color: 'info' as const };
    if (score >= 60) return { label: 'Fair', color: 'warning' as const };
    return { label: 'Poor', color: 'error' as const };
  };

  const getReadabilityLevel = (grade: number) => {
    if (grade <= 6) return 'Elementary';
    if (grade <= 9) return 'Middle School';
    if (grade <= 12) return 'High School';
    if (grade <= 16) return 'College';
    return 'Graduate';
  };

  // Prepare evaluation data for DataGrid
  const evaluationRows = results ? results.files.flatMap((file: any, fileIndex: number) => 
    Object.entries(file.evaluations).map(([summaryType, evaluation]: [string, any], evalIndex: number) => ({
      id: `${fileIndex}-${evalIndex}`,
      filename: file.filename,
      summaryType: summaryType.charAt(0).toUpperCase() + summaryType.slice(1),
      readabilityScore: evaluation?.readability_score || 0,
      consistencyScore: evaluation?.consistency_score || 0,
      overallScore: evaluation?.overall_quality_score || 0,
      fleschEase: evaluation?.flesch_reading_ease || 0,
      fleschGrade: evaluation?.flesch_kincaid_grade || 0,
      semanticSimilarity: evaluation?.semantic_similarity_score || 0,
      status: file.status,
    }))
  ) : [];

  const evaluationColumns: GridColDef[] = [
    {
      field: 'filename',
      headerName: 'File',
      width: 200,
      renderCell: (params: any) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {params.value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.summaryType} Summary
          </Typography>
        </Box>
      ),
    },
    {
      field: 'overallScore',
      headerName: 'Overall Quality',
      width: 150,
      renderCell: (params: any) => {
        const rating = getQualityRating(params.value);
        return (
          <Box>
            <Chip
              label={`${params.value}%`}
              color={rating.color}
              size="small"
              sx={{ mb: 0.5 }}
            />
            <Typography variant="caption" display="block">
              {rating.label}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: 'readabilityScore',
      headerName: 'Readability',
      width: 120,
      renderCell: (params: any) => (
        <Box textAlign="center">
          <Typography variant="body2" fontWeight="medium">
            {params.value}%
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {getReadabilityLevel(params.row.fleschGrade)}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'consistencyScore',
      headerName: 'Consistency',
      width: 120,
      renderCell: (params: any) => (
        <Typography variant="body2" fontWeight="medium">
          {params.value}%
        </Typography>
      ),
    },
    {
      field: 'fleschEase',
      headerName: 'Reading Ease',
      width: 120,
      renderCell: (params: any) => (
        <Typography variant="body2">
          {params.value.toFixed(1)}
        </Typography>
      ),
    },
    {
      field: 'semanticSimilarity',
      headerName: 'Similarity',
      width: 120,
      renderCell: (params: any) => (
        <Typography variant="body2">
          {params.value.toFixed(1)}%
        </Typography>
      ),
    },
  ];

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" py={8}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading results...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          sx={{ mb: 2 }}
        >
          Back to Upload
        </Button>
        <Alert severity="error">
          {error}
        </Alert>
      </Box>
    );
  }

  if (!results) {
    return (
      <Alert severity="warning">
        No results found for this session.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
        >
          Back to Upload
        </Button>
        <Button
          startIcon={polling ? <CircularProgress size={20} /> : <RefreshIcon />}
          onClick={() => fetchResults(true)}
          disabled={polling}
        >
          {polling ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Box>

      {/* Session Status */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h5" gutterBottom>
              Processing Results
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Session: {sessionId?.slice(0, 8)}...
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box display="flex" alignItems="center" gap={2}>
              <Chip
                label={results.status.toUpperCase()}
                color={getStatusColor(results.status)}
                size="medium"
              />
              <Typography variant="body1">
                {results.processed_files} of {results.total_files} files processed
              </Typography>
            </Box>
            {results.status === 'processing' && (
              <LinearProgress 
                sx={{ mt: 1 }} 
                variant="determinate" 
                value={(results.processed_files / results.total_files) * 100} 
              />
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Main Content Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab icon={<DescriptionIcon />} label="Summaries" />
          <Tab icon={<AssessmentIcon />} label="Quality Evaluation" />
        </Tabs>

        {/* Summaries Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ p: 3 }}>
            {results.files.map((file, index) => (
              <Accordion key={file.file_id || index} sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box display="flex" alignItems="center" gap={2} width="100%">
                    <Typography variant="h6">{file.filename}</Typography>
                    <Chip
                      label={file.status}
                      color={getStatusColor(file.status)}
                      size="small"
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {file.status === 'completed' ? (
                    <Grid container spacing={3}>
                      {(['short', 'medium', 'long'] as SummaryType[]).map((type) => (
                        <Grid item xs={12} md={4} key={type}>
                          <Card>
                            <CardContent>
                              <Typography variant="h6" gutterBottom>
                                {type.charAt(0).toUpperCase() + type.slice(1)} Summary
                              </Typography>
                              <Typography variant="body2" paragraph>
                                {file.summaries[type] || 'No summary generated'}
                              </Typography>
                              {file.evaluations[type] && (
                                <Box mt={2}>
                                  <Typography variant="caption" color="primary">
                                    Quality Score: {file.evaluations[type]?.overall_quality_score}%
                                  </Typography>
                                </Box>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Typography color="text.secondary">
                      {file.status === 'failed' ? 'Processing failed for this file' : 'Processing...'}
                    </Typography>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </TabPanel>

        {/* Evaluation Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Summary Quality Evaluation Report
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Quality metrics for all generated summaries including readability, consistency, and overall scores.
            </Typography>
            <DataGrid
              rows={evaluationRows}
              columns={evaluationColumns}
              autoHeight
              disableRowSelectionOnClick
              sx={{ mt: 2 }}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
              }}
              pageSizeOptions={[10, 25, 50]}
            />
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
}

export default ResultsPage;