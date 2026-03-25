-- Add content_generator to the analysis_type check constraint
ALTER TABLE social_analyses DROP CONSTRAINT IF EXISTS social_analyses_analysis_type_check;
ALTER TABLE social_analyses ADD CONSTRAINT social_analyses_analysis_type_check
  CHECK (analysis_type IN (
    'growth','content_strategy','hashtags','competitors','insights',
    'earnings_forecast','thirty_day_plan','smo_score','audience',
    'network','campaign_ideas','content_generator'
  ));
