export enum FieldType {
  SCALE = 'scale',
  TEXT = 'text',
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  BOOLEAN = 'boolean',
}

export enum SeverityBand {
  NONE = 'none',
  MILD = 'mild',
  MODERATE = 'moderate',
  MODERATELY_SEVERE = 'moderately_severe',
  SEVERE = 'severe',
  UNSCORABLE = 'unscorable',
}

export enum ResultChartType {
  SEVERITY_BAR = 'severity_bar',
  T_SCORE_GAUGE = 't_score_gauge',
  DOMAIN_BARS = 'domain_bars',
  TREND_LINE = 'trend_line',
  NONE = 'none',
  RADAR_CHART = 'radar_chart',
  BAR_CHART = 'bar_chart',
  RADIAL_BAR_CHART = 'radial_bar_chart',
  COMPOSED_CHART = 'composed_chart',
  PIE_CHART = 'pie_chart',
  LINE_CHART = 'line_chart',
  AREA_CHART = 'area_chart',
  SCATTER_CHART = 'scatter_chart',
  FUNNEL_CHART = 'funnel_chart',
  SUNBURST_CHART = 'sunburst_chart',
}

export enum InviteStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
}

export enum ScoringType {
  TOTAL = 'total',
  AVERAGE = 'average',
  T_SCORE = 't_score',
  DOMAIN_MAX = 'domain_max',
}

/** Human-readable labels for severity bands */
export function severityLabel(severity: string): string {
  switch (severity) {
    case 'none':
      return 'None';
    case 'mild':
      return 'Mild';
    case 'moderate':
      return 'Moderate';
    case 'moderately_severe':
      return 'Moderately Severe';
    case 'severe':
      return 'Severe';
    case 'unscorable':
    default:
      return 'Unscorable';
  }
}