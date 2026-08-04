using Helm.Domain.Projections;

namespace Helm.Application.Projections;

public sealed record ProjectionResult(
    ProjectionMode Mode,
    IReadOnlyList<ProjectionRow> Rows);
