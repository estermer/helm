namespace Helm.Application.Projections;

public interface IProjectionCalculator
{
    ProjectionResult Calculate(ProjectionRequest request);
}
