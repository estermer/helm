using Helm.Domain.Projections;

namespace Helm.Application.Projections;

public sealed record ProjectionRequest(
    decimal WeeklyRate,
    decimal StartingBalance,
    decimal WeeklyContribution,
    ProjectionMode Mode);
