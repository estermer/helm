import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import type { ProjectionMode, ProjectionResponse } from '../types';

const RATE_OPTIONS: { value: number; label: string }[] = [
  { value: 0.005, label: '0.5%' },
  { value: 0.01, label: '1.0%' },
  { value: 0.015, label: '1.5%' },
  { value: 0.02, label: '2.0%' },
  { value: 0.025, label: '2.5%' },
  { value: 0.03, label: '3.0%' },
  { value: 0.035, label: '3.5%' },
  { value: 0.04, label: '4.0%' },
  { value: 0.045, label: '4.5%' },
  { value: 0.05, label: '5.0%' },
];

const MODES: { value: ProjectionMode; label: string }[] = [
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Yearly', label: 'Yearly' },
];

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export const Projections = () => {
  const [weeklyRate, setWeeklyRate] = useState(0.02);
  const [startingBalance, setStartingBalance] = useState('10000');
  const [weeklyContribution, setWeeklyContribution] = useState('100');
  const [mode, setMode] = useState<ProjectionMode>('Weekly');

  const [rows, setRows] = useState<ProjectionResponse['rows'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/projections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weeklyRate,
          startingBalance: Number(startingBalance),
          weeklyContribution: Number(weeklyContribution),
          mode,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed: ${res.status}`);
      }
      const data: ProjectionResponse = await res.json();
      setRows(data.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const periodLabel = mode === 'Weekly' ? 'Week #' : 'Year #';
  const incomeLabel = mode === 'Weekly' ? 'Weekly income' : 'Annual income';

  return (
    <Box sx={{ px: 1, py: 2 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Return Projection
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Model option-selling weekly income. Earnings compound weekly; contributions are added each week.
          </Typography>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <TextField
              select
              label="Weekly earnings %"
              value={weeklyRate}
              onChange={(e) => setWeeklyRate(Number(e.target.value))}
              sx={{ minWidth: 180 }}
            >
              {RATE_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Starting balance ($)"
              type="number"
              value={startingBalance}
              onChange={(e) => setStartingBalance(e.target.value)}
              slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
            />
            <TextField
              label="Weekly extra contribution ($)"
              type="number"
              value={weeklyContribution}
              onChange={(e) => setWeeklyContribution(e.target.value)}
              slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
            />
            <TextField
              select
              label="Mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as ProjectionMode)}
              sx={{ minWidth: 200 }}
            >
              {MODES.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="contained"
              onClick={submit}
              disabled={loading}
              sx={{ alignSelf: 'center', minWidth: 'auto' }}
            >
              {loading ? 'Calculating…' : 'Calculate'}
            </Button>
          </Stack>

          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          {rows && rows.length > 0 && (
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>{periodLabel}</TableCell>
                    <TableCell align="right">Starting balance</TableCell>
                    <TableCell align="right">Contributions</TableCell>
                    <TableCell align="right">{incomeLabel}</TableCell>
                    <TableCell align="right">Ending balance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.periodNumber}>
                      <TableCell>{r.periodNumber}</TableCell>
                      <TableCell align="right">{money(r.startingBalance)}</TableCell>
                      <TableCell align="right">{money(r.contribution)}</TableCell>
                      <TableCell align="right">{money(r.periodIncome)}</TableCell>
                      <TableCell align="right">{money(r.endingBalance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
