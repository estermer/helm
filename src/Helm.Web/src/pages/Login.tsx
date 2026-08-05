import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
} from '@mui/material';

export const Login = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        pt: 8,
        px: 2,
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom>
            Sign in
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Sign-in is coming soon. This page is a placeholder while
            authentication is being built.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/')}
          >
            Back to dashboard
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
