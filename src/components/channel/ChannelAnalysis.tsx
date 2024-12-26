import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Divider,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  Tooltip,
  IconButton,
  Button
} from '@mui/material';
import {
  ThumbUp,
  Comment,
  Visibility,
  HelpOutline,
  ArrowBack
} from '@mui/icons-material';
import ChannelInfo from './ChannelInfo';
import AnalysisLoading from './AnalysisLoading';
import { calculatePerformanceMetrics } from '../../utils/performanceCalculator';
import analysisData from '../../data/analysis_result.json';

interface VideoStats {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  publishedAt: string;
}

interface OriginalVideoStats {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  uploadDate: string;
  title: string;
}

interface ChannelData {
  channelInfo: {
    title: string;
    subscriberCount: string | number;
    description: string;
  };
  videoStats: VideoStats[];
}

const ChannelAnalysis: React.FC = () => {
  const [channelData, setChannelData] = useState<ChannelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // 브라우저 뒤로가기 처리
  useEffect(() => {
    const handleNavigation = (event: PopStateEvent) => {
      // 브라우저 뒤로가기 시 메인 페이지로 리다이렉트
      if (location.pathname === '/analysis') {
        event.preventDefault();
        navigate('/', { replace: true });
      }
    };

    window.addEventListener('popstate', handleNavigation);

    return () => {
      window.removeEventListener('popstate', handleNavigation);
    };
  }, [navigate, location]);

  // 초기 데이터 로딩 처리
  useEffect(() => {
    if (!location.state?.channelData) {
      // 직접 URL 접근이나 새로고침 시 메인 페이지로 리다이렉트
      navigate('/', { replace: true });
      return;
    }

    const formattedData = {
      ...location.state.channelData,
      videoStats: location.state.channelData.videoStats.map((video: OriginalVideoStats) => ({
        viewCount: video.viewCount,
        likeCount: video.likeCount,
        commentCount: video.commentCount,
        publishedAt: video.uploadDate
      }))
    };
    
    setChannelData(formattedData);
    setLoading(false);
  }, [location.state, navigate]);

  const handleLoadingComplete = () => {
    setShowContent(true);
  };

  const handleGoBack = () => {
    navigate('/', { replace: true });
  };

  // 로딩 상태 처리
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // 분석 로딩 화면 표시
  if (!showContent) {
    return <AnalysisLoading onComplete={handleLoadingComplete} />;
  }

  // 데이터 없음 처리
  if (!channelData) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>데이터를 찾을 수 없습니다.</Typography>
      </Box>
    );
  }

  const metrics = calculatePerformanceMetrics(channelData.videoStats, Number(channelData.channelInfo.subscriberCount));
  
  if (!metrics) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>데이터를 분석할 수 없습니다.</Typography>
      </Box>
    );
  }

  // 성과 등급에 따른 색상 반환
  const getColorByLevel = (level: '미달' | '적정' | '우수'): 'error' | 'primary' | 'success' => {
    switch (level) {
      case '우수': return 'primary';
      case '적정': return 'success';
      case '미달': return 'error';
      default: return 'primary';
    }
  };

  // case_id 생성
  const caseId = [
    metrics.viewsPerformance.level === '우수' ? 'H' : metrics.viewsPerformance.level === '적정' ? 'M' : 'L',
    metrics.likePerformance.level === '우수' ? 'H' : metrics.likePerformance.level === '적정' ? 'M' : 'L',
    metrics.commentPerformance.level === '우수' ? 'H' : metrics.commentPerformance.level === '적정' ? 'M' : 'L'
  ].join('');

  // 해당하는 분석 케이스 찾기
  const analysisCase = analysisData.cases.find(c => c.case_id === caseId) || analysisData.cases[0];

  // 도움말 텍스트 정의
  const getHelpText = (type: '조회수' | '좋아요' | '댓글') => {
    switch (type) {
      case '조회수':
        return `구독자 수 대비 조회수 성과 계산 방법:
1. 각 영상의 조회수를 업로드 시간에 따라 보정
   - 0~13일: 1배
   - 2주: 2배
   - 3주: 3배
   - 4주: 4배
   - 1개월: 6배
   - 2개월: 10배
   - 3개월 이상: 14배
2. 보정된 조회수의 평균값 계산
3. 구독자 수와 영상 개수를 고려한 기준값과 비교`;

      case '좋아요':
        return `조회수 대비 좋아요 비율 계산 방법:
1. 각 영상의 (좋아요 수 ÷ 조회수) 계산
2. 전체 영상의 평균 좋아요 비율 계산
3. 채널 규모별 기준 비율과 비교
   - 기준값은 구독자 수에 따라 차등 적용`;

      case '댓글':
        return `조회수 대비 댓글 비율 계산 방법:
1. 각 영상의 (댓글 수 ÷ 조회수) 계산
2. 전체 영상의 평균 댓글 비율 계산
3. 채널 규모별 기준 비율과 비교
   - 기준값은 구독자 수에 따라 차등 적용`;

      default:
        return '';
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* 뒤로가기 버튼 */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={handleGoBack}
            sx={{ 
              color: 'primary.main',
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.04)'
              }
            }}
          >
            분석하기로 돌아가기
          </Button>
        </Box>

        {/* 채널 개요 섹션 */}
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom color="primary">
            채널 개요
          </Typography>
          <ChannelInfo
            channelInfo={channelData.channelInfo}
            videoStats={channelData.videoStats}
          />
        </Paper>

        {/* 성과 지표 섹션 */}
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom color="primary">
            성과 지표
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Visibility sx={{ color: getColorByLevel(metrics.viewsPerformance.level) }} />
                    <Typography variant="h6">구독자 대비 조회수</Typography>
                    <Tooltip 
                      title={<Typography style={{ whiteSpace: 'pre-line' }}>{getHelpText('조회수')}</Typography>}
                      arrow
                      placement="top"
                    >
                      <IconButton size="small">
                        <HelpOutline fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Chip
                    label={metrics.viewsPerformance.level}
                    color={getColorByLevel(metrics.viewsPerformance.level)}
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <ThumbUp sx={{ color: getColorByLevel(metrics.likePerformance.level) }} />
                    <Typography variant="h6">조회수 대비 좋아요</Typography>
                    <Tooltip 
                      title={<Typography style={{ whiteSpace: 'pre-line' }}>{getHelpText('좋아요')}</Typography>}
                      arrow
                      placement="top"
                    >
                      <IconButton size="small">
                        <HelpOutline fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Chip
                    label={metrics.likePerformance.level}
                    color={getColorByLevel(metrics.likePerformance.level)}
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Comment sx={{ color: getColorByLevel(metrics.commentPerformance.level) }} />
                    <Typography variant="h6">조회수 대비 댓글</Typography>
                    <Tooltip 
                      title={<Typography style={{ whiteSpace: 'pre-line' }}>{getHelpText('댓글')}</Typography>}
                      arrow
                      placement="top"
                    >
                      <IconButton size="small">
                        <HelpOutline fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Chip
                    label={metrics.commentPerformance.level}
                    color={getColorByLevel(metrics.commentPerformance.level)}
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>

        {/* 채널 분석 및 솔루션 섹션 */}
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom color="primary">
            채널 분석 및 솔루션
          </Typography>
          <Box sx={{ mt: 2 }}>
            {/* 해석 */}
            <Typography variant="h6" gutterBottom>
              분석 개요
            </Typography>
            <Typography paragraph>
              {analysisCase.interpretation}
            </Typography>

            <Divider sx={{ my: 2 }} />

            {/* 원인 분석 */}
            <Typography variant="h6" gutterBottom>
              주요 원인
            </Typography>
            {analysisCase.causes.map((cause, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {cause.title}
                </Typography>
                {cause.content.map((text, i) => (
                  <Typography key={i} variant="body1" sx={{ ml: 2, mb: 1 }}>
                    • {text}
                  </Typography>
                ))}
              </Box>
            ))}

            <Divider sx={{ my: 2 }} />

            {/* 상세 분석 */}
            <Typography variant="h6" gutterBottom>
              상세 분석
            </Typography>
            {analysisCase.detailed_analysis.map((analysis, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {analysis.title}
                </Typography>
                {analysis.content.map((text, i) => (
                  <Typography key={i} variant="body1" sx={{ ml: 2, mb: 1 }}>
                    • {text}
                  </Typography>
                ))}
              </Box>
            ))}

            <Divider sx={{ my: 2 }} />

            {/* 추천 전략 */}
            <Typography variant="h6" gutterBottom>
              개선 방안
            </Typography>
            {analysisCase.recommendations.map((recommendation, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {recommendation.title}
                </Typography>
                {recommendation.content.map((text, i) => (
                  <Typography key={i} variant="body1" sx={{ ml: 2, mb: 1 }}>
                    • {text}
                  </Typography>
                ))}
              </Box>
            ))}

            <Divider sx={{ my: 2 }} />

            {/* 결론 */}
            <Typography variant="h6" gutterBottom>
              결론
            </Typography>
            {analysisCase.conclusion.map((text, index) => (
              <Typography key={index} paragraph>
                {text}
              </Typography>
            ))}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ChannelAnalysis; 