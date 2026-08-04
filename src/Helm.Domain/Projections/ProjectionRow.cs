namespace Helm.Domain.Projections;

public sealed record ProjectionRow(
    int PeriodNumber,
    decimal StartingBalance,
    decimal Contribution,
    decimal PeriodIncome,
    decimal EndingBalance);
