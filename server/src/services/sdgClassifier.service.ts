export interface SDGRecommendation {
  code: string;
  title: string;
  confidence: number;
  reason: string;
}

export class SDGClassifierService {
  private static sdgRules: Array<{ code: string; title: string; keywords: string[] }> = [
    { code: 'SDG 1', title: 'No Poverty', keywords: ['poverty', 'income', 'livelihood', 'cash transfer', 'microfinance', 'destitute', 'slum'] },
    { code: 'SDG 2', title: 'Zero Hunger', keywords: ['food', 'hunger', 'nutrition', 'agriculture', 'farming', 'meals', 'malnutrition'] },
    { code: 'SDG 3', title: 'Good Health and Well-being', keywords: ['health', 'medical', 'hospital', 'disease', 'sanitation', 'mental health', 'vaccine', 'clinic'] },
    { code: 'SDG 4', title: 'Quality Education', keywords: ['education', 'school', 'literacy', 'learning', 'students', 'teacher', 'children', 'tuition', 'digital literacy'] },
    { code: 'SDG 5', title: 'Gender Equality', keywords: ['women', 'girl', 'gender', 'empowerment', 'maternal', 'female', 'rights'] },
    { code: 'SDG 6', title: 'Clean Water and Sanitation', keywords: ['water', 'sanitation', 'clean water', 'toilet', 'borewell', 'drinking water', 'hygiene'] },
    { code: 'SDG 7', title: 'Affordable and Clean Energy', keywords: ['solar', 'clean energy', 'renewable', 'electricity', 'solar lamp', 'biogas'] },
    { code: 'SDG 8', title: 'Decent Work and Economic Growth', keywords: ['skill', 'employment', 'jobs', 'vocational', 'artisan', 'craft', 'entrepreneur'] },
    { code: 'SDG 9', title: 'Industry, Innovation and Infrastructure', keywords: ['infrastructure', 'technology', 'innovation', 'internet', 'connectivity'] },
    { code: 'SDG 10', title: 'Reduced Inequalities', keywords: ['disability', 'equity', 'marginalized', 'inclusion', 'tribal', 'caste', 'rural students'] },
    { code: 'SDG 11', title: 'Sustainable Cities and Communities', keywords: ['urban', 'shelter', 'community center', 'housing', 'waste management'] },
    { code: 'SDG 12', title: 'Responsible Consumption and Production', keywords: ['recycling', 'waste', 'sustainable', 'plastic free', 'circular economy'] },
    { code: 'SDG 13', title: 'Climate Action', keywords: ['climate', 'tree plantation', 'forest', 'carbon', 'global warming', 'environment'] },
    { code: 'SDG 14', title: 'Life Below Water', keywords: ['ocean', 'marine', 'river clean', 'coastal', 'fish', 'waterways'] },
    { code: 'SDG 15', title: 'Life on Land', keywords: ['biodiversity', 'wildlife', 'reforestation', 'soil', 'nature conservation'] },
    { code: 'SDG 16', title: 'Peace, Justice and Strong Institutions', keywords: ['transparency', 'rights', 'legal aid', 'governance', 'justice', 'anti-corruption'] },
    { code: 'SDG 17', title: 'Partnerships for the Goals', keywords: ['partnership', 'collaboration', 'multi-stakeholder', 'ngo network'] }
  ];

  static classify(text: string): SDGRecommendation[] {
    const lowerText = text.toLowerCase();
    const results: SDGRecommendation[] = [];

    for (const sdg of this.sdgRules) {
      let matches = 0;
      const matchedKeywords: string[] = [];

      for (const kw of sdg.keywords) {
        if (lowerText.includes(kw)) {
          matches++;
          matchedKeywords.push(kw);
        }
      }

      if (matches > 0) {
        const confidence = Math.min(96, Math.max(70, 65 + matches * 10));
        results.push({
          code: sdg.code,
          title: sdg.title,
          confidence,
          reason: `Matched key phrases: ${matchedKeywords.join(', ')}`
        });
      }
    }

    // Default fallback if no keywords match
    if (results.length === 0) {
      results.push(
        { code: 'SDG 1', title: 'No Poverty', confidence: 75, reason: 'Primary social welfare default classification' },
        { code: 'SDG 10', title: 'Reduced Inequalities', confidence: 70, reason: 'Community development scope' }
      );
    }

    return results.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  }
}
