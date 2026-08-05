import { Link } from 'react-router-dom';
import CalculateIcon from '@mui/icons-material/Calculate';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Container,
  Grid,
  Typography,
} from '@mui/material';

export const Dashboard = () => (
  <Container maxWidth="lg" sx={{ py: 4 }}>
    <Typography variant="h4" component="h1" gutterBottom>
      Helm
    </Typography>
    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
      Self-hosted options toolkit. Pick a tool to get started.
    </Typography>
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <Card>
          <CardActionArea component={Link} to="/calculator">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CalculateIcon color="primary" />
                <Typography variant="h6" component="h2">
                  Calculator
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Project weekly option-selling returns.
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      </Grid>
    </Grid>
  </Container>
);

export default Dashboard;
