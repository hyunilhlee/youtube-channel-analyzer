import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  Link,
  Card,
  CardContent,
  CardMedia
} from '@mui/material';
import { YouTube } from '@mui/icons-material';
import axios from 'axios';

interface ChannelInputProps {
  onAnalyze: (data: any) => void;
}

interface ChannelInfo {
  channelId: string;
  title: string;
  subscriberCount: string;
  recentVideos: {
    title: string;
    publishedAt: string;
    url: string;
    thumbnail: string;
    statistics: {
      viewCount: string;
      likeCount: string;
      commentCount: string;
    };
  }[];
}

// API URL 설정
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4001/api';

const ChannelInput: React.FC<ChannelInputProps> = ({ onAnalyze }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null);

  // 채널 분석 가능 여부 확인 함수
  const checkChannelEligibility = (videos: any[]) => {
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());

    // 날짜 문자열을 Date 객체로 변환하는 함수
    const parseDate = (dateStr: string) => {
      const match = dateStr.match(/(\d{4})년 (\d{1,2})월 (\d{1,2})일/);
      if (match) {
        const [, year, month, day] = match;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
      return new Date();
    };

    const recentVideos = videos.map(video => {
      const date = parseDate(video.publishedAt);
      return { ...video, date };
    });

    const videosInThreeMonths = recentVideos.filter(video => video.date >= threeMonthsAgo);
    const videosInOneMonth = recentVideos.filter(video => video.date >= oneMonthAgo);

    return {
      isEligible: videosInThreeMonths.length >= 5 && videosInOneMonth.length >= 1,
      videosInThreeMonths: videosInThreeMonths.length,
      videosInOneMonth: videosInOneMonth.length
    };
  };

  const extractChannelId = (url: string): string | null => {
    try {
      // URL 정규화
      const normalizedUrl = url.trim().toLowerCase();
      
      // @유저명 형식 확인
      const atUsernameMatch = normalizedUrl.match(/youtube\.com\/@([^\/\?]+)/i);
      if (atUsernameMatch) {
        return `@${atUsernameMatch[1]}`;
      }

      // channel/ID 형식 확인
      const channelMatch = normalizedUrl.match(/youtube\.com\/channel\/([^\/\?]+)/i);
      if (channelMatch) {
        return channelMatch[1];
      }

      // c/유저명 형식 확인
      const cUsernameMatch = normalizedUrl.match(/youtube\.com\/c\/([^\/\?]+)/i);
      if (cUsernameMatch) {
        return cUsernameMatch[1];
      }

      // user/유저명 형식 확인
      const userMatch = normalizedUrl.match(/youtube\.com\/user\/([^\/\?]+)/i);
      if (userMatch) {
        return userMatch[1];
      }

      return null;
    } catch (error) {
      console.error('URL 파싱 에러:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setChannelInfo(null);

    // URL 패턴 검증 (@username 형식도 허용)
    const urlPattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/)?(@[^/?]+)(\/.*)?$/;
    const videoPattern = /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[^&]+/;
    
    if (!urlPattern.test(url) && !videoPattern.test(url)) {
      setError('올바른 유튜브 채널 URL을 입력해주세요. (예: https://youtube.com/@channelname)');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/channel`, {
        params: { url }
      });
      setChannelInfo(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || '채널 정보를 가져오는데 실패했습니다.');
      console.error('Error fetching channel info:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = () => {
    if (!channelInfo) return;

    // 채널 데이터 형식 변환
    const videos = channelInfo.recentVideos.map(video => ({
      title: video.title,
      viewCount: parseInt(video.statistics.viewCount.replace(/,/g, '')),
      likeCount: parseInt(video.statistics.likeCount.replace(/,/g, '')),
      commentCount: parseInt(video.statistics.commentCount.replace(/,/g, '')),
      uploadDate: video.publishedAt
    }));

    // 구독자 수에서 쉼표와 '명' 제거 후 숫자로 변환
    const subscriberCount = channelInfo.subscriberCount.replace(/[,명]/g, '');

    const analysisData = {
      channelInfo: {
        title: channelInfo.title,
        subscriberCount: subscriberCount,
        description: `구독자 ${channelInfo.subscriberCount}`
      },
      videoStats: videos
    };

    onAnalyze(analysisData);
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        maxWidth: 800,
        mx: 'auto',
        mt: 4
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3
        }}
      >
        <YouTube sx={{ fontSize: 60, color: 'error.main' }} />
        
        <Typography variant="h6" align="center" gutterBottom>
          YouTube 채널 URL을 입력하세요
        </Typography>

        <Box sx={{ width: '100%', display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="https://www.youtube.com/@channelname"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
            error={!!error}
            helperText={error}
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading || !url}
            sx={{ minWidth: 120 }}
          >
            {loading ? <CircularProgress size={24} /> : '검색'}
          </Button>
        </Box>

        {channelInfo && (
          <Box sx={{ width: '100%', mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              {channelInfo.title}
            </Typography>
            <Typography variant="subtitle1" gutterBottom color="text.secondary">
              구독자 {channelInfo.subscriberCount}명
            </Typography>

            <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
              최근 업로드 영상
            </Typography>
            <Grid container spacing={2}>
              {channelInfo.recentVideos.map((video, index) => (
                <Grid item xs={12} key={index}>
                  <Card sx={{ display: 'flex', height: '100%' }}>
                    <CardMedia
                      component="img"
                      sx={{ width: 200 }}
                      image={video.thumbnail}
                      alt={video.title}
                    />
                    <CardContent sx={{ flex: 1 }}>
                      <Link
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                        color="inherit"
                      >
                        <Typography variant="subtitle1" gutterBottom>
                          {video.title}
                        </Typography>
                      </Link>
                      <Typography variant="body2" color="text.secondary">
                        조회수: {video.statistics.viewCount}회
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        좋아요: {video.statistics.likeCount}개
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        댓글: {video.statistics.commentCount}개
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        업로드: {video.publishedAt}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {(() => {
              const eligibility = checkChannelEligibility(channelInfo.recentVideos);
              return (
                <Box sx={{ mt: 3 }}>
                  {eligibility.isEligible ? (
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      size="large"
                      onClick={handleAnalyze}
                    >
                      분석하기
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="contained"
                        color="error"
                        fullWidth
                        size="large"
                        disabled
                      >
                        분석 불가
                      </Button>
                      <Alert severity="error" sx={{ mt: 2 }}>
                        3개월 내에 업로드 한 게시물이 5개 이상이고, 한달이내에 업로드한 게시물이 1개 이상일때 분석 가능합니다.
                        <br />
                        현재 상태: 3개월 내 {eligibility.videosInThreeMonths}개, 1개월 내 {eligibility.videosInOneMonth}개
                      </Alert>
                    </>
                  )}
                </Box>
              );
            })()}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ChannelInput; 