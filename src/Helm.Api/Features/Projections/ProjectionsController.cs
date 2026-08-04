using Helm.Application.Projections;
using Microsoft.AspNetCore.Mvc;

namespace Helm.Api.Features.Projections;

[ApiController]
[Route("api/[controller]")]
public class ProjectionsController : ControllerBase
{
    private readonly IProjectionCalculator _calculator;

    public ProjectionsController(IProjectionCalculator calculator)
    {
        _calculator = calculator;
    }

    [HttpPost]
    public ActionResult<ProjectionResult> Calculate([FromBody] ProjectionRequest request)
    {
        if (request is null)
        {
            return BadRequest(new { error = "Request body is required." });
        }
        if (request.WeeklyRate < 0 || request.WeeklyRate > 0.05m)
        {
            return BadRequest(new { error = "WeeklyRate must be between 0 (0%) and 0.05 (5%)." });
        }
        if (request.StartingBalance < 0)
        {
            return BadRequest(new { error = "StartingBalance must be non-negative." });
        }
        if (request.WeeklyContribution < 0)
        {
            return BadRequest(new { error = "WeeklyContribution must be non-negative." });
        }

        return Ok(_calculator.Calculate(request));
    }
}
