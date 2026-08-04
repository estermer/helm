using Helm.Domain.Projections;

namespace Helm.Application.Projections;

public sealed class ProjectionCalculator : IProjectionCalculator
{
    public const int WeeklyPeriods = 300;
    public const int YearlyPeriods = 10;
    public const int WeeksPerYear = 52;

    public ProjectionResult Calculate(ProjectionRequest request)
    {
        var weeklyRate = request.WeeklyRate;
        var start = request.StartingBalance;
        var contribution = request.WeeklyContribution;

        var rows = request.Mode switch
        {
            ProjectionMode.Weekly => ComputeWeekly(weeklyRate, start, contribution, WeeklyPeriods),
            ProjectionMode.Yearly => ComputeYearly(weeklyRate, start, contribution, YearlyPeriods),
            _ => throw new ArgumentOutOfRangeException(nameof(request), $"Unknown mode: {request.Mode}")
        };

        return new ProjectionResult(request.Mode, rows);
    }

    private List<ProjectionRow> ComputeWeekly(decimal weeklyRate, decimal startingBalance, decimal weeklyContribution, int weeks)
    {
        var rows = new List<ProjectionRow>(weeks);
        var balance = startingBalance;

        for (var w = 1; w <= weeks; w++)
        {
            var periodStart = balance;
            var income = Round(periodStart * weeklyRate);
            balance = periodStart + weeklyContribution + income;
            rows.Add(new ProjectionRow(
                PeriodNumber: w,
                StartingBalance: Round(periodStart),
                Contribution: Round(weeklyContribution),
                PeriodIncome: Round(income),
                EndingBalance: Round(balance)));
        }

        return rows;
    }

    private List<ProjectionRow> ComputeYearly(decimal weeklyRate, decimal startingBalance, decimal weeklyContribution, int years)
    {
        var totalWeeks = years * WeeksPerYear;
        var weeklyRows = ComputeWeekly(weeklyRate, startingBalance, weeklyContribution, totalWeeks);

        var rows = new List<ProjectionRow>(years);
        for (var y = 0; y < years; y++)
        {
            var slice = weeklyRows.Skip(y * WeeksPerYear).Take(WeeksPerYear).ToList();
            var yearStart = slice.First().StartingBalance;
            var yearEnd = slice.Last().EndingBalance;
            var yearContribution = Round(slice.Sum(r => r.Contribution));
            var yearIncome = Round(slice.Sum(r => r.PeriodIncome));

            rows.Add(new ProjectionRow(
                PeriodNumber: y + 1,
                StartingBalance: yearStart,
                Contribution: yearContribution,
                PeriodIncome: yearIncome,
                EndingBalance: yearEnd));
        }

        return rows;
    }

    private static decimal Round(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);
}
