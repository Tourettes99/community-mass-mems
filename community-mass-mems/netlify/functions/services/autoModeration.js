const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs').promises;

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

  async moderateContent(content) {
    try {
      // Call OpenAI Moderation API
      const response = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify({ input: content })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const openAIResult = result.results[0];

      // Check custom rules
      const customViolations = [];
      if (this.rules) {
        for (const rule of this.knowledgeBase.custom_rules) {
          const regex = new RegExp(rule.pattern, 'i');
          if (regex.test(content)) {
            customViolations.push(rule);
          }
        }
      }

      // Make moderation decision
      let decision = 'approve';
      let reason = 'Content meets community guidelines';

      // Check custom violations first
      if (customViolations.length > 0) {
        decision = 'reject';
        reason = `Content violates custom rules: ${customViolations.map(v => v.reason).join(', ')}`;
      }
      // Then check category scores
      else {
        for (const [category, rule] of Object.entries(this.rules)) {
          const score = openAIResult.category_scores[category] || 0;
          if (score >= rule.threshold) {
            decision = 'reject';
            reason = `Content violates ${category} threshold`;
            break;
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
        custom_violations: customViolations
      };
    } catch (error) {
      console.error('Error in content moderation:', error);
      throw error;
    }
  }
}

module.exports = new AutoModerationService();
