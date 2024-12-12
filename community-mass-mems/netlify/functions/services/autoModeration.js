const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs').promises;
const { getUrlMetadata } = require('../utils/urlMetadata');

class AutoModerationService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.rules = null;
    this.settings = null;
  }

  async initialize() {
    try {
      // Load moderation rules
      const configPath = path.join(__dirname, '..', '..', '..', 'config', 'moderation-rules.json');
      const configData = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(configData);
      this.rules = config.rules;
      this.settings = config.moderation_settings;
      return true;
    } catch (error) {
      console.error('Error initializing auto moderation:', error);
      return false;
    }
  }

  async moderateContent(content, type = 'text') {
    try {
      let textToModerate = content;
      let metadata = null;

      // If it's a URL, fetch metadata and combine relevant text for moderation
      if (type === 'url') {
        metadata = await getUrlMetadata(content);
        const textsToCheck = [
          metadata.title,
          metadata.description,
          metadata.metaTags?.description,
          metadata.metaTags?.keywords,
          metadata.metaTags?.content,
          metadata.metaTags?.['og:title'],
          metadata.metaTags?.['og:description'],
          metadata.author
        ].filter(Boolean);

        textToModerate = textsToCheck.join('\n');
      }

      // Pre-check meta tags for content rating
      if (metadata?.contentRating || metadata?.ageRating) {
        const rating = metadata.contentRating || metadata.ageRating;
        const adultRatings = ['adult', 'mature', '18+', 'nsfw', 'explicit'];
        if (adultRatings.some(term => rating.toLowerCase().includes(term))) {
          return {
            decision: 'reject',
            reason: `Content rating indicates adult content: ${rating}`,
            flagged: true,
            category_scores: {},
            categories: ['adult_content'],
            custom_violations: [],
            metadata
          };
        }
      }

      // Call OpenAI Moderation API
      const response = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify({ input: textToModerate })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const openAIResult = result.results[0];

      // Check custom rules
      const customViolations = [];
      if (this.rules) {
        for (const rule of this.knowledgeBase?.custom_rules || []) {
          const regex = new RegExp(rule.pattern, 'i');
          if (regex.test(textToModerate)) {
            customViolations.push(rule);
          }
        }
      }

      // Make moderation decision
      let decision = 'approve';
      let reason = 'Content meets community guidelines';
      let maxScore = 0;
      let maxCategory = null;

      // Check custom violations first
      if (customViolations.length > 0) {
        decision = 'reject';
        reason = `Content violates custom rules: ${customViolations.map(v => v.reason).join(', ')}`;
      } else {
        // Find the highest scoring category
        for (const [category, score] of Object.entries(openAIResult.category_scores)) {
          if (score > maxScore) {
            maxScore = score;
            maxCategory = category;
          }
        }

        // If any score is above the auto-reject threshold, reject it
        if (maxScore >= this.settings.auto_reject_threshold) {
          decision = 'reject';
          reason = `Content exceeds global rejection threshold (${Math.round(maxScore * 100)}% ${maxCategory})`;
        }
        // If the highest score is below auto-approve threshold, approve it
        else if (maxScore <= this.settings.auto_approve_threshold) {
          decision = 'approve';
          reason = 'Content is well below moderation thresholds';
        }
        // For scores in between, check individual category thresholds
        else {
          for (const [category, rule] of Object.entries(this.rules)) {
            const score = openAIResult.category_scores[category] || 0;
            if (score >= rule.threshold) {
              decision = 'reject';
              reason = `Content exceeds ${category} threshold (${Math.round(score * 100)}%)`;
              break;
            }
          }
        }
      }

      return {
        decision,
        reason,
        flagged: openAIResult.flagged || customViolations.length > 0,
        category_scores: openAIResult.category_scores,
        categories: Object.entries(openAIResult.categories)
          .filter(([_, flagged]) => flagged)
          .map(([category]) => category),
        custom_violations: customViolations,
        metadata
      };
    } catch (error) {
      console.error('Error in content moderation:', error);
      throw error;
    }
  }
}

module.exports = new AutoModerationService();
