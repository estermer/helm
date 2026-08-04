using Helm.Application.Projections;
using Microsoft.Extensions.DependencyInjection;

namespace Helm.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddSingleton<IProjectionCalculator, ProjectionCalculator>();
        return services;
    }
}
